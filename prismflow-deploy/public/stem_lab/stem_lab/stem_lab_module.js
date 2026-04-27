// stem_lab_module.js — v2.3.0 (a11y enhancements)
(function () {
  if (window.AlloModules && window.AlloModules.StemLab) { console.log('[CDN] StemLab already loaded, skipping duplicate'); } else {
    // stem_lab_module.js
    // Auto-extracted from AlloFlowANTI.txt
    // STEM Lab module for AlloFlow - loaded from GitHub CDN
    // Version: 1.0.0 (Feb 2026)

    // ── StemLab Plugin Registry (Phase 2) ──
    // Initialize before the hub component so plugins can register tools.
    // Plugins (stem_tool_*.js) call window.StemLab.registerTool(id, config)
    // and the hub's fallback renderer (at the end of the explore chain) delegates to them.
    if (!window.StemLab) {
      window.StemLab = {
        _registry: {},
        _order: [],
        registerTool: function(id, config) {
          config.id = id;
          config.ready = config.ready !== false;
          this._registry[id] = config;
          if (this._order.indexOf(id) === -1) this._order.push(id);
          console.log('[StemLab] Registered tool: ' + id);
          // Populate STEM_TOOL_REGISTRY for lesson plan integration
          if (!window.STEM_TOOL_REGISTRY) window.STEM_TOOL_REGISTRY = [];
          var catMap = { science: ['Science'], math: ['Math'], engineering: ['Engineering'], art: ['Art'], coding: ['CS'] };
          var entry = { id: id, name: config.label || id, subjects: catMap[config.category] || ['STEM'], tags: [config.category || 'stem', id] };
          var exists = false;
          for (var ri = 0; ri < window.STEM_TOOL_REGISTRY.length; ri++) {
            if (window.STEM_TOOL_REGISTRY[ri].id === id) { exists = true; break; }
          }
          if (!exists) window.STEM_TOOL_REGISTRY.push(entry);
        },
        getRegisteredTools: function() {
          var self = this;
          return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
        },
        isRegistered: function(id) { return !!this._registry[id]; },
        renderTool: function(id, ctx) {
          var tool = this._registry[id];
          if (!tool || !tool.render) return null;
          try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; }
        }
      };
    }

    window.AlloModules = window.AlloModules || {};
    window.AlloModules.StemLab = function StemLabModal(props) {
      const {
        ArrowLeft,
        Calculator,
        GripVertical,
        Sparkles,
        X,
        addToast,
        angleChallenge,
        angleFeedback,
        angleValue,
        areaModelDims,
        areaModelHighlight,
        assessmentBlocks,
        base10Challenge,
        base10Feedback,
        base10Value,
        cubeAnswer,
        cubeBuilderChallenge,
        cubeBuilderFeedback,
        cubeBuilderMode,
        cubeChallenge,
        cubeClickSuppressed,
        cubeDims,
        cubeDragRef,
        cubeFeedback,
        cubeHoverPos,
        cubePositions,
        cubeRotation,
        cubeScale,
        cubeShowLayers,
        exploreDifficulty,
        exploreScore,
        fractionPieces,
        gridChallenge,
        gridFeedback,
        gridPoints,
        gridRange,
        mathInput,
        mathMode,
        mathQuantity,
        mathSubject,
        multTableAnswer,
        multTableChallenge,
        multTableFeedback,
        multTableHidden,
        multTableHover,
        multTableRevealed,
        numberLineMarkers,
        numberLineRange,
        setActiveView,
        setAngleChallenge,
        setAngleFeedback,
        setAngleValue,
        setAreaAnswer,
        setAreaChallenge,
        setAreaFeedback,
        setAreaModelDims,
        setAreaModelHighlight,
        setAssessmentBlocks,
        setBase10Challenge,
        setBase10Feedback,
        setBase10Value,
        setCubeAnswer,
        setCubeBuilderChallenge,
        setCubeBuilderFeedback,
        setCubeBuilderMode,
        setCubeChallenge,
        setCubeDims,
        setCubeFeedback,
        setCubeHoverPos,
        setCubePositions,
        setCubeRotation,
        setCubeScale,
        setCubeShowLayers,
        setData,
        setExploreDifficulty,
        setExploreScore,
        setFracAnswer,
        setFracChallenge,
        setFracFeedback,
        setFractionPieces,
        setGridChallenge,
        setGridFeedback,
        setGridPoints,
        setHistory,
        setMathInput,
        setMathMode,
        setMathQuantity,
        setMathSubject,
        setMultTableAnswer,
        setMultTableChallenge,
        setMultTableFeedback,
        setMultTableHidden,
        setMultTableHover,
        setMultTableRevealed,
        setNlAnswer,
        setNlChallenge,
        setNlFeedback,
        setNumberLineMarkers,
        setNumberLineRange,
        setShowAssessmentBuilder,
        setShowStemLab,
        setStemLabCreateMode,
        setStemLabTab,
        setStemLabTool,
        setToolSnapshots,
        showAssessmentBuilder,
        showStemLab,
        startMathFluencyProbe,
        stemLabCreateMode,
        stemLabTab,
        stemLabTool,
        submitExploreScore,
        toolSnapshots,
        nlAnswer,
        nlChallenge,
        nlFeedback,
        nlMarkerLabel,
        nlMarkerVal,
        areaChallenge,
        areaFeedback,
        areaAnswer,
        fracChallenge,
        fracFeedback,
        fracAnswer,
        handleGenerateMath,
        labToolData,
        setLabToolData,
        gradeLevel,
        callGemini,
        callTTS,
        callImagen,
        callGeminiVision,
        callGeminiImageEdit,
        theme: _themeProp,
        activeSessionCode,
        studentNickname,
        isTeacherMode
      } = props;
      // t (translation function) — pulled from props with a safe fallback
      var t = props.t || function (k) { return k; };

      // ── STEM Lab Global Sound Effect Helper ──
      var _stemAudioCtx = null;
      function stemBeep(freq, dur, vol) {
        try {
          if (!_stemAudioCtx) _stemAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
          var osc = _stemAudioCtx.createOscillator();
          var gain = _stemAudioCtx.createGain();
          osc.connect(gain); gain.connect(_stemAudioCtx.destination);
          osc.frequency.value = freq; osc.type = 'sine';
          gain.gain.value = vol || 0.12;
          gain.gain.exponentialRampToValueAtTime(0.001, _stemAudioCtx.currentTime + (dur || 0.15));
          osc.start(); osc.stop(_stemAudioCtx.currentTime + (dur || 0.15));
        } catch (e) { }
      }
      function stemCelebrate() {
        stemBeep(523, 0.15, 0.14); // C5
        setTimeout(function () { stemBeep(659, 0.15, 0.14); }, 100); // E5
        setTimeout(function () { stemBeep(784, 0.25, 0.16); }, 200); // G5
      }

      // _reduceMotion declared below (L~460) — single source of truth

      // ── Floating +XP Popup State ──
      var _stemXpPopups = React.useRef([]);
      var _stemXpPopupCounter = React.useRef(0);
      var [_xpPopupTick, _setXpPopupTick] = React.useState(0);
      // XP badge pulse state
      var [_xpBadgePulse, _setXpBadgePulse] = React.useState(false);

      // Life Skills Lab Global State
      var [stemState, setStemState] = React.useState({});
      // d / upd — generic state shorthand used by the category filter and quest builder
      var d = stemState;
      var upd = function(key, val) { setStemState(function(prev) { var next = Object.assign({}, prev); next[key] = val; return next; }); };

      // ── Inject XP CSS Keyframes ──
      React.useEffect(function () {
        if (document.getElementById('stem-xp-keyframes')) return;
        var s = document.createElement('style');
        s.id = 'stem-xp-keyframes';
        s.textContent = [
          '@keyframes stemXpShimmer { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }',
          '@keyframes stemXpBadgePulse { 0% { transform: scale(1); } 40% { transform: scale(1.18); } 100% { transform: scale(1); } }',
          '@keyframes stemXpFloat { 0% { opacity: 1; transform: translateX(-50%) translateY(0); } 100% { opacity: 0; transform: translateX(-50%) translateY(-38px); } }',
          // WCAG 2.4.7: Focus visible outlines for keyboard navigation
          '.stem-lab-modal button:focus-visible, .stem-lab-modal input:focus-visible, .stem-lab-modal select:focus-visible, .stem-lab-modal textarea:focus-visible, .stem-lab-modal [tabindex]:focus-visible { outline: 2px solid #6366f1 !important; outline-offset: 2px !important; border-radius: 4px; }',
          '.stem-lab-modal canvas:focus-visible { outline: 3px solid #6366f1 !important; outline-offset: 2px !important; }',
          // Skip mouse users — only show outlines for keyboard
          '.stem-lab-modal :focus:not(:focus-visible) { outline: none !important; }',
          // WCAG 2.3.3: Reduced motion — disable ALL animations for users who prefer
          '@media (prefers-reduced-motion: reduce) { .stem-lab-modal *, .stem-lab-modal *::before, .stem-lab-modal *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }',
          // WCAG 1.4.11: Ensure focus indicators have adequate contrast on all backgrounds
          '.stem-lab-modal [role="button"]:focus-visible { outline: 2px solid #6366f1 !important; outline-offset: 2px !important; }'
        ].join('\n');
        document.head.appendChild(s);
        return function () { var el = document.getElementById('stem-xp-keyframes'); if (el) el.remove(); };
      }, []);

      // ── Theme-aware CSS overrides for dark mode & high contrast ──
      React.useEffect(function () {
        var id = 'stem-theme-overrides';
        var existing = document.getElementById(id);
        if (existing) existing.remove();
        if (!isDark && !isContrast) return;
        var s = document.createElement('style');
        s.id = id;
        if (isDark) {
          s.textContent = [
            '[data-stem-lab] .bg-white { background-color: #1e293b !important; color: #f1f5f9 !important; }',
            '[data-stem-lab] .bg-slate-50 { background-color: #0f172a !important; color: #f1f5f9 !important; }',
            '[data-stem-lab] .bg-slate-100 { background-color: #1e293b !important; }',
            '[data-stem-lab] .bg-slate-200 { background-color: #334155 !important; }',
            '[data-stem-lab] .text-slate-900, [data-stem-lab] .text-slate-800, [data-stem-lab] .text-slate-700 { color: #f1f5f9 !important; }',
            '[data-stem-lab] .text-slate-600 { color: #cbd5e1 !important; }',
            '[data-stem-lab] .text-slate-500 { color: #94a3b8 !important; }',
            '[data-stem-lab] .border-slate-200 { border-color: #475569 !important; }',
            '[data-stem-lab] .border-slate-100 { border-color: #334155 !important; }',
            '[data-stem-lab] .border-slate-300 { border-color: #475569 !important; }',
            '[data-stem-lab] .bg-indigo-50 { background-color: #312e81 !important; }',
            '[data-stem-lab] .bg-blue-50 { background-color: #1e3a5f !important; }',
            '[data-stem-lab] .bg-green-50 { background-color: #14532d !important; }',
            '[data-stem-lab] .bg-yellow-50 { background-color: #422006 !important; }',
            '[data-stem-lab] .bg-red-50 { background-color: #450a0a !important; }',
            '[data-stem-lab] .bg-purple-50 { background-color: #3b0764 !important; }',
            '[data-stem-lab] .bg-emerald-50 { background-color: #064e3b !important; }',
            '[data-stem-lab] .bg-gradient-to-br.from-slate-50 { background: #0f172a !important; }',
            '[data-stem-lab] input, [data-stem-lab] textarea, [data-stem-lab] select { background-color: #0f172a !important; color: #f1f5f9 !important; border-color: #475569 !important; }',
          ].join('\n');
        } else if (isContrast) {
          s.textContent = [
            '[data-stem-lab] .bg-white, [data-stem-lab] .bg-slate-50, [data-stem-lab] .bg-slate-100 { background-color: #000000 !important; color: #ffffff !important; }',
            '[data-stem-lab] .bg-slate-200, [data-stem-lab] .bg-slate-300 { background-color: #1a1a1a !important; color: #ffffff !important; }',
            '[data-stem-lab] .text-slate-900, [data-stem-lab] .text-slate-800, [data-stem-lab] .text-slate-700, [data-stem-lab] .text-slate-600, [data-stem-lab] .text-slate-500 { color: #ffffff !important; }',
            '[data-stem-lab] .text-indigo-700, [data-stem-lab] .text-indigo-600, [data-stem-lab] .text-blue-700, [data-stem-lab] .text-blue-600 { color: #fbbf24 !important; }',
            '[data-stem-lab] .border-slate-200, [data-stem-lab] .border-slate-100, [data-stem-lab] .border-slate-300 { border-color: #fbbf24 !important; }',
            '[data-stem-lab] .bg-indigo-50, [data-stem-lab] .bg-blue-50, [data-stem-lab] .bg-green-50, [data-stem-lab] .bg-yellow-50, [data-stem-lab] .bg-red-50, [data-stem-lab] .bg-purple-50, [data-stem-lab] .bg-emerald-50 { background-color: #000000 !important; border: 2px solid #fbbf24 !important; }',
            '[data-stem-lab] input, [data-stem-lab] textarea, [data-stem-lab] select { background-color: #000000 !important; color: #ffffff !important; border: 2px solid #fbbf24 !important; }',
            '[data-stem-lab] button { border: 1px solid #fbbf24 !important; }',
          ].join('\n');
        }
        document.head.appendChild(s);
        return function () { var el = document.getElementById(id); if (el) el.remove(); };
      }, [isDark, isContrast]);

      // ── WCAG 1.4.3: Minimum contrast fixes for standard mode ──
      // text-slate-400 (#94a3b8) on white (#fff) = 2.97:1 ratio — FAILS AA.
      // Upgrading to text-slate-500 (#64748b) = 4.63:1 ratio — PASSES AA.
      React.useEffect(function() {
        if (isDark || isContrast) return; // Dark/HC modes handle their own contrast
        var id = 'stem-contrast-fix';
        if (document.getElementById(id)) return;
        var s = document.createElement('style');
        s.id = id;
        s.textContent = [
          // Upgrade low-contrast slate-400 text to slate-500 (4.63:1 on white)
          '[data-stem-lab] .text-slate-400 { color: #64748b !important; }',
          '[data-stem-lab] .text-\\[10px\\].text-slate-400 { color: #64748b !important; }',
          // Upgrade low-contrast [9px] and [8px] text (small text needs 4.5:1)
          '[data-stem-lab] .text-\\[9px\\] { font-size: 10px !important; }',
          '[data-stem-lab] .text-\\[8px\\] { font-size: 9px !important; }',
          // Ensure slate-500 meets AA on light backgrounds
          '[data-stem-lab] .text-slate-500 { color: #475569 !important; }',
          // Fix rose-400 on white (used in vocab bars) — upgrade to rose-500
          '[data-stem-lab] .text-rose-400 { color: #e11d48 !important; }',
          // Fix amber-400 on white — upgrade to amber-600
          '[data-stem-lab] .text-amber-400 { color: #d97706 !important; }',
          // Fix cyan-400 on white — upgrade to cyan-600
          '[data-stem-lab] .text-cyan-400 { color: #0891b2 !important; }',
        ].join('\n');
        document.head.appendChild(s);
        return function() { var el = document.getElementById(id); if (el) el.remove(); };
      }, [isDark, isContrast]);

      // ── STEM Lab XP System (per-activity cap: 100 XP) ──
      var stemXpData = (labToolData && labToolData._stemXP) || {};
      function awardStemXP(activityId, points, reason) {
        var _awardedPts = Math.min(points, Math.max(0, 100 - getStemXP(activityId)));
        if (_awardedPts <= 0) return;
        setLabToolData(function (prev) {
          var xpState = Object.assign({}, (prev && prev._stemXP) || {});
          var actData = Object.assign({}, xpState[activityId] || { earned: 0, log: [] });
          var cap = 100;
          var canEarn = Math.max(0, cap - actData.earned);
          var awarded = Math.min(points, canEarn);
          if (awarded <= 0) return prev;
          actData.earned += awarded;
          actData.log = (actData.log || []).concat([{
            pts: awarded, reason: reason || 'Activity', ts: Date.now()
          }]);
          xpState[activityId] = actData;
          // Total XP across all activities
          var total = 0;
          Object.keys(xpState).forEach(function (k) {
            if (k !== '_total' && xpState[k] && typeof xpState[k].earned === 'number') total += xpState[k].earned;
          });
          xpState._total = total;
          return Object.assign({}, prev, { _stemXP: xpState });
        });
        if (addToast) addToast(t('stem.common.u2b50') + _awardedPts + ' XP: ' + (reason || 'STEM activity') + '!', 'success');
        announceToSR('Earned ' + _awardedPts + ' XP for ' + (reason || 'STEM activity'));
        // ── XP Chime (ascending two-note) ──
        stemBeep(523, 0.08, 0.10); // C5
        setTimeout(function () { stemBeep(659, 0.12, 0.10); }, 80); // E5
        // ── Floating +XP Popup ──
        if (!_reduceMotion) {
          _stemXpPopupCounter.current += 1;
          var popupId = _stemXpPopupCounter.current;
          _stemXpPopups.current = _stemXpPopups.current.concat([{ id: popupId, pts: _awardedPts, ts: Date.now() }]);
          _setXpPopupTick(function (t) { return t + 1; });
          setTimeout(function () {
            _stemXpPopups.current = _stemXpPopups.current.filter(function (p) { return p.id !== popupId; });
            _setXpPopupTick(function (t) { return t + 1; });
          }, 1400);
        }
        // ── Badge Pulse ──
        _setXpBadgePulse(true);
        setTimeout(function () { _setXpBadgePulse(false); }, 600);
      }
      function getStemXP(activityId) {
        return (stemXpData[activityId] && stemXpData[activityId].earned) || 0;
      }
      function getStemXPCap(activityId) {
        return 100 - getStemXP(activityId);
      }
      var totalStemXP = stemXpData._total || 0;

      // ── AI Helper Functions (powered by main app's callGemini/callTTS) ──
      var _aiPending = {};
      var _stemGrade = gradeLevel || '5th Grade';

      function stemAIHint(tool, question, wrongAnswer, correctAnswer, feedbackSetter) {
        if (!callGemini || _aiPending[tool + '_hint']) return;
        _aiPending[tool + '_hint'] = true;
        var prompt = 'You are a helpful STEM tutor for a ' + _stemGrade + ' student.\n' +
          'Tool: ' + tool + '\n' +
          'Question: ' + question + '\n' +
          'Student answered: ' + wrongAnswer + '\n' +
          'Correct answer: ' + correctAnswer + '\n' +
          'Give a SHORT, encouraging hint (1-2 sentences max) that guides them toward the correct answer WITHOUT giving it away. ' +
          'Use age-appropriate language. Focus only on this specific concept.';
        callGemini(prompt).then(function (hint) {
          _aiPending[tool + '_hint'] = false;
          if (hint && feedbackSetter) feedbackSetter(hint);
          else if (hint && addToast) addToast('💡 ' + hint, 'info');
        }).catch(function () { _aiPending[tool + '_hint'] = false; });
      }



      var [stemAIResponse, setStemAIResponse] = React.useState(null);
      var [stemAILoading, setStemAILoading] = React.useState(false);
      var [_stemToolSearch, _setStemToolSearch] = React.useState('');

      // ── Keyboard Help State ──
      var [_showKeyHelp, _setShowKeyHelp] = React.useState(false);

      // ── Canvas Narration Toggle (mirrors localStorage so the header button re-renders) ──
      var [_narrationOn, _setNarrationOn] = React.useState(function () {
        try { return localStorage.getItem('alloflow_canvas_narrate') === 'on'; } catch (e) { return false; }
      });

      // ── Station Builder State ──
      var [_showStationBuilder, _setShowStationBuilder] = React.useState(false);
      var [_stationName, _setStationName] = React.useState('');
      var [_stationGrade, _setStationGrade] = React.useState('');
      var [_stationNote, _setStationNote] = React.useState('');
      var [_stationTools, _setStationTools] = React.useState({});
      var [_stationTimeEst, _setStationTimeEst] = React.useState('20');
      var [_savedStations, _setSavedStations] = React.useState(function() {
        try { return JSON.parse(localStorage.getItem('alloflow_stem_stations') || '[]'); } catch(e) { return []; }
      });
      var [_activeStationId, _setActiveStationId] = React.useState(null);

      // ═══ QUEST SYSTEM ═══
      var [_stationQuests, _setStationQuests] = React.useState([]);
      var [_questPickerOpen, _setQuestPickerOpen] = React.useState(false);
      var [_questProgress, _setQuestProgress] = React.useState(function() {
        try { return JSON.parse(localStorage.getItem('alloflow_quest_progress') || '{}'); } catch(e) { return {}; }
      });
      var [_questHudCollapsed, _setQuestHudCollapsed] = React.useState(false);
      var [_showXpPanel, _setShowXpPanel] = React.useState(false);
      var [_questFreeResponseOpen, _setQuestFreeResponseOpen] = React.useState(null); // qid of expanded free response

      // Quest progress persistence
      React.useEffect(function() {
        try { localStorage.setItem('alloflow_quest_progress', JSON.stringify(_questProgress)); } catch(e) {}
      }, [_questProgress]);

      // Quest evaluation — watches labToolData for auto-completion
      React.useEffect(function() {
        if (!_activeStation || !_activeStation.quests || !_activeStation.quests.length) return;
        var updated = _evaluateQuests(_activeStation, labToolData || {}, _questProgress);
        if (updated !== _questProgress) {
          // Check which quests just completed for celebration
          var stProg = updated[_activeStation.id] || {};
          _activeStation.quests.forEach(function(q) {
            var oldProg = (_questProgress[_activeStation.id] || {})[q.qid];
            var newProg = stProg[q.qid];
            if (newProg && newProg.complete && (!oldProg || !oldProg.complete)) {
              // Streak detection: if last quest was completed <2 min ago, it's a streak
              var streakBonus = 0;
              var lastCompletionTime = 0;
              _activeStation.quests.forEach(function(q2) {
                var p2 = stProg[q2.qid];
                if (p2 && p2.complete && p2.completedAt && q2.qid !== q.qid) {
                  var t2 = new Date(p2.completedAt).getTime();
                  if (t2 > lastCompletionTime) lastCompletionTime = t2;
                }
              });
              if (lastCompletionTime > 0 && (Date.now() - lastCompletionTime) < 120000) {
                streakBonus = 5;
              }
              var totalBonus = 10 + streakBonus;
              var streakMsg = streakBonus > 0 ? ' \uD83D\uDD25 Streak bonus +' + streakBonus + '!' : '';
              if (addToast) addToast('\uD83C\uDFC6 Quest complete: ' + q.label + ' (+' + totalBonus + ' XP)' + streakMsg, 'success');
              if (typeof announceToSR === 'function') announceToSR('Quest completed: ' + q.label);
              if (typeof stemCelebrate === 'function') stemCelebrate();
              if (typeof awardStemXP === 'function') awardStemXP('questBonus', totalBonus, 'Quest: ' + q.label + (streakBonus ? ' (streak)' : ''));
            }
          });
          _setQuestProgress(updated);
        }
      }, [labToolData, _activeStationId]);

      // Quest time tracking — accumulates time spent in each tool
      React.useEffect(function() {
        if (!_activeStation || !stemLabTool) return;
        var timeQuests = (_activeStation.quests || []).filter(function(q) {
          return q.type === 'timeSpent' && q.toolId === stemLabTool;
        });
        if (timeQuests.length === 0) return;
        var openTs = Date.now();
        return function() {
          var elapsed = Date.now() - openTs;
          if (elapsed < 1000) return; // ignore sub-second switches
          _setQuestProgress(function(prev) {
            var sp = Object.assign({}, prev[_activeStation.id] || {});
            timeQuests.forEach(function(q) {
              var qp = Object.assign({}, sp[q.qid] || {});
              qp.timeAccumMs = (qp.timeAccumMs || 0) + elapsed;
              sp[q.qid] = qp;
            });
            var next = Object.assign({}, prev);
            next[_activeStation.id] = sp;
            return next;
          });
        };
      }, [stemLabTool, _activeStationId]);


      // Quest type definitions
      var QUEST_TYPES = [
        { id: 'xpThreshold', label: 'Earn XP', icon: '\u2B50', paramLabel: 'XP Target', defaultVal: 50, unit: 'XP' },
        { id: 'timeSpent', label: 'Spend Time', icon: '\u23F1', paramLabel: 'Minutes', defaultVal: 5, unit: 'min' },
        { id: 'discoveryCount', label: 'Discover Items', icon: '\uD83D\uDD2D', paramLabel: 'Item Count', defaultVal: 5, unit: 'items' },
        { id: 'quizScore', label: 'Quiz Score', icon: '\uD83C\uDFAF', paramLabel: 'Min Score', defaultVal: 5, unit: 'pts' },
        { id: 'freeResponse', label: 'Written Response', icon: '\u270D\uFE0F', paramLabel: 'Min Characters', defaultVal: 30, unit: 'chars' },
        { id: 'toolQuest', label: 'Tool-Specific', icon: '\uD83C\uDFC6', paramLabel: 'Quest', defaultVal: '', unit: '' }
      ];

      // Get available tool-specific quests for a given tool ID
      function _getToolQuestHooks(toolId) {
        if (!toolId || !window.StemLab || !window.StemLab._registry) return [];
        var toolConfig = window.StemLab._registry[toolId];
        return (toolConfig && toolConfig.questHooks) || [];
      }

      // Auto-generate quest label
      function _questAutoLabel(type, toolId, params) {
        var toolName = 'this tool';
        if (toolId) {
          var found = _allStemTools.find(function(t2) { return t2.id === toolId; });
          if (found) toolName = found.label || toolId;
        }
        switch(type) {
          case 'xpThreshold': return 'Earn ' + (params.threshold || 50) + ' XP in ' + toolName;
          case 'timeSpent': return 'Spend ' + (params.minutes || 5) + ' minutes in ' + toolName;
          case 'discoveryCount': return 'Discover ' + (params.count || 5) + ' items in ' + toolName;
          case 'quizScore': return 'Score ' + (params.minScore || 5) + '+ on the ' + toolName + ' quiz';
          case 'freeResponse': return params.prompt || 'Describe what you learned';
          default: return 'Complete a quest';
        }
      }

      // Evaluate all quests for a station against current tool data
      function _evaluateQuests(station, toolData, progress) {
        if (!station || !station.quests || !station.quests.length) return progress;
        var stProg = Object.assign({}, progress[station.id] || {});
        var changed = false;
        station.quests.forEach(function(q) {
          var qp = stProg[q.qid] || {};
          if (qp.complete) return;
          var complete = false;
          var xpData, toolState, field, val, score;
          switch(q.type) {
            case 'xpThreshold':
              xpData = (toolData._stemXP || {})[q.toolId];
              complete = xpData && (typeof xpData === 'number' ? xpData : (xpData.earned || 0)) >= (q.params.threshold || 50);
              break;
            case 'timeSpent':
              complete = (qp.timeAccumMs || 0) >= (q.params.minutes || 5) * 60000;
              break;
            case 'discoveryCount':
              toolState = toolData['_' + q.toolId] || toolData[q.toolId] || {};
              field = q.params.field || 'discoveries';
              val = field.indexOf('.') !== -1 ? field.split('.').reduce(function(o, k) { return (o || {})[k]; }, toolState) : toolState[field];
              complete = (Array.isArray(val) ? val.length : (typeof val === 'number' ? val : 0)) >= (q.params.count || 5);
              break;
            case 'quizScore':
              toolState = toolData['_' + q.toolId] || toolData[q.toolId] || {};
              field = q.params.field || 'quizScore';
              score = field.indexOf('.') !== -1 ? field.split('.').reduce(function(o, k) { return (o || {})[k]; }, toolState) : toolState[field];
              complete = typeof score === 'number' && score >= (q.params.minScore || 5);
              break;
            case 'freeResponse':
              complete = (qp.response || '').length >= (q.params.minLength || 30);
              break;
            case 'toolQuest':
              // Tool-specific quest — look up the hook's check function
              var hooks = _getToolQuestHooks(q.toolId);
              var hook = hooks.find(function(h) { return h.id === q.params.hookId; });
              if (hook && hook.check) {
                var toolState2 = toolData[q.toolId] || toolData['_' + q.toolId] || {};
                complete = hook.check(toolState2);
              }
              break;
          }
          if (complete && !qp.complete) {
            qp.complete = true;
            qp.completedAt = new Date().toISOString();
            changed = true;
          }
          stProg[q.qid] = qp;
        });
        if (changed) {
          var updated = Object.assign({}, progress);
          updated[station.id] = stProg;
          return updated;
        }
        return progress;
      }

      // Get display info for a quest's progress
      function _getQuestDisplay(quest, toolData, progress, stationId) {
        var qp = ((progress[stationId] || {})[quest.qid]) || {};
        if (qp.complete) return { done: true, text: 'Complete', pct: 100 };
        var xpData, toolState, field, val, ms, targetMs;
        switch(quest.type) {
          case 'xpThreshold':
            xpData = (toolData._stemXP || {})[quest.toolId];
            var earned = xpData ? (typeof xpData === 'number' ? xpData : (xpData.earned || 0)) : 0;
            var thr = quest.params.threshold || 50;
            return { done: false, text: earned + '/' + thr + ' XP', pct: Math.min(100, earned / thr * 100) };
          case 'timeSpent':
            ms = qp.timeAccumMs || 0;
            targetMs = (quest.params.minutes || 5) * 60000;
            return { done: false, text: Math.floor(ms / 60000) + '/' + (quest.params.minutes || 5) + ' min', pct: Math.min(100, ms / targetMs * 100) };
          case 'discoveryCount':
            toolState = toolData['_' + quest.toolId] || toolData[quest.toolId] || {};
            field = quest.params.field || 'discoveries';
            val = field.indexOf('.') !== -1 ? field.split('.').reduce(function(o, k) { return (o || {})[k]; }, toolState) : toolState[field];
            var c = Array.isArray(val) ? val.length : (typeof val === 'number' ? val : 0);
            var target = quest.params.count || 5;
            return { done: false, text: c + '/' + target, pct: Math.min(100, c / target * 100) };
          case 'quizScore':
            toolState = toolData['_' + quest.toolId] || toolData[quest.toolId] || {};
            field = quest.params.field || 'quizScore';
            val = field.indexOf('.') !== -1 ? field.split('.').reduce(function(o, k) { return (o || {})[k]; }, toolState) : toolState[field];
            var sv = typeof val === 'number' ? val : 0;
            var minS = quest.params.minScore || 5;
            return { done: false, text: sv + '/' + minS, pct: Math.min(100, sv / minS * 100) };
          case 'freeResponse':
            var len = (qp.response || '').length;
            var minL = quest.params.minLength || 30;
            return { done: false, text: len + '/' + minL + ' chars', pct: Math.min(100, len / minL * 100) };
          case 'toolQuest':
            var hooks2 = _getToolQuestHooks(quest.toolId);
            var hook2 = hooks2.find(function(h2) { return h2.id === quest.params.hookId; });
            if (hook2 && hook2.progress) {
              var ts2 = toolData[quest.toolId] || toolData['_' + quest.toolId] || {};
              var progText = hook2.progress(ts2);
              var isDone2 = hook2.check ? hook2.check(ts2) : false;
              return { done: isDone2, text: progText, pct: isDone2 ? 100 : 50 };
            }
            return { done: false, text: 'In progress', pct: 25 };
          default:
            return { done: false, text: '?', pct: 0 };
        }
      }

      // Sync incoming activeStation prop from main app (e.g. resource pack click)
      // When the main app sets activeStation and opens STEM Lab, auto-load that station
      React.useEffect(function () {
        if (props.activeStation && props.activeStation.id) {
          _setActiveStationId(props.activeStation.id);
          // Ensure the station exists in local storage (it should, but be safe)
          var existing = _savedStations.find(function (s) { return s.id === props.activeStation.id; });
          if (!existing) {
            var updated = _savedStations.concat([props.activeStation]);
            _setSavedStations(updated);
            try { localStorage.setItem('alloflow_stem_stations', JSON.stringify(updated)); } catch (e) {}
          }
          // Clear the prop so re-opening STEM Lab without a station click doesn't re-trigger
          if (typeof props.setActiveStation === 'function') props.setActiveStation(null);
        }
      }, [props.activeStation]);

      // Active station helper
      var _activeStation = _activeStationId ? _savedStations.find(function(s) { return s.id === _activeStationId; }) : null;

      // ── Color Map (explicit classes for Tailwind JIT compatibility) ──
      var _toolColorMap = {
        emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', hoverBorder: 'hover:border-emerald-400', title: 'text-emerald-800', desc: 'text-emerald-600/70' },
        blue: { bg: 'bg-blue-50', border: 'border-blue-200', hoverBorder: 'hover:border-blue-400', title: 'text-blue-800', desc: 'text-blue-600/70' },
        amber: { bg: 'bg-amber-50', border: 'border-amber-200', hoverBorder: 'hover:border-amber-400', title: 'text-amber-800', desc: 'text-amber-600/70' },
        rose: { bg: 'bg-rose-50', border: 'border-rose-200', hoverBorder: 'hover:border-rose-400', title: 'text-rose-800', desc: 'text-rose-600/70' },
        orange: { bg: 'bg-orange-50', border: 'border-orange-200', hoverBorder: 'hover:border-orange-400', title: 'text-orange-800', desc: 'text-orange-600/70' },
        cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', hoverBorder: 'hover:border-cyan-400', title: 'text-cyan-800', desc: 'text-cyan-600/70' },
        purple: { bg: 'bg-purple-50', border: 'border-purple-200', hoverBorder: 'hover:border-purple-400', title: 'text-purple-800', desc: 'text-purple-600/70' },
        sky: { bg: 'bg-sky-50', border: 'border-sky-200', hoverBorder: 'hover:border-sky-400', title: 'text-sky-800', desc: 'text-sky-600/70' },
        pink: { bg: 'bg-pink-50', border: 'border-pink-200', hoverBorder: 'hover:border-pink-400', title: 'text-pink-800', desc: 'text-pink-600/70' },
        indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', hoverBorder: 'hover:border-indigo-400', title: 'text-indigo-800', desc: 'text-indigo-600/70' },
        fuchsia: { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', hoverBorder: 'hover:border-fuchsia-400', title: 'text-fuchsia-800', desc: 'text-fuchsia-600/70' },
        red: { bg: 'bg-red-50', border: 'border-red-200', hoverBorder: 'hover:border-red-400', title: 'text-red-800', desc: 'text-red-600/70' },
        green: { bg: 'bg-green-50', border: 'border-green-200', hoverBorder: 'hover:border-green-400', title: 'text-green-800', desc: 'text-green-600/70' },
        violet: { bg: 'bg-violet-50', border: 'border-violet-200', hoverBorder: 'hover:border-violet-400', title: 'text-violet-800', desc: 'text-violet-600/70' },
        teal: { bg: 'bg-teal-50', border: 'border-teal-200', hoverBorder: 'hover:border-teal-400', title: 'text-teal-800', desc: 'text-teal-600/70' },
        lime: { bg: 'bg-lime-50', border: 'border-lime-200', hoverBorder: 'hover:border-lime-400', title: 'text-lime-800', desc: 'text-lime-600/70' },
        yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', hoverBorder: 'hover:border-yellow-400', title: 'text-yellow-800', desc: 'text-yellow-600/70' },
        stone: { bg: 'bg-stone-50', border: 'border-stone-200', hoverBorder: 'hover:border-stone-400', title: 'text-stone-800', desc: 'text-stone-600/70' },
        slate: { bg: 'bg-slate-50', border: 'border-slate-200', hoverBorder: 'hover:border-slate-400', title: 'text-slate-800', desc: 'text-slate-600/70' }
      };


      // ── AI Hint for Challenge Feedback ──
      function StemAIHintButton(toolName, question, wrongAnswer, correctAnswer) {
        if (!callGemini || !wrongAnswer) return null;
        return React.createElement("button", { "aria-label": "Set Stem A I Loading",
          onClick: function () {
            setStemAILoading(true);
            stemAIHint(toolName, question, wrongAnswer, correctAnswer, function (hint) {
              setStemAILoading(false);
              setStemAIResponse({ tool: toolName, concept: 'hint', text: hint });
            });
          },
          disabled: stemAILoading,
          className: "flex items-center gap-1 px-2.5 py-1 mt-1 text-[10px] font-bold rounded-full transition-all " +
            (stemAILoading ? "bg-slate-100 text-slate-500 cursor-wait" : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200")
        }, stemAILoading ? "⏳" : "💡", " ", t('stem.ai.get_hint') || "Get a Hint");
      }

      // ── Theme Detection (prop from parent app, falls back to DOM query) ──
      var _stemTheme = _themeProp || 'light';
      if (!_themeProp) {
        try {
          if (document.querySelector('.theme-dark')) _stemTheme = 'dark';
          else if (document.querySelector('.theme-contrast')) _stemTheme = 'contrast';
        } catch (e) { }
      }
      var isDark = _stemTheme === 'dark';
      var isContrast = _stemTheme === 'contrast';
      // Palette shortcuts for canvas rendering
      // ── Keyboard Accessibility ──
      React.useEffect(function () {
        function handleKeyDown(e) {
          // Escape to close STEM Lab
          if (e.key === 'Escape') {
            // If a tool is open, close the tool first
            if (stemLabTool) {
              e.preventDefault();
              setStemLabTool(null);
              announceToSR('Tool closed');
              return;
            }
            // Otherwise close STEM Lab
            e.preventDefault();
            if (typeof setShowStemLab === 'function') setShowStemLab(false);
          }
          // Tab key focus trapping within dialog
          if (e.key === 'Tab') {
            var root = document.querySelector('[data-stem-lab]');
            if (!root) return;
            var focusable = root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable.length === 0) return;
            var first = focusable[0];
            var last = focusable[focusable.length - 1];
            if (e.shiftKey) {
              if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
              if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
          }
          // ? key toggles keyboard help
          if ((e.key === '?' || e.key === '/') && !e.altKey && !e.ctrlKey && !e.metaKey) {
            var tag = document.activeElement ? document.activeElement.tagName : '';
            if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
              e.preventDefault();
              _setShowKeyHelp(function (v) { return !v; });
              announceToSR(_showKeyHelp ? 'Keyboard help hidden' : 'Keyboard help shown');
            }
          }
          // Keyboard shortcuts (with Alt key)
          if (e.altKey) {
            if (e.key === '1') { e.preventDefault(); setStemLabTab('explore'); announceToSR('Switched to Explore tab'); }
            else if (e.key === '2') { e.preventDefault(); setStemLabTab('create'); announceToSR('Switched to Create tab'); }
            else if (e.key === 'Backspace' || e.key === 'b') { e.preventDefault(); setStemLabTool(null); announceToSR('Returned to tool grid'); }
          }
        }
        document.addEventListener('keydown', handleKeyDown);
        // Auto-focus the dialog on mount
        var root = document.querySelector('[data-stem-lab]');
        if (root) {
          var firstBtn = root.querySelector('button');
          if (firstBtn) firstBtn.focus();
        }
        return function () { document.removeEventListener('keydown', handleKeyDown); };
      }, [stemLabTool, stemLabTab]);

      // ── Accessibility: Runtime A11Y Enhancer ──
      React.useEffect(function () {
        try {
          var root = document.querySelector('[data-stem-lab]');
          if (!root) return;
          // Auto-label unlabeled buttons by reading their text content
          root.querySelectorAll('button:not([aria-label])').forEach(function (btn) {
            var txt = (btn.textContent || '').trim().replace(/[\uD800-\uDFFF].|[\u2000-\u3300]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/g, '').trim();
            if (!txt || txt.length < 2) {
              // Emoji-only button — derive label from parent context or set generic
              var parent = btn.closest('[class*="bg-"]');
              var ctx = parent ? (parent.textContent || '').trim().substring(0, 30) : 'Action';
              btn.setAttribute('aria-label', ctx || 'Action button');
            }
          });
          // Auto-label canvases without role
          root.querySelectorAll('canvas:not([role])').forEach(function (cv) {
            cv.setAttribute('role', 'img');
            var dataAttr = Array.from(cv.attributes).find(function (a) { return a.name.startsWith('data-'); });
            cv.setAttribute('aria-label', dataAttr ? dataAttr.name.replace('data-', '').replace(/-/g, ' ') + ' visualization' : 'Interactive STEM visualization');
          });
          // Auto-label inputs without aria-label
          root.querySelectorAll('input:not([aria-label]):not([id])').forEach(function (inp) {
            var prev = inp.previousElementSibling;
            var label = prev ? (prev.textContent || '').trim().substring(0, 40) : inp.placeholder || inp.type || 'Input';
            inp.setAttribute('aria-label', label);
          });
          // Auto-label selects without aria-label
          root.querySelectorAll('select:not([aria-label])').forEach(function (sel) {
            var prev = sel.previousElementSibling;
            var label = prev ? (prev.textContent || '').trim().substring(0, 40) : '';
            if (!label) { var par = sel.closest('[class*="gap-"]'); if (par) { var spn = par.querySelector('span'); label = spn ? (spn.textContent || '').trim().substring(0, 40) : ''; } }
            sel.setAttribute('aria-label', label || 'Selection');
          });
          // Auto-label textareas without aria-label
          root.querySelectorAll('textarea:not([aria-label])').forEach(function (ta) {
            var label = ta.placeholder ? ta.placeholder.substring(0, 40) : '';
            if (!label) { var heading = ta.closest('div') && ta.closest('div').querySelector('h3,h4,label'); label = heading ? (heading.textContent || '').trim().substring(0, 40) : 'Text input'; }
            ta.setAttribute('aria-label', label || 'Text input');
          });
          // Hide decorative SVGs from screen readers
          root.querySelectorAll('svg:not([aria-label]):not([aria-hidden])').forEach(function (svg) {
            svg.setAttribute('aria-hidden', 'true');
          });
          // Fix focus visibility: replace outline-none without replacement
          root.querySelectorAll('[class*="outline-none"]:not([class*="focus:ring"]):not([class*="focus:border"])').forEach(function (el) {
            el.classList.add('focus:ring-2', 'focus:ring-indigo-500', 'focus:ring-offset-1');
          });
          // Auto-set aria-pressed on toggle buttons (buttons with active-state color classes)
          var activeClasses = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-indigo-600', 'bg-pink-600', 'bg-amber-600', 'bg-cyan-600', 'bg-emerald-600', 'bg-red-600'];
          root.querySelectorAll('button:not([aria-pressed])').forEach(function (btn) {
            var cls = btn.className || '';
            var isToggle = activeClasses.some(function (ac) { return cls.includes(ac); });
            if (isToggle) btn.setAttribute('aria-pressed', 'true');
          });
          // Auto-set aria-expanded on collapsible section headers
          root.querySelectorAll('button').forEach(function (btn) {
            var txt = (btn.textContent || '').trim();
            if ((txt.includes('▼') || txt.includes('▲') || txt.includes('▾') || txt.includes('▸')) && !btn.hasAttribute('aria-expanded')) {
              btn.setAttribute('aria-expanded', txt.includes('▼') || txt.includes('▾') ? 'true' : 'false');
            }
          });
        } catch (e) { }
      }, [stemLabTool, stemLabTab, labToolData]);

      // ── Accessibility: Focus trap for modal ──
      React.useEffect(function () {
        var root = document.querySelector('[data-stem-lab]');
        if (!root) return;
        function trapFocus(e) {
          if (e.key !== 'Tab') return;
          var focusable = root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          if (!focusable.length) return;
          var first = focusable[0], last = focusable[focusable.length - 1];
          if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
          else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
        }
        document.addEventListener('keydown', trapFocus);
        return function () { document.removeEventListener('keydown', trapFocus); };
      }, [stemLabTool]);

      // ── Accessibility: aria-live feedback region ──
      var [a11yAnnouncement, setA11yAnnouncement] = React.useState('');
      function announceToSR(msg) {
        setA11yAnnouncement(msg);
        try { var liveEl = document.getElementById('stem-a11y-live'); if (liveEl) liveEl.textContent = msg; } catch (e) { }
        setTimeout(function () { setA11yAnnouncement(''); try { var liveEl = document.getElementById('stem-a11y-live'); if (liveEl) liveEl.textContent = ''; } catch (e) { } }, 3000);
      }

      // ── WCAG Auto-Fixer: Runs after tool renders to catch unlabeled interactive elements ──
      // This is a safety net — tools should be accessible by default, but this catches gaps.
      if (!window._stemA11yFixerActive) {
        window._stemA11yFixerActive = true;
        setInterval(function() {
          try {
            var modal = document.querySelector('.stem-lab-modal');
            if (!modal) return;
            // 1. Auto-label role=button elements that lack aria-label
            var roleButtons = modal.querySelectorAll('[role="button"]:not([aria-label])');
            roleButtons.forEach(function(el) {
              var text = (el.textContent || '').trim().substring(0, 50);
              if (text) el.setAttribute('aria-label', text);
            });
            // 2. Auto-label close buttons (×) that lack aria-label
            var closeBtns = modal.querySelectorAll('button:not([aria-label])');
            closeBtns.forEach(function(el) {
              var text = (el.textContent || '').trim();
              if (text === '\u00d7' || text === 'X' || text === '\u2715' || text === '\u2716') {
                el.setAttribute('aria-label', 'Close');
              } else if (text && text.length <= 60) {
                el.setAttribute('aria-label', text);
              }
            });
            // 3. Auto-label canvas elements that lack aria-label
            var canvases = modal.querySelectorAll('canvas:not([aria-label])');
            canvases.forEach(function(el) {
              el.setAttribute('role', 'img');
              el.setAttribute('aria-label', 'Interactive visualization. Use controls above and below to interact.');
              if (!el.getAttribute('tabindex')) el.setAttribute('tabindex', '0');
            });
            // 4. Auto-label select elements that lack aria-label
            var selects = modal.querySelectorAll('select:not([aria-label]):not([aria-labelledby])');
            selects.forEach(function(el) {
              var prev = el.previousElementSibling;
              if (prev && prev.textContent) {
                el.setAttribute('aria-label', prev.textContent.trim().substring(0, 50));
              } else {
                el.setAttribute('aria-label', 'Selection menu');
              }
            });
            // 5. Auto-label inputs without labels
            var inputs = modal.querySelectorAll('input:not([aria-label]):not([aria-labelledby]):not([id])');
            inputs.forEach(function(el) {
              var placeholder = el.getAttribute('placeholder');
              if (placeholder) el.setAttribute('aria-label', placeholder);
            });
            // 6. Ensure all images in tool have alt text
            var imgs = modal.querySelectorAll('img:not([alt])');
            imgs.forEach(function(el) { el.setAttribute('alt', 'Illustration'); });
          } catch(e) { /* safety net — never crash the app */ }
        }, 2000); // Run every 2 seconds
      }

      // ── Canvas Narration: Dual-Channel (aria-live + TTS) with Smart Detection & Adaptive Verbosity ──
      // Dedupe + encounter maps MUST live on window so they persist across React renders
      // (otherwise init/debounce guards reset every render → infinite repeat narration).
      var _canvasNarrateDedupe = window._alloCanvasNarrateDedupe || (window._alloCanvasNarrateDedupe = {});
      var _canvasNarrateEncounters = window._alloCanvasNarrateEncounters || (window._alloCanvasNarrateEncounters = {});

      // Canvas narration TTS — OFF by default, must be explicitly enabled
      // The aria-live channel still works for screen readers (independent of TTS)
      function _canvasNarrateTTSEnabled() {
        // Global mute always wins
        if (window._alloGlobalMute) return false;
        // URL override: ?a11y=tts (for testing)
        try { if (new URLSearchParams(window.location.search).get('a11y') === 'tts') return true; } catch(e) {}
        // User explicitly enabled it via toggle button
        try { if (localStorage.getItem('alloflow_canvas_narrate') === 'on') return true; } catch(e) {}
        return false;
      }

      /**
       * canvasNarrate — Dual-channel narration for canvas simulations
       * @param {string} toolId — e.g., 'galaxy', 'physics', 'wave'
       * @param {string} eventKey — e.g., 'launch', 'landing', 'paramChange'
       * @param {object} variants — { first: 'Full narration...', repeat: 'Short version', terse: '142m' }
       *     OR a plain string (treated as all-encounters-same narration)
       * @param {object} options — { debounce: 2000, speak: true/false }
       */
      function canvasNarrate(toolId, eventKey, variants, options) {
        options = options || {};
        var debounceMs = options.debounce != null ? options.debounce : 2000;

        // For 'init' events, only fire ONCE per tool session (re-renders should not re-narrate)
        if (eventKey === 'init') {
          var initKey = '__init__' + toolId;
          if (_canvasNarrateDedupe[initKey]) return;
          _canvasNarrateDedupe[initKey] = true;
          // Don't auto-clear init flag — stays set until page reload
        }

        // Resolve variants to the right verbosity level
        var msg;
        if (typeof variants === 'string') {
          msg = variants;
        } else {
          var encounterKey = toolId + '::' + eventKey;
          var count = _canvasNarrateEncounters[encounterKey] || 0;
          _canvasNarrateEncounters[encounterKey] = count + 1;
          if (count === 0 && variants.first) {
            msg = variants.first;
          } else if (count === 1 && variants.repeat) {
            msg = variants.repeat;
          } else {
            msg = variants.terse || variants.repeat || variants.first || '';
          }
        }

        if (!msg) return;

        // Debounce: skip if same toolId+eventKey fired within window (non-init events)
        var dedupeKey = toolId + ':' + eventKey;
        if (eventKey !== 'init' && debounceMs > 0 && _canvasNarrateDedupe[dedupeKey]) return;
        if (eventKey !== 'init' && debounceMs > 0) {
          _canvasNarrateDedupe[dedupeKey] = true;
          setTimeout(function() { delete _canvasNarrateDedupe[dedupeKey]; }, debounceMs);
        }

        // Channel 1: aria-live (always active — silent unless SR is running)
        announceToSR(msg);

        // Channel 2: AlloFlow TTS (only if Smart Detection says yes)
        var speakAloud = options.speak != null ? options.speak : _canvasNarrateTTSEnabled();
        if (speakAloud && callTTS) {
          try { callTTS(msg).then(function(url) { if (url) { var a = new Audio(url); a.play().catch(function() {}); } }).catch(function() {}); } catch(e) {}
        }
      }

      // Manual toggle: let users flip canvas narration on/off
      function setCanvasNarrateEnabled(enabled) {
        try { localStorage.setItem('alloflow_canvas_narrate', enabled ? 'on' : 'off'); } catch(e) {}
      }

      // ── Reduced Motion Detection (reads parent app's header button toggle) ──
      var _reduceMotion = false;
      try {
        if (document.querySelector('.reduce-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches) _reduceMotion = true;
      } catch (e) { }

      var _pal = isDark ? { bg: '#1e293b', bgAlt: '#334155', text: '#f1f5f9', textMuted: '#94a3b8', border: '#475569', card: '#1e293b', accent: '#38bdf8' }
        : isContrast ? { bg: '#000000', bgAlt: '#1a1a1a', text: '#ffffff', textMuted: '#e2e8f0', border: '#fbbf24', card: '#000000', accent: '#fbbf24' }
          : { bg: '#ffffff', bgAlt: '#f8fafc', text: '#1e293b', textMuted: '#64748b', border: '#e2e8f0', card: '#ffffff', accent: '#3b82f6' };

      // ── localStorage persistence (wrapped in useEffect to avoid setState-during-render) ──
      React.useEffect(function () {
        if (labToolData._persisted) return;
        try {
          var _saved = localStorage.getItem('alloflow_stemlab_v2');
          if (_saved) {
            var _parsed = JSON.parse(_saved);
            if (_parsed && typeof _parsed === 'object') {
              setLabToolData(function (prev) { return Object.assign({}, prev, _parsed, { _persisted: true }); });
            } else {
              setLabToolData(function (prev) { return Object.assign({}, prev, { _persisted: true }); });
            }
          } else {
            setLabToolData(function (prev) { return Object.assign({}, prev, { _persisted: true }); });
          }
        } catch (e) {
          setLabToolData(function (prev) { return Object.assign({}, prev, { _persisted: true }); });
        }
      }, [labToolData._persisted]);
      // Save to localStorage on meaningful changes
      React.useEffect(function () {
        if (!labToolData._persisted) return;
        try {
          var _toSave = {};
          // @tool waterCycle
          ['calculus', 'wave', 'physics', 'punnett', 'chemBalance', 'galaxy', 'rockCycle', 'waterCycle', '_tutorialSeen'].forEach(function (k) {
            if (labToolData[k]) _toSave[k] = labToolData[k];
          });
          localStorage.setItem('alloflow_stemlab_v2', JSON.stringify(_toSave));
        } catch (e) { }
      }, [labToolData]);

      // ── Tutorial Overlay Helper ──
      var _tutorialSeen = labToolData._tutorialSeen || {};
      function markTutorialSeen(toolId) {
        setLabToolData(function (prev) {
          var seen = Object.assign({}, prev._tutorialSeen || {});
          seen[toolId] = true;
          return Object.assign({}, prev, { _tutorialSeen: seen });
        });
      }
      // Track whether tutorial needs auto-completion (deferred to useEffect to avoid setState-during-render)
      var [_tutorialAutoComplete, _setTutorialAutoComplete] = React.useState(null);
      React.useEffect(function () {
        if (_tutorialAutoComplete) {
          markTutorialSeen(_tutorialAutoComplete);
          setLabToolData(function (p) { return Object.assign({}, p, { _tutorialStep: 0 }); });
          _setTutorialAutoComplete(null);
        }
      }, [_tutorialAutoComplete]);
      // ── Synth Keyboard Hook (MUST be at top level to satisfy React Rules of Hooks) ──
      React.useEffect(function () {
        if (stemLabTab !== 'explore' || stemLabTool !== 'musicSynth') return;
        function onKeyDown(e) { if (window._alloSynthKeyDown) window._alloSynthKeyDown(e); }
        function onKeyUp(e) { if (window._alloSynthKeyUp) window._alloSynthKeyUp(e); }
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return function () { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
      }, [stemLabTab, stemLabTool, labToolData]);
      /* companionPlanting canvas sync: removed — see stem_tool_companionplanting.js */
      /* graphCalc math.js loader: removed — see stem_tool_graphcalc.js */
      /* graphCalc canvas renderer: removed — see stem_tool_graphcalc.js */
      // ── 3D Tools: Load Three.js on demand (Geometry Sandbox + Architecture Studio) ──
      React.useEffect(function () {
        if (stemLabTab !== 'explore' || (stemLabTool !== 'geoSandbox' && stemLabTool !== 'archStudio' && stemLabTool !== 'geometryWorld')) return;
        if (window.THREE) { setLabToolData(function (p) { return Object.assign({}, p, { _threeLoaded: true }); }); return; }
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        s.async = true;
        s.onload = function () {
          // Load OrbitControls after Three.js is ready
          var s2 = document.createElement('script');
          s2.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
          s2.async = true;
          s2.onload = function () {
            if (typeof addToast === 'function') addToast('\uD83D\uDD37 3D engine loaded', 'info');
            setLabToolData(function (p) { return Object.assign({}, p, { _threeLoaded: true }); });
          };
          s2.onerror = function () {
            console.warn('[StemLab] OrbitControls failed to load, proceeding without orbit controls');
            setLabToolData(function (p) { return Object.assign({}, p, { _threeLoaded: true }); });
          };
          document.head.appendChild(s2);
        };
        s.onerror = function () {
          console.error('[StemLab] Three.js failed to load');
          if (typeof addToast === 'function') addToast('\u274c 3D engine failed to load', 'error');
        };
        document.head.appendChild(s);
      }, [stemLabTab, stemLabTool]);
      // ── Geometry Sandbox: Scene init, render loop, shape updates (MUST be at top level) ──
      React.useEffect(function () {
        if (stemLabTab !== 'explore' || stemLabTool !== 'geoSandbox') return;
        if (!window.THREE) return;
        var cnv = document.getElementById('geo-sandbox-canvas');
        if (!cnv) return;
        var gd = (labToolData && labToolData.geoSandbox) || {};
        var shapeType = gd.shape || 'box';
        var dims = gd.dims || { w: 3, h: 3, d: 3, r: 1.5, rTop: 1.5, rBot: 1.5, tube: 0.5, segs: 32 };
        var shapeColor = gd.color || '#60a5fa';
        var wireframe = gd.wireframe || false;
        var opacity = gd.opacity != null ? gd.opacity : 1;
        var THREE = window.THREE;

        // Init scene if not already
        if (!window._geoScene) {
          var scene = new THREE.Scene();
          scene.background = new THREE.Color('#0f172a');
          var camera = new THREE.PerspectiveCamera(50, cnv.clientWidth / cnv.clientHeight, 0.1, 1000);
          camera.position.set(6, 5, 8);
          camera.lookAt(0, 0, 0);
          var renderer = new THREE.WebGLRenderer({ canvas: cnv, antialias: true });
          renderer.setSize(cnv.clientWidth, cnv.clientHeight);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          // Lights
          var ambient = new THREE.AmbientLight(0xffffff, 0.5);
          scene.add(ambient);
          var directional = new THREE.DirectionalLight(0xffffff, 0.8);
          directional.position.set(5, 10, 7.5);
          scene.add(directional);
          var fillLight = new THREE.DirectionalLight(0xc7d2fe, 0.3);
          fillLight.position.set(-5, 3, -5);
          scene.add(fillLight);
          // Ground grid
          var gridHelper = new THREE.GridHelper(20, 20, 0x334155, 0x1e293b);
          scene.add(gridHelper);
          // Orbit controls
          var controls;
          if (THREE.OrbitControls) {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.08;
            controls.minDistance = 2;
            controls.maxDistance = 30;
          }
          // Animation loop
          var animId;
          var animate = function () {
            animId = requestAnimationFrame(animate);
            if (controls) controls.update();
            renderer.render(scene, camera);
          };
          animate();
          window._geoScene = { scene: scene, camera: camera, renderer: renderer, controls: controls, animId: animId, mesh: null };
        }

        var gs = window._geoScene;
        // Remove old mesh
        if (gs.mesh) { gs.scene.remove(gs.mesh); gs.mesh.geometry.dispose(); if (gs.mesh.material) gs.mesh.material.dispose(); gs.mesh = null; }
        // Create geometry based on shape type
        var geometry;
        switch (shapeType) {
          case 'sphere': geometry = new THREE.SphereGeometry(dims.r || 1.5, dims.segs || 32, dims.segs || 32); break;
          case 'cylinder': geometry = new THREE.CylinderGeometry(dims.rTop || 1.5, dims.rBot || 1.5, dims.h || 3, dims.segs || 32); break;
          case 'cone': geometry = new THREE.ConeGeometry(dims.r || 1.5, dims.h || 3, dims.segs || 32); break;
          case 'pyramid': geometry = new THREE.ConeGeometry(dims.r || 1.5, dims.h || 3, 4); break;
          case 'torus': geometry = new THREE.TorusGeometry(dims.r || 1.5, dims.tube || 0.5, 16, dims.segs || 32); break;
          case 'prism': {
            var triShape = new THREE.Shape();
            var bw = dims.w || 3;
            triShape.moveTo(-bw / 2, 0);
            triShape.lineTo(bw / 2, 0);
            triShape.lineTo(0, dims.h || 3);
            triShape.closePath();
            geometry = new THREE.ExtrudeGeometry(triShape, { depth: dims.d || 3, bevelEnabled: false });
            geometry.center();
            break;
          }
          default: geometry = new THREE.BoxGeometry(dims.w || 3, dims.h || 3, dims.d || 3); break;
        }
        // Material
        var material = new THREE.MeshPhongMaterial({
          color: new THREE.Color(shapeColor),
          wireframe: wireframe,
          transparent: opacity < 1,
          opacity: opacity,
          shininess: 60,
          flatShading: false
        });
        var mesh = new THREE.Mesh(geometry, material);
        // Position shape above ground
        var bbox = new THREE.Box3().setFromObject(mesh);
        mesh.position.y = -bbox.min.y;
        gs.scene.add(mesh);
        gs.mesh = mesh;

        // Resize handler
        var handleResize = function () {
          if (!cnv || !gs.renderer) return;
          gs.renderer.setSize(cnv.clientWidth, cnv.clientHeight);
          gs.camera.aspect = cnv.clientWidth / cnv.clientHeight;
          gs.camera.updateProjectionMatrix();
        };
        window.addEventListener('resize', handleResize);

        return function () {
          window.removeEventListener('resize', handleResize);
        };
      }, [stemLabTab, stemLabTool, labToolData]);
      // ── Geometry Sandbox cleanup on exit ──
      React.useEffect(function () {
        return function () {
          if (window._geoScene) {
            cancelAnimationFrame(window._geoScene.animId);
            if (window._geoScene.renderer) window._geoScene.renderer.dispose();
            if (window._geoScene.controls) window._geoScene.controls.dispose();
            window._geoScene = null;
          }
        };
      }, [stemLabTool]);
      // ── Architecture Studio: Scene init, render loop, block placement (MUST be at top level) ──
      React.useEffect(function () {
        if (stemLabTab !== 'explore' || stemLabTool !== 'archStudio') return;
        if (!window.THREE) return;
        var cnv = document.getElementById('arch-studio-canvas');
        if (!cnv) return;
        var gd = (labToolData && labToolData.archStudio) || {};
        var blocks = gd.blocks || [];
        var THREE = window.THREE;

        // ── Init scene if not already ──
        if (!window._archScene) {
          var scene = new THREE.Scene();
          scene.background = new THREE.Color('#131a2b');
          scene.fog = new THREE.Fog('#131a2b', 30, 60);
          var camera = new THREE.PerspectiveCamera(50, cnv.clientWidth / cnv.clientHeight, 0.1, 1000);
          camera.position.set(14, 12, 18);
          camera.lookAt(10, 0, 10);
          var renderer = new THREE.WebGLRenderer({ canvas: cnv, antialias: true });
          renderer.setSize(cnv.clientWidth, cnv.clientHeight);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          renderer.shadowMap.enabled = true;
          renderer.shadowMap.type = THREE.PCFSoftShadowMap;
          // Lights
          var ambient = new THREE.AmbientLight(0xffffff, 0.45);
          scene.add(ambient);
          var sun = new THREE.DirectionalLight(0xfff4e0, 0.9);
          sun.position.set(15, 20, 10);
          sun.castShadow = true;
          sun.shadow.mapSize.width = 1024;
          sun.shadow.mapSize.height = 1024;
          sun.shadow.camera.near = 0.5;
          sun.shadow.camera.far = 50;
          sun.shadow.camera.left = -25;
          sun.shadow.camera.right = 25;
          sun.shadow.camera.top = 25;
          sun.shadow.camera.bottom = -25;
          scene.add(sun);
          var fill = new THREE.DirectionalLight(0xc7d2fe, 0.25);
          fill.position.set(-10, 8, -5);
          scene.add(fill);
          // Ground plane
          var groundGeo = new THREE.PlaneGeometry(20, 20);
          var groundMat = new THREE.MeshPhongMaterial({ color: 0x1e293b, side: THREE.DoubleSide });
          var ground = new THREE.Mesh(groundGeo, groundMat);
          ground.rotation.x = -Math.PI / 2;
          ground.position.set(10, 0, 10);
          ground.receiveShadow = true;
          ground.name = 'ground';
          scene.add(ground);
          // Grid overlay
          var gridHelper = new THREE.GridHelper(20, 20, 0x475569, 0x334155);
          gridHelper.position.set(10, 0.01, 10);
          scene.add(gridHelper);
          // Orbit controls
          var controls;
          if (THREE.OrbitControls) {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.08;
            controls.minDistance = 3;
            controls.maxDistance = 40;
            controls.target.set(10, 2, 10);
          }
          // Raycaster + mouse
          var raycaster = new THREE.Raycaster();
          var mouse = new THREE.Vector2();
          // Ghost preview mesh
          var ghostMat = new THREE.MeshPhongMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.35, depthWrite: false });
          var ghostMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), ghostMat);
          ghostMesh.visible = false;
          ghostMesh.name = '_ghost';
          scene.add(ghostMesh);
          // Animation loop
          var animId;
          var animate = function () {
            animId = requestAnimationFrame(animate);
            if (controls) controls.update();
            renderer.render(scene, camera);
          };
          animate();
          // ── Pointer events for placement ──
          var _getGridPos = function (evt) {
            var rect = cnv.getBoundingClientRect();
            mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            // Collect all clickable objects (ground + placed block meshes)
            var targets = [];
            scene.traverse(function (obj) {
              if (obj.isMesh && obj.name !== '_ghost') targets.push(obj);
            });
            var hits = raycaster.intersectObjects(targets, false);
            if (hits.length === 0) return null;
            var hit = hits[0];
            var n = hit.face.normal.clone();
            // If we hit ground, place at that grid cell at y=0
            if (hit.object.name === 'ground') {
              var gx = Math.floor(hit.point.x);
              var gz = Math.floor(hit.point.z);
              if (gx < 0 || gx >= 20 || gz < 0 || gz >= 20) return null;
              return { x: gx, y: 0, z: gz };
            }
            // If we hit a block, place adjacent to it along the face normal
            var center = new THREE.Vector3();
            hit.object.getWorldPosition(center);
            // Use floor for x/z (mesh centers are at b.x+0.5) and round with offset for y
            var nx = Math.floor(center.x + n.x);
            var ny = Math.round(center.y - 0.5 + n.y);
            var nz = Math.floor(center.z + n.z);
            if (nx < 0 || nx >= 20 || ny < 0 || ny >= 10 || nz < 0 || nz >= 20) return null;
            return { x: nx, y: ny, z: nz };
          };
          var _getClickedBlock = function (evt) {
            var rect = cnv.getBoundingClientRect();
            mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            var targets = [];
            scene.traverse(function (obj) {
              if (obj.isMesh && obj.name !== '_ghost' && obj.name !== 'ground') targets.push(obj);
            });
            var hits = raycaster.intersectObjects(targets, false);
            if (hits.length === 0) return null;
            var obj = hits[0].object;
            // obj.userData holds { bx, by, bz }
            return obj.userData;
          };
          // Mouse move → update ghost position (only in place mode)
          cnv.addEventListener('mousemove', function (evt) {
            var _as = window._archScene;
            var _act = (_as && _as._active) || {};
            if ((_act.mode || 'place') !== 'place') { ghostMesh.visible = false; return; }
            var pos = _getGridPos(evt);
            if (!pos) { ghostMesh.visible = false; return; }
            ghostMesh.visible = true;
            ghostMesh.position.set(pos.x + 0.5, pos.y + 0.5, pos.z + 0.5);
          });
          // Click → place/erase/paint  (reads from window._archScene._active to avoid stale closure)
          cnv.addEventListener('click', function (evt) {
            var _as = window._archScene; if (!_as) return;
            var _act = _as._active || {};
            var mode = _act.mode || 'place';
            if (mode === 'place') {
              var pos = _getGridPos(evt);
              if (!pos) return;
              var _shape = _act.activeShape || 'block';
              var _material = _act.activeMaterial || 'stone';
              var _color = _act.activeColor || '#94a3b8';
              setLabToolData(function (p) {
                var a = Object.assign({}, p.archStudio || {});
                var curBlocks = a.blocks || [];
                var exists = curBlocks.some(function (b) { return b.x === pos.x && b.y === pos.y && b.z === pos.z; });
                if (exists) return p;
                var newBlock = { x: pos.x, y: pos.y, z: pos.z, shape: _shape, material: _material, color: _color };
                return Object.assign({}, p, { archStudio: Object.assign({}, a, { blocks: curBlocks.concat([newBlock]) }) });
              });
            } else if (mode === 'erase') {
              var bd = _getClickedBlock(evt);
              if (!bd) return;
              setLabToolData(function (p) {
                var a = Object.assign({}, p.archStudio || {});
                var nb = (a.blocks || []).filter(function (b) { return !(b.x === bd.bx && b.y === bd.by && b.z === bd.bz); });
                return Object.assign({}, p, { archStudio: Object.assign({}, a, { blocks: nb }) });
              });
            } else if (mode === 'paint') {
              var bd2 = _getClickedBlock(evt);
              if (!bd2) return;
              var _pMat = _act.activeMaterial || 'stone';
              var _pCol = _act.activeColor || '#94a3b8';
              setLabToolData(function (p) {
                var a = Object.assign({}, p.archStudio || {});
                var nb = (a.blocks || []).map(function (b) {
                  if (b.x === bd2.bx && b.y === bd2.by && b.z === bd2.bz) {
                    return Object.assign({}, b, { material: _pMat, color: _pCol });
                  }
                  return b;
                });
                return Object.assign({}, p, { archStudio: Object.assign({}, a, { blocks: nb }) });
              });
            }
          });
          window._archScene = { scene: scene, camera: camera, renderer: renderer, controls: controls, animId: animId, ghostMesh: ghostMesh, blockMeshes: [], _active: {} };
        }

        // ── Update active state on every re-render (avoids stale closure in click handler) ──
        window._archScene._active = { activeShape: gd.activeShape || 'block', activeMaterial: gd.activeMaterial || 'stone', activeColor: gd.activeColor || '#94a3b8', mode: gd.mode || 'place', styleMode: gd.styleMode || 'architect', blueprintView: gd.blueprintView || false };

        // ── Rebuild all block meshes ──
        var as = window._archScene;
        var _styleMode = gd.styleMode || 'architect';
        var _blueprintView = gd.blueprintView || false;
        // Remove old block meshes (including stud children)
        as.blockMeshes.forEach(function (m) {
          while (m.children.length > 0) { var c = m.children[0]; m.remove(c); if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); }
          as.scene.remove(m); m.geometry.dispose(); if (m.material) m.material.dispose();
        });
        as.blockMeshes = [];
        // Material colors (architect vs brick mode)
        var matColors = _styleMode === 'bricks'
          ? { stone: '#ef4444', brick: '#f59e0b', wood: '#22c55e', glass: '#3b82f6', marble: '#f8fafc', metal: '#1e293b' }
          : { stone: '#94a3b8', brick: '#b45309', wood: '#92400e', glass: '#38bdf8', marble: '#f1f5f9', metal: '#cbd5e1' };
        // Shape geometry factory
        var mkGeo = function (shape) {
          if (_styleMode === 'bricks') {
            // Brick mode: shapes keep their form but get brick-scale sizing (gap for stud seams)
            switch (shape) {
              case 'slab': return new THREE.BoxGeometry(0.95, 0.45, 0.95, 2, 1, 2);
              case 'ramp': {
                var rS = new THREE.Shape();
                rS.moveTo(-0.475, -0.475);
                rS.lineTo(0.475, -0.475);
                rS.lineTo(0.475, 0.475);
                rS.closePath();
                var rG = new THREE.ExtrudeGeometry(rS, { depth: 0.95, bevelEnabled: false });
                rG.center();
                return rG;
              }
              case 'column': return new THREE.CylinderGeometry(0.33, 0.33, 0.95, 16);
              case 'cylinder': return new THREE.CylinderGeometry(0.475, 0.475, 0.95, 32);
              case 'lbeam': {
                var lbs1 = new THREE.Shape();
                lbs1.moveTo(-0.475, -0.475); lbs1.lineTo(0.475, -0.475); lbs1.lineTo(0.475, 0.475);
                lbs1.lineTo(0, 0.475); lbs1.lineTo(0, 0); lbs1.lineTo(-0.475, 0); lbs1.closePath();
                var lbg1 = new THREE.ExtrudeGeometry(lbs1, { depth: 0.95, bevelEnabled: false });
                lbg1.center(); return lbg1;
              }
              case 'window': return new THREE.BoxGeometry(0.95, 0.95, 0.285);
              case 'door': return new THREE.BoxGeometry(0.95, 0.95, 0.38);
              case 'arch': {
                var aG = new THREE.TorusGeometry(0.42, 0.12, 8, 16, Math.PI);
                aG.rotateX(Math.PI / 2);
                return aG;
              }
              case 'roof': {
                var rfS = new THREE.Shape();
                rfS.moveTo(-0.475, -0.33);
                rfS.lineTo(0.475, -0.33);
                rfS.lineTo(0, 0.33);
                rfS.closePath();
                var rfG = new THREE.ExtrudeGeometry(rfS, { depth: 0.95, bevelEnabled: false });
                rfG.center();
                return rfG;
              }
              case 'pyramid': return new THREE.ConeGeometry(0.475, 0.95, 4);
              case 'dome': return new THREE.SphereGeometry(0.475, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
              default: return new THREE.BoxGeometry(0.95, 0.95, 0.95, 2, 2, 2);
            }
          }
          switch (shape) {
            case 'slab': return new THREE.BoxGeometry(1, 0.5, 1);
            case 'ramp': {
              var rampShape = new THREE.Shape();
              rampShape.moveTo(-0.5, -0.5);
              rampShape.lineTo(0.5, -0.5);
              rampShape.lineTo(0.5, 0.5);
              rampShape.closePath();
              var geo = new THREE.ExtrudeGeometry(rampShape, { depth: 1, bevelEnabled: false });
              geo.center();
              return geo;
            }
            case 'column': return new THREE.CylinderGeometry(0.35, 0.35, 1, 16);
            case 'cylinder': return new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
            case 'lbeam': {
              var lbs2 = new THREE.Shape();
              lbs2.moveTo(-0.5, -0.5); lbs2.lineTo(0.5, -0.5); lbs2.lineTo(0.5, 0.5);
              lbs2.lineTo(0, 0.5); lbs2.lineTo(0, 0); lbs2.lineTo(-0.5, 0); lbs2.closePath();
              var lbg2 = new THREE.ExtrudeGeometry(lbs2, { depth: 1, bevelEnabled: false });
              lbg2.center(); return lbg2;
            }
            case 'window': return new THREE.BoxGeometry(1, 1, 0.3);
            case 'door': return new THREE.BoxGeometry(1, 1, 0.4);
            case 'arch': {
              var archGeo = new THREE.TorusGeometry(0.45, 0.12, 8, 16, Math.PI);
              archGeo.rotateX(Math.PI / 2);
              return archGeo;
            }
            case 'roof': {
              var roofShape = new THREE.Shape();
              roofShape.moveTo(-0.5, -0.35);
              roofShape.lineTo(0.5, -0.35);
              roofShape.lineTo(0, 0.35);
              roofShape.closePath();
              var roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 1, bevelEnabled: false });
              roofGeo.center();
              return roofGeo;
            }
            case 'pyramid': return new THREE.ConeGeometry(0.5, 1, 4);
            case 'dome': {
              var domeGeo = new THREE.SphereGeometry(0.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
              return domeGeo;
            }
            default: return new THREE.BoxGeometry(1, 1, 1);
          }
        };
        // Stud geometry (reusable, only created once in brick mode)
        var studGeo = _styleMode === 'bricks' ? new THREE.CylinderGeometry(0.15, 0.15, 0.12, 12) : null;
        // Create mesh for each placed block
        blocks.forEach(function (b) {
          var geo = mkGeo(b.shape || 'block');
          var col = _styleMode === 'bricks' ? (matColors[b.material] || b.color || '#ef4444') : (b.color || matColors[b.material] || '#94a3b8');
          var isGlass = (b.material === 'glass') && _styleMode !== 'bricks';
          var mat = new THREE.MeshPhongMaterial({
            color: new THREE.Color(col),
            transparent: isGlass,
            opacity: isGlass ? 0.4 : 1,
            shininess: _styleMode === 'bricks' ? 60 : ((b.material === 'metal') ? 100 : (b.material === 'marble' ? 80 : 40)),
            flatShading: _styleMode === 'bricks' ? false : (b.material === 'stone' || b.material === 'brick')
          });
          var mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(b.x + 0.5, (b.shape === 'slab' ? 0.25 : (b.shape === 'dome' ? 0 : 0.5)) + b.y, b.z + 0.5);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData = { bx: b.x, by: b.y, bz: b.z };
          // In brick mode, add stud bumps on top
          if (_styleMode === 'bricks' && studGeo && (b.shape || 'block') !== 'slab') {
            var studMat = new THREE.MeshPhongMaterial({ color: new THREE.Color(col), shininess: 80 });
            var offsets = [[-0.2, 0.2], [0.2, 0.2], [-0.2, -0.2], [0.2, -0.2]];
            offsets.forEach(function (off) {
              var stud = new THREE.Mesh(studGeo, studMat);
              stud.position.set(off[0], 0.535, off[1]);
              stud.castShadow = true;
              mesh.add(stud);
            });
          }
          as.scene.add(mesh);
          as.blockMeshes.push(mesh);
        });
        // ── Blueprint view: switch camera ──
        if (_blueprintView) {
          // Move camera to top-down orthographic-like position
          as.camera.position.set(10, 25, 10);
          as.camera.lookAt(10, 0, 10);
          as.camera.fov = 30;
          as.camera.updateProjectionMatrix();
          if (as.controls) as.controls.target.set(10, 0, 10);
          as.scene.background = new THREE.Color('#0c1524');
        } else {
          as.camera.fov = 50;
          as.camera.updateProjectionMatrix();
          as.scene.background = new THREE.Color('#131a2b');
        }
        // Update ghost color
        var gd3 = gd;
        if (as.ghostMesh) {
          as.ghostMesh.material.color.set(gd3.activeColor || matColors[gd3.activeMaterial] || '#60a5fa');
          // Update ghost geometry for selected shape
          var ghostGeo = mkGeo(gd3.activeShape || 'block');
          as.ghostMesh.geometry.dispose();
          as.ghostMesh.geometry = ghostGeo;
          // Hide ghost in erase/paint mode
          if ((gd3.mode || 'place') !== 'place') as.ghostMesh.visible = false;
        }

        // Resize handler
        var handleResize = function () {
          if (!cnv || !as.renderer) return;
          as.renderer.setSize(cnv.clientWidth, cnv.clientHeight);
          as.camera.aspect = cnv.clientWidth / cnv.clientHeight;
          as.camera.updateProjectionMatrix();
        };
        window.addEventListener('resize', handleResize);
        return function () { window.removeEventListener('resize', handleResize); };
      }, [stemLabTab, stemLabTool, labToolData]);
      // ── Architecture Studio cleanup on exit ──
      React.useEffect(function () {
        return function () {
          if (window._archScene) {
            cancelAnimationFrame(window._archScene.animId);
            if (window._archScene.renderer) window._archScene.renderer.dispose();
            if (window._archScene.controls) window._archScene.controls.dispose();
            window._archScene.blockMeshes.forEach(function (m) { m.geometry.dispose(); if (m.material) m.material.dispose(); });
            window._archScene = null;
          }
        };
      }, [stemLabTool]);
      /* companionPlanting day ticker: removed — see stem_tool_companionplanting.js */
      // ── Coding Playground: Canvas ref (MUST be at top level) ──
      var _codingCanvasRef = React.useRef(null);
      // ── Coding Playground: Canvas drawing is handled by enhanced useEffect below ──
      // ── Coding Playground: Keyboard shortcuts ──
      React.useEffect(function () {
        if (stemLabTab !== 'explore' || stemLabTool !== 'codingPlayground') return;
        function handleKey(e) {
          if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            var cpd = (labToolData && labToolData._codingPlayground) || {};
            var us = cpd.undoStack || [];
            if (us.length === 0) return;
            var prev = us[us.length - 1];
            var newUndo = us.slice(0, -1);
            var newRedo = (cpd.redoStack || []).concat([JSON.parse(JSON.stringify(cpd.blocks || []))]);
            setLabToolData(function (p) {
              var cp = Object.assign({}, (p && p._codingPlayground) || {});
              cp.blocks = prev; cp.undoStack = newUndo; cp.redoStack = newRedo;
              if (cp.codeMode === 'text') {
                // rebuild text from blocks
                cp.textCode = ''; // will be recalculated on next render
              }
              return Object.assign({}, p, { _codingPlayground: cp });
            });
          }
          if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            e.preventDefault();
            var cpd2 = (labToolData && labToolData._codingPlayground) || {};
            var rs = cpd2.redoStack || [];
            if (rs.length === 0) return;
            var next = rs[rs.length - 1];
            var newRedo2 = rs.slice(0, -1);
            var newUndo2 = (cpd2.undoStack || []).concat([JSON.parse(JSON.stringify(cpd2.blocks || []))]);
            setLabToolData(function (p) {
              var cp = Object.assign({}, (p && p._codingPlayground) || {});
              cp.blocks = next; cp.undoStack = newUndo2; cp.redoStack = newRedo2;
              return Object.assign({}, p, { _codingPlayground: cp });
            });
          }
        }
        window.addEventListener('keydown', handleKey);
        return function () { window.removeEventListener('keydown', handleKey); };
      }, [stemLabTab, stemLabTool, labToolData]);
      // ── Slide Rule: Canvas ref (MUST be at top level) ──
      var _slideRuleCanvasRef = React.useRef(null);
      // ── Slide Rule: Canvas rendering ──
      React.useEffect(function () {
        var _manipMode = (labToolData && labToolData._mathManipMode) || 'blocks';
        if (stemLabTab !== 'explore' || stemLabTool !== 'base10' || _manipMode !== 'slideRule') return;
        var _srd = (labToolData && labToolData._slideRule) || { cOffset: 0, cursorPos: 0.301 };
        var cvs = _slideRuleCanvasRef.current;
        if (!cvs) return;
        var ctx = cvs.getContext('2d');
        var W = 600, H = 180;
        cvs.width = W; cvs.height = H;
        var PAD = 40, RULER_W = W - PAD * 2, RULER_H = 36;
        var cOff = _srd.cOffset || 0;
        var cursorX = _srd.cursorPos || 0.301;
        // Background
        ctx.fillStyle = '#fefce8'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#d4a574'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, W - 2, H - 2);
        // Helper: log position
        function logX(val) { return PAD + (Math.log10(val)) * RULER_W; }
        // Draw scale function
        function drawScale(yTop, offset, label, bgColor, textColor) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(PAD, yTop, RULER_W, RULER_H);
          ctx.strokeStyle = '#92400e'; ctx.lineWidth = 0.5;
          ctx.strokeRect(PAD, yTop, RULER_W, RULER_H);
          // Tick marks
          for (var n = 1; n <= 10; n++) {
            var x = PAD + (Math.log10(n) + offset) * RULER_W;
            if (x < PAD - 1 || x > PAD + RULER_W + 1) continue;
            // Major tick
            ctx.strokeStyle = '#451a03'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(x, yTop); ctx.lineTo(x, yTop + RULER_H); ctx.stroke();
            // Label
            ctx.fillStyle = textColor; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
            ctx.fillText(String(n), x, yTop + RULER_H + 10);
            // Minor ticks
            if (n < 10) {
              var minorCount = n === 1 ? 10 : 5;
              for (var m = 1; m < minorCount; m++) {
                var minorVal = n + m * (n === 1 ? 0.1 : 0.2);
                var mx = PAD + (Math.log10(minorVal) + offset) * RULER_W;
                if (mx < PAD || mx > PAD + RULER_W) continue;
                ctx.strokeStyle = '#78350f'; ctx.lineWidth = 0.5;
                var tickH = m % (n === 1 ? 5 : 1) === 0 ? RULER_H * 0.5 : RULER_H * 0.3;
                ctx.beginPath(); ctx.moveTo(mx, yTop); ctx.lineTo(mx, yTop + tickH); ctx.stroke();
              }
            }
          }
          // Scale label
          ctx.fillStyle = textColor; ctx.font = 'bold 14px serif'; ctx.textAlign = 'right';
          ctx.fillText(label, PAD - 6, yTop + RULER_H / 2 + 5);
        }
        // D scale (fixed)
        drawScale(H - 50, 0, 'D', '#fef3c7', '#92400e');
        // C scale (movable)
        ctx.save();
        ctx.beginPath(); ctx.rect(PAD, 0, RULER_W, H); ctx.clip();
        drawScale(H - 50 - RULER_H - 2, cOff, 'C', '#ecfccb', '#365314');
        ctx.restore();
        // Cursor hairline
        var cx = PAD + cursorX * RULER_W;
        ctx.strokeStyle = 'rgba(220,38,38,0.8)'; ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(cx, 8); ctx.lineTo(cx, H - 8); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(220,38,38,0.9)'; ctx.beginPath();
        ctx.moveTo(cx - 5, 8); ctx.lineTo(cx + 5, 8); ctx.lineTo(cx, 14); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx - 5, H - 8); ctx.lineTo(cx + 5, H - 8); ctx.lineTo(cx, H - 14); ctx.closePath(); ctx.fill();
        // Readout
        var dVal = Math.pow(10, cursorX);
        var cVal = Math.pow(10, cursorX - cOff);
        var product = dVal * Math.pow(10, cOff);
        ctx.fillStyle = '#451a03'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
        ctx.fillText('D: ' + dVal.toFixed(2) + '  ×  C: ' + cVal.toFixed(2) + '  =  ' + product.toFixed(2), W / 2, 30);
        // Title
        ctx.fillStyle = '#78350f'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText('Drag below to slide C-scale • Click to set cursor', PAD, H - 2);
      }, [stemLabTab, stemLabTool, labToolData]);
      // ── Coding Playground: Canvas rendering (MUST be at top level) ──
      React.useEffect(function () {
        if (stemLabTab !== 'explore' || stemLabTool !== 'codingPlayground') return;
        var _cpgd = (labToolData && labToolData._codingPlayground) || {};
        var _turtleState = _cpgd.turtle || { x: 250, y: 250, angle: -90, penDown: true, color: '#6366f1', width: 2 };
        var _drawnLines = _cpgd.lines || [];
        var _showTurtle = _cpgd.showTurtle !== false;
        var cvs = _codingCanvasRef.current;
        if (!cvs) return;
        var ctx = cvs.getContext('2d');
        var W = 500, H = 500;
        cvs.width = W; cvs.height = H;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 0.5;
        for (var gx = 0; gx <= W; gx += 25) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
        for (var gy = 0; gy <= H; gy += 25) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
        _drawnLines.forEach(function (ln) {
          ctx.strokeStyle = ln.color || '#6366f1'; ctx.lineWidth = ln.width || 2; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(ln.x1, ln.y1); ctx.lineTo(ln.x2, ln.y2); ctx.stroke();
        });
        var tx = _turtleState.x, ty = _turtleState.y, ta = _turtleState.angle * Math.PI / 180;
        if (_showTurtle) {
          // Glow under turtle
          ctx.save(); ctx.translate(tx, ty);
          var _glowGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 28);
          _glowGrad.addColorStop(0, 'rgba(74,222,128,0.35)'); _glowGrad.addColorStop(1, 'rgba(74,222,128,0)');
          ctx.fillStyle = _glowGrad; ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          ctx.save(); ctx.translate(tx, ty); ctx.rotate(ta + Math.PI / 2);
          var _ts = 1.5; ctx.scale(_ts, _ts);
          // Legs (four stubby green legs)
          ctx.fillStyle = '#4ade80';
          [[-8, -4], [8, -4], [-8, 6], [8, 6]].forEach(function (p) { ctx.beginPath(); ctx.ellipse(p[0], p[1], 3.5, 5.5, 0, 0, Math.PI * 2); ctx.fill(); });
          // Shell (oval body with pattern)
          ctx.fillStyle = '#15803d'; ctx.beginPath(); ctx.ellipse(0, 1, 11, 13, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.ellipse(0, 1, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
          // Shell hexagonal pattern
          ctx.strokeStyle = '#15803d'; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 12); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-9, 1); ctx.lineTo(9, 1); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-7, -5); ctx.lineTo(7, 7); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(7, -5); ctx.lineTo(-7, 7); ctx.stroke();
          // Shell highlight
          ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.ellipse(-2, -3, 4, 5, -0.3, 0, Math.PI * 2); ctx.fill();
          // Head
          ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.ellipse(0, -15, 6, 6, 0, 0, Math.PI * 2); ctx.fill();
          // Eyes (bigger, friendlier)
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-3, -16, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(3, -16, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(-3, -16.5, 1.2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(3, -16.5, 1.2, 0, Math.PI * 2); ctx.fill();
          // Smile
          ctx.strokeStyle = '#15803d'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(0, -13.5, 3, 0.2, Math.PI - 0.2); ctx.stroke();
          // Tail
          ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 13); ctx.quadraticCurveTo(4, 19, 1, 22); ctx.stroke();
          ctx.restore();
        } else {
          // Simple arrow cursor
          ctx.save(); ctx.translate(tx, ty); ctx.rotate(ta + Math.PI / 2);
          ctx.fillStyle = '#4ade80'; ctx.strokeStyle = '#15803d'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(-8, 10); ctx.lineTo(0, 5); ctx.lineTo(8, 10); ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.restore();
        }
        if (_turtleState.penDown) { ctx.fillStyle = _turtleState.color; ctx.beginPath(); ctx.arc(tx, ty, 3, 0, Math.PI * 2); ctx.fill(); }
        // Coordinates badge
        ctx.fillStyle = 'rgba(15,23,42,0.7)'; ctx.fillRect(4, H - 24, 180, 20); ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 12px monospace';
        ctx.fillText('📍 (' + Math.round(_turtleState.x) + ', ' + Math.round(_turtleState.y) + ') ' + Math.round((_turtleState.angle + 90 + 360) % 360) + '°', 10, H - 9);
        ctx.fillStyle = 'rgba(15,23,42,0.7)'; ctx.fillRect(W - 120, H - 24, 116, 20); ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 12px monospace';
        ctx.fillText(_drawnLines.length + ' segments', W - 114, H - 9);
      }, [stemLabTab, stemLabTool, labToolData]);
      function renderTutorial(toolId, steps) {
        if (_tutorialSeen[toolId]) return null;
        var step = labToolData._tutorialStep || 0;
        if (step >= steps.length) {
          // Defer the setState to useEffect to avoid setState-during-render
          if (_tutorialAutoComplete !== toolId) {
            Promise.resolve().then(function () { _setTutorialAutoComplete(toolId); });
          }
          return null;
        }
        var s = steps[step];
        // Theme-aware styles (inline to survive parent .theme-contrast [class*="bg-"] override)
        var _tutBg = isContrast ? { backgroundColor: '#000', color: '#fff', border: '3px solid #fbbf24' }
          : isDark ? { backgroundColor: '#312e81', color: '#e0e7ff', border: '2px solid #818cf8' }
            : { backgroundColor: '#4f46e5', color: '#fff', border: '2px solid #818cf8' };
        var _tutBtn = isContrast ? { backgroundColor: '#fbbf24', color: '#000' }
          : isDark ? { backgroundColor: '#e0e7ff', color: '#312e81' }
            : { backgroundColor: '#fff', color: '#4f46e5' };
        var _tutSkip = isContrast ? { color: '#fbbf24' } : { color: '#a5b4fc' };
        return React.createElement("div", { className: "absolute z-50 animate-in fade-in duration-300", style: { top: s.top || '50%', left: s.left || '50%', transform: 'translate(-50%,-50%)', maxWidth: '280px' } },
          React.createElement("div", { className: "rounded-xl p-3 shadow-xl", style: Object.assign({}, _tutBg, { animation: 'pulse 2s infinite' }) },
            React.createElement("p", { className: "text-xs font-bold mb-1" }, "\uD83D\uDCA1 Step " + (step + 1) + " of " + steps.length),
            React.createElement("p", { className: "text-xs leading-relaxed" }, s.text),
            React.createElement("div", { className: "flex gap-2 mt-2 justify-end" },
              React.createElement("button", { "aria-label": "Skip", onClick: function () { markTutorialSeen(toolId); setLabToolData(function (p) { return Object.assign({}, p, { _tutorialStep: 0 }); }); }, className: "px-2 py-1 text-[10px]", style: _tutSkip }, "Skip"),
              React.createElement("button", { "aria-label": step < steps.length - 1 ? "Next tutorial step" : "Finish tutorial", onClick: function () { setLabToolData(function (p) { return Object.assign({}, p, { _tutorialStep: (p._tutorialStep || 0) + 1 }); }); }, className: "px-3 py-1 text-[10px] font-bold rounded-lg", style: _tutBtn }, step < steps.length - 1 ? "Next \u2192" : "Got it! \u2705")
            )
          )
        );
      }

      // ── Tutorial Step Definitions ──
      var _tutCalculus = [
        { text: 'Welcome to the Calculus Visualizer! Adjust the sliders for a, b, c to change the curve f(x) = ax\u00B2 + bx + c.', top: '30%', left: '50%' },
        { text: 'Set xMin and xMax to define the integration bounds, then watch the area fill in real-time.', top: '50%', left: '50%' },
        { text: 'Switch between Left Riemann, Right Riemann, Midpoint, and Trapezoidal methods to see how they approximate the integral differently.', top: '70%', left: '50%' },
        { text: 'The convergence mini-chart below shows how the error shrinks as the number of rectangles increases. Try it!', top: '85%', left: '50%' }
      ];
      var _tutWave = [
        { text: 'Welcome to the Wave Simulator! Drag the Amplitude and Frequency sliders to shape your wave.', top: '30%', left: '50%' },
        { text: 'Switch wave types — Sine, Square, Triangle, or Sawtooth — to explore different waveforms.', top: '50%', left: '50%' },
        { text: 'Enable the second wave to see superposition — two waves combining into one!', top: '65%', left: '50%' },
        { text: 'Use keyboard shortcuts: Arrow Up/Down for amplitude, Left/Right for frequency, +/- for speed.', top: '80%', left: '50%' }
      ];
      var _tutPhysics = [
        { text: 'Welcome to the Projectile Physics Lab! Adjust the angle and velocity sliders to set up your launch.', top: '25%', left: '50%' },
        { text: 'Click "Launch" (or press Space) to fire the projectile. Watch it trace a parabolic arc!', top: '45%', left: '50%' },
        { text: 'Tweak gravity and wind to see how forces change the trajectory. Use WASD keys for fine control.', top: '65%', left: '50%' },
        { text: 'Check the flight stats panel for max height, range, and flight time. Try challenge mode to predict landings!', top: '85%', left: '50%' }
      ];
      var _tutGalaxy = [
        { text: 'Welcome to the Galaxy Explorer! Switch between Galaxy Simulation and Star Lifespan modes using the tabs. Click and drag to orbit the galaxy, scroll to zoom.', top: '25%', left: '50%' },
        { text: 'Adjust Star Count and Arm Count to change the galaxy\'s structure. Watch the spiral arms reform!', top: '45%', left: '50%' },
        { text: 'Click on any star to identify its spectral type (O, B, A, F, G, K, M) — the hottest stars are blue!', top: '65%', left: '50%' },
        { text: 'Use keyboard: Arrow keys to orbit, +/- to zoom, R to reset view. Try the quiz to test your knowledge!', top: '80%', left: '50%' }
      ];
      var _tutCompanionPlanting = [
        { text: 'Welcome to the Companion Planting Lab! This simulation models the milpa / Three Sisters — a 7,000-year-old agricultural system.', top: '25%', left: '50%' },
        { text: 'Drag seeds onto the mound: plant corn first, then beans around the stalks, then squash around the edges.', top: '45%', left: '50%' },
        { text: 'Watch the Soil Dashboard — nitrogen, moisture, and temperature all change as the plants grow together.', top: '65%', left: '50%' },
        { text: 'Use the Compare button to see how the Three Sisters garden compares to a monoculture plot. Try the quiz to earn XP!', top: '80%', left: '50%' }
      ];
      var _tutGraphCalc = [
        { text: 'Welcome to the Graphing Calculator! Type a function like y = 2x + 3 in the expression panel and watch it appear on the graph.', top: '25%', left: '50%' },
        { text: 'Use the Table view to see exact (x, y) values for your function. Great for checking homework answers!', top: '45%', left: '50%' },
        { text: 'Zoom and pan the graph with mouse wheel and drag. Use Window settings to set exact axis ranges.', top: '65%', left: '50%' },
        { text: 'The Coach panel explains every feature in plain English. Press the challenge button to practice with AI-generated problems!', top: '80%', left: '50%' }
      ];
      var _tutCoding = [
        { text: 'Welcome to the Coding Playground! Add blocks from the Toolbox on the left to build your program.', top: '30%', left: '50%' },
        { text: 'Each block is a command: move the turtle, turn, change colors, or use loops. Set values with the number inputs.', top: '45%', left: '50%' },
        { text: 'Click ▶ Run to watch your program execute step-by-step. The turtle draws on the canvas as it moves!', top: '55%', left: '50%' },
        { text: 'Try Variables (set $myVar) and If/Else blocks for advanced programs. Use Undo/Redo to experiment fearlessly!', top: '65%', left: '50%' },
        { text: 'Pick a Starter Template to load a prebuilt program, or tackle Challenges to earn XP. Switch to Code mode for JavaScript-like syntax!', top: '80%', left: '50%' }
      ];

      // STEM Lab modal JSX
      return /*#__PURE__*/React.createElement("div", {
        "data-stem-lab": "true", role: "dialog", "aria-modal": "true", "aria-label": stemLabTool ? "STEM Lab: " + stemLabTool : "STEM Lab",
        className: "fixed inset-0 z-[9999] flex items-stretch justify-center" + (_reduceMotion ? " reduce-motion" : ""),
        style: {
          background: 'rgba(15,23,42,0.7)',
          backdropFilter: 'blur(6px)'
        }
      },
        // Screen reader live region — must be inside the dialog for modal context
        React.createElement("div", {
          id: "stem-a11y-live", role: "status", "aria-live": "assertive", "aria-atomic": "true",
          style: { position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }
        }, a11yAnnouncement),
        /*#__PURE__*/React.createElement("div", {
        className: "w-full max-w-[98vw] m-2 rounded-2xl shadow-2xl flex flex-col overflow-hidden overflow-y-auto stemlab-styled-scrollbar" + (_reduceMotion ? "" : " animate-in zoom-in-95 duration-300"),
        style: { backgroundColor: _pal.bg, color: _pal.text }
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center justify-between px-6 py-3 text-white", role: "banner",
        style: { background: isContrast ? '#000' : 'linear-gradient(to right, #2563eb, #4f46e5, #7c3aed)', borderBottom: isContrast ? '3px solid #fbbf24' : 'none' }
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-3"
      }, React.createElement("button", {
        className: "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black relative cursor-pointer border-none outline-none focus:ring-2 focus:ring-white/50",
        style: {
          background: 'linear-gradient(135deg, #f59e0b, #eab308, #f59e0b)',
          backgroundSize: '200% 200%',
          animation: _xpBadgePulse ? 'stemXpBadgePulse 0.6s ease-out' : 'stemXpShimmer 3s ease-in-out infinite',
          boxShadow: _xpBadgePulse ? '0 0 16px rgba(245,158,11,0.6), 0 0 4px rgba(245,158,11,0.3)' : '0 2px 8px rgba(0,0,0,0.2)',
          color: '#1e293b',
          transition: 'box-shadow 0.3s ease'
        },
        title: 'View XP Progress',
        'aria-label': 'View XP Progress — ' + totalStemXP + ' total XP',
        onClick: function() { _setShowXpPanel(function(v) { return !v; }); }
      },
        React.createElement("span", { style: { filter: 'drop-shadow(0 0 3px rgba(255,200,0,0.8))', fontSize: '14px' } }, "\u2B50"),
        React.createElement("span", { style: { textShadow: '0 1px 2px rgba(0,0,0,0.15)' } }, totalStemXP + " XP"),
        // Floating +XP popups
        _stemXpPopups.current.map(function (p) {
          return React.createElement("div", {
            key: p.id,
            className: "stemXpFloatPopup",
            style: {
              position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)',
              pointerEvents: 'none', zIndex: 99999,
              animation: 'stemXpFloat 1.3s ease-out forwards',
              fontWeight: 900, fontSize: '14px', color: '#f59e0b',
              textShadow: '0 0 8px rgba(245,158,11,0.6), 0 1px 3px rgba(0,0,0,0.3)',
              whiteSpace: 'nowrap'
            }
          }, "+" + p.pts + " XP");
        })
      ),
        React.createElement("div", {
          className: "hidden md:flex items-center gap-1 bg-white/10 backdrop-blur rounded-full px-2.5 py-1 text-[11px] font-medium text-white/70",
          title: "Keyboard shortcuts: Esc = close, Alt+1/2 = switch tabs, Alt+B = back to tools, Tab = navigate, Arrow keys = orbit 3D views"
        }, React.createElement("span", null, "\u2328\uFE0F"), React.createElement("span", null, "Keyboard accessible")),
      /*#__PURE__*/React.createElement("div", {
          className: "bg-white/20 p-2 rounded-lg"
        }, /*#__PURE__*/React.createElement(Calculator, {
          size: 20
        })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
          className: "text-lg font-bold tracking-tight"
        }, "\uD83E\uDDEA STEM Lab"), /*#__PURE__*/React.createElement("p", {
          className: "text-xs text-white/70"
        }, "Create problems, build assessments, explore with manipulatives"))), /*#__PURE__*/React.createElement("div", {
          className: "flex items-center gap-3"
        }, stemLabTab !== 'explore' && /*#__PURE__*/React.createElement("select", {
          value: mathSubject,
          onChange: e => setMathSubject(e.target.value),
          className: "px-3 py-1.5 text-xs font-medium bg-white/15 border border-white/25 rounded-lg text-white outline-none focus:ring-2 focus:ring-indigo-400",
          "aria-label": "Subject"
        }, /*#__PURE__*/React.createElement("option", {
          value: "General Math",
          className: "text-slate-800"
        }, "General Math"), /*#__PURE__*/React.createElement("option", {
          value: "Algebra",
          className: "text-slate-800"
        }, "Algebra"), /*#__PURE__*/React.createElement("option", {
          value: "Geometry",
          className: "text-slate-800"
        }, "Geometry"), /*#__PURE__*/React.createElement("option", {
          value: "Calculus",
          className: "text-slate-800"
        }, "Calculus"), /*#__PURE__*/React.createElement("option", {
          value: "Chemistry",
          className: "text-slate-800"
        }, "Chemistry"), /*#__PURE__*/React.createElement("option", {
          value: "Physics",
          className: "text-slate-800"
        }, "Physics"), /*#__PURE__*/React.createElement("option", {
          value: "Biology",
          className: "text-slate-800"
        }, "Biology")), /*#__PURE__*/React.createElement("button", {
          onClick: () => { if (typeof window.AlloToggleTheme === 'function') window.AlloToggleTheme(); },
          className: "p-1.5 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1",
          "aria-label": "Toggle theme",
          title: isContrast ? 'High Contrast' : isDark ? 'Dark Mode' : 'Light Mode'
        }, isContrast ? '\uD83D\uDC41' : isDark ? '\uD83C\uDF19' : '\u2600\uFE0F', /*#__PURE__*/React.createElement("span", { className: "text-[10px] font-bold" }, isContrast ? 'Hi-Con' : isDark ? 'Dark' : 'Light')),
        /*#__PURE__*/React.createElement("button", {
          onClick: () => {
            var next = !_narrationOn;
            try { localStorage.setItem('alloflow_canvas_narrate', next ? 'on' : 'off'); } catch(e) {}
            _setNarrationOn(next);
            if (typeof addToast === 'function') addToast(next ? '🔊 Canvas narration ON — tools will speak descriptions' : '🔇 Canvas narration OFF', 'info');
          },
          className: "p-1.5 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1",
          "aria-label": "Toggle canvas narration TTS",
          title: _narrationOn ? 'Canvas narration ON — click to disable' : 'Canvas narration OFF — click to enable spoken descriptions'
        }, _narrationOn ? '\uD83D\uDD0A' : '\uD83D\uDD07', /*#__PURE__*/React.createElement("span", { className: "text-[10px] font-bold" }, _narrationOn ? 'TTS' : 'Mute')),
        /*#__PURE__*/React.createElement("button", {
          onClick: () => _setShowKeyHelp(v => !v),
          className: "p-1.5 hover:bg-white/20 rounded-lg transition-colors text-xs font-bold",
          "aria-label": "Show keyboard shortcuts",
          title: "Keyboard shortcuts (?)"
        }, "?"),
        /*#__PURE__*/React.createElement("button", {
          onClick: () => setShowStemLab(false),
          className: "p-1.5 hover:bg-white/20 rounded-lg transition-colors",
          "aria-label": "Close STEM Lab"
        }, /*#__PURE__*/React.createElement(X, {
          size: 20
        })))), /*#__PURE__*/React.createElement("div", {
          className: "flex border-b px-6", role: "tablist", "aria-label": "STEM Lab navigation",
          style: { backgroundColor: _pal.bgAlt, borderColor: _pal.border }
        }, [{
          id: 'create',
          label: '\uD83D\uDCDD Create',
          desc: t('stem.solver.generate_assess')
        }, {
          id: 'explore',
          label: '\uD83D\uDD27 Explore',
          desc: t('stem.solver.manipulatives')
        }].map(tab => /*#__PURE__*/React.createElement("button", { "aria-label": "STEM Lab tab",
          key: tab.id, role: "tab", "aria-selected": stemLabTab === tab.id,
          onClick: () => {
            setStemLabTab(tab.id);
            setStemLabTool(null);
          },
          className: "flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all",
          style: stemLabTab === tab.id
            ? { borderColor: isContrast ? '#fbbf24' : '#4f46e5', color: isContrast ? '#fbbf24' : (isDark ? '#a5b4fc' : '#4338ca'), backgroundColor: _pal.bg }
            : { borderColor: 'transparent', color: _pal.textMuted }
        }, /*#__PURE__*/React.createElement("span", null, tab.label), /*#__PURE__*/React.createElement("span", {
          className: `text-[10px] font-normal ${stemLabTab === tab.id ? 'text-indigo-400' : 'text-slate-500'}`
        }, tab.desc)))),
        // ── Keyboard Help Panel ──
        _showKeyHelp && React.createElement("div", {
          role: "region", "aria-label": "Keyboard shortcuts",
          style: { padding: '12px 24px', borderBottom: '2px solid ' + _pal.border, background: isContrast ? '#111' : isDark ? '#1e293b' : '#f1f5f9' }
        },
          React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
            React.createElement("h3", { style: { margin: 0, fontSize: 13, fontWeight: 800, color: isContrast ? '#facc15' : '#4f46e5' } }, "\u2328\uFE0F Keyboard Shortcuts"),
            React.createElement("button", { onClick: function () { _setShowKeyHelp(false); }, "aria-label": "Close keyboard help", style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: _pal.textMuted, padding: 4 } }, "\u2715")
          ),
          React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', gap: '4px 16px', fontSize: 12 } },
            React.createElement("kbd", { style: { background: _pal.bgAlt, border: '1px solid ' + _pal.border, padding: '1px 6px', borderRadius: 3, fontFamily: 'monospace', fontSize: 11 } }, "Esc"),
            React.createElement("span", { style: { color: _pal.textMuted } }, stemLabTool ? "Close tool / Close lab" : "Close STEM Lab"),
            React.createElement("kbd", { style: { background: _pal.bgAlt, border: '1px solid ' + _pal.border, padding: '1px 6px', borderRadius: 3, fontFamily: 'monospace', fontSize: 11 } }, "Alt+1"),
            React.createElement("span", { style: { color: _pal.textMuted } }, "Create tab"),
            React.createElement("kbd", { style: { background: _pal.bgAlt, border: '1px solid ' + _pal.border, padding: '1px 6px', borderRadius: 3, fontFamily: 'monospace', fontSize: 11 } }, "Alt+2"),
            React.createElement("span", { style: { color: _pal.textMuted } }, "Explore tab"),
            React.createElement("kbd", { style: { background: _pal.bgAlt, border: '1px solid ' + _pal.border, padding: '1px 6px', borderRadius: 3, fontFamily: 'monospace', fontSize: 11 } }, "Alt+B"),
            React.createElement("span", { style: { color: _pal.textMuted } }, "Back to tool grid"),
            React.createElement("kbd", { style: { background: _pal.bgAlt, border: '1px solid ' + _pal.border, padding: '1px 6px', borderRadius: 3, fontFamily: 'monospace', fontSize: 11 } }, "Tab"),
            React.createElement("span", { style: { color: _pal.textMuted } }, "Move between controls"),
            React.createElement("kbd", { style: { background: _pal.bgAlt, border: '1px solid ' + _pal.border, padding: '1px 6px', borderRadius: 3, fontFamily: 'monospace', fontSize: 11 } }, "?"),
            React.createElement("span", { style: { color: _pal.textMuted } }, "Toggle this help panel")
          )
        ),
        // ═══ XP Progress Overlay Panel ═══
        _showXpPanel && React.createElement("div", {
          role: "region", "aria-label": "STEM Lab XP Progress",
          className: "relative",
          style: { borderBottom: '2px solid ' + _pal.border }
        },
          React.createElement("div", { className: "p-4 max-w-4xl mx-auto", style: { background: 'linear-gradient(135deg, #fffbeb, #fef3c7, #fffbeb)' } },
            React.createElement("div", { className: "flex items-center gap-2 mb-3" },
              React.createElement("span", { style: { fontSize: '20px', filter: 'drop-shadow(0 0 4px rgba(255,200,0,0.7))' } }, "\u2B50"),
              React.createElement("h4", { className: "text-sm font-black text-amber-800" }, "STEM Lab XP Progress"),
              React.createElement("span", { className: "ml-auto text-xs font-black text-amber-700 px-2.5 py-1 rounded-full", style: { background: 'linear-gradient(135deg, #f59e0b, #eab308)', color: '#1e293b', boxShadow: '0 2px 6px rgba(245,158,11,0.3)' } }, totalStemXP + " Total XP"),
              React.createElement("button", { onClick: function() { _setShowXpPanel(false); }, "aria-label": "Close XP panel", className: "ml-2 p-1 rounded-full hover:bg-amber-200 transition-colors text-amber-600" }, "\u2715")
            ),
            (function () {
              // ── Dynamic XP activity discovery ──
              // Label + icon lookup for friendly display; any activityId not in this map
              // gets an auto-generated label from its camelCase/snake_case id
              var _xpLabelMap = {
                behaviorLab: ['Behavior Lab', '\uD83D\uDC2D'], aquarium: ['Aquarium', '\uD83D\uDC20'],
                ocean: ['Ocean', '\uD83D\uDC0B'], 'wave-match': ['Waves', '\uD83C\uDF0A'],
                'wave-quiz': ['Wave Quiz', '\uD83C\uDFB6'], galaxy_quiz: ['Galaxy Quiz', '\uD83C\uDF0C'],
                galaxy_explore: ['Galaxy Explorer', '\u2B50'], universe_explore: ['Universe', '\uD83C\uDF20'],
                solarSystem: ['Solar System', '\u2600\uFE0F'], physicsQuiz: ['Physics', '\uD83C\uDFAF'],
                chemBalance: ['Chemistry', '\uD83E\uDDEA'], circuit: ['Circuits', '\u26A1'],
                calculus: ['Calculus', '\u222B'], inequality: ['Inequalities', '\u2696\uFE0F'],
                molecule: ['Molecules', '\uD83E\uDDEC'], codingPlayground: ['Coding', '\uD83D\uDCBB'],
                algebraCAS: ['Algebra', '\uD83D\uDCD0'], dissection: ['Dissection', '\uD83D\uDD2C'],
                fractionChallenge: ['Fractions', '\uD83D\uDD22'], fractionViz: ['Fraction Lab', '\uD83C\uDF55'],
                fractionWall: ['Fraction Wall', '\uD83E\uDDF1'], cyberDefense: ['Cyber Defense', '\uD83D\uDEE1\uFE0F'],
                companion_planting_corn: ['Three Sisters', '\uD83C\uDF3D'], companion_planting_beans: ['Bean Planting', '\uD83E\uDED8'],
                companion_planting_squash: ['Squash', '\uD83C\uDF83'], companion_planting_grow: ['Growing', '\uD83C\uDF31'],
                companion_planting_harvest: ['Harvest', '\uD83C\uDF3E'], companion_planting_quiz: ['Garden Quiz', '\uD83D\uDCDD'],
                volume: ['Volume', '\uD83D\uDCE6'], numberline: ['Number Line', '\uD83D\uDCCF'],
                areamodel: ['Area Model', '\uD83D\uDFE7'], base10: ['Manipulatives', '\uD83E\uDDEE'],
                coordinate: ['Coordinates', '\uD83D\uDCCD'], protractor: ['Angles', '\uD83D\uDCD0'],
                geoSandbox: ['Geo Sandbox', '\uD83D\uDD37'], moneyMath: ['Money Math', '\uD83D\uDCB5'],
                multtable: ['Times Table', '\u2716\uFE0F'], dataPlot: ['Data Plot', '\uD83D\uDCCA'],
                dataStudio: ['Data Studio', '\uD83D\uDCC8'], funcGrapher: ['Graphing', '\uD83D\uDCC9'],
                geometryProver: ['Geometry', '\uD83D\uDCD0'], logicLab: ['Logic Lab', '\uD83E\uDDE0'],
                probability: ['Probability', '\uD83C\uDFB2'], unitConvert: ['Unit Convert', '\uD83D\uDD04'],
                ecosystem: ['Ecosystem', '\uD83C\uDF3F'], waterCycle: ['Water Cycle', '\uD83D\uDCA7'],
                plateTectonics: ['Plate Tectonics', '\uD83C\uDF0B'], dnaLab: ['DNA Lab', '\uD83E\uDDEC'],
                cell: ['Cell Explorer', '\uD83D\uDD2C'], epidemicSim: ['Epidemic Sim', '\uD83E\uDDA0'],
                titrationLab: ['Titration', '\uD83E\uDDEA'], climateExplorer: ['Climate', '\uD83C\uDF21\uFE0F'],
                moonMission: ['Moon Mission', '\uD83C\uDF11'], appLab: ['App Lab', '\uD83D\uDCF1'],
                gameStudio: ['Game Studio', '\uD83C\uDFAE'], lifeSkills: ['Life Skills', '\uD83D\uDD27'],
                popSim: ['Population Sim', '\uD83D\uDC3E'], targetMode: ['Target Mode', '\uD83C\uDFAF'],
                oratory_warmup: ['Oratory Warmup', '\uD83C\uDFA4'], oratory_phrase: ['Speech Practice', '\uD83D\uDDE3\uFE0F'],
                oratory_smooth_pacing: ['Pacing', '\u23F1\uFE0F'], geoQuiz: ['Geo Quiz', '\uD83C\uDF0D'],
                life: ['Life Sim', '\uD83C\uDF31']
              };
              function _xpLabel(id) {
                if (_xpLabelMap[id]) return { id: id, label: _xpLabelMap[id][0], icon: _xpLabelMap[id][1] };
                // Auto-generate from id: fire_sim_burn → Fire Sim Burn, circuitChallenge → Circuit Challenge
                var nice = id.replace(/[-_]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                return { id: id, label: nice, icon: '\uD83E\uDDEA' };
              }
              // Build activity list dynamically from actual XP data
              var _xpActivities = [];
              var _xpKeys = Object.keys(stemXpData);
              _xpKeys.forEach(function(key) {
                if (key === '_total') return;
                if (!stemXpData[key] || typeof stemXpData[key].earned !== 'number' || stemXpData[key].earned <= 0) return;
                _xpActivities.push(_xpLabel(key));
              });
              // Sort: maxed first, then by earned descending
              _xpActivities.sort(function(a, b) {
                var ea = getStemXP(a.id), eb = getStemXP(b.id);
                if (ea >= 100 && eb < 100) return -1;
                if (eb >= 100 && ea < 100) return 1;
                return eb - ea;
              });
              var _earnedCount = _xpActivities.length;
              var _maxedCount = _xpActivities.filter(function(a) { return getStemXP(a.id) >= 100; }).length;
              return React.createElement(React.Fragment, null,
                React.createElement("div", { className: "mb-3" },
                  React.createElement("div", { className: "flex justify-between items-center mb-1" },
                    React.createElement("span", { className: "text-[10px] font-bold text-amber-700 uppercase" },
                      _earnedCount + " Active" + (_maxedCount > 0 ? " \u00B7 " + _maxedCount + " Maxed" : "")
                    ),
                    React.createElement("span", { className: "text-[10px] font-black text-amber-600" }, totalStemXP + " Total XP")
                  ),
                  React.createElement("div", { className: "w-full h-3 bg-amber-100 rounded-full overflow-hidden", style: { boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' } },
                    React.createElement("div", { className: "h-full rounded-full transition-all duration-700", style: {
                      width: Math.min(100, totalStemXP / 10) + '%',
                      background: totalStemXP >= 1000 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #f59e0b, #eab308, #f59e0b)',
                      backgroundSize: '200% 100%',
                      animation: 'stemXpShimmer 2s ease-in-out infinite',
                      boxShadow: '0 0 8px rgba(245,158,11,0.4)'
                    } })
                  )
                ),
                (function() {
                  if (_xpActivities.length === 0) {
                    return React.createElement("div", { className: "text-center py-6 text-amber-600" },
                      React.createElement("p", { className: "text-sm font-bold mb-1" }, "No XP earned yet!"),
                      React.createElement("p", { className: "text-xs text-amber-500" }, "Explore STEM tools and complete quizzes to earn XP. Your progress will appear here.")
                    );
                  }
                  return React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-[10px]" },
                    _xpActivities.map(function (act) {
                      var earned = getStemXP(act.id);
                      var pct = Math.min(100, earned);
                      var isMaxed = pct >= 100;
                      return React.createElement("div", { key: act.id, className: "bg-white rounded-lg p-2 border transition-all duration-200 hover:shadow-md", style: { borderColor: isMaxed ? '#10b981' : '#fde68a' } },
                        React.createElement("div", { className: "flex items-center gap-1 mb-1" },
                          React.createElement("span", { style: { fontSize: '12px' } }, act.icon),
                          React.createElement("span", { className: "font-bold truncate", style: { color: isMaxed ? '#059669' : '#334155', fontSize: '10px' } }, act.label)
                        ),
                        React.createElement("div", { className: "w-full h-1.5 rounded-full overflow-hidden", style: { background: '#fef3c7', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' } },
                          React.createElement("div", { className: "h-full rounded-full transition-all duration-500", style: {
                            width: pct + '%',
                            background: isMaxed ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                            boxShadow: isMaxed ? '0 0 4px rgba(16,185,129,0.4)' : 'none'
                          } })
                        ),
                        React.createElement("div", { className: "flex justify-between mt-0.5" },
                          React.createElement("span", { style: { color: isMaxed ? '#059669' : '#d97706', fontWeight: 700 } }, earned + "/100"),
                          isMaxed && React.createElement("span", { style: { color: '#059669', fontWeight: 900, fontSize: '11px' } }, "\u2714 MAX")
                        )
                      );
                    })
                  );
                })()
              );
            })()
          )
        ),
        /*#__PURE__*/React.createElement("div", {
          className: "flex-1 overflow-y-auto p-6",
          style: { backgroundColor: _pal.bg, color: _pal.text }
        }, stemLabTab === 'create' && !showAssessmentBuilder && /*#__PURE__*/React.createElement("div", {
          className: "space-y-5 max-w-3xl mx-auto animate-in fade-in duration-200"
        }, /*#__PURE__*/React.createElement("div", {
          className: "flex items-center gap-2"
        }, [{
          id: 'topic',
          label: '📋 From Topic'
        }, {
          id: 'content',
          label: '📖 From My Content'
        }, {
          id: 'solve',
          label: '✏️ Solve One'
        }].map(m => /*#__PURE__*/React.createElement("button", { "aria-label": m.label.replace(/[^\w\s]/g, '').trim() + ' mode',
          key: m.id,
          onClick: () => setStemLabCreateMode(m.id),
          className: `px-4 py-2 rounded-xl text-sm font-bold transition-all ${stemLabCreateMode === m.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border border-slate-400 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'}`
        }, m.label)), /*#__PURE__*/React.createElement("div", {
          className: "flex-1"
        }), /*#__PURE__*/React.createElement("button", { "aria-label": "Open assessment builder",
          onClick: () => setShowAssessmentBuilder(true),
          className: "px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-purple-200 hover:from-violet-600 hover:to-purple-600 transition-all flex items-center gap-2"
        }, "\uD83D\uDCCB Build Assessment")), stemLabCreateMode !== 'solve' && /*#__PURE__*/React.createElement("div", {
          className: "flex items-center gap-4"
        }, /*#__PURE__*/React.createElement("span", {
          className: "text-xs font-bold text-slate-500 uppercase"
        }, "Style:"), [{
          val: t('stem.solver.stepbystep'),
          label: t('stem.solver.stepbystep')
        }, {
          val: t('stem.solver.conceptual'),
          label: t('stem.solver.conceptual')
        }, {
          val: 'Real-World Application',
          label: t('stem.solver.realworld')
        }].map(s => /*#__PURE__*/React.createElement("button", { "aria-label": s.label + ' style',
          key: s.val,
          onClick: () => setMathMode(s.val),
          className: `px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mathMode === s.val ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-white border border-slate-400 text-slate-500 hover:border-blue-200'}`
        }, s.label))), /*#__PURE__*/React.createElement("div", {
          className: "bg-slate-50 rounded-xl p-4 border border-slate-400"
        }, /*#__PURE__*/React.createElement("textarea", {
          value: mathInput,
          onChange: e => setMathInput(e.target.value),
          placeholder: stemLabCreateMode === 'solve' ? 'Enter a math problem to solve step-by-step...' : stemLabCreateMode === 'content' ? 'Paste or describe content to generate math problems from...' : 'Enter topic, standard, or description (e.g. "3rd grade multiplication word problems")...',
          className: "w-full h-28 px-4 py-3 text-sm border border-slate-400 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none resize-none bg-white",
          "aria-label": "Math problem input"
        }), stemLabCreateMode !== 'solve' && /*#__PURE__*/React.createElement("div", {
          className: "flex items-center gap-4 mt-3"
        }, /*#__PURE__*/React.createElement("span", {
          className: "text-xs font-bold text-slate-500"
        }, "Quantity:"), /*#__PURE__*/React.createElement("input", {
          type: "range",
          min: "1",
          max: "20",
          value: mathQuantity,
          onChange: e => setMathQuantity(parseInt(e.target.value)),
          className: "flex-1 h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        }), /*#__PURE__*/React.createElement("span", {
          className: "text-sm font-bold text-indigo-700 w-8 text-center"
        }, mathQuantity))), /*#__PURE__*/React.createElement("button", { "aria-label": "Generate math problems",
          onClick: () => {
            if (stemLabCreateMode === 'content') {
              setMathMode('Word Problems from Source');
            } else if (stemLabCreateMode === 'solve') {
              setMathMode('Freeform Builder');
            } else {
              setMathMode(mathMode === 'Freeform Builder' || mathMode === 'Word Problems from Source' ? 'Problem Set Generator' : mathMode);
            }
            setActiveView('math');
            // setShowStemLab(false); // Removed so users can continue building assessment without the window abruptly closing
          },
          disabled: !mathInput.trim(),
          className: "w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl text-sm hover:from-indigo-700 hover:to-blue-700 disabled:opacity-40 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
        }, /*#__PURE__*/React.createElement(Sparkles, {
          size: 16
        }), " ", stemLabCreateMode === 'solve' ? 'Solve Problem' : 'Generate Problems'), /*#__PURE__*/React.createElement("div", {
          className: "flex items-center gap-2 pt-1"
        }, /*#__PURE__*/React.createElement("span", {
          className: "text-[10px] text-slate-500 font-bold uppercase"
        }, "Tools:"), [{
          // @tool volume
          id: 'volume',
          icon: '📦',
          label: t('stem.assessment.volume_explorer')
        }, {
          id: 'numberline',
          icon: '📏',
          label: t('stem.assessment.number_line')
        }, {
          // @tool areamodel
          id: 'areamodel',
          icon: '🟧',
          label: t('stem.assessment.area_model')
        }, {
          id: 'fractionViz',
          icon: '🍕',
          label: t('stem.assessment.fraction_lab')
        }].map(tool => /*#__PURE__*/React.createElement("button", { "aria-label": "STEM Lab tab",
          key: tool.id,
          onClick: () => {
            setStemLabTab('explore');
            setStemLabTool(tool.id);
          },
          className: "px-2 py-1 text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center gap-1"
        }, tool.icon, " ", tool.label)))), stemLabTab === 'create' && showAssessmentBuilder && /*#__PURE__*/React.createElement("div", {
          className: "space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200"
        }, /*#__PURE__*/React.createElement("div", {
          className: "flex items-center justify-between"
        }, /*#__PURE__*/React.createElement("div", {
          className: "flex items-center gap-3"
        }, /*#__PURE__*/React.createElement("button", {
          onClick: () => setShowAssessmentBuilder(false),
          className: "p-1.5 hover:bg-slate-100 rounded-lg transition-colors",
          'aria-label': 'Back'
        }, /*#__PURE__*/React.createElement(ArrowLeft, {
          size: 18,
          className: "text-slate-500"
        })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
          className: "text-lg font-bold text-slate-800"
        }, "\uD83D\uDCCB Assessment Builder"), /*#__PURE__*/React.createElement("p", {
          className: "text-xs text-slate-500"
        }, "Compose blocks of different problem types into a custom assessment")))), /*#__PURE__*/React.createElement("div", {
          className: "space-y-2"
        }, assessmentBlocks.map((block, idx) => /*#__PURE__*/React.createElement("div", {
          key: block.id,
          className: "bg-white rounded-xl border-2 border-slate-200 hover:border-indigo-300 p-3 flex items-start gap-3 transition-all group",
          draggable: true,
          onDragStart: e => e.dataTransfer.setData('blockIdx', idx.toString()),
          onDragOver: e => e.preventDefault(),
          onDrop: e => {
            const fromIdx = parseInt(e.dataTransfer.getData('blockIdx'));
            const newBlocks = [...assessmentBlocks];
            const [moved] = newBlocks.splice(fromIdx, 1);
            newBlocks.splice(idx, 0, moved);
            setAssessmentBlocks(newBlocks);
          }
        }, /*#__PURE__*/React.createElement("div", {
          className: "text-slate-500 cursor-grab active:cursor-grabbing pt-1 group-hover:text-slate-600"
        }, /*#__PURE__*/React.createElement(GripVertical, {
          size: 16
        })), /*#__PURE__*/React.createElement("div", {
          className: "flex-1 space-y-2"
        }, /*#__PURE__*/React.createElement("div", {
          className: "flex items-center gap-2"
        }, /*#__PURE__*/React.createElement("select", {
          'aria-label': 'Question type',
          value: block.type,
          onChange: e => {
            const nb = [...assessmentBlocks];
            nb[idx].type = e.target.value;
            setAssessmentBlocks(nb);
          },
          className: "px-3 py-1.5 text-sm font-bold border border-slate-400 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none",
          "aria-label": "Block type"
        }, /*#__PURE__*/React.createElement("option", {
          value: "computation"
        }, "\uD83D\uDD22 Computation"), /*#__PURE__*/React.createElement("option", {
          value: "word_problems"
        }, "\uD83D\uDCDD Word Problems"), /*#__PURE__*/React.createElement("option", {
          value: "fluency"
        }, "\u23F1\uFE0F Fluency Drill"), /*#__PURE__*/React.createElement("option", {
          value: "volume"
        }, "\uD83D\uDCE6 Volume"), /*#__PURE__*/React.createElement("option", {
          value: "fractions"
        }, "\uD83C\uDF55 Fractions"), /*#__PURE__*/React.createElement("option", {
          value: "geometry"
        }, "\uD83D\uDCD0 Geometry"), /*#__PURE__*/React.createElement("option", {
          value: "step_by_step"
        }, "\uD83D\uDCCA Step-by-Step"), /*#__PURE__*/React.createElement("option", {
          value: "custom"
        }, "\u2728 Custom"), /*#__PURE__*/React.createElement("option", {
          value: "manipulative"
        }, "\uD83E\uDDF1 Manipulative Response")), /*#__PURE__*/React.createElement("span", {
          className: "text-xs text-slate-500"
        }, "\xD7"), /*#__PURE__*/React.createElement("input", {
          type: "number",
          min: "1",
          max: "30",
          value: block.quantity,
          onChange: e => {
            const nb = [...assessmentBlocks];
            nb[idx].quantity = Math.max(1, parseInt(e.target.value) || 1);
            setAssessmentBlocks(nb);
          },
          className: "w-14 px-2 py-1.5 text-sm font-mono border border-slate-400 rounded-lg text-center",
          "aria-label": "Quantity"
        }), block.type === 'fluency' && /*#__PURE__*/React.createElement("span", {
          className: "px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full"
        }, "\u23F1 Timed"), block.type === 'manipulative' && /*#__PURE__*/React.createElement("span", {
          className: "px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-full"
        }, "\uD83E\uDDF1 Hands-on")), /*#__PURE__*/React.createElement("input", {
          value: block.directive,
          onChange: e => {
            const nb = [...assessmentBlocks];
            nb[idx].directive = e.target.value;
            setAssessmentBlocks(nb);
          },
          placeholder: "Directive (e.g. 'Single-digit multiplication', 'Division with remainders')...",
          className: "w-full px-3 py-1.5 text-xs border border-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none placeholder-slate-300"
        })), /*#__PURE__*/React.createElement("button", {
          onClick: () => setAssessmentBlocks(assessmentBlocks.filter((_, i) => i !== idx)),
          className: "p-1 text-slate-500 hover:text-red-500 transition-colors",
          "aria-label": "Remove block"
        }, /*#__PURE__*/React.createElement(X, {
          size: 14
        }))))), /*#__PURE__*/React.createElement("button", { "aria-label": "+ Add Block",
          onClick: () => setAssessmentBlocks([...assessmentBlocks, {
            id: 'b-' + Date.now(),
            type: 'computation',
            quantity: 5,
            directive: ''
          }]),
          className: "w-full py-2.5 border-2 border-dashed border-slate-300 text-slate-400 font-bold text-sm rounded-xl hover:border-indigo-400 hover:text-indigo-500 transition-all"
        }, "+ Add Block"), assessmentBlocks.length > 0 && /*#__PURE__*/React.createElement("div", {
          className: "flex gap-3 pt-2"
        }, /*#__PURE__*/React.createElement("button", { "aria-label": "Generate assessment problems",
          onClick: () => {
            const fluencyBlocks = assessmentBlocks.filter(b => b.type === 'fluency');
            if (fluencyBlocks.length > 0 && assessmentBlocks.length === fluencyBlocks.length) {
              startMathFluencyProbe(false);
              setShowStemLab(false);
              addToast(t('stem.fluency.fluency_drill_started') + fluencyBlocks.reduce((s, b) => s + b.quantity, 0) + ' problems', 'info');
              return;
            }
            const nonFluencyBlocks = assessmentBlocks.filter(b => b.type !== 'fluency');
            setMathInput('Building assessment: ' + nonFluencyBlocks.length + ' sections...');
            setMathMode('Freeform Builder');
            setActiveView('math');
            setShowStemLab(false);
            addToast('⏳ Generating assessment... ' + nonFluencyBlocks.length + ' sections', 'info');

            // Chunked generation: one callGemini per block, merge results, push to history once
            (async () => {
              const allProblems = [];
              let blockErrors = 0;
              for (let bi = 0; bi < nonFluencyBlocks.length; bi++) {
                const block = nonFluencyBlocks[bi];
                const blockLabel = block.type.replace(/_/g, ' ');
                addToast('🔄 Section ' + (bi + 1) + '/' + nonFluencyBlocks.length + ': ' + blockLabel + ' (' + block.quantity + ')...', 'info');
                const blockPrompt = 'You are an Expert Math Curriculum Designer.\n' +
                  'Generate EXACTLY ' + block.quantity + ' ' + blockLabel + ' math problems for grade ' + gradeLevel + '.\n' +
                  (block.directive && block.directive !== 'general' ? 'Focus area: ' + block.directive + '.\n' : '') +
                  'Subject: ' + (mathSubject || 'General Math') + '.\n\n' +
                  'Return a JSON object: {"title":"<section title>","problems":[{"question":"...","expression":"...","answer":<number or string>,"steps":[{"explanation":"...","latex":"..."}],"realWorld":"1-2 sentence real-life connection naming a specific career or situation where this skill is used — NOT a word problem restatement"}]}\n' +
                  'IMPORTANT: Return ONLY valid JSON. Every problem MUST have question, answer, and steps.';
                try {
                  const result = await callGemini(blockPrompt, true);
                  if (!result) throw new Error('Empty response');
                  let cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                  const startBrace = cleaned.indexOf('{');
                  if (startBrace > 0) cleaned = cleaned.substring(startBrace);
                  const endBrace = cleaned.lastIndexOf('}');
                  if (endBrace > 0) cleaned = cleaned.substring(0, endBrace + 1);
                  let parsed = null;
                  if (typeof window !== 'undefined' && window.jsonrepair) {
                    try { parsed = JSON.parse(window.jsonrepair(cleaned)); } catch (e) { /* fall through */ }
                  }
                  if (!parsed) parsed = JSON.parse(cleaned);
                  const problems = Array.isArray(parsed.problems) ? parsed.problems : (parsed.question ? [parsed] : []);
                  if (problems.length > 0) {
                    problems.forEach(p => { p._blockType = blockLabel; });
                    allProblems.push(...problems);
                    console.error('[ASSESS] Block ' + (bi + 1) + ' (' + blockLabel + '): ' + problems.length + ' problems parsed');
                  } else {
                    throw new Error('No problems in parsed response');
                  }
                } catch (e) {
                  console.error('[ASSESS] Block ' + (bi + 1) + ' (' + blockLabel + ') failed:', e.message);
                  blockErrors++;
                }
                if (bi < nonFluencyBlocks.length - 1) {
                  await new Promise(r => setTimeout(r, 500));
                }
              }
              if (allProblems.length === 0) {
                addToast('Assessment generation failed — no problems could be generated. Try fewer sections.', 'error');
              } else {
                allProblems.forEach(p => {
                  if (!Array.isArray(p.steps)) p.steps = [];
                  p.steps = p.steps.map(s => typeof s === 'string' ? { explanation: s, latex: '' } : s);
                });
                const normalizedContent = {
                  title: 'Assessment: ' + (mathSubject || 'General Math') + ' (Grade ' + gradeLevel + ')',
                  problems: allProblems,
                  graphData: null
                };
                const newItem = {
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                  type: 'math',
                  data: normalizedContent,
                  meta: (mathSubject || 'General Math') + ' - Assessment',
                  title: normalizedContent.title,
                  timestamp: new Date(),
                  config: {}
                };
                setHistory(prev => [...prev, newItem]);
                // Trigger display by calling handleGenerateMath with a tiny prompt to show the last result
                // The problems are already in history, so user can access them from Resources
                if (blockErrors > 0) {
                  addToast('Assessment partially generated — ' + allProblems.length + ' problems (' + blockErrors + ' section(s) failed). Check Resources.', 'warning');
                } else {
                  addToast('✅ Assessment complete! ' + allProblems.length + ' problems across ' + nonFluencyBlocks.length + ' sections. Check Resources panel.', 'success');
                }
              }
            })();
          },
          className: "flex-1 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl text-sm hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
        }, /*#__PURE__*/React.createElement(Sparkles, {
          size: 16
        }), " Generate All (", assessmentBlocks.reduce((s, b) => s + b.quantity, 0), " problems)"), /*#__PURE__*/React.createElement("button", { "aria-label": "Save to Resources",
          onClick: () => {
            const stemAssessment = {
              id: 'stem-' + Date.now(),
              type: 'stem-assessment',
              title: t('stem.fluency.stem_assessment') + (mathSubject || 'General Math'),
              timestamp: Date.now(),
              data: {
                blocks: assessmentBlocks.map(b => ({
                  ...b
                })),
                subject: mathSubject || 'General Math',
                totalProblems: assessmentBlocks.reduce((s, b) => s + b.quantity, 0),
                results: null
              }
            };
            setHistory(prev => [...prev, stemAssessment]);
            addToast(t('stem.fluency.stem_assessment_saved_to_resources') + assessmentBlocks.length + ' blocks)', 'success');
          },
          className: "py-3 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl text-sm hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
        }, "\uD83D\uDCBE Save to Resources"),
          toolSnapshots.length > 0 && /*#__PURE__*/React.createElement("div", { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
            className: "mt-4 pt-4 border-t border-slate-200"
          }, /*#__PURE__*/React.createElement("div", {
            className: "flex items-center gap-2 mb-3"
          }, /*#__PURE__*/React.createElement("h4", {
            className: "text-sm font-bold text-slate-700"
          }, "\uD83D\uDCF8 Tool Snapshots (", toolSnapshots.length, ")"), /*#__PURE__*/React.createElement("button", { "aria-label": "Clear all",
            onClick: () => setToolSnapshots([]),
            className: "text-[10px] text-slate-500 hover:text-red-500 transition-colors"
          }, "\u21BA Clear all")), /*#__PURE__*/React.createElement("div", {
            className: "grid grid-cols-2 gap-2"
          }, toolSnapshots.map((snap, si) => /*#__PURE__*/React.createElement("div", {
            key: snap.id,
            className: "bg-white rounded-lg p-2.5 border border-slate-400 hover:border-indigo-300 transition-all group"
          }, /*#__PURE__*/React.createElement("div", {
            className: "flex items-center gap-2"
          }, /*#__PURE__*/React.createElement("span", {
            className: "text-sm"
          }, snap.tool === 'volume' ? '📦' : snap.tool === 'base10' ? '🧮' : snap.tool === 'coordinate' ? '📍' : '📐'), /*#__PURE__*/React.createElement("span", {
            className: "text-xs font-bold text-slate-700 flex-1 truncate"
          }, snap.label), /*#__PURE__*/React.createElement("button", { "aria-label": "Open " + snap.label + " snapshot",
            onClick: () => {
              setStemLabTab('explore');
              setStemLabTool(snap.tool);
              if (snap.tool === 'volume' && snap.data) {
                if (snap.mode === 'slider' && snap.data.dims) {
                  setCubeBuilderMode('slider');
                  setCubeDims(snap.data.dims);
                } else if (snap.data.positions) {
                  setCubeBuilderMode('freeform');
                  setCubePositions(new Set(snap.data.positions));
                }
                if (snap.rotation) setCubeRotation(snap.rotation);
              }
              if (snap.tool === 'base10' && snap.data) setBase10Value(snap.data);
              if (snap.tool === 'coordinate' && snap.data) setGridPoints(snap.data.points || []);
              if (snap.tool === 'protractor' && snap.data) setAngleValue(snap.data.angle || 45);
            },
            className: "text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
          }, "\u21A9 Load"), /*#__PURE__*/React.createElement("button", { "aria-label": "Set Tool Snapshots",
            onClick: () => setToolSnapshots(prev => prev.filter((_, idx) => idx !== si)),
            className: "text-slate-500 hover:text-red-500 transition-colors"
          }, /*#__PURE__*/React.createElement(X, {
            size: 12
          }))), /*#__PURE__*/React.createElement("div", {
            className: "text-[10px] text-slate-500 mt-1"
          }, new Date(snap.timestamp).toLocaleTimeString()))))))), stemLabTab === 'explore' && !stemLabTool && (() => {
            var _allStemTools = [
              { id: '_cat_MathFundamentals', icon: '', label: t('stem.tools_menu.math_fundamentals'), desc: '', color: 'slate', category: true },
              {
                id: 'volume',
                icon: '📦',
                label: '3D Volume Explorer',
                desc: 'Build rectangular prisms with unit cubes. Rotate, zoom, explore layers.',
                color: 'emerald',
                ready: true
              },
              {
                id: 'numberline',
                icon: '📏',
                label: t('stem.assessment.number_line'),
                desc: 'Interactive number line with draggable markers. Great for addition, subtraction, fractions.',
                color: 'blue',
                ready: true
              },
              {
                id: 'areamodel',
                icon: '🟧',
                label: t('stem.assessment.area_model'),
                desc: 'Visual multiplication and division with color-coded rows and columns.',
                color: 'amber',
                ready: true
              },
              {
                id: 'fractionViz',
                icon: '🍕',
                label: t('stem.assessment.fraction_lab'),
                desc: 'Compare fractions side-by-side (Compare tab) or practice with interactive challenges (Challenge tab).',
                color: 'rose',
                ready: true
              },
              {
                // @tool base10
                id: 'base10',
                icon: '🧮',
                label: 'Math Manipulatives',
                desc: 'Base-10 blocks, abacus & slide rule. Explore place value, counting, and multiplication with hands-on tools.',
                color: 'orange',
                ready: true
              },
              {
                id: 'moneyMath', icon: '💵', label: 'Money Math',
                desc: 'Coins, bills, making change, grocery store sim, money word problems, and currency exchange. Multi-currency with USD, EUR, GBP & more.',
                color: 'emerald', ready: true
              },
              {
                // @tool coordinate
                id: 'coordinate',
                icon: '📍',
                label: t('stem.tools_menu.coordinate_grid'),
                desc: t('stem.tools_menu.plot_points_draw_lines_and'),
                color: 'cyan',
                ready: true
              },
              {
                // @tool protractor
                id: 'protractor',
                icon: '📐',
                label: t('stem.tools_menu.angle_explorer'),
                desc: 'Measure and construct angles. Classify acute, right, obtuse, and reflex.',
                color: 'purple',
                ready: true
              },
              {
                id: 'geoSandbox', icon: '\uD83D\uDD37', label: 'Geometry Sandbox',
                desc: 'Build 3D shapes, measure properties, and export STL files for 3D printing.',
                color: 'sky', ready: true
              },

              {
                // @tool multtable
                id: 'multtable',
                icon: '🔢',
                label: t('stem.tools_menu.multiplication_table'),
                desc: 'Interactive times table grid. Spot patterns, practice facts with challenges.',
                color: 'pink',
                ready: true
              },
              { id: '_cat_AdvancedMath', icon: '', label: t('stem.tools_menu.advanced_math'), desc: '', color: 'slate', category: true },
              {
                // @tool funcGrapher
                id: 'funcGrapher', icon: '📈', label: t('stem.tools_menu.function_grapher'),
                desc: 'Plot linear, quadratic, and trig functions. Adjust coefficients in real-time.',
                color: 'indigo', ready: true
              },
              {
                id: 'inequality', icon: '↕️', label: t('stem.tools_menu.inequality_grapher'),
                desc: t('stem.tools_menu.graph_inequalities_on_number_lines'),
                color: 'fuchsia', ready: true
              },
              {
                id: 'calculus', icon: '∫', label: t('stem.tools_menu.calculus_visualizer'),
                desc: 'Riemann sums, area under curves, and derivative tangent lines.',
                color: 'red', ready: true
              },
              {
                id: 'algebraCAS', icon: '🔣', label: 'Algebra Solver',
                desc: 'Step-by-step equation solving, factoring, simplification — powered by AI. See every algebraic rule applied.',
                color: 'amber', ready: true
              },
              {
                id: 'graphCalc', icon: '🧪', label: 'Graphing Calculator',
                desc: 'Type equations, plot functions, explore data. Learn what every button really does.',
                color: 'indigo', ready: true
              },
              {
                id: 'probability', icon: '\uD83C\uDFB2', label: t('stem.tools_menu.probability'),
                desc: 'Coin flips, dice rolls, and spinners. Visualize outcomes and explore chance.',
                color: 'sky', ready: true
              },

              {
                id: 'unitConvert', icon: '\uD83D\uDCCF', label: t('stem.tools_menu.unit_converter'),
                desc: 'Convert between metric and imperial units for length, mass, volume, and more.',
                color: 'teal', ready: true
              },
              { id: '_cat_Life&EarthScience', icon: '', label: t('stem.tools_menu.life_earth_science'), desc: '', color: 'slate', category: true },
              {
                // @tool cell
                id: 'cell', icon: '🔬', label: t('stem.tools_menu.cell_simulator'),
                desc: 'Microscope mode: observe, control, and quiz on living organisms. Earn XP!',
                color: 'green', ready: true
              },
              {
                // @tool solarSystem
                id: 'solarSystem', icon: '\uD83C\uDF0D', label: 'Solar System',
                desc: '3D interactive solar system with orbit, zoom, planet facts and quiz.',
                color: 'blue', ready: true
              },
              {
                // @tool moonMission
                id: 'moonMission', icon: '\uD83D\uDE80', label: 'Moon Mission',
                desc: 'Full Apollo mission simulator — launch, orbit, land on the Moon, walk in 1/6 gravity, collect rocks, and splash down!',
                color: 'slate', ready: true
              },
              {
                // @tool galaxy
                id: 'galaxy', icon: '\uD83C\uDF0C', label: t('stem.tools_menu.galaxy_explorer'),
                desc: 'Fly through a 3D Milky Way. Discover star types, nebulae, and black holes.',
                color: 'indigo', ready: true
              },
              {
                id: 'universe', icon: '\uD83C\uDF20', label: t('stem.tools_menu.universe_timelapse'),
                desc: 'Experience 13.8 billion years of cosmic history, from the Big Bang to the far future.',
                color: 'violet', ready: true
              },
              // @tool rocks
              { id: 'rocks', icon: '🪨', label: t('stem.tools_menu.rocks_minerals'), desc: t('stem.tools_menu.interactive_rock_cycle_mineral_properties'), color: 'amber', ready: true },
              {
                id: 'waterCycle', icon: '\uD83C\uDF0A', label: t('stem.tools_menu.water_cycle'),
                desc: 'Follow water through evaporation, condensation, precipitation, and collection.',
                color: 'cyan', ready: true
              },
              {
                id: 'rockCycle', icon: '\uD83E\uDEA8', label: t('stem.tools_menu.rock_cycle'),
                desc: 'Trace the transformation of igneous, sedimentary, and metamorphic rocks.',
                color: 'stone', ready: true
              },
              {
                // @tool ecosystem
                id: 'ecosystem', icon: '\uD83D\uDC3A', label: 'Ecosystem',
                desc: 'Predator-prey dynamics with Lotka-Volterra simulation. Adjust birth and death rates.',
                color: 'emerald', ready: true
              },
              {
                id: 'companionPlanting', icon: '\uD83C\uDF31', label: 'Companion Planting Lab',
                desc: 'Explore the ancient milpa / Three Sisters system \u2014 corn, beans, and squash growing in symbiosis. Soil chemistry, nitrogen cycles, and 7,000 years of agricultural science.',
                color: 'emerald', ready: true
              },
              {
                id: 'beehive', icon: '\uD83D\uDC1D', label: 'Beehive Colony Simulator',
                desc: 'Manage a living honeybee colony \u2014 nectar economics, waggle dances, seasonal cycles, threats, and the science of superorganisms. Connected to Companion Planting!',
                color: 'amber', ready: true
              },
              {
                id: 'climateExplorer', icon: '\uD83C\uDF0D', label: 'Climate Explorer',
                desc: 'Carbon calculator, renewables impact simulator, climate justice map, and solutions spotlight. Understand your footprint, design clean energy futures, and discover real-world innovations.',
                color: 'emerald', ready: true
              },
              {
                id: 'fireEcology', icon: '\uD83D\uDD25', label: 'Fire Ecology & Indigenous Stewardship',
                desc: 'Explore 65,000+ years of Indigenous fire knowledge, fire-adapted ecosystems, prescribed burn planning, and forest management science. Centers Aboriginal Australian, Karuk, Martu, Plains Nations, and more.',
                color: 'orange', ready: true
              },
              {
                id: 'aquarium', icon: '🐠', label: 'Aquaculture & Ocean Lab',
                desc: 'Manage aquarium tanks, simulate sustainable fishing, and explore marine ecosystems. Water chemistry, population dynamics and species studies.',
                color: 'cyan', ready: true
              },
              {
                id: 'decomposer', icon: '🧫', label: t('stem.tools_menu.decomposer'), desc: t('stem.tools_menu.break_materials_into_elements'),
                color: 'lime', ready: true
              },
              {
                id: 'anatomy', icon: '🫀', label: t('stem.tools_menu.human_anatomy'),
                desc: 'Explore all 11 body systems with interactive canvas — skeletal, muscular, circulatory, nervous, and more.',
                color: 'rose', ready: true
              },
              {
                id: 'titrationLab', icon: '🧪', label: 'Titration Lab',
                desc: 'Virtual titration with live S-curve graphing, indicator selection, and pH calculation.',
                color: 'emerald', ready: true
              },
              {
                id: 'dissection', icon: '\uD83D\uDD2C', label: 'Dissection Lab',
                desc: 'Virtual frog dissection — peel back layers to explore organs, muscles, and skeleton.',
                color: 'emerald', ready: true
              },
              {
                id: 'brainAtlas', icon: '🧠', label: t('stem.tools_menu.brain_atlas'),
                desc: 'Detailed cerebral regions, lobes, nuclei and clinical correlations. Lateral, medial, inferior & coronal views.',
                color: 'purple', ready: true
              },
              {
                id: 'molecule', icon: '⚛️', label: t('stem.tools_menu.molecule_builder'),
                desc: 'Build molecules with atoms and bonds. Explore molecular geometry.',
                color: 'stone', ready: true
              },
              { id: '_cat_Physics&Chemistry', icon: '', label: t('stem.tools_menu.physics_chemistry'), desc: '', color: 'slate', category: true },
              {
                // @tool wave
                id: 'wave', icon: '🌊', label: t('stem.tools_menu.wave_simulator'),
                desc: 'Adjust frequency, amplitude, wavelength. Explore interference patterns.',
                color: 'cyan', ready: true
              },
              {
                // @tool circuit
                id: 'circuit', icon: '🔌', label: t('stem.tools_menu.circuit_builder'),
                desc: 'Build circuits with resistors and batteries. Calculate voltage and current.',
                color: 'yellow', ready: true
              },
              {
                // @tool chemBalance
                id: 'chemBalance', icon: '⚖️', label: t('stem.tools_menu.equation_balancer'),
                desc: t('stem.tools_menu.balance_chemical_equations_with_visual'),
                color: 'lime', ready: true
              },
              {
                id: 'punnett', icon: '🧬', label: t('stem.tools_menu.punnett_square'),
                desc: 'Genetic crosses with alleles. Predict genotype and phenotype ratios.',
                color: 'violet', ready: true
              },
              {
                // @tool semiconductor
                id: 'semiconductor', icon: '\uD83D\uDD0C', label: 'Semiconductor Lab',
                desc: 'Explore transistors, logic gates, silicon doping, and chip design fundamentals.',
                color: 'cyan', ready: true
              },
              {
                // @tool physics
                id: 'physics', icon: '⚡', label: t('stem.tools_menu.physics_simulator'),
                desc: 'Projectile motion, velocity vectors, and trajectory visualization.',
                color: 'sky', ready: true
              },
              {
                // @tool dataPlot
                id: 'dataPlot', icon: '📊', label: t('stem.tools_menu.data_plotter'),
                desc: t('stem.tools_menu.plot_data_points_fit_trend'),
                color: 'teal', ready: true
              },
              {
                id: 'dataStudio', icon: '📉', label: 'Data Studio',
                desc: 'Bar charts, pie charts, line graphs & histograms. Import CSV data or enter your own. Statistical analysis included.',
                color: 'cyan', ready: true
              },

              { id: '_cat_ComputerScience', icon: '', label: 'Computer Science', desc: '', color: 'slate', category: true },
              {
                id: 'codingPlayground', icon: '🖥️', label: 'Coding Playground',
                desc: 'Visual block coding with turtle graphics. Learn sequencing, loops, and conditionals. Toggle between blocks and text code.',
                color: 'indigo', ready: true
              },
              {
                id: 'cyberDefense', icon: '\uD83D\uDEE1\uFE0F', label: 'Cyber Defense Lab',
                desc: 'Spot phishing emails, forge strong passwords, and crack ciphers. Gamified cybersecurity training aligned with Digital Citizenship standards.',
                color: 'rose', ready: true
              },
              {
                id: 'a11yAuditor', icon: '\u267F', label: 'Digital Accessibility Lab',
                desc: 'Audit websites for WCAG 2.1 AA compliance. Learn how accessibility barriers affect people with disabilities and how to fix them.',
                color: 'teal', ready: true
              },

              { id: '_cat_Arts&Music', icon: '', label: t('stem.tools_menu.arts_music'), desc: '', color: 'slate', category: true },

              {

                // @tool musicSynth
                id: 'musicSynth', icon: '🎹', label: t('stem.tools_menu.music_synthesizer'),

                desc: 'Play a piano, build beats, and learn the science of sound with real-time waveform visualization.',

                color: 'violet', ready: true

              },

              {
                id: 'artStudio', icon: '🎨', label: t('stem.tools_menu.art_design_studio'),
                desc: 'Explore color theory, mix colors, draw pixel art, create symmetry patterns, and check accessibility contrast.',
                color: 'rose', ready: true
              },
              {
                id: 'archStudio', icon: '\uD83C\uDFD7\uFE0F', label: 'Architecture Studio',
                desc: '3D building with blocks, columns, arches, and ramps. Snap to grid, measure, and export STL.',
                color: 'amber', ready: true
              },

              { id: '_cat_BehavioralScience', icon: '', label: '\uD83E\uDDE0 Behavioral Science', desc: '', color: 'slate', category: true },
              {
                id: 'behaviorLab', icon: '\uD83D\uDC2D', label: 'Behavior Shaping Lab',
                desc: 'Train a virtual mouse using operant conditioning! Learn ABA fundamentals: reinforcement, shaping, extinction, and schedules of reinforcement.',
                color: 'amber', ready: true
              },

              { id: '_cat_Economics', icon: '', label: '💰 Social Studies & Economics', desc: '', color: 'slate', category: true },
              {
                id: 'economicsLab', icon: '💰', label: 'Economics Lab',
                desc: 'Supply & demand curves, personal finance life sim, stock market trading, macro economics dashboard, and lemonade stand entrepreneur sim.',
                color: 'emerald', ready: true
              },
              {
                id: 'worldBuilder', icon: '✍️', label: 'WriteCraft',
                desc: 'Literary RPG — explore worlds, craft items, build structures, and battle through the strength of your prose. Your eloquence IS your superpower.',
                color: 'violet', ready: true
              },
              {
                id: 'lifeSkills', icon: '\uD83E\uDDED', label: 'Life Skills Lab',
                desc: 'Tax & paycheck calculator, data literacy, decision matrix, contract reader, health insurance navigator, and applied science for daily life.',
                color: 'cyan', ready: true
              },

              {
                id: 'flightSim', icon: '✈️', label: 'SkySchool',
                desc: 'Educational flight simulator — learn aerodynamics, navigation, and world geography by flying between real airports with real physics.',
                color: 'sky', ready: true
              },
              {
                id: 'atcTower', icon: '🗼', label: 'ATC Tower',
                desc: 'Air Traffic Control simulator — manage approaching aircraft, solve rate problems, and learn the math behind aviation safety.',
                color: 'emerald', ready: true
              },

              { id: '_cat_Strategy', icon: '', label: '⚔️ Strategy Games', desc: '', color: 'slate', category: true },
              { id: 'spaceColony', label: 'Kepler Colony', icon: '\uD83D\uDE80', desc: 'Colonize an alien planet! Turn-based cooperative strategy where mastering science unlocks colony survival.', color: 'indigo', ready: true },
              { id: 'spaceExplorer', label: 'Space Explorer', icon: '\uD83C\uDF0C', desc: 'Roguelike missions across the solar system. AI-generated challenges teach real science through strategic decisions.', color: 'purple', ready: true },
              { id: 'gameStudio', icon: '🎮', label: 'Game Studio', desc: 'Design, build, and test your own games with a visual coding interface.', color: 'purple', ready: true },

              { id: '_cat_Biology', icon: '', label: '🧬 Biology & Life Science', desc: '', color: 'slate', category: true },
              { id: 'dnaLab', icon: '🧬', label: 'DNA Lab', desc: 'Extract, sequence, and analyze DNA. Explore genetics through interactive experiments.', color: 'emerald', ready: true },
              { id: 'epidemicSim', icon: '\uD83E\uDDA0', label: 'Epidemic Simulator', desc: 'Model disease spread with SIR/SEIR models. Adjust R0, vaccination rates, and social distancing. Flatten the curve!', color: 'red', ready: true },

              { id: '_cat_Geography', icon: '', label: '🌍 Geography & Earth Science', desc: '', color: 'slate', category: true },
              { id: 'geoQuiz', icon: '🗺️', label: 'Geography Quiz', desc: 'Test your world geography knowledge with interactive maps, flags, and capitals.', color: 'sky', ready: true },
              { id: 'plateTectonics', icon: '🌋', label: 'Plate Tectonics', desc: 'Explore tectonic plates, earthquakes, volcanoes, and continental drift.', color: 'orange', ready: true },

              { id: '_cat_AdvancedMathLogic', icon: '', label: '📐 Advanced Math', desc: '', color: 'slate', category: true },
              { id: 'geometryProver', icon: '\uD83D\uDCD0', label: 'Geometry Prover', desc: 'Construct geometric proofs step-by-step with interactive diagrams.', color: 'violet', ready: true },
              { id: 'geometryWorld', icon: '\uD83E\uDDF1', label: 'Geometry World', desc: 'Explore a 3D world where geometry questions unlock new areas. Talk to NPCs and solve shape puzzles!', color: 'purple', ready: true },
              { id: 'logicLab', icon: '\uD83E\uDDE9', label: 'Logic Lab', desc: 'Logic gates, truth tables, and Boolean algebra puzzles.', color: 'indigo', ready: true }
            ];
            // ── Tool search filter ──
            var _searchLower = _stemToolSearch.toLowerCase().trim();
            var _filteredTools = _searchLower ? _allStemTools.filter(function (tool) {
              if (tool.category) {
                // Keep category if ANY tool in it matches
                return true;
              }
              return (tool.label || '').toLowerCase().indexOf(_searchLower) !== -1 ||
                (tool.desc || '').toLowerCase().indexOf(_searchLower) !== -1;
            }) : _allStemTools;
            // Remove orphan category headers (categories with no matching tools after them)
            if (_searchLower) {
              _filteredTools = _filteredTools.filter(function (tool, i, arr) {
                if (!tool.category) return true;
                // Check if at least one non-category tool follows before next category or end
                for (var j = i + 1; j < arr.length; j++) {
                  if (arr[j].category) return false;
                  return true;
                }
                return false;
              });
            }
            // Station filter — only show tools in active station
            if (_activeStation && _activeStation.tools && _activeStation.tools.length > 0) {
              var _stationToolSet = {};
              _activeStation.tools.forEach(function(tid) { _stationToolSet[tid] = true; });
              _filteredTools = _allStemTools.filter(function(tool) {
                if (tool.category) return true;
                return !!_stationToolSet[tool.id];
              });
              // Remove orphan categories
              _filteredTools = _filteredTools.filter(function(tool, i, arr) {
                if (!tool.category) return true;
                for (var j = i + 1; j < arr.length; j++) {
                  if (arr[j].category) return false;
                  return true;
                }
                return false;
              });
            }
            // Category filter (from chip buttons)
            var _catFilter = d._categoryFilter || '';
            if (_catFilter && !_activeStation) {
              var _catMap = { science: ['Science', 'Biology', 'Life Science', 'science'], math: ['Math', 'math'], engineering: ['Engineering', 'tech', 'cs', 'engineering'], creative: ['Creative', 'creative', 'Art'], applied: ['Applied', 'applied', 'geo'], strategy: ['Strategy', 'strategy'] };
              var _catKeys = _catMap[_catFilter] || [_catFilter];
              _filteredTools = _filteredTools.filter(function(tool) {
                if (tool.category) {
                  // Check if this category header matches
                  var catLabel = (tool.label || '').toLowerCase();
                  return _catKeys.some(function(ck) { return catLabel.indexOf(ck.toLowerCase()) !== -1; });
                }
                // Check tool's own category
                var toolCat = '';
                // Find the preceding category header
                var toolIdx = _allStemTools.indexOf(tool);
                for (var ci3 = toolIdx - 1; ci3 >= 0; ci3--) {
                  if (_allStemTools[ci3].category) { toolCat = (_allStemTools[ci3].label || '').toLowerCase(); break; }
                }
                return _catKeys.some(function(ck) { return toolCat.indexOf(ck.toLowerCase()) !== -1; });
              });
              // Remove orphan categories
              _filteredTools = _filteredTools.filter(function(tool, i, arr) {
                if (!tool.category) return true;
                for (var j = i + 1; j < arr.length; j++) {
                  if (arr[j].category) return false;
                  return true;
                }
                return false;
              });
            }
            var _cardIndex = 0;
            // Tool count summary
            var _toolCount = _filteredTools.filter(function(t2) { return !t2.category; }).length;
            return /*#__PURE__*/React.createElement("div", {
              className: "max-w-3xl mx-auto animate-in fade-in duration-200"
            },
          // Search input
          /*#__PURE__*/React.createElement("div", { className: "mb-4 relative" },
            /*#__PURE__*/React.createElement("input", {
              type: "text",
              value: _stemToolSearch,
              onChange: function (e) { _setStemToolSearch(e.target.value); },
              placeholder: "\uD83D\uDD0D Search tools...",
              className: "w-full px-4 py-2.5 pl-10 text-sm border border-slate-400 rounded-xl bg-white focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-all",
              'aria-label': 'Search STEM Lab tools'
            }),
            /*#__PURE__*/React.createElement("span", { className: "absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" }, "\uD83D\uDD0D"),
              _stemToolSearch && /*#__PURE__*/React.createElement("button", {
                onClick: function () { _setStemToolSearch(''); },
                className: "absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600 text-xs font-bold transition-colors",
                'aria-label': 'Clear search'
              }, "\u2715")
            ),

          // ── Category filter chips ──
          !_activeStation && React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-3", role: 'group', 'aria-label': 'Filter tools by category' },
            [
              { id: '', label: 'All', icon: '\u2B50' },
              { id: 'science', label: 'Science', icon: '\uD83E\uDDEA' },
              { id: 'math', label: 'Math', icon: '\uD83D\uDCCA' },
              { id: 'engineering', label: 'Engineering', icon: '\u2699\uFE0F' },
              { id: 'creative', label: 'Creative', icon: '\uD83C\uDFA8' },
              { id: 'applied', label: 'Applied', icon: '\uD83D\uDE80' },
              { id: 'strategy', label: 'Games', icon: '\uD83C\uDFAE' }
            ].map(function(cat) {
              var isActive = (_stemToolSearch === '' && !d._categoryFilter && cat.id === '') || d._categoryFilter === cat.id;
              return React.createElement("button", {
                key: cat.id,
                'aria-label': 'Filter by ' + (cat.label || 'all categories'),
                'aria-pressed': isActive ? 'true' : 'false',
                onClick: function() {
                  var newFilter = cat.id === d._categoryFilter ? '' : cat.id;
                  upd('_categoryFilter', newFilter);
                  _setStemToolSearch('');
                  if (typeof announceToSR === 'function') announceToSR(newFilter ? 'Showing ' + cat.label + ' tools' : 'Showing all tools');
                },
                className: "px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border " +
                  (isActive ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600')
              }, cat.icon + ' ' + cat.label);
            })
          ),

          // ── Station Controls ──
          React.createElement("div", { className: "flex items-center gap-2 mb-4" },
            // Create Station button
            React.createElement("button", { "aria-label": "Toggle station builder",
              onClick: function() { _setShowStationBuilder(!_showStationBuilder); },
              className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all " +
                (_showStationBuilder ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100")
            }, "\uD83D\uDCCC", _showStationBuilder ? "Close Builder" : "Create Station"),
            // Active station indicator
            _activeStation ? React.createElement("div", { className: "flex items-center gap-2 flex-1 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200" },
              React.createElement("span", { className: "text-xs font-bold text-emerald-700" }, "\uD83C\uDFAF Station: " + _activeStation.name),
              _activeStation.grade ? React.createElement("span", { className: "text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-bold" }, "Grade " + _activeStation.grade) : null,
              React.createElement("button", { "aria-label": "Exit Station",
                onClick: function() { _setActiveStationId(null); },
                className: "ml-auto text-[10px] text-emerald-500 hover:text-emerald-700 font-bold"
              }, "\u2715 Exit Station"),
              // Quest count badge
              _activeStation.quests && _activeStation.quests.length > 0 ? React.createElement("span", { className: "text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold" },
                "\uD83C\uDFC6 " + (_activeStation.quests.filter(function(q) { return ((_questProgress[_activeStation.id] || {})[q.qid] || {}).complete; }).length) + "/" + _activeStation.quests.length + " quests"
              ) : null
            ) : null,
            // Saved stations dropdown
            _savedStations.length > 0 && !_activeStation ? React.createElement("select", {
              value: _activeStationId || '',
              onChange: function(e) {
                var sid = e.target.value;
                _setActiveStationId(sid || null);
                if (sid) {
                  var st = _savedStations.find(function(s) { return s.id === sid; });
                  if (st && st.grade && typeof props.setGradeLevel === 'function') {
                    props.setGradeLevel(st.grade);
                  }
                  if (addToast) addToast('\uD83C\uDFAF Station loaded: ' + (st ? st.name : ''), 'success');
                }
              },
              className: "px-2 py-1.5 text-xs border border-slate-400 rounded-lg bg-white text-slate-700 font-bold"
            },
              React.createElement("option", { value: "" }, "\uD83D\uDCCB Load Station..."),
              _savedStations.map(function(st) {
                var questInfo = st.quests && st.quests.length > 0 ? ' \uD83C\uDFC6' + st.quests.length : '';
                return React.createElement("option", { key: st.id, value: st.id }, st.name + (st.grade ? ' (Gr ' + st.grade + ')' : '') + questInfo);
              })
            ) : null
          ),

          // ═══ Quest HUD (floating compact panel) ═══
          _activeStation && _activeStation.quests && _activeStation.quests.length > 0 && stemLabTool ?
            React.createElement("div", {
              className: "fixed bottom-4 right-4 z-[9998] transition-all " + (_questHudCollapsed ? 'w-auto' : 'w-72'),
              role: 'region',
              'aria-label': 'Quest log for station ' + _activeStation.name
            },
              React.createElement("div", { className: "bg-white/95 backdrop-blur-sm rounded-xl border-2 border-amber-300 shadow-2xl overflow-hidden" },
              // Header
              React.createElement("div", {
                className: "flex items-center justify-between px-3 py-1.5 bg-amber-100 cursor-pointer",
                onClick: function() { _setQuestHudCollapsed(!_questHudCollapsed); }
              },
                React.createElement("span", { className: "text-xs font-bold text-amber-800" }, "\uD83C\uDFC6 Quest Log"),
                React.createElement("div", { className: "flex items-center gap-2" },
                  React.createElement("span", { className: "text-[10px] text-amber-600 font-bold" },
                    _activeStation.quests.filter(function(q) { return ((_questProgress[_activeStation.id] || {})[q.qid] || {}).complete; }).length + "/" + _activeStation.quests.length + " complete"
                  ),
                  React.createElement("span", { className: "text-[10px] text-amber-500" }, _questHudCollapsed ? "\u25BC" : "\u25B2")
                )
              ),
              // Quest list
              !_questHudCollapsed && React.createElement("div", { className: "p-2 space-y-1.5" },
                _activeStation.quests.map(function(quest) {
                  var disp = _getQuestDisplay(quest, labToolData || {}, _questProgress, _activeStation.id);
                  var qp = ((_questProgress[_activeStation.id] || {})[quest.qid]) || {};
                  var qtDef = QUEST_TYPES.find(function(qt) { return qt.id === quest.type; }) || {};
                  // Difficulty indicator
                  var difficulty = 'easy';
                  if (quest.type === 'xpThreshold' && (quest.params.threshold || 50) >= 75) difficulty = 'hard';
                  else if (quest.type === 'xpThreshold' && (quest.params.threshold || 50) >= 40) difficulty = 'medium';
                  else if (quest.type === 'timeSpent' && (quest.params.minutes || 5) >= 8) difficulty = 'hard';
                  else if (quest.type === 'timeSpent' && (quest.params.minutes || 5) >= 5) difficulty = 'medium';
                  else if (quest.type === 'freeResponse' && (quest.params.minLength || 30) >= 60) difficulty = 'hard';
                  else if (quest.type === 'freeResponse') difficulty = 'medium';
                  else if (quest.type === 'toolQuest') difficulty = 'medium';
                  var diffColors = { easy: 'bg-green-100 text-green-600', medium: 'bg-amber-100 text-amber-600', hard: 'bg-red-100 text-red-600' };
                  var diffLabels = { easy: '\u2605', medium: '\u2605\u2605', hard: '\u2605\u2605\u2605' };
                  return React.createElement("div", { key: quest.qid, className: "bg-white rounded-lg px-2.5 py-2 border " + (disp.done ? 'border-green-300 bg-green-50/50' : 'border-amber-200') },
                    React.createElement("div", { className: "flex items-center justify-between mb-1" },
                      React.createElement("div", { className: "flex items-center gap-1.5 flex-1 min-w-0" },
                        React.createElement("span", { className: "text-[11px] font-bold truncate " + (disp.done ? 'text-green-700' : 'text-slate-700') },
                          (disp.done ? "\u2705 " : (qtDef.icon || "\u2B1C") + " ") + quest.label
                        ),
                        !disp.done && React.createElement("span", { className: "text-[10px] px-1 py-0.5 rounded-full shrink-0 " + diffColors[difficulty], title: difficulty + ' difficulty' }, diffLabels[difficulty])
                      ),
                      React.createElement("span", { className: "text-[10px] font-mono shrink-0 ml-1 " + (disp.done ? 'text-green-500' : 'text-amber-600') }, disp.text)
                    ),
                    // Live timer for timeSpent quests
                    quest.type === 'timeSpent' && !disp.done && (function() {
                      var ms = (qp.timeAccumMs || 0);
                      var targetMs = (quest.params.minutes || 5) * 60000;
                      var min = Math.floor(ms / 60000);
                      var sec = Math.floor((ms % 60000) / 1000);
                      var isActive = stemLabTool === quest.toolId;
                      return React.createElement("div", { className: "flex items-center gap-1.5 mt-0.5 mb-0.5" },
                        React.createElement("span", { className: "text-[10px] " + (isActive ? 'text-green-600 font-bold' : 'text-slate-400') },
                          (isActive ? '\u25CF ' : '\u25CB ') + min + ':' + sec.toString().padStart(2, '0') + ' / ' + (quest.params.minutes || 5) + ':00'
                        ),
                        isActive && React.createElement("span", { className: "text-[10px] text-green-500 animate-pulse" }, 'timing...')
                      );
                    })(),
                    // Progress bar
                    !disp.done && React.createElement("div", { className: "h-1.5 bg-slate-100 rounded-full overflow-hidden", role: 'progressbar', 'aria-valuenow': Math.round(disp.pct), 'aria-valuemax': 100 },
                      React.createElement("div", { className: "h-full rounded-full transition-all " + (disp.pct >= 80 ? 'bg-green-400' : disp.pct >= 50 ? 'bg-amber-400' : 'bg-amber-300'), style: { width: disp.pct + '%' } })
                    ),
                    // Free response textarea
                    quest.type === 'freeResponse' && !disp.done && React.createElement("textarea", {
                      value: qp.response || '',
                      placeholder: quest.params.prompt || 'Describe what you learned...',
                      'aria-label': quest.params.prompt || 'Write your response',
                      onChange: function(e) {
                        var val = e.target.value;
                        _setQuestProgress(function(prev) {
                          var sp = Object.assign({}, prev[_activeStation.id] || {});
                          var qpUpdate = Object.assign({}, sp[quest.qid] || {});
                          qpUpdate.response = val;
                          sp[quest.qid] = qpUpdate;
                          var next = Object.assign({}, prev);
                          next[_activeStation.id] = sp;
                          return next;
                        });
                      },
                      rows: 2,
                      className: "w-full mt-1.5 px-2 py-1.5 text-xs border border-amber-200 rounded-lg resize-none focus:ring-2 focus:ring-amber-400 outline-none"
                    })
                  );
                }),
                // All quests complete celebration
                (function() {
                  var allDone = _activeStation.quests.every(function(q) { return ((_questProgress[_activeStation.id] || {})[q.qid] || {}).complete; });
                  var completedCount = _activeStation.quests.filter(function(q) { return ((_questProgress[_activeStation.id] || {})[q.qid] || {}).complete; }).length;
                  return React.createElement("div", { className: "space-y-1.5" },
                    // All complete celebration
                    allDone ? React.createElement("div", { className: "bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-3 border border-green-300 text-center" },
                      React.createElement("div", { className: "text-2xl mb-1" }, "\uD83C\uDF89"),
                      React.createElement("p", { className: "text-sm font-bold text-green-800" }, "All Quests Complete!"),
                      React.createElement("p", { className: "text-[10px] text-green-600 mb-2" }, "Great work, explorer! You finished all " + _activeStation.quests.length + " quests in this station."),
                      React.createElement("div", { className: "flex gap-3 justify-center" },
                        React.createElement("button", {
                          'aria-label': 'Copy quest completion report to clipboard',
                          onClick: function() {
                            var stProg = _questProgress[_activeStation.id] || {};
                            var report = '\uD83C\uDFC6 QUEST REPORT: ' + _activeStation.name + '\n';
                            report += 'Completed: ' + new Date().toLocaleDateString() + '\n\n';
                            _activeStation.quests.forEach(function(q) {
                              var qp = stProg[q.qid] || {};
                              report += (qp.complete ? '\u2705' : '\u2B1C') + ' ' + q.label;
                              if (qp.completedAt) report += ' (at ' + new Date(qp.completedAt).toLocaleTimeString() + ')';
                              if (q.type === 'freeResponse' && qp.response) report += '\n   Response: "' + qp.response + '"';
                              report += '\n';
                            });
                            report += '\nStation: ' + _activeStation.name + ' | Tools: ' + _activeStation.tools.join(', ');
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(report).then(function() {
                                if (addToast) addToast('\uD83D\uDCCB Report copied to clipboard!', 'success');
                              });
                            }
                          },
                          className: "text-[10px] text-green-700 hover:text-green-900 underline font-bold"
                        }, "\uD83D\uDCCB Copy Report"),
                        React.createElement("button", {
                          'aria-label': 'Reset all quest progress for this station',
                          onClick: function() {
                            _setQuestProgress(function(prev) {
                              var next = Object.assign({}, prev);
                              delete next[_activeStation.id];
                              return next;
                            });
                            if (addToast) addToast('\uD83D\uDD04 Quest progress reset for ' + _activeStation.name, 'info');
                          },
                          className: "text-[10px] text-green-600 hover:text-green-800 underline"
                        }, "\uD83D\uDD04 Reset & Try Again")
                      )
                    ) : null,
                    // Progress summary bar (when not all complete)
                    !allDone && completedCount > 0 ? React.createElement("div", { className: "flex items-center gap-2 px-2 py-1 bg-amber-50 rounded-lg border border-amber-200" },
                      React.createElement("div", { className: "w-full h-1.5 bg-amber-100 rounded-full overflow-hidden flex-1" },
                        React.createElement("div", { className: "h-full bg-amber-400 rounded-full transition-all", style: { width: Math.round(completedCount / _activeStation.quests.length * 100) + '%' } })
                      ),
                      React.createElement("span", { className: "text-[10px] font-bold text-amber-700 shrink-0" }, Math.round(completedCount / _activeStation.quests.length * 100) + '%')
                    ) : null
                  );
                })()
              )
            )) : null,

          // ── Station Builder Panel ──
          _showStationBuilder ? React.createElement("div", { className: "mb-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-300 p-4" },
            React.createElement("h3", { className: "text-sm font-black text-indigo-800 mb-3 flex items-center gap-2" }, "\uD83D\uDCCC Station Builder"),

            // Station name
            React.createElement("div", { className: "mb-3" },
              React.createElement("label", { className: "text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1" }, "Station Name"),
              React.createElement("input", {
                type: "text", value: _stationName, placeholder: "e.g. Water Cycle Exploration",
                onChange: function(e) { _setStationName(e.target.value); },
                className: "w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-400 outline-none"
              })
            ),

            // Grade + Time row
            React.createElement("div", { className: "grid grid-cols-2 gap-3 mb-3" },
              React.createElement("div", null,
                React.createElement("label", { className: "text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1" }, "Grade Level"),
                React.createElement("select", {
                  value: _stationGrade,
                  onChange: function(e) { _setStationGrade(e.target.value); },
                  className: "w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg bg-white"
                },
                  React.createElement("option", { value: "" }, "Auto-detect"),
                  ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map(function(g) {
                    return React.createElement("option", { key: g, value: g }, "Grade " + g);
                  })
                )
              ),
              React.createElement("div", null,
                React.createElement("label", { className: "text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1" }, "Time Estimate"),
                React.createElement("select", {
                  value: _stationTimeEst,
                  onChange: function(e) { _setStationTimeEst(e.target.value); },
                  className: "w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg bg-white"
                },
                  ["10", "15", "20", "30", "45", "60"].map(function(m) {
                    return React.createElement("option", { key: m, value: m }, m + " minutes");
                  })
                )
              )
            ),

            // Teacher note
            React.createElement("div", { className: "mb-3" },
              React.createElement("label", { className: "text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1" }, "Teacher Instructions (optional)"),
              React.createElement("textarea", {
                value: _stationNote, placeholder: "e.g. Start with the Water Cycle tool, then complete the Quiz.",
                onChange: function(e) { _setStationNote(e.target.value); },
                rows: 2, className: "w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg bg-white resize-none focus:ring-2 focus:ring-indigo-400 outline-none"
              })
            ),

            // ═══ Quest Picker (optional) ═══
            React.createElement("div", { className: "mb-3 border border-amber-200 rounded-xl overflow-hidden" },
              React.createElement("button", {
                'aria-label': 'Toggle quest assignment section. ' + _stationQuests.length + ' quests added.',
                'aria-expanded': _questPickerOpen ? 'true' : 'false',
                onClick: function() { _setQuestPickerOpen(!_questPickerOpen); },
                className: "w-full flex items-center justify-between px-3 py-2 text-sm font-bold " + (_questPickerOpen ? 'bg-amber-100 text-amber-800' : 'bg-amber-50 text-amber-700 hover:bg-amber-100') + " transition-colors"
              },
                React.createElement("span", null, "\uD83C\uDFC6 Add Quests (" + _stationQuests.length + ")" + (_stationQuests.length === 0 ? " \u2014 optional" : "")),
                React.createElement("span", { className: "text-xs" }, _questPickerOpen ? "\u25B2" : "\u25BC")
              ),
              _questPickerOpen && React.createElement("div", { className: "p-3 bg-amber-50/50 space-y-3" },
                // Quick preset templates + auto-suggest
                _stationQuests.length === 0 && React.createElement("div", { className: "space-y-1.5" },
                  React.createElement("p", { className: "text-[10px] text-amber-600 font-bold uppercase tracking-wider mb-1" }, "\u26A1 Quick Presets"),
                  // Auto-suggest button
                  (function() {
                    var selectedTools = Object.keys(_stationTools).filter(function(k) { return _stationTools[k]; });
                    var totalHooksAvailable = 0;
                    selectedTools.forEach(function(tid) { totalHooksAvailable += _getToolQuestHooks(tid).length; });
                    if (totalHooksAvailable === 0 || selectedTools.length === 0) return null;
                    return React.createElement("button", {
                      'aria-label': 'Auto-generate smart quests based on selected tools',
                      onClick: function() {
                        var autoQuests = [];
                        // Add 1 XP quest per tool
                        selectedTools.slice(0, 2).forEach(function(tid) {
                          autoQuests.push({ type: 'xpThreshold', toolId: tid, label: _questAutoLabel('xpThreshold', tid, { threshold: 40 }), params: { threshold: 40 } });
                        });
                        // Add best tool-specific hooks (up to 3)
                        var hookQuests = [];
                        selectedTools.forEach(function(tid) {
                          var hooks = _getToolQuestHooks(tid);
                          if (hooks.length > 0) hookQuests.push({ type: 'toolQuest', toolId: tid, label: hooks[0].label, params: { hookId: hooks[0].id } });
                          if (hooks.length > 1) hookQuests.push({ type: 'toolQuest', toolId: tid, label: hooks[1].label, params: { hookId: hooks[1].id } });
                        });
                        autoQuests = autoQuests.concat(hookQuests.slice(0, 3));
                        // Add a reflection
                        autoQuests.push({ type: 'freeResponse', toolId: null, label: 'What did you learn?', params: { prompt: 'What was the most interesting thing you discovered today?', minLength: 30 } });
                        _setStationQuests(autoQuests);
                        if (addToast) addToast('\uD83E\uDD16 Smart quests generated! ' + autoQuests.length + ' quests based on your tools.', 'success');
                      },
                      className: "w-full mb-1.5 py-2 rounded-lg text-[10px] font-bold text-white bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 transition-all shadow-sm"
                    }, "\uD83E\uDD16 Auto-Generate Smart Quests (" + totalHooksAvailable + " available)");
                  })(),
                  React.createElement("div", { className: "grid grid-cols-3 gap-1.5" },
                    [
                      { name: 'Quick Explore', icon: '\uD83D\uDC63', desc: 'XP + time in each tool', quests: function() {
                        var tools = Object.keys(_stationTools).filter(function(k) { return _stationTools[k]; });
                        return tools.slice(0, 3).map(function(tid) {
                          return { type: 'xpThreshold', toolId: tid, label: _questAutoLabel('xpThreshold', tid, { threshold: 30 }), params: { threshold: 30 } };
                        }).concat([{ type: 'timeSpent', toolId: tools[0] || null, label: _questAutoLabel('timeSpent', tools[0] || null, { minutes: 3 }), params: { minutes: 3 } }]);
                      }},
                      { name: 'Deep Dive', icon: '\uD83D\uDD2C', desc: 'XP + quiz + reflection', quests: function() {
                        var tools = Object.keys(_stationTools).filter(function(k) { return _stationTools[k]; });
                        var t0 = tools[0] || null;
                        return [
                          { type: 'xpThreshold', toolId: t0, label: _questAutoLabel('xpThreshold', t0, { threshold: 75 }), params: { threshold: 75 } },
                          { type: 'timeSpent', toolId: t0, label: _questAutoLabel('timeSpent', t0, { minutes: 8 }), params: { minutes: 8 } },
                          { type: 'freeResponse', toolId: null, label: 'What was the most important thing you learned?', params: { prompt: 'What was the most important thing you learned and why?', minLength: 50 } }
                        ];
                      }},
                      { name: 'Research Report', icon: '\uD83D\uDCDD', desc: 'Explore + document', quests: function() {
                        var tools = Object.keys(_stationTools).filter(function(k) { return _stationTools[k]; });
                        return tools.slice(0, 2).map(function(tid) {
                          return { type: 'xpThreshold', toolId: tid, label: _questAutoLabel('xpThreshold', tid, { threshold: 50 }), params: { threshold: 50 } };
                        }).concat([
                          { type: 'freeResponse', toolId: null, label: 'Compare what you learned from each tool', params: { prompt: 'Compare what you learned from each tool. How do they connect?', minLength: 80 } },
                          { type: 'freeResponse', toolId: null, label: 'Write a question you still have', params: { prompt: 'Write a question you still have after exploring.', minLength: 20 } }
                        ]);
                      }}
                    ].map(function(preset) {
                      return React.createElement("button", {
                        key: preset.name,
                        'aria-label': 'Apply preset: ' + preset.name + '. ' + preset.desc,
                        onClick: function() {
                          var tools = Object.keys(_stationTools).filter(function(k) { return _stationTools[k]; });
                          if (tools.length === 0) { if (addToast) addToast('Select tools first, then add quests', 'info'); return; }
                          _setStationQuests(preset.quests());
                          if (addToast) addToast('\uD83C\uDFC6 Applied "' + preset.name + '" quest template!', 'success');
                        },
                        className: "bg-white rounded-lg p-2 border border-amber-200 hover:border-amber-400 hover:bg-amber-50 transition-all text-center"
                      },
                        React.createElement("div", { className: "text-lg" }, preset.icon),
                        React.createElement("div", { className: "text-[10px] font-bold text-amber-800" }, preset.name),
                        React.createElement("div", { className: "text-[10px] text-amber-600" }, preset.desc)
                      );
                    })
                  )
                ),
                // Added quests list
                _stationQuests.length > 0 && React.createElement("div", { className: "space-y-1.5" },
                  _stationQuests.map(function(q, qi) {
                    return React.createElement("div", { key: qi, className: "flex items-center justify-between bg-white rounded-lg px-2.5 py-1.5 border border-amber-200 text-xs" },
                      React.createElement("span", null, QUEST_TYPES.find(function(qt) { return qt.id === q.type; })?.icon + " " + q.label),
                      React.createElement("button", {
                        'aria-label': 'Remove quest: ' + q.label,
                        onClick: function() { _setStationQuests(_stationQuests.filter(function(_, i) { return i !== qi; })); },
                        className: "text-red-400 hover:text-red-600 px-1"
                      }, "\u2715")
                    );
                  })
                ),
                // Tool-specific quests (from questHooks)
                (function() {
                  var selectedToolIds = Object.keys(_stationTools).filter(function(k) { return _stationTools[k]; });
                  var allHooks = [];
                  selectedToolIds.forEach(function(tid) {
                    var hooks3 = _getToolQuestHooks(tid);
                    hooks3.forEach(function(h3) {
                      // Skip if already added
                      var alreadyAdded = _stationQuests.some(function(sq) { return sq.type === 'toolQuest' && sq.params && sq.params.hookId === h3.id && sq.toolId === tid; });
                      if (!alreadyAdded) allHooks.push({ toolId: tid, hook: h3 });
                    });
                  });
                  if (allHooks.length === 0) return null;
                  return React.createElement("div", { className: "bg-white rounded-lg p-2.5 border border-purple-200 space-y-1.5" },
                    React.createElement("p", { className: "text-[10px] text-purple-600 font-bold uppercase tracking-wider" }, "\uD83C\uDFC6 Tool-Specific Quests (" + allHooks.length + " available)"),
                    React.createElement("div", { className: "grid grid-cols-1 gap-1 max-h-[200px] overflow-y-auto" },
                      allHooks.map(function(ah, ahi) {
                        var toolLabel = (_allStemTools.find(function(t3) { return t3.id === ah.toolId; }) || {}).label || ah.toolId;
                        return React.createElement("button", {
                          key: ah.toolId + '_' + ah.hook.id,
                          'aria-label': 'Add quest: ' + ah.hook.label + ' in ' + toolLabel,
                          onClick: function() {
                            _setStationQuests(_stationQuests.concat([{
                              type: 'toolQuest',
                              toolId: ah.toolId,
                              label: ah.hook.label,
                              params: { hookId: ah.hook.id }
                            }]));
                            if (addToast) addToast('\uD83C\uDFC6 Added: ' + ah.hook.label, 'success');
                          },
                          className: "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[10px] bg-purple-50 border border-purple-100 hover:border-purple-400 hover:bg-purple-100 transition-all"
                        },
                          React.createElement("span", { className: "text-sm shrink-0" }, ah.hook.icon || '\uD83C\uDFC6'),
                          React.createElement("div", { className: "flex-1 min-w-0" },
                            React.createElement("div", { className: "font-bold text-purple-800 truncate" }, ah.hook.label),
                            React.createElement("div", { className: "text-[10px] text-purple-500" }, toolLabel)
                          ),
                          React.createElement("span", { className: "text-purple-400 text-xs shrink-0" }, "+")
                        );
                      })
                    )
                  );
                })(),
                // Add quest form (universal types)
                React.createElement("div", { className: "bg-white rounded-lg p-2.5 border border-amber-200 space-y-2" },
                  React.createElement("p", { className: "text-[10px] text-amber-600 font-bold uppercase tracking-wider" }, "Custom Quest"),
                  // Type selector
                  React.createElement("div", { className: "grid grid-cols-5 gap-1" },
                    QUEST_TYPES.map(function(qt) {
                      var isActive = (d._questBuilderType || 'xpThreshold') === qt.id;
                      return React.createElement("button", {
                        key: qt.id,
                        'aria-label': 'Quest type: ' + qt.label,
                        onClick: function() { upd('_questBuilderType', qt.id); },
                        className: "px-1.5 py-1.5 rounded-lg text-[10px] font-bold text-center transition-all border " + (isActive ? 'bg-amber-700 text-white border-amber-600' : 'bg-white text-amber-700 border-amber-200 hover:border-amber-400')
                      },
                        React.createElement("div", { className: "text-sm" }, qt.icon),
                        React.createElement("div", null, qt.label)
                      );
                    })
                  ),
                  // Tool selector (for non-freeResponse types)
                  (d._questBuilderType || 'xpThreshold') !== 'freeResponse' && React.createElement("div", null,
                    React.createElement("label", { className: "text-[10px] text-slate-500 block mb-0.5" }, "For which tool?"),
                    React.createElement("select", {
                      value: d._questBuilderTool || '',
                      onChange: function(e) { upd('_questBuilderTool', e.target.value); },
                      'aria-label': 'Select tool for quest',
                      className: "w-full px-2 py-1.5 text-xs border border-amber-200 rounded-lg bg-white"
                    },
                      React.createElement("option", { value: "" }, "-- Select a tool --"),
                      Object.keys(_stationTools).filter(function(k) { return _stationTools[k]; }).map(function(toolId) {
                        var tool = _allStemTools.find(function(t2) { return t2.id === toolId; });
                        return React.createElement("option", { key: toolId, value: toolId }, (tool ? tool.icon + ' ' + tool.label : toolId));
                      })
                    )
                  ),
                  // Parameter input
                  React.createElement("div", null,
                    (function() {
                      var qType = d._questBuilderType || 'xpThreshold';
                      var qtDef = QUEST_TYPES.find(function(qt2) { return qt2.id === qType; }) || QUEST_TYPES[0];
                      if (qType === 'freeResponse') {
                        return React.createElement("div", null,
                          React.createElement("label", { className: "text-[10px] text-slate-500 block mb-0.5" }, "Prompt for student"),
                          React.createElement("input", {
                            type: "text",
                            value: d._questBuilderPrompt || '',
                            onChange: function(e) { upd('_questBuilderPrompt', e.target.value); },
                            placeholder: "e.g. What was the most interesting thing you learned?",
                            className: "w-full px-2 py-1.5 text-xs border border-amber-200 rounded-lg"
                          })
                        );
                      }
                      return React.createElement("div", null,
                        React.createElement("label", { className: "text-[10px] text-slate-500 block mb-0.5" }, qtDef.paramLabel),
                        React.createElement("input", {
                          type: "number",
                          value: d._questBuilderParam || qtDef.defaultVal,
                          onChange: function(e) { upd('_questBuilderParam', parseInt(e.target.value) || qtDef.defaultVal); },
                          min: 1,
                          'aria-label': qtDef.paramLabel + ' for quest',
                          className: "w-20 px-2 py-1.5 text-xs border border-amber-200 rounded-lg"
                        }),
                        React.createElement("span", { className: "text-[10px] text-slate-400 ml-1.5" }, qtDef.unit)
                      );
                    })()
                  ),
                  // Preview + Add button
                  React.createElement("div", { className: "flex items-center justify-between" },
                    React.createElement("span", { className: "text-[10px] text-slate-400 italic" },
                      "\u201C" + _questAutoLabel(
                        d._questBuilderType || 'xpThreshold',
                        d._questBuilderTool || null,
                        (function() {
                          var qT = d._questBuilderType || 'xpThreshold';
                          var p = d._questBuilderParam || QUEST_TYPES.find(function(x) { return x.id === qT; })?.defaultVal || 5;
                          if (qT === 'xpThreshold') return { threshold: p };
                          if (qT === 'timeSpent') return { minutes: p };
                          if (qT === 'discoveryCount') return { count: p };
                          if (qT === 'quizScore') return { minScore: p };
                          if (qT === 'freeResponse') return { prompt: d._questBuilderPrompt || 'Describe what you learned', minLength: 30 };
                          return {};
                        })()
                      ) + "\u201D"
                    ),
                    React.createElement("button", {
                      'aria-label': 'Add this quest to the station',
                      disabled: (d._questBuilderType || 'xpThreshold') !== 'freeResponse' && !d._questBuilderTool,
                      onClick: function() {
                        var qT2 = d._questBuilderType || 'xpThreshold';
                        var p2 = d._questBuilderParam || QUEST_TYPES.find(function(x) { return x.id === qT2; })?.defaultVal || 5;
                        var params2;
                        if (qT2 === 'xpThreshold') params2 = { threshold: p2 };
                        else if (qT2 === 'timeSpent') params2 = { minutes: p2 };
                        else if (qT2 === 'discoveryCount') params2 = { count: p2, field: 'discoveries' };
                        else if (qT2 === 'quizScore') params2 = { minScore: p2, field: 'quizScore' };
                        else if (qT2 === 'freeResponse') params2 = { prompt: d._questBuilderPrompt || 'Describe what you learned', minLength: 30 };
                        else params2 = {};
                        var newQuest = {
                          type: qT2,
                          toolId: qT2 === 'freeResponse' ? null : (d._questBuilderTool || null),
                          label: _questAutoLabel(qT2, qT2 === 'freeResponse' ? null : d._questBuilderTool, params2),
                          params: params2
                        };
                        _setStationQuests(_stationQuests.concat([newQuest]));
                        upd('_questBuilderParam', null);
                        upd('_questBuilderPrompt', '');
                      },
                      className: "px-3 py-1.5 rounded-lg text-[10px] font-bold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    }, "+ Add Quest")
                  )
                )
              )
            ),

            // Tool selector grid
            React.createElement("div", { className: "mb-3" },
              React.createElement("label", { className: "text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1" },
                "Select Tools (" + Object.keys(_stationTools).filter(function(k) { return _stationTools[k]; }).length + " selected)"
              ),
              React.createElement("div", { className: "grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-[200px] overflow-y-auto p-1" },
                _allStemTools.filter(function(t) { return !t.category && t.ready !== false; }).map(function(tool) {
                  var isSelected = !!_stationTools[tool.id];
                  return React.createElement("button", { "aria-label": (isSelected ? "Remove " : "Add ") + tool.label + " to station",
                    key: tool.id,
                    onClick: function() {
                      var next = Object.assign({}, _stationTools);
                      if (next[tool.id]) { delete next[tool.id]; } else { next[tool.id] = true; }
                      _setStationTools(next);
                    },
                    className: "p-2 rounded-lg text-left text-[10px] font-bold transition-all border " +
                      (isSelected ? "bg-indigo-100 border-indigo-400 text-indigo-800" : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300")
                  },
                    React.createElement("span", { className: "text-lg block" }, tool.icon),
                    React.createElement("span", { className: "block truncate" }, tool.label)
                  );
                })
              )
            ),

            // Save + Cancel buttons
            React.createElement("div", { className: "flex gap-2" },
              React.createElement("button", { "aria-label": "Save STEM station",
                onClick: function() {
                  var selectedIds = Object.keys(_stationTools).filter(function(k) { return _stationTools[k]; });
                  if (selectedIds.length === 0) { if (addToast) addToast('Select at least one tool', 'error'); return; }
                  var station = {
                    id: 'station_' + Date.now(),
                    name: _stationName.trim() || 'STEM Station',
                    tools: selectedIds,
                    grade: _stationGrade || null,
                    timeEstimate: _stationTimeEst + ' min',
                    teacherNote: _stationNote.trim(),
                    createdAt: new Date().toISOString(),
                    quests: _stationQuests.map(function(q, qi) {
                      return { qid: 'q_' + Date.now() + '_' + qi, type: q.type, toolId: q.toolId, label: q.label, params: q.params };
                    })
                  };
                  var updated = _savedStations.concat([station]);
                  _setSavedStations(updated);
                  localStorage.setItem('alloflow_stem_stations', JSON.stringify(updated));
                  _setShowStationBuilder(false);
                  _setStationName(''); _setStationGrade(''); _setStationNote(''); _setStationTools({}); _setStationTimeEst('20');
                  _setStationQuests([]); _setQuestPickerOpen(false);
                  _setActiveStationId(station.id);
                  if (station.grade && typeof props.setGradeLevel === 'function') props.setGradeLevel(station.grade);
                  var questMsg = station.quests.length > 0 ? ' \u2022 ' + station.quests.length + ' quest' + (station.quests.length > 1 ? 's' : '') : '';
                  if (addToast) addToast('\u2705 Station "' + station.name + '" created with ' + selectedIds.length + ' tools!' + questMsg, 'success');
                },
                disabled: Object.keys(_stationTools).filter(function(k) { return _stationTools[k]; }).length === 0,
                className: "flex-1 py-2 rounded-lg text-sm font-bold transition-all " +
                  (Object.keys(_stationTools).filter(function(k) { return _stationTools[k]; }).length > 0
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed")
              }, "\uD83D\uDCCC Save Station"),
              React.createElement("button", { "aria-label": "Cancel",
                onClick: function() { _setShowStationBuilder(false); },
                className: "px-4 py-2 rounded-lg text-sm font-bold text-slate-600 bg-white border border-slate-400 hover:bg-slate-50"
              }, "Cancel")
            ),

            // Manage saved stations
            _savedStations.length > 0 ? React.createElement("div", { className: "mt-3 pt-3 border-t border-indigo-200" },
              React.createElement("p", { className: "text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-2" },
                "\uD83D\uDCCB Saved Stations (" + _savedStations.length + ")"
              ),
              React.createElement("div", { className: "space-y-1.5" },
                _savedStations.map(function(st) {
                  return React.createElement("div", {
                    key: st.id, className: "flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white border border-indigo-100 text-xs"
                  },
                    React.createElement("span", { className: "font-bold text-indigo-800 flex-1" }, st.name),
                    st.grade ? React.createElement("span", { className: "text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-bold" }, "Gr " + st.grade) : null,
                    React.createElement("span", { className: "text-[11px] text-slate-500" }, st.tools.length + " tools"),
                    st.timeEstimate ? React.createElement("span", { className: "text-[11px] text-slate-500" }, st.timeEstimate) : null,
                    React.createElement("button", { "aria-label": "Load saved station",
                      onClick: function() {
                        _setActiveStationId(st.id);
                        _setShowStationBuilder(false);
                        if (st.grade && typeof props.setGradeLevel === 'function') props.setGradeLevel(st.grade);
                        if (addToast) addToast('\uD83C\uDFAF Station loaded!', 'success');
                      },
                      className: "text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                    }, "Load"),
                    React.createElement("button", { "aria-label": "Delete station: " + st.name,
                      onClick: function() {
                        var filtered = _savedStations.filter(function(s) { return s.id !== st.id; });
                        _setSavedStations(filtered);
                        localStorage.setItem('alloflow_stem_stations', JSON.stringify(filtered));
                        if (_activeStationId === st.id) _setActiveStationId(null);
                      },
                      className: "text-[10px] font-bold text-red-400 hover:text-red-600"
                    }, "\u2715")
                  );
                })
              )
            ) : null
          ) : null,

          // ── Active Station Info Bar ──
          _activeStation ? React.createElement("div", { className: "mb-4 bg-emerald-50 rounded-xl border border-emerald-200 p-3" },
            React.createElement("div", { className: "flex items-center gap-2 mb-1" },
              React.createElement("span", { className: "text-sm font-bold text-emerald-800" }, "\uD83C\uDFAF " + _activeStation.name),
              _activeStation.grade ? React.createElement("span", { className: "text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-200 text-emerald-700 font-bold" }, "Grade " + _activeStation.grade) : null,
              _activeStation.timeEstimate ? React.createElement("span", { className: "text-[10px] text-emerald-600" }, "\u23F1 " + _activeStation.timeEstimate) : null,
              React.createElement("span", { className: "text-[10px] text-emerald-600" }, _activeStation.tools.length + " tools")
            ),
            _activeStation.teacherNote ? React.createElement("p", { className: "text-xs text-emerald-700 italic mt-1" }, "\uD83D\uDCDD " + _activeStation.teacherNote) : null
          ) : null,

          // Tool grid
          /*#__PURE__*/React.createElement("div", { role: 'region', 'aria-label': _activeStation ? _activeStation.name + ' station tools' : 'STEM Lab tools',
              className: "grid grid-cols-2 gap-4"
            }, _filteredTools.map(function (tool) {
              if (tool.category) {
                return /*#__PURE__*/React.createElement("div", {
                  key: tool.id,
                  className: "col-span-2 mt-3 first:mt-0"
                }, /*#__PURE__*/React.createElement("h3", {
                  className: "text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1 mb-1"
                }, tool.label));
              }
              var _ci = _cardIndex++;
              var _cm = _toolColorMap[tool.color] || _toolColorMap.slate;
              return /*#__PURE__*/React.createElement("button", { "aria-label": tool.label + ': ' + (tool.desc || 'STEM tool'),
                key: tool.id,
                onClick: function () {
                  if (tool.ready === false) { if (addToast) addToast(tool.label + ' is coming soon!', 'info'); return; }
                  setStemLabTool(tool.id);
                  _setStemToolSearch('');
                  // Scroll to top of content area smoothly
                  setTimeout(function() {
                    var contentArea = document.querySelector('.stem-lab-modal .overflow-y-auto');
                    if (contentArea) contentArea.scrollTo({ top: 0, behavior: 'smooth' });
                  }, 50);
                  if (typeof announceToSR === 'function') announceToSR('Opening ' + tool.label);
                },
                title: tool.desc || tool.label,
                className: 'group p-5 rounded-2xl border-2 text-left transition-all duration-200 hover:scale-[1.04] hover:-translate-y-0.5 hover:shadow-xl ' + _cm.bg + ' ' + _cm.border + ' ' + _cm.hoverBorder,
                style: _reduceMotion ? {} : { animation: 'stemCardIn 0.35s ease-out both', animationDelay: (_ci * 40) + 'ms' }
              }, /*#__PURE__*/React.createElement("div", {
                className: "text-3xl mb-2"
              }, tool.icon), /*#__PURE__*/React.createElement("h4", {
                className: 'font-bold text-sm mb-1 ' + _cm.title
              }, tool.label), /*#__PURE__*/React.createElement("p", {
                className: 'text-xs ' + _cm.desc
              }, tool.desc));
            })),
              // No results message
              _searchLower && _filteredTools.length === 0 && /*#__PURE__*/React.createElement("div", { className: "text-center py-12 text-slate-400" },
            /*#__PURE__*/React.createElement("div", { className: "text-4xl mb-2" }, "\uD83D\uDD0D"),
            /*#__PURE__*/React.createElement("p", { className: "text-sm font-bold" }, 'No tools match "' + _stemToolSearch + '"'),
            /*#__PURE__*/React.createElement("button", { "aria-label": "Clear search",
                onClick: function () { _setStemToolSearch(''); },
                className: "mt-2 text-xs text-indigo-500 hover:text-indigo-700 font-bold transition-colors"
              }, "Clear search")
              ));
          })()),
        /* base10: removed -- see stem_tool_manipulatives.js */
        /* moneyMath: removed -- see stem_tool_money.js */
        /* lifeSkills: removed -- see stem_tool_lifeskills.js */

          /* coordinate: removed -- see stem_tool_coordgrid.js */
          /* protractor: removed -- see stem_tool_angles.js */
        /* multtable: removed -- see stem_tool_multtable.js */
        /* numberline: removed -- see stem_tool_numberline.js */
        /* areamodel: removed -- see stem_tool_areamodel.js */

        /* calculus: removed — see stem_tool_calculus.js */



        // ── Wave Simulator ── (handled by stem_tool_science.js plugin registry)







        /* cell: removed — see individual stem_tool_*.js files */
        // funcGrapher: EXTRACTED to stem_tool_funcgrapher.js (handled by registry fallback)



        // physics: EXTRACTED to stem_tool_physics.js (handled by registry fallback)



        /* chemBalance: removed — see individual stem_tool_*.js files */


        /* punnett: removed — see individual stem_tool_*.js files */


        /* circuit: removed — see individual stem_tool_*.js files */


        // --- DATA PLOTTER -> extracted to stem_tool_creative.js (plugin-only) ---
        null,


        // --- INEQUALITY GRAPHER -> extracted to stem_tool_inequality.js (plugin-only) ---
        null,


        /* molecule: removed — see individual stem_tool_*.js files */


        /* decomposer: removed — see individual stem_tool_*.js files */


        // ═══════════════════════════════════════════════════════
        // SOLAR SYSTEM EXPLORER — 3D (Three.js)
        // ═══════════════════════════════════════════════════════
        /* solarSystem: removed — see individual stem_tool_*.js files */

        // [Galaxy tool extracted to stem_tool_galaxy.js]



        /* universe: removed — see individual stem_tool_*.js files */

        /* rocks: removed -- see stem_tool_rocks.js */

        /* waterCycle: removed -- see stem_tool_watercycle.js */


        // ═══════════════════════════════════════════════════════
        // ROCK CYCLE
        // ═══════════════════════════════════════════════════════
        /* rockCycle: removed — see individual stem_tool_*.js files */


        // ═══════════════════════════════════════════════════════
        // ═══════════════════════════════════════════════════════
        // ECOSYSTEM SIMULATOR — Canvas2D Animated Population
        // ═══════════════════════════════════════════════════════
        /* ecosystem: removed — see individual stem_tool_*.js files */
        /* fractionViz: removed -- see stem_tool_fractions.js */
        /* fractions: removed -- see stem_tool_fractions.js */
        /* decomposer (duplicate): removed — see individual stem_tool_*.js files */

        // ═══════════════════════════════════════════════════════
        // UNIT CONVERTER
        // ═══════════════════════════════════════════════════════
        /* unitConvert: removed — see stem_tool_unitconvert.js */


        /* probability: removed -- see stem_tool_probability.js */




        // ═══════════════════════════════════════════════════════

        // MUSIC SYNTHESIZER — Web Audio API + Canvas2D Oscilloscope

        // ═══════════════════════════════════════════════════════

        // musicSynth hook stubs — MUST run every render to maintain React hook count
        // (active rendering handled by external stem_tool_music.js via plugin bridge)
        (function _musicSynthHookStubs() {
            React.useEffect(function(){}, []);  // 1 – waveform draw loop
            React.useEffect(function(){}, []);  // 2 – sequencer playback
            React.useRef(null);                 // 3 – beat-painter FX ref
            React.useEffect(function(){}, []);  // 4 – beat-painter cleanup
            React.useEffect(function(){}, []);  // 5 – chord helper
            React.useRef(null);                 // 6 – recording ref
            React.useRef(null);                 // 7 – recording chunks ref
            React.useRef(null);                 // 8 – recording stream ref
            React.useEffect(function(){}, []);  // 9 – recording toggle
            React.useRef(null);                 // 10 – sequencer step ref
            React.useRef(null);                 // 11 – metronome ref
            React.useEffect(function(){}, []);  // 12 – metronome tick
            React.useEffect(function(){}, []);  // 13 – metronome cleanup
            React.useEffect(function(){}, []);  // 14 – arpeggiator
            React.useEffect(function(){}, []);  // 15 – particle cleanup
            return null;
        })(),

        // ═══════════════════════════════════════════════════════
        // HUMAN ANATOMY EXPLORER
        /* anatomy: removed — see individual stem_tool_*.js files */
        /* dissection: removed — see stem_tool_dissection.js */
        stemLabTab === 'explore' && stemLabTool === 'dissection' && !window.StemLab.isRegistered('dissection') && (function() {
          return React.createElement('div', { style: { padding: 40, textAlign: 'center' } },
            React.createElement('p', { style: { fontSize: 32, marginBottom: 12 } }, '\uD83D\uDD2C'),
            React.createElement('p', { style: { fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 8 } }, 'Loading Dissection Lab\u2026'),
            React.createElement('p', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 16 } }, 'If this persists, the plugin may have failed to load from CDN.'),
            React.createElement('button', {
              onClick: function() { setStemLabTool(null); },
              style: { marginTop: 16, padding: '8px 20px', borderRadius: 8, background: '#3b82f6', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }
            }, '\u2190 Back to Tools')
          );
        })(),



        /* brainAtlas: removed — see stem_tool_brainatlas.js */



        /* artStudio: removed — see stem_tool_creative.js */


        // ═══════════════════════════════════════════════════════
        // COMPANION PLANTING LAB — Canvas2D Animated Garden
        // ═══════════════════════════════════════════════════════
        /* companionPlanting: removed — see individual stem_tool_*.js files */

        // --- GEOMETRY SANDBOX → extracted to stem_tool_geosandbox.js (plugin-only) ---
        null,


        /* archStudio: removed -- see stem_tool_archstudio.js */

        // --- GRAPHING CALCULATOR EMULATOR ---
        /* graphCalc: removed — see individual stem_tool_*.js files */

        /* dataStudio: removed -- see stem_tool_datastudio.js */

        // ═══════════════════════════════════════════════════════════════
        // ██  ALGEBRA SOLVER (CAS) — AI-Powered Step-by-Step Math      ██
        // ═══════════════════════════════════════════════════════════════
        /* algebraCAS: removed — see individual stem_tool_*.js files */


        // ═══════════════════════════════════════════════════════════════
        // ██  AQUACULTURE & OCEAN ECOLOGY LAB                         ██
        // ═══════════════════════════════════════════════════════════════
        /* aquarium: removed — see individual stem_tool_*.js files */

        // ═══════════════════════════════════════════════════════════════
        // ██  CODING PLAYGROUND — Visual Block / Text Turtle Graphics  ██

        /* spaceColony: removed u2014 see stem_tool_spacecolony.js */

        // ═══════════════════════════════════════════════════════════════
        /* economicsLab: removed — see individual stem_tool_*.js files */

        // ═══════════════════════════════════════════════════════════════
        // ██  BEHAVIOR SHAPING LAB — ABA Operant Conditioning Sim  ██
        // ═══════════════════════════════════════════════════════════════
        /* behaviorLab: removed — see individual stem_tool_*.js files */

        // ════════════════════════════════════════════════════════════════════
        // 🛡️  CYBER DEFENSE LAB — rendered via plugin registry fallback
        // ════════════════════════════════════════════════════════════════════
        (function _cyberDefenseLab() { return null; })(/* inline removed — see stem_tool_cyberdefense.js */),
        /* REMOVED: inline CyberDefense IIFE (~700 lines) — now handled by
           _pluginFallback via stem_tool_cyberdefense.js plugin file.
           Original inline code caused React Error #310 (hooks in plain function).
           CRITICAL: The previous stub had 23 conditional React.useState calls
           behind an early-return guard, which violated React Rules of Hooks
           and crashed StemLabModal for ALL tools (not just cyberDefense). */

        // ════════════════════════════════════════════════════════════════════
        // ── Plugin Registry Fallback Renderer (Phase 2) ──
        // For tools registered via window.StemLab.registerTool() that do NOT
        // have inline render code above. Bridges hub-scope variables into
        // the plugin's ctx object format.
        // ════════════════════════════════════════════════════════════════════
        stemLabTab === 'explore' && stemLabTool && window.StemLab && window.StemLab.isRegistered(stemLabTool) && (function _pluginFallback() {
          // Only render if no inline IIFE already handled this tool.
          // We detect this by checking a known marker: inline tools set state
          // immediately via their IIFE returns. If the tool is in the registry
          // AND has inline code, the inline code already rendered it — we skip.
          // For now, use an explicit set of tools WITHOUT inline code.
          // Plugin-only tools: these render via StemLab.renderTool(), not inline code
          var _pluginOnlyTools = {
            // Math
            algebraCAS: true, areamodel: true, base10: true, calculus: true,
            coordinate: true, decomposer: true, fractions: true, fractionViz: true,
            funcGrapher: true, geoSandbox: true, graphCalc: true, inequality: true,
            math: true, moneyMath: true, multtable: true, numberline: true,
            probability: true, protractor: true, volume: true,
            // Science
            anatomy: true, aquarium: true, brainAtlas: true, cell: true,
            chemBalance: true, climateExplorer: true, companionPlanting: true,
            dataPlot: true, dissection: true, dnaLab: true, ecosystem: true,
            epidemicSim: true, fireEcology: true, molecule: true, punnett: true,
            rocks: true, rockCycle: true, science: true, solarSystem: true,
            titrationLab: true, universe: true, unitConvert: true, waterCycle: true,
            // Engineering & CS
            archStudio: true, circuit: true, codingPlayground: true,
            cyberDefense: true, semiconductor: true,
            // Art & Music
            artStudio: true, creative: true, gameStudio: true,
            // Earth & Space
            galaxy: true, moonMission: true, plateTectonics: true, spaceColony: true,
            // Data & Logic
            behaviorLab: true, dataStudio: true, economicsLab: true, logicLab: true,
            // Geography
            geoQuiz: true, geometryProver: true, geometryWorld: true,
            // Applied
            a11yAuditor: true, lifeSkills: true, physics: true, wave: true,
            worldBuilder: true,
            flightSim: true,
            atcTower: true,
            musicSynth: true,
            beehive: true,
            echolocation: true,
            oratory: true,
            singing: true
          };
          console.log('[StemLab Fallback] Attempting to render plugin: ' + stemLabTool + ' (registered: ' + window.StemLab.isRegistered(stemLabTool) + ')');
          if (!_pluginOnlyTools[stemLabTool]) return null;

          // Show skeleton loader while plugin hasn't registered yet
          if (!window.StemLab.isRegistered(stemLabTool)) {
            return React.createElement("div", { className: "animate-pulse space-y-4 p-6" },
              React.createElement("div", { className: "flex items-center gap-3" },
                React.createElement("div", { className: "w-10 h-10 bg-slate-200 rounded-lg" }),
                React.createElement("div", { className: "space-y-2 flex-1" },
                  React.createElement("div", { className: "h-4 bg-slate-200 rounded w-1/3" }),
                  React.createElement("div", { className: "h-3 bg-slate-100 rounded w-1/2" })
                )
              ),
              React.createElement("div", { className: "h-48 bg-slate-100 rounded-xl" }),
              React.createElement("div", { className: "grid grid-cols-3 gap-3" },
                React.createElement("div", { className: "h-20 bg-slate-100 rounded-lg" }),
                React.createElement("div", { className: "h-20 bg-slate-100 rounded-lg" }),
                React.createElement("div", { className: "h-20 bg-slate-100 rounded-lg" })
              ),
              React.createElement("p", { className: "text-center text-xs text-slate-400", role: 'status', 'aria-live': 'polite' }, "\uD83D\uDD2C Loading " + stemLabTool + "..."),
              React.createElement("p", { className: "text-center text-[10px] text-slate-500 mt-1" }, "The tool plugin is being downloaded. This usually takes 1\u20132 seconds.")
            );
          }

          // Build context bridge: map hub-local variables to plugin ctx format
          var _ctx = {
            React: React,
            toolData: labToolData,
            setToolData: setLabToolData,
            update: function(toolId, key, val) {
              setLabToolData(function(prev) {
                var toolState = Object.assign({}, (prev && prev[toolId]) || {});
                toolState[key] = val;
                var patch = {}; patch[toolId] = toolState;
                return Object.assign({}, prev, patch);
              });
            },
            updateMulti: function(toolId, obj) {
              setLabToolData(function(prev) {
                var toolState = Object.assign({}, (prev && prev[toolId]) || {}, obj);
                var patch = {}; patch[toolId] = toolState;
                return Object.assign({}, prev, patch);
              });
            },
            setStemLabTool: setStemLabTool,
            setStemLabTab: setStemLabTab,
            stemLabTab: stemLabTab,
            stemLabTool: stemLabTool,
            toolSnapshots: toolSnapshots,
            setToolSnapshots: setToolSnapshots,
            // Wrap addToast so every plugin toast also announces to screen readers.
            // This gives all 57 STEM tools SR announcements without modifying each plugin.
            addToast: function(msg, type) {
              if (addToast) addToast(msg, type);
              // Strip emoji from message for cleaner SR output
              if (typeof announceToSR === 'function' && msg) {
                var srMsg = msg.replace(/[\u{1F000}-\u{1FFFF}]|[\u2600-\u27BF]|[\uFE00-\uFE0F]|[\u200D]/gu, '').trim();
                if (srMsg) announceToSR(srMsg);
              }
            },
            awardXP: typeof awardStemXP === 'function' ? awardStemXP : function() {},
            getXP: typeof getStemXP === 'function' ? getStemXP : function() { return 0; },
            announceToSR: typeof announceToSR === 'function' ? announceToSR : function() {},
            canvasNarrate: typeof canvasNarrate === 'function' ? canvasNarrate : function() {},
            setCanvasNarrateEnabled: typeof setCanvasNarrateEnabled === 'function' ? setCanvasNarrateEnabled : function() {},
            celebrate: typeof stemCelebrate === 'function' ? stemCelebrate : function() {},
            callGemini: typeof callGemini === 'function' ? callGemini : null,
            t: typeof t === 'function' ? t : function(k) { return k; },
            icons: { ArrowLeft: ArrowLeft, Calculator: Calculator, Sparkles: Sparkles, X: X, GripVertical: GripVertical },
            _codingCanvasRef: typeof _codingCanvasRef !== 'undefined' ? _codingCanvasRef : null,
            saveSnapshot: function(toolId, label, data) {
              if (typeof setToolSnapshots === 'function') {
                setToolSnapshots(function(prev) {
                  return (prev || []).concat([{ id: toolId + '-' + Date.now(), tool: toolId, label: label, data: data, ts: Date.now() }]);
                });
              }
            },
            renderTutorial: typeof renderTutorial === 'function' ? renderTutorial : function() { return null; },
            _tutGalaxy: typeof _tutGalaxy !== 'undefined' ? _tutGalaxy : [],
            beep: typeof stemBeep === 'function' ? stemBeep : function() {},
            callTTS: typeof callTTS === 'function' ? function stemSpeakTTS(text, voice, speed, opts) {
              // Header mute button is the master gate. Tools can pass { force: true }
              // to bypass it for explicit user-initiated speak actions.
              opts = opts || {};
              if (!opts.force && !_canvasNarrateTTSEnabled()) return Promise.resolve(null);
              return callTTS(text, voice, speed).then(function(url) {
                if (url) { var a = new Audio(url); a.play().catch(function() {}); }
                return url;
              }).catch(function(e) { console.warn('[STEM TTS]', e && e.message); return null; });
            } : null,
            callImagen: typeof callImagen === 'function' ? callImagen : null,
            callGeminiVision: typeof callGeminiVision === 'function' ? callGeminiVision : null,
            callGeminiImageEdit: typeof callGeminiImageEdit === 'function' ? callGeminiImageEdit : null,
            gradeLevel: gradeLevel || '5th Grade',
            srOnly: function(text) { return React.createElement('span', { className: 'sr-only' }, text); },
            a11yClick: function(handler) { return { onClick: handler, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(e); } }, role: 'button', tabIndex: 0 }; },
            canvasA11yDesc: function(desc) { return { role: 'img', 'aria-label': desc }; },
            props: props || {},
            // ── Live Session (for collaborative features) ──
            activeSessionCode: activeSessionCode || null,
            studentNickname: studentNickname || null,
            isTeacherMode: !!isTeacherMode,
            // ── Theme ──
            isDark: isDark,
            isContrast: isContrast,
            theme: _stemTheme,
            pal: _pal,
            // ── Shared explore state ──
            exploreScore: exploreScore || { correct: 0, total: 0 },
            setExploreScore: typeof setExploreScore === 'function' ? setExploreScore : function() {},
            exploreDifficulty: exploreDifficulty,
            setExploreDifficulty: typeof setExploreDifficulty === 'function' ? setExploreDifficulty : function() {},
            // ── Angle Explorer state ──
            angleValue: typeof angleValue !== 'undefined' ? angleValue : 45,
            setAngleValue: typeof setAngleValue === 'function' ? setAngleValue : function() {},
            angleChallenge: typeof angleChallenge !== 'undefined' ? angleChallenge : null,
            setAngleChallenge: typeof setAngleChallenge === 'function' ? setAngleChallenge : function() {},
            angleFeedback: typeof angleFeedback !== 'undefined' ? angleFeedback : null,
            setAngleFeedback: typeof setAngleFeedback === 'function' ? setAngleFeedback : function() {},
            // ── Multiplication Table state ──
            multTableAnswer: typeof multTableAnswer !== 'undefined' ? multTableAnswer : '',
            setMultTableAnswer: typeof setMultTableAnswer === 'function' ? setMultTableAnswer : function() {},
            multTableChallenge: typeof multTableChallenge !== 'undefined' ? multTableChallenge : null,
            setMultTableChallenge: typeof setMultTableChallenge === 'function' ? setMultTableChallenge : function() {},
            multTableFeedback: typeof multTableFeedback !== 'undefined' ? multTableFeedback : null,
            setMultTableFeedback: typeof setMultTableFeedback === 'function' ? setMultTableFeedback : function() {},
            multTableHidden: typeof multTableHidden !== 'undefined' ? multTableHidden : false,
            setMultTableHidden: typeof setMultTableHidden === 'function' ? setMultTableHidden : function() {},
            multTableHover: typeof multTableHover !== 'undefined' ? multTableHover : null,
            setMultTableHover: typeof setMultTableHover === 'function' ? setMultTableHover : function() {},
            multTableRevealed: typeof multTableRevealed !== 'undefined' ? multTableRevealed : new Set(),
            setMultTableRevealed: typeof setMultTableRevealed === 'function' ? setMultTableRevealed : function() {},
            // ── Shared labToolData ──
            labToolData: labToolData || {},
            setLabToolData: function(updater) {
              if (typeof setLabToolData === 'function') {
                if (_ctx._isRendering) setTimeout(function() { setLabToolData(updater); }, 0);
                else setLabToolData(updater);
              }
            }
          };

          try {
            // Wrap plugin render in a stable React component so hooks work correctly.
            // We cache the component function per tool ID so React sees the same type
            // across re-renders (preventing unmount/remount loops).
            if (!window.__stemPluginComponents) window.__stemPluginComponents = {};
            if (!window.__stemPluginComponents[stemLabTool]) {
              window.__stemPluginComponents[stemLabTool] = function StemPluginBridge(props) {
                return window.StemLab.renderTool(props._toolId, props._ctx);
              };
            }
            // Note: deferred setState bridge was removed — it caused blank renders in some tools.
            // The React warning "Cannot update a component while rendering" is cosmetic and non-breaking.
            if (false) {
              window.__stemPluginComponents['__unused'] = function(props) {
                var c = props._ctx;
                var pendingUpdates = React.useRef([]);
                var renderingRef = React.useRef(false);
                var originalUpdate = c.update;
                var originalUpdateMulti = c.updateMulti;
                var originalAwardXP = c.awardXP;
                var originalAddToast = c.addToast;
                var wrappedCtx = Object.assign({}, c, {
                  update: function(toolId, key, val) {
                    if (renderingRef.current) {
                      pendingUpdates.current.push({ type: 'single', toolId: toolId, key: key, val: val });
                    } else {
                      originalUpdate(toolId, key, val);
                    }
                  },
                  updateMulti: function(toolId, obj) {
                    if (renderingRef.current) {
                      pendingUpdates.current.push({ type: 'multi', toolId: toolId, obj: obj });
                    } else {
                      originalUpdateMulti(toolId, obj);
                    }
                  },
                  awardXP: function(activityId, pts, reason) {
                    if (renderingRef.current) {
                      pendingUpdates.current.push({ type: 'xp', activityId: activityId, pts: pts, reason: reason });
                    } else {
                      originalAwardXP(activityId, pts, reason);
                    }
                  },
                  addToast: function(msg, type) {
                    if (renderingRef.current) {
                      pendingUpdates.current.push({ type: 'toast', msg: msg, toastType: type });
                    } else {
                      originalAddToast(msg, type);
                    }
                  }
                });
                React.useEffect(function() {
                  if (pendingUpdates.current.length > 0) {
                    var batch = pendingUpdates.current.slice();
                    pendingUpdates.current = [];
                    batch.forEach(function(u) {
                      if (u.type === 'multi') originalUpdateMulti(u.toolId, u.obj);
                      else if (u.type === 'xp') originalAwardXP(u.activityId, u.pts, u.reason);
                      else if (u.type === 'toast') originalAddToast(u.msg, u.toastType);
                      else originalUpdate(u.toolId, u.key, u.val);
                    });
                  }
                });
                renderingRef.current = true;
                try {
                  return window.StemLab.renderTool(props._toolId, wrappedCtx);
                } finally {
                  renderingRef.current = false;
                }
              };
            }
            return React.createElement(window.__stemPluginComponents[stemLabTool], { key: 'plugin-' + stemLabTool, _toolId: stemLabTool, _ctx: _ctx });
          } catch(e) {
            console.error('[StemLab] Plugin fallback error for ' + stemLabTool, e);
            return React.createElement('div', { style: { padding: 40, textAlign: 'center', color: '#ef4444' } },
              React.createElement('p', { style: { fontSize: 32, marginBottom: 12 } }, '⚠️'),
              React.createElement('p', { style: { fontWeight: 700, marginBottom: 8 } }, 'Error loading ' + stemLabTool),
              React.createElement('p', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 16 } }, e.message || 'Unknown error'),
              React.createElement('button', {
                onClick: function() { setStemLabTool(null); },
                style: { padding: '8px 20px', borderRadius: 8, background: '#3b82f6', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }
              }, '← Back to Tools')
            );
          }
        })()
      ));
    };
  }
})();
