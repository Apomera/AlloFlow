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
        callGeminiVision
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

      // ── Inject XP CSS Keyframes ──
      React.useEffect(function () {
        if (document.getElementById('stem-xp-keyframes')) return;
        var s = document.createElement('style');
        s.id = 'stem-xp-keyframes';
        s.textContent = [
          '@keyframes stemXpShimmer { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }',
          '@keyframes stemXpBadgePulse { 0% { transform: scale(1); } 40% { transform: scale(1.18); } 100% { transform: scale(1); } }',
          '@keyframes stemXpFloat { 0% { opacity: 1; transform: translateX(-50%) translateY(0); } 100% { opacity: 0; transform: translateX(-50%) translateY(-38px); } }'
        ].join('\n');
        document.head.appendChild(s);
        return function () { var el = document.getElementById('stem-xp-keyframes'); if (el) el.remove(); };
      }, []);

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
        return React.createElement("button", {
          onClick: function () {
            setStemAILoading(true);
            stemAIHint(toolName, question, wrongAnswer, correctAnswer, function (hint) {
              setStemAILoading(false);
              setStemAIResponse({ tool: toolName, concept: 'hint', text: hint });
            });
          },
          disabled: stemAILoading,
          className: "flex items-center gap-1 px-2.5 py-1 mt-1 text-[10px] font-bold rounded-full transition-all " +
            (stemAILoading ? "bg-slate-100 text-slate-400 cursor-wait" : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200")
        }, stemAILoading ? "⏳" : "💡", " ", t('stem.ai.get_hint') || "Get a Hint");
      }

      // ── Theme Detection (reads DOM class from parent app) ──
      var _stemTheme = 'light';
      try {
        if (document.querySelector('.theme-dark')) _stemTheme = 'dark';
        else if (document.querySelector('.theme-contrast')) _stemTheme = 'contrast';
      } catch (e) { }
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
        if (stemLabTab !== 'explore' || (stemLabTool !== 'geoSandbox' && stemLabTool !== 'archStudio')) return;
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
              React.createElement("button", { onClick: function () { markTutorialSeen(toolId); setLabToolData(function (p) { return Object.assign({}, p, { _tutorialStep: 0 }); }); }, className: "px-2 py-1 text-[10px]", style: _tutSkip }, "Skip"),
              React.createElement("button", { onClick: function () { setLabToolData(function (p) { return Object.assign({}, p, { _tutorialStep: (p._tutorialStep || 0) + 1 }); }); }, className: "px-3 py-1 text-[10px] font-bold rounded-lg", style: _tutBtn }, step < steps.length - 1 ? "Next \u2192" : "Got it! \u2705")
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
        "data-stem-lab": "true", role: "dialog", "aria-label": "STEM Lab",
        className: "fixed inset-0 z-[9999] flex items-stretch justify-center" + (_reduceMotion ? " reduce-motion" : ""),
        style: {
          background: 'rgba(15,23,42,0.7)',
          backdropFilter: 'blur(6px)'
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "w-full max-w-[98vw] m-2 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden overflow-y-auto stemlab-styled-scrollbar" + (_reduceMotion ? "" : " animate-in zoom-in-95 duration-300")
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center justify-between px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white", role: "banner"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-3"
      }, React.createElement("div", {
        className: "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black relative",
        style: {
          background: 'linear-gradient(135deg, #f59e0b, #eab308, #f59e0b)',
          backgroundSize: '200% 200%',
          animation: _xpBadgePulse ? 'stemXpBadgePulse 0.6s ease-out' : 'stemXpShimmer 3s ease-in-out infinite',
          boxShadow: _xpBadgePulse ? '0 0 16px rgba(245,158,11,0.6), 0 0 4px rgba(245,158,11,0.3)' : '0 2px 8px rgba(0,0,0,0.2)',
          color: '#1e293b',
          transition: 'box-shadow 0.3s ease'
        },
        title: t('stem.solver.total_stem_lab_xp_earned')
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
          className: "hidden md:flex items-center gap-1 bg-white/10 backdrop-blur rounded-full px-2.5 py-1 text-[9px] font-medium text-white/70",
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
        }, /*#__PURE__*/React.createElement("select", {
          value: mathSubject,
          onChange: e => setMathSubject(e.target.value),
          className: "px-3 py-1.5 text-xs font-medium bg-white/15 border border-white/25 rounded-lg text-white outline-none",
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
          onClick: () => setShowStemLab(false),
          className: "p-1.5 hover:bg-white/20 rounded-lg transition-colors",
          "aria-label": "Close STEM Lab"
        }, /*#__PURE__*/React.createElement(X, {
          size: 20
        })))), /*#__PURE__*/React.createElement("div", {
          className: "flex border-b border-slate-200 bg-slate-50 px-6", role: "tablist", "aria-label": "STEM Lab navigation"
        }, [{
          id: 'create',
          label: '\uD83D\uDCDD Create',
          desc: t('stem.solver.generate_assess')
        }, {
          id: 'explore',
          label: '\uD83D\uDD27 Explore',
          desc: t('stem.solver.manipulatives')
        }].map(tab => /*#__PURE__*/React.createElement("button", {
          key: tab.id, role: "tab", "aria-selected": stemLabTab === tab.id,
          onClick: () => {
            setStemLabTab(tab.id);
            setStemLabTool(null);
          },
          className: `flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${stemLabTab === tab.id ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`
        }, /*#__PURE__*/React.createElement("span", null, tab.label), /*#__PURE__*/React.createElement("span", {
          className: `text-[10px] font-normal ${stemLabTab === tab.id ? 'text-indigo-400' : 'text-slate-400'}`
        }, tab.desc)))), /*#__PURE__*/React.createElement("div", {
          className: "flex-1 overflow-y-auto p-6"
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
        }].map(m => /*#__PURE__*/React.createElement("button", {
          key: m.id,
          onClick: () => setStemLabCreateMode(m.id),
          className: `px-4 py-2 rounded-xl text-sm font-bold transition-all ${stemLabCreateMode === m.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'}`
        }, m.label)), /*#__PURE__*/React.createElement("div", {
          className: "flex-1"
        }), /*#__PURE__*/React.createElement("button", {
          onClick: () => setShowAssessmentBuilder(true),
          className: "px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-purple-200 hover:from-violet-600 hover:to-purple-600 transition-all flex items-center gap-2"
        }, "\uD83D\uDCCB Build Assessment")), stemLabCreateMode !== 'solve' && /*#__PURE__*/React.createElement("div", {
          className: "flex items-center gap-4"
        }, /*#__PURE__*/React.createElement("span", {
          className: "text-xs font-bold text-slate-400 uppercase"
        }, "Style:"), [{
          val: t('stem.solver.stepbystep'),
          label: t('stem.solver.stepbystep')
        }, {
          val: t('stem.solver.conceptual'),
          label: t('stem.solver.conceptual')
        }, {
          val: 'Real-World Application',
          label: t('stem.solver.realworld')
        }].map(s => /*#__PURE__*/React.createElement("button", {
          key: s.val,
          onClick: () => setMathMode(s.val),
          className: `px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mathMode === s.val ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-200'}`
        }, s.label))), /*#__PURE__*/React.createElement("div", {
          className: "bg-slate-50 rounded-xl p-4 border border-slate-200"
        }, /*#__PURE__*/React.createElement("textarea", {
          value: mathInput,
          onChange: e => setMathInput(e.target.value),
          placeholder: stemLabCreateMode === 'solve' ? 'Enter a math problem to solve step-by-step...' : stemLabCreateMode === 'content' ? 'Paste or describe content to generate math problems from...' : 'Enter topic, standard, or description (e.g. "3rd grade multiplication word problems")...',
          className: "w-full h-28 px-4 py-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none resize-none bg-white",
          "aria-label": "Math problem input"
        }), stemLabCreateMode !== 'solve' && /*#__PURE__*/React.createElement("div", {
          className: "flex items-center gap-4 mt-3"
        }, /*#__PURE__*/React.createElement("span", {
          className: "text-xs font-bold text-slate-400"
        }, "Quantity:"), /*#__PURE__*/React.createElement("input", {
          type: "range",
          min: "1",
          max: "20",
          value: mathQuantity,
          onChange: e => setMathQuantity(parseInt(e.target.value)),
          className: "flex-1 h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        }), /*#__PURE__*/React.createElement("span", {
          className: "text-sm font-bold text-indigo-700 w-8 text-center"
        }, mathQuantity))), /*#__PURE__*/React.createElement("button", {
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
        }].map(tool => /*#__PURE__*/React.createElement("button", {
          key: tool.id,
          onClick: () => {
            setStemLabTab('explore');
            setStemLabTool(tool.id);
          },
          className: "px-2 py-1 text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center gap-1"
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
          className: "text-xs text-slate-400"
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
          className: "text-slate-300 cursor-grab active:cursor-grabbing pt-1 group-hover:text-slate-500"
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
          className: "px-3 py-1.5 text-sm font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none",
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
          className: "text-xs text-slate-400"
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
          className: "w-14 px-2 py-1.5 text-sm font-mono border border-slate-200 rounded-lg text-center",
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
          className: "p-1 text-slate-300 hover:text-red-500 transition-colors",
          "aria-label": "Remove block"
        }, /*#__PURE__*/React.createElement(X, {
          size: 14
        }))))), /*#__PURE__*/React.createElement("button", {
          onClick: () => setAssessmentBlocks([...assessmentBlocks, {
            id: 'b-' + Date.now(),
            type: 'computation',
            quantity: 5,
            directive: ''
          }]),
          className: "w-full py-2.5 border-2 border-dashed border-slate-300 text-slate-400 font-bold text-sm rounded-xl hover:border-indigo-400 hover:text-indigo-500 transition-all"
        }, "+ Add Block"), assessmentBlocks.length > 0 && /*#__PURE__*/React.createElement("div", {
          className: "flex gap-3 pt-2"
        }, /*#__PURE__*/React.createElement("button", {
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
        }), " Generate All (", assessmentBlocks.reduce((s, b) => s + b.quantity, 0), " problems)"), /*#__PURE__*/React.createElement("button", {
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
        }, "\uD83D\uDCBE Save to Resources"), React.createElement("div", { className: "mt-4 rounded-xl border border-amber-200 p-4", style: { background: 'linear-gradient(135deg, #fffbeb, #fef3c7, #fffbeb)' } },
          React.createElement("div", { className: "flex items-center gap-2 mb-3" },
            React.createElement("span", { style: { fontSize: '20px', filter: 'drop-shadow(0 0 4px rgba(255,200,0,0.7))' } }, "\u2B50"),
            React.createElement("h4", { className: "text-sm font-black text-amber-800" }, "STEM Lab XP Progress"),
            React.createElement("span", { className: "ml-auto text-xs font-black text-amber-700 px-2.5 py-1 rounded-full", style: { background: 'linear-gradient(135deg, #f59e0b, #eab308)', color: '#1e293b', boxShadow: '0 2px 6px rgba(245,158,11,0.3)' } }, totalStemXP + " Total XP")
          ),
          // Total progress bar
          (function () {
            var _xpActivities = [
              { id: 'behaviorLab', label: 'Behavior Lab', icon: '\uD83D\uDC2D' },
              { id: 'aquarium', label: 'Aquarium', icon: '\uD83D\uDC20' },
              { id: 'ocean', label: 'Ocean', icon: '\uD83D\uDC0B' },
              { id: 'wave-match', label: 'Waves', icon: '\uD83C\uDF0A' },
              { id: 'wave-quiz', label: 'Wave Quiz', icon: '\uD83C\uDFB6' },
              { id: 'galaxy_quiz', label: 'Galaxy', icon: '\uD83C\uDF0C' },
              { id: 'galaxy_explore', label: 'Discovery', icon: '\u2B50' },
              { id: 'universe_explore', label: 'Universe', icon: '\uD83C\uDF20' },
              { id: 'solarSystem', label: 'Solar System', icon: '\u2600\uFE0F' },
              { id: 'physicsQuiz', label: 'Physics', icon: '\uD83C\uDFAF' },
              { id: 'chemBalance', label: 'Chemistry', icon: '\uD83E\uDDEA' },
              { id: 'circuit', label: 'Circuits', icon: '\u26A1' },
              { id: 'calculus', label: 'Calculus', icon: '\u222B' },
              { id: 'inequality', label: 'Inequalities', icon: '\u2696\uFE0F' },
              { id: 'molecule', label: 'Molecules', icon: '\uD83E\uDDEC' },
              { id: 'codingPlayground', label: 'Coding', icon: '\uD83D\uDCBB' },
              { id: 'algebraCAS', label: 'Algebra', icon: '\uD83D\uDCD0' },
              { id: 'dissection', label: 'Dissection', icon: '\uD83D\uDD2C' },
              { id: 'fractionChallenge', label: 'Fractions', icon: '\uD83D\uDD22' },
              { id: 'companion_planting_corn', label: 'Three Sisters', icon: '\uD83C\uDF3D' },
              { id: 'companion_planting_beans', label: 'Bean Planting', icon: '\uD83E\uDED8' },
              { id: 'companion_planting_squash', label: 'Squash', icon: '\uD83C\uDF83' },
              { id: 'companion_planting_grow', label: 'Growing', icon: '\uD83C\uDF31' },
              { id: 'companion_planting_harvest', label: 'Harvest', icon: '\uD83C\uDF3E' },
              { id: 'companion_planting_quiz', label: 'Garden Quiz', icon: '\uD83D\uDCDD' },
              { id: 'cyberDefense', label: 'Cyber Defense', icon: '\uD83D\uDEE1\uFE0F' }
            ];
            var _maxXP = _xpActivities.length * 100;
            var _totalPct = _maxXP > 0 ? Math.min(100, (totalStemXP / _maxXP) * 100) : 0;
            return React.createElement(React.Fragment, null,
              // Total progress bar
              React.createElement("div", { className: "mb-3" },
                React.createElement("div", { className: "flex justify-between items-center mb-1" },
                  React.createElement("span", { className: "text-[10px] font-bold text-amber-700 uppercase" }, "Overall Progress"),
                  React.createElement("span", { className: "text-[10px] font-black text-amber-600" }, totalStemXP + " / " + _maxXP + " XP (" + Math.round(_totalPct) + "%)")  
                ),
                React.createElement("div", { className: "w-full h-3 bg-amber-100 rounded-full overflow-hidden", style: { boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' } },
                  React.createElement("div", { className: "h-full rounded-full transition-all duration-700", style: {
                    width: _totalPct + '%',
                    background: _totalPct >= 100 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #f59e0b, #eab308, #f59e0b)',
                    backgroundSize: '200% 100%',
                    animation: 'stemXpShimmer 2s ease-in-out infinite',
                    boxShadow: '0 0 8px rgba(245,158,11,0.4)'
                  } })
                )
              ),
              // Activity grid
              React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-[10px]" },
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
                      isMaxed && React.createElement("span", { style: { color: '#059669', fontWeight: 900, fontSize: '9px' } }, "\u2714 MAX")
                    )
                  );
                })
              )
            );
          })()
        ),
          toolSnapshots.length > 0 && /*#__PURE__*/React.createElement("div", {
            className: "mt-4 pt-4 border-t border-slate-200"
          }, /*#__PURE__*/React.createElement("div", {
            className: "flex items-center gap-2 mb-3"
          }, /*#__PURE__*/React.createElement("h4", {
            className: "text-sm font-bold text-slate-700"
          }, "\uD83D\uDCF8 Tool Snapshots (", toolSnapshots.length, ")"), /*#__PURE__*/React.createElement("button", {
            onClick: () => setToolSnapshots([]),
            className: "text-[10px] text-slate-400 hover:text-red-500 transition-colors"
          }, "\u21BA Clear all")), /*#__PURE__*/React.createElement("div", {
            className: "grid grid-cols-2 gap-2"
          }, toolSnapshots.map((snap, si) => /*#__PURE__*/React.createElement("div", {
            key: snap.id,
            className: "bg-white rounded-lg p-2.5 border border-slate-200 hover:border-indigo-300 transition-all group"
          }, /*#__PURE__*/React.createElement("div", {
            className: "flex items-center gap-2"
          }, /*#__PURE__*/React.createElement("span", {
            className: "text-sm"
          }, snap.tool === 'volume' ? '📦' : snap.tool === 'base10' ? '🧮' : snap.tool === 'coordinate' ? '📍' : '📐'), /*#__PURE__*/React.createElement("span", {
            className: "text-xs font-bold text-slate-700 flex-1 truncate"
          }, snap.label), /*#__PURE__*/React.createElement("button", {
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
          }, "\u21A9 Load"), /*#__PURE__*/React.createElement("button", {
            onClick: () => setToolSnapshots(prev => prev.filter((_, idx) => idx !== si)),
            className: "text-slate-300 hover:text-red-500 transition-colors"
          }, /*#__PURE__*/React.createElement(X, {
            size: 12
          }))), /*#__PURE__*/React.createElement("div", {
            className: "text-[10px] text-slate-400 mt-1"
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
                id: 'companionPlanting', icon: '🌱', label: 'Companion Planting Lab',
                desc: 'Explore the ancient milpa / Three Sisters system — corn, beans, and squash growing in symbiosis. Soil chemistry, nitrogen cycles, and 7,000 years of agricultural science.',
                color: 'emerald', ready: true
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
                id: 'lifeSkills', icon: '\uD83E\uDDED', label: 'Life Skills Lab',
                desc: 'Tax & paycheck calculator, data literacy, decision matrix, contract reader, health insurance navigator, and applied science for daily life.',
                color: 'cyan', ready: true
              },

              { id: '_cat_Strategy', icon: '', label: '⚔️ Strategy Games', desc: '', color: 'slate', category: true },
              { id: 'spaceColony', label: 'Kepler Colony', icon: '\uD83D\uDE80', desc: 'Colonize an alien planet! Turn-based cooperative strategy where mastering science unlocks colony survival.', color: 'indigo', ready: true },
              { id: 'gameStudio', icon: '🎮', label: 'Game Studio', desc: 'Design, build, and test your own games with a visual coding interface.', color: 'purple', ready: true },

              { id: '_cat_Biology', icon: '', label: '🧬 Biology & Life Science', desc: '', color: 'slate', category: true },
              { id: 'dnaLab', icon: '🧬', label: 'DNA Lab', desc: 'Extract, sequence, and analyze DNA. Explore genetics through interactive experiments.', color: 'emerald', ready: true },

              { id: '_cat_Geography', icon: '', label: '🌍 Geography & Earth Science', desc: '', color: 'slate', category: true },
              { id: 'geoQuiz', icon: '🗺️', label: 'Geography Quiz', desc: 'Test your world geography knowledge with interactive maps, flags, and capitals.', color: 'sky', ready: true },
              { id: 'plateTectonics', icon: '🌋', label: 'Plate Tectonics', desc: 'Explore tectonic plates, earthquakes, volcanoes, and continental drift.', color: 'orange', ready: true },

              { id: '_cat_AdvancedMathLogic', icon: '', label: '📐 Advanced Math', desc: '', color: 'slate', category: true },
              { id: 'geometryProver', icon: '📐', label: 'Geometry Prover', desc: 'Construct geometric proofs step-by-step with interactive diagrams.', color: 'violet', ready: true },
              { id: 'logicLab', icon: '🧩', label: 'Logic Lab', desc: 'Logic gates, truth tables, and Boolean algebra puzzles.', color: 'indigo', ready: true }
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
            var _cardIndex = 0;
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
              className: "w-full px-4 py-2.5 pl-10 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-all",
              'aria-label': 'Search STEM Lab tools'
            }),
            /*#__PURE__*/React.createElement("span", { className: "absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" }, "\uD83D\uDD0D"),
              _stemToolSearch && /*#__PURE__*/React.createElement("button", {
                onClick: function () { _setStemToolSearch(''); },
                className: "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold transition-colors",
                'aria-label': 'Clear search'
              }, "\u2715")
            ),
          // Tool grid
          /*#__PURE__*/React.createElement("div", {
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
              return /*#__PURE__*/React.createElement("button", {
                key: tool.id,
                onClick: function () { if (tool.ready === false) { if (addToast) addToast(tool.label + ' is coming soon!', 'info'); return; } setStemLabTool(tool.id); _setStemToolSearch(''); },
                className: 'p-5 rounded-2xl border-2 text-left transition-all duration-200 hover:scale-[1.04] hover:-translate-y-0.5 hover:shadow-xl ' + _cm.bg + ' ' + _cm.border + ' ' + _cm.hoverBorder,
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
            /*#__PURE__*/React.createElement("button", {
                onClick: function () { _setStemToolSearch(''); },
                className: "mt-2 text-xs text-indigo-500 hover:text-indigo-700 font-bold transition-colors"
              }, "Clear search")
              ));
          })()),
        /* base10: removed -- see stem_tool_manipulatives.js */
        /* moneyMath: removed -- see stem_tool_money.js */
        stemLabTab === 'explore' && stemLabTool === 'lifeSkills' && (function () {
            // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            //  ðŸ§­ L I F E   S K I L L S   L A B
            // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

            var upd = function (k, v) { setStemState(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); };

            // â”€â”€ Sub-tab nav â”€â”€
            var tab = stemState.lsTab || 'paycheck';

            // â”€â”€â”€â”€â”€â”€ TAB 1: PAYCHECK & TAX â”€â”€â”€â”€â”€â”€
            var payRate = stemState.payRate || 15;
            var payHours = stemState.payHours || 30;
            var payFreq = stemState.payFreq || 'biweekly';
            var payState = stemState.payState || 'none';
            var payFiling = stemState.payFiling || 'single';

            var freqMult = { weekly: 52, biweekly: 26, monthly: 12 }[payFreq] || 26;
            var grossPer = payRate * payHours * (payFreq === 'biweekly' ? 2 : payFreq === 'monthly' ? (52 / 12) : 1);
            var grossAnnual = payRate * payHours * 52;

            // 2024 federal brackets simplified
            var fedBrackets = payFiling === 'single' ?
              [{ limit: 11600, rate: 0.10 }, { limit: 47150, rate: 0.12 }, { limit: 100525, rate: 0.22 }, { limit: 191950, rate: 0.24 }, { limit: 243725, rate: 0.32 }, { limit: 609350, rate: 0.35 }, { limit: Infinity, rate: 0.37 }] :
              [{ limit: 23200, rate: 0.10 }, { limit: 94300, rate: 0.12 }, { limit: 201050, rate: 0.22 }, { limit: 383900, rate: 0.24 }, { limit: 487450, rate: 0.32 }, { limit: 731200, rate: 0.35 }, { limit: Infinity, rate: 0.37 }];

            var fedTax = 0; var remaining = grossAnnual; var prev = 0;
            var bracketBreakdown = [];
            for (var bi = 0; bi < fedBrackets.length && remaining > 0; bi++) {
              var taxable = Math.min(remaining, fedBrackets[bi].limit - prev);
              var tax = taxable * fedBrackets[bi].rate;
              fedTax += tax;
              if (taxable > 0) bracketBreakdown.push({ rate: Math.round(fedBrackets[bi].rate * 100), amount: taxable, tax: tax });
              remaining -= taxable;
              prev = fedBrackets[bi].limit;
            }

            // FICA (Social Security 6.2% up to $168,600 + Medicare 1.45%)
            var ssTax = Math.min(grossAnnual, 168600) * 0.062;
            var medicareTax = grossAnnual * 0.0145;
            var ficaTotal = ssTax + medicareTax;

            // State taxes (simplified flat rates for common states)
            var stateTaxRates = { none: 0, CA: 0.055, NY: 0.055, TX: 0, FL: 0, WA: 0, IL: 0.0495, PA: 0.0307, OH: 0.035, ME: 0.055, MA: 0.05, NJ: 0.04 };
            var stateTax = grossAnnual * (stateTaxRates[payState] || 0);

            var totalTax = fedTax + ficaTotal + stateTax;
            var netAnnual = grossAnnual - totalTax;
            var netPer = netAnnual / freqMult;
            var effectiveRate = grossAnnual > 0 ? (totalTax / grossAnnual * 100) : 0;

            // â”€â”€â”€â”€â”€â”€ TAB 2: DATA LITERACY â”€â”€â”€â”€â”€â”€
            var dlScenario = stemState.dlScenario || 0;
            var dlAnswer = stemState.dlAnswer || null;
            var dlRevealed = stemState.dlRevealed || false;
            var dlScore = stemState.dlScore || 0;

            var dlScenarios = [
              {
                title: 'The Misleading Y-Axis',
                desc: 'A news site shows a bar chart of crime rates. The Y-axis starts at 950 instead of 0, making a 2% increase look like a 50% jump.',
                question: 'What technique makes this graph misleading?',
                options: ['Truncated Y-axis', 'Cherry-picked data', 'Correlation not causation', '3D distortion'],
                correct: 0,
                explain: 'Starting the Y-axis at a non-zero value (truncation) exaggerates small differences. Always check where the axis starts!'
              },
              {
                title: 'Ice Cream & Drowning',
                desc: 'A study shows that ice cream sales and drowning deaths both increase in summer. Someone concludes: "Ice cream causes drowning!"',
                question: 'What logical fallacy is this?',
                options: ['Cherry-picked data', 'Survivorship bias', 'Correlation \u2260 causation', 'Appeal to authority'],
                correct: 2,
                explain: 'Both are caused by a third variable: hot weather. Correlation (two things happening together) does not mean one causes the other.'
              },
              {
                title: 'The Vanishing Baseline',
                desc: 'A company shows revenue "doubled" from $1M to $2M between 2023-2024. They omit that revenue was $3M in 2022 and crashed.',
                question: 'What technique is being used?',
                options: ['Truncated axis', 'Cherry-picked time range', 'Misleading percentage', 'Survivorship bias'],
                correct: 1,
                explain: 'By choosing a specific start date (after a crash), they hide the bigger picture. Always ask: what does the FULL timeline look like?'
              },
              {
                title: 'The Percentage Trick',
                desc: '"Our supplement reduced colds by 50%!" Actual data: 4 out of 100 people got colds in placebo group, vs 2 out of 100 in supplement group.',
                question: 'Why is "50% reduction" misleading here?',
                options: ['Small sample size', 'Relative vs absolute risk', 'P-hacking', 'Publication bias'],
                correct: 1,
                explain: 'The RELATIVE reduction is 50% (4\u21922), but the ABSOLUTE reduction is only 2 percentage points (4%\u21922%). Always check absolute numbers!'
              },
              {
                title: 'Survivor CEOs',
                desc: 'An article profiles 10 billionaire CEOs who dropped out of college and concludes: "College is unnecessary for success!"',
                question: 'What bias is at play?',
                options: ['Confirmation bias', 'Survivorship bias', 'Anchoring', 'False dichotomy'],
                correct: 1,
                explain: 'We only hear about the rare successes \u2014 not the millions who dropped out and didn\'t become billionaires. This is survivorship bias.'
              },
              {
                title: '3D Pie Distortion',
                desc: 'A 3D pie chart shows market share. The front slice (30%) appears larger than the back slice (35%) due to perspective.',
                question: 'What makes this visualization misleading?',
                options: ['Wrong data', '3D perspective distortion', 'Missing labels', 'Wrong chart type'],
                correct: 1,
                explain: '3D effects distort the perceived size of slices. Front slices look bigger, back slices look smaller. Flat 2D charts are always more accurate.'
              }
            ];
            var dlCurrent = dlScenarios[dlScenario % dlScenarios.length];

            // â”€â”€â”€â”€â”€â”€ TAB 3: DECISION MATRIX â”€â”€â”€â”€â”€â”€
            var dmOptions = stemState.dmOptions || ['Option A', 'Option B', 'Option C'];
            var dmCriteria = stemState.dmCriteria || [
              { name: 'Cost', weight: 3 },
              { name: 'Quality', weight: 4 },
              { name: t('stem.dissection.time_label'), weight: 2 }
            ];
            var dmScores = stemState.dmScores || {};

            // Compute weighted totals
            var dmTotals = dmOptions.map(function (opt, oi) {
              var total = 0;
              dmCriteria.forEach(function (c, ci) {
                var key = oi + '-' + ci;
                var score = (dmScores[key] || 3);
                total += score * c.weight;
              });
              return { option: opt, total: total, index: oi };
            });
            var dmMaxTotal = Math.max.apply(null, dmTotals.map(function (d) { return d.total; }));
            dmTotals.sort(function (a, b) { return b.total - a.total; });

            // â”€â”€â”€â”€â”€â”€ TAB 4: CONTRACT READER â”€â”€â”€â”€â”€â”€
            var crLevel = stemState.crLevel || 0;
            var crFound = stemState.crFound || [];
            var crRevealed = stemState.crRevealed || false;

            var crContracts = [
              {
                title: '\uD83D\uDCF1 Phone Plan Agreement',
                text: 'Monthly service: $45/month for unlimited talk & text with 5GB data. After 5GB, speeds reduced to 128kbps. Contract length: 24 months. Early termination fee: $200 per remaining month. Device payment: $0 down, $35/month for 24 months (retail value: $799). Activation fee: $35 (one-time). Taxes and regulatory fees apply (estimated $7-12/month).',
                traps: [
                  { id: 'term', hint: 'Early termination fee', explain: '$200 PER REMAINING MONTH. If you cancel after 6 months, that\'s $200 \u00D7 18 = $3,600!' },
                  { id: 'data', hint: 'Data throttling', explain: '"Unlimited" data but after 5GB, 128kbps is basically unusable. That\'s NOT truly unlimited.' },
                  { id: 'device', hint: 'Device total cost', explain: '$35/month \u00D7 24 = $840 for a phone worth $799. You\'re paying $41 in hidden interest.' },
                  { id: 'fees', hint: 'Hidden monthly fees', explain: 'The "$45/month" plan actually costs $87-92/month when you add device + taxes + fees.' }
                ]
              },
              {
                title: '\uD83C\uDFE0 Apartment Lease',
                text: 'Monthly rent: $1,200. Security deposit: $1,200 (non-refundable cleaning fee of $250 deducted upon move-out). Lease term: 12 months, auto-renews at market rate. Late fee: $50 + $10/day after 5th of month. Tenant responsible for all repairs under $100. Pet deposit: $300 + $50/month pet rent. Landlord may enter with 24-hour notice for "maintenance and inspections."',
                traps: [
                  { id: 'deposit', hint: 'Non-refundable portion', explain: '$250 "cleaning fee" is automatically deducted \u2014 you\'ll never get your full deposit back.' },
                  { id: 'renew', hint: 'Auto-renewal clause', explain: 'Auto-renews at "market rate" \u2014 could be a huge increase with no cap.' },
                  { id: 'late', hint: 'Escalating late fee', explain: '$50 + $10/day means being 15 days late = $150 penalty.' },
                  { id: 'repairs', hint: 'Repair responsibility', explain: 'Under $100 repairs on YOU means clogged drains, broken blinds, etc. come out of your pocket.' }
                ]
              },
              {
                title: '\uD83C\uDFCB\uFE0F Gym Membership',
                text: 'Monthly fee: $29.99. Annual maintenance fee: $49.99 (charged in February). Enrollment fee: $0 (limited time!). Cancellation requires 30-day written notice sent by certified mail. Personal training sessions: first free, then auto-enrolled at $60/session, 2x/week. Membership may be transferred to collections after 60 days overdue. "Freeze" fee: $10/month.',
                traps: [
                  { id: 'annual', hint: 'Hidden annual fee', explain: '$49.99 "maintenance fee" on top of monthly \u2014 your real cost is $34.16/month.' },
                  { id: 'cancel', hint: 'Cancellation difficulty', explain: 'CERTIFIED MAIL only? Most gyms make cancellation intentionally difficult.' },
                  { id: 'training', hint: 'Auto-enrollment', explain: 'After one "free" session, you\'re auto-enrolled at $120/WEEK ($480/month!) in training.' },
                  { id: 'freeze', hint: 'Freeze still costs money', explain: 'Even "pausing" costs $10/month. You\'re still paying for something you don\'t use.' }
                ]
              }
            ];
            var crCurrent = crContracts[crLevel % crContracts.length];

            // â”€â”€â”€â”€â”€â”€ TAB 5: HEALTH INSURANCE â”€â”€â”€â”€â”€â”€
            var hiPlanA = stemState.hiPlanA || { premium: 250, deductible: 1500, copay: 30, coinsurance: 20, oop: 6000 };
            var hiPlanB = stemState.hiPlanB || { premium: 450, deductible: 500, copay: 15, coinsurance: 10, oop: 3000 };
            var hiUsage = stemState.hiUsage || 'low'; // low, medium, high

            var usageScenarios = { low: { visits: 2, bills: 500 }, medium: { visits: 6, bills: 3000 }, high: { visits: 12, bills: 15000 } };
            var hiScene = usageScenarios[hiUsage];

            var calcPlanCost = function (plan, scene) {
              var annualPremium = plan.premium * 12;
              var totalBills = scene.bills + scene.visits * 150; // $150 per visit avg
              var afterDeductible = Math.max(0, totalBills - plan.deductible);
              var yourCoinsurance = afterDeductible * (plan.coinsurance / 100);
              var copays = scene.visits * plan.copay;
              var outOfPocket = Math.min(plan.oop, plan.deductible + yourCoinsurance + copays);
              return { annualPremium: annualPremium, outOfPocket: outOfPocket, total: annualPremium + outOfPocket };
            };
            var hiCostA = calcPlanCost(hiPlanA, hiScene);
            var hiCostB = calcPlanCost(hiPlanB, hiScene);
            var hiBetter = hiCostA.total < hiCostB.total ? 'A' : 'B';

            // â”€â”€â”€â”€â”€â”€ TAB 6: APPLIED SCIENCE â”€â”€â”€â”€â”€â”€
            var asTab = stemState.asTab || 'tire';

            // Tire pressure: PV = nRT (Gay-Lussac's Law for constant volume: P1/T1 = P2/T2)
            var asTireP1 = stemState.asTireP1 || 35; // PSI at fill
            var asTireT1 = stemState.asTireT1 || 70; // Fill temp Â°F
            var asTireT2 = stemState.asTireT2 || 20; // Current temp Â°F
            var t1K = (asTireT1 - 32) * 5 / 9 + 273.15;
            var t2K = (asTireT2 - 32) * 5 / 9 + 273.15;
            var asTireP2 = asTireP1 * t2K / t1K;
            var tireDrop = asTireP1 - asTireP2;

            // Insulation: R-value & heat loss Q = A * Î”T / R
            var asWallArea = stemState.asWallArea || 200; // sq ft
            var asRValue = stemState.asRValue || 13; // R-value
            var asTempIn = stemState.asTempIn || 70;
            var asTempOut = stemState.asTempOut || 20;
            var asHeatLoss = asWallArea * (asTempIn - asTempOut) / asRValue; // BTU/hr
            var asHeatLossDay = asHeatLoss * 24;
            var rValues = [
              { material: 'Single-pane glass', r: 1, color: 'red' },
              { material: 'Double-pane glass', r: 2, color: 'orange' },
              { material: 'Brick (4")', r: 4, color: 'amber' },
              { material: 'Fiberglass batt (3.5")', r: 13, color: 'emerald' },
              { material: 'Spray foam (3.5")', r: 21, color: 'green' },
              { material: 'Vacuum insulated panel', r: 40, color: 'cyan' }
            ];

            // Cooking chemistry
            var asCookTemp = stemState.asCookTemp || 350;
            var cookReactions = [
              { name: 'Water evaporates', tempF: 212, desc: 'H\u2082O molecules gain enough kinetic energy to escape liquid phase. Phase transition: liquid \u2192 gas.', icon: '\uD83D\uDCA7' },
              { name: 'Sugar caramelizes', tempF: 320, desc: 'Sucrose molecules break down and recombine into hundreds of new compounds, creating brown color and complex flavors.', icon: '\uD83C\uDF6F' },
              { name: 'Maillard reaction', tempF: 280, desc: 'Amino acids + reducing sugars \u2192 melanoidins (brown crust). This is NOT caramelization \u2014 requires proteins!', icon: '\uD83E\uDD69' },
              { name: 'Gluten forms', tempF: 75, desc: 'Glutenin + gliadin proteins cross-link when hydrated, forming elastic gluten networks. This gives bread its chew!', icon: '\uD83C\uDF5E' },
              { name: 'Yeast dies', tempF: 140, desc: 'Above 140\u00B0F, yeast cells\' proteins denature. Enzyme activity ceases. No more CO\u2082 = no more rising.', icon: '\u2620\uFE0F' },
              { name: 'Protein denatures', tempF: 160, desc: 'Heat unfolds protein tertiary structure. Collagen \u2192 gelatin (slow cooking), albumin coagulates (egg whites solidify).', icon: '\uD83E\uDD5A' },
              { name: 'Acrylamide forms', tempF: 400, desc: 'Asparagine + sugars at high heat \u2192 acrylamide (potential carcinogen). Why you shouldn\'t burn toast!', icon: '\u26A0\uFE0F' }
            ];
            var activeReactions = cookReactions.filter(function (r) { return asCookTemp >= r.tempF; });

            // â”€â”€ Electrical: Ohm's law â”€â”€
            var asVolts = stemState.asVolts || 120;
            var asAmps = stemState.asAmps || 15;
            var asWatts = asVolts * asAmps;
            var commonDevices = [
              { name: 'LED bulb', watts: 10 }, { name: 'Laptop', watts: 65 }, { name: 'TV (55")', watts: 100 },
              { name: 'Microwave', watts: 1100 }, { name: 'Hair dryer', watts: 1500 }, { name: 'Space heater', watts: 1500 },
              { name: 'Oven', watts: 2500 }, { name: 'Clothes dryer', watts: 5000 }
            ];
            var asRunning = stemState.asRunning || ['Microwave'];
            var totalLoad = 0;
            asRunning.forEach(function (name) {
              var dev = commonDevices.find(function (d) { return d.name === name; });
              if (dev) totalLoad += dev.watts;
            });
            var circuitUsage = totalLoad / asWatts * 100;
            var willTrip = circuitUsage > 100;

            // ────── CAR CARE SCIENCE ──────
            var ccOilTemp = stemState.ccOilTemp != null ? stemState.ccOilTemp : 70;
            var ccTread = stemState.ccTread != null ? stemState.ccTread : 6;
            var ccBattTemp = stemState.ccBattTemp != null ? stemState.ccBattTemp : 70;
            var ccMileage = stemState.ccMileage || 30000;
            var ccDashQ = stemState.ccDashQ != null ? stemState.ccDashQ : 0;
            var ccDashAnswer = stemState.ccDashAnswer;
            var ccDashFb = stemState.ccDashFb;
            var ccSelOil = stemState.ccSelOil; // selected oil grade for detail panel
            var ccSelMaint = stemState.ccSelMaint; // selected maintenance item for DIY tips
            var ccCarTab = stemState.ccCarTab || 'oil'; // car care sub-section nav

            // Oil viscosity data
            var oilGrades = [
              { grade: '0W-20', minF: -40, maxF: 68, desc: 'Ultra-thin. Great fuel economy. Required by most modern engines.', use: 'Newer cars (2010+), hybrids' },
              { grade: '5W-20', minF: -31, maxF: 68, desc: 'Thin oil for modern engines. Good cold-start protection.', use: 'Most modern sedans & SUVs' },
              { grade: '5W-30', minF: -31, maxF: 95, desc: 'Most popular grade. Wide temperature range.', use: 'All-purpose, most common grade' },
              { grade: '10W-30', minF: -13, maxF: 95, desc: 'Slightly thicker cold pour. Good for moderate climates.', use: 'Trucks, older engines, warm climates' },
              { grade: '10W-40', minF: -13, maxF: 104, desc: 'Higher hot viscosity. Resists thinning at high temps.', use: 'Heavy-duty, hot climates, older engines' },
              { grade: '15W-40', minF: 5, maxF: 122, desc: 'Thick oil for maximum protection. Poor cold flow.', use: 'Diesel trucks, commercial equipment' }
            ];
            var ccRecommended = oilGrades.filter(function (g) { return ccOilTemp >= g.minF && ccOilTemp <= g.maxF; });

            // Tire tread data (new tire = 10/32", legal min = 2/32")
            var treadMax = 10; // 32nds of inch
            var treadMin = 2;
            var treadLife = Math.max(0, Math.round((ccTread - treadMin) / (treadMax - treadMin) * 100));
            var treadStopDry = 120 + Math.round((treadMax - ccTread) * 8); // feet at 60mph
            var treadStopWet = 180 + Math.round((treadMax - ccTread) * 25);
            var treadStatus = ccTread <= 2 ? 'REPLACE NOW' : ccTread <= 4 ? 'Replace Soon' : ccTread <= 6 ? 'Fair' : 'Good';
            var treadColor = ccTread <= 2 ? 'red' : ccTread <= 4 ? 'amber' : ccTread <= 6 ? 'yellow' : 'emerald';

            // Battery CCA (Cold Cranking Amps) - capacity drops with temperature
            var ccaBattery = 600; // rated CCA
            var ccaCurrent = ccBattTemp >= 80 ? ccaBattery :
              ccBattTemp >= 32 ? Math.round(ccaBattery * (0.65 + 0.35 * (ccBattTemp - 32) / 48)) :
              Math.round(ccaBattery * Math.max(0.2, 0.65 - (32 - ccBattTemp) * 0.01));
            var ccaNeeded = 250; // average CCA needed to start
            var ccaWillStart = ccaCurrent >= ccaNeeded;

            // Maintenance schedule
            var maintSchedule = [
              { miles: 5000, service: 'Oil change', cost: 45, icon: '\uD83D\uDEE2\uFE0F' },
              { miles: 7500, service: 'Tire rotation', cost: 25, icon: '\uD83D\uDD04' },
              { miles: 15000, service: 'Cabin air filter', cost: 30, icon: '\uD83C\uDF2C\uFE0F' },
              { miles: 20000, service: 'Engine air filter', cost: 25, icon: '\u2699\uFE0F' },
              { miles: 30000, service: 'Brake inspection', cost: 50, icon: '\uD83D\uDED1' },
              { miles: 30000, service: 'Transmission fluid', cost: 120, icon: '\u2699\uFE0F' },
              { miles: 50000, service: 'Spark plugs', cost: 150, icon: '\u26A1' },
              { miles: 60000, service: 'Brake pads', cost: 250, icon: '\uD83D\uDED1' },
              { miles: 60000, service: 'Coolant flush', cost: 100, icon: '\uD83D\uDCA7' },
              { miles: 75000, service: 'Timing belt/chain', cost: 500, icon: '\u23F1\uFE0F' },
              { miles: 100000, service: 'Battery replacement', cost: 180, icon: '\uD83D\uDD0B' }
            ];
            var upcomingMaint = maintSchedule.filter(function (m) {
              var nextDue = Math.ceil(ccMileage / m.miles) * m.miles;
              return nextDue - ccMileage <= 10000;
            }).map(function (m) {
              var nextDue = Math.ceil(ccMileage / m.miles) * m.miles;
              return { service: m.service, cost: m.cost, icon: m.icon, dueAt: nextDue, milesUntil: nextDue - ccMileage };
            }).sort(function (a, b) { return a.milesUntil - b.milesUntil; });

            // Dashboard warning lights quiz
            var dashLights = [
              { icon: '\uD83D\uDEE2\uFE0F', name: 'Check Engine', urgency: 'high', desc: 'Engine or emissions issue. Could be minor (gas cap) or major (catalytic converter). Get scanned ASAP.', choices: ['Check Engine', 'Low Oil', 'Battery', 'Transmission'] },
              { icon: '\uD83C\uDF21\uFE0F', name: 'Temperature Warning', urgency: 'critical', desc: 'Engine overheating! PULL OVER IMMEDIATELY. Driving further can warp the head gasket ($2,000+ repair).', choices: ['A/C Problem', 'Temperature Warning', 'Oil Pressure', 'Coolant Level'] },
              { icon: '\uD83D\uDD0B', name: 'Battery/Charging', urgency: 'high', desc: 'Alternator not charging the battery. Car will die soon. Drive directly to a shop.', choices: ['Hybrid System', 'Battery/Charging', 'Electrical Short', 'Starter Motor'] },
              { icon: '\u26A0\uFE0F', name: 'ABS Warning', urgency: 'medium', desc: 'Anti-lock braking disabled. Normal brakes still work but wheels can lock on slippery roads.', choices: ['Traction Control', 'Transmission', 'ABS Warning', 'Cruise Control'] },
              { icon: '\uD83D\uDCA7', name: 'Low Oil Pressure', urgency: 'critical', desc: 'Oil not circulating! Engine can seize in minutes. STOP DRIVING. Check oil level immediately.', choices: ['Washer Fluid', 'Low Oil Pressure', 'Coolant', 'Fuel Filter'] },
              { icon: '\uD83D\uDED1', name: 'Brake System', urgency: 'high', desc: 'Brake fluid low or brake system malfunction. Could also mean parking brake is on. Check immediately.', choices: ['Brake System', 'Tire Pressure', 'Stability Control', 'Power Steering'] },
              { icon: '\uD83D\uDE97', name: 'TPMS (Tire Pressure)', urgency: 'medium', desc: 'One or more tires are under-inflated. Check all 4 tires with a gauge. Under-inflation wastes gas and wears tires.', choices: ['Alignment', 'Suspension', 'TPMS (Tire Pressure)', 'All-Wheel Drive'] },
              { icon: '\u2B50', name: 'Airbag Warning', urgency: 'high', desc: 'Airbag system malfunction — airbags may not deploy in a crash. Get it checked immediately.', choices: ['Seatbelt Reminder', 'Airbag Warning', 'Security System', 'Lane Departure'] }
            ];
            var ccCurrentDash = dashLights[ccDashQ % dashLights.length];

            // ────── PLUMBING & HOME REPAIR ──────
            var plumbTab = stemState.plumbTab || 'toilet';
            var plumbToiletQ = stemState.plumbToiletQ != null ? stemState.plumbToiletQ : 0;
            var plumbToiletFb = stemState.plumbToiletFb;
            var plumbPipeQ = stemState.plumbPipeQ != null ? stemState.plumbPipeQ : 0;
            var plumbPipeFb = stemState.plumbPipeFb;
            var plumbPipeAnswer = stemState.plumbPipeAnswer;
            var plumbSelPart = stemState.plumbSelPart; // clicked toilet part for expand detail
            var whType = stemState.whType || 'tank';
            var whGallons = stemState.whGallons || 50;
            var whPeople = stemState.whPeople || 3;
            var paintL = stemState.paintL || 12;
            var paintW = stemState.paintW || 10;
            var paintH = stemState.paintH || 8;
            var paintCoats = stemState.paintCoats || 2;
            var paintWindows = stemState.paintWindows || 2;
            var paintDoors = stemState.paintDoors || 1;

            // Toilet parts data
            var toiletParts = [
              { name: 'Fill Valve', desc: 'Refills the tank after flushing. Opens when water level drops, closes at a set level. A hissing sound often means this needs replacement.', icon: '\uD83D\uDEB0' },
              { name: 'Flapper', desc: 'Rubber seal at the bottom of the tank. Lifts when you flush, letting water rush into the bowl. #1 cause of running toilets when it warps or gets mineral buildup.', icon: '\uD83D\uDD34' },
              { name: 'Overflow Tube', desc: 'Safety drain that prevents the tank from overflowing if the fill valve malfunctions. Water level should be 1" below its top.', icon: '\uD83D\uDCCF' },
              { name: 'Handle & Chain', desc: 'The flush lever lifts the flapper via a chain. Too much slack = weak flush. Too tight = flapper can\'t seal, causing running.', icon: '\uD83D\uDD17' },
              { name: 'Wax Ring', desc: 'Seals the toilet base to the drain pipe. If water leaks around the base, this needs replacement. Lasts 20-30 years normally.', icon: '\uD83D\uDFE1' },
              { name: 'Shut-off Valve', desc: 'Located on the wall behind the toilet. Turn clockwise to stop water flow. ALWAYS know where this is before attempting any repair!', icon: '\uD83D\uDEBF' }
            ];

            // Toilet diagnosis quiz
            var toiletProblems = [
              { symptom: 'Toilet runs constantly, making a hissing sound', answer: 'Fill Valve', explain: 'The fill valve isn\'t shutting off. It may be stuck, worn, or the float is set too high. Cost to fix: $10-20 DIY.' },
              { symptom: 'Toilet runs intermittently — you hear it refill every few minutes ("phantom flush")', answer: 'Flapper', explain: 'The flapper is leaking, slowly draining the tank. The fill valve kicks on to refill. Replace the flapper for $5.' },
              { symptom: 'Weak flush — water swirls but doesn\'t clear the bowl', answer: 'Handle & Chain', explain: 'Chain may have too much slack so the flapper doesn\'t lift fully. Adjust chain length so there\'s about 1/2" slack.' },
              { symptom: 'Water leaking around the base of the toilet on the floor', answer: 'Wax Ring', explain: 'The wax ring seal has failed. You\'ll need to remove the toilet and replace the wax ring. Cost: $5-15 for the ring, but labor-intensive.' },
              { symptom: 'Water overflowing from the tank into the bowl', answer: 'Overflow Tube', explain: 'Water level is too high. Adjust the fill valve float downward so water stops 1" below the overflow tube top.' }
            ];
            var toiletCurrent = toiletProblems[plumbToiletQ % toiletProblems.length];

            // Pipe material guide
            var pipeScenarios = [
              { scenario: 'Indoor cold water supply lines for a bathroom renovation', answer: 'PEX', explain: 'PEX (cross-linked polyethylene) is flexible, freeze-resistant, easy to install, and doesn\'t corrode. Best for indoor supply lines.', choices: ['PVC', 'PEX', 'Copper', 'Cast Iron'] },
              { scenario: 'Kitchen drain under the sink', answer: 'PVC', explain: 'PVC (polyvinyl chloride) is lightweight, cheap, and won\'t corrode. Standard for drain, waste, and vent (DWV) lines.', choices: ['PEX', 'PVC', 'Galvanized Steel', 'Copper'] },
              { scenario: 'Main sewer line from house to street', answer: 'PVC', explain: 'Modern main sewer lines use 4" PVC. It\'s durable, smooth (fewer clogs), and doesn\'t corrode like old clay or cast iron.', choices: ['PEX', 'Copper', 'PVC', 'Galvanized Steel'] },
              { scenario: 'Natural gas supply line from meter to stove', answer: 'Black Steel', explain: 'Black steel (or CSST flex line) is required for gas. PVC and PEX melt! Only licensed plumbers should install gas lines.', choices: ['PVC', 'PEX', 'Black Steel', 'Copper'] },
              { scenario: 'Outdoor sprinkler system in a region with freezing winters', answer: 'PEX', explain: 'PEX can expand slightly when water freezes, making it more freeze-resistant than rigid PVC or copper.', choices: ['Copper', 'PVC', 'Cast Iron', 'PEX'] },
              { scenario: 'Hot water supply line from water heater', answer: 'Copper', explain: 'Copper handles high temperatures well and is durable. PEX also works for hot water (up to 200°F). Both are acceptable.', choices: ['PVC', 'Cast Iron', 'Copper', 'Galvanized Steel'] }
            ];
            var pipeCurrent = pipeScenarios[plumbPipeQ % pipeScenarios.length];

            // Water heater calculator
            var whTankCost = whGallons <= 40 ? 450 : whGallons <= 50 ? 550 : 700;
            var whTankMonthly = Math.round(whPeople * 12 + whGallons * 0.3);
            var whTankAnnual = whTankMonthly * 12;
            var whTanklessUpfront = 2500;
            var whTanklessMonthly = Math.round(whPeople * 9);
            var whTanklessAnnual = whTanklessMonthly * 12;
            var whPayback = whTankAnnual > whTanklessAnnual ? Math.round((whTanklessUpfront - whTankCost) / (whTankAnnual - whTanklessAnnual) * 10) / 10 : 99;

            // Paint calculator
            var paintWallArea = 2 * (paintL + paintW) * paintH;
            var paintWindowArea = paintWindows * 15; // avg window ~15 sq ft
            var paintDoorArea = paintDoors * 21; // avg door ~21 sq ft
            var paintNetArea = Math.max(0, paintWallArea - paintWindowArea - paintDoorArea);
            var paintSqFtPerGallon = 350;
            var paintGallons = Math.ceil(paintNetArea * paintCoats / paintSqFtPerGallon);
            var paintCostBudget = paintGallons * 30;
            var paintCostPremium = paintGallons * 55;

            // ────── HOME SYSTEMS ──────
            var homeTab = stemState.homeTab || 'hvac';
            var hsMerv = stemState.hsMerv || 8;
            var hsPsi = stemState.hsPsi || 55;
            var hsSelPanel = stemState.hsSelPanel; // selected panel item for expand
            var hsPanelQ = stemState.hsPanelQ != null ? stemState.hsPanelQ : 0;
            var hsPanelFb = stemState.hsPanelFb;
            var hsPanelAnswer = stemState.hsPanelAnswer;

            // ────── WATER QUALITY (Plumbing tab) ──────
            var wqHardness = stemState.wqHardness || 10; // grains per gallon
            var wqHardLabel = wqHardness < 1 ? 'Soft' : wqHardness < 3.5 ? 'Slightly Hard' : wqHardness < 7 ? 'Moderately Hard' : wqHardness < 10.5 ? 'Hard' : wqHardness < 15 ? 'Very Hard' : 'Extremely Hard';
            var wqHardColor = wqHardness < 3.5 ? 'emerald' : wqHardness < 7 ? 'sky' : wqHardness < 10.5 ? 'amber' : 'red';
            var wqEffects = [];
            if (wqHardness < 3.5) wqEffects.push('Soap lathers easily', 'No mineral buildup', 'Appliances last longer');
            else if (wqHardness < 7) wqEffects.push('Minor soap scum', 'Slight scale in kettles', 'Generally manageable');
            else if (wqHardness < 10.5) wqEffects.push('Noticeable soap scum on fixtures', 'Scale builds in water heater (reduces efficiency)', 'Laundry feels stiff');
            else wqEffects.push('Heavy mineral deposits on everything', 'Water heater efficiency drops 25-40%', 'Pipes can clog with scale over time', 'Skin and hair feel dry/itchy after showering');
            var wqScaleRate = Math.round(wqHardness * 0.8 * 10) / 10; // lbs/year in water heater
            var wqSofteners = [
              { name: 'Ion-Exchange (Salt)', cost: '$400-800', annual: '$100-200/yr salt', removes: 'Calcium, Magnesium', pros: 'Most effective. Truly removes minerals.', cons: 'Adds sodium to water. Needs salt refills. Drain water high in sodium.', icon: '\uD83E\uDDC2' },
              { name: 'Salt-Free Conditioner', cost: '$300-600', annual: '$0/yr', removes: 'Does NOT remove minerals', pros: 'No salt, no maintenance, no waste water.', cons: 'Doesn\'t actually soften — prevents scale only. Hard water still causes soap issues.', icon: '\uD83D\uDCA7' },
              { name: 'Reverse Osmosis', cost: '$200-500', annual: '$50-100/yr filters', removes: 'Everything: minerals, chemicals, bacteria', pros: 'Purest water possible. Great for drinking.', cons: 'Wastes 3-4 gallons per 1 gallon produced. Only practical for drinking water, not whole-house.', icon: '\uD83E\uDDEB' },
              { name: 'Magnetic/Electronic', cost: '$30-200', annual: '$5/yr electricity', removes: 'Disputed effectiveness', pros: 'Cheapest. No maintenance. Easy install.', cons: 'Scientific evidence is weak. Most plumbers don\'t recommend. May reduce scale slightly.', icon: '\uD83E\uDDF2' }
            ];

            // ────── WATER USAGE (Plumbing tab) ──────
            var wuShowerMin = stemState.wuShowerMin || 8;
            var wuShowers = stemState.wuShowers || 1;
            var wuFlushes = stemState.wuFlushes || 5;
            var wuLowFlow = stemState.wuLowFlow || false;
            var wuDishwasher = stemState.wuDishwasher || 0;
            var wuLaundry = stemState.wuLaundry || 0;
            var wuFaucetMin = stemState.wuFaucetMin || 10;
            var showerGPM = wuLowFlow ? 1.5 : 2.5;
            var toiletGPF = wuLowFlow ? 1.28 : 3.5;
            var wuShowerGal = Math.round(wuShowerMin * showerGPM * wuShowers * 10) / 10;
            var wuToiletGal = Math.round(wuFlushes * toiletGPF * 10) / 10;
            var wuDishGal = wuDishwasher * (wuLowFlow ? 4 : 6);
            var wuLaundryGal = wuLaundry * (wuLowFlow ? 15 : 40);
            var wuFaucetGal = Math.round(wuFaucetMin * (wuLowFlow ? 1.0 : 2.2) * 10) / 10;
            var wuTotalGal = Math.round((wuShowerGal + wuToiletGal + wuDishGal + wuLaundryGal + wuFaucetGal) * 10) / 10;
            var wuMonthlyGal = Math.round(wuTotalGal * 30);
            var wuCostPerGal = 0.005; // ~$5 per 1000 gallons
            var wuMonthlyCost = Math.round(wuMonthlyGal * wuCostPerGal * 100) / 100;
            var wuNatAvg = 82; // gallons per person per day

            // ────── ENERGY AUDIT (Home Systems tab) ──────
            var eaAppliances = [
              { name: 'Central A/C', watts: 3500, icon: '\u2744\uFE0F', defaultHrs: 8, category: 'hvac', tip: 'Every degree you raise the thermostat saves ~3% on cooling costs.' },
              { name: 'Furnace Blower', watts: 500, icon: '\uD83D\uDD25', defaultHrs: 8, category: 'hvac', tip: 'Change filters monthly — dirty filters make the blower work harder.' },
              { name: 'Refrigerator', watts: 150, icon: '\uD83E\uDDCA', defaultHrs: 24, category: 'kitchen', tip: 'Runs 24/7. A 10-year-old fridge uses 2x the energy of a new Energy Star model.' },
              { name: 'Dishwasher', watts: 1800, icon: '\uD83E\uDD7D', defaultHrs: 1, category: 'kitchen', tip: 'Run only when full. Skip heated dry — open the door instead.' },
              { name: 'Oven/Range', watts: 2500, icon: '\uD83C\uDF73', defaultHrs: 1, category: 'kitchen', tip: 'Microwaves use 80% less energy for reheating than a full oven.' },
              { name: 'Clothes Dryer', watts: 3000, icon: '\uD83E\uDDFA', defaultHrs: 1, category: 'laundry', tip: 'Clean the lint trap every load. A clogged dryer uses 30% more energy.' },
              { name: 'Washing Machine', watts: 500, icon: '\uD83E\uDDFC', defaultHrs: 1, category: 'laundry', tip: 'Wash in cold water — 90% of a washer\'s energy goes to heating water.' },
              { name: 'TV (55" LED)', watts: 100, icon: '\uD83D\uDCFA', defaultHrs: 5, category: 'entertainment', tip: 'A 55" LED uses 1/3 the energy of an equivalent plasma TV.' },
              { name: 'Gaming Console', watts: 200, icon: '\uD83C\uDFAE', defaultHrs: 3, category: 'entertainment', tip: 'Enable auto-sleep. Consoles in standby still draw 5-10W.' },
              { name: 'Desktop Computer', watts: 300, icon: '\uD83D\uDCBB', defaultHrs: 6, category: 'office', tip: 'Use sleep mode. A sleeping PC uses ~5W vs 300W active.' },
              { name: 'LED Lights (10 bulbs)', watts: 100, icon: '\uD83D\uDCA1', defaultHrs: 6, category: 'lighting', tip: 'LEDs use 75% less energy than incandescent. One LED bulb saves ~$7/yr.' },
              { name: 'Water Heater (elec)', watts: 4500, icon: '\uD83D\uDEB4', defaultHrs: 3, category: 'water', tip: 'Set to 120°F, not 140°F. Each 10° reduction saves 3-5% energy.' },
              { name: 'Phone Charger', watts: 5, icon: '\uD83D\uDCF1', defaultHrs: 8, category: 'phantom', tip: 'Phantom load: chargers plugged in with no phone still draw ~0.5W.' },
              { name: 'Cable Box/DVR', watts: 35, icon: '\uD83D\uDCE1', defaultHrs: 24, category: 'phantom', tip: 'DVRs use almost as much power OFF as ON. Consider a smart power strip.' }
            ];
            var eaHrs = stemState.eaHrs || {};
            var eaEnabled = stemState.eaEnabled || {};
            var eaCostPerKwh = stemState.eaCostPerKwh || 0.13; // $/kWh national avg
            var eaItems = eaAppliances.map(function (a) {
              var hrs = eaHrs[a.name] != null ? eaHrs[a.name] : a.defaultHrs;
              var on = eaEnabled[a.name] !== false;
              var dailyKwh = on ? (a.watts * hrs / 1000) : 0;
              var monthlyCost = Math.round(dailyKwh * 30 * eaCostPerKwh * 100) / 100;
              return { name: a.name, watts: a.watts, icon: a.icon, hours: hrs, on: on, dailyKwh: Math.round(dailyKwh * 100) / 100, monthlyCost: monthlyCost, tip: a.tip, category: a.category };
            });
            var eaTotalDaily = Math.round(eaItems.reduce(function (s, i) { return s + i.dailyKwh; }, 0) * 100) / 100;
            var eaTotalMonthly = Math.round(eaTotalDaily * 30 * eaCostPerKwh * 100) / 100;
            var eaTop3 = eaItems.slice().sort(function (a, b) { return b.monthlyCost - a.monthlyCost; }).slice(0, 3);

            // ────── FIRE SAFETY (Home Systems tab) ──────
            var fsFloors = stemState.fsFloors || 2;
            var fsBedrooms = stemState.fsBedrooms || 3;
            var fsHasGarage = stemState.fsHasGarage !== false;
            var fsHasBasement = stemState.fsHasBasement || false;
            var fsQuizQ = stemState.fsQuizQ != null ? stemState.fsQuizQ : 0;
            var fsQuizFb = stemState.fsQuizFb;
            var fsQuizAnswer = stemState.fsQuizAnswer;
            var fsDetectorsNeeded = fsBedrooms + fsFloors + (fsHasGarage ? 1 : 0) + (fsHasBasement ? 1 : 0) + 1; // bedrooms + hallways per floor + garage + basement + kitchen-adjacent
            var fsCONeeded = fsFloors + (fsHasGarage ? 1 : 0) + (fsHasBasement ? 1 : 0);
            var fsQuizzes = [
              { q: 'Where should you place a smoke detector in relation to the kitchen?', answer: '10+ feet away from cooking appliances', explain: 'Too close causes false alarms from cooking smoke. 10 feet minimum. Use a photoelectric detector near kitchens — they\'re less sensitive to cooking particles.', choices: ['Inside the kitchen', '10+ feet away from cooking appliances', 'Only in the hallway upstairs', 'In the garage'] },
              { q: 'A smoke detector is chirping every 30 seconds. What does this usually mean?', answer: 'Battery needs replacing', explain: 'A regular chirp = low battery. Continuous alarm = actual smoke/fire. Replace batteries annually, or get 10-year sealed lithium models.', choices: ['There is a fire', 'Battery needs replacing', 'The unit is broken', 'Carbon monoxide detected'] },
              { q: 'What type of smoke detector is better for detecting slow, smoldering fires?', answer: 'Photoelectric', explain: 'Photoelectric detectors use light beams — better for smoldering fires (upholstery, wiring). Ionization detectors respond faster to flaming fires. Best practice: use BOTH or dual-sensor models.', choices: ['Ionization', 'Photoelectric', 'Carbon monoxide', 'Heat detector'] },
              { q: 'How often should smoke detectors be fully replaced?', answer: 'Every 10 years', explain: 'Smoke detectors have radioactive elements (Americium-241 in ionization types) or optical sensors that degrade. After 10 years, reliability drops significantly. Check the manufacture date on the back.', choices: ['Every 2 years', 'Every 5 years', 'Every 10 years', 'Only when they stop working'] },
              { q: 'Where should CO (carbon monoxide) detectors be placed?', answer: 'On every floor, near sleeping areas', explain: 'CO is slightly lighter than air and mixes evenly. Place on every level, within 15 feet of sleeping areas. CO is odorless and colorless — the detector is your only warning.', choices: ['Only in the basement', 'In the kitchen', 'On every floor, near sleeping areas', 'Only near the furnace'] }
            ];
            var fsCurrentQ = fsQuizzes[fsQuizQ % fsQuizzes.length];

            // ────── INSULATION R-VALUE (Home Systems tab) ──────
            var insZone = stemState.insZone || 4; // climate zones 1-7
            var insWallType = stemState.insWallType || 'wood';
            var insZoneData = [
              { zone: 1, label: 'Hot-Humid (Miami, Hawaii)', atticR: 30, wallR: 13, floorR: 0, color: '#ef4444', desc: 'Cooling-dominated climate. Focus on radiant barriers and ceiling insulation to block solar heat gain.' },
              { zone: 2, label: 'Hot-Dry (Phoenix, Houston)', atticR: 38, wallR: 13, floorR: 13, color: '#f97316', desc: 'Hot days, cool nights. Thermal mass and attic insulation are key to comfort.' },
              { zone: 3, label: 'Warm (Atlanta, Dallas)', atticR: 38, wallR: 13, floorR: 19, color: '#eab308', desc: 'Mixed cooling/heating. Balance attic R-value and floor insulation for year-round comfort.' },
              { zone: 4, label: 'Mixed (DC, Seattle, Nashville)', atticR: 49, wallR: 13, floorR: 19, color: '#22c55e', desc: 'Equal heating and cooling loads. Air sealing + insulation upgrades have the highest ROI here.' },
              { zone: 5, label: 'Cool (Chicago, Denver, Boston)', atticR: 49, wallR: 20, floorR: 25, color: '#3b82f6', desc: 'Heating-dominated. Wall cavity insulation and attic coverage are critical to reduce heating bills.' },
              { zone: 6, label: 'Cold (Minneapolis, Burlington)', atticR: 60, wallR: 20, floorR: 25, color: '#6366f1', desc: 'Long, harsh winters. Continuous exterior insulation and vapor barriers prevent ice dams and heat loss.' },
              { zone: 7, label: 'Very Cold (Fairbanks, Duluth)', atticR: 60, wallR: 21, floorR: 30, color: '#8b5cf6', desc: 'Extreme cold. Triple-pane windows, R-60 attics, and airtight construction are essential.' }
            ];
            var insCurrentZone = insZoneData.find(function (z) { return z.zone === insZone; }) || insZoneData[3];
            var insTypes = [
              { name: 'Fiberglass Batts', rPerInch: 3.2, cost: 0.50, costSqFt: '$0.50', best: 'Cheapest option, easy DIY install in open bays', pros: 'Cheapest, easy DIY install', cons: 'Loses R-value if compressed or wet', icon: '\uD83E\uDDF6' },
              { name: 'Blown Cellulose', rPerInch: 3.5, cost: 0.80, costSqFt: '$0.80', best: 'Great for retrofitting attics and filling gaps', pros: 'Great for retrofitting attics, fills gaps', cons: 'Can settle over time, needs dry environment', icon: '\uD83C\uDF43' },
              { name: 'Spray Foam (Open)', rPerInch: 3.7, cost: 1.50, costSqFt: '$1.50', best: 'Air-seals and insulates walls in one step', pros: 'Air-seals and insulates in one step', cons: 'Professional install required, more expensive', icon: '\uD83E\uDEE7' },
              { name: 'Spray Foam (Closed)', rPerInch: 6.5, cost: 2.50, costSqFt: '$2.50', best: 'Best R/inch and doubles as moisture barrier', pros: 'Highest R/inch, moisture barrier, structural', cons: 'Most expensive, pro install only', icon: '\uD83E\uDDF1' },
              { name: 'Rigid Foam Board', rPerInch: 5.0, cost: 1.20, costSqFt: '$1.20', best: 'Ideal for basements and continuous exterior', pros: 'Great for basements and exterior walls', cons: 'Must be covered (fire code), not flexible', icon: '\uD83D\uDFE6' }
            ];
            var insThicknessNeeded = insTypes.map(function (t) {
              return { name: t.name, icon: t.icon, atticInches: Math.round(insCurrentZone.atticR / t.rPerInch * 10) / 10, wallInches: Math.round(insCurrentZone.wallR / t.rPerInch * 10) / 10, costPerSqFt: t.cost, rPerInch: t.rPerInch };
            });
            var insSqFt = stemState.insSqFt || 0;
            var insSelected = stemState.insSelected || 'Fiberglass Batts';
            var insSelectedType = insTypes.find(function (t) { return t.name === insSelected; }) || insTypes[0];
            var insEstCost = insSqFt > 0 ? Math.round(insSqFt * insSelectedType.cost) : 0;
            var insAnnualSavings = insSqFt > 0 ? Math.round(insSqFt * 0.08 * insSelectedType.rPerInch) : 0;
            var insPayback = insAnnualSavings > 0 ? Math.round(insEstCost / insAnnualSavings * 10) / 10 : 0;

            // ────── HEATING SOURCES COMPARISON (Home Systems tab) ──────
            var htSrcFuel = stemState.htSrcFuel || 'gas';
            var htSrcSystems = [
              { id: 'gas', name: 'Gas Furnace', icon: '\uD83D\uDD25', fuel: 'Natural Gas', afue: 96, installCost: 4500, annualFuel: 750, lifespan: 20, co2Lbs: 6400, pros: 'Most common, fast heating, lower fuel cost', cons: 'Requires gas line, combustion byproducts' },
              { id: 'electric', name: 'Electric Furnace', icon: '\u26A1', fuel: 'Electricity', afue: 100, installCost: 3000, annualFuel: 1800, lifespan: 20, co2Lbs: 7200, pros: 'No combustion, safer, lower install cost', cons: 'Very expensive to operate, high electric bills' },
              { id: 'oil', name: 'Oil Furnace', icon: '\uD83D\uDEE2\uFE0F', fuel: 'Heating Oil', afue: 87, installCost: 5500, annualFuel: 1600, lifespan: 25, co2Lbs: 8200, pros: 'Burns very hot, good for extreme cold', cons: 'Needs oil tank & deliveries, higher emissions' },
              { id: 'propane', name: 'Propane Furnace', icon: '\uD83E\uDDEA', fuel: 'Propane (LPG)', afue: 95, installCost: 5000, annualFuel: 1400, lifespan: 20, co2Lbs: 5800, pros: 'Works without gas lines, clean-burning', cons: 'Requires propane tank, fuel price volatile' },
              { id: 'boiler', name: 'Boiler (Hydronic)', icon: '\u2668\uFE0F', fuel: 'Gas/Oil', afue: 92, installCost: 7500, annualFuel: 900, lifespan: 30, co2Lbs: 5500, pros: 'Even radiant heat, quiet, no duct loss', cons: 'Expensive install, slow to heat up, no AC' }
            ];
            var htSrcSelected = htSrcSystems.find(function (s) { return s.id === htSrcFuel; }) || htSrcSystems[0];
            var htSrc15yr = htSrcSystems.map(function (s) {
              return { id: s.id, name: s.name, icon: s.icon, total: s.installCost + (s.annualFuel * 15), install: s.installCost, fuel15: s.annualFuel * 15 };
            }).sort(function (a, b) { return a.total - b.total; });
            var htSrcCheapest = htSrc15yr[0].id;

            // ────── HEAT PUMP GUIDE (Home Systems tab) ──────
            var hpType = stemState.hpType || 'air';
            var hpClimate = stemState.hpClimate != null ? stemState.hpClimate : 3;
            var hpTypes = [
              { id: 'air', name: 'Air-Source Heat Pump', icon: '\uD83C\uDF2C\uFE0F', copHeat: 3.0, copCool: 4.0, installCost: 5500, annualCost: 850, bestClimate: '1\u20134', lifespan: 15, pros: 'Heats AND cools, 300% efficient, lowest operating cost', cons: 'Efficiency drops below 25\u00B0F, may need backup heat', desc: 'Extracts heat from outdoor air. Works like an AC in reverse.' },
              { id: 'ground', name: 'Ground-Source (Geothermal)', icon: '\uD83C\uDF0D', copHeat: 4.5, copCool: 5.5, installCost: 25000, annualCost: 500, bestClimate: 'All zones', lifespan: 25, pros: 'Highest efficiency, works in any climate, 25+ yr life', cons: 'Very high upfront cost, requires yard excavation', desc: 'Uses underground loops where temp is constant 50\u201355\u00B0F year-round.' },
              { id: 'minisplit', name: 'Ductless Mini-Split', icon: '\u2744\uFE0F', copHeat: 3.5, copCool: 4.5, installCost: 4000, annualCost: 700, bestClimate: '1\u20135', lifespan: 20, pros: 'No ductwork needed, zone control, very quiet', cons: 'Only heats/cools individual rooms, needs unit per zone', desc: 'Wall-mounted indoor units connected to outdoor compressor. Great for additions or homes without ducts.' },
              { id: 'hybrid', name: 'Hybrid (Dual Fuel)', icon: '\uD83D\uDD04', copHeat: 3.0, copCool: 4.0, installCost: 7500, annualCost: 650, bestClimate: '3\u20137', lifespan: 18, pros: 'Switches to gas backup in extreme cold, best of both', cons: 'Higher install cost, needs gas line + heat pump', desc: 'Heat pump above 35\u00B0F, switches to gas furnace below. Optimal efficiency year-round.' }
            ];
            var hpSelected = hpTypes.find(function (t) { return t.id === hpType; }) || hpTypes[0];
            var hpClimateLabels = ['Hot (Miami)', 'Warm (Atlanta)', 'Mixed (DC)', 'Cool (Chicago)', 'Cold (Minneapolis)'];
            var hpCOPAtClimate = function (baseCOP, zone) {
              var factors = [1.1, 1.05, 1.0, 0.85, 0.65];
              return Math.round(baseCOP * (factors[zone] || 1.0) * 10) / 10;
            };
            var hpEffCOP = hpCOPAtClimate(hpSelected.copHeat, hpClimate);
            var hpGasFurnaceAnnual = 750;
            var hpSavingsVsGas = hpGasFurnaceAnnual - hpSelected.annualCost;
            var hpPayback = hpSavingsVsGas > 0 ? Math.round((hpSelected.installCost - 4500) / hpSavingsVsGas * 10) / 10 : 0;
            // Heat pump sizing calculator variables (for heatpump tab render)
            var hpSqft = stemState.hpSqft || 2000;
            var hpInsulation = stemState.hpInsulation || 'avg';
            var hpInsFactor = hpInsulation === 'poor' ? 1.3 : hpInsulation === 'good' ? 0.8 : 1.0;
            var hpClimateFactor = (stemState.hpClimate === 'cold' || hpClimate >= 4) ? 35 : (stemState.hpClimate === 'mild' || hpClimate <= 1) ? 20 : 28;
            var hpBTU = Math.round(hpSqft * hpClimateFactor * hpInsFactor);
            var hpTons = Math.round(hpBTU / 12000 * 10) / 10;
            var hpTypeLookup = { standard: { cop: 3.0, install: 5500 }, cold: { cop: 2.5, install: 7000 }, geo: { cop: 4.5, install: 25000 }, mini: { cop: 3.8, install: 4000 } };
            var hpTypeKey = stemState.hpType || 'standard';
            var hpTypeInfo = hpTypeLookup[hpTypeKey] || hpTypeLookup.standard;
            var hpCOP = hpTypeInfo.cop;
            var hpInstall = hpTypeInfo.install;
            var hpElecRate = 0.13;
            var hpAnnual = Math.round(hpBTU / (hpCOP * 3412) * 8760 * 0.4 * hpElecRate);
            var hpGasRef = Math.round(hpBTU / (0.96 * 100000) * 8760 * 0.4 * 1.20);
            var hpSavings = hpGasRef - hpAnnual;
            var hpCO2Saved = Math.round((hpGasRef * 11.7 - hpAnnual * 0.92) > 0 ? (hpGasRef * 11.7 - hpAnnual * 0.92) : 0);

            // ────── SOLAR VS GAS INVESTMENT CALC (Home Systems tab) ──────
            var solPanels = stemState.solPanels != null ? stemState.solPanels : 20;
            var solElecRate = stemState.solElecRate != null ? stemState.solElecRate : 0.13;
            var solGasRate = stemState.solGasRate != null ? stemState.solGasRate : 1.20;
            var solSunHours = stemState.solSunHours != null ? stemState.solSunHours : 5;
            var solPanelWatts = 400;
            var solEfficiency = 0.85;
            var solFederalITC = 0.30;
            var solCostPerWatt = 2.80;
            var solSystemKW = solPanels * solPanelWatts / 1000;
            var solDailyKWh = Math.round(solSystemKW * solSunHours * solEfficiency * 10) / 10;
            var solAnnualKWh = Math.round(solDailyKWh * 365);
            var solAnnualSavingsElec = Math.round(solAnnualKWh * solElecRate);
            var solSystemCost = Math.round(solSystemKW * 1000 * solCostPerWatt);
            var solITCCredit = Math.round(solSystemCost * solFederalITC);
            var solNetCost = solSystemCost - solITCCredit;
            var solPaybackYrs = solAnnualSavingsElec > 0 ? Math.round(solNetCost / solAnnualSavingsElec * 10) / 10 : 0;
            var sol25yrSavings = Math.round(solAnnualSavingsElec * 25 - solNetCost);
            var solCO2OffsetLbs = Math.round(solAnnualKWh * 0.92);
            var solGasAnnualCost = Math.round(800 * solGasRate);
            var solTreeEquiv = Math.round(solCO2OffsetLbs / 48);

            // ────── SOLAR vs GAS WATER HEATER (Home Systems solar tab) ──────
            var sgHousehold = stemState.sgHousehold || 4;
            var sgSun = stemState.sgSun || 'med';
            var sgSunFactor = sgSun === 'high' ? 0.80 : sgSun === 'low' ? 0.45 : 0.60;
            var sgGallonsDay = sgHousehold * 20;
            var sgSolarInstall = 5500;
            var sgSolarAnnual = Math.round(sgGallonsDay * 365 * 8.33 * 40 / 3412 * (1 - sgSunFactor) * 0.13);
            var sgSolar10 = sgSolarInstall + sgSolarAnnual * 10;
            var sgSolar20 = sgSolarInstall + sgSolarAnnual * 20;
            var sgSolarCO2 = Math.round(sgSolarAnnual / 0.13 * 0.92);
            var sgGasInstall = 1200;
            var sgGasAnnual = Math.round(sgGallonsDay * 365 * 8.33 * 40 / 100000 * 1.20);
            var sgGas10 = sgGasInstall + sgGasAnnual * 10;
            var sgGas20 = sgGasInstall + sgGasAnnual * 20;
            var sgGasCO2 = Math.round(sgGasAnnual / 1.20 * 11.7);
            var sgSaving20 = sgGas20 - sgSolar20;
            var sgBreakEven = (sgGasAnnual - sgSolarAnnual) > 0 ? Math.round((sgSolarInstall - sgGasInstall) / (sgGasAnnual - sgSolarAnnual) * 10) / 10 : 'N/A';

            // MERV rating data
            var mervData = [
              { merv: 1, eff: 20, catches: 'Large particles: dust mites, pollen, spray paint', cost: 2, restrict: 'Very Low', life: '30 days', rec: 'Minimum — protects HVAC only' },
              { merv: 4, eff: 35, catches: '+ carpet fibers, dust, mold spores', cost: 4, restrict: 'Low', life: '60 days', rec: 'Basic residential' },
              { merv: 8, eff: 70, catches: '+ pet dander, fine dust, cement dust', cost: 8, restrict: 'Medium', life: '90 days', rec: 'Better residential — most popular' },
              { merv: 11, eff: 85, catches: '+ Legionella, lead dust, humidifier dust', cost: 15, restrict: 'Medium-High', life: '90 days', rec: 'Superior residential, allergy relief' },
              { merv: 13, eff: 90, catches: '+ bacteria, smoke particles, sneeze droplets', cost: 25, restrict: 'High', life: '90 days', rec: 'Hospital-grade, max for most HVAC' },
              { merv: 16, eff: 95, catches: '+ virus carriers, carbon dust, sea salt', cost: 45, restrict: 'Very High', life: '90 days', rec: 'Clean rooms, surgery suites only' }
            ];
            var mervCurrent = mervData.reduce(function (best, m) { return m.merv <= hsMerv ? m : best; }, mervData[0]);
            var mervAnnualCost = Math.round(mervCurrent.cost * (365 / parseInt(mervCurrent.life)));

            // Water pressure data
            var psiStatus = hsPsi < 30 ? 'Too Low' : hsPsi < 40 ? 'Low' : hsPsi <= 60 ? 'Normal' : hsPsi <= 80 ? 'High' : 'Dangerously High';
            var psiColor = hsPsi < 30 ? 'red' : hsPsi < 40 ? 'amber' : hsPsi <= 60 ? 'emerald' : hsPsi <= 80 ? 'amber' : 'red';
            var psiEffects = [];
            if (hsPsi < 30) psiEffects.push('Showers barely trickle', 'Dishwasher may not fill', 'Sprinklers won\'t reach');
            if (hsPsi >= 30 && hsPsi < 40) psiEffects.push('Weak shower pressure', 'Upper floors may lose pressure', 'Irrigation struggles');
            if (hsPsi >= 40 && hsPsi <= 60) psiEffects.push('Comfortable shower pressure', 'All fixtures work well', 'Appliances fill properly');
            if (hsPsi > 60 && hsPsi <= 80) psiEffects.push('Strong pressure', 'Faucets may splash', 'Consider a pressure regulator');
            if (hsPsi > 80) psiEffects.push('Pipe joints can leak or burst', 'Appliance valves wear out faster', 'Water hammer (banging pipes)', 'MUST install pressure regulator');

            // Electrical panel knowledge
            var panelItems = [
              { name: 'Main Breaker', amps: '100-200A', desc: 'Master switch — kills ALL power. Usually the big one at the top. Your home\'s total capacity.', icon: '\uD83D\uDD34', category: 'main' },
              { name: 'Standard Breaker (15A)', amps: '15A / 120V', desc: 'Bedrooms, living rooms, general outlets. Max 1,800W per circuit. Most common type.', icon: '\u26AA', category: 'standard' },
              { name: 'Standard Breaker (20A)', amps: '20A / 120V', desc: 'Kitchen, bathroom, laundry, garage. Max 2,400W. Required where water is present.', icon: '\u26AA', category: 'standard' },
              { name: 'Double-Pole (30A)', amps: '30A / 240V', desc: 'Clothes dryer, central A/C. Uses TWO slots in panel. 240V = hot + hot (not neutral).', icon: '\uD83D\uDFE0', category: 'large' },
              { name: 'Double-Pole (50A)', amps: '50A / 240V', desc: 'Electric range/oven, EV charger. Requires heavy-gauge wiring (6 AWG).', icon: '\uD83D\uDFE0', category: 'large' },
              { name: 'GFCI Breaker', amps: '15-20A', desc: 'Ground-Fault Circuit Interrupter. Detects current leaking to ground (shock hazard). Required in wet areas: bathroom, kitchen, outdoor, garage.', icon: '\uD83D\uDFE2', category: 'safety' },
              { name: 'AFCI Breaker', amps: '15-20A', desc: 'Arc-Fault Circuit Interrupter. Detects electrical arcs (fire hazard from damaged wires). Required in bedrooms since 2002.', icon: '\uD83D\uDFE3', category: 'safety' },
              { name: 'Tandem Breaker', amps: '2x15A or 2x20A', desc: 'Two breakers in one slot. Used when the panel is full. Not all panels support these.', icon: '\u26AB', category: 'special' }
            ];

            // Electrical panel quiz scenarios
            var panelQuizzes = [
              { q: 'You\'re installing a bathroom outlet near the sink. What type of breaker is REQUIRED?', answer: 'GFCI Breaker', explain: 'GFCI breakers are required in all wet areas: bathrooms, kitchens, garages, and outdoors. They detect current leaks and trip in milliseconds to prevent shock.', choices: ['Standard 15A', 'GFCI Breaker', 'AFCI Breaker', 'Tandem Breaker'] },
              { q: 'Your clothes dryer needs its own circuit. What voltage and breaker type does it require?', answer: 'Double-Pole (30A)', explain: 'Clothes dryers need 240V power, which requires a double-pole 30A breaker using TWO slots.', choices: ['Standard 15A', 'Standard 20A', 'Double-Pole (30A)', 'GFCI Breaker'] },
              { q: 'A bedroom circuit keeps tripping. The breaker has a purple TEST button. What type is it?', answer: 'AFCI Breaker', explain: 'AFCI breakers detect dangerous electrical arcs from damaged wires. Required in bedrooms since 2002.', choices: ['Standard 15A', 'GFCI Breaker', 'AFCI Breaker', 'Main Breaker'] },
              { q: 'You want to install an EV charger (Level 2). What breaker size do you need?', answer: 'Double-Pole (50A)', explain: 'Level 2 EV chargers need a 50A/240V circuit with heavy 6-gauge wiring and a double-pole breaker.', choices: ['Standard 20A', 'Double-Pole (30A)', 'Double-Pole (50A)', 'Tandem Breaker'] },
              { q: 'Your panel is completely full but you need one more circuit. What can help?', answer: 'Tandem Breaker', explain: 'Tandem breakers fit two circuits into one slot. Not all panels support them - check for CTL limitations.', choices: ['Double-Pole (30A)', 'Main Breaker', 'Tandem Breaker', 'GFCI Breaker'] },
              { q: 'There\'s a burning smell from behind the panel. What should you do FIRST?', answer: 'Main Breaker', explain: 'TURN OFF THE MAIN BREAKER immediately! A burning smell means overheating. Then call an electrician.', choices: ['Standard 15A', 'GFCI Breaker', 'Main Breaker', 'Tandem Breaker'] }
            ];
            var panelCurrentQ = panelQuizzes[hsPanelQ % panelQuizzes.length];

            // â•â•â•â•â•â•â•â•â•â•â•â•â•â• RENDER â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            return React.createElement("div", { className: "max-w-4xl mx-auto space-y-4" },
              // Header
              React.createElement("div", { className: "bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 rounded-2xl p-5 text-white shadow-lg" },
                React.createElement("h2", { className: "text-2xl font-black flex items-center gap-2" }, "\uD83E\uDDED Life Skills Lab"),
                React.createElement("p", { className: "text-sm opacity-90 mt-1" }, "Essential knowledge for adulting \u2014 taxes, data literacy, critical thinking, and the science of everyday life")
              ),
              // Tab bar
              React.createElement("div", { className: "flex flex-wrap gap-2" },
                [{ id: 'paycheck', label: '\uD83E\uDDFE Paycheck & Tax' }, { id: 'data', label: '\uD83D\uDCCA Data Literacy' }, { id: 'decision', label: '\uD83E\uDDE0 Decisions' }, { id: 'contract', label: '\uD83D\uDCDD Contracts' }, { id: 'health', label: '\uD83C\uDFE5 Insurance' }, { id: 'science', label: '\uD83D\uDD2C Applied Science' }].map(function (t) {
                  return React.createElement("button", { key: t.id, onClick: function () { upd('lsTab', t.id); },
                    className: "px-3 py-2 rounded-xl text-xs font-bold transition-all " + (tab === t.id ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg scale-105' : 'bg-white text-slate-600 border border-slate-200 hover:bg-cyan-50 hover:border-cyan-300')
                  }, t.label);
                })
              ),

              // â•â•â• TAB 1: PAYCHECK â•â•â•
              tab === 'paycheck' && React.createElement("div", { className: "bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200" },
                React.createElement("h3", { className: "text-base font-bold text-green-800 mb-1" }, "\uD83E\uDDFE Paycheck & Tax Calculator"),
                React.createElement("p", { className: "text-xs text-green-600 mb-4" }, "See what happens between your gross pay and your bank account"),
                // Controls
                React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4" },
                  React.createElement("div", null,
                    React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Hourly Rate"),
                    React.createElement("input", { type: "number", step: "0.5", value: payRate, onChange: function (e) { upd('payRate', Math.max(0, parseFloat(e.target.value) || 0)); },
                      className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-green-400 outline-none mt-1" })
                  ),
                  React.createElement("div", null,
                    React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Hours/Week"),
                    React.createElement("input", { type: "number", value: payHours, onChange: function (e) { upd('payHours', Math.max(0, parseFloat(e.target.value) || 0)); },
                      className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-green-400 outline-none mt-1" })
                  ),
                  React.createElement("div", null,
                    React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Pay Period"),
                    React.createElement("select", { value: payFreq, onChange: function (e) { upd('payFreq', e.target.value); },
                      className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-green-400 outline-none mt-1" },
                      React.createElement("option", { value: "weekly" }, "Weekly"),
                      React.createElement("option", { value: "biweekly" }, "Bi-weekly"),
                      React.createElement("option", { value: "monthly" }, "Monthly")
                    )
                  ),
                  React.createElement("div", null,
                    React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "State"),
                    React.createElement("select", { value: payState, onChange: function (e) { upd('payState', e.target.value); },
                      className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-green-400 outline-none mt-1" },
                      React.createElement("option", { value: "none" }, "No State Tax"), React.createElement("option", { value: "CA" }, "California"), React.createElement("option", { value: "NY" }, "New York"),
                      React.createElement("option", { value: "TX" }, "Texas (0%)"), React.createElement("option", { value: "FL" }, "Florida (0%)"), React.createElement("option", { value: "WA" }, "Washington (0%)"),
                      React.createElement("option", { value: "ME" }, "Maine"), React.createElement("option", { value: "MA" }, "Massachusetts"), React.createElement("option", { value: "IL" }, "Illinois"),
                      React.createElement("option", { value: "PA" }, "Pennsylvania"), React.createElement("option", { value: "NJ" }, "New Jersey"), React.createElement("option", { value: "OH" }, "Ohio")
                    )
                  ),
                  React.createElement("div", null,
                    React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Filing"),
                    React.createElement("select", { value: payFiling, onChange: function (e) { upd('payFiling', e.target.value); },
                      className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-green-400 outline-none mt-1" },
                      React.createElement("option", { value: "single" }, "Single"),
                      React.createElement("option", { value: "married" }, "Married")
                    )
                  )
                ),
                // Paycheck result cards
                React.createElement("div", { className: "grid grid-cols-3 gap-3 mb-4" },
                  React.createElement("div", { className: "bg-white rounded-xl p-4 text-center border-2 border-green-300" },
                    React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Gross (" + payFreq + ")"),
                    React.createElement("p", { className: "text-2xl font-black text-green-600" }, "$" + Math.round(grossPer).toLocaleString())
                  ),
                  React.createElement("div", { className: "bg-white rounded-xl p-4 text-center border-2 border-red-200" },
                    React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Taxes Taken"),
                    React.createElement("p", { className: "text-2xl font-black text-red-500" }, "-$" + Math.round(totalTax / freqMult).toLocaleString()),
                    React.createElement("p", { className: "text-[9px] text-red-400" }, Math.round(effectiveRate) + "% effective rate")
                  ),
                  React.createElement("div", { className: "bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 text-center border-2 border-emerald-400" },
                    React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Take Home"),
                    React.createElement("p", { className: "text-2xl font-black text-emerald-600" }, "$" + Math.round(netPer).toLocaleString()),
                    React.createElement("p", { className: "text-[9px] text-emerald-500 font-bold" }, "$" + Math.round(netAnnual).toLocaleString() + "/year")
                  )
                ),
                // Visual breakdown bar
                React.createElement("div", { className: "mb-3" },
                  React.createElement("p", { className: "text-[10px] font-bold text-slate-500 mb-1" }, "Where every dollar goes:"),
                  React.createElement("div", { className: "h-6 rounded-full overflow-hidden flex" },
                    React.createElement("div", { style: { width: Math.round((grossAnnual - totalTax) / grossAnnual * 100) + '%', background: 'linear-gradient(90deg, #10b981, #059669)' }, className: "h-full flex items-center justify-center text-[8px] text-white font-bold" }, "Take Home"),
                    React.createElement("div", { style: { width: Math.round(fedTax / grossAnnual * 100) + '%', background: '#ef4444' }, className: "h-full flex items-center justify-center text-[8px] text-white font-bold" }, "Fed"),
                    React.createElement("div", { style: { width: Math.round(ficaTotal / grossAnnual * 100) + '%', background: '#f97316' }, className: "h-full flex items-center justify-center text-[8px] text-white font-bold" }, "FICA"),
                    stateTax > 0 && React.createElement("div", { style: { width: Math.round(stateTax / grossAnnual * 100) + '%', background: '#a855f7' }, className: "h-full flex items-center justify-center text-[8px] text-white font-bold" }, "State")
                  )
                ),
                // Bracket breakdown table
                React.createElement("div", { className: "bg-white rounded-xl border border-slate-200 overflow-hidden" },
                  React.createElement("p", { className: "text-[10px] font-bold text-slate-500 px-3 pt-2" }, "\uD83D\uDCCA Federal Tax Brackets (your income fills each bracket):"),
                  React.createElement("table", { className: "w-full text-xs" },
                    React.createElement("thead", null,
                      React.createElement("tr", { className: "bg-slate-50" },
                        React.createElement("th", { className: "px-3 py-2 text-left font-bold text-slate-500" }, "Rate"),
                        React.createElement("th", { className: "px-3 py-2 text-right font-bold text-slate-500" }, "Taxable"),
                        React.createElement("th", { className: "px-3 py-2 text-right font-bold text-red-500" }, "Tax Owed")
                      )
                    ),
                    React.createElement("tbody", null,
                      bracketBreakdown.map(function (b, i) {
                        return React.createElement("tr", { key: i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                          React.createElement("td", { className: "px-3 py-1.5 font-bold text-slate-600" }, b.rate + "%"),
                          React.createElement("td", { className: "px-3 py-1.5 text-right text-slate-600" }, "$" + Math.round(b.amount).toLocaleString()),
                          React.createElement("td", { className: "px-3 py-1.5 text-right font-bold text-red-500" }, "$" + Math.round(b.tax).toLocaleString())
                        );
                      }),
                      React.createElement("tr", { className: "bg-orange-50 border-t border-orange-200" },
                        React.createElement("td", { className: "px-3 py-1.5 font-bold text-orange-600", colSpan: 2 }, "FICA (SS 6.2% + Medicare 1.45%)"),
                        React.createElement("td", { className: "px-3 py-1.5 text-right font-bold text-orange-500" }, "$" + Math.round(ficaTotal).toLocaleString())
                      ),
                      stateTax > 0 && React.createElement("tr", { className: "bg-purple-50 border-t border-purple-200" },
                        React.createElement("td", { className: "px-3 py-1.5 font-bold text-purple-600", colSpan: 2 }, "State Tax (" + payState + ")"),
                        React.createElement("td", { className: "px-3 py-1.5 text-right font-bold text-purple-500" }, "$" + Math.round(stateTax).toLocaleString())
                      )
                    )
                  )
                ),
                React.createElement("p", { className: "text-[10px] text-center text-slate-400 mt-2" }, "\uD83D\uDCA1 This is a simplified estimate. Real paychecks also deduct health insurance, 401(k), etc.")
              ),

              // â•â•â• TAB 2: DATA LITERACY â•â•â•
              tab === 'data' && React.createElement("div", { className: "bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-200" },
                React.createElement("h3", { className: "text-base font-bold text-indigo-800 mb-1" }, "\uD83D\uDCCA Data Literacy & Media Analysis"),
                React.createElement("p", { className: "text-xs text-indigo-500 mb-4" }, "Can you spot the deception? " + (dlScore > 0 ? '\uD83C\uDFC6 Score: ' + dlScore + '/' + dlScenarios.length : '')),
                // Scenario card
                React.createElement("div", { className: "bg-white rounded-xl p-5 border border-indigo-100 mb-4" },
                  React.createElement("div", { className: "flex items-center justify-between mb-2" },
                    React.createElement("span", { className: "px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-lg text-[10px] font-bold" }, "Scenario " + (dlScenario + 1) + " of " + dlScenarios.length),
                    React.createElement("span", { className: "text-[10px] text-slate-400" }, dlCurrent.title)
                  ),
                  React.createElement("p", { className: "text-sm text-slate-700 mb-4 leading-relaxed" }, dlCurrent.desc),
                  React.createElement("p", { className: "text-xs font-bold text-slate-600 mb-2" }, dlCurrent.question),
                  // Options
                  React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                    dlCurrent.options.map(function (opt, oi) {
                      var isCorrect = oi === dlCurrent.correct;
                      var isSelected = dlAnswer === oi;
                      var revealed = dlRevealed;
                      return React.createElement("button", { key: oi, onClick: function () {
                        if (!dlRevealed) {
                          upd('dlAnswer', oi);
                          upd('dlRevealed', true);
                          if (oi === dlCurrent.correct) upd('dlScore', dlScore + 1);
                        }
                      }, className: "px-3 py-2 rounded-xl text-xs font-bold text-left transition-all border-2 " +
                        (revealed && isCorrect ? 'border-emerald-400 bg-emerald-50 text-emerald-700' :
                         revealed && isSelected && !isCorrect ? 'border-red-400 bg-red-50 text-red-700' :
                         'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50')
                      }, (revealed && isCorrect ? '\u2705 ' : revealed && isSelected && !isCorrect ? '\u274C ' : '') + opt);
                    })
                  )
                ),
                // Explanation
                dlRevealed && React.createElement("div", { className: "bg-indigo-100 rounded-xl p-4 border border-indigo-200 mb-4" },
                  React.createElement("p", { className: "text-xs font-bold text-indigo-700 mb-1" }, dlAnswer === dlCurrent.correct ? '\uD83C\uDF89 Correct!' : '\uD83E\uDD14 Not quite...'),
                  React.createElement("p", { className: "text-xs text-indigo-600" }, dlCurrent.explain)
                ),
                // Navigation
                React.createElement("div", { className: "flex gap-2 justify-center" },
                  React.createElement("button", { onClick: function () {
                    var next = (dlScenario + 1) % dlScenarios.length;
                    upd('dlScenario', next); upd('dlAnswer', null); upd('dlRevealed', false);
                    if (next === 0) upd('dlScore', 0);
                  }, className: "px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-colors" },
                    dlScenario < dlScenarios.length - 1 ? 'Next Scenario \u2192' : '\uD83D\uDD04 Start Over'
                  )
                )
              ),


              // â•â•â• TAB 3: DECISION MATRIX â•â•â•
              tab === 'decision' && React.createElement("div", { className: "bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-5 border border-amber-200" },
                React.createElement("h3", { className: "text-base font-bold text-amber-800 mb-1" }, "\uD83E\uDDE0 Decision Matrix"),
                React.createElement("p", { className: "text-xs text-amber-600 mb-4" }, "Make better decisions by scoring options against weighted criteria"),
                // Options input
                React.createElement("div", { className: "mb-3" },
                  React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase mb-1" }, "Your Options (click to edit)"),
                  React.createElement("div", { className: "flex flex-wrap gap-2" },
                    dmOptions.map(function (opt, oi) {
                      return React.createElement("input", { key: oi, value: opt, onChange: function (e) {
                        var newOpts = dmOptions.slice(); newOpts[oi] = e.target.value; upd('dmOptions', newOpts);
                      }, className: "px-3 py-1.5 border border-amber-200 rounded-lg text-xs font-bold w-28 focus:ring-2 focus:ring-amber-400 outline-none" });
                    }),
                    dmOptions.length < 5 && React.createElement("button", { onClick: function () { upd('dmOptions', dmOptions.concat(['Option ' + String.fromCharCode(65 + dmOptions.length)])); },
                      className: "px-3 py-1.5 border-2 border-dashed border-amber-300 rounded-lg text-xs font-bold text-amber-500 hover:bg-amber-50" }, "+")
                  )
                ),
                // Criteria input
                React.createElement("div", { className: "mb-3" },
                  React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase mb-1" }, "Criteria & Weights (1=low, 5=critical)"),
                  React.createElement("div", { className: "space-y-2" },
                    dmCriteria.map(function (c, ci) {
                      return React.createElement("div", { key: ci, className: "flex items-center gap-2" },
                        React.createElement("input", { value: c.name, onChange: function (e) {
                          var nc = dmCriteria.slice(); nc[ci] = Object.assign({}, nc[ci], { name: e.target.value }); upd('dmCriteria', nc);
                        }, className: "px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold w-28 focus:ring-2 focus:ring-amber-400 outline-none" }),
                        React.createElement("input", { type: "range", min: 1, max: 5, value: c.weight, onChange: function (e) {
                          var nc = dmCriteria.slice(); nc[ci] = Object.assign({}, nc[ci], { weight: parseInt(e.target.value) }); upd('dmCriteria', nc);
                        }, className: "flex-1", style: { accentColor: '#f59e0b' } }),
                        React.createElement("span", { className: "text-xs font-black text-amber-600 w-6 text-center" }, c.weight),
                        dmCriteria.length > 2 && React.createElement("button", { onClick: function () {
                          upd('dmCriteria', dmCriteria.filter(function (_, i) { return i !== ci; }));
                        }, className: "text-red-400 hover:text-red-600 text-xs" }, "\u2716")
                      );
                    }),
                    dmCriteria.length < 7 && React.createElement("button", { onClick: function () {
                      upd('dmCriteria', dmCriteria.concat([{ name: 'Criteria ' + (dmCriteria.length + 1), weight: 3 }]));
                    }, className: "text-[10px] text-amber-500 font-bold hover:text-amber-700" }, "+ Add Criteria")
                  )
                ),
                // Scoring matrix
                React.createElement("div", { className: "bg-white rounded-xl border border-slate-200 overflow-x-auto mb-4" },
                  React.createElement("table", { className: "w-full text-xs" },
                    React.createElement("thead", null,
                      React.createElement("tr", { className: "bg-slate-50" },
                        React.createElement("th", { className: "px-3 py-2 text-left font-bold text-slate-500" }, "Criteria (weight)"),
                        dmOptions.map(function (opt, oi) {
                          return React.createElement("th", { key: oi, className: "px-3 py-2 text-center font-bold text-amber-600" }, opt);
                        })
                      )
                    ),
                    React.createElement("tbody", null,
                      dmCriteria.map(function (c, ci) {
                        return React.createElement("tr", { key: ci, className: ci % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                          React.createElement("td", { className: "px-3 py-1.5 font-bold text-slate-600" }, c.name + " (\u00D7" + c.weight + ")"),
                          dmOptions.map(function (opt, oi) {
                            var key = oi + '-' + ci;
                            var score = dmScores[key] || 3;
                            return React.createElement("td", { key: oi, className: "px-3 py-1.5 text-center" },
                              React.createElement("select", { value: score, onChange: function (e) {
                                var ns = Object.assign({}, dmScores); ns[key] = parseInt(e.target.value); upd('dmScores', ns);
                              }, className: "px-2 py-1 border border-slate-200 rounded text-xs font-bold w-16 text-center" },
                                [1, 2, 3, 4, 5].map(function (v) { return React.createElement("option", { key: v, value: v }, v); })
                              )
                            );
                          })
                        );
                      })
                    )
                  )
                ),
                // Results
                React.createElement("div", { className: "space-y-2" },
                  React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "\uD83C\uDFC6 Results (weighted scores)"),
                  dmTotals.map(function (d, di) {
                    var pct = dmMaxTotal > 0 ? d.total / dmMaxTotal * 100 : 0;
                    return React.createElement("div", { key: di, className: "flex items-center gap-3" },
                      React.createElement("span", { className: "text-xs font-bold w-20 text-right " + (di === 0 ? 'text-amber-600' : 'text-slate-500') }, d.option),
                      React.createElement("div", { className: "flex-1 bg-slate-100 rounded-full h-6 overflow-hidden" },
                        React.createElement("div", { style: { width: pct + '%', transition: 'width 0.3s' },
                          className: "h-full rounded-full flex items-center justify-end pr-2 text-[10px] text-white font-bold " + (di === 0 ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-slate-300') },
                          d.total
                        )
                      ),
                      di === 0 && React.createElement("span", { className: "text-xs" }, "\uD83E\uDD47")
                    );
                  })
                )
              ),

              // â•â•â• TAB 4: CONTRACT READER â•â•â•
              tab === 'contract' && React.createElement("div", { className: "bg-gradient-to-br from-orange-50 to-rose-50 rounded-xl p-5 border border-orange-200" },
                React.createElement("h3", { className: "text-base font-bold text-orange-800 mb-1" }, "\uD83D\uDCDD Contract & Fine Print Reader"),
                React.createElement("p", { className: "text-xs text-orange-600 mb-1" }, "Can you spot ALL the traps? Find " + crCurrent.traps.length + " hidden fees/gotchas."),
                React.createElement("p", { className: "text-xs font-bold text-orange-500 mb-4" }, crCurrent.title + " \u2014 Found: " + crFound.length + "/" + crCurrent.traps.length),
                // Contract text
                React.createElement("div", { className: "bg-white rounded-xl p-4 border border-slate-200 mb-4 text-sm text-slate-700 leading-relaxed font-serif" },
                  crCurrent.text
                ),
                // Trap finder buttons
                React.createElement("div", { className: "grid grid-cols-2 gap-2 mb-4" },
                  crCurrent.traps.map(function (trap) {
                    var found = crFound.indexOf(trap.id) !== -1;
                    return React.createElement("button", { key: trap.id, onClick: function () {
                      if (!found) upd('crFound', crFound.concat([trap.id]));
                    }, className: "px-3 py-2 rounded-xl text-xs font-bold text-left transition-all border-2 " +
                      (found ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-orange-200 bg-white text-orange-600 hover:border-orange-400 hover:bg-orange-50')
                    }, found ? '\u2705 ' + trap.hint : '\uD83D\uDD0D ' + trap.hint);
                  })
                ),
                // Explanations for found traps
                crFound.length > 0 && React.createElement("div", { className: "space-y-2 mb-4" },
                  crCurrent.traps.filter(function (t) { return crFound.indexOf(t.id) !== -1; }).map(function (trap) {
                    return React.createElement("div", { key: trap.id, className: "bg-orange-100 rounded-xl p-3 border border-orange-200" },
                      React.createElement("p", { className: "text-xs font-bold text-orange-700" }, "\u26A0\uFE0F " + trap.hint),
                      React.createElement("p", { className: "text-xs text-orange-600 mt-1" }, trap.explain)
                    );
                  })
                ),
                // Reveal all & next
                React.createElement("div", { className: "flex gap-2 justify-center" },
                  !crRevealed && crFound.length < crCurrent.traps.length && React.createElement("button", { onClick: function () {
                    upd('crRevealed', true);
                    upd('crFound', crCurrent.traps.map(function (t) { return t.id; }));
                  }, className: "px-3 py-2 bg-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-300" }, "Reveal All"),
                  React.createElement("button", { onClick: function () {
                    upd('crLevel', crLevel + 1); upd('crFound', []); upd('crRevealed', false);
                  }, className: "px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors" },
                    crLevel < crContracts.length - 1 ? 'Next Contract \u2192' : '\uD83D\uDD04 Start Over')
                )
              ),

              // â•â•â• TAB 5: HEALTH INSURANCE â•â•â•
              tab === 'health' && React.createElement("div", { className: "bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl p-5 border border-sky-200" },
                React.createElement("h3", { className: "text-base font-bold text-sky-800 mb-1" }, "\uD83C\uDFE5 Health Insurance Navigator"),
                React.createElement("p", { className: "text-xs text-sky-600 mb-4" }, "Compare two plans \u2014 the cheapest premium isn't always the best deal"),
                // Usage scenario selector
                React.createElement("div", { className: "flex gap-2 mb-4 justify-center" },
                  [{ id: 'low', label: '\uD83D\uDE4B Healthy (2 visits)', color: 'emerald' }, { id: 'medium', label: '\uD83E\uDE7A Moderate (6 visits)', color: 'amber' }, { id: 'high', label: '\uD83C\uDFE5 Heavy (12 visits)', color: 'rose' }].map(function (u) {
                    return React.createElement("button", { key: u.id, onClick: function () { upd('hiUsage', u.id); },
                      className: "px-3 py-2 rounded-xl text-xs font-bold transition-all " + (hiUsage === u.id ? 'bg-sky-500 text-white shadow-md' : 'bg-white text-sky-600 border border-sky-200 hover:bg-sky-50')
                    }, u.label);
                  })
                ),
                // Plan cards side-by-side
                React.createElement("div", { className: "grid grid-cols-2 gap-4 mb-4" },
                  [{ plan: hiPlanA, label: 'Plan A', cost: hiCostA, key: 'hiPlanA', color: 'blue' }, { plan: hiPlanB, label: 'Plan B', cost: hiCostB, key: 'hiPlanB', color: 'violet' }].map(function (p) {
                    var isBetter = (p.label === 'Plan A' && hiBetter === 'A') || (p.label === 'Plan B' && hiBetter === 'B');
                    return React.createElement("div", { key: p.label, className: "bg-white rounded-xl p-4 border-2 " + (isBetter ? 'border-emerald-400' : 'border-slate-200') },
                      isBetter && React.createElement("span", { className: "text-[9px] font-bold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full" }, "\u2B50 Best Value"),
                      React.createElement("p", { className: "text-sm font-bold text-slate-700 mt-1" }, p.label),
                      React.createElement("div", { className: "space-y-2 mt-2" },
                        [{ label: 'Monthly Premium', val: p.plan.premium, field: 'premium' }, { label: 'Deductible', val: p.plan.deductible, field: 'deductible' }, { label: 'Copay', val: p.plan.copay, field: 'copay' }, { label: 'Coinsurance %', val: p.plan.coinsurance, field: 'coinsurance' }, { label: 'Max Out-of-Pocket', val: p.plan.oop, field: 'oop' }].map(function (f) {
                          return React.createElement("div", { key: f.field, className: "flex items-center justify-between" },
                            React.createElement("span", { className: "text-[10px] text-slate-500" }, f.label),
                            React.createElement("input", { type: "number", value: f.val, onChange: function (e) {
                              var np = Object.assign({}, p.plan); np[f.field] = Math.max(0, parseFloat(e.target.value) || 0); upd(p.key, np);
                            }, className: "w-16 text-right px-1 py-0.5 border border-slate-200 rounded text-xs font-bold focus:ring-1 focus:ring-sky-400 outline-none" })
                          );
                        })
                      ),
                      React.createElement("hr", { className: "my-2 border-slate-100" }),
                      React.createElement("div", { className: "text-center" },
                        React.createElement("p", { className: "text-[9px] text-slate-400" }, "Annual Premiums: $" + p.cost.annualPremium.toLocaleString()),
                        React.createElement("p", { className: "text-[9px] text-slate-400" }, "Out-of-Pocket: $" + p.cost.outOfPocket.toLocaleString()),
                        React.createElement("p", { className: "text-lg font-black " + (isBetter ? 'text-emerald-600' : 'text-slate-500') }, "Total: $" + p.cost.total.toLocaleString())
                      )
                    );
                  })
                ),
                // Vocab explainer
                React.createElement("div", { className: "bg-sky-100 rounded-xl p-4 border border-sky-200" },
                  React.createElement("p", { className: "text-[10px] font-bold text-sky-700 mb-2" }, "\uD83D\uDCD6 Key Terms:"),
                  React.createElement("div", { className: "grid grid-cols-2 gap-2 text-[10px]" },
                    React.createElement("p", { className: "text-sky-600" }, React.createElement("strong", null, "Premium"), " \u2014 Monthly bill you pay no matter what"),
                    React.createElement("p", { className: "text-sky-600" }, React.createElement("strong", null, "Deductible"), " \u2014 What you pay before insurance kicks in"),
                    React.createElement("p", { className: "text-sky-600" }, React.createElement("strong", null, "Copay"), " \u2014 Flat fee per doctor visit"),
                    React.createElement("p", { className: "text-sky-600" }, React.createElement("strong", null, "Coinsurance"), " \u2014 % you pay after deductible is met"),
                    React.createElement("p", { className: "text-sky-600" }, React.createElement("strong", null, "Out-of-Pocket Max"), " \u2014 The MOST you'll pay in a year (safety net)"),
                    React.createElement("p", { className: "text-sky-600" }, React.createElement("strong", null, "In-Network"), " \u2014 Doctors/hospitals your plan has deals with (cheaper)")
                  )
                )
              ),

              // â•â•â• TAB 6: APPLIED SCIENCE â•â•â•
              tab === 'science' && React.createElement("div", { className: "bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-5 border border-teal-200" },
                React.createElement("h3", { className: "text-base font-bold text-teal-800 mb-1" }, "\uD83D\uDD2C Applied Science for Daily Life"),
                React.createElement("p", { className: "text-xs text-teal-600 mb-4" }, "The physics and chemistry hiding in everyday activities"),
                // Science sub-tabs
                React.createElement("div", { className: "flex flex-wrap gap-2 mb-4" },
                  [{ id: 'tire', label: '\uD83D\uDE97 Gas Laws & Tires' }, { id: 'insulation', label: '\uD83C\uDFE0 Heat & Insulation' }, { id: 'cook', label: '\uD83C\uDF73 Cooking Chemistry' }, { id: 'circuit', label: '\u26A1 Circuits & Wattage' }, { id: 'car', label: '\uD83D\uDD27 Car Care' }, { id: 'plumbing', label: '\uD83E\uDEA0 Plumbing' }, { id: 'home', label: '\uD83C\uDFE0 Home Systems' }].map(function (s) {
                    return React.createElement("button", { key: s.id, onClick: function () { upd('asTab', s.id); },
                      className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all " + (asTab === s.id ? 'bg-teal-500 text-white shadow-md' : 'bg-white text-teal-600 border border-teal-200 hover:bg-teal-50')
                    }, s.label);
                  })
                ),

                // â”€â”€ Tire / Gas Laws â”€â”€
                asTab === 'tire' && React.createElement("div", { className: "space-y-4" },
                  React.createElement("div", { className: "bg-teal-100 rounded-xl p-3 border border-teal-200 text-xs text-teal-700" },
                    React.createElement("strong", null, "Gay-Lussac's Law:"), " At constant volume, P\u2081/T\u2081 = P\u2082/T\u2082. Temperature MUST be in Kelvin!"
                  ),
                  React.createElement("div", { className: "grid grid-cols-3 gap-3" },
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Fill Pressure (PSI)"),
                      React.createElement("input", { type: "number", value: asTireP1, onChange: function (e) { upd('asTireP1', Math.max(1, parseFloat(e.target.value) || 1)); },
                        className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-teal-400 outline-none mt-1" })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Fill Temp (\u00B0F)"),
                      React.createElement("input", { type: "number", value: asTireT1, onChange: function (e) { upd('asTireT1', parseFloat(e.target.value) || 0); },
                        className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-teal-400 outline-none mt-1" })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Current Temp (\u00B0F)"),
                      React.createElement("input", { type: "number", value: asTireT2, onChange: function (e) { upd('asTireT2', parseFloat(e.target.value) || 0); },
                        className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-teal-400 outline-none mt-1" })
                    )
                  ),
                  React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                    React.createElement("div", { className: "bg-white rounded-xl p-4 text-center border border-teal-200" },
                      React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Predicted Pressure"),
                      React.createElement("p", { className: "text-2xl font-black " + (asTireP2 < 30 ? 'text-red-500' : 'text-teal-600') }, (Math.round(asTireP2 * 10) / 10) + " PSI"),
                      React.createElement("p", { className: "text-[10px] " + (tireDrop > 0 ? 'text-red-400' : 'text-emerald-400') + " font-bold" },
                        (tireDrop > 0 ? '\u2B07\uFE0F ' : '\u2B06\uFE0F ') + Math.abs(Math.round(tireDrop * 10) / 10) + " PSI change")
                    ),
                    React.createElement("div", { className: "bg-white rounded-xl p-4 text-center border border-slate-200" },
                      React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "The Math"),
                      React.createElement("p", { className: "text-xs text-slate-600 font-mono mt-1" },
                        asTireP1 + " \u00D7 (" + Math.round(t2K) + "K / " + Math.round(t1K) + "K)"),
                      React.createElement("p", { className: "text-xs text-slate-600 font-mono" }, "= " + (Math.round(asTireP2 * 10) / 10) + " PSI"),
                      React.createElement("p", { className: "text-[9px] text-slate-400 mt-1" }, "Rule of thumb: ~1 PSI per 10\u00B0F change")
                    )
                  )
                ),

                // â”€â”€ Insulation â”€â”€
                asTab === 'insulation' && React.createElement("div", { className: "space-y-4" },
                  React.createElement("div", { className: "bg-teal-100 rounded-xl p-3 border border-teal-200 text-xs text-teal-700" },
                    React.createElement("strong", null, "Heat Transfer:"), " Q = Area \u00D7 \u0394T / R-value (BTU/hr). Higher R-value = less heat loss = lower bills."
                  ),
                  React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3" },
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Wall Area (sq ft)"),
                      React.createElement("input", { type: "number", value: asWallArea, onChange: function (e) { upd('asWallArea', Math.max(1, parseFloat(e.target.value) || 1)); },
                        className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-teal-400 outline-none mt-1" })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "R-Value"),
                      React.createElement("input", { type: "number", value: asRValue, onChange: function (e) { upd('asRValue', Math.max(0.5, parseFloat(e.target.value) || 1)); },
                        className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-teal-400 outline-none mt-1" })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Inside Temp (\u00B0F)"),
                      React.createElement("input", { type: "number", value: asTempIn, onChange: function (e) { upd('asTempIn', parseFloat(e.target.value) || 0); },
                        className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-teal-400 outline-none mt-1" })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Outside Temp (\u00B0F)"),
                      React.createElement("input", { type: "number", value: asTempOut, onChange: function (e) { upd('asTempOut', parseFloat(e.target.value) || 0); },
                        className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-teal-400 outline-none mt-1" })
                    )
                  ),
                  React.createElement("div", { className: "bg-white rounded-xl p-4 border border-teal-200 text-center" },
                    React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Heat Loss Through Wall"),
                    React.createElement("p", { className: "text-2xl font-black text-teal-600" }, Math.round(asHeatLoss).toLocaleString() + " BTU/hr"),
                    React.createElement("p", { className: "text-xs text-slate-500" }, Math.round(asHeatLossDay).toLocaleString() + " BTU/day")
                  ),
                  // R-value comparison
                  React.createElement("div", { className: "space-y-2" },
                    React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "R-Value Comparison (same wall, different materials):"),
                    rValues.map(function (rv) {
                      var loss = asWallArea * (asTempIn - asTempOut) / rv.r;
                      var pct = asHeatLoss > 0 ? loss / (asWallArea * (asTempIn - asTempOut) / 1) * 100 : 0;
                      return React.createElement("div", { key: rv.material, className: "flex items-center gap-2" },
                        React.createElement("span", { className: "text-[10px] font-bold w-32 text-right text-slate-600" }, rv.material),
                        React.createElement("div", { className: "flex-1 bg-slate-100 rounded-full h-4 overflow-hidden" },
                          React.createElement("div", { style: { width: Math.min(100, pct) + '%' },
                            className: "h-full rounded-full bg-" + rv.color + "-400" })
                        ),
                        React.createElement("span", { className: "text-[10px] font-bold text-slate-500 w-20" }, Math.round(loss) + " BTU/hr")
                      );
                    })
                  )
                ),

                // â”€â”€ Cooking Chemistry â”€â”€
                asTab === 'cook' && React.createElement("div", { className: "space-y-4" },
                  React.createElement("div", { className: "bg-teal-100 rounded-xl p-3 border border-teal-200 text-xs text-teal-700" },
                    React.createElement("strong", null, "Kitchen = Chemistry Lab!"), " Drag the temperature to see which chemical reactions are happening in your food."
                  ),
                  React.createElement("div", null,
                    React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Cooking Temperature: " + asCookTemp + "\u00B0F (" + Math.round((asCookTemp - 32) * 5 / 9) + "\u00B0C)"),
                    React.createElement("input", { type: "range", min: 32, max: 500, value: asCookTemp, onChange: function (e) { upd('asCookTemp', parseInt(e.target.value)); },
                      className: "w-full mt-1", style: { accentColor: '#14b8a6' } })
                  ),
                  React.createElement("div", { className: "space-y-2" },
                    cookReactions.map(function (r) {
                      var active = asCookTemp >= r.tempF;
                      return React.createElement("div", { key: r.name, className: "flex items-start gap-3 p-3 rounded-xl transition-all " + (active ? 'bg-white border-2 border-teal-300 shadow-sm' : 'bg-slate-50 border border-slate-200 opacity-50') },
                        React.createElement("span", { className: "text-lg" }, r.icon),
                        React.createElement("div", { className: "flex-1" },
                          React.createElement("div", { className: "flex items-center gap-2" },
                            React.createElement("p", { className: "text-xs font-bold " + (active ? 'text-teal-700' : 'text-slate-400') }, r.name),
                            React.createElement("span", { className: "text-[9px] px-1.5 py-0.5 rounded " + (active ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-400') }, r.tempF + "\u00B0F")
                          ),
                          active && React.createElement("p", { className: "text-[10px] text-slate-600 mt-1" }, r.desc)
                        ),
                        React.createElement("span", { className: "text-xs" }, active ? '\u2705' : '\u26AA')
                      );
                    })
                  )
                ),

                // â”€â”€ Electrical Circuits â”€â”€
                asTab === 'circuit' && React.createElement("div", { className: "space-y-4" },
                  React.createElement("div", { className: "bg-teal-100 rounded-xl p-3 border border-teal-200 text-xs text-teal-700" },
                    React.createElement("strong", null, "Ohm's Law:"), " Power (W) = Voltage (V) \u00D7 Current (A). A 15A breaker at 120V = 1,800W max per circuit."
                  ),
                  React.createElement("div", { className: "grid grid-cols-2 gap-3 mb-3" },
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Voltage"),
                      React.createElement("select", { value: asVolts, onChange: function (e) { upd('asVolts', parseInt(e.target.value)); },
                        className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-teal-400 outline-none mt-1" },
                        React.createElement("option", { value: 120 }, "120V (standard)"),
                        React.createElement("option", { value: 240 }, "240V (dryer/range)")
                      )
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Breaker (Amps)"),
                      React.createElement("select", { value: asAmps, onChange: function (e) { upd('asAmps', parseInt(e.target.value)); },
                        className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-teal-400 outline-none mt-1" },
                        React.createElement("option", { value: 15 }, "15A (most rooms)"),
                        React.createElement("option", { value: 20 }, "20A (kitchen/bath)"),
                        React.createElement("option", { value: 30 }, "30A (dryer)"),
                        React.createElement("option", { value: 50 }, "50A (range)")
                      )
                    )
                  ),
                  React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase mb-2" }, "Click devices to add to circuit (" + asVolts + "V \u00D7 " + asAmps + "A = " + asWatts + "W capacity):"),
                  React.createElement("div", { className: "flex flex-wrap gap-2 mb-3" },
                    commonDevices.map(function (dev) {
                      var isOn = asRunning.indexOf(dev.name) !== -1;
                      return React.createElement("button", { key: dev.name, onClick: function () {
                        if (isOn) {
                          upd('asRunning', asRunning.filter(function (n) { return n !== dev.name; }));
                        } else {
                          upd('asRunning', asRunning.concat([dev.name]));
                        }
                      }, className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 " +
                        (isOn ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-500 hover:border-teal-300')
                      }, (isOn ? '\u26A1 ' : '') + dev.name + " (" + dev.watts + "W)");
                    })
                  ),
                  // Load indicator
                  React.createElement("div", { className: "bg-white rounded-xl p-4 border-2 " + (willTrip ? 'border-red-400' : 'border-slate-200') },
                    React.createElement("div", { className: "flex items-center justify-between mb-2" },
                      React.createElement("span", { className: "text-[10px] font-bold text-slate-500" }, "Circuit Load"),
                      React.createElement("span", { className: "text-xs font-black " + (willTrip ? 'text-red-500' : circuitUsage > 80 ? 'text-amber-500' : 'text-emerald-500') },
                        totalLoad + "W / " + asWatts + "W (" + Math.round(circuitUsage) + "%)")
                    ),
                    React.createElement("div", { className: "h-6 bg-slate-100 rounded-full overflow-hidden" },
                      React.createElement("div", { style: { width: Math.min(100, circuitUsage) + '%', transition: 'width 0.3s' },
                        className: "h-full rounded-full " + (willTrip ? 'bg-gradient-to-r from-red-400 to-red-600 animate-pulse' : circuitUsage > 80 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500') })
                    ),
                    willTrip && React.createElement("p", { className: "text-xs font-bold text-red-500 text-center mt-2 animate-pulse" },
                      "\u26A0\uFE0F BREAKER TRIPPED! Total load (" + totalLoad + "W) exceeds circuit capacity (" + asWatts + "W)")
                  )
                ),

                // ── Car Care Science ──
                asTab === 'car' && React.createElement("div", { className: "space-y-4" },
                  React.createElement("div", { className: "bg-orange-100 rounded-xl p-3 border border-orange-200 text-xs text-orange-700" },
                    React.createElement("strong", null, "Car Care = Applied Science!"), " Understanding your vehicle saves money and keeps you safe."
                  ),
                  // Oil Viscosity Explorer
                  React.createElement("div", { className: "bg-white rounded-xl p-4 border border-slate-200" },
                    React.createElement("h4", { className: "text-xs font-bold text-orange-700 uppercase mb-2" }, "\uD83D\uDEE2\uFE0F Oil Viscosity Explorer"),
                    React.createElement("p", { className: "text-[10px] text-slate-500 mb-2" }, "\u201C5W-30\u201D = viscosity at Winter (cold) temp \u2192 viscosity at Operating (hot) temp. The W number matters for cold starts!"),
                    React.createElement("div", { className: "mb-3" },
                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500" }, "Your Climate Temperature: " + ccOilTemp + "\u00B0F (" + Math.round((ccOilTemp - 32) * 5 / 9) + "\u00B0C)"),
                      React.createElement("input", { type: "range", min: -40, max: 120, value: ccOilTemp, onChange: function (e) { upd('ccOilTemp', parseInt(e.target.value)); },
                        className: "w-full mt-1", style: { accentColor: '#ea580c' } })
                    ),
                    React.createElement("div", { className: "space-y-2" },
                      oilGrades.map(function (g) {
                        var ok = ccOilTemp >= g.minF && ccOilTemp <= g.maxF;
                        return React.createElement("div", { key: g.grade, className: "flex items-start gap-3 p-2 rounded-lg transition-all " + (ok ? 'bg-orange-50 border border-orange-200' : 'bg-slate-50 border border-slate-100 opacity-40') },
                          React.createElement("span", { className: "text-sm font-black w-16 " + (ok ? 'text-orange-600' : 'text-slate-400') }, g.grade),
                          React.createElement("div", { className: "flex-1" },
                            React.createElement("p", { className: "text-[10px] text-slate-600" }, g.desc),
                            React.createElement("p", { className: "text-[9px] text-slate-400" }, "Range: " + g.minF + "\u00B0F to " + g.maxF + "\u00B0F \u2022 " + g.use)
                          ),
                          React.createElement("span", { className: "text-xs" }, ok ? '\u2705' : '\u26AA')
                        );
                      })
                    ),
                    ccRecommended.length > 0 && React.createElement("div", { className: "mt-2 bg-orange-50 rounded-lg p-2 border border-orange-200" },
                      React.createElement("p", { className: "text-[10px] font-bold text-orange-700" }, "\u2705 Recommended for " + ccOilTemp + "\u00B0F: " + ccRecommended.map(function (g) { return g.grade; }).join(', '))
                    )
                  ),
                  // Tire Tread Health
                  React.createElement("div", { className: "bg-white rounded-xl p-4 border border-slate-200" },
                    React.createElement("h4", { className: "text-xs font-bold text-orange-700 uppercase mb-2" }, "\uD83D\uDEB8 Tire Tread Health"),
                    React.createElement("p", { className: "text-[10px] text-slate-500 mb-2" }, "New tire = 10/32\". Legal minimum = 2/32\". The penny test: put a penny in the groove \u2014 if you see all of Lincoln's head, tires are worn."),
                    React.createElement("div", { className: "mb-3" },
                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500" }, "Tread Depth: " + ccTread + "/32\""),
                      React.createElement("input", { type: "range", min: 0, max: 10, value: ccTread, onChange: function (e) { upd('ccTread', parseInt(e.target.value)); },
                        className: "w-full mt-1", style: { accentColor: '#ea580c' } })
                    ),
                    React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3" },
                      React.createElement("div", { className: "text-center p-3 rounded-xl bg-" + treadColor + "-50 border border-" + treadColor + "-200" },
                        React.createElement("p", { className: "text-[10px] font-bold text-slate-500" }, "Status"),
                        React.createElement("p", { className: "text-sm font-black text-" + treadColor + "-600" }, treadStatus)
                      ),
                      React.createElement("div", { className: "text-center p-3 rounded-xl bg-slate-50 border border-slate-200" },
                        React.createElement("p", { className: "text-[10px] font-bold text-slate-500" }, "Tread Life"),
                        React.createElement("p", { className: "text-sm font-black text-slate-700" }, treadLife + "%")
                      ),
                      React.createElement("div", { className: "text-center p-3 rounded-xl bg-slate-50 border border-slate-200" },
                        React.createElement("p", { className: "text-[10px] font-bold text-slate-500" }, "Stop (Dry)"),
                        React.createElement("p", { className: "text-sm font-black text-slate-700" }, treadStopDry + " ft")
                      ),
                      React.createElement("div", { className: "text-center p-3 rounded-xl bg-blue-50 border border-blue-200" },
                        React.createElement("p", { className: "text-[10px] font-bold text-blue-500" }, "Stop (Wet)"),
                        React.createElement("p", { className: "text-sm font-black text-blue-700" }, treadStopWet + " ft")
                      )
                    )
                  ),
                  // Battery CCA
                  React.createElement("div", { className: "bg-white rounded-xl p-4 border border-slate-200" },
                    React.createElement("h4", { className: "text-xs font-bold text-orange-700 uppercase mb-2" }, "\uD83D\uDD0B Battery & Cold Cranking Amps"),
                    React.createElement("p", { className: "text-[10px] text-slate-500 mb-2" }, "Battery capacity drops dramatically in cold weather. CCA (Cold Cranking Amps) = how much power available to start the engine."),
                    React.createElement("div", { className: "mb-3" },
                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500" }, "Outside Temperature: " + ccBattTemp + "\u00B0F (" + Math.round((ccBattTemp - 32) * 5 / 9) + "\u00B0C)"),
                      React.createElement("input", { type: "range", min: -20, max: 110, value: ccBattTemp, onChange: function (e) { upd('ccBattTemp', parseInt(e.target.value)); },
                        className: "w-full mt-1", style: { accentColor: '#ea580c' } })
                    ),
                    React.createElement("div", { className: "grid grid-cols-3 gap-3 mb-3" },
                      React.createElement("div", { className: "text-center p-3 rounded-xl bg-slate-50 border" },
                        React.createElement("p", { className: "text-[10px] font-bold text-slate-500" }, "Rated CCA"),
                        React.createElement("p", { className: "text-lg font-black text-slate-700" }, ccaBattery + "A")
                      ),
                      React.createElement("div", { className: "text-center p-3 rounded-xl " + (ccaWillStart ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200') },
                        React.createElement("p", { className: "text-[10px] font-bold text-slate-500" }, "Available CCA"),
                        React.createElement("p", { className: "text-lg font-black " + (ccaWillStart ? 'text-emerald-600' : 'text-red-500') }, ccaCurrent + "A")
                      ),
                      React.createElement("div", { className: "text-center p-3 rounded-xl bg-slate-50 border" },
                        React.createElement("p", { className: "text-[10px] font-bold text-slate-500" }, "Needed to Start"),
                        React.createElement("p", { className: "text-lg font-black text-slate-700" }, ccaNeeded + "A")
                      )
                    ),
                    React.createElement("div", { className: "h-4 bg-slate-100 rounded-full overflow-hidden" },
                      React.createElement("div", { style: { width: Math.min(100, ccaCurrent / ccaBattery * 100) + '%', transition: 'width 0.3s' },
                        className: "h-full rounded-full " + (ccaWillStart ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-red-400 to-red-600 animate-pulse') })
                    ),
                    !ccaWillStart && React.createElement("p", { className: "text-xs font-bold text-red-500 text-center mt-2" }, "\u26A0\uFE0F Battery may not start! Only " + ccaCurrent + "A available vs " + ccaNeeded + "A needed. Consider a battery warmer or replacement.")
                  ),
                  // Maintenance Schedule
                  React.createElement("div", { className: "bg-white rounded-xl p-4 border border-slate-200" },
                    React.createElement("h4", { className: "text-xs font-bold text-orange-700 uppercase mb-2" }, "\uD83D\uDCC5 Maintenance Schedule"),
                    React.createElement("div", { className: "mb-3" },
                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500" }, "Current Mileage"),
                      React.createElement("input", { type: "number", value: ccMileage, step: 1000, onChange: function (e) { upd('ccMileage', Math.max(0, parseInt(e.target.value) || 0)); },
                        className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-orange-400 outline-none mt-1" })
                    ),
                    React.createElement("div", { className: "space-y-2" },
                      upcomingMaint.length === 0 && React.createElement("p", { className: "text-xs text-slate-400 italic" }, "No services due in the next 10,000 miles!"),
                      upcomingMaint.map(function (m, i) {
                        var urgency = m.milesUntil <= 1000 ? 'border-red-200 bg-red-50' : m.milesUntil <= 5000 ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50';
                        return React.createElement("div", { key: i, className: "flex items-center gap-3 p-2 rounded-lg border " + urgency },
                          React.createElement("span", { className: "text-lg" }, m.icon),
                          React.createElement("div", { className: "flex-1" },
                            React.createElement("p", { className: "text-xs font-bold text-slate-700" }, m.service),
                            React.createElement("p", { className: "text-[10px] text-slate-500" }, "Due at " + m.dueAt.toLocaleString() + " miles (" + m.milesUntil.toLocaleString() + " miles away)")
                          ),
                          React.createElement("span", { className: "text-xs font-bold text-slate-600" }, "~$" + m.cost)
                        );
                      })
                    ),
                    upcomingMaint.length > 0 && React.createElement("div", { className: "mt-2 bg-orange-50 rounded-lg p-2 border border-orange-200" },
                      React.createElement("p", { className: "text-[10px] font-bold text-orange-700" }, "\uD83D\uDCB0 Estimated upcoming cost: $" + upcomingMaint.reduce(function (sum, m) { return sum + m.cost; }, 0))
                    )
                  ),
                  // Dashboard Warning Light Quiz
                  React.createElement("div", { className: "bg-white rounded-xl p-4 border border-slate-200" },
                    React.createElement("h4", { className: "text-xs font-bold text-orange-700 uppercase mb-2" }, "\u26A0\uFE0F Dashboard Light Quiz"),
                    React.createElement("p", { className: "text-[10px] text-slate-500 mb-3" }, "Can you identify what each warning light means?"),
                    React.createElement("div", { className: "text-center mb-3" },
                      React.createElement("span", { className: "text-5xl" }, ccCurrentDash.icon),
                      React.createElement("p", { className: "text-xs text-slate-400 mt-1" }, "Urgency: " + ccCurrentDash.urgency.toUpperCase())
                    ),
                    React.createElement("div", { className: "grid grid-cols-2 gap-2 mb-3" },
                      ccCurrentDash.choices.map(function (ch, ci) {
                        var sel = ccDashAnswer === ci;
                        var rev = ccDashFb != null;
                        var isRight = ch === ccCurrentDash.name;
                        var cls = rev
                          ? (isRight ? 'border-green-500 bg-green-50 text-green-700' : (sel ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 bg-white text-slate-400'))
                          : (sel ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 bg-white text-slate-600 hover:border-orange-300');
                        return React.createElement("button", { key: ci, disabled: rev, onClick: function () { upd('ccDashAnswer', ci); upd('ccDashFb', null); },
                          className: "p-2 rounded-xl border-2 text-xs font-bold transition-all " + cls
                        }, ch);
                      })
                    ),
                    ccDashAnswer != null && !ccDashFb && React.createElement("button", { onClick: function () {
                      var ok = ccCurrentDash.choices[ccDashAnswer] === ccCurrentDash.name;
                      upd('ccDashFb', ok ? '\u2705 Correct! ' + ccCurrentDash.desc : '\u274C Not quite. ' + ccCurrentDash.desc);
                      if (ok && typeof awardStemXP === 'function') awardStemXP('lifeSkills', 15, 'dashboard quiz');
                    }, className: "w-full px-3 py-2 bg-orange-500 text-white font-bold rounded-xl text-xs hover:bg-orange-600 transition-all" }, "Submit"),
                    ccDashFb && React.createElement("div", { className: "rounded-lg p-2 text-[10px] font-medium " + (ccDashFb.startsWith('\u2705') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700') }, ccDashFb),
                    ccDashFb && React.createElement("button", { onClick: function () { upd('ccDashQ', (ccDashQ + 1) % dashLights.length); upd('ccDashAnswer', null); upd('ccDashFb', null); },
                      className: "w-full px-3 py-2 bg-orange-500 text-white font-bold rounded-xl text-xs hover:bg-orange-600 transition-all mt-2" }, "\u27A1\uFE0F Next Light")
                  )
                ),

                // ── Plumbing & Home Repair ──
                asTab === 'plumbing' && React.createElement("div", { className: "space-y-4" },
                  React.createElement("div", { className: "bg-sky-100 rounded-xl p-3 border border-sky-200 text-xs text-sky-700" },
                    React.createElement("strong", null, "Plumbing = Fluid Dynamics!"), " Understanding water pressure, drainage, and pipe materials saves thousands in repairs."
                  ),
                  // Plumbing sub-nav
                  React.createElement("div", { className: "flex flex-wrap gap-2 mb-3" },
                    [{ id: 'toilet', label: '\uD83D\uDEBD Toilet' }, { id: 'pipe', label: '\uD83E\uDEA0 Pipes' }, { id: 'heater', label: '\uD83D\uDD25 Water Heater' }, { id: 'paint', label: '\uD83C\uDFA8 Paint' }, { id: 'quality', label: '\uD83E\uDDEB Water Quality' }, { id: 'usage', label: '\uD83D\uDCA7 Daily Usage' }].map(function (s) {
                      return React.createElement("button", { key: s.id, onClick: function () { upd('plumbTab', s.id); },
                        className: "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all " + (plumbTab === s.id ? 'bg-sky-500 text-white' : 'bg-white text-sky-600 border border-sky-200 hover:bg-sky-50')
                      }, s.label);
                    })
                  ),
                  // How a Toilet Works
                  plumbTab === 'toilet' && React.createElement("div", { className: "space-y-3" },
                    React.createElement("h4", { className: "text-xs font-bold text-sky-700 uppercase" }, "\uD83D\uDEBD How a Toilet Works"),
                    React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2" },
                      toiletParts.map(function (p) {
                        var isSel = plumbSelPart === p.name;
                        return React.createElement("button", { key: p.name, onClick: function () { upd('plumbSelPart', isSel ? null : p.name); },
                          className: "flex items-start gap-2 p-3 rounded-xl border-2 text-left transition-all " + (isSel ? 'bg-sky-50 border-sky-400 shadow-md' : 'bg-white border-slate-200 hover:border-sky-300 hover:bg-sky-50/50') },
                          React.createElement("span", { className: "text-lg" }, p.icon),
                          React.createElement("div", null,
                            React.createElement("p", { className: "text-xs font-bold " + (isSel ? 'text-sky-700' : 'text-slate-700') }, p.name),
                            React.createElement("p", { className: "text-[10px] " + (isSel ? 'text-sky-600' : 'text-slate-500') }, p.desc),
                            isSel && React.createElement("p", { className: "text-[10px] text-sky-500 font-bold mt-1 italic" }, "\uD83D\uDCA1 Tip: " + (
                              p.name === 'Fill Valve' ? 'If water keeps running, this is usually the culprit. ~$8 fix.' :
                              p.name === 'Flapper' ? 'Most common leak cause. Add food coloring to tank — if bowl turns color, replace flapper (~$5).' :
                              p.name === 'Float' ? 'Adjust the float to set water level about 1 inch below overflow tube.' :
                              p.name === 'Flush Valve' ? 'Check the seal where it meets the tank. Worn seals cause slow leaks.' :
                              p.name === 'Wax Ring' ? 'If toilet rocks or smells, the wax ring likely needs replacing. ~$10 part but messy job.' :
                              p.name === 'Supply Line' ? 'Replace braided steel lines every 5-8 years. Burst supply lines cause major water damage.' :
                              'Regular inspection prevents costly repairs.'
                            ))
                          )
                        );
                      })
                    ),

                    // Diagnosis Quiz
                    React.createElement("div", { className: "bg-sky-50 rounded-xl p-4 border border-sky-200" },
                      React.createElement("p", { className: "text-xs font-bold text-sky-700 mb-2" }, "\uD83D\uDD0D Diagnose the Problem:"),
                      React.createElement("p", { className: "text-sm text-slate-700 font-medium mb-3" }, "\"" + toiletCurrent.symptom + "\""),
                      React.createElement("div", { className: "flex flex-wrap gap-2 mb-2" },
                        toiletParts.map(function (p) {
                          var sel = plumbToiletFb && plumbToiletFb.answer === p.name;
                          var rev = plumbToiletFb != null;
                          var isRight = p.name === toiletCurrent.answer;
                          var cls = rev
                            ? (isRight ? 'border-green-500 bg-green-50 text-green-700' : (sel ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 bg-white text-slate-400'))
                            : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50';
                          return React.createElement("button", { key: p.name, disabled: rev, onClick: function () {
                            var ok = p.name === toiletCurrent.answer;
                            upd('plumbToiletFb', { answer: p.name, ok: ok, msg: ok ? '\u2705 Correct! ' + toiletCurrent.explain : '\u274C Not quite. ' + toiletCurrent.explain });
                            if (ok && typeof awardStemXP === 'function') awardStemXP('lifeSkills', 15, 'toilet diagnosis');
                          }, className: "px-3 py-1.5 rounded-lg border-2 text-[10px] font-bold transition-all " + cls }, p.icon + ' ' + p.name);
                        })
                      ),
                      plumbToiletFb && React.createElement("div", { className: "rounded-lg p-2 text-[10px] font-medium mt-2 " + (plumbToiletFb.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700') }, plumbToiletFb.msg),
                      plumbToiletFb && React.createElement("button", { onClick: function () { upd('plumbToiletQ', (plumbToiletQ + 1) % toiletProblems.length); upd('plumbToiletFb', null); },
                        className: "w-full px-3 py-1.5 bg-sky-500 text-white font-bold rounded-lg text-xs mt-2 hover:bg-sky-600 transition-all" }, "\u27A1\uFE0F Next Problem")
                    )
                  ),
                  // Pipe Material Guide
                  plumbTab === 'pipe' && React.createElement("div", { className: "space-y-3" },
                    React.createElement("h4", { className: "text-xs font-bold text-sky-700 uppercase" }, "\uD83E\uDEA0 Pipe Material Selector"),
                    React.createElement("p", { className: "text-[10px] text-slate-500 mb-2" }, "Different situations need different pipes. Can you pick the right material?"),
                    React.createElement("div", { className: "bg-sky-50 rounded-xl p-4 border border-sky-200" },
                      React.createElement("p", { className: "text-xs font-bold text-slate-500 mb-1" }, "Scenario:"),
                      React.createElement("p", { className: "text-sm text-slate-700 font-medium mb-3" }, pipeCurrent.scenario),
                      React.createElement("div", { className: "grid grid-cols-2 gap-2 mb-2" },
                        pipeCurrent.choices.map(function (ch, ci) {
                          var sel = plumbPipeAnswer === ci;
                          var rev = plumbPipeFb != null;
                          var isRight = ch === pipeCurrent.answer;
                          var cls = rev
                            ? (isRight ? 'border-green-500 bg-green-50 text-green-700' : (sel ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 bg-white text-slate-400'))
                            : (sel ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300');
                          return React.createElement("button", { key: ci, disabled: rev, onClick: function () { upd('plumbPipeAnswer', ci); upd('plumbPipeFb', null); },
                            className: "p-2 rounded-xl border-2 text-xs font-bold transition-all " + cls }, ch);
                        })
                      ),
                      plumbPipeAnswer != null && !plumbPipeFb && React.createElement("button", { onClick: function () {
                        var ok = pipeCurrent.choices[plumbPipeAnswer] === pipeCurrent.answer;
                        upd('plumbPipeFb', ok ? '\u2705 Correct! ' + pipeCurrent.explain : '\u274C Not quite. ' + pipeCurrent.explain);
                        if (ok && typeof awardStemXP === 'function') awardStemXP('lifeSkills', 15, 'pipe material quiz');
                      }, className: "w-full px-3 py-1.5 bg-sky-500 text-white font-bold rounded-lg text-xs hover:bg-sky-600 transition-all" }, "Submit"),
                      plumbPipeFb && React.createElement("div", { className: "rounded-lg p-2 text-[10px] font-medium mt-2 " + (plumbPipeFb.startsWith('\u2705') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700') }, plumbPipeFb),
                      plumbPipeFb && React.createElement("button", { onClick: function () { upd('plumbPipeQ', (plumbPipeQ + 1) % pipeScenarios.length); upd('plumbPipeAnswer', null); upd('plumbPipeFb', null); },
                        className: "w-full px-3 py-1.5 bg-sky-500 text-white font-bold rounded-lg text-xs mt-2 hover:bg-sky-600 transition-all" }, "\u27A1\uFE0F Next Scenario")
                    )
                  ),
                  // Water Heater Calculator
                  plumbTab === 'heater' && React.createElement("div", { className: "space-y-3" },
                    React.createElement("h4", { className: "text-xs font-bold text-sky-700 uppercase" }, "\uD83D\uDD25 Tank vs Tankless Water Heater"),
                    React.createElement("div", { className: "grid grid-cols-2 gap-3 mb-3" },
                      React.createElement("div", null,
                        React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Tank Size (gallons)"),
                        React.createElement("select", { value: whGallons, onChange: function (e) { upd('whGallons', parseInt(e.target.value)); },
                          className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-sky-400 outline-none mt-1" },
                          React.createElement("option", { value: 30 }, "30 gal (small)"),
                          React.createElement("option", { value: 40 }, "40 gal (1-2 people)"),
                          React.createElement("option", { value: 50 }, "50 gal (2-3 people)"),
                          React.createElement("option", { value: 65 }, "65 gal (3-4 people)"),
                          React.createElement("option", { value: 80 }, "80 gal (5+ people)")
                        )
                      ),
                      React.createElement("div", null,
                        React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "People in Household"),
                        React.createElement("input", { type: "number", min: 1, max: 8, value: whPeople, onChange: function (e) { upd('whPeople', Math.max(1, Math.min(8, parseInt(e.target.value) || 1))); },
                          className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-sky-400 outline-none mt-1" })
                      )
                    ),
                    React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                      React.createElement("div", { className: "bg-blue-50 rounded-xl p-4 border border-blue-200" },
                        React.createElement("h5", { className: "text-xs font-bold text-blue-700 mb-2" }, "\uD83C\uDFF7\uFE0F Tank (Traditional)"),
                        React.createElement("p", { className: "text-xl font-black text-blue-600" }, "$" + whTankMonthly + "/mo"),
                        React.createElement("p", { className: "text-[10px] text-blue-500" }, "$" + whTankAnnual + "/year energy"),
                        React.createElement("p", { className: "text-[10px] text-slate-500" }, "Upfront: ~$" + whTankCost),
                        React.createElement("p", { className: "text-[10px] text-slate-400" }, "Lifespan: 8-12 years")
                      ),
                      React.createElement("div", { className: "bg-orange-50 rounded-xl p-4 border border-orange-200" },
                        React.createElement("h5", { className: "text-xs font-bold text-orange-700 mb-2" }, "\u26A1 Tankless (On-Demand)"),
                        React.createElement("p", { className: "text-xl font-black text-orange-600" }, "$" + whTanklessMonthly + "/mo"),
                        React.createElement("p", { className: "text-[10px] text-orange-500" }, "$" + whTanklessAnnual + "/year energy"),
                        React.createElement("p", { className: "text-[10px] text-slate-500" }, "Upfront: ~$" + whTanklessUpfront),
                        React.createElement("p", { className: "text-[10px] text-slate-400" }, "Lifespan: 15-20 years")
                      )
                    ),
                    React.createElement("div", { className: "bg-emerald-50 rounded-lg p-3 border border-emerald-200" },
                      React.createElement("p", { className: "text-[10px] font-bold text-emerald-700" }, "\uD83D\uDCCA ", whPayback < 50 ? 'Tankless breaks even in ~' + whPayback + ' years. ' + (whPayback <= 5 ? 'Strong investment!' : whPayback <= 10 ? 'Worth considering.' : 'Long payback period.') : 'Tank is more cost-effective for this scenario.')
                    )
                  ),
                  // Paint Calculator
                  plumbTab === 'paint' && React.createElement("div", { className: "space-y-3" },
                    React.createElement("h4", { className: "text-xs font-bold text-sky-700 uppercase" }, "\uD83C\uDFA8 Room Paint Calculator"),
                    React.createElement("p", { className: "text-[10px] text-slate-500 mb-2" }, "One gallon covers ~350 sq ft. Always buy a little extra for touch-ups!"),
                    React.createElement("div", { className: "grid grid-cols-3 sm:grid-cols-5 gap-3 mb-3" },
                      React.createElement("div", null,
                        React.createElement("label", { className: "text-[10px] font-bold text-slate-500" }, "Length (ft)"),
                        React.createElement("input", { type: "number", value: paintL, onChange: function (e) { upd('paintL', Math.max(1, parseFloat(e.target.value) || 1)); },
                          className: "w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-sky-400 outline-none mt-1" })
                      ),
                      React.createElement("div", null,
                        React.createElement("label", { className: "text-[10px] font-bold text-slate-500" }, "Width (ft)"),
                        React.createElement("input", { type: "number", value: paintW, onChange: function (e) { upd('paintW', Math.max(1, parseFloat(e.target.value) || 1)); },
                          className: "w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-sky-400 outline-none mt-1" })
                      ),
                      React.createElement("div", null,
                        React.createElement("label", { className: "text-[10px] font-bold text-slate-500" }, "Height (ft)"),
                        React.createElement("input", { type: "number", value: paintH, onChange: function (e) { upd('paintH', Math.max(1, parseFloat(e.target.value) || 1)); },
                          className: "w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-sky-400 outline-none mt-1" })
                      ),
                      React.createElement("div", null,
                        React.createElement("label", { className: "text-[10px] font-bold text-slate-500" }, "Windows"),
                        React.createElement("input", { type: "number", min: 0, value: paintWindows, onChange: function (e) { upd('paintWindows', Math.max(0, parseInt(e.target.value) || 0)); },
                          className: "w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-sky-400 outline-none mt-1" })
                      ),
                      React.createElement("div", null,
                        React.createElement("label", { className: "text-[10px] font-bold text-slate-500" }, "Doors"),
                        React.createElement("input", { type: "number", min: 0, value: paintDoors, onChange: function (e) { upd('paintDoors', Math.max(0, parseInt(e.target.value) || 0)); },
                          className: "w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-sky-400 outline-none mt-1" })
                      )
                    ),
                    React.createElement("div", { className: "flex items-center gap-3 mb-2" },
                      React.createElement("span", { className: "text-[10px] font-bold text-slate-500" }, "Coats:"),
                      [1, 2, 3].map(function (c) {
                        return React.createElement("button", { key: c, onClick: function () { upd('paintCoats', c); },
                          className: "px-3 py-1 rounded-lg text-xs font-bold " + (paintCoats === c ? 'bg-sky-500 text-white' : 'bg-white text-slate-600 border border-slate-200') }, c + (c === 1 ? ' coat' : ' coats'));
                      })
                    ),
                    React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3" },
                      React.createElement("div", { className: "text-center p-3 rounded-xl bg-slate-50 border" },
                        React.createElement("p", { className: "text-[10px] font-bold text-slate-500" }, "Wall Area"),
                        React.createElement("p", { className: "text-lg font-black text-slate-700" }, paintWallArea + " ft\u00B2")
                      ),
                      React.createElement("div", { className: "text-center p-3 rounded-xl bg-slate-50 border" },
                        React.createElement("p", { className: "text-[10px] font-bold text-slate-500" }, "Paintable Area"),
                        React.createElement("p", { className: "text-lg font-black text-slate-700" }, paintNetArea + " ft\u00B2")
                      ),
                      React.createElement("div", { className: "text-center p-3 rounded-xl bg-sky-50 border border-sky-200" },
                        React.createElement("p", { className: "text-[10px] font-bold text-sky-500" }, "Gallons Needed"),
                        React.createElement("p", { className: "text-2xl font-black text-sky-600" }, paintGallons)
                      ),
                      React.createElement("div", { className: "text-center p-3 rounded-xl bg-emerald-50 border border-emerald-200" },
                        React.createElement("p", { className: "text-[10px] font-bold text-emerald-500" }, "Cost Range"),
                        React.createElement("p", { className: "text-sm font-black text-emerald-600" }, "$" + paintCostBudget + " \u2013 $" + paintCostPremium)
                      )
                    )
                  ),
                  // Water Quality / Hardness Guide
                  plumbTab === 'quality' && React.createElement("div", { className: "space-y-3" },
                    React.createElement("h4", { className: "text-xs font-bold text-sky-700 uppercase" }, "\uD83E\uDDEB Water Quality & Hardness Guide"),
                    React.createElement("p", { className: "text-[10px] text-slate-500 mb-2" }, "Water hardness is measured in GPG (Grains Per Gallon). Hard water contains dissolved calcium and magnesium from rock."),
                    React.createElement("div", { className: "mb-3" },
                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500" }, "Water Hardness: " + wqHardness + " GPG \u2014 " + wqHardLabel),
                      React.createElement("input", { type: "range", min: 0, max: 25, step: 0.5, value: wqHardness, onChange: function (e) { upd('wqHardness', parseFloat(e.target.value)); },
                        className: "w-full h-2 bg-gradient-to-r from-emerald-200 via-amber-200 to-red-300 rounded-full appearance-none cursor-pointer mt-1" })
                    ),
                    // Hardness gauge SVG
                    React.createElement("div", { className: "flex justify-center mb-2" },
                      React.createElement("svg", { width: 220, height: 130, viewBox: "0 0 220 130" },
                        // background arcs
                        [{ start: 0, end: 14, color: '#10b981' }, { start: 14, end: 28, color: '#38bdf8' }, { start: 28, end: 42, color: '#f59e0b' }, { start: 42, end: 56, color: '#ef4444' }].map(function (seg, idx) {
                          var r = 90; var cx = 110; var cy = 110;
                          var a1 = Math.PI + (seg.start / 56) * Math.PI;
                          var a2 = Math.PI + (seg.end / 56) * Math.PI;
                          var x1 = cx + r * Math.cos(a1); var y1 = cy + r * Math.sin(a1);
                          var x2 = cx + r * Math.cos(a2); var y2 = cy + r * Math.sin(a2);
                          return React.createElement("path", { key: idx, d: "M " + x1 + " " + y1 + " A " + r + " " + r + " 0 0 1 " + x2 + " " + y2, stroke: seg.color, strokeWidth: 16, fill: "none", strokeLinecap: "round", opacity: 0.3 });
                        }),
                        // needle
                        (function () {
                          var angle = Math.PI + Math.min(wqHardness / 25, 1) * Math.PI;
                          var nx = 110 + 70 * Math.cos(angle); var ny = 110 + 70 * Math.sin(angle);
                          return React.createElement("line", { x1: 110, y1: 110, x2: nx, y2: ny, stroke: "#1e293b", strokeWidth: 3, strokeLinecap: "round", style: { transition: 'all 0.5s ease' } });
                        })(),
                        React.createElement("circle", { cx: 110, cy: 110, r: 5, fill: "#1e293b" }),
                        React.createElement("text", { x: 110, y: 95, textAnchor: "middle", fontSize: 16, fontWeight: 900, fill: wqHardColor === 'emerald' ? '#059669' : wqHardColor === 'sky' ? '#0284c7' : wqHardColor === 'amber' ? '#d97706' : '#dc2626' }, wqHardness + " GPG"),
                        React.createElement("text", { x: 110, y: 80, textAnchor: "middle", fontSize: 10, fontWeight: 700, fill: "#64748b" }, wqHardLabel)
                      )
                    ),
                    // Effects
                    React.createElement("div", { className: "bg-" + wqHardColor + "-50 rounded-xl p-3 border border-" + wqHardColor + "-200" },
                      React.createElement("p", { className: "text-[10px] font-bold text-" + wqHardColor + "-700 mb-1" }, "\uD83D\uDD0D Effects at " + wqHardness + " GPG:"),
                      React.createElement("ul", { className: "text-[10px] text-" + wqHardColor + "-600 space-y-0.5" },
                        wqEffects.map(function (e, i) { return React.createElement("li", { key: i }, "\u2022 " + e); })
                      ),
                      React.createElement("p", { className: "text-[10px] font-bold text-slate-500 mt-2" }, "\u2696\uFE0F Estimated scale buildup in water heater: ~" + wqScaleRate + " lbs/year")
                    ),
                    // Softener comparison
                    React.createElement("div", { className: "space-y-2" },
                      React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Treatment Options Compared:"),
                      wqSofteners.map(function (s) {
                        return React.createElement("div", { key: s.name, className: "bg-white rounded-xl p-3 border border-slate-200" },
                          React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                            React.createElement("span", { className: "text-lg" }, s.icon),
                            React.createElement("span", { className: "text-xs font-bold text-slate-700" }, s.name),
                            React.createElement("span", { className: "ml-auto text-[10px] font-bold text-sky-600" }, s.cost)
                          ),
                          React.createElement("div", { className: "grid grid-cols-2 gap-2 text-[10px]" },
                            React.createElement("div", null,
                              React.createElement("span", { className: "font-bold text-emerald-600" }, "\u2705 "), s.pros
                            ),
                            React.createElement("div", null,
                              React.createElement("span", { className: "font-bold text-red-500" }, "\u26A0\uFE0F "), s.cons
                            )
                          ),
                          React.createElement("p", { className: "text-[9px] text-slate-400 mt-1" }, "Annual cost: " + s.annual + " | Removes: " + s.removes)
                        );
                      })
                    ),
                    React.createElement("div", { className: "bg-sky-50 rounded-lg p-2 border border-sky-200" },
                      React.createElement("p", { className: "text-[10px] text-sky-700" }, "\uD83E\uDD13 ", React.createElement("strong", null, "Chemistry Note:"), " Hard water is caused by dissolved CaCO\u2083 (calcium carbonate) and MgCO\u2083 (magnesium carbonate). Ion-exchange softeners swap Ca\u00B2\u207A/Mg\u00B2\u207A ions for Na\u207A (sodium) ions.")
                    )
                  ),
                  // Water Usage Calculator
                  plumbTab === 'usage' && React.createElement("div", { className: "space-y-3" },
                    React.createElement("h4", { className: "text-xs font-bold text-sky-700 uppercase" }, "\uD83D\uDCA7 Daily Water Usage Calculator"),
                    React.createElement("p", { className: "text-[10px] text-slate-500 mb-2" }, "Track how much water you use daily. The U.S. average is 82 gallons per person per day!"),
                    // Low-flow toggle
                    React.createElement("div", { className: "flex items-center gap-3 mb-2" },
                      React.createElement("button", { onClick: function () { upd('wuLowFlow', !wuLowFlow); },
                        className: "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all " + (wuLowFlow ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 border border-slate-200') },
                        wuLowFlow ? '\u2705 Low-Flow Fixtures ON' : '\uD83D\uDCA7 Standard Fixtures'),
                      React.createElement("span", { className: "text-[9px] text-slate-400" }, wuLowFlow ? "Using WaterSense\u00AE rates (saves ~40%)" : "Using standard fixture rates")
                    ),
                    // Input grid
                    React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3" },
                      React.createElement("div", null,
                        React.createElement("label", { className: "text-[10px] font-bold text-slate-500" }, "\uD83D\uDEBF Shower (min/day)"),
                        React.createElement("input", { type: "number", min: 0, max: 60, value: wuShowerMin, onChange: function (e) { upd('wuShowerMin', Math.max(0, parseInt(e.target.value) || 0)); },
                          className: "w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-sky-400 outline-none mt-1" }),
                        React.createElement("p", { className: "text-[9px] text-slate-400 mt-0.5" }, showerGPM + " GPM \u00D7 " + wuShowerMin + " min = " + wuShowerGal + " gal")
                      ),
                      React.createElement("div", null,
                        React.createElement("label", { className: "text-[10px] font-bold text-slate-500" }, "\uD83D\uDEBF # Showers"),
                        React.createElement("input", { type: "number", min: 0, max: 10, value: wuShowers, onChange: function (e) { upd('wuShowers', Math.max(0, parseInt(e.target.value) || 0)); },
                          className: "w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-sky-400 outline-none mt-1" })
                      ),
                      React.createElement("div", null,
                        React.createElement("label", { className: "text-[10px] font-bold text-slate-500" }, "\uD83D\uDEBD Flushes/day"),
                        React.createElement("input", { type: "number", min: 0, max: 20, value: wuFlushes, onChange: function (e) { upd('wuFlushes', Math.max(0, parseInt(e.target.value) || 0)); },
                          className: "w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-sky-400 outline-none mt-1" }),
                        React.createElement("p", { className: "text-[9px] text-slate-400 mt-0.5" }, toiletGPF + " gal/flush \u00D7 " + wuFlushes + " = " + wuToiletGal + " gal")
                      ),
                      React.createElement("div", null,
                        React.createElement("label", { className: "text-[10px] font-bold text-slate-500" }, "\uD83E\uDD7D Dishwasher loads"),
                        React.createElement("input", { type: "number", min: 0, max: 5, value: wuDishwasher, onChange: function (e) { upd('wuDishwasher', Math.max(0, parseInt(e.target.value) || 0)); },
                          className: "w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-sky-400 outline-none mt-1" })
                      ),
                      React.createElement("div", null,
                        React.createElement("label", { className: "text-[10px] font-bold text-slate-500" }, "\uD83E\uDDFA Laundry loads"),
                        React.createElement("input", { type: "number", min: 0, max: 5, value: wuLaundry, onChange: function (e) { upd('wuLaundry', Math.max(0, parseInt(e.target.value) || 0)); },
                          className: "w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-sky-400 outline-none mt-1" })
                      ),
                      React.createElement("div", null,
                        React.createElement("label", { className: "text-[10px] font-bold text-slate-500" }, "\uD83D\uDEB0 Faucet (min/day)"),
                        React.createElement("input", { type: "number", min: 0, max: 60, value: wuFaucetMin, onChange: function (e) { upd('wuFaucetMin', Math.max(0, parseInt(e.target.value) || 0)); },
                          className: "w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-sky-400 outline-none mt-1" })
                      )
                    ),
                    // Usage breakdown bars
                    React.createElement("div", { className: "space-y-1.5 mb-3" },
                      React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Daily Breakdown:"),
                      [{ label: 'Showers', gal: wuShowerGal, color: 'bg-sky-400' }, { label: 'Toilets', gal: wuToiletGal, color: 'bg-amber-400' }, { label: 'Dishwasher', gal: wuDishGal, color: 'bg-emerald-400' }, { label: 'Laundry', gal: wuLaundryGal, color: 'bg-purple-400' }, { label: 'Faucets', gal: wuFaucetGal, color: 'bg-pink-400' }].map(function (item) {
                        var pct = wuTotalGal > 0 ? Math.round(item.gal / wuTotalGal * 100) : 0;
                        return React.createElement("div", { key: item.label, className: "flex items-center gap-2" },
                          React.createElement("span", { className: "text-[9px] font-bold w-16 text-right text-slate-500" }, item.label),
                          React.createElement("div", { className: "flex-1 bg-slate-100 rounded-full h-4 overflow-hidden" },
                            React.createElement("div", { style: { width: Math.max(pct, 1) + '%', transition: 'width 0.5s ease' }, className: "h-full rounded-full " + item.color + " flex items-center justify-end pr-1" },
                              pct > 10 ? React.createElement("span", { className: "text-[8px] font-bold text-white" }, item.gal + " gal") : null
                            )
                          ),
                          React.createElement("span", { className: "text-[9px] font-bold w-14 text-slate-500" }, item.gal + " gal")
                        );
                      })
                    ),
                    // Summary cards
                    React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3" },
                      React.createElement("div", { className: "text-center p-3 rounded-xl border-2 " + (wuTotalGal > wuNatAvg ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200') },
                        React.createElement("p", { className: "text-[10px] font-bold " + (wuTotalGal > wuNatAvg ? 'text-red-500' : 'text-emerald-500') }, "Your Daily"),
                        React.createElement("p", { className: "text-2xl font-black " + (wuTotalGal > wuNatAvg ? 'text-red-600' : 'text-emerald-600') }, wuTotalGal),
                        React.createElement("p", { className: "text-[9px] text-slate-400" }, "gallons")
                      ),
                      React.createElement("div", { className: "text-center p-3 rounded-xl bg-sky-50 border border-sky-200" },
                        React.createElement("p", { className: "text-[10px] font-bold text-sky-500" }, "Nat'l Average"),
                        React.createElement("p", { className: "text-2xl font-black text-sky-600" }, wuNatAvg),
                        React.createElement("p", { className: "text-[9px] text-slate-400" }, "gal/person/day")
                      ),
                      React.createElement("div", { className: "text-center p-3 rounded-xl bg-slate-50 border" },
                        React.createElement("p", { className: "text-[10px] font-bold text-slate-500" }, "Monthly Use"),
                        React.createElement("p", { className: "text-lg font-black text-slate-700" }, wuMonthlyGal.toLocaleString()),
                        React.createElement("p", { className: "text-[9px] text-slate-400" }, "gallons")
                      ),
                      React.createElement("div", { className: "text-center p-3 rounded-xl bg-emerald-50 border border-emerald-200" },
                        React.createElement("p", { className: "text-[10px] font-bold text-emerald-500" }, "Est. Monthly Cost"),
                        React.createElement("p", { className: "text-lg font-black text-emerald-600" }, "$" + wuMonthlyCost.toFixed(2)),
                        React.createElement("p", { className: "text-[9px] text-slate-400" }, "@ $5/1000 gal")
                      )
                    ),
                    // Conservation tips
                    React.createElement("div", { className: "bg-sky-50 rounded-lg p-3 border border-sky-200" },
                      React.createElement("p", { className: "text-[10px] font-bold text-sky-700 mb-1" }, "\uD83D\uDCA1 Top Conservation Tips:"),
                      React.createElement("ul", { className: "text-[10px] text-sky-600 space-y-0.5" },
                        React.createElement("li", null, "\u2022 A 5-min shower (low-flow) uses 7.5 gal vs 12.5 gal standard — saves 1,825 gal/year"),
                        React.createElement("li", null, "\u2022 Fix leaky faucets: 1 drip/sec = 3,000 gallons/year wasted"),
                        React.createElement("li", null, "\u2022 Low-flow toilets (1.28 GPF) save ~13,000 gal/year vs old 3.5 GPF models"),
                        React.createElement("li", null, "\u2022 Full dishwasher loads use LESS water than hand-washing")
                      )
                    )
                  )
                ),

                // ── Home Systems ──
                asTab === 'home' && React.createElement("div", { className: "space-y-4" },
                  React.createElement("div", { className: "bg-purple-100 rounded-xl p-3 border border-purple-200 text-xs text-purple-700" },
                    React.createElement("strong", null, "Home Systems = Engineering!"), " Understanding HVAC, electrical, and water systems helps you maintain them wisely."
                  ),
                  // Home sub-nav
                  React.createElement("div", { className: "flex flex-wrap gap-2 mb-3" },
                    [{ id: 'hvac', label: '\uD83C\uDF2C\uFE0F HVAC' }, { id: 'water', label: '\uD83D\uDCA7 Pressure' }, { id: 'panel', label: '\u26A1 Panel' }, { id: 'energy', label: '\uD83D\uDD0C Energy Audit' }, { id: 'fire', label: '\uD83D\uDD25 Fire Safety' }, { id: 'insulation', label: '\uD83C\uDFE0 Insulation' }, { id: 'heating', label: '\uD83D\uDD25 Heating' }, { id: 'heatpump', label: '\u2668\uFE0F Heat Pump' }, { id: 'solar', label: '\u2600\uFE0F Solar vs Gas' }].map(function (s) {
                      return React.createElement("button", { key: s.id, onClick: function () { upd('homeTab', s.id); },
                        className: "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all " + (homeTab === s.id ? 'bg-purple-500 text-white' : 'bg-white text-purple-600 border border-purple-200 hover:bg-purple-50')
                      }, s.label);
                    })
                  ),
                  // HVAC Filter Analyzer
                  homeTab === 'hvac' && React.createElement("div", { className: "space-y-3" },
                    React.createElement("h4", { className: "text-xs font-bold text-purple-700 uppercase" }, "\uD83C\uDF2C\uFE0F HVAC Filter Analyzer (MERV Ratings)"),
                    React.createElement("p", { className: "text-[10px] text-slate-500 mb-2" }, "MERV = Minimum Efficiency Reporting Value. Higher MERV = better filtration but more airflow restriction."),
                    React.createElement("div", { className: "mb-3" },
                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500" }, "MERV Rating: " + hsMerv),
                      React.createElement("input", { type: "range", min: 1, max: 16, value: hsMerv, onChange: function (e) { upd('hsMerv', parseInt(e.target.value)); },
                        className: "w-full mt-1", style: { accentColor: '#9333ea' } })
                    ),
                    React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3" },
                      React.createElement("div", { className: "text-center p-3 rounded-xl bg-purple-50 border border-purple-200" },
                        React.createElement("p", { className: "text-[10px] font-bold text-purple-500" }, "Filtration"),
                        React.createElement("p", { className: "text-xl font-black text-purple-600" }, mervCurrent.eff + "%")
                      ),
                      React.createElement("div", { className: "text-center p-3 rounded-xl bg-slate-50 border" },
                        React.createElement("p", { className: "text-[10px] font-bold text-slate-500" }, "Restriction"),
                        React.createElement("p", { className: "text-sm font-black text-slate-700" }, mervCurrent.restrict)
                      ),
                      React.createElement("div", { className: "text-center p-3 rounded-xl bg-slate-50 border" },
                        React.createElement("p", { className: "text-[10px] font-bold text-slate-500" }, "Filter Cost"),
                        React.createElement("p", { className: "text-sm font-black text-slate-700" }, "~$" + mervCurrent.cost + " each")
                      ),
                      React.createElement("div", { className: "text-center p-3 rounded-xl bg-emerald-50 border border-emerald-200" },
                        React.createElement("p", { className: "text-[10px] font-bold text-emerald-500" }, "Annual Cost"),
                        React.createElement("p", { className: "text-sm font-black text-emerald-600" }, "~$" + mervAnnualCost + "/yr")
                      )
                    ),
                    React.createElement("div", { className: "bg-white rounded-xl p-3 border border-slate-200" },
                      React.createElement("p", { className: "text-[10px] font-bold text-slate-500 mb-1" }, "What MERV " + mervCurrent.merv + " catches:"),
                      React.createElement("p", { className: "text-xs text-slate-600" }, mervCurrent.catches),
                      React.createElement("p", { className: "text-[10px] text-purple-600 mt-1 font-bold" }, "\uD83D\uDCA1 " + mervCurrent.rec)
                    ),
                    React.createElement("div", { className: "space-y-1.5" },
                      React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "All MERV Levels:"),
                      mervData.map(function (m) {
                        var active = m.merv <= hsMerv;
                        return React.createElement("div", { key: m.merv, className: "flex items-center gap-2" },
                          React.createElement("span", { className: "text-[9px] font-bold w-12 text-right " + (active ? 'text-purple-600' : 'text-slate-400') }, "MERV " + m.merv),
                          React.createElement("div", { className: "flex-1 bg-slate-100 rounded-full h-3 overflow-hidden" },
                            React.createElement("div", { style: { width: m.eff + '%' }, className: "h-full rounded-full " + (active ? 'bg-purple-400' : 'bg-slate-300') })
                          ),
                          React.createElement("span", { className: "text-[9px] font-bold w-8 " + (active ? 'text-purple-600' : 'text-slate-400') }, m.eff + "%")
                        );
                      })
                    )
                  ),
                  // Water Pressure
                  homeTab === 'water' && React.createElement("div", { className: "space-y-3" },
                    React.createElement("h4", { className: "text-xs font-bold text-purple-700 uppercase" }, "\uD83D\uDCA7 Water Pressure Simulator"),
                    React.createElement("p", { className: "text-[10px] text-slate-500 mb-2" }, "Normal residential pressure: 40-60 PSI. Too low = weak fixtures. Too high = pipe damage."),
                    React.createElement("div", { className: "mb-3" },
                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500" }, "Water Pressure: " + hsPsi + " PSI"),
                      React.createElement("input", { type: "range", min: 10, max: 120, value: hsPsi, onChange: function (e) { upd('hsPsi', parseInt(e.target.value)); },
                        className: "w-full mt-1", style: { accentColor: '#9333ea' } })
                    ),
                    // SVG Pressure Gauge
                    React.createElement("div", { className: "flex justify-center mb-3" },
                      React.createElement("svg", { viewBox: "0 0 200 120", width: "240", height: "150", className: "drop-shadow-lg" },
                        // Background arc
                        React.createElement("path", { d: "M 20 100 A 80 80 0 0 1 180 100", fill: "none", stroke: "#e2e8f0", strokeWidth: "12", strokeLinecap: "round" }),
                        // Red low zone (0-40 PSI)
                        React.createElement("path", { d: "M 20 100 A 80 80 0 0 1 " + (100 + 80 * Math.cos(Math.PI - (40/120) * Math.PI)) + " " + (100 - 80 * Math.sin(Math.PI - (40/120) * Math.PI)), fill: "none", stroke: "#fca5a5", strokeWidth: "12", strokeLinecap: "round" }),
                        // Green normal zone (40-60 PSI)
                        React.createElement("path", { d: "M " + (100 + 80 * Math.cos(Math.PI - (40/120) * Math.PI)) + " " + (100 - 80 * Math.sin(Math.PI - (40/120) * Math.PI)) + " A 80 80 0 0 1 " + (100 + 80 * Math.cos(Math.PI - (60/120) * Math.PI)) + " " + (100 - 80 * Math.sin(Math.PI - (60/120) * Math.PI)), fill: "none", stroke: "#6ee7b7", strokeWidth: "12", strokeLinecap: "round" }),
                        // Amber high zone (60-80 PSI)
                        React.createElement("path", { d: "M " + (100 + 80 * Math.cos(Math.PI - (60/120) * Math.PI)) + " " + (100 - 80 * Math.sin(Math.PI - (60/120) * Math.PI)) + " A 80 80 0 0 1 " + (100 + 80 * Math.cos(Math.PI - (80/120) * Math.PI)) + " " + (100 - 80 * Math.sin(Math.PI - (80/120) * Math.PI)), fill: "none", stroke: "#fcd34d", strokeWidth: "12", strokeLinecap: "round" }),
                        // Red danger zone (80-120 PSI)
                        React.createElement("path", { d: "M " + (100 + 80 * Math.cos(Math.PI - (80/120) * Math.PI)) + " " + (100 - 80 * Math.sin(Math.PI - (80/120) * Math.PI)) + " A 80 80 0 0 1 180 100", fill: "none", stroke: "#f87171", strokeWidth: "12", strokeLinecap: "round" }),
                        // Needle
                        (function () {
                          var angle = Math.PI - (Math.min(120, Math.max(0, hsPsi)) / 120) * Math.PI;
                          var nx = 100 + 65 * Math.cos(angle);
                          var ny = 100 - 65 * Math.sin(angle);
                          return React.createElement("line", { x1: "100", y1: "100", x2: nx.toFixed(1), y2: ny.toFixed(1), stroke: "#334155", strokeWidth: "3", strokeLinecap: "round", style: { transition: 'all 0.3s ease' } });
                        })(),
                        // Center dot
                        React.createElement("circle", { cx: "100", cy: "100", r: "5", fill: "#334155" }),
                        // PSI text
                        React.createElement("text", { x: "100", y: "92", textAnchor: "middle", className: "text-lg font-black", fill: hsPsi < 30 || hsPsi > 80 ? '#ef4444' : hsPsi <= 60 ? '#10b981' : '#f59e0b', style: { fontSize: '18px', fontWeight: 900 } }, hsPsi + " PSI"),
                        // Labels
                        React.createElement("text", { x: "20", y: "115", textAnchor: "middle", style: { fontSize: '8px', fill: '#94a3b8' } }, "0"),
                        React.createElement("text", { x: "180", y: "115", textAnchor: "middle", style: { fontSize: '8px', fill: '#94a3b8' } }, "120"),
                        React.createElement("text", { x: "100", y: "14", textAnchor: "middle", style: { fontSize: '8px', fill: '#94a3b8' } }, "60")
                      )
                    ),
                    React.createElement("div", { className: "text-center p-3 rounded-xl bg-" + psiColor + "-50 border-2 border-" + psiColor + "-200 mb-3" },
                      React.createElement("p", { className: "text-sm font-bold text-" + psiColor + "-600" }, psiStatus)
                    ),
                    React.createElement("div", { className: "bg-white rounded-xl p-3 border border-slate-200" },
                      React.createElement("p", { className: "text-[10px] font-bold text-slate-500 mb-2" }, "Effects at " + hsPsi + " PSI:"),
                      React.createElement("div", { className: "space-y-1" },
                        psiEffects.map(function (e, i) {
                          return React.createElement("p", { key: i, className: "text-xs text-slate-600" }, "\u2022 " + e);
                        })
                      )
                    ),
                    React.createElement("div", { className: "grid grid-cols-3 gap-2" },
                      React.createElement("div", { className: "text-center p-2 rounded-lg " + (hsPsi < 40 ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border') },
                        React.createElement("p", { className: "text-[9px] font-bold text-slate-500" }, "Low (<40)"),
                        React.createElement("p", { className: "text-[10px] text-slate-600" }, "Install booster pump")
                      ),
                      React.createElement("div", { className: "text-center p-2 rounded-lg " + (hsPsi >= 40 && hsPsi <= 60 ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border') },
                        React.createElement("p", { className: "text-[9px] font-bold text-slate-500" }, "Normal (40-60)"),
                        React.createElement("p", { className: "text-[10px] text-slate-600" }, "No action needed")
                      ),
                      React.createElement("div", { className: "text-center p-2 rounded-lg " + (hsPsi > 60 ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border') },
                        React.createElement("p", { className: "text-[9px] font-bold text-slate-500" }, "High (>60)"),
                        React.createElement("p", { className: "text-[10px] text-slate-600" }, "Install pressure regulator")
                      )
                    )
                  ),
                  // Electrical Panel Guide
                  homeTab === 'panel' && React.createElement("div", { className: "space-y-3" },
                    React.createElement("h4", { className: "text-xs font-bold text-purple-700 uppercase" }, "\u26A1 Know Your Electrical Panel"),
                    React.createElement("p", { className: "text-[10px] text-slate-500 mb-2" }, "Your panel distributes power to every circuit. Understanding it helps you troubleshoot safely."),
                    React.createElement("div", { className: "space-y-2" },
                      ['main', 'standard', 'large', 'safety', 'special'].map(function (cat) {
                        var items = panelItems.filter(function (p) { return p.category === cat; });
                        var catLabel = cat === 'main' ? 'Main' : cat === 'standard' ? 'Standard Circuits' : cat === 'large' ? 'High-Power (240V)' : cat === 'safety' ? 'Safety Breakers' : 'Special';
                        return React.createElement("div", { key: cat },
                          React.createElement("p", { className: "text-[9px] font-bold text-purple-500 uppercase mb-1" }, catLabel),
                          items.map(function (p) {
                            return React.createElement("div", { key: p.name, className: "flex items-start gap-2 p-2 mb-1 bg-white rounded-lg border border-slate-200" },
                              React.createElement("span", { className: "text-sm" }, p.icon),
                              React.createElement("div", { className: "flex-1" },
                                React.createElement("div", { className: "flex items-center gap-2" },
                                  React.createElement("p", { className: "text-xs font-bold text-slate-700" }, p.name),
                                  React.createElement("span", { className: "text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-bold" }, p.amps)
                                ),
                                React.createElement("p", { className: "text-[10px] text-slate-500" }, p.desc)
                              )
                            );
                          })
                        );
                      })
                    ),
                    // Panel Breaker Quiz
                    React.createElement("div", { className: "bg-purple-50 rounded-xl p-4 border border-purple-200" },
                      React.createElement("p", { className: "text-xs font-bold text-purple-700 mb-2" }, "\uD83D\uDD0D Breaker Scenario Quiz:"),
                      React.createElement("p", { className: "text-sm text-slate-700 font-medium mb-3" }, "\"" + panelCurrentQ.q + "\""),
                      React.createElement("div", { className: "grid grid-cols-2 gap-2 mb-2" },
                        panelCurrentQ.choices.map(function (ch) {
                          var sel = hsPanelAnswer === ch;
                          var rev = hsPanelFb != null;
                          var isRight = ch === panelCurrentQ.answer;
                          var cls = rev
                            ? (isRight ? 'border-green-500 bg-green-50 text-green-700' : (sel ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 bg-white text-slate-400'))
                            : (sel ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300');
                          return React.createElement("button", { key: ch, disabled: rev, onClick: function () { upd('hsPanelAnswer', ch); upd('hsPanelFb', null); },
                            className: "p-2 rounded-xl border-2 text-xs font-bold transition-all " + cls }, ch);
                        })
                      ),
                      hsPanelAnswer != null && !hsPanelFb && React.createElement("button", { onClick: function () {
                        var ok = hsPanelAnswer === panelCurrentQ.answer;
                        upd('hsPanelFb', ok ? '\u2705 Correct! ' + panelCurrentQ.explain : '\u274C Not quite. ' + panelCurrentQ.explain);
                        if (ok && typeof awardStemXP === 'function') awardStemXP('lifeSkills', 15, 'panel breaker quiz');
                      }, className: "w-full px-3 py-1.5 bg-purple-500 text-white font-bold rounded-lg text-xs hover:bg-purple-600 transition-all" }, "Submit"),
                      hsPanelFb && React.createElement("div", { className: "rounded-lg p-2 text-[10px] font-medium mt-2 " + (hsPanelFb.startsWith('\u2705') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700') }, hsPanelFb),
                      hsPanelFb && React.createElement("button", { onClick: function () { upd('hsPanelQ', (hsPanelQ + 1) % panelQuizzes.length); upd('hsPanelAnswer', null); upd('hsPanelFb', null); },
                        className: "w-full px-3 py-1.5 bg-purple-500 text-white font-bold rounded-lg text-xs mt-2 hover:bg-purple-600 transition-all" }, "\u27A1\uFE0F Next Scenario")
                    ),
                    React.createElement("div", { className: "bg-red-50 rounded-lg p-3 border border-red-200" },
                      React.createElement("p", { className: "text-[10px] font-bold text-red-700" }, "\u26A0\uFE0F When to Call an Electrician:"),
                      React.createElement("ul", { className: "text-[10px] text-red-600 mt-1 space-y-0.5" },
                        React.createElement("li", null, "\u2022 Breaker trips repeatedly (may indicate wiring fault)"),
                        React.createElement("li", null, "\u2022 Burning smell from panel or outlets"),
                        React.createElement("li", null, "\u2022 Warm or discolored outlet covers"),
                        React.createElement("li", null, "\u2022 Adding a new 240V circuit (dryer, EV charger)"),
                        React.createElement("li", null, "\u2022 Panel upgrade needed (100A \u2192 200A for modern loads)")
                      )
                    )
                  ),
                  // Energy Audit Tool
                  homeTab === 'energy' && React.createElement("div", { className: "space-y-3" },
                    React.createElement("h4", { className: "text-xs font-bold text-purple-700 uppercase" }, "\uD83D\uDD0C Home Energy Audit"),
                    React.createElement("p", { className: "text-[10px] text-slate-500 mb-2" }, "Enter how many hours per day each appliance runs. See which ones cost the most!"),
                    // Appliance grid
                    React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3" },
                      eaAppliances.map(function (ap, idx) {
                        return React.createElement("div", { key: ap.name, className: "bg-white rounded-xl p-2 border border-slate-200" },
                          React.createElement("div", { className: "flex items-center gap-1 mb-1" },
                            React.createElement("span", { className: "text-sm" }, ap.icon),
                            React.createElement("span", { className: "text-[10px] font-bold text-slate-700 truncate" }, ap.name)
                          ),
                          React.createElement("div", { className: "flex items-center gap-1" },
                            React.createElement("input", { type: "range", min: 0, max: 24, step: 0.5, value: eaHours[idx],
                              onChange: function (e) {
                                var nh = eaHours.slice();
                                nh[idx] = parseFloat(e.target.value);
                                upd('eaHours', nh);
                              },
                              className: "flex-1 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer" }),
                            React.createElement("span", { className: "text-[9px] font-bold text-purple-600 w-8 text-right" }, eaHours[idx] + "h")
                          ),
                          React.createElement("p", { className: "text-[8px] text-slate-400 mt-0.5" }, ap.watts + "W \u2022 " + eaMonthlyKWh[idx] + " kWh/mo \u2022 $" + eaMonthlyCost[idx])
                        );
                      })
                    ),
                    // Pie chart
                    React.createElement("div", { className: "flex justify-center mb-3" },
                      React.createElement("svg", { width: 180, height: 180, viewBox: "0 0 180 180" },
                        (function () {
                          var elems = [];
                          var total = eaTotalKWh;
                          if (total === 0) {
                            elems.push(React.createElement("circle", { key: "empty", cx: 90, cy: 90, r: 80, fill: "none", stroke: "#e2e8f0", strokeWidth: 20 }));
                          } else {
                            var colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#84cc16', '#f97316', '#a855f7', '#0ea5e9', '#22d3ee', '#64748b'];
                            var angle = -Math.PI / 2;
                            eaAppliances.forEach(function (ap, idx) {
                              if (eaMonthlyKWh[idx] === 0) return;
                              var slice = (eaMonthlyKWh[idx] / total) * 2 * Math.PI;
                              var x1 = 90 + 70 * Math.cos(angle);
                              var y1 = 90 + 70 * Math.sin(angle);
                              var x2 = 90 + 70 * Math.cos(angle + slice);
                              var y2 = 90 + 70 * Math.sin(angle + slice);
                              var lg = slice > Math.PI ? 1 : 0;
                              elems.push(React.createElement("path", {
                                key: idx,
                                d: "M 90 90 L " + x1 + " " + y1 + " A 70 70 0 " + lg + " 1 " + x2 + " " + y2 + " Z",
                                fill: colors[idx % colors.length], opacity: 0.75
                              }));
                              angle += slice;
                            });
                          }
                          elems.push(React.createElement("circle", { key: "center", cx: 90, cy: 90, r: 35, fill: "white" }));
                          elems.push(React.createElement("text", { key: "kwh", x: 90, y: 87, textAnchor: "middle", fontSize: 14, fontWeight: 900, fill: "#7c3aed" }, eaTotalKWh + " kWh"));
                          elems.push(React.createElement("text", { key: "cost", x: 90, y: 102, textAnchor: "middle", fontSize: 10, fontWeight: 700, fill: "#64748b" }, "$" + eaTotalCost + "/mo"));
                          return elems;
                        })()
                      )
                    ),
                    // Top consumers
                    React.createElement("div", { className: "space-y-1.5" },
                      React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Top 3 Energy Consumers:"),
                      eaTop3.map(function (t, i) {
                        var pct = eaTotalKWh > 0 ? Math.round(t.kwh / eaTotalKWh * 100) : 0;
                        return React.createElement("div", { key: t.name, className: "flex items-center gap-2" },
                          React.createElement("span", { className: "text-sm" }, t.icon),
                          React.createElement("span", { className: "text-[10px] font-bold text-slate-700 w-24 truncate" }, t.name),
                          React.createElement("div", { className: "flex-1 bg-slate-100 rounded-full h-3 overflow-hidden" },
                            React.createElement("div", { style: { width: pct + '%', transition: 'width 0.5s ease' }, className: "h-full rounded-full bg-purple-400" })
                          ),
                          React.createElement("span", { className: "text-[9px] font-bold text-purple-600 w-20 text-right" }, t.kwh + " kWh ($" + t.cost + ")")
                        );
                      })
                    ),
                    // Summary
                    React.createElement("div", { className: "grid grid-cols-3 gap-3" },
                      React.createElement("div", { className: "text-center p-3 rounded-xl bg-purple-50 border border-purple-200" },
                        React.createElement("p", { className: "text-[10px] font-bold text-purple-500" }, "Monthly kWh"),
                        React.createElement("p", { className: "text-xl font-black text-purple-600" }, eaTotalKWh),
                        React.createElement("p", { className: "text-[9px] text-slate-400" }, "kilowatt-hours")
                      ),
                      React.createElement("div", { className: "text-center p-3 rounded-xl bg-emerald-50 border border-emerald-200" },
                        React.createElement("p", { className: "text-[10px] font-bold text-emerald-500" }, "Monthly Cost"),
                        React.createElement("p", { className: "text-xl font-black text-emerald-600" }, "$" + eaTotalCost),
                        React.createElement("p", { className: "text-[9px] text-slate-400" }, "@ $0.13/kWh")
                      ),
                      React.createElement("div", { className: "text-center p-3 rounded-xl bg-sky-50 border border-sky-200" },
                        React.createElement("p", { className: "text-[10px] font-bold text-sky-500" }, "Annual Cost"),
                        React.createElement("p", { className: "text-xl font-black text-sky-600" }, "$" + (parseFloat(eaTotalCost) * 12).toFixed(0)),
                        React.createElement("p", { className: "text-[9px] text-slate-400" }, "projected")
                      )
                    ),
                    React.createElement("div", { className: "bg-purple-50 rounded-lg p-2 border border-purple-200" },
                      React.createElement("p", { className: "text-[10px] text-purple-700" }, "\uD83E\uDD13 ", React.createElement("strong", null, "Energy = Power \u00D7 Time."), " A 100W bulb running 10h uses 1 kWh. At $0.13/kWh, that costs 13\u00A2. LED bulbs use ~15W for the same light \u2014 over 80% savings!")
                    )
                  ),
                  // Fire Safety Quiz
                  homeTab === 'fire' && React.createElement("div", { className: "space-y-3" },
                    React.createElement("h4", { className: "text-xs font-bold text-purple-700 uppercase" }, "\uD83D\uDD25 Fire Safety Knowledge Check"),
                    React.createElement("p", { className: "text-[10px] text-slate-500 mb-2" }, "Test your fire safety knowledge! Click Start to begin or continue the quiz."),
                    // Progress bar
                    React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                      React.createElement("div", { className: "flex-1 bg-slate-100 rounded-full h-2 overflow-hidden" },
                        React.createElement("div", { style: { width: Math.round(fsProgress * 100) + '%', transition: 'width 0.5s ease' }, className: "h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500" })
                      ),
                      React.createElement("span", { className: "text-[9px] font-bold text-slate-500" }, "Q" + (fsIdx + 1) + "/" + fsQuizData.length)
                    ),
                    // Current question
                    !fsComplete && React.createElement("div", { className: "bg-white rounded-xl p-4 border-2 border-orange-200" },
                      React.createElement("p", { className: "text-[10px] font-bold text-orange-500 mb-1" }, "SCENARIO " + (fsIdx + 1)),
                      React.createElement("p", { className: "text-sm text-slate-700 font-medium mb-3" }, fsQuizData[fsIdx].q),
                      React.createElement("div", { className: "space-y-2" },
                        fsQuizData[fsIdx].options.map(function (opt) {
                          var picked = fsCurrentPick === opt;
                          var revealed = fsFeedback !== '';
                          var isCorrect = opt === fsQuizData[fsIdx].answer;
                          var cls = revealed
                            ? (isCorrect ? 'border-green-500 bg-green-50 text-green-700' : (picked ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 bg-white text-slate-400'))
                            : (picked ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 bg-white text-slate-600 hover:border-orange-300');
                          return React.createElement("button", { key: opt, disabled: revealed, onClick: function () { upd('fsCurrentPick', opt); upd('fsFeedback', ''); },
                            className: "w-full text-left p-2.5 rounded-xl border-2 text-xs font-bold transition-all " + cls }, opt);
                        })
                      ),
                      fsCurrentPick && fsFeedback === '' && React.createElement("button", { onClick: function () {
                        var correct = fsCurrentPick === fsQuizData[fsIdx].answer;
                        var newScore = fsScore + (correct ? 1 : 0);
                        upd('fsScore', newScore);
                        upd('fsFeedback', correct ? '\u2705 Correct! ' + fsQuizData[fsIdx].explain : '\u274C Incorrect. ' + fsQuizData[fsIdx].explain);
                        if (correct && typeof awardStemXP === 'function') awardStemXP('lifeSkills', 12, 'fire safety quiz');
                      }, className: "w-full px-3 py-2 bg-orange-500 text-white font-bold rounded-lg text-xs mt-3 hover:bg-orange-600 transition-all" }, "Check Answer"),
                      fsFeedback !== '' && React.createElement("div", { className: "rounded-lg p-2 text-[10px] font-medium mt-2 " + (fsFeedback.startsWith('\u2705') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700') }, fsFeedback),
                      fsFeedback !== '' && React.createElement("button", { onClick: function () {
                        if (fsIdx + 1 >= fsQuizData.length) { upd('fsComplete', true); } else { upd('fsIdx', fsIdx + 1); }
                        upd('fsCurrentPick', null); upd('fsFeedback', '');
                      }, className: "w-full px-3 py-2 bg-orange-500 text-white font-bold rounded-lg text-xs mt-2 hover:bg-orange-600 transition-all" },
                        fsIdx + 1 >= fsQuizData.length ? "\uD83C\uDFC1 See Results" : "\u27A1\uFE0F Next Question")
                    ),
                    // Results
                    fsComplete && React.createElement("div", { className: "text-center p-4 rounded-xl border-2 " + (fsGrade === 'A' ? 'bg-emerald-50 border-emerald-300' : fsGrade === 'B' ? 'bg-sky-50 border-sky-300' : fsGrade === 'C' ? 'bg-amber-50 border-amber-300' : 'bg-red-50 border-red-300') },
                      React.createElement("p", { className: "text-4xl mb-2" }, fsGrade === 'A' ? '\uD83C\uDF1F' : fsGrade === 'B' ? '\uD83D\uDC4D' : fsGrade === 'C' ? '\u26A0\uFE0F' : '\uD83D\uDEA8'),
                      React.createElement("p", { className: "text-2xl font-black " + (fsGrade === 'A' ? 'text-emerald-600' : fsGrade === 'B' ? 'text-sky-600' : fsGrade === 'C' ? 'text-amber-600' : 'text-red-600') }, fsScore + "/" + fsQuizData.length),
                      React.createElement("p", { className: "text-xs font-bold text-slate-500 mt-1" }, fsGrade === 'A' ? 'Fire Safety Expert! You know your stuff.' : fsGrade === 'B' ? 'Good Knowledge! Review a few areas.' : fsGrade === 'C' ? 'Needs Improvement. Study fire safety basics.' : 'Critical! Please review home fire safety immediately.'),
                      React.createElement("button", { onClick: function () { upd('fsIdx', 0); upd('fsScore', 0); upd('fsCurrentPick', null); upd('fsFeedback', ''); upd('fsComplete', false); },
                        className: "px-4 py-2 bg-orange-500 text-white font-bold rounded-lg text-xs mt-3 hover:bg-orange-600 transition-all" }, "\uD83D\uDD04 Retake Quiz")
                    ),
                    // Quick tips
                    React.createElement("div", { className: "bg-red-50 rounded-lg p-3 border border-red-200" },
                      React.createElement("p", { className: "text-[10px] font-bold text-red-700 mb-1" }, "\uD83D\uDCA1 Fire Safety Essentials:"),
                      React.createElement("ul", { className: "text-[10px] text-red-600 space-y-0.5" },
                        React.createElement("li", null, "\u2022 Test smoke alarms monthly; replace batteries yearly"),
                        React.createElement("li", null, "\u2022 Keep fire extinguisher in kitchen (ABC type) \u2014 learn PASS: Pull, Aim, Squeeze, Sweep"),
                        React.createElement("li", null, "\u2022 Never use water on grease fire \u2014 smother with lid or use Class B extinguisher"),
                        React.createElement("li", null, "\u2022 Have 2 escape routes from every room; practice family escape plan")
                      )
                    )
                  ),
                  // Insulation R-Value Guide
                  homeTab === 'insulation' && React.createElement("div", { className: "space-y-3" },
                    React.createElement("h4", { className: "text-xs font-bold text-purple-700 uppercase" }, "\uD83C\uDFE0 Insulation R-Value Guide"),
                    React.createElement("p", { className: "text-[10px] text-slate-500 mb-2" }, "R-value measures thermal resistance. Higher = better insulation. Requirements vary by climate zone."),
                    // Climate zone selector
                    React.createElement("div", { className: "mb-3" },
                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500" }, "\uD83C\uDF0D Climate Zone:"),
                      React.createElement("div", { className: "flex flex-wrap gap-1.5 mt-1" },
                        insZoneData.map(function (z) {
                          return React.createElement("button", { key: z.zone, onClick: function () { upd('insZone', z.zone); },
                            className: "px-2 py-1 rounded-lg text-[9px] font-bold transition-all " + (insZone === z.zone ? 'bg-purple-500 text-white' : 'bg-white text-purple-600 border border-purple-200 hover:bg-purple-50') },
                            "Zone " + z.zone + " " + z.label);
                        })
                      )
                    ),
                    // Current zone info
                    React.createElement("div", { className: "bg-purple-50 rounded-xl p-3 border border-purple-200 mb-3" },
                      React.createElement("p", { className: "text-[10px] font-bold text-purple-700" }, "\uD83C\uDF21\uFE0F Zone " + insCurrentZone.zone + " \u2014 " + insCurrentZone.label),
                      React.createElement("p", { className: "text-[10px] text-purple-600" }, insCurrentZone.desc),
                      React.createElement("div", { className: "grid grid-cols-3 gap-2 mt-2" },
                        React.createElement("div", { className: "text-center p-2 bg-white rounded-lg" },
                          React.createElement("p", { className: "text-[9px] text-slate-400" }, "Attic"),
                          React.createElement("p", { className: "text-sm font-black text-purple-600" }, "R-" + insCurrentZone.atticR)
                        ),
                        React.createElement("div", { className: "text-center p-2 bg-white rounded-lg" },
                          React.createElement("p", { className: "text-[9px] text-slate-400" }, "Walls"),
                          React.createElement("p", { className: "text-sm font-black text-purple-600" }, "R-" + insCurrentZone.wallR)
                        ),
                        React.createElement("div", { className: "text-center p-2 bg-white rounded-lg" },
                          React.createElement("p", { className: "text-[9px] text-slate-400" }, "Floor"),
                          React.createElement("p", { className: "text-sm font-black text-purple-600" }, "R-" + insCurrentZone.floorR)
                        )
                      )
                    ),
                    // Insulation types comparison
                    React.createElement("div", { className: "space-y-2" },
                      React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Insulation Types Compared:"),
                      insTypes.map(function (t) {
                        return React.createElement("div", { key: t.name, className: "bg-white rounded-xl p-3 border border-slate-200" },
                          React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                            React.createElement("span", { className: "text-sm" }, t.icon),
                            React.createElement("span", { className: "text-xs font-bold text-slate-700" }, t.name),
                            React.createElement("span", { className: "ml-auto text-[10px] font-bold text-purple-600" }, "R-" + t.rPerInch + "/inch")
                          ),
                          React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                            React.createElement("div", { className: "flex-1 bg-slate-100 rounded-full h-2 overflow-hidden" },
                              React.createElement("div", { style: { width: Math.round(t.rPerInch / 7 * 100) + '%' }, className: "h-full rounded-full bg-purple-400" })
                            ),
                            React.createElement("span", { className: "text-[9px] font-bold text-slate-500" }, t.costSqFt + "/sqft")
                          ),
                          React.createElement("p", { className: "text-[10px] text-slate-500" }, t.best)
                        );
                      })
                    ),
                    // Quick calculator
                    React.createElement("div", { className: "bg-white rounded-xl p-3 border border-purple-200" },
                      React.createElement("p", { className: "text-[10px] font-bold text-purple-700 mb-2" }, "\uD83E\uDDEE Quick Cost Estimator"),
                      React.createElement("div", { className: "grid grid-cols-2 gap-3 mb-2" },
                        React.createElement("div", null,
                          React.createElement("label", { className: "text-[9px] font-bold text-slate-500" }, "Area (sq ft)"),
                          React.createElement("input", { type: "number", min: 0, value: insSqFt, onChange: function (e) { upd('insSqFt', Math.max(0, parseInt(e.target.value) || 0)); },
                            className: "w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-purple-400 outline-none mt-1" })
                        ),
                        React.createElement("div", null,
                          React.createElement("label", { className: "text-[9px] font-bold text-slate-500" }, "Insulation Type"),
                          React.createElement("select", { value: insSelected, onChange: function (e) { upd('insSelected', e.target.value); },
                            className: "w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-purple-400 outline-none mt-1" },
                            insTypes.map(function (t) { return React.createElement("option", { key: t.name, value: t.name }, t.name); })
                          )
                        )
                      ),
                      insSqFt > 0 && React.createElement("div", { className: "grid grid-cols-3 gap-2 mt-2" },
                        React.createElement("div", { className: "text-center p-2 rounded-lg bg-purple-50" },
                          React.createElement("p", { className: "text-[9px] text-slate-400" }, "Material Cost"),
                          React.createElement("p", { className: "text-sm font-black text-purple-600" }, "$" + insEstCost)
                        ),
                        React.createElement("div", { className: "text-center p-2 rounded-lg bg-emerald-50" },
                          React.createElement("p", { className: "text-[9px] text-slate-400" }, "Annual Savings"),
                          React.createElement("p", { className: "text-sm font-black text-emerald-600" }, "$" + insAnnualSavings)
                        ),
                        React.createElement("div", { className: "text-center p-2 rounded-lg bg-sky-50" },
                          React.createElement("p", { className: "text-[9px] text-slate-400" }, "Payback Period"),
                          React.createElement("p", { className: "text-sm font-black text-sky-600" }, insPayback + " yrs")
                        )
                      )
                    ),
                    React.createElement("div", { className: "bg-purple-50 rounded-lg p-2 border border-purple-200" },
                      React.createElement("p", { className: "text-[10px] text-purple-700" }, "\uD83E\uDD13 ", React.createElement("strong", null, "Physics Note:"), " R-value = thickness \u00F7 thermal conductivity (k). Materials with low k (like trapped air pockets in fiberglass) resist heat flow better. Spray foam's closed cells trap gas with even lower k than air!")
                    )
                  )
                )
              ),

              // ────── HEATING SOURCES COMPARISON ──────
              homeTab === 'heating' && React.createElement("div", { className: "space-y-3" },
                React.createElement("h4", { className: "text-xs font-bold text-purple-700 uppercase" }, "\uD83D\uDD25 Heating Sources Comparison"),
                React.createElement("p", { className: "text-[10px] text-slate-500 mb-2" }, "Compare common home heating systems by efficiency, cost, and environmental impact. AFUE = Annual Fuel Utilization Efficiency."),
                React.createElement("div", { className: "flex flex-wrap gap-2 mb-3" },
                  htSrcSystems.map(function (s) {
                    return React.createElement("button", { key: s.id, onClick: function () { upd('htSrcFuel', s.id); },
                      className: "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all " + (htSrcFuel === s.id ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-orange-600 border border-orange-200 hover:bg-orange-50')
                    }, s.icon + " " + s.name);
                  })
                ),
                React.createElement("div", { className: "bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-3 border border-orange-200 mb-3" },
                  React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                    React.createElement("span", { className: "text-2xl" }, htSrcSelected.icon),
                    React.createElement("div", null,
                      React.createElement("p", { className: "text-xs font-bold text-orange-700" }, htSrcSelected.name),
                      React.createElement("p", { className: "text-[10px] text-orange-500" }, "Fuel: " + htSrcSelected.fuel + " \u2022 Lifespan: " + htSrcSelected.lifespan + " years")
                    )
                  ),
                  React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2" },
                    React.createElement("div", { className: "text-center p-2 bg-white rounded-lg" },
                      React.createElement("p", { className: "text-[9px] text-slate-400" }, "AFUE"),
                      React.createElement("p", { className: "text-lg font-black text-orange-600" }, htSrcSelected.afue + "%")
                    ),
                    React.createElement("div", { className: "text-center p-2 bg-white rounded-lg" },
                      React.createElement("p", { className: "text-[9px] text-slate-400" }, "Install Cost"),
                      React.createElement("p", { className: "text-lg font-black text-green-600" }, "$" + htSrcSelected.installCost.toLocaleString())
                    ),
                    React.createElement("div", { className: "text-center p-2 bg-white rounded-lg" },
                      React.createElement("p", { className: "text-[9px] text-slate-400" }, "Annual Fuel"),
                      React.createElement("p", { className: "text-lg font-black text-red-500" }, "$" + htSrcSelected.annualFuel.toLocaleString())
                    ),
                    React.createElement("div", { className: "text-center p-2 bg-white rounded-lg" },
                      React.createElement("p", { className: "text-[9px] text-slate-400" }, "CO\u2082/Year"),
                      React.createElement("p", { className: "text-lg font-black text-slate-600" }, htSrcSelected.co2Lbs.toLocaleString() + " lbs")
                    )
                  ),
                  React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                    React.createElement("div", { className: "bg-green-50 rounded-lg p-2 border border-green-200" },
                      React.createElement("p", { className: "text-[9px] font-bold text-green-600" }, "\u2705 Pros"),
                      React.createElement("p", { className: "text-[10px] text-green-700" }, htSrcSelected.pros)
                    ),
                    React.createElement("div", { className: "bg-red-50 rounded-lg p-2 border border-red-200" },
                      React.createElement("p", { className: "text-[9px] font-bold text-red-500" }, "\u26A0\uFE0F Cons"),
                      React.createElement("p", { className: "text-[10px] text-red-600" }, htSrcSelected.cons)
                    )
                  )
                ),
                React.createElement("div", { className: "bg-white rounded-xl p-3 border border-slate-200 mb-3" },
                  React.createElement("p", { className: "text-[10px] font-bold text-slate-600 mb-2 uppercase" }, "15-Year Total Cost of Ownership"),
                  htSrc15yr.map(function (s) {
                    var maxCost = htSrc15yr[htSrc15yr.length - 1].total;
                    var pct = Math.round(s.total / maxCost * 100);
                    return React.createElement("div", { key: s.id, className: "mb-2" },
                      React.createElement("div", { className: "flex items-center justify-between mb-0.5" },
                        React.createElement("span", { className: "text-[10px] font-bold " + (s.id === htSrcCheapest ? 'text-green-600' : 'text-slate-600') }, s.icon + " " + s.name + (s.id === htSrcCheapest ? ' \u2B50 Best Value' : '')),
                        React.createElement("span", { className: "text-[10px] font-bold " + (s.id === htSrcCheapest ? 'text-green-600' : 'text-slate-500') }, "$" + s.total.toLocaleString())
                      ),
                      React.createElement("div", { className: "w-full bg-slate-100 rounded-full h-3" },
                        React.createElement("div", { className: "h-3 rounded-full transition-all", style: { width: pct + "%", background: s.id === htSrcCheapest ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #f97316, #ef4444)' } })
                      )
                    );
                  })
                ),
                React.createElement("div", { className: "bg-white rounded-xl p-3 border border-slate-200 mb-3" },
                  React.createElement("p", { className: "text-[10px] font-bold text-slate-600 mb-2 uppercase" }, "\uD83C\uDF0D Annual CO\u2082 Emissions (lbs)"),
                  React.createElement("div", { className: "grid grid-cols-5 gap-1" },
                    htSrcSystems.map(function (s) {
                      var maxCO2 = 8200;
                      var pct = Math.round(s.co2Lbs / maxCO2 * 100);
                      return React.createElement("div", { key: s.id, className: "text-center" },
                        React.createElement("div", { className: "mx-auto w-6 bg-slate-100 rounded-t-full relative", style: { height: '60px' } },
                          React.createElement("div", { className: "absolute bottom-0 w-full rounded-t-full", style: { height: pct + "%", background: s.co2Lbs < 6000 ? '#22c55e' : s.co2Lbs < 7000 ? '#eab308' : '#ef4444' } })
                        ),
                        React.createElement("p", { className: "text-[8px] font-bold text-slate-500 mt-1" }, s.icon),
                        React.createElement("p", { className: "text-[8px] text-slate-400" }, (s.co2Lbs / 1000).toFixed(1) + "k")
                      );
                    })
                  )
                ),
                React.createElement("div", { className: "bg-purple-50 rounded-lg p-2 border border-purple-200" },
                  React.createElement("p", { className: "text-[10px] text-purple-700" }, "\uD83E\uDD13 ", React.createElement("strong", null, "Engineering Note:"), " AFUE measures how much fuel becomes usable heat. A 96% AFUE gas furnace converts 96\u00A2 of every dollar of gas into heat. Electric furnaces are 100% AFUE but electricity costs ~3x more per BTU than gas, making them expensive despite perfect efficiency.")
                )
              ),

              // ────── HEAT PUMP SIZING ──────
              homeTab === 'heatpump' && React.createElement("div", { className: "space-y-3" },
                React.createElement("h4", { className: "text-xs font-bold text-purple-700 uppercase" }, "\u2668\uFE0F Heat Pump Sizing Calculator"),
                React.createElement("p", { className: "text-[10px] text-slate-500 mb-2" }, "Size a heat pump for your home. COP (Coefficient of Performance) shows how many units of heat you get per unit of electricity."),
                React.createElement("div", { className: "grid grid-cols-2 gap-3 mb-3" },
                  React.createElement("div", null,
                    React.createElement("label", { className: "text-[10px] font-bold text-slate-600 block mb-1" }, "Home Size (sq ft)"),
                    React.createElement("input", { type: "number", value: hpSqft, onChange: function (e) { upd('hpSqft', Number(e.target.value)); }, className: "w-full border rounded-lg px-2 py-1 text-xs" })
                  ),
                  React.createElement("div", null,
                    React.createElement("label", { className: "text-[10px] font-bold text-slate-600 block mb-1" }, "Climate Zone"),
                    React.createElement("select", { value: hpClimate, onChange: function (e) { upd('hpClimate', e.target.value); }, className: "w-full border rounded-lg px-2 py-1 text-xs" },
                      React.createElement("option", { value: "mild" }, "Mild (Southeast, Pacific)"),
                      React.createElement("option", { value: "moderate" }, "Moderate (Mid-Atlantic)"),
                      React.createElement("option", { value: "cold" }, "Cold (Northeast, Midwest)")
                    )
                  ),
                  React.createElement("div", null,
                    React.createElement("label", { className: "text-[10px] font-bold text-slate-600 block mb-1" }, "Insulation Quality"),
                    React.createElement("select", { value: hpInsulation, onChange: function (e) { upd('hpInsulation', e.target.value); }, className: "w-full border rounded-lg px-2 py-1 text-xs" },
                      React.createElement("option", { value: "poor" }, "Poor (old, no upgrades)"),
                      React.createElement("option", { value: "avg" }, "Average"),
                      React.createElement("option", { value: "good" }, "Good (well-sealed)")
                    )
                  ),
                  React.createElement("div", null,
                    React.createElement("label", { className: "text-[10px] font-bold text-slate-600 block mb-1" }, "System Type"),
                    React.createElement("select", { value: hpType, onChange: function (e) { upd('hpType', e.target.value); }, className: "w-full border rounded-lg px-2 py-1 text-xs" },
                      React.createElement("option", { value: "standard" }, "Standard Air-Source"),
                      React.createElement("option", { value: "cold" }, "Cold-Climate Air-Source"),
                      React.createElement("option", { value: "geo" }, "Geothermal (Ground-Source)"),
                      React.createElement("option", { value: "mini" }, "Ductless Mini-Split")
                    )
                  )
                ),
                React.createElement("div", { className: "bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-3 border border-teal-200 mb-3" },
                  React.createElement("p", { className: "text-xs font-bold text-teal-700 mb-2" }, "\uD83D\uDCCA Sizing Results"),
                  React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2" },
                    React.createElement("div", { className: "text-center p-2 bg-white rounded-lg" },
                      React.createElement("p", { className: "text-[9px] text-slate-400" }, "BTU/hr Needed"),
                      React.createElement("p", { className: "text-lg font-black text-teal-600" }, hpBTU.toLocaleString())
                    ),
                    React.createElement("div", { className: "text-center p-2 bg-white rounded-lg" },
                      React.createElement("p", { className: "text-[9px] text-slate-400" }, "Tonnage"),
                      React.createElement("p", { className: "text-lg font-black text-blue-600" }, hpTons + " ton")
                    ),
                    React.createElement("div", { className: "text-center p-2 bg-white rounded-lg" },
                      React.createElement("p", { className: "text-[9px] text-slate-400" }, "COP"),
                      React.createElement("p", { className: "text-lg font-black text-green-600" }, hpCOP)
                    ),
                    React.createElement("div", { className: "text-center p-2 bg-white rounded-lg" },
                      React.createElement("p", { className: "text-[9px] text-slate-400" }, "Est. Install"),
                      React.createElement("p", { className: "text-lg font-black text-amber-600" }, "$" + hpInstall.toLocaleString())
                    )
                  ),
                  React.createElement("div", { className: "grid grid-cols-3 gap-2" },
                    React.createElement("div", { className: "text-center p-2 bg-white rounded-lg" },
                      React.createElement("p", { className: "text-[9px] text-slate-400" }, "Annual Cost"),
                      React.createElement("p", { className: "text-sm font-black text-red-500" }, "$" + hpAnnual.toLocaleString())
                    ),
                    React.createElement("div", { className: "text-center p-2 bg-white rounded-lg" },
                      React.createElement("p", { className: "text-[9px] text-slate-400" }, "vs Gas Furnace"),
                      React.createElement("p", { className: "text-sm font-black " + (hpSavings > 0 ? 'text-green-600' : 'text-red-500') }, (hpSavings > 0 ? 'Save ' : 'Extra ') + "$" + Math.abs(hpSavings).toLocaleString() + "/yr")
                    ),
                    React.createElement("div", { className: "text-center p-2 bg-white rounded-lg" },
                      React.createElement("p", { className: "text-[9px] text-slate-400" }, "CO\u2082 Saved/yr"),
                      React.createElement("p", { className: "text-sm font-black text-green-600" }, hpCO2Saved.toLocaleString() + " lbs")
                    )
                  )
                ),
                React.createElement("div", { className: "bg-white rounded-xl p-3 border border-slate-200 mb-3" },
                  React.createElement("p", { className: "text-[10px] font-bold text-slate-600 mb-2 uppercase" }, "COP by System Type (higher = more efficient)"),
                  [{ label: 'Standard Air-Source', cop: 3.0, color: '#0ea5e9' }, { label: 'Cold-Climate Air', cop: 2.5, color: '#6366f1' }, { label: 'Geothermal', cop: 4.5, color: '#22c55e' }, { label: 'Ductless Mini-Split', cop: 3.8, color: '#f59e0b' }, { label: 'Gas Furnace (ref)', cop: 0.96, color: '#ef4444' }].map(function (s) {
                    var pct = Math.round(s.cop / 4.5 * 100);
                    return React.createElement("div", { key: s.label, className: "mb-2" },
                      React.createElement("div", { className: "flex justify-between mb-0.5" },
                        React.createElement("span", { className: "text-[10px] font-bold text-slate-600" }, s.label),
                        React.createElement("span", { className: "text-[10px] font-bold", style: { color: s.color } }, s.cop + "x")
                      ),
                      React.createElement("div", { className: "w-full bg-slate-100 rounded-full h-3" },
                        React.createElement("div", { className: "h-3 rounded-full", style: { width: pct + "%", background: s.color } })
                      )
                    );
                  })
                ),
                React.createElement("div", { className: "bg-purple-50 rounded-lg p-2 border border-purple-200" },
                  React.createElement("p", { className: "text-[10px] text-purple-700" }, "\uD83E\uDD13 ", React.createElement("strong", null, "Thermodynamics Note:"), " Heat pumps don't create heat \u2014 they move it using the refrigeration cycle (same as your fridge, but reversed). A COP of 3.0 means for every 1 kWh of electricity, you get 3 kWh of heat. That's 300% efficient! Gas furnaces max out at ~96%.")
                )
              ),

              // ────── SOLAR vs GAS ──────
              homeTab === 'solar' && React.createElement("div", { className: "space-y-3" },
                React.createElement("h4", { className: "text-xs font-bold text-purple-700 uppercase" }, "\u2600\uFE0F Solar vs. Gas Water Heater"),
                React.createElement("p", { className: "text-[10px] text-slate-500 mb-2" }, "Compare solar thermal and gas water heaters over time. Solar has higher upfront cost but lower ongoing expenses."),
                React.createElement("div", { className: "grid grid-cols-2 gap-3 mb-3" },
                  React.createElement("div", null,
                    React.createElement("label", { className: "text-[10px] font-bold text-slate-600 block mb-1" }, "Household Size"),
                    React.createElement("select", { value: sgHousehold, onChange: function (e) { upd('sgHousehold', Number(e.target.value)); }, className: "w-full border rounded-lg px-2 py-1 text-xs" },
                      React.createElement("option", { value: 2 }, "2 people"),
                      React.createElement("option", { value: 3 }, "3 people"),
                      React.createElement("option", { value: 4 }, "4 people"),
                      React.createElement("option", { value: 5 }, "5 people"),
                      React.createElement("option", { value: 6 }, "6 people")
                    )
                  ),
                  React.createElement("div", null,
                    React.createElement("label", { className: "text-[10px] font-bold text-slate-600 block mb-1" }, "Sun Exposure"),
                    React.createElement("select", { value: sgSun, onChange: function (e) { upd('sgSun', e.target.value); }, className: "w-full border rounded-lg px-2 py-1 text-xs" },
                      React.createElement("option", { value: "high" }, "High (Southwest, FL)"),
                      React.createElement("option", { value: "med" }, "Medium (Mid-Latitude)"),
                      React.createElement("option", { value: "low" }, "Low (Pacific NW, NE)")
                    )
                  )
                ),
                React.createElement("div", { className: "grid grid-cols-2 gap-3 mb-3" },
                  React.createElement("div", { className: "bg-gradient-to-b from-yellow-50 to-amber-50 rounded-xl p-3 border border-yellow-300" },
                    React.createElement("p", { className: "text-xs font-bold text-yellow-700 mb-2" }, "\u2600\uFE0F Solar Thermal"),
                    React.createElement("div", { className: "space-y-1" },
                      React.createElement("div", { className: "flex justify-between" }, React.createElement("span", { className: "text-[10px] text-slate-500" }, "Install"), React.createElement("span", { className: "text-[10px] font-bold text-yellow-700" }, "$" + sgSolarInstall.toLocaleString())),
                      React.createElement("div", { className: "flex justify-between" }, React.createElement("span", { className: "text-[10px] text-slate-500" }, "Annual Cost"), React.createElement("span", { className: "text-[10px] font-bold text-yellow-700" }, "$" + sgSolarAnnual)),
                      React.createElement("div", { className: "flex justify-between" }, React.createElement("span", { className: "text-[10px] text-slate-500" }, "10-yr Total"), React.createElement("span", { className: "text-[10px] font-bold text-yellow-700" }, "$" + sgSolar10.toLocaleString())),
                      React.createElement("div", { className: "flex justify-between" }, React.createElement("span", { className: "text-[10px] text-slate-500" }, "20-yr Total"), React.createElement("span", { className: "text-[10px] font-bold text-yellow-700" }, "$" + sgSolar20.toLocaleString())),
                      React.createElement("div", { className: "flex justify-between" }, React.createElement("span", { className: "text-[10px] text-slate-500" }, "CO\u2082/yr"), React.createElement("span", { className: "text-[10px] font-bold text-green-600" }, sgSolarCO2.toLocaleString() + " lbs"))
                    )
                  ),
                  React.createElement("div", { className: "bg-gradient-to-b from-blue-50 to-slate-50 rounded-xl p-3 border border-blue-300" },
                    React.createElement("p", { className: "text-xs font-bold text-blue-700 mb-2" }, "\uD83D\uDD25 Gas Tank"),
                    React.createElement("div", { className: "space-y-1" },
                      React.createElement("div", { className: "flex justify-between" }, React.createElement("span", { className: "text-[10px] text-slate-500" }, "Install"), React.createElement("span", { className: "text-[10px] font-bold text-blue-700" }, "$" + sgGasInstall.toLocaleString())),
                      React.createElement("div", { className: "flex justify-between" }, React.createElement("span", { className: "text-[10px] text-slate-500" }, "Annual Cost"), React.createElement("span", { className: "text-[10px] font-bold text-blue-700" }, "$" + sgGasAnnual)),
                      React.createElement("div", { className: "flex justify-between" }, React.createElement("span", { className: "text-[10px] text-slate-500" }, "10-yr Total"), React.createElement("span", { className: "text-[10px] font-bold text-blue-700" }, "$" + sgGas10.toLocaleString())),
                      React.createElement("div", { className: "flex justify-between" }, React.createElement("span", { className: "text-[10px] text-slate-500" }, "20-yr Total"), React.createElement("span", { className: "text-[10px] font-bold text-blue-700" }, "$" + sgGas20.toLocaleString())),
                      React.createElement("div", { className: "flex justify-between" }, React.createElement("span", { className: "text-[10px] text-slate-500" }, "CO\u2082/yr"), React.createElement("span", { className: "text-[10px] font-bold text-red-500" }, sgGasCO2.toLocaleString() + " lbs"))
                    )
                  )
                ),
                React.createElement("div", { className: "bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200 mb-3" },
                  React.createElement("p", { className: "text-xs font-bold text-green-700 mb-2" }, "\uD83C\uDFC6 Verdict"),
                  React.createElement("div", { className: "grid grid-cols-3 gap-2" },
                    React.createElement("div", { className: "text-center p-2 bg-white rounded-lg" },
                      React.createElement("p", { className: "text-[9px] text-slate-400" }, "Break-Even"),
                      React.createElement("p", { className: "text-lg font-black text-green-600" }, sgBreakEven + " yrs")
                    ),
                    React.createElement("div", { className: "text-center p-2 bg-white rounded-lg" },
                      React.createElement("p", { className: "text-[9px] text-slate-400" }, "20-yr Savings"),
                      React.createElement("p", { className: "text-lg font-black " + (sgSaving20 > 0 ? 'text-green-600' : 'text-red-500') }, (sgSaving20 > 0 ? '' : '-') + "$" + Math.abs(sgSaving20).toLocaleString())
                    ),
                    React.createElement("div", { className: "text-center p-2 bg-white rounded-lg" },
                      React.createElement("p", { className: "text-[9px] text-slate-400" }, "CO\u2082 Saved/yr"),
                      React.createElement("p", { className: "text-lg font-black text-green-600" }, (sgGasCO2 - sgSolarCO2).toLocaleString() + " lbs")
                    )
                  )
                ),
                React.createElement("div", { className: "bg-white rounded-xl p-3 border border-slate-200 mb-3" },
                  React.createElement("p", { className: "text-[10px] font-bold text-slate-600 mb-2 uppercase" }, "Cumulative Cost Over 20 Years"),
                  [0, 5, 10, 15, 20].map(function (yr) {
                    var solarCum = sgSolarInstall + sgSolarAnnual * yr;
                    var gasCum = sgGasInstall + sgGasAnnual * yr;
                    var maxVal = Math.max(sgSolarInstall + sgSolarAnnual * 20, sgGasInstall + sgGasAnnual * 20);
                    return React.createElement("div", { key: yr, className: "flex items-center gap-2 mb-1.5" },
                      React.createElement("span", { className: "text-[9px] font-bold text-slate-400 w-8 text-right" }, "Yr " + yr),
                      React.createElement("div", { className: "flex-1" },
                        React.createElement("div", { className: "flex items-center gap-1 mb-0.5" },
                          React.createElement("div", { className: "h-2.5 rounded-full bg-yellow-400", style: { width: Math.round(solarCum / maxVal * 100) + "%" } }),
                          React.createElement("span", { className: "text-[8px] text-yellow-600 font-bold" }, "$" + solarCum.toLocaleString())
                        ),
                        React.createElement("div", { className: "flex items-center gap-1" },
                          React.createElement("div", { className: "h-2.5 rounded-full bg-blue-400", style: { width: Math.round(gasCum / maxVal * 100) + "%" } }),
                          React.createElement("span", { className: "text-[8px] text-blue-600 font-bold" }, "$" + gasCum.toLocaleString())
                        )
                      )
                    );
                  }),
                  React.createElement("div", { className: "flex gap-4 mt-2 justify-center" },
                    React.createElement("div", { className: "flex items-center gap-1" }, React.createElement("div", { className: "w-3 h-2 rounded bg-yellow-400" }), React.createElement("span", { className: "text-[9px] text-slate-500" }, "Solar")),
                    React.createElement("div", { className: "flex items-center gap-1" }, React.createElement("div", { className: "w-3 h-2 rounded bg-blue-400" }), React.createElement("span", { className: "text-[9px] text-slate-500" }, "Gas"))
                  )
                ),
                React.createElement("div", { className: "bg-purple-50 rounded-lg p-2 border border-purple-200" },
                  React.createElement("p", { className: "text-[10px] text-purple-700" }, "\uD83E\uDD13 ", React.createElement("strong", null, "Physics Note:"), " Solar thermal collectors absorb sunlight as infrared radiation and transfer it to a heat-transfer fluid (glycol). Even on cloudy days, diffuse radiation still heats water \u2014 just less efficiently (~40% vs ~80% on sunny days). The 30% federal tax credit (IRA) drastically shortens payback time.")
                )
              ),

              // â”€â”€ Footer â”€â”€
              React.createElement("div", { className: "bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl p-3 border border-cyan-200 text-center" },
                React.createElement("p", { className: "text-[10px] text-cyan-600" }, "\uD83E\uDDED ", React.createElement("strong", null, "Life skills"), " aren't just \u201Cadulting\u201D \u2014 they're applied science, critical thinking, and informed decision-making!"),
                React.createElement("p", { className: "text-[9px] text-slate-400 mt-1" }, "Tax calculations are simplified estimates for educational purposes.")
              )
            );
          })(),

          /* coordinate: removed -- see stem_tool_coordgrid.js */
          /* protractor: removed -- see stem_tool_angles.js */
        /* multtable: removed -- see stem_tool_multtable.js */
        /* numberline: removed -- see stem_tool_numberline.js */
        /* areamodel: removed -- see stem_tool_areamodel.js */

        /* calculus: removed — see stem_tool_calculus.js */



        // ── Wave Simulator ── (handled by stem_tool_science.js plugin registry)







        /* cell: removed — see stem_tool_science.js */
        // funcGrapher: EXTRACTED to stem_tool_funcgrapher.js (handled by registry fallback)



        // physics: EXTRACTED to stem_tool_physics.js (handled by registry fallback)



        /* chemBalance: removed — see stem_tool_science.js */


        /* punnett: removed — see stem_tool_science.js */


        /* circuit: removed — see stem_tool_science.js */


        // --- DATA PLOTTER -> extracted to stem_tool_creative.js (plugin-only) ---
        null,


        // --- INEQUALITY GRAPHER -> extracted to stem_tool_inequality.js (plugin-only) ---
        null,


        /* molecule: removed — see stem_tool_science.js */


        /* decomposer: removed — see stem_tool_science.js */


        // ═══════════════════════════════════════════════════════
        // SOLAR SYSTEM EXPLORER — 3D (Three.js)
        // ═══════════════════════════════════════════════════════
        /* solarSystem: removed — see stem_tool_science.js */

        // [Galaxy tool extracted to stem_tool_galaxy.js]



        /* universe: removed — see stem_tool_science.js */

        /* rocks: removed -- see stem_tool_rocks.js */

        /* waterCycle: removed -- see stem_tool_watercycle.js */


        // ═══════════════════════════════════════════════════════
        // ROCK CYCLE
        // ═══════════════════════════════════════════════════════
        /* rockCycle: removed — see stem_tool_science.js */


        // ═══════════════════════════════════════════════════════
        // ═══════════════════════════════════════════════════════
        // ECOSYSTEM SIMULATOR — Canvas2D Animated Population
        // ═══════════════════════════════════════════════════════
        /* ecosystem: removed — see stem_tool_science.js */
        /* fractionViz: removed -- see stem_tool_fractions.js */
        /* fractions: removed -- see stem_tool_fractions.js */
        /* decomposer (duplicate): removed — see stem_tool_science.js */

        // ═══════════════════════════════════════════════════════
        // UNIT CONVERTER
        // ═══════════════════════════════════════════════════════
        /* unitConvert: removed — see stem_tool_unitconvert.js */


        /* probability: removed -- see stem_tool_probability.js */




        // ═══════════════════════════════════════════════════════

        // MUSIC SYNTHESIZER — Web Audio API + Canvas2D Oscilloscope

        // ═══════════════════════════════════════════════════════

        (function _musicSynth() { var _isMusicSynth = stemLabTab === 'explore' && stemLabTool === 'musicSynth'; if (!_isMusicSynth) {
            // Placeholder hooks — must match exact active-path sequence (verified L19411–19953)
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
          }
          const d = labToolData.musicSynth;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, musicSynth: { ...prev.musicSynth, [key]: val } }));

          // --- Tooltip helper ---
          var Tip = function (props) {
            var showId = 'tip_' + props.id;
            var isOpen = d[showId];
            return React.createElement("span", { className: "relative inline-block ml-1" },
              React.createElement("button", {
                onClick: function () { upd(showId, !isOpen); },
                className: "w-4 h-4 rounded-full text-[9px] font-bold leading-none inline-flex items-center justify-center " + (isOpen ? "bg-violet-600 text-white" : "bg-violet-100 text-violet-500 hover:bg-violet-200"),
                title: props.text
              }, "\u24D8"),
              isOpen && React.createElement("div", { className: "absolute z-50 left-6 top-0 w-64 p-2.5 bg-white border border-violet-200 rounded-lg shadow-xl text-[10px] text-slate-600 leading-relaxed", style: { maxHeight: "200px", overflowY: "auto" } },
                React.createElement("div", { className: "font-bold text-violet-700 mb-0.5" }, "\uD83D\uDD2C " + props.title),
                props.text
              )
            );
          };

          // --- Audio Context singleton ---
          if (!window._alloSynthCtx) {
            window._alloSynthCtx = null; window._alloSynthGain = null; window._alloSynthAnalyser = null;
            window._alloSynthActiveNotes = {}; window._alloSynthSeqInterval = null; window._alloSynthEffects = null;
            window._alloMetronomeInterval = null; window._alloArpInterval = null;
            window._alloParticles = [];
          }
          function makeDistCurve(amount) {
            var k = Math.max(1, amount); var samples = 44100; var curve = new Float32Array(samples);
            for (var i = 0; i < samples; i++) { var x = (i * 2) / samples - 1; curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x)); }
            return curve;
          }
          function getCtx() {
            if (!window._alloSynthCtx || window._alloSynthCtx.state === 'closed') {
              var ac = new (window.AudioContext || window.webkitAudioContext)();
              var gain = ac.createGain(); gain.gain.value = d.volume || 0.5;
              var analyser = ac.createAnalyser(); analyser.fftSize = 2048;
              // Resonant filter
              var filter = ac.createBiquadFilter();
              filter.type = d.filterType || 'lowpass';
              filter.frequency.value = d.filterCutoff || 20000;
              filter.Q.value = d.filterQ || 1;
              // Delay
              var delay = ac.createDelay(2); delay.delayTime.value = (d.delayTime || 300) / 1000;
              var delayFeedback = ac.createGain(); delayFeedback.gain.value = d.delayFeedback || 0.3;
              var delayWet = ac.createGain(); delayWet.gain.value = d.delayMix || 0;
              var delayDry = ac.createGain(); delayDry.gain.value = 1;
              delay.connect(delayFeedback); delayFeedback.connect(delay); delay.connect(delayWet);
              // Distortion
              var distortion = ac.createWaveShaper();
              distortion.curve = makeDistCurve(d.distAmount || 0); distortion.oversample = '4x';
              // Reverb
              var convolver = ac.createConvolver();
              var reverbWet = ac.createGain(); reverbWet.gain.value = d.reverbMix || 0;
              var reverbDry = ac.createGain(); reverbDry.gain.value = 1;
              var reverbLen = (d.reverbSize || 1.5) * ac.sampleRate;
              var impulse = ac.createBuffer(2, reverbLen, ac.sampleRate);
              for (var ch = 0; ch < 2; ch++) { var imp = impulse.getChannelData(ch); for (var si = 0; si < reverbLen; si++) { imp[si] = (Math.random() * 2 - 1) * Math.pow(1 - si / reverbLen, 2); } }
              convolver.buffer = impulse;
              // Chorus
              var chorusDelay = ac.createDelay(0.1); chorusDelay.delayTime.value = 0.02;
              var chorusLFO = ac.createOscillator(); var chorusDepth = ac.createGain();
              chorusLFO.frequency.value = d.chorusRate || 1.5; chorusDepth.gain.value = (d.chorusMix || 0) > 0 ? 0.003 : 0;
              chorusLFO.connect(chorusDepth); chorusDepth.connect(chorusDelay.delayTime); chorusLFO.start();
              var chorusWet = ac.createGain(); chorusWet.gain.value = d.chorusMix || 0;
              // Tremolo (amplitude LFO)
              var tremoloLFO = ac.createOscillator(); tremoloLFO.type = 'sine';
              tremoloLFO.frequency.value = d.tremoloRate || 5;
              var tremoloGain = ac.createGain(); tremoloGain.gain.value = d.tremoloDepth || 0;
              var tremoloNode = ac.createGain(); tremoloNode.gain.value = 1;
              tremoloLFO.connect(tremoloGain); tremoloGain.connect(tremoloNode.gain); tremoloLFO.start();
              // Chain: source -> filter -> distortion -> delay/reverb/chorus -> tremolo -> gain -> analyser -> dest
              filter.connect(distortion);
              distortion.connect(delayDry); distortion.connect(delay); distortion.connect(reverbDry);
              distortion.connect(convolver); distortion.connect(chorusDelay);
              delayDry.connect(tremoloNode); delayWet.connect(tremoloNode); reverbDry.connect(tremoloNode);
              convolver.connect(reverbWet); reverbWet.connect(tremoloNode);
              chorusDelay.connect(chorusWet); chorusWet.connect(tremoloNode);
              tremoloNode.connect(gain); gain.connect(analyser); analyser.connect(ac.destination);
              window._alloSynthCtx = ac; window._alloSynthGain = gain; window._alloSynthAnalyser = analyser;
              window._alloSynthEffects = { filter: filter, distortion: distortion, delay: delay, delayFeedback: delayFeedback, delayWet: delayWet, delayDry: delayDry, convolver: convolver, reverbWet: reverbWet, reverbDry: reverbDry, chorusDelay: chorusDelay, chorusLFO: chorusLFO, chorusDepth: chorusDepth, chorusWet: chorusWet, tremoloLFO: tremoloLFO, tremoloGain: tremoloGain, tremoloNode: tremoloNode };
            }
            if (window._alloSynthCtx.state === 'suspended') window._alloSynthCtx.resume();
            window._alloSynthGain.gain.value = d.volume || 0.5;
            var fx = window._alloSynthEffects;
            if (fx) {
              fx.filter.type = d.filterType || 'lowpass'; fx.filter.frequency.value = d.filterCutoff || 20000; fx.filter.Q.value = d.filterQ || 1;
              fx.delay.delayTime.value = (d.delayTime || 300) / 1000; fx.delayFeedback.gain.value = d.delayFeedback || 0.3;
              fx.delayWet.gain.value = d.delayMix || 0; fx.distortion.curve = makeDistCurve(d.distAmount || 0);
              fx.reverbWet.gain.value = d.reverbMix || 0; fx.chorusLFO.frequency.value = d.chorusRate || 1.5;
              fx.chorusDepth.gain.value = (d.chorusMix || 0) > 0 ? 0.003 : 0; fx.chorusWet.gain.value = d.chorusMix || 0;
              fx.tremoloLFO.frequency.value = d.tremoloRate || 5; fx.tremoloGain.gain.value = d.tremoloDepth || 0;
            }
            return { ctx: window._alloSynthCtx, gain: window._alloSynthGain, analyser: window._alloSynthAnalyser, effects: window._alloSynthEffects };
          }

          // ═══ NOTE & FREQUENCY ═══
          var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
          var NOTE_NAMES_FLAT = ['C', 'D\u266D', 'D', 'E\u266D', 'E', 'F', 'G\u266D', 'G', 'A\u266D', 'A', 'B\u266D', 'B'];
          // Chromatic color mapping (each semitone gets a hue)
          var NOTE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'];
          function noteFreq(note, octave) {
            var semitone = NOTE_NAMES.indexOf(note);
            if (semitone === -1) semitone = NOTE_NAMES_FLAT.indexOf(note);
            var n = (octave - 4) * 12 + (semitone - 9);
            return 440 * Math.pow(2, n / 12);
          }
          function noteColor(note) { return NOTE_COLORS[NOTE_NAMES.indexOf(note)] || '#6366f1'; }
          var oct = d.octave || 4;
          var KEYS = [];
          var whiteKeyIdx = 0;
          for (var o = oct; o <= oct + 1; o++) {
            for (var ni = 0; ni < 12; ni++) {
              var isBlack = [1, 3, 6, 8, 10].indexOf(ni) !== -1;
              KEYS.push({ note: NOTE_NAMES[ni], octave: o, freq: noteFreq(NOTE_NAMES[ni], o), isBlack: isBlack, semitone: (o - oct) * 12 + ni, position: isBlack ? whiteKeyIdx - 1 : whiteKeyIdx });
              if (!isBlack) whiteKeyIdx++;
            }
          }

          // ═══ PARTICLE SYSTEM ═══
          function spawnParticles(noteId, color, x, y) {
            if (!window._alloParticles) window._alloParticles = [];
            for (var p = 0; p < 8; p++) {
              window._alloParticles.push({
                x: x || 200, y: y || 100, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3 - 1,
                size: Math.random() * 4 + 2, life: 1.0, decay: 0.015 + Math.random() * 0.01,
                color: color || '#a855f7', noteId: noteId
              });
            }
          }

          // ═══ PLAY / STOP NOTE ═══
          function playNote(freq, noteId, vibratoOverride) {
            var audio = getCtx();
            if (window._alloSynthActiveNotes[noteId]) return;
            var osc = audio.ctx.createOscillator(); var env = audio.ctx.createGain();
            osc.type = d.waveType || 'sine'; osc.frequency.value = freq;
            // Vibrato (pitch LFO)
            var vibDepth = vibratoOverride !== undefined ? vibratoOverride : (d.vibratoDepth || 0);
            if (vibDepth > 0) {
              var vibLFO = audio.ctx.createOscillator(); vibLFO.type = 'sine';
              vibLFO.frequency.value = d.vibratoRate || 5;
              var vibGain = audio.ctx.createGain(); vibGain.gain.value = vibDepth * freq * 0.02;
              vibLFO.connect(vibGain); vibGain.connect(osc.frequency); vibLFO.start();
            }
            var now = audio.ctx.currentTime;
            var atk = d.attack || 0.02; var dec = d.decay || 0.1; var sus = d.sustain || 0.7;
            env.gain.setValueAtTime(0, now); env.gain.linearRampToValueAtTime(1, now + atk);
            env.gain.linearRampToValueAtTime(sus, now + atk + dec);
            osc.connect(env); env.connect(audio.effects.filter); osc.start(now);
            window._alloSynthActiveNotes[noteId] = { osc: osc, env: env };
            // Spawn particles
            var noteIdx = NOTE_NAMES.indexOf(noteId.replace(/[0-9]/g, ''));
            if (noteIdx >= 0) spawnParticles(noteId, NOTE_COLORS[noteIdx]);
          }
          function stopNote(noteId) {
            var entry = window._alloSynthActiveNotes[noteId];
            if (!entry) return;
            var audio = getCtx(); var now = audio.ctx.currentTime; var rel = d.release || 0.3;
            entry.env.gain.cancelScheduledValues(now); entry.env.gain.setValueAtTime(entry.env.gain.value, now);
            entry.env.gain.linearRampToValueAtTime(0, now + rel); entry.osc.stop(now + rel + 0.05);
            delete window._alloSynthActiveNotes[noteId];
          }
          function playNoteFor(freq, noteId, durationMs) {
            playNote(freq, noteId);
            setTimeout(function () { stopNote(noteId); }, durationMs);
          }

          // ═══ KARPLUS-STRONG PLUCKED STRING ═══
          function playPlucked(freq, noteId, brightness, damping) {
            var audio = getCtx();
            if (window._alloSynthActiveNotes[noteId]) return;
            var ctx = audio.ctx; var now = ctx.currentTime;
            var sampleRate = ctx.sampleRate;
            var delayTime = 1 / freq;
            var br = brightness !== undefined ? brightness : 0.8;
            var dmp = damping !== undefined ? damping : 0.996;
            // Longer noise burst (40ms) for fuller attack
            var noiseLen = Math.round(sampleRate * 0.04);
            var noiseBuf = ctx.createBuffer(1, noiseLen, sampleRate);
            var noiseData = noiseBuf.getChannelData(0);
            // Shaped noise: mix filtered noise for warmer character
            for (var i = 0; i < noiseLen; i++) {
              var t = i / noiseLen;
              noiseData[i] = (Math.random() * 2 - 1) * (1 - t * 0.5); // fade noise tail
            }
            var noiseSrc = ctx.createBufferSource(); noiseSrc.buffer = noiseBuf;
            // Delay line for KS
            var delay = ctx.createDelay(1); delay.delayTime.value = delayTime;
            var feedback = ctx.createGain(); feedback.gain.value = dmp;
            // Primary LPF — warmer ceiling: max 4.8kHz instead of 10kHz
            var lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass';
            lpf.frequency.value = br * 4000 + 800;
            lpf.Q.value = 0.5; // gentle resonance
            // Secondary warmth filter in feedback — removes harsh highs each cycle
            var warmth = ctx.createBiquadFilter(); warmth.type = 'lowpass';
            warmth.frequency.value = Math.min(freq * 4, 6000);
            warmth.Q.value = 0.3;
            // Output envelope — gentler 4s decay
            var env = ctx.createGain(); env.gain.setValueAtTime(0.6, now);
            env.gain.exponentialRampToValueAtTime(0.001, now + 4);
            // Body tone — sine at fundamental for pitch clarity (10% volume)
            var body = ctx.createOscillator(); body.type = 'sine'; body.frequency.value = freq;
            var bodyGain = ctx.createGain(); bodyGain.gain.setValueAtTime(0.10, now);
            bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
            body.connect(bodyGain); bodyGain.connect(env);
            body.start(now); body.stop(now + 2.5);
            // Second harmonic for warmth/richness (4% volume)
            var harm2 = ctx.createOscillator(); harm2.type = 'sine'; harm2.frequency.value = freq * 2;
            var harm2Gain = ctx.createGain(); harm2Gain.gain.setValueAtTime(0.04, now);
            harm2Gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
            harm2.connect(harm2Gain); harm2Gain.connect(env);
            harm2.start(now); harm2.stop(now + 1.5);
            // Signal path: Noise -> delay -> LPF -> warmth -> feedback -> delay
            noiseSrc.connect(delay); delay.connect(lpf); lpf.connect(warmth);
            warmth.connect(feedback); feedback.connect(delay);
            warmth.connect(env); env.connect(audio.effects.filter);
            noiseSrc.start(now); noiseSrc.stop(now + 0.04);
            window._alloSynthActiveNotes[noteId] = { osc: noiseSrc, env: env };
            var nIdx = NOTE_NAMES.indexOf(noteId.replace(/[0-9]/g, ''));
            if (nIdx >= 0) spawnParticles(noteId, NOTE_COLORS[nIdx]);
            setTimeout(function () { delete window._alloSynthActiveNotes[noteId]; }, 4500);
          }
          function playPluckedFor(freq, noteId, durationMs, brightness, damping) {
            playPlucked(freq, noteId, brightness, damping);
          }

          // ═══ STRUM FUNCTION ═══
          function strumChord(rootNote, chordType, inv, speed, direction) {
            var chordData = CHORDS[chordType];
            if (!chordData) return;
            var ri = NOTE_NAMES.indexOf(rootNote);
            var intervals = chordData.intervals.slice();
            for (var ii = 0; ii < (inv || 0); ii++) {
              if (intervals.length > 1) intervals.push(intervals.shift() + 12);
            }
            // Add octave doubling for richer strum
            var fullIntervals = intervals.slice();
            if (d.strumOctaveDouble) {
              intervals.forEach(function (intv) { fullIntervals.push(intv + 12); });
            }
            if (direction === 'down') fullIntervals.reverse();
            var strumDelay = speed || 40; // ms between strings
            var useKS = d.synthEngine === 'plucked';
            fullIntervals.forEach(function (intv, idx) {
              setTimeout(function () {
                var nIdx = (ri + intv) % 12;
                var nOct = (d.octave || 4) + Math.floor((ri + intv) / 12);
                var freq = noteFreq(NOTE_NAMES[nIdx], nOct);
                var noteId = 'strum_' + idx;
                if (useKS) {
                  playPlucked(freq, noteId, d.ksBrightness || 0.8, d.ksDamping || 0.996);
                } else {
                  playNoteFor(freq, noteId, 1500);
                }
              }, idx * strumDelay);
            });
          }

          // ═══ HARMONYPAD PURE SOUND ═══
          function playHarmonyTone(freq, noteId, durationMs, preset) {
            var audio = getCtx();
            if (window._alloSynthActiveNotes[noteId]) return;
            var ctx = audio.ctx; var now = ctx.currentTime;
            var p = preset || 'harp';
            var osc1 = ctx.createOscillator(); osc1.type = 'sine'; osc1.frequency.value = freq;
            var osc2 = ctx.createOscillator(); osc2.type = 'triangle'; osc2.frequency.value = freq;
            var gain1 = ctx.createGain(); var gain2 = ctx.createGain();
            var master = ctx.createGain();
            if (p === 'harp') { gain1.gain.value = 0.5; gain2.gain.value = 0.3; }
            else if (p === 'organ') { gain1.gain.value = 0.3; gain2.gain.value = 0.5; }
            else { gain1.gain.value = 0.4; gain2.gain.value = 0.4; }
            var attack = p === 'pad' ? 0.25 : 0.015;
            var release = p === 'pad' ? 1.2 : p === 'harp' ? 0.6 : 0.35;
            var vol = 0.3;
            master.gain.setValueAtTime(0, now);
            master.gain.linearRampToValueAtTime(vol, now + attack);
            osc1.connect(gain1); osc2.connect(gain2);
            gain1.connect(master); gain2.connect(master);
            if (p !== 'harp') {
              var osc3 = ctx.createOscillator(); osc3.type = 'sine';
              osc3.frequency.value = freq * 1.003;
              var gain3 = ctx.createGain(); gain3.gain.value = 0.12;
              osc3.connect(gain3); gain3.connect(master); osc3.start(now);
              window._alloSynthActiveNotes[noteId + '_ch'] = { o: osc3 };
            }
            master.connect(audio.gain);
            osc1.start(now); osc2.start(now);
            // Auto-release after duration
            var dur = durationMs || 1200;
            var endT = now + dur / 1000;
            master.gain.setValueAtTime(vol, endT);
            master.gain.linearRampToValueAtTime(0, endT + release);
            setTimeout(function () {
              try { osc1.stop(); osc2.stop(); } catch (e) { }
              if (window._alloSynthActiveNotes[noteId + '_ch']) {
                try { window._alloSynthActiveNotes[noteId + '_ch'].o.stop(); } catch (e) { }
                delete window._alloSynthActiveNotes[noteId + '_ch'];
              }
              delete window._alloSynthActiveNotes[noteId];
            }, dur + release * 1000 + 100);
            window._alloSynthActiveNotes[noteId] = { oscs: [osc1, osc2], master: master };
          }
          function strumHarmony(rootNote, chordType, preset) {
            var chordData = CHORDS[chordType]; if (!chordData) return;
            var ri = NOTE_NAMES.indexOf(rootNote);
            var intervals = chordData.intervals.slice();
            var oct = d.octave || 4;
            intervals.forEach(function (intv, idx) {
              setTimeout(function () {
                var nIdx = (ri + intv) % 12;
                var nOct = oct + Math.floor((ri + intv) / 12);
                playHarmonyTone(noteFreq(NOTE_NAMES[nIdx], nOct), 'omni_' + idx, 1400, preset);
              }, idx * 35);
            });
          }

          // ═══ DRUM SYNTHESIS ═══
          function playDrum(type) {
            var audio = getCtx(); var ctx = audio.ctx; var now = ctx.currentTime;
            var drumGain = ctx.createGain(); drumGain.connect(audio.effects.filter);
            if (type === 'kick') {
              var osc = ctx.createOscillator(); osc.type = 'sine';
              osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
              var eg = ctx.createGain(); eg.gain.setValueAtTime(1, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
              osc.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.8; osc.start(now); osc.stop(now + 0.4);
            } else if (type === 'snare') {
              var noise = ctx.createBufferSource(); var nBuf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var nFilter = ctx.createBiquadFilter(); nFilter.type = 'highpass'; nFilter.frequency.value = 1000;
              var nGain = ctx.createGain(); nGain.gain.setValueAtTime(0.7, now); nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
              noise.connect(nFilter); nFilter.connect(nGain); nGain.connect(drumGain);
              var body = ctx.createOscillator(); body.type = 'triangle'; body.frequency.value = 180;
              var bGain = ctx.createGain(); bGain.gain.setValueAtTime(0.5, now); bGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
              body.connect(bGain); bGain.connect(drumGain); drumGain.gain.value = 0.7; noise.start(now); noise.stop(now + 0.15); body.start(now); body.stop(now + 0.08);
            } else if (type === 'hihat') {
              var noise = ctx.createBufferSource(); var nBuf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var hpf = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 7000;
              var eg = ctx.createGain(); eg.gain.setValueAtTime(0.4, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
              noise.connect(hpf); hpf.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.5; noise.start(now); noise.stop(now + 0.05);
            } else if (type === 'clap') {
              for (var ci = 0; ci < 3; ci++) {
                var noise = ctx.createBufferSource(); var nBuf = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate);
                var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
                noise.buffer = nBuf;
                var bpf = ctx.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 2500;
                var eg = ctx.createGain(); eg.gain.setValueAtTime(0.6, now + ci * 0.01); eg.gain.exponentialRampToValueAtTime(0.01, now + ci * 0.01 + 0.04);
                noise.connect(bpf); bpf.connect(eg); eg.connect(drumGain); noise.start(now + ci * 0.01); noise.stop(now + ci * 0.01 + 0.04);
              }
              drumGain.gain.value = 0.5;
            } else if (type === 'tom') {
              var osc = ctx.createOscillator(); osc.type = 'sine';
              osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
              var eg = ctx.createGain(); eg.gain.setValueAtTime(0.7, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
              osc.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.6; osc.start(now); osc.stop(now + 0.3);
            }
          }
          function playClick(accent) {
            var audio = getCtx(); var ctx = audio.ctx; var now = ctx.currentTime;
            var osc = ctx.createOscillator(); osc.type = 'sine';
            osc.frequency.value = accent ? 1000 : 800;
            var eg = ctx.createGain(); eg.gain.setValueAtTime(accent ? 0.5 : 0.3, now);
            eg.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.connect(eg); eg.connect(audio.gain); osc.start(now); osc.stop(now + 0.05);
          }

          // ═══ SCALE & CHORD DATA ═══
          var SCALES = {
            'Major': { intervals: [0, 2, 4, 5, 7, 9, 11], desc: t('stem.synth.happy_bright_the_most_common'), science: 'Built on the pattern W-W-H-W-W-W-H (Whole/Half steps). The Ionian mode. Its brightness comes from the major 3rd (4 semitones) and perfect 5th (7 semitones).' },
            'Natural Minor': { intervals: [0, 2, 3, 5, 7, 8, 10], desc: t('stem.synth.sad_dark_introspective'), science: 'Pattern: W-H-W-W-H-W-W. The Aeolian mode. The minor 3rd (3 semitones) creates a darker, more somber quality than major.' },
            'Harmonic Minor': { intervals: [0, 2, 3, 5, 7, 8, 11], desc: t('stem.synth.exotic_dramatic_classical'), science: 'Like natural minor but raises the 7th degree. Creates an augmented 2nd interval (3 semitones) between the 6th and 7th, giving it a Middle Eastern flavor.' },
            'Melodic Minor': { intervals: [0, 2, 3, 5, 7, 9, 11], desc: t('stem.synth.smooth_jazzy_sophisticated'), science: 'Raises both the 6th and 7th degrees of natural minor. Used ascending in classical; jazz uses it both ways. Foundation of many jazz modes.' },
            'Pentatonic Major': { intervals: [0, 2, 4, 7, 9], desc: t('stem.synth.universal_folk_rock'), science: 'A 5-note subset of the major scale, removing the 4th and 7th. Found in music worldwide because it avoids semitones, making any combination sound consonant.' },
            'Pentatonic Minor': { intervals: [0, 3, 5, 7, 10], desc: t('stem.synth.blues_rock_universal'), science: 'The most common scale for improvisation. 5 notes, no semitones. Guitar solos, Asian music, African music all use this scale extensively.' },
            'Blues': { intervals: [0, 3, 5, 6, 7, 10], desc: t('stem.synth.soulful_gritty_expressive'), science: 'Adds the "blue note" (\u266D5/\u266F4) to the minor pentatonic. This tritone creates tension and the characteristic blues sound. Bending notes is central to blues expression.' },
            'Dorian': { intervals: [0, 2, 3, 5, 7, 9, 10], desc: t('stem.synth.jazz_funk_sophisticated_minor'), science: 'A minor mode with a raised 6th degree. Used heavily in jazz and funk (e.g., "So What" by Miles Davis). Has a "bright minor" quality.' },
            'Mixolydian': { intervals: [0, 2, 4, 5, 7, 9, 10], desc: t('stem.synth.rock_folk_dominant_feel'), science: 'A major scale with a lowered 7th. The "dominant" sound. Used in rock (Grateful Dead), folk, and creates the V7 chord quality.' },
            'Phrygian': { intervals: [0, 1, 3, 5, 7, 8, 10], desc: t('stem.synth.spanish_flamenco_metal'), science: 'A minor mode with \u266D2. The half-step from root creates dramatic, dark tension. Central to flamenco guitar and heavy metal.' },
            'Lydian': { intervals: [0, 2, 4, 6, 7, 9, 11], desc: t('stem.synth.dreamy_ethereal_film_scores'), science: 'A major scale with \u266F4. The raised 4th creates a "floating" quality. Used extensively in film scores (John Williams) and progressive rock.' },
            'Whole Tone': { intervals: [0, 2, 4, 6, 8, 10], desc: t('stem.synth.mysterious_ambiguous_dreamlike'), science: 'All whole steps, no half steps. No tonal center. Only 2 unique whole-tone scales exist. Used by Debussy and in mystery/dream sequences.' },
            'Chromatic': { intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], desc: t('stem.synth.all_12_notes_complete_but'), science: 'Every semitone in the octave. No tonal hierarchy. The basis of 12-tone serialism (Schoenberg). Each note is equally spaced at 2^(1/12) \u2248 1.0595 frequency ratio.' },
          };

          var CHORDS = {
            'Major': { intervals: [0, 4, 7], symbol: '', desc: t('stem.synth.happy_stable_resolved'), science: 'Root + Major 3rd (4 semitones) + Perfect 5th (7 semitones). Frequency ratio approximately 4:5:6. The most consonant triad.' },
            'Minor': { intervals: [0, 3, 7], symbol: 'm', desc: t('stem.synth.sad_introspective_dark'), science: 'Root + Minor 3rd (3 semitones) + Perfect 5th. The lowered 3rd creates a more somber quality. Ratio approximately 10:12:15.' },
            'Diminished': { intervals: [0, 3, 6], symbol: 'dim', desc: t('stem.synth.tense_unstable_needs_to_resolve'), science: 'Two minor 3rds stacked. The tritone (6 semitones) between root and 5th is the most dissonant interval, creating maximum tension.' },
            'Augmented': { intervals: [0, 4, 8], symbol: 'aug', desc: t('stem.synth.mysterious_unresolved_eerie'), science: 'Two major 3rds stacked. Divides the octave into 3 equal parts. Symmetrical \u2014 only 4 unique augmented triads exist.' },
            'Maj7': { intervals: [0, 4, 7, 11], symbol: 'maj7', desc: t('stem.synth.smooth_lush_jazzy'), science: 'Major triad + major 7th (11 semitones). The major 7th interval is nearly an octave, creating a sweet, complex resonance.' },
            'Min7': { intervals: [0, 3, 7, 10], symbol: 'm7', desc: t('stem.synth.cool_mellow_relaxed'), science: 'Minor triad + minor 7th (10 semitones). Very common in jazz. Less tense than dominant 7th, more complex than minor triad.' },
            'Dom7': { intervals: [0, 4, 7, 10], symbol: '7', desc: t('stem.synth.bluesy_restless_wants_to_resolve'), science: 'Major triad + minor 7th. The tritone between 3rd and \u266D7th creates tension that "pulls" toward resolution to a chord a 5th below (V7\u2192I).' },
            'Sus2': { intervals: [0, 2, 7], symbol: 'sus2', desc: t('stem.synth.open_modern_shimmering'), science: 'Replaces the 3rd with the 2nd. Neither major nor minor \u2014 ambiguous quality. Common in pop and ambient music.' },
            'Sus4': { intervals: [0, 5, 7], symbol: 'sus4', desc: t('stem.synth.suspended_yearning_to_resolve'), science: 'Replaces the 3rd with the 4th. The 4th wants to "suspend" down to the 3rd. Used since medieval music to create tension-release.' },
            [t('stem.circuit.power')]: { intervals: [0, 7, 12], symbol: '5', desc: t('stem.synth.raw_strong_genredefining'), science: 'Just root + 5th (+ octave). No 3rd means no major/minor quality. Sounds huge with distortion because the simple 3:2 ratio stays clean when clipped.' },
            // Extended voicings (MiniChord-inspired)
            '6': { intervals: [0, 4, 7, 9], symbol: '6', desc: t('stem.synth.warm_jazzy_classic'), science: 'Major triad + major 6th. Central to Barry Harris harmony. A sweet, sophisticated alternative to maj7.' },
            'min6': { intervals: [0, 3, 7, 9], symbol: 'm6', desc: t('stem.synth.sophisticated_minor'), science: 'Minor triad + major 6th. Key chord in Barry Harris minor system. Creates smooth voice leading with dim7 passing chords.' },
            'add9': { intervals: [0, 2, 4, 7], symbol: 'add9', desc: t('stem.synth.bright_open_modern_pop'), science: 'Major triad + 9th (2nd up an octave). No 7th. Clean, shimmering sound popular in contemporary pop and worship music.' },
            '9': { intervals: [0, 4, 7, 10, 14], symbol: '9', desc: t('stem.synth.rich_funky_bluesy'), science: 'Dominant 7th + 9th. Full, complex sound. Essential in funk, R&B, and blues. Hendrix made the 7\u266F9 famous.' },
            'Maj9': { intervals: [0, 4, 7, 11, 14], symbol: 'maj9', desc: t('stem.synth.dreamy_lush'), science: 'Major 7th + 9th. Maximum smoothness and warmth. Neo-soul and jazz ballads. The quintessential "beautiful" chord.' },
            'Min9': { intervals: [0, 3, 7, 10, 14], symbol: 'm9', desc: t('stem.synth.cool_sophisticated'), science: 'Minor 7th + 9th. The quintessential modern jazz minor chord. Creates a contemplative, introspective mood.' },
            '13': { intervals: [0, 4, 7, 10, 14, 21], symbol: '13', desc: t('stem.synth.full_orchestral_complex'), science: 'Dominant with 9th + 13th. Six notes! Used in jazz endings, gospel turnarounds, and orchestral voicings.' },
            'dim7': { intervals: [0, 3, 6, 9], symbol: 'dim7', desc: t('stem.synth.symmetrical_passing'), science: 'All minor 3rds stacked. Only 3 unique dim7 chords exist (due to symmetry). Used as passing chords in Barry Harris harmony for smooth voice leading.' },
          };

          // Barry Harris harmony transformations
          var BARRY_HARRIS = {
            desc: 'Barry Harris (1929-2021) codified bebop harmony. His system uses 6th chords instead of 7ths and adds diminished passing chords between scale degrees for smooth voice leading.',
            majorScale: function (rootIdx) {
              // Barry Harris major scale: 1-2-3-4-5-6-\u266D7dim-7
              // Each degree alternates between 6th chord and dim7 passing chord
              return [
                { degree: 0, type: '6', label: 'I6' },
                { degree: 2, type: 'dim7', label: '\u266F\u2170dim7' },
                { degree: 2, type: '6', label: 'II6' },
                { degree: 4, type: 'dim7', label: '\u266F\u2171dim7' },
                { degree: 5, type: '6', label: 'IV6' },
                { degree: 7, type: 'dim7', label: '\u266F\u2163dim7' },
                { degree: 7, type: '6', label: 'V6' },
                { degree: 9, type: 'dim7', label: '\u266F\u2164dim7' },
              ];
            },
            minorScale: function (rootIdx) {
              return [
                { degree: 0, type: 'min6', label: 'i-6' },
                { degree: 2, type: 'dim7', label: '\u266F\u2170dim7' },
                { degree: 3, type: 'min6', label: '\u266DIII-6' },
                { degree: 5, type: 'dim7', label: '\u266F\u2172dim7' },
                { degree: 5, type: 'min6', label: 'iv-6' },
                { degree: 7, type: 'dim7', label: '\u266F\u2163dim7' },
                { degree: 7, type: 'min6', label: 'v-6' },
                { degree: 9, type: 'dim7', label: '\u266F\u2164dim7' },
              ];
            }
          };

          // ═══ WAVEFORM INFO ═══
          var WAVE_INFO = {
            sine: { emoji: '\u223F', desc: t('stem.synth.pure_tone_fundamental_only'), harmonics: t('stem.synth.fundamental'), science: 'A sine wave is the simplest sound \u2014 a single frequency with no overtones. All other waveforms are combinations of sine waves (Fourier theorem).' },
            square: { emoji: '\u25A0', desc: t('stem.synth.hollow_reedlike'), harmonics: 'Odd only (1,3,5,7...)', science: 'Contains only odd harmonics. Sounds like a clarinet or old-school video games. Each harmonic\u2019s amplitude = 1/n.' },
            sawtooth: { emoji: '\u25E2', desc: t('stem.synth.bright_buzzy_rich'), harmonics: 'All harmonics', science: 'Contains ALL harmonics (both odd and even), each at 1/n amplitude. Sounds like a violin or brass. The richest waveform for subtractive synthesis.' },
            triangle: { emoji: '\u25B3', desc: t('stem.synth.soft_flutelike'), harmonics: 'Odd only, fading fast', science: 'Like square but softer \u2014 odd harmonics at 1/n\u00B2. Sounds between sine and square, similar to a flute or ocarina.' }
          };
          var wInfo = WAVE_INFO[d.waveType || 'sine'];

          // ═══ INTERVALS ═══
          var INTERVALS = [
            { name: t('stem.synth.unison'), semitones: 0, ratio: '1:1', song: 'Same note', quality: 'perfect' },
            { name: t('stem.synth.minor_2nd'), semitones: 1, ratio: '16:15', song: 'Jaws theme', quality: 'dissonant' },
            { name: t('stem.synth.major_2nd'), semitones: 2, ratio: '9:8', song: 'Happy Birthday (1st two notes)', quality: 'dissonant' },
            { name: t('stem.synth.minor_3rd'), semitones: 3, ratio: '6:5', song: 'Greensleeves', quality: 'consonant' },
            { name: t('stem.synth.major_3rd'), semitones: 4, ratio: '5:4', song: 'Oh When the Saints', quality: 'consonant' },
            { name: t('stem.synth.perfect_4th'), semitones: 5, ratio: '4:3', song: 'Here Comes the Bride', quality: 'perfect' },
            { name: t('stem.synth.tritone'), semitones: 6, ratio: '\u221A2:1', song: 'The Simpsons theme', quality: 'dissonant' },
            { name: t('stem.synth.perfect_5th'), semitones: 7, ratio: '3:2', song: 'Star Wars opening', quality: 'perfect' },
            { name: t('stem.synth.minor_6th'), semitones: 8, ratio: '8:5', song: 'Love Story theme', quality: 'consonant' },
            { name: t('stem.synth.major_6th'), semitones: 9, ratio: '5:3', song: 'My Bonnie Lies Over the Ocean', quality: 'consonant' },
            { name: t('stem.synth.minor_7th'), semitones: 10, ratio: '16:9', song: 'Star Trek theme', quality: 'dissonant' },
            { name: t('stem.synth.major_7th'), semitones: 11, ratio: '15:8', song: 'Take On Me (chorus)', quality: 'dissonant' },
            { name: t('stem.synth.octave'), semitones: 12, ratio: '2:1', song: 'Somewhere Over the Rainbow', quality: 'perfect' },
          ];

          // ═══ PRESETS (incl Plucked for K-S) ═══
          var PRESETS = {
            'Piano': { waveType: 'triangle', attack: 0.005, decay: 0.15, sustain: 0.4, release: 0.4, volume: 0.6, filterCutoff: 8000, filterQ: 1, synthEngine: 'standard' },
            'Organ': { waveType: 'sine', attack: 0.01, decay: 0.05, sustain: 0.9, release: 0.1, volume: 0.5, chorusMix: 0.3, vibratoDepth: 0.2, vibratoRate: 6, synthEngine: 'standard' },
            'Strings': { waveType: 'sawtooth', attack: 0.3, decay: 0.1, sustain: 0.8, release: 0.6, volume: 0.4, filterCutoff: 3000, filterQ: 2, tremoloDepth: 0.15, tremoloRate: 5, synthEngine: 'standard' },
            'Bass': { waveType: 'sawtooth', attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.2, volume: 0.7, filterCutoff: 800, filterQ: 5, synthEngine: 'standard' },
            [t('stem.periodic.lead')]: { waveType: 'square', attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.15, volume: 0.5, distAmount: 15, vibratoDepth: 0.3, vibratoRate: 5.5, synthEngine: 'standard' },
            'Pad': { waveType: 'sine', attack: 0.8, decay: 0.3, sustain: 0.7, release: 1.5, volume: 0.35, reverbMix: 0.6, chorusMix: 0.4, chorusRate: 0.8, synthEngine: 'standard' },
            'Plucked': { waveType: 'sawtooth', attack: 0.001, decay: 0.01, sustain: 0.01, release: 0.01, volume: 0.7, filterCutoff: 6000, filterQ: 1, synthEngine: 'plucked', ksBrightness: 0.8, ksDamping: 0.996 },
            'Guitar': { waveType: 'sawtooth', attack: 0.001, decay: 0.01, sustain: 0.01, release: 0.01, volume: 0.7, synthEngine: 'plucked', ksBrightness: 0.6, ksDamping: 0.998 },
            'Retro': { waveType: 'square', attack: 0.001, decay: 0.08, sustain: 0.3, release: 0.05, volume: 0.45, filterCutoff: 2000, filterQ: 8, synthEngine: 'standard' },
            'Spooky': { waveType: 'sine', attack: 0.5, decay: 0.3, sustain: 0.6, release: 2, volume: 0.3, reverbMix: 0.8, reverbSize: 4, vibratoDepth: 0.5, vibratoRate: 3, synthEngine: 'standard' }
          };
          function applyPreset(name) {
            var p = PRESETS[name]; if (!p) return;
            Object.keys(p).forEach(function (k) { upd(k, p[k]); });
            upd('activePreset', name);
          }

          // ═══ PROGRESSIONS ═══
          var PROGRESSIONS = [
            { name: t('stem.synth.iivvi_classical'), degrees: [[0, 'Major'], [5, 'Major'], [7, 'Major'], [0, 'Major']], desc: t('stem.synth.the_foundation_of_western_music') },
            { name: t('stem.synth.ivviiv_pop'), degrees: [[0, 'Major'], [7, 'Major'], [9, 'Minor'], [5, 'Major']], desc: t('stem.synth.used_in_thousands_of_pop') },
            { name: 'ii-V-I (Jazz)', degrees: [[2, 'Min7'], [7, 'Dom7'], [0, 'Maj7']], desc: t('stem.synth.the_most_important_jazz_progression') },
            { name: t('stem.synth.iviivv_50s'), degrees: [[0, 'Major'], [9, 'Minor'], [5, 'Major'], [7, 'Major']], desc: t('stem.synth.classic_doowop_progression') },
            { name: '12-Bar Blues', degrees: [[0, 'Dom7'], [0, 'Dom7'], [0, 'Dom7'], [0, 'Dom7'], [5, 'Dom7'], [5, 'Dom7'], [0, 'Dom7'], [0, 'Dom7'], [7, 'Dom7'], [5, 'Dom7'], [0, 'Dom7'], [7, 'Dom7']], desc: t('stem.synth.foundation_of_blues_rock_and') },
            { name: 'vi-IV-I-V (Emo/Alt)', degrees: [[9, 'Minor'], [5, 'Major'], [0, 'Major'], [7, 'Major']], desc: t('stem.synth.common_in_alternative_and_emo') }
          ];

          // ═══ CIRCLE OF FIFTHS ═══
          var CIRCLE_OF_FIFTHS = [
            { key: 'C', minor: 'Am', sharps: 0, flats: 0 },
            { key: 'G', minor: 'Em', sharps: 1, flats: 0 },
            { key: 'D', minor: 'Bm', sharps: 2, flats: 0 },
            { key: 'A', minor: 'F#m', sharps: 3, flats: 0 },
            { key: 'E', minor: 'C#m', sharps: 4, flats: 0 },
            { key: 'B', minor: 'G#m', sharps: 5, flats: 0 },
            { key: 'F#/G\u266D', minor: 'D#m/E\u266Dm', sharps: 6, flats: 6 },
            { key: 'D\u266D', minor: 'B\u266Dm', sharps: 0, flats: 5 },
            { key: 'A\u266D', minor: 'Fm', sharps: 0, flats: 4 },
            { key: 'E\u266D', minor: 'Cm', sharps: 0, flats: 3 },
            { key: 'B\u266D', minor: 'Gm', sharps: 0, flats: 2 },
            { key: 'F', minor: 'Dm', sharps: 0, flats: 1 },
          ];

          // ═══ HARMONIC SERIES ═══
          var HARMONICS_INFO = [
            { n: 1, name: t('stem.synth.fundamental'), interval: t('stem.synth.unison'), ratio: '1x' },
            { n: 2, name: '1st Overtone', interval: t('stem.synth.octave'), ratio: '2x' },
            { n: 3, name: '2nd Overtone', interval: 'P5 + Oct', ratio: '3x' },
            { n: 4, name: '3rd Overtone', interval: '2 Octaves', ratio: '4x' },
            { n: 5, name: '4th Overtone', interval: 'M3 + 2 Oct', ratio: '5x' },
            { n: 6, name: '5th Overtone', interval: 'P5 + 2 Oct', ratio: '6x' },
            { n: 7, name: '6th Overtone', interval: '\u266D7 + 2 Oct', ratio: '7x' },
            { n: 8, name: '7th Overtone', interval: '3 Octaves', ratio: '8x' },
          ];
          function playHarmonic(harmNum) {
            var baseFreq = noteFreq(selectedRoot, d.octave || 4);
            playNoteFor(baseFreq * harmNum, 'harm_' + harmNum, 800);
          }

          // ═══ SEQUENCER DATA ═══
          var SEQ_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C5', 'C#5', 'D5', 'D#5', 'E5'];
          var SEQ_FREQS = [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.00, 415.30, 440.00, 466.16, 493.88, 523.25, 554.37, 587.33, 622.25, 659.26];
          var SEQ_IS_BLACK = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0]; // for grid styling
          var DRUM_TYPES = ['kick', 'snare', 'hihat', 'clap', 'tom'];
          var DRUM_LABELS = ['\uD83E\uDD41 Kick', '\uD83E\uDD41 Snare', '\uD83E\uDD43 Hi-Hat', '\uD83D\uDC4F Clap', '\uD83E\uDD41 Tom'];
          var LOOP_LENGTHS = [8, 12, 16, 24, 32, 48, 64];
          var TIME_SIGS = { '4/4': { beats: 4, note: 4 }, '3/4': { beats: 3, note: 4 }, '6/8': { beats: 6, note: 8 }, '5/4': { beats: 5, note: 4 }, '7/8': { beats: 7, note: 8 } };

          // ═══ EFFECT TOOLTIPS ═══
          var EFFECT_TIPS = {
            adsr: { title: t('stem.synth.adsr_envelope'), text: 'Attack: time to reach full volume. Decay: time to fall to sustain. Sustain: held volume level. Release: fade-out time after key release.' },
            scales: { title: t('stem.synth.scales_modes'), text: 'A scale is an ordered set of pitches. Modes are rotations of the scale starting on different degrees. Each creates a different emotional mood.' },
            chords: { title: t('stem.synth.chord_theory'), text: 'Chords are built by stacking intervals (3rds). Major uses a major 3rd + minor 3rd. Minor reverses them. Extended chords add 7ths, 9ths, and beyond.' },
            drums: { title: t('stem.synth.drum_synthesis'), text: 'Kicks use a sine oscillator with a pitch sweep. Snares combine noise (filtered) + tone body. Hi-hats use high-pass filtered noise bursts.' },
            timeSig: { title: t('stem.synth.time_signatures'), text: '4/4 = 4 quarter-note beats per bar (most common). 3/4 = waltz feel. 6/8 = compound duple. 5/4 and 7/8 create asymmetric, exotic grooves.' },
            circleOfFifths: { title: t('stem.synth.circle_of_fifths'), text: 'Keys arranged by ascending 5ths clockwise. Adjacent keys share 6 of 7 notes. Moving clockwise adds sharps; counter-clockwise adds flats.' },
            harmonicSeries: { title: t('stem.synth.harmonic_series'), text: 'Every musical sound contains overtones above the fundamental. Their relative strengths determine timbre \u2014 why a trumpet sounds different from a flute at the same pitch.' },
            intervals: { title: t('stem.synth.musical_intervals'), text: 'An interval is the distance between two pitches, measured in semitones. The frequency ratio determines consonance (simple ratios like 3:2 sound smooth).' },
            arpeggiator: { title: t('stem.synth.arpeggiator'), text: 'Plays chord notes one at a time in sequence. Up = low to high, Down = high to low. Creates flowing patterns from static chords.' },
            filter: { title: t('stem.synth.resonant_filter'), text: 'A filter removes frequencies above (lowpass), below (highpass), or around (bandpass) a cutoff frequency. Resonance (Q) amplifies frequencies near cutoff, creating a peak.' },
            tremolo: { title: t('stem.synth.tremolo_vibrato'), text: 'Tremolo: periodic volume changes (amplitude modulation). Vibrato: periodic pitch changes (frequency modulation). Both controlled by an LFO (Low Frequency Oscillator).' },
            karplusStrong: { title: t('stem.synth.karplusstrong_synthesis'), text: 'Discovered in 1983. A noise burst feeds into a very short delay line with feedback. The delay time determines pitch. A filter in the feedback loop controls brightness and decay. Naturally simulates plucked strings.' },
            composition: { title: t('stem.synth.music_composition'), text: 'The sequencer is a composition tool. Each step represents a beat subdivision. The melody row sets pitched notes, drums add rhythm. Musical notation shows what you create.' },
            notation: { title: t('stem.synth.musical_notation'), text: 'Notes on lines and spaces represent pitches. Duration is shown by note shape: whole (\u25CB), half (\u{1D15E}), quarter (\u2669), eighth (\u266A). The staff uses 5 lines.' }
          };

          // ═══ MUSIC QUIZ ═══
          var MUSIC_QUIZ = [
            { q: 'What waveform contains ONLY the fundamental frequency?', a: 'Sine', opts: ['Sine', 'Square', 'Sawtooth', 'Triangle'] },
            { q: 'What does ADSR stand for?', a: 'Attack Decay Sustain Release', opts: ['Attack Decay Sustain Release', 'Audio Digital Sound Router', 'Amplitude Duration Signal Response', 'Analog Delay Synth Reverb'] },
            { q: 'Which interval has a 3:2 frequency ratio?', a: 'Perfect Fifth', opts: ['Perfect Fifth', 'Major Third', t('stem.synth.octave'), 'Perfect Fourth'] },
            { q: 'What key has NO sharps or flats?', a: 'C Major', opts: ['C Major', 'G Major', 'D Major', 'A Major'] },
            { q: 'How many semitones in an octave?', a: '12', opts: ['12', '8', '7', '10'] },
            { q: 'What makes a major chord sound \u201Chappy\u201D?', a: 'Major third interval', opts: ['Major third interval', 'More notes', 'Higher pitch', 'Louder volume'] },
            { q: 'What is a tritone?', a: '6 semitones apart', opts: ['6 semitones apart', 'Three tones', 'A type of chord', 'A drum pattern'] },
            { q: 'Which mode sounds "Spanish/Flamenco"?', a: 'Phrygian', opts: ['Phrygian', 'Dorian', 'Lydian', 'Mixolydian'] },
            { q: 'What creates the difference in timbre between instruments?', a: 'Harmonic content', opts: ['Harmonic content', 'Volume', 'Pitch', 'Duration'] },
            { q: 'In equal temperament, the ratio between adjacent semitones is:', a: '2^(1/12)', opts: ['2^(1/12)', '12/7', '3/2', '1.5'] },
            { q: 'What does a low-pass filter do?', a: 'Removes high frequencies', opts: ['Removes high frequencies', 'Removes low frequencies', 'Adds distortion', 'Adds reverb'] },
            { q: 'A ii-V-I progression is most associated with:', a: 'Jazz', opts: ['Jazz', 'Metal', 'Country', 'Classical'] },
            { q: 'Karplus-Strong synthesis creates sounds resembling:', a: 'Plucked strings', opts: ['Plucked strings', 'Brass instruments', 'Drums', 'Wind instruments'] },
            { q: 'What is resonance (Q) in a filter?', a: 'Boost at cutoff frequency', opts: ['Boost at cutoff frequency', 'Echo effect', 'Volume control', 'Pitch shift'] },
            { q: 'How many notes does a pentatonic scale have?', a: '5', opts: ['5', '7', '6', '8'] },
            { q: 'Barry Harris was famous for using which chord type?', a: '6th chords', opts: ['6th chords', 'Power chords', 'Suspended chords', '11th chords'] },
            { q: 'What effect periodically changes volume?', a: 'Tremolo', opts: ['Tremolo', 'Vibrato', 'Reverb', 'Distortion'] },
            { q: 'Which waveform has ALL harmonics?', a: 'Sawtooth', opts: ['Sawtooth', 'Sine', 'Square', 'Triangle'] },
            { q: 'What is the relative minor of C major?', a: 'A minor', opts: ['A minor', 'D minor', 'E minor', 'B minor'] },
            { q: 'What does LFO stand for?', a: 'Low Frequency Oscillator', opts: ['Low Frequency Oscillator', 'Linear Filter Output', 'Logarithmic Fade Out', 'Loop Function Operator'] },
            { q: 'In the circle of fifths, moving clockwise adds:', a: 'Sharps', opts: ['Sharps', 'Flats', 'Notes', 'Octaves'] },
            { q: 'A chord inversion changes:', a: 'Which note is on bottom', opts: ['Which note is on bottom', 'The chord quality', 'The number of notes', 'The key signature'] },
            { q: 'What note value gets one beat in 4/4 time?', a: 'Quarter note', opts: ['Quarter note', 'Half note', 'Whole note', 'Eighth note'] },
            { q: 'An augmented chord is built with:', a: 'Two major thirds', opts: ['Two major thirds', 'Two minor thirds', 'A major and minor third', 'A fifth and octave'] },
            { q: 'Vibrato modulates:', a: 'Pitch', opts: ['Pitch', 'Volume', 'Duration', 'Timbre'] },
            { q: 'The \u201Cblue note\u201D in a blues scale is:', a: 'Flatted fifth', opts: ['Flatted fifth', 'Sharp fourth', 'Minor second', 'Major seventh'] },
            { q: 'How many unique diminished 7th chords exist?', a: '3', opts: ['3', '12', '6', '4'] },
          ];

          // ═══ STATE ═══
          var synthTab = d.synthTab || 'play';
          var selectedRoot = d.selectedRoot || 'C';
          var selectedScale = d.selectedScale || 'Major';
          var selectedChord = d.selectedChord || 'Major';
          var chordRoot = d.chordRoot || 'C';
          var chordInversion = d.chordInversion || 0;
          var scaleLock = d.scaleLock || false;
          var looping = d.looping !== false;
          var seqPlaying = d.seqPlaying || false;
          var metroOn = d.metroOn || false;
          var arpOn = d.arpOn || false;
          var arpPattern = d.arpPattern || 'up';
          var showFFT = d.showFFT || false;
          var timeSig = d.timeSig || '4/4';
          var loopLen = d.loopLen || 16;
          var seq = d.sequence || new Array(loopLen).fill(0);
          var drumSeq = d.drumSequence || d.drumSeq || {};
          var intervalGame = d.intervalGame;
          var jazzMode = d.jazzMode || false;
          var synthEngine = d.synthEngine || 'standard';
          var vizMode = d.vizMode || 'waveform'; // waveform, lissajous, helix

          // Scale helpers
          var rootIdx = NOTE_NAMES.indexOf(selectedRoot);
          var scaleIntervals = SCALES[selectedScale] ? SCALES[selectedScale].intervals : [0, 2, 4, 5, 7, 9, 11];
          function isInScale(semitone) { return scaleIntervals.indexOf(semitone % 12) !== -1; }

          // ═══ CHORD & SCALE PLAYBACK ═══
          function playChord(root, chordType, inv) {
            var chordData = CHORDS[chordType]; if (!chordData) return;
            var ri = NOTE_NAMES.indexOf(root); var intervals = chordData.intervals.slice();
            for (var i = 0; i < (inv || 0); i++) { if (intervals.length > 1) intervals.push(intervals.shift() + 12); }
            intervals.forEach(function (intv, idx) {
              var nIdx = (ri + intv) % 12; var nOct = (d.octave || 4) + Math.floor((ri + intv) / 12);
              var freq = noteFreq(NOTE_NAMES[nIdx], nOct);
              if (synthEngine === 'plucked') { playPlucked(freq, 'chord_' + idx, d.ksBrightness, d.ksDamping); }
              else { playNoteFor(freq, 'chord_' + idx, 1200); }
            });
          }
          function playScale(root, scaleName, descending) {
            var s = SCALES[scaleName]; if (!s) return; var ri = NOTE_NAMES.indexOf(root);
            var intervals = descending ? s.intervals.slice().reverse() : s.intervals.slice();
            intervals.forEach(function (intv, idx) {
              setTimeout(function () {
                var nIdx = (ri + intv) % 12; var nOct = (d.octave || 4) + Math.floor((ri + intv) / 12);
                playNoteFor(noteFreq(NOTE_NAMES[nIdx], nOct), 'scale_' + idx, 350);
              }, idx * 300);
            });
          }
          function playProgression(prog) {
            var ri = NOTE_NAMES.indexOf(selectedRoot);
            prog.degrees.forEach(function (deg, idx) {
              setTimeout(function () {
                var chordRootIdx = (ri + deg[0]) % 12;
                playChord(NOTE_NAMES[chordRootIdx], deg[1], 0);
              }, idx * 800);
            });
          }

          // ═══ SEQUENCER ═══
          function toggleSeqStep(idx) { var s = seq.slice(); s[idx] = (s[idx] + 1) % (SEQ_NOTES.length + 1); upd('sequence', s); }
          function setSeqStep(idx, noteIdx) { var s = seq.slice(); s[idx] = noteIdx; upd('sequence', s); }
          function toggleDrumStep(type, idx) {
            var ds = Object.assign({}, drumSeq);
            if (!ds[type]) ds[type] = new Array(loopLen).fill(0);
            ds[type] = ds[type].slice(); ds[type][idx] = ds[type][idx] ? 0 : 1;
            upd('drumSequence', ds);
          }
          function startSequencer() {
            stopSequencer(); upd('seqPlaying', true); upd('seqStep', 0);
            var step = 0; var bpm = d.bpm || 120; var msPerStep = (60000 / bpm) / 2;
            window._alloSynthSeqInterval = setInterval(function () {
              var currentSeq = d.sequence || seq; var currentDrums = d.drumSequence || d.drumSeq || drumSeq;
              var noteIdx = currentSeq[step];
              if (noteIdx > 0 && noteIdx <= SEQ_NOTES.length) {
                var freq = SEQ_FREQS[noteIdx - 1];
                if (synthEngine === 'plucked') playPlucked(freq, 'seq_' + step, d.ksBrightness, d.ksDamping);
                else playNoteFor(freq, 'seq_' + step, msPerStep * 0.8);
              }
              DRUM_TYPES.forEach(function (dt) { if (currentDrums[dt] && currentDrums[dt][step]) playDrum(dt); });
              upd('seqStep', step);
              step = (step + 1) % loopLen;
              if (step === 0 && !looping) { stopSequencer(); }
            }, msPerStep);
          }
          function stopSequencer() { if (window._alloSynthSeqInterval) { clearInterval(window._alloSynthSeqInterval); window._alloSynthSeqInterval = null; } upd('seqPlaying', false); }
          function startMetronome() {
            stopMetronome(); upd('metroOn', true);
            var beat = 0; var bpm = d.bpm || 120; var ms = 60000 / bpm;
            var beatsPerMeasure = TIME_SIGS[timeSig] ? TIME_SIGS[timeSig].beats : 4;
            window._alloMetronomeInterval = setInterval(function () { playClick(beat === 0); upd('metroBeat', beat); beat = (beat + 1) % beatsPerMeasure; }, ms);
          }
          function stopMetronome() { if (window._alloMetronomeInterval) { clearInterval(window._alloMetronomeInterval); window._alloMetronomeInterval = null; } upd('metroOn', false); upd('metroBeat', -1); }
          function startArpeggiator() {
            stopArpeggiator(); upd('arpOn', true);
            var chordData = CHORDS[selectedChord]; if (!chordData) return;
            var ri = NOTE_NAMES.indexOf(chordRoot); var intervals = chordData.intervals.slice();
            var arpOctaves = d.arpOctaves || 1;
            var allNotes = [];
            for (var oi = 0; oi < arpOctaves; oi++) { intervals.forEach(function (intv) { allNotes.push(intv + oi * 12); }); }
            var step = 0; var ascending = true; var ms = (60000 / (d.bpm || 120)) / 2;
            window._alloArpInterval = setInterval(function () {
              var intv = allNotes[step]; var nIdx = (ri + intv) % 12;
              var nOct = (d.octave || 4) + Math.floor((ri + intv) / 12);
              playNoteFor(noteFreq(NOTE_NAMES[nIdx], nOct), 'arp_' + step, ms * 0.8);
              if (arpPattern === 'up') { step = (step + 1) % allNotes.length; }
              else if (arpPattern === 'down') { step = step <= 0 ? allNotes.length - 1 : step - 1; }
              else if (arpPattern === 'updown') {
                if (ascending) { step++; if (step >= allNotes.length - 1) ascending = false; }
                else { step--; if (step <= 0) ascending = true; }
              }
              else { step = Math.floor(Math.random() * allNotes.length); }
            }, ms);
          }
          function stopArpeggiator() { if (window._alloArpInterval) { clearInterval(window._alloArpInterval); window._alloArpInterval = null; } upd('arpOn', false); }

          // ═══ INTERVAL EAR TRAINING ═══
          function startIntervalGame() {
            var idx = 1 + Math.floor(Math.random() * 12);
            var intv = INTERVALS[idx]; var base = noteFreq(selectedRoot, d.octave || 4);
            var top = base * Math.pow(2, intv.semitones / 12);
            playNoteFor(base, 'ear_base', 600);
            setTimeout(function () { playNoteFor(top, 'ear_top', 600); }, 700);
            upd('intervalGame', { answer: intv.name, base: base, top: top, answered: false, chosen: null, score: (intervalGame && intervalGame.score) || 0, streak: (intervalGame && intervalGame.streak) || 0 });
          }
          function replayInterval() {
            if (!intervalGame) return;
            playNoteFor(intervalGame.base, 'ear_base', 600);
            setTimeout(function () { playNoteFor(intervalGame.top, 'ear_top', 600); }, 700);
          }

          // ═══ KEYBOARD HANDLER (delegated to top-level useEffect via window refs) ═══
          var KEYBOARD_MAP = {
            'z': 0, 'x': 2, 'c': 4, 'v': 5, 'b': 7, 'n': 9, 'm': 11, ',': 12, '.': 14, '/': 16,
            's': 1, 'd': 3, 'g': 6, 'h': 8, 'j': 10, 'l': 13, ';': 15
          };
          window._alloSynthKeyDown = function (e) {
            if (e.repeat) return;
            var semi = KEYBOARD_MAP[e.key.toLowerCase()];
            if (semi !== undefined && synthTab === 'play') {
              var key = KEYS[semi];
              if (key) {
                var noteId = key.note + key.octave;
                if (scaleLock && !isInScale(key.semitone)) return;
                if (synthEngine === 'plucked') { playPlucked(key.freq, noteId, d.ksBrightness, d.ksDamping); }
                else { playNote(key.freq, noteId); }
                upd('activeKeys', (d.activeKeys || []).concat([noteId])); upd('lastNote', noteId); upd('lastFreq', key.freq);
              }
            }
          };
          window._alloSynthKeyUp = function (e) {
            var semi = KEYBOARD_MAP[e.key.toLowerCase()];
            if (semi !== undefined) {
              var key = KEYS[semi];
              if (key) { var noteId = key.note + key.octave; stopNote(noteId); upd('activeKeys', (d.activeKeys || []).filter(function (x) { return x !== noteId; })); }
            }
          };

          // ═══ NOTATION HELPERS (for composition view) ═══
          var NOTE_TO_STAFF = { 'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6 };
          function seqToNotation(seqArr) {
            // Convert sequencer step array to notation-like data
            return seqArr.map(function (noteIdx, stepIdx) {
              if (noteIdx === 0) return { rest: true, step: stepIdx };
              var name = SEQ_NOTES[noteIdx - 1] || 'C';
              var baseName = name.replace(/[0-9]/g, '');
              var staffPos = NOTE_TO_STAFF[baseName] || 0;
              if (name.indexOf('5') !== -1) staffPos += 7;
              return { note: name, staffPos: staffPos, step: stepIdx, rest: false };
            });
          }

          // ═══ OSCILLOSCOPE REF ═══
          var canvasRef = function (canvasEl) {
            if (!canvasEl) {
              if (canvasRef._lastCanvas && canvasRef._lastCanvas._synthVizAnim) {
                cancelAnimationFrame(canvasRef._lastCanvas._synthVizAnim);
                canvasRef._lastCanvas._synthVizInit = false;
              }
              canvasRef._lastCanvas = null;
              return;
            }
            if (canvasEl._synthVizInit) return;
            canvasRef._lastCanvas = canvasEl;
            canvasEl._synthVizInit = true;
            var W = canvasEl.width = canvasEl.offsetWidth * 2;
            var H = canvasEl.height = canvasEl.offsetHeight * 2;
            var ctx = canvasEl.getContext('2d');
            function draw() {
              canvasEl._synthVizAnim = requestAnimationFrame(draw);
              var analyser = window._alloSynthAnalyser;
              var vizMode = canvasEl.dataset.vizMode || 'waveform';
              ctx.fillStyle = '#0f0a1e'; ctx.fillRect(0, 0, W, H);
              // Grid
              ctx.strokeStyle = 'rgba(139,92,246,0.08)'; ctx.lineWidth = 1;
              for (var gx = 0; gx < W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
              for (var gy = 0; gy < H; gy += 20) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
              // Center line
              ctx.strokeStyle = 'rgba(139,92,246,0.15)'; ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
              if (!analyser) return;
              var showFFTMode = canvasEl.dataset.showFft === 'true';

              if (vizMode === 'lissajous') {
                // Lissajous: plot waveform against a phase-shifted version
                var buf = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteTimeDomainData(buf);
                ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 2; ctx.beginPath();
                var phaseShift = Math.floor(buf.length / 4);
                for (var i = 0; i < buf.length - phaseShift; i++) {
                  var x = (buf[i] / 255) * W;
                  var y = (buf[i + phaseShift] / 255) * H;
                  if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();
                // Glow
                ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 8;
                ctx.stroke(); ctx.shadowBlur = 0;
              } else if (vizMode === 'helix') {
                // 3D helix: waveform wrapping in pseudo-3D
                var buf = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteTimeDomainData(buf);
                var turns = 3; var perspective = 0.3;
                ctx.lineWidth = 2;
                for (var i = 0; i < buf.length; i++) {
                  var t = i / buf.length;
                  var angle = t * turns * Math.PI * 2;
                  var amplitude = (buf[i] / 128 - 1) * (H * 0.35);
                  var x = t * W;
                  var depth = Math.sin(angle) * perspective + 1;
                  var y = H / 2 + amplitude * Math.cos(angle) * depth;
                  var hue = 270 + t * 60;
                  ctx.fillStyle = 'hsla(' + hue + ', 80%, 65%, ' + (0.3 + depth * 0.35) + ')';
                  ctx.fillRect(x, y, 2, 2);
                }
              } else if (showFFTMode) {
                // Frequency spectrum
                var freqData = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(freqData);
                var barW = W / freqData.length * 2.5;
                for (var fi = 0; fi < freqData.length / 2.5; fi++) {
                  var val = freqData[fi] / 255;
                  var barH = val * H * 0.85;
                  var hue = 280 - val * 60;
                  ctx.fillStyle = 'hsla(' + hue + ', 80%, 55%, 0.8)';
                  ctx.fillRect(fi * barW, H - barH, barW - 1, barH);
                  // Glow top
                  ctx.fillStyle = 'hsla(' + hue + ', 80%, 75%, 0.4)';
                  ctx.fillRect(fi * barW, H - barH - 2, barW - 1, 3);
                }
              } else {
                // Waveform + note color glow
                var buf = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteTimeDomainData(buf);
                // Glow ring
                var noteColor = canvasEl.dataset.noteColor || '#a855f7';
                var hasSignal = false;
                for (var ci = 0; ci < buf.length; ci++) { if (Math.abs(buf[ci] - 128) > 3) { hasSignal = true; break; } }
                if (hasSignal) {
                  ctx.save();
                  ctx.shadowColor = noteColor; ctx.shadowBlur = 20;
                  ctx.strokeStyle = noteColor; ctx.lineWidth = 3;
                  ctx.strokeRect(2, 2, W - 4, H - 4);
                  ctx.restore();
                }
                // Waveform
                ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 2; ctx.beginPath();
                var sliceWidth = W / buf.length;
                for (var i = 0; i < buf.length; i++) {
                  var v = buf[i] / 128.0; var y = (v * H) / 2;
                  if (i === 0) ctx.moveTo(0, y); else ctx.lineTo(i * sliceWidth, y);
                }
                ctx.stroke();
                // Bright center line glow
                ctx.strokeStyle = 'rgba(168,85,247,0.4)'; ctx.lineWidth = 4;
                ctx.stroke();
              }

              // Particles
              if (window._alloParticles && window._alloParticles.length > 0) {
                var particles = window._alloParticles;
                for (var pi = particles.length - 1; pi >= 0; pi--) {
                  var p = particles[pi];
                  p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life -= p.decay;
                  if (p.life <= 0) { particles.splice(pi, 1); continue; }
                  ctx.fillStyle = p.color; ctx.globalAlpha = p.life;
                  ctx.beginPath(); ctx.arc(p.x * 2, p.y * 2, p.size * 2, 0, Math.PI * 2); ctx.fill();
                }
                ctx.globalAlpha = 1;
              }
            }
            canvasEl._synthVizAnim = requestAnimationFrame(draw);
          };

          // ═════════════════════════════════════════════════════════════
          // ═══ RETURN: UI RENDERING ═══
          // ═════════════════════════════════════════════════════════════

          // ═══ KEYBOARD CHORD SWITCHING (QAZ/WSX/EDC/RFV/TGB/YHN/UJM) ═══
          var CHORD_KEY_MAP = {
            'q': { root: 'C', type: 'Major' }, 'a': { root: 'C', type: 'Minor' }, 'z': { root: 'C', type: 'Dom7' },
            'w': { root: 'D', type: 'Major' }, 's': { root: 'D', type: 'Minor' }, 'x': { root: 'D', type: 'Dom7' },
            'e': { root: 'E', type: 'Major' }, 'd': { root: 'E', type: 'Minor' }, 'c': { root: 'E', type: 'Dom7' },
            'r': { root: 'F', type: 'Major' }, 'f': { root: 'F', type: 'Minor' }, 'v': { root: 'F', type: 'Dom7' },
            't': { root: 'G', type: 'Major' }, 'g': { root: 'G', type: 'Minor' }, 'b': { root: 'G', type: 'Dom7' },
            'y': { root: 'A', type: 'Major' }, 'h': { root: 'A', type: 'Minor' }, 'n': { root: 'A', type: 'Dom7' },
            'u': { root: 'B', type: 'Major' }, 'j': { root: 'B', type: 'Minor' }, 'm': { root: 'B', type: 'Dom7' }
          };
          React.useEffect(function () {
            if (synthTab !== 'harmonypad' && synthTab !== 'beatpad') return;
            function onKeyDown(e) {
              if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
              var k = e.key.toLowerCase();
              if (synthTab === 'harmonypad') {
                var chord = CHORD_KEY_MAP[k];
                if (chord) { upd('omniChordRoot', chord.root); upd('omniChordType', chord.type); e.preventDefault(); return; }
                if (k === ' ') { strumHarmony(d.omniChordRoot || 'C', d.omniChordType || 'Major', d.omniVoice || 'harp'); e.preventDefault(); return; }
              }
              // Beat pad keyboard triggers (number row for pads)
              if (synthTab === 'beatpad') {
                var padKeys = ['1','2','3','4','5','6','7','8','9','0','-','='];
                var pi = padKeys.indexOf(k);
                if (pi !== -1 && pi < (window._alloBeatPadSounds || []).length) {
                  var ps = (window._alloBeatPadSounds || [])[pi];
                  if (ps) playDrum(ps.type);
                  upd('beatPadActive', pi);
                  setTimeout(function () { upd('beatPadActive', -1); }, 150);
                  e.preventDefault();
                }
              }
            }
            document.addEventListener('keydown', onKeyDown);
            return function () { document.removeEventListener('keydown', onKeyDown); };
          }, [synthTab, d.omniChordRoot, d.omniChordType, d.omniVoice]);

          // ═══ WEB MIDI CONTROLLER SUPPORT ═══
          React.useEffect(function () {
            if (!navigator.requestMIDIAccess) return;
            var cleanup = [];
            navigator.requestMIDIAccess({ sysex: false }).then(function (midi) {
              upd('midiConnected', midi.inputs.size > 0);
              midi.onstatechange = function () { upd('midiConnected', midi.inputs.size > 0); };
              midi.inputs.forEach(function (input) {
                function handler(msg) {
                  var cmd = msg.data[0] & 0xf0;
                  var note = msg.data[1];
                  var vel = msg.data.length > 2 ? msg.data[2] : 0;
                  if (cmd === 0x90 && vel > 0) {
                    // Note On — play synth note
                    var nNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
                    var midiOct = Math.floor(note / 12) - 1;
                    var midiNote = nNames[note % 12];
                    var freq = 440 * Math.pow(2, (note - 69) / 12);
                    var volume = vel / 127;
                    playHarmonyTone(freq, 'midi_' + note, 2000, d.omniVoice || 'harp');
                  }
                  if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) {
                    // Note Off — stop note
                    if (window._alloSynthActiveNotes['midi_' + note]) {
                      var n = window._alloSynthActiveNotes['midi_' + note];
                      if (n.master) { n.master.gain.cancelScheduledValues(0); n.master.gain.linearRampToValueAtTime(0, getCtx().ctx.currentTime + 0.05); }
                      delete window._alloSynthActiveNotes['midi_' + note];
                    }
                  }
                }
                input.addEventListener('midimessage', handler);
                cleanup.push(function () { input.removeEventListener('midimessage', handler); });
              });
            }).catch(function () { /* MIDI not available */ });
            return function () { cleanup.forEach(function (fn) { fn(); }); };
          }, [d.omniVoice]);

          // ═══ SOUND ENGINE BOOST: Reverb + Compressor ═══
          (function initSynthEffects() {
            if (window._alloSynthReverbInit) return;
            window._alloSynthReverbInit = true;
            try {
              var audio = getCtx();
              var ctx = audio.ctx;
              // Create DynamicsCompressor for master limiting
              if (!audio._compressor) {
                var comp = ctx.createDynamicsCompressor();
                comp.threshold.value = -12;
                comp.knee.value = 10;
                comp.ratio.value = 4;
                comp.attack.value = 0.003;
                comp.release.value = 0.15;
                // Create convolver reverb with procedural impulse response
                var reverbLen = ctx.sampleRate * 1.5;
                var impulse = ctx.createBuffer(2, reverbLen, ctx.sampleRate);
                for (var ch = 0; ch < 2; ch++) {
                  var impData = impulse.getChannelData(ch);
                  for (var i = 0; i < reverbLen; i++) {
                    impData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLen, 2.5);
                  }
                }
                var convolver = ctx.createConvolver();
                convolver.buffer = impulse;
                var reverbGain = ctx.createGain();
                reverbGain.gain.value = 0.15; // wet mix
                var dryGain = ctx.createGain();
                dryGain.gain.value = 0.85;
                // Reroute: audio.gain → split → dry + reverb → compressor → destination
                audio.gain.disconnect();
                audio.gain.connect(dryGain);
                audio.gain.connect(convolver);
                convolver.connect(reverbGain);
                dryGain.connect(comp);
                reverbGain.connect(comp);
                comp.connect(ctx.destination);
                audio._compressor = comp;
                audio._convolver = convolver;
                audio._reverbGain = reverbGain;
              }
            } catch (e) { console.warn('[Synth] Reverb init failed:', e); }
          })();

          // ═══ BEAT PAD: 16-step sequencer state & engine ═══
          var BEAT_PAD_SOUNDS = [
            { type: 'kick', label: 'Kick', color: '#ef4444', key: '1' },
            { type: 'snare', label: 'Snare', color: '#f97316', key: '2' },
            { type: 'clap', label: 'Clap', color: '#eab308', key: '3' },
            { type: 'rim', label: 'Rim', color: '#84cc16', key: '4' },
            { type: 'hihat', label: 'CH Hat', color: '#22c55e', key: '5' },
            { type: 'openhat', label: 'OH Hat', color: '#06b6d4', key: '6' },
            { type: 'cymbal', label: 'Cymbal', color: '#3b82f6', key: '7' },
            { type: 'tom1', label: 'Tom Hi', color: '#8b5cf6', key: '8' },
            { type: 'tom2', label: 'Tom Lo', color: '#a855f7', key: '9' },
            { type: 'cowbell', label: 'Cowbell', color: '#ec4899', key: '0' },
            { type: 'clave', label: 'Clave', color: '#f43f5e', key: '-' },
            { type: 'shaker', label: 'Shaker', color: '#14b8a6', key: '=' }
          ];
          window._alloBeatPadSounds = BEAT_PAD_SOUNDS;

          // Extended drum synthesis for new types
          var _origPlayDrum = playDrum;
          function playDrumExt(type) {
            var audio = getCtx(); var ctx = audio.ctx; var now = ctx.currentTime;
            var drumGain = ctx.createGain(); drumGain.connect(audio.gain);
            if (type === 'clap') {
              // Multi-burst noise clap
              for (var ci = 0; ci < 3; ci++) {
                (function(delay) {
                  var noise = ctx.createBufferSource(); var nBuf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
                  var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
                  noise.buffer = nBuf;
                  var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2000; bp.Q.value = 1.5;
                  var eg = ctx.createGain(); eg.gain.setValueAtTime(0.6, now + delay); eg.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.08);
                  noise.connect(bp); bp.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.7;
                  noise.start(now + delay); noise.stop(now + delay + 0.08);
                })(ci * 0.012);
              }
            } else if (type === 'rim') {
              var osc = ctx.createOscillator(); osc.type = 'square';
              osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);
              var eg = ctx.createGain(); eg.gain.setValueAtTime(0.5, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
              osc.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.5; osc.start(now); osc.stop(now + 0.05);
            } else if (type === 'openhat') {
              var noise = ctx.createBufferSource(); var nBuf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000;
              var eg = ctx.createGain(); eg.gain.setValueAtTime(0.4, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
              noise.connect(hp); hp.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.5; noise.start(now); noise.stop(now + 0.3);
            } else if (type === 'cymbal') {
              var noise = ctx.createBufferSource(); var nBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 8000;
              var eg = ctx.createGain(); eg.gain.setValueAtTime(0.3, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
              noise.connect(hp); hp.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.4; noise.start(now); noise.stop(now + 0.5);
            } else if (type === 'tom1' || type === 'tom2') {
              var baseF = type === 'tom1' ? 200 : 120;
              var osc = ctx.createOscillator(); osc.type = 'sine';
              osc.frequency.setValueAtTime(baseF, now); osc.frequency.exponentialRampToValueAtTime(baseF * 0.5, now + 0.2);
              var eg = ctx.createGain(); eg.gain.setValueAtTime(0.7, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
              osc.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.6; osc.start(now); osc.stop(now + 0.25);
            } else if (type === 'cowbell') {
              var osc1 = ctx.createOscillator(); osc1.type = 'square'; osc1.frequency.value = 560;
              var osc2 = ctx.createOscillator(); osc2.type = 'square'; osc2.frequency.value = 845;
              var eg = ctx.createGain(); eg.gain.setValueAtTime(0.5, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
              var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 3;
              osc1.connect(bp); osc2.connect(bp); bp.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.4;
              osc1.start(now); osc2.start(now); osc1.stop(now + 0.3); osc2.stop(now + 0.3);
            } else if (type === 'clave') {
              var osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = 2500;
              var eg = ctx.createGain(); eg.gain.setValueAtTime(0.6, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
              osc.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.5; osc.start(now); osc.stop(now + 0.04);
            } else if (type === 'shaker') {
              var noise = ctx.createBufferSource(); var nBuf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000;
              var eg = ctx.createGain(); eg.gain.setValueAtTime(0.3, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
              noise.connect(hp); hp.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.4; noise.start(now); noise.stop(now + 0.08);
            } else {
              _origPlayDrum(type); return;
            }
          }



          // ═══ PER-CHANNEL MIXER ═══
          function getChVol(row) { var v = d.chVolumes || {}; return v[row] !== undefined ? v[row] : 0.8; }
          function isChMuted(row) {
            var solo = d.chSolo;
            if (solo !== undefined && solo >= 0 && solo !== row) return true;
            return !!(d.chMutes && d.chMutes[row]);
          }

          // ═══ EFFECTS RACK (Web Audio lazy-init) ═══
          var _bpFxRef = React.useRef(null);
          function _initBpFx() {
            if (_bpFxRef.current) return _bpFxRef.current;
            var audio = getCtx(); var ctx = audio.ctx;
            var irLen = Math.round(ctx.sampleRate * 1.5);
            var irBuf = ctx.createBuffer(2, irLen, ctx.sampleRate);
            for (var ch = 0; ch < 2; ch++) { var dd = irBuf.getChannelData(ch); for (var i = 0; i < irLen; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2.5); }
            var conv = ctx.createConvolver(); conv.buffer = irBuf;
            var revG = ctx.createGain(); revG.gain.value = 0;
            var dryG = ctx.createGain(); dryG.gain.value = 1;
            var del = ctx.createDelay(1.0); del.delayTime.value = 0.25;
            var delFb = ctx.createGain(); delFb.gain.value = 0;
            var delW = ctx.createGain(); delW.gain.value = 0;
            var flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 20000; flt.Q.value = 1;
            var inp = ctx.createGain(); inp.gain.value = 1;
            var out = ctx.createGain(); out.gain.value = 1;
            inp.connect(flt);
            flt.connect(dryG); dryG.connect(out);
            flt.connect(conv); conv.connect(revG); revG.connect(out);
            flt.connect(del); del.connect(delW); delW.connect(out);
            del.connect(delFb); delFb.connect(del);
            out.connect(audio.gain);
            _bpFxRef.current = { inp: inp, revG: revG, dryG: dryG, del: del, delFb: delFb, delW: delW, flt: flt, out: out };
            return _bpFxRef.current;
          }
          function _getBpFxDest(audio) {
            if (!d.bpFxOn) return audio.gain;
            return _initBpFx().inp;
          }
          React.useEffect(function () {
            if (!_bpFxRef.current) return;
            var fx = _bpFxRef.current;
            var r = (d.bpReverb || 0) / 100, dl = (d.bpDelay || 0) / 100, c = d.bpFilterCut || 20000;
            fx.revG.gain.value = r * 0.6; fx.dryG.gain.value = 1 - r * 0.3;
            fx.delW.gain.value = dl * 0.5; fx.delFb.gain.value = dl * 0.4;
            fx.flt.frequency.value = c;
          }, [d.bpReverb, d.bpDelay, d.bpFilterCut]);

          // ═══ TAP TEMPO ═══
          if (!window._bpTapTimes) window._bpTapTimes = [];
          function tapTempo() {
            var now = Date.now(); var taps = window._bpTapTimes;
            if (taps.length > 0 && now - taps[taps.length - 1] > 2000) taps.length = 0;
            taps.push(now);
            if (taps.length > 1) {
              var ints = []; for (var i = 1; i < Math.min(taps.length, 5); i++) ints.push(taps[i] - taps[i - 1]);
              var avg = ints.reduce(function (a, b) { return a + b; }, 0) / ints.length;
              upd('seqBPM', Math.max(60, Math.min(200, Math.round(60000 / avg))));
            }
          }

          // ═══ UNDO / REDO ═══
          if (!window._bpUndoStack) window._bpUndoStack = [];
          if (!window._bpRedoStack) window._bpRedoStack = [];
          function pushBpUndo() {
            window._bpUndoStack.push({ g: JSON.parse(JSON.stringify(d.seqGrid || {})), m: (d.beatMelody || []).slice() });
            if (window._bpUndoStack.length > 30) window._bpUndoStack.shift();
            window._bpRedoStack.length = 0;
          }
          function bpUndo() {
            if (!window._bpUndoStack.length) return;
            window._bpRedoStack.push({ g: JSON.parse(JSON.stringify(d.seqGrid || {})), m: (d.beatMelody || []).slice() });
            var prev = window._bpUndoStack.pop();
            upd('seqGrid', prev.g); upd('beatMelody', prev.m);
          }
          function bpRedo() {
            if (!window._bpRedoStack.length) return;
            window._bpUndoStack.push({ g: JSON.parse(JSON.stringify(d.seqGrid || {})), m: (d.beatMelody || []).slice() });
            var nxt = window._bpRedoStack.pop();
            upd('seqGrid', nxt.g); upd('beatMelody', nxt.m);
          }

          // ═══ SCALE-LOCKED MELODY ═══
          var SCALE_PATTERNS = {
            'chromatic': { name: 'All Notes', intervals: [0,1,2,3,4,5,6,7,8,9,10,11,12] },
            'major': { name: 'Major', intervals: [0,2,4,5,7,9,11,12] },
            'minor': { name: 'Minor', intervals: [0,2,3,5,7,8,10,12] },
            'pentatonic': { name: 'Pentatonic', intervals: [0,2,4,7,9,12] },
            'blues': { name: 'Blues', intervals: [0,3,5,6,7,10,12] },
            'dorian': { name: 'Dorian', intervals: [0,2,3,5,7,9,10,12] },
            'mixolydian': { name: 'Mixolydian', intervals: [0,2,4,5,7,9,10,12] }
          };
          var ALL_NOTE_NAMES = ['C4','C#4','D4','D#4','E4','F4','F#4','G4','G#4','A4','A#4','B4','C5'];
          var ALL_NOTE_FREQS = [261.63,277.18,293.66,311.13,329.63,349.23,369.99,392.00,415.30,440.00,466.16,493.88,523.25];
          function getScaleNotes() {
            var sc = SCALE_PATTERNS[d.bpScale || 'major'] || SCALE_PATTERNS['major'];
            var n = [], f = [];
            sc.intervals.forEach(function (iv) { if (iv < ALL_NOTE_NAMES.length) { n.push(ALL_NOTE_NAMES[iv]); f.push(ALL_NOTE_FREQS[iv]); } });
            return { notes: n, freqs: f };
          }

          // ═══ STEP RECORDING ═══
          function stepRecHit(row) {
            if (!d.bpStepRec) return false;
            var pos = d.bpStepRecPos || 0;
            var g = Object.assign({}, d.seqGrid || {});
            g[row + '_' + pos] = 1;
            upd('seqGrid', g);
            upd('bpStepRecPos', (pos + 1) % 16);
            pushBpUndo();
            return true;
          }

          // ═══ SHARE VIA URL ═══
          function sharePattern() {
            try {
              var obj = { g: d.seqGrid || {}, m: d.beatMelody || [], b: d.seqBPM || 120, s: d.seqSwing || '0' };
              var b64 = btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
              var url = location.origin + location.pathname + '#beat=' + b64;
              navigator.clipboard.writeText(url).then(function () { addToast('\uD83D\uDD17 Beat URL copied!', 'success'); })
                .catch(function () { prompt('Copy this URL:', url); });
            } catch (e) { addToast('\u274C Share failed', 'error'); }
          }
          React.useEffect(function () {
            try {
              var h = location.hash;
              if (!h || h.indexOf('#beat=') !== 0) return;
              var json = decodeURIComponent(escape(atob(h.substring(6))));
              var obj = JSON.parse(json);
              if (obj.g) upd('seqGrid', obj.g);
              if (obj.m) upd('beatMelody', obj.m);
              if (obj.b) upd('seqBPM', obj.b);
              if (obj.s) upd('seqSwing', obj.s);
              history.replaceState(null, '', location.pathname);
              addToast('\uD83C\uDFB5 Loaded shared beat!', 'success');
            } catch (e) {}
          }, []);

          // ═══ WAV EXPORT (MediaRecorder) ═══
          function exportBeat() {
            try {
              var audio = getCtx(); var ctx = audio.ctx;
              var dest = ctx.createMediaStreamDestination();
              audio.gain.connect(dest);
              var chunks = []; var mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
              var rec = new MediaRecorder(dest.stream, { mimeType: mimeType });
              rec.ondataavailable = function (e) { if (e.data.size > 0) chunks.push(e.data); };
              rec.onstop = function () {
                audio.gain.disconnect(dest);
                var blob = new Blob(chunks, { type: mimeType });
                var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                a.download = 'beat_' + new Date().toISOString().slice(0, 10) + '.webm';
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                addToast('\uD83D\uDCE5 Beat exported!', 'success'); upd('bpExporting', false);
              };
              rec.start(); upd('bpExporting', true);
              var bpm = d.seqBPM || 120; var total = ((60000 / bpm) / 4) * 16 + 300;
              if (!d.seqPlaying) startSequencer();
              setTimeout(function () { rec.stop(); stopSequencer(); }, total);
            } catch (e) { addToast('\u274C Export failed', 'error'); upd('bpExporting', false); }
          }

          // ═══ WAVEFORM VISUALIZER ═══
          var _bpCanvasRef = React.useRef(null);
          var _bpAnimRef = React.useRef(null);
          var _bpAnalyserRef = React.useRef(null);
          React.useEffect(function () {
            if (!d.seqPlaying) { if (_bpAnimRef.current) { cancelAnimationFrame(_bpAnimRef.current); _bpAnimRef.current = null; } return; }
            var canvas = _bpCanvasRef.current; if (!canvas) return;
            var audio = getCtx(); var ctx = audio.ctx;
            if (!_bpAnalyserRef.current) { var an = ctx.createAnalyser(); an.fftSize = 256; audio.gain.connect(an); _bpAnalyserRef.current = an; }
            var analyser = _bpAnalyserRef.current; var cctx = canvas.getContext('2d');
            var w = canvas.width, h = canvas.height, buf = new Uint8Array(analyser.frequencyBinCount);
            function draw() {
              _bpAnimRef.current = requestAnimationFrame(draw);
              analyser.getByteTimeDomainData(buf);
              var grd = cctx.createLinearGradient(0, 0, w, 0);
              grd.addColorStop(0, '#1e1b4b'); grd.addColorStop(0.5, '#312e81'); grd.addColorStop(1, '#1e1b4b');
              cctx.fillStyle = grd; cctx.fillRect(0, 0, w, h);
              var wg = cctx.createLinearGradient(0, 0, w, 0);
              wg.addColorStop(0, '#a78bfa'); wg.addColorStop(0.5, '#f472b6'); wg.addColorStop(1, '#a78bfa');
              cctx.strokeStyle = wg; cctx.lineWidth = 2; cctx.beginPath();
              var sw = w / buf.length;
              for (var i = 0; i < buf.length; i++) { var y = (buf[i] / 128.0) * h / 2; if (i === 0) cctx.moveTo(0, y); else cctx.lineTo(i * sw, y); }
              cctx.lineTo(w, h / 2); cctx.stroke();
              cctx.shadowBlur = 8; cctx.shadowColor = '#a78bfa'; cctx.stroke(); cctx.shadowBlur = 0;
            }
            draw();
            return function () { if (_bpAnimRef.current) cancelAnimationFrame(_bpAnimRef.current); };
          }, [d.seqPlaying, synthTab]);

          // ═══ RHYTHM EXERCISES ═══
          var RHYTHM_CHALLENGES = [
            { name: 'Rock Beat', pattern: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], desc: 'Quarter notes on the beat' },
            { name: 'Backbeat', pattern: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], desc: 'Snare on 2 and 4' },
            { name: 'Syncopation', pattern: [1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0], desc: 'Off-beat accents' },
            { name: '16th Notes', pattern: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], desc: 'Every subdivision' },
            { name: 'Swing Feel', pattern: [1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0], desc: 'Triplet-style groove' },
            { name: 'Reggae One-Drop', pattern: [0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0], desc: 'Accent only on beat 3' }
          ];
          function genRandomRhythm() {
            var p = new Array(16).fill(0);
            for (var i = 0; i < 16; i++) { if (Math.random() < (i % 4 === 0 ? 0.7 : 0.3)) p[i] = 1; }
            return { name: 'Random #' + Math.floor(Math.random() * 100), pattern: p, desc: 'Try to match this pattern!' };
          }

          // ═══ SEQUENCER ENGINE (runs in background across tabs) ═══
          var _seqTimer = React.useRef(null);
          var _seqStep = React.useRef(0);
          function startSequencer() {
            if (_seqTimer.current) return;
            var bpm = d.seqBPM || 120;
            var stepMs = (60000 / bpm) / 4; // 16th notes
            _seqStep.current = 0;
            _seqTimer.current = setInterval(function () {
              var step = _seqStep.current;
              var grid = d.seqGrid || {};
              BEAT_PAD_SOUNDS.forEach(function (sound, row) {
                var key = row + '_' + step;
                if (grid[key]) {
                  playSample(sound.type, row);
                }
              });
              // Play melody note (scale-aware)
              var mel = d.beatMelody || [];
              var _scD = getScaleNotes();
              var ni = mel[step];
              if (ni > 0 && ni <= _scD.freqs.length) {
                playNoteFor(_scD.freqs[ni - 1], 'bpmel_' + step, stepMs * 0.8);
              }
              upd('seqCurrentStep', step);
              _seqStep.current = (step + 1) % 16;
            }, stepMs);
            upd('seqPlaying', true);
          }
          function stopSequencer() {
            if (_seqTimer.current) { clearInterval(_seqTimer.current); _seqTimer.current = null; }
            upd('seqPlaying', false);
            upd('seqCurrentStep', -1);
          }
          // Clean up on unmount
          React.useEffect(function () { return function () { stopSequencer(); }; }, []);
          // Restart sequencer when BPM changes while playing
          React.useEffect(function () {
            if (d.seqPlaying && _seqTimer.current) {
              clearInterval(_seqTimer.current);
              _seqTimer.current = null;
              var bpm = d.seqBPM || 120;
              var stepMs = (60000 / bpm) / 4;
              _seqTimer.current = setInterval(function () {
                var step = _seqStep.current;
                var grid = d.seqGrid || {};
                BEAT_PAD_SOUNDS.forEach(function (sound, row) {
                  if (grid[row + '_' + step]) playSample(sound.type);
                });
                var mel = d.beatMelody || [];
                var ni = mel[step];
                if (ni > 0 && ni <= MELODY_FREQS_BP.length) {
                  var bpm = d.seqBPM || 120;
                  playNoteFor(MELODY_FREQS_BP[ni - 1], 'bpmel_' + step, ((60000 / bpm) / 4) * 0.8);
                }
                upd('seqCurrentStep', step);
                _seqStep.current = (step + 1) % 16;
              }, stepMs);
            }
          }, [d.seqBPM]);

          // ═══ EDM PRESET PATTERNS ═══
          var SEQ_PRESETS = {
            'four_on_floor': { name: '4-on-the-Floor', grid: {'0_0':1,'0_4':1,'0_8':1,'0_12':1,'1_4':1,'1_12':1,'4_0':1,'4_2':1,'4_4':1,'4_6':1,'4_8':1,'4_10':1,'4_12':1,'4_14':1} },
            'breakbeat': { name: 'Breakbeat', grid: {'0_0':1,'0_6':1,'0_10':1,'1_4':1,'1_12':1,'4_0':1,'4_4':1,'4_8':1,'4_12':1,'4_2':1,'4_10':1} },
            'trap_hats': { name: 'Trap Hi-Hats', grid: {'0_0':1,'0_8':1,'1_4':1,'1_12':1,'4_0':1,'4_1':1,'4_2':1,'4_3':1,'4_4':1,'4_5':1,'4_6':1,'4_7':1,'4_8':1,'4_9':1,'4_10':1,'4_11':1,'4_12':1,'4_13':1,'4_14':1,'4_15':1,'5_2':1,'5_6':1,'5_10':1,'5_14':1} },
            'house': { name: 'House', grid: {'0_0':1,'0_4':1,'0_8':1,'0_12':1,'1_4':1,'1_12':1,'4_0':1,'4_2':1,'4_4':1,'4_6':1,'4_8':1,'4_10':1,'4_12':1,'4_14':1,'5_2':1,'5_6':1,'5_10':1,'5_14':1,'2_2':1,'2_14':1} },
            'reggaeton': { name: 'Reggaeton', grid: {'0_0':1,'0_6':1,'0_12':1,'1_3':1,'1_7':1,'1_11':1,'1_15':1,'4_0':1,'4_4':1,'4_8':1,'4_12':1} },
          };

          // ═══ CDN SAMPLE LOADER (lazy-loads on first Beat Pad open) ═══
          var SAMPLE_CDN = 'https://tonejs.github.io/audio/drum-samples/';
          var SAMPLE_KITS = {
            'CR78': { name: 'CR-78 Vintage', icon: '\uD83C\uDFDB\uFE0F', files: { kick: 'kick.mp3', snare: 'snare.mp3', hihat: 'hihat.mp3', tom1: 'tom1.mp3', tom2: 'tom2.mp3' } },
            'acoustic-kit': { name: 'Acoustic Kit', icon: '\uD83E\uDD41', files: { kick: 'kick.mp3', snare: 'snare.mp3', hihat: 'hihat.mp3', tom1: 'tom1.mp3', tom2: 'tom2.mp3' } },
            'Techno': { name: 'Techno EDM', icon: '\u26A1', files: { kick: 'kick.mp3', snare: 'snare.mp3', hihat: 'hihat.mp3', tom1: 'tom1.mp3', tom2: 'tom2.mp3' } },
            'LINN': { name: 'LinnDrum', icon: '\uD83D\uDD0A', files: { kick: 'kick.mp3', snare: 'snare.mp3', hihat: 'hihat.mp3', tom1: 'tom1.mp3', tom2: 'tom2.mp3' } },
            '4OP-FM': { name: 'FM Synthesis', icon: '\uD83C\uDF1F', files: { kick: 'kick.mp3', snare: 'snare.mp3', hihat: 'hihat.mp3', tom1: 'tom1.mp3', tom2: 'tom2.mp3' } }
          };
          // Sample cache: { kitName: { soundType: AudioBuffer } }
          if (!window._alloSampleCache) window._alloSampleCache = {};
          if (!window._alloUserSamples) window._alloUserSamples = [];
          function loadSampleKit(kitName) {
            if (window._alloSampleCache[kitName]) { upd('samplesLoaded', kitName); return; }
            var kit = SAMPLE_KITS[kitName]; if (!kit) return;
            upd('samplesLoading', true);
            var audio = getCtx(); var ctx = audio.ctx;
            var loaded = {}; var total = Object.keys(kit.files).length; var count = 0;
            Object.keys(kit.files).forEach(function (type) {
              var url = SAMPLE_CDN + kitName + '/' + kit.files[type];
              fetch(url).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
                return ctx.decodeAudioData(buf);
              }).then(function (decoded) {
                loaded[type] = decoded; count++;
                if (count >= total) {
                  window._alloSampleCache[kitName] = loaded;
                  upd('samplesLoading', false); upd('samplesLoaded', kitName);
                  upd('activeKit', kitName);
                }
              }).catch(function (e) { console.warn('[Beat Pad] Failed to load sample:', url, e); count++; if (count >= total) upd('samplesLoading', false); });
            });
          }
          // Play sample from loaded kit, fall back to synth
          function playSample(type, row) {
            if (row !== undefined && isChMuted(row)) return;
            var vol = (row !== undefined) ? getChVol(row) : 0.8;
            var kit = d.activeKit || '';
            var cache = window._alloSampleCache[kit];
            if (cache && cache[type]) {
              var audio = getCtx(); var ctx = audio.ctx;
              var source = ctx.createBufferSource();
              source.buffer = cache[type];
              var g = ctx.createGain(); g.gain.value = vol;
              source.connect(g);
              var dest = _getBpFxDest(audio);
              g.connect(dest);
              source.start(0);
              return;
            }
            playDrumExt(type);
          }
          // Play user-uploaded sample by index
          function playUserSample(idx) {
            var samples = window._alloUserSamples || [];
            if (!samples[idx]) return;
            var audio = getCtx(); var ctx = audio.ctx;
            var source = ctx.createBufferSource();
            source.buffer = samples[idx].buffer;
            var g = ctx.createGain(); g.gain.value = 0.8;
            source.connect(g); g.connect(audio.gain);
            source.start(0);
          }
          // Melody notes for the sequencer row
          var MELODY_NOTES_BP = ['C4','D4','E4','F4','G4','A4','B4','C5'];
          var MELODY_FREQS_BP = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
          var melodySeqBP = d.beatMelody || new Array(16).fill(0);
          // Load default kit on first beatpad visit
          React.useEffect(function () {
            if (synthTab === 'beatpad' && !d.activeKit && !d.samplesLoading) {
              loadSampleKit('CR78');
            }
          }, [synthTab]);
          // Keyboard shortcuts for drum pads (number row)
          React.useEffect(function () {
            function handlePadKey(e) {
              if (synthTab !== 'beatpad') return;
              if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
              var padMap = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7, '9': 8, '0': 9, '-': 10, '=': 11 };
              var idx = padMap[e.key];
              if (idx !== undefined && BEAT_PAD_SOUNDS[idx]) {
                e.preventDefault();
                playSample(BEAT_PAD_SOUNDS[idx].type, idx); stepRecHit(idx);
                upd('padHit_' + idx, true);
                setTimeout(function () { upd('padHit_' + idx, false); }, 120);
              }
            }
            window.addEventListener('keydown', handlePadKey);
            return function () { window.removeEventListener('keydown', handlePadKey); };
          }, [synthTab, d.activeKit]);
          return React.createElement("div", { className: "max-w-5xl mx-auto animate-in fade-in duration-200" },
            // ── Header ──
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: function () { setStemLabTool(null); stopSequencer(); stopMetronome(); stopArpeggiator(); }, className: "p-1.5 hover:bg-slate-100 rounded-lg transition-colors", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500" }, "\uD83C\uDFB9 Music Synthesizer"),
              React.createElement("span", { className: "px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full" }, synthEngine === 'plucked' ? '\uD83C\uDFB8 PLUCKED' : '\u223F ' + (d.waveType || 'sine').toUpperCase()),
              d.activePreset && React.createElement("span", { className: "px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full" }, "\u2B50 " + d.activePreset),
              // Tab selector
              React.createElement("div", { className: "flex gap-0.5 ml-auto bg-slate-100 rounded-lg p-0.5" },
                [{ id: 'play', icon: '\uD83C\uDFB9', label: t('stem.synth.play') }, { id: 'scales', icon: '\uD83C\uDFB5', label: t('stem.synth.scales') }, { id: 'chords', icon: '\uD83C\uDFB6', label: t('stem.synth.chords') }, { id: 'harmonypad', icon: '\uD83C\uDF1F', label: t('stem.synth.harmonypad') }, { id: 'beatpad', icon: '\uD83E\uDD41', label: t('stem.synth.beatpad') || 'Beat Pad' }, { id: 'theory', icon: '\uD83D\uDCDA', label: t('stem.synth.theory') }].map(function (tab) {
                  return React.createElement("button", {
                    key: tab.id, role: "tab", "aria-selected": stemLabTab === tab.id,
                    onClick: function () { upd('synthTab', tab.id); },
                    className: "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all " + (synthTab === tab.id ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')
                  }, tab.icon + " " + tab.label);
                })
              )
            ),

            // ── Oscilloscope ──
            React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-purple-200 bg-[#0f0a1e] mb-3", style: { height: '120px' } },
              React.createElement("canvas", { ref: canvasRef, "data-show-fft": showFFT ? 'true' : 'false', "data-viz-mode": vizMode, "data-note-color": d.lastNoteColor || '#a855f7', style: { width: '100%', height: '100%' } }),
              // Note display
              d.lastNote && React.createElement("div", { className: "absolute top-2 left-2 px-2 py-0.5 bg-black/40 backdrop-blur rounded text-white text-xs font-bold" }, "\u266A " + d.lastNote + (d.lastFreq ? " (" + Math.round(d.lastFreq) + " Hz)" : "")),
              // Viz mode selector
              React.createElement("div", { className: "absolute top-2 right-2 flex gap-1" },
                [{ id: 'waveform', label: '\u223F' }, { id: 'lissajous', label: '\u221E' }, { id: 'helix', label: '\uD83C\uDF00' }].map(function (v) {
                  return React.createElement("button", {
                    key: v.id,
                    onClick: function () { upd('vizMode', v.id); },
                    className: "w-6 h-6 rounded text-xs flex items-center justify-center transition-all " + (vizMode === v.id ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20')
                  }, v.label);
                }),
                React.createElement("button", {
                  onClick: function () { upd('showFFT', !showFFT); },
                  className: "w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center transition-all " + (showFFT ? 'bg-green-500 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20')
                }, "FFT")
              )
            ),

            // ═══════════ TAB: PLAY ═══════════
            synthTab === 'play' && React.createElement("div", null,
              // Preset bar
              React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-3" },
                Object.keys(PRESETS).map(function (name) {
                  return React.createElement("button", {
                    key: name,
                    onClick: function () { applyPreset(name); },
                    className: "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all " + (d.activePreset === name ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                  }, (name === 'Plucked' ? '\uD83C\uDFB8' : name === 'Guitar' ? '\uD83C\uDFB8' : name === 'Strings' ? '\uD83C\uDFBB' : name === 'Organ' ? '\u26EA' : name === 'Bass' ? '\uD83C\uDFB8' : name === 'Pad' ? '\u2601\uFE0F' : name === t('stem.periodic.lead') ? '\u26A1' : name === 'Retro' ? '\uD83D\uDC7E' : name === 'Spooky' ? '\uD83D\uDC7B' : '\uD83C\uDFB9') + ' ' + name);
                })
              ),

              // Root & Octave & Scale Lock
              React.createElement("div", { className: "flex gap-2 mb-3 items-center" },
                React.createElement("div", { className: "flex items-center gap-1" },
                  React.createElement("span", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Root"),
                  React.createElement("select", {
                    'aria-label': 'Root note',
                    value: selectedRoot,
                    onChange: function (e) { upd('selectedRoot', e.target.value); },
                    className: "px-2 py-1 rounded-lg text-xs font-bold bg-slate-100 border-0 focus:ring-2 focus:ring-purple-400"
                  }, NOTE_NAMES.map(function (n) { return React.createElement("option", { key: n, value: n }, n); }))
                ),
                React.createElement("div", { className: "flex items-center gap-1" },
                  React.createElement("span", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Oct"),
                  React.createElement("div", { className: "flex gap-0.5" },
                    [3, 4, 5, 6].map(function (o) {
                      return React.createElement("button", {
                        key: o,
                        onClick: function () { upd('octave', o); },
                        className: "w-7 h-7 rounded text-xs font-bold transition-all " + ((d.octave || 4) === o ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                      }, o);
                    })
                  )
                ),
                React.createElement("button", {
                  onClick: function () { upd('scaleLock', !scaleLock); },
                  className: "px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all " + (scaleLock ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-500')
                }, (scaleLock ? '\uD83D\uDD12' : '\uD83D\uDD13') + ' Scale Lock'),
                React.createElement("select", {
                  'aria-label': 'Musical scale',
                  value: selectedScale,
                  onChange: function (e) { upd('selectedScale', e.target.value); },
                  className: "px-2 py-1 rounded-lg text-xs font-bold bg-slate-100 border-0 focus:ring-2 focus:ring-purple-400"
                }, Object.keys(SCALES).map(function (s) { return React.createElement("option", { key: s, value: s }, s); })),
                // Engine toggle
                React.createElement("div", { className: "flex gap-0.5 ml-auto" },
                  [{ id: 'standard', label: '\u223F Synth' }, { id: 'plucked', label: '\uD83C\uDFB8 Plucked' }].map(function (eng) {
                    return React.createElement("button", {
                      key: eng.id,
                      onClick: function () {
                        // Clear all active notes when switching engines to prevent stale entries blocking playback
                        Object.keys(window._alloSynthActiveNotes || {}).forEach(function (nid) {
                          try { var e = window._alloSynthActiveNotes[nid]; if (e && e.osc) e.osc.stop(); if (e && e.env) { e.env.gain.cancelScheduledValues(0); e.env.gain.value = 0; } } catch (ex) { }
                          delete window._alloSynthActiveNotes[nid];
                        });
                        upd('synthEngine', eng.id);
                      },
                      className: "px-2 py-1 rounded text-[10px] font-bold transition-all " + (synthEngine === eng.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
                    }, eng.label);
                  })
                )
              ),

              // ── Piano Keyboard ──
              React.createElement("div", { className: "relative mb-3", style: { height: '140px' } },
                React.createElement("div", { className: "flex h-full relative" },
                  KEYS.map(function (key, idx) {
                    var isActive = (d.activeKeys || []).indexOf(key.note + key.octave) !== -1;
                    var isBlack = key.isBlack;
                    var isScaleNote = isInScale(key.semitone);
                    var isRoot = key.semitone === 0;
                    var dimmed = scaleLock && !isScaleNote;
                    if (isBlack) {
                      return React.createElement("div", {
                        key: idx,
                        onMouseDown: function (e) {
                          e.preventDefault();
                          var noteId = key.note + key.octave;
                          if (dimmed) return;
                          if (synthEngine === 'plucked') { playPlucked(key.freq, noteId, d.ksBrightness, d.ksDamping); }
                          else { playNote(key.freq, noteId); }
                          upd('activeKeys', (d.activeKeys || []).concat([noteId])); upd('lastNote', noteId); upd('lastFreq', key.freq); upd('lastNoteColor', key.color || '#a855f7');
                        },
                        onMouseUp: function () { var noteId = key.note + key.octave; stopNote(noteId); upd('activeKeys', (d.activeKeys || []).filter(function (x) { return x !== noteId; })); },
                        onMouseLeave: function () { var noteId = key.note + key.octave; stopNote(noteId); upd('activeKeys', (d.activeKeys || []).filter(function (x) { return x !== noteId; })); },
                        className: "absolute z-10 rounded-b-md select-none flex flex-col items-center justify-end pb-1 transition-all cursor-pointer " + (isActive ? 'bg-purple-600 shadow-lg shadow-purple-500/50' : dimmed ? 'bg-slate-700 opacity-30' : 'bg-slate-800 hover:bg-slate-700'),
                        style: { width: '5.5%', height: '85px', left: (key.position * (100 / 14) + (100 / 14) * 0.65) + '%', top: 0 }
                      },
                        React.createElement("span", { className: "text-[8px] text-white/60 font-bold" }, key.note)
                      );
                    }
                    return React.createElement("div", {
                      key: idx,
                      onMouseDown: function (e) {
                        e.preventDefault();
                        var noteId = key.note + key.octave;
                        if (dimmed) return;
                        if (synthEngine === 'plucked') { playPlucked(key.freq, noteId, d.ksBrightness, d.ksDamping); }
                        else { playNote(key.freq, noteId); }
                        upd('activeKeys', (d.activeKeys || []).concat([noteId])); upd('lastNote', noteId); upd('lastFreq', key.freq); upd('lastNoteColor', key.color || '#a855f7');
                      },
                      onMouseUp: function () { var noteId = key.note + key.octave; stopNote(noteId); upd('activeKeys', (d.activeKeys || []).filter(function (x) { return x !== noteId; })); },
                      onMouseLeave: function () { var noteId = key.note + key.octave; stopNote(noteId); upd('activeKeys', (d.activeKeys || []).filter(function (x) { return x !== noteId; })); },
                      className: "flex-1 rounded-b-lg select-none flex flex-col items-center justify-end pb-2 border transition-all cursor-pointer " + (isActive ? 'bg-purple-100 border-purple-400 shadow-lg shadow-purple-300/50' : dimmed ? 'bg-slate-50 border-slate-200 opacity-30' : 'bg-white border-slate-200 hover:bg-purple-50'),
                      style: { minWidth: '36px' }
                    },
                      isScaleNote && React.createElement("div", { className: "w-2 h-2 rounded-full mb-1 " + (isRoot ? 'bg-purple-600' : 'bg-purple-300') }),
                      React.createElement("span", { className: "text-[9px] font-bold " + (isActive ? 'text-purple-700' : 'text-slate-400') }, key.note),
                      React.createElement("span", { className: "text-[7px] text-slate-300" }, KEYBOARD_MAP && Object.keys(KEYBOARD_MAP).find(function (k) { return KEYBOARD_MAP[k] === key.semitone + (key.octave - (d.octave || 4)) * 12; }) || '')
                    );
                  })
                )
              ),

              // ── Chord Buttons ──
              React.createElement("div", { className: "mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-1.5" },
                  React.createElement("span", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Chords"),
                  React.createElement("select", {
                    'aria-label': 'Chord root note',
                    value: chordRoot,
                    onChange: function (e) { upd('chordRoot', e.target.value); },
                    className: "px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 border-0"
                  }, NOTE_NAMES.map(function (n) { return React.createElement("option", { key: n, value: n }, n); })),
                  React.createElement("div", { className: "flex gap-0.5" },
                    [0, 1, 2].map(function (inv) {
                      return React.createElement("button", {
                        key: inv,
                        onClick: function () { upd('chordInversion', inv); },
                        className: "px-1.5 py-0.5 rounded text-[10px] font-bold " + (chordInversion === inv ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500')
                      }, inv === 0 ? 'Root' : inv === 1 ? '1st Inv' : '2nd Inv');
                    })
                  ),
                  React.createElement("button", {
                    onClick: function () { upd('jazzMode', !jazzMode); },
                    className: "px-2 py-0.5 rounded text-[10px] font-bold ml-auto " + (jazzMode ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500')
                  }, "\uD83C\uDFB7 Jazz Mode")
                ),
                React.createElement("div", { className: "flex flex-wrap gap-1" },
                  (jazzMode ? ['Maj7', 'Min7', 'Dom7', 'dim7', 'Min9', 'Maj9', '9', '13', '6', 'min6'] : ['Major', 'Minor', 'Diminished', 'Augmented', 'Sus2', 'Sus4', t('stem.circuit.power'), 'Dom7', 'Maj7', 'Min7']).map(function (chType) {
                    var chord = CHORDS[chType]; if (!chord) return null;
                    return React.createElement("button", {
                      key: chType,
                      onClick: function () { upd('selectedChord', chType); playChord(chordRoot, chType, chordInversion); },
                      className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + (selectedChord === chType ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-600')
                    }, chordRoot + chord.symbol);
                  })
                ),
                // Chord info badge
                selectedChord && CHORDS[selectedChord] && React.createElement("div", { className: "mt-1 px-2.5 py-1 bg-purple-50 rounded-lg text-[10px] text-purple-700" },
                  React.createElement("span", { className: "font-bold" }, chordRoot + CHORDS[selectedChord].symbol + ": "),
                  React.createElement("span", null, CHORDS[selectedChord].intervals.map(function (i) { return NOTE_NAMES[(NOTE_NAMES.indexOf(chordRoot) + i) % 12]; }).join(' \u2022 ')),
                  React.createElement("span", { className: "ml-2 text-purple-400 italic" }, CHORDS[selectedChord].desc || '')
                )
              ),

              // ── Strum Harp ──
              React.createElement("div", { className: "mb-3 bg-gradient-to-b from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200 p-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-sm font-bold text-amber-800" }, "\uD83C\uDFB8 Strum Harp"),
                  React.createElement("span", { className: "text-[10px] text-amber-600" }, "Drag across strings to strum!")
                ),
                React.createElement("div", { className: "flex justify-center gap-1", style: { height: '100px' } },
                  (function () {
                    var chordData = CHORDS[selectedChord]; if (!chordData) return [];
                    var ri = NOTE_NAMES.indexOf(chordRoot);
                    return chordData.intervals.map(function (intv, si) {
                      var nIdx = (ri + intv) % 12; var nOct = (d.octave || 4) + Math.floor((ri + intv) / 12);
                      var freq = noteFreq(NOTE_NAMES[nIdx], nOct);
                      var noteN = NOTE_NAMES[nIdx];
                      var stringActive = (d.strumStrings || []).indexOf(si) !== -1;
                      return React.createElement("div", {
                        key: si,
                        onMouseEnter: function (e) {
                          if (e.buttons > 0) {
                            if (synthEngine === 'plucked') playPlucked(freq, 'strum_' + si, d.ksBrightness, d.ksDamping);
                            else playNoteFor(freq, 'strum_' + si, 600);
                            upd('strumStrings', (d.strumStrings || []).concat([si]));
                            setTimeout(function () { upd('strumStrings', (d.strumStrings || []).filter(function (x) { return x !== si; })); }, 300);
                          }
                        },
                        onMouseDown: function (e) {
                          e.preventDefault();
                          if (synthEngine === 'plucked') playPlucked(freq, 'strum_' + si, d.ksBrightness, d.ksDamping);
                          else playNoteFor(freq, 'strum_' + si, 600);
                          upd('strumStrings', (d.strumStrings || []).concat([si]));
                          setTimeout(function () { upd('strumStrings', (d.strumStrings || []).filter(function (x) { return x !== si; })); }, 300);
                        },
                        className: "flex flex-col items-center justify-between cursor-pointer select-none group",
                        style: { width: '24px' }
                      },
                        React.createElement("span", { className: "text-[9px] font-bold text-amber-600" }, noteN),
                        React.createElement("div", {
                          className: "flex-1 w-[3px] rounded-full transition-all duration-150 " + (stringActive ? 'bg-amber-400 shadow-lg shadow-amber-400/50 scale-x-150' : 'bg-amber-300 group-hover:bg-amber-400'),
                          style: stringActive ? { animation: 'pulse 0.15s ease-in-out 3' } : {}
                        }),
                        React.createElement("span", { className: "text-[8px] text-amber-400" }, (d.octave || 4) + Math.floor((ri + intv) / 12))
                      );
                    });
                  })()
                )
              ),

              // ── ADSR & Effects Controls ──
              React.createElement("div", { className: "grid grid-cols-2 gap-3 mb-3" },
                // ADSR - always visible
                React.createElement("div", { className: "bg-slate-50 rounded-xl border p-3" },
                  React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                    React.createElement("span", { className: "text-xs font-bold text-slate-700" }, "\uD83D\uDCC8 ADSR Envelope"),
                    React.createElement("span", { className: "text-[9px] text-slate-400 cursor-help", title: EFFECT_TIPS.adsr.text }, "\u2753")
                  ),
                  // ADSR visual
                  React.createElement("svg", { viewBox: "0 0 200 60", className: "w-full mb-2", style: { maxHeight: '50px' } },
                    React.createElement("rect", { width: 200, height: 60, fill: "transparent" }),
                    (function () {
                      var a = d.attack || 0.01, dec = d.decay || 0.1, s = d.sustain || 0.7, r = d.release || 0.3;
                      var aX = Math.min(a * 200, 50), dX = aX + Math.min(dec * 100, 40), sX = 140, rX = sX + Math.min(r * 60, 50);
                      var sY = 60 - s * 55;
                      return React.createElement("polyline", {
                        points: "0,60 " + aX + ",5 " + dX + "," + sY + " " + sX + "," + sY + " " + rX + ",60",
                        fill: "none", stroke: "#7c3aed", strokeWidth: 2.5, strokeLinejoin: "round"
                      });
                    })(),
                    React.createElement("text", { x: 5, y: 58, className: "text-[8px] fill-slate-400" }, "A"),
                    React.createElement("text", { x: 55, y: 58, className: "text-[8px] fill-slate-400" }, "D"),
                    React.createElement("text", { x: 110, y: 58, className: "text-[8px] fill-slate-400" }, "S"),
                    React.createElement("text", { x: 165, y: 58, className: "text-[8px] fill-slate-400" }, "R")
                  ),
                  [{ k: 'attack', label: t('stem.synth.attack'), min: 0.001, max: 2, step: 0.01, unit: 's' },
                  { k: 'decay', label: t('stem.synth.decay'), min: 0.01, max: 1, step: 0.01, unit: 's' },
                  { k: 'sustain', label: t('stem.synth.sustain'), min: 0, max: 1, step: 0.01, unit: '' },
                  { k: 'release', label: t('stem.synth.release'), min: 0.01, max: 3, step: 0.01, unit: 's' }].map(function (param) {
                    return React.createElement("div", { key: param.k, className: "flex items-center gap-2 mb-0.5" },
                      React.createElement("span", { className: "text-[9px] font-bold text-slate-500 w-12" }, param.label),
                      React.createElement("input", { type: "range", min: param.min, max: param.max, step: param.step, value: d[param.k] || param.min, onChange: function (e) { upd(param.k, parseFloat(e.target.value)); }, className: "flex-1 accent-purple-600 h-1.5" }),
                      React.createElement("span", { className: "text-[9px] text-slate-400 w-10 text-right" }, (d[param.k] || param.min).toFixed(2) + param.unit)
                    );
                  })
                ),

                // Effects panel
                React.createElement("div", { className: "bg-slate-50 rounded-xl border p-3" },
                  React.createElement("span", { className: "text-xs font-bold text-slate-700 block mb-2" }, "\u2699\uFE0F Effects"),
                  // Waveform selector (for standard engine)
                  synthEngine === 'standard' && React.createElement("div", { className: "flex gap-1 mb-2" },
                    ['sine', 'square', 'sawtooth', 'triangle'].map(function (w) {
                      var wi = WAVE_INFO[w];
                      return React.createElement("button", {
                        key: w,
                        onClick: function () { upd('waveType', w); },
                        className: "flex-1 py-1 rounded-lg text-[10px] font-bold text-center transition-all " + ((d.waveType || 'sine') === w ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 hover:bg-purple-50'),
                        title: wi.desc
                      }, wi.emoji + " " + w);
                    })
                  ),
                  // Plucked engine controls
                  synthEngine === 'plucked' && React.createElement("div", { className: "space-y-1 mb-2" },
                    React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                      React.createElement("span", { className: "text-[10px] font-bold text-amber-700" }, "\uD83C\uDFB8 Karplus-Strong"),
                      React.createElement("span", { className: "text-[9px] text-slate-400 cursor-help", title: EFFECT_TIPS.karplusStrong.text }, "\u2753")
                    ),
                    [{ k: 'ksBrightness', label: t('stem.synth.brightness'), min: 0.1, max: 1, step: 0.01 },
                    { k: 'ksDamping', label: t('stem.synth.damping'), min: 0.99, max: 0.9999, step: 0.0001 }].map(function (p) {
                      return React.createElement("div", { key: p.k, className: "flex items-center gap-2" },
                        React.createElement("span", { className: "text-[9px] font-bold text-slate-500 w-16" }, p.label),
                        React.createElement("input", { type: "range", min: p.min, max: p.max, step: p.step, value: d[p.k] || (p.k === 'ksBrightness' ? 0.8 : 0.996), onChange: function (e) { upd(p.k, parseFloat(e.target.value)); }, className: "flex-1 accent-amber-500 h-1.5" }),
                        React.createElement("span", { className: "text-[9px] text-slate-400 w-10 text-right" }, (d[p.k] || (p.k === 'ksBrightness' ? 0.8 : 0.996)).toFixed(p.k === 'ksDamping' ? 4 : 2))
                      );
                    })
                  ),
                  // Volume + Reverb
                  [{ k: 'volume', label: '\uD83D\uDD0A Volume', min: 0, max: 1, step: 0.01 },
                  { k: 'reverbMix', label: '\uD83C\uDFDB Reverb', min: 0, max: 1, step: 0.01 }].map(function (p) {
                    return React.createElement("div", { key: p.k, className: "flex items-center gap-2 mb-0.5" },
                      React.createElement("span", { className: "text-[9px] font-bold text-slate-500 w-16" }, p.label),
                      React.createElement("input", { type: "range", min: p.min, max: p.max, step: p.step, value: d[p.k] != null ? d[p.k] : (p.k === 'volume' ? 0.5 : 0), onChange: function (e) { upd(p.k, parseFloat(e.target.value)); }, className: "flex-1 accent-purple-600 h-1.5" }),
                      React.createElement("span", { className: "text-[9px] text-slate-400 w-8 text-right" }, ((d[p.k] != null ? d[p.k] : (p.k === 'volume' ? 0.5 : 0)) * 100).toFixed(0) + '%')
                    );
                  }),
                  // Filter
                  React.createElement("div", { className: "mt-1 pt-1 border-t border-slate-200" },
                    React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                      React.createElement("span", { className: "text-[10px] font-bold text-slate-600" }, "\uD83C\uDF0A Filter"),
                      React.createElement("span", { className: "text-[9px] text-slate-400 cursor-help", title: EFFECT_TIPS.filter.text }, "\u2753"),
                      React.createElement("select", {
                        'aria-label': 'Filter type',
                        value: d.filterType || 'lowpass',
                        onChange: function (e) { upd('filterType', e.target.value); },
                        className: "ml-auto px-1.5 py-0.5 rounded text-[10px] font-bold bg-white border"
                      }, ['lowpass', 'highpass', 'bandpass'].map(function (ft) { return React.createElement("option", { key: ft, value: ft }, ft); }))
                    ),
                    [{ k: 'filterCutoff', label: t('stem.synth.cutoff'), min: 100, max: 12000, step: 50, fmt: function (v) { return (v || 8000) > 1000 ? ((v || 8000) / 1000).toFixed(1) + 'k' : Math.round(v || 8000) + ''; } },
                    { k: 'filterQ', label: 'Q', min: 0.1, max: 20, step: 0.1, fmt: function (v) { return (v || 1).toFixed(1); } }].map(function (p) {
                      return React.createElement("div", { key: p.k, className: "flex items-center gap-2 mb-0.5" },
                        React.createElement("span", { className: "text-[9px] font-bold text-slate-500 w-10" }, p.label),
                        React.createElement("input", { type: "range", min: p.min, max: p.max, step: p.step, value: d[p.k] || (p.k === 'filterCutoff' ? 8000 : 1), onChange: function (e) { upd(p.k, parseFloat(e.target.value)); }, className: "flex-1 accent-cyan-500 h-1.5" }),
                        React.createElement("span", { className: "text-[9px] text-slate-400 w-10 text-right" }, p.fmt(d[p.k]))
                      );
                    })
                  ),
                  // Tremolo & Vibrato
                  React.createElement("div", { className: "mt-1 pt-1 border-t border-slate-200" },
                    React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                      React.createElement("span", { className: "text-[10px] font-bold text-slate-600" }, "\u2728 Modulation"),
                      React.createElement("span", { className: "text-[9px] text-slate-400 cursor-help", title: EFFECT_TIPS.tremolo.text }, "\u2753")
                    ),
                    [{ k: 'tremoloDepth', label: t('stem.synth.trem_dep'), min: 0, max: 1, step: 0.01 },
                    { k: 'tremoloRate', label: t('stem.synth.trem_rate'), min: 0.5, max: 20, step: 0.5 },
                    { k: 'vibratoDepth', label: t('stem.synth.vib_dep'), min: 0, max: 1, step: 0.01 },
                    { k: 'vibratoRate', label: t('stem.synth.vib_rate'), min: 0.5, max: 12, step: 0.5 }].map(function (p) {
                      return React.createElement("div", { key: p.k, className: "flex items-center gap-2 mb-0.5" },
                        React.createElement("span", { className: "text-[9px] font-bold text-slate-500 w-14" }, p.label),
                        React.createElement("input", { type: "range", min: p.min, max: p.max, step: p.step, value: d[p.k] || 0, onChange: function (e) { upd(p.k, parseFloat(e.target.value)); }, className: "flex-1 accent-pink-500 h-1.5" }),
                        React.createElement("span", { className: "text-[9px] text-slate-400 w-8 text-right" }, (d[p.k] || 0).toFixed(1))
                      );
                    })
                  )
                )
              ),

              // ── Progression player ──
              React.createElement("div", { className: "bg-slate-50 rounded-xl border p-3 mb-3" },
                React.createElement("span", { className: "text-xs font-bold text-slate-700 block mb-2" }, "\uD83C\uDFB6 Chord Progressions"),
                React.createElement("div", { className: "grid grid-cols-3 gap-1.5" },
                  PROGRESSIONS.map(function (prog) {
                    return React.createElement("button", {
                      key: prog.name,
                      onClick: function () { playProgression(prog); },
                      className: "text-left px-2.5 py-2 rounded-lg bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-all group"
                    },
                      React.createElement("span", { className: "text-[11px] font-bold text-slate-700 group-hover:text-purple-700 block" }, prog.name),
                      React.createElement("span", { className: "text-[9px] text-slate-400" }, prog.desc)
                    );
                  })
                )
              ),

              // ── Arpeggiator ──
              React.createElement("div", { className: "bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-3 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-indigo-700" }, "\uD83C\uDF00 Arpeggiator"),
                  React.createElement("span", { className: "text-[9px] text-indigo-400 cursor-help", title: EFFECT_TIPS.arpeggiator.text }, "\u2753"),
                  React.createElement("button", {
                    onClick: function () { if (arpOn) stopArpeggiator(); else startArpeggiator(); },
                    className: "ml-auto px-3 py-1 rounded-lg text-xs font-bold " + (arpOn ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white')
                  }, arpOn ? '\u23F9 Stop' : '\u25B6 Start')
                ),
                React.createElement("div", { className: "flex gap-2 items-center" },
                  React.createElement("span", { className: "text-[10px] font-bold text-slate-500" }, "Pattern"),
                  ['up', 'down', 'updown', 'random'].map(function (pat) {
                    return React.createElement("button", {
                      key: pat,
                      onClick: function () { upd('arpPattern', pat); if (arpOn) { stopArpeggiator(); setTimeout(startArpeggiator, 50); } },
                      className: "px-2 py-0.5 rounded text-[10px] font-bold capitalize " + (arpPattern === pat ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600')
                    }, pat);
                  }),
                  React.createElement("span", { className: "text-[10px] font-bold text-slate-500 ml-2" }, "Octaves"),
                  [1, 2, 3].map(function (oc) {
                    return React.createElement("button", {
                      key: oc,
                      onClick: function () { upd('arpOctaves', oc); if (arpOn) { stopArpeggiator(); setTimeout(startArpeggiator, 50); } },
                      className: "w-6 h-6 rounded text-[10px] font-bold " + ((d.arpOctaves || 1) === oc ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600')
                    }, oc);
                  })
                )
              )
            ),

            // ═══════════ COMPOSE — redirect to Production Studio ═══════════
            synthTab === 'play' && React.createElement("div", { className: "mt-3" },
              React.createElement("div", {
                onClick: function () { upd('synthTab', 'beatpad'); },
                className: "bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-4 cursor-pointer hover:shadow-md hover:from-purple-100 hover:to-pink-100 transition-all group"
              },
                React.createElement("div", { className: "flex items-center gap-3" },
                  React.createElement("span", { className: "text-3xl" }, "\uD83E\uDD41"),
                  React.createElement("div", null,
                    React.createElement("div", { className: "text-sm font-bold text-purple-700 group-hover:text-purple-800" }, "Production Studio"),
                    React.createElement("div", { className: "text-[11px] text-purple-500" }, "Sequencer, drum pads, notation, samples & more \u2192")
                  ),
                  React.createElement("span", { className: "ml-auto text-purple-400 group-hover:text-purple-600 text-lg transition-transform group-hover:translate-x-1" }, "\u2192")
                )
              )
            ),

            // ═══════════ TAB: SCALES ═══════════
            synthTab === 'scales' && React.createElement("div", null,
              // Scales & Modes
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-slate-800" }, "\uD83C\uDFB5 Scales & Modes"),
                  React.createElement("span", { className: "text-[9px] text-slate-400 cursor-help", title: EFFECT_TIPS.scales.text }, "\u2753")
                ),
                React.createElement("div", { className: "flex flex-wrap gap-1 mb-3" },
                  Object.keys(SCALES).map(function (name) {
                    var s = SCALES[name];
                    return React.createElement("button", {
                      key: name,
                      onClick: function () { upd('selectedScale', name); playScale(selectedRoot, name, false); },
                      className: "px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + (selectedScale === name ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-purple-50')
                    }, name);
                  })
                ),
                selectedScale && SCALES[selectedScale] && React.createElement("div", { className: "bg-purple-50 rounded-lg p-3" },
                  React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                    React.createElement("span", { className: "text-xs font-bold text-purple-700" }, selectedRoot + " " + selectedScale),
                    React.createElement("button", {
                      onClick: function () { playScale(selectedRoot, selectedScale, false); },
                      className: "px-2 py-0.5 rounded text-[10px] font-bold bg-purple-600 text-white"
                    }, "\u25B6 Play Ascending"),
                    React.createElement("button", {
                      onClick: function () { playScale(selectedRoot, selectedScale, true); },
                      className: "px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500 text-white"
                    }, "\u25BC Descending")
                  ),
                  React.createElement("p", { className: "text-[10px] text-purple-600 mb-1.5" }, SCALES[selectedScale].desc),
                  React.createElement("div", { className: "flex gap-1" },
                    SCALES[selectedScale].intervals.map(function (intv, i) {
                      var nIdx = (rootIdx + intv) % 12;
                      return React.createElement("div", {
                        key: i,
                        onClick: function () { playNoteFor(noteFreq(NOTE_NAMES[nIdx], d.octave || 4), 'scale_note_' + i, 500); },
                        className: "flex-1 py-2 rounded-lg text-center cursor-pointer transition-all bg-white border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-100"
                      },
                        React.createElement("span", { className: "text-xs font-bold text-purple-700 block" }, NOTE_NAMES[nIdx]),
                        React.createElement("span", { className: "text-[8px] text-purple-400" }, i === 0 ? 'Root' : intv + ' semi')
                      );
                    })
                  )
                ),
                // Science box
                selectedScale && SCALES[selectedScale] && React.createElement("div", { className: "mt-3 bg-slate-50 rounded-lg p-3 border" },
                  React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" }, "\uD83D\uDD2C The Science"),
                  React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, SCALES[selectedScale].science)
                )
              ),

              // Waveform Science (moved from Sound Lab)
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("span", { className: "text-sm font-bold text-slate-800 block mb-3" }, "\u223F Waveform Science"),
                React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                  Object.keys(WAVE_INFO).map(function (wType) {
                    var wi = WAVE_INFO[wType];
                    var isActive = (d.waveType || 'sine') === wType;
                    return React.createElement("div", {
                      key: wType,
                      onClick: function () { upd('waveType', wType); playNoteFor(noteFreq(selectedRoot, d.octave || 4), 'demo_' + wType, 800); },
                      className: "p-3 rounded-xl border-2 cursor-pointer transition-all " + (isActive ? 'border-purple-400 bg-purple-50 shadow-md' : 'border-slate-200 bg-slate-50 hover:border-purple-200')
                    },
                      React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                        React.createElement("span", { className: "text-lg" }, wi.emoji),
                        React.createElement("span", { className: "text-xs font-bold text-slate-800 capitalize" }, wType)
                      ),
                      React.createElement("p", { className: "text-[10px] text-slate-600 mb-1" }, wi.desc),
                      React.createElement("p", { className: "text-[9px] text-purple-600 font-bold" }, "Harmonics: " + wi.harmonics),
                      React.createElement("p", { className: "text-[9px] text-slate-400 leading-snug mt-1" }, wi.science)
                    );
                  })
                )
              )
            ),

            // ═══════════ TAB: CHORDS ═══════════
            synthTab === 'chords' && React.createElement("div", null,
              // Chord Explorer
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-slate-800" }, "\uD83C\uDFB6 Chord Explorer"),
                  React.createElement("span", { className: "text-[9px] text-slate-400 cursor-help", title: EFFECT_TIPS.chords.text }, "\u2753"),
                  React.createElement("button", {
                    onClick: function () { upd('jazzMode', !jazzMode); },
                    className: "px-2 py-0.5 rounded text-[10px] font-bold ml-auto " + (jazzMode ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500')
                  }, "\uD83C\uDFB7 Jazz Mode")
                ),
                React.createElement("div", { className: "flex flex-wrap gap-1 mb-3" },
                  (jazzMode ? ['Maj7', 'Min7', 'Dom7', 'dim7', 'Min9', 'Maj9', '9', '13', '6', 'min6', 'add9'] : Object.keys(CHORDS).filter(function (k) { return ['Major', 'Minor', 'Diminished', 'Augmented', 'Maj7', 'Min7', 'Dom7', 'Sus2', 'Sus4', t('stem.circuit.power')].indexOf(k) !== -1; })).map(function (chType) {
                    var chord = CHORDS[chType]; if (!chord) return null;
                    return React.createElement("button", {
                      key: chType,
                      onClick: function () { upd('selectedChord', chType); upd('chordRoot', selectedRoot); playChord(selectedRoot, chType, chordInversion); },
                      className: "px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all " + (selectedChord === chType ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-600')
                    }, selectedRoot + chord.symbol);
                  })
                ),
                // Inversion selector
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Inversion"),
                  [0, 1, 2].map(function (inv) {
                    return React.createElement("button", {
                      key: inv,
                      onClick: function () { upd('chordInversion', inv); if (selectedChord) playChord(selectedRoot, selectedChord, inv); },
                      className: "px-2 py-0.5 rounded text-[10px] font-bold " + (chordInversion === inv ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500')
                    }, inv === 0 ? 'Root' : inv === 1 ? '1st Inv' : '2nd Inv');
                  }),
                  React.createElement("button", {
                    onClick: function () { if (selectedChord) strumChord(selectedRoot, selectedChord, chordInversion, 40, 'up'); },
                    className: "ml-auto px-3 py-1 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-700 hover:bg-amber-200"
                  }, "\uD83C\uDFB8 Strum")
                ),
                // Chord info panel
                selectedChord && CHORDS[selectedChord] && React.createElement("div", { className: "bg-purple-50 rounded-lg p-3" },
                  React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                    React.createElement("span", { className: "text-sm font-bold text-purple-700" }, selectedRoot + CHORDS[selectedChord].symbol),
                    React.createElement("span", { className: "text-xs text-purple-500" }, CHORDS[selectedChord].desc)
                  ),
                  React.createElement("div", { className: "flex gap-1 mb-2" },
                    CHORDS[selectedChord].intervals.map(function (intv, i) {
                      var nIdx = (NOTE_NAMES.indexOf(selectedRoot) + intv) % 12;
                      return React.createElement("div", {
                        key: i,
                        onClick: function () { playNoteFor(noteFreq(NOTE_NAMES[nIdx], d.octave || 4), 'chord_note_' + i, 500); },
                        className: "flex-1 py-2 rounded-lg text-center cursor-pointer bg-white border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-100 transition-all"
                      },
                        React.createElement("span", { className: "text-xs font-bold text-purple-700" }, NOTE_NAMES[nIdx]),
                        React.createElement("span", { className: "text-[8px] text-purple-400 block" }, i === 0 ? 'Root' : intv + ' semi')
                      );
                    })
                  ),
                  React.createElement("p", { className: "text-[10px] text-slate-500 leading-relaxed" }, "\uD83D\uDD2C " + CHORDS[selectedChord].science)
                )
              ),

              // Chord Progressions
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("span", { className: "text-sm font-bold text-slate-800 block mb-3" }, "\uD83C\uDFB6 Chord Progressions"),
                React.createElement("div", { className: "grid grid-cols-3 gap-1.5" },
                  PROGRESSIONS.map(function (prog) {
                    return React.createElement("button", {
                      key: prog.name,
                      onClick: function () { playProgression(prog); },
                      className: "text-left px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-all group"
                    },
                      React.createElement("span", { className: "text-[11px] font-bold text-slate-700 group-hover:text-purple-700 block" }, prog.name),
                      React.createElement("span", { className: "text-[9px] text-slate-400" }, prog.desc)
                    );
                  })
                )
              ),

              // Circle of Fifths
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-slate-800" }, "\u2B55 Circle of Fifths"),
                  React.createElement("span", { className: "text-[9px] text-slate-400 cursor-help", title: EFFECT_TIPS.circleOfFifths.text }, "\u2753")
                ),
                React.createElement("svg", { viewBox: "0 0 300 300", className: "w-full mx-auto", style: { maxWidth: '300px', maxHeight: '300px' } },
                  // Background
                  React.createElement("circle", { cx: 150, cy: 150, r: 140, fill: "none", stroke: "#e2e8f0", strokeWidth: 2 }),
                  React.createElement("circle", { cx: 150, cy: 150, r: 100, fill: "none", stroke: "#e2e8f0", strokeWidth: 1, strokeDasharray: "4 4" }),
                  // Keys around the circle
                  CIRCLE_OF_FIFTHS.map(function (entry, idx) {
                    var angle = (idx * 30 - 90) * Math.PI / 180;
                    var outerX = 150 + 120 * Math.cos(angle);
                    var outerY = 150 + 120 * Math.sin(angle);
                    var innerX = 150 + 85 * Math.cos(angle);
                    var innerY = 150 + 85 * Math.sin(angle);
                    var circleKey = entry.key.indexOf('/') !== -1 ? entry.key.split('/')[0] : entry.key;
                    var isSelected = circleKey === selectedRoot || entry.key === selectedRoot;
                    return React.createElement("g", { key: entry.key, className: "cursor-pointer", onClick: function () { upd('selectedRoot', circleKey); playChord(circleKey, 'Major', 0); } },
                      React.createElement("circle", { cx: outerX, cy: outerY, r: isSelected ? 18 : 15, fill: isSelected ? '#7c3aed' : '#f8fafc', stroke: isSelected ? '#5b21b6' : '#cbd5e1', strokeWidth: isSelected ? 2 : 1 }),
                      React.createElement("text", { x: outerX, y: outerY + 4, textAnchor: "middle", fill: isSelected ? '#fff' : '#334155', style: { fontSize: '11px', fontWeight: 'bold' } }, entry.key),
                      React.createElement("text", { x: innerX, y: innerY + 3, textAnchor: "middle", fill: '#94a3b8', style: { fontSize: '8px' } }, entry.minor)
                    );
                  })
                )
              ),

              // Barry Harris Harmony
              React.createElement("div", { className: "bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-sm font-bold text-amber-800" }, "\uD83C\uDFB7 Barry Harris Harmony"),
                  React.createElement("span", { className: "text-[9px] text-amber-500" }, "(1929-2021)")
                ),
                React.createElement("p", { className: "text-[10px] text-amber-700 mb-3 leading-relaxed" }, BARRY_HARRIS.desc),
                React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                  React.createElement("div", null,
                    React.createElement("p", { className: "text-[10px] font-bold text-amber-700 mb-1" }, "Major 6th Diminished Scale"),
                    React.createElement("div", { className: "flex flex-wrap gap-1" },
                      BARRY_HARRIS.majorScale(rootIdx).map(function (chord, i) {
                        return React.createElement("button", {
                          key: i,
                          onClick: function () { playChord(NOTE_NAMES[(rootIdx + chord.degree) % 12], chord.type, 0); },
                          className: "px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all " + (chord.type === 'dim7' ? 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200' : 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200')
                        }, chord.label);
                      })
                    )
                  ),
                  React.createElement("div", null,
                    React.createElement("p", { className: "text-[10px] font-bold text-amber-700 mb-1" }, "Minor 6th Diminished Scale"),
                    React.createElement("div", { className: "flex flex-wrap gap-1" },
                      BARRY_HARRIS.minorScale(rootIdx).map(function (chord, i) {
                        return React.createElement("button", {
                          key: i,
                          onClick: function () { playChord(NOTE_NAMES[(rootIdx + chord.degree) % 12], chord.type, 0); },
                          className: "px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all " + (chord.type === 'dim7' ? 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200' : 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200')
                        }, chord.label);
                      })
                    )
                  )
                )
              )
            ),




            // ═══════════ TAB: BEAT PAD (Production Studio) ═══════════
            synthTab === 'beatpad' && React.createElement("div", { className: "animate-in fade-in duration-200" },

              // ── Header + Kit Selector ──
              React.createElement("div", { className: "flex items-center gap-2 mb-3 flex-wrap" },
                React.createElement("span", { className: "text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600" }, "\uD83E\uDD41 Production Studio"),
                d.samplesLoading && React.createElement("span", { className: "text-[9px] text-amber-500 animate-pulse font-bold" }, "\u23F3 Loading samples..."),
                d.activeKit && React.createElement("span", { className: "text-[9px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold" }, "\u2705 " + (SAMPLE_KITS[d.activeKit] || {}).name),
                React.createElement("div", { className: "flex gap-1 ml-auto flex-wrap" },
                  Object.keys(SAMPLE_KITS).map(function (kitId) {
                    var kit = SAMPLE_KITS[kitId]; var isActive = (d.activeKit || '') === kitId; var isLoaded = !!window._alloSampleCache[kitId];
                    return React.createElement("button", { key: kitId, onClick: function () { if (isLoaded) upd('activeKit', kitId); else loadSampleKit(kitId); },
                      className: "px-2 py-1 rounded-lg text-[9px] font-bold transition-all " + (isActive ? 'bg-purple-600 text-white shadow-md' : isLoaded ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'),
                      title: isLoaded ? 'Switch to ' + kit.name : 'Click to download ' + kit.name
                    }, kit.icon + ' ' + kit.name + (isLoaded ? '' : ' \u2B07'));
                  })
                )
              ),

              // ── MPC Drum Pads ──
              React.createElement("div", { className: "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-3 mb-3 shadow-xl border border-slate-700/50" },
                d.bpStepRec && React.createElement("div", { className: "flex items-center gap-2 mb-2 px-2 py-1 bg-red-900/40 rounded-lg border border-red-500/30" },
                  React.createElement("span", { className: "w-2 h-2 rounded-full bg-red-500 animate-pulse" }),
                  React.createElement("span", { className: "text-[10px] font-bold text-red-300" }, "STEP REC \u2022 Step " + ((d.bpStepRecPos || 0) + 1) + "/16"),
                  React.createElement("span", { className: "text-[9px] text-red-400/60" }, "Tap pads to place beats")
                ),
                React.createElement("div", { className: "grid grid-cols-4 gap-2" },
                  BEAT_PAD_SOUNDS.map(function (sound, idx) {
                    var isHit = d['padHit_' + idx];
                    return React.createElement("button", {
                      key: sound.type,
                      onMouseDown: function () {
                        playSample(sound.type, idx);
                        stepRecHit(idx);
                        upd('padHit_' + idx, true); setTimeout(function () { upd('padHit_' + idx, false); }, 120);
                      },
                      className: "relative h-14 rounded-xl font-bold text-white text-xs select-none transition-all duration-75 " + (isHit ? 'scale-[0.93] brightness-150 shadow-lg ring-2 ring-white/40' : 'hover:scale-[1.02] shadow-md hover:shadow-lg'),
                      style: { background: isHit ? sound.color : 'linear-gradient(145deg, ' + sound.color + '55, ' + sound.color + '99)', border: '1px solid ' + sound.color + '44' }
                    },
                      React.createElement("div", { className: "text-[10px] font-bold drop-shadow-sm" }, sound.label),
                      React.createElement("div", { className: "text-[7px] opacity-40 mt-0.5 font-mono" }, sound.key)
                    );
                  })
                )
              ),

              // ── Waveform Visualizer ──
              React.createElement("div", { className: "mb-3 rounded-xl overflow-hidden shadow-inner border border-indigo-900/30", style: { height: '48px' } },
                React.createElement("canvas", { ref: _bpCanvasRef, width: 600, height: 48, className: "w-full h-full", style: { background: '#1e1b4b' } })
              ),

              // ── Transport Bar (enhanced) ──
              React.createElement("div", { className: "flex items-center gap-2 mb-3 bg-gradient-to-r from-slate-50 to-purple-50 rounded-xl border border-purple-200/50 p-2 flex-wrap" },
                React.createElement("button", {
                  onClick: function () { if (d.seqPlaying) stopSequencer(); else startSequencer(); },
                  className: "px-4 py-2 rounded-lg text-sm font-bold transition-all " + (d.seqPlaying ? 'bg-red-500 text-white shadow-inner' : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-md')
                }, d.seqPlaying ? '\u23F9 Stop' : '\u25B6 Play'),
                // BPM
                React.createElement("div", { className: "flex items-center gap-1" },
                  React.createElement("span", { className: "text-[10px] font-bold text-slate-500" }, "BPM"),
                  React.createElement("input", { type: "range", min: 60, max: 200, step: 1, value: d.seqBPM || 120, onChange: function (e) { upd('seqBPM', parseInt(e.target.value)); }, className: "w-20 accent-purple-600" }),
                  React.createElement("span", { className: "text-xs font-bold text-purple-700 w-8 text-center" }, d.seqBPM || 120)
                ),
                // Tap Tempo
                React.createElement("button", { onClick: tapTempo, className: "px-2 py-1.5 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-all border border-amber-200" }, "\uD83E\uDD4A Tap"),
                // Swing
                React.createElement("select", { value: d.seqSwing || '0', onChange: function (e) { upd('seqSwing', e.target.value); }, className: "px-2 py-1 rounded text-[10px] font-bold bg-white border border-slate-200" },
                  React.createElement("option", { value: '0' }, "No Swing"),
                  React.createElement("option", { value: '15' }, "Swing 15%"),
                  React.createElement("option", { value: '30' }, "Swing 30%"),
                  React.createElement("option", { value: '50' }, "Swing 50%")
                ),
                // Undo / Redo
                React.createElement("div", { className: "flex gap-1" },
                  React.createElement("button", { onClick: bpUndo, disabled: !(window._bpUndoStack || []).length, className: "px-2 py-1 rounded text-[10px] font-bold transition-all " + ((window._bpUndoStack || []).length ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-50 text-slate-300 cursor-not-allowed') }, "\u21A9 " + (window._bpUndoStack || []).length),
                  React.createElement("button", { onClick: bpRedo, disabled: !(window._bpRedoStack || []).length, className: "px-2 py-1 rounded text-[10px] font-bold transition-all " + ((window._bpRedoStack || []).length ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-50 text-slate-300 cursor-not-allowed') }, "\u21AA " + (window._bpRedoStack || []).length)
                ),
                // Step Rec toggle
                React.createElement("button", { onClick: function () { upd('bpStepRec', !d.bpStepRec); upd('bpStepRecPos', 0); }, className: "px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + (d.bpStepRec ? 'bg-red-500 text-white shadow-inner animate-pulse' : 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-200') }, d.bpStepRec ? '\u23FA REC' : '\u26AB REC'),
                // Clear
                React.createElement("button", { onClick: function () { pushBpUndo(); upd('seqGrid', {}); upd('beatMelody', null); }, className: "ml-auto px-2 py-1 rounded text-[10px] font-bold bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all" }, "\uD83D\uDDD1 Clear")
              ),

              // ── Pattern Selector (A/B/C/D) ──
              React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                React.createElement("span", { className: "text-[10px] font-bold text-slate-500" }, "Pattern"),
                ['A', 'B', 'C', 'D'].map(function (p) {
                  var isActive = (d.bpActivePattern || 'A') === p;
                  var colors = { A: 'purple', B: 'blue', C: 'emerald', D: 'amber' };
                  var c = colors[p];
                  return React.createElement("button", {
                    key: p,
                    onClick: function () {
                      // Save current grid to current pattern
                      var pats = Object.assign({}, d.bpPatterns || {});
                      var cur = d.bpActivePattern || 'A';
                      pats[cur] = { grid: Object.assign({}, d.seqGrid || {}), melody: (d.beatMelody || []).slice() };
                      // Switch to new pattern
                      var target = pats[p] || { grid: {}, melody: [] };
                      upd('seqGrid', Object.assign({}, target.grid || {}));
                      upd('beatMelody', target.melody ? target.melody.slice() : null);
                      upd('bpPatterns', pats);
                      upd('bpActivePattern', p);
                    },
                    className: "w-8 h-8 rounded-lg text-xs font-black transition-all " + (isActive ? 'bg-' + c + '-600 text-white shadow-md scale-110' : 'bg-' + c + '-50 text-' + c + '-600 border border-' + c + '-200 hover:bg-' + c + '-100')
                  }, p);
                }),
                React.createElement("div", { className: "border-l border-slate-200 h-6 mx-1" }),
                React.createElement("button", {
                  onClick: function () { upd('bpChainMode', !d.bpChainMode); },
                  className: "px-2 py-1 rounded-lg text-[9px] font-bold transition-all " + (d.bpChainMode ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100')
                }, "\uD83D\uDD17 Chain " + (d.bpChainMode ? 'ON' : 'OFF')),
                d.bpChainMode && React.createElement("span", { className: "text-[9px] text-orange-500" }, "A\u2192B\u2192C\u2192D loop")
              ),

              // ── EDM Preset Buttons ──
              React.createElement("div", { className: "flex gap-1.5 mb-3 flex-wrap" },
                Object.keys(SEQ_PRESETS).map(function (key) {
                  return React.createElement("button", { key: key, onClick: function () { pushBpUndo(); upd('seqGrid', Object.assign({}, SEQ_PRESETS[key].grid)); },
                    className: "px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border border-purple-200 hover:from-purple-100 hover:to-pink-100 hover:shadow-sm transition-all"
                  }, "\uD83C\uDFB5 " + SEQ_PRESETS[key].name);
                })
              ),

              // ── Mixer Panel (collapsible) ──
              React.createElement("div", { className: "bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-slate-200 mb-3 overflow-hidden" },
                React.createElement("button", { onClick: function () { upd('bpMixerOpen', !d.bpMixerOpen); }, className: "w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 transition-all" },
                  React.createElement("span", { className: "text-xs font-bold text-slate-700" }, "\uD83C\uDFA8 Mixer"),
                  React.createElement("span", { className: "text-[9px] text-slate-400" }, "Volume \u2022 Mute \u2022 Solo"),
                  React.createElement("span", { className: "ml-auto text-slate-400 text-[10px] transition-transform " + (d.bpMixerOpen ? 'rotate-180' : '') }, "\u25BC")
                ),
                d.bpMixerOpen && React.createElement("div", { className: "px-3 pb-3" },
                  BEAT_PAD_SOUNDS.slice(0, 8).map(function (sound, row) {
                    var vol = getChVol(row);
                    var muted = !!(d.chMutes && d.chMutes[row]);
                    var soloed = d.chSolo === row;
                    return React.createElement("div", { key: sound.type, className: "flex items-center gap-2 py-0.5" },
                      React.createElement("span", { className: "text-[8px] font-bold w-12 text-right truncate", style: { color: sound.color } }, sound.label),
                      React.createElement("input", { type: "range", min: 0, max: 100, value: Math.round(vol * 100),
                        onChange: function (e) { var v = Object.assign({}, d.chVolumes || {}); v[row] = parseInt(e.target.value) / 100; upd('chVolumes', v); },
                        className: "flex-1 h-1.5 accent-purple-500", style: { maxWidth: '120px' }
                      }),
                      React.createElement("span", { className: "text-[8px] text-slate-400 w-7 text-right" }, Math.round(vol * 100) + '%'),
                      React.createElement("button", { onClick: function () { var m = Object.assign({}, d.chMutes || {}); m[row] = !m[row]; upd('chMutes', m); },
                        className: "w-5 h-5 rounded text-[8px] font-black " + (muted ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
                      }, "M"),
                      React.createElement("button", { onClick: function () { upd('chSolo', soloed ? -1 : row); },
                        className: "w-5 h-5 rounded text-[8px] font-black " + (soloed ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
                      }, "S")
                    );
                  })
                )
              ),

              // ── Effects Rack ──
              React.createElement("div", { className: "bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl border border-violet-200/60 p-3 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-violet-700" }, "\u2728 Effects"),
                  React.createElement("button", { onClick: function () { upd('bpFxOn', !d.bpFxOn); if (!d.bpFxOn) _initBpFx(); },
                    className: "px-2 py-0.5 rounded-full text-[9px] font-bold transition-all " + (d.bpFxOn ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-600')
                  }, d.bpFxOn ? 'FX ON' : 'FX OFF'),
                  d.bpFxOn && React.createElement("button", { onClick: function () { upd('bpReverb', 0); upd('bpDelay', 0); upd('bpFilterCut', 20000); }, className: "text-[9px] text-violet-400 hover:text-violet-600" }, "Reset")
                ),
                d.bpFxOn && React.createElement("div", { className: "grid grid-cols-3 gap-3" },
                  [
                    { key: 'bpReverb', label: 'Reverb', icon: '\uD83C\uDFDB\uFE0F', max: 100, val: d.bpReverb || 0, color: '#8b5cf6' },
                    { key: 'bpDelay', label: 'Delay', icon: '\uD83D\uDD03', max: 100, val: d.bpDelay || 0, color: '#d946ef' },
                    { key: 'bpFilterCut', label: 'Filter', icon: '\uD83C\uDF0A', max: 20000, val: d.bpFilterCut || 20000, color: '#a855f7' }
                  ].map(function (fx) {
                    return React.createElement("div", { key: fx.key, className: "text-center" },
                      React.createElement("div", { className: "text-[10px] font-bold text-violet-700 mb-1" }, fx.icon + ' ' + fx.label),
                      React.createElement("input", { type: "range", min: fx.key === 'bpFilterCut' ? 200 : 0, max: fx.max, value: fx.val,
                        onChange: function (e) { upd(fx.key, parseInt(e.target.value)); },
                        className: "w-full accent-violet-500"
                      }),
                      React.createElement("div", { className: "text-[8px] text-violet-400 mt-0.5" }, fx.key === 'bpFilterCut' ? (fx.val >= 19000 ? 'Open' : Math.round(fx.val) + ' Hz') : fx.val + '%')
                    );
                  })
                )
              ),

              // ── Sequencer Grid ──
              React.createElement("div", { className: "bg-white rounded-xl border border-slate-200 p-3 mb-3 overflow-x-auto shadow-sm" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-slate-700" }, "\uD83C\uDFBC Sequencer"),
                  React.createElement("span", { className: "text-[9px] text-slate-400" }, "16 steps = 1 bar"),
                  // Scale selector
                  React.createElement("select", { value: d.bpScale || 'major', onChange: function (e) { upd('bpScale', e.target.value); },
                    className: "ml-auto px-2 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200"
                  },
                    Object.keys(SCALE_PATTERNS).map(function (k) {
                      return React.createElement("option", { key: k, value: k }, '\uD83C\uDFB5 ' + SCALE_PATTERNS[k].name);
                    })
                  )
                ),
                // Beat subdivision labels
                React.createElement("div", { className: "flex mb-1", style: { marginLeft: '68px' } },
                  Array.from({ length: 16 }, function (_, i) {
                    var labels = ['1','e','&','a','2','e','&','a','3','e','&','a','4','e','&','a'];
                    return React.createElement("div", { key: i, className: "flex-1 text-center text-[7px] font-bold " + (i % 4 === 0 ? 'text-purple-600' : 'text-slate-300'), style: { minWidth: '22px' } }, labels[i]);
                  })
                ),
                // Melody row (scale-locked)
                (function () {
                  var scNotes = getScaleNotes();
                  return React.createElement("div", { className: "flex items-center gap-1 mb-1" },
                    React.createElement("span", { className: "text-[8px] font-bold text-purple-500 w-16 text-right pr-1 truncate" }, "\uD83C\uDFB9 Melody"),
                    Array.from({ length: 16 }, function (_, i) {
                      var ni = melodySeqBP[i] || 0;
                      var isCur = d.seqPlaying && d.seqCurrentStep === i;
                      var isRec = d.bpStepRec && (d.bpStepRecPos || 0) === i;
                      return React.createElement("div", {
                        key: 'mel_' + i,
                        onClick: function () { pushBpUndo(); var nm = (d.beatMelody || new Array(16).fill(0)).slice(); nm[i] = (nm[i] + 1) % (scNotes.notes.length + 1); upd('beatMelody', nm); },
                        onContextMenu: function (e) { e.preventDefault(); pushBpUndo(); var nm = (d.beatMelody || new Array(16).fill(0)).slice(); nm[i] = nm[i] <= 0 ? scNotes.notes.length : nm[i] - 1; upd('beatMelody', nm); },
                        className: "flex-1 h-7 rounded-sm cursor-pointer transition-all flex items-center justify-center text-[7px] font-bold select-none " +
                          (ni > 0 ? 'bg-gradient-to-b from-purple-400 to-purple-500 text-white shadow-sm' : isCur ? 'bg-purple-100 ring-1 ring-purple-300' : isRec ? 'bg-red-100 ring-1 ring-red-300' : i % 4 === 0 ? 'bg-purple-50/80' : 'bg-slate-50 border border-slate-100') + ' hover:brightness-110',
                        style: { minWidth: '22px' },
                        title: ni > 0 ? scNotes.notes[ni - 1] : 'Click to add'
                      }, ni > 0 && ni <= scNotes.notes.length ? scNotes.notes[ni - 1].replace('4', '').replace('5', '\u2019') : '');
                    })
                  );
                })(),
                React.createElement("div", { className: "border-b border-dashed border-slate-200 mb-1 ml-16" }),
                // Drum rows
                BEAT_PAD_SOUNDS.slice(0, 8).map(function (sound, row) {
                  return React.createElement("div", { key: sound.type, className: "flex items-center gap-1 mb-0.5" },
                    React.createElement("span", { className: "text-[8px] font-bold w-16 text-right pr-1 truncate", style: { color: sound.color } }, sound.label),
                    Array.from({ length: 16 }, function (_, col) {
                      var gKey = row + '_' + col; var grid = d.seqGrid || {}; var isOn = grid[gKey];
                      var isCur = d.seqPlaying && d.seqCurrentStep === col;
                      var isRec = d.bpStepRec && (d.bpStepRecPos || 0) === col;
                      return React.createElement("div", {
                        key: gKey,
                        onClick: function () { pushBpUndo(); var g = Object.assign({}, d.seqGrid || {}); g[gKey] = g[gKey] ? 0 : 1; upd('seqGrid', g); },
                        className: "flex-1 h-5 rounded-sm cursor-pointer transition-all " +
                          (isOn ? 'shadow-sm' : isCur ? 'bg-slate-200 ring-1 ring-purple-200' : isRec ? 'bg-red-50 ring-1 ring-red-200' : col % 4 === 0 ? 'bg-slate-100' : 'bg-slate-50 border border-slate-100') + ' hover:opacity-80',
                        style: isOn ? { background: sound.color, opacity: isCur ? 1 : 0.85 } : { minWidth: '22px' }
                      });
                    })
                  );
                }),
                // Step position indicator
                React.createElement("div", { className: "flex mt-1", style: { marginLeft: '68px' } },
                  Array.from({ length: 16 }, function (_, i) {
                    return React.createElement("div", { key: 's_' + i, className: "flex-1 h-1 rounded-full mx-px transition-all " + (d.seqPlaying && d.seqCurrentStep === i ? 'bg-purple-500' : 'bg-slate-200'), style: { minWidth: '22px' } });
                  })
                )
              ),

              // ── Notation Teaching View (interactive) ──
              React.createElement("div", { className: "bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200/60 p-3 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-amber-800" }, "\uD83C\uDFBC Musical Notation"),
                  React.createElement("span", { className: "text-[9px] text-amber-600" }, "Click notes to hear them!")
                ),
                React.createElement("svg", { viewBox: "0 0 560 110", className: "w-full bg-[#fefcf3] rounded-lg border border-amber-100 mb-2", style: { maxHeight: '130px' }, role: "img" },
                  [0,1,2,3,4].map(function (li) { return React.createElement("line", { key: 'sl_' + li, x1: 35, y1: 25 + li * 10, x2: 540, y2: 25 + li * 10, stroke: '#d4d0c8', strokeWidth: 0.8 }); }),
                  React.createElement("text", { x: 8, y: 60, fill: "#8b7355", style: { fontSize: '42px', fontFamily: 'serif' } }, "\uD834\uDD1E"),
                  React.createElement("text", { x: 42, y: 40, fill: "#8b7355", style: { fontSize: '14px', fontWeight: 'bold', fontFamily: 'serif' } }, "4"),
                  React.createElement("text", { x: 42, y: 57, fill: "#8b7355", style: { fontSize: '14px', fontWeight: 'bold', fontFamily: 'serif' } }, "4"),
                  [4,8,12].map(function (bl) { return React.createElement("line", { key: 'bar_' + bl, x1: 55 + bl * 30, y1: 25, x2: 55 + bl * 30, y2: 65, stroke: '#bbb', strokeWidth: 0.8 }); }),
                  melodySeqBP.map(function (ni, idx) {
                    var x = 70 + idx * 29; var isCur = d.seqPlaying && d.seqCurrentStep === idx;
                    var scNotes = getScaleNotes();
                    if (!ni || ni <= 0) return React.createElement("text", { key: 'n_' + idx, x: x, y: 50, textAnchor: "middle", fill: isCur ? '#7c3aed' : '#bbb', style: { fontSize: '14px', fontFamily: 'serif' } }, "\uD834\uDD3D");
                    var yMap = [70,65,60,55,50,45,40,35,32,28,25,22,18];
                    var y = yMap[Math.min(ni - 1, yMap.length - 1)] || 50;
                    var col = isCur ? '#7c3aed' : '#333';
                    return React.createElement("g", { key: 'n_' + idx, style: { cursor: 'pointer' },
                      onClick: function () { if (ni > 0 && ni <= scNotes.freqs.length) playNoteFor(scNotes.freqs[ni - 1], 'notclick_' + idx, 400); }
                    },
                      React.createElement("ellipse", { cx: x, cy: y, rx: 5, ry: 3.5, fill: col, transform: "rotate(-12 " + x + " " + y + ")" }),
                      React.createElement("line", { x1: x + 4.5, y1: y, x2: x + 4.5, y2: y - 22, stroke: col, strokeWidth: 1.2 }),
                      y >= 65 && React.createElement("line", { x1: x - 7, y1: 65, x2: x + 7, y2: 65, stroke: '#999', strokeWidth: 0.5 }),
                      y >= 70 && React.createElement("line", { x1: x - 7, y1: 70, x2: x + 7, y2: 70, stroke: '#999', strokeWidth: 0.5 }),
                      React.createElement("text", { x: x, y: y + 14, textAnchor: "middle", fill: '#999', style: { fontSize: '6px' } }, ni <= scNotes.notes.length ? scNotes.notes[ni - 1] : '')
                    );
                  }),
                  d.seqPlaying && React.createElement("line", { x1: 70 + (d.seqCurrentStep || 0) * 29, y1: 20, x2: 70 + (d.seqCurrentStep || 0) * 29, y2: 80, stroke: '#7c3aed', strokeWidth: 1.5, opacity: 0.5 })
                ),
                React.createElement("div", { className: "grid grid-cols-4 gap-2" },
                  [
                    { name: 'Whole Note', beats: '4 beats', sym: '\uD834\uDD5D', desc: 'Held for a full bar' },
                    { name: 'Half Note', beats: '2 beats', sym: '\uD834\uDD5E', desc: 'Held for half a bar' },
                    { name: 'Quarter Note', beats: '1 beat', sym: '\u2669', desc: 'One tap per beat' },
                    { name: 'Eighth Note', beats: '\u00BD beat', sym: '\u266A', desc: 'Two per beat (1 & 2 &)' }
                  ].map(function (note) {
                    return React.createElement("div", { key: note.name, className: "bg-white/80 rounded-lg p-2 text-center border border-amber-100" },
                      React.createElement("div", { className: "text-2xl mb-0.5", style: { fontFamily: 'serif' } }, note.sym),
                      React.createElement("div", { className: "text-[9px] font-bold text-amber-800" }, note.name),
                      React.createElement("div", { className: "text-[8px] text-amber-600" }, note.beats),
                      React.createElement("div", { className: "text-[7px] text-amber-500 italic mt-0.5" }, note.desc)
                    );
                  })
                )
              ),

              // ── Rhythm Exercises ──
              React.createElement("div", { className: "bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-200/60 p-3 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-rose-700" }, "\uD83E\uDD4A Rhythm Challenge"),
                  React.createElement("button", { onClick: function () { upd('bpRhythm', RHYTHM_CHALLENGES[Math.floor(Math.random() * RHYTHM_CHALLENGES.length)]); upd('bpRhythmScore', null); },
                    className: "px-2 py-1 rounded-lg text-[9px] font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-sm"
                  }, "\uD83C\uDFB2 Challenge me!"),
                  React.createElement("button", { onClick: function () { upd('bpRhythm', genRandomRhythm()); upd('bpRhythmScore', null); },
                    className: "px-2 py-1 rounded-lg text-[9px] font-bold bg-rose-100 text-rose-600 hover:bg-rose-200 transition-all"
                  }, "\uD83C\uDFB2 Random")
                ),
                d.bpRhythm ? React.createElement("div", null,
                  React.createElement("div", { className: "text-[10px] font-bold text-rose-800 mb-1" }, d.bpRhythm.name + ': ' + d.bpRhythm.desc),
                  React.createElement("div", { className: "flex gap-1 mb-2" },
                    d.bpRhythm.pattern.map(function (v, i) {
                      return React.createElement("div", { key: i, className: "flex-1 h-6 rounded " + (v ? 'bg-rose-500' : 'bg-rose-100 border border-rose-200'), style: { minWidth: '18px' } });
                    })
                  ),
                  React.createElement("div", { className: "text-[9px] text-rose-500 mb-1" }, "Load this rhythm into row 0 (Kick)?"),
                  React.createElement("button", {
                    onClick: function () {
                      pushBpUndo();
                      var g = Object.assign({}, d.seqGrid || {});
                      d.bpRhythm.pattern.forEach(function (v, i) { g['0_' + i] = v; });
                      upd('seqGrid', g);
                      addToast('\uD83E\uDD4A Rhythm loaded to Kick!', 'success');
                    },
                    className: "px-3 py-1 rounded-lg text-[9px] font-bold bg-rose-500 text-white hover:bg-rose-600 transition-all"
                  }, "\u25B6 Load to Grid")
                ) : React.createElement("p", { className: "text-[10px] text-rose-400 italic" }, "Click \"Challenge me!\" to practice rhythm patterns")
              ),

              // ── User Sample Upload ──
              React.createElement("div", { className: "bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200/60 p-3 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-indigo-700" }, "\uD83D\uDCC2 Your Samples"),
                  React.createElement("span", { className: "text-[9px] text-indigo-400" }, "Upload .wav/.mp3/.ogg \u2022 Max 4"),
                  React.createElement("label", { className: "ml-auto px-3 py-1.5 rounded-lg text-[10px] font-bold bg-indigo-600 text-white cursor-pointer hover:bg-indigo-700 transition-all shadow-sm" },
                    "\u2B06 Upload",
                    React.createElement("input", { type: "file", accept: ".wav,.mp3,.ogg,audio/*", className: "hidden",
                      onChange: function (e) {
                        var file = e.target.files && e.target.files[0]; if (!file) return;
                        if (file.size > 512000) { addToast('\u26A0\uFE0F File too large (max 500KB)', 'error'); return; }
                        if ((window._alloUserSamples || []).length >= 4) { addToast('\u26A0\uFE0F Max 4 samples', 'error'); return; }
                        var reader = new FileReader();
                        reader.onload = function (ev) {
                          var audio = getCtx(); var ctx = audio.ctx;
                          ctx.decodeAudioData(ev.target.result.slice(0), function (buffer) {
                            window._alloUserSamples = (window._alloUserSamples || []).concat([{ name: file.name.replace(/\.[^.]+$/, ''), buffer: buffer }]);
                            upd('userSampleCount', (window._alloUserSamples || []).length);
                            addToast('\uD83C\uDFB5 Sample loaded!', 'success');
                          }, function () { addToast('\u274C Could not decode audio', 'error'); });
                        };
                        reader.readAsArrayBuffer(file); e.target.value = '';
                      }
                    })
                  )
                ),
                (window._alloUserSamples || []).length > 0
                  ? React.createElement("div", { className: "flex gap-2 flex-wrap" },
                      (window._alloUserSamples || []).map(function (smp, si) {
                        return React.createElement("button", { key: si, onMouseDown: function () { playUserSample(si); },
                          className: "px-3 py-2 rounded-lg text-[10px] font-bold bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:shadow-sm transition-all flex items-center gap-1"
                        },
                          React.createElement("span", null, "\uD83C\uDFB5"),
                          React.createElement("span", { className: "truncate max-w-[80px]" }, smp.name),
                          React.createElement("span", { onClick: function (e) { e.stopPropagation(); window._alloUserSamples.splice(si, 1); upd('userSampleCount', window._alloUserSamples.length); }, className: "ml-1 text-red-400 hover:text-red-600 cursor-pointer" }, "\u2715")
                        );
                      })
                    )
                  : React.createElement("p", { className: "text-[10px] text-indigo-400 italic" }, "Upload WAV/MP3 files for custom pads. Samples clear on page refresh.")
              ),

              // ── Save/Load + Share + Export ──
              React.createElement("div", { className: "bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200/60 p-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2 flex-wrap" },
                  React.createElement("span", { className: "text-xs font-bold text-emerald-700" }, "\uD83D\uDCBE Compositions"),
                  React.createElement("button", {
                    onClick: function () {
                      var name = prompt('Name your composition:', 'Beat ' + new Date().toLocaleDateString());
                      if (!name) return;
                      var comp = { name: name, grid: Object.assign({}, d.seqGrid || {}), melody: (d.beatMelody || []).slice(), bpm: d.seqBPM || 120, kit: d.activeKit || '', swing: d.seqSwing || '0', scale: d.bpScale || 'major', timestamp: Date.now() };
                      var saved = JSON.parse(localStorage.getItem('alloflow_beats') || '[]');
                      saved.push(comp); localStorage.setItem('alloflow_beats', JSON.stringify(saved));
                      upd('beatSaveRefresh', Date.now());
                      addToast('\uD83D\uDCBE Beat saved!', 'success');
                    },
                    className: "px-3 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm"
                  }, "\uD83D\uDCBE Save"),
                  React.createElement("button", { onClick: sharePattern, className: "px-3 py-1.5 rounded-lg text-[10px] font-bold bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-sm" }, "\uD83D\uDD17 Share URL"),
                  React.createElement("button", { onClick: exportBeat, disabled: d.bpExporting,
                    className: "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-sm " + (d.bpExporting ? 'bg-gray-300 text-gray-500' : 'bg-orange-500 text-white hover:bg-orange-600')
                  }, d.bpExporting ? '\u23F3 Recording...' : '\uD83D\uDCE5 Export'),
                  React.createElement("button", {
                    onClick: function () { setToolSnapshots(function (prev) { return prev.concat([{ id: 'bp-' + Date.now(), tool: 'synth', label: 'Beat Pad', data: Object.assign({}, d), timestamp: Date.now() }]); }); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); },
                    className: "px-3 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all"
                  }, "\uD83D\uDCF8 Snapshot")
                ),
                (function () {
                  var saved = JSON.parse(localStorage.getItem('alloflow_beats') || '[]');
                  if (saved.length === 0) return React.createElement("p", { className: "text-[10px] text-emerald-400 italic" }, "No saved beats yet. Create a pattern and click Save!");
                  return React.createElement("div", { className: "flex flex-col gap-1 max-h-28 overflow-y-auto" },
                    saved.map(function (comp, ci) {
                      return React.createElement("div", { key: ci, className: "flex items-center gap-2 bg-white rounded-lg px-2 py-1.5 border border-emerald-100" },
                        React.createElement("span", { className: "text-[10px] font-bold text-emerald-700 flex-1 truncate" }, comp.name),
                        React.createElement("span", { className: "text-[9px] text-slate-400" }, (comp.bpm || 120) + " BPM"),
                        React.createElement("button", {
                          onClick: function () {
                            upd('seqGrid', comp.grid || {}); upd('beatMelody', comp.melody || null);
                            upd('seqBPM', comp.bpm || 120); upd('seqSwing', comp.swing || '0');
                            if (comp.scale) upd('bpScale', comp.scale);
                            if (comp.kit && window._alloSampleCache[comp.kit]) upd('activeKit', comp.kit);
                            else if (comp.kit) loadSampleKit(comp.kit);
                            addToast('\uD83C\uDFB5 Loaded!', 'success');
                          },
                          className: "px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        }, "\u25B6"),
                        React.createElement("button", {
                          onClick: function () {
                            var s = JSON.parse(localStorage.getItem('alloflow_beats') || '[]');
                            s.splice(ci, 1); localStorage.setItem('alloflow_beats', JSON.stringify(s));
                            upd('beatSaveRefresh', Date.now());
                          },
                          className: "px-1.5 py-0.5 rounded text-[9px] font-bold text-red-400 hover:text-red-600 hover:bg-red-50"
                        }, "\u2715")
                      );
                    })
                  );
                })()
              )
            ),

            // ═══════════ TAB: HARMONYPAD ═══════════
            synthTab === 'harmonypad' && React.createElement("div", null,
              // Voice presets
              React.createElement("div", { className: "bg-gradient-to-r from-amber-50 to-rose-50 rounded-xl border border-amber-200 p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-amber-800" }, "\uD83C\uDF1F HarmonyPad"),
                  React.createElement("span", { className: "text-[10px] text-amber-600" }, "Pure sine+triangle blend")
                ),
                React.createElement("p", { className: "text-[10px] text-amber-700 mb-3 leading-relaxed" }, "HarmonyPad creates warm, pure tones by blending sine and triangle waves. Choose a voice, pick a chord from the grid below, then strum the plate!"),

                // Voice selector
                React.createElement("div", { className: "flex gap-2 mb-4" },
                  [{ id: 'harp', label: '\uD83C\uDFB5 Harp', desc: t('stem.synth.pure_clean') },
                  { id: 'organ', label: '\u2728 Organ', desc: t('stem.synth.warm_chorus') },
                  { id: 'pad', label: '\uD83C\uDF0A Pad', desc: t('stem.synth.slow_lush') }].map(function (v) {
                    return React.createElement("button", {
                      key: v.id,
                      onClick: function () { upd('omniVoice', v.id); },
                      className: "flex-1 py-2 rounded-lg text-center transition-all " + ((d.omniVoice || 'harp') === v.id ? 'bg-amber-600 text-white shadow-md' : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-100')
                    },
                      React.createElement("div", { className: "text-xs font-bold" }, v.label),
                      React.createElement("div", { className: "text-[9px] " + ((d.omniVoice || 'harp') === v.id ? 'text-amber-200' : 'text-amber-500') }, v.desc)
                    );
                  })
                ),

                // Chord grid
                React.createElement("div", { className: "mb-4" },
                  React.createElement("div", { className: "text-[10px] font-bold text-amber-700 mb-2" }, "\uD83C\uDFB6 Chord Grid \u2014 tap to select, Space to strum"),
                  React.createElement("div", { className: "grid grid-cols-7 gap-1" },
                    // Header row
                    ['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(function (root) {
                      return React.createElement("div", { key: 'h_' + root, className: "text-center text-[10px] font-bold text-amber-600 py-0.5" }, root);
                    })
                  ),
                  // Chord type rows
                  [{ type: 'Major', label: 'Maj', color: 'from-amber-400 to-amber-500' },
                  { type: 'Minor', label: 'min', color: 'from-rose-400 to-rose-500' },
                  { type: 'Dom7', label: '7th', color: 'from-purple-400 to-purple-500' }].map(function (ct) {
                    return React.createElement("div", { key: ct.type, className: "grid grid-cols-7 gap-1 mt-1" },
                      ['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(function (root) {
                        var isActive = d.omniChordRoot === root && d.omniChordType === ct.type;
                        return React.createElement("button", {
                          key: root + ct.type,
                          onClick: function () {
                            upd('omniChordRoot', root); upd('omniChordType', ct.type);
                          },
                          className: "py-2 rounded-lg text-[10px] font-bold transition-all " + (isActive ? 'bg-gradient-to-b ' + ct.color + ' text-white shadow-md scale-105' : 'bg-white border border-amber-200 text-amber-800 hover:border-amber-400 hover:bg-amber-50')
                        }, root + ct.label,
                          React.createElement("div", { className: "text-[7px] opacity-40 mt-0.5" }, (function() { var keys = { C: 'QAZ', D: 'WSX', E: 'EDC', F: 'RFV', G: 'TGB', A: 'YHN', B: 'UJM' }; var row = { Major: 0, Minor: 1, Dom7: 2 }; return keys[root] ? keys[root][row[ct.type]] : ''; })())
                        );
                      })
                    );
                  })
                ),

                // Strum plate
                React.createElement("div", { className: "mb-3" },
                  React.createElement("div", { className: "text-[10px] font-bold text-amber-700 mb-2" }, "\uD83C\uDFB8 Strum Plate \u2014 tap or drag across"),
                  React.createElement("div", { className: "flex gap-0.5 bg-gradient-to-b from-amber-100 to-amber-200 rounded-xl p-3 border border-amber-300" },
                    (function () {
                      var chordRoot = d.omniChordRoot || 'C';
                      var chordType = d.omniChordType || 'Major';
                      var chordData = CHORDS[chordType];
                      if (!chordData) return null;
                      var ri = NOTE_NAMES.indexOf(chordRoot);
                      var oct = d.octave || 4;
                      // Build string set: chord notes spread across range
                      var strings = [];
                      chordData.intervals.forEach(function (intv) {
                        var nIdx = (ri + intv) % 12; var nOct = oct + Math.floor((ri + intv) / 12);
                        strings.push({ note: NOTE_NAMES[nIdx], oct: nOct, freq: noteFreq(NOTE_NAMES[nIdx], nOct) });
                      });
                      // Octave +1
                      chordData.intervals.forEach(function (intv) {
                        var nIdx = (ri + intv) % 12; var nOct = oct + 1 + Math.floor((ri + intv) / 12);
                        strings.push({ note: NOTE_NAMES[nIdx], oct: nOct, freq: noteFreq(NOTE_NAMES[nIdx], nOct) });
                      });
                      // Octave +2
                      chordData.intervals.forEach(function (intv) {
                        var nIdx = (ri + intv) % 12; var nOct = oct + 2 + Math.floor((ri + intv) / 12);
                        strings.push({ note: NOTE_NAMES[nIdx], oct: nOct, freq: noteFreq(NOTE_NAMES[nIdx], nOct) });
                      });
                      // Octave +3
                      chordData.intervals.forEach(function (intv) {
                        var nIdx = (ri + intv) % 12; var nOct = oct + 3 + Math.floor((ri + intv) / 12);
                        strings.push({ note: NOTE_NAMES[nIdx], oct: nOct, freq: noteFreq(NOTE_NAMES[nIdx], nOct) });
                      });
                      // Octave +4
                      chordData.intervals.forEach(function (intv) {
                        var nIdx = (ri + intv) % 12; var nOct = oct + 4 + Math.floor((ri + intv) / 12);
                        strings.push({ note: NOTE_NAMES[nIdx], oct: nOct, freq: noteFreq(NOTE_NAMES[nIdx], nOct) });
                      });
                      // Octave +5
                      chordData.intervals.forEach(function (intv) {
                        var nIdx = (ri + intv) % 12; var nOct = oct + 5 + Math.floor((ri + intv) / 12);
                        strings.push({ note: NOTE_NAMES[nIdx], oct: nOct, freq: noteFreq(NOTE_NAMES[nIdx], nOct) });
                      });
                      return strings.slice(0, 24).map(function (s, si) {
                        var isPlaying = (d.omniStrumActive || []).indexOf(si) !== -1;
                        return React.createElement("div", {
                          key: si,
                          onMouseDown: function () {
                            playHarmonyTone(s.freq, 'omniStr_' + si, 900, d.omniVoice || 'harp');
                            upd('omniStrumActive', (d.omniStrumActive || []).concat([si]));
                            setTimeout(function () { upd('omniStrumActive', (d.omniStrumActive || []).filter(function (x) { return x !== si; })); }, 400);
                          },
                          onMouseEnter: function (e) {
                            if (e.buttons === 1) {
                              playHarmonyTone(s.freq, 'omniStr_' + si, 900, d.omniVoice || 'harp');
                              upd('omniStrumActive', (d.omniStrumActive || []).concat([si]));
                              setTimeout(function () { upd('omniStrumActive', (d.omniStrumActive || []).filter(function (x) { return x !== si; })); }, 400);
                            }
                          },
                          className: "flex-1 rounded-lg cursor-pointer transition-all select-none " + (isPlaying ? 'bg-amber-500 shadow-lg scale-y-105' : 'bg-gradient-to-b from-amber-300 to-amber-400 hover:from-amber-400 hover:to-amber-500'),
                          style: { height: '80px', minWidth: '14px' }
                        },
                          React.createElement("div", { className: "text-center pt-1 text-[8px] font-bold " + (isPlaying ? 'text-white' : 'text-amber-800') }, s.note + s.oct),
                          React.createElement("div", { className: "w-px mx-auto h-10 " + (isPlaying ? 'bg-white' : 'bg-amber-600 opacity-40') })
                        );
                      });
                    })()
                  )
                ),

                // Full strum button
                React.createElement("button", {
                  onClick: function () { strumHarmony(d.omniChordRoot || 'C', d.omniChordType || 'Major', d.omniVoice || 'harp'); },
                  className: "w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:from-amber-600 hover:to-rose-600 shadow-md hover:shadow-lg transition-all"
                }, "\uD83C\uDFB5 Strum " + (d.omniChordRoot || 'C') + " " + (d.omniChordType || 'Major'))
              )
            ),


            // ═══════════ TAB: BEAT PAD (MPC-Lite) ═══════════
            synthTab === 'beatpad' && React.createElement("div", null,
              // Header
              React.createElement("div", { className: "bg-gradient-to-r from-slate-900 to-indigo-900 rounded-xl border border-indigo-500/30 p-4 mb-3" },
                React.createElement("div", { className: "flex items-center justify-between mb-3" },
                  React.createElement("div", { className: "flex items-center gap-2" },
                    React.createElement("span", { className: "text-lg" }, "\uD83E\uDD41"),
                    React.createElement("span", { className: "text-sm font-bold text-white" }, "Beat Pad"),
                    React.createElement("span", { className: "text-[10px] text-indigo-400" }, "MPC-Lite"),
                    d.midiConnected && React.createElement("span", { className: "px-2 py-0.5 bg-green-500/20 text-green-400 text-[9px] font-bold rounded-full border border-green-500/30" }, "\uD83C\uDFB9 MIDI")
                  ),
                  React.createElement("div", { className: "flex items-center gap-2" },
                    React.createElement("span", { className: "text-[10px] text-indigo-300 font-bold" }, "BPM"),
                    React.createElement("input", { type: "range", min: "60", max: "180", step: "1", value: d.seqBPM || 120, onChange: function (e) { upd('seqBPM', parseInt(e.target.value)); }, className: "w-20 accent-indigo-400", style: { height: '14px' } }),
                    React.createElement("span", { className: "text-sm font-bold text-indigo-300 min-w-[36px] text-center" }, String(d.seqBPM || 120))
                  )
                ),
                // Drum pads (4x3 grid)
                React.createElement("div", { className: "grid grid-cols-4 gap-2 mb-4" },
                  BEAT_PAD_SOUNDS.map(function (sound, idx) {
                    var isHit = d.beatPadActive === idx;
                    return React.createElement("button", {
                      key: sound.type,
                      onMouseDown: function () { playDrumExt(sound.type); upd('beatPadActive', idx); setTimeout(function () { upd('beatPadActive', -1); }, 150); },
                      className: "relative py-4 rounded-xl text-center font-bold text-xs transition-all active:scale-95 " + (isHit ? 'scale-95 brightness-150 shadow-lg' : 'hover:brightness-110'),
                      style: { backgroundColor: sound.color + (isHit ? '' : '99'), color: '#fff', boxShadow: isHit ? '0 0 20px ' + sound.color + '80' : 'none' }
                    },
                      React.createElement("div", null, sound.label),
                      React.createElement("div", { className: "text-[9px] opacity-60 mt-0.5" }, sound.key)
                    );
                  })
                ),
                // Transport controls
                React.createElement("div", { className: "flex gap-2 mb-4" },
                  React.createElement("button", {
                    onClick: function () { if (d.seqPlaying) stopSequencer(); else startSequencer(); },
                    className: "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all " + (d.seqPlaying ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' : 'bg-emerald-500 text-white hover:bg-emerald-600')
                  }, d.seqPlaying ? "\u23F9 Stop" : "\u25B6 Play"),
                  React.createElement("button", {
                    onClick: function () { upd('seqGrid', {}); },
                    className: "px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
                  }, "\uD83D\uDDD1 Clear"),
                  // Presets dropdown
                  React.createElement("select", {
                    value: "",
                    onChange: function (e) { var p = SEQ_PRESETS[e.target.value]; if (p) upd('seqGrid', Object.assign({}, p.grid)); },
                    className: "px-3 py-2.5 rounded-xl text-sm font-bold bg-indigo-700 text-white border border-indigo-500 cursor-pointer"
                  },
                    React.createElement("option", { value: "" }, "\uD83C\uDFB5 Presets"),
                    Object.keys(SEQ_PRESETS).map(function (k) {
                      return React.createElement("option", { key: k, value: k }, SEQ_PRESETS[k].name);
                    })
                  )
                ),
                // 16-step sequencer grid
                React.createElement("div", { className: "overflow-x-auto" },
                  React.createElement("div", { className: "min-w-[600px]" },
                    // Step numbers header
                    React.createElement("div", { className: "grid gap-0.5 mb-1", style: { gridTemplateColumns: '60px repeat(16, 1fr)' } },
                      React.createElement("div", null),
                      Array.from({ length: 16 }, function (_, i) {
                        var isBeat = i % 4 === 0;
                        var isCurrent = d.seqCurrentStep === i;
                        return React.createElement("div", {
                          key: i,
                          className: "text-center text-[9px] font-bold rounded py-0.5 " + (isCurrent ? 'bg-amber-500 text-white' : isBeat ? 'text-indigo-300' : 'text-indigo-600')
                        }, isBeat ? String(Math.floor(i / 4) + 1) : '·');
                      })
                    ),
                    // Drum rows
                    BEAT_PAD_SOUNDS.slice(0, 8).map(function (sound, row) {
                      return React.createElement("div", {
                        key: sound.type,
                        className: "grid gap-0.5 mb-0.5",
                        style: { gridTemplateColumns: '60px repeat(16, 1fr)' }
                      },
                        React.createElement("div", {
                          className: "text-[9px] font-bold flex items-center px-1 rounded",
                          style: { color: sound.color }
                        }, sound.label),
                        Array.from({ length: 16 }, function (_, col) {
                          var key = row + '_' + col;
                          var isOn = !!(d.seqGrid || {})[key];
                          var isCurrent = d.seqCurrentStep === col;
                          var isBeat = col % 4 === 0;
                          return React.createElement("button", {
                            key: col,
                            onClick: function () {
                              var g = Object.assign({}, d.seqGrid || {});
                              if (g[key]) delete g[key]; else g[key] = 1;
                              upd('seqGrid', g);
                            },
                            className: "h-7 rounded transition-all " + (isOn ? 'shadow-md' : isBeat ? 'bg-slate-700/60 hover:bg-slate-600' : 'bg-slate-800/60 hover:bg-slate-700'),
                            style: isOn ? { backgroundColor: sound.color, boxShadow: isCurrent ? '0 0 12px ' + sound.color : 'none', opacity: isCurrent ? 1 : 0.8 } : { borderLeft: isBeat ? '1px solid rgba(99,102,241,0.2)' : 'none', opacity: isCurrent ? 0.7 : 1, backgroundColor: isCurrent ? 'rgba(99,102,241,0.2)' : undefined }
                          });
                        })
                      );
                    })
                  )
                ),
                // Music theory info
                React.createElement("div", { className: "mt-3 bg-indigo-950/50 rounded-lg p-3 border border-indigo-500/20" },
                  React.createElement("div", { className: "text-[10px] font-bold text-indigo-300 mb-1" }, "\uD83C\uDFB6 Rhythm Theory"),
                  React.createElement("div", { className: "grid grid-cols-4 gap-2" },
                    [['4/4 Time', 'Most common. 4 beats per measure.'], ['16th Notes', 'Each row has 16 subdivisions.'], ['Syncopation', 'Off-beat accents create groove.'], ['Polyrhythm', 'Layer different patterns!']].map(function (tip) {
                      return React.createElement("div", { key: tip[0], className: "text-center" },
                        React.createElement("div", { className: "text-[10px] font-bold text-indigo-400" }, tip[0]),
                        React.createElement("div", { className: "text-[8px] text-indigo-500" }, tip[1])
                      );
                    })
                  ),
                  React.createElement("div", { className: "mt-2 text-[9px] text-indigo-500 text-center" }, "\uD83D\uDCA1 Tip: Start a beat here, then switch to HarmonyPad or Play to layer melodies on top!")
                )
              )
            ),

            // ═══════════ TAB: THEORY ═══════════
            synthTab === 'theory' && React.createElement("div", null,
              // Intervals
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-slate-800" }, "\uD83D\uDCCF Intervals"),
                  React.createElement("span", { className: "text-[9px] text-slate-400 cursor-help", title: EFFECT_TIPS.intervals.text }, "\u2753")
                ),
                React.createElement("div", { className: "grid grid-cols-2 gap-1" },
                  INTERVALS.map(function (intv) {
                    var qColors = { perfect: 'bg-green-50 border-green-200 text-green-700', consonant: 'bg-blue-50 border-blue-200 text-blue-700', dissonant: 'bg-red-50 border-red-200 text-red-700' };
                    return React.createElement("button", {
                      key: intv.name,
                      onClick: function () {
                        var base = noteFreq(selectedRoot, d.octave || 4);
                        playNoteFor(base, 'intv_base', 600);
                        setTimeout(function () { playNoteFor(base * Math.pow(2, intv.semitones / 12), 'intv_top', 600); }, 400);
                      },
                      className: "flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left transition-all hover:shadow-sm " + (qColors[intv.quality] || 'bg-slate-50 border-slate-200')
                    },
                      React.createElement("span", { className: "text-[11px] font-bold" }, intv.name),
                      React.createElement("span", { className: "text-[9px] text-slate-400 ml-auto" }, intv.ratio),
                      React.createElement("span", { className: "text-[9px] text-slate-400 hidden sm:inline" }, intv.song)
                    );
                  })
                )
              ),

              // Harmonic Series
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-slate-800" }, "\uD83C\uDF10 Harmonic Series"),
                  React.createElement("span", { className: "text-[9px] text-slate-400 cursor-help", title: EFFECT_TIPS.harmonicSeries.text }, "\u2753")
                ),
                React.createElement("div", { className: "flex gap-2" },
                  HARMONICS_INFO.map(function (h) {
                    return React.createElement("button", {
                      key: h.n,
                      onClick: function () { playHarmonic(h.n); },
                      className: "flex-1 py-3 rounded-xl bg-gradient-to-b from-indigo-50 to-purple-50 border border-indigo-200 text-center hover:shadow-md transition-all group cursor-pointer"
                    },
                      React.createElement("span", { className: "text-lg font-bold text-indigo-600 block group-hover:scale-110 transition-transform" }, h.n),
                      React.createElement("span", { className: "text-[8px] text-indigo-400 block" }, h.ratio),
                      React.createElement("span", { className: "text-[7px] text-slate-400 block" }, h.interval)
                    );
                  })
                )
              ),

              // Ear Training
              React.createElement("div", { className: "bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-4" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-emerald-800" }, "\uD83D\uDC42 Ear Training"),
                  React.createElement("button", {
                    onClick: startIntervalGame,
                    className: "ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                  }, intervalGame ? '\uD83D\uDD04 New Interval' : '\u25B6 Start'),
                  intervalGame && React.createElement("button", {
                    onClick: replayInterval,
                    className: "px-2 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-700"
                  }, '\uD83D\uDD0A Replay')
                ),
                intervalGame && React.createElement("div", null,
                  React.createElement("p", { className: "text-xs font-bold text-emerald-700 mb-2" }, "What interval do you hear?"),
                  intervalGame.score > 0 && React.createElement("span", { className: "text-[10px] font-bold text-emerald-600 mr-2" }, "\u2B50 Score: " + intervalGame.score + " | \uD83D\uDD25 Streak: " + intervalGame.streak),
                  React.createElement("div", { className: "grid grid-cols-4 gap-1 mt-2" },
                    INTERVALS.slice(1).map(function (intv) {
                      var isCorrect = intervalGame.answered && intv.name === intervalGame.answer;
                      var isChosen = intervalGame.chosen === intv.name;
                      var isWrong = intervalGame.answered && isChosen && !isCorrect;
                      return React.createElement("button", {
                        key: intv.name,
                        disabled: intervalGame.answered,
                        onClick: function () {
                          var correct = intv.name === intervalGame.answer;
                          upd('intervalGame', Object.assign({}, intervalGame, { answered: true, chosen: intv.name, score: intervalGame.score + (correct ? 1 : 0), streak: correct ? intervalGame.streak + 1 : 0 }));
                          addToast(correct ? '\u2705 Correct! ' + intv.name : '\u274C ' + t('stem.dissection.it_was') + ' ' + intervalGame.answer, correct ? 'success' : 'error');
                        },
                        className: "px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all " + (isCorrect ? 'bg-green-100 border-green-400 text-green-700' : isWrong ? 'bg-red-100 border-red-400 text-red-600' : 'bg-white border-emerald-200 text-slate-700 hover:border-emerald-400')
                      }, intv.name);
                    })
                  )
                )
              ),

              // Filter Lab
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-slate-800" }, "\uD83C\uDF0A Filter Lab"),
                  React.createElement("span", { className: "text-[9px] text-slate-400 cursor-help", title: EFFECT_TIPS.filter.text }, "\u2753")
                ),
                React.createElement("svg", { viewBox: "0 0 300 100", className: "w-full bg-slate-50 rounded-lg mb-2", style: { maxHeight: '100px' } },
                  React.createElement("line", { x1: 20, y1: 80, x2: 280, y2: 80, stroke: "#e2e8f0", strokeWidth: 1 }),
                  React.createElement("line", { x1: 20, y1: 20, x2: 20, y2: 80, stroke: "#e2e8f0", strokeWidth: 1 }),
                  (function () {
                    var cutoff = (d.filterCutoff || 8000) / 12000;
                    var q = (d.filterQ || 1) / 20;
                    var type = d.filterType || 'lowpass';
                    var pts = [];
                    for (var i = 0; i <= 260; i += 2) {
                      var freq = i / 260;
                      var response;
                      if (type === 'lowpass') {
                        var dist = freq - cutoff;
                        response = dist <= 0 ? 1 : Math.max(0, 1 - dist * 3);
                        if (Math.abs(dist) < 0.1) response = Math.min(1, response + q * Math.max(0, 1 - Math.abs(dist) * 10));
                      } else if (type === 'highpass') {
                        var dist = cutoff - freq;
                        response = dist <= 0 ? 1 : Math.max(0, 1 - dist * 3);
                        if (Math.abs(dist) < 0.1) response = Math.min(1, response + q * Math.max(0, 1 - Math.abs(dist) * 10));
                      } else {
                        var dist = Math.abs(freq - cutoff);
                        response = Math.max(0, 1 - dist * 5) * (0.5 + q * 0.5);
                      }
                      pts.push((20 + i) + ',' + (80 - response * 55));
                    }
                    return React.createElement("polyline", { points: pts.join(' '), fill: "none", stroke: "#06b6d4", strokeWidth: 2 });
                  })(),
                  React.createElement("text", { x: 25, y: 95, fill: "#94a3b8", style: { fontSize: "8px" } }, "20Hz"),
                  React.createElement("text", { x: 250, y: 95, fill: "#94a3b8", style: { fontSize: "8px" } }, "20kHz"),
                  React.createElement("text", { x: 5, y: 25, fill: "#94a3b8", style: { fontSize: "8px" } }, "0dB")
                ),
                React.createElement("div", { className: "grid grid-cols-3 gap-2" },
                  ['lowpass', 'highpass', 'bandpass'].map(function (ft) {
                    return React.createElement("button", {
                      key: ft,
                      onClick: function () { upd('filterType', ft); },
                      className: "py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all " + ((d.filterType || 'lowpass') === ft ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600')
                    }, ft);
                  })
                )
              ),

              // Karplus-Strong Lab
              React.createElement("div", { className: "bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-amber-800" }, "\uD83C\uDFB8 Karplus-Strong Lab"),
                  React.createElement("span", { className: "text-[9px] text-amber-500 cursor-help", title: EFFECT_TIPS.karplusStrong.text }, "\u2753")
                ),
                React.createElement("p", { className: "text-[10px] text-amber-700 mb-3 leading-relaxed" }, "Karplus-Strong synthesis creates realistic plucked string sounds using a short noise burst fed into a delay line with filtered feedback. Adjust brightness (initial noise color) and damping (sustain length) to shape the string character."),
                React.createElement("div", { className: "grid grid-cols-3 gap-2 mb-3" },
                  [{ label: '\uD83C\uDFB8 Bright Guitar', brightness: 0.95, damping: 0.998 },
                  { label: '\uD83E\uDE95 Banjo', brightness: 0.99, damping: 0.993 },
                  { label: '\uD83C\uDFBB Warm Bass', brightness: 0.3, damping: 0.999 }].map(function (preset) {
                    return React.createElement("button", {
                      key: preset.label,
                      onClick: function () {
                        upd('ksBrightness', preset.brightness); upd('ksDamping', preset.damping); upd('synthEngine', 'plucked');
                        playPlucked(noteFreq(selectedRoot, d.octave || 4), 'ks_demo', preset.brightness, preset.damping);
                      },
                      className: "py-2 rounded-lg text-[11px] font-bold bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-400 transition-all"
                    }, preset.label);
                  })
                ),
                [{ k: 'ksBrightness', label: t('stem.synth.brightness'), min: 0.1, max: 1, step: 0.01 },
                { k: 'ksDamping', label: t('stem.synth.sustaindamping'), min: 0.99, max: 0.9999, step: 0.0001 }].map(function (p) {
                  return React.createElement("div", { key: p.k, className: "flex items-center gap-2 mb-1" },
                    React.createElement("span", { className: "text-[10px] font-bold text-amber-700 w-24" }, p.label),
                    React.createElement("input", { type: "range", min: p.min, max: p.max, step: p.step, value: d[p.k] || (p.k === 'ksBrightness' ? 0.8 : 0.996), onChange: function (e) { upd(p.k, parseFloat(e.target.value)); }, className: "flex-1 accent-amber-500" }),
                    React.createElement("span", { className: "text-[10px] text-amber-600 w-14 text-right font-mono" }, (d[p.k] || (p.k === 'ksBrightness' ? 0.8 : 0.996)).toFixed(p.k === 'ksDamping' ? 4 : 2))
                  );
                }),
                React.createElement("button", {
                  onClick: function () { playPlucked(noteFreq(selectedRoot, d.octave || 4), 'ks_test', d.ksBrightness || 0.8, d.ksDamping || 0.996); },
                  className: "mt-2 px-4 py-2 rounded-lg text-sm font-bold bg-amber-600 text-white hover:bg-amber-700 transition-all w-full"
                }, "\uD83C\uDFB8 Pluck " + selectedRoot + (d.octave || 4))
              ),

              // Music Theory Quiz (moved from Quiz tab)
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-slate-800" }, "\uD83E\uDDE0 Music Theory Quiz"),
                  d.quizScore2 > 0 && React.createElement("span", { className: "text-xs font-bold text-green-600 ml-auto" }, "\u2B50 " + d.quizScore2 + "/" + (d.quizTotal2 || 0)),
                  d.quizStreak2 > 0 && React.createElement("span", { className: "text-xs font-bold text-amber-500" }, "\uD83D\uDD25 " + d.quizStreak2)
                ),
                (function () {
                  var qIdx = d.quizIdx2 || 0; var q = MUSIC_QUIZ[qIdx % MUSIC_QUIZ.length];
                  return React.createElement("div", null,
                    React.createElement("p", { className: "text-xs font-bold text-purple-700 mb-1" }, "Q" + (qIdx + 1) + " of " + MUSIC_QUIZ.length),
                    React.createElement("p", { className: "text-sm font-bold text-slate-800 mb-3" }, q.q),
                    React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                      q.opts.map(function (opt) {
                        var fb = d.quizFeedback2;
                        var isCorrect = fb && opt === q.a;
                        var isChosen = fb && fb.chosen === opt;
                        var isWrong = isChosen && !isCorrect;
                        return React.createElement("button", {
                          key: opt,
                          disabled: !!fb,
                          onClick: function () {
                            var correct = opt === q.a;
                            upd('quizFeedback2', { correct: correct, chosen: opt });
                            upd('quizScore2', (d.quizScore2 || 0) + (correct ? 1 : 0));
                            upd('quizTotal2', (d.quizTotal2 || 0) + 1);
                            upd('quizStreak2', correct ? (d.quizStreak2 || 0) + 1 : 0);
                            addToast(correct ? '\u2705 Correct!' : '\u274C The answer is: ' + q.a, correct ? 'success' : 'error');
                          },
                          className: "px-3 py-2.5 rounded-lg text-xs font-bold border-2 transition-all " + (isCorrect ? 'border-green-400 bg-green-50 text-green-700' : isWrong ? 'border-red-400 bg-red-50 text-red-600' : fb ? 'border-slate-200 bg-slate-50 text-slate-400' : 'border-purple-200 bg-white text-slate-700 hover:border-purple-400 hover:bg-purple-50')
                        }, opt);
                      })
                    ),
                    d.quizFeedback2 && React.createElement("div", { className: "mt-3 flex justify-center" },
                      React.createElement("button", {
                        onClick: function () { upd('quizIdx2', (d.quizIdx2 || 0) + 1); upd('quizFeedback2', null); },
                        className: "px-4 py-2 rounded-lg text-sm font-bold bg-purple-600 text-white hover:bg-purple-700"
                      }, "Next Question \u2192")
                    )
                  );
                })()
              ),

              // ── Chord Detection Challenge ──
              React.createElement("div", { className: "bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-200 p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-rose-800" }, "\uD83C\uDFB5 Chord Detection"),
                  d.chordDetectScore > 0 && React.createElement("span", { className: "text-xs font-bold text-green-600 ml-auto" }, "\u2B50 " + d.chordDetectScore + "/" + (d.chordDetectTotal || 0)),
                  React.createElement("button", {
                    onClick: function () {
                      var chordNames = ['Major', 'Minor', 'Diminished', 'Augmented', 'Maj7', 'Min7', 'Dom7', 'Sus2', 'Sus4'];
                      var roots = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
                      var correctType = chordNames[Math.floor(Math.random() * chordNames.length)];
                      var correctRoot = roots[Math.floor(Math.random() * roots.length)];
                      var wrongOpts = chordNames.filter(function (c) { return c !== correctType; });
                      wrongOpts.sort(function () { return Math.random() - 0.5; });
                      var opts = [correctType].concat(wrongOpts.slice(0, 3));
                      opts.sort(function () { return Math.random() - 0.5; });
                      playChord(correctRoot, correctType, 0);
                      upd('chordDetect', { root: correctRoot, type: correctType, opts: opts, answered: false, chosen: null });
                    },
                    className: "ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700"
                  }, d.chordDetect ? '\uD83D\uDD04 New Chord' : '\u25B6 Start'),
                  d.chordDetect && React.createElement("button", {
                    onClick: function () { playChord(d.chordDetect.root, d.chordDetect.type, 0); },
                    className: "px-2 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-700"
                  }, '\uD83D\uDD0A Replay')
                ),
                d.chordDetect && React.createElement("div", null,
                  React.createElement("p", { className: "text-xs font-bold text-rose-700 mb-2" }, "What type of chord do you hear?"),
                  React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                    d.chordDetect.opts.map(function (opt) {
                      var fb = d.chordDetect.answered;
                      var isCorrect = fb && opt === d.chordDetect.type;
                      var isChosen = d.chordDetect.chosen === opt;
                      var isWrong = fb && isChosen && !isCorrect;
                      return React.createElement("button", {
                        key: opt, disabled: fb,
                        onClick: function () {
                          var correct = opt === d.chordDetect.type;
                          upd('chordDetect', Object.assign({}, d.chordDetect, { answered: true, chosen: opt }));
                          upd('chordDetectScore', (d.chordDetectScore || 0) + (correct ? 1 : 0));
                          upd('chordDetectTotal', (d.chordDetectTotal || 0) + 1);
                          addToast(correct ? '\u2705 Correct! ' + d.chordDetect.root + ' ' + d.chordDetect.type : '\u274C It was ' + d.chordDetect.root + ' ' + d.chordDetect.type, correct ? 'success' : 'error');
                        },
                        className: "px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all " + (isCorrect ? 'border-green-400 bg-green-50 text-green-700' : isWrong ? 'border-red-400 bg-red-50 text-red-600' : fb ? 'border-slate-200 bg-slate-50 text-slate-400' : 'border-rose-200 bg-white text-slate-700 hover:border-rose-400 hover:bg-rose-50')
                      }, opt);
                    })
                  ),
                  d.chordDetect.answered && React.createElement("p", { className: "text-xs text-rose-600 mt-2" }, "\uD83C\uDFB6 It was ", React.createElement("span", { className: "font-bold" }, d.chordDetect.root + " " + d.chordDetect.type), " \u2014 ", CHORDS[d.chordDetect.type] && CHORDS[d.chordDetect.type].desc)
                )
              ),

              // ── Aural Dictation Challenge ──
              React.createElement("div", { className: "bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl border border-violet-200 p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-violet-800" }, "\uD83D\uDCDD Aural Dictation"),
                  d.dictationScore > 0 && React.createElement("span", { className: "text-xs font-bold text-green-600 ml-auto" }, "\u2B50 " + d.dictationScore + "/" + (d.dictationTotal || 0)),
                  React.createElement("button", {
                    onClick: function () {
                      var roots = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
                      var octave = d.octave || 4;
                      var melody = [];
                      for (var i = 0; i < 4; i++) { melody.push(roots[Math.floor(Math.random() * roots.length)]); }
                      melody.forEach(function (note, idx) {
                        setTimeout(function () { playNoteFor(noteFreq(note, octave), 'dict_' + idx, 450); }, idx * 500);
                      });
                      upd('dictation', { melody: melody, guesses: ['', '', '', ''], answered: false });
                    },
                    className: "ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 text-white hover:bg-violet-700"
                  }, d.dictation ? '\uD83D\uDD04 New Melody' : '\u25B6 Start'),
                  d.dictation && React.createElement("button", {
                    onClick: function () {
                      var octave = d.octave || 4;
                      d.dictation.melody.forEach(function (note, idx) {
                        setTimeout(function () { playNoteFor(noteFreq(note, octave), 'dict_' + idx, 450); }, idx * 500);
                      });
                    },
                    className: "px-2 py-1 rounded-lg text-xs font-bold bg-violet-100 text-violet-700"
                  }, '\uD83D\uDD0A Replay')
                ),
                d.dictation && React.createElement("div", null,
                  React.createElement("p", { className: "text-xs font-bold text-violet-700 mb-2" }, "Identify each note in the 4-note melody:"),
                  React.createElement("div", { className: "flex gap-2 mb-3" },
                    [0, 1, 2, 3].map(function (idx) {
                      var guess = d.dictation.guesses[idx];
                      var answered = d.dictation.answered;
                      var correct = answered && guess === d.dictation.melody[idx];
                      var wrong = answered && guess && !correct;
                      return React.createElement("div", { key: idx, className: "flex-1 text-center" },
                        React.createElement("div", { className: "text-[10px] font-bold text-violet-500 mb-1" }, "Note " + (idx + 1)),
                        React.createElement("select", {
                          'aria-label': 'Guess note ' + (idx + 1),
                          value: guess || '', disabled: answered,
                          onChange: function (e) {
                            var g = d.dictation.guesses.slice(); g[idx] = e.target.value;
                            upd('dictation', Object.assign({}, d.dictation, { guesses: g }));
                          },
                          className: "w-full px-2 py-1.5 rounded-lg border-2 text-sm font-bold " + (correct ? 'border-green-400 bg-green-50 text-green-700' : wrong ? 'border-red-400 bg-red-50 text-red-600' : 'border-violet-200 text-slate-700')
                        },
                          React.createElement("option", { value: "" }, "?"),
                          ['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(function (n) { return React.createElement("option", { key: n, value: n }, n); })
                        ),
                        answered && React.createElement("div", { className: "text-[9px] font-bold mt-1 " + (correct ? 'text-green-600' : 'text-red-500') }, correct ? '\u2705' : '\u274C ' + d.dictation.melody[idx])
                      );
                    })
                  ),
                  !d.dictation.answered && React.createElement("button", {
                    onClick: function () {
                      var g = d.dictation.guesses; var m = d.dictation.melody;
                      var c = g.filter(function (v, i) { return v === m[i]; }).length;
                      upd('dictation', Object.assign({}, d.dictation, { answered: true }));
                      upd('dictationScore', (d.dictationScore || 0) + c);
                      upd('dictationTotal', (d.dictationTotal || 0) + 4);
                      addToast(c === 4 ? '\u2705 Perfect! All 4 notes!' : c > 0 ? '\uD83C\uDFAF ' + c + '/4 correct' : '\u274C Try again!', c === 4 ? 'success' : c > 0 ? 'info' : 'error');
                    },
                    className: "w-full py-2 rounded-lg text-sm font-bold bg-violet-600 text-white hover:bg-violet-700 transition-all"
                  }, "\u2714 Check Dictation"),
                  d.dictation.answered && React.createElement("div", { className: "text-center mt-2" },
                    React.createElement("p", { className: "text-xs text-violet-600" }, "\uD83C\uDFB5 The melody was: ", React.createElement("span", { className: "font-bold" }, d.dictation.melody.join(' \u2192 ')))
                  )
                )
              )
            ),



            // ── Snapshot button (bottom) ──
            React.createElement("div", { className: "flex gap-3 mt-3 items-center" },
              React.createElement("button", { onClick: function () { setToolSnapshots(function (prev) { return prev.concat([{ id: 'sy-' + Date.now(), tool: 'synth', label: t('stem.synth_ui.synth') + (d.waveType || 'sine'), data: Object.assign({}, d), timestamp: Date.now() }]); }); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")
            )
          );

        })(),

        // ═══════════════════════════════════════════════════════
        // HUMAN ANATOMY EXPLORER
        /* anatomy: removed — see stem_tool_science.js */
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
        /* companionPlanting: removed — see stem_tool_science.js */

        // --- GEOMETRY SANDBOX → extracted to stem_tool_geosandbox.js (plugin-only) ---
        null,


        /* archStudio: removed -- see stem_tool_archstudio.js */

        // --- GRAPHING CALCULATOR EMULATOR ---
        /* graphCalc: removed — see stem_tool_science.js */

        /* dataStudio: removed -- see stem_tool_datastudio.js */

        // ═══════════════════════════════════════════════════════════════
        // ██  ALGEBRA SOLVER (CAS) — AI-Powered Step-by-Step Math      ██
        // ═══════════════════════════════════════════════════════════════
        /* algebraCAS: removed — see stem_tool_science.js */


        // ═══════════════════════════════════════════════════════════════
        // ██  AQUACULTURE & OCEAN ECOLOGY LAB                         ██
        // ═══════════════════════════════════════════════════════════════
        /* aquarium: removed — see stem_tool_science.js */

        // ═══════════════════════════════════════════════════════════════
        // ██  CODING PLAYGROUND — Visual Block / Text Turtle Graphics  ██

        // ══════════════════════════════════════════════════
        // KEPLER COLONY — Educational Space Colonization
        // ══════════════════════════════════════════════════
        stemLabTab === 'explore' && stemLabTool === 'spaceColony' && (function () {
          var d = labToolData || {};
          var upd = function (k, v) { setLabToolData(function (n) { var o = Object.assign({}, n); o[k] = v; return o; }); };
          var colony = d.colony || null;
          var turn = d.colonyTurn || 0;
          var resources = d.colonyRes || { food: 40, energy: 30, water: 30, materials: 20, science: 10 };
          var buildings = d.colonyBuildings || [];
          var settlers = d.colonySettlers || [];
          var mapData = d.colonyMap || null;
          var mapSize = 200;
          var selectedTile = d.colonySelTile || null;
          var colonyZoom = d.colonyZoom || 1.0;
          var camX = d.colonyCamX || 0;
          var camY = d.colonyCamY || 0;
          // Drag state for pan
          if (!window._colonyDragState) window._colonyDragState = { dragging: false, startX: 0, startY: 0, startCamX: 0, startCamY: 0, didDrag: false };
          var dragState = window._colonyDragState;
          // Edge scroll state
          if (!window._colonyEdgeScroll) window._colonyEdgeScroll = { active: false, dx: 0, dy: 0 };
          var edgeScroll = window._colonyEdgeScroll;
          var colonyEvent = d.colonyEvent || null;
          var scienceGate = d.scienceGate || null;
          var gameLog = d.colonyLog || [];
          var colonyPhase = d.colonyPhase || 'setup';
          var terraform = d.colonyTerraform || 0;
          var weather = d.colonyWeather || null;
          var gameMode = d.colonyMode || 'mcq'; // 'mcq' or 'freeResponse'
          var gradeLevel = d.colonyGrade || '6-8';
          var gradeDifficultyMap = { 'K-2': 'very easy, age 5-7, use simple words', '3-5': 'easy, age 8-10, elementary level', '6-8': 'medium, age 11-13, middle school level', '9-12': 'challenging, age 14-17, high school level', 'College': 'advanced, undergraduate university level' };
          var stats = d.colonyStats || { questionsAnswered: 0, correct: 0, buildingsConstructed: 0, anomaliesExplored: 0, turnsPlayed: 0 };

          // ══ HoMM-Inspired Turn Phase System ══
          var turnPhase = d.turnPhase || (turn > 0 ? 'day' : null);
          var actionPoints = d.actionPoints !== undefined ? d.actionPoints : 3;
          var maxAP = 3 + (buildings.indexOf('comms') >= 0 ? 1 : 0);
          var fateRoll = d.fateRoll || null;
          var dawnData = d.dawnData || null;
          var mapPickups = d.mapPickups || {};
          var fateAnimating = d.fateAnimating || false;
          var builtThisTurn = d.builtThisTurn || false;

          var fateTable = [
            { min: 1, max: 5, type: 'disaster', label: 'Catastrophe!', icon: '\uD83D\uDCA5', color: '#ef4444' },
            { min: 6, max: 15, type: 'hazard', label: 'Hazard', icon: '\u26A0\uFE0F', color: '#f97316' },
            { min: 16, max: 30, type: 'challenge', label: 'Challenge', icon: '\uD83C\uDFAF', color: '#eab308' },
            { min: 31, max: 50, type: 'calm', label: 'Peaceful Day', icon: '\u2600\uFE0F', color: '#22c55e' },
            { min: 51, max: 70, type: 'discovery', label: 'Discovery!', icon: '\uD83D\uDD0D', color: '#3b82f6' },
            { min: 71, max: 85, type: 'windfall', label: 'Windfall!', icon: '\uD83C\uDF81', color: '#8b5cf6' },
            { min: 86, max: 95, type: 'settlers', label: 'New Arrivals!', icon: '\uD83D\uDE80', color: '#06b6d4' },
            { min: 96, max: 100, type: 'jackpot', label: 'JACKPOT!', icon: '\u2B50', color: '#f59e0b' }
          ];
          var lootByTerrain = {
            plains: { common: { res: 'food', amt: 3, label: '+3 Food' }, rare: { res: 'food', amt: 10, label: 'Seed Vault!' }, epic: { res: 'food', amt: 20, label: 'Fertile Oasis!' } },
            mountain: { common: { res: 'materials', amt: 3, label: '+3 Materials' }, rare: { res: 'materials', amt: 8, label: 'Mineral Deposit!' }, epic: { res: 'materials', amt: 18, label: 'Ancient Mine!' } },
            volcanic: { common: { res: 'energy', amt: 3, label: '+3 Energy' }, rare: { res: 'energy', amt: 8, label: 'Geothermal Vent!' }, epic: { res: 'energy', amt: 18, label: 'Lava Forge!' } },
            ice: { common: { res: 'water', amt: 3, label: '+3 Water' }, rare: { res: 'water', amt: 8, label: 'Ice Cavern!' }, epic: { res: 'water', amt: 18, label: 'Cryo Reserve!' } },
            desert: { common: { res: 'materials', amt: 3, label: '+3 Materials' }, rare: { res: 'science', amt: 6, label: 'Fossil Site!' }, epic: { res: 'science', amt: 15, label: 'Ancient Ruins!' } },
            ocean: { common: { res: 'water', amt: 3, label: '+3 Water' }, rare: { res: 'food', amt: 8, label: 'Kelp Forest!' }, epic: { res: 'water', amt: 15, label: 'Underwater City!' } },
            radiation: { common: { res: 'science', amt: 3, label: '+3 Science' }, rare: { res: 'science', amt: 8, label: 'Data Cache!' }, epic: { res: 'science', amt: 15, label: 'Alien Archive!' } }
          };
          var tutorialGuide = [
            { turn: 1, hint: 'Explore tiles around your colony to discover resources!', icon: '\uD83D\uDDFA' },
            { turn: 2, hint: 'Build your first structure! Try Hydroponics for food.', icon: '\uD83C\uDFD7' },
            { turn: 3, hint: 'You have ' + maxAP + ' Action Points per turn. Plan wisely!', icon: '\u26A1' },
            { turn: 5, hint: 'Research unlocks permanent bonuses!', icon: '\uD83E\uDDEC' },
            { turn: 8, hint: 'Choose a governance policy to shape your colony.', icon: '\uD83C\uDFDB' }
          ];
          function getAdvisorMessage() {
            if (turn > 30) return null;
            if (resources.food <= 5 && buildings.indexOf('hydroponics') < 0)
              return { settler: settlers[0] || { name: 'Dr. Vasquez', icon: '\uD83C\uDF31', role: 'Botanist' }, msg: 'Food critical! Build Hydroponics (15 mats, 5 energy) for +3 food/turn.', action: 'build' };
            if (resources.energy <= 3 && buildings.indexOf('solar') < 0)
              return { settler: settlers[4] || { name: 'Prof. Patel', icon: '\u269B', role: 'Physicist' }, msg: 'Energy critical! Build Solar Array for +3 energy/turn.', action: 'build' };
            if (buildings.length === 0 && turn >= 2)
              return { settler: settlers[1] || { name: 'Cmdr. Chen', icon: '\u2699', role: 'Engineer' }, msg: 'We need our first building. Try Hydroponics or Solar Array.', action: 'build' };
            var guide = tutorialGuide.find(function(g) { return g.turn === turn; });
            if (guide) return { settler: settlers[Math.floor(Math.random() * Math.min(6, settlers.length))], msg: guide.hint };
            return null;
          }
          function performFateRoll() {
            var buildingBonus = Math.min(15, buildings.length * 2);
            if (buildings.indexOf('shield') >= 0) buildingBonus += 5;
            if (buildings.indexOf('lab') >= 0) buildingBonus += 3;
            var raw = Math.floor(Math.random() * 100) + 1;
            var modified = Math.min(100, raw + buildingBonus);
            var result = fateTable.find(function(f) { return modified >= f.min && modified <= f.max; }) || fateTable[3];
            return { raw: raw, modified: modified, bonus: buildingBonus, result: result };
          }
          function spendAP(cost) {
            if (actionPoints < cost) { if (addToast) addToast('Not enough Action Points!', 'error'); return false; }
            upd('actionPoints', actionPoints - cost); return true;
          }
          function generatePickups(tiles) {
            var pk = {};
            for (var pi = 0; pi < tiles.length; pi++) {
              if (tiles[pi].type === 'colony') continue;
              var rx = pi % mapSize, ry = Math.floor(pi / mapSize);
              if (Math.random() < 0.07) {
                var loot = lootByTerrain[tiles[pi].type] || lootByTerrain.plains;
                var rr = Math.random();
                pk[rx + ',' + ry] = rr < 0.05 ? Object.assign({ rarity: 'epic' }, loot.epic) : rr < 0.25 ? Object.assign({ rarity: 'rare' }, loot.rare) : Object.assign({ rarity: 'common' }, loot.common);
              }
            }
            return pk;
          }

          // ── Rover & Exploration Units ──
          var rovers = d.colonyRovers || [];
          var selectedRover = d.selectedRover || null;
          var roverDefs = [
            { type: 'scout', name: 'Scout Rover', icon: '\uD83D\uDE99', vision: 5, maxMoves: 6, maxFuel: 20, cost: { materials: 8, energy: 5 }, desc: 'Fast recon. 5-tile vision, 6 moves/turn.', color: '#22d3ee' },
            { type: 'heavy', name: 'Heavy Rover', icon: '\uD83D\uDE9B', vision: 3, maxMoves: 2, maxFuel: 14, cost: { materials: 15, energy: 10 }, desc: 'Slow but can build outposts. 3-tile vision.', color: '#f97316' },
            { type: 'science', name: 'Science Rover', icon: '\uD83D\uDD2C', vision: 4, maxMoves: 4, maxFuel: 16, cost: { materials: 12, science: 8 }, desc: 'Auto-collects +2 science/turn from terrain. 4-tile vision.', color: '#a78bfa' }
          ];
          function getRoverDef(type) { return roverDefs.find(function (rd) { return rd.type === type; }) || roverDefs[0]; }
          function buildRover(type) {
            var def = getRoverDef(type);
            var nr = Object.assign({}, resources);
            var canAfford = true;
            Object.keys(def.cost).forEach(function (k) { if ((nr[k] || 0) < def.cost[k]) canAfford = false; });
            if (!canAfford) { if (addToast) addToast('Not enough resources!', 'error'); return; }
            Object.keys(def.cost).forEach(function (k) { nr[k] -= def.cost[k]; });
            upd('colonyRes', nr);
            var cx = mapData ? mapData.colonyPos.x : 6;
            var cy = mapData ? mapData.colonyPos.y : 6;
            var newRover = { id: 'rv_' + Date.now(), type: type, x: cx, y: cy, fuel: def.maxFuel, movesLeft: def.maxMoves, status: 'idle' };
            var nrvs = rovers.slice(); nrvs.push(newRover); upd('colonyRovers', nrvs);
            if (addToast) addToast(def.icon + ' ' + def.name + ' deployed!', 'success');
            if (typeof addXP === 'function') addXP(5, 'Rover deployed: ' + def.name);
            var nl = gameLog.slice(); nl.push(def.icon + ' ' + def.name + ' deployed at colony.'); upd('colonyLog', nl);
          }
          function moveRover(roverId, tx, ty) {
            var rv = rovers.find(function (r) { return r.id === roverId; });
            if (!rv || rv.movesLeft <= 0 || rv.fuel <= 0) return;
            var dist = Math.abs(tx - rv.x) + Math.abs(ty - rv.y);
            if (dist > rv.movesLeft || dist > rv.fuel) return;
            var def = getRoverDef(rv.type);
            // Move the rover
            var nrvs = rovers.map(function (r) {
              if (r.id !== roverId) return r;
              return Object.assign({}, r, { x: tx, y: ty, movesLeft: r.movesLeft - dist, fuel: r.fuel - dist, status: 'moved' });
            });
            upd('colonyRovers', nrvs);
            // Explore tiles in vision radius
            if (mapData) {
              var nm = JSON.parse(JSON.stringify(mapData));
              var vis = def.vision;
              var explored2 = 0;
              for (var dy = -vis; dy <= vis; dy++) {
                for (var dx = -vis; dx <= vis; dx++) {
                  if (Math.abs(dx) + Math.abs(dy) > vis + 1) continue; // diamond shape
                  var ni = (ty + dy) * mapSize + (tx + dx);
                  if (ni >= 0 && ni < nm.tiles.length && tx + dx >= 0 && tx + dx < mapSize && ty + dy >= 0 && ty + dy < mapSize) {
                    if (!nm.tiles[ni].explored) { nm.tiles[ni].explored = true; explored2++; }
                  }
                }
              }
              upd('colonyMap', nm);
              if (explored2 > 0) {
                if (addToast) addToast(def.icon + ' Revealed ' + explored2 + ' new tiles!', 'info');
                var ns = Object.assign({}, stats); ns.tilesExplored = (ns.tilesExplored || 0) + explored2; upd('colonyStats', ns);
              }
            }
          }
          function refuelRover(roverId) {
            var rv = rovers.find(function (r) { return r.id === roverId; });
            if (!rv) return;
            var def = getRoverDef(rv.type);
            if (rv.fuel >= def.maxFuel) { if (addToast) addToast('Already full fuel!', 'info'); return; }
            var nr = Object.assign({}, resources);
            if (nr.energy < 3) { if (addToast) addToast('Need 3 energy to refuel!', 'error'); return; }
            nr.energy -= 3; upd('colonyRes', nr);
            var nrvs = rovers.map(function (r) {
              if (r.id !== roverId) return r;
              return Object.assign({}, r, { fuel: Math.min(def.maxFuel, r.fuel + 4) });
            });
            upd('colonyRovers', nrvs);
            if (addToast) addToast('Refueled! +4 fuel', 'success');
          }
          function roverBuildOutpost(roverId) {
            var rv = rovers.find(function (r) { return r.id === roverId; });
            if (!rv || rv.type !== 'heavy') return;
            var tKey = rv.x + ',' + rv.y;
            if (tileImprovements[tKey]) { if (addToast) addToast('Outpost already here!', 'info'); return; }
            var nr = Object.assign({}, resources);
            if (nr.materials < 10) { if (addToast) addToast('Need 10 materials!', 'error'); return; }
            nr.materials -= 10; upd('colonyRes', nr);
            var tile = mapData ? mapData.tiles[rv.y * mapSize + rv.x] : null;
            var newTI = Object.assign({}, tileImprovements);
            newTI[tKey] = { res: tile ? tile.res : 'materials', name: tile ? tile.name : 'Outpost', x: rv.x, y: rv.y };
            upd('tileImprovements', newTI);
            if (addToast) addToast('\uD83C\uDFD7\uFE0F Outpost established!', 'success');
            if (typeof addXP === 'function') addXP(15, 'Outpost built at (' + rv.x + ',' + rv.y + ')');
            var nl = gameLog.slice(); nl.push('\uD83C\uDFD7\uFE0F Outpost built at (' + rv.x + ',' + rv.y + ')'); upd('colonyLog', nl);
            // Explore around outpost
            if (mapData) {
              var nm = JSON.parse(JSON.stringify(mapData));
              for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) {
                var ni = (rv.y + dy) * mapSize + (rv.x + dx);
                if (ni >= 0 && ni < nm.tiles.length) nm.tiles[ni].explored = true;
              }
              upd('colonyMap', nm);
            }
          }

          // Civilization Mechanics
          var era = d.colonyEra || 'survival';
          var eraData = {
            survival: { name: 'Survival', icon: '\u26A0\uFE0F', next: 'expansion', req: 'Build 3 buildings', color: '#ef4444' },
            expansion: { name: 'Expansion', icon: '\uD83C\uDF10', next: 'prosperity', req: 'Build 6 buildings + 50% terraform', color: '#f59e0b' },
            prosperity: { name: 'Prosperity', icon: '\uD83C\uDF1F', next: 'transcendence', req: 'All 10 buildings + 75% terraform', color: '#22c55e' },
            transcendence: { name: 'Transcendence', icon: '\uD83D\uDE80', next: null, req: 'Victory!', color: '#8b5cf6' }
          };
          var currentEra = eraData[era] || eraData.survival;

          var activePolicy = d.colonyPolicy || null;
          var policyDefs = [
            { id: 'militarist', name: 'Frontier Expansion', icon: '\uD83D\uDEE1\uFE0F', desc: 'Exploration costs 0 energy. +1 materials/turn.', effect: { exploreFreeCost: true, materialBonus: 1 } },
            { id: 'scientific', name: 'Knowledge First', icon: '\uD83E\uDDEC', desc: '+50% science production. +5 XP per question.', effect: { scienceMultiplier: 1.5, xpBonus: 5 } },
            { id: 'agrarian', name: 'Colony Welfare', icon: '\uD83C\uDF3E', desc: '+2 food/turn. New settlers arrive 50% faster.', effect: { foodBonus: 2, popGrowthBonus: 0.5 } },
            { id: 'industrial', name: 'Heavy Industry', icon: '\u2699\uFE0F', desc: 'Buildings cost 20% fewer materials. +2 energy/turn.', effect: { buildDiscount: 0.2, energyBonus: 2 } }
          ];

          var researchQueue = d.colonyResearch || [];
          var researchDefs = [
            { id: 'xenobiology', name: 'Xenobiology', icon: '\uD83E\uDDA0', cost: 15, desc: 'Study alien life. +3 food & water/turn.', bonus: { food: 3, water: 3 }, era: 'expansion', domain: 'biology' },
            { id: 'gravimetrics', name: 'Gravimetrics', icon: '\uD83C\uDF0C', cost: 20, desc: 'Map gravity wells. All exploration reveals +1 tile radius.', bonus: { exploreRadius: 2 }, era: 'expansion', domain: 'physics' },
            { id: 'nanotech', name: 'Nanotechnology', icon: '\uD83E\uDDF2', cost: 25, desc: 'Self-repairing buildings. Effectiveness never drops below 75%.', bonus: { minEfficiency: 75 }, era: 'prosperity', domain: 'chemistry' },
            { id: 'terraAI', name: 'Terraform AI', icon: '\uD83E\uDD16', cost: 30, desc: 'AI-guided terraforming. +3% terraform/turn base.', bonus: { terraformBonus: 3 }, era: 'prosperity', domain: 'math' },
            { id: 'warpComms', name: 'Subspace Comms', icon: '\uD83D\uDCE1', cost: 40, desc: 'FTL communication with Earth. +10 science/turn.', bonus: { science: 10 }, era: 'transcendence', domain: 'physics' },
            { id: 'bioengine', name: 'Bioengineering', icon: '\uD83E\uDDEC', cost: 18, desc: 'Genetically adapted crops for alien soil. +5 food/turn.', bonus: { food: 5 }, era: 'expansion', domain: 'biology' },
            { id: 'quantumComp', name: 'Quantum Computing', icon: '\uD83D\uDDA5\uFE0F', cost: 35, desc: 'Quantum processors for colony AI. +5 science/turn.', bonus: { science: 5 }, era: 'prosperity', domain: 'physics' },
            { id: 'plasmaDrill', name: 'Plasma Mining', icon: '\u26CF\uFE0F', cost: 22, desc: 'Superheated plasma drills. +5 materials/turn.', bonus: { materials: 5 }, era: 'expansion', domain: 'chemistry' },
            { id: 'cryonics', name: 'Cryogenic Storage', icon: '\u2744\uFE0F', cost: 28, desc: 'Preserve food indefinitely. +3 food, +3 water/turn.', bonus: { food: 3, water: 3 }, era: 'prosperity', domain: 'biology' },
            { id: 'dysonSwarm', name: 'Dyson Swarm', icon: '\u2600\uFE0F', cost: 50, desc: 'Orbital solar collectors. +15 energy/turn.', bonus: { energy: 15 }, era: 'transcendence', domain: 'physics' }
          ];

          var greatScientists = d.colonyGreatSci || [];
          var greatSciDefs = [
            { name: 'Marie Curie', icon: '\u2622\uFE0F', specialty: 'physics', bonus: 'energy', amount: 5, fact: 'Discovered radioactivity and won 2 Nobel Prizes in different sciences.' },
            { name: 'Charles Darwin', icon: '\uD83E\uDD86', specialty: 'biology', bonus: 'science', amount: 5, fact: 'Theory of evolution by natural selection revolutionized biology.' },
            { name: 'Nikola Tesla', icon: '\u26A1', specialty: 'physics', bonus: 'energy', amount: 8, fact: 'Pioneered alternating current (AC) electricity used worldwide today.' },
            { name: 'Rosalind Franklin', icon: '\uD83E\uDDEC', specialty: 'chemistry', bonus: 'science', amount: 5, fact: 'Her X-ray crystallography was key to discovering DNA\'s structure.' },
            { name: 'Ada Lovelace', icon: '\uD83D\uDCBB', specialty: 'math', bonus: 'science', amount: 8, fact: 'Wrote the world\'s first computer program in the 1840s.' },
            { name: 'Galileo Galilei', icon: '\uD83D\uDD2D', specialty: 'physics', bonus: 'science', amount: 5, fact: 'Father of modern observational astronomy. Proved heliocentrism.' },
            { name: 'Rachel Carson', icon: '\uD83C\uDF3F', specialty: 'biology', bonus: 'water', amount: 5, fact: 'Silent Spring launched the modern environmental movement in 1962.' },
            { name: 'Albert Einstein', icon: '\uD83C\uDF0C', specialty: 'physics', bonus: 'energy', amount: 10, fact: 'E=mc\u00B2 showed mass and energy are interchangeable. Revolutionized physics forever.' },
            { name: 'Mae Jemison', icon: '\uD83D\uDE80', specialty: 'biology', bonus: 'science', amount: 8, fact: 'First African-American woman in space (1992). Also a physician and engineer.' },
            { name: 'Dmitri Mendeleev', icon: '\uD83E\uDDEA', specialty: 'chemistry', bonus: 'materials', amount: 8, fact: 'Created the Periodic Table, predicting undiscovered elements by their properties.' },
            { name: 'Wangari Maathai', icon: '\uD83C\uDF33', specialty: 'biology', bonus: 'food', amount: 6, fact: 'Kenyan environmentalist who planted 51 million trees via the Green Belt Movement. First African woman to win the Nobel Peace Prize.' },
            { name: 'Jagadish Chandra Bose', icon: '\uD83D\uDCE1', specialty: 'physics', bonus: 'science', amount: 8, fact: 'Indian polymath who proved plants have feelings, pioneered radio science, and invented the crescograph to measure plant growth.' },
            { name: 'Maryam Mirzakhani', icon: '\uD83C\uDF00', specialty: 'math', bonus: 'science', amount: 10, fact: 'First woman and first Iranian to win the Fields Medal \u2014 the Nobel Prize of mathematics \u2014 for work on curved surfaces.' },
            { name: 'Srinivasa Ramanujan', icon: '\u221E', specialty: 'math', bonus: 'science', amount: 8, fact: 'Self-taught Indian genius who discovered over 3,900 mathematical identities. His notebooks still yield new theorems today.' }
          ];

          var popGrowthAccum = d.colonyPopGrowth || 0;

          // Diplomacy — alien species
          var alienContact = d.alienContact || null;
          var alienRelations = d.alienRelations || 0; // -100 to 100
          var alienDefs = {
            name: 'The Keth\u2019ora',
            icon: '\uD83D\uDC7E',
            desc: 'Silicon-based lifeforms indigenous to Kepler-442b. Communicate through bioluminescent patterns.',
            trades: [
              { give: { materials: 10 }, get: { science: 8 }, name: 'Knowledge Exchange' },
              { give: { food: 8 }, get: { materials: 12 }, name: 'Organic Trade' },
              { give: { energy: 10 }, get: { water: 15 }, name: 'Ice Mining Rights' }
            ]
          };
          var colonyHappiness = d.colonyHappiness || 70;

          // Wonders — mega-structures
          var wonders = d.colonyWonders || {};
          var wonderDefs = [
            {
              id: 'terraformEngine', name: 'Planetary Terraform Engine', icon: '\uD83C\uDF0D', challenges: 3, domain: 'chemistry',
              desc: 'Planet-scale atmospheric converter. +5% terraform/turn permanently.', effect: { terraformBonus: 5 },
              cost: { materials: 80, energy: 50, science: 40, water: 30 }, era: 'prosperity'
            },
            {
              id: 'arkVault', name: 'Genetic Ark Vault', icon: '\uD83E\uDDEC', challenges: 3, domain: 'biology',
              desc: 'Preserves 10,000 species from Earth. +8 food, +5 science/turn.', effect: { food: 8, science: 5 },
              cost: { materials: 60, science: 50, water: 25, food: 20 }, era: 'prosperity'
            },
            {
              id: 'quantumGate', name: 'Quantum Gate', icon: '\uD83D\uDD73\uFE0F', challenges: 3, domain: 'physics',
              desc: 'Wormhole to Earth. Instant communication & settler transfer. +20 pop growth.', effect: { popBoost: true, science: 10 },
              cost: { materials: 100, energy: 80, science: 60 }, era: 'transcendence'
            }
          ];

          // Expeditions
          var expeditions = d.colonyExpeditions || [];
          var activeExpedition = d.activeExpedition || null;

          // Science Journal
          var scienceJournal = d.scienceJournal || [];

          // Tile improvements
          var tileImprovements = d.tileImprovements || {};

          // Equity & Culture Systems
          var equity = d.colonyEquity || 75; // 0-100, higher = more equitable
          var colonyValues = d.colonyValues || { collectivism: 50, innovation: 50, ecology: 50, tradition: 50, openness: 50 };
          var dilemmaLog = d.dilemmaLog || [];

          // Cultural Knowledge Traditions
          var traditions = d.colonyTraditions || [];

          // Colony Radio
          var radioMessage = d.colonyRadio || null;

          // Colony Name
          var colonyName = d.colonyName || 'New Kepler';

          // Achievements
          var achievements = d.colonyAchievements || {};
          var achievementDefs = [
            { id: 'firstBuild', name: 'Foundation Stone', icon: '\uD83C\uDFD7\uFE0F', desc: 'Build your first structure.', check: function () { return buildings.length >= 1; } },
            { id: 'fiveBuild', name: 'Growing Pains', icon: '\uD83C\uDFD8\uFE0F', desc: 'Build 5 structures.', check: function () { return buildings.length >= 5; } },
            { id: 'tenBuild', name: 'City Planner', icon: '\uD83C\uDFD9\uFE0F', desc: 'Build 10 structures.', check: function () { return buildings.length >= 10; } },
            { id: 'allBuild', name: 'Master Builder', icon: '\uD83C\uDFDF\uFE0F', desc: 'Build all 16 structures.', check: function () { return buildings.length >= 16; } },
            { id: 'pop10', name: 'Small Town', icon: '\uD83D\uDC65', desc: 'Reach 10 settlers.', check: function () { return settlers.length >= 10; } },
            { id: 'pop25', name: 'Borough', icon: '\uD83C\uDFD8\uFE0F', desc: 'Reach 25 settlers.', check: function () { return settlers.length >= 25; } },
            { id: 'pop50', name: 'Metropolis', icon: '\uD83C\uDFD9\uFE0F', desc: 'Win by population!', check: function () { return settlers.length >= 50; } },
            { id: 'tf25', name: 'Green Shoots', icon: '\uD83C\uDF31', desc: '25% terraformed.', check: function () { return terraform >= 25; } },
            { id: 'tf50', name: 'Halfway Home', icon: '\uD83C\uDF0D', desc: '50% terraformed.', check: function () { return terraform >= 50; } },
            { id: 'tf100', name: 'New Earth', icon: '\uD83C\uDF0E', desc: '100% terraformed! Victory!', check: function () { return terraform >= 100; } },
            { id: 'res3', name: 'Curious Mind', icon: '\uD83D\uDD2C', desc: 'Complete 3 research techs.', check: function () { return researchQueue.length >= 3; } },
            { id: 'res7', name: 'Renaissance', icon: '\uD83D\uDCDA', desc: 'Complete 7 research techs.', check: function () { return researchQueue.length >= 7; } },
            { id: 'res10', name: 'Omniscient', icon: '\uD83E\uDDE0', desc: 'Complete all 10! Victory!', check: function () { return researchQueue.length >= 10; } },
            { id: 'explore15', name: 'Cartographer', icon: '\uD83D\uDDFA\uFE0F', desc: 'Explore 15 tiles.', check: function () { return stats.tilesExplored >= 15; } },
            { id: 'exploreAll', name: 'World Walker', icon: '\uD83C\uDF0F', desc: 'Explore all tiles.', check: function () { return stats.tilesExplored >= mapSize * mapSize; } },
            { id: 'science100', name: 'Knowledge Hoard', icon: '\uD83D\uDCDA', desc: 'Accumulate 100+ science.', check: function () { return resources.science >= 100; } },
            { id: 'journal10', name: 'Studious', icon: '\uD83D\uDCD6', desc: '10 science journal entries.', check: function () { return scienceJournal.length >= 10; } },
            { id: 'journal25', name: 'Scholar', icon: '\uD83C\uDF93', desc: '25 science journal entries.', check: function () { return scienceJournal.length >= 25; } },
            { id: 'tradition3', name: 'Cultural Mosaic', icon: '\uD83C\uDF10', desc: 'Adopt 3 cultural traditions.', check: function () { return traditions.length >= 3; } },
            { id: 'equityHigh', name: 'Just Society', icon: '\u2696\uFE0F', desc: 'Maintain equity above 85%.', check: function () { return equity >= 85; } },
            { id: 'happyMax', name: 'Utopia', icon: '\uD83D\uDE04', desc: 'Reach 100% happiness.', check: function () { return colonyHappiness >= 100; } },
            { id: 'alienFriend', name: 'Diplomat', icon: '\uD83D\uDC7E', desc: 'Allied with the Keth\u2019ora.', check: function () { return alienRelations >= 50; } },
            { id: 'wonder1', name: 'Wonderous', icon: '\uD83C\uDFDB\uFE0F', desc: 'Complete a Wonder.', check: function () { return wonders.terraformEngine || wonders.arkVault || wonders.quantumGate; } },
            { id: 'mentor5', name: 'Awakener', icon: '\uD83E\uDD16', desc: 'Activate 5 Digital Mentors.', check: function () { return greatScientists.length >= 5; } },
            { id: 'turn50', name: 'Endurance', icon: '\u23F0', desc: 'Survive 50 turns.', check: function () { return turn >= 50; } },
            { id: 'perfect10', name: 'Perfect 10', icon: '\uD83C\uDFAF', desc: 'Answer 10 questions correctly in a row.', check: function () { return stats.streak >= 10; } }
          ];
          var traditionDefs = [
            {
              id: 'ubuntu', name: 'Ubuntu Philosophy', origin: 'Southern African', icon: '\uD83E\uDD1D', desc: '"I am because we are." Community-centered decision making. +10 equity, +5 happiness.',
              bonus: { equity: 10, happiness: 5 }, value: 'collectivism', fact: 'Ubuntu is a Nguni Bantu concept meaning shared humanity. Archbishop Desmond Tutu described it as knowing you belong in a greater whole.'
            },
            {
              id: 'kintsugi', name: 'Kintsugi Resilience', origin: 'Japanese', icon: '\uD83C\uDFFA', desc: 'Golden repair \u2014 finding strength in imperfection. Buildings regain 10% effectiveness each turn.',
              bonus: { repair: 10 }, value: 'tradition', fact: 'Kintsugi is the Japanese art of repairing broken pottery with gold. It embraces flaws as part of history rather than something to hide.'
            },
            {
              id: 'milpa', name: 'Three Sisters Agriculture', origin: 'Mesoamerican / Indigenous', icon: '\uD83C\uDF3D', desc: 'Corn, beans, squash companion planting. +6 food/turn, +2% terraform.',
              bonus: { food: 6, terraform: 2 }, value: 'ecology', fact: 'The Three Sisters (corn, beans, squash) is an Indigenous agricultural system where each plant benefits the others \u2014 corn provides structure, beans fix nitrogen, squash shades soil.'
            },
            {
              id: 'sankofa', name: 'Sankofa Wisdom', origin: 'Akan / West African', icon: '\uD83D\uDD4A\uFE0F', desc: '"Go back and get it." Learning from the past to build the future. +8 science/turn.',
              bonus: { science: 8 }, value: 'tradition', fact: 'Sankofa is an Adinkra symbol meaning "it is not taboo to go back for what you forgot." It teaches that wisdom from the past is essential for progress.'
            },
            {
              id: 'ayni', name: 'Ayni Reciprocity', origin: 'Andean / Quechua', icon: '\uD83C\uDFD4\uFE0F', desc: 'Sacred reciprocity with the land. +5 water, +5 materials, +3% terraform.',
              bonus: { water: 5, materials: 5, terraform: 3 }, value: 'ecology', fact: 'Ayni is the Andean principle of reciprocity \u2014 every exchange with nature or community must be balanced. The Inca built their entire economy on this concept.'
            },
            {
              id: 'griot', name: 'Griot Oral Tradition', origin: 'West African', icon: '\uD83C\uDFB6', desc: 'Storytelling preserves knowledge across generations. +10 science, +5 happiness.',
              bonus: { science: 10, happiness: 5 }, value: 'openness', fact: 'Griots are West African historians, storytellers, and musicians who preserve knowledge orally. Some griot lineages stretch back over 800 years.'
            },
            {
              id: 'whakapapa', name: 'Whakapapa Genealogy', origin: 'M\u0101ori / Polynesian', icon: '\uD83C\uDF0A', desc: 'Ancestral connection to land and sea. +5 water, +8 food, stronger settler bonds.',
              bonus: { water: 5, food: 8 }, value: 'collectivism', fact: 'Whakapapa is the M\u0101ori concept of genealogical connection \u2014 linking people to ancestors, the land, and even the stars. It underpins Polynesian navigation.'
            },
            {
              id: 'dreamtime', name: 'Songlines Navigation', origin: 'Aboriginal Australian', icon: '\u2B50', desc: 'Ancient wayfinding through story and song. Expeditions complete 1 turn faster.',
              bonus: { expeditionSpeed: 1 }, value: 'tradition', fact: 'Aboriginal Songlines are navigational paths across Australia encoded in songs, stories, and art. Some Songlines are over 10,000 years old \u2014 among the oldest knowledge systems on Earth.'
            }
          ];
          var buildingEff = d.buildingEff || {}; // { buildingId: 100, ... } effectiveness %
          var lastMaintTurn = d.lastMaintTurn || 0;
          var maintChallenge = d.maintChallenge || null;
          var colonyName = d.colonyName || 'New Kepler';

          // ── Planetary Seasons (4 seasons, each lasts 10 turns) ──
          var seasonDefs = [
            { id: 'bloom', name: 'Bloom Season', icon: '\uD83C\uDF3C', desc: 'Alien flora flourishes. +2 food/turn.', effect: { food: 2 } },
            { id: 'dry', name: 'Dry Season', icon: '\uD83C\uDF35', desc: 'Arid conditions. Energy production up, water down.', effect: { energy: 2, water: -1 } },
            { id: 'storm', name: 'Storm Season', icon: '\u26C8\uFE0F', desc: 'Electromagnetic storms. Science surges, buildings at risk.', effect: { science: 3, damageRisk: true } },
            { id: 'calm', name: 'Calm Season', icon: '\u2728', desc: 'Stable conditions. All production normal.', effect: {} }
          ];
          var seasonIndex2 = Math.floor((turn % 40) / 10); // 4 seasons × 10 turns each = 40-turn cycle
          var seasonCycle = { id: seasonDefs[seasonIndex2].id, index: seasonIndex2, turnsLeft: 10 - (turn % 10) };

          // TTS helper — prefers Kokoro TTS when available, falls back to browser TTS
          function colonySpeak(text2, voice) {
            if (!text2) return;
            // Try Kokoro TTS first (async, fire-and-forget for narration)
            if (window._kokoroTTS) {
              try {
                window._kokoroTTS.speak(text2, null, 0.95).then(function (url) {
                  if (url) {
                    var audio = new Audio(url);
                    audio.playbackRate = 0.95;
                    audio.volume = 0.8;
                    audio.play().catch(function (e) { console.warn('[Colony TTS] Kokoro playback failed:', e); });
                  }
                }).catch(function (e) { console.warn('[Colony TTS] Kokoro generation failed:', e); });
                return; // Kokoro will handle it
              } catch (e) { console.warn('[Colony TTS] Kokoro exception:', e); }
            }
            // Browser TTS fallback — only when Kokoro is not available
            if (!window.speechSynthesis) return;
            window.speechSynthesis.cancel();
            var utter = new SpeechSynthesisUtterance(text2);
            utter.rate = 0.95; utter.pitch = voice === 'narrator' ? 0.8 : voice === 'female' ? 1.2 : 1.0;
            utter.volume = 0.8;
            var voices = window.speechSynthesis.getVoices();
            if (voice === 'narrator') {
              var deep = voices.find(function (v) { return v.name.indexOf('Male') >= 0 || v.name.indexOf('David') >= 0 || v.name.indexOf('Daniel') >= 0; });
              if (deep) utter.voice = deep;
            } else if (voice === 'female') {
              var fem = voices.find(function (v) { return v.name.indexOf('Female') >= 0 || v.name.indexOf('Zira') >= 0 || v.name.indexOf('Samantha') >= 0; });
              if (fem) utter.voice = fem;
            }
            window.speechSynthesis.speak(utter);
          }

          var terrainTypes = [
            { type: 'plains', color: '#4ade80', name: 'Fertile Plains', icon: '\uD83C\uDF3F', res: 'food' },
            { type: 'mountain', color: '#94a3b8', name: 'Mountains', icon: '\uD83C\uDFD4\uFE0F', res: 'materials' },
            { type: 'volcanic', color: '#f97316', name: 'Volcanic', icon: '\uD83C\uDF0B', res: 'energy' },
            { type: 'ice', color: '#a5f3fc', name: 'Ice Fields', icon: '\u2744\uFE0F', res: 'water' },
            { type: 'desert', color: '#fbbf24', name: 'Desert', icon: '\uD83C\uDFDC\uFE0F', res: 'materials' },
            { type: 'ocean', color: '#3b82f6', name: 'Ocean', icon: '\uD83C\uDF0A', res: 'water' },
            { type: 'radiation', color: '#a855f7', name: 'Radiation Zone', icon: '\u2622\uFE0F', res: 'science' }
          ];

          function generateMap() {
            var tiles = [];
            var s = Math.floor(Math.random() * 99999);
            for (var y = 0; y < mapSize; y++) {
              for (var x = 0; x < mapSize; x++) {
                s = (s * 9301 + 49297) % 233280;
                var r = s / 233280;
                var tIdx = r < 0.25 ? 0 : r < 0.40 ? 1 : r < 0.50 ? 2 : r < 0.62 ? 3 : r < 0.72 ? 4 : r < 0.88 ? 5 : 6;
                var t2 = terrainTypes[tIdx];
                tiles.push({ x: x, y: y, type: t2.type, color: t2.color, name: t2.name, icon: t2.icon, res: t2.res, explored: false, hasAnomaly: r > 0.88 });
              }
            }
            var cx = Math.floor(mapSize / 2); var cy = Math.floor(mapSize / 2);
            tiles[cy * mapSize + cx] = { x: cx, y: cy, type: 'colony', color: '#f1f5f9', name: 'Colony Base', icon: '\uD83C\uDFE0', res: 'none', explored: true, hasAnomaly: false };
            for (var dy = -5; dy <= 5; dy++) for (var dx = -5; dx <= 5; dx++) {
              var ni = (cy + dy) * mapSize + (cx + dx);
              if (ni >= 0 && ni < tiles.length) tiles[ni].explored = true;
            }
            return { tiles: tiles, colonyPos: { x: cx, y: cy } };
          }

          var defaultSettlers = [
            { name: 'Dr. Elena Vasquez', role: 'Botanist', icon: '\uD83C\uDF31', specialty: 'biology', morale: 80, health: 100 },
            { name: 'Cmdr. James Chen', role: 'Engineer', icon: '\u2699\uFE0F', specialty: 'physics', morale: 85, health: 100 },
            { name: 'Dr. Aisha Okafor', role: 'Geologist', icon: '\u26CF\uFE0F', specialty: 'geology', morale: 75, health: 100 },
            { name: 'Dr. Yuki Tanaka', role: 'Medic', icon: '\uD83E\uDE7A', specialty: 'biology', morale: 90, health: 100 },
            { name: 'Prof. Raj Patel', role: 'Physicist', icon: '\u269B\uFE0F', specialty: 'physics', morale: 70, health: 100 },
            { name: 'Dr. Marta Schmidt', role: 'Chemist', icon: '\uD83E\uDDEA', specialty: 'chemistry', morale: 82, health: 100 }
          ];

          var buildingDefs = [
            // Tier 1 — No prerequisites
            { id: 'hydroponics', name: 'Hydroponics Bay', icon: '\uD83C\uDF31', tier: 1, requires: [], cost: { materials: 15, energy: 5 }, production: { food: 3 }, gate: 'biology', gateQ: 'What process do plants use to convert light energy into chemical energy?', gateA: 'photosynthesis', desc: 'Grows food using nutrient-rich water. Photosynthesis converts CO\u2082 and water into glucose using light.' },
            { id: 'solar', name: 'Solar Array', icon: '\u2600\uFE0F', tier: 1, requires: [], cost: { materials: 10, science: 5 }, production: { energy: 3 }, gate: 'physics', gateQ: 'What particles of light does a solar panel absorb to generate electricity?', gateA: 'photon', desc: 'Converts stellar radiation into power via the photoelectric effect.' },
            { id: 'waterReclaim', name: 'Water Reclaimer', icon: '\uD83D\uDCA7', tier: 1, requires: [], cost: { materials: 12, energy: 5 }, production: { water: 3 }, gate: 'chemistry', gateQ: 'What is the chemical formula for water?', gateA: 'h2o', desc: 'Extracts water from ice and atmosphere via distillation and filtration.' },
            { id: 'mine', name: 'Mining Rig', icon: '\u26CF\uFE0F', tier: 1, requires: [], cost: { energy: 10, water: 5 }, production: { materials: 3 }, gate: 'geology', gateQ: 'Name one of the three main types of rocks (igneous, sedimentary, or metamorphic)', gateA: ['igneous', 'sedimentary', 'metamorphic'], desc: 'Drills into planetary crust to extract minerals and metals.' },
            // Tier 2 — Requires 2 Tier 1 buildings
            { id: 'lab', name: 'Research Lab', icon: '\uD83D\uDD2C', tier: 2, requires: ['solar', 'mine'], cost: { materials: 20, energy: 10 }, production: { science: 3 }, gate: 'math', gateQ: 'What is the value of pi to 2 decimal places?', gateA: '3.14', desc: 'Conducts experiments and data analysis. Requires stable power and materials.' },
            { id: 'medbay', name: 'Med Bay', icon: '\uD83C\uDFE5', tier: 2, requires: ['hydroponics', 'waterReclaim'], cost: { materials: 15, science: 10 }, production: {}, gate: 'biology', gateQ: 'What are the basic structural units of all living organisms?', gateA: 'cell', desc: 'Heals settlers (+10 health/turn). Needs food & water infrastructure first.' },
            // Tier 3 — Requires Tier 2 buildings
            { id: 'atmo', name: 'Atmospheric Processor', icon: '\uD83C\uDF2C\uFE0F', tier: 3, requires: ['lab', 'waterReclaim'], cost: { materials: 25, energy: 15, science: 10 }, production: { water: 1, food: 1 }, gate: 'chemistry', gateQ: 'What gas makes up about 78% of Earth\'s atmosphere?', gateA: 'nitrogen', desc: 'Converts alien atmosphere. +5% terraforming per turn.' },
            { id: 'fusion', name: 'Fusion Reactor', icon: '\u2622\uFE0F', tier: 3, requires: ['lab', 'solar'], cost: { materials: 30, science: 20 }, production: { energy: 10 }, gate: 'physics', gateQ: 'In E=mc\u00B2, what does the \'m\' stand for?', gateA: 'mass', desc: 'Fuses hydrogen isotopes for massive energy. The ultimate power source.' },
            // Tier 4 — Victory building
            { id: 'biodome', name: 'Biodome', icon: '\uD83C\uDF0D', tier: 4, requires: ['atmo', 'fusion', 'medbay'], cost: { materials: 50, energy: 30, science: 25, water: 20 }, production: { food: 5, water: 2 }, gate: 'ecology', gateQ: 'What is the term for a self-sustaining ecological system that recycles nutrients and energy?', gateA: ['ecosystem', 'biosphere', 'closed ecosystem'], desc: 'Self-sustaining biosphere. Build this to achieve COLONY VICTORY!' },
            { id: 'comms', name: 'Deep Space Comms', icon: '\uD83D\uDCE1', tier: 4, requires: ['fusion', 'lab'], cost: { materials: 40, energy: 25, science: 30 }, production: { science: 5 }, gate: 'physics', gateQ: 'What is the speed of light in km/s (approximately)?', gateA: ['300000', '3e5', '300,000'], desc: 'Contacts Earth! Signal takes 1,206 years to arrive. Massive science boost.' },
            // Tier 2 Additions
            { id: 'greenhouse', name: 'Greenhouse Dome', icon: '\uD83C\uDFE1', tier: 2, requires: ['hydroponics', 'waterReclaim'], cost: { materials: 18, water: 10 }, production: { food: 4 }, gate: 'biology', gateQ: 'What is the greenhouse effect?', gateA: ['trap', 'heat', 'warm'], desc: 'Large-scale food production. +0.5% terraform/turn.' },
            { id: 'refinery', name: 'Material Refinery', icon: '\uD83C\uDFED', tier: 2, requires: ['mine', 'solar'], cost: { energy: 15, materials: 10 }, production: { materials: 5 }, gate: 'chemistry', gateQ: 'What is smelting?', gateA: ['melt', 'extract', 'ore'], desc: 'Refines raw ore into construction-grade materials.' },
            // Tier 3 Additions
            { id: 'cloning', name: 'Cloning Lab', icon: '\uD83E\uDDEC', tier: 3, requires: ['medbay', 'lab'], cost: { materials: 30, science: 20, energy: 15 }, production: { food: 2 }, gate: 'biology', gateQ: 'What is the name of the first cloned mammal?', gateA: ['dolly'], desc: 'Accelerates population growth. Clones food organisms.' },
            { id: 'shield', name: 'Planetary Shield', icon: '\uD83D\uDEE1\uFE0F', tier: 3, requires: ['fusion', 'atmo'], cost: { materials: 35, energy: 25, science: 15 }, production: { energy: 2 }, gate: 'physics', gateQ: 'What protects Earth from solar radiation?', gateA: ['magnetic', 'magnetosphere', 'field'], desc: 'Deflects solar flares & meteors. Reduces weather damage.' },
            { id: 'oceanSeeder', name: 'Ocean Seeder', icon: '\uD83C\uDF0A', tier: 3, requires: ['waterReclaim', 'atmo'], cost: { materials: 25, water: 15, science: 10 }, production: { water: 4, food: 2 }, gate: 'biology', gateQ: 'What process do phytoplankton use to produce oxygen?', gateA: ['photosynthesis'], desc: 'Seeds alien oceans with microbes. +1.5% terraform/turn.' },
            // Tier 4 Addition
            { id: 'spaceport', name: 'Spaceport', icon: '\uD83D\uDE80', tier: 4, requires: ['comms', 'fusion', 'shield'], cost: { materials: 60, energy: 40, science: 35 }, production: { materials: 5, science: 3 }, gate: 'physics', gateQ: 'What is escape velocity from Earth in km/s (approximately)?', gateA: ['11', '11.2'], desc: 'Launches supply missions. Attracts settlers from other colonies.' }
          ];

          // Canvas Map Rendering (non-hook: using global ref to avoid conditional hook)
          if (!window._spaceColonyCanvasRef) window._spaceColonyCanvasRef = { current: null };
          var canvasRef = window._spaceColonyCanvasRef;
          setTimeout(function () {
            if (!canvasRef.current || !mapData) return;
            var canvas = canvasRef.current;
            var ctx = canvas.getContext('2d');
            var w = canvas.width = canvas.offsetWidth;
            var h = canvas.height = Math.min(560, canvas.offsetWidth * 0.85);
            var animPhase = (Date.now() / 1000) % (Math.PI * 2);

            // Season-tinted background
            var seasonBGs = { bloom: '#0a1a0f', dry: '#1a0f0a', storm: '#0a0f1a', calm: '#0f172a' };
            var bgCol = seasonBGs[(seasonCycle || {}).id] || '#0f172a';
            ctx.fillStyle = bgCol; ctx.fillRect(0, 0, w, h);

            // Enhanced starfield with twinkling
            for (var si = 0; si < 120; si++) {
              var sx = (si * 7919 + 12345) % w; var sy = (si * 6271 + 54321) % h;
              var twinkle = 0.15 + Math.sin(animPhase + si * 0.5) * 0.15 + ((si * 31) % 8) * 0.06;
              var starSize = si < 10 ? 2.5 : si < 30 ? 2 : 1.5;
              ctx.fillStyle = si < 5 ? 'rgba(200,220,255,' + twinkle + ')' : 'rgba(255,255,255,' + twinkle + ')';
              ctx.beginPath(); ctx.arc(sx, sy, starSize / 2, 0, Math.PI * 2); ctx.fill();
            }

            // Nebula glow (season-colored)
            var nebulaColors = { bloom: 'rgba(34,197,94,0.03)', dry: 'rgba(234,179,8,0.03)', storm: 'rgba(59,130,246,0.04)', calm: 'rgba(139,92,246,0.03)' };
            var nebCol = nebulaColors[(seasonCycle || {}).id] || 'rgba(139,92,246,0.03)';
            var nebGrad = ctx.createRadialGradient(w * 0.3, h * 0.4, 0, w * 0.3, h * 0.4, w * 0.5);
            nebGrad.addColorStop(0, nebCol); nebGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = nebGrad; ctx.fillRect(0, 0, w, h);

            // Aurora Borealis effect
            if (terraform > 20) {
              var auroraIntensity = Math.min(1, terraform / 80);
              for (var ai = 0; ai < 5; ai++) {
                var ax = w * (ai + 0.5) / 5 + Math.sin(animPhase * 0.7 + ai * 2) * 30;
                var ay = 15 + Math.sin(animPhase * 0.5 + ai) * 8;
                var aGrad = ctx.createRadialGradient(ax, ay, 0, ax, ay, 60 + Math.sin(animPhase + ai) * 20);
                aGrad.addColorStop(0, 'rgba(34,211,238,' + (0.08 * auroraIntensity) + ')');
                aGrad.addColorStop(0.5, 'rgba(74,222,128,' + (0.04 * auroraIntensity) + ')');
                aGrad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = aGrad; ctx.fillRect(ax - 80, 0, 160, 50);
              }
            }

            var baseTile = 24;
            var tileSize = Math.max(4, Math.round(baseTile * colonyZoom));
            var visibleW = Math.ceil(w / tileSize) + 1;
            var visibleH = Math.ceil((h - 60) / tileSize) + 1;
            // Clamp camera so we don't scroll past map edges
            var maxCamX = Math.max(0, mapSize - visibleW + 1);
            var maxCamY = Math.max(0, mapSize - visibleH + 1);
            if (camX > maxCamX) { camX = maxCamX; upd('colonyCamX', camX); }
            if (camY > maxCamY) { camY = maxCamY; upd('colonyCamY', camY); }
            if (camX < 0) { camX = 0; upd('colonyCamX', 0); }
            if (camY < 0) { camY = 0; upd('colonyCamY', 0); }
            var offsetX = 0;
            var offsetY = 30;
            // Edge-scroll tick
            if (edgeScroll.active && (edgeScroll.dx !== 0 || edgeScroll.dy !== 0)) {
              var newCX = Math.max(0, Math.min(maxCamX, camX + edgeScroll.dx));
              var newCY = Math.max(0, Math.min(maxCamY, camY + edgeScroll.dy));
              if (newCX !== camX || newCY !== camY) {
                upd('colonyCamX', newCX); upd('colonyCamY', newCY);
              }
            }

            // Title bar with season + era badges
            var seasonIcons = { bloom: '\uD83C\uDF3C', dry: '\uD83C\uDF35', storm: '\u26C8\uFE0F', calm: '\u2728' };
            ctx.font = 'bold 14px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';
            ctx.fillText('\uD83D\uDE80 ' + colonyName.toUpperCase(), offsetX, 20);
            ctx.font = '10px Inter, system-ui'; ctx.fillStyle = '#94a3b8';
            ctx.fillText((seasonIcons[(seasonCycle || {}).id] || '\u2728') + ' ' + ((seasonDefs[(seasonCycle || {}).index] || {}).name || 'Calm'), w / 2 - 30, 20);
            ctx.fillStyle = '#64748b';
            ctx.fillText('T' + turn + ' | \uD83D\uDC65' + settlers.length + ' | \uD83C\uDFD7\uFE0F' + buildings.length, w - 135, 20);

            // Tiles (only render visible ones for performance)
            var tiles = mapData.tiles;
            for (var ti = 0; ti < tiles.length; ti++) {
              var tile = tiles[ti];
              // Culling: skip tiles outside viewport
              if (tile.x < camX - 1 || tile.x > camX + visibleW || tile.y < camY - 1 || tile.y > camY + visibleH) continue;
              var tx = offsetX + (tile.x - camX) * tileSize;
              var ty = offsetY + (tile.y - camY) * tileSize;
              if (!tile.explored) {
                // Fog of war with gradient edge detection
                var nearExplored = false;
                for (var dx2 = -1; dx2 <= 1; dx2++) {
                  for (var dy2 = -1; dy2 <= 1; dy2++) {
                    if (dx2 === 0 && dy2 === 0) continue;
                    var ni2 = (tile.y + dy2) * mapSize + (tile.x + dx2);
                    if (ni2 >= 0 && ni2 < tiles.length && tiles[ni2].explored) nearExplored = true;
                  }
                }
                if (nearExplored) {
                  // Glowing fog edge with shimmer
                  var fogGrad = ctx.createRadialGradient(tx + tileSize / 2, ty + tileSize / 2, 0, tx + tileSize / 2, ty + tileSize / 2, tileSize);
                  fogGrad.addColorStop(0, 'rgba(51,65,85,0.6)'); fogGrad.addColorStop(1, 'rgba(30,41,59,0.95)');
                  ctx.fillStyle = fogGrad; ctx.fillRect(tx, ty, tileSize - 1, tileSize - 1);
                  // Shimmer effect on fog edge tiles
                  var shimmer = 0.06 + 0.04 * Math.sin(animPhase * 1.5 + tile.x * 0.8 + tile.y * 0.6);
                  var shimGrad = ctx.createRadialGradient(tx + tileSize * 0.5, ty + tileSize * 0.5, 0, tx + tileSize * 0.5, ty + tileSize * 0.5, tileSize * 0.7);
                  shimGrad.addColorStop(0, 'rgba(148,163,184,' + shimmer + ')');
                  shimGrad.addColorStop(0.6, 'rgba(100,116,139,' + (shimmer * 0.5) + ')');
                  shimGrad.addColorStop(1, 'rgba(0,0,0,0)');
                  ctx.fillStyle = shimGrad; ctx.fillRect(tx, ty, tileSize - 1, tileSize - 1);
                  // Animated sparkle on some edge tiles
                  if ((tile.x + tile.y) % 3 === 0) {
                    var sparkleAlpha = 0.3 + 0.3 * Math.sin(animPhase * 3 + tile.x * 1.5);
                    ctx.fillStyle = 'rgba(203,213,225,' + sparkleAlpha + ')';
                    ctx.beginPath(); ctx.arc(tx + tileSize * 0.5 + Math.sin(animPhase + tile.y) * 3, ty + tileSize * 0.4, 1.5, 0, Math.PI * 2); ctx.fill();
                  }
                  ctx.fillStyle = 'rgba(100,116,139,0.4)'; ctx.font = (tileSize * 0.35) + 'px sans-serif';
                  ctx.fillText('?', tx + tileSize * 0.35, ty + tileSize * 0.65);
                } else {
                  ctx.fillStyle = '#1e293b'; ctx.fillRect(tx, ty, tileSize - 1, tileSize - 1);
                  // Subtle deep fog texture for non-edge unexplored tiles
                  if ((tile.x * 7 + tile.y * 13) % 5 === 0) {
                    var deepFogAlpha = 0.02 + 0.01 * Math.sin(animPhase * 0.5 + tile.x + tile.y);
                    ctx.fillStyle = 'rgba(71,85,105,' + deepFogAlpha + ')';
                    ctx.fillRect(tx + 2, ty + 2, tileSize - 5, tileSize - 5);
                  }
                }
              } else {
                // Gradient terrain fill
                var tGrad = ctx.createLinearGradient(tx, ty, tx + tileSize, ty + tileSize);
                tGrad.addColorStop(0, tile.color);
                tGrad.addColorStop(1, tile.type === 'ocean' ? '#1e40af' : tile.type === 'mountain' ? '#44403c' : tile.type === 'forest' ? '#14532d' : tile.type === 'volcanic' ? '#7f1d1d' : tile.type === 'ice' ? '#e0f2fe' : tile.type === 'radiation' ? '#3b0764' : tile.type === 'colony' ? '#1e3a5f' : tile.color);
                ctx.globalAlpha = 0.9; ctx.fillStyle = tGrad;
                ctx.fillRect(tx, ty, tileSize - 1, tileSize - 1); ctx.globalAlpha = 1;

                // Terrain detail drawing
                if (tile.type === 'ocean') {
                  var waveOff = Math.sin(animPhase + tile.x * 0.5) * 2;
                  ctx.strokeStyle = 'rgba(147,197,253,0.35)'; ctx.lineWidth = 0.7;
                  for (var wi = 0; wi < 3; wi++) {
                    ctx.beginPath(); ctx.moveTo(tx + 2, ty + tileSize * (0.3 + wi * 0.22) + waveOff);
                    ctx.quadraticCurveTo(tx + tileSize / 2, ty + tileSize * (0.2 + wi * 0.22) - waveOff, tx + tileSize - 3, ty + tileSize * (0.35 + wi * 0.22) + waveOff);
                    ctx.stroke();
                  }
                } else if (tile.type === 'mountain') {
                  // Mountain range with snow caps
                  ctx.fillStyle = 'rgba(120,113,108,0.5)'; ctx.beginPath();
                  ctx.moveTo(tx + tileSize * 0.15, ty + tileSize * 0.82);
                  ctx.lineTo(tx + tileSize * 0.35, ty + tileSize * 0.25);
                  ctx.lineTo(tx + tileSize * 0.55, ty + tileSize * 0.6);
                  ctx.lineTo(tx + tileSize * 0.7, ty + tileSize * 0.18);
                  ctx.lineTo(tx + tileSize * 0.88, ty + tileSize * 0.82);
                  ctx.closePath(); ctx.fill();
                  // Snow cap
                  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath();
                  ctx.moveTo(tx + tileSize * 0.3, ty + tileSize * 0.33);
                  ctx.lineTo(tx + tileSize * 0.35, ty + tileSize * 0.25);
                  ctx.lineTo(tx + tileSize * 0.4, ty + tileSize * 0.33); ctx.fill();
                  ctx.beginPath();
                  ctx.moveTo(tx + tileSize * 0.65, ty + tileSize * 0.26);
                  ctx.lineTo(tx + tileSize * 0.7, ty + tileSize * 0.18);
                  ctx.lineTo(tx + tileSize * 0.75, ty + tileSize * 0.26); ctx.fill();
                } else if (tile.type === 'volcanic') {
                  // Lava glow with pulsing
                  var lavaGlow = 0.3 + Math.sin(animPhase * 2 + tile.x) * 0.15;
                  ctx.fillStyle = 'rgba(239,68,68,' + lavaGlow + ')'; ctx.beginPath();
                  ctx.arc(tx + tileSize / 2, ty + tileSize / 2, tileSize * 0.22, 0, Math.PI * 2); ctx.fill();
                  ctx.fillStyle = 'rgba(251,191,36,' + (lavaGlow * 0.5) + ')'; ctx.beginPath();
                  ctx.arc(tx + tileSize / 2, ty + tileSize / 2, tileSize * 0.12, 0, Math.PI * 2); ctx.fill();
                } else if (tile.type === 'colony') {
                  // Enhanced colony with building count + glow
                  var colGlow = 0.15 + Math.sin(animPhase) * 0.05;
                  ctx.fillStyle = 'rgba(59,130,246,' + colGlow + ')';
                  ctx.fillRect(tx, ty, tileSize - 1, tileSize - 1);
                  ctx.fillStyle = '#e0f2fe'; ctx.fillRect(tx + 3, ty + 3, tileSize - 7, tileSize - 7);
                  // Dome
                  ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.beginPath();
                  ctx.arc(tx + tileSize / 2, ty + tileSize * 0.5, tileSize * 0.22, Math.PI, 0); ctx.stroke();
                  ctx.moveTo(tx + tileSize * 0.28, ty + tileSize * 0.5);
                  ctx.lineTo(tx + tileSize * 0.72, ty + tileSize * 0.5); ctx.stroke();
                  // Building count badge
                  ctx.fillStyle = '#1e40af'; ctx.beginPath();
                  ctx.arc(tx + tileSize * 0.82, ty + tileSize * 0.2, tileSize * 0.13, 0, Math.PI * 2); ctx.fill();
                  ctx.fillStyle = '#fff'; ctx.font = 'bold ' + (tileSize * 0.15) + 'px sans-serif';
                  ctx.fillText(String(buildings.length), tx + tileSize * 0.75, ty + tileSize * 0.25);
                  // Pop count
                  ctx.fillStyle = '#166534'; ctx.beginPath();
                  ctx.arc(tx + tileSize * 0.18, ty + tileSize * 0.2, tileSize * 0.13, 0, Math.PI * 2); ctx.fill();
                  ctx.fillStyle = '#fff'; ctx.font = (tileSize * 0.13) + 'px sans-serif';
                  ctx.fillText(String(settlers.length), tx + tileSize * 0.1, ty + tileSize * 0.25);
                } else if (tile.type === 'radiation') {
                  // Pulsing radiation rings
                  var radGlow = 0.3 + Math.sin(animPhase * 1.5 + tile.y) * 0.2;
                  ctx.strokeStyle = 'rgba(168,85,247,' + radGlow + ')'; ctx.lineWidth = 0.8;
                  for (var ri = 0; ri < 3; ri++) { ctx.beginPath(); ctx.arc(tx + tileSize / 2, ty + tileSize / 2, tileSize * (0.08 + ri * 0.1), 0, Math.PI * 2); ctx.stroke(); }
                } else if (tile.type === 'ice') {
                  // Ice crystal sparkles
                  ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + Math.sin(animPhase + ti) * 0.15) + ')';
                  var icePositions = [[0.25, 0.25], [0.55, 0.35], [0.35, 0.65], [0.7, 0.6], [0.5, 0.2]];
                  icePositions.forEach(function (ip) { ctx.fillRect(tx + tileSize * ip[0], ty + tileSize * ip[1], 2.5, 2.5); });
                } else if (tile.type === 'forest') {
                  // Tree canopy dots
                  ctx.fillStyle = 'rgba(34,197,94,0.5)';
                  var treePos = [[0.3, 0.3], [0.6, 0.25], [0.45, 0.55], [0.2, 0.65], [0.7, 0.6]];
                  treePos.forEach(function (tp2) { ctx.beginPath(); ctx.arc(tx + tileSize * tp2[0], ty + tileSize * tp2[1], tileSize * 0.08, 0, Math.PI * 2); ctx.fill(); });
                }

                // Pulsing anomaly glow
                if (tile.hasAnomaly) {
                  var anomGlow = 0.5 + Math.sin(animPhase * 3) * 0.3;
                  ctx.fillStyle = 'rgba(250,204,21,' + (anomGlow * 0.2) + ')';
                  ctx.beginPath(); ctx.arc(tx + tileSize * 0.78, ty + tileSize * 0.22, tileSize * 0.18, 0, Math.PI * 2); ctx.fill();
                  ctx.fillStyle = 'rgba(250,204,21,' + anomGlow + ')'; ctx.font = 'bold ' + (tileSize * 0.28) + 'px sans-serif';
                  ctx.fillText('!', tx + tileSize * 0.72, ty + tileSize * 0.32);
                }

                // Enhanced outpost with flag
                var tiKey = tile.x + ',' + tile.y;
                if (tileImprovements[tiKey]) {
                  ctx.fillStyle = '#f97316'; ctx.beginPath();
                  ctx.arc(tx + tileSize * 0.85, ty + tileSize * 0.82, tileSize * 0.1, 0, Math.PI * 2); ctx.fill();
                  ctx.strokeStyle = '#fdba74'; ctx.lineWidth = 1; ctx.stroke();
                  // Flag pole
                  ctx.strokeStyle = '#fdba74'; ctx.lineWidth = 1; ctx.beginPath();
                  ctx.moveTo(tx + tileSize * 0.85, ty + tileSize * 0.72); ctx.lineTo(tx + tileSize * 0.85, ty + tileSize * 0.82); ctx.stroke();
                  ctx.fillStyle = '#fb923c'; ctx.fillRect(tx + tileSize * 0.85, ty + tileSize * 0.72, tileSize * 0.08, tileSize * 0.05);
                  // Trade route lines to adjacent outposts
                  [[1, 0], [0, 1]].forEach(function (dd2) {
                    var adjK2 = (tile.x + dd2[0]) + ',' + (tile.y + dd2[1]);
                    if (tileImprovements[adjK2]) {
                      ctx.strokeStyle = 'rgba(251,191,36,0.4)'; ctx.lineWidth = 1.5;
                      ctx.setLineDash([3, 3]); ctx.beginPath();
                      ctx.moveTo(tx + tileSize / 2, ty + tileSize / 2);
                      ctx.lineTo(tx + tileSize / 2 + dd2[0] * tileSize, ty + tileSize / 2 + dd2[1] * tileSize);
                      ctx.stroke(); ctx.setLineDash([]);
                    }
                  });
                }

                // Terrain emoji
                ctx.font = (tileSize * 0.3) + 'px sans-serif'; ctx.fillText(tile.icon, tx + 2, ty + tileSize - 3);
                // Rover on this tile
                rovers.forEach(function (rv) {
                  if (rv.x === tile.x && rv.y === tile.y) {
                    var rvDef = getRoverDef(rv.type);
                    var isSelected = selectedRover === rv.id;
                    // Rover body glow
                    if (isSelected) {
                      var selGlow = 0.4 + Math.sin(animPhase * 3) * 0.2;
                      ctx.fillStyle = 'rgba(250,204,21,' + selGlow + ')';
                      ctx.beginPath(); ctx.arc(tx + tileSize / 2, ty + tileSize / 2, tileSize * 0.4, 0, Math.PI * 2); ctx.fill();
                    }
                    // Rover icon
                    ctx.fillStyle = rvDef.color; ctx.beginPath();
                    ctx.arc(tx + tileSize / 2, ty + tileSize / 2, tileSize * 0.22, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = isSelected ? '#fef08a' : 'rgba(255,255,255,0.5)'; ctx.lineWidth = isSelected ? 2 : 1; ctx.stroke();
                    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + (tileSize * 0.22) + 'px sans-serif';
                    ctx.fillText(rvDef.icon, tx + tileSize * 0.32, ty + tileSize * 0.58);
                    // Fuel bar
                    var fuelPct = rv.fuel / rvDef.maxFuel;
                    ctx.fillStyle = fuelPct > 0.5 ? '#22c55e' : fuelPct > 0.2 ? '#eab308' : '#ef4444';
                    ctx.fillRect(tx + 2, ty + tileSize - 5, (tileSize - 4) * fuelPct, 2);
                  }
                });
              }

              // Selection highlight with animated corners
              if (selectedTile && selectedTile.x === tile.x && selectedTile.y === tile.y) {
                ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2.5;
                ctx.strokeRect(tx + 1, ty + 1, tileSize - 3, tileSize - 3);
                // Corner accents
                ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 2;
                var cs = tileSize * 0.2;
                ctx.beginPath(); ctx.moveTo(tx, ty + cs); ctx.lineTo(tx, ty); ctx.lineTo(tx + cs, ty); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(tx + tileSize - cs - 1, ty); ctx.lineTo(tx + tileSize - 1, ty); ctx.lineTo(tx + tileSize - 1, ty + cs); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(tx, ty + tileSize - cs - 1); ctx.lineTo(tx, ty + tileSize - 1); ctx.lineTo(tx + cs, ty + tileSize - 1); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(tx + tileSize - cs - 1, ty + tileSize - 1); ctx.lineTo(tx + tileSize - 1, ty + tileSize - 1); ctx.lineTo(tx + tileSize - 1, ty + tileSize - cs - 1); ctx.stroke();
              }
              // Grid lines
              ctx.strokeStyle = 'rgba(100,116,139,0.15)'; ctx.lineWidth = 0.5; ctx.strokeRect(tx, ty, tileSize - 1, tileSize - 1);
            }

                      // Colony atmospheric glow
                      var cgx = (mapData.colonyPos.x - camX) * tileSize + tileSize/2;
                      var cgy = (mapData.colonyPos.y - camY) * tileSize + tileSize/2;
                      if (cgx > -tileSize*3 && cgx < w+tileSize*3 && cgy > -tileSize*3 && cgy < h+tileSize*3) {
                        var colGlow = ctx.createRadialGradient(cgx, cgy, tileSize*0.5, cgx, cgy, tileSize*3);
                        colGlow.addColorStop(0, 'rgba(99,102,241,' + (0.15 + 0.05 * Math.sin(animPhase * 2)) + ')');
                        colGlow.addColorStop(0.5, 'rgba(99,102,241,0.05)');
                        colGlow.addColorStop(1, 'rgba(0,0,0,0)');
                        ctx.fillStyle = colGlow;
                        ctx.fillRect(cgx - tileSize*3, cgy - tileSize*3, tileSize*6, tileSize*6);
                      }

            // Selected rover move range overlay
            if (selectedRover) {
              var selRv = rovers.find(function (r2) { return r2.id === selectedRover; });
              if (selRv && selRv.movesLeft > 0 && selRv.fuel > 0) {
                var maxMove = Math.min(selRv.movesLeft, selRv.fuel);
                for (var mti = 0; mti < tiles.length; mti++) {
                  var mt = tiles[mti];
                  var mdist = Math.abs(mt.x - selRv.x) + Math.abs(mt.y - selRv.y);
                  if (mdist > 0 && mdist <= maxMove) {
                    var mtx = offsetX + (mt.x - camX) * tileSize;
                    var mty = offsetY + (mt.y - camY) * tileSize;
                    ctx.fillStyle = 'rgba(250,204,21,' + (0.08 + Math.sin(animPhase * 2) * 0.04) + ')';
                    ctx.fillRect(mtx, mty, tileSize - 1, tileSize - 1);
                    ctx.strokeStyle = 'rgba(250,204,21,0.3)'; ctx.lineWidth = 1;
                    ctx.strokeRect(mtx + 1, mty + 1, tileSize - 3, tileSize - 3);
                  }
                }
              }
            }
            // Weather particles
            var wx2 = d.colonyWeather;
            if (wx2) {
              var mapArea = { x: offsetX, y: offsetY, w: mapSize * tileSize, h: mapSize * tileSize };
              for (var pi = 0; pi < 30; pi++) {
                var px = mapArea.x + ((pi * 3571 + turn * 137 + Math.floor(animPhase * 10)) % mapArea.w);
                var py = mapArea.y + ((pi * 2971 + turn * 97) % mapArea.h);
                if (wx2.name === 'Dust Storm') {
                  ctx.fillStyle = 'rgba(194,165,128,' + (0.2 + Math.sin(animPhase + pi) * 0.1) + ')';
                  ctx.fillRect(px, py, 3 + Math.random() * 3, 1);
                } else if (wx2.name === 'Solar Flare') {
                  ctx.fillStyle = 'rgba(250,204,21,' + (0.15 + Math.sin(animPhase * 2 + pi) * 0.1) + ')';
                  ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill();
                } else {
                  ctx.fillStyle = 'rgba(147,197,253,' + (0.2 + Math.sin(animPhase + pi) * 0.1) + ')';
                  ctx.fillRect(px, py, 1, 4);
                }
              }
            }

            // Expedition progress on map (if active)
            if (activeExpedition) {
              ctx.fillStyle = 'rgba(6,182,212,0.15)';
              ctx.fillRect(offsetX, offsetY + mapSize * tileSize - 8, mapSize * tileSize * ((activeExpedition.totalTurns - activeExpedition.turnsLeft) / activeExpedition.totalTurns), 6);
              ctx.fillStyle = '#06b6d4'; ctx.font = '8px Inter, system-ui';
              ctx.fillText('\u26F5 ' + activeExpedition.type + ' (' + activeExpedition.turnsLeft + 't)', offsetX + 2, offsetY + mapSize * tileSize - 1);
            }

            // Enhanced resource bar
            var rbY = offsetY + mapSize * tileSize + 12;
            // Background
            ctx.fillStyle = 'rgba(15,23,42,0.8)';
            ctx.fillRect(offsetX - 5, rbY - 5, mapSize * tileSize + 10, 22);
            ctx.strokeStyle = 'rgba(100,116,139,0.3)'; ctx.lineWidth = 0.5;
            ctx.strokeRect(offsetX - 5, rbY - 5, mapSize * tileSize + 10, 22);

            var resData = [
              ['\uD83C\uDF3E', resources.food, '#4ade80', '#166534'],
              ['\u26A1', resources.energy, '#facc15', '#713f12'],
              ['\uD83D\uDCA7', resources.water, '#38bdf8', '#0c4a6e'],
              ['\uD83E\uDEA8', resources.materials, '#94a3b8', '#334155'],
              ['\uD83D\uDD2C', resources.science, '#a78bfa', '#4c1d95']
            ];
            var resW = Math.floor(w / 5);
            ctx.font = 'bold 10px Inter, system-ui';
            resData.forEach(function (rd, rdi) {
              var rxPos = 4 + rdi * resW;
              // Tiny colored bg
              ctx.fillStyle = rd[3]; ctx.fillRect(rxPos, rbY - 2, resW - 4, 16);
              ctx.fillStyle = rd[2]; ctx.fillText(rd[0] + ' ' + rd[1], rxPos + 3, rbY + 9);
            });

            // Terraform + Equity mini bar
            ctx.fillStyle = '#166534'; ctx.fillRect(4, rbY + 18, Math.floor((w - 8) * terraform / 100), 3);
            ctx.strokeStyle = '#14532d'; ctx.lineWidth = 0.5; ctx.strokeRect(4, rbY + 18, w - 8, 3);
            ctx.fillStyle = '#64748b'; ctx.font = '7px Inter, system-ui';
            ctx.fillText('\uD83C\uDF0D ' + terraform + '%', 4, rbY + 28);
            ctx.fillText('\u2696\uFE0F ' + equity + '%', 54, rbY + 28);
            ctx.fillText('\uD83D\uDE42 ' + colonyHappiness + '%', 104, rbY + 28);
          }, 0);

          function handleMapClick(e) {
            // Don't select tile if user was dragging
            if (dragState.didDrag) { dragState.didDrag = false; return; }
            if (!mapData || !canvasRef.current) return;
            var rect = canvasRef.current.getBoundingClientRect();
            var w2 = canvasRef.current.width;
            var ts2 = Math.max(4, Math.round(24 * colonyZoom));
            var tileX = Math.floor((e.clientX - rect.left) / ts2) + camX;
            var tileY = Math.floor((e.clientY - rect.top - 30) / ts2) + camY;
            if (tileX >= 0 && tileX < mapSize && tileY >= 0 && tileY < mapSize) {
              var tile = mapData.tiles[tileY * mapSize + tileX];
              upd('colonySelTile', { x: tileX, y: tileY, tile: tile });
              // Auto-center on selected tile if it's near the edge of the viewport
              var vW2 = Math.ceil(w2 / ts2);
              var h2 = canvasRef.current.height;
              var vH2 = Math.ceil((h2 - 60) / ts2);
              if (tileX < camX + 2 || tileX > camX + vW2 - 3) upd('colonyCamX', Math.max(0, tileX - Math.floor(vW2 / 2)));
              if (tileY < camY + 2 || tileY > camY + vH2 - 3) upd('colonyCamY', Math.max(0, tileY - Math.floor(vH2 / 2)));
            }
          }
          // ── Drag Pan Handlers ──
          function handleMapMouseDown(e) {
            dragState.dragging = true;
            dragState.didDrag = false;
            dragState.startX = e.clientX;
            dragState.startY = e.clientY;
            dragState.startCamX = camX;
            dragState.startCamY = camY;
            e.preventDefault();
          }
          function handleMapMouseMove(e) {
            if (!canvasRef.current) return;
            var rect = canvasRef.current.getBoundingClientRect();
            // Edge-scroll detection
            var relX = e.clientX - rect.left; var relY = e.clientY - rect.top;
            var edgeZone = 30;
            edgeScroll.dx = 0; edgeScroll.dy = 0;
            if (relX < edgeZone) edgeScroll.dx = -1;
            else if (relX > rect.width - edgeZone) edgeScroll.dx = 1;
            if (relY < edgeZone) edgeScroll.dy = -1;
            else if (relY > rect.height - edgeZone) edgeScroll.dy = 1;
            // Drag panning
            if (!dragState.dragging) return;
            var ts3 = Math.max(4, Math.round(24 * colonyZoom));
            var dx = Math.round((dragState.startX - e.clientX) / ts3);
            var dy = Math.round((dragState.startY - e.clientY) / ts3);
            if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
              dragState.didDrag = true;
              var maxCX2 = Math.max(0, mapSize - Math.ceil(rect.width / ts3));
              var maxCY2 = Math.max(0, mapSize - Math.ceil((rect.height - 60) / ts3));
              upd('colonyCamX', Math.max(0, Math.min(maxCX2, dragState.startCamX + dx)));
              upd('colonyCamY', Math.max(0, Math.min(maxCY2, dragState.startCamY + dy)));
            }
          }
          function handleMapMouseUp() { dragState.dragging = false; }
          function handleMapMouseLeave() { dragState.dragging = false; edgeScroll.active = false; edgeScroll.dx = 0; edgeScroll.dy = 0; }
          function handleMapMouseEnter() { edgeScroll.active = true; }
          function handleMapWheel(e) {
            e.preventDefault();
            var newZoom = colonyZoom * (e.deltaY > 0 ? 0.88 : 1.12);
            newZoom = Math.max(0.4, Math.min(3.0, newZoom));
            if (Math.abs(newZoom - 1.0) < 0.08) newZoom = 1.0;
            // Zoom toward cursor — adjust camera
            if (canvasRef.current) {
              var rect2 = canvasRef.current.getBoundingClientRect();
              var ts4 = Math.max(4, Math.round(24 * colonyZoom));
              var cursorTileX = (e.clientX - rect2.left) / ts4 + camX;
              var cursorTileY = (e.clientY - rect2.top - 30) / ts4 + camY;
              var newTs = Math.max(4, Math.round(24 * newZoom));
              var newCamX = Math.round(cursorTileX - (e.clientX - rect2.left) / newTs);
              var newCamY = Math.round(cursorTileY - (e.clientY - rect2.top - 30) / newTs);
              upd('colonyCamX', Math.max(0, newCamX));
              upd('colonyCamY', Math.max(0, newCamY));
            }
            upd('colonyZoom', newZoom);
          }
          // ── Keyboard Shortcuts ──
          if (!window._colonyKeyHandler) {
            window._colonyKeyHandler = function (e) {
              if (!window._colonyKeyActive) return;
              // Don't capture if typing in an input
              if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
              var _upd = window._colonyUpd;
              var _d = window._colonyState || {};
              if (!_upd) return;
              var panSpeed = 3;
              switch (e.key.toLowerCase()) {
                case 'w': case 'arrowup':    _upd('colonyCamY', Math.max(0, (_d.colonyCamY || 0) - panSpeed)); e.preventDefault(); break;
                case 's': case 'arrowdown':  _upd('colonyCamY', (_d.colonyCamY || 0) + panSpeed); e.preventDefault(); break;
                case 'a': case 'arrowleft':  _upd('colonyCamX', Math.max(0, (_d.colonyCamX || 0) - panSpeed)); e.preventDefault(); break;
                case 'd': case 'arrowright': _upd('colonyCamX', (_d.colonyCamX || 0) + panSpeed); e.preventDefault(); break;
                case '=': case '+': _upd('colonyZoom', Math.min(3.0, (_d.colonyZoom || 1) * 1.15)); e.preventDefault(); break;
                case '-': case '_': _upd('colonyZoom', Math.max(0.4, (_d.colonyZoom || 1) * 0.85)); e.preventDefault(); break;
                case 'escape': _upd('colonySelTile', null); _upd('selectedRover', null); _upd('turnSummary', null); break;
                case 'h': _upd('colonyCamX', Math.max(0, ((_d.colonyMap || {}).colonyPos || {}).x - 10)); _upd('colonyCamY', Math.max(0, ((_d.colonyMap || {}).colonyPos || {}).y - 10)); break;
              }
            };
            window.addEventListener('keydown', window._colonyKeyHandler);
          }
          window._colonyKeyActive = (colonyPhase === 'playing');
          window._colonyUpd = upd;
          window._colonyState = d;

          return React.createElement('div', { className: 'bg-gradient-to-b from-slate-900 to-indigo-950 rounded-2xl p-4 border border-slate-700' },
            React.createElement('div', { className: 'flex items-center justify-between mb-4' },
              React.createElement('div', { className: 'flex items-center gap-2' },
                React.createElement('button', { onClick: function () { upd('selectedTool', null); }, className: 'text-slate-400 hover:text-white text-lg' }, '\u2190'),
                React.createElement('h2', { className: 'text-xl font-bold text-white' }, '\uD83D\uDE80 Kepler Colony'),
                React.createElement('span', { className: 'text-[9px] text-indigo-400 bg-indigo-900 px-2 py-0.5 rounded-full' }, 'Turn-Based Strategy')
              ),
              colony && React.createElement('div', { className: 'flex gap-1 text-[10px] items-center flex-wrap' },
                [
                  ['\uD83C\uDF3E','food',resources.food,'#4ade80','#166534'],
                  ['\u26A1','energy',resources.energy,'#facc15','#854d0e'],
                  ['\uD83D\uDCA7','water',resources.water,'#38bdf8','#0c4a6e'],
                  ['\uD83E\uDEA8','materials',resources.materials,'#94a3b8','#334155'],
                  ['\uD83D\uDD2C','science',resources.science,'#a78bfa','#4c1d95']
                ].map(function(r) {
                  var pct = Math.min(100, Math.round(r[2] / 80 * 100));
                  return React.createElement('div', { key: r[1], className: 'flex items-center gap-0.5', title: r[1] + ': ' + r[2] },
                    React.createElement('span', { className: 'text-xs' }, r[0]),
                    React.createElement('div', { className: 'relative w-10 h-2.5 rounded-full overflow-hidden', style: { backgroundColor: r[4] + '40' } },
                      React.createElement('div', { className: 'h-full rounded-full transition-all duration-500', style: { width: pct + '%', backgroundColor: r[3], animation: 'kp-barFill 0.8s ease-out' } })
                    ),
                    React.createElement('span', { className: 'text-[9px] font-bold', style: { color: r[3], minWidth: '16px' } }, r[2])
                  );
                }),
                React.createElement('span', { className: 'text-amber-300 font-bold ml-1' }, 'T' + turn),
                React.createElement('span', { className: 'text-[9px] px-1.5 py-0.5 rounded-full', style: { backgroundColor: currentEra.color + '33', color: currentEra.color } }, currentEra.icon + ' ' + currentEra.name),
                React.createElement('span', { className: 'text-[9px] text-cyan-300' }, (seasonDefs[seasonCycle.index] || {}).icon + ' ' + (seasonDefs[seasonCycle.index] || {}).name + ' (' + seasonCycle.turnsLeft + 't)'),
                turnPhase === 'day' && React.createElement('span', { className: 'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold', style: { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#e0e7ff', animation: 'kp-glow 2s infinite' } }, '\u26A1 ' + actionPoints + '/' + maxAP + ' AP'),
                turnPhase && React.createElement('span', { className: 'px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider', style: { background: turnPhase === 'dawn' ? '#f59e0b30' : turnPhase === 'dusk' ? '#6366f130' : '#22c55e30', color: turnPhase === 'dawn' ? '#fbbf24' : turnPhase === 'dusk' ? '#818cf8' : '#4ade80' } }, turnPhase === 'dawn' ? '\u2600\uFE0F Dawn' : turnPhase === 'day' ? '\u2600 Day' : '\uD83C\uDF19 Dusk')
              )
            ),
            // SETUP
            colonyPhase === 'setup' && React.createElement('div', { className: 'text-center py-10' },
              React.createElement('div', { className: 'text-7xl mb-4', style: { animation: 'kp-float 3s ease-in-out infinite', filter: 'drop-shadow(0 0 20px rgba(99,102,241,0.4))' } }, '\uD83D\uDE80'),
              React.createElement('h3', { className: 'text-3xl font-black mb-2', style: { background: 'linear-gradient(135deg, #e0e7ff, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } }, 'Welcome to Kepler-442b'),
              React.createElement('p', { className: 'text-slate-400 text-sm max-w-lg mx-auto mb-6' },
                'You have arrived at a habitable exoplanet 1,206 light-years from Earth. Build a self-sustaining colony by mastering real science. Every building requires passing a science challenge. Every turn brings new surprises from the Fate Roll. Your 6 settlers are counting on you, Commander!'
              ),
              React.createElement('div', { className: 'grid grid-cols-3 gap-3 max-w-md mx-auto mb-6 text-slate-300 text-[10px]' },
                [['\uD83C\uDF0D', 'Explore', 'Reveal tiles, find loot & anomalies'], ['\u26A1', '3 Actions/Turn', 'Build, research, or explore each day'], ['\uD83C\uDFB2', 'Fate Roll', 'Random events every turn!']].map(function (item) {
                  return React.createElement('div', { key: item[1], className: 'bg-slate-800 rounded-xl p-3 border border-slate-700 text-center' },
                    React.createElement('div', { className: 'text-2xl mb-1' }, item[0]),
                    React.createElement('div', { className: 'font-bold' }, item[1]),
                    item[2]
                  );
                })
              ),
              // Difficulty Settings
              React.createElement('div', { className: 'bg-slate-800/80 rounded-xl p-4 border border-slate-700 max-w-md mx-auto mb-6' },
                React.createElement('h4', { className: 'text-[11px] font-bold text-white mb-3 text-center' }, '\u2699\uFE0F Game Settings'),
                React.createElement('div', { className: 'grid grid-cols-3 gap-3' },
                  // Grade Level
                  React.createElement('div', null,
                    React.createElement('div', { className: 'text-[9px] text-slate-400 mb-1' }, '\uD83C\uDF93 Grade Level'),
                    React.createElement('div', { className: 'flex flex-col gap-1' },
                      ['K-2', '3-5', '6-8', '9-12', 'College'].map(function (gl) {
                        return React.createElement('button', {
                          key: gl,
                          onClick: function () { upd('colonyGrade', gl); },
                          className: 'px-2 py-1 rounded-lg text-[8px] font-bold border transition-all ' +
                            ((d.colonyGrade || '6-8') === gl ? 'border-green-400 bg-green-900 text-green-200' : 'border-slate-700 bg-slate-900 text-slate-500 hover:border-slate-500')
                        }, gl);
                      })
                    ),
                    React.createElement('div', { className: 'text-[8px] text-slate-500 mt-1' }, 'Adjusts question difficulty')
                  ),
                  React.createElement('div', null,
                    React.createElement('div', { className: 'text-[9px] text-slate-400 mb-1' }, 'Science Challenge Mode'),
                    React.createElement('div', { className: 'flex gap-1' },
                      React.createElement('button', {
                        onClick: function () { upd('colonyMode', 'mcq'); },
                        className: 'flex-1 px-2 py-2 rounded-lg text-[9px] font-bold border-2 transition-all ' +
                          ((d.colonyMode || 'mcq') === 'mcq' ? 'border-indigo-400 bg-indigo-900 text-indigo-200' : 'border-slate-600 bg-slate-900 text-slate-400')
                      }, '\uD83D\uDCCB MCQ'),
                      React.createElement('button', {
                        onClick: function () { upd('colonyMode', 'freeResponse'); },
                        className: 'flex-1 px-2 py-2 rounded-lg text-[9px] font-bold border-2 transition-all ' +
                          ((d.colonyMode || 'mcq') === 'freeResponse' ? 'border-purple-400 bg-purple-900 text-purple-200' : 'border-slate-600 bg-slate-900 text-slate-400')
                      }, '\u270D\uFE0F Free Response')
                    ),
                    React.createElement('div', { className: 'text-[8px] text-slate-500 mt-1' },
                      (d.colonyMode || 'mcq') === 'mcq' ? 'Multiple choice \u2014 4 options, scaffolded learning' : 'Type your answer \u2014 harder but deeper understanding'
                    )
                  ),
                  React.createElement('div', null,
                    React.createElement('div', { className: 'text-[9px] text-slate-400 mb-1' }, 'Audio Narration'),
                    React.createElement('div', { className: 'flex gap-1' },
                      React.createElement('button', {
                        onClick: function () { upd('colonyTTS', !(d.colonyTTS)); },
                        className: 'flex-1 px-2 py-2 rounded-lg text-[9px] font-bold border-2 transition-all ' +
                          (d.colonyTTS ? 'border-green-400 bg-green-900 text-green-200' : 'border-slate-600 bg-slate-900 text-slate-400')
                      }, d.colonyTTS ? '\uD83D\uDD0A ON' : '\uD83D\uDD07 OFF')
                    ),
                    React.createElement('div', { className: 'text-[8px] text-slate-500 mt-1' }, 'Characters speak with TTS voices')
                  )
                )
              ),
              React.createElement('button', {
                onClick: function () {
                  var startMap = generateMap();
                  var initPickups = generatePickups(startMap.tiles);
                  upd('mapPickups', initPickups);
                  upd('colonyMap', startMap); upd('colonyPhase', 'playing'); upd('colonyTurn', 1);
                  upd('turnPhase', 'dawn'); upd('actionPoints', 3); upd('builtThisTurn', false);
                  upd('dawnData', { turn: 1, income: {}, weather: null, discovery: null, isFirst: true });
                  upd('colonyZoom', 1.0);
                  upd('colonyCamX', Math.max(0, startMap.colonyPos.x - 10));
                  upd('colonyCamY', Math.max(0, startMap.colonyPos.y - 10));
                  upd('colonyRes', { food: 40, energy: 30, water: 30, materials: 20, science: 10 });
                  upd('colonyBuildings', []); upd('colonySettlers', JSON.parse(JSON.stringify(defaultSettlers)));
                  upd('colonyLog', ['Turn 1: Colony established on Kepler-442b. 6 settlers ready.']);
                  upd('colony', { name: 'Kepler-442b' });
                  upd('buildingEff', {}); upd('lastMaintTurn', 0); upd('maintChallenge', null);
                  upd('colonyStats', { questionsAnswered: 0, correct: 0, buildingsConstructed: 0, anomaliesExplored: 0, turnsPlayed: 0 });
                  upd('turnPhase', null); upd('actionPoints', 3); upd('fateRoll', null); upd('dawnData', null); upd('mapPickups', {}); upd('fateAnimating', false); upd('builtThisTurn', false);
                  upd('colonyRovers', []); upd('selectedRover', null); upd('tileImprovements', {});
                  if (d.colonyTTS) colonySpeak('Mission log. Colony established on Kepler 442 b. Six settlers are ready to begin construction. Good luck, Commander.', 'narrator');
                  if (addToast) addToast('\uD83D\uDE80 Colony established!', 'success');
                  if (typeof addXP === 'function') addXP(10, 'Kepler Colony: Mission launched');
                },
                className: 'px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl text-lg font-bold hover:shadow-lg hover:shadow-indigo-500/30 transition-all'
              }, '\uD83D\uDE80 Launch Colony Mission')
            ),
            // PLAYING
            colonyPhase === 'playing' && mapData && React.createElement('div', null,
              React.createElement('style', null, '@keyframes kp-fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes kp-pulse{0%,100%{opacity:1}50%{opacity:.6}}@keyframes kp-glow{0%,100%{box-shadow:0 0 5px rgba(99,102,241,.3)}50%{box-shadow:0 0 20px rgba(99,102,241,.6)}}@keyframes kp-fateRoll{0%{transform:scale(.5) rotate(0);opacity:0}50%{transform:scale(1.3) rotate(180deg);opacity:1}100%{transform:scale(1) rotate(360deg);opacity:1}}@keyframes kp-barFill{from{width:0}}@keyframes kp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes kp-slideDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}@keyframes kp-shake{0%,100%{transform:translateX(0)}10%,30%,50%,70%,90%{transform:translateX(-2px)}20%,40%,60%,80%{transform:translateX(2px)}}@keyframes kp-sparkle{0%,100%{opacity:0;transform:scale(0) rotate(0deg)}50%{opacity:1;transform:scale(1) rotate(180deg)}}@keyframes kp-breathe{0%,100%{transform:scale(1);opacity:.8}50%{transform:scale(1.02);opacity:1}}'),
              // ══ DAWN PHASE OVERLAY ══
              turnPhase === 'dawn' && React.createElement('div', {
                className: 'relative mb-4 rounded-2xl overflow-hidden',
                style: { background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #f59e0b20 100%)', animation: 'kp-fadeIn 0.5s ease-out' }
              },
                React.createElement('div', { className: 'absolute inset-0 opacity-10', style: { background: 'radial-gradient(circle at 80% 20%, #f59e0b 0%, transparent 50%)' } }),
                React.createElement('div', { className: 'relative p-5' },
                  React.createElement('div', { className: 'flex items-center justify-between mb-4' },
                    React.createElement('div', null,
                      React.createElement('div', { className: 'text-3xl mb-1', style: { animation: 'kp-float 3s ease-in-out infinite' } }, '\u2600\uFE0F'),
                      React.createElement('h2', { className: 'text-xl font-bold text-amber-200' }, 'Dawn \u2014 Turn ' + turn),
                      React.createElement('div', { className: 'text-[10px] text-amber-400/70' }, (seasonDefs[seasonCycle.index] || {}).icon + ' ' + (seasonDefs[seasonCycle.index] || {}).name + ' | ' + (eraData[era] || {}).icon + ' ' + (eraData[era] || {}).name + ' Era')
                    ),
                    React.createElement('div', { className: 'text-right' },
                      React.createElement('div', { className: 'text-4xl font-black text-amber-300', style: { textShadow: '0 0 20px rgba(245,158,11,0.4)' } }, '\u26A1 ' + maxAP),
                      React.createElement('div', { className: 'text-[10px] text-amber-400' }, 'Action Points Today')
                    )
                  ),
                  dawnData && !dawnData.isFirst && React.createElement('div', { className: 'bg-black/20 rounded-xl p-3 mb-3 border border-amber-900/30' },
                    React.createElement('div', { className: 'text-[9px] font-bold text-amber-300/80 uppercase tracking-wider mb-2' }, '\uD83D\uDCCA Income This Turn'),
                    React.createElement('div', { className: 'grid grid-cols-5 gap-2' },
                      [['\uD83C\uDF3E','Food',(dawnData.income||{}).food||0,'#4ade80'],['\u26A1','Energy',(dawnData.income||{}).energy||0,'#facc15'],['\uD83D\uDCA7','Water',(dawnData.income||{}).water||0,'#38bdf8'],['\uD83E\uDEA8','Mats',(dawnData.income||{}).materials||0,'#94a3b8'],['\uD83D\uDD2C','Sci',(dawnData.income||{}).science||0,'#a78bfa']].map(function(rd){return React.createElement('div',{key:rd[1],className:'text-center p-1.5 rounded-lg',style:{backgroundColor:rd[3]+'15',border:'1px solid '+rd[3]+'25'}},React.createElement('div',{className:'text-lg'},rd[0]),React.createElement('div',{className:'text-sm font-bold',style:{color:rd[3]}},(rd[2]>=0?'+':'')+rd[2]),React.createElement('div',{className:'text-[8px] text-slate-400'},rd[1]))})
                    )
                  ),
                  dawnData && dawnData.discovery && React.createElement('div', { className: 'bg-purple-900/30 rounded-xl p-3 mb-3 border border-purple-700/30', style: { animation: 'kp-fadeIn 0.8s ease-out' } },
                    React.createElement('div', { className: 'flex items-center gap-2' },
                      React.createElement('span', { className: 'text-2xl', style: { animation: 'kp-pulse 2s infinite' } }, (dawnData.discovery||{}).icon || '\uD83D\uDD0D'),
                      React.createElement('div', null,
                        React.createElement('div', { className: 'text-[10px] font-bold text-purple-300' }, (dawnData.discovery||{}).label),
                        React.createElement('div', { className: 'text-[9px] text-purple-400' }, (dawnData.discovery||{}).desc)
                      )
                    )
                  ),
                  (function(){ var adv = getAdvisorMessage(); return adv ? React.createElement('div', { className: 'bg-indigo-900/30 rounded-lg p-2 mb-3 border border-indigo-700/30 flex items-center gap-2' }, React.createElement('span', { className: 'text-lg' }, (adv.settler||{}).icon||'\uD83D\uDCA1'), React.createElement('div', { className: 'text-[9px] text-indigo-300 flex-1' }, React.createElement('span', { className: 'font-bold text-indigo-200' }, ((adv.settler||{}).name||'Advisor') + ': '), adv.msg)) : null; })(),
                  React.createElement('button', {
                    onClick: function() { upd('turnPhase', 'day'); upd('actionPoints', maxAP); upd('builtThisTurn', false); upd('dawnData', null); if (d.colonyTTS) colonySpeak('Day ' + turn + ' begins. You have ' + maxAP + ' action points.', 'narrator'); },
                    className: 'w-full py-3 rounded-xl text-sm font-bold text-amber-900 transition-all hover:scale-[1.02]',
                    style: { background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', boxShadow: '0 4px 15px rgba(245,158,11,0.3)' }
                  }, '\u2600\uFE0F Begin Day \u2014 ' + maxAP + ' Actions Available')
                )
              ),
              React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                React.createElement('div', { className: 'flex gap-1 items-center' },
                  React.createElement('button', { onClick: function () { upd('colonyCamX', Math.max(0, camX - 10)); }, className: 'px-2 py-1 bg-slate-700 text-white rounded text-[10px] hover:bg-slate-600', title: 'Scroll Left' }, '\u2190'),
                  React.createElement('button', { onClick: function () { upd('colonyCamY', Math.max(0, camY - 10)); }, className: 'px-2 py-1 bg-slate-700 text-white rounded text-[10px] hover:bg-slate-600', title: 'Scroll Up' }, '\u2191'),
                  React.createElement('button', { onClick: function () { upd('colonyCamY', camY + 10); }, className: 'px-2 py-1 bg-slate-700 text-white rounded text-[10px] hover:bg-slate-600', title: 'Scroll Down' }, '\u2193'),
                  React.createElement('button', { onClick: function () { upd('colonyCamX', camX + 10); }, className: 'px-2 py-1 bg-slate-700 text-white rounded text-[10px] hover:bg-slate-600', title: 'Scroll Right' }, '\u2192'),
                  React.createElement('button', { onClick: function () { upd('colonyCamX', Math.max(0, mapData.colonyPos.x - 6)); upd('colonyCamY', Math.max(0, mapData.colonyPos.y - 6)); }, className: 'px-2 py-1 bg-indigo-700 text-white rounded text-[10px] hover:bg-indigo-600', title: 'Center on Colony' }, '\uD83C\uDFE0'),
                  React.createElement('span', { className: 'text-slate-600 mx-1' }, '|'),
                  React.createElement('button', { onClick: function () { upd('colonyZoom', Math.min(3.0, colonyZoom * 1.25)); }, className: 'px-2 py-1 bg-slate-700 text-white rounded text-[10px] hover:bg-slate-600 font-bold', title: 'Zoom In' }, '+'),
                  React.createElement('button', { onClick: function () { upd('colonyZoom', Math.max(0.4, colonyZoom * 0.8)); }, className: 'px-2 py-1 bg-slate-700 text-white rounded text-[10px] hover:bg-slate-600 font-bold', title: 'Zoom Out' }, '\u2212'),
                  React.createElement('button', { onClick: function () { upd('colonyZoom', 1.0); }, className: 'px-1.5 py-1 bg-slate-700 text-white rounded text-[9px] hover:bg-slate-600', title: 'Reset Zoom' }, '1:1'),
                  React.createElement('span', { className: 'text-[9px] text-slate-500 ml-1' }, Math.round(colonyZoom * 100) + '%'),
                React.createElement('span', { className: 'text-[8px] text-slate-600 ml-2 hidden sm:inline' }, 'WASD pan \u2022 +/- zoom \u2022 Esc clear \u2022 H home')
                ),
                React.createElement('span', { className: 'text-[9px] text-slate-500' }, mapSize + '\u00D7' + mapSize + ' (' + camX + ',' + camY + ')')
              ),
              React.createElement('canvas', {
                ref: canvasRef,
                onClick: handleMapClick,
                onMouseDown: handleMapMouseDown,
                onMouseMove: handleMapMouseMove,
                onMouseUp: handleMapMouseUp,
                onMouseLeave: handleMapMouseLeave,
                onMouseEnter: handleMapMouseEnter,
                onWheel: handleMapWheel,
                className: 'w-full rounded-xl border border-slate-700 mb-3',
                style: { maxHeight: '520px', cursor: dragState.dragging ? 'grabbing' : 'grab' }
              }),
              // ── Minimap ──
              React.createElement('div', { className: 'relative', style: { width: '120px', height: '120px', position: 'absolute', right: '16px', top: '80px', zIndex: 10 } },
                React.createElement('canvas', {
                  ref: function (miniCanvas) {
                    if (!miniCanvas || !mapData) return;
                    var mCtx = miniCanvas.getContext('2d');
                    var mW = 120, mH = 120;
                    miniCanvas.width = mW; miniCanvas.height = mH;
                    mCtx.fillStyle = '#0f172a'; mCtx.fillRect(0, 0, mW, mH);
                    var mTile = mW / mapSize;
                    // Draw explored tiles
                    var mTiles = mapData.tiles;
                    for (var mi = 0; mi < mTiles.length; mi++) {
                      var mt = mTiles[mi];
                      if (mt.explored) {
                        mCtx.fillStyle = mt.type === 'colony' ? '#3b82f6' : mt.type === 'ocean' ? '#1e40af' : mt.type === 'mountain' ? '#78716c' : mt.type === 'forest' ? '#166534' : mt.type === 'volcanic' ? '#991b1b' : mt.type === 'ice' ? '#bae6fd' : mt.color || '#334155';
                        mCtx.fillRect(mt.x * mTile, mt.y * mTile, Math.max(1, mTile), Math.max(1, mTile));
                      }
                    }
                    // Viewport rectangle
                    var vpX = camX * mTile, vpY = camY * mTile;
                    var ts5 = Math.max(4, Math.round(24 * colonyZoom));
                    var vpW2 = Math.ceil(((canvasRef.current || {}).width || 500) / ts5) * mTile;
                    var vpH2 = Math.ceil((((canvasRef.current || {}).height || 400) - 60) / ts5) * mTile;
                    mCtx.strokeStyle = '#facc15'; mCtx.lineWidth = 1.5;
                    mCtx.strokeRect(vpX, vpY, vpW2, vpH2);
                      // ── Map Pickups ──
                      Object.keys(mapPickups).forEach(function(pk) {
                        var pxy = pk.split(','); var ppx = parseInt(pxy[0]) - camX; var ppy = parseInt(pxy[1]) - camY;
                        if (ppx >= 0 && ppx < vw && ppy >= 0 && ppy < vh) {
                          var pItem = mapPickups[pk]; var psx = ppx * cs + cs/2; var psy = ppy * cs + cs/2;
                          var pColor = pItem.rarity === 'epic' ? '#f59e0b' : pItem.rarity === 'rare' ? '#8b5cf6' : '#22c55e';
                          var pSize = pItem.rarity === 'epic' ? cs*0.4 : pItem.rarity === 'rare' ? cs*0.35 : cs*0.25;
                          ctx.save(); ctx.globalAlpha = 0.7 + 0.3 * Math.sin(Date.now()/500 + parseInt(pxy[0]));
                          ctx.fillStyle = pColor; ctx.shadowColor = pColor; ctx.shadowBlur = pItem.rarity === 'epic' ? 12 : 6;
                          ctx.beginPath();
                          if (pItem.rarity === 'epic') { for (var si=0;si<5;si++){var a=si*Math.PI*2/5-Math.PI/2;ctx.lineTo(psx+Math.cos(a)*pSize,psy+Math.sin(a)*pSize);a+=Math.PI/5;ctx.lineTo(psx+Math.cos(a)*pSize*0.4,psy+Math.sin(a)*pSize*0.4);} }
                          else if (pItem.rarity === 'rare') { for (var si2=0;si2<4;si2++){var a2=si2*Math.PI/2+Math.PI/4;ctx.lineTo(psx+Math.cos(a2)*pSize,psy+Math.sin(a2)*pSize);a2+=Math.PI/4;ctx.lineTo(psx+Math.cos(a2)*pSize*0.5,psy+Math.sin(a2)*pSize*0.5);} }
                          else { ctx.arc(psx, psy, pSize, 0, Math.PI * 2); }
                          ctx.closePath(); ctx.fill(); ctx.restore();
                        }
                      });
                    // Colony marker
                    if (mapData.colonyPos) {
                      mCtx.fillStyle = '#22d3ee';
                      mCtx.fillRect(mapData.colonyPos.x * mTile - 1, mapData.colonyPos.y * mTile - 1, 3, 3);
                    }
                  },
                  onClick: function (e2) {
                    var rect3 = e2.target.getBoundingClientRect();
                    var mx = (e2.clientX - rect3.left) / 120 * mapSize;
                    var my = (e2.clientY - rect3.top) / 120 * mapSize;
                    var ts6 = Math.max(4, Math.round(24 * colonyZoom));
                    var vw3 = Math.ceil(((canvasRef.current || {}).width || 500) / ts6);
                    var vh3 = Math.ceil((((canvasRef.current || {}).height || 400) - 60) / ts6);
                    upd('colonyCamX', Math.max(0, Math.round(mx - vw3 / 2)));
                    upd('colonyCamY', Math.max(0, Math.round(my - vh3 / 2)));
                  },
                  className: 'rounded border border-slate-600 cursor-pointer',
                  style: { width: '120px', height: '120px', opacity: 0.85 },
                  title: 'Click to navigate'
                })
              ),
              // Selected tile
              selectedTile && React.createElement('div', { className: 'rounded-xl p-3 border mb-3', style: (function(){ var tColors = { plains: { bg: 'linear-gradient(135deg, #14532d, #0f172a)', bc: '#16a34a40' }, mountain: { bg: 'linear-gradient(135deg, #44403c, #0f172a)', bc: '#78716c40' }, volcanic: { bg: 'linear-gradient(135deg, #7f1d1d, #0f172a)', bc: '#ef444440' }, ice: { bg: 'linear-gradient(135deg, #164e63, #0f172a)', bc: '#06b6d440' }, desert: { bg: 'linear-gradient(135deg, #78350f, #0f172a)', bc: '#f59e0b40' }, ocean: { bg: 'linear-gradient(135deg, #1e3a5f, #0f172a)', bc: '#3b82f640' }, radiation: { bg: 'linear-gradient(135deg, #581c87, #0f172a)', bc: '#a855f740' }, colony: { bg: 'linear-gradient(135deg, #312e81, #0f172a)', bc: '#6366f140' } }; var tc = tColors[selectedTile.tile.type] || tColors.plains; return { background: tc.bg, borderColor: tc.bc, animation: 'kp-fadeIn 0.3s ease-out' }; })() },
                React.createElement('div', { className: 'flex items-center justify-between' },
                  React.createElement('div', null,
                    React.createElement('span', { className: 'text-sm font-bold text-white' }, selectedTile.tile.icon + ' ' + selectedTile.tile.name),
                    React.createElement('span', { className: 'text-[10px] text-slate-400 ml-2' }, '(' + selectedTile.x + ',' + selectedTile.y + ')' + (selectedTile.tile.res !== 'none' ? ' +' + selectedTile.tile.res : '') + (selectedTile.tile.hasAnomaly ? ' \u26A0\uFE0F Anomaly detected!' : ''))
                  ),
                  selectedTile.tile.hasAnomaly && selectedTile.tile.explored && !d.anomalyLoading && React.createElement('button', {
                    onClick: function () {
                      upd('anomalyLoading', true);
                      var tName = selectedTile.tile.name;
                      callGemini('You are the AI game master for a space colony on alien planet Kepler-442b. Settlers are exploring an anomaly on a ' + tName + ' tile. Generate a discovery event. This should be a fascinating alien ruin, geological wonder, or xenobiological find. Include real science. Return ONLY valid JSON:\n{"emoji":"<emoji>","title":"<discovery name>","description":"<3-4 sentences describing the find>","lesson":"<real science behind this type of discovery, 2-3 sentences>","reward":{"food":<0-8>,"energy":<0-8>,"water":<0-8>,"materials":<0-8>,"science":<3-15>},"terraformBonus":<0-5>}', true).then(function (result) {
                        try {
                          var cl = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                          var s2 = cl.indexOf('{'); if (s2 > 0) cl = cl.substring(s2);
                          var e2 = cl.lastIndexOf('}'); if (e2 > 0) cl = cl.substring(0, e2 + 1);
                          var parsed = JSON.parse(cl);
                          upd('anomalyResult', parsed); upd('anomalyLoading', false);
                          // Apply rewards
                          var nr5 = Object.assign({}, resources);
                          Object.keys(parsed.reward || {}).forEach(function (k) { if (nr5[k] !== undefined) nr5[k] += parsed.reward[k]; });
                          upd('colonyRes', nr5);
                          if (parsed.terraformBonus) upd('colonyTerraform', Math.min(100, (d.colonyTerraform || 0) + parsed.terraformBonus));
                          // Remove anomaly
                          var nm2 = JSON.parse(JSON.stringify(mapData));
                          nm2.tiles[selectedTile.y * mapSize + selectedTile.x].hasAnomaly = false;
                          upd('colonyMap', nm2);
                          var nl5 = gameLog.slice(); nl5.push('\u2728 Anomaly: ' + parsed.title); upd('colonyLog', nl5);
                          if (d.colonyTTS) colonySpeak('Anomaly investigated. ' + parsed.title + '. ' + parsed.description, 'narrator');
                          var ns6 = Object.assign({}, stats); ns6.anomaliesExplored++; upd('colonyStats', ns6);
                          if (typeof addXP === 'function') addXP(25, 'Kepler Colony: Anomaly explored');
                        } catch (err) { upd('anomalyLoading', false); }
                      }).catch(function () { upd('anomalyLoading', false); });
                    },
                    className: 'px-3 py-1 bg-purple-600 text-white rounded-lg text-[10px] font-bold'
                  }, d.anomalyLoading ? '\u23F3' : '\u2728 Investigate Anomaly'),
                  !selectedTile.tile.explored && turnPhase === 'day' && actionPoints >= 1 && React.createElement('button', {
                    onClick: function () {
                      if (!spendAP(1)) return;
                      var nm = JSON.parse(JSON.stringify(mapData));
                      var exploreRad = researchQueue.indexOf('gravimetrics') >= 0 ? 2 : 1;
                      for (var dy2 = -exploreRad; dy2 <= exploreRad; dy2++) for (var dx2 = -exploreRad; dx2 <= exploreRad; dx2++) {
                        var ni2 = (selectedTile.y + dy2) * mapSize + (selectedTile.x + dx2);
                        if (ni2 >= 0 && ni2 < nm.tiles.length) nm.tiles[ni2].explored = true;
                      }
                      upd('colonyMap', nm);
                      var nr = Object.assign({}, resources);
                      var exploreCost = (activePolicy === 'militarist') ? 0 : 2;
                      nr.energy = Math.max(0, nr.energy - exploreCost); upd('colonyRes', nr);
                      // Terrain resource bonus
                      var terrainBonus = { plains: 'food', mountain: 'materials', volcanic: 'energy', ice: 'water', desert: 'materials', ocean: 'water', radiation: 'science' };
                      var bonusRes = terrainBonus[selectedTile.tile.type];
                      if (bonusRes && nr[bonusRes] !== undefined) { nr[bonusRes] += 2; }
                      // Collect pickup if present
                      var pkKey = selectedTile.x + ',' + selectedTile.y;
                      var pk = mapPickups[pkKey];
                      if (pk) {
                        if (nr[pk.res] !== undefined) nr[pk.res] += pk.amt;
                        upd('colonyRes', nr);
                        var npk = Object.assign({}, mapPickups); delete npk[pkKey]; upd('mapPickups', npk);
                        if (addToast) addToast((pk.rarity === 'epic' ? '\u2B50' : pk.rarity === 'rare' ? '\u2728' : '\u25CF') + ' ' + pk.label, pk.rarity === 'epic' ? 'success' : 'info');
                      }
                      if (addToast) addToast('Explored ' + selectedTile.tile.name + '! (-1 AP)' + (bonusRes ? ' +2 ' + bonusRes : ''), 'info');
                    },
                    className: 'px-3 py-1 rounded-lg text-[10px] font-bold text-white',
                    style: { background: 'linear-gradient(135deg, #4338ca, #6366f1)' }
                  }, '\uD83D\uDDFA Explore (-1\u26A1)')
                )
              ),
              // Anomaly Result
              d.anomalyResult && React.createElement('div', { className: 'bg-gradient-to-r from-purple-900 to-violet-900 rounded-xl p-3 border border-purple-600 mb-3' },
                React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                  React.createElement('h4', { className: 'text-sm font-bold text-purple-200' }, (d.anomalyResult.emoji || '\u2728') + ' ' + d.anomalyResult.title),
                  React.createElement('button', { onClick: function () { upd('anomalyResult', null); }, className: 'text-purple-400 text-xs' }, '\u2715')
                ),
                React.createElement('p', { className: 'text-xs text-purple-100 leading-relaxed' }, d.anomalyResult.description),
                d.anomalyResult.lesson && React.createElement('div', { className: 'mt-2 bg-purple-950 rounded-lg px-3 py-2 text-[10px] text-purple-300 border border-purple-800' },
                  React.createElement('span', { className: 'font-bold text-purple-200' }, '\uD83D\uDCDA Science: '), d.anomalyResult.lesson
                ),
                React.createElement('div', { className: 'flex gap-2 mt-2 text-[9px] flex-wrap' },
                  Object.keys(d.anomalyResult.reward || {}).filter(function (k) { return d.anomalyResult.reward[k] > 0; }).map(function (k) {
                    return React.createElement('span', { key: k, className: 'text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full' }, '+' + d.anomalyResult.reward[k] + ' ' + k);
                  }),
                  d.anomalyResult.terraformBonus > 0 && React.createElement('span', { className: 'text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded-full' }, '+' + d.anomalyResult.terraformBonus + '% terraform')
                )
              ),
              // Actions
              // ══ ALWAYS-VISIBLE AP ACTION BAR ══
              turnPhase === 'day' && React.createElement('div', { className: 'mb-3 rounded-2xl overflow-hidden', style: { background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', border: '1px solid #334155' } },
                React.createElement('div', { className: 'px-3 pt-3 pb-2 flex items-center justify-between' },
                  React.createElement('div', { className: 'flex items-center gap-2' },
                    React.createElement('span', { className: 'text-[10px] font-bold uppercase tracking-wider text-slate-500' }, 'Actions'),
                    React.createElement('div', { className: 'flex gap-1' }, Array.from({length:maxAP},function(_,i){return React.createElement('div',{key:i,className:'w-4 h-4 rounded-full transition-all duration-300',style:{background:i<actionPoints?'linear-gradient(135deg,#818cf8,#6366f1)':'#1e293b',boxShadow:i<actionPoints?'0 0 8px rgba(99,102,241,0.5)':'none',border:i<actionPoints?'2px solid #a5b4fc':'2px solid #334155'}})})),
                    React.createElement('span', { className: 'text-xs font-bold', style: { color: actionPoints > 0 ? '#818cf8' : '#475569' } }, actionPoints + '/' + maxAP)
                  ),
                  React.createElement('button', { onClick: function() { upd('turnPhase', 'dusk'); }, className: 'px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105', style: { background: 'linear-gradient(135deg, #312e81, #4c1d95)', color: '#c4b5fd', border: '1px solid #6366f140' } }, '\uD83C\uDF19 End Day')
                ),
                React.createElement('div', { className: 'px-3 pb-3 grid grid-cols-4 gap-1.5' },
                  React.createElement('button', { onClick: function() { if(actionPoints<1){if(addToast)addToast('No AP!','error');return;} if(!selectedTile||selectedTile.tile.explored){if(addToast)addToast('Select an unexplored tile!','info');return;} spendAP(1); var nm=JSON.parse(JSON.stringify(mapData)); var er2=1+(researchQueue.indexOf('gravimetrics')>=0?1:0); for(var dy2=-er2;dy2<=er2;dy2++)for(var dx2=-er2;dx2<=er2;dx2++){var ni2=(selectedTile.y+dy2)*mapSize+(selectedTile.x+dx2);if(ni2>=0&&ni2<nm.tiles.length)nm.tiles[ni2].explored=true;} upd('colonyMap',nm); var nr=Object.assign({},resources); var ec2=(activePolicy==='militarist')?0:2; nr.energy=Math.max(0,nr.energy-ec2); var tb={plains:'food',mountain:'materials',volcanic:'energy',ice:'water',desert:'materials',ocean:'water',radiation:'science'}; var br=tb[selectedTile.tile.type]; if(br&&nr[br]!==undefined)nr[br]+=2; var pkK=selectedTile.x+','+selectedTile.y; var pkp=mapPickups[pkK]; if(pkp){nr[pkp.res]=(nr[pkp.res]||0)+pkp.amt;var npk=Object.assign({},mapPickups);delete npk[pkK];upd('mapPickups',npk);if(addToast)addToast((pkp.rarity==='epic'?'\u2B50 EPIC: ':pkp.rarity==='rare'?'\u2728 RARE: ':'')+pkp.label,'info');} upd('colonyRes',nr); if(addToast)addToast('Explored '+selectedTile.tile.name+'!'+(br?' +2 '+br:''),'info'); }, disabled: actionPoints<1||turnPhase!=='day', className: 'flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all '+(actionPoints>=1?'hover:bg-indigo-900/50 hover:scale-105':'opacity-40'), style:{background:'#1e293b',border:'1px solid #33415560'} }, React.createElement('span',{className:'text-lg'},'\uD83D\uDDFA\uFE0F'), React.createElement('span',{className:'text-[9px] font-bold text-slate-300'},'Explore'), React.createElement('span',{className:'text-[7px] text-indigo-400'},'1 AP')),
                  React.createElement('button', { onClick: function() { if(builtThisTurn){if(addToast)addToast('1 build per turn!','info');return;} if(actionPoints<1){if(addToast)addToast('No AP!','error');return;} upd('showBuild',!d.showBuild); }, disabled: actionPoints<1||builtThisTurn, className: 'flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all '+(actionPoints>=1&&!builtThisTurn?'hover:bg-amber-900/30 hover:scale-105':'opacity-40'), style:{background:'#1e293b',border:'1px solid #92400e40'} }, React.createElement('span',{className:'text-lg'},'\uD83C\uDFD7\uFE0F'), React.createElement('span',{className:'text-[9px] font-bold text-amber-300'},'Build'), React.createElement('span',{className:'text-[7px] text-amber-500'},builtThisTurn?'Done':'1 AP'), React.createElement('span',{className:'text-[7px] text-slate-500'},buildings.length+'/'+buildingDefs.length)),
                  React.createElement('button', { onClick: function() { if(actionPoints<1){if(addToast)addToast('No AP!','error');return;} upd('showResearch',!d.showResearch); }, disabled: actionPoints<1, className: 'flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all '+(actionPoints>=1?'hover:bg-violet-900/30 hover:scale-105':'opacity-40'), style:{background:'#1e293b',border:'1px solid #4c1d9540'} }, React.createElement('span',{className:'text-lg'},'\uD83E\uDDEC'), React.createElement('span',{className:'text-[9px] font-bold text-violet-300'},'Research'), React.createElement('span',{className:'text-[7px] text-violet-500'},'1 AP'), React.createElement('span',{className:'text-[7px] text-slate-500'},researchQueue.length+'/10')),
                  React.createElement('button', { onClick: function() { upd('showSettlers',!d.showSettlers); }, className: 'flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all hover:bg-teal-900/30 hover:scale-105', style:{background:'#1e293b',border:'1px solid #0d948440'} }, React.createElement('span',{className:'text-lg'},'\uD83D\uDC65'), React.createElement('span',{className:'text-[9px] font-bold text-teal-300'},'Crew'), React.createElement('span',{className:'text-[7px] text-teal-500'},'Free'), React.createElement('span',{className:'text-[7px] text-slate-500'},settlers.length+' pop')),
                  (buildings.length>=2||activePolicy)&&React.createElement('button', { onClick: function() { upd('showPolicy',!d.showPolicy); }, className: 'flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all hover:bg-emerald-900/30 hover:scale-105', style:{background:'#1e293b',border:'1px solid #16a34a40'} }, React.createElement('span',{className:'text-lg'},'\uD83C\uDFDB\uFE0F'), React.createElement('span',{className:'text-[9px] font-bold text-emerald-300'},'Gov'), React.createElement('span',{className:'text-[7px] text-emerald-500'},'Free')),
                  (greatScientists.length>0||buildings.length>=5)&&React.createElement('button', { onClick: function() { upd('showGreatSci',!d.showGreatSci); }, className: 'flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all hover:bg-yellow-900/30 hover:scale-105', style:{background:'#1e293b',border:'1px solid #ca8a0440'} }, React.createElement('span',{className:'text-lg'},'\uD83E\uDD16'), React.createElement('span',{className:'text-[9px] font-bold text-yellow-300'},'Mentors'), React.createElement('span',{className:'text-[7px] text-slate-500'},greatScientists.length+'/'+greatSciDefs.length)),
                  (era!=='survival')&&React.createElement('button', { onClick: function() { if(actionPoints<2){if(addToast)addToast('Expeditions cost 2 AP!','error');return;} upd('showExpeditions',!d.showExpeditions); }, disabled:actionPoints<2, className: 'flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all '+(actionPoints>=2?'hover:bg-cyan-900/30 hover:scale-105':'opacity-40'), style:{background:'#1e293b',border:'1px solid #06b6d440'} }, React.createElement('span',{className:'text-lg'},'\u26F5'), React.createElement('span',{className:'text-[9px] font-bold text-cyan-300'},'Expedition'), React.createElement('span',{className:'text-[7px] text-cyan-500'},'2 AP')),
                  (era!=='survival')&&React.createElement('button', { onClick: function() { upd('showWonders',!d.showWonders); }, className: 'flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all hover:bg-amber-900/30 hover:scale-105', style:{background:'#1e293b',border:'1px solid #b4540040'} }, React.createElement('span',{className:'text-lg'},'\uD83C\uDFDB\uFE0F'), React.createElement('span',{className:'text-[9px] font-bold text-amber-200'},'Wonders'), React.createElement('span',{className:'text-[7px] text-amber-500'},'Free'))
                ),
                React.createElement('div', { className: 'px-3 pb-2 flex gap-1.5 flex-wrap' },
                  React.createElement('button', { onClick: function() { upd('showAchievements',!d.showAchievements); }, className: 'px-2.5 py-1 rounded-lg text-[8px] font-bold transition-all hover:scale-105', style: d.showAchievements ? { background: 'linear-gradient(135deg, #9f1239, #881337)', color: '#fda4af', border: '1px solid #f43f5e', boxShadow: '0 0 8px rgba(244,63,94,0.3)' } : { background: '#1e293b', color: '#fb7185', border: '1px solid #f43f5e30' } }, '\uD83C\uDFC5 ' + Object.keys(achievements).length + '/' + achievementDefs.length),
                  React.createElement('button', { onClick: function() { upd('showJournal',!d.showJournal); }, className: 'px-2.5 py-1 rounded-lg text-[8px] font-bold transition-all hover:scale-105', style: d.showJournal ? { background: 'linear-gradient(135deg, #166534, #14532d)', color: '#86efac', border: '1px solid #22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.3)' } : { background: '#1e293b', color: '#4ade80', border: '1px solid #22c55e30' } }, '\uD83D\uDCD6 ' + scienceJournal.length),
                  React.createElement('button', { onClick: function() { upd('showRoverPanel',!d.showRoverPanel); }, className: 'px-2.5 py-1 rounded-lg text-[8px] font-bold transition-all hover:scale-105', style: d.showRoverPanel ? { background: 'linear-gradient(135deg, #164e63, #155e75)', color: '#67e8f9', border: '1px solid #06b6d4', boxShadow: '0 0 8px rgba(6,182,212,0.3)' } : { background: '#1e293b', color: '#22d3ee', border: '1px solid #06b6d430' } }, '\uD83D\uDE99 ' + rovers.length + ' rovers')
                )
              ),
              // ══ DUSK PHASE OVERLAY ══
              turnPhase === 'dusk' && React.createElement('div', { className: 'mb-4 rounded-2xl overflow-hidden relative', style: { background: 'linear-gradient(135deg, #0f172a, #1e1b4b, #312e81)', border: '1px solid #4c1d9540', animation: 'kp-fadeIn 0.5s ease-out' } },
                React.createElement('div', { className: 'relative p-5' },
                  React.createElement('div', { className: 'text-center mb-4' },
                    React.createElement('div', { className: 'text-3xl mb-1' }, '\uD83C\uDF19'),
                    React.createElement('h2', { className: 'text-xl font-bold text-indigo-200' }, 'Dusk \u2014 Turn ' + turn + ' Ending'),
                    React.createElement('div', { className: 'text-[10px] text-indigo-400' }, 'The fate of your colony hangs in the balance...')
                  ),
                  React.createElement('div', { className: 'bg-black/30 rounded-xl p-4 mb-4 text-center border border-indigo-800/30' },
                    React.createElement('div', { className: 'text-[9px] font-bold text-indigo-400 uppercase tracking-wider mb-2' }, '\uD83C\uDFB2 Fate Roll'),
                    !fateRoll && React.createElement('button', { onClick: function() { var roll=performFateRoll(); upd('fateAnimating',true); upd('fateRoll',roll); setTimeout(function(){upd('fateAnimating',false);},1500); }, className: 'px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105', style: { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 4px 15px rgba(99,102,241,0.4)', animation: 'kp-pulse 2s infinite' } }, '\uD83C\uDFB2 Roll the Dice!'),
                    fateRoll && React.createElement('div', { style: { animation: fateAnimating ? 'kp-fateRoll 1.5s ease-out' : 'none' } },
                      React.createElement('div', { className: 'text-5xl mb-2', style: { filter: fateAnimating ? 'blur(2px)' : 'none', transition: 'filter 0.5s' } }, fateRoll.result.icon),
                      React.createElement('div', { className: 'text-3xl font-black mb-1', style: { color: fateRoll.result.color, textShadow: '0 0 20px ' + fateRoll.result.color + '60' } }, fateRoll.modified),
                      React.createElement('div', { className: 'text-sm font-bold', style: { color: fateRoll.result.color } }, fateRoll.result.label),
                      fateRoll.bonus > 0 && React.createElement('div', { className: 'text-[9px] text-indigo-400 mt-1' }, '\uD83C\uDFD7 Buildings bonus: +' + fateRoll.bonus + ' (' + fateRoll.raw + ' \u2192 ' + fateRoll.modified + ')'),
                      React.createElement('div', { className: 'mt-3 text-[10px] text-slate-300 bg-indigo-950/50 rounded-lg p-2 border border-indigo-800/30' }, fateRoll.result.type==='disaster'?'\uD83D\uDCA5 Catastrophe! Heavy resource losses.':fateRoll.result.type==='hazard'?'\u26A0\uFE0F Hazard damaged some resources.':fateRoll.result.type==='challenge'?'\uD83C\uDFAF A challenge, but you weathered it.':fateRoll.result.type==='calm'?'\u2600\uFE0F Peaceful day. All nominal.':fateRoll.result.type==='discovery'?'\uD83D\uDD0D Settlers discovered something valuable!':fateRoll.result.type==='windfall'?'\uD83C\uDF81 Windfall! Extra resources!':fateRoll.result.type==='settlers'?'\uD83D\uDE80 Transport brought new colonists!':'\u2B50 LEGENDARY boon!')
                    )
                  ),
                  fateRoll && !fateAnimating && React.createElement('button', {
                    onClick: function () {
                      var nt = turn + 1; var nr2 = Object.assign({}, resources);
                    var _preRes = { food: nr2.food, energy: nr2.energy, water: nr2.water, materials: nr2.materials, science: nr2.science };
                    buildings.forEach(function (b) {
                      var def = buildingDefs.find(function (bd) { return bd.id === b; });
                      if (def) {
                        var eff = (buildingEff[b] !== undefined ? buildingEff[b] : 100) / 100;
                        // Season multipliers
                        var sMult = activeSeason.effect.allMult || 1;
                        // Nanotech research: min 75% efficiency
                        if (researchQueue.indexOf('nanotech') >= 0 && eff < 0.75) eff = 0.75;
                        Object.keys(def.production).forEach(function (k) {
                          var val2 = Math.round(def.production[k] * eff * sMult);
                          if (k === 'food' && activeSeason.effect.foodMult) val2 = Math.round(val2 * activeSeason.effect.foodMult);
                          if (k === 'water' && activeSeason.effect.waterMult) val2 = Math.round(val2 * activeSeason.effect.waterMult);
                          nr2[k] = (nr2[k] || 0) + val2;
                        });
                      }
                    });
                    nr2.food = Math.max(0, nr2.food - settlers.length);
                    // Terraforming progress
                    var tfGain = buildings.indexOf('atmo') >= 0 ? 2 : 0;
                    tfGain += buildings.indexOf('biodome') >= 0 ? 3 : 0;
                    tfGain += buildings.indexOf('hydroponics') >= 0 ? 0.5 : 0;
                    tfGain += buildings.indexOf('greenhouse') >= 0 ? 1 : 0;
                    tfGain += buildings.indexOf('oceanSeeder') >= 0 ? 1.5 : 0;
                    var newTf = Math.min(100, (d.colonyTerraform || 0) + tfGain);
                    upd('colonyTerraform', newTf);
                    // Med Bay heals settlers
                    if (buildings.indexOf('medbay') >= 0) {
                      upd('colonySettlers', settlers.map(function (s4) { return Object.assign({}, s4, { health: Math.min(100, s4.health + 5) }); }));
                    }
                    // Weather hazard (random)
                    var weatherTypes = [null, null, null, null, // 4/7 = calm
                      { name: 'Dust Storm', icon: '\uD83C\uDF2A\uFE0F', effect: 'Materials production halved', res: 'materials', penalty: -2 },
                      { name: 'Solar Flare', icon: '\u2604\uFE0F', effect: 'Energy surge! Equipment overloaded', res: 'energy', penalty: -3 },
                      { name: 'Ice Rain', icon: '\uD83C\uDF28\uFE0F', effect: 'Frozen pipes, water loss', res: 'water', penalty: -2 }
                    ];
                    var wIdx = Math.floor(Math.random() * weatherTypes.length);
                    var wx = weatherTypes[wIdx];
                    upd('colonyWeather', wx);
                    if (wx) {
                      var weatherPenalty = wx.penalty;
                      if (buildings.indexOf('shield') >= 0) weatherPenalty = Math.ceil(weatherPenalty / 2);
                      nr2[wx.res] = Math.max(0, nr2[wx.res] + weatherPenalty);
                    }
                    // Colony milestones
                    var milestones = [
                      { id: 'first_build', check: buildings.length >= 1, text: '\uD83C\uDFD7 First Construction!', xp: 15 },
                      { id: 'tier2', check: buildings.indexOf('lab') >= 0 || buildings.indexOf('medbay') >= 0, text: '\uD83D\uDD2C Tier 2 Unlocked!', xp: 25 },
                      { id: 'tier3', check: buildings.indexOf('atmo') >= 0 || buildings.indexOf('fusion') >= 0, text: '\u2622\uFE0F Advanced Tech!', xp: 40 },
                      { id: 'self_sustain', check: nr2.food >= 30 && nr2.energy >= 30 && nr2.water >= 30, text: '\uD83C\uDF3E Self-Sustaining!', xp: 30 },
                      { id: 'full_colony', check: buildings.length >= 8, text: '\uD83C\uDFD9\uFE0F Full Colony!', xp: 50 },
                      { id: 'pop20', check: settlers.length >= 20, text: '\uD83D\uDC65 20 Settlers!', xp: 40 },
                      { id: 'pop35', check: settlers.length >= 35, text: '\uD83C\uDFD8\uFE0F Thriving Town!', xp: 60 },
                      { id: 'pop50', check: settlers.length >= 50, text: '\uD83C\uDFD9\uFE0F Population Victory!', xp: 100 },
                      { id: 'research5', check: researchQueue.length >= 5, text: '\uD83E\uDDEC Half Researched!', xp: 40 },
                      { id: 'research10', check: researchQueue.length >= 10, text: '\uD83C\uDF1F Research Victory!', xp: 100 },
                      { id: 'allbuildings', check: buildings.length >= 16, text: '\uD83C\uDFD7\uFE0F Master Builder!', xp: 80 },
                      { id: 'terraform25', check: newTf >= 25, text: '\uD83C\uDF27\uFE0F First Clouds!', xp: 20 },
                      { id: 'terraform50', check: newTf >= 50, text: '\uD83C\uDF31 Microorganisms!', xp: 30 },
                      { id: 'terraform75', check: newTf >= 75, text: '\uD83C\uDF24\uFE0F Atmosphere Forming!', xp: 40 },
                      { id: 'master', check: stats.questionsAnswered >= 10 && stats.correct / Math.max(1, stats.questionsAnswered) >= 0.8, text: '\uD83C\uDFAF Science Master!', xp: 50 }
                    ];
                    var achieved = d.colonyMilestones || {};
                    milestones.forEach(function (ms) {
                      if (ms.check && !achieved[ms.id]) {
                        achieved[ms.id] = true;
                        if (addToast) addToast(ms.text, 'success');
                        if (d.colonyTTS) colonySpeak('Milestone achieved. ' + ms.text.replace(/[^a-zA-Z0-9 ]/g, ''), 'narrator');
                        if (typeof addXP === 'function') addXP(ms.xp, ms.text);
                        var nl9 = gameLog.slice(); nl9.push('\uD83C\uDFC6 ' + ms.text); upd('colonyLog', nl9);
                      }
                    });
                    upd('colonyMilestones', achieved);
                    // Maintenance challenge every 8 turns (if buildings exist)
                    if (buildings.length > 0 && (nt - (d.lastMaintTurn || 0)) >= 8) {
                      upd('lastMaintTurn', nt);
                      // Pick a random built building for maintenance
                      var maintBuild = buildings[Math.floor(Math.random() * buildings.length)];
                      var maintDef = buildingDefs.find(function (bd3) { return bd3.id === maintBuild; });
                      if (maintDef) {
                        upd('maintChallengeLoading', true);
                        var modeStr = (d.colonyMode || 'mcq') === 'mcq' ? 'Return ONLY valid JSON: {"question":"<science question about ' + maintDef.gate + '>","options":["<correct>","<wrong1>","<wrong2>","<wrong3>","<wrong4>","<wrong5>"],"correctIndex":0,"explanation":"<why correct, 2-3 sentences with real science>"}. Generate exactly 6 options. Shuffle correct answer randomly (position 0-5). correctIndex must match.' : 'Return ONLY valid JSON: {"question":"<science question about ' + maintDef.gate + '>","answer":"<correct answer, 1-3 words>","explanation":"<why correct, 2-3 sentences with real science>"}';
                        callGemini('Generate a ' + maintDef.gate + ' science question for maintaining the ' + maintDef.name + ' in a space colony on an alien planet. The question should test understanding of the science behind this building. Difficulty: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '. ' + modeStr, true).then(function (result) {
                          try {
                            var cl2 = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                            var s3 = cl2.indexOf('{'); if (s3 > 0) cl2 = cl2.substring(s3);
                            var e3 = cl2.lastIndexOf('}'); if (e3 > 0) cl2 = cl2.substring(0, e3 + 1);
                            var mq = JSON.parse(cl2);
                            mq.building = maintBuild; mq.buildingName = maintDef.name; mq.buildingIcon = maintDef.icon;
                            upd('maintChallenge', mq); upd('maintChallengeLoading', false);
                            if (d.colonyTTS) colonySpeak('Maintenance alert. Your ' + maintDef.name + ' requires a systems check. Answer the science challenge to maintain full output.', 'narrator');
                            var nl7 = gameLog.slice(); nl7.push('\uD83D\uDD27 Turn ' + nt + ': ' + maintDef.icon + ' ' + maintDef.name + ' needs maintenance!'); upd('colonyLog', nl7);
                          } catch (err) { upd('maintChallengeLoading', false); }
                        }).catch(function () { upd('maintChallengeLoading', false); });
                      }
                    }
                    nr2.water = Math.max(0, nr2.water - Math.ceil(settlers.length * 0.5));
                    // Turn Summary — compute deltas
                    var _turnSummary = {
                      turn: nt,
                      deltas: {
                        food: nr2.food - _preRes.food,
                        energy: nr2.energy - _preRes.energy,
                        water: nr2.water - _preRes.water,
                        materials: nr2.materials - _preRes.materials,
                        science: nr2.science - _preRes.science
                      },
                      weather: wx ? wx.name : null,
                      terraform: newTf,
                      tfGain: tfGain,
                      happiness: newHappy,
                      population: settlers.length,
                      era: era,
                      events: []
                    };
                    if (wx) _turnSummary.events.push(wx.icon + ' ' + wx.name);
                    if (newHappy < 30) _turnSummary.events.push('\uD83D\uDE21 Colony Unrest');
                    if (newHappy > 80) _turnSummary.events.push('\u2728 Golden Age');
                    upd('turnSummary', _turnSummary);
                    // ══ Apply Fate Roll Effects ══
                    if (fateRoll) {
                      var ft = fateRoll.result.type;
                      if (ft === 'disaster') { nr2.food -= 5; nr2.energy -= 5; nr2.water -= 3; nr2.materials -= 3; }
                      else if (ft === 'hazard') { nr2.food -= 3; nr2.energy -= 2; }
                      else if (ft === 'challenge') { var rk = ['food','energy','water','materials'][Math.floor(Math.random()*4)]; nr2[rk] -= 1; }
                      else if (ft === 'discovery') { nr2.science += 3; nr2.materials += 2; }
                      else if (ft === 'windfall') { nr2.food += 5; nr2.energy += 5; nr2.water += 3; nr2.materials += 3; }
                      else if (ft === 'settlers') {
                        var newNames = ['Dr. Nova','Eng. Cosmos','Sci. Orbit','Med. Luna','Cap. Vega','Prof. Zenith','Lt. Pulsar'];
                        var newRoles = ['Xenobiologist','Roboticist','Geologist','Surgeon','Pilot','Astrophysicist','Tactician'];
                        var ni = Math.floor(Math.random() * newNames.length);
                        var ns2 = settlers.slice(); ns2.push({ name: newNames[ni], role: newRoles[ni], icon: ['\uD83E\uDDD1\u200D\uD83D\uDD2C','\uD83E\uDDD1\u200D\uD83D\uDE80','\uD83E\uDDD1\u200D\uD83C\uDFED','\uD83E\uDDD1\u200D\u2695\uFE0F'][ni%4], morale: 80 });
                        upd('colonySettlers', ns2);
                        if (addToast) addToast('\uD83D\uDE80 New settler: ' + newNames[ni] + ' (' + newRoles[ni] + ')!', 'success');
                      }
                      else if (ft === 'jackpot') { nr2.food += 8; nr2.energy += 8; nr2.water += 8; nr2.materials += 8; nr2.science += 5; }
                      ['food','energy','water','materials','science'].forEach(function(rk2) { if (nr2[rk2] < 0) nr2[rk2] = 0; });
                    }
                    // ══ Generate Dawn Data for Next Turn ══
                    var _incomeDeltas = { food: nr2.food - _preRes.food, energy: nr2.energy - _preRes.energy, water: nr2.water - _preRes.water, materials: nr2.materials - _preRes.materials, science: nr2.science - _preRes.science };
                    var _discovery = Math.random() < 0.2 ? [
                      { icon: '\uD83D\uDD2D', label: 'Stellar Anomaly', desc: 'Telescopes detect unusual radiation patterns.' },
                      { icon: '\uD83E\uDDA0', label: 'Microbe Colony', desc: 'Alien microorganisms found in soil samples!' },
                      { icon: '\uD83D\uDC8E', label: 'Crystal Formation', desc: 'Energy-dense crystals detected underground.' },
                      { icon: '\uD83C\uDF0B', label: 'Thermal Vent', desc: 'A geothermal hotspot for energy harvesting.' },
                      { icon: '\uD83D\uDDFF', label: 'Ancient Marker', desc: 'A structure of unknown origin uncovered.' }
                    ][Math.floor(Math.random() * 5)] : null;
                    upd('dawnData', { turn: nt, income: _incomeDeltas, weather: wx ? wx.name : null, discovery: _discovery, isFirst: false });
                    upd('turnPhase', 'dawn'); upd('actionPoints', maxAP); upd('builtThisTurn', false);
                    upd('fateRoll', null); upd('fateAnimating', false);
                    upd('colonyRes', nr2); upd('colonyTurn', nt); upd('colonyEventLoading', true);
                    var ctx2 = 'Colony on Kepler-442b, turn ' + nt + '. Resources: food=' + nr2.food + ' energy=' + nr2.energy + ' water=' + nr2.water + ' materials=' + nr2.materials + ' science=' + nr2.science + '. Buildings: ' + (buildings.length > 0 ? buildings.join(', ') : 'none') + '. ' + settlers.length + ' settlers. Terraforming: ' + newTf + '%. ' + (wx ? 'Current weather: ' + wx.name + '. ' : 'Weather: calm. ') + 'Tech tier reached: ' + (buildings.indexOf('biodome') >= 0 ? 4 : buildings.indexOf('atmo') >= 0 || buildings.indexOf('fusion') >= 0 ? 3 : buildings.indexOf('lab') >= 0 || buildings.indexOf('medbay') >= 0 ? 2 : buildings.length > 0 ? 1 : 0) + '.';
                    callGemini('You are the AI game master for an educational space colony on an alien planet. Target audience: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '. Colony values: collectivism=' + colonyValues.collectivism + ', innovation=' + colonyValues.innovation + ', ecology=' + colonyValues.ecology + ', tradition=' + colonyValues.tradition + ', openness=' + colonyValues.openness + '. Equity: ' + equity + '/100. Sometimes let colony values influence event themes (high ecology = nature events, high tradition = cultural discovery events, low equity = social tension events). ' + ctx2 + '\n\nGenerate a planet event. Include a REAL science concept. Return ONLY valid JSON:\n{"emoji":"<emoji>","title":"<event>","description":"<2-3 sentences>","lesson":"<real science concept, 2-3 sentences>","choices":[{"label":"<choice>","effects":{"food":<n>,"energy":<n>,"water":<n>,"materials":<n>,"science":<n>,"morale":<n>},"outcome":"<result>"},{"label":"<choice>","effects":{"food":<n>,"energy":<n>,"water":<n>,"materials":<n>,"science":<n>,"morale":<n>},"outcome":"<result>"}]}\n\nEvents: alien microbes, geologic discoveries, meteor showers, equipment failures, resource finds, atmospheric anomalies, alien ruins. Effects: -5 to +10 resources, -15 to +15 morale. One choice should reward scientific knowledge.', true).then(function (result) {
                      try {
                        var cl = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim(); var s2 = cl.indexOf('{'); if (s2 > 0) cl = cl.substring(s2); var e2 = cl.lastIndexOf('}'); if (e2 > 0) cl = cl.substring(0, e2 + 1);
                        var parsed = JSON.parse(cl); upd('colonyEvent', parsed); upd('colonyEventLoading', false);
                        if (d.colonyTTS) colonySpeak(parsed.title + '. ' + parsed.description, 'narrator');
                        var nl2 = gameLog.slice(); nl2.push('Turn ' + nt + ': ' + (parsed.emoji || '') + ' ' + parsed.title); upd('colonyLog', nl2);
                      } catch (err) { upd('colonyEventLoading', false); if (addToast) addToast('Event failed to generate', 'error'); }
                    }).catch(function () { upd('colonyEventLoading', false); });
                    var ns5 = Object.assign({}, stats); ns5.turnsPlayed++; upd('colonyStats', ns5);
                    if (typeof addXP === 'function') addXP(5, 'Kepler Colony: Turn ' + nt);
                    // Rover per-turn processing
                    if (rovers.length > 0) {
                      var nrvs2 = rovers.map(function (rv2) {
                        var rvDef2 = getRoverDef(rv2.type);
                        var newRv = Object.assign({}, rv2);
                        // Reset moves each turn
                        newRv.movesLeft = rvDef2.maxMoves;
                        // Natural fuel regen +1
                        newRv.fuel = Math.min(rvDef2.maxFuel, newRv.fuel + 1);
                        newRv.status = 'idle';
                        // Science rover auto-collect
                        if (rv2.type === 'science' && mapData) {
                          var rvTile = mapData.tiles[rv2.y * mapSize + rv2.x];
                          if (rvTile && rvTile.explored) {
                            nr2.science = (nr2.science || 0) + 2;
                            var bonusType = rvTile.res;
                            if (bonusType && bonusType !== 'none' && nr2[bonusType] !== undefined) {
                              nr2[bonusType] += 1;
                            }
                          }
                        }
                        return newRv;
                      });
                      upd('colonyRovers', nrvs2);
                    }
                    // Population growth — food surplus attracts new settlers (Civ-inspired)
                    var foodSurplus = nr2.food - settlers.length * 2; // need 2x population in food
                    var growthRate = 0.15 + (activePolicy && activePolicy === 'agrarian' ? 0.075 : 0);
                    if (buildings.indexOf('spaceport') >= 0) growthRate += 0.1;
                    if (buildings.indexOf('cloning') >= 0) growthRate += 0.05;
                    if (foodSurplus > 0) {
                      var newPG = (d.colonyPopGrowth || 0) + growthRate;
                      if (newPG >= 1.0 && settlers.length < 50) {
                        // New settler arrives!
                        var newRoles = [
                          { name: 'Lt. Alex Rivera', role: 'Pilot', icon: '\u2708\uFE0F', specialty: 'physics' },
                          { name: 'Dr. Sarah Kim', role: 'Xenobiologist', icon: '\uD83E\uDDA0', specialty: 'biology' },
                          { name: 'Prof. Dimitri Volkov', role: 'Mathematician', icon: '\uD83D\uDCCA', specialty: 'math' },
                          { name: 'Eng. Fatima Hassan', role: 'Architect', icon: '\uD83C\uDFD7\uFE0F', specialty: 'geology' },
                          { name: 'Dr. Li Wei', role: 'Astronomer', icon: '\uD83D\uDD2D', specialty: 'physics' },
                          { name: 'Dr. Amara Osei', role: 'Biochemist', icon: '\uD83E\uDDEA', specialty: 'chemistry' },
                          { name: 'Sgt. Kofi Mensah', role: 'Security', icon: '\uD83D\uDEE1\uFE0F', specialty: 'geology' },
                          { name: 'Dr. Lucia Torres', role: 'Physician', icon: '\u2695\uFE0F', specialty: 'biology' },
                          { name: 'Dr. Hans Mueller', role: 'Climatologist', icon: '\uD83C\uDF0A', specialty: 'chemistry' },
                          { name: 'Eng. Priya Nair', role: 'Roboticist', icon: '\uD83E\uDD16', specialty: 'physics' },
                          { name: 'Dr. Jun Sato', role: 'Volcanologist', icon: '\uD83C\uDF0B', specialty: 'geology' },
                          { name: 'Prof. Anya Petrov', role: 'Astrophysicist', icon: '\u2B50', specialty: 'physics' },
                          { name: 'Dr. Maria Santos', role: 'Ecologist', icon: '\uD83C\uDF3F', specialty: 'biology' },
                          { name: 'Eng. David Park', role: 'Structural Eng.', icon: '\uD83C\uDFD7\uFE0F', specialty: 'math' },
                          { name: 'Dr. Fatou Diallo', role: 'Geneticist', icon: '\uD83E\uDDEC', specialty: 'biology' },
                          { name: 'Lt. Ivan Kozlov', role: 'Navigator', icon: '\uD83E\uDDED', specialty: 'math' },
                          { name: 'Dr. Aiko Tanabe', role: 'Microbiologist', icon: '\uD83E\uDDA0', specialty: 'biology' },
                          { name: 'Eng. Omar Ali', role: 'Energy Eng.', icon: '\u26A1', specialty: 'physics' },
                          { name: 'Dr. Elena Popova', role: 'Hydrologist', icon: '\uD83D\uDCA7', specialty: 'chemistry' },
                          { name: 'Prof. Chen Guang', role: 'Seismologist', icon: '\uD83C\uDF0D', specialty: 'geology' },
                          { name: 'Dr. Sofia Romano', role: 'Botanist II', icon: '\uD83C\uDF3A', specialty: 'biology' },
                          { name: 'Eng. James Okafor', role: 'Systems Eng.', icon: '\u2699\uFE0F', specialty: 'math' },
                          { name: 'Dr. Mei Lin', role: 'Pharmacologist', icon: '\uD83D\uDC8A', specialty: 'chemistry' },
                          { name: 'Lt. Rosa Martinez', role: 'Comms Officer', icon: '\uD83D\uDCE1', specialty: 'physics' }
                        ];
                        var available = newRoles.filter(function (nr7) { return !settlers.some(function (s5) { return s5.name === nr7.name; }); });
                        if (available.length > 0) {
                          var newSettler = Object.assign({}, available[Math.floor(Math.random() * available.length)], { morale: 85, health: 100 });
                          var updSettlers = settlers.slice(); updSettlers.push(newSettler);
                          upd('colonySettlers', updSettlers);
                          var nl13 = gameLog.slice(); nl13.push('\uD83D\uDC64 ' + newSettler.name + ' (' + newSettler.role + ') joined the colony!'); upd('colonyLog', nl13);
                          if (addToast) addToast('\uD83D\uDC64 New settler: ' + newSettler.name + ' (' + newSettler.role + ')!', 'success');
                          if (d.colonyTTS) colonySpeak('New colonist arrived. ' + newSettler.name + ', a ' + newSettler.role + ', has joined the team.', 'narrator');
                        }
                        newPG -= 1.0;
                      }
                      upd('colonyPopGrowth', newPG);
                    }

                    // Era progression
                    var newEra = era;
                    if (era === 'survival' && buildings.length >= 4 && settlers.length >= 8) newEra = 'expansion';
                    else if (era === 'expansion' && buildings.length >= 8 && newTf >= 30 && researchQueue.length >= 3) newEra = 'prosperity';
                    else if (era === 'prosperity' && buildings.length >= 14 && newTf >= 60 && settlers.length >= 25) newEra = 'transcendence';
                    if (newEra !== era) {
                      upd('colonyEra', newEra);
                      var eraInfo = eraData[newEra];
                      if (addToast) addToast(eraInfo.icon + ' ERA: ' + eraInfo.name + '!', 'success');
                      if (d.colonyTTS) colonySpeak('New era reached! The colony has entered the ' + eraInfo.name + ' era.', 'narrator');
                      var nl14 = gameLog.slice(); nl14.push('\uD83C\uDF1F ERA: ' + eraInfo.name + '!'); upd('colonyLog', nl14);
                      if (typeof addXP === 'function') addXP(40, 'Era: ' + eraInfo.name);
                    }

                    // Colony Charter (generated once at turn 20 from colony values)
                    if (nt === 20 && !d.colonyCharter) {
                      callGemini('Generate a founding charter for a space colony on planet Kepler-442b. The colony has these values: collectivism=' + colonyValues.collectivism + ', innovation=' + colonyValues.innovation + ', ecology=' + colonyValues.ecology + ', tradition=' + colonyValues.tradition + ', openness=' + colonyValues.openness + '. Equity: ' + equity + '. They have adopted these cultural traditions: ' + (traditions.length > 0 ? traditions.join(', ') : 'none yet') + '. Write a brief founding charter (4-5 sentences) that reflects these values. It should feel like a real historical document — inspirational, specific, and grounded in the colony\u2019s unique blend of cultures and science. Do NOT use bullet points. Write it as flowing prose.', true).then(function (charter) {
                        upd('colonyCharter', charter);
                        if (d.colonyTTS) colonySpeak('The colony charter has been drafted. A founding document for a new civilization.', 'narrator');
                        var nl29 = gameLog.slice(); nl29.push('\uD83D\uDCDC Colony Charter drafted!'); upd('colonyLog', nl29);
                        if (addToast) addToast('\uD83D\uDCDC Colony Charter drafted from your values!', 'success');
                        if (typeof addXP === 'function') addXP(30, 'Colony Charter');
                      });
                    }

                    // Alien first contact (turn 10+, once)
                    if (nt >= 10 && !d.alienContact && Math.random() < 0.3) {
                      upd('alienContact', true); upd('alienRelations', 0);
                      var nl18 = gameLog.slice(); nl18.push('\uD83D\uDC7E FIRST CONTACT: The Keth\u2019ora detected!'); upd('colonyLog', nl18);
                      if (addToast) addToast('\uD83D\uDC7E First Contact! An alien species has been detected!', 'success');
                      if (d.colonyTTS) colonySpeak('Alert! Alien life detected. The indigenous Kethora species has made contact. They communicate through bioluminescent patterns.', 'narrator');
                      if (typeof addXP === 'function') addXP(50, 'First Contact!');
                    }

                    // Governance Dilemma (NationStates-style — every 5 turns)
                    if (nt > 2 && nt % 5 === 0 && !d.activeDilemma) {
                      var valStr = Object.keys(colonyValues).map(function (k2) { return k2 + ':' + colonyValues[k2]; }).join(', ');
                      upd('dilemmaLoading', true);
                      callGemini('You are creating a governance dilemma for a space colony on alien planet Kepler-442b. Colony values: ' + valStr + '. Equity: ' + equity + '/100. Population: ' + settlers.length + '. This colony values diverse knowledge traditions. Create a nuanced moral/political/cultural dilemma with NO clear right answer (like NationStates). The dilemma should involve balancing competing goods (e.g. innovation vs tradition, individual freedom vs collective welfare, rapid growth vs sustainability, scientific progress vs cultural preservation). Sometimes draw on wisdom from real-world cultural traditions (African, Indigenous, Asian, etc.) as viable solutions. Difficulty: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '. Return ONLY valid JSON: {"emoji":"<emoji>","title":"<dilemma>","description":"<3-4 sentence scenario>","choices":[{"text":"<choice A>","values":{"collectivism":<-10 to 10>,"innovation":<-10 to 10>,"ecology":<-10 to 10>,"tradition":<-10 to 10>,"openness":<-10 to 10>},"equity":<-10 to 10>,"happiness":<-5 to 5>,"outcome":"<1-2 sentence result>"},{"text":"<choice B>","values":{same},"equity":<-10 to 10>,"happiness":<-5 to 5>,"outcome":"<result>"},{"text":"<choice C>","values":{same},"equity":<-10 to 10>,"happiness":<-5 to 5>,"outcome":"<result>"}],"lesson":"<real social science or cultural insight, 2-3 sentences>"}', true).then(function (result) {
                        try {
                          var cl7 = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                          var s8 = cl7.indexOf('{'); if (s8 > 0) cl7 = cl7.substring(s8);
                          var e8 = cl7.lastIndexOf('}'); if (e8 > 0) cl7 = cl7.substring(0, e8 + 1);
                          var dil = JSON.parse(cl7);
                          upd('activeDilemma', dil); upd('dilemmaLoading', false);
                          if (d.colonyTTS) colonySpeak('Colony council convenes. ' + dil.title + '. ' + dil.description, 'narrator');
                          var nl25 = gameLog.slice(); nl25.push('\uD83C\uDFDB\uFE0F Dilemma: ' + dil.title); upd('colonyLog', nl25);
                        } catch (err) { upd('dilemmaLoading', false); }
                      }).catch(function () { upd('dilemmaLoading', false); });
                    }

                    // Major disaster (rare — every ~20 turns)
                    if (nt > 1 && nt % 20 === 0 && Math.random() < 0.5) {
                      upd('disasterLoading', true);
                      callGemini('Generate a MAJOR disaster event for a space colony on alien planet Kepler-442b. Turn ' + nt + '. Difficulty: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '. The disaster should be science-based (asteroid impact, volcanic eruption, alien plague, equipment catastrophe, radiation storm). Return ONLY valid JSON: {"emoji":"<emoji>","title":"<disaster name>","description":"<dramatic 3-4 sentences>","lesson":"<real science about this type of disaster, 2-3 sentences>","question":"<science question to mitigate damage>","options":["<correct mitigation>","<wrong1>","<wrong2>","<wrong3>","<wrong4>","<wrong5>"],"correctIndex":0,"fullDamage":{"food":<-5 to -15>,"energy":<-5 to -15>,"water":<-5 to -15>,"materials":<-5 to -15>,"morale":<-10 to -20>},"mitigatedDamage":{"food":<0 to -5>,"energy":<0 to -5>,"water":<0 to -5>,"materials":<0 to -5>,"morale":<-3 to -8>}}. Shuffle correct answer (0-5).', true).then(function (result) {
                        try {
                          var cl6 = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                          var s7 = cl6.indexOf('{'); if (s7 > 0) cl6 = cl6.substring(s7);
                          var e7 = cl6.lastIndexOf('}'); if (e7 > 0) cl6 = cl6.substring(0, e7 + 1);
                          var dis = JSON.parse(cl6);
                          upd('activeDisaster', dis); upd('disasterLoading', false);
                          var nl24 = gameLog.slice(); nl24.push('\uD83D\uDCA5 DISASTER: ' + dis.title + '!'); upd('colonyLog', nl24);
                          if (d.colonyTTS) colonySpeak('Emergency alert! ' + dis.title + '! ' + dis.description, 'narrator');
                        } catch (err) { upd('disasterLoading', false); }
                      }).catch(function () { upd('disasterLoading', false); });
                    }

                    // Happiness mechanic
                    var newHappy = d.colonyHappiness || 70;
                    if (nr2.food > settlers.length * 2) newHappy = Math.min(100, newHappy + 2);
                    else if (nr2.food < settlers.length) newHappy = Math.max(0, newHappy - 5);
                    if (buildings.indexOf('medbay') >= 0) newHappy = Math.min(100, newHappy + 1);
                    var avgMorale = settlers.reduce(function (sum, s6) { return sum + s6.morale; }, 0) / Math.max(1, settlers.length);
                    if (avgMorale < 50) newHappy = Math.max(0, newHappy - 3);
                    if (wx) newHappy = Math.max(0, newHappy - 2);
                    upd('colonyHappiness', newHappy);

                    // Happiness affects production (Civ-style)
                    if (newHappy < 30) {
                      // Unrest — 50% production penalty
                      nr2.food = Math.max(0, Math.floor(nr2.food * 0.8));
                      nr2.materials = Math.max(0, Math.floor(nr2.materials * 0.8));
                      if (addToast) addToast('\uD83D\uDE21 Colony unrest! Production reduced!', 'warning');
                    } else if (newHappy > 80) {
                      // Golden age — bonus production
                      nr2.science += 2;
                      nr2.food += 1;
                    }

                    // Achievement check
                    var newAch = Object.assign({}, achievements);
                    var achChanged = false;
                    achievementDefs.forEach(function (ad) {
                      if (!newAch[ad.id] && ad.check()) {
                        newAch[ad.id] = { turn: nt, ts: Date.now() };
                        achChanged = true;
                        if (addToast) addToast(ad.icon + ' Achievement: ' + ad.name + '!', 'success');
                        if (d.colonyTTS) colonySpeak('Achievement unlocked. ' + ad.name + '. ' + ad.desc, 'narrator');
                        var nl31 = gameLog.slice(); nl31.push(ad.icon + ' Achievement: ' + ad.name); upd('colonyLog', nl31);
                        if (typeof addXP === 'function') addXP(20, 'Achievement: ' + ad.name);
                      }
                    });
                    if (achChanged) upd('colonyAchievements', newAch);

                    // Streak tracking
                    var ns9 = Object.assign({}, stats);
                    if (!ns9.streak) ns9.streak = 0;
                    upd('colonyStats', ns9);

                    // Colony Radio — AI broadcast every 8 turns
                    if (nt > 3 && nt % 8 === 0) {
                      callGemini('You are the radio host for a space colony called "' + colonyName + '" on planet Kepler-442b. Give a brief radio news broadcast (3-4 sentences) reporting on recent colony events. Turn: ' + nt + '. Population: ' + settlers.length + '. Buildings: ' + buildings.length + '. Terraform: ' + terraform + '%. Era: ' + era + '. Season: ' + ((seasonDefs[(seasonCycle || {}).index] || {}).name || 'Calm') + '. Recent events from log: ' + gameLog.slice(-5).join('; ') + '. Make it feel like a real news broadcast — upbeat, informative, with a sign-off. Grade level: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '.', true).then(function (broadcast) {
                        upd('colonyRadio', broadcast);
                        if (d.colonyTTS) colonySpeak(broadcast, 'narrator');
                      });
                    }

                    // Settler celebrations (happiness > 85) or protests (happiness < 25)
                    if (newHappy > 85 && nt % 10 === 0) {
                      var nl32 = gameLog.slice(); nl32.push('\uD83C\uDF89 Colony Celebration! Settlers throw a festival!'); upd('colonyLog', nl32);
                      if (addToast) addToast('\uD83C\uDF89 Colony Celebration! +5 happiness, +10 XP!', 'success');
                      newHappy = Math.min(100, newHappy + 5); upd('colonyHappiness', newHappy);
                      if (typeof addXP === 'function') addXP(10, 'Colony Festival');
                    } else if (newHappy < 25 && nt % 7 === 0) {
                      var nl33 = gameLog.slice(); nl33.push('\u270A Settler Protest! Demanding better conditions!'); upd('colonyLog', nl33);
                      if (addToast) addToast('\u270A Settler Protest! Productivity drops!', 'warning');
                      nr2.food = Math.max(0, nr2.food - 3); nr2.materials = Math.max(0, nr2.materials - 3);
                    }

                    // Great Scientist arrival (every 15 turns + high science)
                    if (nt % 15 === 0 && nr2.science >= 10 && greatScientists.length < greatSciDefs.length) {
                      var availGS = greatSciDefs.filter(function (gs) { return !greatScientists.some(function (g) { return g.name === gs.name; }); });
                      if (availGS.length > 0) {
                        var gs2 = availGS[Math.floor(Math.random() * availGS.length)];
                        var updGS = greatScientists.slice(); updGS.push(gs2);
                        upd('colonyGreatSci', updGS);
                        // Apply bonus permanently
                        if (gs2.bonus && nr2[gs2.bonus] !== undefined) nr2[gs2.bonus] += gs2.amount;
                        var nl15 = gameLog.slice(); nl15.push('\uD83E\uDD16 Mentor: ' + gs2.name + ' AI activated (+' + gs2.amount + ' ' + gs2.bonus + '/turn)'); upd('colonyLog', nl15);
                        if (addToast) addToast('\uD83E\uDD16 ' + gs2.icon + ' ' + gs2.name + ' AI activated! ' + gs2.fact, 'success');
                        if (d.colonyTTS) colonySpeak('Digital Mentor activated. The AI reconstruction of ' + gs2.name + ' is now online. ' + gs2.fact, 'narrator');
                        if (typeof addXP === 'function') addXP(30, 'Mentor: ' + gs2.name);
                      }
                    }

                    // Season bonuses
                    if (activeSeason.effect.materialBonus) nr2.materials += activeSeason.effect.materialBonus;
                    if (activeSeason.effect.energyBonus) nr2.energy += activeSeason.effect.energyBonus;
                    if (activeSeason.effect.heal) settlers.forEach(function (s9) { s9.health = Math.min(100, s9.health + activeSeason.effect.heal); });

                    // Apply policy bonuses to resources
                    if (activePolicy) {
                      var pol = policyDefs.find(function (p) { return p.id === activePolicy; });
                      if (pol && pol.effect) {
                        if (pol.effect.materialBonus) nr2.materials += pol.effect.materialBonus;
                        if (pol.effect.foodBonus) nr2.food += pol.effect.foodBonus;
                        if (pol.effect.energyBonus) nr2.energy += pol.effect.energyBonus;
                      }
                    }

                    // Tile improvement bonuses (outposts) + trade routes
                    var outpostKeys = Object.keys(tileImprovements);
                    var tradeRoutes = 0;
                    outpostKeys.forEach(function (tKey2) {
                      var imp = tileImprovements[tKey2];
                      if (imp && imp.res && nr2[imp.res] !== undefined) nr2[imp.res] += 1;
                      // Check for adjacent outposts = trade route
                      var coords = tKey2.split(','); var ox = parseInt(coords[0]); var oy = parseInt(coords[1]);
                      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (dd) {
                        var adjKey = (ox + dd[0]) + ',' + (oy + dd[1]);
                        if (tileImprovements[adjKey] && adjKey > tKey2) tradeRoutes++;
                      });
                    });
                    // Trade route bonus: +1 of each resource per route
                    if (tradeRoutes > 0) {
                      nr2.food += tradeRoutes; nr2.materials += tradeRoutes; nr2.science += tradeRoutes;
                    }

                    // Expedition progress
                    if (activeExpedition) {
                      var exp = Object.assign({}, activeExpedition);
                      var expSpeed = traditions.indexOf('dreamtime') >= 0 ? 2 : 1;
                      exp.turnsLeft = (exp.turnsLeft || 0) - expSpeed;
                      if (exp.turnsLeft <= 0) {
                        // Expedition complete — generate reward
                        upd('activeExpedition', null);
                        upd('expResultLoading', true);
                        callGemini('You are narrating a space colony expedition on alien planet Kepler-442b. A team of ' + (exp.teamSize || 3) + ' settlers went on a ' + exp.type + ' expedition to ' + exp.destination + '. Difficulty: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '. Generate the expedition result. Return ONLY valid JSON: {"title":"<discovery>","emoji":"<emoji>","narrative":"<exciting 3-4 sentence story of what happened>","lesson":"<real science concept learned, 2-3 sentences>","rewards":{"food":<0-15>,"energy":<0-15>,"water":<0-15>,"materials":<0-15>,"science":<5-20>},"terraformBonus":<0-5>,"newSettler":' + (settlers.length < 50 ? 'true or false' : 'false') + ',"settlerName":"<name if newSettler>","settlerRole":"<role if newSettler>"}', true).then(function (result) {
                          try {
                            var cl4 = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                            var s5 = cl4.indexOf('{'); if (s5 > 0) cl4 = cl4.substring(s5);
                            var e5 = cl4.lastIndexOf('}'); if (e5 > 0) cl4 = cl4.substring(0, e5 + 1);
                            var expR = JSON.parse(cl4);
                            upd('expResult', expR); upd('expResultLoading', false);
                            var nr11 = Object.assign({}, resources);
                            Object.keys(expR.rewards || {}).forEach(function (k) { if (nr11[k] !== undefined) nr11[k] += expR.rewards[k]; });
                            upd('colonyRes', nr11);
                            if (expR.terraformBonus) upd('colonyTerraform', Math.min(100, (d.colonyTerraform || 0) + expR.terraformBonus));
                            if (expR.newSettler && expR.settlerName && settlers.length < 50) {
                              var ns7 = settlers.slice();
                              ns7.push({ name: expR.settlerName, role: expR.settlerRole || 'Explorer', icon: '\uD83E\uDDD1\u200D\uD83D\uDE80', specialty: 'physics', morale: 90, health: 100 });
                              upd('colonySettlers', ns7);
                            }
                            // Add to science journal
                            if (expR.lesson) {
                              var nj = scienceJournal.slice();
                              nj.push({ turn: turn, source: 'Expedition: ' + expR.title, fact: expR.lesson });
                              upd('scienceJournal', nj);
                            }
                            var nl21 = gameLog.slice(); nl21.push('\u26F5 Expedition: ' + expR.title); upd('colonyLog', nl21);
                            if (addToast) addToast('\u26F5 Expedition complete: ' + expR.title, 'success');
                            if (d.colonyTTS) colonySpeak('Expedition report. ' + expR.title + '. ' + expR.narrative, 'narrator');
                            if (typeof addXP === 'function') addXP(25, 'Expedition: ' + expR.title);
                          } catch (err) { upd('expResultLoading', false); }
                        }).catch(function () { upd('expResultLoading', false); });
                      } else {
                        upd('activeExpedition', exp);
                      }
                    }

                    // Cultural Tradition bonuses
                    traditions.forEach(function (tid) {
                      var tdef = traditionDefs.find(function (td2) { return td2.id === tid; });
                      if (tdef && tdef.bonus) {
                        if (tdef.bonus.food) nr2.food += tdef.bonus.food;
                        if (tdef.bonus.water) nr2.water += tdef.bonus.water;
                        if (tdef.bonus.materials) nr2.materials += tdef.bonus.materials;
                        if (tdef.bonus.science) nr2.science += tdef.bonus.science;
                        if (tdef.bonus.terraform) { var tfC = Math.min(100, (d.colonyTerraform || 0) + tdef.bonus.terraform); upd('colonyTerraform', tfC); }
                        if (tdef.bonus.repair) {
                          // Kintsugi: repair 10% effectiveness on all buildings
                          var repEff = Object.assign({}, buildingEff);
                          buildings.forEach(function (b2) { if (repEff[b2] !== undefined && repEff[b2] < 100) repEff[b2] = Math.min(100, repEff[b2] + 10); });
                          upd('buildingEff', repEff);
                        }
                      }
                    });

                    // Equity effects
                    if (equity < 25) {
                      newHappy = Math.max(0, newHappy - 5);
                      if (nt % 5 === 0) { var nl26 = gameLog.slice(); nl26.push('\u26A0\uFE0F Inequality crisis! Settlers dissatisfied with resource distribution.'); upd('colonyLog', nl26); }
                    } else if (equity > 75) {
                      newHappy = Math.min(100, newHappy + 2);
                      nr2.science += 2; // equitable societies innovate better
                    }

                    // Wonder bonuses
                    if (wonders.terraformEngine) { var tfW = Math.min(100, (d.colonyTerraform || 0) + 5); upd('colonyTerraform', tfW); }
                    if (wonders.arkVault) { nr2.food += 8; nr2.science += 5; }
                    if (wonders.quantumGate) { nr2.science += 10; }

                    // Alien alliance bonuses
                    if (alienContact && alienRelations >= 50) {
                      nr2.science += 3; nr2.water += 2;
                    }
                    // Apply research bonuses
                    researchQueue.forEach(function (rid) {
                      var rdef = researchDefs.find(function (rd) { return rd.id === rid; });
                      if (rdef && rdef.bonus) {
                        if (rdef.bonus.food) nr2.food += rdef.bonus.food;
                        if (rdef.bonus.water) nr2.water += rdef.bonus.water;
                        if (rdef.bonus.science) nr2.science += rdef.bonus.science;
                        if (rdef.bonus.terraformBonus) { var tfb = Math.min(100, newTf + rdef.bonus.terraformBonus); upd('colonyTerraform', tfb); }
                      }
                    });

                    // Great Scientists permanent bonus
                    greatScientists.forEach(function (gs3) { if (gs3.bonus && nr2[gs3.bonus] !== undefined) nr2[gs3.bonus] += gs3.amount; });

                    // Emergency events for critical resources
                    if (nr2.food <= 3 && buildings.length > 0) {
                      var nl10 = gameLog.slice(); nl10.push('\uD83D\uDEA8 EMERGENCY: Food critically low! Build Hydroponics or explore for food!'); upd('colonyLog', nl10);
                      if (d.colonyTTS) colonySpeak('Emergency! Food reserves critically low. Settlers are at risk of starvation. Prioritize food production immediately.', 'narrator');
                    }
                    if (nr2.energy <= 2 && buildings.length > 0) {
                      var nl11 = gameLog.slice(); nl11.push('\uD83D\uDEA8 EMERGENCY: Energy critical! Buildings may shut down!'); upd('colonyLog', nl11);
                      if (d.colonyTTS) colonySpeak('Warning! Energy levels critical. Colony systems are at risk of shutdown.', 'narrator');
                    }
                    if (nr2.water <= 2 && buildings.length > 0) {
                      var nl12 = gameLog.slice(); nl12.push('\uD83D\uDEA8 EMERGENCY: Water reserves depleted!'); upd('colonyLog', nl12);
                    }
                  },
                  disabled: d.colonyEventLoading, className: 'w-full py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]', style: { background: d.colonyEventLoading ? '#334155' : 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: d.colonyEventLoading ? '#64748b' : '#e0e7ff', boxShadow: d.colonyEventLoading ? 'none' : '0 4px 15px rgba(99,102,241,0.3)' }
                  }, d.colonyEventLoading ? '\u23F3 Processing...' : '\u2728 Continue to Dawn'),
                  (function() { return null; })()
                )
              ),
              // ── Turn Summary Pop-up ──
              d.turnSummary && !d.colonyEventLoading && React.createElement('div', {
                className: 'bg-gradient-to-r from-slate-800/95 to-indigo-900/95 rounded-xl p-3 border border-indigo-500/30 mb-3 relative',
                style: { animation: 'fadeIn 0.3s ease-out' }
              },
                React.createElement('button', {
                  onClick: function () { upd('turnSummary', null); },
                  className: 'absolute top-1 right-2 text-slate-500 hover:text-white text-sm', title: 'Dismiss'
                }, '\u2715'),
                React.createElement('div', { className: 'text-[10px] font-bold text-indigo-300 mb-1.5' }, '\uD83D\uDCCB Turn ' + d.turnSummary.turn + ' Report'),
                React.createElement('div', { className: 'grid grid-cols-5 gap-1 mb-1.5' },
                  [
                    ['\uD83C\uDF3E', 'Food', d.turnSummary.deltas.food, '#4ade80'],
                    ['\u26A1', 'Energy', d.turnSummary.deltas.energy, '#facc15'],
                    ['\uD83D\uDCA7', 'Water', d.turnSummary.deltas.water, '#38bdf8'],
                    ['\uD83E\uDEA8', 'Mat.', d.turnSummary.deltas.materials, '#94a3b8'],
                    ['\uD83D\uDD2C', 'Sci.', d.turnSummary.deltas.science, '#a78bfa']
                  ].map(function (rd) {
                    var val = rd[2]; var col = val > 0 ? '#4ade80' : val < 0 ? '#f87171' : '#64748b';
                    return React.createElement('div', { key: rd[1], className: 'text-center rounded-lg py-1', style: { backgroundColor: col + '15', border: '1px solid ' + col + '30' } },
                      React.createElement('div', { className: 'text-[9px]', style: { color: col } }, rd[0] + ' ' + (val > 0 ? '+' : '') + val),
                      React.createElement('div', { className: 'text-[7px] text-slate-500' }, rd[1])
                    );
                  })
                ),
                React.createElement('div', { className: 'flex gap-2 text-[8px] text-slate-400 flex-wrap' },
                  d.turnSummary.tfGain > 0 && React.createElement('span', { className: 'text-emerald-400' }, '\uD83C\uDF0D +' + d.turnSummary.tfGain + '% terraform (' + d.turnSummary.terraform + '%)'),
                  React.createElement('span', null, '\uD83D\uDE42 ' + d.turnSummary.happiness + '%'),
                  React.createElement('span', null, '\uD83D\uDC65 ' + d.turnSummary.population),
                  d.turnSummary.events.map(function (ev, ei) { return React.createElement('span', { key: ei, className: 'text-amber-300' }, ev); })
                )
              ),
              React.createElement('div', { className: 'flex gap-1 mb-3 flex-wrap' },
                selectedTile && selectedTile.tile.explored && selectedTile.tile.type !== 'colony' && React.createElement('button', {
                  onClick: function () {
                    var tKey = selectedTile.x + ',' + selectedTile.y;
                    if (!tileImprovements[tKey] && resources.materials >= 8) {
                      var nr10 = Object.assign({}, resources); nr10.materials -= 8; upd('colonyRes', nr10);
                      var newTI = Object.assign({}, tileImprovements);
                      newTI[tKey] = { type: 'outpost', tile: selectedTile.tile.type, res: selectedTile.tile.res };
                      upd('tileImprovements', newTI);
                      if (addToast) addToast('\uD83C\uDFD5\uFE0F Outpost built! +1 ' + selectedTile.tile.res + '/turn', 'success');
                      var nl20 = gameLog.slice(); nl20.push('\uD83C\uDFD5\uFE0F Outpost at (' + selectedTile.x + ',' + selectedTile.y + ')'); upd('colonyLog', nl20);
                    }
                  },
                  disabled: !selectedTile || tileImprovements[selectedTile.x + ',' + selectedTile.y] || resources.materials < 8,
                  className: 'py-2 rounded-xl text-[10px] font-bold ' + (selectedTile && !tileImprovements[selectedTile.x + ',' + selectedTile.y] && resources.materials >= 8 ? 'bg-orange-700 text-orange-200' : 'bg-slate-700 text-slate-500')
                }, '\uD83C\uDFD5\uFE0F Outpost (-8\uD83E\uDEA8)')
              ),
              // Terraforming Progress
              React.createElement('div', { className: 'rounded-xl p-3 border mb-3 relative overflow-hidden', style: { background: 'linear-gradient(135deg, #064e3b, #134e4a, #0f172a)', borderColor: terraform >= 50 ? '#10b981' : '#065f46', animation: terraform >= 100 ? 'kp-glow 2s infinite' : 'none' } },
                React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                  React.createElement('h4', { className: 'text-[10px] font-bold', style: { color: '#34d399' } }, '\uD83C\uDF0D Victory Progress'),
                  React.createElement('span', { className: 'text-xs font-black', style: { color: terraform >= 100 ? '#4ade80' : terraform >= 50 ? '#34d399' : '#6ee7b7', textShadow: '0 0 8px rgba(52,211,153,0.4)' } }, terraform + '%')
                ),
                React.createElement('div', { className: 'w-full rounded-full h-4 overflow-hidden', style: { background: '#1e293b', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' } },
                  React.createElement('div', { className: 'h-4 rounded-full transition-all', style: { width: terraform + '%', background: terraform >= 100 ? 'linear-gradient(90deg, #4ade80, #22d3ee)' : terraform >= 50 ? 'linear-gradient(90deg, #10b981, #14b8a6)' : 'linear-gradient(90deg, #6366f1, #10b981)', boxShadow: '0 0 12px rgba(16,185,129,0.4)', animation: 'kp-barFill 1.5s ease-out' } })
                ),
                React.createElement('div', { className: 'text-[8px] text-slate-400 mt-1' },
                  terraform >= 100 ? '\uD83C\uDF89 VICTORY! The planet is habitable! Your colony is self-sustaining!' :
                    terraform >= 75 ? 'Atmosphere thickening, water cycles forming. Almost habitable!' :
                      terraform >= 50 ? 'Microorganisms detected in soil. Oxygen levels rising.' :
                        terraform >= 25 ? 'Ice caps melting. First clouds forming in the sky.' :
                          'Raw alien world. Build Atmospheric Processor (+5%/turn) and Biodome (+10%/turn) to terraform.'
                ),
                // Victory Paths
                React.createElement('div', { className: 'mt-2 grid grid-cols-3 gap-1 text-[8px]' },
                  React.createElement('div', { className: 'p-1 rounded text-center ' + (terraform >= 100 ? 'bg-emerald-900/50 text-emerald-400' : 'text-slate-500') },
                    '\uD83C\uDF0D Terraform: ' + terraform + '/100%'
                  ),
                  React.createElement('div', { className: 'p-1 rounded text-center ' + (settlers.length >= 50 ? 'bg-teal-900/50 text-teal-400' : 'text-slate-500') },
                    '\uD83D\uDC65 Population: ' + settlers.length + '/50'
                  ),
                  React.createElement('div', { className: 'p-1 rounded text-center ' + (researchQueue.length >= 10 ? 'bg-violet-900/50 text-violet-400' : 'text-slate-500') },
                    '\uD83E\uDDEC Research: ' + researchQueue.length + '/10'
                  )
                ),
                terraform >= 100 && React.createElement('div', { className: 'mt-2 text-center' },
                  React.createElement('div', { className: 'text-3xl mb-1' }, '\uD83C\uDF89\uD83C\uDF0D\uD83D\uDE80'),
                  React.createElement('div', { className: 'text-sm font-bold text-green-400' }, 'COLONY VICTORY!'),
                  React.createElement('div', { className: 'text-[10px] text-green-300' }, 'Turn ' + turn + ' | ' + buildings.length + ' buildings | All ' + settlers.length + ' settlers survived')
                )
              ),
              // Colony Stats Dashboard
              React.createElement('div', { className: 'bg-slate-800/80 rounded-xl p-2 border border-slate-700 mb-3' },
                React.createElement('div', { className: 'flex gap-1.5 justify-center flex-wrap', style: { padding: '4px 0' } },
                  [
                    { icon: currentEra.icon, text: currentEra.name, color: currentEra.color },
                    { icon: '\uD83D\uDC65', text: settlers.length + ' crew', color: '#2dd4bf' },
                    { icon: '\uD83C\uDFAF', text: (stats.questionsAnswered > 0 ? Math.round(stats.correct / stats.questionsAnswered * 100) : 0) + '%', color: stats.questionsAnswered > 0 && stats.correct / stats.questionsAnswered >= 0.7 ? '#4ade80' : '#fbbf24' },
                    { icon: '\uD83C\uDFD7', text: stats.buildingsConstructed + ' built', color: '#22d3ee' },
                    { icon: '\u2728', text: stats.anomaliesExplored + ' anom', color: '#c084fc' },
                    { icon: colonyHappiness > 80 ? '\uD83D\uDE04' : colonyHappiness > 60 ? '\uD83D\uDE42' : colonyHappiness > 30 ? '\uD83D\uDE10' : '\uD83D\uDE21', text: colonyHappiness + '%', color: colonyHappiness > 60 ? '#4ade80' : colonyHappiness > 30 ? '#fbbf24' : '#ef4444' },
                    { icon: '\u2696\uFE0F', text: equity + '%', color: equity > 60 ? '#4ade80' : equity > 35 ? '#fbbf24' : '#ef4444' }
                  ].concat(alienContact ? [{ icon: '\uD83D\uDC7E', text: (alienRelations > 0 ? '+' : '') + alienRelations, color: alienRelations > 20 ? '#4ade80' : alienRelations < -20 ? '#ef4444' : '#fbbf24' }] : []).map(function(s, si3) {
                    return React.createElement('span', { key: si3, className: 'px-1.5 py-0.5 rounded-full text-[8px] font-bold', style: { background: s.color + '15', color: s.color, border: '1px solid ' + s.color + '25' } }, s.icon + ' ' + s.text);
                  })
                )
              ),
              // Weather indicator
              weather && React.createElement('div', { className: 'rounded-xl p-2.5 mb-3 flex items-center gap-3 relative overflow-hidden', style: { background: 'linear-gradient(135deg, #78350f, #451a03, #0f172a)', border: '1px solid #f59e0b40', animation: 'kp-fadeIn 0.5s ease-out' } },
                React.createElement('div', { className: 'absolute -right-4 -top-4 text-5xl opacity-10', style: { filter: 'blur(2px)' } }, weather.icon),
                React.createElement('div', { className: 'text-2xl flex-shrink-0', style: { animation: 'kp-pulse 3s infinite' } }, weather.icon),
                React.createElement('div', { className: 'flex-1' },
                  React.createElement('div', { className: 'text-[10px] font-bold', style: { color: '#fbbf24', textShadow: '0 0 8px rgba(251,191,36,0.3)' } }, '\u26A0\uFE0F Weather Alert: ' + weather.name),
                  React.createElement('div', { className: 'text-[9px] text-amber-300/70' }, weather.effect + ' (' + weather.penalty + ' ' + weather.res + ')')
                )
              ),
              // Event
              colonyEvent && React.createElement('div', { className: 'bg-gradient-to-r from-slate-800 to-indigo-900 rounded-xl p-4 border border-indigo-700 mb-3 relative overflow-hidden', style: { animation: 'kp-fadeIn 0.5s ease-out' } },
                React.createElement('div', { className: 'absolute top-0 right-0 w-24 h-24 opacity-10 text-6xl flex items-center justify-center', style: { filter: 'blur(2px)' } }, colonyEvent.emoji || '\u2728'),
                React.createElement('h3', { className: 'text-sm font-bold text-white mb-1', style: { textShadow: '0 0 10px rgba(99,102,241,0.5)' } }, (colonyEvent.emoji || '') + ' ' + colonyEvent.title),
                React.createElement('p', { className: 'text-xs text-slate-300 leading-relaxed' }, colonyEvent.description),
                colonyEvent.lesson && React.createElement('div', { className: 'mt-2 bg-indigo-950/80 rounded-lg px-3 py-2 text-[10px] text-indigo-300 border border-indigo-800/50 backdrop-blur-sm' }, React.createElement('span', { className: 'font-bold text-indigo-200' }, '\uD83D\uDCDA Science: '), colonyEvent.lesson),
                React.createElement('div', { className: 'grid gap-2 mt-3' }, (colonyEvent.choices || []).map(function (ch, ci2) {
                  return React.createElement('button', {
                    key: ci2, onClick: function () {
                      var ef2 = ch.effects || {}; var nr3 = Object.assign({}, resources);
                      Object.keys(ef2).forEach(function (k) { if (k === 'morale') { upd('colonySettlers', settlers.map(function (s3) { return Object.assign({}, s3, { morale: Math.max(0, Math.min(100, s3.morale + (ef2.morale || 0))) }); })); } else if (nr3[k] !== undefined) nr3[k] = Math.max(0, nr3[k] + ef2[k]); });
                      upd('colonyRes', nr3); upd('colonyEvent', null);
                      var nl3 = gameLog.slice(); nl3.push('  \u2192 ' + ch.label + ': ' + ch.outcome); upd('colonyLog', nl3);
                      if (colonyEvent.lesson) {
                        var nj2 = scienceJournal.slice();
                        nj2.push({ turn: turn, source: 'Event: ' + colonyEvent.title, fact: colonyEvent.lesson });
                        upd('scienceJournal', nj2);
                      }
                      if (addToast) addToast(ch.outcome, ef2.morale > 0 ? 'success' : ef2.morale < 0 ? 'warning' : 'info');
                      if (typeof addXP === 'function') addXP(15, 'Kepler Colony: Decision made');
                    }, className: 'w-full text-left p-3 rounded-xl border-2 border-slate-600 hover:border-indigo-400 transition-all text-xs text-slate-200 hover:scale-[1.02]', style: { background: 'linear-gradient(135deg, #1e293b, #312e81)' }
                  },
                    React.createElement('div', { className: 'font-bold text-white' }, ch.label),
                    React.createElement('div', { className: 'text-[9px] text-slate-400 mt-1 flex gap-2 flex-wrap' },
                      Object.keys(ch.effects || {}).filter(function (ek) { return ch.effects[ek] !== 0; }).map(function (ek) { return React.createElement('span', { key: ek, className: ch.effects[ek] > 0 ? 'text-green-400' : 'text-red-400' }, ek + ':' + (ch.effects[ek] > 0 ? '+' : '') + ch.effects[ek]); })
                    )
                  );
                }))
              ),
              // Governance Dilemma (NationStates-style)
              d.activeDilemma && React.createElement('div', { className: 'rounded-xl p-4 border-2 mb-3 relative overflow-hidden', style: { background: 'linear-gradient(135deg, #312e81, #1e1b4b, #0f172a)', borderColor: '#6366f1', boxShadow: '0 0 20px rgba(99,102,241,0.2)', animation: 'kp-fadeIn 0.5s ease-out' } },
                React.createElement('div', { className: 'absolute -right-8 -top-8 text-7xl opacity-5', style: { filter: 'blur(3px)' } }, '\u2696\uFE0F'),
                React.createElement('h3', { className: 'text-sm font-bold text-indigo-200 mb-1' }, (d.activeDilemma.emoji || '\uD83C\uDFDB\uFE0F') + ' Colony Dilemma: ' + d.activeDilemma.title),
                React.createElement('p', { className: 'text-xs text-indigo-100 mb-3' }, d.activeDilemma.description),
                React.createElement('div', { className: 'grid gap-2' },
                  (d.activeDilemma.choices || []).map(function (ch2, ci2) {
                    return React.createElement('button', {
                      key: ci2,
                      onClick: function () {
                        // Apply value shifts
                        var newVals = Object.assign({}, colonyValues);
                        Object.keys(ch2.values || {}).forEach(function (vk) {
                          newVals[vk] = Math.max(0, Math.min(100, (newVals[vk] || 50) + ch2.values[vk]));
                        });
                        upd('colonyValues', newVals);
                        // Apply equity + happiness
                        var newEq = Math.max(0, Math.min(100, equity + (ch2.equity || 0)));
                        upd('colonyEquity', newEq);
                        var newH2 = Math.max(0, Math.min(100, colonyHappiness + (ch2.happiness || 0)));
                        upd('colonyHappiness', newH2);
                        // Log
                        var dl = dilemmaLog.slice();
                        dl.push({ turn: turn, title: d.activeDilemma.title, choice: ch2.text, values: ch2.values, equity: ch2.equity });
                        upd('dilemmaLog', dl);
                        if (d.activeDilemma.lesson) {
                          var nj6 = scienceJournal.slice();
                          nj6.push({ turn: turn, source: 'Dilemma: ' + d.activeDilemma.title, fact: d.activeDilemma.lesson });
                          upd('scienceJournal', nj6);
                        }
                        upd('dilemmaResult', { outcome: ch2.outcome, lesson: d.activeDilemma.lesson, equity: ch2.equity, values: ch2.values });
                        upd('activeDilemma', null);
                        if (addToast) addToast(ch2.outcome, ch2.equity >= 0 ? 'info' : 'warning');
                        // AI narrates the full consequence
                        var valShiftDesc = Object.keys(ch2.values || {}).filter(function (vk4) { return ch2.values[vk4] !== 0; }).map(function (vk4) { return vk4 + (ch2.values[vk4] > 0 ? ' rose' : ' fell'); }).join(', ');
                        callGemini('You are the narrator for a space colony on Kepler-442b. The colony council just decided: "' + ch2.text + '" in response to the dilemma "' + d.activeDilemma.title + '". The outcome is: ' + ch2.outcome + '. Colony value shifts: ' + valShiftDesc + '. Equity changed by ' + (ch2.equity || 0) + '. Narrate the consequences in 3-4 dramatic, reflective sentences. Include how this affects daily life in the colony and what it reveals about the colonists\u2019 values. Be thoughtful, not preachy. Target audience: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '.', true).then(function (narration) {
                          upd('dilemmaNarration', narration);
                          if (d.colonyTTS) colonySpeak(narration, 'narrator');
                        }).catch(function () {
                          if (d.colonyTTS) colonySpeak(ch2.outcome, 'narrator');
                        });
                        var nl27 = gameLog.slice(); nl27.push('\uD83C\uDFDB\uFE0F Decision: ' + ch2.text.substring(0, 50)); upd('colonyLog', nl27);
                        if (typeof addXP === 'function') addXP(15, 'Governance: ' + d.activeDilemma.title);
                      },
                      className: 'p-3 rounded-xl border-2 text-xs transition-all text-left hover:scale-[1.01]',
                      style: { background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderColor: '#4f46e8', color: '#c7d2fe' }
                    },
                      React.createElement('div', { className: 'font-bold text-[10px] text-indigo-200 mb-1' }, String.fromCharCode(65 + ci2) + '. ' + ch2.text),
                      React.createElement('div', { className: 'flex gap-2 text-[8px] flex-wrap' },
                        Object.keys(ch2.values || {}).filter(function (vk2) { return ch2.values[vk2] !== 0; }).map(function (vk2) {
                          return React.createElement('span', { key: vk2, className: ch2.values[vk2] > 0 ? 'text-green-400' : 'text-red-400' },
                            vk2 + (ch2.values[vk2] > 0 ? '+' : '') + ch2.values[vk2]);
                        }),
                        ch2.equity !== 0 && React.createElement('span', { className: ch2.equity > 0 ? 'text-cyan-400' : 'text-red-400' },
                          '\u2696\uFE0F' + (ch2.equity > 0 ? '+' : '') + ch2.equity)
                      )
                    );
                  })
                ),
                React.createElement('div', { className: 'text-[8px] text-indigo-400 mt-2' }, '\uD83D\uDCA1 No wrong answers \u2014 your choices shape your colony\u2019s identity.')
              ),
              d.dilemmaResult && React.createElement('div', { className: 'bg-indigo-950 rounded-xl p-3 border border-indigo-700 mb-3' },
                React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                  React.createElement('span', { className: 'text-[10px] font-bold text-indigo-300' }, '\uD83C\uDFDB\uFE0F Decision Made'),
                  React.createElement('button', { onClick: function () { upd('dilemmaResult', null); upd('dilemmaNarration', null); }, className: 'text-indigo-500 text-xs' }, '\u2715')
                ),
                React.createElement('p', { className: 'text-[9px] text-indigo-200 mb-1' }, d.dilemmaResult.outcome),
                d.dilemmaNarration && React.createElement('div', { className: 'bg-indigo-900/30 rounded-lg p-2 mt-1 border-l-2 border-indigo-500' },
                  React.createElement('p', { className: 'text-[9px] text-indigo-100 italic leading-relaxed' }, '\uD83C\uDFA4 ' + d.dilemmaNarration)
                ),
                d.dilemmaResult.lesson && React.createElement('div', { className: 'mt-1 text-[9px] text-indigo-300 bg-indigo-900/50 rounded-lg px-2 py-1' }, '\uD83D\uDCDA ' + d.dilemmaResult.lesson),
                d.dilemmaResult.values && React.createElement('div', { className: 'mt-1 flex gap-1 flex-wrap text-[8px]' },
                  Object.keys(d.dilemmaResult.values).filter(function (vk5) { return d.dilemmaResult.values[vk5] !== 0; }).map(function (vk5) {
                    return React.createElement('span', { key: vk5, className: d.dilemmaResult.values[vk5] > 0 ? 'text-green-400 bg-green-900/30 px-1 rounded' : 'text-red-400 bg-red-900/30 px-1 rounded' },
                      vk5 + (d.dilemmaResult.values[vk5] > 0 ? '\u2191' : '\u2193'));
                  }),
                  d.dilemmaResult.equity !== 0 && React.createElement('span', { className: d.dilemmaResult.equity > 0 ? 'text-cyan-400 bg-cyan-900/30 px-1 rounded' : 'text-red-400 bg-red-900/30 px-1 rounded' },
                    '\u2696\uFE0F' + (d.dilemmaResult.equity > 0 ? '\u2191' : '\u2193'))
                )
              ),
              d.dilemmaLoading && React.createElement('div', { className: 'bg-indigo-900/50 rounded-xl p-3 border border-indigo-700 mb-3 text-center text-indigo-300 text-xs' }, '\uD83C\uDFDB\uFE0F Colony council deliberating...'),
              // Disaster Event
              d.activeDisaster && React.createElement('div', { className: 'rounded-xl p-4 border-2 mb-3 relative overflow-hidden', style: { background: 'linear-gradient(135deg, #7f1d1d, #991b1b, #451a03)', borderColor: '#ef4444', boxShadow: '0 0 25px rgba(239,68,68,0.3)', animation: 'kp-shake 0.5s ease-out, kp-fadeIn 0.5s ease-out' } },
                React.createElement('div', { className: 'absolute -right-8 -top-8 text-7xl opacity-10', style: { filter: 'blur(3px)', animation: 'kp-pulse 2s infinite' } }, '\uD83D\uDCA5'),
                React.createElement('h3', { className: 'text-sm font-bold text-red-200 mb-1' }, (d.activeDisaster.emoji || '\uD83D\uDCA5') + ' DISASTER: ' + d.activeDisaster.title),
                React.createElement('p', { className: 'text-xs text-red-100 mb-2' }, d.activeDisaster.description),
                d.activeDisaster.lesson && React.createElement('div', { className: 'bg-red-950 rounded-lg px-3 py-2 text-[10px] text-red-300 border border-red-800 mb-2' }, '\uD83D\uDCDA Science: ' + d.activeDisaster.lesson),
                React.createElement('p', { className: 'text-[10px] text-amber-200 font-bold mb-2' }, '\u26A0\uFE0F Answer correctly to MITIGATE damage! Wrong answer = FULL damage!'),
                React.createElement('p', { className: 'text-xs text-red-100 mb-2 font-bold' }, d.activeDisaster.question),
                React.createElement('div', { className: 'grid grid-cols-3 gap-2' },
                  (d.activeDisaster.options || []).map(function (opt3, oi3) {
                    return React.createElement('button', {
                      key: oi3,
                      onClick: function () {
                        var correct4 = oi3 === d.activeDisaster.correctIndex;
                        var damage = correct4 ? d.activeDisaster.mitigatedDamage : d.activeDisaster.fullDamage;
                        var nr14 = Object.assign({}, resources);
                        Object.keys(damage || {}).forEach(function (k) {
                          if (k === 'morale') {
                            upd('colonySettlers', settlers.map(function (s8) { return Object.assign({}, s8, { morale: Math.max(0, s8.morale + (damage[k] || 0)) }); }));
                          } else if (nr14[k] !== undefined) { nr14[k] = Math.max(0, nr14[k] + damage[k]); }
                        });
                        upd('colonyRes', nr14);
                        if (d.activeDisaster.lesson) {
                          var nj5 = scienceJournal.slice();
                          nj5.push({ turn: turn, source: 'Disaster: ' + d.activeDisaster.title, fact: d.activeDisaster.lesson });
                          upd('scienceJournal', nj5);
                        }
                        var ns8 = Object.assign({}, stats); ns8.questionsAnswered++; if (correct4) ns8.correct++; upd('colonyStats', ns8);
                        if (correct4) {
                          if (addToast) addToast('\u2705 Damage mitigated! Your science knowledge saved the colony!', 'success');
                          if (d.colonyTTS) colonySpeak('Excellent! Disaster mitigated through scientific knowledge. Damage was minimized.', 'narrator');
                          if (typeof addXP === 'function') addXP(40, 'Disaster mitigated: ' + d.activeDisaster.title);
                        } else {
                          if (addToast) addToast('\u274C Full damage! The correct answer was: ' + d.activeDisaster.options[d.activeDisaster.correctIndex], 'error');
                          if (d.colonyTTS) colonySpeak('Incorrect. The colony takes full damage. The answer was ' + d.activeDisaster.options[d.activeDisaster.correctIndex] + '.', 'narrator');
                        }
                        upd('activeDisaster', null);
                      },
                      className: 'p-2 rounded-xl border-2 text-xs transition-all hover:scale-[1.01]',
                      style: { background: 'linear-gradient(135deg, #450a0a, #7f1d1d)', borderColor: '#dc2626', color: '#fecaca' }
                    }, String.fromCharCode(65 + oi3) + '. ' + opt3);
                  })
                )
              ),
              d.disasterLoading && React.createElement('div', { className: 'bg-red-900/50 rounded-xl p-3 border border-red-700 mb-3 text-center text-red-300 text-xs' }, '\uD83D\uDCA5 Disaster incoming...'),
              // Maintenance Challenge
              maintChallenge && React.createElement('div', { className: 'rounded-xl p-4 border-2 mb-3 relative overflow-hidden', style: { background: 'linear-gradient(135deg, #78350f, #92400e, #451a03)', borderColor: '#f59e0b', boxShadow: '0 0 20px rgba(245,158,11,0.2)', animation: 'kp-fadeIn 0.5s ease-out' } },
                React.createElement('div', { className: 'absolute -right-8 -top-8 text-7xl opacity-5', style: { filter: 'blur(3px)' } }, '\uD83D\uDD27'),
                React.createElement('div', { className: 'flex items-center gap-2 mb-2' },
                  React.createElement('span', { className: 'text-lg' }, maintChallenge.buildingIcon),
                  React.createElement('div', null,
                    React.createElement('h4', { className: 'text-sm font-bold text-amber-200' }, '\uD83D\uDD27 Maintenance Check: ' + maintChallenge.buildingName),
                    React.createElement('span', { className: 'text-[9px] text-amber-400' }, 'Answer correctly to maintain 100% effectiveness!')
                  )
                ),
                React.createElement('p', { className: 'text-xs text-amber-100 mb-3' }, maintChallenge.question),
                // MCQ Mode
                maintChallenge.options && React.createElement('div', { className: 'grid grid-cols-3 gap-2' },
                  maintChallenge.options.map(function (opt, oi) {
                    return React.createElement('button', {
                      key: oi,
                      onClick: function () {
                        var correct = oi === maintChallenge.correctIndex;
                        var newEff = Object.assign({}, buildingEff);
                        if (correct) {
                          newEff[maintChallenge.building] = 100;
                          var ns = Object.assign({}, stats); ns.questionsAnswered++; ns.correct++; upd('colonyStats', ns);
                          if (addToast) addToast('\u2705 Correct! ' + maintChallenge.buildingName + ' running at 100%!', 'success');
                          if (d.colonyTTS) colonySpeak('Excellent! Maintenance check passed. ' + maintChallenge.buildingName + ' operating at full capacity.', 'narrator');
                          if (typeof addXP === 'function') addXP(20, 'Maintenance: ' + maintChallenge.buildingName);
                        } else {
                          var curEff = newEff[maintChallenge.building] !== undefined ? newEff[maintChallenge.building] : 100;
                          newEff[maintChallenge.building] = Math.max(25, curEff - 25);
                          var ns2 = Object.assign({}, stats); ns2.questionsAnswered++; upd('colonyStats', ns2);
                          if (addToast) addToast('\u274C Wrong! ' + maintChallenge.buildingName + ' reduced to ' + newEff[maintChallenge.building] + '% output.', 'warning');
                          if (d.colonyTTS) colonySpeak('Incorrect. The ' + maintChallenge.buildingName + ' is now operating at reduced capacity. Study the science and try the next maintenance cycle.', 'narrator');
                        }
                        upd('buildingEff', newEff);
                        if (maintChallenge.explanation) {
                          var nj4 = scienceJournal.slice();
                          nj4.push({ turn: turn, source: 'Maintenance: ' + maintChallenge.buildingName, fact: maintChallenge.explanation });
                          upd('scienceJournal', nj4);
                        }
                        upd('maintExplanation', { text: maintChallenge.explanation, correct: correct, answer: maintChallenge.options[maintChallenge.correctIndex] });
                        upd('maintChallenge', null);
                      },
                      className: 'p-2 rounded-xl border-2 text-xs transition-all text-left hover:scale-[1.01]',
                      style: { background: 'linear-gradient(135deg, #451a03, #78350f)', borderColor: '#b45309', color: '#fde68a' }
                    }, String.fromCharCode(65 + oi) + '. ' + opt);
                  })
                ),
                // Free Response Mode
                !maintChallenge.options && React.createElement('div', { className: 'flex gap-2' },
                  React.createElement('input', {
                    type: 'text', value: d.maintInput || '',
                    onChange: function (e) { upd('maintInput', e.target.value); },
                    onKeyDown: function (e) { if (e.key === 'Enter') document.getElementById('kepler-maint-btn').click(); },
                    placeholder: 'Type your answer...',
                    className: 'flex-1 px-3 py-2 bg-amber-950 border-2 border-amber-600 rounded-xl text-xs text-white outline-none focus:border-amber-400'
                  }),
                  React.createElement('button', {
                    id: 'kepler-maint-btn',
                    onClick: function () {
                      var inp2 = (d.maintInput || '').trim().toLowerCase();
                      var correct2 = inp2.indexOf((maintChallenge.answer || '').toLowerCase()) >= 0;
                      var newEff2 = Object.assign({}, buildingEff);
                      if (correct2) {
                        newEff2[maintChallenge.building] = 100;
                        if (addToast) addToast('\u2705 Correct! ' + maintChallenge.buildingName + ' at 100%!', 'success');
                        if (d.colonyTTS) colonySpeak('Excellent! Maintenance passed. Full capacity restored.', 'narrator');
                        if (typeof addXP === 'function') addXP(25, 'Maintenance: ' + maintChallenge.buildingName);
                      } else {
                        var curEff2 = newEff2[maintChallenge.building] !== undefined ? newEff2[maintChallenge.building] : 100;
                        newEff2[maintChallenge.building] = Math.max(25, curEff2 - 25);
                        if (addToast) addToast('\u274C ' + maintChallenge.buildingName + ' reduced to ' + newEff2[maintChallenge.building] + '%', 'warning');
                        if (d.colonyTTS) colonySpeak('Incorrect. Reduced capacity. The correct answer was ' + (maintChallenge.answer || '') + '.', 'narrator');
                      }
                      upd('buildingEff', newEff2);
                      upd('maintExplanation', { text: maintChallenge.explanation, correct: correct2, answer: maintChallenge.answer });
                      upd('maintChallenge', null); upd('maintInput', '');
                    },
                    className: 'px-4 py-2 bg-amber-500 text-slate-900 rounded-xl text-xs font-bold'
                  }, '\u2705 Submit')
                )
              ),
              // Maintenance explanation (after answering)
              d.maintExplanation && React.createElement('div', { className: 'bg-slate-800 rounded-xl p-3 border mb-3 ' + (d.maintExplanation.correct ? 'border-green-600' : 'border-red-600') },
                React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                  React.createElement('span', { className: 'text-[10px] font-bold ' + (d.maintExplanation.correct ? 'text-green-400' : 'text-red-400') },
                    d.maintExplanation.correct ? '\u2705 Correct!' : '\u274C Incorrect \u2014 Answer: ' + d.maintExplanation.answer
                  ),
                  React.createElement('button', { onClick: function () { upd('maintExplanation', null); }, className: 'text-slate-500 text-xs' }, '\u2715')
                ),
                React.createElement('p', { className: 'text-[10px] text-slate-300 leading-relaxed' }, '\uD83D\uDCDA ' + d.maintExplanation.text)
              ),
              d.maintChallengeLoading && React.createElement('div', { className: 'bg-amber-900/50 rounded-xl p-3 border border-amber-700 mb-3 text-center text-amber-300 text-xs' }, '\u23F3 Generating maintenance challenge...'),
              // Build panel
              d.showBuild && React.createElement('div', { className: 'rounded-xl p-3 border mb-3', style: { background: 'linear-gradient(135deg, #1e1b4b, #0f172a)', borderColor: '#4338ca40', animation: 'kp-fadeIn 0.3s ease-out' } },
                React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                  React.createElement('h4', { className: 'text-sm font-bold text-amber-400' }, '\uD83C\uDFD7 Buildings'),
                  builtThisTurn && React.createElement('span', { className: 'text-[8px] px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400 border border-amber-700/30' }, '\u2705 Built this turn')
                ),
                React.createElement('div', { className: 'grid grid-cols-2 gap-2' }, buildingDefs.map(function (bd) {
                  var isBuilt = buildings.indexOf(bd.id) >= 0;
                  var hasPrereqs = (bd.requires || []).every(function (r) { return buildings.indexOf(r) >= 0; });
                  var canAff = !isBuilt && hasPrereqs && Object.keys(bd.cost).every(function (k) { return resources[k] >= bd.cost[k]; }) && turnPhase === 'day' && actionPoints >= 1 && !builtThisTurn;
                  var tierColors = { 1: { bg: 'linear-gradient(135deg, #0f172a, #1e293b)', border: '#475569', glow: 'rgba(100,116,139,0.2)' }, 2: { bg: 'linear-gradient(135deg, #172554, #1e1b4b)', border: '#6366f1', glow: 'rgba(99,102,241,0.2)' }, 3: { bg: 'linear-gradient(135deg, #4a1d96, #312e81)', border: '#8b5cf6', glow: 'rgba(139,92,246,0.3)' }, 4: { bg: 'linear-gradient(135deg, #78350f, #451a03)', border: '#f59e0b', glow: 'rgba(245,158,11,0.3)' } };
                  var tc = tierColors[bd.tier] || tierColors[1];
                  return React.createElement('div', { key: bd.id, className: 'p-2 rounded-xl border-2 transition-all ' + (isBuilt ? '' : canAff ? 'hover:scale-[1.02] cursor-pointer' : 'opacity-40'), style: { background: isBuilt ? 'linear-gradient(135deg, #064e3b, #065f46)' : canAff ? tc.bg : '#0f172a', borderColor: isBuilt ? '#10b981' : canAff ? tc.border : '#1e293b', boxShadow: isBuilt ? '0 0 12px rgba(16,185,129,0.2)' : canAff ? '0 0 10px ' + tc.glow : 'none' } },
                    React.createElement('div', { className: 'flex items-center justify-between' },
                      React.createElement('span', null, React.createElement('span', { className: 'text-base' }, bd.icon), React.createElement('span', { className: 'text-[10px] font-bold text-white ml-1' }, bd.name), isBuilt && React.createElement('span', { className: 'ml-1 text-[9px] ' + ((buildingEff[bd.id] !== undefined ? buildingEff[bd.id] : 100) >= 75 ? 'text-green-400' : 'text-amber-400') },
                        '\u2705 ' + (buildingEff[bd.id] !== undefined ? buildingEff[bd.id] : 100) + '%')),
                      canAff && React.createElement('button', {
                        onClick: function () {
                          if ((d.colonyMode || 'mcq') === 'mcq') {
                            // Generate AI MCQ for the gate
                            upd('scienceGateLoading', true);
                            callGemini('Generate a ' + bd.gate + ' science question for building a ' + bd.name + ' in a space colony. Difficulty: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '. Return ONLY valid JSON: {"question":"<question>","options":["<correct>","<wrong1>","<wrong2>","<wrong3>","<wrong4>","<wrong5>"],"correctIndex":0,"explanation":"<real science explanation 2-3 sentences>"}. Generate exactly 6 answer options. Shuffle the correct answer randomly (position 0-5). Make sure correctIndex matches the position of the correct answer.', true).then(function (gateResult) {
                              try {
                                var gcl = gateResult.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                                var gs = gcl.indexOf('{'); if (gs > 0) gcl = gcl.substring(gs);
                                var ge = gcl.lastIndexOf('}'); if (ge > 0) gcl = gcl.substring(0, ge + 1);
                                var gp = JSON.parse(gcl);
                                gp.building = bd.id; gp.domain = bd.gate; gp.mode = 'mcq';
                                upd('scienceGate', gp); upd('scienceGateLoading', false);
                                if (d.colonyTTS) colonySpeak('Science challenge. ' + gp.question, 'narrator');
                              } catch (err) {
                                // Fallback to static question
                                upd('scienceGate', { building: bd.id, question: bd.gateQ, answer: bd.gateA, domain: bd.gate, mode: 'freeResponse' });
                                upd('scienceGateLoading', false);
                              }
                            }).catch(function () {
                              upd('scienceGate', { building: bd.id, question: bd.gateQ, answer: bd.gateA, domain: bd.gate, mode: 'freeResponse' });
                              upd('scienceGateLoading', false);
                            });
                          } else {
                            // Free response: use static question
                            upd('scienceGate', { building: bd.id, question: bd.gateQ, answer: bd.gateA, domain: bd.gate, mode: 'freeResponse' });
                          }
                          upd('scienceGateInput', '');
                        }, className: 'px-2 py-1 bg-amber-500 text-slate-900 rounded-lg text-[9px] font-bold'
                      }, '\uD83D\uDD13 Build')
                    ),
                    React.createElement('div', { className: 'text-[8px] text-slate-400 mt-1' }, bd.desc),
                    React.createElement('div', { className: 'flex gap-1 mt-1 text-[8px] flex-wrap' },
                      Object.keys(bd.cost).map(function (ck) { return React.createElement('span', { key: ck, className: resources[ck] >= bd.cost[ck] ? 'text-green-400' : 'text-red-400' }, ck + ':' + bd.cost[ck]); }),
                      React.createElement('span', { className: 'text-slate-500' }, '|'),
                      Object.keys(bd.production).map(function (pk) { return React.createElement('span', { key: pk, className: 'text-cyan-400' }, '+' + bd.production[pk] + ' ' + pk); })
                    ),
                    React.createElement('div', { className: 'text-[8px] text-indigo-400 mt-0.5' }, '\uD83D\uDD12 ' + bd.gate + (bd.tier > 1 ? ' | Tier ' + bd.tier : '')),
                    !isBuilt && bd.requires && bd.requires.length > 0 && !hasPrereqs && React.createElement('div', { className: 'text-[8px] text-red-400 mt-0.5' }, '\u26D4 Requires: ' + bd.requires.join(', '))
                  );
                }))
              ),
              // Science gate
              d.scienceGateLoading && React.createElement('div', { className: 'bg-purple-900/50 rounded-xl p-3 border border-purple-700 mb-3 text-center text-purple-300 text-xs' }, '\u23F3 Generating science challenge...'),
              scienceGate && React.createElement('div', { className: 'rounded-xl p-4 border-2 mb-3 relative overflow-hidden', style: { background: 'linear-gradient(135deg, #581c87, #312e81, #1e1b4b)', borderColor: '#7c3aed', animation: 'kp-fadeIn 0.5s ease-out', boxShadow: '0 0 20px rgba(139,92,246,0.2)' } },
                React.createElement('h4', { className: 'text-sm font-bold text-purple-200 mb-2' }, '\uD83D\uDD2C Science Challenge: ' + scienceGate.domain.toUpperCase()),
                React.createElement('div', { className: 'text-[8px] text-purple-400 mb-1' }, scienceGate.mode === 'mcq' ? '\uD83D\uDCCB Multiple Choice \u2014 select the correct answer' : '\u270D\uFE0F Free Response \u2014 type your answer'),
                React.createElement('p', { className: 'text-xs text-purple-100 mb-3' }, scienceGate.question),
                // MCQ Mode
                scienceGate.options && React.createElement('div', { className: 'grid grid-cols-3 gap-2' },
                  scienceGate.options.map(function (opt2, oi2) {
                    return React.createElement('button', {
                      key: oi2,
                      onClick: function () {
                        var correct3 = oi2 === scienceGate.correctIndex;
                        if (correct3) {
                          var bdef3 = buildingDefs.find(function (bd4) { return bd4.id === scienceGate.building; });
                          var nr7 = Object.assign({}, resources); Object.keys(bdef3.cost).forEach(function (k) { nr7[k] -= bdef3.cost[k]; }); upd('colonyRes', nr7);
                          var nb2 = buildings.slice(); nb2.push(scienceGate.building); upd('colonyBuildings', nb2);
                          var newEff3 = Object.assign({}, buildingEff); newEff3[scienceGate.building] = 100; upd('buildingEff', newEff3);
                          var nl8 = gameLog.slice(); nl8.push('Built ' + bdef3.icon + ' ' + bdef3.name + '!'); upd('colonyLog', nl8);
                          var ns3 = Object.assign({}, stats); ns3.questionsAnswered++; ns3.correct++;
                          // Handle wonder progress
                          if (scienceGate._wonderId) {
                            var newWonders = Object.assign({}, wonders);
                            var wProg = (newWonders[scienceGate._wonderId + '_progress'] || 0) + 1;
                            newWonders[scienceGate._wonderId + '_progress'] = wProg;
                            if (wProg >= scienceGate._wonderChallenges) {
                              // Wonder complete!
                              newWonders[scienceGate._wonderId] = true;
                              var nr13 = Object.assign({}, resources);
                              Object.keys(scienceGate._wonderCost).forEach(function (k) { nr13[k] -= scienceGate._wonderCost[k]; });
                              upd('colonyRes', nr13);
                              var nl23 = gameLog.slice(); nl23.push('\uD83C\uDFDB\uFE0F WONDER: ' + scienceGate._wonderName + ' complete!'); upd('colonyLog', nl23);
                              if (addToast) addToast('\uD83C\uDFDB\uFE0F ' + scienceGate._wonderName + ' COMPLETE! Permanent bonuses active!', 'success');
                              if (d.colonyTTS) colonySpeak('Wonder complete! The ' + scienceGate._wonderName + ' is now operational. This is a monumental achievement for the colony.', 'narrator');
                              if (typeof addXP === 'function') addXP(75, 'Wonder: ' + scienceGate._wonderName);
                            } else {
                              if (addToast) addToast('\u2705 Challenge ' + wProg + '/' + scienceGate._wonderChallenges + ' passed!', 'success');
                            }
                            upd('colonyWonders', newWonders);
                            upd('colonyStats', ns3);
                            upd('scienceGate', null);
                            return;
                          }
                          // Handle research completion
                          if (scienceGate._researchId) {
                            var rq2 = researchQueue.slice(); rq2.push(scienceGate._researchId); upd('colonyResearch', rq2);
                            var nr8 = Object.assign({}, resources); nr8.science -= scienceGate._researchCost; upd('colonyRes', nr8);
                            var rdef2 = researchDefs.find(function (rd3) { return rd3.id === scienceGate._researchId; });
                            var nl17 = gameLog.slice(); nl17.push('\uD83E\uDDEC Research: ' + (rdef2 ? rdef2.name : scienceGate._researchId) + ' complete!'); upd('colonyLog', nl17);
                            if (addToast) addToast('\uD83E\uDDEC ' + (rdef2 ? rdef2.name : '') + ' researched!', 'success');
                            if (d.colonyTTS) colonySpeak('Research complete. ' + (rdef2 ? rdef2.name + '. ' + rdef2.desc : ''), 'narrator');
                            upd('colonyStats', ns3);
                            upd('scienceGate', null);
                            return;
                          }
                          ns3.buildingsConstructed++; upd('colonyStats', ns3); upd('builtThisTurn', true);
                          if (addToast) addToast('\u2705 ' + bdef3.name + ' built! Science verified!', 'success');
                          callGemini('You are narrating a space colony game. The colony just built a ' + bdef3.name + ' (' + bdef3.desc + '). Narrate the construction completion in 2 dramatic sentences. Include a real science fact. Target: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '.', true).then(function (buildNarr) {
                            upd('buildNarration', buildNarr);
                            if (d.colonyTTS) colonySpeak(buildNarr, 'narrator');
                          }).catch(function () {
                            if (d.colonyTTS) colonySpeak('Construction complete. ' + bdef3.name + ' is now operational.', 'narrator');
                          });
                          if (typeof addXP === 'function') addXP(30, 'Built ' + bdef3.name);
                        } else {
                          // 50% efficiency penalty instead of blocking
                          var bdef5 = buildingDefs.find(function (bd5) { return bd5.id === scienceGate.building; });
                          if (bdef5 && !scienceGate._wonderId && !scienceGate._researchId) {
                            var nr9 = Object.assign({}, resources); Object.keys(bdef5.cost).forEach(function (k) { nr9[k] = Math.round(nr9[k] - bdef5.cost[k] * 1.5); }); ['food','energy','water','materials','science'].forEach(function(rk2) { if (nr9[rk2] < 0) nr9[rk2] = 0; }); upd('colonyRes', nr9);
                            var nb3 = buildings.slice(); nb3.push(scienceGate.building); upd('colonyBuildings', nb3);
                            var newEff5 = Object.assign({}, buildingEff); newEff5[scienceGate.building] = 50; upd('buildingEff', newEff5);
                            var nl9 = gameLog.slice(); nl9.push('\u26A0\uFE0F Built ' + bdef5.icon + ' ' + bdef5.name + ' at 50% efficiency'); upd('colonyLog', nl9);
                            if (addToast) addToast('\u274C Wrong answer! ' + bdef5.name + ' built at 50% efficiency. Cost: 150%.', 'error');
                          } else {
                            if (addToast) addToast('\u274C Wrong! The correct answer was: ' + scienceGate.options[scienceGate.correctIndex], 'error');
                          }
                          if (d.colonyTTS) colonySpeak('Incorrect. The answer was ' + scienceGate.options[scienceGate.correctIndex] + '. Building operates at half efficiency.', 'narrator');
                        }
                        if (scienceGate.explanation) {
                          var nj3 = scienceJournal.slice();
                          nj3.push({ turn: turn, source: 'Build: ' + (bdef3 ? bdef3.name : ''), fact: scienceGate.explanation });
                          upd('scienceJournal', nj3);
                        }
                        upd('gateExplanation', { text: scienceGate.explanation, correct: correct3, answer: scienceGate.options[scienceGate.correctIndex] });
                        upd('scienceGate', null);
                      },
                      className: 'p-3 rounded-xl border-2 border-purple-700 bg-purple-950 text-purple-100 text-xs hover:border-purple-400 transition-all text-left'
                    }, String.fromCharCode(65 + oi2) + '. ' + opt2);
                  })
                ),
                // Free Response Mode
                !scienceGate.options && React.createElement('div', { className: 'flex gap-2' },
                  React.createElement('input', {
                    type: 'text', value: d.scienceGateInput || '', onChange: function (e) { upd('scienceGateInput', e.target.value); },
                    onKeyDown: function (e) { if (e.key === 'Enter') document.getElementById('kepler-gate-btn').click(); },
                    placeholder: 'Type your answer...', className: 'flex-1 px-3 py-2 bg-purple-950 border-2 border-purple-600 rounded-xl text-xs text-white outline-none focus:border-purple-400'
                  }),
                  React.createElement('button', {
                    id: 'kepler-gate-btn', onClick: function () {
                      var inp = (d.scienceGateInput || '').trim().toLowerCase();
                      var correct = Array.isArray(scienceGate.answer) ? scienceGate.answer.some(function (a) { return inp.indexOf(a.toLowerCase()) >= 0; }) : inp.indexOf(scienceGate.answer.toLowerCase()) >= 0;
                      if (correct) {
                        var bdef2 = buildingDefs.find(function (bd2) { return bd2.id === scienceGate.building; });
                        var nr4 = Object.assign({}, resources); Object.keys(bdef2.cost).forEach(function (k) { nr4[k] -= bdef2.cost[k]; }); upd('colonyRes', nr4);
                        var nb = buildings.slice(); nb.push(scienceGate.building); upd('colonyBuildings', nb);
                        var newEff4 = Object.assign({}, buildingEff); newEff4[scienceGate.building] = 100; upd('buildingEff', newEff4);
                        var nl4 = gameLog.slice(); nl4.push('Built ' + bdef2.icon + ' ' + bdef2.name + '!'); upd('colonyLog', nl4);
                        if (addToast) addToast('\u2705 ' + bdef2.name + ' built!', 'success');
                        if (d.colonyTTS) colonySpeak('Construction complete. ' + bdef2.name + ' operational.', 'narrator');
                        if (typeof addXP === 'function') addXP(30, 'Built ' + bdef2.name);
                      } else { if (addToast) addToast('\u274C Incorrect! Study and try again.', 'error'); upd('scienceGateInput', ''); }
                      upd('scienceGate', null);
                    }, className: 'px-4 py-2 bg-purple-500 text-white rounded-xl text-xs font-bold'
                  }, '\u2705 Submit'),
                  React.createElement('button', { onClick: function () { upd('scienceGate', null); }, className: 'px-3 py-2 bg-slate-700 text-slate-300 rounded-xl text-xs' }, '\u2715')
                ),
                // Build narration
                d.buildNarration && React.createElement('div', { className: 'rounded-xl p-3 border mb-3 relative overflow-hidden', style: { background: 'linear-gradient(135deg, #052e16, #064e3b)', borderColor: '#16a34a', boxShadow: '0 0 15px rgba(22,163,106,0.2)', animation: 'kp-fadeIn 0.5s ease-out' } },
                  React.createElement('div', { className: 'absolute -right-6 -top-6 text-5xl opacity-10', style: { filter: 'blur(3px)' } }, '\uD83C\uDFD7\uFE0F'),
                  React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                    React.createElement('span', { className: 'text-[10px] font-bold', style: { color: '#4ade80', textShadow: '0 0 8px rgba(74,222,128,0.3)' } }, '\uD83C\uDFD7\uFE0F Construction Report'),
                    React.createElement('button', { onClick: function () { upd('buildNarration', null); }, className: 'text-green-500 text-xs hover:text-green-300 transition-colors' }, '\u2715')
                  ),
                  React.createElement('p', { className: 'text-[9px] text-green-100 italic leading-relaxed' }, '\uD83C\uDFA4 ' + d.buildNarration)
                ),
                // Gate explanation
                d.gateExplanation && React.createElement('div', { className: 'mt-2 rounded-lg px-3 py-2 text-[10px] border', style: d.gateExplanation.correct ? { background: 'linear-gradient(135deg, #052e16, #064e3b)', borderColor: '#16a34a', color: '#86efac', animation: 'kp-fadeIn 0.3s ease-out', boxShadow: '0 0 10px rgba(22,163,106,0.2)' } : { background: 'linear-gradient(135deg, #450a0a, #7f1d1d)', borderColor: '#dc2626', color: '#fca5a5', animation: 'kp-fadeIn 0.3s ease-out', boxShadow: '0 0 10px rgba(220,38,38,0.2)' } },
                  React.createElement('span', { className: 'font-bold' }, d.gateExplanation.correct ? '\u2705 Correct! ' : '\u274C Answer: ' + d.gateExplanation.answer + '. '),
                  d.gateExplanation.text
                ),
                React.createElement('div', { className: 'text-[9px] text-purple-300 mt-2' }, '\uD83D\uDCA1 This is real science! Research online if unsure.')
              ),
              // ══ Achievements Panel ══
              d.showAchievements && React.createElement('div', { className: 'rounded-xl p-3 border mb-3 max-h-72 overflow-y-auto', style: { background: 'linear-gradient(135deg, #1c1917, #451a03, #0f172a)', borderColor: '#f43f5e30', animation: 'kp-fadeIn 0.3s ease-out' } },
                React.createElement('h4', { className: 'text-sm font-bold mb-2', style: { color: '#fb7185', textShadow: '0 0 10px rgba(251,113,133,0.3)' } }, '\uD83C\uDFC5 Achievements \u2014 ' + Object.keys(achievements).length + '/' + achievementDefs.length),
                React.createElement('div', { className: 'grid grid-cols-4 gap-2' },
                  achievementDefs.map(function(ad) {
                    var unlocked = achievements[ad.id];
                    return React.createElement('div', { key: ad.id, className: 'rounded-lg p-2 text-center transition-all ' + (unlocked ? 'hover:scale-[1.05]' : ''),
                      style: unlocked ? { background: 'linear-gradient(135deg, #78350f, #451a03)', border: '1px solid #f59e0b', boxShadow: '0 0 10px rgba(245,158,11,0.2)' } : { background: '#0f172a', border: '1px solid #1e293b', opacity: 0.4 }
                    },
                      React.createElement('div', { className: 'text-xl', style: unlocked ? { animation: 'kp-float 4s infinite' } : { filter: 'grayscale(1)' } }, ad.icon),
                      React.createElement('div', { className: 'text-[8px] font-bold mt-1', style: { color: unlocked ? '#fbbf24' : '#475569' } }, ad.name),
                      React.createElement('div', { className: 'text-[7px]', style: { color: unlocked ? '#fcd34d' : '#334155' } }, ad.desc)
                    );
                  })
                )
              ),
              // Settlers
              d.showSettlers && React.createElement('div', { className: 'rounded-xl p-3 border mb-3', style: { background: 'linear-gradient(135deg, #0f172a, #134e4a, #0f172a)', borderColor: '#14b8a630', animation: 'kp-fadeIn 0.3s ease-out' } },
                React.createElement('h4', { className: 'text-sm font-bold mb-2', style: { color: '#2dd4bf', textShadow: '0 0 10px rgba(45,212,191,0.3)' } }, '\uD83D\uDC65 Colony Crew \u2014 ' + settlers.length + ' Settlers'),
                React.createElement('div', { className: 'grid grid-cols-3 gap-2' }, settlers.map(function (st, si2) {
                  var roleColors = { Botanist: '#22c55e', Engineer: '#f59e0b', Geologist: '#a78bfa', Medic: '#ef4444', Chemist: '#06b6d4', Physicist: '#818cf8', Xenobiologist: '#10b981', Roboticist: '#f97316', Surgeon: '#f43f5e', Pilot: '#38bdf8', Astrophysicist: '#c084fc', Tactician: '#fbbf24' };
                  var rc = roleColors[st.role] || '#64748b';
                  return React.createElement('div', { key: si2, className: 'rounded-xl p-2 text-center transition-all hover:scale-[1.03]', style: { background: 'linear-gradient(135deg, #0f172a, #1e293b)', border: '1px solid ' + rc + '30', boxShadow: '0 0 8px ' + rc + '15' } },
                    React.createElement('div', { className: 'text-2xl', style: { filter: st.health < 30 ? 'grayscale(0.5)' : 'none', animation: st.morale > 80 ? 'kp-float 4s infinite' : 'none' } }, st.icon),
                    React.createElement('div', { className: 'text-[9px] font-bold text-white mt-1' }, st.name),
                    React.createElement('div', { className: 'text-[8px] font-bold', style: { color: rc } }, st.role),
                    React.createElement('div', { className: 'mt-1 grid grid-cols-2 gap-1 text-[7px]' },
                      React.createElement('div', null, React.createElement('span', { style: { color: st.morale > 60 ? '#4ade80' : '#fbbf24' } }, '\u2764 ' + st.morale), React.createElement('div', { className: 'w-full rounded-full h-1.5 mt-0.5', style: { background: '#1e293b' } }, React.createElement('div', { className: 'h-1.5 rounded-full transition-all', style: { width: st.morale + '%', background: st.morale > 60 ? 'linear-gradient(90deg, #22c55e, #4ade80)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)', animation: 'kp-barFill 1s ease-out' } }))),
                      React.createElement('div', null, React.createElement('span', { style: { color: st.health > 50 ? '#22d3ee' : '#ef4444' } }, '\u2695 ' + st.health), React.createElement('div', { className: 'w-full rounded-full h-1.5 mt-0.5', style: { background: '#1e293b' } }, React.createElement('div', { className: 'h-1.5 rounded-full transition-all', style: { width: st.health + '%', background: st.health > 50 ? 'linear-gradient(90deg, #06b6d4, #22d3ee)' : 'linear-gradient(90deg, #ef4444, #f87171)', animation: 'kp-barFill 1s ease-out' } }))),
                      React.createElement('button', {
                        onClick: function () {
                          upd('talkSettler', si2);
                          upd('settlerChatLoading', true);
                          callGemini('You are ' + st.name + ', a ' + st.role + ' (specialty: ' + st.specialty + ') on the Kepler-442b space colony. Morale: ' + st.morale + '%, Health: ' + st.health + '%. Colony has ' + buildings.length + ' buildings, turn ' + turn + '. Resources: food=' + resources.food + ' energy=' + resources.energy + '. Give a brief in-character update (2-3 sentences) about your work, mood, and a science fact related to your specialty. Be personable and educational.', true).then(function (result) {
                            upd('settlerChat', result); upd('settlerChatLoading', false);
                            if (d.colonyTTS) colonySpeak(result, st.role === 'Medic' || st.role === 'Botanist' || st.role === 'Chemist' ? 'female' : 'narrator');
                            if (typeof addXP === 'function') addXP(5, 'Talked to ' + st.name);
                          }).catch(function () { upd('settlerChatLoading', false); });
                        },
                        className: 'mt-1 col-span-2 px-2 py-0.5 rounded bg-indigo-800 text-indigo-300 text-[7px] hover:bg-indigo-700'
                      }, '\uD83D\uDCAC Talk')
                    )
                  );
                }))
              ),
              // Policy Panel (Civ-inspired social policies)
              d.showPolicy && React.createElement('div', { className: 'rounded-xl p-3 border mb-3', style: { background: 'linear-gradient(135deg, #064e3b, #0f172a, #1e1b4b)', borderColor: '#10b98130', animation: 'kp-fadeIn 0.3s ease-out' } },
                React.createElement('h4', { className: 'text-sm font-bold mb-2', style: { color: '#34d399', textShadow: '0 0 10px rgba(52,211,153,0.3)' } }, '\uD83C\uDFDB\uFE0F Colony Governance'),
                React.createElement('p', { className: 'text-[9px] text-emerald-300/60 mb-2' }, 'Choose a governing policy. Each provides unique bonuses. You may change policy once every 10 turns.'),
                React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
                  policyDefs.map(function (pol2) {
                    var isActive = activePolicy === pol2.id;
                    return React.createElement('button', {
                      key: pol2.id,
                      onClick: function () {
                        if (!isActive) {
                          upd('colonyPolicy', pol2.id);
                          if (addToast) addToast(pol2.icon + ' Policy: ' + pol2.name + ' adopted!', 'success');
                          if (d.colonyTTS) colonySpeak('Colony policy changed to ' + pol2.name + '. ' + pol2.desc, 'narrator');
                          var nl16 = gameLog.slice(); nl16.push('\uD83C\uDFDB\uFE0F Policy: ' + pol2.name); upd('colonyLog', nl16);
                        }
                      },
                      className: 'p-3 rounded-xl border-2 text-left transition-all hover:scale-[1.02]',
                      style: isActive ? { background: 'linear-gradient(135deg, #064e3b, #065f46)', borderColor: '#10b981', boxShadow: '0 0 15px rgba(16,185,129,0.25)', animation: 'kp-glow 3s infinite' } : { background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderColor: '#334155' }
                    },
                      React.createElement('div', { className: 'flex items-center gap-1 mb-1' },
                        React.createElement('span', { className: 'text-lg' }, pol2.icon),
                        React.createElement('span', { className: 'text-[10px] font-bold text-white' }, pol2.name),
                        isActive && React.createElement('span', { className: 'text-[8px] text-emerald-400 ml-auto' }, '\u2705 ACTIVE')
                      ),
                      React.createElement('div', { className: 'text-[8px] text-slate-400' }, pol2.desc)
                    );
                  })
                )
              ),
              // Cultural Traditions Panel
              d.showPolicy && React.createElement('div', { className: 'rounded-xl p-3 border mb-3', style: { background: 'linear-gradient(135deg, #451a03, #422006, #0f172a)', borderColor: '#ca8a0430', animation: 'kp-fadeIn 0.3s ease-out' } },
                React.createElement('h4', { className: 'text-sm font-bold mb-2', style: { color: '#fbbf24', textShadow: '0 0 10px rgba(251,191,36,0.3)' } }, '\uD83C\uDF0D Cultural Knowledge Traditions'),
                React.createElement('p', { className: 'text-[9px] text-amber-300/60 mb-2' }, 'Ancient wisdom from diverse civilizations. Each tradition provides permanent bonuses and a real cultural lesson.'),
                React.createElement('div', { className: 'grid gap-2' },
                  traditionDefs.map(function (td3) {
                    var isAdopted = traditions.indexOf(td3.id) >= 0;
                    var canAdopt = !isAdopted && resources.science >= 10;
                    return React.createElement('div', {
                      key: td3.id, className: 'p-2 rounded-xl border flex items-center justify-between transition-all ' + (canAdopt && !isAdopted ? 'hover:scale-[1.01]' : ''),
                      style: isAdopted ? { background: 'linear-gradient(135deg, #451a03, #422006)', borderColor: '#ca8a04', boxShadow: '0 0 10px rgba(202,138,4,0.15)' } : canAdopt ? { background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderColor: '#475569' } : { background: '#0f172a', borderColor: '#1e293b', opacity: 0.5 }
                    },
                      React.createElement('div', { className: 'flex items-center gap-2 flex-1' },
                        React.createElement('span', { className: 'text-xl' }, td3.icon),
                        React.createElement('div', { className: 'flex-1' },
                          React.createElement('div', { className: 'flex items-center gap-1' },
                            React.createElement('span', { className: 'text-[10px] font-bold text-amber-200' }, td3.name),
                            React.createElement('span', { className: 'text-[8px] text-slate-500' }, '(' + td3.origin + ')'),
                            isAdopted && React.createElement('span', { className: 'text-amber-400 text-[8px]' }, '\u2705')
                          ),
                          React.createElement('div', { className: 'text-[8px] text-slate-400' }, td3.desc),
                          isAdopted && React.createElement('div', { className: 'text-[7px] text-amber-300 mt-0.5 italic' }, '\uD83D\uDCDA ' + td3.fact)
                        )
                      ),
                      !isAdopted && React.createElement('button', {
                        onClick: function () {
                          if (canAdopt) {
                            var nr15 = Object.assign({}, resources); nr15.science -= 10; upd('colonyRes', nr15);
                            var newTrad = traditions.slice(); newTrad.push(td3.id); upd('colonyTraditions', newTrad);
                            // Update values
                            var nv2 = Object.assign({}, colonyValues);
                            if (td3.value) nv2[td3.value] = Math.min(100, (nv2[td3.value] || 50) + 10);
                            upd('colonyValues', nv2);
                            if (td3.bonus.equity) upd('colonyEquity', Math.min(100, equity + td3.bonus.equity));
                            if (td3.bonus.happiness) upd('colonyHappiness', Math.min(100, colonyHappiness + td3.bonus.happiness));
                            var nj7 = scienceJournal.slice();
                            nj7.push({ turn: turn, source: 'Tradition: ' + td3.name + ' (' + td3.origin + ')', fact: td3.fact });
                            upd('scienceJournal', nj7);
                            if (addToast) addToast(td3.icon + ' ' + td3.name + ' adopted!', 'success');
                            callGemini('The space colony on Kepler-442b has adopted the ' + td3.name + ' cultural tradition from ' + td3.origin + ' heritage. Fact: ' + td3.fact + '. Narrate how the colony integrates this wisdom into daily life in 2-3 thoughtful sentences. Be respectful and authentic. Target: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '.', true).then(function (tradNarr) {
                              upd('tradNarration', tradNarr);
                              if (d.colonyTTS) colonySpeak(tradNarr, 'narrator');
                            }).catch(function () {
                              if (d.colonyTTS) colonySpeak('Cultural tradition adopted. ' + td3.name + '. ' + td3.fact, 'narrator');
                            });
                            var nl28 = gameLog.slice(); nl28.push(td3.icon + ' Tradition: ' + td3.name); upd('colonyLog', nl28);
                            if (typeof addXP === 'function') addXP(20, 'Tradition: ' + td3.name);
                          }
                        },
                        disabled: !canAdopt,
                        className: 'px-2 py-1 rounded-lg text-[9px] font-bold ml-2 ' + (canAdopt ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-500')
                      }, '\uD83D\uDD2C 10 sci')
                    );
                  })
                )
              ),
              // Tradition narration
              d.tradNarration && React.createElement('div', { className: 'rounded-xl p-3 border mb-3 relative overflow-hidden', style: { background: 'linear-gradient(135deg, #451a03, #422006)', borderColor: '#ca8a04', boxShadow: '0 0 15px rgba(202,138,4,0.2)', animation: 'kp-fadeIn 0.5s ease-out' } },
                React.createElement('div', { className: 'absolute -right-6 -top-6 text-5xl opacity-10', style: { filter: 'blur(3px)' } }, '\uD83C\uDF0D'),
                React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                  React.createElement('span', { className: 'text-[10px] font-bold', style: { color: '#fbbf24', textShadow: '0 0 8px rgba(251,191,36,0.3)' } }, '\uD83C\uDF0D Cultural Integration'),
                  React.createElement('button', { onClick: function () { upd('tradNarration', null); }, className: 'text-amber-500 text-xs hover:text-amber-300 transition-colors' }, '\u2715')
                ),
                React.createElement('p', { className: 'text-[9px] text-amber-100 italic leading-relaxed' }, '\uD83C\uDFA4 ' + d.tradNarration)
              ),
              // Colony Values radar
              d.showPolicy && React.createElement('div', { className: 'rounded-xl p-3 border mb-3', style: { background: 'linear-gradient(135deg, #1e1b4b, #0f172a)', borderColor: '#6366f120' } },
                d.colonyCharter && React.createElement('div', { className: 'bg-amber-950/30 rounded-lg p-2 mb-2 border border-amber-800' },
                  React.createElement('h5', { className: 'text-[9px] font-bold text-amber-300 mb-1' }, '\uD83D\uDCDC Colony Charter'),
                  React.createElement('p', { className: 'text-[8px] text-amber-200 italic leading-relaxed' }, d.colonyCharter)
                ),
                React.createElement('h4', { className: 'text-[10px] font-bold text-slate-300 mb-2' }, '\uD83C\uDFAD Colony Identity'),
                React.createElement('div', { className: 'grid grid-cols-5 gap-1 text-center' },
                  Object.keys(colonyValues).map(function (vk3) {
                    var val = colonyValues[vk3];
                    var icons = { collectivism: '\uD83E\uDD1D', innovation: '\uD83D\uDCA1', ecology: '\uD83C\uDF3F', tradition: '\uD83C\uDFDB\uFE0F', openness: '\uD83C\uDF10' };
                    return React.createElement('div', { key: vk3 },
                      React.createElement('div', { className: 'text-lg' }, icons[vk3] || '\u2022'),
                      React.createElement('div', { className: 'text-[8px] text-slate-400 capitalize' }, vk3),
                      React.createElement('div', { className: 'w-full bg-slate-700 rounded-full h-1.5 mt-1' },
                        React.createElement('div', {
                          className: 'h-1.5 rounded-full transition-all ' + (val > 60 ? 'bg-green-500' : val > 40 ? 'bg-amber-500' : 'bg-red-500'),
                          style: { width: val + '%' }
                        })
                      ),
                      React.createElement('div', { className: 'text-[7px] text-slate-500 mt-0.5' }, val)
                    );
                  })
                ),
                React.createElement('div', { className: 'mt-2 text-center' },
                  React.createElement('div', { className: 'text-[9px] ' + (equity > 60 ? 'text-green-400' : equity > 35 ? 'text-amber-400' : 'text-red-400') },
                    '\u2696\uFE0F Resource Equity: ' + equity + '%' + (equity > 75 ? ' \u2014 Fair & thriving' : equity > 50 ? ' \u2014 Moderate inequality' : equity > 25 ? ' \u2014 Growing inequality' : ' \u2014 Crisis! Settlers restless'))
                )
              ),
              // Research Panel
              d.showResearch && React.createElement('div', { className: 'rounded-xl p-3 border mb-3', style: { background: 'linear-gradient(135deg, #1e1b4b, #2e1065, #0f172a)', borderColor: '#7c3aed40', animation: 'kp-fadeIn 0.3s ease-out' } },
                React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                  React.createElement('h4', { className: 'text-sm font-bold', style: { color: '#a78bfa', textShadow: '0 0 10px rgba(167,139,250,0.3)' } }, '\uD83E\uDDEC Research Tree'),
                  React.createElement('div', { className: 'flex items-center gap-1.5' },
                    React.createElement('div', { className: 'w-16 h-2 rounded-full overflow-hidden', style: { background: '#1e293b' } }, React.createElement('div', { className: 'h-2 rounded-full', style: { width: (researchQueue.length * 10) + '%', background: 'linear-gradient(90deg, #7c3aed, #a78bfa)', animation: 'kp-barFill 1s ease-out' } })),
                    React.createElement('span', { className: 'text-[9px] font-bold text-violet-300' }, researchQueue.length + '/10')
                  )
                ),
                React.createElement('p', { className: 'text-[9px] text-violet-300/60 mb-2' }, 'Spend science to unlock permanent bonuses. Complete all 10 for Research Victory!'),
                React.createElement('div', { className: 'grid grid-cols-1 gap-2' },
                  researchDefs.map(function (rd2) {
                    var isResearched = researchQueue.indexOf(rd2.id) >= 0;
                    var canResearch = !isResearched && resources.science >= rd2.cost;
                    var eraReady = rd2.era === 'expansion' ? (era !== 'survival') : rd2.era === 'prosperity' ? (era === 'prosperity' || era === 'transcendence') : rd2.era === 'transcendence' ? era === 'transcendence' : true;
                    var eraGradients = { expansion: 'linear-gradient(135deg, #172554, #1e1b4b)', prosperity: 'linear-gradient(135deg, #312e81, #4a1d96)', transcendence: 'linear-gradient(135deg, #4a1d96, #831843)' };
                    return React.createElement('div', {
                      key: rd2.id, className: 'p-2 rounded-xl border flex items-center justify-between transition-all ' + (eraReady && canResearch ? 'hover:scale-[1.01]' : ''),
                      style: isResearched ? { background: 'linear-gradient(135deg, #2e1065, #4c1d95)', borderColor: '#8b5cf6', boxShadow: '0 0 10px rgba(139,92,246,0.2)' } : eraReady && canResearch ? { background: eraGradients[rd2.era] || '#0f172a', borderColor: '#6366f140' } : { background: '#0f172a', borderColor: '#1e293b', opacity: 0.4 }
                    },
                      React.createElement('div', { className: 'flex items-center gap-2' },
                        React.createElement('span', { className: 'text-lg' }, rd2.icon),
                        React.createElement('div', null,
                          React.createElement('span', { className: 'text-[10px] font-bold text-white' }, rd2.name),
                          isResearched && React.createElement('span', { className: 'text-violet-400 ml-1 text-[8px]' }, '\u2705'),
                          React.createElement('div', { className: 'text-[8px] text-slate-400' }, rd2.desc),
                          !eraReady && React.createElement('div', { className: 'text-[8px] text-red-400' }, '\u26D4 Requires ' + rd2.era + ' era')
                        )
                      ),
                      !isResearched && eraReady && React.createElement('button', {
                        onClick: function () {
                          if (resources.science >= rd2.cost) {
                            // Science challenge gate for research
                            upd('scienceGateLoading', true);
                            var modeR = (d.colonyMode || 'mcq') === 'mcq' ?
                              'Return ONLY valid JSON: {"question":"<question>","options":["<correct>","<wrong1>","<wrong2>","<wrong3>","<wrong4>","<wrong5>"],"correctIndex":0,"explanation":"<2-3 sentences>"}. 6 options, shuffle correct (0-5).' :
                              'Return ONLY valid JSON: {"question":"<question>","answer":"<1-3 words>","explanation":"<2-3 sentences>"}';
                            callGemini('Generate a ' + rd2.domain + ' science question about ' + rd2.name + ' for a space colony research project. Difficulty: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '. ' + modeR, true).then(function (result) {
                              try {
                                var cl3 = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                                var s4 = cl3.indexOf('{'); if (s4 > 0) cl3 = cl3.substring(s4);
                                var e4 = cl3.lastIndexOf('}'); if (e4 > 0) cl3 = cl3.substring(0, e4 + 1);
                                var rq = JSON.parse(cl3);
                                rq.building = '_research_' + rd2.id; rq.domain = rd2.domain; rq.mode = rq.options ? 'mcq' : 'freeResponse';
                                rq._researchId = rd2.id; rq._researchCost = rd2.cost;
                                upd('scienceGate', rq); upd('scienceGateLoading', false);
                              } catch (err) { upd('scienceGateLoading', false); }
                            }).catch(function () { upd('scienceGateLoading', false); });
                          }
                        },
                        disabled: !canResearch,
                        className: 'px-2 py-1 rounded-lg text-[9px] font-bold ' + (canResearch ? 'bg-violet-500 text-white' : 'bg-slate-700 text-slate-500')
                      }, '\uD83D\uDD2C ' + rd2.cost + ' sci')
                    );
                  })
                )
              ),
              // Great Scientists Panel
              d.showGreatSci && React.createElement('div', { className: 'rounded-xl p-3 border mb-3', style: { background: 'linear-gradient(135deg, #422006, #1c1917, #0f172a)', borderColor: '#ca8a0440', animation: 'kp-fadeIn 0.3s ease-out' } },
                React.createElement('h4', { className: 'text-sm font-bold mb-2', style: { color: '#fbbf24', textShadow: '0 0 10px rgba(251,191,36,0.3)' } }, '\uD83E\uDD16 Digital Mentors \u2014 Earth Archive AI'),
                React.createElement('p', { className: 'text-[9px] text-amber-300/60 mb-2' }, 'AI reconstructions of history\u2019s greatest minds, stored in the colony ship\u2019s quantum memory. Activated as your computing power grows. Click a mentor to consult them!'),
                greatScientists.length === 0 && React.createElement('div', { className: 'text-center text-slate-500 text-[10px] py-4' }, 'No Great Scientists yet. Maintain high science reserves!'),
                React.createElement('div', { className: 'grid grid-cols-3 gap-2' },
                  greatScientists.map(function (gs4, gi) {
                    return React.createElement('div', { key: gi, className: 'rounded-xl p-2 text-center transition-all hover:scale-[1.03]', style: { background: 'linear-gradient(135deg, #451a03, #1c1917)', border: '1px solid #ca8a0440', boxShadow: '0 0 10px rgba(202,138,4,0.15)' } },
                      React.createElement('div', { className: 'text-2xl', style: { animation: 'kp-float 5s infinite' } }, gs4.icon),
                      React.createElement('div', { className: 'text-[9px] font-bold mt-1', style: { color: '#fde68a', textShadow: '0 0 6px rgba(253,230,138,0.3)' } }, gs4.name),
                      React.createElement('div', { className: 'text-[7px] text-cyan-400' }, '\uD83E\uDD16 AI Simulation'),
                      React.createElement('div', { className: 'text-[8px] text-yellow-400' }, '+' + gs4.amount + ' ' + gs4.bonus + '/turn'),
                      React.createElement('div', { className: 'text-[7px] text-slate-400 mt-1 italic' }, gs4.fact),
                      React.createElement('button', {
                        onClick: function () {
                          upd('mentorChatLoading', gs4.name);
                          callGemini('You are an AI reconstruction of ' + gs4.name + ', a famous scientist, running on the quantum computers of a space colony on planet Kepler-442b in the far future. A colonist is consulting you for advice. Stay in character as ' + gs4.name + '. Respond warmly but share real scientific knowledge from your field (' + gs4.specialty + '). Reference your real historical achievements. Give practical advice that would help the colony. Keep response to 3-4 sentences. Difficulty: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '. Current colony situation: Turn ' + turn + ', ' + settlers.length + ' settlers, ' + buildings.length + ' buildings, ' + terraform + '% terraformed.', true).then(function (mentorResult) {
                            upd('mentorChat', { name: gs4.name, icon: gs4.icon, text: mentorResult }); upd('mentorChatLoading', null);
                            if (d.colonyTTS) colonySpeak(mentorResult, gs4.specialty === 'biology' || gs4.name === 'Mae Jemison' || gs4.name === 'Rachel Carson' || gs4.name === 'Rosalind Franklin' || gs4.name === 'Ada Lovelace' ? 'female' : 'narrator');
                          }).catch(function () { upd('mentorChatLoading', null); });
                        },
                        className: 'mt-1 w-full py-1 rounded-lg bg-yellow-800 text-yellow-200 text-[8px] font-bold hover:bg-yellow-700'
                      }, d.mentorChatLoading === gs4.name ? '\u23F3...' : '\uD83D\uDCAC Consult')
                    );
                  })
                ),
                d.mentorChat && React.createElement('div', { className: 'mt-2 rounded-xl p-3', style: { background: 'linear-gradient(135deg, #451a03, #422006)', border: '1px solid #ca8a04', boxShadow: '0 0 15px rgba(202,138,4,0.2)', animation: 'kp-fadeIn 0.5s ease-out' } },
                  React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                    React.createElement('span', { className: 'text-[10px] font-bold text-yellow-300' }, d.mentorChat.icon + ' ' + d.mentorChat.name + ' (AI)'),
                    React.createElement('button', { onClick: function () { upd('mentorChat', null); }, className: 'text-yellow-500 text-xs' }, '\u2715')
                  ),
                  React.createElement('p', { className: 'text-[9px] text-yellow-100 leading-relaxed italic' }, '\u201C' + d.mentorChat.text + '\u201D')
                ),
                greatScientists.length < greatSciDefs.length && React.createElement('div', { className: 'mt-2 text-[8px] text-slate-500 text-center' },
                  '\u23F3 Next activation in ~' + (15 - (turn % 15)) + ' turns (need \uD83D\uDD2C 10+)'
                )
              ),
              // ══ Science Journal ══
              d.showJournal && React.createElement('div', { className: 'rounded-xl p-3 border mb-3 max-h-72 overflow-y-auto', style: { background: 'linear-gradient(135deg, #0f172a, #1a2e05, #0f172a)', borderColor: '#16a34a30', animation: 'kp-fadeIn 0.3s ease-out' } },
                React.createElement('h4', { className: 'text-sm font-bold mb-2', style: { color: '#4ade80', textShadow: '0 0 10px rgba(74,222,128,0.3)' } }, '\uD83D\uDCD6 Science Journal \u2014 ' + scienceJournal.length + ' Entries'),
                scienceJournal.length === 0 && React.createElement('div', { className: 'text-center text-slate-500 text-[10px] py-4' }, 'No entries yet. Answer science gates and explore anomalies!'),
                scienceJournal.slice().reverse().map(function (jEntry, ji) {
                  var domainColors = { biology: '#22c55e', physics: '#6366f1', chemistry: '#f59e0b', math: '#ef4444', geology: '#a78bfa', ecology: '#14b8a6' };
                  var dc = domainColors[(jEntry.source || '').split(':')[0].toLowerCase().trim()] || '#64748b';
                  return React.createElement('div', { key: ji, className: 'mb-2 rounded-lg p-2 border', style: { background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderColor: dc + '30', animation: ji === 0 ? 'kp-fadeIn 0.5s ease-out' : 'none' } },
                    React.createElement('div', { className: 'flex items-center justify-between mb-1' },
                      React.createElement('span', { className: 'text-[9px] font-bold', style: { color: dc } }, '\uD83D\uDD2C ' + jEntry.source),
                      React.createElement('span', { className: 'text-[7px] text-slate-500' }, 'Turn ' + jEntry.turn)
                    ),
                    React.createElement('div', { className: 'text-[9px] text-slate-300 leading-relaxed' }, jEntry.fact)
                  );
                })
              ),
              // Settler Chat
              d.settlerChat && d.talkSettler !== undefined && React.createElement('div', { className: 'rounded-xl p-3 border mb-3', style: { background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderColor: '#6366f1', boxShadow: '0 0 15px rgba(99,102,241,0.2)', animation: 'kp-fadeIn 0.5s ease-out' } },
                React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                  React.createElement('span', { className: 'text-[10px] font-bold text-indigo-300' },
                    (settlers[d.talkSettler] ? settlers[d.talkSettler].icon + ' ' + settlers[d.talkSettler].name : '') + ' says:'
                  ),
                  React.createElement('button', { onClick: function () { upd('settlerChat', null); }, className: 'text-indigo-400 text-xs' }, '\u2715')
                ),
                React.createElement('p', { className: 'text-[10px] text-indigo-200 leading-relaxed italic' },
                  d.settlerChatLoading ? '\u23F3 Thinking...' : d.settlerChat
                )
              ),
              // Resource Conversion
              React.createElement('div', { className: 'rounded-xl p-2 border mb-3', style: { background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderColor: '#33415520' } },
                React.createElement('div', { className: 'flex items-center justify-between mb-1' },
                  React.createElement('h4', { className: 'text-[9px] font-bold uppercase', style: { color: '#94a3b8' } }, '\u267B Resource Converter'),
                  React.createElement('span', { className: 'text-[8px]', style: { color: '#475569' } }, 'Trade 5 of one for 3 of another')
                ),
                React.createElement('div', { className: 'flex gap-1 flex-wrap' },
                  [['food', 'energy'], ['energy', 'materials'], ['materials', 'science'], ['water', 'food'], ['science', 'energy']].map(function (pair) {
                    var from = pair[0]; var to = pair[1];
                    var icons = { food: '\uD83C\uDF3E', energy: '\u26A1', water: '\uD83D\uDCA7', materials: '\uD83E\uDEA8', science: '\uD83D\uDD2C' };
                    return React.createElement('button', {
                      key: from + to,
                      onClick: function () {
                        if (resources[from] >= 5) {
                          var nr6 = Object.assign({}, resources); nr6[from] -= 5; nr6[to] += 3; upd('colonyRes', nr6);
                          if (addToast) addToast(icons[from] + ' 5 ' + from + ' \u2192 ' + icons[to] + ' 3 ' + to, 'info');
                        }
                      },
                      disabled: resources[from] < 5,
                      className: 'px-2 py-1 rounded-lg text-[8px] border ' + (resources[from] >= 5 ? 'border-slate-600 bg-slate-900 text-slate-300 hover:border-indigo-500' : 'border-slate-700 bg-slate-900/50 text-slate-600')
                    }, icons[from] + '\u2192' + icons[to]);
                  })
                )
              ),
              // ══ Expeditions Panel ══
              d.showExpeditions && React.createElement('div', { className: 'rounded-xl p-3 border mb-3', style: { background: 'linear-gradient(135deg, #0c4a6e, #164e63, #0f172a)', borderColor: '#06b6d430', animation: 'kp-fadeIn 0.3s ease-out' } },
                React.createElement('h4', { className: 'text-sm font-bold mb-2', style: { color: '#22d3ee', textShadow: '0 0 10px rgba(34,211,238,0.3)' } }, '\u26F5 Expeditions'),
                activeExpedition && React.createElement('div', { className: 'rounded-xl p-3 mb-3 relative overflow-hidden', style: { background: 'linear-gradient(135deg, #164e63, #0c4a6e)', border: '1px solid #06b6d4', boxShadow: '0 0 15px rgba(6,182,212,0.2)' } },
                  React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                    React.createElement('span', { className: 'text-[10px] font-bold text-cyan-200' }, '\u26F5 ' + activeExpedition.type + ' in progress...'),
                    React.createElement('span', { className: 'text-[9px] text-cyan-400 font-bold' }, activeExpedition.turnsLeft + ' turns left')
                  ),
                  React.createElement('div', { className: 'w-full h-3 rounded-full overflow-hidden', style: { background: '#0f172a' } },
                    React.createElement('div', { className: 'h-3 rounded-full transition-all', style: { width: ((activeExpedition.totalTurns - activeExpedition.turnsLeft) / activeExpedition.totalTurns * 100) + '%', background: 'linear-gradient(90deg, #06b6d4, #22d3ee)', animation: 'kp-barFill 1s ease-out', boxShadow: '0 0 8px rgba(6,182,212,0.4)' } })
                  ),
                  React.createElement('div', { className: 'mt-1 text-[8px] text-cyan-400/60' }, 'Crew is exploring... Results on completion.')
                ),
                !activeExpedition && React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
                  [
                    { type: 'Deep Sea Survey', icon: '\uD83C\uDF0A', desc: 'Explore alien oceans for resources & life.', cost: { energy: 8, science: 5 }, turns: 3, color: '#3b82f6' },
                    { type: 'Highland Expedition', icon: '\u26F0\uFE0F', desc: 'Scale mountains for minerals & vantage points.', cost: { energy: 10, science: 5 }, turns: 4, color: '#a78bfa' },
                    { type: 'Underground Survey', icon: '\uD83D\uDD73\uFE0F', desc: 'Map caverns for rare minerals & fossils.', cost: { energy: 12, science: 8 }, turns: 5, color: '#f59e0b' },
                    { type: 'Orbital Scan', icon: '\uD83D\uDE80', desc: 'Launch satellite for planetary survey.', cost: { energy: 15, science: 10 }, turns: 4, color: '#06b6d4' }
                  ].map(function(exp) {
                    var canLaunch = Object.keys(exp.cost).every(function(k) { return resources[k] >= exp.cost[k]; }) && actionPoints >= 2;
                    return React.createElement('button', { key: exp.type, onClick: function() {
                      if (!canLaunch) return;
                      if (!spendAP(2)) return;
                      var nr = Object.assign({}, resources); Object.keys(exp.cost).forEach(function(k) { nr[k] -= exp.cost[k]; }); upd('colonyRes', nr);
                      upd('activeExpedition', { type: exp.type, turnsLeft: exp.turns, totalTurns: exp.turns });
                      var nl = gameLog.slice(); nl.push('\u26F5 Launched: ' + exp.type); upd('colonyLog', nl);
                      if (addToast) addToast('\u26F5 ' + exp.type + ' launched! Returns in ' + exp.turns + ' turns.', 'success');
                    }, disabled: !canLaunch,
                      className: 'p-2.5 rounded-xl text-left transition-all ' + (canLaunch ? 'hover:scale-[1.02]' : ''),
                      style: canLaunch ? { background: 'linear-gradient(135deg, #0f172a, #164e63)', border: '1px solid ' + exp.color + '40', boxShadow: '0 0 8px ' + exp.color + '15' } : { background: '#0f172a', border: '1px solid #1e293b', opacity: 0.4 }
                    },
                      React.createElement('div', { className: 'flex items-center gap-1.5 mb-1' },
                        React.createElement('span', { className: 'text-lg' }, exp.icon),
                        React.createElement('span', { className: 'text-[9px] font-bold', style: { color: exp.color } }, exp.type)
                      ),
                      React.createElement('div', { className: 'text-[8px] text-slate-400 mb-1' }, exp.desc),
                      React.createElement('div', { className: 'text-[7px] text-slate-500' }, Object.keys(exp.cost).map(function(k) { return exp.cost[k] + ' ' + k; }).join(', ') + ' \u2022 ' + exp.turns + ' turns')
                    );
                  })
                ),
                d.expResult && React.createElement('div', { className: 'mt-2 rounded-xl p-3', style: { background: 'linear-gradient(135deg, #0c4a6e, #164e63)', border: '1px solid #06b6d4', animation: 'kp-fadeIn 0.5s ease-out' } },
                  React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                    React.createElement('span', { className: 'text-[10px] font-bold text-cyan-200' }, (d.expResult.emoji || '\u26F5') + ' ' + d.expResult.title),
                    React.createElement('button', { onClick: function() { upd('expResult', null); }, className: 'text-cyan-400 text-xs' }, '\u2715')
                  ),
                  React.createElement('p', { className: 'text-[9px] text-cyan-100 leading-relaxed italic' }, d.expResult.narrative),
                  d.expResult.lesson && React.createElement('div', { className: 'mt-1.5 rounded-lg p-2 text-[8px] text-cyan-300', style: { background: '#0f172a80', border: '1px solid #06b6d420' } }, '\uD83D\uDCDA ' + d.expResult.lesson)
                )
              ),
              // ══ Wonders Panel ══
              d.showWonders && React.createElement('div', { className: 'rounded-xl p-3 border mb-3', style: { background: 'linear-gradient(135deg, #451a03, #78350f, #0f172a)', borderColor: '#f59e0b30', animation: 'kp-fadeIn 0.3s ease-out' } },
                React.createElement('h4', { className: 'text-sm font-bold mb-2', style: { color: '#fbbf24', textShadow: '0 0 10px rgba(251,191,36,0.3)' } }, '\uD83C\uDFDB\uFE0F Wonders of Kepler'),
                React.createElement('p', { className: 'text-[9px] text-amber-300/60 mb-2' }, 'Mega-structures requiring multiple science challenges to complete. Each provides powerful permanent bonuses.'),
                React.createElement('div', { className: 'grid gap-2' },
                  wonderDefs.map(function(wd) {
                    var isComplete = wonders[wd.id];
                    var progress = wonders[wd.id + '_progress'] || 0;
                    var eraOk = wd.era === 'prosperity' ? (era === 'prosperity' || era === 'transcendence') : wd.era === 'transcendence' ? era === 'transcendence' : true;
                    var canAfford = eraOk && !isComplete && Object.keys(wd.cost).every(function(k) { return resources[k] >= wd.cost[k]; });
                    return React.createElement('div', { key: wd.id, className: 'rounded-xl p-3 transition-all ' + (isComplete ? '' : canAfford ? 'hover:scale-[1.01]' : ''),
                      style: isComplete ? { background: 'linear-gradient(135deg, #78350f, #92400e)', border: '2px solid #f59e0b', boxShadow: '0 0 20px rgba(245,158,11,0.3)', animation: 'kp-glow 3s infinite' } : canAfford ? { background: 'linear-gradient(135deg, #1c1917, #292524)', border: '1px solid #78350f' } : { background: '#0f172a', border: '1px solid #1e293b', opacity: 0.5 }
                    },
                      React.createElement('div', { className: 'flex items-center justify-between mb-1' },
                        React.createElement('div', { className: 'flex items-center gap-2' },
                          React.createElement('span', { className: 'text-2xl', style: isComplete ? { animation: 'kp-float 3s infinite' } : {} }, wd.icon),
                          React.createElement('div', null,
                            React.createElement('div', { className: 'text-[10px] font-bold', style: { color: isComplete ? '#fbbf24' : '#d4d4d8' } }, wd.name),
                            React.createElement('div', { className: 'text-[8px]', style: { color: isComplete ? '#fcd34d' : '#71717a' } }, wd.desc)
                          )
                        ),
                        isComplete ? React.createElement('span', { className: 'text-[9px] font-bold px-2 py-0.5 rounded-full', style: { background: '#f59e0b30', color: '#fbbf24', border: '1px solid #f59e0b' } }, '\u2728 COMPLETE') :
                        canAfford ? React.createElement('button', {
                          onClick: function() {
                            upd('scienceGateLoading', true);
                            var modeW = (d.colonyMode || 'mcq') === 'mcq' ? 'Return ONLY valid JSON: {"question":"<question>","options":["<correct>","<wrong1>","<wrong2>","<wrong3>","<wrong4>","<wrong5>"],"correctIndex":0,"explanation":"<2-3 sentences>"}. 6 options, shuffle correct (0-5).' : 'Return ONLY valid JSON: {"question":"<question>","answer":"<1-3 words>","explanation":"<2-3 sentences>"}';
                            callGemini('Generate a challenging ' + wd.domain + ' science question about building a ' + wd.name + ' (' + wd.desc + ') in a space colony. Challenge ' + (progress + 1) + ' of ' + wd.challenges + '. Difficulty: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '. ' + modeW, true).then(function(result) {
                              try {
                                var cl = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                                var s = cl.indexOf('{'); if (s > 0) cl = cl.substring(s);
                                var e = cl.lastIndexOf('}'); if (e > 0) cl = cl.substring(0, e + 1);
                                var gp = JSON.parse(cl);
                                gp.building = '_wonder_' + wd.id; gp.domain = wd.domain; gp.mode = gp.options ? 'mcq' : 'freeResponse';
                                gp._wonderId = wd.id; gp._wonderChallenges = wd.challenges; gp._wonderName = wd.name; gp._wonderCost = wd.cost;
                                upd('scienceGate', gp); upd('scienceGateLoading', false);
                              } catch(err) { upd('scienceGateLoading', false); }
                            }).catch(function() { upd('scienceGateLoading', false); });
                          },
                          className: 'px-2 py-1 rounded-lg text-[9px] font-bold',
                          style: { background: 'linear-gradient(135deg, #78350f, #92400e)', color: '#fbbf24', border: '1px solid #f59e0b40' }
                        }, '\uD83D\uDD2C Challenge ' + (progress + 1) + '/' + wd.challenges) : null
                      ),
                      !isComplete && progress > 0 && React.createElement('div', { className: 'mt-1.5' },
                        React.createElement('div', { className: 'w-full h-2 rounded-full overflow-hidden', style: { background: '#1e293b' } },
                          React.createElement('div', { className: 'h-2 rounded-full', style: { width: (progress / wd.challenges * 100) + '%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', animation: 'kp-barFill 1s ease-out' } })
                        ),
                        React.createElement('div', { className: 'text-[7px] text-amber-400/60 mt-0.5' }, 'Progress: ' + progress + '/' + wd.challenges + ' challenges')
                      ),
                      !isComplete && !eraOk && React.createElement('div', { className: 'text-[8px] text-red-400 mt-1' }, '\u26D4 Requires ' + wd.era + ' era'),
                      !isComplete && eraOk && React.createElement('div', { className: 'text-[7px] text-slate-500 mt-1' }, 'Cost: ' + Object.keys(wd.cost).map(function(k) { return wd.cost[k] + ' ' + k; }).join(', '))
                    );
                  })
                )
              ),
              // ══ Rover Fleet HUD ══
              d.showRoverPanel && React.createElement('div', { className: 'rounded-xl p-3 border mb-3', style: { background: 'linear-gradient(135deg, #0f172a, #164e63, #0f172a)', borderColor: '#06b6d430', animation: 'kp-fadeIn 0.3s ease-out' } },
                React.createElement('h4', { className: 'text-sm font-bold mb-2', style: { color: '#22d3ee', textShadow: '0 0 10px rgba(34,211,238,0.3)' } }, '\uD83D\uDE99 Rover Fleet'),
                rovers.length === 0 && React.createElement('div', { className: 'text-center py-3 text-[10px] text-slate-500' }, 'No rovers deployed. Build one below!'),
                rovers.length > 0 && React.createElement('div', { className: 'grid gap-2 mb-2' },
                  rovers.map(function (rv3, ri) {
                    var rvDef3 = getRoverDef(rv3.type);
                    var isSelected = selectedRover === rv3.id;
                    return React.createElement('div', { key: rv3.id, className: 'rounded-lg p-2 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.01]', onClick: function() { upd('selectedRover', isSelected ? null : rv3.id); },
                      style: isSelected ? { background: 'linear-gradient(135deg, #164e63, #155e75)', border: '1px solid #06b6d4', boxShadow: '0 0 10px rgba(6,182,212,0.2)' } : { background: '#0f172a', border: '1px solid #1e293b' }
                    },
                      React.createElement('span', { className: 'text-xl' }, rvDef3.icon),
                      React.createElement('div', { className: 'flex-1' },
                        React.createElement('div', { className: 'text-[9px] font-bold', style: { color: rvDef3.color } }, rvDef3.name + ' (' + rv3.x + ',' + rv3.y + ')'),
                        React.createElement('div', { className: 'flex gap-2 mt-0.5' },
                          React.createElement('div', { className: 'flex items-center gap-1' },
                            React.createElement('span', { className: 'text-[7px] text-cyan-400' }, '\u26FD ' + rv3.fuel + '/' + rvDef3.maxFuel),
                            React.createElement('div', { className: 'w-10 h-1 rounded-full', style: { background: '#1e293b' } }, React.createElement('div', { className: 'h-1 rounded-full', style: { width: (rv3.fuel / rvDef3.maxFuel * 100) + '%', background: rv3.fuel > rvDef3.maxFuel * 0.3 ? '#06b6d4' : '#ef4444' } }))
                          ),
                          React.createElement('span', { className: 'text-[7px] text-emerald-400' }, '\uD83D\uDC63 ' + rv3.movesLeft + '/' + rvDef3.maxMoves + ' moves')
                        )
                      ),
                      React.createElement('button', { onClick: function(e) { e.stopPropagation(); refuelRover(rv3.id); }, className: 'px-1.5 py-0.5 rounded text-[7px] font-bold', style: { background: '#164e63', color: '#67e8f9', border: '1px solid #06b6d440' } }, '\u26FD +4')
                    );
                  })
                ),
                React.createElement('div', { className: 'grid grid-cols-3 gap-1.5' },
                  roverDefs.map(function (rd4) {
                    var canBuild2 = Object.keys(rd4.cost).every(function(k) { return resources[k] >= rd4.cost[k]; });
                    return React.createElement('button', { key: rd4.type, onClick: function() { if(canBuild2) buildRover(rd4.type); }, disabled: !canBuild2,
                      className: 'p-2 rounded-lg text-center transition-all ' + (canBuild2 ? 'hover:scale-[1.03]' : ''),
                      style: canBuild2 ? { background: 'linear-gradient(135deg, #0f172a, #164e63)', border: '1px solid ' + rd4.color + '40', color: rd4.color } : { background: '#0f172a', border: '1px solid #1e293b', color: '#334155' }
                    },
                      React.createElement('div', { className: 'text-lg' }, rd4.icon),
                      React.createElement('div', { className: 'text-[8px] font-bold' }, rd4.name),
                      React.createElement('div', { className: 'text-[7px] opacity-60' }, Object.keys(rd4.cost).map(function(k) { return rd4.cost[k] + ' ' + k; }).join(', '))
                    );
                  })
                )
              ),
              // ══ Advisor Bar ══
              turnPhase === 'day' && (function() { var adv = getAdvisorMessage(); return adv ? React.createElement('div', { className: 'mb-3 rounded-xl p-2.5 flex items-center gap-2.5', style: { background: 'linear-gradient(135deg, #172554, #1e1b4b)', border: '1px solid #1d4ed830', animation: 'kp-slideDown 0.5s ease-out' } },
                React.createElement('div', { className: 'text-2xl flex-shrink-0', style: { animation: 'kp-float 3s infinite' } }, adv.settler ? adv.settler.icon : '\uD83E\uDD16'),
                React.createElement('div', { className: 'flex-1 min-w-0' },
                  React.createElement('div', { className: 'text-[9px] font-bold text-blue-400' }, adv.settler ? adv.settler.name + ' \u2022 ' + adv.settler.role : 'Colony AI'),
                  React.createElement('div', { className: 'text-[10px] text-blue-200' }, adv.msg)
                )
              ) : null; })(),
              // Log
              React.createElement('div', { className: 'rounded-xl p-2 border max-h-28 overflow-y-auto', style: { background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', borderColor: '#334155' } },
                React.createElement('h4', { className: 'text-[9px] font-bold text-indigo-400 uppercase mb-1 flex items-center gap-1' }, '\uD83D\uDCDC Mission Log'),
                gameLog.slice(-8).reverse().map(function (log, li) { return React.createElement('div', { key: li, className: 'text-[8px] py-0.5 border-b border-slate-800/50', style: { color: li === 0 ? '#c4b5fd' : '#64748b', animation: li === 0 ? 'kp-fadeIn 0.5s ease-out' : 'none' } }, log); })
              ),
              React.createElement('button', {
                onClick: function () { upd('colonyPhase', 'setup'); upd('colony', null); upd('colonyMap', null); upd('colonyTurn', 0); upd('colonyEvent', null); upd('scienceGate', null); upd('colonyLog', []); if (addToast) addToast('Colony reset', 'info'); },
                className: 'mt-2 w-full py-2 rounded-xl text-[9px] font-bold transition-all hover:scale-[1.01]',
                style: { background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#64748b', border: '1px solid #334155', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }
              }, '\u267B Abandon & Start New')
            )
          );
        })(),

        // ═══════════════════════════════════════════════════════════════
        /* economicsLab: removed — see stem_tool_science.js */

        // ═══════════════════════════════════════════════════════════════
        // ██  BEHAVIOR SHAPING LAB — ABA Operant Conditioning Sim  ██
        // ═══════════════════════════════════════════════════════════════
        /* behaviorLab: removed — see stem_tool_science.js */

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
          var _pluginOnlyTools = {
            dnaLab: true, gameStudio: true, geoQuiz: true,
            geometryProver: true, logicLab: true, plateTectonics: true,
            titrationLab: true, wave: true,
            volume: true, codingPlayground: true, numberline: true, areamodel: true,
            fractionViz: true, fractions: true,
            base10: true, moneyMath: true,
            coordinate: true, protractor: true,
            archStudio: true, artStudio: true, dataStudio: true, cyberDefense: true,
            galaxy: true, brainAtlas: true,
            funcGrapher: true, physics: true,
            inequality: true, multtable: true, geoSandbox: true,
            waterCycle: true, dissection: true, rocks: true, creative: true,
            rockCycle: true, science: true, math: true,
            calculus: true, cell: true, chemBalance: true, punnett: true,
            circuit: true, molecule: true, decomposer: true, solarSystem: true,
            universe: true, ecosystem: true, unitConvert: true,
            anatomy: true, companionPlanting: true, graphCalc: true,
            algebraCAS: true, aquarium: true, economicsLab: true, behaviorLab: true
          };
          console.log('[StemLab Fallback] Attempting to render plugin: ' + stemLabTool + ' (registered: ' + window.StemLab.isRegistered(stemLabTool) + ')');
          if (!_pluginOnlyTools[stemLabTool]) return null;

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
            addToast: addToast,
            awardXP: typeof awardStemXP === 'function' ? awardStemXP : function() {},
            getXP: typeof getStemXP === 'function' ? getStemXP : function() { return 0; },
            announceToSR: typeof announceToSR === 'function' ? announceToSR : function() {},
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
            callTTS: typeof callTTS === 'function' ? callTTS : null,
            callImagen: typeof callImagen === 'function' ? callImagen : null,
            callGeminiVision: typeof callGeminiVision === 'function' ? callGeminiVision : null,
            gradeLevel: gradeLevel || '5th Grade',
            srOnly: function(text) { return React.createElement('span', { className: 'sr-only' }, text); },
            a11yClick: function(handler) { return { onClick: handler, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(e); } }, role: 'button', tabIndex: 0 }; },
            canvasA11yDesc: function(desc) { return { role: 'img', 'aria-label': desc }; },
            props: props || {},
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
            setLabToolData: typeof setLabToolData === 'function' ? setLabToolData : function() {}
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
