(function () {
  if (window.AlloModules && window.AlloModules.StemLab) { console.log('[CDN] StemLab already loaded, skipping duplicate'); } else {
    // stem_lab_module.js
    // Auto-extracted from AlloFlowANTI.txt
    // STEM Lab module for AlloFlow - loaded from GitHub CDN
    // Version: 1.0.0 (Feb 2026)

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
        t,
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
        gradeLevel
      } = props;

      // ── STEM Lab XP System (per-activity cap: 100 XP) ──
      var stemXpData = (labToolData && labToolData._stemXP) || {};
      function awardStemXP(activityId, points, reason) {
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
        if (addToast) addToast('\u2B50 +' + Math.min(points, 100) + ' XP: ' + (reason || 'STEM activity') + '!', 'success');
      }
      function getStemXP(activityId) {
        return (stemXpData[activityId] && stemXpData[activityId].earned) || 0;
      }
      function getStemXPCap(activityId) {
        return 100 - getStemXP(activityId);
      }
      var totalStemXP = stemXpData._total || 0;

      // STEM Lab modal JSX
      return /*#__PURE__*/React.createElement("div", {
        className: "fixed inset-0 z-[9999] flex items-stretch justify-center",
        style: {
          background: 'rgba(15,23,42,0.7)',
          backdropFilter: 'blur(6px)'
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "w-full max-w-5xl m-4 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center justify-between px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-3"
      }, React.createElement("div", {
        className: "flex items-center gap-1.5 bg-white/15 backdrop-blur rounded-full px-3 py-1 text-xs font-bold",
        title: "Total STEM Lab XP earned across all activities"
      }, React.createElement("span", null, "⭐"), React.createElement("span", null, totalStemXP + " XP")),
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
        className: "flex border-b border-slate-200 bg-slate-50 px-6"
      }, [{
        id: 'create',
        label: '\uD83D\uDCDD Create',
        desc: 'Generate & assess'
      }, {
        id: 'explore',
        label: '\uD83D\uDD27 Explore',
        desc: 'Manipulatives'
      }].map(tab => /*#__PURE__*/React.createElement("button", {
        key: tab.id,
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
        val: 'Step-by-Step',
        label: 'Step-by-Step'
      }, {
        val: 'Conceptual',
        label: 'Conceptual'
      }, {
        val: 'Real-World Application',
        label: 'Real-World'
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
        className: "text-[10px] text-slate-400 font-bold uppercase"
      }, "Tools:"), [{
        id: 'volume',
        icon: '📦',
        label: 'Volume Explorer'
      }, {
        id: 'numberline',
        icon: '📏',
        label: 'Number Line'
      }, {
        id: 'areamodel',
        icon: '🟧',
        label: 'Area Model'
      }, {
        id: 'fractionViz',
        icon: '🍕',
        label: 'Fraction Lab'
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
        className: "p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
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
            addToast('Fluency drill started! ' + fluencyBlocks.reduce((s, b) => s + b.quantity, 0) + ' problems', 'info');
            return;
          }
          const prompt = assessmentBlocks.map((b, i) => i + 1 + '. ' + b.type.replace('_', ' ') + ' (' + b.quantity + '): ' + (b.directive || 'general')).join('\n');
          setMathInput('Create an assessment with these sections:\n' + prompt);
          setMathMode('Problem Set Generator');
          setMathQuantity(assessmentBlocks.reduce((s, b) => s + b.quantity, 0));
          setActiveView('math');
          setShowStemLab(false);
          setTimeout(() => {
            if (typeof handleGenerateMath === 'function') handleGenerateMath('Create an assessment with these sections:\n' + prompt);
          }, 300);
        },
        className: "flex-1 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl text-sm hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
      }, /*#__PURE__*/React.createElement(Sparkles, {
        size: 16
      }), " Generate All (", assessmentBlocks.reduce((s, b) => s + b.quantity, 0), " problems)"), /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          const stemAssessment = {
            id: 'stem-' + Date.now(),
            type: 'stem-assessment',
            title: 'STEM Assessment: ' + (mathSubject || 'General Math'),
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
          addToast('STEM Assessment saved to resources (' + assessmentBlocks.length + ' blocks)', 'success');
        },
        className: "py-3 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl text-sm hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
      }, "\uD83D\uDCBE Save to Resources"), React.createElement("div", { className: "mt-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-4" },
        React.createElement("div", { className: "flex items-center gap-2 mb-2" },
          React.createElement("span", { className: "text-lg" }, "\u2B50"),
          React.createElement("h4", { className: "text-sm font-bold text-amber-800" }, "STEM Lab XP Progress"),
          React.createElement("span", { className: "ml-auto text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full" }, totalStemXP + " Total XP")
        ),
        React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]" },
          [
            { id: 'galaxy_quiz', label: '\uD83C\uDF0C Galaxy Quiz', icon: '\uD83C\uDF0C' },
            { id: 'galaxy_explore', label: '\u2B50 Galaxy Discovery', icon: '\u2B50' },
            { id: 'solar_quiz', label: '\uD83C\uDF0D Solar System', icon: '\uD83C\uDF0D' },
            { id: 'universe_explore', label: '\uD83C\uDF20 Universe', icon: '\uD83C\uDF20' },
            { id: 'cell_quiz', label: '\uD83D\uDD2C Cell Lab', icon: '\uD83D\uDD2C' },
            { id: 'rocks_quiz', label: '\uD83E\uDEA8 Rocks', icon: '\uD83E\uDEA8' }
          ].map(function (act) {
            var earned = getStemXP(act.id);
            var pct = Math.min(100, earned);
            return React.createElement("div", { key: act.id, className: "bg-white rounded-lg p-2 border border-amber-100" },
              React.createElement("div", { className: "flex items-center gap-1 mb-1" },
                React.createElement("span", null, act.icon),
                React.createElement("span", { className: "font-bold text-slate-700" }, act.label)
              ),
              React.createElement("div", { className: "w-full h-1.5 bg-amber-100 rounded-full overflow-hidden" },
                React.createElement("div", { className: "h-full rounded-full transition-all duration-500", style: { width: pct + '%', background: pct >= 100 ? 'linear-gradient(90deg, #f59e0b, #10b981)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)' } })
              ),
              React.createElement("div", { className: "flex justify-between mt-0.5" },
                React.createElement("span", { className: "text-amber-600" }, earned + "/100 XP"),
                pct >= 100 && React.createElement("span", { className: "text-green-600 font-bold" }, "\u2714 MAX")
              )
            );
          })
        )
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
        }, new Date(snap.timestamp).toLocaleTimeString()))))))), stemLabTab === 'explore' && !stemLabTool && /*#__PURE__*/React.createElement("div", {
          className: "grid grid-cols-2 gap-4 max-w-3xl mx-auto animate-in fade-in duration-200"
        }, [
          { id: '_cat_MathFundamentals', icon: '', label: 'Math Fundamentals', desc: '', color: 'slate', category: true },
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
            label: 'Number Line',
            desc: 'Interactive number line with draggable markers. Great for addition, subtraction, fractions.',
            color: 'blue',
            ready: true
          },
          {
            id: 'areamodel',
            icon: '🟧',
            label: 'Area Model',
            desc: 'Visual multiplication and division with color-coded rows and columns.',
            color: 'amber',
            ready: true
          },
          {
            id: 'fractionViz',
            icon: '🍕',
            label: 'Fraction Lab',
            desc: 'Compare fractions side-by-side (Compare tab) or practice with interactive challenges (Challenge tab).',
            color: 'rose',
            ready: true
          },
          {
            id: 'base10',
            icon: '🧮',
            label: 'Base-10 Blocks',
            desc: 'Place value with ones, tens, hundreds. Regroup and decompose numbers.',
            color: 'orange',
            ready: true
          },
          {
            id: 'coordinate',
            icon: '📍',
            label: 'Coordinate Grid',
            desc: 'Plot points, draw lines, and explore the coordinate plane.',
            color: 'cyan',
            ready: true
          },
          {
            id: 'protractor',
            icon: '📐',
            label: 'Angle Explorer',
            desc: 'Measure and construct angles. Classify acute, right, obtuse, and reflex.',
            color: 'purple',
            ready: true
          },
          {
            id: 'multtable',
            icon: '🔢',
            label: 'Multiplication Table',
            desc: 'Interactive times table grid. Spot patterns, practice facts with challenges.',
            color: 'pink',
            ready: true
          },
          { id: '_cat_AdvancedMath', icon: '', label: 'Advanced Math', desc: '', color: 'slate', category: true },
          {
            id: 'funcGrapher', icon: '📈', label: 'Function Grapher',
            desc: 'Plot linear, quadratic, and trig functions. Adjust coefficients in real-time.',
            color: 'indigo', ready: true
          },
          {
            id: 'inequality', icon: '🎨', label: 'Inequality Grapher',
            desc: 'Graph inequalities on number lines and coordinate planes.',
            color: 'fuchsia', ready: true
          },
          {
            id: 'calculus', icon: '∫', label: 'Calculus Visualizer',
            desc: 'Riemann sums, area under curves, and derivative tangent lines.',
            color: 'red', ready: true
          },
          { id: 'probability', icon: '\uD83C\uDFB2', label: 'Probability' },
          { id: 'fractions', icon: '\uD83C\uDF55', label: 'Fractions' },
          { id: 'unitConvert', icon: '\uD83D\uDCCF', label: 'Unit Converter' },
          { id: '_cat_Life&EarthScience', icon: '', label: 'Life & Earth Science', desc: '', color: 'slate', category: true },
          {
            id: 'cell', icon: '🔬', label: 'Cell Simulator',
            desc: 'Microscope mode: observe, control, and quiz on living organisms. Earn XP!',
            color: 'green', ready: true
          },
          {
            id: 'solarSystem', icon: '\uD83C\uDF0D', label: 'Solar System',
            desc: '3D interactive solar system with orbit, zoom, planet facts and quiz.',
            color: 'blue', ready: true
          },
          {
            id: 'galaxy', icon: '\uD83C\uDF0C', label: 'Galaxy Explorer',
            desc: 'Fly through a 3D Milky Way. Discover star types, nebulae, and black holes.',
            color: 'indigo', ready: true
          },
          {
            id: 'universe', icon: '\uD83C\uDF20', label: 'Universe Time-Lapse',
            desc: 'Experience 13.8 billion years of cosmic history, from the Big Bang to the far future.',
            color: 'violet', ready: true
          },
          { id: 'rocks', icon: '🪨', label: 'Rocks & Minerals', desc: 'Interactive rock cycle, mineral properties & geology', color: '#b45309', cat: 'explore' },
          { id: 'waterCycle', icon: '\uD83C\uDF0A', label: 'Water Cycle' },
          { id: 'rockCycle', icon: '\uD83E\uDEA8', label: 'Rock Cycle' },
          { id: 'ecosystem', icon: '\uD83D\uDC3A', label: 'Ecosystem' },
          { id: 'decomposer', icon: '⚗️', label: 'Decomposer', desc: 'Break materials into elements', ready: true },
          {
            id: 'anatomy', icon: '🫀', label: 'Human Anatomy',
            desc: 'Explore all 11 body systems with interactive canvas — skeletal, muscular, circulatory, nervous, and more.',
            color: 'rose', ready: true
          },
          {
            id: 'brainAtlas', icon: '🧠', label: 'Brain Atlas',
            desc: 'Detailed cerebral regions, lobes, nuclei and clinical correlations. Lateral, medial, inferior & coronal views.',
            color: 'purple', ready: true
          },
          {
            id: 'molecule', icon: '🔬', label: 'Molecule Builder',
            desc: 'Build molecules with atoms and bonds. Explore molecular geometry.',
            color: 'stone', ready: true
          },
          { id: '_cat_Physics&Chemistry', icon: '', label: 'Physics & Chemistry', desc: '', color: 'slate', category: true },
          {
            id: 'wave', icon: '🌊', label: 'Wave Simulator',
            desc: 'Adjust frequency, amplitude, wavelength. Explore interference patterns.',
            color: 'cyan', ready: true
          },
          {
            id: 'circuit', icon: '🔌', label: 'Circuit Builder',
            desc: 'Build circuits with resistors and batteries. Calculate voltage and current.',
            color: 'yellow', ready: true
          },
          {
            id: 'chemBalance', icon: '⚗️', label: 'Equation Balancer',
            desc: 'Balance chemical equations with visual atom counting.',
            color: 'lime', ready: true
          },
          {
            id: 'punnett', icon: '🧬', label: 'Punnett Square',
            desc: 'Genetic crosses with alleles. Predict genotype and phenotype ratios.',
            color: 'violet', ready: true
          },
          {
            id: 'physics', icon: '⚡', label: 'Physics Simulator',
            desc: 'Projectile motion, velocity vectors, and trajectory visualization.',
            color: 'sky', ready: true
          },
          {
            id: 'dataPlot', icon: '📊', label: 'Data Plotter',
            desc: 'Plot data points, fit trend lines, calculate correlation.',
            color: 'teal', ready: true
          },

          { id: '_cat_Arts&Music', icon: '', label: 'Arts & Music', desc: '', color: 'slate', category: true },

          {

            id: 'musicSynth', icon: '🎹', label: 'Music Synthesizer',

            desc: 'Play a piano, build beats, and learn the science of sound with real-time waveform visualization.',

            color: 'violet', ready: true

          },

        ].map(tool => tool.category
          ? /*#__PURE__*/React.createElement("div", {
            key: tool.id,
            className: "col-span-2 mt-3 first:mt-0"
          }, /*#__PURE__*/React.createElement("h3", {
            className: "text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1 mb-1"
          }, tool.label))
          : /*#__PURE__*/React.createElement("button", {
            key: tool.id,
            onClick: () => setStemLabTool(tool.id),
            className: `p-5 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] hover:shadow-xl bg-${tool.color}-50 border-${tool.color}-200 hover:border-${tool.color}-400`
          }, /*#__PURE__*/React.createElement("div", {
            className: "text-3xl mb-2"
          }, tool.icon), /*#__PURE__*/React.createElement("h4", {
            className: `font-bold text-sm text-${tool.color}-800 mb-1`
          }, tool.label), /*#__PURE__*/React.createElement("p", {
            className: `text-xs text-${tool.color}-600/70`
          }, tool.desc)))), stemLabTab === 'explore' && stemLabTool === 'volume' && (() => {
            const getBuilderVolume = positions => positions.size;
            const getBuilderSurfaceArea = positions => {
              let area = 0;
              const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
              for (const pos of positions) {
                const [x, y, z] = pos.split('-').map(Number);
                for (const [dx, dy, dz] of dirs) {
                  if (!positions.has(`${x + dx}-${y + dy}-${z + dz}`)) area++;
                }
              }
              return area;
            };
            const generateLBlock = () => {
              const positions = new Set();
              const bw = 2 + Math.floor(Math.random() * 3);
              const bd = 2 + Math.floor(Math.random() * 2);
              for (let x = 0; x < bw; x++) for (let y = 0; y < bd; y++) positions.add(`${x}-${y}-0`);
              const th = 1 + Math.floor(Math.random() * 2);
              for (let x = 0; x < Math.min(2, bw); x++) for (let y = 0; y < Math.min(2, bd); y++) for (let z = 1; z <= th; z++) positions.add(`${x}-${y}-${z}`);
              return {
                positions,
                volume: positions.size
              };
            };
            const handlePlaceCube = (x, y, z) => {
              if (cubeClickSuppressed.current) return;
              const key = `${x}-${y}-${z}`;
              setCubePositions(prev => {
                const next = new Set(prev);
                if (next.has(key)) {
                  next.delete(key);
                } else {
                  next.add(key);
                }
                return next;
              });
              setCubeBuilderFeedback(null);
            };
            const checkBuildChallenge = () => {
              if (!cubeBuilderChallenge) return;
              const vol = cubePositions.size;
              if (cubeBuilderChallenge.type === 'prism') {
                const t = cubeBuilderChallenge.target;
                const targetVol = t.l * t.w * t.h;
                let isRect = false;
                if (vol === targetVol) {
                  const coords = [...cubePositions].map(p => p.split('-').map(Number));
                  const xs = coords.map(c => c[0]),
                    ys = coords.map(c => c[1]),
                    zs = coords.map(c => c[2]);
                  const ddx = Math.max(...xs) - Math.min(...xs) + 1;
                  const ddy = Math.max(...ys) - Math.min(...ys) + 1;
                  const ddz = Math.max(...zs) - Math.min(...zs) + 1;
                  const dims = [ddx, ddy, ddz].sort((a, b) => a - b);
                  const target = [t.l, t.w, t.h].sort((a, b) => a - b);
                  isRect = dims[0] === target[0] && dims[1] === target[1] && dims[2] === target[2] && vol === ddx * ddy * ddz;
                }
                setCubeBuilderFeedback(isRect ? {
                  correct: true,
                  msg: '✅ Correct! ' + t.l + '×' + t.w + '×' + t.h + ' = ' + targetVol + ' cubes'
                } : {
                  correct: false,
                  msg: '❌ Not quite. Build a solid ' + t.l + '×' + t.w + '×' + t.h + ' rectangular prism (' + targetVol + ' cubes). You have ' + vol + '.'
                });
                setExploreScore(prev => ({
                  correct: prev.correct + (isRect ? 1 : 0),
                  total: prev.total + 1
                }));
              } else if (cubeBuilderChallenge.type === 'volume') {
                const ok = vol === cubeBuilderChallenge.answer;
                setCubeBuilderFeedback(ok ? {
                  correct: true,
                  msg: '✅ Correct! Volume = ' + cubeBuilderChallenge.answer + ' cubic units'
                } : {
                  correct: false,
                  msg: '❌ You placed ' + vol + ' cubes. The correct volume is ' + cubeBuilderChallenge.answer + '.'
                });
                setExploreScore(prev => ({
                  correct: prev.correct + (ok ? 1 : 0),
                  total: prev.total + 1
                }));
              }
            };
            const isSlider = cubeBuilderMode === 'slider';
            const volume = isSlider ? cubeDims.l * cubeDims.w * cubeDims.h : getBuilderVolume(cubePositions);
            const surfaceArea = isSlider ? 2 * (cubeDims.l * cubeDims.w + cubeDims.l * cubeDims.h + cubeDims.w * cubeDims.h) : getBuilderSurfaceArea(cubePositions);
            const cubeUnit = isSlider ? Math.max(18, Math.min(36, 240 / Math.max(cubeDims.l, cubeDims.w, cubeDims.h))) : 30;
            const handleLabCubeDrag = e => {
              if (!cubeDragRef.current) return;
              const ddx = e.clientX - cubeDragRef.current.x;
              const ddy = e.clientY - cubeDragRef.current.y;
              if (Math.abs(ddx) > 3 || Math.abs(ddy) > 3) cubeClickSuppressed.current = true;
              setCubeRotation(prev => ({
                x: Math.max(-80, Math.min(10, prev.x + ddy * 0.5)),
                y: prev.y + ddx * 0.5
              }));
              cubeDragRef.current = {
                x: e.clientX,
                y: e.clientY
              };
            };
            const handleLabCubeDragEnd = () => {
              cubeDragRef.current = null;
              window.removeEventListener('mousemove', handleLabCubeDrag);
              window.removeEventListener('mouseup', handleLabCubeDragEnd);
              setTimeout(() => {
                cubeClickSuppressed.current = false;
              }, 50);
            };
            const labCubeGrid = [];
            if (isSlider) {
              const maxLayer = cubeShowLayers !== null ? Math.min(cubeShowLayers, cubeDims.h) : cubeDims.h;
              for (let z = 0; z < maxLayer; z++) for (let y = 0; y < cubeDims.w; y++) for (let x = 0; x < cubeDims.l; x++) {
                const hue = 140 + z * 12;
                const lt = 55 + z * 4;
                labCubeGrid.push(React.createElement('div', {
                  key: x + '-' + y + '-' + z,
                  style: {
                    position: 'absolute',
                    width: cubeUnit + 'px',
                    height: cubeUnit + 'px',
                    transform: 'translate3d(' + x * cubeUnit + 'px,' + -z * cubeUnit + 'px,' + y * cubeUnit + 'px)',
                    transformStyle: 'preserve-3d'
                  }
                }, React.createElement('div', {
                  style: {
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    transform: 'translateZ(' + cubeUnit / 2 + 'px)',
                    background: 'hsla(' + hue + ',70%,' + lt + '%,0.85)',
                    border: '1px solid hsla(' + hue + ',80%,30%,0.4)',
                    boxSizing: 'border-box'
                  }
                }), React.createElement('div', {
                  style: {
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    transform: 'rotateY(180deg) translateZ(' + cubeUnit / 2 + 'px)',
                    background: 'hsla(' + hue + ',65%,' + (lt + 5) + '%,0.7)',
                    border: '1px solid hsla(' + hue + ',80%,30%,0.3)',
                    boxSizing: 'border-box'
                  }
                }), React.createElement('div', {
                  style: {
                    position: 'absolute',
                    width: cubeUnit + 'px',
                    height: '100%',
                    transform: 'rotateY(-90deg) translateZ(' + cubeUnit / 2 + 'px)',
                    background: 'hsla(' + (hue + 10) + ',60%,' + (lt - 5) + '%,0.8)',
                    border: '1px solid hsla(' + hue + ',80%,30%,0.3)',
                    boxSizing: 'border-box'
                  }
                }), React.createElement('div', {
                  style: {
                    position: 'absolute',
                    width: cubeUnit + 'px',
                    height: '100%',
                    transform: 'rotateY(90deg) translateZ(' + cubeUnit / 2 + 'px)',
                    background: 'hsla(' + (hue + 10) + ',60%,' + (lt + 3) + '%,0.8)',
                    border: '1px solid hsla(' + hue + ',80%,30%,0.3)',
                    boxSizing: 'border-box'
                  }
                }), React.createElement('div', {
                  style: {
                    position: 'absolute',
                    width: '100%',
                    height: cubeUnit + 'px',
                    transform: 'rotateX(90deg) translateZ(' + cubeUnit / 2 + 'px)',
                    background: 'hsla(' + (hue - 5) + ',75%,' + (lt + 8) + '%,0.9)',
                    border: '1px solid hsla(' + hue + ',80%,30%,0.4)',
                    boxSizing: 'border-box'
                  }
                }), React.createElement('div', {
                  style: {
                    position: 'absolute',
                    width: '100%',
                    height: cubeUnit + 'px',
                    transform: 'rotateX(-90deg) translateZ(' + cubeUnit / 2 + 'px)',
                    background: 'hsla(' + (hue + 5) + ',55%,' + (lt - 8) + '%,0.6)',
                    border: '1px solid hsla(' + hue + ',80%,30%,0.2)',
                    boxSizing: 'border-box'
                  }
                })));
              }
            } else {
              for (const pos of cubePositions) {
                const [x, y, z] = pos.split('-').map(Number);
                const hue = 200 + z * 15;
                const lt = 50 + z * 5;
                labCubeGrid.push(React.createElement('div', {
                  key: pos,
                  onClick: e => {
                    e.stopPropagation();
                    handlePlaceCube(x, y, z);
                  },
                  style: {
                    position: 'absolute',
                    width: cubeUnit + 'px',
                    height: cubeUnit + 'px',
                    transform: 'translate3d(' + x * cubeUnit + 'px,' + -z * cubeUnit + 'px,' + y * cubeUnit + 'px)',
                    transformStyle: 'preserve-3d',
                    cursor: 'pointer'
                  }
                }, React.createElement('div', {
                  style: {
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    transform: 'translateZ(' + cubeUnit / 2 + 'px)',
                    background: 'hsla(' + hue + ',70%,' + lt + '%,0.9)',
                    border: '1px solid hsla(' + hue + ',80%,30%,0.5)',
                    boxSizing: 'border-box'
                  }
                }), React.createElement('div', {
                  style: {
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    transform: 'rotateY(180deg) translateZ(' + cubeUnit / 2 + 'px)',
                    background: 'hsla(' + hue + ',65%,' + (lt + 5) + '%,0.75)',
                    border: '1px solid hsla(' + hue + ',80%,30%,0.35)',
                    boxSizing: 'border-box'
                  }
                }), React.createElement('div', {
                  style: {
                    position: 'absolute',
                    width: cubeUnit + 'px',
                    height: '100%',
                    transform: 'rotateY(-90deg) translateZ(' + cubeUnit / 2 + 'px)',
                    background: 'hsla(' + (hue + 10) + ',60%,' + (lt - 5) + '%,0.85)',
                    border: '1px solid hsla(' + hue + ',80%,30%,0.35)',
                    boxSizing: 'border-box'
                  }
                }), React.createElement('div', {
                  style: {
                    position: 'absolute',
                    width: cubeUnit + 'px',
                    height: '100%',
                    transform: 'rotateY(90deg) translateZ(' + cubeUnit / 2 + 'px)',
                    background: 'hsla(' + (hue + 10) + ',60%,' + (lt + 3) + '%,0.85)',
                    border: '1px solid hsla(' + hue + ',80%,30%,0.35)',
                    boxSizing: 'border-box'
                  }
                }), React.createElement('div', {
                  style: {
                    position: 'absolute',
                    width: '100%',
                    height: cubeUnit + 'px',
                    transform: 'rotateX(90deg) translateZ(' + cubeUnit / 2 + 'px)',
                    background: 'hsla(' + (hue - 5) + ',75%,' + (lt + 8) + '%,0.95)',
                    border: '1px solid hsla(' + hue + ',80%,30%,0.5)',
                    boxSizing: 'border-box'
                  }
                }), React.createElement('div', {
                  style: {
                    position: 'absolute',
                    width: '100%',
                    height: cubeUnit + 'px',
                    transform: 'rotateX(-90deg) translateZ(' + cubeUnit / 2 + 'px)',
                    background: 'hsla(' + (hue + 5) + ',55%,' + (lt - 8) + '%,0.65)',
                    border: '1px solid hsla(' + hue + ',80%,30%,0.25)',
                    boxSizing: 'border-box'
                  }
                })));
              }
              const gridSize = 8;
              for (let gx = 0; gx < gridSize; gx++) for (let gy = 0; gy < gridSize; gy++) {
                if (!cubePositions.has(`${gx}-${gy}-0`)) {
                  labCubeGrid.push(React.createElement('div', {
                    key: 'ground-' + gx + '-' + gy,
                    onClick: e => {
                      e.stopPropagation();
                      handlePlaceCube(gx, gy, 0);
                    },
                    onMouseEnter: () => setCubeHoverPos({
                      x: gx,
                      y: gy,
                      z: 0
                    }),
                    onMouseLeave: () => setCubeHoverPos(null),
                    style: {
                      position: 'absolute',
                      width: cubeUnit + 'px',
                      height: cubeUnit + 'px',
                      transform: 'translate3d(' + gx * cubeUnit + 'px,0px,' + gy * cubeUnit + 'px) rotateX(90deg)',
                      background: cubeHoverPos && cubeHoverPos.x === gx && cubeHoverPos.y === gy ? 'hsla(140,80%,55%,0.6)' : 'hsla(220,15%,60%,0.12)',
                      border: cubeHoverPos && cubeHoverPos.x === gx && cubeHoverPos.y === gy ? '2px solid hsla(140,80%,50%,0.7)' : '1px dashed hsla(220,20%,60%,0.25)',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      transition: 'background 0.15s'
                    }
                  }));
                }
              }
              for (const pos of cubePositions) {
                const [x, y, z] = pos.split('-').map(Number);
                const above = `${x}-${y}-${z + 1}`;
                if (!cubePositions.has(above) && z < 9) {
                  labCubeGrid.push(React.createElement('div', {
                    key: 'stack-' + above,
                    onClick: e => {
                      e.stopPropagation();
                      handlePlaceCube(x, y, z + 1);
                    },
                    onMouseEnter: () => setCubeHoverPos({
                      x,
                      y,
                      z: z + 1
                    }),
                    onMouseLeave: () => setCubeHoverPos(null),
                    style: {
                      position: 'absolute',
                      width: cubeUnit + 'px',
                      height: cubeUnit + 'px',
                      transform: 'translate3d(' + x * cubeUnit + 'px,' + -(z + 1) * cubeUnit + 'px,' + y * cubeUnit + 'px)',
                      transformStyle: 'preserve-3d',
                      cursor: 'pointer',
                      zIndex: 10
                    }
                  }, React.createElement('div', {
                    style: {
                      position: 'absolute',
                      width: '100%',
                      height: cubeUnit + 'px',
                      transform: 'rotateX(90deg) translateZ(' + cubeUnit / 2 + 'px)',
                      background: cubeHoverPos && cubeHoverPos.x === x && cubeHoverPos.y === y && cubeHoverPos.z === z + 1 ? 'hsla(140,70%,60%,0.6)' : 'transparent',
                      border: cubeHoverPos && cubeHoverPos.x === x && cubeHoverPos.y === y && cubeHoverPos.z === z + 1 ? '2px dashed hsla(140,80%,40%,0.7)' : 'none',
                      boxSizing: 'border-box',
                      transition: 'all 0.15s'
                    }
                  })));
                }
              }
            }

            // Ghost preview cube at hover position
            if (!isSlider && cubeHoverPos && !cubePositions.has(`${cubeHoverPos.x}-${cubeHoverPos.y}-${cubeHoverPos.z}`)) {
              const gx = cubeHoverPos.x,
                gy = cubeHoverPos.y,
                gz = cubeHoverPos.z;
              const gHue = 140;
              labCubeGrid.push(React.createElement('div', {
                key: 'ghost',
                style: {
                  position: 'absolute',
                  width: cubeUnit + 'px',
                  height: cubeUnit + 'px',
                  transform: 'translate3d(' + gx * cubeUnit + 'px,' + -gz * cubeUnit + 'px,' + gy * cubeUnit + 'px)',
                  transformStyle: 'preserve-3d',
                  pointerEvents: 'none',
                  zIndex: 20,
                  animation: 'pulse 1.5s ease-in-out infinite'
                }
              }, React.createElement('div', {
                style: {
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  transform: 'translateZ(' + cubeUnit / 2 + 'px)',
                  background: 'hsla(' + gHue + ',80%,65%,0.4)',
                  border: '2px solid hsla(' + gHue + ',90%,50%,0.7)',
                  boxSizing: 'border-box',
                  borderRadius: '2px'
                }
              }), React.createElement('div', {
                style: {
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  transform: 'rotateY(180deg) translateZ(' + cubeUnit / 2 + 'px)',
                  background: 'hsla(' + gHue + ',70%,60%,0.3)',
                  border: '2px solid hsla(' + gHue + ',90%,50%,0.5)',
                  boxSizing: 'border-box',
                  borderRadius: '2px'
                }
              }), React.createElement('div', {
                style: {
                  position: 'absolute',
                  width: cubeUnit + 'px',
                  height: '100%',
                  transform: 'rotateY(-90deg) translateZ(' + cubeUnit / 2 + 'px)',
                  background: 'hsla(' + gHue + ',60%,55%,0.35)',
                  border: '2px solid hsla(' + gHue + ',90%,50%,0.5)',
                  boxSizing: 'border-box',
                  borderRadius: '2px'
                }
              }), React.createElement('div', {
                style: {
                  position: 'absolute',
                  width: cubeUnit + 'px',
                  height: '100%',
                  transform: 'rotateY(90deg) translateZ(' + cubeUnit / 2 + 'px)',
                  background: 'hsla(' + gHue + ',60%,60%,0.35)',
                  border: '2px solid hsla(' + gHue + ',90%,50%,0.5)',
                  boxSizing: 'border-box',
                  borderRadius: '2px'
                }
              }), React.createElement('div', {
                style: {
                  position: 'absolute',
                  width: '100%',
                  height: cubeUnit + 'px',
                  transform: 'rotateX(90deg) translateZ(' + cubeUnit / 2 + 'px)',
                  background: 'hsla(' + gHue + ',85%,70%,0.5)',
                  border: '2px solid hsla(' + gHue + ',90%,50%,0.7)',
                  boxSizing: 'border-box',
                  borderRadius: '2px'
                }
              }), React.createElement('div', {
                style: {
                  position: 'absolute',
                  width: '100%',
                  height: cubeUnit + 'px',
                  transform: 'rotateX(-90deg) translateZ(' + cubeUnit / 2 + 'px)',
                  background: 'hsla(' + gHue + ',50%,45%,0.25)',
                  border: '2px solid hsla(' + gHue + ',90%,50%,0.4)',
                  boxSizing: 'border-box',
                  borderRadius: '2px'
                }
              })));
            }
            let freeformWidth = isSlider ? cubeDims.l * cubeUnit : 8 * cubeUnit;
            let freeformHeight = isSlider ? cubeDims.h * cubeUnit : 5 * cubeUnit;
            if (!isSlider && cubePositions.size > 0) {
              const coords = [...cubePositions].map(p => p.split('-').map(Number));
              const maxX = Math.max(...coords.map(c => c[0])) + 1;
              const maxZ = Math.max(...coords.map(c => c[2])) + 1;
              freeformWidth = Math.max(8, maxX) * cubeUnit;
              freeformHeight = Math.max(1, maxZ) * cubeUnit;
            }
            return /*#__PURE__*/React.createElement("div", {
              className: "space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200"
            }, /*#__PURE__*/React.createElement("div", {
              className: "flex items-center gap-3 mb-2"
            }, /*#__PURE__*/React.createElement("button", {
              onClick: () => setStemLabTool(null),
              className: "p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            }, /*#__PURE__*/React.createElement(ArrowLeft, {
              size: 18,
              className: "text-slate-500"
            })), /*#__PURE__*/React.createElement("h3", {
              className: "text-lg font-bold text-emerald-800"
            }, "\uD83D\uDCE6 3D Volume Explorer"), /*#__PURE__*/React.createElement("div", {
              className: "flex items-center gap-2 ml-2"
            }, /*#__PURE__*/React.createElement("div", {
              className: "text-xs font-bold text-emerald-600"
            }, exploreScore.correct, "/", exploreScore.total), exploreScore.total > 0 && /*#__PURE__*/React.createElement("button", {
              onClick: submitExploreScore,
              className: "text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full hover:bg-emerald-700"
            }, "\uD83D\uDCBE Save"), /*#__PURE__*/React.createElement("button", {
              onClick: () => {
                const snap = {
                  id: 'snap-' + Date.now(),
                  tool: 'volume',
                  label: 'Volume: ' + (cubeBuilderMode === 'slider' ? cubeDims.l + '\u00d7' + cubeDims.w + '\u00d7' + cubeDims.h : cubePositions.size + ' cubes'),
                  mode: cubeBuilderMode,
                  data: cubeBuilderMode === 'slider' ? {
                    dims: {
                      ...cubeDims
                    }
                  } : {
                    positions: [...cubePositions]
                  },
                  rotation: {
                    ...cubeRotation
                  },
                  timestamp: Date.now()
                };
                setToolSnapshots(prev => [...prev, snap]);
                addToast('\U0001f4f8 Snapshot saved!', 'success');
              },
              className: "text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-2 py-0.5 transition-all"
            }, "\uD83D\uDCF8 Snapshot")), /*#__PURE__*/React.createElement("div", {
              className: "flex-1"
            }), /*#__PURE__*/React.createElement("div", {
              className: "flex items-center gap-1 bg-emerald-50 rounded-lg p-1 border border-emerald-200"
            }, /*#__PURE__*/React.createElement("button", {
              onClick: () => {
                setCubeBuilderMode('slider');
                setCubeBuilderChallenge(null);
                setCubeBuilderFeedback(null);
              },
              className: `px-3 py-1 rounded-md text-xs font-bold transition-all ${cubeBuilderMode === 'slider' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-500 hover:text-emerald-700'}`
            }, "\uD83C\uDF9A\uFE0F Slider"), /*#__PURE__*/React.createElement("button", {
              onClick: () => {
                setCubeBuilderMode('freeform');
                setCubeBuilderChallenge(null);
                setCubeBuilderFeedback(null);
              },
              className: `px-3 py-1 rounded-md text-xs font-bold transition-all ${cubeBuilderMode === 'freeform' ? 'bg-white text-indigo-700 shadow-sm' : 'text-emerald-500 hover:text-emerald-700'}`
            }, "\uD83E\uDDF1 Freeform")), /*#__PURE__*/React.createElement("div", {
              className: "flex items-center gap-1"
            }, /*#__PURE__*/React.createElement("button", {
              onClick: () => setCubeScale(s => Math.max(0.4, s - 0.15)),
              className: "w-7 h-7 rounded-full bg-white border border-emerald-300 text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition-all flex items-center justify-center",
              "aria-label": "Zoom out"
            }, "\u2212"), /*#__PURE__*/React.createElement("span", {
              className: "text-[10px] text-emerald-600 font-mono w-10 text-center"
            }, Math.round(cubeScale * 100), "%"), /*#__PURE__*/React.createElement("button", {
              onClick: () => setCubeScale(s => Math.min(2.5, s + 0.15)),
              className: "w-7 h-7 rounded-full bg-white border border-emerald-300 text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition-all flex items-center justify-center",
              "aria-label": "Zoom in"
            }, "+"), /*#__PURE__*/React.createElement("button", {
              onClick: () => {
                setCubeRotation({
                  x: -25,
                  y: -35
                });
                setCubeScale(1.0);
              },
              className: "ml-1 px-2 py-1 rounded-md bg-white border border-emerald-300 text-emerald-700 font-bold text-[10px] hover:bg-emerald-100 transition-all"
            }, "\u21BA"))), isSlider && /*#__PURE__*/React.createElement("div", {
              className: "grid grid-cols-3 gap-3"
            }, ['l', 'w', 'h'].map(dim => /*#__PURE__*/React.createElement("div", {
              key: dim,
              className: "bg-emerald-50 rounded-lg p-3 border border-emerald-100"
            }, /*#__PURE__*/React.createElement("label", {
              className: "block text-xs text-emerald-700 mb-1 font-bold uppercase"
            }, dim === 'l' ? 'Length' : dim === 'w' ? 'Width' : 'Height'), /*#__PURE__*/React.createElement("input", {
              type: "range",
              min: "1",
              max: "10",
              value: cubeDims[dim],
              onChange: e => {
                setCubeDims(prev => ({
                  ...prev,
                  [dim]: parseInt(e.target.value)
                }));
                setCubeChallenge(null);
                setCubeFeedback(null);
                setCubeShowLayers(null);
              },
              className: "w-full h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600",
              "aria-label": dim === 'l' ? 'Length' : dim === 'w' ? 'Width' : 'Height'
            }), /*#__PURE__*/React.createElement("div", {
              className: "text-center text-lg font-bold text-emerald-700 mt-1"
            }, cubeDims[dim])))), !isSlider && /*#__PURE__*/React.createElement("div", {
              className: "flex items-center gap-2 bg-indigo-50 rounded-lg p-2 border border-indigo-100"
            }, /*#__PURE__*/React.createElement("p", {
              className: "text-xs text-indigo-600 flex-1"
            }, "\uD83D\uDC49 Click the grid to place cubes \u2022 Click a cube to remove it \u2022 Click top faces to stack"), /*#__PURE__*/React.createElement("button", {
              onClick: () => {
                setCubePositions(new Set());
                setCubeBuilderChallenge(null);
                setCubeBuilderFeedback(null);
              },
              className: "px-3 py-1.5 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all"
            }, "\u21BA Clear All")), /*#__PURE__*/React.createElement("div", {
              className: "bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl border-2 border-emerald-300/30 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none",
              style: {
                minHeight: '350px',
                perspective: '900px'
              },
              onMouseDown: e => {
                cubeDragRef.current = {
                  x: e.clientX,
                  y: e.clientY
                };
                window.addEventListener('mousemove', handleLabCubeDrag);
                window.addEventListener('mouseup', handleLabCubeDragEnd);
              },
              onWheel: e => {
                e.preventDefault();
                setCubeScale(s => Math.max(0.4, Math.min(2.5, s + (e.deltaY > 0 ? -0.08 : 0.08))));
              },
              onTouchStart: e => {
                if (e.touches.length === 1) cubeDragRef.current = {
                  x: e.touches[0].clientX,
                  y: e.touches[0].clientY
                };
              },
              onTouchMove: e => {
                if (cubeDragRef.current && e.touches.length === 1) {
                  const tdx = e.touches[0].clientX - cubeDragRef.current.x;
                  const tdy = e.touches[0].clientY - cubeDragRef.current.y;
                  setCubeRotation(prev => ({
                    x: Math.max(-80, Math.min(10, prev.x + tdy * 0.5)),
                    y: prev.y + tdx * 0.5
                  }));
                  cubeDragRef.current = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                  };
                }
              },
              onTouchEnd: () => {
                cubeDragRef.current = null;
              }
            }, /*#__PURE__*/React.createElement("div", {
              style: {
                transformStyle: 'preserve-3d',
                transform: 'rotateX(' + cubeRotation.x + 'deg) rotateY(' + cubeRotation.y + 'deg) scale3d(' + cubeScale + ',' + cubeScale + ',' + cubeScale + ')',
                transition: cubeDragRef.current ? 'none' : 'transform 0.15s ease-out',
                position: 'relative',
                width: freeformWidth + 'px',
                height: freeformHeight + 'px'
              }
            }, labCubeGrid)), isSlider && /*#__PURE__*/React.createElement("div", {
              className: "flex items-center gap-2 bg-emerald-50 rounded-lg p-2 border border-emerald-100"
            }, /*#__PURE__*/React.createElement("span", {
              className: "text-xs font-bold text-emerald-700"
            }, "Layers:"), /*#__PURE__*/React.createElement("input", {
              type: "range",
              min: "1",
              max: cubeDims.h,
              value: cubeShowLayers !== null ? cubeShowLayers : cubeDims.h,
              onChange: e => setCubeShowLayers(parseInt(e.target.value)),
              className: "flex-1 h-1.5 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            }), /*#__PURE__*/React.createElement("span", {
              className: "text-xs font-mono text-emerald-600"
            }, cubeShowLayers !== null ? cubeShowLayers : cubeDims.h, " / ", cubeDims.h)), /*#__PURE__*/React.createElement("div", {
              className: "grid grid-cols-2 gap-3"
            }, /*#__PURE__*/React.createElement("div", {
              className: "bg-white rounded-xl p-3 border border-emerald-100 text-center"
            }, /*#__PURE__*/React.createElement("div", {
              className: "text-xs font-bold text-emerald-600 uppercase mb-1"
            }, "Volume"), /*#__PURE__*/React.createElement("div", {
              className: "text-xl font-bold text-emerald-800"
            }, isSlider ? `${cubeDims.l} × ${cubeDims.w} × ${cubeDims.h} = ` : '', /*#__PURE__*/React.createElement("span", {
              className: "text-2xl text-emerald-600"
            }, volume)), /*#__PURE__*/React.createElement("div", {
              className: "text-xs text-slate-400"
            }, volume, " unit cube", volume !== 1 ? 's' : '')), /*#__PURE__*/React.createElement("div", {
              className: "bg-white rounded-xl p-3 border border-teal-100 text-center"
            }, /*#__PURE__*/React.createElement("div", {
              className: "text-xs font-bold text-teal-600 uppercase mb-1"
            }, "Surface Area"), /*#__PURE__*/React.createElement("div", {
              className: "text-xl font-bold text-teal-800"
            }, "SA = ", /*#__PURE__*/React.createElement("span", {
              className: "text-2xl text-teal-600"
            }, surfaceArea)), isSlider && /*#__PURE__*/React.createElement("div", {
              className: "text-xs text-slate-400"
            }, "2(", cubeDims.l, "\xD7", cubeDims.w, " + ", cubeDims.l, "\xD7", cubeDims.h, " + ", cubeDims.w, "\xD7", cubeDims.h, ")"), !isSlider && /*#__PURE__*/React.createElement("div", {
              className: "text-xs text-slate-400"
            }, surfaceArea, " exposed face", surfaceArea !== 1 ? 's' : ''))), /*#__PURE__*/React.createElement("div", {
              className: "flex gap-2 flex-wrap"
            }, isSlider ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
              onClick: () => {
                const l = Math.floor(Math.random() * 8) + 1;
                const w = Math.floor(Math.random() * 6) + 1;
                const h = Math.floor(Math.random() * 6) + 1;
                setCubeDims({
                  l,
                  w,
                  h
                });
                setCubeChallenge({
                  l,
                  w,
                  h,
                  answer: l * w * h
                });
                setCubeAnswer('');
                setCubeFeedback(null);
                setCubeShowLayers(null);
              },
              className: "flex-1 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-lg text-sm hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md"
            }, "\uD83C\uDFB2 Random Challenge"), /*#__PURE__*/React.createElement("button", {
              onClick: () => {
                setCubeDims({
                  l: 3,
                  w: 2,
                  h: 2
                });
                setCubeChallenge(null);
                setCubeFeedback(null);
                setCubeShowLayers(null);
                setCubeRotation({
                  x: -25,
                  y: -35
                });
                setCubeScale(1.0);
              },
              className: "px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all"
            }, "\u21BA Reset"), /*#__PURE__*/React.createElement("button", {
              onClick: () => {
                const tl = Math.floor(Math.random() * 6) + 2;
                const tw = Math.floor(Math.random() * 5) + 1;
                const th = Math.floor(Math.random() * 5) + 1;
                setCubeDims({
                  l: 1,
                  w: 1,
                  h: 1
                });
                setCubeChallenge({
                  l: tl,
                  w: tw,
                  h: th,
                  answer: tl * tw * th,
                  buildMode: true
                });
                setCubeAnswer('');
                setCubeFeedback(null);
                setCubeShowLayers(null);
              },
              className: "flex-1 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold rounded-lg text-sm hover:from-violet-600 hover:to-purple-600 transition-all shadow-md"
            }, "\uD83C\uDFD7\uFE0F Build Challenge")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
              onClick: () => {
                setCubePositions(new Set());
                const l = 2 + Math.floor(Math.random() * 4);
                const w = 2 + Math.floor(Math.random() * 3);
                const h = 1 + Math.floor(Math.random() * 3);
                setCubeBuilderChallenge({
                  type: 'prism',
                  target: {
                    l,
                    w,
                    h
                  },
                  answer: l * w * h
                });
                setCubeBuilderFeedback(null);
              },
              className: "flex-1 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-lg text-sm hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md"
            }, "\uD83C\uDFD7\uFE0F Build Prism"), /*#__PURE__*/React.createElement("button", {
              onClick: () => {
                const lb = generateLBlock();
                setCubePositions(lb.positions);
                setCubeBuilderChallenge({
                  type: 'volume',
                  answer: lb.volume,
                  shape: 'L-Block'
                });
                setCubeBuilderFeedback(null);
              },
              className: "flex-1 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold rounded-lg text-sm hover:from-violet-600 hover:to-purple-600 transition-all shadow-md"
            }, "\uD83D\uDCD0 L-Block Volume"), /*#__PURE__*/React.createElement("button", {
              onClick: () => {
                setCubePositions(new Set());
                const tv = 5 + Math.floor(Math.random() * 16);
                setCubeBuilderChallenge({
                  type: 'volume',
                  answer: tv,
                  shape: 'any'
                });
                setCubeBuilderFeedback(null);
              },
              className: "flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md"
            }, "\uD83C\uDFB2 Random Volume"))), isSlider && cubeChallenge && /*#__PURE__*/React.createElement("div", {
              className: "bg-amber-50 rounded-lg p-3 border border-amber-200"
            }, /*#__PURE__*/React.createElement("p", {
              className: "text-sm font-bold text-amber-800 mb-2"
            }, cubeChallenge.buildMode ? '🏗️ Build this shape!' : '🤔 What is the volume?'), /*#__PURE__*/React.createElement("div", {
              className: "flex gap-2 items-center"
            }, /*#__PURE__*/React.createElement("input", {
              type: "number",
              value: cubeAnswer,
              onChange: e => setCubeAnswer(e.target.value),
              onKeyDown: e => {
                if (e.key === 'Enter' && cubeAnswer) {
                  const ans = parseInt(cubeAnswer);
                  const ok = ans === cubeChallenge.answer;
                  setCubeFeedback(ok ? {
                    correct: true,
                    msg: '✅ Correct! ' + cubeChallenge.l + '×' + cubeChallenge.w + '×' + cubeChallenge.h + ' = ' + cubeChallenge.answer
                  } : {
                    correct: false,
                    msg: '❌ Try V = L × W × H'
                  });
                  setExploreScore(prev => ({
                    correct: prev.correct + (ok ? 1 : 0),
                    total: prev.total + 1
                  }));
                }
              },
              placeholder: "Volume...",
              className: "flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm font-mono",
              "aria-label": "Answer"
            }), cubeChallenge.buildMode && /*#__PURE__*/React.createElement("div", {
              className: "flex-1 text-xs text-amber-700"
            }, /*#__PURE__*/React.createElement("p", {
              className: "font-bold mb-1"
            }, "Target: ", cubeChallenge.l, " \xD7 ", cubeChallenge.w, " \xD7 ", cubeChallenge.h, " = ", cubeChallenge.answer, " cubes"), /*#__PURE__*/React.createElement("p", null, "Use the sliders to build a prism with volume = ", cubeChallenge.answer), /*#__PURE__*/React.createElement("p", {
              className: 'mt-1 font-bold ' + (cubeDims.l * cubeDims.w * cubeDims.h === cubeChallenge.answer ? 'text-green-600' : 'text-slate-400')
            }, "Your build: ", cubeDims.l, "\xD7", cubeDims.w, "\xD7", cubeDims.h, " = ", cubeDims.l * cubeDims.w * cubeDims.h, " ", cubeDims.l * cubeDims.w * cubeDims.h === cubeChallenge.answer ? '✅ Match!' : '')), /*#__PURE__*/React.createElement("button", {
              onClick: () => {
                const ans = parseInt(cubeAnswer);
                const ok = ans === cubeChallenge.answer;
                setCubeFeedback(ok ? {
                  correct: true,
                  msg: '✅ Correct!'
                } : {
                  correct: false,
                  msg: '❌ Try again'
                });
                setExploreScore(prev => ({
                  correct: prev.correct + (ok ? 1 : 0),
                  total: prev.total + 1
                }));
              },
              disabled: !cubeAnswer,
              className: "px-4 py-2 bg-amber-500 text-white font-bold rounded-lg text-sm disabled:opacity-40"
            }, "Check")), cubeFeedback && /*#__PURE__*/React.createElement("p", {
              className: "text-sm font-bold mt-2 " + (cubeFeedback.correct ? "text-green-600" : "text-red-600")
            }, cubeFeedback.msg)), !isSlider && cubeBuilderChallenge && /*#__PURE__*/React.createElement("div", {
              className: "bg-indigo-50 rounded-lg p-3 border border-indigo-200"
            }, /*#__PURE__*/React.createElement("p", {
              className: "text-sm font-bold text-indigo-800 mb-2"
            }, cubeBuilderChallenge.type === 'prism' ? `🏗️ Build a ${cubeBuilderChallenge.target.l}×${cubeBuilderChallenge.target.w}×${cubeBuilderChallenge.target.h} rectangular prism` : cubeBuilderChallenge.shape === 'L-Block' ? '📐 What is the volume of this L-shaped block?' : `🎲 Build any shape with volume = ${cubeBuilderChallenge.answer} cubes`), /*#__PURE__*/React.createElement("div", {
              className: "flex gap-2 items-center"
            }, /*#__PURE__*/React.createElement("div", {
              className: "flex-1 text-xs text-indigo-700"
            }, /*#__PURE__*/React.createElement("p", null, "Your cubes: ", /*#__PURE__*/React.createElement("span", {
              className: "font-bold text-indigo-900"
            }, cubePositions.size), cubeBuilderChallenge.type === 'prism' && ` / ${cubeBuilderChallenge.target.l * cubeBuilderChallenge.target.w * cubeBuilderChallenge.target.h} target`, cubeBuilderChallenge.shape === 'any' && ` / ${cubeBuilderChallenge.answer} target`)), /*#__PURE__*/React.createElement("button", {
              onClick: checkBuildChallenge,
              className: "px-4 py-2 bg-indigo-500 text-white font-bold rounded-lg text-sm hover:bg-indigo-600 transition-all shadow-md"
            }, "\u2714 Check")), cubeBuilderFeedback && /*#__PURE__*/React.createElement("p", {
              className: "text-sm font-bold mt-2 " + (cubeBuilderFeedback.correct ? "text-green-600" : "text-red-600")
            }, cubeBuilderFeedback.msg)));
          })(), stemLabTab === 'explore' && stemLabTool === 'base10' && (() => {
            const totalValue = base10Value.ones + base10Value.tens * 10 + base10Value.hundreds * 100 + base10Value.thousands * 1000;
            const checkBase10 = () => {
              if (!base10Challenge) return;
              const ok = totalValue === base10Challenge.target;
              setBase10Feedback(ok ? {
                correct: true,
                msg: '✅ Correct! ' + base10Challenge.target + ' = ' + (base10Value.thousands > 0 ? base10Value.thousands + ' thousands + ' : '') + (base10Value.hundreds > 0 ? base10Value.hundreds + ' hundreds + ' : '') + base10Value.tens + ' tens + ' + base10Value.ones + ' ones'
              } : {
                correct: false,
                msg: '❌ Your blocks show ' + totalValue + ', target is ' + base10Challenge.target
              });
              setExploreScore(prev => ({
                correct: prev.correct + (ok ? 1 : 0),
                total: prev.total + 1
              }));
            };
            const renderBlock = (color, w, h, count) => Array.from({
              length: count
            }).map((_, i) => /*#__PURE__*/React.createElement("div", {
              key: i,
              style: {
                width: w + 'px',
                height: h + 'px',
                background: color,
                border: '1px solid rgba(0,0,0,0.15)',
                borderRadius: '2px',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)'
              }
            }));
            return /*#__PURE__*/React.createElement("div", {
              className: "space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200"
            }, /*#__PURE__*/React.createElement("div", {
              className: "flex items-center gap-3 mb-2"
            }, /*#__PURE__*/React.createElement("button", {
              onClick: () => setStemLabTool(null),
              className: "p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            }, /*#__PURE__*/React.createElement(ArrowLeft, {
              size: 18,
              className: "text-slate-500"
            })), /*#__PURE__*/React.createElement("h3", {
              className: "text-lg font-bold text-orange-800"
            }, "\uD83E\uDDEE Base-10 Blocks"), /*#__PURE__*/React.createElement("div", {
              className: "flex items-center gap-2 ml-2"
            }, /*#__PURE__*/React.createElement("div", {
              className: "text-xs font-bold text-emerald-600"
            }, exploreScore.correct, "/", exploreScore.total), exploreScore.total > 0 && /*#__PURE__*/React.createElement("button", {
              onClick: submitExploreScore,
              className: "text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full hover:bg-emerald-700"
            }, "\uD83D\uDCBE Save"), /*#__PURE__*/React.createElement("button", {
              onClick: () => {
                const snap = {
                  id: 'snap-' + Date.now(),
                  tool: 'base10',
                  label: 'Base-10: ' + (base10Value.ones + base10Value.tens * 10 + base10Value.hundreds * 100 + base10Value.thousands * 1000),
                  data: {
                    ...base10Value
                  },
                  timestamp: Date.now()
                };
                setToolSnapshots(prev => [...prev, snap]);
                addToast('\U0001f4f8 Snapshot saved!', 'success');
              },
              className: "text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-2 py-0.5 transition-all"
            }, "\uD83D\uDCF8 Snapshot"))), /*#__PURE__*/React.createElement("div", {
              className: "bg-gradient-to-b from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200 p-6"
            }, /*#__PURE__*/React.createElement("div", {
              className: "text-center mb-4"
            }, /*#__PURE__*/React.createElement("span", {
              className: "text-4xl font-bold text-orange-800 font-mono"
            }, totalValue.toLocaleString()), /*#__PURE__*/React.createElement("span", {
              className: "text-2xl text-slate-400 mx-3"
            }, "="), /*#__PURE__*/React.createElement("div", {
              className: "flex items-end gap-1 flex-wrap"
            }, renderBlock('#a855f7', 28, 28, base10Value.thousands), base10Value.thousands > 0 && base10Value.hundreds > 0 && /*#__PURE__*/React.createElement("span", {
              className: "w-px h-6 bg-slate-200 mx-0.5"
            }), renderBlock('#3b82f6', 24, 24, base10Value.hundreds), (base10Value.thousands > 0 || base10Value.hundreds > 0) && base10Value.tens > 0 && /*#__PURE__*/React.createElement("span", {
              className: "w-px h-6 bg-slate-200 mx-0.5"
            }), renderBlock('#22c55e', 8, 36, base10Value.tens), (base10Value.thousands > 0 || base10Value.hundreds > 0 || base10Value.tens > 0) && base10Value.ones > 0 && /*#__PURE__*/React.createElement("span", {
              className: "w-px h-6 bg-slate-200 mx-0.5"
            }), renderBlock('#f59e0b', 10, 10, base10Value.ones), totalValue === 0 && /*#__PURE__*/React.createElement("span", {
              className: "text-sm text-slate-300 italic"
            }, "no blocks"))), /*#__PURE__*/React.createElement("div", {
              className: "grid grid-cols-4 gap-3"
            }, /*#__PURE__*/React.createElement("div", {
              className: "bg-white rounded-xl p-3 border-2 border-purple-200 text-center"
            }, /*#__PURE__*/React.createElement("div", {
              className: "text-xs font-bold text-purple-700 uppercase mb-2"
            }, "Thousands"), /*#__PURE__*/React.createElement("div", {
              className: "flex justify-center gap-1 mb-2 min-h-[48px] flex-wrap"
            }, renderBlock('#a855f7', 28, 28, base10Value.thousands)), /*#__PURE__*/React.createElement("div", {
              className: "flex items-center justify-center gap-2"
            }, /*#__PURE__*/React.createElement("button", {
              onClick: () => setBase10Value(prev => ({
                ...prev,
                thousands: Math.max(0, prev.thousands - 1)
              })),
              className: "w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-lg hover:bg-purple-200 transition-all flex items-center justify-center"
            }, "\u2212"), /*#__PURE__*/React.createElement("span", {
              className: "text-2xl font-bold text-purple-800 w-8 text-center"
            }, base10Value.thousands), /*#__PURE__*/React.createElement("button", {
              onClick: () => setBase10Value(prev => ({
                ...prev,
                thousands: Math.min(9, prev.thousands + 1)
              })),
              className: "w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-lg hover:bg-purple-200 transition-all flex items-center justify-center"
            }, "+")), /*#__PURE__*/React.createElement("div", {
              className: "text-xs text-purple-500 mt-1"
            }, "\xD71000 = ", base10Value.thousands * 1000)), /*#__PURE__*/React.createElement("div", {
              className: "bg-white rounded-xl p-3 border-2 border-blue-200 text-center"
            }, /*#__PURE__*/React.createElement("div", {
              className: "text-xs font-bold text-blue-700 uppercase mb-2"
            }, "Hundreds"), /*#__PURE__*/React.createElement("div", {
              className: "flex justify-center gap-1 mb-2 min-h-[48px] flex-wrap"
            }, renderBlock('#3b82f6', 24, 24, base10Value.hundreds)), /*#__PURE__*/React.createElement("div", {
              className: "flex items-center justify-center gap-2"
            }, /*#__PURE__*/React.createElement("button", {
              onClick: () => setBase10Value(prev => ({
                ...prev,
                hundreds: Math.max(0, prev.hundreds - 1)
              })),
              className: "w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-lg hover:bg-blue-200 transition-all flex items-center justify-center"
            }, "\u2212"), /*#__PURE__*/React.createElement("span", {
              className: "text-2xl font-bold text-blue-800 w-8 text-center"
            }, base10Value.hundreds), /*#__PURE__*/React.createElement("button", {
              onClick: () => setBase10Value(prev => ({
                ...prev,
                hundreds: Math.min(9, prev.hundreds + 1)
              })),
              className: "w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-lg hover:bg-blue-200 transition-all flex items-center justify-center"
            }, "+")), /*#__PURE__*/React.createElement("div", {
              className: "text-xs text-blue-500 mt-1"
            }, "\xD7100 = ", base10Value.hundreds * 100)), /*#__PURE__*/React.createElement("div", {
              className: "bg-white rounded-xl p-3 border-2 border-green-200 text-center"
            }, /*#__PURE__*/React.createElement("div", {
              className: "text-xs font-bold text-green-700 uppercase mb-2"
            }, "Tens"), /*#__PURE__*/React.createElement("div", {
              className: "flex justify-center gap-1 mb-2 min-h-[48px] flex-wrap"
            }, renderBlock('#22c55e', 8, 36, base10Value.tens)), /*#__PURE__*/React.createElement("div", {
              className: "flex items-center justify-center gap-2"
            }, /*#__PURE__*/React.createElement("button", {
              onClick: () => setBase10Value(prev => ({
                ...prev,
                tens: Math.max(0, prev.tens - 1)
              })),
              className: "w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-lg hover:bg-green-200 transition-all flex items-center justify-center"
            }, "\u2212"), /*#__PURE__*/React.createElement("span", {
              className: "text-2xl font-bold text-green-800 w-8 text-center"
            }, base10Value.tens), /*#__PURE__*/React.createElement("button", {
              onClick: () => setBase10Value(prev => ({
                ...prev,
                tens: Math.min(9, prev.tens + 1)
              })),
              className: "w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-lg hover:bg-green-200 transition-all flex items-center justify-center"
            }, "+")), /*#__PURE__*/React.createElement("div", {
              className: "text-xs text-green-500 mt-1"
            }, "\xD710 = ", base10Value.tens * 10)), /*#__PURE__*/React.createElement("div", {
              className: "bg-white rounded-xl p-3 border-2 border-amber-200 text-center"
            }, /*#__PURE__*/React.createElement("div", {
              className: "text-xs font-bold text-amber-700 uppercase mb-2"
            }, "Ones"), /*#__PURE__*/React.createElement("div", {
              className: "flex justify-center gap-1 mb-2 min-h-[48px] flex-wrap"
            }, renderBlock('#f59e0b', 10, 10, base10Value.ones)), /*#__PURE__*/React.createElement("div", {
              className: "flex items-center justify-center gap-2"
            }, /*#__PURE__*/React.createElement("button", {
              onClick: () => setBase10Value(prev => ({
                ...prev,
                ones: Math.max(0, prev.ones - 1)
              })),
              className: "w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-lg hover:bg-amber-200 transition-all flex items-center justify-center"
            }, "\u2212"), /*#__PURE__*/React.createElement("span", {
              className: "text-2xl font-bold text-amber-800 w-8 text-center"
            }, base10Value.ones), /*#__PURE__*/React.createElement("button", {
              onClick: () => setBase10Value(prev => ({
                ...prev,
                ones: Math.min(9, prev.ones + 1)
              })),
              className: "w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-lg hover:bg-amber-200 transition-all flex items-center justify-center"
            }, "+")), /*#__PURE__*/React.createElement("div", {
              className: "text-xs text-amber-500 mt-1"
            }, "\xD71 = ", base10Value.ones)))), /*#__PURE__*/React.createElement("div", {
              className: "flex gap-2 flex-wrap"
            }, /*#__PURE__*/React.createElement("button", {
              onClick: () => {
                const t = 10 + Math.floor(Math.random() * 9990);
                setBase10Challenge({
                  target: t,
                  type: 'build'
                });
                setBase10Value({
                  ones: 0,
                  tens: 0,
                  hundreds: 0,
                  thousands: 0
                });
                setBase10Feedback(null);
              },
              className: "flex-1 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-lg text-sm hover:from-orange-600 hover:to-amber-600 transition-all shadow-md"
            }, "\uD83C\uDFB2 Random Number"), /*#__PURE__*/React.createElement("button", {
              onClick: () => {
                setBase10Value({
                  ones: 0,
                  tens: 0,
                  hundreds: 0,
                  thousands: 0
                });
                setBase10Challenge(null);
                setBase10Feedback(null);
              },
              className: "px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all"
            }, "\u21BA Reset")), base10Challenge && /*#__PURE__*/React.createElement("div", {
              className: "bg-orange-50 rounded-lg p-3 border border-orange-200"
            }, /*#__PURE__*/React.createElement("p", {
              className: "text-sm font-bold text-orange-800 mb-2"
            }, "\uD83C\uDFAF Show ", base10Challenge.target.toLocaleString(), " using base-10 blocks"), /*#__PURE__*/React.createElement("div", {
              className: "flex gap-2 items-center"
            }, /*#__PURE__*/React.createElement("span", {
              className: "text-xs text-orange-600"
            }, "Your value: ", /*#__PURE__*/React.createElement("span", {
              className: "font-bold text-orange-900"
            }, totalValue.toLocaleString())), /*#__PURE__*/React.createElement("button", {
              onClick: checkBase10,
              className: "ml-auto px-4 py-1.5 bg-orange-500 text-white font-bold rounded-lg text-sm hover:bg-orange-600 transition-all"
            }, "\u2714 Check")), base10Feedback && /*#__PURE__*/React.createElement("p", {
              className: 'text-sm font-bold mt-2 ' + (base10Feedback.correct ? 'text-green-600' : 'text-red-600')
            }, base10Feedback.msg)));
          })(), stemLabTab === 'explore' && stemLabTool === 'coordinate' && (() => {
            const gridW = 400,
              gridH = 400;
            const range = gridRange.max - gridRange.min;
            const step = gridW / range;
            const toSvg = (v, axis) => axis === 'x' ? (v - gridRange.min) * step : gridH - (v - gridRange.min) * step;
            const fromSvg = (px, axis) => axis === 'x' ? Math.round(px / step + gridRange.min) : Math.round((gridH - px) / step + gridRange.min);
            // Connect mode & slope state (stored in gridFeedback object)
            const connectMode = gridFeedback && gridFeedback.connectMode;
            const gridLines = (gridFeedback && gridFeedback.lines) || [];
            const connectFirst = gridFeedback && gridFeedback.connectFirst;
            const slopeChallenge = gridChallenge && gridChallenge.type === 'slope';
            const slopeAnswer = gridFeedback && gridFeedback.slopeAnswer;
            const calcSlope = (p1, p2) => {
              const dy = p2.y - p1.y;
              const dx = p2.x - p1.x;
              if (dx === 0) return { rise: dy, run: 0, value: 'undefined', display: 'undefined' };
              const gcdFn = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = b; b = a % t; a = t; } return a || 1; };
              const g = gcdFn(dy, dx);
              const num = dy / g; const den = dx / g;
              const frac = den < 0 ? (-num) + '/' + (-den) : den === 1 ? '' + num : num + '/' + den;
              return { rise: dy, run: dx, value: dy / dx, display: frac };
            };
            const handleGridClick = e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = fromSvg(e.clientX - rect.left, 'x');
              const y = fromSvg(e.clientY - rect.top, 'y');
              if (x < gridRange.min || x > gridRange.max || y < gridRange.min || y > gridRange.max) return;
              if (connectMode) {
                const clickedIdx = gridPoints.findIndex(p => p.x === x && p.y === y);
                if (clickedIdx < 0) {
                  setGridPoints(prev => [...prev, { x, y }]);
                  const newIdx = gridPoints.length;
                  if (connectFirst === null || connectFirst === undefined) {
                    setGridFeedback(prev => Object.assign({}, prev, { connectFirst: newIdx }));
                  } else {
                    const from = gridPoints[connectFirst];
                    const to = { x, y };
                    const slope = calcSlope(from, to);
                    setGridFeedback(prev => Object.assign({}, prev, { lines: (prev.lines || []).concat([{ from, to, slope }]), connectFirst: null }));
                  }
                  return;
                }
                if (connectFirst === null || connectFirst === undefined) {
                  setGridFeedback(prev => Object.assign({}, prev, { connectFirst: clickedIdx }));
                } else if (clickedIdx !== connectFirst) {
                  const from = gridPoints[connectFirst];
                  const to = gridPoints[clickedIdx];
                  const slope = calcSlope(from, to);
                  setGridFeedback(prev => Object.assign({}, prev, { lines: (prev.lines || []).concat([{ from, to, slope }]), connectFirst: null }));
                }
                return;
              }
              const existing = gridPoints.findIndex(p => p.x === x && p.y === y);
              if (existing >= 0) {
                setGridPoints(prev => prev.filter((_, i) => i !== existing));
              } else {
                setGridPoints(prev => [...prev, { x, y }]);
              }
              setGridFeedback(null);
            };
            const checkGrid = () => {
              if (!gridChallenge) return;
              if (gridChallenge.type === 'plot') {
                const ok = gridPoints.some(p => p.x === gridChallenge.target.x && p.y === gridChallenge.target.y);
                setGridFeedback(ok ? {
                  correct: true,
                  msg: '\u2705 Correct! Point (' + gridChallenge.target.x + ', ' + gridChallenge.target.y + ') plotted!'
                } : {
                  correct: false,
                  msg: '\u274C Point (' + gridChallenge.target.x + ', ' + gridChallenge.target.y + ') not found on your grid.'
                });
                setExploreScore(prev => ({
                  correct: prev.correct + (ok ? 1 : 0),
                  total: prev.total + 1
                }));
              } else if (gridChallenge.type === 'slope') {
                const answer = (slopeAnswer || '').trim();
                const cs = gridChallenge.slopeData;
                const isCorrect = answer === cs.display || answer === '' + cs.value || (cs.run !== 0 && Math.abs(parseFloat(answer) - cs.value) < 0.01);
                setGridFeedback(prev => Object.assign({}, prev, {
                  correct: isCorrect,
                  msg: isCorrect ? '\u2705 Correct! Slope = ' + cs.display : '\u274C The slope is ' + cs.display + ' (rise=' + cs.rise + ', run=' + cs.run + ')'
                }));
                setExploreScore(prev => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 }));
              }
            };
            return /*#__PURE__*/React.createElement("div", {
              className: "space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200"
            }, /*#__PURE__*/React.createElement("div", {
              className: "flex items-center gap-3 mb-2"
            }, /*#__PURE__*/React.createElement("button", {
              onClick: () => setStemLabTool(null),
              className: "p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            }, /*#__PURE__*/React.createElement(ArrowLeft, {
              size: 18,
              className: "text-slate-500"
            })), /*#__PURE__*/React.createElement("h3", {
              className: "text-lg font-bold text-cyan-800"
            }, "\uD83D\uDCCD Coordinate Grid"), /*#__PURE__*/React.createElement("div", {
              className: "flex items-center gap-2 ml-2"
            }, /*#__PURE__*/React.createElement("div", {
              className: "text-xs font-bold text-emerald-600"
            }, exploreScore.correct, "/", exploreScore.total), /*#__PURE__*/React.createElement("button", {
              onClick: () => {
                const snap = {
                  id: 'snap-' + Date.now(),
                  tool: 'coordinate',
                  label: 'Grid: ' + gridPoints.length + ' points',
                  data: {
                    points: [...gridPoints]
                  },
                  timestamp: Date.now()
                };
                setToolSnapshots(prev => [...prev, snap]);
                addToast('\U0001f4f8 Snapshot saved!', 'success');
              },
              className: "text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-2 py-0.5 transition-all"
            }, "\uD83D\uDCF8 Snapshot"))), /*#__PURE__*/React.createElement("div", {
              className: "bg-white rounded-xl border-2 border-cyan-200 p-4 flex justify-center"
            }, /*#__PURE__*/React.createElement("svg", {
              width: gridW,
              height: gridH,
              onClick: handleGridClick,
              className: "cursor-crosshair",
              style: {
                background: '#f8fafc'
              }
            }, Array.from({
              length: range + 1
            }).map((_, i) => {
              const v = gridRange.min + i;
              const px = toSvg(v, 'x');
              const py = toSvg(v, 'y');
              return React.createElement(React.Fragment, {
                key: i
              }, React.createElement('line', {
                x1: px,
                y1: 0,
                x2: px,
                y2: gridH,
                stroke: v === 0 ? '#334155' : '#e2e8f0',
                strokeWidth: v === 0 ? 2 : 0.5
              }), React.createElement('line', {
                x1: 0,
                y1: py,
                x2: gridW,
                y2: py,
                stroke: v === 0 ? '#334155' : '#e2e8f0',
                strokeWidth: v === 0 ? 2 : 0.5
              }), v !== 0 && v % 2 === 0 ? React.createElement('text', {
                x: toSvg(v, 'x'),
                y: toSvg(0, 'y') + 14,
                textAnchor: 'middle',
                className: 'text-[9px] fill-slate-400'
              }, v) : null, v !== 0 && v % 2 === 0 ? React.createElement('text', {
                x: toSvg(0, 'x') - 8,
                y: toSvg(v, 'y') + 3,
                textAnchor: 'end',
                className: 'text-[9px] fill-slate-400'
              }, v) : null);
            }),
              // ── Connected lines with slope badges ──
              gridLines.map((ln, li) => React.createElement(React.Fragment, { key: 'ln' + li },
                React.createElement('line', { x1: toSvg(ln.from.x, 'x'), y1: toSvg(ln.from.y, 'y'), x2: toSvg(ln.to.x, 'x'), y2: toSvg(ln.to.y, 'y'), stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '6,3', opacity: 0.8 }),
                React.createElement('line', { x1: toSvg(ln.to.x, 'x'), y1: toSvg(ln.from.y, 'y'), x2: toSvg(ln.to.x, 'x'), y2: toSvg(ln.to.y, 'y'), stroke: '#ef4444', strokeWidth: 1.5, strokeDasharray: '3,2', opacity: 0.5 }),
                React.createElement('line', { x1: toSvg(ln.from.x, 'x'), y1: toSvg(ln.from.y, 'y'), x2: toSvg(ln.to.x, 'x'), y2: toSvg(ln.from.y, 'y'), stroke: '#3b82f6', strokeWidth: 1.5, strokeDasharray: '3,2', opacity: 0.5 }),
                React.createElement('rect', { x: (toSvg(ln.from.x, 'x') + toSvg(ln.to.x, 'x')) / 2 - 24, y: (toSvg(ln.from.y, 'y') + toSvg(ln.to.y, 'y')) / 2 - 10, width: 48, height: 18, rx: 5, fill: '#6366f1', opacity: 0.9 }),
                React.createElement('text', { x: (toSvg(ln.from.x, 'x') + toSvg(ln.to.x, 'x')) / 2, y: (toSvg(ln.from.y, 'y') + toSvg(ln.to.y, 'y')) / 2 + 3, textAnchor: 'middle', fill: '#fff', style: { fontSize: '9px', fontWeight: 'bold' } }, 'm=' + ln.slope.display)
              )),
              // Slope challenge line
              slopeChallenge && gridChallenge.p1 && React.createElement(React.Fragment, null,
                React.createElement('line', { x1: toSvg(gridChallenge.p1.x, 'x'), y1: toSvg(gridChallenge.p1.y, 'y'), x2: toSvg(gridChallenge.p2.x, 'x'), y2: toSvg(gridChallenge.p2.y, 'y'), stroke: '#f59e0b', strokeWidth: 2.5 }),
                React.createElement('circle', { cx: toSvg(gridChallenge.p1.x, 'x'), cy: toSvg(gridChallenge.p1.y, 'y'), r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }),
                React.createElement('circle', { cx: toSvg(gridChallenge.p2.x, 'x'), cy: toSvg(gridChallenge.p2.y, 'y'), r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 })
              ),
              // Points
              gridPoints.map((p, i) => React.createElement('circle', {
                key: i, cx: toSvg(p.x, 'x'), cy: toSvg(p.y, 'y'), r: 5,
                fill: connectFirst === i ? '#6366f1' : '#0891b2', stroke: '#fff', strokeWidth: 2, className: 'cursor-pointer'
              })), gridPoints.map((p, i) => React.createElement('text', {
                key: 't' + i, x: toSvg(p.x, 'x') + 8, y: toSvg(p.y, 'y') - 8, className: 'text-[10px] fill-cyan-700 font-bold'
              }, '(' + p.x + ',' + p.y + ')')))), /*#__PURE__*/React.createElement("div", {
                className: "flex gap-2 flex-wrap"
              }, /*#__PURE__*/React.createElement("button", {
                onClick: () => {
                  const tx = -8 + Math.floor(Math.random() * 17);
                  const ty = -8 + Math.floor(Math.random() * 17);
                  setGridChallenge({
                    type: 'plot',
                    target: {
                      x: tx,
                      y: ty
                    }
                  });
                  setGridPoints([]);
                  setGridFeedback(null);
                },
                className: "flex-1 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold rounded-lg text-sm hover:from-cyan-600 hover:to-teal-600 transition-all shadow-md"
              }, "\uD83D\uDCCD Plot a Point"),
          // Find Slope button
          /*#__PURE__*/React.createElement("button", {
                onClick: () => {
                  const x1 = -6 + Math.floor(Math.random() * 13); const y1 = -6 + Math.floor(Math.random() * 13);
                  let x2 = x1, y2 = y1;
                  while (x2 === x1 && y2 === y1) { x2 = -6 + Math.floor(Math.random() * 13); y2 = -6 + Math.floor(Math.random() * 13); }
                  const p1 = { x: x1, y: y1 }; const p2 = { x: x2, y: y2 };
                  setGridChallenge({ type: 'slope', p1, p2, slopeData: calcSlope(p1, p2) });
                  setGridPoints([p1, p2]); setGridFeedback({ slopeAnswer: '' });
                },
                className: "flex-1 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-lg text-sm hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md"
              }, "\uD83D\uDCCF Find Slope"),
          // Connect Mode toggle
          /*#__PURE__*/React.createElement("button", {
                onClick: () => { if (connectMode) { setGridFeedback(null); } else { setGridFeedback({ connectMode: true, lines: gridLines, connectFirst: null }); } setGridChallenge(null); },
                className: "flex-1 py-2 font-bold rounded-lg text-sm transition-all shadow-md " + (connectMode ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200')
              }, connectMode ? "\u2714 Connect ON" : "\uD83D\uDD17 Connect"),
          /*#__PURE__*/React.createElement("button", {
                onClick: () => { setGridPoints([]); setGridChallenge(null); setGridFeedback(null); },
                className: "px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all"
              }, "\u21BA Clear")),
              // ── Slope challenge UI ──
              slopeChallenge && /*#__PURE__*/React.createElement("div", { className: "bg-amber-50 rounded-lg p-3 border border-amber-200" },
                React.createElement("p", { className: "text-sm font-bold text-amber-800 mb-2" }, "\uD83D\uDCCF Slope: (", gridChallenge.p1.x, ",", gridChallenge.p1.y, ") to (", gridChallenge.p2.x, ",", gridChallenge.p2.y, ")"),
                React.createElement("div", { className: "flex items-center gap-3 mb-2 text-xs text-amber-600" },
                  React.createElement("span", null, "rise = \u0394y = ", gridChallenge.slopeData.rise),
                  React.createElement("span", null, "run = \u0394x = ", gridChallenge.slopeData.run)
                ),
                React.createElement("div", { className: "flex gap-2 items-center" },
                  React.createElement("span", { className: "text-xs font-bold text-amber-700" }, "m ="),
                  React.createElement("input", { type: "text", placeholder: "e.g. 2/3", value: slopeAnswer || '', onChange: e => setGridFeedback(prev => Object.assign({}, prev, { slopeAnswer: e.target.value })), onKeyDown: e => { if (e.key === 'Enter') checkGrid(); }, className: "flex-1 px-3 py-1.5 border-2 border-amber-300 rounded-lg text-sm font-bold focus:border-amber-500 focus:outline-none" }),
                  React.createElement("button", { onClick: checkGrid, className: "px-4 py-1.5 bg-amber-500 text-white font-bold rounded-lg text-sm hover:bg-amber-600" }, "\u2714 Check")
                ),
                gridFeedback && gridFeedback.msg && React.createElement("p", { className: 'text-sm font-bold mt-2 ' + (gridFeedback.correct ? 'text-green-600' : 'text-red-600') }, gridFeedback.msg)
              ),
              // ── Plot challenge UI ──
              gridChallenge && gridChallenge.type === 'plot' && /*#__PURE__*/React.createElement("div", { className: "bg-cyan-50 rounded-lg p-3 border border-cyan-200" },
                React.createElement("p", { className: "text-sm font-bold text-cyan-800 mb-2" }, "\uD83D\uDCCD Plot (", gridChallenge.target.x, ", ", gridChallenge.target.y, ")"),
                React.createElement("div", { className: "flex gap-2 items-center" },
                  React.createElement("span", { className: "text-xs text-cyan-600" }, "Points: ", React.createElement("span", { className: "font-bold" }, gridPoints.length)),
                  React.createElement("button", { onClick: checkGrid, className: "ml-auto px-4 py-1.5 bg-cyan-500 text-white font-bold rounded-lg text-sm hover:bg-cyan-600" }, "\u2714 Check")
                ),
                gridFeedback && gridFeedback.msg && React.createElement("p", { className: 'text-sm font-bold mt-2 ' + (gridFeedback.correct ? 'text-green-600' : 'text-red-600') }, gridFeedback.msg)
              ),
              // ── Connect mode info ──
              connectMode && /*#__PURE__*/React.createElement("div", { className: "bg-indigo-50 rounded-lg p-3 border border-indigo-200" },
                React.createElement("p", { className: "text-sm font-bold text-indigo-700 mb-1" }, "\uD83D\uDD17 Connect Mode"),
                React.createElement("p", { className: "text-xs text-indigo-600" }, connectFirst != null ? 'Click a second point to draw a line.' : 'Click a point to start.'),
                gridLines.length > 0 && React.createElement("div", { className: "mt-2 space-y-1" },
                  gridLines.map((ln, li) => React.createElement("div", { key: li, className: "flex items-center gap-2 text-[10px] bg-white rounded px-2 py-1 border" },
                    React.createElement("span", { className: "font-bold text-indigo-600" }, '(' + ln.from.x + ',' + ln.from.y + ') \u2192 (' + ln.to.x + ',' + ln.to.y + ')'),
                    React.createElement("span", { className: "ml-auto font-bold text-indigo-800" }, 'm=' + ln.slope.display)
                  ))
                ),
                React.createElement("button", { onClick: () => setGridFeedback(prev => Object.assign({}, prev, { lines: [], connectFirst: null })), className: "mt-2 px-3 py-1 text-[10px] font-bold bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200" }, "\uD83D\uDDD1 Clear Lines")
              ),
          // Stats
          /*#__PURE__*/React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                React.createElement("div", { className: "bg-white rounded-xl p-3 border border-cyan-100 text-center" },
                  React.createElement("div", { className: "text-xs font-bold text-cyan-600 uppercase mb-1" }, "Points"),
                  React.createElement("div", { className: "text-2xl font-bold text-cyan-800" }, gridPoints.length)
                ),
                React.createElement("div", { className: "bg-white rounded-xl p-3 border border-cyan-100 text-center" },
                  React.createElement("div", { className: "text-xs font-bold text-cyan-600 uppercase mb-1" }, "Lines"),
                  React.createElement("div", { className: "text-2xl font-bold text-cyan-800" }, gridLines.length)
                )
              ));
          })(), stemLabTab === 'explore' && stemLabTool === 'protractor' && (() => {
            const classifyAngle = a => a === 0 ? 'Zero' : a < 90 ? 'Acute' : a === 90 ? 'Right' : a < 180 ? 'Obtuse' : a === 180 ? 'Straight' : a < 360 ? 'Reflex' : 'Full';
            const angleClass = classifyAngle(angleValue);
            const rad = angleValue * Math.PI / 180;
            const cx = 200,
              cy = 200,
              r = 160,
              rayLen = 170;
            const rayEndX = cx + rayLen * Math.cos(-rad);
            const rayEndY = cy + rayLen * Math.sin(-rad);
            const arcR = 60;
            const arcEndX = cx + arcR * Math.cos(-rad);
            const arcEndY = cy + arcR * Math.sin(-rad);
            const largeArc = angleValue > 180 ? 1 : 0;
            const handleAngleDrag = e => {
              const rect = e.currentTarget.closest('svg').getBoundingClientRect();
              const dx = e.clientX - rect.left - cx;
              const dy = -(e.clientY - rect.top - cy);
              let deg = Math.round(Math.atan2(dy, dx) * 180 / Math.PI);
              if (deg < 0) deg += 360;
              setAngleValue(deg);
              setAngleFeedback(null);
            };
            const checkAngle = () => {
              if (!angleChallenge) return;
              if (angleChallenge.type === 'create') {
                const diff = Math.abs(angleValue - angleChallenge.target);
                const ok = diff <= 3;
                setAngleFeedback(ok ? {
                  correct: true,
                  msg: '✅ Correct! ' + angleValue + '° is a ' + classifyAngle(angleValue) + ' angle!'
                } : {
                  correct: false,
                  msg: '❌ You made ' + angleValue + '°. Target is ' + angleChallenge.target + '°. (within 3°)'
                });
                setExploreScore(prev => ({
                  correct: prev.correct + (ok ? 1 : 0),
                  total: prev.total + 1
                }));
              } else if (angleChallenge.type === 'classify') {
                const correctClass = classifyAngle(angleChallenge.target);
                const ok = classifyAngle(angleValue) === correctClass;
                setAngleFeedback(ok ? {
                  correct: true,
                  msg: '✅ Correct! ' + angleChallenge.target + '° is ' + correctClass + '.'
                } : {
                  correct: false,
                  msg: '❌ ' + angleChallenge.target + '° is ' + correctClass + ', not ' + classifyAngle(angleValue) + '.'
                });
                setExploreScore(prev => ({
                  correct: prev.correct + (ok ? 1 : 0),
                  total: prev.total + 1
                }));
              }
            };
            return /*#__PURE__*/React.createElement("div", {
              className: "space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200"
            }, /*#__PURE__*/React.createElement("div", {
              className: "flex items-center gap-3 mb-2"
            }, /*#__PURE__*/React.createElement("button", {
              onClick: () => setStemLabTool(null),
              className: "p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            }, /*#__PURE__*/React.createElement(ArrowLeft, {
              size: 18,
              className: "text-slate-500"
            })), /*#__PURE__*/React.createElement("h3", {
              className: "text-lg font-bold text-purple-800"
            }, "\uD83D\uDCD0 Angle Explorer"), /*#__PURE__*/React.createElement("div", {
              className: "flex items-center gap-2 ml-2"
            }, /*#__PURE__*/React.createElement("div", {
              className: "text-xs font-bold text-emerald-600"
            }, exploreScore.correct, "/", exploreScore.total), /*#__PURE__*/React.createElement("button", {
              onClick: () => {
                const snap = {
                  id: 'snap-' + Date.now(),
                  tool: 'protractor',
                  label: 'Angle: ' + angleValue + '\u00b0',
                  data: {
                    angle: angleValue
                  },
                  timestamp: Date.now()
                };
                setToolSnapshots(prev => [...prev, snap]);
                addToast('\U0001f4f8 Snapshot saved!', 'success');
              },
              className: "text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-2 py-0.5 transition-all"
            }, "\uD83D\uDCF8 Snapshot"))), /*#__PURE__*/React.createElement("div", {
              className: "bg-white rounded-xl border-2 border-purple-200 p-4 flex justify-center"
            }, /*#__PURE__*/React.createElement("svg", {
              width: 400,
              height: 220,
              className: "select-none"
            }, /*#__PURE__*/React.createElement("circle", {
              cx: cx,
              cy: cy,
              r: r,
              fill: "none",
              stroke: "#e9d5ff",
              strokeWidth: 1
            }), [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330].map(a => {
              const ar = a * Math.PI / 180;
              return React.createElement('g', {
                key: a
              }, React.createElement('line', {
                x1: cx + (r - 8) * Math.cos(-ar),
                y1: cy + (r - 8) * Math.sin(-ar),
                x2: cx + (r + 2) * Math.cos(-ar),
                y2: cy + (r + 2) * Math.sin(-ar),
                stroke: '#a78bfa',
                strokeWidth: a % 90 === 0 ? 2 : 1
              }), a % 30 === 0 ? React.createElement('text', {
                x: cx + (r + 14) * Math.cos(-ar),
                y: cy + (r + 14) * Math.sin(-ar) + 3,
                textAnchor: 'middle',
                className: 'text-[9px] fill-purple-400 font-mono'
              }, a + '°') : null);
            }), /*#__PURE__*/React.createElement("line", {
              x1: cx,
              y1: cy,
              x2: cx + rayLen,
              y2: cy,
              stroke: "#6b7280",
              strokeWidth: 2
            }), /*#__PURE__*/React.createElement("line", {
              x1: cx,
              y1: cy,
              x2: rayEndX,
              y2: rayEndY,
              stroke: "#7c3aed",
              strokeWidth: 3,
              strokeLinecap: "round"
            }), angleValue > 0 && angleValue < 360 && /*#__PURE__*/React.createElement("path", {
              d: `M ${cx + arcR} ${cy} A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcEndX} ${arcEndY}`,
              fill: "hsla(270,80%,60%,0.15)",
              stroke: "#7c3aed",
              strokeWidth: 1.5
            }), /*#__PURE__*/React.createElement("circle", {
              cx: rayEndX,
              cy: rayEndY,
              r: 10,
              fill: "#7c3aed",
              fillOpacity: 0.2,
              stroke: "#7c3aed",
              strokeWidth: 2,
              className: "cursor-grab",
              onMouseDown: e => {
                const onMove = me => {
                  const rect = e.target.closest('svg').getBoundingClientRect();
                  const dx = me.clientX - rect.left - cx;
                  const dy = -(me.clientY - rect.top - cy);
                  let deg = Math.round(Math.atan2(dy, dx) * 180 / Math.PI);
                  if (deg < 0) deg += 360;
                  setAngleValue(deg);
                  setAngleFeedback(null);
                };
                const onUp = () => {
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }
            }), /*#__PURE__*/React.createElement("circle", {
              cx: cx,
              cy: cy,
              r: 3,
              fill: "#334155"
            }))), /*#__PURE__*/React.createElement("div", {
              className: "grid grid-cols-3 gap-3"
            }, /*#__PURE__*/React.createElement("div", {
              className: "bg-white rounded-xl p-3 border border-purple-100 text-center"
            }, /*#__PURE__*/React.createElement("div", {
              className: "text-xs font-bold text-purple-600 uppercase mb-1"
            }, "Angle"), /*#__PURE__*/React.createElement("div", {
              className: "text-2xl font-bold text-purple-800"
            }, angleValue, "\xB0")), /*#__PURE__*/React.createElement("div", {
              className: "bg-white rounded-xl p-3 border border-purple-100 text-center"
            }, /*#__PURE__*/React.createElement("div", {
              className: "text-xs font-bold text-purple-600 uppercase mb-1"
            }, "Type"), /*#__PURE__*/React.createElement("div", {
              className: `text-lg font-bold ${angleClass === 'Right' ? 'text-green-600' : angleClass === 'Acute' ? 'text-blue-600' : angleClass === 'Obtuse' ? 'text-orange-600' : 'text-red-600'}`
            }, angleClass)), /*#__PURE__*/React.createElement("div", {
              className: "bg-white rounded-xl p-3 border border-purple-100 text-center"
            }, /*#__PURE__*/React.createElement("div", {
              className: "text-xs font-bold text-purple-600 uppercase mb-1"
            }, "Slider"), /*#__PURE__*/React.createElement("input", {
              type: "range",
              min: 0,
              max: 360,
              value: angleValue,
              onChange: e => {
                setAngleValue(parseInt(e.target.value));
                setAngleFeedback(null);
              },
              className: "w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            }))), /*#__PURE__*/React.createElement("div", {
              className: "flex gap-2 flex-wrap"
            }, /*#__PURE__*/React.createElement("button", {
              onClick: () => {
                const ta = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 210, 240, 270, 300, 330][Math.floor(Math.random() * 17)];
                setAngleChallenge({
                  type: 'create',
                  target: ta
                });
                setAngleValue(0);
                setAngleFeedback(null);
              },
              className: "flex-1 py-2 bg-gradient-to-r from-purple-500 to-violet-500 text-white font-bold rounded-lg text-sm hover:from-purple-600 hover:to-violet-600 transition-all shadow-md"
            }, "\uD83C\uDFAF Create Angle"), /*#__PURE__*/React.createElement("button", {
              onClick: () => {
                setAngleValue(45);
                setAngleChallenge(null);
                setAngleFeedback(null);
              },
              className: "px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all"
            }, "\u21BA Reset")), angleChallenge && /*#__PURE__*/React.createElement("div", {
              className: "bg-purple-50 rounded-lg p-3 border border-purple-200"
            }, /*#__PURE__*/React.createElement("p", {
              className: "text-sm font-bold text-purple-800 mb-2"
            }, "\uD83C\uDFAF Create a ", angleChallenge.target, "\xB0 angle (within 3\xB0)"), /*#__PURE__*/React.createElement("div", {
              className: "flex gap-2 items-center"
            }, /*#__PURE__*/React.createElement("span", {
              className: "text-xs text-purple-600"
            }, "Your angle: ", /*#__PURE__*/React.createElement("span", {
              className: "font-bold text-purple-900"
            }, angleValue, "\xB0")), /*#__PURE__*/React.createElement("button", {
              onClick: checkAngle,
              className: "ml-auto px-4 py-1.5 bg-purple-500 text-white font-bold rounded-lg text-sm hover:bg-purple-600 transition-all"
            }, "\u2714 Check")), angleFeedback && /*#__PURE__*/React.createElement("p", {
              className: 'text-sm font-bold mt-2 ' + (angleFeedback.correct ? 'text-green-600' : 'text-red-600')
            }, angleFeedback.msg)));
          })(), stemLabTab === 'explore' && stemLabTool === 'multtable' && (() => {
            const maxNum = 12;
            const checkMult = () => {
              if (!multTableChallenge) return;
              const correct = multTableChallenge.a * multTableChallenge.b;
              const ok = parseInt(multTableAnswer) === correct;
              setMultTableFeedback(ok ? {
                correct: true,
                msg: '✅ Correct! ' + multTableChallenge.a + ' × ' + multTableChallenge.b + ' = ' + correct
              } : {
                correct: false,
                msg: '❌ Not quite. ' + multTableChallenge.a + ' × ' + multTableChallenge.b + ' = ' + correct
              });
              setExploreScore(prev => ({
                correct: prev.correct + (ok ? 1 : 0),
                total: prev.total + 1
              }));
            };
            return /*#__PURE__*/React.createElement("div", {
              className: "space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200"
            }, /*#__PURE__*/React.createElement("div", {
              className: "flex items-center gap-3 mb-2"
            }, /*#__PURE__*/React.createElement("button", {
              onClick: () => setStemLabTool(null),
              className: "p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            }, /*#__PURE__*/React.createElement(ArrowLeft, {
              size: 18,
              className: "text-slate-500"
            })), /*#__PURE__*/React.createElement("h3", {
              className: "text-lg font-bold text-pink-800"
            }, "\uD83D\uDD22 Multiplication Table"), /*#__PURE__*/React.createElement("div", {
              className: "flex items-center gap-2 ml-2"
            }, /*#__PURE__*/React.createElement("button", {
              onClick: () => {
                setMultTableHidden(!multTableHidden);
                setMultTableRevealed(new Set());
              },
              className: 'text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all ' + (multTableHidden ? 'bg-pink-500 text-white border-pink-500 shadow-sm' : 'text-slate-500 bg-slate-100 border-slate-200 hover:bg-slate-200')
            }, multTableHidden ? '🙈 Hidden' : '👁 Visible'), /*#__PURE__*/React.createElement("div", {
              className: "text-xs font-bold text-emerald-600"
            }, exploreScore.correct, "/", exploreScore.total))), /*#__PURE__*/React.createElement("div", {
              className: "bg-white rounded-xl border-2 border-pink-200 p-3 overflow-x-auto"
            }, /*#__PURE__*/React.createElement("table", {
              className: "border-collapse w-full text-center"
            }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
              className: "w-8 h-8 text-[10px] font-bold text-pink-400"
            }, "\xD7"), Array.from({
              length: maxNum
            }).map((_, c) => /*#__PURE__*/React.createElement("th", {
              key: c,
              className: 'w-8 h-8 text-xs font-bold ' + (multTableHover && multTableHover.c === c + 1 ? 'text-pink-700 bg-pink-100' : 'text-pink-500')
            }, c + 1)))), /*#__PURE__*/React.createElement("tbody", null, Array.from({
              length: maxNum
            }).map((_, r) => /*#__PURE__*/React.createElement("tr", {
              key: r
            }, /*#__PURE__*/React.createElement("td", {
              className: 'w-8 h-8 text-xs font-bold ' + (multTableHover && multTableHover.r === r + 1 ? 'text-pink-700 bg-pink-100' : 'text-pink-500')
            }, r + 1), Array.from({
              length: maxNum
            }).map((_, c) => {
              const val = (r + 1) * (c + 1);
              const isHovered = multTableHover && (multTableHover.r === r + 1 || multTableHover.c === c + 1);
              const isExact = multTableHover && multTableHover.r === r + 1 && multTableHover.c === c + 1;
              const isPerfectSquare = r === c;
              return /*#__PURE__*/React.createElement("td", {
                key: c,
                onMouseEnter: () => setMultTableHover({
                  r: r + 1,
                  c: c + 1
                }),
                onMouseLeave: () => setMultTableHover(null),
                onClick: () => {
                  setMultTableChallenge({
                    a: r + 1,
                    b: c + 1
                  });
                  setMultTableAnswer('');
                  setMultTableFeedback(null);
                },
                className: 'w-8 h-8 text-[11px] font-mono cursor-pointer transition-all border border-slate-100 ' + (isExact ? 'bg-pink-500 text-white font-bold scale-110 shadow-lg rounded' : isHovered ? 'bg-pink-50 text-pink-800 font-semibold' : isPerfectSquare ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50')
              }, multTableHidden && !isExact && !multTableRevealed.has(r + '-' + c) ? '?' : val);
            })))))), /*#__PURE__*/React.createElement("div", {
              className: "flex gap-2 flex-wrap"
            }, /*#__PURE__*/React.createElement("button", {
              onClick: () => {
                const a = 2 + Math.floor(Math.random() * 11);
                const b = 2 + Math.floor(Math.random() * 11);
                setMultTableChallenge({
                  a,
                  b
                });
                setMultTableAnswer('');
                setMultTableFeedback(null);
              },
              className: "flex-1 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-lg text-sm hover:from-pink-600 hover:to-rose-600 transition-all shadow-md"
            }, "\uD83C\uDFAF Quick Quiz"), /*#__PURE__*/React.createElement("button", {
              onClick: () => {
                setMultTableChallenge(null);
                setMultTableAnswer('');
                setMultTableFeedback(null);
                setMultTableHover(null);
                setMultTableRevealed(new Set());
              },
              className: "px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all"
            }, "\u21BA Reset")), multTableChallenge && /*#__PURE__*/React.createElement("div", {
              className: "bg-pink-50 rounded-lg p-3 border border-pink-200"
            }, /*#__PURE__*/React.createElement("p", {
              className: "text-lg font-bold text-pink-800 mb-2 text-center"
            }, multTableChallenge.a, " \xD7 ", multTableChallenge.b, " = ?"), /*#__PURE__*/React.createElement("div", {
              className: "flex gap-2 items-center justify-center"
            }, /*#__PURE__*/React.createElement("input", {
              type: "number",
              value: multTableAnswer,
              onChange: e => setMultTableAnswer(e.target.value),
              onKeyDown: e => {
                if (e.key === 'Enter') checkMult();
              },
              className: "w-20 px-3 py-2 text-center text-lg font-bold border-2 border-pink-300 rounded-lg focus:border-pink-500 outline-none",
              placeholder: "?",
              autoFocus: true
            }), /*#__PURE__*/React.createElement("button", {
              onClick: checkMult,
              disabled: !multTableAnswer,
              className: "px-4 py-2 bg-pink-500 text-white font-bold rounded-lg hover:bg-pink-600 transition-all disabled:opacity-40"
            }, "\u2714 Check")), multTableFeedback && /*#__PURE__*/React.createElement("p", {
              className: 'text-sm font-bold mt-2 text-center ' + (multTableFeedback.correct ? 'text-green-600' : 'text-red-600')
            }, multTableFeedback.msg)), /*#__PURE__*/React.createElement("div", {
              className: "text-[10px] text-slate-400 text-center"
            }, /*#__PURE__*/React.createElement("span", {
              className: "inline-block w-3 h-3 bg-indigo-50 border border-indigo-200 rounded mr-1"
            }), " Perfect squares", /*#__PURE__*/React.createElement("span", {
              className: "ml-3 inline-block w-3 h-3 bg-pink-50 border border-pink-200 rounded mr-1"
            }), " Hover cross", /*#__PURE__*/React.createElement("span", {
              className: "ml-3 inline-block w-3 h-3 bg-pink-500 rounded mr-1"
            }), " Selected"));
          })(), stemLabTab === 'explore' && stemLabTool === 'numberline' && /*#__PURE__*/React.createElement("div", {
            className: "space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200"
          }, /*#__PURE__*/React.createElement("div", {
            className: "flex items-center gap-3 mb-2"
          }, /*#__PURE__*/React.createElement("button", {
            onClick: () => setStemLabTool(null),
            className: "p-1.5 hover:bg-slate-100 rounded-lg"
          }, /*#__PURE__*/React.createElement(ArrowLeft, {
            size: 18,
            className: "text-slate-500"
          })), /*#__PURE__*/React.createElement("h3", {
            className: "text-lg font-bold text-blue-800"
          }, "\uD83D\uDCCF Number Line")), /*#__PURE__*/React.createElement("div", {
            className: "grid grid-cols-2 gap-3"
          }, /*#__PURE__*/React.createElement("div", {
            className: "bg-blue-50 rounded-lg p-3 border border-blue-100"
          }, /*#__PURE__*/React.createElement("label", {
            className: "block text-xs text-blue-700 mb-1 font-bold"
          }, "Min Value"), /*#__PURE__*/React.createElement("input", {
            type: "number",
            value: numberLineRange.min,
            onChange: e => setNumberLineRange(prev => ({
              ...prev,
              min: parseInt(e.target.value) || 0
            })),
            className: "w-full px-3 py-1.5 text-sm border border-blue-200 rounded-lg"
          })), /*#__PURE__*/React.createElement("div", {
            className: "bg-blue-50 rounded-lg p-3 border border-blue-100"
          }, /*#__PURE__*/React.createElement("label", {
            className: "block text-xs text-blue-700 mb-1 font-bold"
          }, "Max Value"), /*#__PURE__*/React.createElement("input", {
            type: "number",
            value: numberLineRange.max,
            onChange: e => setNumberLineRange(prev => ({
              ...prev,
              max: parseInt(e.target.value) || 20
            })),
            className: "w-full px-3 py-1.5 text-sm border border-blue-200 rounded-lg"
          }))), /*#__PURE__*/React.createElement("div", {
            className: "bg-white rounded-xl border-2 border-blue-200 p-6 flex flex-col items-center"
          }, /*#__PURE__*/React.createElement("svg", {
            width: "100%",
            height: "120",
            viewBox: `0 0 700 120`,
            className: "max-w-full"
          }, /*#__PURE__*/React.createElement("line", {
            x1: "40",
            y1: "60",
            x2: "660",
            y2: "60",
            stroke: "#3b82f6",
            strokeWidth: "3",
            strokeLinecap: "round"
          }), Array.from({
            length: Math.min(numberLineRange.max - numberLineRange.min + 1, 21)
          }, (_, i) => {
            const val = numberLineRange.min + Math.round(i * (numberLineRange.max - numberLineRange.min) / Math.min(numberLineRange.max - numberLineRange.min, 20));
            const x = 40 + i / Math.min(numberLineRange.max - numberLineRange.min, 20) * 620;
            const isMajor = i % 5 === 0 || i === Math.min(numberLineRange.max - numberLineRange.min, 20);
            return React.createElement('g', {
              key: i
            }, React.createElement('line', {
              x1: x,
              y1: isMajor ? 42 : 50,
              x2: x,
              y2: isMajor ? 78 : 70,
              stroke: '#3b82f6',
              strokeWidth: isMajor ? 2.5 : 1.5
            }), isMajor && React.createElement('text', {
              x: x,
              y: 98,
              textAnchor: 'middle',
              fill: '#1e40af',
              fontSize: '13',
              fontWeight: 'bold',
              fontFamily: 'monospace'
            }, val));
          }), numberLineMarkers.map((marker, i) => {
            const range = numberLineRange.max - numberLineRange.min;
            const x = 40 + (marker.value - numberLineRange.min) / range * 620;
            return React.createElement('g', {
              key: 'marker-' + i
            }, React.createElement('circle', {
              cx: x,
              cy: 60,
              r: 10,
              fill: marker.color || '#ef4444',
              stroke: '#fff',
              strokeWidth: 2,
              className: 'cursor-pointer'
            }), React.createElement('text', {
              x: x,
              y: 30,
              textAnchor: 'middle',
              fill: marker.color || '#ef4444',
              fontSize: '12',
              fontWeight: 'bold'
            }, marker.label || marker.value));
          }), /*#__PURE__*/React.createElement("polygon", {
            points: "660,53 670,60 660,67",
            fill: "#3b82f6"
          }), /*#__PURE__*/React.createElement("polygon", {
            points: "40,53 30,60 40,67",
            fill: "#3b82f6"
          }))), /*#__PURE__*/React.createElement("div", {
            className: "flex gap-2 items-center"
          }, /*#__PURE__*/React.createElement("input", {
            type: "number",
            id: "nlMarkerVal",
            min: numberLineRange.min,
            max: numberLineRange.max,
            placeholder: "Value...",
            className: "flex-1 px-3 py-2 text-sm border border-blue-200 rounded-lg"
          }), /*#__PURE__*/React.createElement("input", {
            type: "text",
            id: "nlMarkerLabel",
            placeholder: "Label (optional)",
            className: "flex-1 px-3 py-2 text-sm border border-blue-200 rounded-lg"
          }), /*#__PURE__*/React.createElement("button", {
            onClick: () => {
              const valEl = document.getElementById('nlMarkerVal');
              const lblEl = document.getElementById('nlMarkerLabel');
              if (valEl && valEl.value) {
                const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                setNumberLineMarkers(prev => [...prev, {
                  value: parseFloat(valEl.value),
                  label: lblEl?.value || '',
                  color: colors[prev.length % colors.length]
                }]);
                valEl.value = '';
                if (lblEl) lblEl.value = '';
              }
            },
            className: "px-4 py-2 bg-blue-500 text-white font-bold text-sm rounded-lg hover:bg-blue-600"
          }, "+ Add")), /*#__PURE__*/React.createElement("div", {
            className: "flex flex-wrap gap-2"
          }, numberLineMarkers.map((m, i) => /*#__PURE__*/React.createElement("span", {
            key: i,
            className: "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-white",
            style: {
              background: m.color
            }
          }, m.label || m.value, /*#__PURE__*/React.createElement("button", {
            onClick: () => setNumberLineMarkers(numberLineMarkers.filter((_, j) => j !== i)),
            className: "ml-1 hover:opacity-70"
          }, "\xD7"))), numberLineMarkers.length > 0 && /*#__PURE__*/React.createElement("button", {
            onClick: () => setNumberLineMarkers([]),
            className: "text-xs text-slate-400 hover:text-red-500"
          }, "Clear all")), /*#__PURE__*/React.createElement("div", {
            className: "flex gap-2"
          }, [{
            min: 0,
            max: 10,
            label: '0-10'
          }, {
            min: 0,
            max: 20,
            label: '0-20'
          }, {
            min: 0,
            max: 100,
            label: '0-100'
          }, {
            min: -10,
            max: 10,
            label: '-10 to 10'
          }].map(preset => /*#__PURE__*/React.createElement("button", {
            key: preset.label,
            onClick: () => {
              setNumberLineRange({
                min: preset.min,
                max: preset.max
              });
              setNumberLineMarkers([]);
            },
            className: "px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all"
          }, preset.label))), /*#__PURE__*/React.createElement("div", {
            className: "bg-blue-50 rounded-xl p-4 border border-blue-200 space-y-3"
          }, /*#__PURE__*/React.createElement("div", {
            className: "flex items-center justify-between"
          }, /*#__PURE__*/React.createElement("div", {
            className: "flex items-center gap-2"
          }, /*#__PURE__*/React.createElement("h4", {
            className: "text-sm font-bold text-blue-800"
          }, "\uD83C\uDFAF Number Line Challenge"), /*#__PURE__*/React.createElement("div", {
            className: "flex gap-0.5 ml-2"
          }, ['easy', 'medium', 'hard'].map(d => /*#__PURE__*/React.createElement("button", {
            key: d,
            onClick: () => setExploreDifficulty(d),
            className: "text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all " + (exploreDifficulty === d ? d === 'easy' ? 'bg-green-500 text-white' : d === 'hard' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
          }, d)))), /*#__PURE__*/React.createElement("div", {
            className: "flex items-center gap-2"
          }, /*#__PURE__*/React.createElement("div", {
            className: "text-xs font-bold text-blue-600"
          }, exploreScore.correct, "/", exploreScore.total), exploreScore.total > 0 && /*#__PURE__*/React.createElement("button", {
            onClick: submitExploreScore,
            className: "text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full hover:bg-blue-700"
          }, "\uD83D\uDCBE Save"))), !nlChallenge ? /*#__PURE__*/React.createElement("button", {
            onClick: () => {
              const min = numberLineRange.min;
              const max = numberLineRange.max;
              const range = max - min;
              const types = ['locate', 'distance', 'midpoint'];
              const type = types[Math.floor(Math.random() * types.length)];
              let ch;
              if (type === 'locate') {
                const target = min + Math.floor(Math.random() * range);
                ch = {
                  type,
                  question: t('explore.nl_locate', {
                    target
                  }),
                  answer: target
                };
              } else if (type === 'distance') {
                const a = min + Math.floor(Math.random() * range);
                const b = min + Math.floor(Math.random() * range);
                ch = {
                  type,
                  question: t('explore.nl_distance', {
                    a: Math.min(a, b),
                    b: Math.max(a, b)
                  }),
                  answer: Math.abs(a - b)
                };
              } else {
                const a = min + Math.floor(Math.random() * (range - 2));
                const b = a + 2 + Math.floor(Math.random() * Math.min(8, range - 2));
                ch = {
                  type,
                  question: t('explore.nl_midpoint', {
                    a,
                    b
                  }),
                  answer: (a + b) / 2
                };
              }
              setNlChallenge(ch);
              setNlAnswer('');
              setNlFeedback(null);
            },
            className: "w-full py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl text-sm hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md"
          }, "\uD83C\uDFB2 Generate Challenge") : /*#__PURE__*/React.createElement("div", {
            className: "space-y-2"
          }, /*#__PURE__*/React.createElement("p", {
            className: "text-sm font-bold text-blue-800"
          }, nlChallenge.question), /*#__PURE__*/React.createElement("div", {
            className: "flex gap-2"
          }, /*#__PURE__*/React.createElement("input", {
            type: "number",
            step: "0.5",
            value: nlAnswer,
            onChange: e => setNlAnswer(e.target.value),
            onKeyDown: e => {
              if (e.key === 'Enter' && nlAnswer) {
                const ans = parseFloat(nlAnswer);
                const ok = ans === nlChallenge.answer;
                setNlFeedback(ok ? {
                  correct: true,
                  msg: t('explore.correct')
                } : {
                  correct: false,
                  msg: '❌ Answer: ' + nlChallenge.answer
                });
                setExploreScore(prev => ({
                  correct: prev.correct + (ok ? 1 : 0),
                  total: prev.total + 1
                }));
              }
            },
            placeholder: t('explore.your_answer'),
            className: "flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm font-mono"
          }), /*#__PURE__*/React.createElement("button", {
            onClick: () => {
              const ans = parseFloat(nlAnswer);
              const ok = ans === nlChallenge.answer;
              setNlFeedback(ok ? {
                correct: true,
                msg: t('explore.correct')
              } : {
                correct: false,
                msg: '❌ Answer: ' + nlChallenge.answer
              });
              setExploreScore(prev => ({
                correct: prev.correct + (ok ? 1 : 0),
                total: prev.total + 1
              }));
            },
            className: "px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700"
          }, "Check")), nlFeedback && /*#__PURE__*/React.createElement("p", {
            className: "text-sm font-bold " + (nlFeedback.correct ? "text-green-600" : "text-red-600")
          }, nlFeedback.msg), nlFeedback && /*#__PURE__*/React.createElement("button", {
            onClick: () => {
              setNlChallenge(null);
              setNlFeedback(null);
              setNlAnswer('');
            },
            className: "text-xs text-blue-600 font-bold hover:underline"
          }, t('explore.next_challenge'))))), stemLabTab === 'explore' && stemLabTool === 'areamodel' && /*#__PURE__*/React.createElement("div", {
            className: "space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200"
          }, /*#__PURE__*/React.createElement("div", {
            className: "flex items-center gap-3 mb-2"
          }, /*#__PURE__*/React.createElement("button", {
            onClick: () => setStemLabTool(null),
            className: "p-1.5 hover:bg-slate-100 rounded-lg"
          }, /*#__PURE__*/React.createElement(ArrowLeft, {
            size: 18,
            className: "text-slate-500"
          })), /*#__PURE__*/React.createElement("h3", {
            className: "text-lg font-bold text-amber-800"
          }, "\uD83D\uDFE7 Area Model")), /*#__PURE__*/React.createElement("div", {
            className: "grid grid-cols-2 gap-3"
          }, /*#__PURE__*/React.createElement("div", {
            className: "bg-amber-50 rounded-lg p-3 border border-amber-100"
          }, /*#__PURE__*/React.createElement("label", {
            className: "block text-xs text-amber-700 mb-1 font-bold"
          }, "Rows (Factor 1)"), /*#__PURE__*/React.createElement("input", {
            type: "range",
            min: "1",
            max: "12",
            value: areaModelDims.rows,
            onChange: e => setAreaModelDims(prev => ({
              ...prev,
              rows: parseInt(e.target.value)
            })),
            className: "w-full accent-amber-600"
          }), /*#__PURE__*/React.createElement("div", {
            className: "text-center text-lg font-bold text-amber-700"
          }, areaModelDims.rows)), /*#__PURE__*/React.createElement("div", {
            className: "bg-amber-50 rounded-lg p-3 border border-amber-100"
          }, /*#__PURE__*/React.createElement("label", {
            className: "block text-xs text-amber-700 mb-1 font-bold"
          }, "Columns (Factor 2)"), /*#__PURE__*/React.createElement("input", {
            type: "range",
            min: "1",
            max: "12",
            value: areaModelDims.cols,
            onChange: e => setAreaModelDims(prev => ({
              ...prev,
              cols: parseInt(e.target.value)
            })),
            className: "w-full accent-amber-600"
          }), /*#__PURE__*/React.createElement("div", {
            className: "text-center text-lg font-bold text-amber-700"
          }, areaModelDims.cols))), /*#__PURE__*/React.createElement("div", {
            className: "bg-white rounded-xl border-2 border-amber-200 p-4 flex justify-center"
          }, /*#__PURE__*/React.createElement("div", {
            className: "inline-grid gap-[2px]",
            style: {
              gridTemplateColumns: `repeat(${areaModelDims.cols}, minmax(28px, 48px))`
            }
          }, Array.from({
            length: areaModelDims.rows * areaModelDims.cols
          }, (_, i) => {
            const row = Math.floor(i / areaModelDims.cols);
            const col = i % areaModelDims.cols;
            const isHighlighted = row < areaModelHighlight.rows && col < areaModelHighlight.cols;
            return React.createElement('div', {
              key: i,
              onClick: () => setAreaModelHighlight({
                rows: row + 1,
                cols: col + 1
              }),
              className: 'aspect-square rounded-sm border cursor-pointer transition-all hover:scale-110 ' + (isHighlighted ? 'bg-amber-400 border-amber-500 shadow-sm' : 'bg-amber-100 border-amber-200 hover:bg-amber-200'),
              style: {
                minWidth: '28px'
              }
            });
          }))), /*#__PURE__*/React.createElement("div", {
            className: "bg-white rounded-xl p-4 border border-amber-100 text-center"
          }, /*#__PURE__*/React.createElement("div", {
            className: "text-xl font-bold text-amber-800"
          }, areaModelDims.rows, " \xD7 ", areaModelDims.cols, " = ", /*#__PURE__*/React.createElement("span", {
            className: "text-3xl text-amber-600"
          }, areaModelDims.rows * areaModelDims.cols)), areaModelHighlight.rows > 0 && areaModelHighlight.cols > 0 && /*#__PURE__*/React.createElement("div", {
            className: "text-sm text-amber-600 mt-1"
          }, "Selected region: ", areaModelHighlight.rows, " \xD7 ", areaModelHighlight.cols, " = ", areaModelHighlight.rows * areaModelHighlight.cols, " (click squares to highlight)")), /*#__PURE__*/React.createElement("button", {
            onClick: () => setAreaModelHighlight({
              rows: 0,
              cols: 0
            }),
            className: "text-xs text-slate-400 hover:text-amber-600"
          }, "Clear highlight"), /*#__PURE__*/React.createElement("div", {
            className: "bg-amber-50 rounded-xl p-4 border border-amber-200 space-y-3"
          }, /*#__PURE__*/React.createElement("div", {
            className: "flex items-center justify-between"
          }, /*#__PURE__*/React.createElement("div", {
            className: "flex items-center gap-2"
          }, /*#__PURE__*/React.createElement("h4", {
            className: "text-sm font-bold text-amber-800"
          }, "\uD83C\uDFAF Multiplication Challenge"), /*#__PURE__*/React.createElement("div", {
            className: "flex gap-0.5 ml-2"
          }, ['easy', 'medium', 'hard'].map(d => /*#__PURE__*/React.createElement("button", {
            key: d,
            onClick: () => setExploreDifficulty(d),
            className: "text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all " + (exploreDifficulty === d ? d === 'easy' ? 'bg-green-500 text-white' : d === 'hard' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
          }, d)))), /*#__PURE__*/React.createElement("div", {
            className: "flex items-center gap-2"
          }, /*#__PURE__*/React.createElement("div", {
            className: "text-xs font-bold text-amber-600"
          }, exploreScore.correct, "/", exploreScore.total), exploreScore.total > 0 && /*#__PURE__*/React.createElement("button", {
            onClick: submitExploreScore,
            className: "text-[10px] font-bold bg-amber-600 text-white px-2 py-0.5 rounded-full hover:bg-amber-700"
          }, "\uD83D\uDCBE Save"))), !areaChallenge ? /*#__PURE__*/React.createElement("button", {
            onClick: () => {
              const adiff = getAdaptiveDifficulty();
              const amax = adiff === 'easy' ? 5 : adiff === 'hard' ? 12 : 9;
              const a = Math.floor(Math.random() * (amax - 1)) + 2;
              const b = Math.floor(Math.random() * (amax - 1)) + 2;
              setAreaModelDims({
                rows: a,
                cols: b
              });
              setAreaModelHighlight({
                rows: 0,
                cols: 0
              });
              setAreaAnswer('');
              setAreaFeedback(null);
            },
            className: "w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md"
          }, "\uD83C\uDFB2 Generate Challenge") : /*#__PURE__*/React.createElement("div", {
            className: "space-y-2"
          }, /*#__PURE__*/React.createElement("p", {
            className: "text-sm font-bold text-amber-800"
          }, areaChallenge.question), /*#__PURE__*/React.createElement("div", {
            className: "flex gap-2"
          }, /*#__PURE__*/React.createElement("input", {
            type: "number",
            value: areaAnswer,
            onChange: e => setAreaAnswer(e.target.value),
            onKeyDown: e => {
              if (e.key === 'Enter' && areaAnswer) {
                const ans = parseInt(areaAnswer);
                setAreaFeedback(ans === areaChallenge.answer ? {
                  correct: true,
                  msg: t('explore.area_correct', {
                    a: areaChallenge.a,
                    b: areaChallenge.b,
                    product: areaChallenge.answer
                  })
                } : {
                  correct: false,
                  msg: t('explore.try_again_count')
                });
                setExploreScore(prev => ({
                  correct: prev.correct + (ans === areaChallenge.answer ? 1 : 0),
                  total: prev.total + 1
                }));
              }
            },
            placeholder: t('explore.product_placeholder'),
            className: "flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm font-mono"
          }), /*#__PURE__*/React.createElement("button", {
            onClick: () => {
              const ans = parseInt(areaAnswer);
              setAreaFeedback(ans === areaChallenge.answer ? {
                correct: true,
                msg: t('explore.area_correct', {
                  a: areaChallenge.a,
                  b: areaChallenge.b,
                  product: areaChallenge.answer
                })
              } : {
                correct: false,
                msg: t('explore.try_again_count')
              });
              setExploreScore(prev => ({
                correct: prev.correct + (ans === areaChallenge.answer ? 1 : 0),
                total: prev.total + 1
              }));
            },
            className: "px-4 py-2 bg-amber-600 text-white font-bold rounded-lg text-sm hover:bg-amber-700"
          }, "Check")), areaFeedback && /*#__PURE__*/React.createElement("p", {
            className: "text-sm font-bold " + (areaFeedback.correct ? "text-green-600" : "text-red-600")
          }, areaFeedback.msg), areaFeedback && /*#__PURE__*/React.createElement("button", {
            onClick: () => {
              setAreaChallenge(null);
              setAreaFeedback(null);
              setAreaAnswer('');
            },
            className: "text-xs text-amber-600 font-bold hover:underline"
          }, t('explore.next_challenge'))))), stemLabTab === 'explore' && stemLabTool === 'fractions' && /*#__PURE__*/React.createElement("div", {
            className: "space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200"
          }, /*#__PURE__*/React.createElement("div", {
            className: "flex items-center gap-3 mb-2"
          }, /*#__PURE__*/React.createElement("button", {
            onClick: () => setStemLabTool(null),
            className: "p-1.5 hover:bg-slate-100 rounded-lg"
          }, /*#__PURE__*/React.createElement(ArrowLeft, {
            size: 18,
            className: "text-slate-500"
          })), /*#__PURE__*/React.createElement("h3", {
            className: "text-lg font-bold text-rose-800"
          }, "\uD83C\uDF55 Fraction Lab"),
        /*#__PURE__*/React.createElement("div", { className: "flex gap-1 ml-auto" },
            React.createElement("button", { onClick: () => setStemLabTool('fractionViz'), className: "px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all" }, "\uD83D\uDD0D Compare"),
            React.createElement("button", { className: "px-3 py-1 rounded-lg text-xs font-bold bg-rose-600 text-white" }, "\uD83C\uDFC6 Challenge")
          )), /*#__PURE__*/React.createElement("div", {
            className: "grid grid-cols-2 gap-3"
          }, /*#__PURE__*/React.createElement("div", {
            className: "bg-rose-50 rounded-lg p-3 border border-rose-100"
          }, /*#__PURE__*/React.createElement("label", {
            className: "block text-xs text-rose-700 mb-1 font-bold"
          }, "Denominator (parts)"), /*#__PURE__*/React.createElement("input", {
            type: "range",
            min: "2",
            max: "12",
            value: fractionPieces.denominator,
            onChange: e => setFractionPieces(prev => ({
              ...prev,
              denominator: parseInt(e.target.value),
              numerator: Math.min(prev.numerator, parseInt(e.target.value))
            })),
            className: "w-full accent-rose-600"
          }), /*#__PURE__*/React.createElement("div", {
            className: "text-center text-lg font-bold text-rose-700"
          }, fractionPieces.denominator)), /*#__PURE__*/React.createElement("div", {
            className: "bg-rose-50 rounded-lg p-3 border border-rose-100"
          }, /*#__PURE__*/React.createElement("label", {
            className: "block text-xs text-rose-700 mb-1 font-bold"
          }, "Numerator (selected)"), /*#__PURE__*/React.createElement("input", {
            type: "range",
            min: "0",
            max: fractionPieces.denominator,
            value: fractionPieces.numerator,
            onChange: e => setFractionPieces(prev => ({
              ...prev,
              numerator: parseInt(e.target.value)
            })),
            className: "w-full accent-rose-600"
          }), /*#__PURE__*/React.createElement("div", {
            className: "text-center text-lg font-bold text-rose-700"
          }, fractionPieces.numerator))), /*#__PURE__*/React.createElement("div", {
            className: "bg-white rounded-xl border-2 border-rose-200 p-6 flex justify-center"
          }, /*#__PURE__*/React.createElement("svg", {
            width: "240",
            height: "240",
            viewBox: "-120 -120 240 240"
          }, Array.from({
            length: fractionPieces.denominator
          }, (_, i) => {
            const startAngle = i / fractionPieces.denominator * 2 * Math.PI - Math.PI / 2;
            const endAngle = (i + 1) / fractionPieces.denominator * 2 * Math.PI - Math.PI / 2;
            const x1 = 100 * Math.cos(startAngle);
            const y1 = 100 * Math.sin(startAngle);
            const x2 = 100 * Math.cos(endAngle);
            const y2 = 100 * Math.sin(endAngle);
            const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
            const filled = i < fractionPieces.numerator;
            return React.createElement('path', {
              key: i,
              d: `M 0 0 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`,
              fill: filled ? `hsl(${340 + i * 8}, 70%, ${60 + i * 2}%)` : '#fecdd3',
              stroke: '#e11d48',
              strokeWidth: '2',
              className: 'cursor-pointer hover:opacity-80 transition-opacity',
              onClick: () => setFractionPieces(prev => ({
                ...prev,
                numerator: filled && prev.numerator === i + 1 ? i : i + 1
              }))
            });
          }), /*#__PURE__*/React.createElement("circle", {
            cx: "0",
            cy: "0",
            r: "3",
            fill: "#e11d48"
          }))), /*#__PURE__*/React.createElement("div", {
            className: "bg-white rounded-xl border-2 border-rose-200 p-4"
          }, /*#__PURE__*/React.createElement("div", {
            className: "flex gap-[2px] h-12 rounded-lg overflow-hidden"
          }, Array.from({
            length: fractionPieces.denominator
          }, (_, i) => React.createElement('div', {
            key: i,
            onClick: () => setFractionPieces(prev => ({
              ...prev,
              numerator: i < prev.numerator ? i : i + 1
            })),
            className: `flex-1 cursor-pointer transition-all ${i < fractionPieces.numerator ? 'bg-rose-500 hover:bg-rose-600' : 'bg-rose-100 hover:bg-rose-200'}`
          })))), /*#__PURE__*/React.createElement("div", {
            className: "bg-white rounded-xl p-4 border border-rose-100 text-center"
          }, /*#__PURE__*/React.createElement("div", {
            className: "inline-flex flex-col items-center"
          }, /*#__PURE__*/React.createElement("span", {
            className: "text-3xl font-bold text-rose-700 border-b-4 border-rose-400 px-4 pb-1"
          }, fractionPieces.numerator), /*#__PURE__*/React.createElement("span", {
            className: "text-3xl font-bold text-rose-700 px-4 pt-1"
          }, fractionPieces.denominator)), /*#__PURE__*/React.createElement("div", {
            className: "text-sm text-rose-600 mt-2"
          }, "= ", (fractionPieces.numerator / fractionPieces.denominator * 100).toFixed(0), "%", fractionPieces.numerator > 0 && /*#__PURE__*/React.createElement("span", {
            className: "text-slate-400 ml-2"
          }, "\u2248 ", (fractionPieces.numerator / fractionPieces.denominator).toFixed(3))), fractionPieces.numerator === fractionPieces.denominator && /*#__PURE__*/React.createElement("div", {
            className: "text-sm font-bold text-green-600 mt-1"
          }, "= 1 whole! \uD83C\uDF89")), /*#__PURE__*/React.createElement("div", {
            className: "flex flex-wrap gap-2"
          }, [{
            n: 1,
            d: 2,
            l: '½'
          }, {
            n: 1,
            d: 3,
            l: '⅓'
          }, {
            n: 1,
            d: 4,
            l: '¼'
          }, {
            n: 2,
            d: 3,
            l: '⅔'
          }, {
            n: 3,
            d: 4,
            l: '¾'
          }, {
            n: 3,
            d: 8,
            l: '⅜'
          }, {
            n: 5,
            d: 6,
            l: '⅚'
          }].map(p => /*#__PURE__*/React.createElement("button", {
            key: p.l,
            onClick: () => setFractionPieces({
              numerator: p.n,
              denominator: p.d
            }),
            className: "px-3 py-1.5 text-sm font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition-all"
          }, p.l))), /*#__PURE__*/React.createElement("div", {
            className: "bg-rose-50 rounded-xl p-4 border border-rose-200 space-y-3"
          }, /*#__PURE__*/React.createElement("div", {
            className: "flex items-center justify-between"
          }, /*#__PURE__*/React.createElement("div", {
            className: "flex items-center gap-2"
          }, /*#__PURE__*/React.createElement("h4", {
            className: "text-sm font-bold text-rose-800"
          }, "\uD83C\uDFAF Fraction Challenge"), /*#__PURE__*/React.createElement("div", {
            className: "flex gap-0.5 ml-2"
          }, ['easy', 'medium', 'hard'].map(d => /*#__PURE__*/React.createElement("button", {
            key: d,
            onClick: () => setExploreDifficulty(d),
            className: "text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all " + (exploreDifficulty === d ? d === 'easy' ? 'bg-green-500 text-white' : d === 'hard' ? 'bg-red-500 text-white' : 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
          }, d)))), /*#__PURE__*/React.createElement("div", {
            className: "flex items-center gap-2"
          }, /*#__PURE__*/React.createElement("div", {
            className: "text-xs font-bold text-rose-600"
          }, exploreScore.correct, "/", exploreScore.total), exploreScore.total > 0 && /*#__PURE__*/React.createElement("button", {
            onClick: submitExploreScore,
            className: "text-[10px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded-full hover:bg-rose-700"
          }, "\uD83D\uDCBE Save"))), !fracChallenge ? /*#__PURE__*/React.createElement("button", {
            onClick: () => {
              const types = ['identify', 'equivalent', 'compare'];
              const type = types[Math.floor(Math.random() * types.length)];
              let ch;
              if (type === 'identify') {
                const fdiff = getAdaptiveDifficulty();
                const dpool = fdiff === 'easy' ? [2, 3, 4] : fdiff === 'hard' ? [3, 4, 5, 6, 8, 10, 12] : [2, 3, 4, 5, 6, 8];
                const d = dpool[Math.floor(Math.random() * dpool.length)];
                const n = Math.floor(Math.random() * d) + 1;
                setFractionPieces({
                  numerator: n,
                  denominator: d
                });
                ch = {
                  type,
                  question: t('explore.frac_identify'),
                  answer: n
                };
              } else if (type === 'equivalent') {
                const d = [2, 3, 4, 5, 6][Math.floor(Math.random() * 5)];
                const n = Math.floor(Math.random() * (d - 1)) + 1;
                const mult = Math.floor(Math.random() * 3) + 2;
                ch = {
                  type,
                  question: t('explore.frac_equivalent', {
                    n,
                    d,
                    target: d * mult
                  }),
                  answer: n * mult
                };
              } else {
                const d1 = [2, 3, 4, 6][Math.floor(Math.random() * 4)];
                const n1 = Math.floor(Math.random() * d1) + 1;
                const d2 = [2, 3, 4, 6][Math.floor(Math.random() * 4)];
                const n2 = Math.floor(Math.random() * d2) + 1;
                const v1 = n1 / d1;
                const v2 = n2 / d2;
                ch = {
                  type,
                  question: t('explore.frac_compare', {
                    n1,
                    d1,
                    n2,
                    d2
                  }),
                  answer: v1 >= v2 ? n1 : n2
                };
              }
              setFracChallenge(ch);
              setFracAnswer('');
              setFracFeedback(null);
            },
            className: "w-full py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-xl text-sm hover:from-rose-600 hover:to-pink-600 transition-all shadow-md"
          }, "\uD83C\uDFB2 Generate Challenge") : /*#__PURE__*/React.createElement("div", {
            className: "space-y-2"
          }, /*#__PURE__*/React.createElement("p", {
            className: "text-sm font-bold text-rose-800"
          }, fracChallenge.question), /*#__PURE__*/React.createElement("div", {
            className: "flex gap-2"
          }, /*#__PURE__*/React.createElement("input", {
            type: "number",
            value: fracAnswer,
            onChange: e => setFracAnswer(e.target.value),
            onKeyDown: e => {
              if (e.key === 'Enter' && fracAnswer) {
                const ans = parseInt(fracAnswer);
                const ok = ans === fracChallenge.answer;
                setFracFeedback(ok ? {
                  correct: true,
                  msg: t('explore.correct')
                } : {
                  correct: false,
                  msg: t('explore.answer_was', {
                    answer: fracChallenge.answer
                  })
                });
                setExploreScore(prev => ({
                  correct: prev.correct + (ok ? 1 : 0),
                  total: prev.total + 1
                }));
              }
            },
            placeholder: t('explore.answer_placeholder'),
            className: "flex-1 px-3 py-2 border border-rose-300 rounded-lg text-sm font-mono"
          }), /*#__PURE__*/React.createElement("button", {
            onClick: () => {
              const ans = parseInt(fracAnswer);
              const ok = ans === fracChallenge.answer;
              setFracFeedback(ok ? {
                correct: true,
                msg: t('explore.correct')
              } : {
                correct: false,
                msg: t('explore.answer_was', {
                  answer: fracChallenge.answer
                })
              });
              setExploreScore(prev => ({
                correct: prev.correct + (ok ? 1 : 0),
                total: prev.total + 1
              }));
            },
            className: "px-4 py-2 bg-rose-600 text-white font-bold rounded-lg text-sm hover:bg-rose-700"
          }, "Check")), fracFeedback && /*#__PURE__*/React.createElement("p", {
            className: "text-sm font-bold " + (fracFeedback.correct ? "text-green-600" : "text-red-600")
          }, fracFeedback.msg), fracFeedback && /*#__PURE__*/React.createElement("button", {
            onClick: () => {
              setFracChallenge(null);
              setFracFeedback(null);
              setFracAnswer('');
            },
            className: "text-xs text-rose-600 font-bold hover:underline"
          }, t('explore.next_challenge'))))),
        // ═══════════════════════════════════════════════════════
        // TIER 3: Calculus Visualizer, Wave Simulator, Cell Diagram
        // ═══════════════════════════════════════════════════════

        stemLabTab === 'explore' && stemLabTool === 'calculus' && (() => {
          const d = labToolData.calculus;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, calculus: { ...prev.calculus, [key]: val } }));
          // grade filter removed — all tools visible
          const W = 440, H = 300, pad = 40;
          const evalF = x => d.a * x * x + d.b * x + d.c;
          const xR = { min: -2, max: Math.max(d.xMax + 1, 6) };
          const yMax = Math.max(...Array.from({ length: 50 }, (_, i) => Math.abs(evalF(xR.min + i / 49 * (xR.max - xR.min)))), 1);
          const yR = { min: -yMax * 0.2, max: yMax * 1.2 };
          const toSX = x => pad + ((x - xR.min) / (xR.max - xR.min)) * (W - 2 * pad);
          const toSY = y => (H - pad) - ((y - yR.min) / (yR.max - yR.min)) * (H - 2 * pad);
          const dx = (d.xMax - d.xMin) / d.n;
          const rects = [];
          let area = 0;
          for (let i = 0; i < d.n; i++) {
            const xi = d.xMin + i * dx;
            const yi = d.mode === 'left' ? evalF(xi) : d.mode === 'right' ? evalF(xi + dx) : evalF(xi + dx / 2);
            area += yi * dx;
            rects.push({ x: xi, w: dx, h: yi });
          }
          const curvePts = [];
          for (let px = 0; px <= W - 2 * pad; px += 2) {
            const x = xR.min + (px / (W - 2 * pad)) * (xR.max - xR.min);
            curvePts.push(`${toSX(x)},${toSY(evalF(x))}`);
          }
          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-4" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "∫ Calculus Visualizer"),
              React.createElement("div", { className: "flex gap-1 ml-auto" },
                ["left", "midpoint", "right"].map(m => React.createElement("button", { key: m, onClick: () => upd("mode", m), className: `px-3 py-1 rounded-lg text-xs font-bold ${d.mode === m ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}` }, m))
              )
            ),
            React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, className: "w-full bg-white rounded-xl border border-red-200", style: { maxHeight: "320px" } },
              React.createElement("line", { x1: pad, y1: toSY(0), x2: W - pad, y2: toSY(0), stroke: "#94a3b8", strokeWidth: 1 }),
              React.createElement("line", { x1: toSX(0), y1: pad, x2: toSX(0), y2: H - pad, stroke: "#94a3b8", strokeWidth: 1 }),
              rects.map((r, i) => React.createElement("rect", { key: i, x: toSX(r.x), y: r.h >= 0 ? toSY(r.h) : toSY(0), width: Math.abs(toSX(r.x + r.w) - toSX(r.x)), height: Math.abs(toSY(r.h) - toSY(0)), fill: "rgba(239,68,68,0.2)", stroke: "#ef4444", strokeWidth: 1 })),
              curvePts.length > 1 && React.createElement("polyline", { points: curvePts.join(" "), fill: "none", stroke: "#1e293b", strokeWidth: 2.5 }),
              React.createElement("rect", { x: toSX(d.xMin), y: pad, width: Math.abs(toSX(d.xMax) - toSX(d.xMin)), height: H - 2 * pad, fill: "none", stroke: "#ef4444", strokeWidth: 1, strokeDasharray: "4 2" }),
              React.createElement("text", { x: W / 2, y: H - 8, textAnchor: "middle", className: "text-[10px]", fill: "#64748b" }, `f(x) = ${d.a}x² + ${d.b}x + ${d.c} | Area ≈ ${area.toFixed(3)} (n=${d.n}, ${d.mode})`)
            ),
            React.createElement("div", { className: "grid grid-cols-2 gap-3 mt-3" },
              [{ k: 'xMin', label: 'a (lower)', min: -2, max: 8, step: 0.5 }, { k: 'xMax', label: 'b (upper)', min: 1, max: 10, step: 0.5 }, { k: 'n', label: 'Rectangles (n)', min: 2, max: 50, step: 1 }, { k: 'a', label: 'Coeff a', min: -3, max: 3, step: 0.1 }].map(s =>
                React.createElement("div", { key: s.k, className: "text-center" },
                  React.createElement("label", { className: "text-xs font-bold text-slate-500" }, s.label + ": " + d[s.k]),
                  React.createElement("input", { type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k], onChange: e => upd(s.k, parseFloat(e.target.value)), className: "w-full accent-red-600" })
                )
              )
            ),
            React.createElement("div", { className: "mt-3 flex flex-wrap gap-1.5" },
              React.createElement("span", { className: "text-[10px] font-bold text-slate-400 self-center" }, "Presets:"),
              [
                { label: '\u222B x\u00B2 [0,1]', a: 1, b: 0, c: 0, xMin: 0, xMax: 1, n: 20, tip: 'Exact answer: 1/3 \u2248 0.333' },
                { label: '\u222B x\u00B2 [0,3]', a: 1, b: 0, c: 0, xMin: 0, xMax: 3, n: 20, tip: 'Exact answer: 9' },
                { label: '\u222B (x\u00B2+2x+1) [0,2]', a: 1, b: 2, c: 1, xMin: 0, xMax: 2, n: 20, tip: 'Try increasing n to see convergence!' },
                { label: '\u222B 2x [0,5]', a: 0, b: 2, c: 0, xMin: 0, xMax: 5, n: 10, tip: 'Linear function \u2014 exact even with few rectangles' },
                { label: '\u222B -x\u00B2+4 [0,2]', a: -1, b: 0, c: 4, xMin: 0, xMax: 2, n: 25, tip: 'A downward parabola \u2014 find the area under the arch' },
              ].map(function (p) {
                return React.createElement("button", {
                  key: p.label, onClick: function () {
                    upd('a', p.a); upd('b', p.b); upd('c', p.c); upd('xMin', p.xMin); upd('xMax', p.xMax); upd('n', p.n);
                    addToast(p.tip, 'success');
                  }, className: "px-2 py-1 rounded-lg text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-all"
                }, p.label);
              })
            ),
            React.createElement("div", { className: "mt-2 bg-red-50 rounded-xl border border-red-200 p-3" },
              React.createElement("p", { className: "text-[10px] font-bold text-red-700 uppercase tracking-wider mb-2" }, "\uD83D\uDCCA Analysis"),
              (function () {
                var exact = (d.a / 3) * (Math.pow(d.xMax, 3) - Math.pow(d.xMin, 3)) + (d.b / 2) * (Math.pow(d.xMax, 2) - Math.pow(d.xMin, 2)) + d.c * (d.xMax - d.xMin);
                var err = Math.abs(area - exact);
                var errColor = err < 0.01 ? 'text-emerald-600' : err < 0.1 ? 'text-yellow-600' : 'text-red-600';
                return React.createElement("div", { className: "grid grid-cols-3 gap-2 text-center" },
                  React.createElement("div", { className: "p-1.5 bg-white rounded-lg border" },
                    React.createElement("p", { className: "text-[9px] font-bold text-red-500" }, "Riemann Sum"),
                    React.createElement("p", { className: "text-sm font-bold text-red-800" }, area.toFixed(4))
                  ),
                  React.createElement("div", { className: "p-1.5 bg-white rounded-lg border" },
                    React.createElement("p", { className: "text-[9px] font-bold text-red-500" }, "Exact (\u222B)"),
                    React.createElement("p", { className: "text-sm font-bold text-red-800" }, exact.toFixed(4))
                  ),
                  React.createElement("div", { className: "p-1.5 bg-white rounded-lg border" },
                    React.createElement("p", { className: "text-[9px] font-bold text-red-500" }, "Error"),
                    React.createElement("p", { className: "text-sm font-bold " + errColor }, err.toFixed(4))
                  )
                );
              })(),
              React.createElement("p", { className: "mt-2 text-xs text-red-500 italic" },
                d.n <= 5 ? '\uD83D\uDCA1 Very few rectangles! The approximation is rough. Try increasing n.'
                  : d.n <= 15 ? '\uD83D\uDCA1 Getting closer! More rectangles = better approximation. This is the fundamental idea of integration.'
                    : d.n <= 30 ? '\uD83D\uDCA1 Good approximation! The error shrinks as n increases (proportional to 1/n\u00B2 for midpoint).'
                      : '\uD83D\uDCA1 Excellent! At n=' + d.n + ' rectangles, the Riemann sum closely matches the exact integral. The limit as n\u2192\u221E gives the true area.'
              )
            ),
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'calc-' + Date.now(), tool: 'calculus', label: `∫[${d.xMin},${d.xMax}] n=${d.n}`, data: { ...d }, timestamp: Date.now() }]); addToast('📸 Calculus snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "📸 Snapshot")
          )
        })(),

        stemLabTab === 'explore' && stemLabTool === 'wave' && (() => {
          const d = labToolData.wave;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, wave: { ...prev.wave, [key]: val } }));

          // Canvas-based animated wave
          const canvasRef = function (canvasEl) {
            if (!canvasEl) {
              if (canvasRef._lastCanvas && canvasRef._lastCanvas._waveAnim) {
                cancelAnimationFrame(canvasRef._lastCanvas._waveAnim);
                canvasRef._lastCanvas._waveInit = false;
                canvasRef._lastCanvas = null;
              }
              return;
            }
            if (canvasEl._waveInit) return;
            canvasEl._waveInit = true;
            canvasRef._lastCanvas = canvasEl;
            var cW = canvasEl.width = canvasEl.offsetWidth * 2;
            var cH = canvasEl.height = canvasEl.offsetHeight * 2;
            var ctx = canvasEl.getContext('2d');
            var dpr = 2;
            var tick = 0;
            function draw() {
              tick++;
              ctx.clearRect(0, 0, cW, cH);
              // Background gradient
              var grad = ctx.createLinearGradient(0, 0, 0, cH);
              grad.addColorStop(0, '#0c4a6e');
              grad.addColorStop(1, '#0ea5e9');
              ctx.fillStyle = grad;
              ctx.fillRect(0, 0, cW, cH);
              // Grid
              ctx.strokeStyle = 'rgba(255,255,255,0.08)';
              ctx.lineWidth = 1;
              for (var gx = 0; gx < cW; gx += 30 * dpr) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, cH); ctx.stroke(); }
              for (var gy = 0; gy < cH; gy += 30 * dpr) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(cW, gy); ctx.stroke(); }
              // Center line
              ctx.strokeStyle = 'rgba(255,255,255,0.2)';
              ctx.setLineDash([8, 4]);
              ctx.beginPath(); ctx.moveTo(0, cH / 2); ctx.lineTo(cW, cH / 2); ctx.stroke();
              ctx.setLineDash([]);
              // Read current params from the canvas data attributes
              var amp = parseFloat(canvasEl.dataset.amp || '50');
              var freq = parseFloat(canvasEl.dataset.freq || '2');
              var waveType = canvasEl.dataset.waveType || 'sine';
              var showSecond = canvasEl.dataset.showSecond === 'true';
              var amp2 = parseFloat(canvasEl.dataset.amp2 || '30');
              var freq2 = parseFloat(canvasEl.dataset.freq2 || '3');
              var speed = parseFloat(canvasEl.dataset.speed || '1');
              // Draw main wave
              ctx.lineWidth = 3 * dpr;
              ctx.strokeStyle = '#22d3ee';
              ctx.shadowColor = '#22d3ee';
              ctx.shadowBlur = 8;
              ctx.beginPath();
              for (var x = 0; x < cW; x++) {
                var t = x / (cW) * Math.PI * 2 * freq - tick * 0.03 * speed;
                var y;
                if (waveType === 'sine') y = Math.sin(t);
                else if (waveType === 'square') y = Math.sign(Math.sin(t));
                else if (waveType === 'triangle') y = Math.asin(Math.sin(t)) * 2 / Math.PI;
                else y = (t % (Math.PI * 2)) / Math.PI - 1;
                var py = cH / 2 - y * amp * dpr;
                if (x === 0) ctx.moveTo(x, py); else ctx.lineTo(x, py);
              }
              ctx.stroke();
              ctx.shadowBlur = 0;
              // Draw second wave if enabled
              if (showSecond) {
                ctx.lineWidth = 2 * dpr;
                ctx.strokeStyle = '#f472b6';
                ctx.shadowColor = '#f472b6';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                for (var x2 = 0; x2 < cW; x2++) {
                  var t2 = x2 / (cW) * Math.PI * 2 * freq2 - tick * 0.03 * speed;
                  var y2 = Math.sin(t2);
                  var py2 = cH / 2 - y2 * amp2 * dpr;
                  if (x2 === 0) ctx.moveTo(x2, py2); else ctx.lineTo(x2, py2);
                }
                ctx.stroke();
                ctx.shadowBlur = 0;
                // Superposition
                ctx.lineWidth = 2 * dpr;
                ctx.strokeStyle = '#a78bfa';
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                for (var xs = 0; xs < cW; xs++) {
                  var ts1 = xs / (cW) * Math.PI * 2 * freq - tick * 0.03 * speed;
                  var ts2 = xs / (cW) * Math.PI * 2 * freq2 - tick * 0.03 * speed;
                  var ys1 = (waveType === 'sine' ? Math.sin(ts1) : waveType === 'square' ? Math.sign(Math.sin(ts1)) : waveType === 'triangle' ? Math.asin(Math.sin(ts1)) * 2 / Math.PI : (ts1 % (Math.PI * 2)) / Math.PI - 1) * amp;
                  var ys2 = Math.sin(ts2) * amp2;
                  var pys = cH / 2 - (ys1 + ys2) * dpr;
                  if (xs === 0) ctx.moveTo(xs, pys); else ctx.lineTo(xs, pys);
                }
                ctx.stroke();
                ctx.setLineDash([]);
              }
              // Labels
              ctx.fillStyle = 'rgba(0,0,0,0.4)';
              ctx.fillRect(4 * dpr, 4 * dpr, 115 * dpr, (showSecond ? 36 : 20) * dpr);
              ctx.font = 'bold ' + (7 * dpr) + 'px sans-serif';
              ctx.fillStyle = '#22d3ee';
              ctx.fillText('\uD83C\uDF0A Main: A=' + amp + ' f=' + freq, 8 * dpr, 16 * dpr);
              if (showSecond) {
                ctx.fillStyle = '#f472b6';
                ctx.fillText('\u223F Second: A=' + amp2 + ' f=' + freq2, 8 * dpr, 28 * dpr);
                ctx.fillStyle = '#a78bfa';
                ctx.fillText('--- Superposition', 8 * dpr, 38 * dpr);
              }
              canvasEl._waveAnim = requestAnimationFrame(draw);
            }
            canvasEl._waveAnim = requestAnimationFrame(draw);
          };

          // Quiz bank
          var WAVE_QUIZ = [
            { q: 'What happens to pitch when frequency increases?', a: 'Goes up', opts: ['Goes up', 'Goes down', 'Stays same', 'Disappears'] },
            { q: 'What does amplitude control?', a: 'Loudness / height', opts: ['Speed', 'Loudness / height', 'Color', 'Direction'] },
            { q: 'What is superposition?', a: 'Waves combining', opts: ['Waves combining', 'Waves canceling', 'Waves reflecting', 'Waves stopping'] },
            { q: 'Destructive interference occurs when...', a: 'Peaks meet troughs', opts: ['Peaks meet peaks', 'Peaks meet troughs', 'Waves stop', 'Amplitude doubles'] },
            { q: 'Sound is what type of wave?', a: 'Longitudinal', opts: ['Transverse', 'Longitudinal', 'Circular', 'Standing'] },
          ];

          return React.createElement("div", { className: "max-w-5xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83C\uDF0A Wave Simulator"),
              React.createElement("span", { className: "px-2 py-0.5 bg-cyan-100 text-cyan-700 text-[10px] font-bold rounded-full" }, "ANIMATED")
            ),
            React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-cyan-300 shadow-lg mb-3", style: { height: "400px" } },
              React.createElement("canvas", {
                ref: canvasRef,
                "data-amp": d.amplitude, "data-freq": d.frequency, "data-wave-type": d.waveType || 'sine',
                "data-show-second": d.showSecond ? 'true' : 'false',
                "data-amp2": d.amplitude2 || 30, "data-freq2": d.frequency2 || 3,
                "data-speed": d.speed || 1,
                style: { width: "100%", height: "100%", display: "block" }
              })
            ),
            React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-2" },
              ['sine', 'square', 'triangle', 'sawtooth'].map(wt =>
                React.createElement("button", {
                  key: wt, onClick: () => upd('waveType', wt),
                  className: "px-2.5 py-1 rounded-lg text-xs font-bold transition-all " + ((d.waveType || 'sine') === wt ? 'bg-cyan-600 text-white shadow-md' : 'bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100')
                }, wt.charAt(0).toUpperCase() + wt.slice(1))
              )
            ),
            React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2 mb-3" },
              [
                { k: 'amplitude', label: '\uD83D\uDCC8 Amplitude', min: 10, max: 100, step: 1 },
                { k: 'frequency', label: '\uD83C\uDFB5 Frequency', min: 0.5, max: 10, step: 0.5 },
                { k: 'speed', label: '\u23E9 Speed', min: 0.1, max: 5, step: 0.1 },
              ].map(s =>
                React.createElement("div", { key: s.k, className: "text-center bg-slate-50 rounded-lg p-2 border" },
                  React.createElement("label", { className: "text-[10px] font-bold text-slate-500 block" }, s.label),
                  React.createElement("span", { className: "text-sm font-bold text-slate-700 block" }, d[s.k] || (s.k === 'speed' ? 1 : d[s.k])),
                  React.createElement("input", { type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k] || (s.k === 'speed' ? 1 : 0), onChange: e => upd(s.k, parseFloat(e.target.value)), className: "w-full accent-cyan-600" })
                )
              )
            ),
            React.createElement("div", { className: "flex items-center gap-3 mb-3 p-2 bg-pink-50 rounded-lg border border-pink-200" },
              React.createElement("label", { className: "text-xs font-bold text-pink-700 flex items-center gap-1.5 cursor-pointer" },
                React.createElement("input", { type: "checkbox", checked: !!d.showSecond, onChange: e => upd('showSecond', e.target.checked), className: "accent-pink-600" }),
                "\u223F Show Second Wave (Interference)"
              ),
              d.showSecond && React.createElement(React.Fragment, null,
                React.createElement("div", { className: "flex items-center gap-1" },
                  React.createElement("span", { className: "text-[10px] text-pink-500 font-bold" }, "A2:"),
                  React.createElement("input", { type: "range", min: 10, max: 80, step: 1, value: d.amplitude2 || 30, onChange: e => upd('amplitude2', parseFloat(e.target.value)), className: "w-16 accent-pink-500" }),
                  React.createElement("span", { className: "text-[10px] text-pink-700 font-bold" }, d.amplitude2 || 30)
                ),
                React.createElement("div", { className: "flex items-center gap-1" },
                  React.createElement("span", { className: "text-[10px] text-pink-500 font-bold" }, "f2:"),
                  React.createElement("input", { type: "range", min: 0.5, max: 10, step: 0.5, value: d.frequency2 || 3, onChange: e => upd('frequency2', parseFloat(e.target.value)), className: "w-16 accent-pink-500" }),
                  React.createElement("span", { className: "text-[10px] text-pink-700 font-bold" }, d.frequency2 || 3)
                )
              )
            ),
            React.createElement("div", { className: "grid grid-cols-3 gap-2 mb-3 text-center" },
              React.createElement("div", { className: "p-2 bg-cyan-50 rounded-lg border border-cyan-200" },
                React.createElement("p", { className: "text-[9px] font-bold text-cyan-600 uppercase" }, "Wavelength"),
                React.createElement("p", { className: "text-sm font-bold text-cyan-800" }, (1 / d.frequency).toFixed(2) + " m")
              ),
              React.createElement("div", { className: "p-2 bg-cyan-50 rounded-lg border border-cyan-200" },
                React.createElement("p", { className: "text-[9px] font-bold text-cyan-600 uppercase" }, "Period"),
                React.createElement("p", { className: "text-sm font-bold text-cyan-800" }, (1 / d.frequency).toFixed(3) + " s")
              ),
              React.createElement("div", { className: "p-2 bg-cyan-50 rounded-lg border border-cyan-200" },
                React.createElement("p", { className: "text-[9px] font-bold text-cyan-600 uppercase" }, "Wave Type"),
                React.createElement("p", { className: "text-sm font-bold text-cyan-800" }, (d.waveType || 'sine').charAt(0).toUpperCase() + (d.waveType || 'sine').slice(1))
              )
            ),
            React.createElement("div", { className: "flex items-center gap-2 mb-2" },
              React.createElement("button", {
                onClick: function () {
                  var q = WAVE_QUIZ[Math.floor(Math.random() * WAVE_QUIZ.length)];
                  upd('quiz', { q: q.q, a: q.a, opts: q.opts, answered: false, score: (d.quiz && d.quiz.score) || 0 });
                }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.quiz ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-600 text-white') + " transition-all"
              }, d.quiz ? "\uD83D\uDD04 Next Question" : "\uD83E\uDDE0 Quiz Mode"),
              d.quiz && d.quiz.score > 0 && React.createElement("span", { className: "text-xs font-bold text-emerald-600" }, "\u2B50 " + d.quiz.score + " correct")
            ),
            d.quiz && React.createElement("div", { className: "bg-cyan-50 rounded-lg p-3 border border-cyan-200 mb-3" },
              React.createElement("p", { className: "text-sm font-bold text-cyan-800 mb-2" }, d.quiz.q),
              React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                d.quiz.opts.map(function (opt) {
                  var isCorrect = opt === d.quiz.a;
                  var wasChosen = d.quiz.chosen === opt;
                  var cls = !d.quiz.answered ? 'bg-white border-slate-200 hover:border-cyan-400' : isCorrect ? 'bg-emerald-100 border-emerald-300' : wasChosen ? 'bg-red-100 border-red-300' : 'bg-slate-50 border-slate-200 opacity-50';
                  return React.createElement("button", {
                    key: opt, disabled: d.quiz.answered, onClick: function () {
                      var correct = opt === d.quiz.a;
                      upd('quiz', Object.assign({}, d.quiz, { answered: true, chosen: opt, score: d.quiz.score + (correct ? 1 : 0) }));
                      addToast(correct ? '\u2705 Correct!' : '\u274C The answer is ' + d.quiz.a, correct ? 'success' : 'error');
                    }, className: "px-3 py-2 rounded-lg text-sm font-bold border-2 transition-all " + cls
                  }, opt);
                })
              )
            ),
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'wv-' + Date.now(), tool: 'wave', label: 'A=' + d.amplitude + ' f=' + d.frequency, data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Wave snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")
          )
        })(),

        stemLabTab === 'explore' && stemLabTool === 'cell' && (() => {
          var d = labToolData.cell;
          var upd = function (key, val) { setLabToolData(function (prev) { return Object.assign({}, prev, { cell: Object.assign({}, prev.cell, (function () { var o = {}; o[key] = val; return o; })()) }); }); };

          // ── Organism definitions ──
          var ORGANISMS = [
            { id: 'amoeba', label: 'Amoeba', icon: '\u{1F9A0}', color: '#8b5cf6', bodyColor: 'rgba(139,92,246,0.35)', desc: 'Single-celled protist that moves using pseudopods (false feet). Engulfs food by phagocytosis.', speed: 0.3, size: 28, activity: 'Phagocytosis', activityDesc: 'Engulf food particles!', xp: 5, facts: ['Amoebas reproduce by binary fission', 'Pseudopods are temporary projections of cytoplasm', 'Amoebas live in freshwater, soil, and as parasites', 'They have no fixed shape - constantly changing', 'Food vacuoles digest engulfed particles'] },
            { id: 'paramecium', label: 'Paramecium', icon: '\u{1F9A0}', color: '#06b6d4', bodyColor: 'rgba(6,182,212,0.35)', desc: 'Ciliated protist that moves rapidly using thousands of tiny hair-like cilia.', speed: 1.2, size: 22, activity: 'Ciliary Sweep', activityDesc: 'Swim through food clouds!', xp: 3, facts: ['Cilia beat in coordinated waves', 'Has an oral groove for feeding', 'Contains contractile vacuoles to expel water', 'Reproduces by binary fission and conjugation', 'Can reverse ciliary beat to escape danger'] },
            { id: 'euglena', label: 'Euglena', icon: '\u{1F33F}', color: '#22c55e', bodyColor: 'rgba(34,197,94,0.35)', desc: 'Unique protist with both plant and animal characteristics. Has chloroplasts AND can eat food.', speed: 0.7, size: 18, activity: 'Photosynthesis', activityDesc: 'Move into light zones!', xp: 4, facts: ['Has a red eyespot (stigma) to detect light', 'Contains chloroplasts for photosynthesis', 'Has a flagellum for movement', 'Can switch between autotroph and heterotroph', 'No cell wall - has a flexible pellicle'] },
            { id: 'wbc', label: 'White Blood Cell', icon: '\u{1FA78}', color: '#ef4444', bodyColor: 'rgba(239,68,68,0.3)', desc: 'Immune cell (leukocyte) that patrols the body and destroys invading pathogens.', speed: 0.5, size: 24, activity: 'Immune Defense', activityDesc: 'Chase and engulf bacteria!', xp: 6, facts: ['Part of the immune system', 'Uses chemotaxis to find pathogens', 'Can squeeze through blood vessel walls', 'Neutrophils are most common type', 'Produces antibodies to tag invaders'] },
            { id: 'bacterium', label: 'Bacterium', icon: '\u{1F9EB}', color: '#f59e0b', bodyColor: 'rgba(245,158,11,0.35)', desc: 'Prokaryotic cell - no nucleus. Has cell wall, flagella, and reproduces by binary fission.', speed: 0.9, size: 10, activity: 'Binary Fission', activityDesc: 'Grow and divide!', xp: 5, facts: ['No membrane-bound nucleus (prokaryote)', 'Cell wall made of peptidoglycan', 'Some have flagella for movement', 'Reproduce every 20 minutes in ideal conditions', 'Plasmids carry extra DNA for antibiotic resistance'] },
            { id: 'plantcell', label: 'Plant Cell', icon: '\u{1F33B}', color: '#65a30d', bodyColor: 'rgba(101,163,13,0.25)', desc: 'Eukaryotic cell with cell wall, chloroplasts, and large central vacuole.', speed: 0, size: 35, activity: 'Organelle Tour', activityDesc: 'Zoom in to explore!', xp: 2, facts: ['Rigid cell wall made of cellulose', 'Large central vacuole stores water', 'Chloroplasts convert light to energy', 'Has all organelles found in animal cells plus more', 'Connected to neighbors via plasmodesmata'] },
            { id: 'diatom', label: 'Diatom', icon: '\u{1F4A0}', color: '#0ea5e9', bodyColor: 'rgba(14,165,233,0.25)', desc: 'Unicellular algae with intricate glass-like cell walls made of silica. Responsible for ~20% of global oxygen.', speed: 0.15, size: 16, activity: 'Nutrient Collection', activityDesc: 'Drift through nutrient clouds!', xp: 3, facts: ['Cell walls are made of silica (glass)', 'Produce about 20% of Earth\'s oxygen', 'Over 100,000 species exist', 'Used in forensic science to determine drowning', 'Fossil diatoms form diatomaceous earth'] },
            { id: 'volvox', label: 'Volvox', icon: '\u{1F7E2}', color: '#10b981', bodyColor: 'rgba(16,185,129,0.2)', desc: 'Colonial green algae forming hollow spheres of 500-50,000 cells. Each cell has two flagella.', speed: 0.4, size: 32, activity: 'Colony Coordination', activityDesc: 'Spin toward the light!', xp: 4, facts: ['Colonies can contain 500 to 50,000 cells', 'Daughter colonies form inside the parent', 'Each cell has two flagella and an eyespot', 'Demonstrates division of labor in evolution', 'Rotates like a planet — name means "fierce roller"'] },
            { id: 'stentor', label: 'Stentor', icon: '\u{1F3BA}', color: '#a855f7', bodyColor: 'rgba(168,85,247,0.3)', desc: 'Trumpet-shaped ciliate, one of the largest single-celled organisms (up to 2mm). Can regenerate from fragments.', speed: 0.1, size: 30, activity: 'Filter Feeding', activityDesc: 'Anchor and sweep food!', xp: 5, facts: ['Can be up to 2mm long — visible to naked eye', 'Can regenerate from tiny fragments', 'Has a bead-like macronucleus', 'Creates vortex currents to capture food', 'Can change color: blue, green, or pink'] },
            { id: 'tardigrade', label: 'Tardigrade', icon: '\u{1F43B}', color: '#d946ef', bodyColor: 'rgba(217,70,239,0.25)', desc: 'Microscopic "water bear" with 8 legs. Nearly indestructible — survives space, radiation, extreme temps.', speed: 0.2, size: 20, activity: 'Cryptobiosis', activityDesc: 'Survive extreme zones!', xp: 7, facts: ['Can survive temperatures from -272°C to 150°C', 'Survived exposure to outer space', 'Enter cryptobiosis — suspend all metabolism', 'Have 8 legs with tiny claws', 'Can live without water for over 10 years'] },
            { id: 'spirillum', label: 'Spirillum', icon: '\u{1F300}', color: '#f97316', bodyColor: 'rgba(249,115,22,0.3)', desc: 'Spiral-shaped bacterium that moves with a distinctive corkscrew motion using bipolar flagella.', speed: 1.0, size: 12, activity: 'Helical Propulsion', activityDesc: 'Corkscrew through the medium!', xp: 4, facts: ['Rigid spiral shape (not flexible like spirochetes)', 'Uses bipolar tufts of flagella', 'Found in stagnant freshwater', 'Moves in a corkscrew pattern', 'One of the largest bacteria — up to 60μm'] }
          ];

          // ── Quiz questions (observation-based) ──
          var QUIZ_BANK = [
            { q: 'Which organism moves toward light?', a: 'euglena', hint: 'Look for the one with an eyespot (green, teardrop shape).' },
            { q: 'What is the amoeba doing to food particles?', a: 'phagocytosis', options: ['phagocytosis', 'photosynthesis', 'osmosis', 'mitosis'], hint: 'Watch how it wraps around food.' },
            { q: 'Which organism has cilia for movement?', a: 'paramecium', hint: 'Look for the oval one that moves fastest.' },
            { q: 'What type of cell has no nucleus?', a: 'bacterium', hint: 'The smallest organisms in the dish.' },
            { q: 'Which cell has a rigid cell wall AND chloroplasts?', a: 'plantcell', hint: 'It does not move \u2014 rectangular shape.' },
            { q: 'What cell defends against pathogens?', a: 'wbc', hint: 'The red-tinted one that chases bacteria.' },
            { q: 'How does a bacterium reproduce?', a: 'binary fission', options: ['binary fission', 'mitosis', 'meiosis', 'budding'], hint: 'Watch the small ones split in two.' },
            { q: 'What structure does Euglena use to detect light?', a: 'eyespot', options: ['eyespot', 'antenna', 'lens', 'cornea'], hint: 'Also called a stigma \u2014 a red dot.' },
            { q: 'What is the powerhouse organelle in eukaryotic cells?', a: 'mitochondria', options: ['mitochondria', 'ribosome', 'golgi', 'lysosome'], hint: 'Produces ATP.' },
            { q: 'Which organism can act as BOTH plant and animal?', a: 'euglena', hint: 'Has chloroplasts but can also consume food.' },
            { q: 'What does phagocytosis mean?', a: 'cell eating', options: ['cell eating', 'cell drinking', 'cell dividing', 'cell dying'], hint: 'Phago = eat, cyto = cell.' },
            { q: 'Which structure controls what enters and exits a cell?', a: 'cell membrane', options: ['cell membrane', 'cell wall', 'nucleus', 'ribosome'], hint: 'Phospholipid bilayer.' },
            { q: 'Which organism has a cell wall made of glass (silica)?', a: 'diatom', hint: 'Look for the geometric, crystalline-looking one.' },
            { q: 'What organism forms hollow spheres of thousands of cells?', a: 'volvox', hint: 'A rotating green colony — its name means "fierce roller."' },
            { q: 'Which organism can regenerate from tiny fragments?', a: 'stentor', hint: 'The trumpet-shaped one — one of the largest single cells.' },
            { q: 'What organism can survive in outer space?', a: 'tardigrade', options: ['tardigrade', 'amoeba', 'bacterium', 'paramecium'], hint: 'Also called a water bear — nearly indestructible!' },
            { q: 'Which bacterium moves with a corkscrew spiral motion?', a: 'spirillum', hint: 'Look for the spiral orange one spinning through the medium.' }
          ];

          // ── Canvas ref callback for simulation ──
          var canvasRefCb = function (canvasEl) {
            if (!canvasEl || canvasEl._cellSimInit) return;
            canvasEl._cellSimInit = true;
            var W = canvasEl.width = canvasEl.offsetWidth * (window.devicePixelRatio || 1);
            var H = canvasEl.height = canvasEl.offsetHeight * (window.devicePixelRatio || 1);
            var ctx = canvasEl.getContext('2d');
            var dpr = window.devicePixelRatio || 1;

            // World state
            var world = { organisms: [], food: [], lightZones: [], tick: 0 };
            var cam = { x: 0, y: 0, zoom: 1 };
            var WORLD_W = 800, WORLD_H = 600;
            var dragging = false, dragStartX = 0, dragStartY = 0, camStartX = 0, camStartY = 0;
            var playerKeys = {};
            var selectedOrg = null;
            var playAsOrg = null;

            // Populate organisms
            function spawnWorld() {
              world.organisms = [];
              world.food = [];
              world.lightZones = [];
              // Spawn 2-3 of each type
              ORGANISMS.forEach(function (def) {
                var count = def.id === 'plantcell' ? 2 : 3;
                for (var i = 0; i < count; i++) {
                  world.organisms.push({
                    type: def.id, x: 60 + Math.random() * (WORLD_W - 120), y: 60 + Math.random() * (WORLD_H - 120),
                    vx: (Math.random() - 0.5) * def.speed, vy: (Math.random() - 0.5) * def.speed,
                    size: def.size * (0.85 + Math.random() * 0.3), angle: Math.random() * Math.PI * 2,
                    phase: Math.random() * Math.PI * 2, energy: 50 + Math.random() * 50, def: def
                  });
                }
              });
              // Food particles
              for (var i = 0; i < 40; i++) {
                world.food.push({ x: Math.random() * WORLD_W, y: Math.random() * WORLD_H, size: 2 + Math.random() * 3, eaten: false });
              }
              // Light zones (for euglena)
              world.lightZones.push({ x: WORLD_W * 0.25, y: WORLD_H * 0.3, r: 80 });
              world.lightZones.push({ x: WORLD_W * 0.7, y: WORLD_H * 0.65, r: 100 });
            }
            spawnWorld();

            // Drawing helpers
            function toScreen(wx, wy) {
              return { x: (wx - cam.x) * cam.zoom * dpr + W / 2, y: (wy - cam.y) * cam.zoom * dpr + H / 2 };
            }

            function drawOrganism(o) {
              var p = toScreen(o.x, o.y);
              var sz = o.size * cam.zoom * dpr;
              var def = o.def;
              ctx.save();
              ctx.translate(p.x, p.y);
              ctx.rotate(o.angle);
              var glow = (selectedOrg === o || playAsOrg === o);
              if (glow) { ctx.shadowColor = def.color; ctx.shadowBlur = 12 * dpr; }

              if (def.id === 'amoeba') {
                // Blobby shape with perlin-like wobble
                ctx.beginPath();
                for (var a = 0; a < Math.PI * 2; a += 0.15) {
                  var wobble = sz * (1 + 0.2 * Math.sin(a * 3 + o.phase + world.tick * 0.03) + 0.1 * Math.sin(a * 5 + world.tick * 0.05));
                  var px = Math.cos(a) * wobble, py = Math.sin(a) * wobble;
                  a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fillStyle = def.bodyColor; ctx.fill();
                ctx.strokeStyle = def.color; ctx.lineWidth = 1.5 * dpr; ctx.stroke();
                // Nucleus
                ctx.beginPath(); ctx.arc(0, 0, sz * 0.3, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(139,92,246,0.5)'; ctx.fill();
              } else if (def.id === 'paramecium') {
                // Oval with cilia
                ctx.beginPath(); ctx.ellipse(0, 0, sz * 1.4, sz * 0.7, 0, 0, Math.PI * 2);
                ctx.fillStyle = def.bodyColor; ctx.fill();
                ctx.strokeStyle = def.color; ctx.lineWidth = 1.5 * dpr; ctx.stroke();
                // Cilia
                for (var ci = 0; ci < 16; ci++) {
                  var ca = (ci / 16) * Math.PI * 2;
                  var cx2 = Math.cos(ca) * sz * 1.5, cy2 = Math.sin(ca) * sz * 0.8;
                  var wave = Math.sin(world.tick * 0.15 + ci) * 3 * dpr;
                  ctx.beginPath(); ctx.moveTo(cx2, cy2);
                  ctx.lineTo(cx2 + wave, cy2 + Math.sign(cy2) * 4 * dpr);
                  ctx.strokeStyle = 'rgba(6,182,212,0.5)'; ctx.lineWidth = 0.8 * dpr; ctx.stroke();
                }
                // Oral groove
                ctx.beginPath(); ctx.ellipse(sz * 0.4, 0, sz * 0.3, sz * 0.15, 0.3, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(6,182,212,0.7)'; ctx.lineWidth = 1 * dpr; ctx.stroke();
              } else if (def.id === 'euglena') {
                // Teardrop
                ctx.beginPath();
                ctx.moveTo(sz * 1.5, 0);
                ctx.quadraticCurveTo(sz * 0.5, -sz * 0.6, -sz, -sz * 0.3);
                ctx.quadraticCurveTo(-sz * 1.3, 0, -sz, sz * 0.3);
                ctx.quadraticCurveTo(sz * 0.5, sz * 0.6, sz * 1.5, 0);
                ctx.closePath();
                ctx.fillStyle = def.bodyColor; ctx.fill();
                ctx.strokeStyle = def.color; ctx.lineWidth = 1.5 * dpr; ctx.stroke();
                // Eyespot
                ctx.beginPath(); ctx.arc(sz * 0.8, -sz * 0.15, sz * 0.15, 0, Math.PI * 2);
                ctx.fillStyle = '#ef4444'; ctx.fill();
                // Flagellum
                ctx.beginPath(); ctx.moveTo(sz * 1.5, 0);
                var fl = Math.sin(world.tick * 0.2 + o.phase) * 8 * dpr;
                ctx.quadraticCurveTo(sz * 2 + fl, -4 * dpr, sz * 2.5, fl);
                ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1 * dpr; ctx.stroke();
              } else if (def.id === 'wbc') {
                // Irregular shape
                ctx.beginPath();
                for (var a = 0; a < Math.PI * 2; a += 0.2) {
                  var wobble = sz * (1 + 0.15 * Math.sin(a * 4 + world.tick * 0.04));
                  var px = Math.cos(a) * wobble, py = Math.sin(a) * wobble;
                  a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fillStyle = def.bodyColor; ctx.fill();
                ctx.strokeStyle = def.color; ctx.lineWidth = 1.5 * dpr; ctx.stroke();
                // Lobular nucleus
                ctx.beginPath(); ctx.ellipse(-sz * 0.2, -sz * 0.1, sz * 0.35, sz * 0.2, 0.5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(239,68,68,0.4)'; ctx.fill();
                ctx.beginPath(); ctx.ellipse(sz * 0.15, sz * 0.1, sz * 0.25, sz * 0.2, -0.3, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(239,68,68,0.4)'; ctx.fill();
              } else if (def.id === 'bacterium') {
                // Rod shape
                var rw = sz * 1.8, rh = sz * 0.8;
                ctx.beginPath();
                ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2);
                ctx.fillStyle = def.bodyColor; ctx.fill();
                ctx.strokeStyle = def.color; ctx.lineWidth = 1.2 * dpr; ctx.stroke();
                // Flagella
                ctx.beginPath(); ctx.moveTo(-rw, 0);
                var fl2 = Math.sin(world.tick * 0.25 + o.phase) * 5 * dpr;
                ctx.bezierCurveTo(-rw - 8 * dpr, fl2, -rw - 14 * dpr, -fl2, -rw - 20 * dpr, fl2);
                ctx.strokeStyle = 'rgba(245,158,11,0.6)'; ctx.lineWidth = 0.8 * dpr; ctx.stroke();
              } else if (def.id === 'plantcell') {
                // Rectangular
                var hw = sz * 1.6, hh = sz * 1.2;
                ctx.strokeStyle = '#65a30d'; ctx.lineWidth = 3 * dpr;
                ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
                ctx.fillStyle = 'rgba(209,250,229,0.4)'; ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
                // Central vacuole
                ctx.beginPath(); ctx.ellipse(0, 0, hw * 0.6, hh * 0.5, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(167,139,250,0.25)'; ctx.fill();
                ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 1 * dpr; ctx.stroke();
                // Chloroplasts
                [-0.5, 0.3, -0.2].forEach(function (off, i) {
                  ctx.beginPath(); ctx.ellipse(hw * off, hh * (i * 0.4 - 0.4), sz * 0.25, sz * 0.15, 0.3 * i, 0, Math.PI * 2);
                  ctx.fillStyle = 'rgba(34,197,94,0.5)'; ctx.fill();
                });
                // Nucleus
                ctx.beginPath(); ctx.arc(hw * 0.3, -hh * 0.3, sz * 0.22, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(124,58,237,0.4)'; ctx.fill();
              } else if (def.id === 'diatom') {
                // Hexagonal silica shell
                ctx.beginPath();
                for (var hi = 0; hi < 6; hi++) {
                  var ha = (hi / 6) * Math.PI * 2 - Math.PI / 6;
                  var hx = Math.cos(ha) * sz * 1.2, hy = Math.sin(ha) * sz * 1.2;
                  hi === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
                }
                ctx.closePath();
                ctx.fillStyle = def.bodyColor; ctx.fill();
                ctx.strokeStyle = def.color; ctx.lineWidth = 2 * dpr; ctx.stroke();
                // Internal radial pattern (raphe)
                for (var ri2 = 0; ri2 < 6; ri2++) {
                  var ra = (ri2 / 6) * Math.PI * 2;
                  ctx.beginPath(); ctx.moveTo(0, 0);
                  ctx.lineTo(Math.cos(ra) * sz * 0.8, Math.sin(ra) * sz * 0.8);
                  ctx.strokeStyle = 'rgba(14,165,233,0.3)'; ctx.lineWidth = 0.8 * dpr; ctx.stroke();
                }
                // Central node
                ctx.beginPath(); ctx.arc(0, 0, sz * 0.2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(14,165,233,0.5)'; ctx.fill();
              } else if (def.id === 'volvox') {
                // Hollow sphere colony
                ctx.beginPath(); ctx.arc(0, 0, sz, 0, Math.PI * 2);
                ctx.fillStyle = def.bodyColor; ctx.fill();
                ctx.strokeStyle = def.color; ctx.lineWidth = 2 * dpr; ctx.stroke();
                // Surface cells (rotating dots)
                for (var vi = 0; vi < 12; vi++) {
                  var va = (vi / 12) * Math.PI * 2 + world.tick * 0.02;
                  var vcx = Math.cos(va) * sz * 0.85, vcy = Math.sin(va) * sz * 0.85;
                  ctx.beginPath(); ctx.arc(vcx, vcy, sz * 0.08, 0, Math.PI * 2);
                  ctx.fillStyle = '#22c55e'; ctx.fill();
                }
                // Daughter colony inside
                ctx.beginPath(); ctx.arc(sz * 0.2, -sz * 0.15, sz * 0.25, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(16,185,129,0.35)'; ctx.fill();
                ctx.strokeStyle = 'rgba(16,185,129,0.5)'; ctx.lineWidth = 1 * dpr; ctx.stroke();
              } else if (def.id === 'stentor') {
                // Trumpet / cone shape
                ctx.beginPath();
                ctx.moveTo(-sz * 0.3, sz * 1.2);
                ctx.quadraticCurveTo(-sz * 0.1, 0, -sz * 1.0, -sz * 0.8);
                ctx.lineTo(sz * 1.0, -sz * 0.8);
                ctx.quadraticCurveTo(sz * 0.1, 0, sz * 0.3, sz * 1.2);
                ctx.closePath();
                ctx.fillStyle = def.bodyColor; ctx.fill();
                ctx.strokeStyle = def.color; ctx.lineWidth = 1.5 * dpr; ctx.stroke();
                // Cilia crown at wide end
                for (var sci = 0; sci < 8; sci++) {
                  var scx = -sz * 0.9 + (sci / 7) * sz * 1.8;
                  var scWave = Math.sin(world.tick * 0.15 + sci * 0.8) * 4 * dpr;
                  ctx.beginPath(); ctx.moveTo(scx, -sz * 0.8);
                  ctx.lineTo(scx + scWave, -sz * 1.1);
                  ctx.strokeStyle = 'rgba(168,85,247,0.5)'; ctx.lineWidth = 0.8 * dpr; ctx.stroke();
                }
                // Bead-like macronucleus
                for (var ni = 0; ni < 3; ni++) {
                  ctx.beginPath(); ctx.arc(0, sz * (0.3 - ni * 0.35), sz * 0.12, 0, Math.PI * 2);
                  ctx.fillStyle = 'rgba(168,85,247,0.5)'; ctx.fill();
                }
              } else if (def.id === 'tardigrade') {
                // Plump body
                ctx.beginPath(); ctx.ellipse(0, 0, sz * 1.3, sz * 0.9, 0, 0, Math.PI * 2);
                ctx.fillStyle = def.bodyColor; ctx.fill();
                ctx.strokeStyle = def.color; ctx.lineWidth = 1.5 * dpr; ctx.stroke();
                // Head bump
                ctx.beginPath(); ctx.arc(sz * 1.1, 0, sz * 0.4, 0, Math.PI * 2);
                ctx.fillStyle = def.bodyColor; ctx.fill();
                ctx.strokeStyle = def.color; ctx.lineWidth = 1.2 * dpr; ctx.stroke();
                // 8 legs (4 per side) with tiny claws
                [[-0.8, 0.7], [-0.2, 0.8], [0.3, 0.75], [0.8, 0.6]].forEach(function (leg, li) {
                  var phase2 = Math.sin(world.tick * 0.08 + li * 1.5) * 3 * dpr;
                  // Top leg
                  ctx.beginPath(); ctx.moveTo(sz * leg[0], -sz * leg[1]);
                  ctx.lineTo(sz * leg[0] + phase2, -sz * (leg[1] + 0.35));
                  ctx.strokeStyle = def.color; ctx.lineWidth = 1.2 * dpr; ctx.stroke();
                  // Bottom leg
                  ctx.beginPath(); ctx.moveTo(sz * leg[0], sz * leg[1]);
                  ctx.lineTo(sz * leg[0] - phase2, sz * (leg[1] + 0.35));
                  ctx.strokeStyle = def.color; ctx.lineWidth = 1.2 * dpr; ctx.stroke();
                });
                // Eyes
                ctx.beginPath(); ctx.arc(sz * 1.2, -sz * 0.12, sz * 0.08, 0, Math.PI * 2);
                ctx.fillStyle = '#000'; ctx.fill();
                ctx.beginPath(); ctx.arc(sz * 1.2, sz * 0.12, sz * 0.08, 0, Math.PI * 2);
                ctx.fillStyle = '#000'; ctx.fill();
              } else if (def.id === 'spirillum') {
                // Corkscrew spiral
                ctx.beginPath();
                for (var sp = -sz * 2; sp < sz * 2; sp += 1) {
                  var spx = sp;
                  var spy = Math.sin((sp / (sz * 0.5)) * Math.PI + world.tick * 0.15) * sz * 0.5;
                  sp === -sz * 2 ? ctx.moveTo(spx, spy) : ctx.lineTo(spx, spy);
                }
                ctx.strokeStyle = def.color; ctx.lineWidth = sz * 0.4 * dpr / 5; ctx.lineCap = 'round'; ctx.stroke();
                // Body fill along the spiral
                ctx.beginPath();
                for (var sp = -sz * 2; sp < sz * 2; sp += 1) {
                  var spx = sp;
                  var spy = Math.sin((sp / (sz * 0.5)) * Math.PI + world.tick * 0.15) * sz * 0.5;
                  sp === -sz * 2 ? ctx.moveTo(spx, spy - sz * 0.15) : ctx.lineTo(spx, spy - sz * 0.15);
                }
                for (var sp = sz * 2; sp > -sz * 2; sp -= 1) {
                  var spx = sp;
                  var spy = Math.sin((sp / (sz * 0.5)) * Math.PI + world.tick * 0.15) * sz * 0.5;
                  ctx.lineTo(spx, spy + sz * 0.15);
                }
                ctx.closePath();
                ctx.fillStyle = def.bodyColor; ctx.fill();
                // Flagella tufts at both ends
                var ftip1 = Math.sin(world.tick * 0.3) * 4 * dpr;
                ctx.beginPath(); ctx.moveTo(-sz * 2, 0);
                ctx.bezierCurveTo(-sz * 2.5, ftip1, -sz * 3, -ftip1, -sz * 3.2, ftip1);
                ctx.strokeStyle = 'rgba(249,115,22,0.5)'; ctx.lineWidth = 0.7 * dpr; ctx.stroke();
                var ftip2 = Math.sin(world.tick * 0.3 + Math.PI) * 4 * dpr;
                ctx.beginPath(); ctx.moveTo(sz * 2, 0);
                ctx.bezierCurveTo(sz * 2.5, ftip2, sz * 3, -ftip2, sz * 3.2, ftip2);
                ctx.strokeStyle = 'rgba(249,115,22,0.5)'; ctx.lineWidth = 0.7 * dpr; ctx.stroke();
              }
              ctx.restore();
            }

            function updateOrganism(o) {
              var def = o.def;
              if (playAsOrg === o) {
                // Player-controlled
                var spd = def.speed * 1.5;
                if (spd < 0.3) spd = 0.3; // minimum speed for playable organisms
                o.vx = ((playerKeys['ArrowRight'] || playerKeys['d'] ? 1 : 0) - (playerKeys['ArrowLeft'] || playerKeys['a'] ? 1 : 0)) * spd;
                o.vy = ((playerKeys['ArrowDown'] || playerKeys['s'] ? 1 : 0) - (playerKeys['ArrowUp'] || playerKeys['w'] ? 1 : 0)) * spd;
                if (o.vx || o.vy) o.angle = Math.atan2(o.vy, o.vx);
                // Camera follow with smooth lerp
                cam.x += (o.x - cam.x) * 0.08;
                cam.y += (o.y - cam.y) * 0.08;
              } else if (def.speed > 0) {
                // AI behavior
                o.phase += 0.02;
                if (def.id === 'euglena') {
                  // Phototaxis - move toward nearest light zone
                  var nearestLight = null, bestDist = Infinity;
                  world.lightZones.forEach(function (lz) {
                    var dd = Math.hypot(lz.x - o.x, lz.y - o.y);
                    if (dd < bestDist) { bestDist = dd; nearestLight = lz; }
                  });
                  if (nearestLight && bestDist > nearestLight.r * 0.5) {
                    var ax = (nearestLight.x - o.x) / bestDist * 0.02;
                    var ay = (nearestLight.y - o.y) / bestDist * 0.02;
                    o.vx += ax; o.vy += ay;
                  }
                } else if (def.id === 'wbc') {
                  // Chase nearest bacterium
                  var nearest = null, bd2 = Infinity;
                  world.organisms.forEach(function (t) {
                    if (t.def.id === 'bacterium') {
                      var dd = Math.hypot(t.x - o.x, t.y - o.y);
                      if (dd < bd2) { bd2 = dd; nearest = t; }
                    }
                  });
                  if (nearest && bd2 < 200) {
                    o.vx += (nearest.x - o.x) / bd2 * 0.03;
                    o.vy += (nearest.y - o.y) / bd2 * 0.03;
                  }
                } else if (def.id === 'volvox') {
                  // Phototaxis like euglena but slower rotation
                  var nearestLight2 = null, bestD3 = Infinity;
                  world.lightZones.forEach(function (lz) {
                    var dd3 = Math.hypot(lz.x - o.x, lz.y - o.y);
                    if (dd3 < bestD3) { bestD3 = dd3; nearestLight2 = lz; }
                  });
                  if (nearestLight2 && bestD3 > nearestLight2.r * 0.3) {
                    o.vx += (nearestLight2.x - o.x) / bestD3 * 0.01;
                    o.vy += (nearestLight2.y - o.y) / bestD3 * 0.01;
                  }
                  o.angle += 0.02; // constant rotation
                } else if (def.id === 'stentor') {
                  // Mostly stationary, gentle sway
                  o.vx *= 0.9; o.vy *= 0.9;
                  o.vx += (Math.random() - 0.5) * 0.01;
                  o.vy += (Math.random() - 0.5) * 0.01;
                } else if (def.id === 'spirillum') {
                  // Corkscrew movement — spiraling path
                  o.vx += (Math.random() - 0.5) * 0.08;
                  o.vy += (Math.random() - 0.5) * 0.08;
                  o.angle += 0.05; // spin
                } else if (def.id === 'diatom') {
                  // Gentle drift — simulate water currents
                  o.vx += Math.sin(world.tick * 0.005 + o.phase) * 0.005;
                  o.vy += Math.cos(world.tick * 0.007 + o.phase) * 0.005;
                } else if (def.id === 'tardigrade') {
                  // Slow purposeful walk
                  o.vx += (Math.random() - 0.5) * 0.03;
                  o.vy += (Math.random() - 0.5) * 0.03;
                } else {
                  // Random walk with gentle turns
                  o.vx += (Math.random() - 0.5) * 0.05;
                  o.vy += (Math.random() - 0.5) * 0.05;
                }
                // Speed limit
                var spd2 = Math.hypot(o.vx, o.vy);
                if (spd2 > def.speed) { o.vx = (o.vx / spd2) * def.speed; o.vy = (o.vy / spd2) * def.speed; }
                if (o.vx || o.vy) o.angle = Math.atan2(o.vy, o.vx);
              }
              o.x += o.vx; o.y += o.vy;
              // Bounce off walls
              if (o.x < o.size) { o.x = o.size; o.vx = Math.abs(o.vx); }
              if (o.x > WORLD_W - o.size) { o.x = WORLD_W - o.size; o.vx = -Math.abs(o.vx); }
              if (o.y < o.size) { o.y = o.size; o.vy = Math.abs(o.vy); }
              if (o.y > WORLD_H - o.size) { o.y = WORLD_H - o.size; o.vy = -Math.abs(o.vy); }

              // Player food collection (phagocytosis / ciliary sweep)
              if (playAsOrg === o && (def.id === 'amoeba' || def.id === 'paramecium' || def.id === 'wbc' || def.id === 'stentor' || def.id === 'tardigrade')) {
                world.food.forEach(function (f) {
                  if (!f.eaten && Math.hypot(f.x - o.x, f.y - o.y) < o.size + f.size) {
                    f.eaten = true;
                    o.energy = Math.min(100, o.energy + 10);
                    // Dispatch XP event
                    if (canvasEl._onXP) canvasEl._onXP(def.xp, def.activity);
                  }
                });
              }
              // Euglena in light zone = photosynthesis
              if (playAsOrg === o && def.id === 'euglena') {
                world.lightZones.forEach(function (lz) {
                  if (Math.hypot(lz.x - o.x, lz.y - o.y) < lz.r) {
                    if (world.tick % 60 === 0) {
                      o.energy = Math.min(100, o.energy + 5);
                      if (canvasEl._onXP) canvasEl._onXP(def.xp, 'Photosynthesis');
                    }
                  }
                });
              }
            }

            function render() {
              ctx.clearRect(0, 0, W, H);
              // Background - petri dish
              ctx.fillStyle = '#f0fdf4'; ctx.fillRect(0, 0, W, H);
              // Dish circle
              var center = toScreen(WORLD_W / 2, WORLD_H / 2);
              var dishR = Math.max(WORLD_W, WORLD_H) * 0.55 * cam.zoom * dpr;
              ctx.beginPath(); ctx.arc(center.x, center.y, dishR, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(209,250,229,0.15)'; ctx.fill();
              ctx.strokeStyle = 'rgba(16,185,129,0.3)'; ctx.lineWidth = 2 * dpr; ctx.stroke();

              // Grid lines (microscope crosshair)
              ctx.strokeStyle = 'rgba(148,163,184,0.15)'; ctx.lineWidth = 0.5 * dpr;
              for (var gx = 0; gx < WORLD_W; gx += 50) {
                var p1 = toScreen(gx, 0), p2 = toScreen(gx, WORLD_H);
                ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
              }
              for (var gy = 0; gy < WORLD_H; gy += 50) {
                var p1 = toScreen(0, gy), p2 = toScreen(WORLD_W, gy);
                ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
              }

              // Light zones
              world.lightZones.forEach(function (lz) {
                var p = toScreen(lz.x, lz.y);
                var r = lz.r * cam.zoom * dpr;
                var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
                grad.addColorStop(0, 'rgba(250,240,137,0.35)');
                grad.addColorStop(1, 'rgba(250,240,137,0)');
                ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fillStyle = grad; ctx.fill();
                ctx.strokeStyle = 'rgba(234,179,8,0.2)'; ctx.lineWidth = 1 * dpr; ctx.stroke();
              });

              // Food particles
              world.food.forEach(function (f) {
                if (f.eaten) return;
                var p = toScreen(f.x, f.y);
                var sz = f.size * cam.zoom * dpr;
                ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(34,197,94,0.6)'; ctx.fill();
              });

              // Organisms
              world.organisms.forEach(function (o) { drawOrganism(o); });

              // Magnification label
              ctx.font = (10 * dpr) + 'px monospace';
              ctx.fillStyle = 'rgba(100,116,139,0.7)';
              var mag = Math.round(40 * cam.zoom);
              ctx.fillText(mag + 'x', 8 * dpr, H - 8 * dpr);

              // Player energy bar
              if (playAsOrg) {
                var bx = 8 * dpr, by = 8 * dpr, bw = 80 * dpr, bh = 8 * dpr;
                ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(bx, by, bw, bh);
                ctx.fillStyle = playAsOrg.energy > 30 ? '#22c55e' : '#ef4444';
                ctx.fillRect(bx, by, bw * (playAsOrg.energy / 100), bh);
                ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh);
                ctx.fillStyle = '#fff'; ctx.font = (7 * dpr) + 'px sans-serif';
                ctx.fillText('Energy: ' + Math.round(playAsOrg.energy), bx + 2 * dpr, by + 6.5 * dpr);
              }
            }

            var animId = null;
            var speedMultiplier = 1;
            function loop() {
              if (canvasEl._cellSimPaused) { animId = requestAnimationFrame(loop); return; }
              for (var si = 0; si < speedMultiplier; si++) {
                world.tick++;
                world.organisms.forEach(updateOrganism);
                // Respawn eaten food
                if (world.tick % 120 === 0) {
                  world.food.forEach(function (f) {
                    if (f.eaten) { f.eaten = false; f.x = Math.random() * WORLD_W; f.y = Math.random() * WORLD_H; }
                  });
                }
              }
              render();
              animId = requestAnimationFrame(loop);
            }
            animId = requestAnimationFrame(loop);

            // Mouse/touch events
            canvasEl.addEventListener('mousedown', function (e) {
              if (playAsOrg) return; // disable drag when player is controlling
              dragging = true;
              dragStartX = e.clientX; dragStartY = e.clientY;
              camStartX = cam.x; camStartY = cam.y;
            });
            canvasEl.addEventListener('mousemove', function (e) {
              if (!dragging) return;
              var dx = (e.clientX - dragStartX) / cam.zoom;
              var dy = (e.clientY - dragStartY) / cam.zoom;
              cam.x = camStartX - dx; cam.y = camStartY - dy;
            });
            canvasEl.addEventListener('mouseup', function (e) {
              if (Math.abs(e.clientX - dragStartX) < 5 && Math.abs(e.clientY - dragStartY) < 5) {
                // Click - select organism
                var rect = canvasEl.getBoundingClientRect();
                var mx = (e.clientX - rect.left) * dpr;
                var my = (e.clientY - rect.top) * dpr;
                var clicked = null, bestDist = Infinity;
                world.organisms.forEach(function (o) {
                  var p = toScreen(o.x, o.y);
                  var dd = Math.hypot(p.x - mx, p.y - my);
                  if (dd < o.size * cam.zoom * dpr * 1.5 && dd < bestDist) { bestDist = dd; clicked = o; }
                });
                selectedOrg = clicked;
                if (canvasEl._onSelect) canvasEl._onSelect(clicked ? clicked.def.id : null);
              }
              dragging = false;
            });
            canvasEl.addEventListener('wheel', function (e) {
              e.preventDefault();
              cam.zoom = Math.max(0.5, Math.min(10, cam.zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
              if (canvasEl._onZoom) canvasEl._onZoom(cam.zoom);
            }, { passive: false });

            // Keyboard for player
            function onKey(e) { playerKeys[e.key] = e.type === 'keydown'; }
            window.addEventListener('keydown', onKey);
            window.addEventListener('keyup', onKey);

            // External API
            canvasEl._cellSimSetPlayAs = function (orgId) {
              playAsOrg = orgId ? world.organisms.find(function (o) { return o.def.id === orgId; }) : null;
              if (playAsOrg) { cam.x = playAsOrg.x; cam.y = playAsOrg.y; cam.zoom = 3; }
              canvasEl.focus(); // ensure keyboard works
            };
            canvasEl._cellSimSetZoom = function (z) { cam.zoom = z; };
            canvasEl._cellSimSetPaused = function (p) { canvasEl._cellSimPaused = p; };
            canvasEl._cellSimSetSpeed = function (s) { speedMultiplier = Math.max(1, Math.min(5, Math.round(s))); };
            canvasEl._cellSimFocusOrganism = function (orgId) {
              var target = world.organisms.find(function (o) { return o.def.id === orgId; });
              if (target) { cam.x = target.x; cam.y = target.y; cam.zoom = 3; selectedOrg = target; }
            };

            // Cleanup
            canvasEl._cellSimCleanup = function () {
              if (animId) cancelAnimationFrame(animId);
              window.removeEventListener('keydown', onKey);
              window.removeEventListener('keyup', onKey);
            };

            // ResizeObserver
            var ro = new ResizeObserver(function () {
              W = canvasEl.width = canvasEl.offsetWidth * dpr;
              H = canvasEl.height = canvasEl.offsetHeight * dpr;
            });
            ro.observe(canvasEl);
            canvasEl._cellSimRO = ro;
          };

          // ── Cleanup on unmount ──
          var cleanupRef = function (el) {
            if (!el) {
              // Unmount
              var old = document.querySelector('[data-cell-sim-canvas]');
              if (old && old._cellSimCleanup) { old._cellSimCleanup(); if (old._cellSimRO) old._cellSimRO.disconnect(); }
            }
          };

          var selDef = d.selectedOrganism ? ORGANISMS.find(function (o) { return o.id === d.selectedOrganism; }) : null;

          // ── Quiz logic ──
          var quizQuestion = d.quizMode && QUIZ_BANK[d.quizIdx || 0] ? QUIZ_BANK[d.quizIdx || 0] : null;

          return React.createElement("div", { ref: cleanupRef, className: "max-w-4xl mx-auto animate-in fade-in duration-200" },
            // Header
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: function () { setStemLabTool(null); }, className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83D\uDD2C Cell Simulator"),
              React.createElement("span", { className: "text-xs text-slate-400 ml-1" }, d.mode === 'play' ? "\uD83C\uDFAE Playing as " + (ORGANISMS.find(function (o) { return o.id === d.playAsOrganism; }) || {}).label : d.quizMode ? "\uD83E\uDDE0 Quiz Mode" : "\uD83D\uDC41 Observe"),
              React.createElement("div", { className: "flex gap-1 ml-auto" },
                ["observe", "play", "quiz"].map(function (m) {
                  return React.createElement("button", { key: m, onClick: function () { upd("mode", m); if (m === 'quiz') { upd("quizMode", true); upd("quizIdx", 0); upd("quizScore", 0); upd("quizStreak", 0); upd("quizFeedback", null); } else { upd("quizMode", false); } if (m !== 'play') { upd("playAsOrganism", null); var cv = document.querySelector('[data-cell-sim-canvas]'); if (cv && cv._cellSimSetPlayAs) cv._cellSimSetPlayAs(null); } }, className: "px-3 py-1 rounded-lg text-xs font-bold capitalize " + (d.mode === m ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200') }, m);
                })
              )
            ),

            // Canvas
            React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-green-200 bg-green-50", style: { height: '520px' } },
              React.createElement("canvas", {
                "data-cell-sim-canvas": "true",
                tabIndex: 0,
                ref: canvasRefCb,
                style: { width: '100%', height: '100%', cursor: d.playAsOrganism ? 'crosshair' : 'grab', outline: 'none' }
              }),
              // Zoom overlay
              React.createElement("div", { className: "absolute bottom-2 left-2 flex items-center gap-2 bg-white/80 backdrop-blur rounded-lg px-2 py-1 text-[10px] font-bold text-slate-600" },
                "\uD83D\uDD2C",
                React.createElement("input", {
                  type: "range", min: 0.5, max: 10, step: 0.1, value: d.zoom || 1,
                  onChange: function (e) { var z = parseFloat(e.target.value); upd("zoom", z); var cv = document.querySelector('[data-cell-sim-canvas]'); if (cv && cv._cellSimSetZoom) cv._cellSimSetZoom(z); },
                  className: "w-20 accent-green-600"
                }),
                Math.round(40 * (d.zoom || 1)) + "x"
              ),
              // Speed controls
              React.createElement("div", { className: "absolute bottom-2 right-2 flex items-center gap-2 bg-white/80 backdrop-blur rounded-lg px-3 py-1.5 text-[10px] font-bold text-slate-600" },
                "\u23E9",
                React.createElement("input", {
                  type: "range", min: 1, max: 5, step: 1, value: d.simSpeed || 1,
                  onChange: function (e) { var s = parseInt(e.target.value); upd("simSpeed", s); var cv = document.querySelector('[data-cell-sim-canvas]'); if (cv && cv._cellSimSetSpeed) cv._cellSimSetSpeed(s); },
                  className: "w-16 accent-green-600"
                }),
                (d.simSpeed || 1) + "x",
                React.createElement("button", { onClick: function () { var p = !d.paused; upd("paused", p); var cv = document.querySelector('[data-cell-sim-canvas]'); if (cv && cv._cellSimSetPaused) cv._cellSimSetPaused(p); }, className: "text-xs font-bold px-2 py-0.5 rounded " + (d.paused ? "bg-green-600 text-white" : "bg-slate-200 text-slate-600") }, d.paused ? "\u25B6" : "\u23F8")
              )
            ),

            // Organism selector buttons
            React.createElement("div", { className: "flex flex-wrap gap-1.5 mt-3" },
              ORGANISMS.map(function (org) {
                return React.createElement("button", {
                  key: org.id,
                  onClick: function () {
                    upd("selectedOrganism", d.selectedOrganism === org.id ? null : org.id);
                    var cv = document.querySelector('[data-cell-sim-canvas]');
                    if (cv && cv._cellSimFocusOrganism) cv._cellSimFocusOrganism(org.id);
                  },
                  className: "px-2.5 py-1.5 rounded-lg text-[11px] font-bold border-2 transition-all hover:scale-105 " + (d.selectedOrganism === org.id ? "border-" + org.color.replace('#', '') + " bg-white shadow-md" : "border-slate-200 bg-slate-50 text-slate-600"),
                  style: d.selectedOrganism === org.id ? { borderColor: org.color, color: org.color } : {}
                }, org.icon + " " + org.label);
              })
            ),

            // Info card for selected organism
            selDef && React.createElement("div", { className: "mt-3 bg-white rounded-xl border-2 p-4 animate-in fade-in", style: { borderColor: selDef.color } },
              React.createElement("div", { className: "flex items-start justify-between" },
                React.createElement("div", null,
                  React.createElement("h4", { className: "font-bold text-sm mb-1", style: { color: selDef.color } }, selDef.icon + " " + selDef.label),
                  React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed mb-2" }, selDef.desc)
                ),
                d.mode === 'play' && React.createElement("button", {
                  onClick: function () {
                    upd("playAsOrganism", selDef.id);
                    var cv = document.querySelector('[data-cell-sim-canvas]');
                    if (cv) {
                      cv._cellSimSetPlayAs(selDef.id);
                      cv._onXP = function (xp, label) {
                        upd("xpEarned", (d.xpEarned || 0) + xp);
                        if (typeof addToast === 'function') addToast("+" + xp + " XP: " + label + "!", "success");
                        var orgDef = ORGANISMS.find(function (o) { return o.activity === label || o.id === d.selectedOrganism; });
                        if (orgDef) {
                          var disc = (d.discoveries || []).slice();
                          var undisc = orgDef.facts.map(function (f, i) { return orgDef.id + '_' + i; }).filter(function (k) { return disc.indexOf(k) === -1; });
                          if (undisc.length > 0) { disc.push(undisc[Math.floor(Math.random() * undisc.length)]); upd("discoveries", disc); }
                        }
                      };
                    }
                  },
                  className: "px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-md hover:shadow-lg transition-all",
                  style: { background: selDef.color }
                }, "\uD83C\uDFAE Play As " + selDef.label)
              ),
              // Activity description
              React.createElement("div", { className: "bg-slate-50 rounded-lg p-2 mt-1 text-[11px]" },
                React.createElement("span", { className: "font-bold text-slate-700" }, "\u{1F3AF} " + selDef.activity + ": "),
                React.createElement("span", { className: "text-slate-500" }, selDef.activityDesc),
                React.createElement("span", { className: "ml-2 font-bold", style: { color: selDef.color } }, "+" + selDef.xp + " XP")
              ),
              // Facts
              React.createElement("div", { className: "mt-2 grid grid-cols-1 gap-0.5" },
                selDef.facts.map(function (fact, i) {
                  var discovered = (d.discoveries || []).includes(selDef.id + '_' + i);
                  return React.createElement("div", { key: i, className: "flex items-center gap-2 text-[10px] py-0.5" },
                    React.createElement("span", { className: discovered ? "text-green-600" : "text-slate-300" }, discovered ? "\u2713" : "\uD83D\uDD12"),
                    React.createElement("span", { className: discovered ? "text-slate-600" : "text-slate-300 italic" }, discovered ? fact : "Discover through observation...")
                  );
                })
              )
            ),

            // Quiz mode panel
            d.quizMode && quizQuestion && React.createElement("div", { className: "mt-3 bg-purple-50 rounded-xl border-2 border-purple-200 p-4 animate-in fade-in" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("p", { className: "text-xs font-bold text-purple-700" }, "\uD83E\uDDE0 Question " + ((d.quizIdx || 0) + 1) + "/" + QUIZ_BANK.length),
                React.createElement("div", { className: "flex items-center gap-2 text-xs" },
                  React.createElement("span", { className: "font-bold text-green-600" }, "\u2714 " + (d.quizScore || 0)),
                  React.createElement("span", { className: "font-bold text-amber-500" }, "\uD83D\uDD25 " + (d.quizStreak || 0))
                )
              ),
              React.createElement("p", { className: "text-sm font-bold text-slate-800 mb-3" }, quizQuestion.q),
              quizQuestion.options
                ? React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                  quizQuestion.options.map(function (opt) {
                    return React.createElement("button", {
                      key: opt, onClick: function () {
                        var correct = opt.toLowerCase() === quizQuestion.a.toLowerCase();
                        upd("quizFeedback", { correct: correct, msg: correct ? "\u2705 Correct! +" + 10 + " XP" : "\u274C Not quite. " + quizQuestion.hint });
                        if (correct) {
                          upd("quizScore", (d.quizScore || 0) + 1); upd("quizStreak", (d.quizStreak || 0) + 1); awardStemXP('galaxy_quiz', 10, 'Galaxy quiz correct');
                          var ansOrg = ORGANISMS.find(function (o) { return o.id === quizQuestion.a || o.label.toLowerCase() === quizQuestion.a; });
                          if (ansOrg) { var dd = (d.discoveries || []).slice(); var und = ansOrg.facts.map(function (f, i) { return ansOrg.id + '_' + i; }).filter(function (k) { return dd.indexOf(k) === -1; }); if (und.length > 0) { dd.push(und[0]); upd("discoveries", dd); } }
                        }
                        else { upd("quizStreak", 0); }
                      }, className: "px-3 py-2 text-xs font-bold rounded-lg border-2 transition-all hover:scale-[1.02] " + (d.quizFeedback ? (opt.toLowerCase() === quizQuestion.a.toLowerCase() ? "border-green-400 bg-green-50 text-green-700" : "border-slate-200 bg-white text-slate-600") : "border-purple-200 bg-white text-slate-700 hover:border-purple-400")
                    }, opt);
                  })
                )
                : React.createElement("div", { className: "flex flex-wrap gap-2" },
                  ORGANISMS.map(function (org) {
                    return React.createElement("button", {
                      key: org.id, onClick: function () {
                        var correct = org.id === quizQuestion.a;
                        upd("quizFeedback", { correct: correct, msg: correct ? "\u2705 Correct! +" + 10 + " XP" : "\u274C Not quite. " + quizQuestion.hint });
                        if (correct) {
                          upd("quizScore", (d.quizScore || 0) + 1); upd("quizStreak", (d.quizStreak || 0) + 1);
                          var ansOrg = ORGANISMS.find(function (o) { return o.id === quizQuestion.a || o.label.toLowerCase() === quizQuestion.a; });
                          if (ansOrg) { var dd = (d.discoveries || []).slice(); var und = ansOrg.facts.map(function (f, i) { return ansOrg.id + '_' + i; }).filter(function (k) { return dd.indexOf(k) === -1; }); if (und.length > 0) { dd.push(und[0]); upd("discoveries", dd); } }
                        }
                        else { upd("quizStreak", 0); }
                      }, className: "px-2.5 py-1.5 text-[11px] font-bold rounded-lg border-2 transition-all hover:scale-105 border-purple-200 bg-white text-slate-700 hover:border-purple-400"
                    }, org.icon + " " + org.label);
                  })
                ),
              d.quizFeedback && React.createElement("div", { className: "mt-2 p-2 rounded-lg text-center text-sm font-bold " + (d.quizFeedback.correct ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200") },
                d.quizFeedback.msg,
                React.createElement("button", {
                  onClick: function () {
                    var nextIdx = ((d.quizIdx || 0) + 1) % QUIZ_BANK.length;
                    upd("quizIdx", nextIdx); upd("quizFeedback", null);
                  }, className: "ml-3 px-2 py-0.5 bg-purple-600 text-white rounded text-xs"
                }, "Next \u2192")
              )
            ),

            // Bottom controls
            React.createElement("div", { className: "flex gap-3 mt-3 items-center" },
              React.createElement("button", { onClick: function () { setToolSnapshots(function (prev) { return prev.concat([{ id: 'ce-' + Date.now(), tool: 'cell', label: 'Cell Sim' + (d.selectedOrganism ? ': ' + d.selectedOrganism : ''), data: Object.assign({}, d), timestamp: Date.now() }]); }); addToast('\uD83D\uDCF8 Cell Simulator snapshot saved!', 'success'); }, className: "ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")
            )
          )
        })(),
        // ═══════════════════════════════════════════════════════
        // NEW TOOLS: Function Grapher, Physics, Chem, Punnett, Circuit, Data, Inequality, Molecule
        // ═══════════════════════════════════════════════════════

        stemLabTab === 'explore' && stemLabTool === 'funcGrapher' && (() => {
          const d = labToolData.funcGrapher;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, funcGrapher: { ...prev.funcGrapher, [key]: val } }));
          const W = 400, H = 300, pad = 40;
          const xR = { xMin: (d.range && d.range.xMin) || -10, xMax: (d.range && d.range.xMax) || 10 }; const yR = { yMin: (d.range && d.range.yMin) || -10, yMax: (d.range && d.range.yMax) || 10 };
          const toSX = x => pad + ((x - xR.xMin) / (xR.xMax - xR.xMin)) * (W - 2 * pad);
          const toSY = y => (H - pad) - ((y - yR.yMin) / (yR.yMax - yR.yMin)) * (H - 2 * pad);
          const pts = [];
          for (let px = 0; px <= W - 2 * pad; px += 2) {
            const x = xR.xMin + (px / (W - 2 * pad)) * (xR.xMax - xR.xMin);
            let y = 0;
            if (d.type === 'linear') y = d.a * x + d.b;
            else if (d.type === 'quadratic') y = d.a * x * x + d.b * x + d.c;
            else if (d.type === 'trig') y = d.a * Math.sin(d.b * x + d.c);
            if (y >= yR.yMin && y <= yR.yMax) pts.push(`${toSX(x)},${toSY(y)}`);
          }
          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center justify-between mb-4" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "📈 Function Grapher"),
              React.createElement("div", { className: "flex gap-1" },
                ["linear", "quadratic", "trig"].map(t2 => React.createElement("button", { key: t2, onClick: () => upd("type", t2), className: `px-3 py-1 rounded-lg text-xs font-bold transition-all ${d.type === t2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}` }, t2))
              )
            ),
            React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, className: "w-full bg-white rounded-xl border border-slate-200", style: { maxHeight: "320px" } },
              React.createElement("line", { x1: pad, y1: toSY(0), x2: W - pad, y2: toSY(0), stroke: "#94a3b8", strokeWidth: 1 }),
              React.createElement("line", { x1: toSX(0), y1: pad, x2: toSX(0), y2: H - pad, stroke: "#94a3b8", strokeWidth: 1 }),
              pts.length > 1 && React.createElement("polyline", { points: pts.join(" "), fill: "none", stroke: "#4f46e5", strokeWidth: 2.5 }),
              React.createElement("text", { x: W / 2, y: H - 8, textAnchor: "middle", className: "text-[10px] fill-slate-400" }, `f(x) = ${d.type === 'linear' ? d.a + 'x + ' + d.b : d.type === 'quadratic' ? d.a + 'x² + ' + d.b + 'x + ' + d.c : d.a + 'sin(' + d.b + 'x + ' + d.c + ')'}`)
            ),
            React.createElement("div", { className: "grid grid-cols-3 gap-3 mt-3" },
              [{ k: 'a', label: 'a', min: -5, max: 5, step: 0.1 }, { k: 'b', label: 'b', min: -5, max: 5, step: 0.1 }, { k: 'c', label: 'c', min: -5, max: 5, step: 0.1 }].map(s =>
                React.createElement("div", { key: s.k, className: "text-center" },
                  React.createElement("label", { className: "text-xs font-bold text-slate-500" }, s.label + " = " + d[s.k]),
                  React.createElement("input", { type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k], onChange: e => upd(s.k, parseFloat(e.target.value)), className: "w-full accent-indigo-600" })
                )
              )
            ),
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'fg-' + Date.now(), tool: 'funcGrapher', label: d.type + ': a=' + d.a + ' b=' + d.b, data: { ...d }, timestamp: Date.now() }]); addToast('📸 Function snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "📸 Snapshot")
          )
        })(),

        stemLabTab === 'explore' && stemLabTool === 'physics' && (() => {
          const d = labToolData.physics;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, physics: { ...prev.physics, [key]: val } }));

          // Canvas animated projectile
          const canvasRef = function (canvasEl) {
            if (!canvasEl) {
              if (canvasRef._lastCanvas && canvasRef._lastCanvas._physAnim) {
                cancelAnimationFrame(canvasRef._lastCanvas._physAnim);
                canvasRef._lastCanvas._physInit = false;
                canvasRef._lastCanvas = null;
              }
              return;
            }
            if (canvasEl._physInit) return;
            canvasEl._physInit = true;
            canvasRef._lastCanvas = canvasEl;
            var cW = canvasEl.width = canvasEl.offsetWidth * 2;
            var cH = canvasEl.height = canvasEl.offsetHeight * 2;
            var ctx = canvasEl.getContext('2d');
            var dpr = 2;
            var tick = 0;
            var trails = [];
            var ball = null;
            var launched = false;
            function launch() {
              var angle = parseFloat(canvasEl.dataset.angle || '45');
              var vel = parseFloat(canvasEl.dataset.velocity || '25');
              var grav = parseFloat(canvasEl.dataset.gravity || '9.8');
              var rad = angle * Math.PI / 180;
              ball = { x: 40, y: cH / dpr - 40, vx: vel * Math.cos(rad) * 2, vy: -vel * Math.sin(rad) * 2, g: grav * 0.15 };
              trails.push([]);
              launched = true;
            }
            canvasEl._launch = launch;
            function draw() {
              tick++;
              ctx.clearRect(0, 0, cW, cH);
              // Sky
              var skyGrad = ctx.createLinearGradient(0, 0, 0, cH);
              skyGrad.addColorStop(0, '#1e3a5f');
              skyGrad.addColorStop(0.6, '#87ceeb');
              skyGrad.addColorStop(1, '#228B22');
              ctx.fillStyle = skyGrad;
              ctx.fillRect(0, 0, cW, cH);
              // Ground
              ctx.fillStyle = '#2d6a1e';
              ctx.fillRect(0, cH - 40 * dpr, cW, 40 * dpr);
              ctx.fillStyle = '#3a8a2e';
              ctx.fillRect(0, cH - 40 * dpr, cW, 3 * dpr);
              // Grid
              ctx.strokeStyle = 'rgba(255,255,255,0.07)';
              ctx.lineWidth = 1;
              for (var gx = 0; gx < cW; gx += 40 * dpr) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, cH - 40 * dpr); ctx.stroke(); }
              for (var gy = 0; gy < cH - 40 * dpr; gy += 40 * dpr) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(cW, gy); ctx.stroke(); }
              // Draw all trails
              trails.forEach(function (trail, idx) {
                if (trail.length < 2) return;
                var alpha = idx === trails.length - 1 ? 1 : 0.3;
                ctx.strokeStyle = 'rgba(239,68,68,' + alpha + ')';
                ctx.lineWidth = 2 * dpr;
                ctx.setLineDash([4, 3]);
                ctx.beginPath();
                trail.forEach(function (p, i) { if (i === 0) ctx.moveTo(p.x * dpr, p.y * dpr); else ctx.lineTo(p.x * dpr, p.y * dpr); });
                ctx.stroke();
                ctx.setLineDash([]);
              });
              // Animate ball
              if (ball && launched) {
                ball.vy += ball.g * 0.06;
                ball.x += ball.vx * 0.06;
                ball.y += ball.vy * 0.06;
                if (trails.length > 0) trails[trails.length - 1].push({ x: ball.x, y: ball.y });
                // Draw ball with glow
                ctx.beginPath(); ctx.arc(ball.x * dpr, ball.y * dpr, 6 * dpr, 0, Math.PI * 2);
                ctx.fillStyle = '#fbbf24'; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
                ctx.strokeStyle = '#92400e'; ctx.lineWidth = 1.5 * dpr; ctx.stroke();
                // Velocity vector
                ctx.strokeStyle = '#60a5fa';
                ctx.lineWidth = 2 * dpr;
                ctx.beginPath(); ctx.moveTo(ball.x * dpr, ball.y * dpr);
                ctx.lineTo((ball.x + ball.vx * 1.5) * dpr, (ball.y + ball.vy * 1.5) * dpr); ctx.stroke();
                // Check ground collision
                if (ball.y >= cH / dpr - 40) {
                  ball.y = cH / dpr - 40;
                  launched = false;
                  // Store result
                  var range = ball.x - 40;
                  canvasEl.dataset.lastRange = range.toFixed(1);
                  canvasEl.dataset.lastMaxH = '0';
                  if (trails.length > 0) {
                    var maxY = Math.min.apply(null, trails[trails.length - 1].map(function (p) { return p.y; }));
                    canvasEl.dataset.lastMaxH = ((cH / dpr - 40 - maxY)).toFixed(1);
                  }
                }
              }
              // Launcher
              var angle = parseFloat(canvasEl.dataset.angle || '45');
              var rad = angle * Math.PI / 180;
              ctx.strokeStyle = '#94a3b8';
              ctx.lineWidth = 4 * dpr;
              ctx.beginPath(); ctx.moveTo(40 * dpr, (cH / dpr - 40) * dpr);
              ctx.lineTo((40 + Math.cos(rad) * 35) * dpr, (cH / dpr - 40 - Math.sin(rad) * 35) * dpr); ctx.stroke();
              // HUD
              ctx.fillStyle = 'rgba(0,0,0,0.5)';
              ctx.fillRect(4 * dpr, 4 * dpr, 130 * dpr, 32 * dpr);
              ctx.font = 'bold ' + (7 * dpr) + 'px sans-serif';
              ctx.fillStyle = '#fbbf24';
              ctx.fillText('\u26A1 ' + angle + '\u00B0  v=' + (canvasEl.dataset.velocity || '25') + 'm/s', 8 * dpr, 16 * dpr);
              ctx.fillStyle = '#94a3b8';
              ctx.fillText('g=' + (canvasEl.dataset.gravity || '9.8') + 'm/s\u00B2', 8 * dpr, 28 * dpr);
              canvasEl._physAnim = requestAnimationFrame(draw);
            }
            canvasEl._physAnim = requestAnimationFrame(draw);
          };

          var PRESETS = [
            { label: '\uD83C\uDF0D Earth', gravity: 9.8 },
            { label: '\uD83C\uDF11 Moon', gravity: 1.6 },
            { label: '\u2642 Mars', gravity: 3.7 },
            { label: '\u2643 Jupiter', gravity: 24.8 },
          ];

          // Challenge mode
          var CHALLENGES = [
            { target: 100, label: 'Hit the 100m mark!' },
            { target: 200, label: 'Reach 200m range!' },
            { target: 50, label: 'Precision: land at 50m' },
          ];

          return React.createElement("div", { className: "max-w-5xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\u26A1 Physics Simulator"),
              React.createElement("span", { className: "px-2 py-0.5 bg-sky-100 text-sky-700 text-[10px] font-bold rounded-full" }, "ANIMATED")
            ),
            React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-sky-300 shadow-lg mb-3", style: { height: "420px" } },
              React.createElement("canvas", {
                ref: canvasRef,
                id: "physicsCanvas",
                "data-angle": d.angle, "data-velocity": d.velocity, "data-gravity": d.gravity,
                style: { width: "100%", height: "100%", display: "block" }
              })
            ),
            React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-2" },
              React.createElement("button", {
                onClick: function () {
                  var cv = document.getElementById('physicsCanvas');
                  if (cv && cv._launch) cv._launch();
                }, className: "px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl text-sm hover:from-amber-600 hover:to-orange-600 shadow-md transition-all"
              }, "\uD83D\uDE80 Launch!"),
              PRESETS.map(function (p) {
                return React.createElement("button", {
                  key: p.label, onClick: function () { upd('gravity', p.gravity); },
                  className: "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.gravity === p.gravity ? 'bg-sky-600 text-white' : 'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100')
                }, p.label);
              })
            ),
            React.createElement("div", { className: "grid grid-cols-3 gap-3 mb-3" },
              [{ k: 'angle', label: 'Angle (\u00B0)', min: 5, max: 85, step: 1 }, { k: 'velocity', label: 'Velocity (m/s)', min: 5, max: 50, step: 1 }, { k: 'gravity', label: 'Gravity (m/s\u00B2)', min: 1, max: 25, step: 0.1 }].map(function (s) {
                return React.createElement("div", { key: s.k, className: "text-center bg-slate-50 rounded-lg p-2 border" },
                  React.createElement("label", { className: "text-[10px] font-bold text-slate-500 block" }, s.label),
                  React.createElement("span", { className: "text-sm font-bold text-slate-700 block" }, d[s.k]),
                  React.createElement("input", { type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k], onChange: function (e) { upd(s.k, parseFloat(e.target.value)); }, className: "w-full accent-sky-600" })
                );
              })
            ),
            React.createElement("div", { className: "grid grid-cols-3 gap-2 mb-3 text-center" },
              React.createElement("div", { className: "p-2 bg-sky-50 rounded-lg border border-sky-200" },
                React.createElement("p", { className: "text-[9px] font-bold text-sky-600 uppercase" }, "Range"),
                React.createElement("p", { className: "text-sm font-bold text-sky-800" }, (function () { var r = d.angle * Math.PI / 180; return ((d.velocity * d.velocity * Math.sin(2 * r)) / d.gravity).toFixed(1); })() + " m")
              ),
              React.createElement("div", { className: "p-2 bg-sky-50 rounded-lg border border-sky-200" },
                React.createElement("p", { className: "text-[9px] font-bold text-sky-600 uppercase" }, "Max Height"),
                React.createElement("p", { className: "text-sm font-bold text-sky-800" }, (function () { var vy = d.velocity * Math.sin(d.angle * Math.PI / 180); return (vy * vy / (2 * d.gravity)).toFixed(1); })() + " m")
              ),
              React.createElement("div", { className: "p-2 bg-sky-50 rounded-lg border border-sky-200" },
                React.createElement("p", { className: "text-[9px] font-bold text-sky-600 uppercase" }, "Flight Time"),
                React.createElement("p", { className: "text-sm font-bold text-sky-800" }, (function () { var vy = d.velocity * Math.sin(d.angle * Math.PI / 180); return (2 * vy / d.gravity).toFixed(2); })() + " s")
              )
            ),
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'ph-' + Date.now(), tool: 'physics', label: d.angle + '\u00B0 ' + d.velocity + 'm/s', data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Physics snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")
          )
        })(),

        stemLabTab === 'explore' && stemLabTool === 'chemBalance' && (() => {
          const d = labToolData.chemBalance;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, chemBalance: { ...prev.chemBalance, [key]: val } }));
          const allPresets = [
            // Beginner (Gr 5-6)
            { name: 'Water', tier: 'beginner', eq: 'H\u2082 + O\u2082 \u2192 H\u2082O', target: [2, 1, 2], atoms: { H: [2, 0, 2], O: [0, 2, 1] }, hint: 'Hydrogen needs 4 atoms total on each side' },
            { name: 'Table Salt', tier: 'beginner', eq: 'Na + Cl\u2082 \u2192 NaCl', target: [2, 1, 2], atoms: { Na: [1, 0, 1], Cl: [0, 2, 1] }, hint: 'Each NaCl needs one Na and one Cl' },
            { name: 'Magnesium Oxide', tier: 'beginner', eq: 'Mg + O\u2082 \u2192 MgO', target: [2, 1, 2], atoms: { Mg: [1, 0, 1], O: [0, 2, 1] }, hint: 'Oxygen comes in pairs' },
            { name: 'Iron Oxide', tier: 'beginner', eq: 'Fe + O\u2082 \u2192 Fe\u2082O\u2083', target: [4, 3, 2], atoms: { Fe: [1, 0, 2], O: [0, 2, 3] }, hint: 'Count Fe and O atoms on each side' },
            // Intermediate (Gr 7-8)
            { name: 'Combustion', tier: 'intermediate', eq: 'CH\u2084 + O\u2082 \u2192 CO\u2082 + H\u2082O', target: [1, 2, 1, 2], atoms: { C: [1, 0, 1, 0], H: [4, 0, 0, 2], O: [0, 2, 2, 1] }, hint: 'Balance C first, then H, then O' },
            { name: 'Photosynthesis', tier: 'intermediate', eq: 'CO\u2082 + H\u2082O \u2192 C\u2086H\u2081\u2082O\u2086 + O\u2082', target: [6, 6, 1, 6], atoms: { C: [1, 0, 6, 0], O: [2, 1, 6, 2], H: [0, 2, 12, 0] }, hint: 'Start with carbon: you need 6 CO\u2082' },
            { name: 'Acid + Base', tier: 'intermediate', eq: 'HCl + NaOH \u2192 NaCl + H\u2082O', target: [1, 1, 1, 1], atoms: { H: [1, 1, 0, 2], Cl: [1, 0, 1, 0], Na: [0, 1, 1, 0], O: [0, 1, 0, 1] }, hint: 'This one is already balanced at 1:1:1:1!' },
            { name: 'Ammonia', tier: 'intermediate', eq: 'N\u2082 + H\u2082 \u2192 NH\u2083', target: [1, 3, 2], atoms: { N: [2, 0, 1], H: [0, 2, 3] }, hint: 'You need 2 NH\u2083 to use both N atoms' },
            // Advanced (Gr 9+)
            { name: 'Thermite', tier: 'advanced', eq: 'Al + Fe\u2082O\u2083 \u2192 Al\u2082O\u2083 + Fe', target: [2, 1, 1, 2], atoms: { Al: [1, 0, 2, 0], Fe: [0, 2, 0, 1], O: [0, 3, 3, 0] }, hint: 'Aluminum replaces iron' },
            { name: 'Ethanol Combustion', tier: 'advanced', eq: 'C\u2082H\u2085OH + O\u2082 \u2192 CO\u2082 + H\u2082O', target: [1, 3, 2, 3], atoms: { C: [2, 0, 1, 0], H: [6, 0, 0, 2], O: [1, 2, 2, 1] }, hint: 'Balance C, then H, then adjust O last' },
            { name: 'Calcium Carbonate', tier: 'advanced', eq: 'CaCO\u2083 \u2192 CaO + CO\u2082', target: [1, 1, 1], atoms: { Ca: [1, 1, 0], C: [1, 0, 1], O: [3, 1, 2] }, hint: 'Decomposition: already balanced!' },
            { name: 'Glucose Combustion', tier: 'advanced', eq: 'C\u2086H\u2081\u2082O\u2086 + O\u2082 \u2192 CO\u2082 + H\u2082O', target: [1, 6, 6, 6], atoms: { C: [6, 0, 1, 0], H: [12, 0, 0, 2], O: [6, 2, 2, 1] }, hint: 'Balance C (6), then H (12\u219206), then O last' },
          ];
          const tierFilter = d.tierFilter || 'all';
          const filtered = tierFilter === 'all' ? allPresets : allPresets.filter(p => p.tier === tierFilter);
          const preset = filtered.find(p => p.name === d.equation) || filtered[0];
          const numSlots = preset.target.length;
          const coeffs = (d.coefficients || [1, 1, 1, 1]).slice(0, numSlots);
          while (coeffs.length < numSlots) coeffs.push(1);
          const showHints = d.showHints || false;
          const streak = d.streak || 0;
          const getAtomCounts = (side) => {
            const result = {};
            Object.entries(preset.atoms).forEach(([atom, perMol]) => {
              let total = 0;
              perMol.forEach((count, i) => {
                if (side === 'left' && i < preset.eq.split('\u2192')[0].split('+').length) total += count * coeffs[i];
                if (side === 'right' && i >= preset.eq.split('\u2192')[0].split('+').length) total += count * coeffs[i];
              });
              if (total > 0) result[atom] = total;
            });
            return result;
          };
          const checkBalance = () => {
            const isCorrect = coeffs.every((c, i) => c === preset.target[i]);
            if (isCorrect) {
              upd('streak', streak + 1);
              upd('feedback', { correct: true, msg: '\u2705 Balanced! ' + (streak + 1 > 1 ? '\uD83D\uDD25 ' + (streak + 1) + ' in a row!' : 'Great job!') });
            } else {
              upd('streak', 0);
              upd('feedback', { correct: false, msg: '\u274C Not balanced yet. Check atom counts on each side.' });
            }
          };
          const switchPreset = (name) => { upd('equation', name); upd('coefficients', Array(allPresets.find(p => p.name === name)?.target.length || 4).fill(1)); upd('feedback', null); };
          const tierColors = { beginner: 'emerald', intermediate: 'amber', advanced: 'rose' };
          const tierLabels = { beginner: '\uD83C\uDF31 Beginner', intermediate: '\u26A1 Intermediate', advanced: '\uD83D\uDE80 Advanced' };
          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\u2697\uFE0F Equation Balancer"),
              streak > 0 && React.createElement("span", { className: "ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full animate-in zoom-in" }, "\uD83D\uDD25 " + streak + " streak")
            ),
            // Tier filter chips
            React.createElement("div", { className: "flex gap-2 mb-3" },
              ['all', 'beginner', 'intermediate', 'advanced'].map(tier =>
                React.createElement("button", { key: tier, onClick: () => { upd('tierFilter', tier); const first = tier === 'all' ? allPresets[0] : allPresets.find(p => p.tier === tier); if (first) switchPreset(first.name); }, className: "px-3 py-1 rounded-full text-xs font-bold transition-all " + (tierFilter === tier ? 'bg-lime-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200') }, tier === 'all' ? '\uD83D\uDCCA All' : tierLabels[tier] || tier)
              )
            ),
            // Equation preset chips
            React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-4" },
              filtered.map(p => React.createElement("button", { key: p.name, onClick: () => switchPreset(p.name), className: "px-3 py-1 rounded-lg text-xs font-bold transition-all " + (d.equation === p.name ? 'bg-lime-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-lime-50 border border-slate-200') }, p.name))
            ),
            React.createElement("div", { className: "bg-white rounded-xl border border-lime-200 p-6 text-center" },
              // Equation display
              React.createElement("p", { className: "text-2xl font-bold text-slate-800 mb-4 tracking-wide" },
                (() => { const parts = preset.eq.split('\u2192'); const left = parts[0].split('+').map(s => s.trim()); const right = parts[1] ? parts[1].split('+').map(s => s.trim()) : []; const fmt = (seg, i) => (coeffs[i] > 1 ? coeffs[i] : '') + seg; return left.map((s, i) => fmt(s, i)).join(' + ') + ' \u2192 ' + right.map((s, i) => fmt(s, left.length + i)).join(' + '); })()
              ),
              // Coefficient controls
              React.createElement("div", { className: "flex justify-center gap-4 mb-4" },
                coeffs.map((c, i) =>
                  React.createElement("div", { key: i, className: "flex flex-col items-center gap-1" },
                    React.createElement("button", { onClick: () => { const nc = [...coeffs]; nc[i] = Math.min(12, nc[i] + 1); upd('coefficients', nc); upd('feedback', null); }, className: "w-8 h-8 bg-lime-100 rounded-lg font-bold text-lime-700 hover:bg-lime-200 transition-colors" }, "+"),
                    React.createElement("span", { className: "text-xl font-bold text-slate-700 w-8 text-center" }, c),
                    React.createElement("button", { onClick: () => { const nc = [...coeffs]; nc[i] = Math.max(1, nc[i] - 1); upd('coefficients', nc); upd('feedback', null); }, className: "w-8 h-8 bg-red-50 rounded-lg font-bold text-red-500 hover:bg-red-100 transition-colors" }, "\u2212")
                  )
                )
              ),
              // Action buttons
              React.createElement("div", { className: "flex justify-center gap-3 mb-3" },
                React.createElement("button", { onClick: checkBalance, className: "px-6 py-2 bg-lime-600 text-white font-bold rounded-lg hover:bg-lime-700 transition-colors shadow-sm" }, "\u2696\uFE0F Check Balance"),
                React.createElement("button", { onClick: () => upd('showHints', !showHints), className: "px-4 py-2 rounded-lg font-bold text-xs transition-colors " + (showHints ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 hover:bg-blue-50') }, showHints ? '\uD83D\uDCA1 Hide Hints' : '\uD83D\uDCA1 Show Hints'),
                React.createElement("button", { onClick: () => { upd('coefficients', Array(numSlots).fill(1)); upd('feedback', null); }, className: "px-4 py-2 bg-slate-100 text-slate-500 rounded-lg font-bold text-xs hover:bg-slate-200 transition-colors" }, "\uD83D\uDD04 Reset")
              ),
              // Hint: atom counts
              showHints && React.createElement("div", { className: "mt-3 bg-blue-50 rounded-lg p-3 border border-blue-200" },
                React.createElement("p", { className: "text-xs font-bold text-blue-700 mb-2" }, "\uD83D\uDCA1 " + preset.hint),
                React.createElement("div", { className: "flex justify-center gap-8" },
                  React.createElement("div", null,
                    React.createElement("p", { className: "text-xs font-bold text-slate-500 mb-1" }, "Left Side"),
                    Object.entries(getAtomCounts('left')).map(([atom, count]) =>
                      React.createElement("span", { key: atom, className: "inline-block px-2 py-0.5 bg-white rounded text-xs font-bold mr-1 mb-1 " + (getAtomCounts('left')[atom] === getAtomCounts('right')[atom] ? 'text-green-600 border border-green-200' : 'text-red-600 border border-red-200') }, atom + ": " + count)
                    )
                  ),
                  React.createElement("div", null,
                    React.createElement("p", { className: "text-xs font-bold text-slate-500 mb-1" }, "Right Side"),
                    Object.entries(getAtomCounts('right')).map(([atom, count]) =>
                      React.createElement("span", { key: atom, className: "inline-block px-2 py-0.5 bg-white rounded text-xs font-bold mr-1 mb-1 " + (getAtomCounts('left')[atom] === getAtomCounts('right')[atom] ? 'text-green-600 border border-green-200' : 'text-red-600 border border-red-200') }, atom + ": " + count)
                    )
                  )
                )
              ),
              // Feedback
              d.feedback && React.createElement("p", { className: "mt-3 text-sm font-bold " + (d.feedback.correct ? 'text-green-600' : 'text-red-600') }, d.feedback.msg)
            )
          )
        })(),

        stemLabTab === 'explore' && stemLabTool === 'punnett' && (() => {
          const d = labToolData.punnett;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, punnett: { ...prev.punnett, [key]: val } }));
          // grade filter removed — all tools visible
          const grid = [[d.parent1[0] + d.parent2[0], d.parent1[0] + d.parent2[1]], [d.parent1[1] + d.parent2[0], d.parent1[1] + d.parent2[1]]];
          const counts = {};
          grid.flat().forEach(g => { counts[g] = (counts[g] || 0) + 1; });
          const isHomo = a => a[0] === a[1];
          const phenotype = g => g.includes(g[0].toUpperCase()) ? 'Dominant' : 'Recessive';
          return React.createElement("div", { className: "max-w-2xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-4" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "🧬 Punnett Square")
            ),
            React.createElement("p", { className: "text-xs text-slate-400 italic -mt-2 mb-3" }, "Predict offspring genotypes. Select alleles for each parent."),
            React.createElement("div", { className: "flex gap-6 mb-4 justify-center" },
              [['Parent 1', 'parent1', 'violet'], ['Parent 2', 'parent2', 'blue']].map(([label, key, color]) =>
                React.createElement("div", { key, className: "text-center" },
                  React.createElement("label", { className: `text-sm font-bold text-${color}-700 mb-2 block` }, label),
                  React.createElement("div", { className: "flex gap-2" },
                    [0, 1].map(i => React.createElement("select", { key: i, value: d[key][i], onChange: e => { const na = [...d[key]]; na[i] = e.target.value; upd(key, na); }, className: `px-3 py-2 border-2 border-${color}-200 rounded-lg font-bold text-lg text-center` },
                      ['A', 'a', 'B', 'b', 'C', 'c', 'R', 'r', 'T', 't'].map(a => React.createElement("option", { key: a, value: a }, a))
                    ))
                  )
                )
              )
            ),
            React.createElement("div", { className: "bg-white rounded-xl border border-violet-200 p-4 inline-block mx-auto", style: { display: 'flex', justifyContent: 'center' } },
              React.createElement("table", { className: "border-collapse" },
                React.createElement("thead", null, React.createElement("tr", null,
                  React.createElement("th", { className: "w-16 h-16" }),
                  d.parent2.map((a, i) => React.createElement("th", { key: i, className: "w-16 h-16 text-center text-lg font-bold text-blue-600 bg-blue-50 border border-blue-200" }, a))
                )),
                React.createElement("tbody", null, d.parent1.map((a, r) =>
                  React.createElement("tr", { key: r },
                    React.createElement("td", { className: "w-16 h-16 text-center text-lg font-bold text-violet-600 bg-violet-50 border border-violet-200" }, a),
                    grid[r].map((g, c) => React.createElement("td", { key: c, className: `w-16 h-16 text-center text-lg font-bold border border-slate-200 ${phenotype(g) === 'Dominant' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}` }, g))
                  )
                ))
              )
            ),
            React.createElement("div", { className: "mt-4 bg-slate-50 rounded-lg p-3 text-center" },
              React.createElement("p", { className: "text-sm font-bold text-slate-600" }, "Genotype Ratios: " + Object.entries(counts).map(([g, c]) => g + ': ' + c + '/4').join(' | ')),
              React.createElement("p", { className: "text-xs text-slate-400 mt-1" }, "Phenotype: " + grid.flat().filter(g => phenotype(g) === 'Dominant').length + "/4 Dominant, " + grid.flat().filter(g => phenotype(g) === 'Recessive').length + "/4 Recessive")
            ),
            // ── Trait Presets ──
            React.createElement("div", { className: "mt-3 border-t border-slate-200 pt-3" },
              React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2" }, "\uD83E\uDDEC Quick Crosses"),
              React.createElement("div", { className: "flex flex-wrap gap-1.5" },
                [
                  { label: '\uD83D\uDFE4 Heterozygous x Hetero (Bb \u00D7 Bb)', p1: ['B', 'b'], p2: ['B', 'b'], tip: 'Classic 3:1 ratio \u2014 the Mendelian monohybrid cross' },
                  { label: '\uD83D\uDFE4 Hetero x Recessive (Bb \u00D7 bb)', p1: ['B', 'b'], p2: ['b', 'b'], tip: 'Test cross: 1:1 ratio reveals heterozygosity' },
                  { label: '\uD83D\uDCA0 Homozygous x Homo (BB \u00D7 bb)', p1: ['B', 'B'], p2: ['b', 'b'], tip: 'All offspring are heterozygous (Bb) \u2014 100% dominant' },
                  { label: '\uD83C\uDF39 Flower Color (Rr \u00D7 Rr)', p1: ['R', 'r'], p2: ['R', 'r'], tip: 'Red flowers (RR, Rr) vs white flowers (rr)' },
                  { label: '\uD83E\uDDB7 Tongue Rolling (Tt \u00D7 Tt)', p1: ['T', 't'], p2: ['T', 't'], tip: 'Tongue rolling is a dominant trait!' },
                ].map(function (preset) {
                  return React.createElement("button", {
                    key: preset.label, onClick: function () {
                      upd('parent1', preset.p1); upd('parent2', preset.p2);
                      addToast('\uD83E\uDDEC ' + preset.tip, 'success');
                    }, className: "px-2 py-1 rounded-lg text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-all"
                  }, preset.label);
                })
              ),
              // ── Phenotype Ratio Bar Chart ──
              React.createElement("div", { className: "mt-3 bg-white rounded-lg border p-3" },
                React.createElement("p", { className: "text-[10px] font-bold text-slate-500 mb-2" }, "\uD83D\uDCCA Phenotype Distribution"),
                (function () {
                  var domCount = grid.flat().filter(function (g) { return phenotype(g) === 'Dominant'; }).length;
                  var recCount = 4 - domCount;
                  return React.createElement("div", { className: "flex items-end gap-4 justify-center h-20" },
                    React.createElement("div", { className: "flex flex-col items-center" },
                      React.createElement("div", { className: "w-16 bg-emerald-400 rounded-t-lg transition-all", style: { height: (domCount / 4 * 60) + 'px' } }),
                      React.createElement("span", { className: "text-xs font-bold text-emerald-700 mt-1" }, "Dom " + (domCount * 25) + "%")
                    ),
                    React.createElement("div", { className: "flex flex-col items-center" },
                      React.createElement("div", { className: "w-16 bg-amber-400 rounded-t-lg transition-all", style: { height: (recCount / 4 * 60) + 'px' } }),
                      React.createElement("span", { className: "text-xs font-bold text-amber-700 mt-1" }, "Rec " + (recCount * 25) + "%")
                    )
                  );
                })()
              ),
              // ── Educational Callout ──
              React.createElement("p", { className: "mt-2 text-xs text-slate-400 italic" },
                (function () {
                  var domC = grid.flat().filter(function (g) { return phenotype(g) === 'Dominant'; }).length;
                  if (domC === 4) return '\uD83D\uDCA1 100% dominant phenotype. At least one parent must be homozygous dominant (BB).';
                  if (domC === 3) return '\uD83D\uDCA1 Classic 3:1 ratio! Both parents are heterozygous (Bb) \u2014 this is Mendel\u2019s foundational ratio.';
                  if (domC === 2) return '\uD83D\uDCA1 1:1 ratio. This is a test cross \u2014 one parent is heterozygous, the other recessive.';
                  if (domC === 1) return '\uD83D\uDCA1 Only 25% dominant. This is unusual \u2014 check your allele assignments!';
                  return '\uD83D\uDCA1 100% recessive. Both parents must be homozygous recessive (bb).';
                })()
              )
            ),
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'pn-' + Date.now(), tool: 'punnett', label: d.parent1.join('') + ' × ' + d.parent2.join(''), data: { ...d }, timestamp: Date.now() }]); addToast('📸 Punnett snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "📸 Snapshot")
          )
        })(),

        stemLabTab === 'explore' && stemLabTool === 'circuit' && (() => {
          const d = labToolData.circuit;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, circuit: { ...prev.circuit, [key]: val } }));
          // grade filter removed — all tools visible
          const mode = d.mode || 'series';
          const resistors = d.components.filter(c => c.type === 'resistor');
          const bulbs = d.components.filter(c => c.type === 'bulb');
          const totalR = mode === 'series'
            ? d.components.reduce((s, c) => s + c.value, 0) || 1
            : (d.components.length > 0 ? 1 / d.components.reduce((s, c) => s + 1 / (c.value || 1), 0) : 1);
          const current = d.voltage / totalR;
          const power = d.voltage * current;
          const W = 420, H = 200;
          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-4" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\u{1F50C} Circuit Builder"),
              React.createElement("div", { className: "flex gap-1 ml-auto" },
                ["series", "parallel"].map(m => React.createElement("button", { key: m, onClick: () => upd("mode", m), className: `px-3 py-1 rounded-lg text-xs font-bold capitalize ${mode === m ? 'bg-yellow-600 text-white' : 'bg-slate-100 text-slate-600'}` }, m))
              )
            ),
            React.createElement("p", { className: "text-xs text-slate-400 italic -mt-2 mb-3" }, "Build " + mode + " circuits. V = IR. Add components and adjust voltage to see live calculations."),
            React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, className: "w-full bg-gradient-to-b from-yellow-50 to-white rounded-xl border border-yellow-200 mb-3", style: { maxHeight: "220px" } },
              React.createElement("rect", { x: 20, y: 40, width: 30, height: 60, fill: "#fbbf24", stroke: "#92400e", strokeWidth: 2, rx: 3 }),
              React.createElement("text", { x: 35, y: 115, textAnchor: "middle", style: { fontSize: '10px', fontWeight: 'bold' }, fill: "#92400e" }, d.voltage + "V"),
              React.createElement("text", { x: 35, y: 32, textAnchor: "middle", style: { fontSize: '9px' }, fill: "#92400e" }, "\u{1F50B}"),
              React.createElement("line", { x1: 35, y1: 40, x2: 35, y2: 20, stroke: "#1e293b", strokeWidth: 2 }),
              React.createElement("line", { x1: 35, y1: 20, x2: 380, y2: 20, stroke: "#1e293b", strokeWidth: 2 }),
              React.createElement("line", { x1: 35, y1: 100, x2: 35, y2: 140, stroke: "#1e293b", strokeWidth: 2 }),
              React.createElement("line", { x1: 35, y1: 140, x2: 380, y2: 140, stroke: "#1e293b", strokeWidth: 2 }),
              mode === 'series'
                ? d.components.map((comp, i) => {
                  const cx = 80 + i * Math.min(70, (280 / Math.max(d.components.length, 1)));
                  return React.createElement("g", { key: comp.id },
                    React.createElement("line", { x1: cx - 20, y1: 20, x2: cx - 20, y2: 60, stroke: "#1e293b", strokeWidth: 2 }),
                    comp.type === 'resistor'
                      ? React.createElement("rect", { x: cx - 30, y: 60, width: 20, height: 40, fill: "#fef9c3", stroke: "#ca8a04", strokeWidth: 1.5, rx: 2 })
                      : React.createElement("circle", { cx: cx - 20, cy: 80, r: 15, fill: "#fef3c7", stroke: "#f59e0b", strokeWidth: 1.5 }),
                    React.createElement("text", { x: cx - 20, y: comp.type === 'resistor' ? 83 : 84, textAnchor: "middle", style: { fontSize: '8px', fontWeight: 'bold' }, fill: "#78350f" }, comp.value + "\u03A9"),
                    React.createElement("line", { x1: cx - 20, y1: comp.type === 'resistor' ? 100 : 95, x2: cx - 20, y2: 140, stroke: "#1e293b", strokeWidth: 2 })
                  );
                })
                : d.components.map((comp, i) => {
                  const cy = 40 + i * Math.min(30, (80 / Math.max(d.components.length, 1)));
                  return React.createElement("g", { key: comp.id },
                    React.createElement("line", { x1: 180, y1: cy, x2: 200, y2: cy, stroke: "#1e293b", strokeWidth: 1.5 }),
                    comp.type === 'resistor'
                      ? React.createElement("rect", { x: 200, y: cy - 8, width: 40, height: 16, fill: "#fef9c3", stroke: "#ca8a04", strokeWidth: 1.5, rx: 2 })
                      : React.createElement("circle", { cx: 220, cy: cy, r: 10, fill: "#fef3c7", stroke: "#f59e0b", strokeWidth: 1.5 }),
                    React.createElement("text", { x: 220, y: cy + 4, textAnchor: "middle", style: { fontSize: '7px', fontWeight: 'bold' }, fill: "#78350f" }, comp.value + "\u03A9"),
                    React.createElement("line", { x1: 240, y1: cy, x2: 260, y2: cy, stroke: "#1e293b", strokeWidth: 1.5 })
                  );
                }),
              d.components.length === 0 && React.createElement("text", { x: W / 2, y: H / 2, textAnchor: "middle", fill: "#94a3b8", style: { fontSize: '12px' } }, "Add components below"),
              React.createElement("circle", { cx: current > 0.01 ? 200 : -10, cy: 15, r: 4, fill: "#3b82f6" }),
              React.createElement("line", { x1: 380, y1: 20, x2: 380, y2: 140, stroke: "#1e293b", strokeWidth: 2 })
            ),
            React.createElement("div", { className: "flex gap-2 mb-3" },
              React.createElement("button", { onClick: () => upd('components', [...d.components, { type: 'resistor', value: 100, id: Date.now() }]), className: "px-3 py-1.5 bg-yellow-100 text-yellow-800 font-bold rounded-lg text-sm border border-yellow-300 hover:bg-yellow-200" }, "\u2795 Resistor"),
              React.createElement("button", { onClick: () => upd('components', [...d.components, { type: 'bulb', value: 50, id: Date.now() }]), className: "px-3 py-1.5 bg-amber-100 text-amber-800 font-bold rounded-lg text-sm border border-amber-300 hover:bg-amber-200" }, "\u{1F4A1} Bulb"),
              React.createElement("button", { onClick: () => upd('components', []), className: "px-3 py-1.5 bg-red-50 text-red-600 font-bold rounded-lg text-sm border border-red-200 hover:bg-red-100" }, "\u{1F5D1} Clear")
            ),
            React.createElement("div", { className: "bg-white rounded-xl border border-yellow-200 p-3" },
              React.createElement("div", { className: "flex items-center gap-3 mb-3" },
                React.createElement("span", { className: "text-xl" }, "\u{1F50B}"),
                React.createElement("input", { type: "range", min: 1, max: 24, step: 0.5, value: d.voltage, onChange: e => upd('voltage', parseFloat(e.target.value)), className: "flex-1 accent-yellow-600" }),
                React.createElement("span", { className: "font-bold text-yellow-700 w-12 text-right" }, d.voltage + "V")
              ),
              React.createElement("div", { className: "flex flex-wrap gap-2" },
                d.components.map((comp, i) => React.createElement("div", { key: comp.id, className: "flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200" },
                  React.createElement("span", null, comp.type === 'resistor' ? '\u2AE8' : '\u{1F4A1}'),
                  React.createElement("input", { type: "number", min: 1, max: 10000, value: comp.value, onChange: e => { const nc = [...d.components]; nc[i] = { ...nc[i], value: parseInt(e.target.value) || 1 }; upd('components', nc); }, className: "w-20 px-2 py-1 text-sm border rounded text-center font-mono" }),
                  React.createElement("span", { className: "text-xs text-slate-500" }, "\u03A9"),
                  React.createElement("button", { onClick: () => upd('components', d.components.filter((_, j) => j !== i)), className: "text-red-400 hover:text-red-600" }, "\u00D7")
                ))
              )
            ),
            React.createElement("div", { className: "mt-3 grid grid-cols-4 gap-2" },
              [{ label: 'Mode', val: mode, color: 'slate' }, { label: 'Resistance', val: totalR.toFixed(1) + '\u03A9', color: 'yellow' }, { label: 'Current', val: current.toFixed(3) + 'A', color: 'blue' }, { label: 'Power', val: power.toFixed(2) + 'W', color: 'red' }].map(m =>
                React.createElement("div", { key: m.label, className: "text-center p-2 bg-" + m.color + "-50 rounded-xl border border-" + m.color + "-200" },
                  React.createElement("p", { className: "text-[10px] font-bold text-" + m.color + "-600 uppercase" }, m.label),
                  React.createElement("p", { className: "text-sm font-bold text-" + m.color + "-800" }, m.val)
                )
              )
            ),
            d.components.length > 0 && React.createElement("div", { className: "mt-3 bg-yellow-50 rounded-xl border border-yellow-200 p-3" },
              React.createElement("p", { className: "text-[10px] font-bold text-yellow-700 uppercase tracking-wider mb-2" }, "\u26A1 Per-Component Analysis"),
              React.createElement("div", { className: "space-y-1" },
                d.components.map(function (comp, i) {
                  var compR = comp.value || 1;
                  var compI = mode === 'series' ? current : d.voltage / compR;
                  var compV = mode === 'series' ? current * compR : d.voltage;
                  var compP = compV * compI;
                  return React.createElement("div", { key: comp.id, className: "flex items-center gap-2 text-xs bg-white rounded-lg px-2 py-1 border" },
                    React.createElement("span", { className: "font-bold text-yellow-700 w-16" }, (comp.type === 'resistor' ? '\u2AE8 R' : '\uD83D\uDCA1 B') + (i + 1)),
                    React.createElement("span", { className: "text-slate-500 w-16" }, comp.value + '\u03A9'),
                    React.createElement("span", { className: "text-blue-600 w-20 font-mono" }, compV.toFixed(2) + 'V'),
                    React.createElement("span", { className: "text-emerald-600 w-20 font-mono" }, compI.toFixed(3) + 'A'),
                    React.createElement("span", { className: "text-red-600 w-20 font-mono font-bold" }, compP.toFixed(2) + 'W'),
                    comp.type === 'bulb' && React.createElement("span", { className: "text-yellow-500" }, compP > 10 ? '\uD83D\uDD06' : compP > 3 ? '\uD83D\uDCA1' : '\uD83D\uDD05')
                  );
                })
              ),
              React.createElement("div", { className: "mt-2 flex items-center gap-2 text-[10px] text-slate-400" },
                React.createElement("span", null, "\u2696 V = IR"),
                React.createElement("span", null, "\u2022"),
                React.createElement("span", null, "P = IV"),
                React.createElement("span", null, "\u2022"),
                React.createElement("span", null, mode === 'series' ? 'Series: same current through all' : 'Parallel: same voltage across all')
              )
            ),
            React.createElement("div", { className: "mt-3 bg-amber-50 rounded-xl border border-amber-200 p-3" },
              React.createElement("p", { className: "text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2" }, "\uD83C\uDFAF Circuit Challenge"),
              React.createElement("div", { className: "flex gap-2" },
                [
                  { label: 'Get 2A current', target: 2, type: 'current' },
                  { label: 'Get 0.5A current', target: 0.5, type: 'current' },
                  { label: 'Total R = 200\u03A9', target: 200, type: 'resistance' },
                ].map(function (ch) {
                  var actual = ch.type === 'current' ? current : totalR;
                  var close = Math.abs(actual - ch.target) < ch.target * 0.05;
                  return React.createElement("button", {
                    key: ch.label, onClick: function () {
                      if (close) { addToast('\u2705 Challenge complete! You hit ' + actual.toFixed(3) + ' (target: ' + ch.target + ')', 'success'); }
                      else { addToast('\uD83C\uDFAF Target: ' + ch.target + (ch.type === 'current' ? 'A' : '\u03A9') + ' | Current: ' + actual.toFixed(3) + '. Adjust components!', 'info'); }
                      upd('challenge', ch);
                    }, className: "px-2 py-1 rounded-lg text-[10px] font-bold border transition-all " + (close ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50')
                  }, (close ? '\u2705 ' : '\uD83C\uDFAF ') + ch.label);
                })
              )
            ),
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'ci-' + Date.now(), tool: 'circuit', label: d.components.length + ' parts ' + d.voltage + 'V ' + mode, data: { ...d, mode }, timestamp: Date.now() }]); addToast('\u{1F4F8} Circuit snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\u{1F4F8} Snapshot")
          )
        })(),

        stemLabTab === 'explore' && stemLabTool === 'dataPlot' && (() => {
          const d = labToolData.dataPlot;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, dataPlot: { ...prev.dataPlot, [key]: val } }));
          const W = 400, H = 300, pad = 40;
          const allX = d.points.map(p => p.x), allY = d.points.map(p => p.y);
          const xMin = allX.length ? Math.min(...allX) - 1 : 0, xMax = allX.length ? Math.max(...allX) + 1 : 10;
          const yMin = allY.length ? Math.min(...allY) - 1 : 0, yMax = allY.length ? Math.max(...allY) + 1 : 10;
          const toSX = x => pad + ((x - xMin) / (xMax - xMin || 1)) * (W - 2 * pad);
          const toSY = y => (H - pad) - ((y - yMin) / (yMax - yMin || 1)) * (H - 2 * pad);
          // Linear regression
          let slope = 0, intercept = 0, r2 = 0;
          if (d.points.length >= 2) {
            const n = d.points.length;
            const sumX = allX.reduce((s, v) => s + v, 0), sumY = allY.reduce((s, v) => s + v, 0);
            const sumXY = d.points.reduce((s, p) => s + p.x * p.y, 0), sumX2 = allX.reduce((s, v) => s + v * v, 0);
            slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
            intercept = (sumY - slope * sumX) / n;
            const yMean = sumY / n;
            const ssTot = allY.reduce((s, y) => s + (y - yMean) * (y - yMean), 0);
            const ssRes = d.points.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) * (p.y - (slope * p.x + intercept)), 0);
            r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
          }
          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-4" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "📊 Data Plotter"),
              React.createElement("label", { className: "ml-auto flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer" }, React.createElement("input", { type: "checkbox", checked: d.tableMode, onChange: e => upd("tableMode", e.target.checked), className: "accent-teal-600" }), "Table Input"), React.createElement("span", { className: "text-xs text-slate-400 ml-2" }, d.points.length + " pts")
            ),
            React.createElement("p", { className: "text-xs text-slate-400 italic -mt-2 mb-3" }, "Click to plot points. Auto-calculates linear regression and R-squared."),
            React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-2" },
              React.createElement("span", { className: "text-[10px] font-bold text-slate-400 self-center" }, "Datasets:"),
              [
                { label: '\uD83D\uDCCA Height vs Weight', pts: [{ x: 150, y: 50 }, { x: 155, y: 52 }, { x: 160, y: 58 }, { x: 165, y: 62 }, { x: 170, y: 68 }, { x: 175, y: 72 }, { x: 180, y: 78 }, { x: 185, y: 82 }, { x: 190, y: 88 }] },
                { label: '\uD83D\uDCDA Study vs Grade', pts: [{ x: 0, y: 55 }, { x: 1, y: 62 }, { x: 2, y: 68 }, { x: 3, y: 72 }, { x: 4, y: 78 }, { x: 5, y: 85 }, { x: 6, y: 88 }, { x: 7, y: 92 }, { x: 8, y: 95 }] },
                { label: '\uD83C\uDF21 Temp vs Ice Cream', pts: [{ x: 15, y: 20 }, { x: 18, y: 35 }, { x: 22, y: 45 }, { x: 25, y: 60 }, { x: 28, y: 70 }, { x: 30, y: 85 }, { x: 33, y: 90 }, { x: 35, y: 95 }] },
                { label: '\uD83C\uDFB2 Random (No Corr)', pts: Array.from({ length: 12 }, function () { return { x: Math.round(Math.random() * 10 * 10) / 10, y: Math.round(Math.random() * 10 * 10) / 10 }; }) },
              ].map(function (ds) {
                return React.createElement("button", { key: ds.label, onClick: function () { upd('points', ds.pts); }, className: "px-2 py-1 rounded-lg text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-all" }, ds.label);
              })
            ),
            React.createElement("svg", {
              viewBox: `0 0 ${W} ${H}`, className: "w-full bg-white rounded-xl border border-teal-200 cursor-crosshair", style: { maxHeight: "320px" },
              onClick: e => {
                const svg = e.currentTarget;
                const rect = svg.getBoundingClientRect();
                const sx = (e.clientX - rect.left) / rect.width * W;
                const sy = (e.clientY - rect.top) / rect.height * H;
                const x = Math.round((xMin + (sx - pad) / (W - 2 * pad) * (xMax - xMin)) * 10) / 10;
                const y = Math.round((yMin + ((H - pad - sy) / (H - 2 * pad)) * (yMax - yMin)) * 10) / 10;
                upd('points', [...d.points, { x, y }]);
              }
            },
              React.createElement("line", { x1: pad, y1: H - pad, x2: W - pad, y2: H - pad, stroke: "#94a3b8", strokeWidth: 1 }),
              React.createElement("line", { x1: pad, y1: pad, x2: pad, y2: H - pad, stroke: "#94a3b8", strokeWidth: 1 }),
              d.points.map((p, i) => React.createElement("circle", { key: i, cx: toSX(p.x), cy: toSY(p.y), r: 5, fill: "#0d9488", stroke: "#fff", strokeWidth: 1.5 })),
              d.points.length >= 2 && React.createElement("line", { x1: toSX(xMin), y1: toSY(slope * xMin + intercept), x2: toSX(xMax), y2: toSY(slope * xMax + intercept), stroke: "#ef4444", strokeWidth: 2, strokeDasharray: "6 3" })
            ),
            d.tableMode && React.createElement("div", { className: "mt-3 bg-slate-50 rounded-lg p-3" },
              React.createElement("div", { className: "flex gap-2 items-end mb-2" },
                React.createElement("div", null,
                  React.createElement("label", { className: "text-[10px] font-bold text-slate-400 block" }, "X"),
                  React.createElement("input", { type: "number", step: "0.1", id: "dp-x-input", className: "w-20 px-2 py-1 text-sm border rounded text-center font-mono", placeholder: "0" })
                ),
                React.createElement("div", null,
                  React.createElement("label", { className: "text-[10px] font-bold text-slate-400 block" }, "Y"),
                  React.createElement("input", { type: "number", step: "0.1", id: "dp-y-input", className: "w-20 px-2 py-1 text-sm border rounded text-center font-mono", placeholder: "0" })
                ),
                React.createElement("button", { onClick: () => { const xi = document.getElementById('dp-x-input'); const yi = document.getElementById('dp-y-input'); if (xi && yi && xi.value && yi.value) { upd('points', [...d.points, { x: parseFloat(xi.value), y: parseFloat(yi.value) }]); xi.value = ''; yi.value = ''; } }, className: "px-3 py-1 bg-teal-600 text-white font-bold rounded text-sm hover:bg-teal-700" }, "+ Add")
              ),
              d.points.length > 0 && React.createElement("div", { className: "max-h-24 overflow-y-auto text-xs font-mono text-slate-500" },
                d.points.map((p, i) => React.createElement("span", { key: i, className: "inline-block mr-2 bg-white px-1.5 py-0.5 rounded border mb-1" }, "(" + p.x + "," + p.y + ")"))
              )
            ),
            React.createElement("div", { className: "flex gap-3 mt-3" },
              React.createElement("button", { onClick: () => upd('points', d.points.slice(0, -1)), className: "px-3 py-1.5 bg-slate-100 text-slate-600 font-bold rounded-lg text-sm" }, "↩ Undo"),
              React.createElement("button", { onClick: () => upd('points', []), className: "px-3 py-1.5 bg-red-50 text-red-600 font-bold rounded-lg text-sm" }, "🗑 Clear"),
              d.points.length >= 2 && React.createElement("span", { className: "text-xs text-slate-500 self-center ml-auto" }, "y = " + slope.toFixed(2) + "x + " + intercept.toFixed(2) + " | r² = " + r2.toFixed(3))
            ),
            d.points.length >= 2 && React.createElement("div", { className: "mt-2 bg-white rounded-lg border p-2" },
              React.createElement("p", { className: "text-[10px] font-bold text-slate-500 mb-1" }, "Correlation Strength"),
              React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement("div", { className: "flex-1 h-3 bg-slate-100 rounded-full overflow-hidden" },
                  React.createElement("div", { style: { width: (Math.abs(r2) * 100) + '%', height: '100%', borderRadius: '9999px', backgroundColor: Math.abs(r2) > 0.8 ? '#22c55e' : Math.abs(r2) > 0.5 ? '#eab308' : Math.abs(r2) > 0.3 ? '#f97316' : '#ef4444', transition: 'all 0.5s' } })
                ),
                React.createElement("span", { className: "text-xs font-bold " + (Math.abs(r2) > 0.8 ? 'text-emerald-600' : Math.abs(r2) > 0.5 ? 'text-yellow-600' : Math.abs(r2) > 0.3 ? 'text-orange-600' : 'text-red-500') }, Math.abs(r2) > 0.9 ? '\u2B50 Very Strong' : Math.abs(r2) > 0.7 ? 'Strong' : Math.abs(r2) > 0.5 ? 'Moderate' : Math.abs(r2) > 0.3 ? 'Weak' : 'Very Weak'),
                React.createElement("span", { className: "text-[10px] text-slate-400" }, slope > 0 ? '\u2197 Positive' : slope < 0 ? '\u2198 Negative' : '\u2794 None')
              ),
              React.createElement("p", { className: "text-[10px] text-slate-400 mt-1 italic" }, r2 > 0.9 ? '\uD83D\uDCA1 Almost a perfect linear relationship!' : r2 > 0.7 ? '\uD83D\uDCA1 Strong trend \u2014 a linear model fits well.' : r2 > 0.4 ? '\uD83D\uDCA1 Some relationship, but other factors may be at play.' : '\uD83D\uDCA1 Weak or no linear relationship. Try a different model?')
            ),
            d.points && d.points.length >= 2 && React.createElement("div", { className: "mt-3 grid grid-cols-3 gap-2 text-center" },
              React.createElement("div", { className: "p-1.5 bg-teal-50 rounded-lg border border-teal-200" },
                React.createElement("p", { className: "text-[9px] font-bold text-teal-600 uppercase" }, "Mean"),
                React.createElement("p", { className: "text-sm font-bold text-teal-800" }, (d.points.reduce(function (s, p) { return s + p.y }, 0) / d.points.length).toFixed(2))
              ),
              React.createElement("div", { className: "p-1.5 bg-teal-50 rounded-lg border border-teal-200" },
                React.createElement("p", { className: "text-[9px] font-bold text-teal-600 uppercase" }, "Median"),
                React.createElement("p", { className: "text-sm font-bold text-teal-800" }, (function (ps) { var s = ps.map(function (p) { return p.y }).sort(function (a, b) { return a - b }); return s.length % 2 ? s[Math.floor(s.length / 2)] : ((s[s.length / 2 - 1] + s[s.length / 2]) / 2); })(d.points).toFixed(2))
              ),
              React.createElement("div", { className: "p-1.5 bg-teal-50 rounded-lg border border-teal-200" },
                React.createElement("p", { className: "text-[9px] font-bold text-teal-600 uppercase" }, "Std Dev"),
                React.createElement("p", { className: "text-sm font-bold text-teal-800" }, (function (ps) { var m = ps.reduce(function (s, p) { return s + p.y }, 0) / ps.length; return Math.sqrt(ps.reduce(function (s, p) { return s + Math.pow(p.y - m, 2) }, 0) / ps.length); })(d.points).toFixed(2))
              )
            ),
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'dp-' + Date.now(), tool: 'dataPlot', label: d.points.length + ' pts r²=' + r2.toFixed(2), data: { points: [...d.points] }, timestamp: Date.now() }]); addToast('📸 Data snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "📸 Snapshot")
          )
        })(),

        stemLabTab === 'explore' && stemLabTool === 'inequality' && (() => {
          const d = labToolData.inequality;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, inequality: { ...prev.inequality, [key]: val } }));
          // grade filter removed — all tools visible
          const W = 400, H = 100, pad = 30;
          const toSX = x => pad + ((x - d.range.min) / (d.range.max - d.range.min)) * (W - 2 * pad);
          const parseIneq = expr => { const m = expr.match(/([a-z])\s*([<>]=?|[≤≥])\s*(-?\d+\.?\d*)/); if (!m) return null; var op = m[2]; if (op === '≤') op = '<='; if (op === '≥') op = '>='; return { v: m[1], op: op, val: parseFloat(m[3]) }; };
          const ineq = parseIneq(d.expr);
          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-4" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "🎨 Inequality Grapher")
            ),
            React.createElement("p", { className: "text-xs text-slate-400 italic -mt-2 mb-3" }, "Type an inequality like x > 3 to visualize it on a number line."),
            React.createElement("div", { className: "flex items-center gap-2 mb-3" },
              React.createElement("input", { type: "text", value: d.expr, onChange: e => upd('expr', e.target.value), className: "px-4 py-2 border-2 border-fuchsia-300 rounded-lg font-mono text-lg text-center w-48 focus:ring-2 focus:ring-fuchsia-400 outline-none", placeholder: "x > 3" }),
              React.createElement("div", { className: "flex gap-1" },
                ['x > 3', 'x < -2', 'x >= 0', 'x <= 5'].map(ex => React.createElement("button", { key: ex, onClick: () => upd('expr', ex), className: "px-2 py-1 text-[10px] font-bold bg-fuchsia-50 text-fuchsia-600 rounded border border-fuchsia-200 hover:bg-fuchsia-100" }, ex))
              )
            ),
            React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, className: "w-full bg-white rounded-xl border border-fuchsia-200" },
              ineq && React.createElement("rect", { x: ineq.op.includes('>') ? toSX(ineq.val) : pad, y: 20, width: ineq.op.includes('>') ? W - pad - toSX(ineq.val) : toSX(ineq.val) - pad, height: 40, fill: "rgba(217,70,239,0.15)", rx: 4 }),
              React.createElement("line", { x1: pad, y1: 40, x2: W - pad, y2: 40, stroke: "#94a3b8", strokeWidth: 2 }),
              Array.from({ length: d.range.max - d.range.min + 1 }, (_, i) => d.range.min + i).map(n =>
                React.createElement("g", { key: n },
                  React.createElement("line", { x1: toSX(n), y1: 35, x2: toSX(n), y2: 45, stroke: "#64748b", strokeWidth: 1 }),
                  React.createElement("text", { x: toSX(n), y: 75, textAnchor: "middle", fill: "#64748b", style: { fontSize: '10px' } }, n)
                )
              ),
              ineq && React.createElement("circle", { cx: toSX(ineq.val), cy: 40, r: 6, fill: ineq.op.includes('=') ? '#d946ef' : 'white', stroke: "#d946ef", strokeWidth: 2.5 }),
              ineq && React.createElement("line", { x1: toSX(ineq.val) + (ineq.op.includes('>') ? 10 : -10), y1: 40, x2: ineq.op.includes('>') ? W - pad : pad, y2: 40, stroke: "#d946ef", strokeWidth: 3 }),
              ineq && ineq.op.includes('>') && React.createElement("polygon", { points: `${W - pad},40 ${W - pad - 12},32 ${W - pad - 12},48`, fill: "#d946ef" }),
              ineq && ineq.op.includes('<') && React.createElement("polygon", { points: `${pad},40 ${pad + 12},32 ${pad + 12},48`, fill: "#d946ef" }),
              React.createElement("polygon", { points: `${W - pad},40 ${W - pad - 8},35 ${W - pad - 8},45`, fill: "#94a3b8" }),
              React.createElement("polygon", { points: `${pad},40 ${pad + 8},35 ${pad + 8},45`, fill: "#94a3b8" })
            ),
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'iq-' + Date.now(), tool: 'inequality', label: d.expr, data: { ...d }, timestamp: Date.now() }]); addToast('📸 Inequality snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "📸 Snapshot")
          )
        })(),

        stemLabTab === 'explore' && stemLabTool === 'molecule' && (() => {
          const d = labToolData.molecule;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, molecule: { ...prev.molecule, [key]: val } }));
          const W = 400, H = 300;
          const mode = d.moleculeMode || 'viewer';
          // ── Periodic Table Data (118 elements) ──
          const ELEMENTS = [
            { n: 1, s: 'H', name: 'Hydrogen', cat: 'nonmetal', c: '#60a5fa' }, { n: 2, s: 'He', name: 'Helium', cat: 'noble', c: '#c084fc' },
            { n: 3, s: 'Li', name: 'Lithium', cat: 'alkali', c: '#f87171' }, { n: 4, s: 'Be', name: 'Beryllium', cat: 'alkaline', c: '#fbbf24' },
            { n: 5, s: 'B', name: 'Boron', cat: 'metalloid', c: '#34d399' }, { n: 6, s: 'C', name: 'Carbon', cat: 'nonmetal', c: '#60a5fa' },
            { n: 7, s: 'N', name: 'Nitrogen', cat: 'nonmetal', c: '#60a5fa' }, { n: 8, s: 'O', name: 'Oxygen', cat: 'nonmetal', c: '#60a5fa' },
            { n: 9, s: 'F', name: 'Fluorine', cat: 'halogen', c: '#2dd4bf' }, { n: 10, s: 'Ne', name: 'Neon', cat: 'noble', c: '#c084fc' },
            { n: 11, s: 'Na', name: 'Sodium', cat: 'alkali', c: '#f87171' }, { n: 12, s: 'Mg', name: 'Magnesium', cat: 'alkaline', c: '#fbbf24' },
            { n: 13, s: 'Al', name: 'Aluminum', cat: 'metal', c: '#94a3b8' }, { n: 14, s: 'Si', name: 'Silicon', cat: 'metalloid', c: '#34d399' },
            { n: 15, s: 'P', name: 'Phosphorus', cat: 'nonmetal', c: '#60a5fa' }, { n: 16, s: 'S', name: 'Sulfur', cat: 'nonmetal', c: '#60a5fa' },
            { n: 17, s: 'Cl', name: 'Chlorine', cat: 'halogen', c: '#2dd4bf' }, { n: 18, s: 'Ar', name: 'Argon', cat: 'noble', c: '#c084fc' },
            { n: 19, s: 'K', name: 'Potassium', cat: 'alkali', c: '#f87171' }, { n: 20, s: 'Ca', name: 'Calcium', cat: 'alkaline', c: '#fbbf24' },
            { n: 21, s: 'Sc', name: 'Scandium', cat: 'transition', c: '#fb923c' }, { n: 22, s: 'Ti', name: 'Titanium', cat: 'transition', c: '#fb923c' },
            { n: 23, s: 'V', name: 'Vanadium', cat: 'transition', c: '#fb923c' }, { n: 24, s: 'Cr', name: 'Chromium', cat: 'transition', c: '#fb923c' },
            { n: 25, s: 'Mn', name: 'Manganese', cat: 'transition', c: '#fb923c' }, { n: 26, s: 'Fe', name: 'Iron', cat: 'transition', c: '#fb923c' },
            { n: 27, s: 'Co', name: 'Cobalt', cat: 'transition', c: '#fb923c' }, { n: 28, s: 'Ni', name: 'Nickel', cat: 'transition', c: '#fb923c' },
            { n: 29, s: 'Cu', name: 'Copper', cat: 'transition', c: '#fb923c' }, { n: 30, s: 'Zn', name: 'Zinc', cat: 'transition', c: '#fb923c' },
            { n: 31, s: 'Ga', name: 'Gallium', cat: 'metal', c: '#94a3b8' }, { n: 32, s: 'Ge', name: 'Germanium', cat: 'metalloid', c: '#34d399' },
            { n: 33, s: 'As', name: 'Arsenic', cat: 'metalloid', c: '#34d399' }, { n: 34, s: 'Se', name: 'Selenium', cat: 'nonmetal', c: '#60a5fa' },
            { n: 35, s: 'Br', name: 'Bromine', cat: 'halogen', c: '#2dd4bf' }, { n: 36, s: 'Kr', name: 'Krypton', cat: 'noble', c: '#c084fc' },
            { n: 37, s: 'Rb', name: 'Rubidium', cat: 'alkali', c: '#f87171' }, { n: 38, s: 'Sr', name: 'Strontium', cat: 'alkaline', c: '#fbbf24' },
            { n: 39, s: 'Y', name: 'Yttrium', cat: 'transition', c: '#fb923c' }, { n: 40, s: 'Zr', name: 'Zirconium', cat: 'transition', c: '#fb923c' },
            { n: 41, s: 'Nb', name: 'Niobium', cat: 'transition', c: '#fb923c' }, { n: 42, s: 'Mo', name: 'Molybdenum', cat: 'transition', c: '#fb923c' },
            { n: 43, s: 'Tc', name: 'Technetium', cat: 'transition', c: '#fb923c' }, { n: 44, s: 'Ru', name: 'Ruthenium', cat: 'transition', c: '#fb923c' },
            { n: 45, s: 'Rh', name: 'Rhodium', cat: 'transition', c: '#fb923c' }, { n: 46, s: 'Pd', name: 'Palladium', cat: 'transition', c: '#fb923c' },
            { n: 47, s: 'Ag', name: 'Silver', cat: 'transition', c: '#fb923c' }, { n: 48, s: 'Cd', name: 'Cadmium', cat: 'transition', c: '#fb923c' },
            { n: 49, s: 'In', name: 'Indium', cat: 'metal', c: '#94a3b8' }, { n: 50, s: 'Sn', name: 'Tin', cat: 'metal', c: '#94a3b8' },
            { n: 51, s: 'Sb', name: 'Antimony', cat: 'metalloid', c: '#34d399' }, { n: 52, s: 'Te', name: 'Tellurium', cat: 'metalloid', c: '#34d399' },
            { n: 53, s: 'I', name: 'Iodine', cat: 'halogen', c: '#2dd4bf' }, { n: 54, s: 'Xe', name: 'Xenon', cat: 'noble', c: '#c084fc' },
            { n: 55, s: 'Cs', name: 'Cesium', cat: 'alkali', c: '#f87171' }, { n: 56, s: 'Ba', name: 'Barium', cat: 'alkaline', c: '#fbbf24' },
            { n: 57, s: 'La', name: 'Lanthanide', cat: 'lanthanide', c: '#a78bfa' }, { n: 58, s: 'Ce', name: 'Cerium', cat: 'lanthanide', c: '#a78bfa' },
            { n: 59, s: 'Pr', name: 'Praseodymium', cat: 'lanthanide', c: '#a78bfa' }, { n: 60, s: 'Nd', name: 'Neodymium', cat: 'lanthanide', c: '#a78bfa' },
            { n: 61, s: 'Pm', name: 'Promethium', cat: 'lanthanide', c: '#a78bfa' }, { n: 62, s: 'Sm', name: 'Samarium', cat: 'lanthanide', c: '#a78bfa' },
            { n: 63, s: 'Eu', name: 'Europium', cat: 'lanthanide', c: '#a78bfa' }, { n: 64, s: 'Gd', name: 'Gadolinium', cat: 'lanthanide', c: '#a78bfa' },
            { n: 65, s: 'Tb', name: 'Terbium', cat: 'lanthanide', c: '#a78bfa' }, { n: 66, s: 'Dy', name: 'Dysprosium', cat: 'lanthanide', c: '#a78bfa' },
            { n: 67, s: 'Ho', name: 'Holmium', cat: 'lanthanide', c: '#a78bfa' }, { n: 68, s: 'Er', name: 'Erbium', cat: 'lanthanide', c: '#a78bfa' },
            { n: 69, s: 'Tm', name: 'Thulium', cat: 'lanthanide', c: '#a78bfa' }, { n: 70, s: 'Yb', name: 'Ytterbium', cat: 'lanthanide', c: '#a78bfa' },
            { n: 71, s: 'Lu', name: 'Lutetium', cat: 'lanthanide', c: '#a78bfa' },
            { n: 72, s: 'Hf', name: 'Hafnium', cat: 'transition', c: '#fb923c' }, { n: 73, s: 'Ta', name: 'Tantalum', cat: 'transition', c: '#fb923c' },
            { n: 74, s: 'W', name: 'Tungsten', cat: 'transition', c: '#fb923c' }, { n: 75, s: 'Re', name: 'Rhenium', cat: 'transition', c: '#fb923c' },
            { n: 76, s: 'Os', name: 'Osmium', cat: 'transition', c: '#fb923c' }, { n: 77, s: 'Ir', name: 'Iridium', cat: 'transition', c: '#fb923c' },
            { n: 78, s: 'Pt', name: 'Platinum', cat: 'transition', c: '#fb923c' }, { n: 79, s: 'Au', name: 'Gold', cat: 'transition', c: '#fb923c' },
            { n: 80, s: 'Hg', name: 'Mercury', cat: 'transition', c: '#fb923c' }, { n: 81, s: 'Tl', name: 'Thallium', cat: 'metal', c: '#94a3b8', gravity: '0.38g', atmosphere: 'None \u2014 no significant atmosphere', surface: 'Heavily cratered, resembling the Moon', notableFeatures: ['Caloris Basin (1,550 km crater)', 'Ice in permanently shadowed craters', 'Fastest orbital speed: 47 km/s'], skyColor: '#000000', terrainColor: '#7a7a7a', terrainType: 'cratered', surfaceDesc: 'Grey cratered wasteland under a black sky. The Sun appears 3x larger than on Earth.' },
            { n: 82, s: 'Pb', name: 'Lead', cat: 'metal', c: '#94a3b8' }, { n: 83, s: 'Bi', name: 'Bismuth', cat: 'metal', c: '#94a3b8' },
            { n: 84, s: 'Po', name: 'Polonium', cat: 'metalloid', c: '#34d399' }, { n: 85, s: 'At', name: 'Astatine', cat: 'halogen', c: '#2dd4bf' },
            { n: 86, s: 'Rn', name: 'Radon', cat: 'noble', c: '#c084fc' },
            { n: 87, s: 'Fr', name: 'Francium', cat: 'alkali', c: '#f87171' }, { n: 88, s: 'Ra', name: 'Radium', cat: 'alkaline', c: '#fbbf24' },
            { n: 89, s: 'Ac', name: 'Actinide', cat: 'actinide', c: '#f472b6' }, { n: 90, s: 'Th', name: 'Thorium', cat: 'actinide', c: '#f472b6' },
            { n: 91, s: 'Pa', name: 'Protactinium', cat: 'actinide', c: '#f472b6' }, { n: 92, s: 'U', name: 'Uranium', cat: 'actinide', c: '#f472b6' },
            { n: 93, s: 'Np', name: 'Neptunium', cat: 'actinide', c: '#f472b6' }, { n: 94, s: 'Pu', name: 'Plutonium', cat: 'actinide', c: '#f472b6' },
            { n: 95, s: 'Am', name: 'Americium', cat: 'actinide', c: '#f472b6' }, { n: 96, s: 'Cm', name: 'Curium', cat: 'actinide', c: '#f472b6' },
            { n: 97, s: 'Bk', name: 'Berkelium', cat: 'actinide', c: '#f472b6' }, { n: 98, s: 'Cf', name: 'Californium', cat: 'actinide', c: '#f472b6' },
            { n: 99, s: 'Es', name: 'Einsteinium', cat: 'actinide', c: '#f472b6' }, { n: 100, s: 'Fm', name: 'Fermium', cat: 'actinide', c: '#f472b6' },
            { n: 101, s: 'Md', name: 'Mendelevium', cat: 'actinide', c: '#f472b6' }, { n: 102, s: 'No', name: 'Nobelium', cat: 'actinide', c: '#f472b6' },
            { n: 103, s: 'Lr', name: 'Lawrencium', cat: 'actinide', c: '#f472b6' },
            { n: 104, s: 'Rf', name: 'Rutherfordium', cat: 'transition', c: '#fb923c' }, { n: 105, s: 'Db', name: 'Dubnium', cat: 'transition', c: '#fb923c' },
            { n: 106, s: 'Sg', name: 'Seaborgium', cat: 'transition', c: '#fb923c' }, { n: 107, s: 'Bh', name: 'Bohrium', cat: 'transition', c: '#fb923c' },
            { n: 108, s: 'Hs', name: 'Hassium', cat: 'transition', c: '#fb923c' }, { n: 109, s: 'Mt', name: 'Meitnerium', cat: 'transition', c: '#fb923c' },
            { n: 110, s: 'Ds', name: 'Darmstadtium', cat: 'transition', c: '#fb923c' }, { n: 111, s: 'Rg', name: 'Roentgenium', cat: 'transition', c: '#fb923c' },
            { n: 112, s: 'Cn', name: 'Copernicium', cat: 'transition', c: '#fb923c' }, { n: 113, s: 'Nh', name: 'Nihonium', cat: 'metal', c: '#94a3b8' },
            { n: 114, s: 'Fl', name: 'Flerovium', cat: 'metal', c: '#94a3b8' }, { n: 115, s: 'Mc', name: 'Moscovium', cat: 'metal', c: '#94a3b8' },
            { n: 116, s: 'Lv', name: 'Livermorium', cat: 'metal', c: '#94a3b8' }, { n: 117, s: 'Ts', name: 'Tennessine', cat: 'halogen', c: '#2dd4bf' },
            { n: 118, s: 'Og', name: 'Oganesson', cat: 'noble', c: '#c084fc' }
          ];

          // ── Element Details (descriptions, uses, compounds) ──
          const ELEMENT_DETAILS = {
            H: { desc: 'Lightest element; fuels stars via fusion', uses: ['Fuel cells', 'Rocket propellant', 'Ammonia production'], compounds: ['H₂O (Water)', 'HCl (Hydrochloric Acid)', 'NH₃ (Ammonia)', 'CH₄ (Methane)'] },
            He: { desc: 'Inert noble gas; 2nd most abundant in universe', uses: ['Balloons & blimps', 'MRI coolant', 'Deep-sea diving gas'], compounds: ['None (noble gas — does not form compounds)'] },
            Li: { desc: 'Lightest metal; soft enough to cut with a knife', uses: ['Rechargeable batteries', 'Mood-stabilizing medication', 'Ceramics & glass'], compounds: ['LiOH (Lithium Hydroxide)', 'Li₂CO₃ (Lithium Carbonate)'] },
            Be: { desc: 'Rare, toxic metal that is very stiff and light', uses: ['Aerospace alloys', 'X-ray windows', 'Satellite components'], compounds: ['BeO (Beryllium Oxide)'] },
            B: { desc: 'Metalloid essential for plant growth', uses: ['Borosilicate glass (Pyrex)', 'Cleaning products (borax)', 'Semiconductors'], compounds: ['B₂O₃ (Boron Trioxide)', 'H₃BO₃ (Boric Acid)'] },
            C: { desc: 'Basis of all known life; forms diamond & graphite', uses: ['Steel production', 'Graphite pencils', 'Carbon fiber composites'], compounds: ['CO₂ (Carbon Dioxide)', 'CH₄ (Methane)', 'C₆H₁₂O₆ (Glucose)', 'CaCO₃ (Limestone)'] },
            N: { desc: 'Makes up 78% of Earth\'s atmosphere', uses: ['Fertilizers', 'Explosives (TNT)', 'Food preservation'], compounds: ['NH₃ (Ammonia)', 'NO₂ (Nitrogen Dioxide)', 'N₂O (Laughing Gas)', 'HNO₃ (Nitric Acid)'] },
            O: { desc: 'Essential for respiration; most abundant element in Earth\'s crust', uses: ['Medical oxygen', 'Welding & cutting', 'Water purification'], compounds: ['H₂O (Water)', 'CO₂ (Carbon Dioxide)', 'Fe₂O₃ (Rust)', 'O₃ (Ozone)'] },
            F: { desc: 'Most reactive and electronegative element', uses: ['Toothpaste (fluoride)', 'Teflon coatings', 'Refrigerants'], compounds: ['HF (Hydrofluoric Acid)', 'NaF (Sodium Fluoride)', 'CF₄ (Carbon Tetrafluoride)'] },
            Ne: { desc: 'Produces iconic reddish-orange glow in signs', uses: ['Neon signs', 'High-voltage indicators', 'Laser technology'], compounds: ['None (noble gas)'] },
            Na: { desc: 'Soft, silvery metal that reacts explosively with water', uses: ['Table salt (NaCl)', 'Street lighting', 'Baking soda'], compounds: ['NaCl (Table Salt)', 'NaOH (Lye)', 'NaHCO₃ (Baking Soda)', 'Na₂CO₃ (Washing Soda)'] },
            Mg: { desc: 'Lightweight metal that burns with brilliant white flame', uses: ['Alloy wheels', 'Fireworks & flares', 'Antacid tablets'], compounds: ['MgO (Magnesium Oxide)', 'MgSO₄ (Epsom Salt)', 'Mg(OH)₂ (Milk of Magnesia)'] },
            Al: { desc: 'Most abundant metal in Earth\'s crust', uses: ['Cans & foil', 'Aircraft frames', 'Window frames'], compounds: ['Al₂O₃ (Alumina)', 'AlCl₃ (Aluminum Chloride)'] },
            Si: { desc: 'Semiconductor that powers the digital age', uses: ['Computer chips', 'Solar panels', 'Glass & concrete'], compounds: ['SiO₂ (Sand/Quartz)', 'SiC (Silicon Carbide)'] },
            P: { desc: 'Essential for DNA and bones; glows in the dark', uses: ['Fertilizers', 'Matches', 'Detergents'], compounds: ['H₃PO₄ (Phosphoric Acid)', 'Ca₃(PO₄)₂ (Bone mineral)'] },
            S: { desc: 'Yellow element with distinctive rotten-egg smell', uses: ['Vulcanizing rubber', 'Sulfuric acid production', 'Gunpowder'], compounds: ['H₂SO₄ (Sulfuric Acid)', 'SO₂ (Sulfur Dioxide)', 'H₂S (Hydrogen Sulfide)'] },
            Cl: { desc: 'Greenish-yellow gas used to purify water', uses: ['Water treatment', 'PVC plastic', 'Bleach & disinfectants'], compounds: ['NaCl (Table Salt)', 'HCl (Hydrochloric Acid)', 'NaOCl (Bleach)'] },
            Ar: { desc: 'Third most abundant gas in atmosphere', uses: ['Welding shield gas', 'Light bulb filling', 'Window insulation'], compounds: ['None (noble gas)'] },
            K: { desc: 'Essential nutrient found in bananas', uses: ['Fertilizers (potash)', 'Soap making', 'Food preservation'], compounds: ['KCl (Potassium Chloride)', 'KOH (Potassium Hydroxide)', 'KNO₃ (Saltpeter)'] },
            Ca: { desc: 'Builds bones and teeth; 5th most abundant element', uses: ['Cement & concrete', 'Chalk & plaster', 'Dietary supplement'], compounds: ['CaCO₃ (Limestone/Chalk)', 'CaO (Quicklime)', 'Ca(OH)₂ (Slaked Lime)', 'CaSO₄ (Gypsum)'] },
            Fe: { desc: 'Most used metal; core of Earth is mostly iron', uses: ['Steel construction', 'Cast iron cookware', 'Magnetic devices'], compounds: ['Fe₂O₃ (Rust)', 'FeSO₄ (Iron Supplement)', 'Fe₃O₄ (Magnetite)'] },
            Cu: { desc: 'Reddish metal used since the Bronze Age', uses: ['Electrical wiring', 'Plumbing pipes', 'Coins'], compounds: ['CuSO₄ (Blue Vitriol)', 'CuO (Copper Oxide)', 'Cu₂O (Cuprous Oxide)'] },
            Zn: { desc: 'Bluish-white metal that prevents rust', uses: ['Galvanizing steel', 'Batteries', 'Sunscreen (zinc oxide)'], compounds: ['ZnO (Zinc Oxide)', 'ZnS (Zinc Sulfide)', 'ZnCl₂ (Zinc Chloride)'] },
            Ag: { desc: 'Best conductor of electricity among all metals', uses: ['Jewelry & silverware', 'Photography', 'Electronics'], compounds: ['AgNO₃ (Silver Nitrate)', 'AgCl (Silver Chloride)', 'Ag₂O (Silver Oxide)'] },
            Au: { desc: 'Dense, soft, shiny precious metal — never rusts', uses: ['Jewelry', 'Electronics (connectors)', 'Currency reserves'], compounds: ['AuCl₃ (Gold Chloride) — gold rarely forms compounds'] },
            Ti: { desc: 'Strong as steel but 45% lighter', uses: ['Aircraft & spacecraft', 'Joint replacements', 'Titanium white paint'], compounds: ['TiO₂ (Titanium Dioxide)', 'TiCl₄ (Titanium Tetrachloride)'] },
            Cr: { desc: 'Shiny metal that gives rubies their red color', uses: ['Chrome plating', 'Stainless steel', 'Leather tanning'], compounds: ['Cr₂O₃ (Chromium Oxide)', 'K₂Cr₂O₇ (Potassium Dichromate)'] },
            Mn: { desc: 'Essential for steel production and bone health', uses: ['Steel alloys', 'Alkaline batteries', 'Glass decolorizer'], compounds: ['MnO₂ (Manganese Dioxide)', 'KMnO₄ (Potassium Permanganate)'] },
            Ni: { desc: 'Corrosion-resistant metal used in coins worldwide', uses: ['Stainless steel', 'Rechargeable batteries', 'Coins'], compounds: ['NiO (Nickel Oxide)', 'NiSO₄ (Nickel Sulfate)'] },
            Br: { desc: 'Only non-metal liquid at room temperature', uses: ['Flame retardants', 'Photography', 'Water purification'], compounds: ['NaBr (Sodium Bromide)', 'HBr (Hydrobromic Acid)'] },
            I: { desc: 'Essential trace element for thyroid function', uses: ['Antiseptic (tincture)', 'Iodized salt', 'Medical imaging'], compounds: ['KI (Potassium Iodide)', 'HI (Hydroiodic Acid)'] },
            Pt: { desc: 'Precious metal rarer than gold', uses: ['Catalytic converters', 'Jewelry', 'Anti-cancer drugs'], compounds: ['PtCl₂ (Platinum Chloride)', 'H₂PtCl₆ (Chloroplatinic Acid)'] },
            U: { desc: 'Dense radioactive metal that powers nuclear plants', uses: ['Nuclear power', 'Nuclear weapons', 'Radiation shielding'], compounds: ['UO₂ (Uranium Dioxide)', 'UF₆ (Uranium Hexafluoride)'] },
            Hg: { desc: 'Only metal liquid at room temperature', uses: ['Thermometers (historic)', 'Fluorescent lights', 'Dental amalgams'], compounds: ['HgCl₂ (Mercury Chloride)', 'HgO (Mercury Oxide)'] },
            Pb: { desc: 'Dense, soft metal once used in pipes & paint', uses: ['Car batteries', 'Radiation shielding', 'Solder (lead-free now)'], compounds: ['PbO (Lead Oxide)', 'PbSO₄ (Lead Sulfate)'] },
            Sn: { desc: 'Soft, silvery metal used since the Bronze Age', uses: ['Tin cans (coating)', 'Solder', 'Bronze alloy'], compounds: ['SnO₂ (Tin Oxide)', 'SnCl₂ (Tin Chloride)'] },
            W: { desc: 'Has the highest melting point of all metals', uses: ['Light bulb filaments', 'Drill bits & cutting tools', 'Military armor'], compounds: ['WO₃ (Tungsten Trioxide)', 'WC (Tungsten Carbide)'] },
          };
          const getElementDetail = (sym) => ELEMENT_DETAILS[sym] || null;
          const getElementCompounds = (sym) => COMPOUNDS.filter(c => Object.keys(c.recipe).includes(sym));

          const getEl = (sym) => ELEMENTS.find(e => e.s === sym);
          // ── Periodic Table layout (row, col) ──
          const PT_LAYOUT = [
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
            [3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 6, 7, 8, 9, 10],
            [11, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 14, 15, 16, 17, 18],
            [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
            [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54],
            [55, 56, 0, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86],
            [87, 88, 0, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118],
            [],
            [0, 0, 0, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71],
            [0, 0, 0, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103]
          ];
          // ── Compound Recipes ──
          const COMPOUNDS = [
            { name: 'Water', formula: 'H\u2082O', recipe: { H: 2, O: 1 }, desc: 'Essential for life', emoji: '\uD83D\uDCA7' },
            { name: 'Carbon Dioxide', formula: 'CO\u2082', recipe: { C: 1, O: 2 }, desc: 'Greenhouse gas', emoji: '\uD83C\uDF2B\uFE0F' },
            { name: 'Table Salt', formula: 'NaCl', recipe: { Na: 1, Cl: 1 }, desc: 'Sodium chloride', emoji: '\uD83E\uDDC2' },
            { name: 'Ammonia', formula: 'NH\u2083', recipe: { N: 1, H: 3 }, desc: 'Cleaning agent', emoji: '\uD83E\uDDEA' },
            { name: 'Methane', formula: 'CH\u2084', recipe: { C: 1, H: 4 }, desc: 'Natural gas', emoji: '\uD83D\uDD25' },
            { name: 'Hydrogen Peroxide', formula: 'H\u2082O\u2082', recipe: { H: 2, O: 2 }, desc: 'Disinfectant', emoji: '\uD83E\uDE79' },
            { name: 'Ethanol', formula: 'C\u2082H\u2085OH', recipe: { C: 2, H: 6, O: 1 }, desc: 'Alcohol', emoji: '\uD83C\uDF7A' },
            { name: 'Sulfuric Acid', formula: 'H\u2082SO\u2084', recipe: { H: 2, S: 1, O: 4 }, desc: 'Battery acid', emoji: '\u26A0\uFE0F' },
            { name: 'Glucose', formula: 'C\u2086H\u2081\u2082O\u2086', recipe: { C: 6, H: 12, O: 6 }, desc: 'Blood sugar', emoji: '\uD83C\uDF6C' },
            { name: 'Baking Soda', formula: 'NaHCO\u2083', recipe: { Na: 1, H: 1, C: 1, O: 3 }, desc: 'Sodium bicarbonate', emoji: '\uD83E\uDDC1' },
            { name: 'Calcium Carbonate', formula: 'CaCO\u2083', recipe: { Ca: 1, C: 1, O: 3 }, desc: 'Chalk & marble', emoji: '\uD83E\uDEA8' },
            { name: 'Iron Oxide', formula: 'Fe\u2082O\u2083', recipe: { Fe: 2, O: 3 }, desc: 'Rust', emoji: '\uD83D\uDFE5' },
            { name: 'Sodium Hydroxide', formula: 'NaOH', recipe: { Na: 1, O: 1, H: 1 }, desc: 'Lye / caustic soda', emoji: '\uD83E\uDDEA' },
            { name: 'Hydrochloric Acid', formula: 'HCl', recipe: { H: 1, Cl: 1 }, desc: 'Stomach acid', emoji: '\uD83E\uDE79' },
            { name: 'Acetic Acid', formula: 'CH\u2083COOH', recipe: { C: 2, H: 4, O: 2 }, desc: 'Vinegar', emoji: '\uD83E\uDD4B' },
            { name: 'Nitrogen Dioxide', formula: 'NO\u2082', recipe: { N: 1, O: 2 }, desc: 'Brown smog gas', emoji: '\uD83C\uDF2B\uFE0F' },
            { name: 'Sulfur Dioxide', formula: 'SO\u2082', recipe: { S: 1, O: 2 }, desc: 'Acid rain precursor', emoji: '\uD83C\uDF27\uFE0F' },
            { name: 'Ozone', formula: 'O\u2083', recipe: { O: 3 }, desc: 'UV shield', emoji: '\uD83D\uDEE1\uFE0F' },
            { name: 'Laughing Gas', formula: 'N\u2082O', recipe: { N: 2, O: 1 }, desc: 'Nitrous oxide', emoji: '\uD83D\uDE02' },
            { name: 'Silicon Dioxide', formula: 'SiO\u2082', recipe: { Si: 1, O: 2 }, desc: 'Sand & glass', emoji: '\uD83C\uDFD6\uFE0F' },
          ];
          const selectedEls = d.selectedElements || {};
          const discovered = d.discoveredCompounds || [];
          const addElement = (sym) => { const cur = { ...selectedEls }; cur[sym] = (cur[sym] || 0) + 1; upd('selectedElements', cur); };
          const removeElement = (sym) => { const cur = { ...selectedEls }; if (cur[sym] > 1) cur[sym]--; else delete cur[sym]; upd('selectedElements', cur); };
          const clearElements = () => upd('selectedElements', {});
          const tryCraft = () => {
            const match = COMPOUNDS.find(c => {
              const rKeys = Object.keys(c.recipe); const sKeys = Object.keys(selectedEls);
              if (rKeys.length !== sKeys.length) return false;
              return rKeys.every(k => selectedEls[k] === c.recipe[k]);
            });
            if (match) {
              const isNew = !discovered.includes(match.formula);
              upd('craftResult', { success: true, compound: match, isNew });
              if (isNew) upd('discoveredCompounds', [...discovered, match.formula]);
            } else {
              upd('craftResult', { success: false });
            }
          };
          const catColors = { nonmetal: 'bg-blue-100 text-blue-700 border-blue-200', noble: 'bg-purple-100 text-purple-700 border-purple-200', alkali: 'bg-red-100 text-red-700 border-red-200', alkaline: 'bg-yellow-100 text-yellow-700 border-yellow-200', transition: 'bg-orange-100 text-orange-700 border-orange-200', metal: 'bg-slate-200 text-slate-700 border-slate-300', metalloid: 'bg-emerald-100 text-emerald-700 border-emerald-200', halogen: 'bg-teal-100 text-teal-700 border-teal-200', lanthanide: 'bg-violet-100 text-violet-700 border-violet-200', actinide: 'bg-pink-100 text-pink-700 border-pink-200' };
          // ── Molecule Viewer presets ──
          const viewerPresets = [
            { name: 'H\u2082O', atoms: [{ el: 'O', x: 200, y: 120, color: '#ef4444' }, { el: 'H', x: 140, y: 190, color: '#60a5fa' }, { el: 'H', x: 260, y: 190, color: '#60a5fa' }], bonds: [[0, 1], [0, 2]], formula: 'H2O' },
            { name: 'CO\u2082', atoms: [{ el: 'C', x: 200, y: 150, color: '#1e293b' }, { el: 'O', x: 120, y: 150, color: '#ef4444' }, { el: 'O', x: 280, y: 150, color: '#ef4444' }], bonds: [[0, 1], [0, 2]], formula: 'CO2' },
            { name: 'CH\u2084', atoms: [{ el: 'C', x: 200, y: 150, color: '#1e293b' }, { el: 'H', x: 200, y: 80, color: '#60a5fa' }, { el: 'H', x: 270, y: 180, color: '#60a5fa' }, { el: 'H', x: 130, y: 180, color: '#60a5fa' }, { el: 'H', x: 200, y: 220, color: '#60a5fa' }], bonds: [[0, 1], [0, 2], [0, 3], [0, 4]], formula: 'CH4' },
            { name: 'NaCl', atoms: [{ el: 'Na', x: 160, y: 150, color: '#a855f7' }, { el: 'Cl', x: 240, y: 150, color: '#22c55e' }], bonds: [[0, 1]], formula: 'NaCl' },
            { name: 'NH\u2083', atoms: [{ el: 'N', x: 200, y: 110, color: '#3b82f6' }, { el: 'H', x: 140, y: 185, color: '#94a3b8' }, { el: 'H', x: 200, y: 210, color: '#94a3b8' }, { el: 'H', x: 260, y: 185, color: '#94a3b8' }], bonds: [[0, 1], [0, 2], [0, 3]], formula: 'NH3' },
          ];
          return React.createElement("div", { className: "max-w-4xl mx-auto animate-in fade-in duration-200" },
            // Header
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83D\uDD2C Molecule Lab"),
              discovered.length > 0 && React.createElement("span", { className: "ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full" }, "\uD83E\uDDEA " + discovered.length + "/" + COMPOUNDS.length + " discovered")
            ),
            // Mode tabs
            React.createElement("div", { className: "flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl" },
              [['viewer', '\uD83D\uDD2C Viewer'], ['creator', '\u2697\uFE0F Compound Creator'], ['table', '\uD83D\uDDC2\uFE0F Periodic Table']].map(([m, label]) =>
                React.createElement("button", { key: m, onClick: () => upd('moleculeMode', m), className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (mode === m ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700') }, label)
              )
            ),
            // ── Viewer Mode ──
            mode === 'viewer' && React.createElement("div", null,
              React.createElement("div", { className: "flex gap-1 mb-3 flex-wrap" }, viewerPresets.map(p => React.createElement("button", { key: p.name, onClick: () => { upd('atoms', p.atoms.map(a => ({ ...a }))); upd('bonds', [...p.bonds]); upd('formula', p.formula); }, className: "px-2 py-1 rounded-lg text-xs font-bold " + (d.formula === p.formula ? 'bg-stone-700 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200') }, p.name))),
              React.createElement("svg", { viewBox: "0 0 " + W + " " + H, className: "w-full bg-gradient-to-b from-slate-50 to-white rounded-xl border border-stone-200", style: { maxHeight: "300px" }, onMouseMove: e => { if (d.dragging !== null && d.dragging !== undefined) { const svg = e.currentTarget; const rect = svg.getBoundingClientRect(); const nx = (e.clientX - rect.left) / rect.width * W; const ny = (e.clientY - rect.top) / rect.height * H; const na = d.atoms.map((a, i) => i === d.dragging ? { ...a, x: Math.round(nx), y: Math.round(ny) } : a); upd("atoms", na); } }, onMouseUp: () => upd("dragging", null), onMouseLeave: () => upd("dragging", null) },
                (d.bonds || []).map((b, i) => d.atoms[b[0]] && d.atoms[b[1]] ? React.createElement("line", { key: 'b' + i, x1: d.atoms[b[0]].x, y1: d.atoms[b[0]].y, x2: d.atoms[b[1]].x, y2: d.atoms[b[1]].y, stroke: "#94a3b8", strokeWidth: 4, strokeLinecap: "round" }) : null),
                (d.atoms || []).map((a, i) => React.createElement("g", { key: i },
                  React.createElement("circle", { cx: a.x, cy: a.y, r: 24, fill: a.color || '#64748b', stroke: '#fff', strokeWidth: 3, style: { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))', cursor: 'grab' }, onMouseDown: e => { e.preventDefault(); upd('dragging', i); } }),
                  React.createElement("text", { x: a.x, y: a.y + 5, textAnchor: "middle", fill: "white", style: { fontSize: '14px', fontWeight: 'bold' } }, a.el)
                ))
              ),
              React.createElement("div", { className: "mt-2 text-center" },
                React.createElement("span", { className: "text-sm font-bold text-slate-500" }, "Formula: "),
                React.createElement("span", { className: "text-lg font-bold text-slate-800" }, d.formula || '\u2014')
              )
            ),
            // ── Compound Creator Mode ──
            mode === 'creator' && React.createElement("div", null,
              React.createElement("p", { className: "text-xs text-slate-500 mb-3" }, "Select elements to craft compounds. Like Minecraft\u2019s Compound Creator!"),
              // Element selector grid (common elements)
              React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-4" },
                ['H', 'C', 'N', 'O', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'K', 'Ca', 'Fe', 'Cu', 'Zn', 'Br', 'Ag', 'I', 'Au'].map(sym => {
                  const el = getEl(sym);
                  return React.createElement("button", { key: sym, onClick: () => addElement(sym), className: "w-12 h-12 rounded-lg flex flex-col items-center justify-center font-bold text-xs border-2 transition-all hover:scale-110 hover:shadow-md active:scale-95 " + (catColors[el?.cat] || 'bg-slate-100 text-slate-600 border-slate-200'), title: el?.name || sym },
                    React.createElement("span", { className: "text-sm font-black" }, sym),
                    React.createElement("span", { className: "text-[8px] opacity-70" }, el?.n || '')
                  );
                })
              ),
              // Selected elements display
              React.createElement("div", { className: "bg-white rounded-xl border-2 border-dashed border-slate-300 p-4 mb-4 min-h-[80px] flex items-center justify-center gap-2 flex-wrap" },
                Object.keys(selectedEls).length === 0
                  ? React.createElement("p", { className: "text-slate-400 text-sm italic" }, "Tap elements above to add them...")
                  : Object.entries(selectedEls).map(([sym, count]) => {
                    const el = getEl(sym);
                    return React.createElement("div", { key: sym, className: "flex items-center gap-1 bg-slate-50 rounded-lg px-2 py-1 border" },
                      React.createElement("span", { className: "w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-sm", style: { backgroundColor: el?.c || '#64748b' } }, sym),
                      React.createElement("span", { className: "text-lg font-black text-slate-700" }, "\u00D7" + count),
                      React.createElement("button", { onClick: () => removeElement(sym), className: "ml-1 w-5 h-5 rounded-full bg-red-100 text-red-500 text-xs font-bold hover:bg-red-200 flex items-center justify-center" }, "\u2212")
                    );
                  })
              ),
              // Action buttons
              React.createElement("div", { className: "flex gap-2 mb-4" },
                React.createElement("button", { onClick: tryCraft, disabled: Object.keys(selectedEls).length === 0, className: "flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-teal-600 shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed" }, "\u2697\uFE0F Combine!"),
                React.createElement("button", { onClick: clearElements, className: "px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors" }, "\uD83D\uDD04 Clear")
              ),
              // Craft result
              d.craftResult && (d.craftResult.success
                ? React.createElement("div", { className: "bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 text-center animate-in zoom-in" },
                  React.createElement("p", { className: "text-3xl mb-1" }, d.craftResult.compound.emoji),
                  React.createElement("p", { className: "text-lg font-black text-emerald-700" }, (d.craftResult.isNew ? '\uD83C\uDF89 NEW! ' : '\u2705 ') + d.craftResult.compound.name),
                  React.createElement("p", { className: "text-sm font-bold text-emerald-600" }, d.craftResult.compound.formula),
                  React.createElement("p", { className: "text-xs text-emerald-500 mt-1" }, d.craftResult.compound.desc)
                )
                : React.createElement("div", { className: "bg-amber-50 border-2 border-amber-200 rounded-xl p-3 text-center" },
                  React.createElement("p", { className: "text-sm font-bold text-amber-700" }, "\uD83E\uDD14 No known compound matches this combination. Try different elements!"))
              ),
              // Discovery log
              discovered.length > 0 && React.createElement("div", { className: "mt-4 bg-slate-50 rounded-xl p-3 border" },
                React.createElement("p", { className: "text-xs font-bold text-slate-600 mb-2" }, "\uD83D\uDCDA Discovery Log (" + discovered.length + "/" + COMPOUNDS.length + ")"),
                React.createElement("div", { className: "flex flex-wrap gap-1" },
                  COMPOUNDS.map(c => React.createElement("span", { key: c.formula, className: "px-2 py-0.5 rounded text-xs font-bold " + (discovered.includes(c.formula) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400') }, discovered.includes(c.formula) ? c.emoji + ' ' + c.name : '\uD83D\uDD12 ???'))
                )
              )
            ),
            // ── Periodic Table Mode ──
            mode === 'table' && React.createElement("div", null,
              React.createElement("p", { className: "text-xs text-slate-500 mb-2" }, "Tap any element to learn about it. The full 118-element periodic table."),
              d.selectedElement && (() => {
                const detail = getElementDetail(d.selectedElement.s);
                const relatedCompounds = getElementCompounds(d.selectedElement.s);
                return React.createElement("div", { className: "mb-3 rounded-xl border-2 overflow-hidden " + (catColors[d.selectedElement.cat] || 'bg-slate-50 border-slate-200') },
                  React.createElement("div", { className: "p-3 flex items-center gap-3" },
                    React.createElement("div", { className: "w-14 h-14 rounded-xl flex flex-col items-center justify-center text-white font-bold shadow-md flex-shrink-0", style: { backgroundColor: d.selectedElement.c } },
                      React.createElement("span", { className: "text-[10px] opacity-80" }, d.selectedElement.n),
                      React.createElement("span", { className: "text-xl font-black" }, d.selectedElement.s)
                    ),
                    React.createElement("div", { className: "flex-1 min-w-0" },
                      React.createElement("p", { className: "text-lg font-bold text-slate-800" }, d.selectedElement.name),
                      React.createElement("p", { className: "text-xs text-slate-500" }, "Atomic #" + d.selectedElement.n + " \u2022 " + (d.selectedElement.cat || 'element').replace(/^\w/, c => c.toUpperCase())),
                      detail && React.createElement("p", { className: "text-xs text-slate-600 mt-1 italic" }, detail.desc)
                    ),
                    React.createElement("button", { onClick: () => upd('selectedElement', null), className: "p-1 text-slate-400 hover:text-slate-600 flex-shrink-0" }, "\u2715")
                  ),
                  detail && React.createElement("div", { className: "border-t border-slate-200/50 px-3 pb-3" },
                    React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2 mt-2" },
                      React.createElement("div", null,
                        React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" }, "\uD83D\uDD27 Common Uses"),
                        React.createElement("div", { className: "flex flex-wrap gap-1" },
                          (detail.uses || []).map((use, i) => React.createElement("span", { key: i, className: "px-2 py-0.5 bg-white/60 rounded-full text-[10px] font-medium text-slate-700 border border-slate-200/80" }, use))
                        )
                      ),
                      React.createElement("div", null,
                        React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" }, "\uD83E\uDDEA Key Compounds"),
                        React.createElement("div", { className: "flex flex-wrap gap-1" },
                          (detail.compounds || []).map((comp, i) => React.createElement("span", { key: i, className: "px-2 py-0.5 bg-white/60 rounded-full text-[10px] font-medium text-slate-700 border border-slate-200/80" }, comp))
                        )
                      )
                    ),
                    relatedCompounds.length > 0 && React.createElement("div", { className: "mt-2" },
                      React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" }, "\u2697\uFE0F Craftable in Compound Creator (" + relatedCompounds.length + ")"),
                      React.createElement("div", { className: "flex flex-wrap gap-1" },
                        relatedCompounds.map((comp, i) => React.createElement("button", { key: i, onClick: () => { upd('moleculeMode', 'creator'); upd('selectedElements', { ...comp.recipe }); }, className: "px-2 py-0.5 bg-emerald-50 rounded-full text-[10px] font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer transition-colors" }, comp.emoji + " " + comp.name + " (" + comp.formula + ")"))
                      )
                    )
                  )
                );
              })(),
              // Table grid
              React.createElement("div", { className: "overflow-x-auto" },
                React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(18, minmax(0, 1fr))', gap: '1px', minWidth: '600px' } },
                  PT_LAYOUT.flatMap((row, ri) => {
                    if (row.length === 0) return [React.createElement("div", { key: 'gap-' + ri, style: { gridColumn: 'span 18', height: '4px' } })];
                    return row.map((num, ci) => {
                      if (num === 0) return React.createElement("div", { key: ri + '-' + ci });
                      const el = ELEMENTS[num - 1];
                      if (!el) return React.createElement("div", { key: ri + '-' + ci });
                      return React.createElement("button", { key: el.s, onClick: () => upd('selectedElement', el), className: "w-full aspect-square rounded flex flex-col items-center justify-center text-[8px] font-bold border transition-all hover:scale-125 hover:z-10 hover:shadow-lg " + (catColors[el.cat] || 'bg-slate-50 border-slate-200'), title: el.name, style: { minWidth: '28px' } },
                        React.createElement("span", { className: "font-black text-[10px] leading-none" }, el.s),
                        React.createElement("span", { className: "opacity-60 leading-none" }, el.n)
                      );
                    });
                  })
                )
              ),
              // Legend
              React.createElement("div", { className: "flex flex-wrap gap-1.5 mt-3 justify-center" },
                [['alkali', 'Alkali'], ['alkaline', 'Alkaline'], ['transition', 'Transition'], ['metal', 'Post-trans.'], ['metalloid', 'Metalloid'], ['nonmetal', 'Nonmetal'], ['halogen', 'Halogen'], ['noble', 'Noble Gas'], ['lanthanide', 'Lanthanide'], ['actinide', 'Actinide']].map(([cat, label]) =>
                  React.createElement("span", { key: cat, className: "px-1.5 py-0.5 rounded text-[9px] font-bold border " + (catColors[cat] || '') }, label)
                )
              )
            )
          )
        })(),



        // ═══════════════════════════════════════════════════════
        // SOLAR SYSTEM EXPLORER — 3D (Three.js)
        // ═══════════════════════════════════════════════════════
        stemLabTab === 'explore' && stemLabTool === 'solarSystem' && (() => {
          const d = labToolData.solarSystem;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, solarSystem: { ...prev.solarSystem, [key]: val } }));
          const PLANETS = [
            { name: 'Mercury', emoji: '\u2638', color: '#94a3b8', rgb: [0.58, 0.64, 0.72], size: 0.2, dist: 8, speed: 4.15, tilt: 0.03, moons: 0, diameter: '4,879 km', dayLen: '59 Earth days', yearLen: '88 days', temp: '\u2212180 to 430\u00B0C', fact: 'Smallest planet; no atmosphere to retain heat.' },
            { name: 'Venus', emoji: '\u2640', color: '#fbbf24', rgb: [0.98, 0.75, 0.14], size: 0.55, dist: 11, speed: 1.62, tilt: 2.64, moons: 0, diameter: '12,104 km', dayLen: '243 Earth days', yearLen: '225 days', temp: '462\u00B0C avg.', fact: 'Hottest planet due to runaway greenhouse effect. Rotates backwards!', gravity: '0.91g', atmosphere: '96.5% CO\u2082 \u2014 crushingly thick (90x Earth pressure)', surface: 'Volcanic plains with lava flows and pancake domes', notableFeatures: ['Maxwell Montes (11 km high)', 'Thousand+ volcanoes', 'Surface hot enough to melt lead'], skyColor: '#c9803a', terrainColor: '#d4723a', terrainType: 'volcanic', surfaceDesc: 'Orange volcanic hellscape with dense sulfuric acid clouds. Surface pressure would crush a submarine.' },
            { name: 'Earth', emoji: '\uD83C\uDF0D', color: '#3b82f6', rgb: [0.23, 0.51, 0.96], size: 0.6, dist: 14, speed: 1.0, tilt: 0.41, moons: 1, diameter: '12,742 km', dayLen: '24 hours', yearLen: '365.25 days', temp: '15\u00B0C avg.', fact: 'Only known planet with liquid water and life.', gravity: '1.0g', atmosphere: '78% N\u2082, 21% O\u2082 \u2014 the only breathable atmosphere', surface: 'Oceans, continents, ice caps, forests', notableFeatures: ['71% covered in water', 'Magnetic field protecting from solar wind', 'Only known planet with plate tectonics'], skyColor: '#5ba3d9', terrainColor: '#3a8c3a', terrainType: 'earthlike', surfaceDesc: 'Blue skies, green hills, flowing water. The only known world with life.' },
            { name: 'Mars', emoji: '\uD83D\uDD34', color: '#ef4444', rgb: [0.94, 0.27, 0.27], size: 0.35, dist: 18, speed: 0.53, tilt: 0.44, moons: 2, diameter: '6,779 km', dayLen: '24h 37m', yearLen: '687 days', temp: '\u221265\u00B0C avg.', fact: 'Has the tallest volcano in the solar system: Olympus Mons (21.9 km high).', gravity: '0.38g', atmosphere: '95% CO\u2082 \u2014 thin (0.6% of Earth pressure)', surface: 'Red iron-oxide desert with deep canyons', notableFeatures: ['Olympus Mons (21.9 km \u2014 tallest volcano)', 'Valles Marineris (4,000 km canyon)', 'Polar ice caps of CO\u2082 and water'], skyColor: '#c4856b', terrainColor: '#b5452a', terrainType: 'desert', surfaceDesc: 'Rust-red desert beneath a butterscotch sky. Dust devils dance across the barren plains.' },
            { name: 'Jupiter', emoji: '\uD83E\uDE90', color: '#f97316', rgb: [0.98, 0.45, 0.09], size: 3.2, dist: 28, speed: 0.084, tilt: 0.05, moons: 95, diameter: '139,820 km', dayLen: '10 hours', yearLen: '12 years', temp: '\u2212110\u00B0C', fact: 'Largest planet. The Great Red Spot is a storm larger than Earth!', gravity: '2.34g', atmosphere: '90% H\u2082, 10% He \u2014 no solid surface', surface: 'Gas giant \u2014 layered cloud bands of ammonia and water', notableFeatures: ['Great Red Spot (storm > Earth-sized)', 'Strongest magnetic field', 'Europa may harbor an ocean under ice'], skyColor: '#d4924f', terrainColor: '#c4713a', terrainType: 'gasgiant', surfaceDesc: 'Endless stratified cloud layers in bands of amber, cream, and rust. Lightning flashes illuminate ammonia storms.' },
            { name: 'Saturn', emoji: '\uD83E\uDE90', color: '#eab308', rgb: [0.92, 0.70, 0.03], size: 2.7, dist: 36, speed: 0.034, tilt: 0.47, moons: 146, diameter: '116,460 km', dayLen: '10.7 hours', yearLen: '29 years', temp: '\u2212140\u00B0C', fact: 'Its rings are made of ice and rock. Could float in a giant bathtub!', hasRings: true, gravity: '1.06g', atmosphere: '96% H\u2082, 3% He \u2014 second gas giant', surface: 'Gas giant \u2014 golden cloud bands, no solid surface', notableFeatures: ['Ring system 282,000 km wide', 'Hexagonal storm at north pole', 'Titan has lakes of liquid methane'], skyColor: '#d4b16a', terrainColor: '#c9a04a', terrainType: 'gasgiant', surfaceDesc: 'Golden cloud decks with ring arcs slicing across the amber sky. A hexagonal polar vortex churns above.' },
            { name: 'Uranus', emoji: '\u26AA', color: '#67e8f9', rgb: [0.40, 0.91, 0.98], size: 1.5, dist: 44, speed: 0.012, tilt: 1.71, moons: 28, diameter: '50,724 km', dayLen: '17 hours', yearLen: '84 years', temp: '\u2212195\u00B0C', fact: 'Rotates on its side! An ice giant with methane atmosphere.', gravity: '0.92g', atmosphere: '83% H\u2082, 15% He, 2% CH\u2084 \u2014 ice giant', surface: 'Ice giant \u2014 methane gives blue-green color', notableFeatures: ['Rotates on its side (97.8\u00B0 tilt)', 'Faint ring system', 'Diamond rain in the interior'], skyColor: '#5aafa5', terrainColor: '#4a9a9a', terrainType: 'icegiant', surfaceDesc: 'Blue-green ice clouds under a teal sky. Deep below, extreme pressures crush carbon into diamonds that rain down.' },
            { name: 'Neptune', emoji: '\uD83D\uDD35', color: '#6366f1', rgb: [0.39, 0.40, 0.95], size: 1.4, dist: 52, speed: 0.006, tilt: 0.49, moons: 16, diameter: '49,244 km', dayLen: '16 hours', yearLen: '165 years', temp: '\u2212200\u00B0C', fact: 'Windiest planet: winds up to 2,100 km/h. Deep blue from methane.', gravity: '1.19g', atmosphere: '80% H\u2082, 19% He, 1% CH\u2084 \u2014 deep blue', surface: 'Ice giant \u2014 vivid blue from methane absorption', notableFeatures: ['Fastest winds: 2,100 km/h', 'Great Dark Spot (storm)', 'Triton orbits backwards'], skyColor: '#2a4a8a', terrainColor: '#1a3a6a', terrainType: 'icegiant', surfaceDesc: 'Deep indigo cloud layers whipped by supersonic winds. Dark storms rage across the methane-blue atmosphere.' },
            { name: 'Pluto', emoji: '\u2B50', color: '#a78bfa', rgb: [0.66, 0.55, 0.98], size: 0.14, dist: 60, speed: 0.004, tilt: 2.04, moons: 5, diameter: '2,377 km', dayLen: '6.4 Earth days', yearLen: '248 years', temp: '\u2212230\u00B0C', fact: 'Dwarf planet since 2006. Has a heart-shaped glacier named Tombaugh Regio.', gravity: '0.06g', atmosphere: 'Thin N\u2082 \u2014 freezes and falls as snow', surface: 'Nitrogen ice plains and water-ice mountains', notableFeatures: ['Tombaugh Regio (heart-shaped glacier)', 'Mountains of water ice', 'Charon is half its size'], skyColor: '#1a1a2a', terrainColor: '#8a7a6a', terrainType: 'iceworld', surfaceDesc: 'Pale nitrogen ice plains under a near-black sky. The Sun is just a bright star. The heart-shaped Tombaugh Regio gleams.' },
          ];
          const sel = d.selectedPlanet ? PLANETS.find(p => p.name === d.selectedPlanet) : null;
          const simSpeed = d.simSpeed || 1;
          const paused = d.paused || false;

          // ── Three.js 3D Canvas ──
          const canvasRef = function (canvas) {
            if (!canvas) { // cleanup on unmount
              const prev = document.querySelector('.solar3d-canvas');
              if (prev && prev._solarCleanup) { prev._solarCleanup(); prev._solarInit = false; }
              return;
            }
            if (canvas._solarInit) return;
            canvas._solarInit = true;

            // Load Three.js if needed
            function initScene(THREE) {
              const W = canvas.clientWidth || 600;
              const H = canvas.clientHeight || 340;
              const scene = new THREE.Scene();
              const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 1000);
              camera.position.set(0, 28, 50);
              camera.lookAt(0, 0, 0);
              const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
              renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
              renderer.setSize(W, H);

              // ── Starfield ──
              const starGeo = new THREE.BufferGeometry();
              const starPos = new Float32Array(3000);
              for (let i = 0; i < 3000; i++) { starPos[i] = (Math.random() - 0.5) * 400; }
              starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
              scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.8 })));

              // ── Ambient light ──
              scene.add(new THREE.AmbientLight(0x222244, 0.3));

              // ── Sun ──
              const sunGeo = new THREE.SphereGeometry(5.5, 32, 32);
              const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
              const sun = new THREE.Mesh(sunGeo, sunMat);
              scene.add(sun);
              const sunLight = new THREE.PointLight(0xffffff, 1.5, 200);
              scene.add(sunLight);
              // Sun glow sprite
              const glowCanvas = document.createElement('canvas'); glowCanvas.width = 128; glowCanvas.height = 128;
              const gctx = glowCanvas.getContext('2d');
              const grad = gctx.createRadialGradient(64, 64, 0, 64, 64, 64);
              grad.addColorStop(0, 'rgba(255,220,80,0.6)'); grad.addColorStop(0.4, 'rgba(255,180,40,0.2)'); grad.addColorStop(1, 'rgba(255,160,0,0)');
              gctx.fillStyle = grad; gctx.fillRect(0, 0, 128, 128);
              const glowTex = new THREE.CanvasTexture(glowCanvas);
              const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending }));
              glowSprite.scale.set(18, 18, 1);
              scene.add(glowSprite);

              // ── Procedural planet texture ──
              function makePlanetTex(rgb, variation) {
                const c = document.createElement('canvas'); c.width = 128; c.height = 64;
                const ctx = c.getContext('2d');
                const base = rgb;
                for (let y = 0; y < 64; y++) {
                  for (let x = 0; x < 128; x++) {
                    const n = (Math.sin(x * 0.3 + y * 0.1) * 0.5 + Math.sin(y * 0.5) * 0.3 + Math.random() * 0.2) * variation;
                    const r = Math.min(255, Math.max(0, Math.round((base[0] + n * 0.15) * 255)));
                    const g = Math.min(255, Math.max(0, Math.round((base[1] + n * 0.1) * 255)));
                    const b = Math.min(255, Math.max(0, Math.round((base[2] - n * 0.05) * 255)));
                    ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
                    ctx.fillRect(x, y, 1, 1);
                  }
                }
                const tex = new THREE.CanvasTexture(c); tex.needsUpdate = true; return tex;
              }

              // ── Create planets ──
              const planetMeshes = [];
              const orbitLines = [];
              PLANETS.forEach(function (p, idx) {
                // Orbit ring
                const orbitGeo = new THREE.RingGeometry(p.dist - 0.02, p.dist + 0.02, 128);
                const orbitMat = new THREE.MeshBasicMaterial({ color: 0x334466, side: THREE.DoubleSide, transparent: true, opacity: 0.3 });
                const orbitMesh = new THREE.Mesh(orbitGeo, orbitMat);
                orbitMesh.rotation.x = -Math.PI / 2;
                scene.add(orbitMesh);
                orbitLines.push(orbitMesh);

                // Planet sphere
                const geo = new THREE.SphereGeometry(p.size, 24, 24);
                const tex = makePlanetTex(p.rgb, 1.0 + idx * 0.3);
                const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0.1 });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.userData = { name: p.name, idx: idx };
                // Starting orbital angle — spread planets out
                mesh._orbitAngle = (idx / PLANETS.length) * Math.PI * 2;
                mesh._orbitDist = p.dist;
                mesh._orbitSpeed = p.speed;
                mesh.position.set(Math.cos(mesh._orbitAngle) * p.dist, 0, Math.sin(mesh._orbitAngle) * p.dist);
                scene.add(mesh);
                planetMeshes.push(mesh);

                // Saturn's rings
                if (p.hasRings) {
                  const ringGeo = new THREE.RingGeometry(p.size * 1.4, p.size * 2.2, 64);
                  const ringCanvas = document.createElement('canvas'); ringCanvas.width = 256; ringCanvas.height = 1;
                  const rctx = ringCanvas.getContext('2d');
                  const rGrad = rctx.createLinearGradient(0, 0, 256, 0);
                  rGrad.addColorStop(0, 'rgba(210,180,120,0.0)'); rGrad.addColorStop(0.15, 'rgba(210,180,120,0.7)');
                  rGrad.addColorStop(0.4, 'rgba(180,160,100,0.5)'); rGrad.addColorStop(0.5, 'rgba(140,130,80,0.1)');
                  rGrad.addColorStop(0.6, 'rgba(200,170,110,0.6)'); rGrad.addColorStop(0.85, 'rgba(180,150,90,0.4)');
                  rGrad.addColorStop(1, 'rgba(160,140,80,0.0)');
                  rctx.fillStyle = rGrad; rctx.fillRect(0, 0, 256, 1);
                  const ringTex = new THREE.CanvasTexture(ringCanvas);
                  const ringMat = new THREE.MeshBasicMaterial({ map: ringTex, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
                  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
                  ringMesh.rotation.x = -Math.PI / 2 + p.tilt;
                  mesh.add(ringMesh);
                }
              });

              // ── Asteroid belt (between Mars and Jupiter) ──
              const asteroidCount = 300;
              const asteroidGeo = new THREE.BufferGeometry();
              const aPos = new Float32Array(asteroidCount * 3);
              for (let i = 0; i < asteroidCount; i++) {
                const ang = Math.random() * Math.PI * 2;
                const r = 22 + Math.random() * 4;
                aPos[i * 3] = Math.cos(ang) * r;
                aPos[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
                aPos[i * 3 + 2] = Math.sin(ang) * r;
              }
              asteroidGeo.setAttribute('position', new THREE.BufferAttribute(aPos, 3));
              scene.add(new THREE.Points(asteroidGeo, new THREE.PointsMaterial({ color: 0x888888, size: 0.08 })));

              // ── Camera orbit controls (manual) ──
              let camTheta = 0.5, camPhi = 1.0, camDist = 55;
              let isDragging = false, lastX = 0, lastY = 0;
              let targetLookAt = new THREE.Vector3(0, 0, 0);
              let currentLookAt = new THREE.Vector3(0, 0, 0);
              let currentDist = 55;
              let targetDist = 55;
              let focusedPlanetIdx = -1; // index in planetMeshes, -1 = none (system view)
              let cameraLerp = 0.06; // smooth interpolation speed

              function updateCamera() {
                camera.position.x = currentLookAt.x + currentDist * Math.sin(camPhi) * Math.cos(camTheta);
                camera.position.y = currentLookAt.y + currentDist * Math.cos(camPhi);
                camera.position.z = currentLookAt.z + currentDist * Math.sin(camPhi) * Math.sin(camTheta);
                camera.lookAt(currentLookAt);
              }
              updateCamera();

              function onSolarDown(e) {
                isDragging = true; lastX = e.clientX; lastY = e.clientY;
                canvas._clickStartX = e.clientX; canvas._clickStartY = e.clientY;
                canvas.setPointerCapture(e.pointerId);
              }
              function onSolarMove(e) {
                if (!isDragging) return;
                const dx = e.clientX - lastX; const dy = e.clientY - lastY;
                camTheta -= dx * 0.008;
                camPhi = Math.max(0.15, Math.min(Math.PI - 0.15, camPhi - dy * 0.008));
                lastX = e.clientX; lastY = e.clientY;
                updateCamera();
              }
              function onSolarUp(e) {
                isDragging = false;
                canvas.releasePointerCapture(e.pointerId);
              }
              function onSolarWheel(e) {
                e.preventDefault();
                targetDist = Math.max(3, Math.min(120, targetDist + e.deltaY * 0.05));
              }

              // ── Raycasting for planet clicks (smooth fly-to) ──
              const raycaster = new THREE.Raycaster();
              const mouse = new THREE.Vector2();
              function onSolarClick(e) {
                if (Math.abs(e.clientX - (canvas._clickStartX || 0)) > 5 || Math.abs(e.clientY - (canvas._clickStartY || 0)) > 5) return; // was a drag
                const rect = canvas.getBoundingClientRect();
                mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
                raycaster.setFromCamera(mouse, camera);
                const hits = raycaster.intersectObjects(planetMeshes);
                if (hits.length > 0) {
                  const hitObj = hits[0].object;
                  const name = hitObj.userData.name;
                  upd('selectedPlanet', name);
                  focusedPlanetIdx = hitObj.userData.idx;
                  // Set smooth zoom target — closer for small planets, farther for giants
                  var radius = hitObj.geometry.parameters.radius;
                  targetDist = Math.max(3, Math.min(18, radius * 5));
                  // Set lookAt target to planet's current position (will be tracked each frame)
                  targetLookAt.copy(hitObj.position);
                  // Adjust camera angle for a nice viewing angle
                  camPhi = 0.8;
                } else {
                  // Clicked empty space — deselect, return to system view
                  upd('selectedPlanet', null);
                  focusedPlanetIdx = -1;
                  targetLookAt.set(0, 0, 0);
                  targetDist = 55;
                }
              }
              // Double-click to reset to full system view
              function onSolarDblClick(e) {
                upd('selectedPlanet', null);
                focusedPlanetIdx = -1;
                targetLookAt.set(0, 0, 0);
                targetDist = 55;
                camPhi = 1.0;
              }
              canvas.addEventListener('pointerdown', onSolarDown);
              canvas.addEventListener('pointermove', onSolarMove);
              canvas.addEventListener('pointerup', onSolarUp);
              canvas.addEventListener('wheel', onSolarWheel, { passive: false });
              canvas.addEventListener('click', onSolarClick);
              canvas.addEventListener('dblclick', onSolarDblClick);

              // ── Planet label overlay ──
              const labelContainer = canvas.parentElement.querySelector('.solar-labels');

              // ── Animation loop ──
              let animId;
              let time = 0;
              function animate() {
                animId = requestAnimationFrame(animate);
                const speed = parseFloat(canvas.dataset.speed || '1');
                const isPaused = canvas.dataset.paused === 'true';
                if (!isPaused) {
                  time += 0.008 * speed;
                }

                // Orbit planets
                planetMeshes.forEach(function (mesh, i) {
                  mesh._orbitAngle += 0.008 * mesh._orbitSpeed * speed * (isPaused ? 0 : 1);
                  mesh.position.x = Math.cos(mesh._orbitAngle) * mesh._orbitDist;
                  mesh.position.z = Math.sin(mesh._orbitAngle) * mesh._orbitDist;
                  mesh.rotation.y += 0.02 * speed * (isPaused ? 0 : 1);
                });

                // ── Smooth camera tracking ──
                // If focused on a planet, update targetLookAt to follow it as it orbits
                if (focusedPlanetIdx >= 0 && focusedPlanetIdx < planetMeshes.length) {
                  var fp = planetMeshes[focusedPlanetIdx];
                  targetLookAt.copy(fp.position);
                }
                // Smoothly interpolate camera toward target
                currentLookAt.lerp(targetLookAt, cameraLerp);
                currentDist += (targetDist - currentDist) * cameraLerp;
                updateCamera();

                // Slowly rotate asteroids
                const aArr = asteroidGeo.attributes.position.array;
                if (!isPaused) {
                  for (let i = 0; i < asteroidCount; i++) {
                    const x = aArr[i * 3]; const z = aArr[i * 3 + 2];
                    const a = Math.atan2(z, x) + 0.0003 * speed;
                    const r = Math.sqrt(x * x + z * z);
                    aArr[i * 3] = Math.cos(a) * r;
                    aArr[i * 3 + 2] = Math.sin(a) * r;
                  }
                  asteroidGeo.attributes.position.needsUpdate = true;
                }

                // Sun pulse
                const pulse = 1.0 + Math.sin(time * 2) * 0.03;
                sun.scale.set(pulse, pulse, pulse);
                glowSprite.scale.set(12 * pulse, 12 * pulse, 1);

                // Update labels
                if (labelContainer) {
                  labelContainer.innerHTML = '';
                  planetMeshes.forEach(function (mesh) {
                    const pos = mesh.position.clone();
                    pos.y += mesh.geometry.parameters.radius + 0.4;
                    pos.project(camera);
                    if (pos.z < 1 && pos.z > -1) {
                      const lx = (pos.x * 0.5 + 0.5) * W;
                      const ly = (-pos.y * 0.5 + 0.5) * H;
                      const isSelected = canvas.dataset.selected === mesh.userData.name;
                      const label = document.createElement('div');
                      label.style.cssText = 'position:absolute;left:' + lx + 'px;top:' + ly + 'px;transform:translate(-50%,-100%);font-size:9px;font-weight:700;pointer-events:none;text-shadow:0 1px 3px rgba(0,0,0,0.8);color:' + (isSelected ? '#fbbf24' : '#94a3b8') + ';white-space:nowrap;transition:color 0.2s;';
                      label.textContent = mesh.userData.name;
                      labelContainer.appendChild(label);
                    }
                  });
                }

                renderer.render(scene, camera);
              }
              animate();

              // ── Resize handler ──
              const resizeObserver = new ResizeObserver(function () {
                const w = canvas.clientWidth; const h = canvas.clientHeight;
                if (w && h) { camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); }
              });
              resizeObserver.observe(canvas);

              // ── Cleanup ──
              canvas._solarCleanup = function () {
                cancelAnimationFrame(animId);
                canvas.removeEventListener('pointerdown', onSolarDown);
                canvas.removeEventListener('pointermove', onSolarMove);
                canvas.removeEventListener('pointerup', onSolarUp);
                canvas.removeEventListener('wheel', onSolarWheel);
                canvas.removeEventListener('click', onSolarClick);
                canvas.removeEventListener('dblclick', onSolarDblClick);
                resizeObserver.disconnect();
                renderer.dispose();
                scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
              };
            }

            // Load Three.js or use existing
            if (window.THREE) {
              initScene(window.THREE);
            } else {
              const s = document.createElement('script');
              s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
              s.onload = function () { initScene(window.THREE); };
              document.head.appendChild(s);
            }
          };

          return React.createElement("div", { className: "max-w-4xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83C\uDF0D Solar System Explorer"),
              React.createElement("span", { className: "px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full ml-1" }, "3D")
            ),
            // 3D Canvas container
            React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-indigo-800/50 shadow-lg", style: { background: '#0a0e27' } },
              React.createElement("canvas", {
                ref: canvasRef,
                className: "solar3d-canvas w-full",
                style: { height: '520px', display: 'block', cursor: 'grab' },
                'data-speed': String(simSpeed),
                'data-paused': String(paused),
                'data-selected': d.selectedPlanet || ''
              }),
              // Floating planet labels
              React.createElement("div", { className: "solar-labels", style: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden' } }),
              // Controls overlay
              React.createElement("div", { className: "absolute bottom-3 left-3 right-3 flex items-center gap-2 pointer-events-auto" },
                React.createElement("button", {
                  onClick: () => upd('paused', !paused),
                  className: "px-2.5 py-1 rounded-lg text-xs font-bold " + (paused ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/80 hover:bg-white/20') + " backdrop-blur-sm border border-white/10 transition-all"
                }, paused ? "\u25B6 Play" : "\u23F8 Pause"),
                React.createElement("div", { className: "flex items-center gap-1.5 flex-1 max-w-[180px] bg-white/10 backdrop-blur-sm rounded-lg px-2 py-1 border border-white/10" },
                  React.createElement("span", { className: "text-[9px] text-white/60 font-bold whitespace-nowrap" }, "Speed"),
                  React.createElement("input", { type: "range", min: "0.1", max: "10", step: "0.1", value: simSpeed, onChange: e => upd('simSpeed', parseFloat(e.target.value)), className: "flex-1 accent-indigo-400", style: { height: '12px' } }),
                  React.createElement("span", { className: "text-[10px] text-indigo-300 font-bold min-w-[28px] text-right" }, simSpeed.toFixed(1) + "x")
                ),
                React.createElement("button", {
                  onClick: () => { upd('selectedPlanet', null); const c = document.querySelector('.solar3d-canvas'); if (c && c._solarInit) { /* reset camera via reinit — crude but works */ c._solarCleanup && c._solarCleanup(); c._solarInit = false; setTimeout(function () { canvasRef(c); }, 50); } },
                  className: "px-2 py-1 rounded-lg text-[10px] font-bold bg-white/10 text-white/70 hover:bg-white/20 border border-white/10 backdrop-blur-sm transition-all"
                }, "\uD83C\uDFE0 Reset View"),
                React.createElement("span", { className: "text-[9px] text-white/40 ml-auto hidden sm:inline" }, "Drag to orbit \u2022 Scroll to zoom \u2022 Click a planet")
              )
            ),
            // Planet buttons row
            React.createElement("div", { className: "flex gap-1 mt-2 flex-wrap justify-center" },
              PLANETS.map(p => React.createElement("button", {
                key: p.name,
                onClick: () => upd('selectedPlanet', p.name),
                className: "px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + (d.selectedPlanet === p.name ? 'text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'),
                style: d.selectedPlanet === p.name ? { backgroundColor: p.color } : {}
              }, p.emoji + " " + p.name))
            ),
            // ── Scale Explanation Collapsible ──
            React.createElement("details", { className: "mt-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 overflow-hidden" },
              React.createElement("summary", { className: "px-3 py-1.5 text-[11px] font-bold text-amber-700 cursor-pointer select-none hover:bg-amber-100/50 transition-colors" }, "\uD83D\uDD2D Why aren't the sizes truly to scale?"),
              React.createElement("div", { className: "px-3 pb-3 text-[10px] text-amber-800 leading-relaxed" },
                React.createElement("p", { className: "mb-2" }, "If this model were truly to scale, the Sun would be a beach ball and Earth would be a grain of sand 30 meters away! Jupiter would be a marble 155 meters away, and Pluto would be invisible 1.2 km from the Sun."),
                React.createElement("div", { className: "grid grid-cols-3 gap-1.5 mb-2" },
                  [
                    { body: '\u2600\uFE0F Sun', real: '1,391,000 km', scale: '109\u00D7 Earth' },
                    { body: '\uD83E\uDE90 Jupiter', real: '139,820 km', scale: '11.2\u00D7 Earth' },
                    { body: '\uD83C\uDF0D Earth', real: '12,742 km', scale: '1\u00D7 (baseline)' },
                    { body: '\uD83D\uDD35 Neptune', real: '49,244 km', scale: '3.9\u00D7 Earth' },
                    { body: '\uD83D\uDD34 Mars', real: '6,779 km', scale: '0.53\u00D7 Earth' },
                    { body: '\u2B50 Pluto', real: '2,377 km', scale: '0.19\u00D7 Earth' }
                  ].map(function (item) {
                    return React.createElement("div", { key: item.body, className: "bg-white/60 rounded-lg p-1.5 text-center border border-amber-100" },
                      React.createElement("div", { className: "font-bold" }, item.body),
                      React.createElement("div", { className: "text-amber-600" }, item.real),
                      React.createElement("div", { className: "text-amber-500 italic" }, item.scale)
                    );
                  })
                ),
                React.createElement("p", { className: "italic text-amber-600" }, "\uD83D\uDCA1 The solar system is 99.86% empty space! Our model compresses distances so you can explore everything in one view.")
              )
            ),
            // ── Planet Info Card (Enhanced with Close-Up & Drone) ──
            sel && React.createElement("div", { className: "mt-3 bg-slate-50 rounded-xl border border-slate-200 p-4 animate-in slide-in-from-bottom duration-300" },
              // Planet header
              React.createElement("div", { className: "flex items-center gap-3 mb-3" },
                React.createElement("div", { className: "w-12 h-12 rounded-xl flex items-center justify-center text-2xl", style: { backgroundColor: sel.color + '20', border: '2px solid ' + sel.color } }, sel.emoji),
                React.createElement("div", { className: "flex-1" },
                  React.createElement("h4", { className: "text-lg font-black text-slate-800" }, sel.name),
                  React.createElement("p", { className: "text-xs text-slate-500" }, sel.diameter + " \u2022 " + sel.moons + " moon" + (sel.moons !== 1 ? 's' : '') + " \u2022 " + (sel.gravity || '?'))
                ),
                // Mode tabs
                React.createElement("div", { className: "flex gap-1" },
                  ['overview', 'surface', 'drone'].map(function (tab) {
                    var isGas = sel.terrainType === 'gasgiant' || sel.terrainType === 'icegiant';
                    return React.createElement("button", {
                      key: tab, onClick: function () { upd('viewTab', tab); },
                      className: "px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all " +
                        ((d.viewTab || 'overview') === tab ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-200 text-slate-500 hover:bg-slate-300')
                    }, tab === 'overview' ? '\uD83D\uDCCA Overview' : tab === 'surface' ? '\u26C5 Surface' : (isGas ? '\uD83D\uDEF8 Probe' : '\uD83D\uDE97 Rover'));
                  })
                )
              ),

              // ── OVERVIEW TAB ──
              (d.viewTab || 'overview') === 'overview' && React.createElement("div", null,
                React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2 mb-3" },
                  [['\uD83C\uDF21', 'Temp', sel.temp], ['\u2600', 'Day', sel.dayLen], ['\uD83C\uDF0D', 'Year', sel.yearLen], ['\uD83D\uDCCF', 'Size', sel.diameter],
                  ['\u2696\uFE0F', 'Gravity', sel.gravity || 'Unknown'], ['\uD83C\uDF11', 'Moons', String(sel.moons)], ['\uD83C\uDF2C', 'Atmosphere', (sel.atmosphere || 'Unknown').substring(0, 30)], ['\uD83D\uDCA0', 'Type', sel.terrainType === 'gasgiant' ? 'Gas Giant' : sel.terrainType === 'icegiant' ? 'Ice Giant' : 'Rocky']
                  ].map(function (item) {
                    return React.createElement("div", { key: item[1], className: "bg-white rounded-lg p-2 text-center border" },
                      React.createElement("p", { className: "text-[10px] text-slate-400 font-bold" }, item[0] + ' ' + item[1]),
                      React.createElement("p", { className: "text-xs font-bold text-slate-700" }, item[2])
                    );
                  })
                ),
                React.createElement("p", { className: "text-sm text-slate-600 italic bg-indigo-50 rounded-lg p-2 border border-indigo-100 mb-2" }, "\uD83D\uDCA1 " + sel.fact),
                sel.surfaceDesc && React.createElement("div", { className: "bg-gradient-to-r from-sky-50 to-blue-50 rounded-lg p-2 border border-sky-200 mb-2" },
                  React.createElement("p", { className: "text-[11px] font-bold text-sky-700 mb-0.5" }, "\uD83C\uDF0D Surface Description"),
                  React.createElement("p", { className: "text-[10px] text-sky-600 leading-relaxed" }, sel.surfaceDesc)
                ),
                sel.notableFeatures && sel.notableFeatures.length > 0 && React.createElement("div", { className: "bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg p-2 border border-violet-200 mb-2" },
                  React.createElement("p", { className: "text-[11px] font-bold text-violet-700 mb-1" }, "\uD83C\uDFAF Notable Features"),
                  React.createElement("div", { className: "grid grid-cols-1 gap-1" },
                    sel.notableFeatures.map(function (feat, fi) {
                      return React.createElement("div", { key: fi, className: "flex items-center gap-1.5 text-[10px] text-violet-600" },
                        React.createElement("span", { className: "w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" }),
                        React.createElement("span", null, feat)
                      );
                    })
                  )
                ),
                // Notable features
                sel.notableFeatures && React.createElement("div", { className: "bg-white rounded-lg p-3 border" },
                  React.createElement("p", { className: "text-xs font-bold text-slate-500 mb-1.5" }, "\u2B50 Notable Features"),
                  React.createElement("div", { className: "flex flex-wrap gap-1.5" },
                    sel.notableFeatures.map(function (feat, i) {
                      return React.createElement("span", { key: i, className: "px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold border border-indigo-100" }, feat);
                    })
                  )
                )
              ),

              // ── SURFACE TAB ──
              (d.viewTab) === 'surface' && React.createElement("div", { className: "space-y-3" },
                React.createElement("div", { className: "bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 text-white" },
                  React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                    React.createElement("span", { className: "text-lg" }, "\uD83C\uDF0D"),
                    React.createElement("h5", { className: "font-bold text-sm" }, sel.name + " Surface Conditions")
                  ),
                  React.createElement("p", { className: "text-xs text-slate-300 leading-relaxed mb-3" }, sel.surfaceDesc || 'Surface data unavailable.'),
                  React.createElement("div", { className: "grid grid-cols-3 gap-2" },
                    [
                      ['\u2696\uFE0F Gravity', sel.gravity || '?'],
                      ['\uD83C\uDF21 Temperature', sel.temp],
                      ['\uD83C\uDF2C\uFE0F Atmosphere', (sel.atmosphere || 'None').split(' —')[0]]
                    ].map(function (item) {
                      return React.createElement("div", { key: item[0], className: "bg-white/10 rounded-lg p-2 text-center backdrop-blur-sm" },
                        React.createElement("p", { className: "text-[9px] text-slate-400" }, item[0]),
                        React.createElement("p", { className: "text-xs font-bold" }, item[1])
                      );
                    })
                  )
                ),
                React.createElement("button", {
                  onClick: function () { upd('viewTab', 'drone'); },
                  className: "w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg transition-all hover:scale-[1.01]"
                }, (sel.terrainType === 'gasgiant' || sel.terrainType === 'icegiant' ? "\uD83D\uDEF8 Launch Atmospheric Probe on " : "\uD83D\uDE97 Deploy Rover on ") + sel.name)
              ),

              // ── ROVER / PROBE TAB (Three.js First-Person) ──
              (d.viewTab) === 'drone' && React.createElement("div", null,
                React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-purple-300 shadow-lg", style: { height: '450px' } },
                  React.createElement("canvas", {
                    "data-drone-canvas": "true",
                    ref: function (canvasEl) {
                      if (!canvasEl || canvasEl._droneInit === sel.name) return;
                      canvasEl._droneInit = sel.name;

                      function doInit(THREE) {
                        var W = canvasEl.offsetWidth, H = canvasEl.offsetHeight;
                        var scene = new THREE.Scene();
                        var isGas = sel.terrainType === 'gasgiant' || sel.terrainType === 'icegiant';
                        var camera = new THREE.PerspectiveCamera(70, W / H, 0.1, 500);
                        camera.position.set(0, isGas ? 5 : 1.6, 0);
                        var renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
                        renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                        renderer.setClearColor(new THREE.Color(sel.skyColor || '#000000'));

                        // ── Sky dome ──
                        var skyGeo = new THREE.SphereGeometry(200, 32, 16);
                        var skyCv = document.createElement('canvas'); skyCv.width = 512; skyCv.height = 256;
                        var sCtx = skyCv.getContext('2d');
                        var sGrad = sCtx.createLinearGradient(0, 0, 0, 256);
                        sGrad.addColorStop(0, sel.skyColor || '#000');
                        sGrad.addColorStop(0.5, sel.terrainType === 'earthlike' ? '#87ceeb' : sel.terrainType === 'volcanic' ? '#d4923a' : sel.skyColor || '#111');
                        sGrad.addColorStop(1, sel.terrainColor || '#333');
                        sCtx.fillStyle = sGrad; sCtx.fillRect(0, 0, 512, 256);
                        // Stars for dark worlds
                        if (sel.terrainType === 'cratered' || sel.terrainType === 'iceworld' || sel.terrainType === 'desert') {
                          for (var si = 0; si < 200; si++) {
                            sCtx.fillStyle = 'rgba(255,255,255,' + (0.3 + Math.random() * 0.5) + ')';
                            sCtx.beginPath(); sCtx.arc(Math.random() * 512, Math.random() * 128, Math.random() * 1.5, 0, Math.PI * 2); sCtx.fill();
                          }
                        }
                        var skyTex = new THREE.CanvasTexture(skyCv);
                        var skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide });
                        scene.add(new THREE.Mesh(skyGeo, skyMat));

                        // ── Terrain (rocky planets) or Cloud layers (gas giants) ──
                        if (!isGas) {
                          var terrainGeo = new THREE.PlaneGeometry(200, 200, 100, 100);
                          var posArr = terrainGeo.attributes.position.array;
                          for (var vi = 0; vi < posArr.length; vi += 3) {
                            var px = posArr[vi], py = posArr[vi + 1];
                            var h = Math.sin(px * 0.05) * 3 + Math.sin(py * 0.08) * 2 + Math.sin(px * 0.15 + py * 0.1) * 1;
                            if (sel.terrainType === 'volcanic') h = Math.abs(Math.sin(px * 0.04) * 5) + Math.random() * 0.5;
                            if (sel.terrainType === 'earthlike') h = Math.sin(px * 0.03) * 2 + Math.sin(py * 0.05) * 1.5 + Math.random() * 0.3;
                            if (sel.terrainType === 'desert') h = Math.sin(px * 0.06) * 1.5 + Math.random() * 0.2;
                            if (sel.terrainType === 'iceworld') h = Math.sin(px * 0.04 + py * 0.03) * 1 + Math.random() * 0.15;
                            posArr[vi + 2] = h;
                          }
                          terrainGeo.computeVertexNormals();
                          var tCv = document.createElement('canvas'); tCv.width = 256; tCv.height = 256;
                          var tCx = tCv.getContext('2d');
                          var baseC = new THREE.Color(sel.terrainColor || '#886644');
                          for (var ty = 0; ty < 256; ty++) {
                            for (var tx = 0; tx < 256; tx++) {
                              var n = (Math.sin(tx * 0.3 + ty * 0.2) * 0.5 + Math.random() * 0.3) * 0.15;
                              var r = Math.min(255, Math.max(0, Math.round((baseC.r + n) * 255)));
                              var g = Math.min(255, Math.max(0, Math.round((baseC.g + n * 0.8) * 255)));
                              var b = Math.min(255, Math.max(0, Math.round((baseC.b - n * 0.3) * 255)));
                              tCx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
                              tCx.fillRect(tx, ty, 1, 1);
                            }
                          }
                          var terrainTex = new THREE.CanvasTexture(tCv);
                          terrainTex.wrapS = terrainTex.wrapT = THREE.RepeatWrapping; terrainTex.repeat.set(10, 10);
                          var terrainMat = new THREE.MeshStandardMaterial({ map: terrainTex, roughness: 0.9, metalness: 0.1, flatShading: true });
                          var terrain = new THREE.Mesh(terrainGeo, terrainMat);
                          terrain.rotation.x = -Math.PI / 2; scene.add(terrain);
                        } else {
                          // Gas giant cloud layers
                          for (var cl = 0; cl < 5; cl++) {
                            var clGeo = new THREE.PlaneGeometry(300, 300, 1, 1);
                            var clCv = document.createElement('canvas'); clCv.width = 256; clCv.height = 64;
                            var clCx = clCv.getContext('2d');
                            for (var cy = 0; cy < 64; cy++) {
                              var band = Math.sin(cy * 0.3 + cl * 2) * 0.5 + 0.5;
                              var r2 = Math.round(new THREE.Color(sel.terrainColor).r * 255 * (0.7 + band * 0.3));
                              var g2 = Math.round(new THREE.Color(sel.terrainColor).g * 255 * (0.7 + band * 0.3));
                              var b2 = Math.round(new THREE.Color(sel.terrainColor).b * 255 * (0.8 + band * 0.2));
                              for (var cx2 = 0; cx2 < 256; cx2++) {
                                var turb = Math.sin(cx2 * 0.05 + cy * 0.1 + cl) * 20;
                                clCx.fillStyle = 'rgb(' + Math.max(0, r2 + turb) + ',' + Math.max(0, g2 + turb * 0.7) + ',' + Math.max(0, b2 + turb * 0.3) + ')';
                                clCx.fillRect(cx2, cy, 1, 1);
                              }
                            }
                            var clTex = new THREE.CanvasTexture(clCv); clTex.wrapS = THREE.RepeatWrapping; clTex.repeat.set(3, 1);
                            var clMat = new THREE.MeshBasicMaterial({ map: clTex, transparent: true, opacity: 0.6 - cl * 0.1, side: THREE.DoubleSide });
                            var clMesh = new THREE.Mesh(clGeo, clMat);
                            clMesh.rotation.x = -Math.PI / 2; clMesh.position.y = -2 - cl * 4;
                            clMesh._cloudSpeed = 0.01 + cl * 0.005;
                            scene.add(clMesh);
                          }
                        }

                        // ── Lighting ──
                        scene.add(new THREE.AmbientLight(0x444466, 0.6));
                        var sunDir = new THREE.DirectionalLight(0xffeedd, sel.terrainType === 'iceworld' ? 0.3 : 1.0);
                        sunDir.position.set(50, 30, 20); scene.add(sunDir);

                        // ── 3D Rover / Probe Model ──
                        var roverGroup = new THREE.Group();
                        if (!isGas) {
                          // Rocky planet: build a simple rover out of boxes and cylinders
                          // Body
                          var bodyGeo = new THREE.BoxGeometry(0.8, 0.35, 1.2);
                          var bodyMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.3 });
                          var body = new THREE.Mesh(bodyGeo, bodyMat);
                          body.position.y = 0.35;
                          roverGroup.add(body);
                          // Camera mast
                          var mastGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5);
                          var mastMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7 });
                          var mast = new THREE.Mesh(mastGeo, mastMat);
                          mast.position.set(0, 0.77, -0.3);
                          roverGroup.add(mast);
                          // Camera head
                          var headGeo = new THREE.BoxGeometry(0.2, 0.12, 0.15);
                          var headMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 });
                          var head = new THREE.Mesh(headGeo, headMat);
                          head.position.set(0, 1.05, -0.32);
                          roverGroup.add(head);
                          // Lens (blue emissive)
                          var lensGeo = new THREE.SphereGeometry(0.04, 8, 8);
                          var lensMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x0066ff, emissiveIntensity: 0.8 });
                          var lens = new THREE.Mesh(lensGeo, lensMat);
                          lens.position.set(0, 1.05, -0.41);
                          roverGroup.add(lens);
                          // Solar panel
                          var panelGeo = new THREE.BoxGeometry(1.0, 0.03, 0.6);
                          var panelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a5e, metalness: 0.3, roughness: 0.5 });
                          var panel = new THREE.Mesh(panelGeo, panelMat);
                          panel.position.set(0, 0.56, 0.15);
                          roverGroup.add(panel);
                          // 6 wheels (3 per side)
                          var wheelGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.08, 12);
                          var wheelMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.4, roughness: 0.8 });
                          var wheelPositions = [
                            [-0.45, 0.15, -0.4], [-0.45, 0.15, 0], [-0.45, 0.15, 0.4],
                            [0.45, 0.15, -0.4], [0.45, 0.15, 0], [0.45, 0.15, 0.4]
                          ];
                          wheelPositions.forEach(function (wp) {
                            var wheel = new THREE.Mesh(wheelGeo, wheelMat);
                            wheel.position.set(wp[0], wp[1], wp[2]);
                            wheel.rotation.z = Math.PI / 2;
                            roverGroup.add(wheel);
                          });
                          // Antenna
                          var antGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.8);
                          var antMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8 });
                          var ant = new THREE.Mesh(antGeo, antMat);
                          ant.position.set(0.25, 0.92, 0.3);
                          roverGroup.add(ant);
                          // Antenna dish
                          var dishGeo = new THREE.CircleGeometry(0.1, 12);
                          var dishMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, metalness: 0.3 });
                          var dish = new THREE.Mesh(dishGeo, dishMat);
                          dish.position.set(0.25, 1.35, 0.3);
                          dish.rotation.x = -0.5;
                          roverGroup.add(dish);
                        } else {
                          // Gas giant: build a probe/drone
                          var probeGeo = new THREE.SphereGeometry(0.4, 16, 12);
                          var probeMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.7, roughness: 0.2 });
                          var probe = new THREE.Mesh(probeGeo, probeMat);
                          probe.position.y = 0;
                          roverGroup.add(probe);
                          // Heat shield bottom
                          var shieldGeo = new THREE.SphereGeometry(0.42, 16, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
                          var shieldMat = new THREE.MeshStandardMaterial({ color: 0xcc6600, metalness: 0.2, roughness: 0.8 });
                          var shield = new THREE.Mesh(shieldGeo, shieldMat);
                          shield.rotation.x = Math.PI;
                          roverGroup.add(shield);
                          // Instrument boom
                          var boomGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.0);
                          var boomMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6 });
                          var boom = new THREE.Mesh(boomGeo, boomMat);
                          boom.position.set(0, 0.5, 0);
                          roverGroup.add(boom);
                          // Antenna top
                          var pAntGeo = new THREE.ConeGeometry(0.08, 0.2, 8);
                          var pAntMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5 });
                          var pAnt = new THREE.Mesh(pAntGeo, pAntMat);
                          pAnt.position.set(0, 1.1, 0);
                          roverGroup.add(pAnt);
                          // Blinking lights
                          var lightGeo = new THREE.SphereGeometry(0.05, 8, 8);
                          var lightMat1 = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.0 });
                          var lightMat2 = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 1.0 });
                          var redLight = new THREE.Mesh(lightGeo, lightMat1);
                          redLight.position.set(0.3, 0.1, 0.3);
                          roverGroup.add(redLight);
                          var greenLight = new THREE.Mesh(lightGeo, lightMat2);
                          greenLight.position.set(-0.3, 0.1, 0.3);
                          roverGroup.add(greenLight);
                        }
                        roverGroup.position.set(0, isGas ? 5 : 0, 0); // initial position; animation loop tracks playerPos
                        scene.add(roverGroup);

                        // ── Scattered Environment Objects (rocks/boulders for depth cues) ──
                        var envObjects = [];
                        if (!isGas) {
                          var rockColor = new THREE.Color(sel.terrainColor || '#886644');
                          for (var ri = 0; ri < 80; ri++) {
                            var rSize = 0.1 + Math.random() * 0.6;
                            var rGeo = new THREE.DodecahedronGeometry(rSize, 0);
                            // Deform vertices for organic shapes
                            var rPositions = rGeo.attributes.position.array;
                            for (var rv = 0; rv < rPositions.length; rv += 3) {
                              rPositions[rv] *= 0.7 + Math.random() * 0.6;
                              rPositions[rv + 1] *= 0.5 + Math.random() * 0.5;
                              rPositions[rv + 2] *= 0.7 + Math.random() * 0.6;
                            }
                            rGeo.computeVertexNormals();
                            var rMat = new THREE.MeshStandardMaterial({
                              color: rockColor.clone().offsetHSL(Math.random() * 0.05 - 0.025, Math.random() * 0.1 - 0.05, Math.random() * 0.1 - 0.05),
                              roughness: 0.9, metalness: 0.1, flatShading: true
                            });
                            var rock = new THREE.Mesh(rGeo, rMat);
                            rock.position.set(
                              (Math.random() - 0.5) * 80,
                              rSize * 0.3,
                              (Math.random() - 0.5) * 80
                            );
                            rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
                            scene.add(rock);
                            envObjects.push(rock);
                          }
                          // A few large landmark boulders
                          for (var bi = 0; bi < 6; bi++) {
                            var bSize = 1.5 + Math.random() * 2;
                            var bGeo = new THREE.DodecahedronGeometry(bSize, 1);
                            var bPositions = bGeo.attributes.position.array;
                            for (var bv = 0; bv < bPositions.length; bv += 3) {
                              bPositions[bv] *= 0.6 + Math.random() * 0.8;
                              bPositions[bv + 1] *= 0.4 + Math.random() * 0.6;
                              bPositions[bv + 2] *= 0.6 + Math.random() * 0.8;
                            }
                            bGeo.computeVertexNormals();
                            var bMat = new THREE.MeshStandardMaterial({
                              color: rockColor.clone().offsetHSL(0, -0.05, -0.1),
                              roughness: 0.95, metalness: 0.05, flatShading: true
                            });
                            var boulder = new THREE.Mesh(bGeo, bMat);
                            boulder.position.set(
                              (Math.random() - 0.5) * 60,
                              bSize * 0.25,
                              (Math.random() - 0.5) * 60
                            );
                            boulder.rotation.y = Math.random() * Math.PI * 2;
                            scene.add(boulder);
                            envObjects.push(boulder);
                          }
                        }

                        // ── Particle effects ──
                        if (sel.terrainType === 'desert' || sel.terrainType === 'volcanic') {
                          var partCount = 200;
                          var partGeo = new THREE.BufferGeometry();
                          var partPos = new Float32Array(partCount * 3);
                          for (var pi = 0; pi < partCount; pi++) {
                            partPos[pi * 3] = (Math.random() - 0.5) * 60;
                            partPos[pi * 3 + 1] = Math.random() * 8;
                            partPos[pi * 3 + 2] = (Math.random() - 0.5) * 60;
                          }
                          partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
                          var partColor = sel.terrainType === 'volcanic' ? 0xff6600 : 0xc9a06a;
                          scene.add(new THREE.Points(partGeo, new THREE.PointsMaterial({ color: partColor, size: 0.05, transparent: true, opacity: 0.4 })));
                        }
                        if (sel.terrainType === 'icegiant' || sel.name === 'Uranus') {
                          // Diamond rain
                          var drCount = 100;
                          var drGeo = new THREE.BufferGeometry();
                          var drPos = new Float32Array(drCount * 3);
                          for (var di = 0; di < drCount; di++) {
                            drPos[di * 3] = (Math.random() - 0.5) * 40;
                            drPos[di * 3 + 1] = Math.random() * 20;
                            drPos[di * 3 + 2] = (Math.random() - 0.5) * 40;
                          }
                          drGeo.setAttribute('position', new THREE.BufferAttribute(drPos, 3));
                          var diamonds = new THREE.Points(drGeo, new THREE.PointsMaterial({ color: 0xccddff, size: 0.08, transparent: true, opacity: 0.6 }));
                          scene.add(diamonds);
                        }

                        // ── Movement state ──
                        var moveState = { forward: false, back: false, left: false, right: false, up: false, down: false };
                        var yaw = 0, pitch = 0, playerPos = new THREE.Vector3(0, isGas ? 5 : 1.6, 0);
                        var speed3d = isGas ? 0.15 : 0.08;

                        function onKey(e, pressed) {
                          switch (e.key.toLowerCase()) {
                            case 'w': case 'arrowup': moveState.forward = pressed; break;
                            case 's': case 'arrowdown': moveState.back = pressed; break;
                            case 'a': case 'arrowleft': moveState.left = pressed; break;
                            case 'd': case 'arrowright': moveState.right = pressed; break;
                            case 'q': case ' ': moveState.up = pressed; break;
                            case 'e': case 'shift': moveState.down = pressed; break;
                          }
                          e.preventDefault();
                        }
                        canvasEl.tabIndex = 0;
                        canvasEl.addEventListener('keydown', function (e) { onKey(e, true); });
                        canvasEl.addEventListener('keyup', function (e) { onKey(e, false); });

                        // Mouse look
                        var isLooking = false;
                        canvasEl.addEventListener('mousedown', function (e) { isLooking = true; canvasEl.requestPointerLock && canvasEl.requestPointerLock(); });
                        canvasEl.addEventListener('mouseup', function () { isLooking = false; });
                        function onMouseMove(e) {
                          if (!isLooking && !document.pointerLockElement) return;
                          yaw -= e.movementX * 0.003;
                          pitch = Math.max(-1.2, Math.min(1.2, pitch - e.movementY * 0.003));
                        }
                        document.addEventListener('mousemove', onMouseMove);
                        canvasEl.focus();

                        var tick3d = 0;
                        var animId3d;
                        // animate3d is defined later as animate3dV2 with 3rd-person and compass support

                        // ── Rich Educational HUD (Enhanced) ──
                        var hud = document.createElement('div');
                        hud.className = 'rover-hud';
                        hud.style.cssText = 'position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);border-radius:12px;padding:10px 14px;color:#38bdf8;font-family:monospace;font-size:10px;pointer-events:none;z-index:10;border:1px solid rgba(56,189,248,0.3);max-width:290px;transition:opacity 0.3s';
                        var modeLabel = isGas ? '\uD83D\uDEF8 ATMOSPHERIC PROBE' : '\uD83D\uDE97 SURFACE ROVER';
                        var atmosLabel = sel.atmosphere || 'No data';
                        var gravLabel = sel.gravity || '?';
                        var featList = (sel.notableFeatures || []).slice(0, 3).map(function (f) { return '<div style="color:#94a3b8;font-size:9px;padding-left:8px">\u2022 ' + f + '</div>'; }).join('');
                        // Live telemetry spans (updated each frame)
                        var hudStaticHTML =
                          '<div style="font-weight:bold;font-size:12px;margin-bottom:6px;color:#7dd3fc;letter-spacing:1px" id="hud-mode">' + modeLabel + '</div>' +
                          '<div style="display:grid;grid-template-columns:auto 1fr;gap:2px 8px;margin-bottom:4px">' +
                          '<span style="color:#64748b">Planet</span><span style="color:#e2e8f0;font-weight:bold">' + sel.name + ' ' + sel.emoji + '</span>' +
                          '<span style="color:#64748b">Gravity</span><span>' + gravLabel + '</span>' +
                          '<span style="color:#64748b">Temp</span><span>' + sel.temp + '</span>' +
                          '<span style="color:#64748b">Atmos</span><span style="font-size:9px">' + atmosLabel + '</span>' +
                          '</div>' +
                          '<div style="border-top:1px solid rgba(56,189,248,0.12);padding-top:4px;margin-bottom:4px;display:grid;grid-template-columns:auto 1fr;gap:2px 8px">' +
                          '<span style="color:#64748b">\uD83D\uDCCF Alt</span><span id="hud-alt" style="color:#67e8f9">0 m</span>' +
                          '<span style="color:#64748b">\uD83D\uDCA8 Spd</span><span id="hud-spd" style="color:#67e8f9">0 m/s</span>' +
                          '<span style="color:#64748b">\uD83E\uDDED Hdg</span><span id="hud-hdg" style="color:#67e8f9">N 0\u00B0</span>' +
                          '<span style="color:#64748b">\uD83D\uDCCD Pos</span><span id="hud-pos" style="color:#67e8f9;font-size:9px">0.0, 0.0</span>' +
                          '<span style="color:#64748b">\uD83D\uDEB6 Dist</span><span id="hud-odo" style="color:#67e8f9">0 m</span>' +
                          '<span style="color:#64748b">\uD83D\uDD2D Disc</span><span id="hud-disc" style="color:#fbbf24">0 / 0</span>' +
                          '</div>' +
                          (featList ? '<div style="border-top:1px solid rgba(56,189,248,0.12);padding-top:3px;margin-bottom:3px"><span style="color:#7dd3fc;font-weight:bold;font-size:9px">\uD83D\uDD2D NOTABLE</span>' + featList + '</div>' : '') +
                          '<div style="border-top:1px solid rgba(56,189,248,0.12);padding-top:3px;color:#94a3b8;font-size:9px">WASD move \u2022 Mouse look \u2022 Q/E alt \u2022 V view \u2022 M mission</div>';
                        hud.innerHTML = hudStaticHTML;
                        canvasEl.parentElement.appendChild(hud);

                        // ── Hazard Warning Strip ──
                        var hazardEl = document.createElement('div');
                        hazardEl.style.cssText = 'position:absolute;top:8px;left:50%;transform:translateX(-50%);background:rgba(220,38,38,0.85);backdrop-filter:blur(4px);border-radius:8px;padding:5px 16px;color:#fff;font-family:monospace;font-size:10px;font-weight:bold;pointer-events:none;z-index:11;border:1px solid rgba(255,100,100,0.4);text-align:center;opacity:0;transition:opacity 0.5s;letter-spacing:0.5px';
                        var hazardMsgs = {
                          'Venus': ['\u26A0 SURFACE TEMP 462\u00B0C \u2014 exceeds hull tolerance', '\u26A0 ATMOSPHERIC PRESSURE: 90x Earth \u2014 structural warning', '\u26A0 SULFURIC ACID CLOUDS DETECTED overhead'],
                          'Jupiter': ['\u26A0 RADIATION: 20 Sv/day \u2014 lethal exposure zone', '\u26A0 WIND SHEAR: 360 km/h crosswind detected', '\u26A0 AMMONIA ICE CRYSTALS impacting sensors'],
                          'Saturn': ['\u26A0 RING DEBRIS: micro-meteoroid risk elevated', '\u26A0 WIND SPEED: 1,800 km/h at equatorial band'],
                          'Mars': ['\u26A0 DUST STORM APPROACHING \u2014 visibility dropping', '\u26A0 UV RADIATION: no magnetic shield \u2014 high exposure', '\u26A0 THIN ATMOSPHERE: suit pressure critical'],
                          'Mercury': ['\u26A0 SOLAR RADIATION ALERT \u2014 no magnetic shielding', '\u26A0 SURFACE TEMP SWING: -180\u00B0C to 430\u00B0C across terminator'],
                          'Pluto': ['\u26A0 COMMS DELAY: 5h 28m one-way to Earth', '\u26A0 SURFACE TEMP: -230\u00B0C \u2014 nitrogen ice sublimating'],
                          'Uranus': ['\u26A0 DIAMOND RAIN: high-pressure carbon crystallization', '\u26A0 97.8\u00B0 AXIAL TILT: extreme seasonal variations'],
                          'Neptune': ['\u26A0 WIND SPEED: 2,100 km/h \u2014 fastest in solar system', '\u26A0 GREAT DARK SPOT: storm system ahead'],
                          'Earth': ['\u2139 All systems nominal \u2014 home sweet home']
                        };
                        var planetHazards = hazardMsgs[sel.name] || ['\u26A0 Environmental data unavailable'];
                        var hazardIdx = 0;
                        canvasEl.parentElement.appendChild(hazardEl);
                        var hazardTimer = setInterval(function () {
                          hazardEl.style.opacity = '0';
                          setTimeout(function () {
                            hazardEl.textContent = planetHazards[hazardIdx % planetHazards.length];
                            hazardEl.style.background = sel.name === 'Earth' ? 'rgba(34,197,94,0.8)' : 'rgba(220,38,38,0.85)';
                            hazardEl.style.opacity = '1';
                            hazardIdx++;
                          }, 500);
                          setTimeout(function () { hazardEl.style.opacity = '0'; }, 4500);
                        }, 8000);
                        // Show first warning after 2s
                        setTimeout(function () {
                          hazardEl.textContent = planetHazards[0];
                          hazardEl.style.background = sel.name === 'Earth' ? 'rgba(34,197,94,0.8)' : 'rgba(220,38,38,0.85)';
                          hazardEl.style.opacity = '1';
                          hazardIdx = 1;
                          setTimeout(function () { hazardEl.style.opacity = '0'; }, 4500);
                        }, 2000);

                        // ── Discovery System (POI landmarks) ──
                        var POI_DATA = {
                          'Mercury': [
                            { x: 15, z: -10, name: 'Caloris Basin', desc: 'One of the largest impact craters in the solar system (1,550 km wide).', fact: 'The impact was so powerful it created chaotic terrain on the opposite side of Mercury.' },
                            { x: -20, z: 8, name: 'Ice Deposits', desc: 'Permanently shadowed craters at the poles contain water ice.', fact: 'Despite being closest to the Sun, Mercury has ice because some craters never see sunlight.' },
                            { x: 30, z: 25, name: 'Scarps & Cliffs', desc: 'Mercury shrank as its iron core cooled, creating massive cliff-like wrinkles.', fact: 'These scarps can be hundreds of km long and over 1 km tall.' }
                          ],
                          'Venus': [
                            { x: 12, z: -15, name: 'Maxwell Montes', desc: 'Highest mountain on Venus at 11 km \u2014 taller than Everest.', fact: 'The summit is coated with a metallic "snow" made from lead sulfide and bismuth sulfide.' },
                            { x: -18, z: 20, name: 'Pancake Dome', desc: 'Flat-topped volcanic domes unique to Venus, up to 65 km across.', fact: 'Extremely viscous lava oozed out and spread like thick pancake batter.' },
                            { x: 25, z: 5, name: 'Venera 13 Landing Site', desc: 'Soviet lander that survived 127 minutes on the surface in 1982.', fact: 'Venera 13 took the first color photos of Venus\u2019s surface before being crushed by pressure.' }
                          ],
                          'Earth': [
                            { x: 10, z: -12, name: 'Mariana Trench', desc: 'Deepest point on Earth at 10,994 m below sea level.', fact: 'More people have walked on the Moon than have been to the bottom of the Mariana Trench.' },
                            { x: -22, z: 15, name: 'Mid-Atlantic Ridge', desc: 'Underwater mountain range where tectonic plates spread apart.', fact: 'The Atlantic Ocean grows about 2.5 cm wider every year.' },
                            { x: 28, z: -8, name: 'Great Barrier Reef', desc: 'Largest living structure on Earth \u2014 visible from space.', fact: 'The reef is made of 2,900 individual reef systems and supports 1,500+ species of fish.' }
                          ],
                          'Mars': [
                            { x: 20, z: -18, name: 'Olympus Mons Base', desc: 'Base of the tallest volcano in the solar system (21.9 km).', fact: 'Olympus Mons is so wide (624 km) that standing on its edge, you couldn\u2019t see the summit \u2014 it curves beyond the horizon.' },
                            { x: -25, z: 12, name: 'Valles Marineris Rim', desc: 'A canyon system 4,000 km long and up to 7 km deep.', fact: 'It would stretch from New York to Los Angeles and is 5x deeper than the Grand Canyon.' },
                            { x: 8, z: 30, name: 'Polar Ice Cap', desc: 'Layered ice deposits of frozen CO\u2082 and water ice.', fact: 'If all of Mars\u2019s polar ice melted, it could cover the entire planet in 11 meters of water.' },
                            { x: -15, z: -25, name: 'Perseverance Rover Site', desc: 'Jezero Crater \u2014 where NASA\u2019s rover searches for signs of ancient life.', fact: 'Perseverance arrived Feb 2021 and has driven 28+ km, collecting rock samples for future return to Earth.' }
                          ],
                          'Jupiter': [
                            { x: 18, z: -20, name: 'Great Red Spot Eye', desc: 'An anticyclonic storm raging for 350+ years, larger than Earth.', fact: 'Wind speeds at the edge reach 680 km/h \u2014 twice the speed of the strongest Earth hurricane.' },
                            { x: -15, z: 15, name: 'Ammonia Crystal Layer', desc: 'Upper cloud layer made of frozen ammonia crystals at -145\u00B0C.', fact: 'Below this layer are ammonium hydrosulfide clouds, and below those, water clouds. Jupiter has weather 3 layers deep.' },
                            { x: 25, z: 8, name: 'Lightning Alley', desc: 'Zones between cloud bands where convection drives massive lightning storms.', fact: 'Jupiter\u2019s lightning is 10x more powerful than Earth\u2019s and occurs mostly at the poles and deep clouds.' },
                            { x: -8, z: -28, name: 'Metallic Hydrogen Zone', desc: 'Deep below the clouds, pressure turns hydrogen into liquid metal.', fact: 'This metallic hydrogen ocean generates Jupiter\u2019s magnetic field \u2014 20,000x stronger than Earth\u2019s.' }
                          ],
                          'Saturn': [
                            { x: 20, z: -15, name: 'Hexagonal Polar Vortex', desc: 'A persistent hexagonal cloud pattern at Saturn\u2019s north pole.', fact: 'Each side of the hexagon is about 14,500 km long \u2014 wider than Earth\u2019s diameter.' },
                            { x: -18, z: 22, name: 'Ring Shadow Zone', desc: 'Area where Saturn\u2019s rings cast shadows on the cloud tops.', fact: 'Saturn\u2019s rings are only about 10 m thick despite being 282,000 km wide \u2014 thinner than a razor blade proportionally.' },
                            { x: 12, z: 10, name: 'Titan Flyby Path', desc: 'The orbital zone of Titan, Saturn\u2019s largest moon.', fact: 'Titan has lakes of liquid methane and a thicker atmosphere than Earth \u2014 the only moon with a substantial atmosphere.' }
                          ],
                          'Uranus': [
                            { x: 15, z: -18, name: 'Diamond Rain Zone', desc: 'At 8,000 km depth, extreme pressure crushes carbon into diamonds.', fact: 'These diamonds may be as large as millions of carats and rain down to form a diamond layer around the core.' },
                            { x: -20, z: 14, name: 'Magnetic Pole Shift', desc: 'Uranus\u2019s magnetic field is tilted 59\u00B0 from its rotation axis.', fact: 'Combined with the 98\u00B0 axial tilt, Uranus\u2019s magnetosphere tumbles chaotically through space.' },
                            { x: 25, z: -5, name: 'Cloud Band Transition', desc: 'Faint methane cloud bands where wind patterns change direction.', fact: 'Uranus appears featureless but Hubble revealed complex cloud systems moving at 900 km/h.' }
                          ],
                          'Neptune': [
                            { x: 18, z: -22, name: 'Great Dark Spot Region', desc: 'A massive storm system similar to Jupiter\u2019s Great Red Spot.', fact: 'Unlike Jupiter\u2019s spot, Neptune\u2019s dark spots appear and disappear within years \u2014 the planet is surprisingly dynamic.' },
                            { x: -14, z: 16, name: 'Supersonic Wind Belt', desc: 'Equatorial winds reaching 2,100 km/h \u2014 faster than the speed of sound.', fact: 'Neptune generates more heat than it receives from the Sun, driving these extreme winds from internal energy.' },
                            { x: 22, z: 10, name: 'Triton Orbital Cross', desc: 'The path of Triton \u2014 the only large moon that orbits backwards.', fact: 'Triton is likely a captured Kuiper Belt object. Its nitrogen geysers shoot plumes 8 km high.' }
                          ],
                          'Pluto': [
                            { x: 12, z: -14, name: 'Tombaugh Regio', desc: 'The famous heart-shaped glacier made of nitrogen and carbon monoxide ice.', fact: 'The left lobe (Sputnik Planitia) is a vast ice plain with convection cells that slowly churn the ice.' },
                            { x: -16, z: 18, name: 'Ice Mountains', desc: 'Mountains of water ice rising 2\u20133 km above the nitrogen plains.', fact: 'Because water ice is less dense than nitrogen ice at Pluto\u2019s temperatures, these mountains literally float.' },
                            { x: 20, z: 5, name: 'Cthulhu Macula', desc: 'A dark equatorial region 2,990 km long covered in tholins.', fact: 'Tholins are complex organic molecules created when methane is irradiated \u2014 they give Pluto its reddish-brown color.' }
                          ]
                        };
                        var pois = POI_DATA[sel.name] || [];
                        var discoveredPOIs = {};
                        var totalPOIs = pois.length;

                        // Place POI markers in the 3D scene
                        var poiMeshes = [];
                        pois.forEach(function (poi, idx) {
                          var poiGeo = new THREE.SphereGeometry(0.3, 8, 8);
                          var poiMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.7 });
                          var poiMesh = new THREE.Mesh(poiGeo, poiMat);
                          poiMesh.position.set(poi.x, isGas ? 3 : 1.5, poi.z);
                          poiMesh._poiIdx = idx;
                          scene.add(poiMesh);
                          poiMeshes.push(poiMesh);
                          // Glow ring around POI
                          var ringGeo = new THREE.RingGeometry(0.5, 0.8, 16);
                          var ringMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
                          var ringMesh = new THREE.Mesh(ringGeo, ringMat);
                          ringMesh.rotation.x = -Math.PI / 2;
                          ringMesh.position.set(poi.x, isGas ? 2.5 : 1.0, poi.z);
                          ringMesh._pulsePhase = idx;
                          scene.add(ringMesh);
                          poiMeshes.push(ringMesh);
                        });

                        // Discovery card overlay
                        var discCard = document.createElement('div');
                        discCard.style.cssText = 'position:absolute;bottom:56px;right:8px;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);border-radius:12px;padding:12px 16px;color:#fff;font-family:sans-serif;font-size:11px;pointer-events:none;z-index:11;border:1px solid rgba(251,191,36,0.4);max-width:280px;opacity:0;transition:opacity 0.5s,transform 0.5s;transform:translateY(10px)';
                        canvasEl.parentElement.appendChild(discCard);
                        var discTimeout = null;

                        function showDiscovery(poi, idx) {
                          if (discoveredPOIs[idx]) return;
                          discoveredPOIs[idx] = true;
                          var discCount = Object.keys(discoveredPOIs).length;
                          discCard.innerHTML =
                            '<div style="font-weight:bold;font-size:13px;color:#fbbf24;margin-bottom:4px">\uD83D\uDD0D DISCOVERY: ' + poi.name + '</div>' +
                            '<div style="color:#e2e8f0;margin-bottom:4px;line-height:1.4">' + poi.desc + '</div>' +
                            '<div style="color:#67e8f9;font-size:10px;font-style:italic;border-top:1px solid rgba(251,191,36,0.2);padding-top:4px">\uD83D\uDCA1 ' + poi.fact + '</div>' +
                            '<div style="color:#34d399;font-size:10px;font-weight:bold;margin-top:4px">\u2B50 +10 XP \u2022 ' + discCount + '/' + totalPOIs + ' discovered</div>';
                          discCard.style.opacity = '1';
                          discCard.style.transform = 'translateY(0)';
                          // Award XP
                          if (typeof awardStemXP === 'function') awardStemXP('solarSystem', 10);
                          if (discTimeout) clearTimeout(discTimeout);
                          discTimeout = setTimeout(function () {
                            discCard.style.opacity = '0';
                            discCard.style.transform = 'translateY(10px)';
                          }, 7000);
                        }

                        // ── Mission Card Overlay (M key toggle) ──
                        var missionCard = document.createElement('div');
                        missionCard.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.9);backdrop-filter:blur(12px);border-radius:16px;padding:24px;color:#fff;font-family:sans-serif;font-size:12px;pointer-events:auto;z-index:15;border:1px solid rgba(56,189,248,0.3);max-width:380px;width:90%;opacity:0;transition:opacity 0.3s;display:none';
                        var missionIcon = isGas ? '\uD83D\uDEF8' : '\uD83D\uDE97';
                        var missionType = isGas ? 'Atmospheric Survey' : 'Surface Exploration';
                        missionCard.innerHTML =
                          '<div style="text-align:center;margin-bottom:12px">' +
                          '<div style="font-size:32px;margin-bottom:4px">' + missionIcon + '</div>' +
                          '<div style="font-weight:bold;font-size:16px;color:#7dd3fc;letter-spacing:1px">MISSION BRIEFING</div>' +
                          '<div style="color:#94a3b8;font-size:11px">' + missionType + ' \u2014 ' + sel.name + '</div>' +
                          '</div>' +
                          '<div style="background:rgba(56,189,248,0.1);border-radius:10px;padding:10px 12px;margin-bottom:10px;border:1px solid rgba(56,189,248,0.15)">' +
                          '<div style="font-weight:bold;color:#38bdf8;margin-bottom:4px">\uD83C\uDFAF Objectives</div>' +
                          '<div id="mission-objectives" style="color:#e2e8f0;line-height:1.8">' +
                          pois.map(function (p, i) { return '<div id="obj-' + i + '" style="font-size:11px">\u2610 Discover ' + p.name + '</div>'; }).join('') +
                          '</div>' +
                          '</div>' +
                          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">' +
                          '<div style="background:rgba(251,191,36,0.1);border-radius:8px;padding:6px 8px;text-align:center;border:1px solid rgba(251,191,36,0.15)">' +
                          '<div style="color:#fbbf24;font-weight:bold;font-size:14px" id="mission-disc-count">0/' + totalPOIs + '</div>' +
                          '<div style="color:#94a3b8;font-size:9px">Discoveries</div></div>' +
                          '<div style="background:rgba(52,211,153,0.1);border-radius:8px;padding:6px 8px;text-align:center;border:1px solid rgba(52,211,153,0.15)">' +
                          '<div style="color:#34d399;font-weight:bold;font-size:14px" id="mission-xp-count">0</div>' +
                          '<div style="color:#94a3b8;font-size:9px">XP Earned</div></div>' +
                          '</div>' +
                          '<div style="text-align:center;color:#64748b;font-size:10px">Press <span style="color:#38bdf8;font-weight:bold">M</span> to close \u2022 <span style="color:#38bdf8;font-weight:bold">WASD</span> to move \u2022 <span style="color:#38bdf8;font-weight:bold">V</span> to toggle view</div>';
                        canvasEl.parentElement.appendChild(missionCard);
                        var missionVisible = false;

                        // Telemetry tracking state
                        var prevPos = new THREE.Vector3().copy(playerPos);
                        var odometer = 0;
                        var lastSpeed = 0;
                        var scaleFactor = isGas ? 100 : 50; // meters per unit for display

                        // ── Science Fact Ticker (bottom of canvas, expanded) ──
                        var ticker = document.createElement('div');
                        ticker.style.cssText = 'position:absolute;bottom:8px;left:8px;right:8px;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);border-radius:8px;padding:6px 12px;color:#fbbf24;font-family:sans-serif;font-size:10px;pointer-events:none;z-index:10;border:1px solid rgba(251,191,36,0.2);text-align:center;transition:opacity 0.5s';
                        // Categorized facts with icons
                        var scienceFacts = [
                          // Surface / Geology
                          '\uD83E\uDEA8 ' + (sel.surfaceDesc || sel.fact),
                          '\uD83E\uDEA8 ' + sel.fact,
                          // Climate / Weather
                          '\uD83C\uDF21 A day on ' + sel.name + ' lasts ' + (sel.dayLen || '?') + '. A year lasts ' + (sel.yearLen || '?') + '.',
                          '\uD83C\uDF21 Gravity on ' + sel.name + ' is ' + gravLabel + ' compared to Earth\u2019s 1.0g.',
                          // Scale comparisons
                          '\uD83C\uDF0D ' + sel.name + '\u2019s diameter is ' + (sel.diameter || '?') + (sel.name !== 'Earth' ? ' (Earth: 12,742 km).' : '.'),
                          // Gas vs rocky
                          isGas ? '\uD83E\uDEA8 Gas giants have no solid surface \u2014 you would fall forever through ever-denser gas layers.' : '\uD83E\uDEA8 The terrain is generated from real-world elevation science for ' + sel.terrainType + ' surfaces.',
                          isGas ? '\uD83C\uDF21 If you parachuted into ' + sel.name + ', you would never touch ground \u2014 just endless clouds.' : '\uD83E\uDEA8 The surface of ' + sel.name + ' is made of ' + (sel.surface || 'rock and dust') + '.',
                          // Planet-specific unique facts
                          sel.name === 'Mercury' ? '\uD83D\uDE80 MESSENGER orbited Mercury 2011\u20132015, mapping the entire surface and discovering ice in polar craters.' : sel.name === 'Venus' ? '\uD83D\uDE80 Soviet Venera 13 survived 127 minutes on Venus\u2019s surface in 1982 \u2014 still a record.' : sel.name === 'Earth' ? '\uD83D\uDE80 The ISS orbits Earth every 90 minutes at 27,600 km/h, 408 km above us.' : sel.name === 'Mars' ? '\uD83D\uDE80 Perseverance landed Feb 2021 in Jezero Crater, searching for signs of ancient microbial life.' : sel.name === 'Jupiter' ? '\uD83D\uDE80 Juno has been orbiting Jupiter since 2016, peering beneath the cloud tops with microwave sensors.' : sel.name === 'Saturn' ? '\uD83D\uDE80 Cassini orbited Saturn for 13 years (2004\u20132017) before its grand finale plunge into the atmosphere.' : sel.name === 'Uranus' ? '\uD83D\uDE80 Only Voyager 2 has visited Uranus, flying by in January 1986 and discovering 10 new moons.' : sel.name === 'Neptune' ? '\uD83D\uDE80 Voyager 2 is the only spacecraft to visit Neptune, flying by in August 1989.' : '\uD83D\uDE80 NASA\u2019s New Horizons flew past Pluto in July 2015, revealing a geologically active world.',
                          // More planet-specific facts
                          sel.name === 'Mars' ? '\uD83C\uDF21 Mars has the largest dust storms in the solar system \u2014 they can engulf the entire planet for months.' : sel.name === 'Venus' ? '\uD83C\uDF21 Venus rotates backwards (retrograde) so slowly that its day is longer than its year.' : sel.name === 'Jupiter' ? '\uD83E\uDEA8 Jupiter\u2019s core may be a fuzzy mix of metallic hydrogen and dissolved rocky material.' : sel.name === 'Saturn' ? '\uD83C\uDF0D Saturn\u2019s density is 0.687 g/cm\u00B3 \u2014 it would float in a bathtub big enough to hold it.' : sel.name === 'Uranus' ? '\uD83C\uDF21 Uranus was knocked on its side by an ancient collision with an Earth-sized object.' : sel.name === 'Neptune' ? '\uD83E\uDEA8 Neptune radiates 2.6x more energy than it receives from the Sun \u2014 its own internal heat drives supersonic winds.' : sel.name === 'Pluto' ? '\uD83C\uDF0D Pluto and its moon Charon are tidally locked \u2014 they always show the same face to each other.' : sel.name === 'Mercury' ? '\uD83C\uDF0D Mercury has virtually no atmosphere \u2014 just a thin exosphere of atoms blasted off the surface by solar wind.' : '\uD83E\uDDE0 Every atom in your body was forged inside a star.',
                          // Chemistry / science
                          '\uD83E\uDDEA Atmosphere: ' + atmosLabel,
                          sel.name === 'Mars' ? '\uD83E\uDDEA Mars\u2019s red color comes from iron oxide (rust) in its soil \u2014 the entire planet is literally rusty.' : sel.name === 'Venus' ? '\uD83E\uDDEA Venus\u2019s clouds contain sulfuric acid droplets \u2014 rain evaporates before reaching the surface.' : sel.name === 'Jupiter' ? '\uD83E\uDDEA Jupiter\u2019s interior contains metallic hydrogen \u2014 hydrogen so compressed it conducts electricity like a metal.' : sel.name === 'Saturn' ? '\uD83E\uDDEA Titan\u2019s thick atmosphere is mostly nitrogen, like Earth\u2019s, but with methane playing the role of water.' : sel.name === 'Uranus' ? '\uD83E\uDDEA Methane in Uranus\u2019s upper atmosphere absorbs red light, giving it that distinctive blue-green color.' : sel.name === 'Neptune' ? '\uD83E\uDDEA Neptune\u2019s vivid blue is from methane \u2014 but a still-unknown compound makes it bluer than Uranus.' : sel.name === 'Pluto' ? '\uD83E\uDDEA Tholins on Pluto\u2019s surface are complex organic molecules \u2014 building blocks for prebiotic chemistry.' : sel.name === 'Earth' ? '\uD83E\uDDEA Earth\u2019s ozone layer (O\u2083) absorbs 97\u201399% of the Sun\u2019s UV radiation, making life on land possible.' : '\uD83E\uDDEA Mercury\u2019s exosphere contains sodium, pumped off the surface by solar photons.'
                        ].filter(Boolean);
                        var factIdx = 0;
                        ticker.innerHTML = '\uD83D\uDCA1 ' + scienceFacts[0];
                        canvasEl.parentElement.appendChild(ticker);
                        var factTimer = setInterval(function () {
                          factIdx = (factIdx + 1) % scienceFacts.length;
                          ticker.style.opacity = '0';
                          setTimeout(function () { ticker.innerHTML = '\uD83D\uDCA1 ' + scienceFacts[factIdx]; ticker.style.opacity = '1'; }, 400);
                        }, 6000);

                        // ── Compass / bearing indicator (top-right) ──
                        var compass = document.createElement('div');
                        compass.style.cssText = 'position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);border-radius:50%;width:48px;height:48px;display:flex;align-items:center;justify-content:center;color:#38bdf8;font-size:18px;font-weight:bold;pointer-events:none;z-index:10;border:1px solid rgba(56,189,248,0.3)';
                        compass.innerHTML = '\uD83E\uDDED';
                        canvasEl.parentElement.appendChild(compass);

                        // ── 3rd-person camera toggle (V key) + Mission card (M key) ──
                        var thirdPerson = false;
                        var tpOffset = new THREE.Vector3(0, 3, 6);
                        canvasEl.addEventListener('keydown', function (e) {
                          if (e.key === 'v' || e.key === 'V') {
                            thirdPerson = !thirdPerson;
                            var label = document.getElementById('hud-mode');
                            if (label) {
                              var viewLabel = thirdPerson ? ' [3RD PERSON]' : ' [1ST PERSON]';
                              label.textContent = modeLabel + viewLabel;
                            }
                          }
                          if (e.key === 'm' || e.key === 'M') {
                            missionVisible = !missionVisible;
                            missionCard.style.display = missionVisible ? 'block' : 'none';
                            setTimeout(function () { missionCard.style.opacity = missionVisible ? '1' : '0'; }, 10);
                          }
                        });

                        // ── Patch animation loop for 3rd-person + compass ──
                        var origAnimate = animate3d;
                        cancelAnimationFrame(animId3d);
                        function animate3dV2() {
                          animId3d = requestAnimationFrame(animate3dV2);
                          tick3d++;
                          // Movement
                          var dir = new THREE.Vector3();
                          if (moveState.forward) dir.z -= 1;
                          if (moveState.back) dir.z += 1;
                          if (moveState.left) dir.x -= 1;
                          if (moveState.right) dir.x += 1;
                          dir.normalize().multiplyScalar(speed3d);
                          dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
                          playerPos.add(dir);
                          if (moveState.up) playerPos.y += speed3d;
                          if (moveState.down) playerPos.y = Math.max(isGas ? 1 : 1.0, playerPos.y - speed3d);
                          if (!isGas) playerPos.y = Math.max(1.6, playerPos.y);

                          if (thirdPerson) {
                            // 3rd person: camera behind and above
                            var behind = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).multiplyScalar(6);
                            camera.position.set(playerPos.x + behind.x, playerPos.y + 3, playerPos.z + behind.z);
                            camera.lookAt(playerPos.x, playerPos.y, playerPos.z);
                          } else {
                            camera.position.copy(playerPos);
                            camera.rotation.order = 'YXZ';
                            camera.rotation.y = yaw;
                            camera.rotation.x = pitch;
                          }

                          // Animate clouds
                          scene.children.forEach(function (c) {
                            if (c._cloudSpeed) {
                              c.position.x = Math.sin(tick3d * c._cloudSpeed) * 2;
                              c.position.z = Math.cos(tick3d * c._cloudSpeed * 0.7) * 1.5;
                            }
                          });

                          // Diamond rain
                          if (typeof diamonds !== 'undefined' && diamonds) {
                            var dArr = diamonds.geometry.attributes.position.array;
                            for (var dri = 0; dri < dArr.length; dri += 3) {
                              dArr[dri + 1] -= 0.05;
                              if (dArr[dri + 1] < -5) dArr[dri + 1] = 20;
                            }
                            diamonds.geometry.attributes.position.needsUpdate = true;
                          }

                          // Update compass bearing
                          var deg = ((yaw * 180 / Math.PI) % 360 + 360) % 360;
                          var dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
                          var dirLabel = dirs[Math.round(deg / 45) % 8];
                          compass.textContent = dirLabel;

                          // ── Live telemetry updates (every 3 frames for perf) ──
                          if (tick3d % 3 === 0) {
                            var dx = playerPos.x - prevPos.x, dz = playerPos.z - prevPos.z, dy = playerPos.y - prevPos.y;
                            var frameDist = Math.sqrt(dx * dx + dy * dy + dz * dz) * scaleFactor;
                            odometer += frameDist;
                            lastSpeed = frameDist * 20; // ~60fps/3 = 20 updates/s
                            prevPos.copy(playerPos);

                            var altEl = document.getElementById('hud-alt');
                            var spdEl = document.getElementById('hud-spd');
                            var hdgEl = document.getElementById('hud-hdg');
                            var posEl = document.getElementById('hud-pos');
                            var odoEl = document.getElementById('hud-odo');
                            var dscEl = document.getElementById('hud-disc');
                            var altitude = ((playerPos.y - (isGas ? 0 : 1.6)) * scaleFactor).toFixed(0);
                            if (altEl) altEl.textContent = altitude + ' m';
                            if (spdEl) spdEl.textContent = lastSpeed.toFixed(1) + ' m/s';
                            if (hdgEl) hdgEl.textContent = dirLabel + ' ' + Math.round(deg) + '\u00B0';
                            if (posEl) posEl.textContent = (playerPos.x * 10).toFixed(1) + ', ' + (playerPos.z * 10).toFixed(1);
                            if (odoEl) odoEl.textContent = odometer > 1000 ? (odometer / 1000).toFixed(1) + ' km' : Math.round(odometer) + ' m';
                            if (dscEl) dscEl.textContent = Object.keys(discoveredPOIs).length + ' / ' + totalPOIs;
                          }

                          // ── POI proximity detection (every 10 frames) ──
                          if (tick3d % 10 === 0) {
                            for (var pi2 = 0; pi2 < pois.length; pi2++) {
                              var poi = pois[pi2];
                              var pdx = playerPos.x - poi.x, pdz = playerPos.z - poi.z;
                              var poiDist = Math.sqrt(pdx * pdx + pdz * pdz);
                              if (poiDist < 4 && !discoveredPOIs[pi2]) {
                                showDiscovery(poi, pi2);
                                // Update mission card objectives
                                var objEl = document.getElementById('obj-' + pi2);
                                if (objEl) { objEl.innerHTML = '\u2611 <span style="color:#34d399;text-decoration:line-through">' + poi.name + '</span> \u2714'; }
                                var dcEl = document.getElementById('mission-disc-count');
                                if (dcEl) dcEl.textContent = Object.keys(discoveredPOIs).length + '/' + totalPOIs;
                                var xpEl = document.getElementById('mission-xp-count');
                                if (xpEl) xpEl.textContent = (Object.keys(discoveredPOIs).length * 10) + '';
                              }
                            }
                          }

                          // ── Pulse POI markers (animate opacity) ──
                          poiMeshes.forEach(function (m) {
                            if (m._pulsePhase !== undefined) {
                              m.material.opacity = 0.2 + Math.abs(Math.sin(tick3d * 0.03 + m._pulsePhase)) * 0.3;
                            } else if (m._poiIdx !== undefined && discoveredPOIs[m._poiIdx]) {
                              m.material.color.setHex(0x34d399); // green when discovered
                              m.material.opacity = 0.4;
                            } else if (m._poiIdx !== undefined) {
                              m.material.opacity = 0.5 + Math.abs(Math.sin(tick3d * 0.05)) * 0.3;
                            }
                          });

                          // ── Update rover/probe model position ──
                          roverGroup.position.x = playerPos.x;
                          roverGroup.position.z = playerPos.z;
                          if (!isGas) {
                            roverGroup.position.y = 0; // wheels on ground
                            roverGroup.rotation.y = yaw + Math.PI; // face movement direction
                          } else {
                            roverGroup.position.y = playerPos.y - 0.5;
                            roverGroup.rotation.y = yaw + Math.PI;
                            // Probe lights blink
                            if (redLight && greenLight) {
                              redLight.material.emissiveIntensity = Math.sin(tick3d * 0.1) > 0 ? 1.0 : 0.1;
                              greenLight.material.emissiveIntensity = Math.sin(tick3d * 0.1) > 0 ? 0.1 : 1.0;
                            }
                          }
                          // Hide rover in 1st person, show in 3rd
                          roverGroup.visible = thirdPerson;

                          renderer.render(scene, camera);
                        }
                        animId3d = requestAnimationFrame(animate3dV2);

                        // Resize handler
                        var ro3d = new ResizeObserver(function () {
                          W = canvasEl.offsetWidth; H = canvasEl.offsetHeight;
                          camera.aspect = W / H; camera.updateProjectionMatrix();
                          renderer.setSize(W, H);
                        });
                        ro3d.observe(canvasEl);

                        canvasEl._droneCleanup = function () {
                          cancelAnimationFrame(animId3d);
                          clearInterval(factTimer);
                          clearInterval(hazardTimer);
                          document.removeEventListener('mousemove', onMouseMove);
                          if (document.pointerLockElement === canvasEl) document.exitPointerLock();
                          ro3d.disconnect();
                          renderer.dispose();
                          if (hud.parentElement) hud.parentElement.removeChild(hud);
                          if (ticker.parentElement) ticker.parentElement.removeChild(ticker);
                          if (compass.parentElement) compass.parentElement.removeChild(compass);
                          if (hazardEl.parentElement) hazardEl.parentElement.removeChild(hazardEl);
                          if (discCard.parentElement) discCard.parentElement.removeChild(discCard);
                          if (missionCard.parentElement) missionCard.parentElement.removeChild(missionCard);
                          if (discTimeout) clearTimeout(discTimeout);
                        };
                        canvasEl._droneRO = ro3d;
                      }

                      // Load Three.js and init
                      if (window.THREE) { doInit(window.THREE); }
                      else {
                        var s = document.createElement('script');
                        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
                        s.onload = function () { doInit(window.THREE); };
                        document.head.appendChild(s);
                      }
                    }
                  }),
                  // ── Quiz Mode ──
                  React.createElement("div", { className: "mt-4 border-t border-slate-200 pt-3" },
                    React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                      React.createElement("button", {
                        onClick: () => {
                          const QUIZ_QS = [
                            { q: 'Which planet is the hottest?', a: 'Venus', opts: ['Mercury', 'Venus', 'Mars', 'Jupiter'], tip: 'Venus has a runaway greenhouse effect reaching 462\u00B0C!' },
                            { q: 'Which planet has the most moons?', a: 'Saturn', opts: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'], tip: 'Saturn has 146 known moons as of 2024!' },
                            { q: 'Which planet rotates on its side?', a: 'Uranus', opts: ['Neptune', 'Uranus', 'Saturn', 'Pluto'], tip: 'Uranus has an axial tilt of 97.77\u00B0!' },
                            { q: 'Which is the smallest planet?', a: 'Mercury', opts: ['Mercury', 'Mars', 'Pluto', 'Venus'], tip: 'Mercury is only 4,879 km in diameter.' },
                            { q: 'Which planet has the longest year?', a: 'Pluto', opts: ['Neptune', 'Pluto', 'Uranus', 'Saturn'], tip: 'Pluto takes 248 Earth years to orbit the Sun!' },
                            { q: 'Which planet has the shortest day?', a: 'Jupiter', opts: ['Jupiter', 'Saturn', 'Earth', 'Mars'], tip: 'Jupiter rotates in just 10 hours!' },
                            { q: 'Which planet is known as the Red Planet?', a: 'Mars', opts: ['Venus', 'Mars', 'Mercury', 'Jupiter'], tip: 'Iron oxide (rust) gives Mars its red color.' },
                            { q: 'Which planet could float in water?', a: 'Saturn', opts: ['Jupiter', 'Saturn', 'Neptune', 'Uranus'], tip: 'Saturn\u2019s density is less than water (0.687 g/cm\u00B3)!' },
                            { q: 'Where is the tallest volcano in the solar system?', a: 'Mars', opts: ['Earth', 'Venus', 'Mars', 'Jupiter'], tip: 'Olympus Mons on Mars is 21.9 km high \u2014 nearly 3x Everest!' },
                            { q: 'Which planet has the strongest winds?', a: 'Neptune', opts: ['Jupiter', 'Saturn', 'Neptune', 'Uranus'], tip: 'Neptune\u2019s winds reach 2,100 km/h!' },
                          ];
                          const q = QUIZ_QS[Math.floor(Math.random() * QUIZ_QS.length)];
                          upd('quiz', { ...q, answered: false, correct: null, score: d.quiz?.score || 0, streak: d.quiz?.streak || 0 });
                        }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.quiz ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-600 text-white') + " hover:opacity-90 transition-all"
                      }, d.quiz ? "\uD83D\uDD04 Next Question" : "\uD83E\uDDE0 Quiz Mode"),
                      d.quiz && d.quiz.score > 0 && React.createElement("span", { className: "text-xs font-bold text-emerald-600" }, "\u2B50 " + d.quiz.score + " correct | \uD83D\uDD25 " + d.quiz.streak + " streak")
                    ),
                    d.quiz && React.createElement("div", { className: "bg-indigo-50 rounded-xl p-4 border border-indigo-200 animate-in slide-in-from-bottom" },
                      React.createElement("p", { className: "text-sm font-bold text-indigo-800 mb-3" }, d.quiz.q),
                      React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                        d.quiz.opts.map(function (opt) {
                          var isCorrect = opt === d.quiz.a;
                          var wasChosen = d.quiz.chosen === opt;
                          var cls = !d.quiz.answered ? 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50' : isCorrect ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : wasChosen && !isCorrect ? 'bg-red-100 text-red-800 border-red-300' : 'bg-slate-50 text-slate-400 border-slate-200';
                          return React.createElement("button", {
                            key: opt, disabled: d.quiz.answered, onClick: function () {
                              var correct = opt === d.quiz.a;
                              upd('quiz', Object.assign({}, d.quiz, { answered: true, correct: correct, chosen: opt, score: d.quiz.score + (correct ? 1 : 0), streak: correct ? d.quiz.streak + 1 : 0 }));
                              if (correct) addToast('\u2705 Correct! ' + d.quiz.tip, 'success');
                              else addToast('\u274C The answer is ' + d.quiz.a + '. ' + d.quiz.tip, 'error');
                            }, className: "px-3 py-2 rounded-lg text-sm font-bold border-2 transition-all " + cls
                          }, opt);
                        })
                      ),
                      d.quiz.answered && React.createElement("p", { className: "mt-2 text-xs text-indigo-600 italic" }, "\uD83D\uDCA1 " + d.quiz.tip)
                    ),
                    // ── Planet Comparison ──
                    React.createElement("div", { className: "mt-3" },
                      React.createElement("p", { className: "text-xs font-bold text-slate-500 mb-1" }, "\uD83D\uDD0D Compare Planets"),
                      React.createElement("div", { className: "flex gap-2 mb-2" },
                        React.createElement("select", { value: d.compare1 || '', onChange: function (e) { upd('compare1', e.target.value); }, className: "flex-1 px-2 py-1 border rounded text-sm" },
                          React.createElement("option", { value: "" }, "Select..."),
                          PLANETS.map(function (p) { return React.createElement("option", { key: p.name, value: p.name }, p.name); })
                        ),
                        React.createElement("span", { className: "text-slate-400 font-bold self-center" }, "vs"),
                        React.createElement("select", { value: d.compare2 || '', onChange: function (e) { upd('compare2', e.target.value); }, className: "flex-1 px-2 py-1 border rounded text-sm" },
                          React.createElement("option", { value: "" }, "Select..."),
                          PLANETS.map(function (p) { return React.createElement("option", { key: p.name, value: p.name }, p.name); })
                        )
                      ),
                      d.compare1 && d.compare2 && (function () {
                        var p1 = PLANETS.find(function (p) { return p.name === d.compare1; });
                        var p2 = PLANETS.find(function (p) { return p.name === d.compare2; });
                        if (!p1 || !p2) return null;
                        var GRAVITY = { Mercury: 0.38, Venus: 0.91, Earth: 1.0, Mars: 0.38, Jupiter: 2.34, Saturn: 1.06, Uranus: 0.92, Neptune: 1.19, Pluto: 0.06 };
                        return React.createElement("div", { className: "grid grid-cols-3 gap-1 text-center text-xs" },
                          [['', p1.name, p2.name], ['\uD83C\uDF21 Temp', p1.temp, p2.temp], ['\u2600 Day', p1.dayLen, p2.dayLen], ['\uD83C\uDF0D Year', p1.yearLen, p2.yearLen], ['\uD83D\uDCCF Size', p1.diameter, p2.diameter], ['\uD83C\uDF11 Moons', p1.moons, p2.moons], ['\u2696 Gravity', (GRAVITY[p1.name] || 1).toFixed(2) + 'g', (GRAVITY[p2.name] || 1).toFixed(2) + 'g'], ['\uD83E\uDDD1 70kg on', Math.round(70 * (GRAVITY[p1.name] || 1)) + 'kg', Math.round(70 * (GRAVITY[p2.name] || 1)) + 'kg']].map(function (row, ri) {
                            return React.createElement(React.Fragment, { key: ri },
                              row.map(function (cell, ci) {
                                return React.createElement("div", { key: ci, className: "py-1 " + (ri === 0 ? 'font-black text-slate-700' : ci === 0 ? 'font-bold text-slate-500' : 'font-bold text-slate-700') + (ri > 0 && ri % 2 === 0 ? ' bg-slate-50' : '') }, cell);
                              })
                            );
                          })
                        );
                      })()
                    )
                  ),
                ),
              ),
              React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'ss-' + Date.now(), tool: 'solarSystem', label: sel ? sel.name : 'Solar System', data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")
            )
          );
        })(),

        stemLabTab === 'explore' && stemLabTool === 'galaxy' && (() => {
          var d = labToolData.galaxy || {};
          var upd = function (key, val) { setLabToolData(function (prev) { return Object.assign({}, prev, { galaxy: Object.assign({}, prev.galaxy || {}, (function () { var o = {}; o[key] = val; return o; })()) }); }); };

          // ── Layer toggle defaults ──
          var layers = d.layers || { arms: true, bulge: true, blackHole: true, nebulae: true, bgStars: true, grid: false, labels: false };
          var starCount = d.starCount || 5000;
          var cosmicAge = d.cosmicAge !== undefined ? d.cosmicAge : 10;
          var showLifecycle = d.showLifecycle || false;
          var lifecycleMass = d.lifecycleMass !== undefined ? d.lifecycleMass : 1;
          var showSNAnim = d.showSNAnim || false;
          var galaxyType = d.galaxyType || 'barredSpiral';

          // ── Star type data (OBAFGKM Harvard classification) ──
          var STAR_TYPES = [
            { id: 'O', label: 'O-type', color: '#9bb0ff', temp: '30,000+', pct: 0.003, example: 'Naos', desc: 'Extremely hot, blue, massive. Rarest type \u2014 short lives of only a few million years.', whyItMatters: 'O-type stars produce most of a galaxy\'s ultraviolet light and ionize surrounding gas, creating the glowing emission nebulae we see. Their supernovae seed the universe with heavy elements like iron and gold.', luminosity: '30,000-1,000,000x Sun', mass: '16-150 M\u2609', lifetime: '1-10 Myr' },
            { id: 'B', label: 'B-type', color: '#aabfff', temp: '10,000-30,000', pct: 0.13, example: 'Rigel', desc: 'Blue-white giants. Often found in young OB associations and spiral arms.', whyItMatters: 'B-type stars trace the spiral arms of galaxies because they are short-lived. Astronomers use them as markers for galactic structure and recent star formation.', luminosity: '25-30,000x Sun', mass: '2.1-16 M\u2609', lifetime: '10-100 Myr' },
            { id: 'A', label: 'A-type', color: '#cad7ff', temp: '7,500-10,000', pct: 0.6, example: 'Sirius', desc: 'White stars with strong hydrogen absorption lines. Many are binary systems.', whyItMatters: 'A-type stars like Sirius were among the first to have their spectra analyzed, helping astronomers develop the stellar classification system we use today.', luminosity: '5-25x Sun', mass: '1.4-2.1 M\u2609', lifetime: '1-2 Gyr' },
            { id: 'F', label: 'F-type', color: '#f8f7ff', temp: '6,000-7,500', pct: 3, example: 'Procyon', desc: 'Yellow-white. Transition zone where convection begins in the outer layer.', whyItMatters: 'F-type stars are interesting for exoplanet searches because they have habitable zones and lifespans long enough for complex life to potentially develop.', luminosity: '1.5-5x Sun', mass: '1.04-1.4 M\u2609', lifetime: '2-4 Gyr' },
            { id: 'G', label: 'G-type', color: '#fff4ea', temp: '5,200-6,000', pct: 7.6, example: 'Sun', desc: 'Our Sun is a G2V star! Yellow stars with lifespans of ~10 billion years.', whyItMatters: 'G-type stars like our Sun prove that modest stars can nurture life. Their 10-billion-year lifespan gives plenty of time for biological evolution.', luminosity: '0.6-1.5x Sun', mass: '0.8-1.04 M\u2609', lifetime: '10 Gyr' },
            { id: 'K', label: 'K-type', color: '#ffd2a1', temp: '3,700-5,200', pct: 12.1, example: 'Arcturus', desc: 'Orange stars. Many have habitable zones \u2014 prime candidates for exoplanet searches.', whyItMatters: 'K-type stars are considered the best candidates for finding habitable exoplanets\u2014they are stable, long-lived, and common enough to offer many opportunities.', luminosity: '0.08-0.6x Sun', mass: '0.45-0.8 M\u2609', lifetime: '15-30 Gyr' },
            { id: 'M', label: 'M-type', color: '#ffcc6f', temp: '2,400-3,700', pct: 76.5, example: 'Proxima Centauri', desc: 'Red dwarfs \u2014 76% of all stars! Extremely long-lived (trillions of years).', whyItMatters: 'M-type red dwarfs will be the last stars shining in the universe. Proxima Centauri b, a potentially habitable exoplanet, orbits one of these stars\u2014our closest neighbor!', luminosity: '0.001-0.08x Sun', mass: '0.08-0.45 M\u2609', lifetime: '100+ Gyr' }
          ];

          // ── Nebulae + deep-sky objects (expanded from 4 to 8) ──
          var NEBULAE = [
            { name: 'Orion Nebula', x: 0.35, y: 0.02, z: 0.15, r: 0.08, color: '#ff6b9d', type: 'Emission', dist: '1,344 ly', desc: 'Stellar nursery 1,344 light-years away. Visible to the naked eye. Contains the Trapezium star cluster.' },
            { name: 'Eagle Nebula', x: -0.2, y: 0.01, z: -0.25, r: 0.06, color: '#7c6dff', type: 'Emission', dist: '7,000 ly', desc: 'Home of the Pillars of Creation. Star-forming region 7,000 light-years from Earth.' },
            { name: 'Crab Nebula', x: 0.4, y: 0.05, z: -0.1, r: 0.05, color: '#00d4aa', type: 'Supernova Remnant', dist: '6,500 ly', desc: 'Supernova remnant from 1054 AD. Contains a pulsar spinning 30x per second.' },
            { name: 'Carina Nebula', x: -0.3, y: -0.02, z: 0.3, r: 0.07, color: '#ff9f43', type: 'Emission', dist: '8,500 ly', desc: 'One of the largest nebulae. Contains Eta Carinae, a hypergiant 4 million times brighter than the Sun.' },
            { name: 'Helix Nebula', x: 0.25, y: -0.01, z: -0.3, r: 0.05, color: '#00bcd4', type: 'Planetary', dist: '655 ly', desc: 'The "Eye of God." A planetary nebula \u2014 the outer shell of a dying Sun-like star.' },
            { name: 'Ring Nebula', x: -0.15, y: 0.03, z: 0.2, r: 0.04, color: '#e040fb', type: 'Planetary', dist: '2,283 ly', desc: 'Classic planetary nebula in Lyra. The central white dwarf is visible at high zoom.' },
            { name: 'Horsehead Nebula', x: 0.32, y: 0.01, z: 0.05, r: 0.04, color: '#8d6e63', type: 'Dark', dist: '1,375 ly', desc: 'Dark nebula silhouetted against the emission nebula IC 434. An iconic astronomical object.' },
            { name: 'Lagoon Nebula', x: -0.1, y: -0.01, z: -0.15, r: 0.06, color: '#ef5350', type: 'Emission', dist: '4,100 ly', desc: 'One of the brightest emission nebulae. Visible with binoculars in Sagittarius.' }
          ];

          // ── Galaxy type definitions ──
          var GALAXY_TYPES = {
            barredSpiral: { label: 'Barred Spiral', icon: '\uD83C\uDF00', desc: 'Like our Milky Way. A central bar of stars with spiral arms winding outward. ~60% of spirals have bars.', example: 'Milky Way, NGC 1300', arms: 4, barLength: 0.15, windTightness: 2.5 },
            grandDesign: { label: 'Grand Design Spiral', icon: '\uD83C\uDF00', desc: 'Prominent, well-defined spiral arms. Usually triggered by gravitational interaction with a companion galaxy.', example: 'M51 (Whirlpool), M81', arms: 2, barLength: 0, windTightness: 3.5 },
            elliptical: { label: 'Elliptical', icon: '\u2B2D\uFE0F', desc: 'Smooth, featureless ellipsoidal shape. Contain old, red stars with little gas or dust. Formed from galaxy mergers.', example: 'M87, M49', arms: 0, barLength: 0, windTightness: 0 },
            irregular: { label: 'Irregular', icon: '\u2728', desc: 'No distinct shape. Rich in gas and dust with active star formation. Often satellites of larger galaxies.', example: 'LMC, SMC', arms: 0, barLength: 0, windTightness: 0 }
          };
          var gType = GALAXY_TYPES[galaxyType] || GALAXY_TYPES.barredSpiral;

          // ── Warp points ──
          var WARP_POINTS = [
            { label: 'Galactic Core', x: 0, y: 0, z: 0, zoom: 2 },
            { label: 'Orion Arm (Us)', x: 0.35, y: 0, z: 0.1, zoom: 4, desc: 'Our Solar System is here, about 26,000 light-years from the center.' },
            { label: 'Perseus Arm', x: 0.5, y: 0, z: -0.2, zoom: 3, desc: 'The next spiral arm outward from us. Contains many young, hot stars.' },
            { label: 'Sagittarius Arm', x: -0.15, y: 0, z: 0.35, zoom: 3, desc: 'The next arm inward toward the galactic center.' },
            { label: 'Overview', x: 0, y: 0.8, z: 0, zoom: 0.8, desc: 'Full view of the galaxy from above.' }
          ];

          // ── Quiz bank (expanded from 10 to 15) ──
          var QUIZ_BANK = [
            { q: 'What type of star is our Sun?', a: 'G-type', options: ['O-type', 'A-type', 'G-type', 'M-type'] },
            { q: 'What is at the center of the Milky Way?', a: 'Supermassive black hole', options: ['Supermassive black hole', 'Giant star', 'Neutron star', 'Nebula'] },
            { q: 'Which star type is the hottest?', a: 'O-type', options: ['M-type', 'G-type', 'A-type', 'O-type'] },
            { q: 'Which spiral arm contains our Solar System?', a: 'Orion Arm', options: ['Perseus Arm', 'Orion Arm', 'Sagittarius Arm', 'Norma Arm'] },
            { q: 'What percentage of stars are M-type red dwarfs?', a: '~76%', options: ['~10%', '~30%', '~50%', '~76%'] },
            { q: 'What is a nebula?', a: 'A cloud of gas and dust', options: ['A dead star', 'A cloud of gas and dust', 'A type of galaxy', 'A black hole'] },
            { q: 'How many stars are in the Milky Way?', a: '100-400 billion', options: ['1 million', '100 million', '100-400 billion', '1 trillion'] },
            { q: 'What type of galaxy is the Milky Way?', a: 'Barred spiral', options: ['Elliptical', 'Irregular', 'Spiral', 'Barred spiral'] },
            { q: 'Which star is closest to our Sun?', a: 'Proxima Centauri', options: ['Sirius', 'Proxima Centauri', 'Alpha Centauri A', 'Barnards Star'] },
            { q: 'What color are the hottest stars?', a: 'Blue', options: ['Red', 'Yellow', 'White', 'Blue'] },
            { q: 'What is a planetary nebula?', a: 'Outer layers shed by a dying star', options: ['A nebula with planets', 'Outer layers shed by a dying star', 'Gas around a planet', 'A type of dark matter'] },
            { q: 'How wide is the Milky Way?', a: '~100,000 light-years', options: ['~1,000 light-years', '~10,000 light-years', '~100,000 light-years', '~1 million light-years'] },
            { q: 'What causes a supernova?', a: 'A massive star exploding', options: ['Two galaxies colliding', 'A massive star exploding', 'A nebula igniting', 'A black hole evaporating'] },
            { q: 'What is dark matter?', a: 'Invisible matter detected by gravity', options: ['Black holes', 'Invisible matter detected by gravity', 'Empty space', 'Antimatter'] },
            { q: 'How long does it take light to cross the Milky Way?', a: '~100,000 years', options: ['~1,000 years', '~10,000 years', '~100,000 years', '~1 million years'] }
          ];

          // ── Scale data ──
          var SCALE_INFO = [
            { label: 'Galaxy Diameter', value: '~100,000 light-years' },
            { label: 'Disk Thickness', value: '~2,000 light-years' },
            { label: 'Central Bulge', value: '~10,000 light-years' },
            { label: 'Sun to Center', value: '~26,000 light-years' },
            { label: 'Stars', value: '100\u2013400 billion' },
            { label: 'Age', value: '~13.6 billion years' }
          ];

          // ── Epoch narration for time-lapse ──
          var EPOCH_NARRATION = [
            { age: 0.1, title: 'Cosmic Dawn', emoji: '\u2728', desc: 'The first stars ignite, ending the cosmic dark ages. These massive Population III stars forge the first heavy elements.' },
            { age: 0.4, title: 'First Galaxies', emoji: '\uD83C\uDF0C', desc: 'Protogalaxies begin to coalesce from dark matter halos. The first quasars blaze to life, powered by supermassive black holes.' },
            { age: 1.0, title: 'Galaxy Assembly', emoji: '\uD83C\uDF00', desc: 'Galaxies collide and merge, building larger structures. Spiral arms begin to form as gas settles into rotating disks.' },
            { age: 4.6, title: 'Milky Way Forms', emoji: '\uD83C\uDF1F', desc: 'Our galaxy takes shape. The galactic bar forms, organizing the inner structure. Star formation peaks in the spiral arms.' },
            { age: 9.2, title: 'Sun Is Born', emoji: '\u2600\uFE0F', desc: 'A cloud of gas collapses in the Orion Arm, forming our Sun and Solar System 4.6 billion years ago. Life will eventually arise on Earth.' },
            { age: 10.0, title: 'Mature Galaxy', emoji: '\uD83D\uDD2D', desc: 'The Milky Way settles into its current form with 200-400 billion stars. Star formation slows as gas reserves deplete.' },
            { age: 13.0, title: 'Present Era', emoji: '\uD83C\uDF0D', desc: 'We are here! Humanity looks outward. The universe continues expanding, and dark energy accelerates its growth.' },
            { age: 13.8, title: 'Right Now', emoji: '\uD83D\uDE80', desc: 'The observable universe is 93 billion light-years across. We can see the cosmic microwave background\u2014the afterglow of the Big Bang.' }
          ];
          function getEpochNarration(age) {
            var best = null;
            for (var i = EPOCH_NARRATION.length - 1; i >= 0; i--) {
              if (age >= EPOCH_NARRATION[i].age) { best = EPOCH_NARRATION[i]; break; }
            }
            return best;
          }

          // ── Cosmic age ↔ star distribution ──
          function getAgeDistribution(age) {
            var t = Math.max(0, Math.min(14, age));
            var early = Math.max(0, 1 - t / 5);
            var late = Math.min(1, t / 8);
            return [
              0.003 + early * 0.05,
              0.13 + early * 1.5,
              0.6 + early * 3.0,
              3 + early * 4.0,
              7.6 - late * 2,
              12.1 + late * 3,
              76.5 + late * 10
            ];
          }

          // ── Stellar lifecycle data ──
          var LIFECYCLE = {
            stages: [
              { name: 'Nebula', emoji: '\u2601\uFE0F', desc: 'A vast cloud of gas & dust collapses under gravity.', color: '#a855f7' },
              { name: 'Protostar', emoji: '\uD83D\uDFE0', desc: 'Core heats up from gravitational compression. Not yet fusing.', color: '#fb923c' },
              { name: 'Main Sequence', emoji: '\u2B50', desc: 'Hydrogen fusion ignites! Stable for millions to billions of years.', color: '#fbbf24' },
              { name: 'Red Giant', emoji: '\uD83D\uDD34', desc: 'Core contracts, outer layers expand. Helium fusion begins.', color: '#ef4444' }
            ],
            lowMass: [
              { name: 'Planetary Nebula', emoji: '\uD83D\uDFE3', desc: 'Outer layers shed gently into space.', color: '#818cf8' },
              { name: 'White Dwarf', emoji: '\u26AA', desc: 'Dense stellar core slowly cools. Size of Earth, mass of Sun.', color: '#e2e8f0' }
            ],
            highMass: [
              { name: 'Supernova', emoji: '\uD83D\uDCA5', desc: 'Core collapses! A catastrophic explosion outshining entire galaxies.', color: '#fbbf24' },
              { name: 'Neutron Star', emoji: '\u2B50', desc: 'Ultra-dense remnant. A teaspoon weighs billions of tons.', color: '#38bdf8', maxMass: 25 },
              { name: 'Black Hole', emoji: '\uD83D\uDD73\uFE0F', desc: 'Gravity so strong nothing escapes. Spacetime itself warps.', color: '#1e1b4b', minMass: 25 }
            ]
          };

          // ── Three.js init with layer groups ──
          // Post-processing script loader
          function loadGalaxyPP(cb) {
            if (window._galaxyPPLoaded) { cb(); return; }
            var urls = [
              'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js',
              'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js',
              'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js',
              'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js',
              'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js',
              'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js'
            ];
            var idx = 0;
            function next() {
              if (idx >= urls.length) { window._galaxyPPLoaded = true; cb(); return; }
              var s = document.createElement('script');
              s.src = urls[idx]; s.onload = function () { idx++; next(); };
              s.onerror = function () { idx++; next(); };
              document.head.appendChild(s);
            }
            next();
          }

          var canvasRefCb = function (canvasEl) {
            if (!canvasEl) {
              var prev = document.querySelector('[data-galaxy-canvas]');
              if (prev && prev._galaxyCleanup) { prev._galaxyCleanup(); prev._galaxyInit = false; }
              return;
            }
            if (canvasEl._galaxyInit) return;
            canvasEl._galaxyInit = true;
            var doInit = function () { loadGalaxyPP(function () { initGalaxy(canvasEl); }); };
            if (window.THREE) { doInit(); } else {
              var script = document.createElement('script');
              script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
              script.onload = doInit;
              document.head.appendChild(script);
            }
          };

          function generateStars(THREE, count, gType, galaxyType, ageDist) {
            var starGeo = new THREE.BufferGeometry();
            var starPos = new Float32Array(count * 3), starColors = new Float32Array(count * 3), starData = [];
            var starTypeArr = new Float32Array(count), starPhaseArr = new Float32Array(count);
            for (var i = 0; i < count; i++) {
              var x, y, z;
              if (galaxyType === 'elliptical') {
                var r = Math.pow(Math.random(), 0.5) * 0.6;
                var theta = Math.random() * Math.PI * 2;
                var phi = (Math.random() - 0.5) * Math.PI;
                x = Math.cos(theta) * Math.cos(phi) * r;
                z = Math.sin(theta) * Math.cos(phi) * r;
                y = Math.sin(phi) * r * 0.6;
              } else if (galaxyType === 'irregular') {
                x = (Math.random() - 0.5) * 0.8;
                z = (Math.random() - 0.5) * 0.6;
                y = (Math.random() - 0.5) * 0.3;
                var clumpChance = Math.random();
                if (clumpChance < 0.3) { var cx = (Math.random() - 0.5) * 0.4; var cz = (Math.random() - 0.5) * 0.3; x = cx + (Math.random() - 0.5) * 0.15; z = cz + (Math.random() - 0.5) * 0.15; y *= 0.5; }
              } else {
                var arm = i % (gType.arms || 4);
                var armAngle = (arm / (gType.arms || 4)) * Math.PI * 2;
                var dist = Math.pow(Math.random(), 0.6) * 0.8;
                var windTight = gType.windTightness || 2.5;
                var barLen = gType.barLength || 0;
                var angle = armAngle + dist * windTight + (Math.random() - 0.5) * 0.4 * (1 - dist * 0.5);
                if (barLen > 0 && dist < barLen) {
                  var barAngle = (arm % 2 === 0) ? 0 : Math.PI;
                  x = Math.cos(barAngle) * dist + (Math.random() - 0.5) * 0.03;
                  z = Math.sin(barAngle) * dist * 0.15 + (Math.random() - 0.5) * 0.02;
                } else {
                  x = Math.cos(angle) * dist + (Math.random() - 0.5) * 0.03;
                  z = Math.sin(angle) * dist + (Math.random() - 0.5) * 0.03;
                }
                y = (Math.random() - 0.5) * 0.04 * (1 - dist);
              }
              starPos[i * 3] = x; starPos[i * 3 + 1] = y; starPos[i * 3 + 2] = z;
              var pcts = ageDist || [0.003, 0.13, 0.6, 3, 7.6, 12.1, 76.5];
              var pctTotal = pcts.reduce(function (a, b) { return a + b; }, 0);
              var cum = 0, roll = Math.random() * pctTotal, typeIdx = 6;
              for (var ti = 0; ti < pcts.length; ti++) { cum += pcts[ti]; if (roll < cum) { typeIdx = ti; break; } }
              var st = STAR_TYPES[typeIdx], c = new THREE.Color(st.color);
              starColors[i * 3] = c.r; starColors[i * 3 + 1] = c.g; starColors[i * 3 + 2] = c.b;
              starTypeArr[i] = typeIdx; starPhaseArr[i] = Math.random();
              starData.push({ type: st, x: x, y: y, z: z, idx: i });
            }
            starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
            starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
            starGeo.setAttribute('aStarType', new THREE.BufferAttribute(starTypeArr, 1));
            starGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhaseArr, 1));
            return { geo: starGeo, data: starData };
          }

          function initGalaxy(canvasEl) {
            var THREE = window.THREE;
            var W = canvasEl.offsetWidth, H = canvasEl.offsetHeight;
            var scene = new THREE.Scene();
            var camera = new THREE.PerspectiveCamera(60, W / H, 0.01, 100);
            camera.position.set(0, 0.5, 1.2); camera.lookAt(0, 0, 0);
            var renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
            renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setClearColor(0x050510);

            // ── Layer groups ──
            var bgGroup = new THREE.Group(); bgGroup.name = 'bgStars';
            var armGroup = new THREE.Group(); armGroup.name = 'arms';
            var bulgeGroup = new THREE.Group(); bulgeGroup.name = 'bulge';
            var bhGroup = new THREE.Group(); bhGroup.name = 'blackHole';
            var nebGroup = new THREE.Group(); nebGroup.name = 'nebulae';
            var gridGroup = new THREE.Group(); gridGroup.name = 'grid'; gridGroup.visible = false;
            var labelGroup = new THREE.Group(); labelGroup.name = 'labels'; labelGroup.visible = false;
            scene.add(bgGroup); scene.add(armGroup); scene.add(bulgeGroup);
            scene.add(bhGroup); scene.add(nebGroup); scene.add(gridGroup); scene.add(labelGroup);

            // Background stars
            var bgGeo = new THREE.BufferGeometry(), bgCount = 2000, bgPos = new Float32Array(bgCount * 3);
            for (var i = 0; i < bgCount; i++) { bgPos[i * 3] = (Math.random() - 0.5) * 20; bgPos[i * 3 + 1] = (Math.random() - 0.5) * 20; bgPos[i * 3 + 2] = (Math.random() - 0.5) * 20; }
            bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
            bgGroup.add(new THREE.Points(bgGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.02, transparent: true, opacity: 0.4 })));

            // Spiral galaxy stars
            var starResult = generateStars(THREE, starCount, gType, galaxyType);
            var starShaderMat = new THREE.ShaderMaterial({
              uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() } },
              vertexShader: [
                'attribute float aStarType;',
                'attribute float aPhase;',
                'varying vec3 vSC;',
                'varying float vA;',
                'uniform float uTime;',
                'uniform float uPR;',
                'void main() {',
                '  vSC = color;',
                '  float sz = 14.0 - aStarType * 1.7;',
                '  vA = 0.7 + 0.3 * sin(uTime * 1.5 + aPhase * 6.283);',
                '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
                '  gl_PointSize = sz * uPR * (200.0 / max(-mv.z, 0.1));',
                '  gl_Position = projectionMatrix * mv;',
                '}'
              ].join('\n'),
              fragmentShader: [
                'varying vec3 vSC;',
                'varying float vA;',
                'void main() {',
                '  float d = length(gl_PointCoord - 0.5) * 2.0;',
                '  if (d > 1.0) discard;',
                '  float glow = exp(-d * d * 3.0);',
                '  float core = smoothstep(1.0, 0.0, d);',
                '  gl_FragColor = vec4(vSC * (0.3 + 0.7 * glow), core * vA * 0.9);',
                '}'
              ].join('\n'),
              vertexColors: true,
              transparent: true,
              depthWrite: false,
              blending: THREE.AdditiveBlending
            });
            var starPoints = new THREE.Points(starResult.geo, starShaderMat);
            armGroup.add(starPoints);
            var starData = starResult.data;

            // Central bulge
            var bulgeGeo = new THREE.BufferGeometry(), bulgeCount = 800;
            var bulgePos = new Float32Array(bulgeCount * 3), bulgeCol = new Float32Array(bulgeCount * 3);
            for (var i = 0; i < bulgeCount; i++) {
              var r = Math.pow(Math.random(), 2) * 0.12, th = Math.random() * Math.PI * 2, ph = (Math.random() - 0.5) * Math.PI * 0.4;
              bulgePos[i * 3] = Math.cos(th) * Math.cos(ph) * r; bulgePos[i * 3 + 1] = Math.sin(ph) * r * 0.5; bulgePos[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * r;
              var warmth = 0.8 + Math.random() * 0.2; bulgeCol[i * 3] = warmth; bulgeCol[i * 3 + 1] = warmth * 0.85; bulgeCol[i * 3 + 2] = warmth * 0.5;
            }
            bulgeGeo.setAttribute('position', new THREE.BufferAttribute(bulgePos, 3));
            bulgeGeo.setAttribute('color', new THREE.BufferAttribute(bulgeCol, 3));
            bulgeGroup.add(new THREE.Points(bulgeGeo, new THREE.PointsMaterial({ size: 0.01, vertexColors: true, transparent: true, opacity: 0.8 })));
            // Bulge glow sprite
            var bgCv = document.createElement('canvas'); bgCv.width = 128; bgCv.height = 128;
            var bgCtx = bgCv.getContext('2d');
            var bgGrad = bgCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
            bgGrad.addColorStop(0, 'rgba(255,220,150,0.5)'); bgGrad.addColorStop(0.3, 'rgba(255,180,100,0.2)');
            bgGrad.addColorStop(0.6, 'rgba(200,150,80,0.05)'); bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
            bgCtx.fillStyle = bgGrad; bgCtx.fillRect(0, 0, 128, 128);
            var bulgeTex = new THREE.CanvasTexture(bgCv);
            var bulgeGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: bulgeTex, transparent: true, blending: THREE.AdditiveBlending }));
            bulgeGlow.scale.set(0.35, 0.15, 1); bulgeGroup.add(bulgeGlow);

            // Black hole + enhanced accretion disk
            bhGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.01, 24, 24), new THREE.MeshBasicMaterial({ color: 0x000000 })));
            // Multi-ring accretion disk with color gradient
            var ringColors = [[0.015, 0.025, 0xffffcc, 0.8], [0.025, 0.035, 0xffaa44, 0.6], [0.035, 0.045, 0xff6622, 0.4], [0.045, 0.055, 0xcc3311, 0.2]];
            var rings = [];
            ringColors.forEach(function (rc) {
              var r = new THREE.Mesh(new THREE.RingGeometry(rc[0], rc[1], 48), new THREE.MeshBasicMaterial({ color: rc[2], side: THREE.DoubleSide, transparent: true, opacity: rc[3], blending: THREE.AdditiveBlending }));
              r.rotation.x = Math.PI * 0.5; bhGroup.add(r); rings.push(r);
            });
            var ring = rings[0];
            // Black hole glow sprite
            var bhGlowCv = document.createElement('canvas'); bhGlowCv.width = 64; bhGlowCv.height = 64;
            var bhGc = bhGlowCv.getContext('2d');
            var bhGrad = bhGc.createRadialGradient(32, 32, 0, 32, 32, 32);
            bhGrad.addColorStop(0, 'rgba(255,200,100,0.6)'); bhGrad.addColorStop(0.3, 'rgba(255,120,40,0.2)'); bhGrad.addColorStop(1, 'rgba(0,0,0,0)');
            bhGc.fillStyle = bhGrad; bhGc.fillRect(0, 0, 64, 64);
            var bhGlowTex = new THREE.CanvasTexture(bhGlowCv);
            var bhGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: bhGlowTex, transparent: true, blending: THREE.AdditiveBlending, opacity: 0.7 }));
            bhGlow.scale.set(0.12, 0.12, 1); bhGroup.add(bhGlow);

            // Scale grid
            var gridHelper = new THREE.GridHelper(2, 20, 0x223366, 0x112244);
            gridHelper.position.y = -0.03;
            gridGroup.add(gridHelper);
            var ringScale = new THREE.Mesh(new THREE.RingGeometry(0.49, 0.5, 64), new THREE.MeshBasicMaterial({ color: 0x4488ff, side: THREE.DoubleSide, transparent: true, opacity: 0.2 }));
            ringScale.rotation.x = Math.PI * 0.5; ringScale.position.y = -0.02;
            gridGroup.add(ringScale);

            // Nebulae as sprites
            var nebCanvas = document.createElement('canvas'); nebCanvas.width = 64; nebCanvas.height = 64;
            var nCtx = nebCanvas.getContext('2d'), nebulaSprites = [];
            NEBULAE.forEach(function (neb) {
              nCtx.clearRect(0, 0, 64, 64);
              var grad = nCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
              grad.addColorStop(0, neb.color + 'aa'); grad.addColorStop(0.5, neb.color + '44'); grad.addColorStop(1, neb.color + '00');
              nCtx.fillStyle = grad; nCtx.fillRect(0, 0, 64, 64);
              var tex = new THREE.CanvasTexture(nebCanvas); tex.needsUpdate = true;
              var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.clone(), transparent: true, opacity: 0.5 }));
              sprite.position.set(neb.x, neb.y, neb.z); sprite.scale.set(neb.r * 2, neb.r * 2, 1);
              sprite.userData = neb; nebGroup.add(sprite); nebulaSprites.push(sprite);
            });

            // Labels for nebulae
            NEBULAE.forEach(function (neb) {
              var labelCanvas = document.createElement('canvas'); labelCanvas.width = 256; labelCanvas.height = 48;
              var lCtx = labelCanvas.getContext('2d');
              lCtx.fillStyle = 'rgba(0,0,0,0.5)'; lCtx.fillRect(0, 0, 256, 48);
              lCtx.font = '18px sans-serif'; lCtx.fillStyle = neb.color; lCtx.textAlign = 'center'; lCtx.fillText(neb.name, 128, 32);
              var labelTex = new THREE.CanvasTexture(labelCanvas);
              var labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true }));
              labelSprite.position.set(neb.x, neb.y + neb.r + 0.03, neb.z);
              labelSprite.scale.set(0.15, 0.03, 1);
              labelGroup.add(labelSprite);
            });

            // Store layer references on canvas for toggle access
            canvasEl._layers = { bgStars: bgGroup, arms: armGroup, bulge: bulgeGroup, blackHole: bhGroup, nebulae: nebGroup, grid: gridGroup, labels: labelGroup };

            // Function to regenerate stars with new count
            canvasEl._setStarCount = function (count) {
              armGroup.remove(starPoints);
              starPoints.geometry.dispose();
              var result = generateStars(THREE, count, gType, galaxyType);
              starPoints = new THREE.Points(result.geo, starShaderMat);
              armGroup.add(starPoints);
              starData = result.data;
            };

            // Post-processing bloom
            var composer = null;
            if (THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass) {
              composer = new THREE.EffectComposer(renderer);
              composer.addPass(new THREE.RenderPass(scene, camera));
              var bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(W, H), 0.7, 0.3, 0.85);
              composer.addPass(bloomPass);
              canvasEl._bloomPass = bloomPass;
            }

            // Supernova flash system for time-lapse
            var supernovae = [];
            canvasEl._triggerSupernova = function () {
              if (starData.length === 0) return;
              var idx = Math.floor(Math.random() * starData.length);
              var sd = starData[idx];
              var snCv = document.createElement('canvas'); snCv.width = 64; snCv.height = 64;
              var sc = snCv.getContext('2d');
              var sg = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
              sg.addColorStop(0, 'rgba(255,255,255,1)'); sg.addColorStop(0.2, 'rgba(200,220,255,0.8)');
              sg.addColorStop(0.5, 'rgba(100,150,255,0.3)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
              sc.fillStyle = sg; sc.fillRect(0, 0, 64, 64);
              var snTex = new THREE.CanvasTexture(snCv);
              var snSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: snTex, transparent: true, blending: THREE.AdditiveBlending }));
              snSprite.position.set(sd.x, sd.y, sd.z);
              snSprite.scale.set(0.001, 0.001, 1);
              scene.add(snSprite);
              supernovae.push({ sprite: snSprite, birth: Date.now(), duration: 2000 });
            };

            // Time-lapse age update
            canvasEl._updateAge = function (age) {
              var dist = getAgeDistribution(age);
              var cumul = [], cum2 = 0, tot = dist.reduce(function (a, b) { return a + b; }, 0);
              for (var t2 = 0; t2 < dist.length; t2++) { cum2 += dist[t2]; cumul.push(cum2 / tot * 100); }
              var colors = starPoints.geometry.attributes.color.array;
              var types = starPoints.geometry.attributes.aStarType.array;
              for (var si = 0; si < starData.length; si++) {
                var roll2 = ((si * 7919 + 1) % 10000) / 100;
                var ti2 = 6;
                for (var tt = 0; tt < cumul.length; tt++) { if (roll2 < cumul[tt]) { ti2 = tt; break; } }
                var stc = new THREE.Color(STAR_TYPES[ti2].color);
                colors[si * 3] = stc.r; colors[si * 3 + 1] = stc.g; colors[si * 3 + 2] = stc.b;
                types[si] = ti2;
              }
              starPoints.geometry.attributes.color.needsUpdate = true;
              starPoints.geometry.attributes.aStarType.needsUpdate = true;
              var nebOp = 0.2 + 0.5 * Math.max(0, 1 - age / 10);
              nebulaSprites.forEach(function (s) { s.material.opacity = nebOp; });
            };

            // Orbit controls
            var isDragging = false, prevX = 0, prevY = 0;
            var spherical = { theta: Math.PI * 0.1, phi: Math.PI * 0.35, r: 1.2 };
            function updateCamera() {
              camera.position.x = spherical.r * Math.sin(spherical.phi) * Math.sin(spherical.theta);
              camera.position.y = spherical.r * Math.cos(spherical.phi);
              camera.position.z = spherical.r * Math.sin(spherical.phi) * Math.cos(spherical.theta);
              camera.lookAt(0, 0, 0);
            }
            updateCamera();
            function onGalDown(e) { isDragging = true; prevX = e.clientX; prevY = e.clientY; }
            function onGalMove(e) {
              if (!isDragging) return;
              spherical.theta += (e.clientX - prevX) * 0.005;
              spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - (e.clientY - prevY) * 0.005));
              prevX = e.clientX; prevY = e.clientY; updateCamera();
            }
            function onGalUp() { isDragging = false; }
            function onGalWheel(e) { e.preventDefault(); spherical.r = Math.max(0.2, Math.min(3, spherical.r * (e.deltaY > 0 ? 1.1 : 0.9))); updateCamera(); }
            canvasEl.addEventListener('mousedown', onGalDown);
            canvasEl.addEventListener('mousemove', onGalMove);
            canvasEl.addEventListener('mouseup', onGalUp);
            canvasEl.addEventListener('wheel', onGalWheel, { passive: false });

            // Raycaster for click selection
            var raycaster = new THREE.Raycaster(); raycaster.params.Points.threshold = 0.02;
            var mouse = new THREE.Vector2();
            function onGalClick(e) {
              var rect = canvasEl.getBoundingClientRect();
              mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
              mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
              raycaster.setFromCamera(mouse, camera);
              var hits = raycaster.intersectObject(starPoints);
              if (hits.length > 0 && canvasEl._onSelectStar) canvasEl._onSelectStar(starData[hits[0].index]);
              var nebHits = raycaster.intersectObjects(nebulaSprites);
              if (nebHits.length > 0 && canvasEl._onSelectNebula) canvasEl._onSelectNebula(nebHits[0].object.userData);
            }
            canvasEl.addEventListener('click', onGalClick);
            canvasEl._galaxyWarp = function (wp) {
              spherical.theta = Math.atan2(wp.x, wp.z) || 0.1;
              spherical.phi = Math.acos(Math.max(-0.99, Math.min(0.99, wp.y / (Math.hypot(wp.x, wp.y, wp.z) || 1))));
              spherical.r = wp.zoom || 1; updateCamera();
            };
            var animId, startT = Date.now();
            function animate() {
              animId = requestAnimationFrame(animate);
              var elapsed = (Date.now() - startT) * 0.001;
              starShaderMat.uniforms.uTime.value = elapsed;
              if (armGroup.visible) armGroup.children.forEach(function (c) { c.rotation.y += 0.0003; });
              nebulaSprites.forEach(function (s, i) { s.material.opacity = Math.max(0.1, s.material.opacity + 0.002 * Math.sin(elapsed + i * 1.5)); });
              if (bhGroup.visible) {
                rings.forEach(function (r, ri) { r.rotation.z += 0.005 - ri * 0.001; });
                bhGlow.material.opacity = 0.5 + 0.2 * Math.sin(elapsed * 0.8);
              }
              // Animate supernovae
              for (var sni = supernovae.length - 1; sni >= 0; sni--) {
                var sn = supernovae[sni];
                var prog = (Date.now() - sn.birth) / sn.duration;
                if (prog > 1) { scene.remove(sn.sprite); sn.sprite.material.dispose(); supernovae.splice(sni, 1); continue; }
                var scale = 0.001 + prog * 0.08;
                sn.sprite.scale.set(scale, scale, 1);
                sn.sprite.material.opacity = prog < 0.3 ? prog / 0.3 : 1 - (prog - 0.3) / 0.7;
              }
              if (composer) composer.render();
              else renderer.render(scene, camera);
            }
            animate();
            var ro = new ResizeObserver(function () { W = canvasEl.offsetWidth; H = canvasEl.offsetHeight; camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H); });
            ro.observe(canvasEl);
            canvasEl._galaxyCleanup = function () {
              if (animId) cancelAnimationFrame(animId);
              canvasEl.removeEventListener('mousedown', onGalDown);
              canvasEl.removeEventListener('mousemove', onGalMove);
              canvasEl.removeEventListener('mouseup', onGalUp);
              canvasEl.removeEventListener('wheel', onGalWheel);
              canvasEl.removeEventListener('click', onGalClick);
              ro.disconnect();
              if (composer) { composer.passes.forEach(function (p) { if (p.dispose) p.dispose(); }); }
              supernovae.forEach(function (sn) { scene.remove(sn.sprite); sn.sprite.material.dispose(); });
              renderer.dispose();
            };
          }

          var selStar = d.selectedStar ? STAR_TYPES.find(function (s) { return s.id === d.selectedStar; }) : null;
          var selNeb = d.selectedNebula ? NEBULAE.find(function (n) { return n.name === d.selectedNebula; }) : null;
          var quizQ = d.quizMode && QUIZ_BANK[d.quizIdx || 0] ? QUIZ_BANK[d.quizIdx || 0] : null;

          // ── Toggle handler ──
          var toggleLayer = function (key) {
            var newLayers = Object.assign({}, layers);
            newLayers[key] = !newLayers[key];
            upd("layers", newLayers);
            var cv = document.querySelector('[data-galaxy-canvas]');
            if (cv && cv._layers && cv._layers[key]) cv._layers[key].visible = newLayers[key];
          };

          var LAYER_TOGGLES = [
            { key: 'arms', icon: '\uD83C\uDF00', label: 'Spiral Arms' },
            { key: 'bulge', icon: '\uD83D\uDFE1', label: 'Central Bulge' },
            { key: 'blackHole', icon: '\uD83D\uDD73\uFE0F', label: 'Black Hole' },
            { key: 'nebulae', icon: '\u2728', label: 'Nebulae' },
            { key: 'bgStars', icon: '\uD83C\uDF0C', label: 'Background' },
            { key: 'grid', icon: '\uD83D\uDCCF', label: 'Scale Grid' },
            { key: 'labels', icon: '\uD83C\uDFF7\uFE0F', label: 'Labels' }
          ];

          return React.createElement("div", { className: "max-w-4xl mx-auto animate-in fade-in duration-200" },
            // ── Header ──
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: function () { var cv = document.querySelector('[data-galaxy-canvas]'); if (cv && cv._galaxyCleanup) cv._galaxyCleanup(); setStemLabTool(null); }, className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83C\uDF0C Galaxy Explorer"),
              React.createElement("div", { className: "flex gap-1 ml-auto" },
                ["explore", "quiz"].map(function (m) {
                  return React.createElement("button", {
                    key: m, onClick: function () {
                      if (m === 'quiz') { upd("quizMode", true); upd("quizIdx", 0); upd("quizScore", 0); upd("quizStreak", 0); upd("quizFeedback", null); }
                      else { upd("quizMode", false); }
                    }, className: "px-3 py-1 rounded-lg text-xs font-bold capitalize " + ((m === 'quiz' ? d.quizMode : !d.quizMode) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                  }, m);
                })
              )
            ),

            // ── Galaxy type selector ──
            React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-3" },
              Object.keys(GALAXY_TYPES).map(function (key) {
                var gt = GALAXY_TYPES[key];
                return React.createElement("button", {
                  key: key,
                  onClick: function () {
                    upd("galaxyType", key);
                    var cv = document.querySelector('[data-galaxy-canvas]');
                    if (cv) { cv._galaxyInit = false; cv._galaxyCleanup && cv._galaxyCleanup(); canvasRefCb(cv); }
                  },
                  className: "px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all hover:scale-105 " + (galaxyType === key ? 'border-indigo-400 bg-indigo-100 text-indigo-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200')
                }, gt.icon + " " + gt.label);
              })
            ),

            // ── Galaxy type info card ──
            React.createElement("div", { className: "mb-3 px-3 py-2 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-lg border border-indigo-100 text-[11px]" },
              React.createElement("span", { className: "font-bold text-indigo-700" }, gType.icon + " " + gType.label + ": "),
              React.createElement("span", { className: "text-slate-600" }, gType.desc),
              React.createElement("span", { className: "text-indigo-400 ml-1" }, "(e.g. " + gType.example + ")")
            ),

            // ── 3D Canvas ──
            React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-indigo-200 bg-[#050510]", style: { height: '520px' } },
              React.createElement("canvas", { "data-galaxy-canvas": "true", ref: function (el) { if (!el) return; el._onSelectStar = function (sd) { upd("selectedStar", sd.type.id); upd("selectedNebula", null); awardStemXP('galaxy_explore', 2, 'Discovered ' + sd.type.label + ' star'); }; el._onSelectNebula = function (neb) { upd("selectedNebula", neb.name); upd("selectedStar", null); awardStemXP('galaxy_explore', 3, 'Discovered ' + neb.name); }; canvasRefCb(el); }, style: { width: '100%', height: '100%', cursor: 'grab' } }),
              // Star type legend
              React.createElement("div", { className: "absolute top-2 left-2 bg-black/50 backdrop-blur rounded-lg px-2 py-1.5 text-[9px] text-white/80" },
                React.createElement("div", { className: "font-bold mb-1" }, "Star Types"),
                STAR_TYPES.map(function (st) { return React.createElement("div", { key: st.id, className: "flex items-center gap-1 leading-tight" }, React.createElement("span", { style: { color: st.color, fontSize: '10px' } }, "\u2B50"), React.createElement("span", null, st.id + " (" + st.temp + "K)")); })
              ),
              // Scale info overlay
              layers.grid && React.createElement("div", { className: "absolute bottom-2 right-2 bg-black/60 backdrop-blur rounded-lg px-2 py-1.5 text-[9px] text-white/80" },
                React.createElement("div", { className: "font-bold mb-1 text-blue-300" }, "\uD83D\uDCCF Scale"),
                SCALE_INFO.map(function (s) { return React.createElement("div", { key: s.label, className: "flex justify-between gap-3" }, React.createElement("span", { className: "text-white/50" }, s.label), React.createElement("span", { className: "font-bold" }, s.value)); })
              )
            ),

            // ── Layer toggles ──
            React.createElement("div", { className: "flex flex-wrap gap-1.5 mt-3" },
              LAYER_TOGGLES.map(function (lt) {
                var isOn = layers[lt.key] !== false;
                return React.createElement("button", {
                  key: lt.key,
                  onClick: function () { toggleLayer(lt.key); },
                  className: "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all hover:scale-105 " + (isOn ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-400')
                }, lt.icon + " " + lt.label);
              })
            ),

            // ── Star density slider ──
            React.createElement("div", { className: "flex items-center gap-3 mt-3 px-1" },
              React.createElement("span", { className: "text-[11px] font-bold text-slate-500 whitespace-nowrap" }, "\u2B50 Stars: " + starCount.toLocaleString()),
              React.createElement("input", {
                type: "range", min: 1000, max: 10000, step: 1000, value: starCount,
                onChange: function (e) {
                  var val = parseInt(e.target.value);
                  upd("starCount", val);
                  var cv = document.querySelector('[data-galaxy-canvas]');
                  if (cv && cv._setStarCount) cv._setStarCount(val);
                },
                className: "flex-1 h-1.5 accent-indigo-500"
              }),
              React.createElement("span", { className: "text-[10px] text-slate-400 w-12 text-right" }, starCount >= 8000 ? "Dense" : starCount >= 4000 ? "Normal" : "Sparse")
            ),

            // ── Cosmic Age Time-Lapse ──
            React.createElement("div", { className: "mt-3 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-200 p-4" },
              React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                React.createElement("span", { className: "text-xs font-bold text-violet-700" }, "\u23F3 Cosmic Time-Lapse"),
                React.createElement("span", { className: "ml-auto text-[11px] font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full" }, cosmicAge.toFixed(1) + " Gyr")
              ),
              React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement("span", { className: "text-[9px] text-violet-400 whitespace-nowrap" }, "Big Bang"),
                React.createElement("input", {
                  type: "range", min: 0.1, max: 14, step: 0.1, value: cosmicAge,
                  onChange: function (e) {
                    var val = parseFloat(e.target.value);
                    upd("cosmicAge", val);
                    var cv = document.querySelector('[data-galaxy-canvas]');
                    if (cv && cv._updateAge) cv._updateAge(val);
                  },
                  className: "flex-1 h-1.5 accent-violet-500"
                }),
                React.createElement("span", { className: "text-[9px] text-violet-400 whitespace-nowrap" }, "14 Gyr")
              ),
              React.createElement("div", { className: "flex gap-1.5 mt-2" },
                React.createElement("button", {
                  onClick: function () {
                    if (window._galaxyTimeLapse) { clearInterval(window._galaxyTimeLapse); window._galaxyTimeLapse = null; upd("isPlaying", false); return; }
                    upd("isPlaying", true);
                    var age = cosmicAge;
                    window._galaxyTimeLapse = setInterval(function () {
                      age += 0.1;
                      if (age > 14) { age = 0.1; }
                      upd("cosmicAge", parseFloat(age.toFixed(1)));
                      var cv = document.querySelector('[data-galaxy-canvas]');
                      if (cv && cv._updateAge) cv._updateAge(age);
                      if (Math.random() < 0.15 && cv && cv._triggerSupernova) cv._triggerSupernova();
                    }, 150);
                  },
                  className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.isPlaying ? "bg-red-500 text-white" : "bg-violet-600 text-white hover:bg-violet-700") + " transition-all"
                }, d.isPlaying ? "\u23F9 Stop" : "\u25B6 Play Time-Lapse"),
                React.createElement("button", {
                  onClick: function () {
                    var cv = document.querySelector('[data-galaxy-canvas]');
                    if (cv && cv._triggerSupernova) cv._triggerSupernova();
                  },
                  className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-all"
                }, "\uD83D\uDCA5 Supernova!"),
                React.createElement("button", {
                  onClick: function () { upd("showLifecycle", !showLifecycle); },
                  className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (showLifecycle ? "bg-indigo-600 text-white" : "bg-white text-indigo-600 border border-indigo-200") + " transition-all"
                }, "\u2B50 Star Lifecycle")
              ),
              // Milestone labels
              React.createElement("div", { className: "flex justify-between mt-2 text-[8px] text-violet-400" },
                [
                  { age: 0.4, label: "First stars" },
                  { age: 1, label: "Galaxies form" },
                  { age: 4.6, label: "Milky Way" },
                  { age: 9.2, label: "Sun born" },
                  { age: 13.8, label: "Now" }
                ].map(function (m) {
                  return React.createElement("span", {
                    key: m.age,
                    className: "cursor-pointer hover:text-violet-600" + (Math.abs(cosmicAge - m.age) < 0.3 ? " font-bold text-violet-700" : ""),
                    onClick: function () {
                      upd("cosmicAge", m.age);
                      var cv = document.querySelector('[data-galaxy-canvas]');
                      if (cv && cv._updateAge) cv._updateAge(m.age);
                    }
                  }, m.label);
                })
              ),
              // ── Epoch narration card ──
              (function () {
                var epoch = getEpochNarration(cosmicAge);
                if (!epoch) return null;
                return React.createElement("div", { className: "mt-2 flex items-start gap-2 px-3 py-2 bg-violet-100/60 rounded-lg border border-violet-200 animate-in fade-in duration-300" },
                  React.createElement("span", { className: "text-lg flex-shrink-0" }, epoch.emoji),
                  React.createElement("div", null,
                    React.createElement("p", { className: "text-[11px] font-bold text-violet-800" }, epoch.title + " (" + epoch.age + " Gyr)"),
                    React.createElement("p", { className: "text-[10px] text-violet-600 leading-relaxed" }, epoch.desc)
                  )
                );
              })()
            ),

            // ── Stellar Lifecycle Panel ──
            showLifecycle && React.createElement("div", { className: "mt-3 bg-slate-900 rounded-xl border-2 border-indigo-400 p-4 animate-in fade-in" },
              React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                React.createElement("h4", { className: "text-sm font-bold text-white" }, "\u2B50 Stellar Lifecycle"),
                React.createElement("button", { onClick: function () { upd("showLifecycle", false); }, className: "ml-auto text-xs text-slate-400 hover:text-white" }, "\u2715 Close")
              ),
              // Mass slider
              React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                React.createElement("span", { className: "text-[10px] text-slate-400 whitespace-nowrap" }, "\u2696 Mass:"),
                React.createElement("input", {
                  type: "range", min: 0.5, max: 50, step: 0.5, value: lifecycleMass,
                  onChange: function (e) { upd("lifecycleMass", parseFloat(e.target.value)); },
                  className: "flex-1 h-1.5 accent-amber-400"
                }),
                React.createElement("span", { className: "text-xs font-bold text-amber-400" }, lifecycleMass + " M\u2609")
              ),
              // Mass category
              React.createElement("p", { className: "text-[10px] text-slate-500 mb-3 italic" },
                lifecycleMass < 0.5 ? "Brown dwarf \u2014 too small for hydrogen fusion." :
                  lifecycleMass < 8 ? "\uD83C\uDF1F Low-mass star (like our Sun). Will become a white dwarf." :
                    lifecycleMass < 25 ? "\uD83D\uDCA5 Massive star. Will explode as a supernova \u2192 neutron star." :
                      "\uD83D\uDD73\uFE0F Hypermassive star. Supernova \u2192 black hole formation!"
              ),
              // Lifecycle stages
              React.createElement("div", { className: "space-y-1.5" },
                LIFECYCLE.stages.map(function (s, idx) {
                  return React.createElement("div", { key: s.name, className: "flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700" },
                    React.createElement("span", { className: "text-lg" }, s.emoji),
                    React.createElement("div", { className: "flex-1" },
                      React.createElement("p", { className: "text-xs font-bold", style: { color: s.color } }, s.name),
                      React.createElement("p", { className: "text-[9px] text-slate-400" }, s.desc)
                    ),
                    idx < LIFECYCLE.stages.length - 1 && React.createElement("span", { className: "text-slate-600 text-xs" }, "\u2192")
                  );
                }),
                // Branch based on mass
                React.createElement("div", { className: "flex items-center gap-1 ml-6 mt-1" },
                  React.createElement("span", { className: "text-slate-600 text-xs" }, lifecycleMass < 8 ? "\u2193 Gentle death" : "\u2193 Violent death")
                ),
                (lifecycleMass < 8 ? LIFECYCLE.lowMass : LIFECYCLE.highMass.filter(function (s) {
                  if (s.minMass && lifecycleMass < s.minMass) return false;
                  if (s.maxMass && lifecycleMass > s.maxMass) return false;
                  return true;
                })).map(function (s) {
                  return React.createElement("div", { key: s.name, className: "flex items-center gap-2 p-2 rounded-lg border ml-4", style: { borderColor: s.color + '44', background: s.color + '11' } },
                    React.createElement("span", { className: "text-lg" }, s.emoji),
                    React.createElement("div", { className: "flex-1" },
                      React.createElement("p", { className: "text-xs font-bold", style: { color: s.color } }, s.name),
                      React.createElement("p", { className: "text-[9px] text-slate-400" }, s.desc)
                    )
                  );
                })
              ),
              // Fun facts
              React.createElement("div", { className: "mt-3 p-2 bg-indigo-900/50 rounded-lg border border-indigo-700" },
                React.createElement("p", { className: "text-[9px] text-indigo-300" },
                  lifecycleMass < 0.5 ? "\uD83D\uDCA1 Brown dwarfs are sometimes called 'failed stars.' They glow faintly from gravitational contraction." :
                    lifecycleMass < 2 ? "\uD83D\uDCA1 Stars like our Sun live ~10 billion years. Our Sun is about halfway through its life!" :
                      lifecycleMass < 8 ? "\uD83D\uDCA1 Larger low-mass stars burn hotter and die sooner. A 2 M\u2609 star lives only ~1.5 billion years." :
                        lifecycleMass < 25 ? "\uD83D\uDCA1 Neutron stars are so dense that a sugar-cube-sized piece weighs about 1 billion tons!" :
                          "\uD83D\uDCA1 Stellar black holes form from stars >25 M\u2609. The Milky Way alone has ~100 million of them!"
                )
              )
            ),

            // ── Warp points ──
            React.createElement("div", { className: "flex flex-wrap gap-1.5 mt-3" },
              WARP_POINTS.map(function (wp) { return React.createElement("button", { key: wp.label, onClick: function () { var cv = document.querySelector('[data-galaxy-canvas]'); if (cv && cv._galaxyWarp) cv._galaxyWarp(wp); if (wp.desc) upd("warpInfo", wp.desc); }, className: "px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all hover:scale-105" }, "\uD83D\uDE80 " + wp.label); })
            ),

            // ── Warp info ──
            d.warpInfo && React.createElement("div", { className: "mt-2 px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-100 text-[11px] text-indigo-700" },
              React.createElement("span", { className: "font-bold" }, "\uD83D\uDCCD "),
              d.warpInfo
            ),

            // ── Star info card ──
            selStar && React.createElement("div", { className: "mt-3 bg-white rounded-xl border-2 p-4 animate-in fade-in", style: { borderColor: selStar.color } },
              React.createElement("h4", { className: "font-bold text-sm mb-1", style: { color: selStar.color } }, "\u2B50 " + selStar.label + " Star (" + selStar.example + ")"),
              React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed mb-2" }, selStar.desc),
              React.createElement("div", { className: "grid grid-cols-3 gap-2 text-[10px]" },
                [
                  { label: 'Temperature', val: selStar.temp + ' K' },
                  { label: '% of Stars', val: selStar.pct + '%' },
                  { label: 'Luminosity', val: selStar.luminosity },
                  { label: 'Mass', val: selStar.mass || '?' },
                  { label: 'Lifetime', val: selStar.lifetime || '?' },
                  { label: 'Example', val: selStar.example }
                ].map(function (item) {
                  return React.createElement("div", { key: item.label, className: "bg-slate-50 rounded-lg p-2 text-center" },
                    React.createElement("div", { className: "font-bold text-slate-500" }, item.label),
                    React.createElement("div", { className: "font-bold", style: { color: selStar.color } }, item.val)
                  );
                })
              ),
              // Why It Matters
              selStar.whyItMatters && React.createElement("div", { className: "mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200" },
                React.createElement("p", { className: "text-[10px] font-bold text-amber-700 mb-1" }, "\uD83D\uDCA1 Why It Matters"),
                React.createElement("p", { className: "text-[10px] text-amber-800 leading-relaxed" }, selStar.whyItMatters)
              ),
              // Scale comparison
              React.createElement("div", { className: "mt-2 p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-center" },
                React.createElement("p", { className: "text-[9px] text-indigo-600" }, "\uD83D\uDD2D If our Sun were a basketball, a" + (selStar.id === 'O' ? 'n' : '') + " " + selStar.id + "-type star would be " + ({ 'O': 'a hot tub (6\u201315x wider)', 'B': 'a beach ball (2\u20137x wider)', 'A': 'a soccer ball (1.4\u20132x wider)', 'F': 'a volleyball (slightly bigger)', 'G': 'another basketball (same size!)', 'K': 'a softball (a bit smaller)', 'M': 'a tennis ball or smaller' }[selStar.id] || 'similar in size') + ".")
              )
            ),

            // ── Nebula info card ──
            selNeb && !selStar && React.createElement("div", { className: "mt-3 bg-white rounded-xl border-2 p-4 animate-in fade-in", style: { borderColor: selNeb.color } },
              React.createElement("h4", { className: "font-bold text-sm mb-1", style: { color: selNeb.color } }, "\u2728 " + selNeb.name),
              React.createElement("div", { className: "flex gap-3 mb-2 text-[10px]" },
                React.createElement("span", { className: "px-2 py-0.5 rounded-full font-bold", style: { background: selNeb.color + '20', color: selNeb.color } }, selNeb.type || 'Nebula'),
                selNeb.dist && React.createElement("span", { className: "text-slate-500" }, "\uD83D\uDCCD " + selNeb.dist)
              ),
              React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, selNeb.desc)
            ),

            // ── Quiz mode ──
            d.quizMode && quizQ && React.createElement("div", { className: "mt-3 bg-indigo-50 rounded-xl border-2 border-indigo-200 p-4 animate-in fade-in" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("p", { className: "text-xs font-bold text-indigo-700" }, "\uD83E\uDDE0 Question " + ((d.quizIdx || 0) + 1) + "/" + QUIZ_BANK.length),
                React.createElement("div", { className: "flex items-center gap-2 text-xs" },
                  React.createElement("span", { className: "font-bold text-green-600" }, "\u2714 " + (d.quizScore || 0)),
                  React.createElement("span", { className: "font-bold text-amber-500" }, "\uD83D\uDD25 " + (d.quizStreak || 0))
                )
              ),
              React.createElement("p", { className: "text-sm font-bold text-slate-800 mb-3" }, quizQ.q),
              React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                quizQ.options.map(function (opt) {
                  return React.createElement("button", {
                    key: opt, disabled: !!d.quizFeedback,
                    onClick: function () {
                      var correct = opt === quizQ.a;
                      upd("quizFeedback", { correct: correct, msg: correct ? "\u2705 Correct! +10 XP" : "\u274C The answer is: " + quizQ.a });
                      if (correct) { upd("quizScore", (d.quizScore || 0) + 1); upd("quizStreak", (d.quizStreak || 0) + 1); }
                      else { upd("quizStreak", 0); }
                    }, className: "px-3 py-2 text-xs font-bold rounded-lg border-2 transition-all hover:scale-[1.02] " + (d.quizFeedback ? (opt === quizQ.a ? "border-green-400 bg-green-50 text-green-700" : d.quizFeedback && !d.quizFeedback.correct && opt !== quizQ.a ? "border-slate-200 bg-white text-slate-400 opacity-50" : "border-slate-200 bg-white text-slate-600") : "border-indigo-200 bg-white text-slate-700 hover:border-indigo-400")
                  }, opt);
                })
              ),
              d.quizFeedback && React.createElement("div", { className: "mt-2 p-2 rounded-lg text-center text-sm font-bold " + (d.quizFeedback.correct ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200") },
                d.quizFeedback.msg,
                React.createElement("button", { onClick: function () { upd("quizIdx", ((d.quizIdx || 0) + 1) % QUIZ_BANK.length); upd("quizFeedback", null); }, className: "ml-3 px-2 py-0.5 bg-indigo-600 text-white rounded text-xs" }, "Next \u2192")
              )
            ),

            // ── Snapshot button ──
            React.createElement("div", { className: "flex gap-3 mt-3 items-center" },
              React.createElement("button", { onClick: function () { setToolSnapshots(function (prev) { return prev.concat([{ id: 'gx-' + Date.now(), tool: 'galaxy', label: 'Galaxy' + (d.selectedStar ? ': ' + d.selectedStar : '') + ' (' + gType.label + ')', data: Object.assign({}, d), timestamp: Date.now() }]); }); addToast('\uD83D\uDCF8 Galaxy snapshot saved!', 'success'); }, className: "ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")
            )
          )
        })(),


        stemLabTab === 'explore' && stemLabTool === 'universe' && (() => {
          var d = labToolData.universe || {};
          var upd = function (key, val) { setLabToolData(function (prev) { return Object.assign({}, prev, { universe: Object.assign({}, prev.universe || {}, (function () { var o = {}; o[key] = val; return o; })()) }); }); };

          var cosmicTime = d.cosmicTime !== undefined ? d.cosmicTime : 0;
          var isPlaying = d.isPlaying || false;
          var speed = d.speed || 1;

          // ── Cosmic epochs (enhanced) ──
          var EPOCHS = [
            {
              t: 0, name: 'The Big Bang', emoji: '\uD83D\uDCA5', color: '#1a0a00', border: '#f59e0b', sky: '#ffffff',
              temp: '10\u00B3\u00B2 K (infinite)', scale: 'Smaller than a proton',
              keyEvent: 'All four fundamental forces unified as one',
              desc: 'All matter, energy, space, and time erupt from an infinitely dense singularity in the most violent event in cosmic history. Within 10\u207B\u00B3\u00B2 seconds, the universe undergoes exponential inflation, expanding faster than light. Temperature: trillions upon trillions of degrees. The four fundamental forces (gravity, electromagnetism, strong & weak nuclear) separate within the first second. Quarks condense into protons and neutrons within 3 minutes.',
              facts: ['The entire observable universe was smaller than a subatomic particle', 'Temperature exceeded 10 trillion degrees Celsius', 'Matter and antimatter annihilated in almost equal amounts \u2014 a tiny surplus of matter (1 in a billion) is everything we see today', 'Inflation expanded the universe by a factor of 10\u00B2\u2076 in 10\u207B\u00B3\u00B2 seconds', 'Within 3 minutes, protons and neutrons fused into the first atomic nuclei (hydrogen, helium, tiny amounts of lithium)', 'This is called Big Bang Nucleosynthesis \u2014 it set the universe\'s H/He ratio at roughly 75%/25% by mass']
            },
            {
              t: 0.38, name: 'Recombination', emoji: '\uD83C\uDF1F', color: '#1a1000', border: '#eab308', sky: '#ff6b35',
              temp: '~3,000 K', scale: '~1,000x smaller than today',
              keyEvent: 'Light breaks free \u2014 the universe becomes transparent',
              desc: 'The universe cools enough for electrons to bind with protons, forming the first neutral atoms (mostly hydrogen and helium). For the first time, photons can travel freely without scattering off charged particles. This released light is the Cosmic Microwave Background (CMB) \u2014 the oldest light in the universe, still detectable today at 2.725 K after being stretched by 13.8 billion years of expansion.',
              facts: ['This occurred ~380,000 years after the Big Bang', 'The CMB was accidentally discovered in 1965 by Penzias and Wilson, earning them a Nobel Prize', 'The CMB has been redshifted from ~3,000 K to 2.725 K by cosmic expansion', 'Tiny temperature fluctuations in the CMB (1 part in 100,000) are the seeds of all cosmic structure', 'The universe went from an opaque plasma to transparent gas in a geologically brief period', 'COBE, WMAP, and Planck satellites mapped the CMB with increasing precision']
            },
            {
              t: 0.4, name: 'The Dark Ages', emoji: '\uD83C\uDF11', color: '#08061a', border: '#4338ca', sky: '#0a0a1a',
              temp: '60 K \u2192 ~20 K', scale: 'Expanding but starless',
              keyEvent: 'Total cosmic darkness \u2014 no light sources exist',
              desc: 'The most silent era in cosmic history. No stars, no galaxies, no light. The universe is filled with cold neutral hydrogen gas in absolute darkness. Yet gravity is silently at work: dark matter filaments pull ordinary matter into denser clumps, building the scaffolding for everything to come. This era ends when the first stars ignite.',
              facts: ['Lasted roughly 100\u2013200 million years', 'Dark matter formed a vast cosmic web of filaments and nodes', 'Ordinary matter fell into dark matter gravitational wells, seeding future galaxies', 'The 21-cm hydrogen line may let future radio telescopes observe this era directly', 'No electromagnetic radiation was produced \u2014 only gravitational interactions', 'This is the least understood era in cosmology \u2014 no direct observations exist yet']
            },
            {
              t: 0.5, name: 'First Stars (Cosmic Dawn)', emoji: '\u2B50', color: '#0a1020', border: '#3b82f6', sky: '#0a1628',
              temp: '~15 K (gas) / millions K (star cores)', scale: 'First light in 200 million years',
              keyEvent: 'Population III stars ignite \u2014 cosmic reionization begins',
              desc: 'The first stars ignite in the darkness \u2014 Population III stars, composed entirely of hydrogen and helium. These primordial giants were 100\u20131,000 times more massive than our Sun, blazing blue-white and living only a few million years before exploding as hypernovae. Their deaths forged the first heavy elements (carbon, oxygen, iron, gold) and scattered them across space, enriching the gas for future generations of stars. Their UV radiation began reionizing the neutral hydrogen, ending the Dark Ages.',
              facts: ['Population III stars have never been directly observed \u2014 they are predicted by models', 'They were made of pure hydrogen and helium (zero metals)', 'Their surface temperatures exceeded 100,000 K \u2014 far hotter than our Sun\'s 5,778 K', 'Some may have collapsed directly into black holes without supernovae', 'Their supernovae created the first carbon, oxygen, silicon, and iron in the universe', 'The James Webb Space Telescope is actively searching for evidence of these first stars']
            },
            {
              t: 1.0, name: 'First Galaxies', emoji: '\uD83C\uDF0C', color: '#0c0a20', border: '#6366f1', sky: '#0f0f2e',
              temp: 'Varied (millions K in quasars)', scale: 'Protogalaxies: ~1,000 light-years',
              keyEvent: 'Supermassive black holes form \u2014 quasars blaze',
              desc: 'Gravity pulls gas and dark matter into the first protogalaxies \u2014 small, chaotic, intensely star-forming clumps. Supermassive black holes form at their centers, devouring surrounding gas and shining as quasars \u2014 the most luminous objects in the universe. The cosmic web of dark matter filaments connects galaxy clusters with bridges of gas spanning millions of light-years. Galaxy mergers are violent and frequent.',
              facts: ['The first galaxies were 100x smaller than the Milky Way', 'Quasars can outshine their entire host galaxy by 100x', 'JWST discovered galaxies existing just 300 million years after the Big Bang \u2014 earlier than expected', 'Supermassive black holes grew to billions of solar masses surprisingly quickly', 'The cosmic web structure is like a sponge \u2014 galaxies along filaments, voids between them', 'Reionization completed around this time \u2014 the universe became fully transparent again']
            },
            {
              t: 4.6, name: 'Milky Way Forms', emoji: '\uD83C\uDF00', color: '#0d0a22', border: '#8b5cf6', sky: '#0d0d2a',
              temp: 'Cold gas clouds (~10 K) to hot stellar cores', scale: '100,000 light-years across',
              keyEvent: 'Our home galaxy assembles through hierarchical merging',
              desc: 'Our Milky Way galaxy assembles over billions of years by merging with dozens of smaller galaxies. A central bar forms, majestic spiral arms develop, and 200\u2013400 billion stars settle into orbits around a supermassive black hole (Sagittarius A*, 4 million solar masses). The galactic disk, halo, and bulge take shape. Heavy elements from generations of stellar deaths accumulate, making rocky planets possible.',
              facts: ['The Milky Way consumed the Gaia-Enceladus dwarf galaxy ~10 billion years ago', 'Our galaxy contains 200\u2013400 billion stars and at least 100 billion planets', 'The central black hole (Sgr A*) has 4 million times the Sun\'s mass', 'The galaxy is ~13.6 billion years old, nearly as old as the universe itself', 'The Milky Way\'s spiral arms are density waves, not permanent structures', 'Our galaxy will collide with Andromeda in ~4.5 billion years (Milkomeda)']
            },
            {
              t: 9.2, name: 'Our Sun Is Born', emoji: '\u2600\uFE0F', color: '#1a1520', border: '#f59e0b', sky: '#1a1a35',
              temp: '15 million K (core) / 5,778 K (surface)', scale: 'Solar System: ~9 billion km across',
              keyEvent: 'A molecular cloud collapses \u2014 our Solar System forms',
              desc: 'A molecular cloud in the Orion Arm collapses \u2014 possibly triggered by a nearby supernova shockwave. Our Sun ignites as a main-sequence G2V star. The remaining disk of gas and dust coalesces into 8 planets, dwarf planets, asteroids, and comets. Within 100 million years, Earth forms and is struck by a Mars-sized body (Theia), creating the Moon. Within a billion years, the first microbial life appears in Earth\'s oceans.',
              facts: ['Our Sun is a 3rd-generation star: it contains elements forged in at least two previous stellar generations', 'The Solar System formed 4.6 billion years ago from a collapsing molecular cloud', 'The Moon formed from the debris of a giant impact with proto-Earth (the Theia hypothesis)', 'Jupiter\'s gravity sculpted the asteroid belt and protected inner planets from bombardment', 'Earth\'s magnetic field, generated by its molten iron core, shields life from solar radiation', 'The oldest confirmed microfossils on Earth are ~3.5 billion years old']
            },
            {
              t: 13.0, name: 'Present Day', emoji: '\uD83C\uDF0D', color: '#0a1518', border: '#10b981', sky: '#0a0a28',
              temp: '2.725 K (CMB background) / 5,778 K (Sun)', scale: 'Observable universe: 93 billion light-years',
              keyEvent: 'Humanity reaches space \u2014 the universe accelerates',
              desc: 'The universe is 13.8 billion years old. Humans have walked on the Moon, landed rovers on Mars, sent Voyager beyond the Solar System, detected gravitational waves from colliding black holes, and photographed a black hole\'s shadow. The James Webb Space Telescope peers back to the first galaxies. Meanwhile, dark energy is accelerating the expansion of the universe \u2014 galaxies beyond our Local Group are receding ever faster.',
              facts: ['The observable universe contains roughly 2 trillion galaxies', 'Dark energy (68%), dark matter (27%), and ordinary matter (5%) make up the cosmic budget', 'JWST observes galaxies from 13.4+ billion years ago in infrared light', 'Gravitational waves were first detected in 2015 by LIGO (Nobel Prize 2017)', 'We have discovered 5,500+ confirmed exoplanets, including potentially habitable ones', 'Voyager 1, launched in 1977, is over 24 billion km from Earth \u2014 in interstellar space']
            },
            {
              t: 13.8, name: 'The Far Future', emoji: '\uD83D\uDD2E', color: '#060610', border: '#6366f1', sky: '#050510',
              temp: 'Approaching absolute zero', scale: 'Expanding toward infinity',
              keyEvent: 'Heat death \u2014 maximum entropy, eternal darkness',
              desc: 'Stars exhaust their nuclear fuel one by one. Red dwarfs \u2014 the longest-lived stars \u2014 will be the last to shine, burning for up to 10 trillion years. After that: white dwarfs cool to black dwarfs, neutron stars fade, and even black holes slowly evaporate through Hawking radiation over 10\u00B9\u2070\u2070 years. The universe reaches maximum entropy \u2014 no temperature gradients, no usable energy, no structure. An eternal, featureless void.',
              facts: ['In ~5 billion years, the Sun will exhaust its hydrogen and swell into a red giant', 'The last stars (red dwarfs) will burn out in ~100 trillion years', 'Proton decay (if it occurs) would dissolve all remaining matter over 10\u00B3\u2077 years', 'Black holes will evaporate via Hawking radiation \u2014 the last ones in 10\u00B9\u2070\u2070 years', 'Heat death means no thermodynamic free energy \u2014 nothing can happen, ever again', 'Some theories propose quantum tunneling could spontaneously create a new Big Bang after unimaginable timescales']
            }
          ];

          function getCurrentEpoch(t) {
            for (var i = EPOCHS.length - 1; i >= 0; i--) { if (t >= EPOCHS[i].t) return EPOCHS[i]; }
            return EPOCHS[0];
          }
          var epoch = getCurrentEpoch(cosmicTime);

          // ── Canvas visualization ──
          var canvasRefCb = function (canvasEl) {
            if (!canvasEl || canvasEl._universeInit) return;
            canvasEl._universeInit = true;
            var dpr = window.devicePixelRatio || 1;
            var W = canvasEl.width = canvasEl.offsetWidth * dpr;
            var H = canvasEl.height = canvasEl.offsetHeight * dpr;
            var ctx = canvasEl.getContext('2d');
            var tick = 0;
            var particles = [];
            for (var i = 0; i < 400; i++) {
              particles.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 2 + 0.5, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, c: Math.random(), age: Math.random() * 100 });
            }
            // Expanding plasma particles for Big Bang
            var plasmaParticles = [];
            for (var pp = 0; pp < 120; pp++) {
              var angle = Math.random() * Math.PI * 2;
              var spd = 0.5 + Math.random() * 3;
              plasmaParticles.push({ angle: angle, speed: spd, dist: 0, size: 1 + Math.random() * 3, hue: Math.random() * 60, life: 0.5 + Math.random() * 0.5 });
            }
            // Nebula clouds
            var nebulae = [];
            for (var ni = 0; ni < 8; ni++) {
              nebulae.push({ x: Math.random(), y: Math.random(), size: 0.05 + Math.random() * 0.08, hue: ni % 4 === 0 ? '200,100,255' : ni % 4 === 1 ? '100,180,255' : ni % 4 === 2 ? '255,150,100' : '150,255,200', phase: Math.random() * Math.PI * 2 });
            }
            function draw() {
              tick++;
              var t = parseFloat(canvasEl.dataset.time || '0');
              var ep = getCurrentEpoch(t);
              ctx.clearRect(0, 0, W, H);
              var cx = W / 2, cy = H / 2;

              // ── Sky gradient (era-specific) ──
              var skyGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.7);
              if (t < 0.05) {
                // Singularity: blinding white core
                var intensity = Math.max(0, 1 - t / 0.05);
                skyGrad.addColorStop(0, 'rgba(255,255,255,' + intensity + ')');
                skyGrad.addColorStop(0.15, 'rgba(255,240,180,' + (intensity * 0.9) + ')');
                skyGrad.addColorStop(0.4, 'rgba(255,160,50,' + (intensity * 0.6) + ')');
                skyGrad.addColorStop(0.7, 'rgba(200,50,0,' + (intensity * 0.3) + ')');
                skyGrad.addColorStop(1, 'rgba(10,5,20,1)');
              } else if (t < 0.2) {
                // Post-bang: fiery orange fading
                var cool = (t - 0.05) / 0.15;
                skyGrad.addColorStop(0, 'rgba(255,' + Math.round(200 - cool * 150) + ',' + Math.round(100 - cool * 80) + ',' + (0.8 - cool * 0.6) + ')');
                skyGrad.addColorStop(0.3, 'rgba(180,' + Math.round(80 - cool * 60) + ',20,' + (0.4 - cool * 0.3) + ')');
                skyGrad.addColorStop(1, 'rgba(10,8,25,1)');
              } else if (t < 0.4) {
                // Dark Ages: deep indigo-black
                skyGrad.addColorStop(0, '#0c0a18'); skyGrad.addColorStop(0.5, '#060414'); skyGrad.addColorStop(1, '#020210');
              } else if (t < 1.0) {
                // First stars: hints of blue
                var starGlow = (t - 0.4) / 0.6;
                skyGrad.addColorStop(0, 'rgba(15,15,' + Math.round(40 + starGlow * 15) + ',1)');
                skyGrad.addColorStop(1, 'rgba(5,5,' + Math.round(15 + starGlow * 5) + ',1)');
              } else {
                // Galaxy era onward: deep cosmic blue-black
                skyGrad.addColorStop(0, '#0d0d28'); skyGrad.addColorStop(0.6, '#080818'); skyGrad.addColorStop(1, '#040410');
              }
              ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H);

              // ── Big Bang: expanding shockwave rings ──
              if (t < 0.3) {
                var bangPhase = t / 0.3;
                // Multiple expanding rings
                for (var ri = 0; ri < 5; ri++) {
                  var ringT = bangPhase - ri * 0.15;
                  if (ringT > 0 && ringT < 1) {
                    var ringR = ringT * W * 0.55;
                    var ringAlpha = (1 - ringT) * 0.6;
                    ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(255,' + Math.round(200 - ri * 30) + ',' + Math.round(100 - ri * 20) + ',' + ringAlpha + ')';
                    ctx.lineWidth = (3 - ri * 0.4) * dpr;
                    ctx.stroke();
                  }
                }
                // Central plasma fireball
                var fireR = Math.min(bangPhase * 0.4, 0.35) * W;
                var fireGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, fireR);
                var coreAlpha = Math.max(0, 1 - bangPhase * 1.5);
                fireGrad.addColorStop(0, 'rgba(255,255,255,' + Math.min(1, coreAlpha + 0.3) + ')');
                fireGrad.addColorStop(0.2, 'rgba(255,255,200,' + coreAlpha + ')');
                fireGrad.addColorStop(0.4, 'rgba(255,200,80,' + (coreAlpha * 0.7) + ')');
                fireGrad.addColorStop(0.7, 'rgba(255,100,20,' + (coreAlpha * 0.4) + ')');
                fireGrad.addColorStop(1, 'rgba(200,30,0,0)');
                ctx.beginPath(); ctx.arc(cx, cy, fireR, 0, Math.PI * 2);
                ctx.fillStyle = fireGrad; ctx.fill();

                // Expanding plasma particles flying outward
                for (var ppi = 0; ppi < plasmaParticles.length; ppi++) {
                  var pp2 = plasmaParticles[ppi];
                  var ppDist = bangPhase * pp2.speed * W * 0.3;
                  if (ppDist > W * 0.7) continue;
                  var ppAlpha = Math.max(0, (1 - bangPhase) * pp2.life);
                  var ppx = cx + Math.cos(pp2.angle) * ppDist;
                  var ppy = cy + Math.sin(pp2.angle) * ppDist;
                  var ppSize = pp2.size * dpr * (1 - bangPhase * 0.5);
                  ctx.beginPath(); ctx.arc(ppx, ppy, ppSize, 0, Math.PI * 2);
                  ctx.fillStyle = 'rgba(255,' + Math.round(200 + pp2.hue) + ',' + Math.round(100 + pp2.hue * 0.5) + ',' + ppAlpha + ')';
                  ctx.fill();
                }
              }

              // ── CMB glow (recombination era: 0.2-1.0) ──
              if (t > 0.15 && t < 1.0) {
                var cmbPhase = (t - 0.15) / 0.85;
                var cmbAlpha = Math.max(0, 0.35 * (1 - cmbPhase));
                // Mottled CMB pattern (simulated)
                for (var cmi = 0; cmi < 20; cmi++) {
                  var cmx = ((cmi * 173 + 37) % (W / dpr)) * dpr;
                  var cmy = ((cmi * 131 + 19) % (H / dpr)) * dpr;
                  var cms = (15 + cmi * 7 % 20) * dpr;
                  var cmGrad = ctx.createRadialGradient(cmx, cmy, 0, cmx, cmy, cms);
                  var warmth = cmi % 2 === 0 ? '255,200,120' : '255,160,80';
                  cmGrad.addColorStop(0, 'rgba(' + warmth + ',' + (cmbAlpha * 0.5) + ')');
                  cmGrad.addColorStop(1, 'rgba(' + warmth + ',0)');
                  ctx.beginPath(); ctx.arc(cmx, cmy, cms, 0, Math.PI * 2);
                  ctx.fillStyle = cmGrad; ctx.fill();
                }
              }

              // ── Stars (appear after Dark Ages) ──
              var starBrightness = t < 0.4 ? 0 : Math.min(1, (t - 0.4) / 0.8);
              var starCount = Math.min(particles.length, Math.floor(starBrightness * particles.length));
              for (var pi = 0; pi < starCount; pi++) {
                var p = particles[pi];
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
                if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
                var twinkle = 0.5 + 0.5 * Math.sin(tick * 0.03 + pi * 1.7);
                // Star color varies by era
                var hue;
                if (t < 1) hue = '180,200,255'; // early: blue-white Population III
                else if (p.c < 0.3) hue = '255,200,150'; // warm yellow
                else if (p.c < 0.6) hue = '200,210,255'; // cool blue
                else if (p.c < 0.85) hue = '255,240,220'; // white
                else hue = '255,160,120'; // red giant
                ctx.beginPath(); ctx.arc(p.x, p.y, p.s * dpr * twinkle, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + hue + ',' + (starBrightness * twinkle * 0.85) + ')';
                ctx.fill();
                // Glow around bright stars
                if (p.s > 1.8 && twinkle > 0.7) {
                  var glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * dpr * 3);
                  glow.addColorStop(0, 'rgba(' + hue + ',' + (twinkle * 0.15) + ')');
                  glow.addColorStop(1, 'rgba(' + hue + ',0)');
                  ctx.beginPath(); ctx.arc(p.x, p.y, p.s * dpr * 3, 0, Math.PI * 2);
                  ctx.fillStyle = glow; ctx.fill();
                }
              }

              // ── Nebulae (after t > 2 Gyr, star-forming regions) ──
              if (t > 2) {
                var nebAlpha = Math.min(0.3, (t - 2) * 0.03);
                for (var nbi = 0; nbi < nebulae.length; nbi++) {
                  var nb = nebulae[nbi];
                  var nbx = nb.x * W, nby = nb.y * H;
                  var nbSize = nb.size * W * (1 + 0.1 * Math.sin(tick * 0.01 + nb.phase));
                  var nbGrad = ctx.createRadialGradient(nbx, nby, 0, nbx, nby, nbSize);
                  nbGrad.addColorStop(0, 'rgba(' + nb.hue + ',' + (nebAlpha * 0.6) + ')');
                  nbGrad.addColorStop(0.4, 'rgba(' + nb.hue + ',' + (nebAlpha * 0.3) + ')');
                  nbGrad.addColorStop(1, 'rgba(' + nb.hue + ',0)');
                  ctx.beginPath(); ctx.arc(nbx, nby, nbSize, 0, Math.PI * 2);
                  ctx.fillStyle = nbGrad; ctx.fill();
                }
              }

              // ── Galaxies (after t > 1 Gyr) with spiral hints ──
              if (t > 1) {
                var galaxyCount = Math.min(16, Math.floor((t - 1) * 2.5));
                for (var gi = 0; gi < galaxyCount; gi++) {
                  var gx = ((gi * 137 + 50) % (W / dpr)) * dpr;
                  var gy = ((gi * 97 + 30) % (H / dpr)) * dpr;
                  var gs = (10 + gi % 6 * 5) * dpr;
                  // Core glow
                  var galGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gs);
                  var galHue = gi % 4 === 0 ? '180,160,255' : gi % 4 === 1 ? '255,200,150' : gi % 4 === 2 ? '150,200,255' : '255,220,180';
                  galGrad.addColorStop(0, 'rgba(' + galHue + ',0.5)');
                  galGrad.addColorStop(0.3, 'rgba(' + galHue + ',0.2)');
                  galGrad.addColorStop(0.7, 'rgba(' + galHue + ',0.05)');
                  galGrad.addColorStop(1, 'rgba(' + galHue + ',0)');
                  ctx.beginPath(); ctx.arc(gx, gy, gs, 0, Math.PI * 2);
                  ctx.fillStyle = galGrad; ctx.fill();
                  // Spiral arm hints for larger galaxies
                  if (gs > 12 * dpr && t > 3) {
                    ctx.save();
                    ctx.translate(gx, gy);
                    ctx.rotate(gi * 1.3 + tick * 0.001);
                    ctx.globalAlpha = 0.15;
                    ctx.beginPath();
                    for (var sa = 0; sa < Math.PI * 4; sa += 0.1) {
                      var sr = sa * gs * 0.08;
                      ctx.lineTo(Math.cos(sa) * sr, Math.sin(sa) * sr);
                    }
                    ctx.strokeStyle = 'rgba(' + galHue + ',0.3)';
                    ctx.lineWidth = 1.5 * dpr;
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                    ctx.restore();
                  }
                }
              }

              // ── Epoch label overlay (bottom-left HUD) ──
              // Dark backdrop for readability
              ctx.fillStyle = 'rgba(0,0,0,0.5)';
              var labelW = 220 * dpr, labelH = 48 * dpr;
              ctx.beginPath();
              ctx.roundRect(6 * dpr, H - (54 * dpr), labelW, labelH, 8 * dpr);
              ctx.fill();
              // Epoch name
              ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = 'bold ' + (12 * dpr) + 'px sans-serif';
              ctx.fillText(ep.emoji + ' ' + ep.name, 14 * dpr, H - (20 * dpr));
              // Time
              ctx.fillStyle = 'rgba(160,200,255,0.8)'; ctx.font = (9 * dpr) + 'px sans-serif';
              var timeStr = t < 0.001 ? 'T = 0 (Singularity)' : t < 1 ? (t * 1000).toFixed(0) + ' million years' : t.toFixed(1) + ' billion years';
              ctx.fillText(timeStr, 14 * dpr, H - (34 * dpr));

              canvasEl._animId = requestAnimationFrame(draw);
            }
            canvasEl._animId = requestAnimationFrame(draw);
            canvasEl._universeCleanup = function () { cancelAnimationFrame(canvasEl._animId); canvasEl._universeInit = false; };
            var ro = new ResizeObserver(function () { W = canvasEl.width = canvasEl.offsetWidth * dpr; H = canvasEl.height = canvasEl.offsetHeight * dpr; });
            ro.observe(canvasEl); canvasEl._ro = ro;
          };

          return React.createElement("div", { className: "max-w-4xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: function () { var cv = document.querySelector('[data-universe-canvas]'); if (cv && cv._universeCleanup) cv._universeCleanup(); if (cv && cv._ro) cv._ro.disconnect(); setStemLabTool(null); }, className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83C\uDF20 Universe Time-Lapse"),
              React.createElement("span", { className: "text-xs text-slate-400" }, "13.8 billion years of cosmic history")
            ),
            // Canvas
            React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-violet-300 shadow-lg", style: { height: '360px', background: '#050510' } },
              React.createElement("canvas", { "data-universe-canvas": "true", ref: canvasRefCb, "data-time": String(cosmicTime), style: { width: '100%', height: '100%', display: 'block' } })
            ),
            // Timeline slider
            React.createElement("div", { className: "mt-3 bg-gradient-to-r from-amber-50 via-violet-50 to-indigo-50 rounded-xl border border-violet-200 p-4" },
              React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                React.createElement("span", { className: "text-xs font-bold text-violet-700" }, "\u23F3 Cosmic Timeline"),
                React.createElement("span", { className: "ml-auto text-[11px] font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full" }, cosmicTime < 1 ? (cosmicTime * 1000).toFixed(0) + ' Myr' : cosmicTime.toFixed(1) + ' Gyr')
              ),
              React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement("span", { className: "text-[9px] text-violet-400" }, "Big Bang"),
                React.createElement("input", {
                  type: "range", min: 0, max: 13.8, step: 0.01, value: cosmicTime,
                  onChange: function (e) { var val = parseFloat(e.target.value); upd("cosmicTime", val); var cv = document.querySelector('[data-universe-canvas]'); if (cv) cv.dataset.time = String(val); },
                  className: "flex-1 h-1.5 accent-violet-500"
                }),
                React.createElement("span", { className: "text-[9px] text-violet-400" }, "Now")
              ),
              // Playback controls
              React.createElement("div", { className: "flex gap-2 mt-2" },
                React.createElement("button", {
                  onClick: function () {
                    if (window._universeTimeLapse) { clearInterval(window._universeTimeLapse); window._universeTimeLapse = null; upd("isPlaying", false); return; }
                    upd("isPlaying", true);
                    var t = cosmicTime;
                    window._universeTimeLapse = setInterval(function () {
                      t += 0.02 * speed;
                      if (t > 13.8) { t = 0; }
                      upd("cosmicTime", parseFloat(t.toFixed(2)));
                      var cv = document.querySelector('[data-universe-canvas]');
                      if (cv) cv.dataset.time = String(t);
                    }, 50);
                  }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (isPlaying ? "bg-red-500 text-white" : "bg-violet-600 text-white hover:bg-violet-700") + " transition-all"
                }, isPlaying ? "\u23F9 Stop" : "\u25B6 Play"),
                React.createElement("div", { className: "flex items-center gap-1.5 bg-white/60 rounded-lg px-2 py-1 border border-violet-200" },
                  React.createElement("span", { className: "text-[9px] text-violet-500 font-bold" }, "Speed"),
                  React.createElement("input", { type: "range", min: 0.5, max: 5, step: 0.5, value: speed, onChange: function (e) { upd("speed", parseFloat(e.target.value)); }, className: "w-16 h-1 accent-violet-400" }),
                  React.createElement("span", { className: "text-[10px] text-violet-600 font-bold w-6" }, speed + "x")
                )
              ),
              // Epoch quick-jump buttons
              React.createElement("div", { className: "flex flex-wrap gap-1 mt-2" },
                EPOCHS.map(function (ep) {
                  var isCurrent = cosmicTime >= ep.t && (EPOCHS.indexOf(ep) === EPOCHS.length - 1 || cosmicTime < EPOCHS[EPOCHS.indexOf(ep) + 1].t);
                  return React.createElement("button", {
                    key: ep.name,
                    onClick: function () { upd("cosmicTime", ep.t); var cv = document.querySelector('[data-universe-canvas]'); if (cv) cv.dataset.time = String(ep.t); awardStemXP('universe_explore', 5, 'Visited epoch: ' + ep.name); },
                    className: "px-2 py-1 rounded-lg text-[9px] font-bold transition-all hover:scale-105 " + (isCurrent ? "text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200 hover:border-violet-300"),
                    style: isCurrent ? { backgroundColor: ep.border } : {}
                  }, ep.emoji + " " + ep.name);
                })
              )
            ),
            // ── Current epoch info card (enhanced with dark theme + extra fields) ──
            React.createElement("div", { className: "mt-3 rounded-xl border-2 p-5 animate-in fade-in duration-300 shadow-lg", style: { backgroundColor: epoch.color, borderColor: epoch.border } },
              React.createElement("div", { className: "flex items-center gap-3 mb-3" },
                React.createElement("span", { className: "text-3xl", style: { filter: 'drop-shadow(0 0 8px ' + epoch.border + ')' } }, epoch.emoji),
                React.createElement("div", { className: "flex-1" },
                  React.createElement("h4", { className: "text-base font-black tracking-wide", style: { color: epoch.border } }, epoch.name),
                  React.createElement("p", { className: "text-[11px] font-medium", style: { color: 'rgba(200,210,230,0.8)' } }, cosmicTime < 1 ? (cosmicTime * 1000).toFixed(0) + ' million years after the Big Bang' : cosmicTime.toFixed(1) + ' billion years after the Big Bang')
                )
              ),
              // Key metrics strip
              epoch.temp && React.createElement("div", { className: "grid grid-cols-3 gap-2 mb-3" },
                React.createElement("div", { className: "rounded-lg p-2 text-center", style: { backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' } },
                  React.createElement("p", { className: "text-[9px] font-bold", style: { color: 'rgba(200,200,230,0.6)' } }, "\uD83C\uDF21\uFE0F Temperature"),
                  React.createElement("p", { className: "text-[11px] font-bold", style: { color: '#fbbf24' } }, epoch.temp)
                ),
                React.createElement("div", { className: "rounded-lg p-2 text-center", style: { backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' } },
                  React.createElement("p", { className: "text-[9px] font-bold", style: { color: 'rgba(200,200,230,0.6)' } }, "\uD83D\uDCCF Scale"),
                  React.createElement("p", { className: "text-[11px] font-bold", style: { color: '#a78bfa' } }, epoch.scale)
                ),
                React.createElement("div", { className: "rounded-lg p-2 text-center col-span-1", style: { backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' } },
                  React.createElement("p", { className: "text-[9px] font-bold", style: { color: 'rgba(200,200,230,0.6)' } }, "\u26A1 Key Event"),
                  React.createElement("p", { className: "text-[10px] font-bold", style: { color: '#34d399' } }, epoch.keyEvent)
                )
              ),
              // Description with high-contrast white text
              React.createElement("p", { className: "text-[13px] leading-relaxed mb-3", style: { color: 'rgba(230,235,245,0.92)' } }, epoch.desc),
              // Facts grid
              React.createElement("div", { className: "space-y-1.5", style: { borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' } },
                React.createElement("p", { className: "text-[11px] font-bold mb-1", style: { color: epoch.border } }, "\uD83D\uDCA1 Key Facts"),
                epoch.facts.map(function (fact, i) {
                  return React.createElement("div", { key: i, className: "flex items-start gap-2 text-[11px]", style: { color: 'rgba(210,215,230,0.85)' } },
                    React.createElement("span", { className: "mt-0.5 flex-shrink-0", style: { color: epoch.border } }, "\u2022"),
                    React.createElement("span", null, fact)
                  );
                })
              )
            ),
            // Snapshot button
            React.createElement("div", { className: "flex mt-3" },
              React.createElement("button", { onClick: function () { setToolSnapshots(function (prev) { return prev.concat([{ id: 'uni-' + Date.now(), tool: 'universe', label: 'Universe: ' + epoch.name, data: Object.assign({}, d), timestamp: Date.now() }]); }); addToast('\uD83D\uDCF8 Universe snapshot saved!', 'success'); }, className: "ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full hover:from-violet-600 hover:to-indigo-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")
            )
          );
        })(),

        stemLabTab === 'explore' && stemLabTool === 'rocks' && (() => {
          const d = labToolData.rocks || {};
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, rocks: { ...prev.rocks, [key]: val } }));
          const mode = d.mode || 'landscape';

          // ── Rock type data ──
          const ROCK_TYPES = {
            igneous: { label: 'Igneous', icon: '🌋', color: '#ef4444', desc: 'Formed from cooled magma or lava', process: 'Cooling & Crystallization' },
            sedimentary: { label: 'Sedimentary', icon: '🏖️', color: '#f59e0b', desc: 'Formed from compressed layers of sediment', process: 'Compaction & Cementation' },
            metamorphic: { label: 'Metamorphic', icon: '⛰️', color: '#8b5cf6', desc: 'Formed when existing rocks change under heat & pressure', process: 'Heat & Pressure' }
          };

          // ── Rock specimens ──
          const ROCKS = [
            { id: 'granite', type: 'igneous', label: 'Granite', hardness: 6.5, texture: 'coarse-grained', grainColors: ['#d4d4d8', '#fca5a5', '#1e1e1e', '#fafafa'], desc: 'Intrusive igneous rock with visible quartz, feldspar, and mica crystals. Forms deep underground from slowly cooling magma.', uses: 'Countertops, monuments, building stone' },
            { id: 'basalt', type: 'igneous', label: 'Basalt', hardness: 6, texture: 'fine-grained', grainColors: ['#374151', '#1f2937', '#4b5563', '#111827'], desc: 'Extrusive igneous rock \u2014 the most common volcanic rock. Forms when lava cools quickly at the surface.', uses: 'Road aggregate, construction fill' },
            { id: 'obsidian', type: 'igneous', label: 'Obsidian', hardness: 5.5, texture: 'glassy', grainColors: ['#0f0f0f', '#1a1a2e', '#16213e', '#0a0a0a'], desc: 'Volcanic glass formed when lava cools extremely rapidly. Conchoidal fracture.', uses: 'Surgical scalpels, jewelry, ancient tools' },
            { id: 'pumice', type: 'igneous', label: 'Pumice', hardness: 6, texture: 'vesicular', grainColors: ['#d6d3d1', '#e7e5e4', '#a8a29e', '#f5f5f4'], desc: 'Light, porous volcanic rock full of gas bubbles. So light it can float on water!', uses: 'Abrasive cleaning, lightweight aggregate' },
            { id: 'rhyolite', type: 'igneous', label: 'Rhyolite', hardness: 6, texture: 'fine-grained', grainColors: ['#fca5a5', '#e5e7eb', '#d1d5db', '#fecaca'], desc: 'Extrusive equivalent of granite. Light-colored fine-grained volcanic rock, often with flow banding. Rich in silica (>69%). Erupts explosively due to high viscosity.', uses: 'Aggregate, decorative stone, gemstone (thundereggs)' },
            { id: 'diorite', type: 'igneous', label: 'Diorite', hardness: 6, texture: 'coarse-grained', grainColors: ['#1e1e1e', '#fafafa', '#4b5563', '#e5e7eb'], desc: 'Intrusive igneous rock with a "salt and pepper" appearance. Intermediate composition between granite and gabbro. Contains plagioclase feldspar and hornblende.', uses: 'Building stone, cobblestones, ancient sculptures (Inca)' },
            { id: 'andesite', type: 'igneous', label: 'Andesite', hardness: 6, texture: 'fine-grained', grainColors: ['#6b7280', '#9ca3af', '#4b5563', '#d1d5db'], desc: 'Intermediate volcanic rock named after the Andes Mountains. Common at convergent plate boundaries. Often contains visible phenocrysts in a fine matrix (porphyritic texture).', uses: 'Construction aggregate, monuments' },
            { id: 'tuff', type: 'igneous', label: 'Tuff', hardness: 4, texture: 'vesicular', grainColors: ['#fde68a', '#d6d3d1', '#a8a29e', '#e7e5e4'], desc: 'Consolidated volcanic ash. Formed when explosive eruptions blast fine particles into the air, which settle and lithify. Can contain pumice fragments and glass shards.', uses: 'Building stone (ancient Rome), lightweight concrete, water filtration' },
            { id: 'sandstone', type: 'sedimentary', label: 'Sandstone', hardness: 6.5, texture: 'clastic', grainColors: ['#d97706', '#fbbf24', '#b45309', '#f59e0b'], desc: 'Made of sand-sized quartz grains cemented together. Often shows cross-bedding from ancient dunes or rivers.', uses: 'Building stone, flagstone, aquifers' },
            { id: 'limestone', type: 'sedimentary', label: 'Limestone', hardness: 3, texture: 'bioclastic', grainColors: ['#e5e7eb', '#d1d5db', '#f3f4f6', '#fef9c3'], desc: 'Composed mainly of calcite (CaCO\u2083). Often contains fossils. Fizzes with acid!', uses: 'Cement, lime, building stone, chalk' },
            { id: 'shale', type: 'sedimentary', label: 'Shale', hardness: 3, texture: 'fine-layered', grainColors: ['#6b7280', '#4b5563', '#9ca3af', '#374151'], desc: 'Made of compressed clay and silt. Splits into thin layers (fissile). Most common sedimentary rock.', uses: 'Bricks, pottery, oil/gas source rock' },
            { id: 'conglom', type: 'sedimentary', label: 'Conglomerate', hardness: 6, texture: 'clastic-coarse', grainColors: ['#92400e', '#a16207', '#d4d4d8', '#78716c'], desc: 'Contains large rounded pebbles cemented in a fine matrix. Tells us about ancient fast-flowing rivers.', uses: 'Construction aggregate, decorative stone' },
            { id: 'chalk', type: 'sedimentary', label: 'Chalk', hardness: 1, texture: 'bioclastic', grainColors: ['#fafafa', '#f5f5f4', '#e5e7eb', '#ffffff'], desc: 'Soft, white limestone made of microscopic plankton shells (coccoliths). The White Cliffs of Dover are chalk. Extremely fine-grained \u2014 each grain is a tiny fossil!', uses: 'Blackboard chalk, whiting, soil amendment, toothpaste' },
            { id: 'travertine', type: 'sedimentary', label: 'Travertine', hardness: 4, texture: 'crystalline', grainColors: ['#fef3c7', '#fde68a', '#fafaf9', '#e7e5e4'], desc: 'Chemical sedimentary rock deposited from mineral-rich hot springs and cave systems. Often has a banded, porous appearance. Forms stalactites and stalagmites in caves.', uses: 'Flooring, countertops, building facades (Colosseum in Rome)' },
            { id: 'marble', type: 'metamorphic', label: 'Marble', hardness: 3.5, texture: 'crystalline', grainColors: ['#fafafa', '#e5e7eb', '#f3f4f6', '#dbeafe'], desc: 'Metamorphosed limestone. Interlocking calcite crystals give it a sugary texture. Used by sculptors for millennia.', uses: 'Sculpture, flooring, tombstones' },
            { id: 'slate', type: 'metamorphic', label: 'Slate', hardness: 5.5, texture: 'foliated', grainColors: ['#374151', '#475569', '#334155', '#1e293b'], desc: 'Metamorphosed shale. Excellent foliation \u2014 splits into flat, smooth sheets.', uses: 'Roofing tiles, chalkboards, flooring' },
            { id: 'quartzite', type: 'metamorphic', label: 'Quartzite', hardness: 7, texture: 'non-foliated', grainColors: ['#f5f5f4', '#fafaf9', '#e7e5e4', '#e0f2fe'], desc: 'Metamorphosed sandstone. Extremely hard \u2014 even harder than granite. Quartz grains fuse together.', uses: 'Railroad ballast, decorative stone' },
            { id: 'gneiss', type: 'metamorphic', label: 'Gneiss', hardness: 7, texture: 'banded', grainColors: ['#1e1e1e', '#fafafa', '#6b7280', '#d4d4d8'], desc: 'Shows distinct light and dark mineral banding. Forms under extreme heat and pressure deep in the crust.', uses: 'Decorative stone, construction' },
            { id: 'schist', type: 'metamorphic', label: 'Schist', hardness: 5, texture: 'foliated', grainColors: ['#78716c', '#a8a29e', '#57534e', '#d6d3d1'], desc: 'Medium-grade metamorphic rock with visible, aligned mica flakes that give it a sparkly, shiny appearance. Forms from shale under moderate heat and pressure. Named for its tendency to split (Greek "schizein" = to split).', uses: 'Decorative landscaping, flagstone, historical millstones' },
            { id: 'phyllite', type: 'metamorphic', label: 'Phyllite', hardness: 4, texture: 'foliated', grainColors: ['#4b5563', '#6b7280', '#374151', '#9ca3af'], desc: 'Between slate and schist in metamorphic grade. Has a distinctive silky, satiny sheen from microscopic mica crystals. Crinkled foliation surface (crenulations). The stepping stone between low and medium metamorphism.', uses: 'Decorative stone, garden paths, grave markers' }
          ];

          // ── Mineral data ──
          const MINERALS = [
            { id: 'quartz', label: 'Quartz', hardness: 7, streak: 'White', luster: 'Vitreous', crystal: 'Hexagonal', color: '#e0f2fe', formula: 'SiO\u2082', desc: 'The second most abundant mineral in the crust of Earth. Forms distinctive six-sided prismatic crystals with pointed terminations. Extremely resistant to weathering. Comes in many colored varieties: amethyst (purple), citrine (yellow), rose quartz (pink), smoky quartz (brown).', uses: 'Electronics (oscillators, watches), glassmaking, abrasives, gemstones', funFact: 'Quartz is piezoelectric \u2014 when squeezed, it generates an electric charge. This property makes quartz watches accurate to within 15 seconds per month!', occurrence: 'Found in virtually all rock types worldwide. Major deposits in Brazil, Arkansas (USA), Madagascar, and the Alps.' },
            { id: 'feldspar', label: 'Feldspar', hardness: 6, streak: 'White', luster: 'Vitreous', crystal: 'Monoclinic/Triclinic', color: '#fce7f3', formula: 'KAlSi\u2083O\u2088', desc: 'The most abundant mineral group on Earth, making up ~60% of the crust. Two main families: orthoclase (potassium) and plagioclase (sodium-calcium). Shows distinctive cleavage at nearly 90\u00B0 angles. Often pink, white, or gray.', uses: 'Ceramics, glass, porcelain, scouring powders, dental products', funFact: 'The name means "field spar" in Swedish because early miners found it in their fields. Moonstone and labradorite are feldspar gemstones!', occurrence: 'Constituent of granite, gneiss, basalt, and most igneous and metamorphic rocks globally.' },
            { id: 'mica', label: 'Mica (Muscovite)', hardness: 2.5, streak: 'White', luster: 'Pearly/Vitreous', crystal: 'Monoclinic', color: '#fef9c3', formula: 'KAl\u2082(Si\u2083Al)O\u2081\u2080(OH)\u2082', desc: 'Sheet silicate that peels into thin, flexible, transparent sheets. The "sparkly" mineral in rocks. Two common types: muscovite (light/clear) and biotite (dark/black). Perfect basal cleavage produces incredibly thin layers.', uses: 'Electrical insulation, cosmetics (shimmer), paint filler, window material (historically)', funFact: 'Before glass windows were common, thin sheets of muscovite mica were used as window panes in medieval Russia \u2014 hence "Muscovy glass" \u2192 muscovite!', occurrence: 'Common in granites, schists, pegmatites. Major deposits in India, Brazil, Russia, and the USA.' },
            { id: 'calcite', label: 'Calcite', hardness: 3, streak: 'White', luster: 'Vitreous', crystal: 'Trigonal (Rhombohedral)', color: '#f0fdf4', formula: 'CaCO\u2083', desc: 'The primary mineral in limestone and marble. Shows perfect rhombohedral cleavage \u2014 always breaks into parallelogram-shaped pieces. Fizzes vigorously when dilute acid is applied. Some varieties show double refraction (text appears doubled through clear crystals).', uses: 'Cement/concrete, lime production, optical instruments, antacid tablets (Tums)', funFact: 'Iceland spar (transparent calcite) creates double images! Vikings may have used it as a "sunstone" to navigate on cloudy days by detecting polarized skylight.', occurrence: 'Limestone caves (stalactites/stalagmites), coral reefs, chalk cliffs, marble deposits worldwide.' },
            { id: 'halite', label: 'Halite', hardness: 2.5, streak: 'White', luster: 'Vitreous', crystal: 'Cubic (Isometric)', color: '#ede9fe', formula: 'NaCl', desc: 'Common table salt! Forms perfect cubic crystals. Tastes salty (one of the few minerals safe to taste-test). Forms when shallow seas or salt lakes evaporate. Can be colorless, white, pink, blue, or red depending on impurities.', uses: 'Food seasoning/preservation, road de-icing, chemical industry, water softening', funFact: 'Roman soldiers were sometimes paid in salt \u2014 the word "salary" comes from the Latin "salarium" (salt money). The phrase "worth your salt" comes from this tradition!', occurrence: 'Evaporite deposits in arid regions: Great Salt Lake, Dead Sea, salt mines in Poland (Wieliczka), Germany, and Louisiana.' },
            { id: 'pyrite', label: 'Pyrite', hardness: 6.5, streak: 'Greenish-black', luster: 'Metallic', crystal: 'Cubic (Isometric)', color: '#fef3c7', formula: 'FeS\u2082', desc: 'Iron sulfide with a brilliant metallic brass-yellow color. Forms perfect cubes, pyritohedrons, and octahedrons. Produces sparks when struck against steel (name from Greek "pyr" = fire). Commonly mistaken for gold but much harder and lighter.', uses: 'Sulfuric acid production, electronics (early crystal radios), decorative stone, gold indicator mineral', funFact: 'Called "fool\u2019s gold" because miners confused it with real gold. You can tell them apart: gold is soft (scratches with a knife), pyrite is hard. Gold leaves a yellow streak, pyrite leaves a greenish-black streak!', occurrence: 'Found in all rock types. Often found alongside real gold deposits! Common in coal, hydrothermal veins, and sedimentary rocks.' },
            { id: 'talc', label: 'Talc', hardness: 1, streak: 'White', luster: 'Pearly/Waxy', crystal: 'Monoclinic', color: '#f0fdf4', formula: 'Mg\u2083Si\u2084O\u2081\u2080(OH)\u2082', desc: 'The softest known mineral \u2014 #1 on the Mohs scale. Can be scratched with a fingernail! Has a soapy, greasy feel. Forms flat, foliated masses. Color ranges from white to pale green to gray. Metamorphic mineral formed from magnesium-rich rocks.', uses: 'Talcum powder, ceramics, paint filler, paper coating, cosmetics', funFact: 'Soapstone (used for carving and countertops) is a rock made mostly of talc. It was used by ancient cultures worldwide to carve cooking vessels because it retains heat well!', occurrence: 'Metamorphic rocks (ultramafic environments). Major deposits in China, India, USA (Vermont), France, and Brazil.' },
            { id: 'diamond', label: 'Diamond', hardness: 10, streak: 'None (too hard)', luster: 'Adamantine', crystal: 'Cubic (Isometric)', color: '#f0f9ff', formula: 'C', desc: 'Pure crystallized carbon \u2014 the hardest natural substance on Earth. Forms deep in the mantle (150+ km below surface) under extreme pressure and temperature. Brought to surface by violent volcanic eruptions in kimberlite pipes. High refractive index creates "fire" (rainbow flashes).', uses: 'Gemstones, cutting/grinding tools, drill bits, thermal conductors, optical windows', funFact: 'Diamond and graphite (pencil lead) are both pure carbon! The only difference is how the carbon atoms are arranged. Diamond is the hardest mineral; graphite is one of the softest. Same atoms, completely different properties!', occurrence: 'Kimberlite pipes in South Africa, Russia, Australia, Canada, Botswana. Also found in river gravels (alluvial deposits).' },
            { id: 'magnetite', label: 'Magnetite', hardness: 5.5, streak: 'Black', luster: 'Metallic/Submetallic', crystal: 'Cubic (Isometric)', color: '#1f2937', formula: 'Fe\u2083O\u2084', desc: 'The most magnetic naturally occurring mineral on Earth. Strongly attracted to magnets and can itself act as a natural magnet ("lodestone"). Black, heavy, and opaque. Important iron ore mineral. Octahedral crystal habit.', uses: 'Iron/steel production, magnetic recording media, heavy concrete, water purification', funFact: 'Lodestone (naturally magnetized magnetite) was the first compass! Ancient Chinese and Greek navigators used floating lodestones to find north. Magnetite crystals have even been found in the brains of pigeons and sea turtles, helping them navigate!', occurrence: 'Igneous and metamorphic rocks worldwide. Major deposits in Sweden (Kiruna), Australia, Brazil, South Africa, and Minnesota (USA).' },
            { id: 'hematite', label: 'Hematite', hardness: 5.5, streak: 'Red-brown', luster: 'Metallic/Earthy', crystal: 'Trigonal', color: '#991b1b', formula: 'Fe\u2082O\u2083', desc: 'The most important iron ore mineral. Name from Greek "haima" (blood) due to its red streak. Can appear metallic silver-gray (specular hematite) or earthy red-brown. Always produces a distinctive red-brown streak regardless of surface color.', uses: 'Iron/steel production (primary ore), pigment (red ochre), polishing compound (jeweler\u2019s rouge), radiation shielding', funFact: 'The red color of Mars comes from hematite! NASA\u2019s rovers have confirmed that the Martian soil is rich in iron oxide. Hematite was also used by prehistoric humans as the first paint pigment \u2014 cave paintings from 40,000 years ago used ground hematite!', occurrence: 'Banded iron formations, volcanic rocks, red soils. Lake Superior region (USA), Minas Gerais (Brazil), Pilbara (Australia), Mars!' },
            { id: 'garnet', label: 'Garnet', hardness: 7, streak: 'White', luster: 'Vitreous/Resinous', crystal: 'Cubic (Isometric)', color: '#7f1d1d', formula: 'Complex silicates (e.g., Fe\u2083Al\u2082Si\u2083O\u2081\u2082)', desc: 'A group of silicate minerals known for their beautiful dodecahedral crystals (12-sided). Most commonly deep red (almandine), but can be green (tsavorite), orange (spessartine), or even color-changing. Very hard and durable. Excellent for identifying metamorphic grade.', uses: 'Abrasive blasting (sandpaper, waterjet cutting), gemstones, water filtration, indicator mineral in geology', funFact: 'Garnets grow in metamorphic rocks and their size indicates how much heat and pressure the rock experienced. Geologists use garnet composition like a geological thermometer! Some rare garnets change color from blue-green in daylight to purple under incandescent light.', occurrence: 'Schists, gneisses, contact metamorphic zones. Major gem deposits in India, Sri Lanka, Tanzania, Madagascar, and Idaho (USA).' },
            { id: 'olivine', label: 'Olivine', hardness: 6.5, streak: 'White', luster: 'Vitreous', crystal: 'Orthorhombic', color: '#4d7c0f', formula: '(Mg,Fe)\u2082SiO\u2084', desc: 'Olive-green mineral abundant in the upper mantle of Earth. One of the first minerals to crystallize from cooling magma. Forms small glassy grains in basalt. Gem variety is called peridot. Weathers quickly at the surface, which is why it is rare in sedimentary rocks.', uses: 'Gemstone (peridot), refractory bricks, CO\u2082 capture research, foundry sand', funFact: 'Olivine makes up most of the upper mantle of Earth! There is more olivine inside Earth than any other mineral. The green sand beaches of Hawaii (Papak\u014Dlea Beach) are made of tiny olivine crystals eroded from volcanic rock!', occurrence: 'Basalt, peridotite, meteorites. Hawaii, Canary Islands, Pakistan (peridot gems), mantle xenoliths worldwide.' },
            { id: 'fluorite', label: 'Fluorite', hardness: 4, streak: 'White', luster: 'Vitreous', crystal: 'Cubic (Isometric)', color: '#7c3aed', formula: 'CaF\u2082', desc: 'Known as the "most colorful mineral in the world" \u2014 comes in virtually every color: purple, green, blue, yellow, pink, and even colorless. Forms perfect cubic and octahedral crystals. Often fluorescent under UV light (the word "fluorescence" comes from fluorite!). Four directions of perfect cleavage.', uses: 'Steelmaking flux, hydrofluoric acid production, optical lenses, gemstone, decorative carvings', funFact: 'Fluorite literally invented the word "fluorescence"! In 1852, George Stokes described the glow of fluorite under UV light and coined the term from the name of the mineral. The element fluorine is also named after fluorite!', occurrence: 'Hydrothermal veins, limestone cavities. Major deposits in China, Mexico, South Africa, Derbyshire (England \u2014 "Blue John"), and Illinois (USA).' },
            { id: 'galena', label: 'Galena', hardness: 2.5, streak: 'Lead-gray', luster: 'Metallic', crystal: 'Cubic (Isometric)', color: '#6b7280', formula: 'PbS', desc: 'Primary ore of lead. Very dense (heavy for its size) with perfect cubic cleavage \u2014 fractures into tiny cubes. Bright metallic silver color when fresh, tarnishes to dull gray. Lead-gray streak. Often found with silver as an impurity, making it a source of silver too.', uses: 'Lead production, ammunition, batteries, radiation shielding, early radio crystal detectors', funFact: 'Before transistors were invented, galena crystals were used in "crystal radio" sets! A thin wire ("cat\u2019s whisker") touching a galena crystal could detect radio signals without any battery or electricity. Galena was also used by ancient Egyptians as kohl eyeliner!', occurrence: 'Hydrothermal veins, limestone replacement deposits. Missouri (USA \u2014 largest lead deposit), Broken Hill (Australia), Germany, Mexico.' },
            { id: 'gypsum', label: 'Gypsum', hardness: 2, streak: 'White', luster: 'Vitreous/Silky/Pearly', crystal: 'Monoclinic', color: '#faf5ff', formula: 'CaSO\u2084\u00B72H\u2082O', desc: 'A very soft evaporite mineral (can be scratched with a fingernail). Forms in a variety of habits: tabular crystals (selenite), fibrous masses (satin spar), and granular masses (alabaster). Transparent selenite crystals can be enormous. Contains water in its crystal structure.', uses: 'Drywall/plasterboard, plaster of Paris, cement, fertilizer, alabaster carvings', funFact: 'The Naica Mine in Mexico contains selenite gypsum crystals up to 12 meters (39 feet) long and weighing 55 tons \u2014 the largest crystals ever discovered on Earth! The cave is so hot (58\u00B0C/136\u00B0F) that humans can only survive inside for about 10 minutes!', occurrence: 'Evaporite deposits, desert roses (sand-included crystals), cave formations. Major deposits in USA, Mexico, Spain, Italy, and Nova Scotia.' },
            { id: 'sulfur', label: 'Sulfur', hardness: 2, streak: 'White-yellow', luster: 'Resinous/Adamantine', crystal: 'Orthorhombic', color: '#eab308', formula: 'S', desc: 'Native element with a distinctive bright yellow color and rotten-egg smell when heated. Very light and brittle. Low melting point (115\u00B0C). Burns with a blue flame producing SO\u2082 gas. Associated with volcanic activity and hot springs. One of the few minerals that occurs as a native element.', uses: 'Sulfuric acid (most widely used chemical), gunpowder, rubber vulcanization, fungicides, matches', funFact: 'Sulfur was known to ancient civilizations as "brimstone" (burning stone). It is mentioned in the Bible and in the Odyssey by Homer! The moon Io of Jupiter is covered in sulfur from its 400+ active volcanoes, giving it a bright yellow-orange appearance.', occurrence: 'Volcanic fumaroles, hot springs, evaporite domes (Gulf Coast USA), Sicily, Japan, Indonesia.' },
            { id: 'corundum', label: 'Corundum', hardness: 9, streak: 'White', luster: 'Adamantine/Vitreous', crystal: 'Trigonal', color: '#1e40af', formula: 'Al\u2082O\u2083', desc: 'Second hardest natural mineral after diamond. Pure corundum is colorless, but trace impurities create spectacular gemstones: chromium makes ruby (red), iron and titanium make sapphire (blue). Can occur in many other colors too. Extremely durable and resistant to chemical weathering.', uses: 'Gemstones (ruby/sapphire), watch bearings, abrasive (emery), laser rods, sandpaper', funFact: 'Ruby and sapphire are the SAME mineral! The only difference is trace element impurities \u2014 0.01% chromium makes a ruby, while iron+titanium make a sapphire. A "padparadscha" sapphire (pink-orange) is among the rarest gems in the world!', occurrence: 'Metamorphic and igneous rocks. Major ruby deposits in Myanmar, Mozambique. Sapphires from Kashmir, Sri Lanka, Montana (USA), Australia.' },
            { id: 'topaz', label: 'Topaz', hardness: 8, streak: 'White', luster: 'Vitreous', crystal: 'Orthorhombic', color: '#f97316', formula: 'Al\u2082SiO\u2084(F,OH)\u2082', desc: 'Hard silicate mineral prized as a gemstone. Naturally colorless, yellow, orange, or blue (most blue topaz on the market is heat-treated). Contains fluorine and hydroxyl in its structure. Forms beautiful prismatic crystals with vertical striations. Perfect basal cleavage.', uses: 'Gemstones, Mohs hardness reference (#8), decorative carvings, optical components', funFact: 'The largest uncut topaz crystal ever found (the "El-Dorado Topaz" from Brazil) weighs 6.2 kg (31,000 carats)! Imperial topaz (rare orange-pink variety from Ouro Preto, Brazil) is among the most valuable colored gemstones.', occurrence: 'Granite pegmatites, rhyolite cavities, alluvial deposits. Major sources: Brazil (Minas Gerais), Pakistan, Russia (Ural Mts), Utah (USA).' }
          ];
          // ── Quiz bank ──
          const QUIZ_BANK = [
            { q: 'Which rock type forms from cooled magma?', a: 'Igneous', options: ['Igneous', 'Sedimentary', 'Metamorphic', 'Organic'] },
            { q: 'What process turns sediment into sedimentary rock?', a: 'Compaction and cementation', options: ['Compaction and cementation', 'Melting', 'Cooling', 'Erosion'] },
            { q: 'Marble is a metamorphic form of which rock?', a: 'Limestone', options: ['Limestone', 'Sandstone', 'Granite', 'Basalt'] },
            { q: 'Which mineral is the hardest on the Mohs scale?', a: 'Diamond', options: ['Diamond', 'Quartz', 'Corundum', 'Topaz'] },
            { q: 'What is the softest mineral?', a: 'Talc', options: ['Talc', 'Gypsum', 'Calcite', 'Halite'] },
            { q: 'Obsidian forms when lava cools...', a: 'Very quickly', options: ['Very quickly', 'Very slowly', 'Underground', 'Underwater'] },
            { q: 'Which rock can float on water?', a: 'Pumice', options: ['Pumice', 'Basalt', 'Marble', 'Granite'] },
            { q: 'What type of rock is shale?', a: 'Sedimentary', options: ['Sedimentary', 'Igneous', 'Metamorphic', 'Mineral'] },
            { q: 'Pyrite is also known as...', a: "Fool's gold", options: ["Fool's gold", "White gold", "Rose gold", "Black gold"] },
            { q: 'Which rock shows distinct banding?', a: 'Gneiss', options: ['Gneiss', 'Granite', 'Basalt', 'Slate'] },
            { q: 'Limestone fizzes when you add...', a: 'Acid', options: ['Acid', 'Water', 'Salt', 'Oil'] },
            { q: 'Quartzite is metamorphosed...', a: 'Sandstone', options: ['Sandstone', 'Limestone', 'Shale', 'Granite'] },
            { q: 'Rhyolite is the extrusive equivalent of...', a: 'Granite', options: ['Granite', 'Basalt', 'Gabbro', 'Diorite'] },
            { q: 'Which mineral is naturally magnetic?', a: 'Magnetite', options: ['Magnetite', 'Hematite', 'Pyrite', 'Galena'] },
            { q: 'Ruby and sapphire are both varieties of...', a: 'Corundum', options: ['Corundum', 'Quartz', 'Diamond', 'Topaz'] },
            { q: 'What gives Mars its red color?', a: 'Hematite (iron oxide)', options: ['Hematite (iron oxide)', 'Rust from water', 'Red sand', 'Volcanic dust'] },
            { q: 'The word "fluorescence" comes from which mineral?', a: 'Fluorite', options: ['Fluorite', 'Quartz', 'Diamond', 'Calcite'] },
            { q: 'Chalk is made of tiny shells from...', a: 'Microscopic plankton', options: ['Microscopic plankton', 'Snails', 'Clams', 'Coral'] },
            { q: 'Diorite has what distinctive appearance?', a: 'Salt and pepper', options: ['Salt and pepper', 'Solid black', 'Striped', 'Glassy'] },
            { q: 'Which mineral was used in early crystal radios?', a: 'Galena', options: ['Galena', 'Quartz', 'Diamond', 'Pyrite'] },
            { q: 'The green beaches of Hawaii are made of...', a: 'Olivine', options: ['Olivine', 'Emerald', 'Jade', 'Green glass'] },
            { q: 'Which building was made from travertine?', a: 'The Colosseum', options: ['The Colosseum', 'The Pyramids', 'Stonehenge', 'Taj Mahal'] },
            { q: 'Schist gets its sparkly appearance from...', a: 'Aligned mica flakes', options: ['Aligned mica flakes', 'Quartz crystals', 'Gold inclusions', 'Diamond dust'] },
            { q: 'What makes quartz watches accurate?', a: 'Piezoelectric effect', options: ['Piezoelectric effect', 'Magnetic field', 'Battery power', 'High density'] },
            { q: 'Where are the largest crystals ever found?', a: 'Naica Mine, Mexico', options: ['Naica Mine, Mexico', 'Mount Everest', 'Grand Canyon', 'Sahara Desert'] },
            { q: 'The word "salary" comes from the Latin word for...', a: 'Salt', options: ['Salt', 'Silver', 'Gold', 'Stone'] },
            { q: 'Andesite is named after...', a: 'The Andes Mountains', options: ['The Andes Mountains', 'Andean people', 'A scientist named Ande', 'An ancient city'] },
            { q: 'Tuff is made from consolidated...', a: 'Volcanic ash', options: ['Volcanic ash', 'River sand', 'Coral reef', 'Glacier ice'] },
            { q: 'Which metamorphic rock comes between slate and schist?', a: 'Phyllite', options: ['Phyllite', 'Marble', 'Gneiss', 'Quartzite'] },
            { q: 'Garnet crystals commonly have how many sides?', a: '12 (dodecahedral)', options: ['12 (dodecahedral)', '4 (tetrahedral)', '6 (cubic)', '8 (octahedral)'] }
          ];

          const selRock = d.selectedRock ? ROCKS.find(r => r.id === d.selectedRock) : null;
          const selMineral = d.selectedMineral ? MINERALS.find(m => m.id === d.selectedMineral) : null;
          const quizQ = d.quizMode && QUIZ_BANK[d.quizIdx || 0] ? QUIZ_BANK[d.quizIdx || 0] : null;

          // ── Canvas ref for landscape ──
          var _lastRocksCanvas = null;
          const landscapeRef = function (canvasEl) {
            if (!canvasEl) {
              if (_lastRocksCanvas && _lastRocksCanvas._rocksCleanup) { _lastRocksCanvas._rocksCleanup(); _lastRocksCanvas._rocksInit = false; }
              _lastRocksCanvas = null;
              return;
            }
            _lastRocksCanvas = canvasEl;
            if (canvasEl._rocksInit) return;
            canvasEl._rocksInit = true;
            const W = canvasEl.width = canvasEl.offsetWidth * (window.devicePixelRatio || 1);
            const H = canvasEl.height = canvasEl.offsetHeight * (window.devicePixelRatio || 1);
            const ctx = canvasEl.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            let tick = 0;
            let hoverZone = null;

            const zones = [
              { id: 'volcano', label: '🌋 Volcano (Igneous)', x: 0.12, y: 0.15, w: 0.22, h: 0.55, type: 'igneous' },
              { id: 'river', label: '🏖️ River Delta (Sedimentary)', x: 0.5, y: 0.45, w: 0.28, h: 0.35, type: 'sedimentary' },
              { id: 'mountain', label: '⛰️ Mountain Core (Metamorphic)', x: 0.75, y: 0.08, w: 0.22, h: 0.62, type: 'metamorphic' }
            ];

            function drawLandscape() {
              ctx.clearRect(0, 0, W, H);
              // Sky gradient
              const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.5);
              skyGrad.addColorStop(0, '#0c4a6e');
              skyGrad.addColorStop(1, '#7dd3fc');
              ctx.fillStyle = skyGrad;
              ctx.fillRect(0, 0, W, H * 0.5);

              // Underground gradient
              const groundGrad = ctx.createLinearGradient(0, H * 0.5, 0, H);
              groundGrad.addColorStop(0, '#78350f');
              groundGrad.addColorStop(0.3, '#92400e');
              groundGrad.addColorStop(1, '#451a03');
              ctx.fillStyle = groundGrad;
              ctx.fillRect(0, H * 0.5, W, H * 0.5);

              // Ground surface line
              ctx.beginPath();
              ctx.moveTo(0, H * 0.5);
              for (let x = 0; x <= W; x += 5) {
                const wave = Math.sin(x * 0.01 + tick * 0.01) * 3 * dpr;
                ctx.lineTo(x, H * 0.5 + wave);
              }
              ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
              ctx.fillStyle = '#65a30d';
              ctx.fill();

              // ── Volcano (left) ──
              ctx.beginPath();
              ctx.moveTo(W * 0.02, H * 0.52);
              ctx.lineTo(W * 0.15, H * 0.12);
              ctx.lineTo(W * 0.18, H * 0.08);
              ctx.lineTo(W * 0.21, H * 0.12);
              ctx.lineTo(W * 0.34, H * 0.52);
              ctx.closePath();
              const volcGrad = ctx.createLinearGradient(W * 0.15, H * 0.08, W * 0.15, H * 0.52);
              volcGrad.addColorStop(0, '#7f1d1d');
              volcGrad.addColorStop(0.4, '#991b1b');
              volcGrad.addColorStop(1, '#57534e');
              ctx.fillStyle = volcGrad;
              ctx.fill();

              // Lava flow
              ctx.beginPath();
              ctx.moveTo(W * 0.17, H * 0.1);
              const lavaWave = Math.sin(tick * 0.05) * 5 * dpr;
              ctx.quadraticCurveTo(W * 0.19 + lavaWave, H * 0.25, W * 0.24, H * 0.42);
              ctx.lineTo(W * 0.22, H * 0.42);
              ctx.quadraticCurveTo(W * 0.17 - lavaWave, H * 0.25, W * 0.16, H * 0.1);
              ctx.closePath();
              const lavaGrad = ctx.createLinearGradient(W * 0.17, H * 0.1, W * 0.17, H * 0.42);
              lavaGrad.addColorStop(0, '#fbbf24');
              lavaGrad.addColorStop(0.5, '#f97316');
              lavaGrad.addColorStop(1, '#dc2626');
              ctx.fillStyle = lavaGrad;
              ctx.fill();

              // Lava particles
              for (let i = 0; i < 6; i++) {
                const px = W * 0.17 + Math.sin(tick * 0.08 + i * 1.2) * 12 * dpr;
                const py = H * 0.06 - Math.abs(Math.sin(tick * 0.06 + i * 0.9)) * 20 * dpr;
                ctx.beginPath();
                ctx.arc(px, py, (2 + Math.sin(tick * 0.1 + i)) * dpr, 0, Math.PI * 2);
                ctx.fillStyle = i % 2 === 0 ? '#fbbf24' : '#f97316';
                ctx.fill();
              }

              // Magma chamber underground
              ctx.beginPath();
              ctx.ellipse(W * 0.18, H * 0.75, W * 0.08, H * 0.12, 0, 0, Math.PI * 2);
              const magmaGrad = ctx.createRadialGradient(W * 0.18, H * 0.75, 0, W * 0.18, H * 0.75, W * 0.08);
              magmaGrad.addColorStop(0, '#fbbf24');
              magmaGrad.addColorStop(0.5, '#ea580c');
              magmaGrad.addColorStop(1, '#7f1d1d');
              ctx.fillStyle = magmaGrad;
              ctx.fill();

              // ── River & sedimentary layers (center) ──
              // River
              ctx.beginPath();
              ctx.moveTo(W * 0.38, H * 0.48);
              ctx.quadraticCurveTo(W * 0.45, H * 0.46 + Math.sin(tick * 0.02) * 3 * dpr, W * 0.55, H * 0.49);
              ctx.quadraticCurveTo(W * 0.62, H * 0.5, W * 0.7, H * 0.48);
              ctx.lineTo(W * 0.7, H * 0.52);
              ctx.quadraticCurveTo(W * 0.62, H * 0.54, W * 0.55, H * 0.53);
              ctx.quadraticCurveTo(W * 0.45, H * 0.5, W * 0.38, H * 0.52);
              ctx.closePath();
              ctx.fillStyle = '#38bdf8';
              ctx.fill();

              // Sedimentary layers underground
              const layerColors = ['#d97706', '#fbbf24', '#92400e', '#b45309', '#78716c'];
              for (let i = 0; i < 5; i++) {
                const ly = H * 0.55 + i * H * 0.08;
                ctx.fillStyle = layerColors[i];
                ctx.fillRect(W * 0.38, ly, W * 0.32, H * 0.07);
                ctx.strokeStyle = 'rgba(0,0,0,0.15)';
                ctx.lineWidth = 0.5 * dpr;
                ctx.strokeRect(W * 0.38, ly, W * 0.32, H * 0.07);
              }

              // Fossil in layer
              ctx.font = (14 * dpr) + 'px serif';
              ctx.fillStyle = 'rgba(255,255,255,0.5)';
              ctx.fillText('🦴', W * 0.5, H * 0.66);
              ctx.fillText('🐚', W * 0.58, H * 0.74);

              // ── Mountain (right — metamorphic) ──
              ctx.beginPath();
              ctx.moveTo(W * 0.62, H * 0.52);
              ctx.lineTo(W * 0.78, H * 0.06);
              ctx.lineTo(W * 0.82, H * 0.02);
              ctx.lineTo(W * 0.86, H * 0.06);
              ctx.lineTo(W * 0.98, H * 0.52);
              ctx.closePath();
              const mtGrad = ctx.createLinearGradient(W * 0.82, H * 0.02, W * 0.82, H * 0.52);
              mtGrad.addColorStop(0, '#fafafa');
              mtGrad.addColorStop(0.2, '#d1d5db');
              mtGrad.addColorStop(0.5, '#6b7280');
              mtGrad.addColorStop(1, '#374151');
              ctx.fillStyle = mtGrad;
              ctx.fill();

              // Metamorphic layers folded inside mountain underground
              for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                const baseY = H * 0.6 + i * H * 0.08;
                ctx.moveTo(W * 0.65, baseY);
                const fold = Math.sin(i * 0.8 + tick * 0.005) * 8 * dpr;
                ctx.quadraticCurveTo(W * 0.78, baseY - 10 * dpr + fold, W * 0.92, baseY);
                ctx.strokeStyle = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'][i];
                ctx.lineWidth = 3 * dpr;
                ctx.stroke();
              }

              // Pressure arrows
              const arrowAlpha = 0.3 + Math.sin(tick * 0.04) * 0.15;
              ctx.fillStyle = `rgba(139,92,246,${arrowAlpha})`;
              ctx.font = (16 * dpr) + 'px sans-serif';
              ctx.fillText('→', W * 0.63, H * 0.72);
              ctx.fillText('←', W * 0.93, H * 0.72);
              ctx.fillText('↓', W * 0.8, H * 0.56);

              // ── Zone hover highlights ──
              zones.forEach(z => {
                if (hoverZone === z.id) {
                  ctx.strokeStyle = ROCK_TYPES[z.type].color;
                  ctx.lineWidth = 3 * dpr;
                  ctx.setLineDash([6 * dpr, 4 * dpr]);
                  ctx.strokeRect(z.x * W, z.y * H, z.w * W, z.h * H);
                  ctx.setLineDash([]);
                  ctx.fillStyle = 'rgba(255,255,255,0.85)';
                  ctx.font = 'bold ' + (11 * dpr) + 'px sans-serif';
                  ctx.fillText(z.label, z.x * W + 6 * dpr, (z.y + z.h) * H - 6 * dpr);
                }
              });

              // Rock cycle arrows overlay
              ctx.strokeStyle = 'rgba(255,255,255,0.4)';
              ctx.lineWidth = 2 * dpr;
              ctx.setLineDash([4 * dpr, 4 * dpr]);
              // Igneous → (weathering) → Sedimentary
              ctx.beginPath(); ctx.moveTo(W * 0.32, H * 0.45); ctx.quadraticCurveTo(W * 0.4, H * 0.38, W * 0.48, H * 0.45); ctx.stroke();
              ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = (8 * dpr) + 'px sans-serif';
              ctx.fillText('Weathering', W * 0.36, H * 0.38);
              // Sedimentary → (heat/pressure) → Metamorphic
              ctx.beginPath(); ctx.moveTo(W * 0.66, H * 0.7); ctx.quadraticCurveTo(W * 0.72, H * 0.65, W * 0.76, H * 0.62); ctx.stroke();
              ctx.fillText('Heat & Pressure', W * 0.66, H * 0.62);
              // Metamorphic → (melting) → Igneous (magma)
              ctx.beginPath(); ctx.moveTo(W * 0.65, H * 0.85); ctx.quadraticCurveTo(W * 0.45, H * 0.88, W * 0.28, H * 0.78); ctx.stroke();
              ctx.fillText('Melting', W * 0.42, H * 0.9);
              ctx.setLineDash([]);

              // Magnification
              ctx.font = (10 * dpr) + 'px monospace';
              ctx.fillStyle = 'rgba(255,255,255,0.5)';
              ctx.fillText('🪨 Cross-Section View', 8 * dpr, H - 8 * dpr);
            }

            let animId = null;
            function loop() {
              tick++;
              drawLandscape();
              animId = requestAnimationFrame(loop);
            }
            animId = requestAnimationFrame(loop);

            // Mouse hover for zones
            function onRockMove(e) {
              const rect = canvasEl.getBoundingClientRect();
              const mx = (e.clientX - rect.left) / rect.width;
              const my = (e.clientY - rect.top) / rect.height;
              hoverZone = null;
              zones.forEach(z => {
                if (mx >= z.x && mx <= z.x + z.w && my >= z.y && my <= z.y + z.h) hoverZone = z.id;
              });
              canvasEl.style.cursor = hoverZone ? 'pointer' : 'default';
            }

            function onRockClick(e) {
              const rect = canvasEl.getBoundingClientRect();
              const mx = (e.clientX - rect.left) / rect.width;
              const my = (e.clientY - rect.top) / rect.height;
              zones.forEach(z => {
                if (mx >= z.x && mx <= z.x + z.w && my >= z.y && my <= z.y + z.h) {
                  const typeRocks = ROCKS.filter(r => r.type === z.type);
                  if (typeRocks.length > 0) {
                    canvasEl._onSelectRock && canvasEl._onSelectRock(typeRocks[0].id, z.type);
                  }
                }
              });
            }
            canvasEl.addEventListener('mousemove', onRockMove);
            canvasEl.addEventListener('click', onRockClick);

            const ro = new ResizeObserver(function () {
              canvasEl.width = canvasEl.offsetWidth * dpr;
              canvasEl.height = canvasEl.offsetHeight * dpr;
            });
            ro.observe(canvasEl);
            canvasEl._rocksRO = ro;
            canvasEl._rocksCleanup = function () {
              if (animId) cancelAnimationFrame(animId);
              canvasEl.removeEventListener('mousemove', onRockMove);
              canvasEl.removeEventListener('click', onRockClick);
              ro.disconnect();
            };
          };

          // ── Rock texture canvas ref ──
          const textureRef = function (canvasEl) {
            if (!canvasEl || !selRock || canvasEl._lastRock === selRock.id) return;
            canvasEl._lastRock = selRock.id;
            const W = canvasEl.width = 200 * (window.devicePixelRatio || 1);
            const H = canvasEl.height = 200 * (window.devicePixelRatio || 1);
            const ctx = canvasEl.getContext('2d');
            const dpr = window.devicePixelRatio || 1;

            // Draw rock texture based on type
            ctx.fillStyle = selRock.grainColors[0];
            ctx.fillRect(0, 0, W, H);

            if (selRock.texture === 'coarse-grained' || selRock.texture === 'clastic-coarse') {
              // Large interlocking crystals/grains
              for (let i = 0; i < 60; i++) {
                ctx.beginPath();
                const x = Math.random() * W, y = Math.random() * H;
                const sz = (8 + Math.random() * 16) * dpr;
                ctx.moveTo(x, y - sz);
                for (let a = 0; a < 6; a++) {
                  const angle = (a / 6) * Math.PI * 2 - Math.PI / 2;
                  ctx.lineTo(x + Math.cos(angle) * sz * (0.7 + Math.random() * 0.3), y + Math.sin(angle) * sz * (0.7 + Math.random() * 0.3));
                }
                ctx.closePath();
                ctx.fillStyle = selRock.grainColors[i % selRock.grainColors.length];
                ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.lineWidth = 0.5 * dpr;
                ctx.stroke();
              }
            } else if (selRock.texture === 'fine-grained' || selRock.texture === 'clastic') {
              // Small speckled grains
              for (let i = 0; i < 400; i++) {
                ctx.beginPath();
                ctx.arc(Math.random() * W, Math.random() * H, (1 + Math.random() * 3) * dpr, 0, Math.PI * 2);
                ctx.fillStyle = selRock.grainColors[i % selRock.grainColors.length];
                ctx.fill();
              }
            } else if (selRock.texture === 'glassy') {
              // Smooth dark with conchoidal fracture lines
              const grad = ctx.createRadialGradient(W * 0.4, H * 0.4, 0, W * 0.5, H * 0.5, W * 0.6);
              grad.addColorStop(0, '#1a1a2e');
              grad.addColorStop(1, '#0a0a0a');
              ctx.fillStyle = grad;
              ctx.fillRect(0, 0, W, H);
              for (let i = 0; i < 8; i++) {
                ctx.beginPath();
                ctx.arc(W * 0.3 + i * 8 * dpr, H * 0.5 + Math.sin(i) * 20 * dpr, (15 + i * 5) * dpr, -0.5, 0.5);
                ctx.strokeStyle = 'rgba(100,130,180,0.15)';
                ctx.lineWidth = 1 * dpr;
                ctx.stroke();
              }
            } else if (selRock.texture === 'vesicular') {
              // Light with holes/vesicles
              ctx.fillStyle = '#d6d3d1';
              ctx.fillRect(0, 0, W, H);
              for (let i = 0; i < 50; i++) {
                ctx.beginPath();
                ctx.ellipse(Math.random() * W, Math.random() * H, (3 + Math.random() * 8) * dpr, (2 + Math.random() * 5) * dpr, Math.random() * Math.PI, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(120,113,108,0.3)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.15)';
                ctx.lineWidth = 0.5 * dpr;
                ctx.stroke();
              }
            } else if (selRock.texture === 'fine-layered' || selRock.texture === 'foliated') {
              // Thin parallel layers
              for (let y = 0; y < H; y += 4 * dpr) {
                ctx.fillStyle = selRock.grainColors[Math.floor(y / (4 * dpr)) % selRock.grainColors.length];
                ctx.fillRect(0, y, W, 3 * dpr);
                ctx.fillStyle = 'rgba(0,0,0,0.08)';
                ctx.fillRect(0, y + 3 * dpr, W, 1 * dpr);
              }
            } else if (selRock.texture === 'bioclastic') {
              // Light with shell fragments
              ctx.fillStyle = '#e5e7eb';
              ctx.fillRect(0, 0, W, H);
              for (let i = 0; i < 200; i++) {
                ctx.beginPath();
                ctx.arc(Math.random() * W, Math.random() * H, (0.5 + Math.random() * 2) * dpr, 0, Math.PI * 2);
                ctx.fillStyle = selRock.grainColors[i % selRock.grainColors.length];
                ctx.fill();
              }
              // Shell imprints
              for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.arc(30 * dpr + Math.random() * (W - 60 * dpr), 30 * dpr + Math.random() * (H - 60 * dpr), (6 + Math.random() * 4) * dpr, 0, Math.PI);
                ctx.strokeStyle = 'rgba(161,161,170,0.4)';
                ctx.lineWidth = 1 * dpr;
                ctx.stroke();
              }
            } else if (selRock.texture === 'crystalline' || selRock.texture === 'non-foliated') {
              // Interlocking crystals
              for (let i = 0; i < 80; i++) {
                ctx.beginPath();
                const x = Math.random() * W, y = Math.random() * H;
                const sz = (4 + Math.random() * 10) * dpr;
                ctx.rect(x - sz / 2, y - sz / 2, sz, sz);
                ctx.fillStyle = selRock.grainColors[i % selRock.grainColors.length];
                ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                ctx.lineWidth = 0.5 * dpr;
                ctx.stroke();
              }
            } else if (selRock.texture === 'banded') {
              // Alternating light/dark bands (wavy)
              for (let y = 0; y < H; y += 8 * dpr) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                for (let x = 0; x <= W; x += 5) {
                  ctx.lineTo(x, y + Math.sin(x * 0.02 + y * 0.01) * 4 * dpr);
                }
                ctx.lineTo(W, y + 8 * dpr);
                for (let x = W; x >= 0; x -= 5) {
                  ctx.lineTo(x, y + 8 * dpr + Math.sin(x * 0.02 + y * 0.01) * 4 * dpr);
                }
                ctx.closePath();
                ctx.fillStyle = Math.floor(y / (8 * dpr)) % 2 === 0 ? '#1e1e1e' : '#d4d4d8';
                ctx.fill();
              }
            }

            // Border
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 2 * dpr;
            ctx.strokeRect(0, 0, W, H);
          };

          // Cleanup ref
          const cleanupRef = function (el) {
            if (!el) {
              const old = document.querySelector('[data-rocks-canvas]');
              if (old && old._rocksCleanup) { old._rocksCleanup(); if (old._rocksRO) old._rocksRO.disconnect(); }
            }
          };

          return React.createElement("div", { ref: cleanupRef, className: "max-w-4xl mx-auto animate-in fade-in duration-200" },
            // Header
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: function () { setStemLabTool(null); }, className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83E\uDEA8 Rocks & Minerals Explorer"),
              React.createElement("div", { className: "flex gap-1 ml-auto" },
                ['landscape', 'rocks', 'minerals', 'quiz'].map(function (m) {
                  return React.createElement("button", {
                    key: m, onClick: function () {
                      upd("mode", m);
                      if (m === 'quiz') { upd("quizMode", true); upd("quizIdx", 0); upd("quizScore", 0); upd("quizFeedback", null); }
                      else { upd("quizMode", false); }
                    }, className: "px-3 py-1 rounded-lg text-xs font-bold capitalize " + (mode === m ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                  },
                    m === 'landscape' ? '🗺️ Landscape' : m === 'rocks' ? '🪨 Rocks' : m === 'minerals' ? '💎 Minerals' : '🧠 Quiz');
                })
              )
            ),

            // ── Landscape mode ──
            mode === 'landscape' && React.createElement("div", null,
              React.createElement("p", { className: "text-xs text-slate-500 mb-2 italic" }, "Click landscape zones to explore rock types. Hover to see labels."),
              React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-amber-200", style: { height: '520px' } },
                React.createElement("canvas", {
                  "data-rocks-canvas": "true",
                  ref: function (el) {
                    landscapeRef(el);
                    if (el) {
                      el._onSelectRock = function (rockId, type) {
                        upd("selectedRock", rockId);
                        upd("selectedType", type);
                        upd("mode", "rocks");
                      };
                    }
                  },
                  style: { width: '100%', height: '100%' }
                })
              ),
              // Rock cycle legend
              React.createElement("div", { className: "flex justify-center gap-3 mt-3" },
                Object.values(ROCK_TYPES).map(function (rt) {
                  return React.createElement("div", { key: rt.label, className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border text-xs font-bold", style: { borderColor: rt.color, color: rt.color } },
                    rt.icon, " ", rt.label);
                })
              ),
              React.createElement("div", { className: "mt-2 bg-amber-50 rounded-xl border border-amber-200 p-3 text-xs text-slate-600" },
                React.createElement("p", { className: "font-bold text-amber-800 mb-1" }, "🔄 The Rock Cycle"),
                React.createElement("p", null, "Rocks continuously transform: Igneous rocks weather into sediment → Sediment compacts into Sedimentary rocks → Heat & pressure create Metamorphic rocks → Melting creates magma → Cooling forms new Igneous rocks. The cycle never stops!")
              )
            ),

            // ── Rocks mode ──
            mode === 'rocks' && React.createElement("div", null,
              // Type filter
              React.createElement("div", { className: "flex gap-2 mb-3" },
                ['all', 'igneous', 'sedimentary', 'metamorphic'].map(function (t) {
                  return React.createElement("button", {
                    key: t, onClick: function () { upd("selectedType", t === 'all' ? null : t); },
                    className: "px-3 py-1 rounded-full text-xs font-bold transition-all " +
                      ((d.selectedType || null) === (t === 'all' ? null : t) ? 'text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'),
                    style: (d.selectedType || null) === (t === 'all' ? null : t) ? { background: t === 'all' ? '#78716c' : ROCK_TYPES[t]?.color || '#78716c' } : {}
                  }, t === 'all' ? '📋 All' : (ROCK_TYPES[t]?.icon || '') + ' ' + ROCK_TYPES[t]?.label);
                })
              ),
              // Rock grid
              React.createElement("div", { className: "grid grid-cols-4 gap-2 mb-3" },
                ROCKS.filter(function (r) { return !d.selectedType || r.type === d.selectedType; }).map(function (rock) {
                  const rt = ROCK_TYPES[rock.type];
                  return React.createElement("button", {
                    key: rock.id, onClick: function () { upd("selectedRock", d.selectedRock === rock.id ? null : rock.id); upd("selectedMineral", null); },
                    className: "p-2 rounded-lg text-[11px] font-bold border-2 transition-all hover:scale-105 text-center " +
                      (d.selectedRock === rock.id ? 'bg-white shadow-lg' : 'bg-slate-50 border-slate-200'),
                    style: d.selectedRock === rock.id ? { borderColor: rt.color, color: rt.color } : {}
                  },
                    React.createElement("div", { className: "text-lg mb-0.5" }, rt.icon),
                    rock.label);
                })
              ),
              // Selected rock detail card
              selRock && React.createElement("div", { className: "bg-white rounded-xl border-2 p-4 animate-in fade-in", style: { borderColor: ROCK_TYPES[selRock.type].color } },
                React.createElement("div", { className: "flex gap-4" },
                  // Texture canvas
                  React.createElement("canvas", { ref: textureRef, style: { width: '100px', height: '100px', borderRadius: '12px', border: '2px solid #e5e7eb' } }),
                  React.createElement("div", { className: "flex-1" },
                    React.createElement("h4", { className: "font-bold text-base mb-1", style: { color: ROCK_TYPES[selRock.type].color } }, ROCK_TYPES[selRock.type].icon + " " + selRock.label),
                    React.createElement("span", { className: "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mb-2", style: { background: ROCK_TYPES[selRock.type].color + '20', color: ROCK_TYPES[selRock.type].color } }, ROCK_TYPES[selRock.type].label + " Rock"),
                    React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, selRock.desc)
                  )
                ),
                // Properties
                React.createElement("div", { className: "grid grid-cols-3 gap-2 mt-3" },
                  [
                    { label: 'Hardness (Mohs)', value: selRock.hardness + '/10', icon: '💪' },
                    { label: 'Texture', value: selRock.texture, icon: '🔍' },
                    { label: 'Uses', value: selRock.uses, icon: '🏗️' }
                  ].map(function (prop) {
                    return React.createElement("div", { key: prop.label, className: "bg-slate-50 rounded-lg p-2 text-center" },
                      React.createElement("p", { className: "text-[10px] text-slate-400 font-bold" }, prop.icon + " " + prop.label),
                      React.createElement("p", { className: "text-xs font-bold text-slate-700 mt-0.5" }, prop.value));
                  })
                ),
                // Mohs scale bar
                React.createElement("div", { className: "mt-3" },
                  React.createElement("p", { className: "text-[10px] font-bold text-slate-400 mb-1" }, "Mohs Hardness Scale"),
                  React.createElement("div", { className: "flex gap-0.5 items-end" },
                    Array.from({ length: 10 }, function (_, i) {
                      const active = i + 1 <= Math.round(selRock.hardness);
                      return React.createElement("div", {
                        key: i, className: "flex-1 rounded-sm transition-all", style: {
                          height: (8 + i * 3) + 'px',
                          background: active ? ROCK_TYPES[selRock.type].color : '#e5e7eb'
                        }
                      });
                    })
                  ),
                  React.createElement("div", { className: "flex justify-between text-[8px] text-slate-400 mt-0.5" },
                    React.createElement("span", null, "1 (Talc)"),
                    React.createElement("span", null, "10 (Diamond)"))
                )
              )
            ),

            // ── Minerals mode ──
            mode === 'minerals' && React.createElement("div", null,
              React.createElement("p", { className: "text-xs text-slate-500 mb-3 italic" }, "Minerals are the building blocks of rocks. Explore their properties below."),
              React.createElement("div", { className: "grid grid-cols-4 gap-2 mb-3" },
                MINERALS.map(function (min) {
                  return React.createElement("button", {
                    key: min.id, onClick: function () { upd("selectedMineral", d.selectedMineral === min.id ? null : min.id); upd("selectedRock", null); },
                    className: "p-2 rounded-lg text-[11px] font-bold border-2 transition-all hover:scale-105 text-center " +
                      (d.selectedMineral === min.id ? 'shadow-lg' : 'border-slate-200 bg-slate-50'),
                    style: d.selectedMineral === min.id ? { borderColor: '#8b5cf6', background: min.color, color: '#1e1b4b' } : {}
                  },
                    React.createElement("div", { className: "text-lg mb-0.5" }, "💎"),
                    min.label);
                })
              ),
              // Selected mineral detail
              selMineral && React.createElement("div", { className: "bg-white rounded-xl border-2 border-violet-300 p-4 animate-in fade-in space-y-3" },
                React.createElement("h4", { className: "font-bold text-base text-violet-700 mb-1" }, "\uD83D\uDC8E " + selMineral.label),
                React.createElement("p", { className: "text-xs text-slate-500 font-mono mb-1" }, "Formula: " + selMineral.formula),
                selMineral.desc && React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, selMineral.desc),
                React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                  [
                    { label: 'Hardness', value: selMineral.hardness + ' / 10', icon: '\uD83D\uDCAA' },
                    { label: 'Streak', value: selMineral.streak, icon: '\u270F\uFE0F' },
                    { label: 'Luster', value: selMineral.luster, icon: '\u2728' },
                    { label: 'Crystal System', value: selMineral.crystal, icon: '\uD83D\uDD37' }
                  ].map(function (prop) {
                    return React.createElement("div", { key: prop.label, className: "rounded-lg p-2.5 text-center", style: { background: selMineral.color } },
                      React.createElement("p", { className: "text-[10px] text-slate-400 font-bold" }, prop.icon + " " + prop.label),
                      React.createElement("p", { className: "text-sm font-bold text-slate-800 mt-0.5" }, prop.value));
                  })
                ),
                selMineral.uses && React.createElement("div", { className: "bg-blue-50 rounded-lg p-2.5" },
                  React.createElement("p", { className: "text-[10px] font-bold text-blue-500 uppercase mb-0.5" }, "\uD83C\uDFD7\uFE0F Uses"),
                  React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed" }, selMineral.uses)
                ),
                selMineral.funFact && React.createElement("div", { className: "bg-amber-50 rounded-lg p-2.5 border border-amber-200" },
                  React.createElement("p", { className: "text-[10px] font-bold text-amber-600 uppercase mb-0.5" }, "\uD83D\uDCA1 Fun Fact"),
                  React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed italic" }, selMineral.funFact)
                ),
                selMineral.occurrence && React.createElement("div", { className: "bg-emerald-50 rounded-lg p-2.5" },
                  React.createElement("p", { className: "text-[10px] font-bold text-emerald-600 uppercase mb-0.5" }, "\uD83C\uDF0D Where Found"),
                  React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed" }, selMineral.occurrence)
                ),
                // Mohs bar
                React.createElement("div", { className: "mt-1" },
                  React.createElement("p", { className: "text-[10px] font-bold text-slate-400 mb-1" }, "Mohs Position"),
                  React.createElement("div", { className: "flex gap-0.5 items-end" },
                    Array.from({ length: 10 }, function (_, i) {
                      const active = i + 1 <= Math.round(selMineral.hardness);
                      return React.createElement("div", {
                        key: i, className: "flex-1 rounded-sm transition-all", style: {
                          height: (8 + i * 3) + 'px',
                          background: active ? '#8b5cf6' : '#e5e7eb'
                        }
                      });
                    })
                  ),
                  React.createElement("div", { className: "flex justify-between text-[8px] text-slate-400 mt-0.5" },
                    React.createElement("span", null, "1 (Talc)"),
                    React.createElement("span", null, "10 (Diamond)"))
                )
              )
            ),

            // ── Quiz mode ──
            d.quizMode && quizQ && React.createElement("div", { className: "mt-3 bg-amber-50 rounded-xl border-2 border-amber-200 p-4 animate-in fade-in" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("p", { className: "text-xs font-bold text-amber-700" }, "\uD83E\uDDE0 Question " + ((d.quizIdx || 0) + 1) + "/" + QUIZ_BANK.length),
                React.createElement("span", { className: "font-bold text-green-600 text-xs" }, "\u2714 " + (d.quizScore || 0))
              ),
              React.createElement("p", { className: "text-sm font-bold text-slate-800 mb-3" }, quizQ.q),
              React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                quizQ.options.map(function (opt) {
                  return React.createElement("button", {
                    key: opt, onClick: function () {
                      const correct = opt === quizQ.a;
                      upd("quizFeedback", { correct: correct, msg: correct ? "\u2705 Correct! +10 XP" : "\u274C Not quite. The answer is: " + quizQ.a });
                      if (correct) upd("quizScore", (d.quizScore || 0) + 1);
                    }, className: "px-3 py-2 text-xs font-bold rounded-lg border-2 transition-all hover:scale-[1.02] " +
                      (d.quizFeedback ? (opt === quizQ.a ? "border-green-400 bg-green-50 text-green-700" : "border-slate-200 bg-white text-slate-600") : "border-amber-200 bg-white text-slate-700 hover:border-amber-400")
                  }, opt);
                })
              ),
              d.quizFeedback && React.createElement("div", { className: "mt-2 p-2 rounded-lg text-center text-sm font-bold " + (d.quizFeedback.correct ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200") },
                d.quizFeedback.msg,
                React.createElement("button", {
                  onClick: function () {
                    const nextIdx = ((d.quizIdx || 0) + 1) % QUIZ_BANK.length;
                    upd("quizIdx", nextIdx); upd("quizFeedback", null);
                  }, className: "ml-3 px-2 py-0.5 bg-amber-600 text-white rounded text-xs"
                }, "Next \u2192")
              )
            ),

            // Bottom controls
            React.createElement("div", { className: "flex gap-3 mt-3 items-center" },
              React.createElement("button", {
                onClick: function () {
                  setToolSnapshots(function (prev) { return prev.concat([{ id: 'rk-' + Date.now(), tool: 'rocks', label: 'Rocks' + (selRock ? ': ' + selRock.label : selMineral ? ': ' + selMineral.label : ''), data: Object.assign({}, d), timestamp: Date.now() }]); });
                  addToast('\uD83D\uDCF8 Rocks snapshot saved!', 'success');
                }, className: "ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-full hover:from-amber-600 hover:to-orange-600 shadow-md hover:shadow-lg transition-all"
              }, "\uD83D\uDCF8 Snapshot")
            )
          )
        })(),

        // ═══════════════════════════════════════════════════════
        // WATER CYCLE — Canvas2D Animated Particle System
        // ═══════════════════════════════════════════════════════
        stemLabTab === 'explore' && stemLabTool === 'waterCycle' && (() => {
          const d = labToolData.waterCycle;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, waterCycle: { ...prev.waterCycle, [key]: val } }));

          const STAGES = [
            { id: 'evaporation', label: 'Evaporation', emoji: '\u2600', color: '#f59e0b', desc: 'Heat from the sun causes water to change from liquid to gas (water vapor). Oceans, lakes, and rivers provide most of the evaporated water.' },
            { id: 'condensation', label: 'Condensation', emoji: '\u2601', color: '#64748b', desc: 'Water vapor cools as it rises, forming tiny droplets around particles of dust, creating clouds.' },
            { id: 'precipitation', label: 'Precipitation', emoji: '\uD83C\uDF27', color: '#3b82f6', desc: 'When cloud droplets combine and grow heavy enough, they fall as rain, snow, sleet, or hail.' },
            { id: 'collection', label: 'Collection', emoji: '\uD83C\uDF0A', color: '#0ea5e9', desc: 'Water gathers in oceans, rivers, lakes, and underground aquifers. The cycle begins again.' },
            { id: 'transpiration', label: 'Transpiration', emoji: '\uD83C\uDF3F', color: '#22c55e', desc: 'Plants absorb water through roots and release vapor from leaves, contributing to atmospheric moisture.' },
            { id: 'infiltration', label: 'Infiltration', emoji: '\uD83E\uDEB4', color: '#92400e', desc: 'Water soaks into soil and rock, replenishing groundwater supplies that feed wells and springs.' },
          ];
          const sel = STAGES.find(s => s.id === (d.activeStage || 'evaporation'));

          // Canvas animation
          var _lastWcCanvas = null;
          const canvasRef = function (canvasEl) {
            if (!canvasEl) {
              if (_lastWcCanvas && _lastWcCanvas._wcCleanup) { _lastWcCanvas._wcCleanup(); _lastWcCanvas._wcInit = false; }
              _lastWcCanvas = null;
              return;
            }
            _lastWcCanvas = canvasEl;
            if (canvasEl._wcInit) return;
            canvasEl._wcInit = true;
            var cW = canvasEl.width = canvasEl.offsetWidth * 2;
            var cH = canvasEl.height = canvasEl.offsetHeight * 2;
            var ctx = canvasEl.getContext('2d');
            var dpr = 2;
            var tick = 0;
            var particles = [];
            for (var i = 0; i < 80; i++) {
              particles.push({
                x: Math.random() * cW / dpr,
                y: Math.random() * cH / dpr,
                size: 1.5 + Math.random() * 2,
                speed: 0.3 + Math.random() * 0.7,
                phase: Math.random() * Math.PI * 2,
                type: ['evap', 'rain', 'cloud'][Math.floor(Math.random() * 3)]
              });
            }
            function draw() {
              tick++;
              ctx.clearRect(0, 0, cW, cH);
              // Sky gradient with day/night hint
              var dayPhase = (Math.sin(tick * 0.003) + 1) / 2;
              var g = ctx.createLinearGradient(0, 0, 0, cH);
              g.addColorStop(0, 'hsl(210,' + (60 + dayPhase * 20) + '%,' + (50 + dayPhase * 25) + '%)');
              g.addColorStop(0.4, 'hsl(200,70%,' + (65 + dayPhase * 15) + '%)');
              g.addColorStop(0.65, '#4ade80');
              g.addColorStop(0.7, '#166534');
              g.addColorStop(1, '#1a1a2e');
              ctx.fillStyle = g;
              ctx.fillRect(0, 0, cW, cH);
              // Sun
              var sunY = cH * 0.08 + Math.sin(tick * 0.005) * cH * 0.04;
              ctx.beginPath(); ctx.arc(cW * 0.8, sunY, 16 * dpr, 0, Math.PI * 2);
              ctx.fillStyle = '#fbbf24'; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 20; ctx.fill(); ctx.shadowBlur = 0;
              // Sun rays
              for (var r = 0; r < 8; r++) {
                var ra = r * Math.PI / 4 + tick * 0.01;
                ctx.beginPath();
                ctx.moveTo(cW * 0.8 + Math.cos(ra) * 20 * dpr, sunY + Math.sin(ra) * 20 * dpr);
                ctx.lineTo(cW * 0.8 + Math.cos(ra) * 28 * dpr, sunY + Math.sin(ra) * 28 * dpr);
                ctx.strokeStyle = 'rgba(251,191,36,0.5)'; ctx.lineWidth = 2; ctx.stroke();
              }
              // Clouds
              function drawCloud(cx, cy, sz) {
                ctx.fillStyle = 'rgba(226,232,240,0.8)';
                ctx.beginPath(); ctx.arc(cx, cy, sz, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(cx - sz * 0.7, cy + sz * 0.2, sz * 0.7, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(cx + sz * 0.7, cy + sz * 0.2, sz * 0.8, 0, Math.PI * 2); ctx.fill();
              }
              drawCloud(cW * 0.25 + Math.sin(tick * 0.004) * 10, cH * 0.15, 14 * dpr);
              drawCloud(cW * 0.55 + Math.cos(tick * 0.003) * 8, cH * 0.12, 18 * dpr);
              drawCloud(cW * 0.4 + Math.sin(tick * 0.005) * 12, cH * 0.2, 12 * dpr);
              // Water body
              ctx.fillStyle = 'rgba(14,165,233,0.6)';
              ctx.beginPath();
              ctx.moveTo(0, cH * 0.7);
              for (var wx = 0; wx <= cW; wx += 5) {
                ctx.lineTo(wx, cH * 0.7 + Math.sin(wx * 0.02 + tick * 0.05) * 3 * dpr);
              }
              ctx.lineTo(cW, cH * 0.65); ctx.lineTo(0, cH * 0.65); ctx.closePath(); ctx.fill();
              // Mountains
              ctx.fillStyle = '#374151';
              ctx.beginPath(); ctx.moveTo(cW * 0.6, cH * 0.65); ctx.lineTo(cW * 0.7, cH * 0.35); ctx.lineTo(cW * 0.8, cH * 0.65); ctx.fill();
              ctx.fillStyle = '#e2e8f0';
              ctx.beginPath(); ctx.moveTo(cW * 0.68, cH * 0.37); ctx.lineTo(cW * 0.7, cH * 0.35); ctx.lineTo(cW * 0.72, cH * 0.37); ctx.lineTo(cW * 0.705, cH * 0.39); ctx.lineTo(cW * 0.695, cH * 0.38); ctx.fill();
              // Particles
              particles.forEach(function (p) {
                p.phase += 0.02;
                if (p.type === 'evap') {
                  p.y -= p.speed * 0.5;
                  p.x += Math.sin(p.phase) * 0.3;
                  if (p.y < cH * 0.1 / dpr) { p.y = cH * 0.65 / dpr; p.x = Math.random() * cW * 0.5 / dpr; }
                  ctx.beginPath(); ctx.arc(p.x * dpr, p.y * dpr, p.size * dpr, 0, Math.PI * 2);
                  ctx.fillStyle = 'rgba(251,191,36,' + (0.3 + Math.sin(p.phase) * 0.2) + ')'; ctx.fill();
                } else if (p.type === 'rain') {
                  p.y += p.speed * 1.5;
                  p.x += (Math.random() - 0.5) * 0.2;
                  if (p.y > cH * 0.7 / dpr) { p.y = cH * 0.15 / dpr; p.x = cW * 0.15 / dpr + Math.random() * cW * 0.4 / dpr; }
                  ctx.strokeStyle = 'rgba(59,130,246,' + (0.4 + Math.sin(p.phase) * 0.2) + ')';
                  ctx.lineWidth = 1.5 * dpr;
                  ctx.beginPath(); ctx.moveTo(p.x * dpr, p.y * dpr); ctx.lineTo(p.x * dpr, (p.y + 4) * dpr); ctx.stroke();
                } else {
                  p.x += Math.sin(p.phase) * 0.2;
                  p.y += Math.cos(p.phase * 0.5) * 0.1;
                  if (p.x > cW / dpr) p.x = 0;
                  ctx.beginPath(); ctx.arc(p.x * dpr, Math.min(p.y, cH * 0.25 / dpr) * dpr, p.size * 0.8 * dpr, 0, Math.PI * 2);
                  ctx.fillStyle = 'rgba(226,232,240,' + (0.2 + Math.sin(p.phase) * 0.15) + ')'; ctx.fill();
                }
              });
              // Labels on diagram
              ctx.font = 'bold ' + (7 * dpr) + 'px sans-serif';
              ctx.fillStyle = '#fbbf24'; ctx.fillText('\u2191 Evaporation', 10 * dpr, cH * 0.55);
              ctx.fillStyle = '#64748b'; ctx.fillText('\u2601 Condensation', cW * 0.3, cH * 0.08);
              ctx.fillStyle = '#3b82f6'; ctx.fillText('\u2193 Precipitation', cW * 0.12, cH * 0.3);
              ctx.fillStyle = '#22c55e'; ctx.fillText('\uD83C\uDF3F Transpiration', cW * 0.55, cH * 0.55);
              canvasEl._wcAnim = requestAnimationFrame(draw);
            }
            canvasEl._wcAnim = requestAnimationFrame(draw);
            canvasEl._wcCleanup = function () {
              if (canvasEl._wcAnim) cancelAnimationFrame(canvasEl._wcAnim);
            };
          };

          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83C\uDF0A Water Cycle"),
              React.createElement("span", { className: "px-2 py-0.5 bg-sky-100 text-sky-700 text-[10px] font-bold rounded-full" }, "ANIMATED")
            ),
            React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-sky-300 shadow-lg mb-3", style: { height: "420px" } },
              React.createElement("canvas", { ref: canvasRef, style: { width: "100%", height: "100%", display: "block" } })
            ),
            React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-3" },
              STAGES.map(function (stage) {
                return React.createElement("button", {
                  key: stage.id, onClick: function () { upd('activeStage', stage.id); },
                  className: "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all " + ((d.activeStage || 'evaporation') === stage.id ? 'text-white shadow-md' : 'border hover:opacity-80'),
                  style: { backgroundColor: (d.activeStage || 'evaporation') === stage.id ? stage.color : stage.color + '15', borderColor: stage.color, color: (d.activeStage || 'evaporation') === stage.id ? 'white' : stage.color }
                }, stage.emoji + " " + stage.label);
              })
            ),
            sel && React.createElement("div", { className: "bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl p-4 border border-sky-200 mb-3" },
              React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                React.createElement("span", { className: "text-2xl" }, sel.emoji),
                React.createElement("h4", { className: "text-base font-bold", style: { color: sel.color } }, sel.label)
              ),
              React.createElement("p", { className: "text-sm text-slate-600 leading-relaxed" }, sel.desc)
            ),
            React.createElement("div", { className: "flex items-center gap-2 mb-2" },
              React.createElement("button", {
                onClick: function () {
                  var WC_QS = [
                    { q: 'What drives evaporation?', a: 'Solar energy', opts: ['Wind', 'Solar energy', 'Gravity', 'Moon'] },
                    { q: 'What forms clouds?', a: 'Condensation', opts: ['Evaporation', 'Precipitation', 'Condensation', 'Infiltration'] },
                    { q: 'Where does most evaporation occur?', a: 'Oceans', opts: ['Lakes', 'Rivers', 'Oceans', 'Soil'] },
                    { q: 'What is transpiration?', a: 'Water release from plants', opts: ['Rain falling', 'Water release from plants', 'Snow melting', 'Rivers flowing'] },
                    { q: 'What percentage of Earth is covered by water?', a: '71%', opts: ['50%', '60%', '71%', '85%'] },
                  ];
                  var q = WC_QS[Math.floor(Math.random() * WC_QS.length)];
                  upd('wcQuiz', { q: q.q, a: q.a, opts: q.opts, answered: false, score: (d.wcQuiz && d.wcQuiz.score) || 0 });
                }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.wcQuiz ? 'bg-sky-100 text-sky-700' : 'bg-sky-600 text-white') + " transition-all"
              }, d.wcQuiz ? "\uD83D\uDD04 Next Question" : "\uD83E\uDDE0 Quiz Mode"),
              d.wcQuiz && d.wcQuiz.score > 0 && React.createElement("span", { className: "ml-2 text-xs font-bold text-emerald-600" }, "\u2B50 " + d.wcQuiz.score + " correct"),
              d.wcQuiz && React.createElement("div", { className: "mt-2 bg-sky-50 rounded-lg p-3 border border-sky-200" },
                React.createElement("p", { className: "text-sm font-bold text-sky-800 mb-2" }, d.wcQuiz.q),
                React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                  d.wcQuiz.opts.map(function (opt) {
                    var isCorrect = opt === d.wcQuiz.a;
                    var wasChosen = d.wcQuiz.chosen === opt;
                    var cls = !d.wcQuiz.answered ? 'bg-white border-slate-200 hover:border-sky-400' : isCorrect ? 'bg-emerald-100 border-emerald-300' : wasChosen ? 'bg-red-100 border-red-300' : 'bg-slate-50 border-slate-200 opacity-50';
                    return React.createElement("button", {
                      key: opt, disabled: d.wcQuiz.answered, onClick: function () {
                        var correct = opt === d.wcQuiz.a;
                        upd('wcQuiz', Object.assign({}, d.wcQuiz, { answered: true, chosen: opt, score: d.wcQuiz.score + (correct ? 1 : 0) }));
                        addToast(correct ? '\u2705 Correct!' : '\u274C The answer is ' + d.wcQuiz.a, correct ? 'success' : 'error');
                      }, className: "px-3 py-2 rounded-lg text-sm font-bold border-2 transition-all " + cls
                    }, opt);
                  })
                )
              )
            ),
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'wc-' + Date.now(), tool: 'waterCycle', label: sel ? sel.label : 'Water Cycle', data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")
          );
        })(),

        // ═══════════════════════════════════════════════════════
        // ROCK CYCLE
        // ═══════════════════════════════════════════════════════
        stemLabTab === 'explore' && stemLabTool === 'rockCycle' && (() => {
          const d = labToolData.rockCycle;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, rockCycle: { ...prev.rockCycle, [key]: val } }));
          const ROCKS = [
            { id: 'igneous', label: 'Igneous', emoji: '\uD83C\uDF0B', color: '#ef4444', x: 200, y: 40, desc: 'Formed when magma or lava cools and solidifies. Examples: granite, basalt, obsidian.', examples: 'Granite, Basalt, Obsidian, Pumice' },
            { id: 'sedimentary', label: 'Sedimentary', emoji: '\uD83C\uDFD6', color: '#eab308', x: 340, y: 220, desc: 'Formed from layers of sediment (sand, mud, shells) compressed over millions of years. Often contains fossils.', examples: 'Sandstone, Limestone, Shale, Chalk' },
            { id: 'metamorphic', label: 'Metamorphic', emoji: '\uD83D\uDC8E', color: '#8b5cf6', x: 60, y: 220, desc: 'Formed when existing rocks are transformed by extreme heat and pressure deep underground.', examples: 'Marble, Slate, Quartzite, Gneiss' },
          ];
          const PROCESSES = [
            { from: 'igneous', to: 'sedimentary', label: 'Weathering & Erosion', desc: 'Wind, water, and ice break igneous rocks into sediments that settle in layers.' },
            { from: 'sedimentary', to: 'metamorphic', label: 'Heat & Pressure', desc: 'Deep burial subjects sedimentary rock to intense heat and pressure, transforming its structure.' },
            { from: 'metamorphic', to: 'igneous', label: 'Melting & Cooling', desc: 'Extreme heat melts metamorphic rock into magma, which cools to form new igneous rock.' },
            { from: 'igneous', to: 'metamorphic', label: 'Heat & Pressure', desc: 'Igneous rock can be buried and transformed by heat and pressure directly.' },
            { from: 'sedimentary', to: 'igneous', label: 'Melting & Cooling', desc: 'Sedimentary rock can melt and re-solidify as igneous rock.' },
            { from: 'metamorphic', to: 'sedimentary', label: 'Weathering & Erosion', desc: 'Metamorphic rocks can weather into sediments.' },
          ];
          const sel = d.selectedRock ? ROCKS.find(r => r.id === d.selectedRock) : null;
          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83E\uDEA8 Rock Cycle")
            ),
            React.createElement("p", { className: "text-xs text-slate-500 mb-2" }, "Click a rock type or arrow to explore the rock cycle."),
            React.createElement("svg", { viewBox: "0 0 400 280", className: "w-full bg-gradient-to-b from-amber-50 to-stone-100 rounded-xl border border-stone-200", style: { maxHeight: "280px" } },
              PROCESSES.slice(0, 3).map((proc, i) => {
                const f = ROCKS.find(r => r.id === proc.from);
                const t = ROCKS.find(r => r.id === proc.to);
                const mx = (f.x + t.x) / 2, my = (f.y + t.y) / 2;
                return React.createElement("g", { key: i, style: { cursor: 'pointer' }, onClick: () => upd('selectedProcess', proc) },
                  React.createElement("line", { x1: f.x, y1: f.y + 24, x2: t.x, y2: t.y - 24, stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "4 2", markerEnd: "url(#rcArrow)" }),
                  React.createElement("text", { x: mx, y: my, textAnchor: "middle", fill: "#64748b", style: { fontSize: '7px', fontWeight: 'bold' } }, proc.label)
                );
              }),
              React.createElement("defs", null, React.createElement("marker", { id: "rcArrow", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto" }, React.createElement("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#94a3b8" }))),
              ROCKS.map(r => {
                const isSel = d.selectedRock === r.id;
                return React.createElement("g", { key: r.id, style: { cursor: 'pointer' }, onClick: () => upd('selectedRock', r.id) },
                  React.createElement("circle", { cx: r.x, cy: r.y, r: isSel ? 32 : 26, fill: r.color + '20', stroke: r.color, strokeWidth: isSel ? 3 : 1.5 }),
                  React.createElement("text", { x: r.x, y: r.y + 5, textAnchor: "middle", style: { fontSize: '20px' } }, r.emoji),
                  React.createElement("text", { x: r.x, y: r.y + (isSel ? 46 : 40), textAnchor: "middle", fill: r.color, style: { fontSize: '9px', fontWeight: 'bold' } }, r.label)
                );
              })
            ),
            sel && React.createElement("div", { className: "mt-3 p-3 rounded-xl border-2 animate-in slide-in-from-bottom", style: { borderColor: sel.color, backgroundColor: sel.color + '10' } },
              React.createElement("h4", { className: "font-bold text-lg mb-1", style: { color: sel.color } }, sel.emoji + " " + sel.label + " Rocks"),
              React.createElement("p", { className: "text-sm text-slate-600 mb-2" }, sel.desc),
              React.createElement("p", { className: "text-xs text-slate-500" }, "\uD83E\uDEA8 Examples: " + sel.examples)
            ),
            d.selectedProcess && React.createElement("div", { className: "mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-700" },
              React.createElement("strong", null, d.selectedProcess.label + ": "), d.selectedProcess.desc
            )
            ,
            // ── Rock Cycle Quiz ──
            React.createElement("div", { className: "mt-3 border-t border-slate-200 pt-3" },
              React.createElement("button", {
                onClick: function () {
                  var RC_QS = [
                    { q: 'Which rock type forms from cooled magma/lava?', a: 'Igneous', opts: ['Igneous', 'Sedimentary', 'Metamorphic'] },
                    { q: 'Which rock type often contains fossils?', a: 'Sedimentary', opts: ['Igneous', 'Sedimentary', 'Metamorphic'] },
                    { q: 'Which rock type forms under heat and pressure?', a: 'Metamorphic', opts: ['Igneous', 'Sedimentary', 'Metamorphic'] },
                    { q: 'Granite is an example of which rock type?', a: 'Igneous', opts: ['Igneous', 'Sedimentary', 'Metamorphic'] },
                    { q: 'Marble forms from which rock?', a: 'Limestone (sedimentary)', opts: ['Granite (igneous)', 'Limestone (sedimentary)', 'Basalt (igneous)'] },
                    { q: 'What breaks rocks into sediment?', a: 'Weathering & erosion', opts: ['Heat & pressure', 'Weathering & erosion', 'Melting'] },
                    { q: 'What must happen for metamorphic rock to become igneous?', a: 'It must melt, then cool', opts: ['It must be weathered', 'It must be compressed', 'It must melt, then cool'] },
                  ];
                  var q = RC_QS[Math.floor(Math.random() * RC_QS.length)];
                  upd('rcQuiz', { q: q.q, a: q.a, opts: q.opts, answered: false, score: (d.rcQuiz && d.rcQuiz.score) || 0 });
                }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.rcQuiz ? 'bg-orange-100 text-orange-700' : 'bg-orange-600 text-white') + " transition-all"
              }, d.rcQuiz ? "\uD83D\uDD04 Next Question" : "\uD83E\uDDE0 Quiz Mode"),
              d.rcQuiz && d.rcQuiz.score > 0 && React.createElement("span", { className: "ml-2 text-xs font-bold text-emerald-600" }, "\u2B50 " + d.rcQuiz.score + " correct"),
              d.rcQuiz && React.createElement("div", { className: "mt-2 bg-orange-50 rounded-lg p-3 border border-orange-200" },
                React.createElement("p", { className: "text-sm font-bold text-orange-800 mb-2" }, d.rcQuiz.q),
                React.createElement("div", { className: "grid grid-cols-1 gap-2" },
                  d.rcQuiz.opts.map(function (opt) {
                    var isCorrect = opt === d.rcQuiz.a;
                    var wasChosen = d.rcQuiz.chosen === opt;
                    var cls = !d.rcQuiz.answered ? 'bg-white border-slate-200 hover:border-orange-400' : isCorrect ? 'bg-emerald-100 border-emerald-300' : wasChosen ? 'bg-red-100 border-red-300' : 'bg-slate-50 border-slate-200 opacity-50';
                    return React.createElement("button", {
                      key: opt, disabled: d.rcQuiz.answered, onClick: function () {
                        var correct = opt === d.rcQuiz.a;
                        upd('rcQuiz', Object.assign({}, d.rcQuiz, { answered: true, chosen: opt, score: d.rcQuiz.score + (correct ? 1 : 0) }));
                        addToast(correct ? '\u2705 Correct!' : '\u274C The answer is ' + d.rcQuiz.a, correct ? 'success' : 'error');
                      }, className: "px-3 py-2 rounded-lg text-sm font-bold border-2 transition-all " + cls
                    }, opt);
                  })
                )
              )
            ),
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'rc-' + Date.now(), tool: 'rockCycle', label: sel ? sel.label : 'Rock Cycle', data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")
          );
        })(),

        // ═══════════════════════════════════════════════════════
        // ECOSYSTEM SIMULATOR — Canvas2D Animated Population
        // ═══════════════════════════════════════════════════════
        stemLabTab === 'explore' && stemLabTool === 'ecosystem' && (() => {
          const d = labToolData.ecosystem;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, ecosystem: { ...prev.ecosystem, [key]: val } }));
          const simulate = () => {
            let prey = d.prey0, pred = d.pred0;
            const data = [{ step: 0, prey, pred }];
            for (let i = 1; i <= 100; i++) {
              const newPrey = Math.max(1, prey + d.preyBirth * prey - d.preyDeath * prey * pred);
              const newPred = Math.max(1, pred + d.predBirth * prey * pred - d.predDeath * pred);
              prey = Math.min(500, Math.round(newPrey));
              pred = Math.min(500, Math.round(newPred));
              data.push({ step: i, prey, pred });
            }
            upd('data', data);
            upd('steps', 100);
          };
          const W = 440, H = 250, pad = 40;
          const maxVal = d.data.length > 0 ? Math.max(...d.data.map(dp => Math.max(dp.prey, dp.pred)), 10) : 100;

          // Canvas animation ref
          const canvasRef = function (canvasEl) {
            if (!canvasEl || canvasEl._ecoInit) return;
            canvasEl._ecoInit = true;
            var cW = canvasEl.width = canvasEl.offsetWidth * 2;
            var cH = canvasEl.height = canvasEl.offsetHeight * 2;
            var ctx = canvasEl.getContext('2d');
            var dpr = 2;
            var tick = 0;
            var preyList = [];
            var predList = [];
            for (var i = 0; i < 60; i++) preyList.push({ x: Math.random() * cW / dpr, y: cH * 0.35 / dpr + Math.random() * cH * 0.65 / dpr, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2, alive: i < 30 });
            for (var i = 0; i < 20; i++) predList.push({ x: Math.random() * cW / dpr, y: cH * 0.35 / dpr + Math.random() * cH * 0.65 / dpr, vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8, alive: i < 10 });
            function draw() {
              tick++;
              ctx.clearRect(0, 0, cW, cH);
              var dayPhase = (Math.sin(tick * 0.005) + 1) / 2;
              var skyR = Math.round(135 + dayPhase * 80);
              var skyG = Math.round(180 + dayPhase * 60);
              var skyB = Math.round(100 + dayPhase * 50);
              ctx.fillStyle = 'rgb(' + skyR + ',' + skyG + ',' + skyB + ')';
              ctx.fillRect(0, 0, cW, cH * 0.35);
              var groundGrad = ctx.createLinearGradient(0, cH * 0.35, 0, cH);
              groundGrad.addColorStop(0, '#4ade80');
              groundGrad.addColorStop(0.5, '#22c55e');
              groundGrad.addColorStop(1, '#166534');
              ctx.fillStyle = groundGrad;
              ctx.fillRect(0, cH * 0.35, cW, cH * 0.65);
              if (dayPhase > 0.4) {
                ctx.beginPath(); ctx.arc(cW * 0.8, cH * 0.12, 14 * dpr, 0, Math.PI * 2);
                ctx.fillStyle = '#fbbf24'; ctx.fill();
              } else {
                ctx.beginPath(); ctx.arc(cW * 0.7, cH * 0.1, 10 * dpr, 0, Math.PI * 2);
                ctx.fillStyle = '#e2e8f0'; ctx.fill();
              }
              var alivePreyCount = 0, alivePredCount = 0;
              preyList.forEach(function (p) {
                if (!p.alive) return;
                alivePreyCount++;
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0 || p.x > cW / dpr) p.vx *= -1;
                if (p.y < cH * 0.35 / dpr || p.y > cH / dpr) p.vy *= -1;
                p.x = Math.max(0, Math.min(cW / dpr, p.x));
                p.y = Math.max(cH * 0.35 / dpr, Math.min(cH / dpr, p.y));
                p.vx += (Math.random() - 0.5) * 0.1; p.vy += (Math.random() - 0.5) * 0.1;
                p.vx = Math.max(-1.5, Math.min(1.5, p.vx)); p.vy = Math.max(-1.5, Math.min(1.5, p.vy));
                ctx.beginPath(); ctx.arc(p.x * dpr, p.y * dpr, 4 * dpr, 0, Math.PI * 2);
                ctx.fillStyle = '#86efac'; ctx.fill();
                ctx.strokeStyle = '#166534'; ctx.lineWidth = 1 * dpr; ctx.stroke();
              });
              predList.forEach(function (pr) {
                if (!pr.alive) return;
                alivePredCount++;
                var nearest = null, nearDist = Infinity;
                preyList.forEach(function (p) {
                  if (!p.alive) return;
                  var dx = p.x - pr.x, dy = p.y - pr.y;
                  var dist = Math.sqrt(dx * dx + dy * dy);
                  if (dist < nearDist) { nearDist = dist; nearest = p; }
                });
                if (nearest && nearDist < 120) {
                  var dx = nearest.x - pr.x, dy = nearest.y - pr.y;
                  var len = Math.sqrt(dx * dx + dy * dy) || 1;
                  pr.vx += (dx / len) * 0.08; pr.vy += (dy / len) * 0.08;
                }
                if (nearest && nearDist < 5) nearest.alive = false;
                pr.x += pr.vx; pr.y += pr.vy;
                if (pr.x < 0 || pr.x > cW / dpr) pr.vx *= -1;
                if (pr.y < cH * 0.35 / dpr || pr.y > cH / dpr) pr.vy *= -1;
                pr.x = Math.max(0, Math.min(cW / dpr, pr.x));
                pr.y = Math.max(cH * 0.35 / dpr, Math.min(cH / dpr, pr.y));
                pr.vx *= 0.99; pr.vy *= 0.99;
                ctx.beginPath();
                ctx.moveTo(pr.x * dpr, (pr.y - 5) * dpr);
                ctx.lineTo((pr.x - 4) * dpr, (pr.y + 4) * dpr);
                ctx.lineTo((pr.x + 4) * dpr, (pr.y + 4) * dpr);
                ctx.closePath();
                ctx.fillStyle = '#fca5a5'; ctx.fill();
                ctx.strokeStyle = '#991b1b'; ctx.lineWidth = 1 * dpr; ctx.stroke();
              });
              if (tick % 90 === 0) {
                var n = Math.floor(alivePreyCount * 0.15);
                for (var nn = 0; nn < n && nn < 5; nn++) { var dead = preyList.find(function (p) { return !p.alive; }); var par = preyList.find(function (p) { return p.alive; }); if (dead && par) { dead.x = par.x + (Math.random() - 0.5) * 20; dead.y = par.y + (Math.random() - 0.5) * 20; dead.alive = true; } }
                if (alivePredCount > 2 && Math.random() < 0.2) { var dp = predList.find(function (p) { return p.alive; }); if (dp) dp.alive = false; }
                if (alivePreyCount > 20 && Math.random() < 0.3) { var dp2 = predList.find(function (p) { return !p.alive; }); var pp = predList.find(function (p) { return p.alive; }); if (dp2 && pp) { dp2.x = pp.x; dp2.y = pp.y; dp2.alive = true; } }
              }
              ctx.fillStyle = 'rgba(0,0,0,0.5)';
              ctx.fillRect(6 * dpr, 6 * dpr, 120 * dpr, 42 * dpr);
              ctx.fillStyle = '#86efac'; ctx.font = 'bold ' + (8 * dpr) + 'px sans-serif';
              ctx.fillText('\uD83D\uDC07 Prey: ' + alivePreyCount, 12 * dpr, 22 * dpr);
              ctx.fillStyle = '#fca5a5';
              ctx.fillText('\uD83D\uDC3A Pred: ' + alivePredCount, 12 * dpr, 38 * dpr);
              ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = (7 * dpr) + 'px sans-serif';
              ctx.fillText(dayPhase > 0.4 ? '\u2600 Day' : '\uD83C\uDF19 Night', (cW / dpr - 40) * dpr, 18 * dpr);
              canvasEl._ecoAnim = requestAnimationFrame(draw);
            }
            canvasEl._ecoAnim = requestAnimationFrame(draw);
          };
          // Ecosystem cleanup helper
          const ecoCleanupRef = function (el) {
            if (!el && ecoCleanupRef._lastCanvas) {
              if (ecoCleanupRef._lastCanvas._ecoAnim) cancelAnimationFrame(ecoCleanupRef._lastCanvas._ecoAnim);
              ecoCleanupRef._lastCanvas = null;
            }
          };

          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { ref: ecoCleanupRef }),
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83D\uDC3A Ecosystem Simulator"),
              React.createElement("span", { className: "px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full" }, "LIVE")
            ),
            React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-emerald-300 shadow-lg mb-3", style: { height: '220px' } },
              React.createElement("canvas", { ref: canvasRef, style: { width: '100%', height: '100%', display: 'block' } }),
              React.createElement("div", { className: "absolute bottom-2 left-2 right-2 flex items-center gap-1 pointer-events-none" },
                React.createElement("span", { className: "text-[9px] text-white/60 bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-sm" }, "\uD83D\uDC07 Green = prey  \u2022  \uD83D\uDC3A Red = predators")
              )
            ),
            React.createElement("p", { className: "text-xs text-slate-500 mb-2" }, "Model predator-prey dynamics (Lotka-Volterra). Adjust rates and run the graph below."),
            React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-3" },
              [
                { label: '\uD83D\uDC07\uD83D\uDC3A Balanced', prey0: 80, pred0: 30, preyBirth: 0.1, preyDeath: 0.01, predBirth: 0.01, predDeath: 0.1 },
                { label: '\uD83D\uDCA5 Extinction', prey0: 30, pred0: 80, preyBirth: 0.05, preyDeath: 0.02, predBirth: 0.01, predDeath: 0.05 },
                { label: '\uD83D\uDCC8 Boom', prey0: 50, pred0: 10, preyBirth: 0.3, preyDeath: 0.005, predBirth: 0.005, predDeath: 0.15 },
                { label: '\u2696 Equilibrium', prey0: 100, pred0: 50, preyBirth: 0.1, preyDeath: 0.01, predBirth: 0.005, predDeath: 0.1 },
              ].map(function (preset) {
                return React.createElement("button", {
                  key: preset.label, onClick: function () {
                    upd('prey0', preset.prey0); upd('pred0', preset.pred0);
                    upd('preyBirth', preset.preyBirth); upd('preyDeath', preset.preyDeath);
                    upd('predBirth', preset.predBirth); upd('predDeath', preset.predDeath);
                    upd('data', []); upd('steps', 0);
                  }, className: "px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all"
                }, preset.label);
              })
            ),
            React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2 mb-3" },
              [{ k: 'prey0', label: '\uD83D\uDC07 Prey Start', min: 10, max: 200, step: 5 }, { k: 'pred0', label: '\uD83D\uDC3A Predators', min: 5, max: 100, step: 5 }, { k: 'preyBirth', label: 'Prey Birth', min: 0.01, max: 0.5, step: 0.01 }, { k: 'predDeath', label: 'Pred Death', min: 0.01, max: 0.5, step: 0.01 }].map(s =>
                React.createElement("div", { key: s.k, className: "text-center bg-slate-50 rounded-lg p-2 border" },
                  React.createElement("label", { className: "text-[10px] font-bold text-slate-500 block" }, s.label),
                  React.createElement("span", { className: "text-sm font-bold text-slate-700 block" }, d[s.k]),
                  React.createElement("input", { type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k], onChange: e => upd(s.k, parseFloat(e.target.value)), className: "w-full accent-emerald-600" })
                )
              )
            ),
            React.createElement("button", { onClick: simulate, className: "mb-3 px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-teal-600 shadow-md transition-all" }, "\u25B6 Run Graph Simulation"),
            d.data.length > 0 && React.createElement("svg", { viewBox: "0 0 " + W + " " + H, className: "w-full bg-white rounded-xl border border-emerald-200", style: { maxHeight: "270px" } },
              React.createElement("line", { x1: pad, y1: H - pad, x2: W - pad, y2: H - pad, stroke: "#e2e8f0", strokeWidth: 1 }),
              React.createElement("line", { x1: pad, y1: pad, x2: pad, y2: H - pad, stroke: "#e2e8f0", strokeWidth: 1 }),
              React.createElement("polyline", { points: d.data.map((dp, i) => (pad + i / 100 * (W - 2 * pad)) + "," + (H - pad - dp.prey / maxVal * (H - 2 * pad))).join(" "), fill: "none", stroke: "#22c55e", strokeWidth: 2 }),
              React.createElement("polyline", { points: d.data.map((dp, i) => (pad + i / 100 * (W - 2 * pad)) + "," + (H - pad - dp.pred / maxVal * (H - 2 * pad))).join(" "), fill: "none", stroke: "#ef4444", strokeWidth: 2 }),
              React.createElement("text", { x: W - pad + 5, y: pad, fill: "#22c55e", style: { fontSize: '9px', fontWeight: 'bold' } }, "Prey")
            ),
            d.data.length > 0 && React.createElement("div", { className: "mt-3" },
              React.createElement("p", { className: "text-xs font-bold text-slate-500 mb-1" }, "\uD83D\uDD04 Phase Portrait"),
              React.createElement("svg", { viewBox: "0 0 300 300", className: "w-full bg-white rounded-xl border border-emerald-200", style: { maxHeight: "260px" } },
                React.createElement("line", { x1: 30, y1: 270, x2: 270, y2: 270, stroke: "#e2e8f0", strokeWidth: 1 }),
                React.createElement("line", { x1: 30, y1: 30, x2: 30, y2: 270, stroke: "#e2e8f0", strokeWidth: 1 }),
                React.createElement("text", { x: 150, y: 295, textAnchor: "middle", fill: "#22c55e", style: { fontSize: '10px', fontWeight: 'bold' } }, "Prey"),
                React.createElement("text", { x: 10, y: 150, textAnchor: "middle", fill: "#ef4444", style: { fontSize: '10px', fontWeight: 'bold' }, transform: "rotate(-90,10,150)" }, "Predator"),
                React.createElement("polyline", { points: d.data.map(function (dp) { return (30 + dp.prey / maxVal * 240) + "," + (270 - dp.pred / maxVal * 240); }).join(" "), fill: "none", stroke: "#6366f1", strokeWidth: 1.5 }),
                React.createElement("circle", { cx: 30 + d.data[0].prey / maxVal * 240, cy: 270 - d.data[0].pred / maxVal * 240, r: 4, fill: "#22c55e" }),
                React.createElement("circle", { cx: 30 + d.data[d.data.length - 1].prey / maxVal * 240, cy: 270 - d.data[d.data.length - 1].pred / maxVal * 240, r: 4, fill: "#ef4444" })
              ),
              React.createElement("div", { className: "mt-2 grid grid-cols-3 gap-2 text-center" },
                React.createElement("div", { className: "p-1.5 bg-emerald-50 rounded-lg border border-emerald-200" },
                  React.createElement("p", { className: "text-[9px] font-bold text-emerald-600 uppercase" }, "Peak Prey"),
                  React.createElement("p", { className: "text-sm font-bold text-emerald-800" }, Math.max.apply(null, d.data.map(function (dp) { return dp.prey; })))
                ),
                React.createElement("div", { className: "p-1.5 bg-red-50 rounded-lg border border-red-200" },
                  React.createElement("p", { className: "text-[9px] font-bold text-red-600 uppercase" }, "Peak Pred"),
                  React.createElement("p", { className: "text-sm font-bold text-red-800" }, Math.max.apply(null, d.data.map(function (dp) { return dp.pred; })))
                ),
                React.createElement("div", { className: "p-1.5 bg-indigo-50 rounded-lg border border-indigo-200" },
                  React.createElement("p", { className: "text-[9px] font-bold text-indigo-600 uppercase" }, "Cycles"),
                  React.createElement("p", { className: "text-sm font-bold text-indigo-800" }, (function () { var peaks = 0; for (var i = 2; i < d.data.length; i++) { if (d.data[i - 1].prey > d.data[i - 2].prey && d.data[i - 1].prey > d.data[i].prey) peaks++; } return peaks; })())
                )
              ),
              React.createElement("p", { className: "mt-2 text-xs text-slate-400 italic text-center" }, "\uD83D\uDCA1 Closed loops = stable Lotka-Volterra oscillations.")
            ),
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'eco-' + Date.now(), tool: 'ecosystem', label: 'Ecosystem', data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")
          );
        })(),

        // ═══════════════════════════════════════════════════════
        // FRACTION VISUALIZER
        // ═══════════════════════════════════════════════════════
        stemLabTab === 'explore' && stemLabTool === 'fractionViz' && (() => {
          const d = labToolData.fractions;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, fractions: { ...prev.fractions, [key]: val } }));
          const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
          const simplify = (n, d2) => { const g = gcd(Math.abs(n), Math.abs(d2)); return [n / g, d2 / g]; };
          const [sn1, sd1] = simplify(d.num1, d.den1);
          const [sn2, sd2] = simplify(d.num2, d.den2);
          const val1 = d.num1 / d.den1, val2 = d.num2 / d.den2;
          const drawBar = (num, den, color) => {
            const segments = [];
            for (let i = 0; i < den; i++) {
              segments.push(React.createElement("div", { key: i, className: "border-r border-white/50", style: { flex: 1, backgroundColor: i < num ? color : '#e2e8f0', transition: 'background-color 0.3s' } }));
            }
            return React.createElement("div", { className: "flex h-10 rounded-lg overflow-hidden border-2", style: { borderColor: color } }, segments);
          };
          const drawPie = (num, den, color, size) => {
            const slices = [];
            for (let i = 0; i < den; i++) {
              const startAngle = (i / den) * 360 - 90;
              const endAngle = ((i + 1) / den) * 360 - 90;
              const x1 = size / 2 + (size / 2 - 2) * Math.cos(startAngle * Math.PI / 180);
              const y1 = size / 2 + (size / 2 - 2) * Math.sin(startAngle * Math.PI / 180);
              const x2 = size / 2 + (size / 2 - 2) * Math.cos(endAngle * Math.PI / 180);
              const y2 = size / 2 + (size / 2 - 2) * Math.sin(endAngle * Math.PI / 180);
              const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
              slices.push(React.createElement("path", { key: i, d: "M " + size / 2 + " " + size / 2 + " L " + x1 + " " + y1 + " A " + (size / 2 - 2) + " " + (size / 2 - 2) + " 0 " + largeArc + " 1 " + x2 + " " + y2 + " Z", fill: i < num ? color : '#e2e8f0', stroke: 'white', strokeWidth: 1.5 }));
            }
            return React.createElement("svg", { viewBox: "0 0 " + size + " " + size, width: size, height: size }, slices);
          };
          return React.createElement("div", { className: "max-w-2xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83C\uDF55 Fraction Lab"),
              React.createElement("div", { className: "flex gap-1" },
                React.createElement("button", { className: "px-3 py-1 rounded-lg text-xs font-bold bg-orange-600 text-white" }, "\uD83D\uDD0D Compare"),
                React.createElement("button", { onClick: () => setStemLabTool('fractions'), className: "px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all" }, "\uD83C\uDFC6 Challenge")
              ),
              React.createElement("div", { className: "flex gap-1 ml-auto" },
                ['bar', 'pie'].map(m => React.createElement("button", { key: m, onClick: () => upd('mode', m), className: "px-3 py-1 rounded-lg text-xs font-bold capitalize " + (d.mode === m ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600') }, m))
              )
            ),
            React.createElement("div", { className: "grid grid-cols-2 gap-6" },
              [{ label: 'Fraction A', num: d.num1, den: d.den1, nk: 'num1', dk: 'den1', color: '#3b82f6', sn: sn1, sd: sd1, val: val1 },
              { label: 'Fraction B', num: d.num2, den: d.den2, nk: 'num2', dk: 'den2', color: '#ef4444', sn: sn2, sd: sd2, val: val2 }].map(frac =>
                React.createElement("div", { key: frac.label, className: "bg-white rounded-xl border p-4" },
                  React.createElement("h4", { className: "text-sm font-bold text-slate-600 mb-2" }, frac.label),
                  React.createElement("div", { className: "flex items-center justify-center gap-2 mb-3" },
                    React.createElement("div", { className: "text-center" },
                      React.createElement("input", { type: "number", min: 0, max: 20, value: frac.num, onChange: e => upd(frac.nk, Math.max(0, parseInt(e.target.value) || 0)), className: "w-14 text-center text-xl font-bold border-b-2 outline-none", style: { borderColor: frac.color } }),
                      React.createElement("div", { className: "w-14 h-0.5 my-1", style: { backgroundColor: frac.color } }),
                      React.createElement("input", { type: "number", min: 1, max: 20, value: frac.den, onChange: e => upd(frac.dk, Math.max(1, parseInt(e.target.value) || 1)), className: "w-14 text-center text-xl font-bold outline-none" })
                    ),
                    React.createElement("span", { className: "text-lg font-bold text-slate-400 ml-3" }, "= " + (frac.val * 100).toFixed(0) + "%"),
                    (frac.sn !== frac.num || frac.sd !== frac.den) && React.createElement("span", { className: "text-xs text-slate-400 ml-1" }, "(" + frac.sn + "/" + frac.sd + ")")
                  ),
                  d.mode === 'bar' ? drawBar(frac.num, frac.den, frac.color) : React.createElement("div", { className: "flex justify-center" }, drawPie(frac.num, frac.den, frac.color, 120))
                )
              )
            ),
            React.createElement("div", { className: "mt-4 p-3 rounded-xl text-center font-bold text-lg " + (Math.abs(val1 - val2) < 0.001 ? 'bg-green-50 text-green-700 border border-green-200' : val1 > val2 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-red-50 text-red-700 border border-red-200') },
              Math.abs(val1 - val2) < 0.001 ? d.num1 + "/" + d.den1 + " = " + d.num2 + "/" + d.den2 + " \u2705 Equal!" : val1 > val2 ? d.num1 + "/" + d.den1 + " > " + d.num2 + "/" + d.den2 : d.num1 + "/" + d.den1 + " < " + d.num2 + "/" + d.den2
            )
            ,
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'fv-' + Date.now(), tool: 'fractionViz', label: d.num1 + '/' + d.den1 + ' vs ' + d.num2 + '/' + d.den2, data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")
          );
        })(),

        // ═══════════════════════════════════════════════════════
        // UNIT CONVERTER
        // ═══════════════════════════════════════════════════════
        stemLabTab === 'explore' && stemLabTool === 'unitConvert' && (() => {
          const d = labToolData.unitConvert;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, unitConvert: { ...prev.unitConvert, [key]: val } }));
          const CATEGORIES = {
            length: { label: '\uD83D\uDCCF Length', units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.34 } },
            weight: { label: '\u2696 Weight', units: { mg: 0.001, g: 1, kg: 1000, oz: 28.3495, lb: 453.592, ton: 907185 } },
            temperature: { label: '\uD83C\uDF21 Temperature', units: { '°C': 'C', '°F': 'F', 'K': 'K' } },
            speed: { label: '\uD83D\uDE80 Speed', units: { 'm/s': 1, 'km/h': 0.27778, 'mph': 0.44704, 'knots': 0.51444 } },
          };
          const cat = CATEGORIES[d.category] || CATEGORIES.length;
          const convert = () => {
            if (d.category === 'temperature') {
              const v = d.value;
              if (d.fromUnit === d.toUnit) return v;
              if (d.fromUnit === '°C' && d.toUnit === '°F') return v * 9 / 5 + 32;
              if (d.fromUnit === '°F' && d.toUnit === '°C') return (v - 32) * 5 / 9;
              if (d.fromUnit === '°C' && d.toUnit === 'K') return v + 273.15;
              if (d.fromUnit === 'K' && d.toUnit === '°C') return v - 273.15;
              if (d.fromUnit === '°F' && d.toUnit === 'K') return (v - 32) * 5 / 9 + 273.15;
              if (d.fromUnit === 'K' && d.toUnit === '°F') return (v - 273.15) * 9 / 5 + 32;
              return v;
            }
            return d.value * (cat.units[d.fromUnit] || 1) / (cat.units[d.toUnit] || 1);
          };
          const result = convert();
          return React.createElement("div", { className: "max-w-2xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83D\uDCCF Unit Converter")
            ),
            React.createElement("div", { className: "flex gap-2 mb-4" },
              Object.entries(CATEGORIES).map(([k, v]) => React.createElement("button", { key: k, onClick: () => { upd('category', k); const units = Object.keys(v.units); upd('fromUnit', units[0]); upd('toUnit', units[1] || units[0]); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.category === k ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600') }, v.label))
            ),
            React.createElement("div", { className: "bg-white rounded-xl border-2 border-cyan-200 p-6" },
              React.createElement("div", { className: "flex items-center gap-4 justify-center" },
                React.createElement("div", { className: "text-center" },
                  React.createElement("input", { type: "number", value: d.value, onChange: e => upd('value', parseFloat(e.target.value) || 0), className: "w-32 text-center text-2xl font-bold border-b-2 border-cyan-300 outline-none py-1", step: "0.01" }),
                  React.createElement("select", { value: d.fromUnit, onChange: e => upd('fromUnit', e.target.value), className: "block w-full mt-2 text-center text-sm font-bold text-cyan-700 border border-cyan-200 rounded-lg py-1" },
                    Object.keys(cat.units).map(u => React.createElement("option", { key: u, value: u }, u))
                  )
                ),
                React.createElement("span", { className: "text-2xl text-cyan-400 font-bold" }, "\u2192"),
                React.createElement("div", { className: "text-center" },
                  React.createElement("p", { className: "text-2xl font-black text-cyan-700 py-1" }, typeof result === 'number' ? (Math.abs(result) < 0.01 ? result.toExponential(4) : result.toFixed(4).replace(/\.?0+$/, '')) : result),
                  React.createElement("select", { value: d.toUnit, onChange: e => upd('toUnit', e.target.value), className: "block w-full mt-2 text-center text-sm font-bold text-cyan-700 border border-cyan-200 rounded-lg py-1" },
                    Object.keys(cat.units).map(u => React.createElement("option", { key: u, value: u }, u))
                  )
                )
              ),
              React.createElement("button", { onClick: () => { setLabToolData(prev => ({ ...prev, unitConvert: { ...prev.unitConvert, fromUnit: d.toUnit, toUnit: d.fromUnit } })); }, className: "block mx-auto mt-3 px-4 py-1 bg-cyan-50 text-cyan-600 rounded-full text-xs font-bold hover:bg-cyan-100" }, "\u21C4 Swap")
            )
            ,
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'uc-' + Date.now(), tool: 'unitConvert', label: d.value + ' ' + d.fromUnit + ' to ' + d.toUnit, data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")
          );
        })(),

        // ═══════════════════════════════════════════════════════
        // PROBABILITY LAB
        // ═══════════════════════════════════════════════════════
        stemLabTab === 'explore' && stemLabTool === 'probability' && (() => {
          const d = labToolData.probability;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, probability: { ...prev.probability, [key]: val } }));
          const runTrial = (n) => {
            const results = [...d.results];
            for (let i = 0; i < n; i++) {
              if (d.mode === 'coin') results.push(Math.random() < 0.5 ? 'H' : 'T');
              else if (d.mode === 'dice') results.push(Math.floor(Math.random() * 6) + 1);
              else results.push(['Red', 'Blue', 'Green', 'Yellow'][Math.floor(Math.random() * 4)]);
            }
            upd('results', results);
            upd('trials', results.length);
          };
          const counts = {};
          d.results.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
          const expected = d.mode === 'coin' ? { H: 0.5, T: 0.5 } : d.mode === 'dice' ? { 1: 1 / 6, 2: 1 / 6, 3: 1 / 6, 4: 1 / 6, 5: 1 / 6, 6: 1 / 6 } : { Red: 0.25, Blue: 0.25, Green: 0.25, Yellow: 0.25 };
          const maxCount = Math.max(...Object.values(counts), 1);
          const barColors = { H: '#3b82f6', T: '#ef4444', 1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#22c55e', 5: '#3b82f6', 6: '#8b5cf6', Red: '#ef4444', Blue: '#3b82f6', Green: '#22c55e', Yellow: '#eab308' };
          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83C\uDFB2 Probability Lab"),
              d.trials > 0 && React.createElement("span", { className: "ml-2 px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-bold rounded-full" }, d.trials + " trials")
            ),
            React.createElement("div", { className: "flex gap-2 mb-3" },
              [['coin', '\uD83E\uDE99 Coin'], ['dice', '\uD83C\uDFB2 Dice'], ['spinner', '\uD83C\uDFA1 Spinner']].map(([m, label]) =>
                React.createElement("button", { key: m, onClick: () => { upd('mode', m); upd('results', []); upd('trials', 0); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.mode === m ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600') }, label)
              )
            ),
            React.createElement("div", { className: "flex gap-2 mb-4" },
              [1, 10, 50, 100].map(n => React.createElement("button", { key: n, onClick: () => runTrial(n), className: "px-4 py-2 bg-violet-100 text-violet-700 font-bold rounded-lg hover:bg-violet-200 transition-colors" }, "+" + n)),
              React.createElement("button", { onClick: () => { upd('results', []); upd('trials', 0); }, className: "px-4 py-2 bg-red-50 text-red-500 font-bold rounded-lg hover:bg-red-100" }, "\uD83D\uDD04 Reset")
            ),
            d.trials > 0 && React.createElement("div", { className: "bg-white rounded-xl border border-violet-200 p-4" },
              React.createElement("div", { className: "space-y-2" },
                Object.keys(expected).map(k => {
                  const count = counts[k] || 0;
                  const pct = d.trials > 0 ? (count / d.trials * 100) : 0;
                  const expPct = expected[k] * 100;
                  return React.createElement("div", { key: k, className: "flex items-center gap-2" },
                    React.createElement("span", { className: "w-12 text-right text-sm font-bold", style: { color: barColors[k] } }, d.mode === 'coin' ? (k === 'H' ? '\uD83E\uDE99 H' : '\uD83E\uDE99 T') : d.mode === 'dice' ? '\u2680 ' + k : '\u25CF ' + k),
                    React.createElement("div", { className: "flex-1 bg-slate-100 rounded-full h-6 overflow-hidden relative" },
                      React.createElement("div", { style: { width: (count / maxCount * 100) + '%', backgroundColor: barColors[k], height: '100%', borderRadius: '9999px', transition: 'width 0.3s' } }),
                      React.createElement("div", { style: { position: 'absolute', left: (expPct / 100 * 100) + '%', top: 0, bottom: 0, width: '2px', backgroundColor: '#1e293b40' } })
                    ),
                    React.createElement("span", { className: "w-20 text-xs font-mono text-slate-500 text-right" }, count + " (" + pct.toFixed(1) + "%)"),
                    React.createElement("span", { className: "w-16 text-[10px] text-slate-400" }, "exp: " + expPct.toFixed(1) + "%")
                  );
                })
              ),
              React.createElement("p", { className: "mt-3 text-xs text-slate-400 text-center italic" }, "Black lines show expected probability. With more trials, observed frequencies approach expected values (Law of Large Numbers)."),
              d.trials >= 10 && React.createElement("div", { className: "mt-3 bg-violet-50 rounded-xl border border-violet-200 p-3" },
                React.createElement("p", { className: "text-[10px] font-bold text-violet-700 uppercase tracking-wider mb-2" }, "\uD83D\uDCCA Statistical Analysis"),
                React.createElement("div", { className: "grid grid-cols-3 gap-2 text-center" },
                  React.createElement("div", { className: "p-1.5 bg-white rounded-lg border" },
                    React.createElement("p", { className: "text-[9px] font-bold text-violet-500" }, "Total Trials"),
                    React.createElement("p", { className: "text-lg font-black text-violet-800" }, d.trials)
                  ),
                  React.createElement("div", { className: "p-1.5 bg-white rounded-lg border" },
                    React.createElement("p", { className: "text-[9px] font-bold text-violet-500" }, "Max Deviation"),
                    React.createElement("p", { className: "text-lg font-black text-violet-800" }, (function () {
                      var maxDev = 0;
                      Object.keys(expected).forEach(function (k) {
                        var observed = (counts[k] || 0) / d.trials;
                        var dev = Math.abs(observed - expected[k]);
                        if (dev > maxDev) maxDev = dev;
                      });
                      return (maxDev * 100).toFixed(1) + '%';
                    })())
                  ),
                  React.createElement("div", { className: "p-1.5 bg-white rounded-lg border" },
                    React.createElement("p", { className: "text-[9px] font-bold text-violet-500" }, "Fairness"),
                    React.createElement("p", {
                      className: "text-lg font-black " + (function () {
                        var maxDev = 0;
                        Object.keys(expected).forEach(function (k) { var dev = Math.abs((counts[k] || 0) / d.trials - expected[k]); if (dev > maxDev) maxDev = dev; });
                        return maxDev < 0.05 ? 'text-emerald-600' : maxDev < 0.15 ? 'text-yellow-600' : 'text-red-600';
                      })()
                    }, (function () {
                      var maxDev = 0;
                      Object.keys(expected).forEach(function (k) { var dev = Math.abs((counts[k] || 0) / d.trials - expected[k]); if (dev > maxDev) maxDev = dev; });
                      return maxDev < 0.05 ? '\u2705 Fair' : maxDev < 0.15 ? '\u26A0 Skewing' : '\u274C Unfair';
                    })())
                  )
                ),
                React.createElement("p", { className: "mt-2 text-xs text-violet-500 italic" },
                  d.trials < 30 ? '\uD83D\uDCA1 Need more trials! With only ' + d.trials + ' trials, randomness dominates. Try 100+ for reliable patterns.'
                    : d.trials < 100 ? '\uD83D\uDCA1 Getting better! At ' + d.trials + ' trials, patterns are emerging but may still deviate significantly.'
                      : '\uD83D\uDCA1 Great sample size! At ' + d.trials + ' trials, the Law of Large Numbers is clearly visible \u2014 observed frequencies converge toward expected values.'
                )
              ),
            ),
            d.trials > 0 && React.createElement("div", { className: "mt-2 text-xs text-slate-400 text-center" }, "Last 10: " + d.results.slice(-10).join(', '))
          );
        })(), stemLabTab === 'explore' && stemLabTool === 'decomposer' && (() => {
          const d = labToolData.decomposer || {};
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, decomposer: { ...prev.decomposer, [key]: val } }));
          const MATERIALS = [
            { name: 'Water', emoji: '\uD83D\uDCA7', elements: { H: 66.7, O: 33.3 }, formula: 'H\u2082O', fact: 'Water covers 71% of Earth\u2019s surface' },
            { name: 'Table Salt', emoji: '\uD83E\uDDC2', elements: { Na: 39.3, Cl: 60.7 }, formula: 'NaCl', fact: 'Salt preserves food by dehydrating bacteria' },
            { name: 'Glass', emoji: '\uD83E\uDE9F', elements: { Si: 46.7, O: 53.3 }, formula: 'SiO\u2082', fact: 'Glass is made by heating sand to 1700\u00B0C' },
            { name: 'Steel', emoji: '\u2699\uFE0F', elements: { Fe: 98.0, C: 2.0 }, formula: 'Fe + C', fact: 'Steel is iron with a small amount of carbon' },
            { name: 'Baking Soda', emoji: '\uD83E\uDDC1', elements: { Na: 27.4, H: 1.2, C: 14.3, O: 57.1 }, formula: 'NaHCO\u2083', fact: 'Reacts with vinegar to produce CO\u2082 bubbles' },
            { name: 'Chalk', emoji: '\uD83E\uDEA8', elements: { Ca: 40.0, C: 12.0, O: 48.0 }, formula: 'CaCO\u2083', fact: 'Made from ancient marine organisms\u2019 shells' },
            { name: 'Rust', emoji: '\uD83D\uDFE5', elements: { Fe: 69.9, O: 30.1 }, formula: 'Fe\u2082O\u2083', fact: 'Iron oxidizes when exposed to moisture and air' },
            { name: 'Sugar', emoji: '\uD83C\uDF6C', elements: { C: 42.1, H: 6.5, O: 51.4 }, formula: 'C\u2081\u2082H\u2082\u2082O\u2081\u2081', fact: 'Sucrose is extracted from sugarcane or sugar beets' },
            { name: 'Diamond', emoji: '\uD83D\uDC8E', elements: { C: 100 }, formula: 'C', fact: 'The hardest natural material \u2014 pure carbon' },
            { name: 'Marble', emoji: '\uD83C\uDFDB\uFE0F', elements: { Ca: 40.0, C: 12.0, O: 48.0 }, formula: 'CaCO\u2083', fact: 'Metamorphic rock used in sculpture since antiquity' },
            { name: 'Dry Ice', emoji: '\u2744\uFE0F', elements: { C: 27.3, O: 72.7 }, formula: 'CO\u2082', fact: 'Solid carbon dioxide at -78.5\u00B0C' },
            { name: 'Bleach', emoji: '\uD83E\uDDEA', elements: { Na: 30.9, O: 21.5, Cl: 47.6 }, formula: 'NaOCl', fact: 'Sodium hypochlorite kills germs by oxidation' },
            { name: 'Limestone', emoji: '\uD83E\uDEA8', elements: { Ca: 40.0, C: 12.0, O: 48.0 }, formula: 'CaCO\u2083', fact: 'Used to make cement and concrete' },
            { name: 'Ammonia', emoji: '\uD83E\uDDEA', elements: { N: 82.4, H: 17.6 }, formula: 'NH\u2083', fact: 'Key ingredient in fertilizers worldwide' },
            { name: 'Quartz', emoji: '\uD83D\uDD2E', elements: { Si: 46.7, O: 53.3 }, formula: 'SiO\u2082', fact: 'The most abundant mineral in Earth\u2019s crust' },
          ];
          const mat = MATERIALS.find(m => m.name === (d.material || 'Water')) || MATERIALS[0];
          const maxPct = Math.max(...Object.values(mat.elements));
          const elColors = { H: '#60a5fa', C: '#1e293b', N: '#3b82f6', O: '#ef4444', Na: '#a855f7', Cl: '#22c55e', Ca: '#fbbf24', Fe: '#fb923c', Si: '#34d399', S: '#eab308', K: '#f87171', Mg: '#fbbf24', Al: '#94a3b8', Cu: '#fb923c', Zn: '#94a3b8' };
          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\u2697\uFE0F Material Decomposer")
            ),
            React.createElement("p", { className: "text-xs text-slate-500 mb-3 -mt-1" }, "Break everyday materials into their constituent elements. Inspired by Minecraft\u2019s Material Reducer!"),
            // Material selector
            React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-4" },
              MATERIALS.map(m => React.createElement("button", {
                key: m.name, onClick: () => {
                  upd('material', m.name); upd('decomposed', false);
                }, className: "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.material === m.name ? 'bg-violet-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-violet-50 border border-slate-200')
              }, m.emoji + " " + m.name))
            ),
            // Material display
            React.createElement("div", { className: "bg-white rounded-xl border-2 border-violet-200 p-6 text-center" },
              React.createElement("p", { className: "text-4xl mb-2" }, mat.emoji),
              React.createElement("h4", { className: "text-xl font-black text-slate-800" }, mat.name),
              React.createElement("p", { className: "text-sm font-bold text-violet-600 mb-1" }, mat.formula),
              React.createElement("p", { className: "text-xs text-slate-500 mb-4 italic" }, mat.fact),
              // Decompose button
              !d.decomposed
                ? React.createElement("button", { onClick: () => upd('decomposed', true), className: "px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold rounded-xl hover:from-violet-600 hover:to-purple-700 shadow-lg transition-all hover:scale-105 active:scale-95" }, "\uD83D\uDD2C Decompose!")
                : React.createElement("div", { className: "animate-in slide-in-from-bottom duration-500" },
                  React.createElement("p", { className: "text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider" }, "Element Composition (by atom %)"),
                  React.createElement("div", { className: "space-y-2" },
                    Object.entries(mat.elements).sort((a, b) => b[1] - a[1]).map(([el, pct]) =>
                      React.createElement("div", { key: el, className: "flex items-center gap-2" },
                        React.createElement("span", { className: "w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-sm", style: { backgroundColor: elColors[el] || '#64748b' } }, el),
                        React.createElement("div", { className: "flex-1 bg-slate-100 rounded-full h-6 overflow-hidden" },
                          React.createElement("div", { className: "h-full rounded-full flex items-center px-2 transition-all duration-1000 ease-out", style: { width: (pct / maxPct * 100) + '%', backgroundColor: (elColors[el] || '#64748b') + '20', borderLeft: '3px solid ' + (elColors[el] || '#64748b') } },
                            React.createElement("span", { className: "text-xs font-bold", style: { color: elColors[el] || '#64748b' } }, pct.toFixed(1) + "%")
                          )
                        )
                      )
                    )
                  ),
                  React.createElement("button", { onClick: () => upd('decomposed', false), className: "mt-4 px-4 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-200" }, "\uD83D\uDD04 Reassemble")
                )
            ),
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'dc-' + Date.now(), tool: 'decomposer', label: d.material || 'Material', data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")
          )
        })(),


        // ═══════════════════════════════════════════════════════

        // MUSIC SYNTHESIZER — Web Audio API + Canvas2D Oscilloscope

        // ═══════════════════════════════════════════════════════

        stemLabTab === 'explore' && stemLabTool === 'musicSynth' && (() => {
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

          // ═══ OMNICHORD PURE SOUND ═══
          function playOmnichordTone(freq, noteId, durationMs, preset) {
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
          function strumOmnichord(rootNote, chordType, preset) {
            var chordData = CHORDS[chordType]; if (!chordData) return;
            var ri = NOTE_NAMES.indexOf(rootNote);
            var intervals = chordData.intervals.slice();
            var oct = d.octave || 4;
            intervals.forEach(function (intv, idx) {
              setTimeout(function () {
                var nIdx = (ri + intv) % 12;
                var nOct = oct + Math.floor((ri + intv) / 12);
                playOmnichordTone(noteFreq(NOTE_NAMES[nIdx], nOct), 'omni_' + idx, 1400, preset);
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
            'Major': { intervals: [0, 2, 4, 5, 7, 9, 11], desc: 'Happy, bright. The most common Western scale.', science: 'Built on the pattern W-W-H-W-W-W-H (Whole/Half steps). The Ionian mode. Its brightness comes from the major 3rd (4 semitones) and perfect 5th (7 semitones).' },
            'Natural Minor': { intervals: [0, 2, 3, 5, 7, 8, 10], desc: 'Sad, dark, introspective.', science: 'Pattern: W-H-W-W-H-W-W. The Aeolian mode. The minor 3rd (3 semitones) creates a darker, more somber quality than major.' },
            'Harmonic Minor': { intervals: [0, 2, 3, 5, 7, 8, 11], desc: 'Exotic, dramatic, classical.', science: 'Like natural minor but raises the 7th degree. Creates an augmented 2nd interval (3 semitones) between the 6th and 7th, giving it a Middle Eastern flavor.' },
            'Melodic Minor': { intervals: [0, 2, 3, 5, 7, 9, 11], desc: 'Smooth, jazzy, sophisticated.', science: 'Raises both the 6th and 7th degrees of natural minor. Used ascending in classical; jazz uses it both ways. Foundation of many jazz modes.' },
            'Pentatonic Major': { intervals: [0, 2, 4, 7, 9], desc: 'Universal, folk, rock.', science: 'A 5-note subset of the major scale, removing the 4th and 7th. Found in music worldwide because it avoids semitones, making any combination sound consonant.' },
            'Pentatonic Minor': { intervals: [0, 3, 5, 7, 10], desc: 'Blues, rock, universal.', science: 'The most common scale for improvisation. 5 notes, no semitones. Guitar solos, Asian music, African music all use this scale extensively.' },
            'Blues': { intervals: [0, 3, 5, 6, 7, 10], desc: 'Soulful, gritty, expressive.', science: 'Adds the "blue note" (\u266D5/\u266F4) to the minor pentatonic. This tritone creates tension and the characteristic blues sound. Bending notes is central to blues expression.' },
            'Dorian': { intervals: [0, 2, 3, 5, 7, 9, 10], desc: 'Jazz, funk, sophisticated minor.', science: 'A minor mode with a raised 6th degree. Used heavily in jazz and funk (e.g., "So What" by Miles Davis). Has a "bright minor" quality.' },
            'Mixolydian': { intervals: [0, 2, 4, 5, 7, 9, 10], desc: 'Rock, folk, dominant feel.', science: 'A major scale with a lowered 7th. The "dominant" sound. Used in rock (Grateful Dead), folk, and creates the V7 chord quality.' },
            'Phrygian': { intervals: [0, 1, 3, 5, 7, 8, 10], desc: 'Spanish, flamenco, metal.', science: 'A minor mode with \u266D2. The half-step from root creates dramatic, dark tension. Central to flamenco guitar and heavy metal.' },
            'Lydian': { intervals: [0, 2, 4, 6, 7, 9, 11], desc: 'Dreamy, ethereal, film scores.', science: 'A major scale with \u266F4. The raised 4th creates a "floating" quality. Used extensively in film scores (John Williams) and progressive rock.' },
            'Whole Tone': { intervals: [0, 2, 4, 6, 8, 10], desc: 'Mysterious, ambiguous, dreamlike.', science: 'All whole steps, no half steps. No tonal center. Only 2 unique whole-tone scales exist. Used by Debussy and in mystery/dream sequences.' },
            'Chromatic': { intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], desc: 'All 12 notes. Complete but atonal.', science: 'Every semitone in the octave. No tonal hierarchy. The basis of 12-tone serialism (Schoenberg). Each note is equally spaced at 2^(1/12) \u2248 1.0595 frequency ratio.' },
          };

          var CHORDS = {
            'Major': { intervals: [0, 4, 7], symbol: '', desc: 'Happy, stable, resolved.', science: 'Root + Major 3rd (4 semitones) + Perfect 5th (7 semitones). Frequency ratio approximately 4:5:6. The most consonant triad.' },
            'Minor': { intervals: [0, 3, 7], symbol: 'm', desc: 'Sad, introspective, dark.', science: 'Root + Minor 3rd (3 semitones) + Perfect 5th. The lowered 3rd creates a more somber quality. Ratio approximately 10:12:15.' },
            'Diminished': { intervals: [0, 3, 6], symbol: 'dim', desc: 'Tense, unstable, needs to resolve.', science: 'Two minor 3rds stacked. The tritone (6 semitones) between root and 5th is the most dissonant interval, creating maximum tension.' },
            'Augmented': { intervals: [0, 4, 8], symbol: 'aug', desc: 'Mysterious, unresolved, eerie.', science: 'Two major 3rds stacked. Divides the octave into 3 equal parts. Symmetrical \u2014 only 4 unique augmented triads exist.' },
            'Maj7': { intervals: [0, 4, 7, 11], symbol: 'maj7', desc: 'Smooth, lush, jazzy.', science: 'Major triad + major 7th (11 semitones). The major 7th interval is nearly an octave, creating a sweet, complex resonance.' },
            'Min7': { intervals: [0, 3, 7, 10], symbol: 'm7', desc: 'Cool, mellow, relaxed.', science: 'Minor triad + minor 7th (10 semitones). Very common in jazz. Less tense than dominant 7th, more complex than minor triad.' },
            'Dom7': { intervals: [0, 4, 7, 10], symbol: '7', desc: 'Bluesy, restless, wants to resolve.', science: 'Major triad + minor 7th. The tritone between 3rd and \u266D7th creates tension that "pulls" toward resolution to a chord a 5th below (V7\u2192I).' },
            'Sus2': { intervals: [0, 2, 7], symbol: 'sus2', desc: 'Open, modern, shimmering.', science: 'Replaces the 3rd with the 2nd. Neither major nor minor \u2014 ambiguous quality. Common in pop and ambient music.' },
            'Sus4': { intervals: [0, 5, 7], symbol: 'sus4', desc: 'Suspended, yearning to resolve.', science: 'Replaces the 3rd with the 4th. The 4th wants to "suspend" down to the 3rd. Used since medieval music to create tension-release.' },
            'Power': { intervals: [0, 7, 12], symbol: '5', desc: 'Raw, strong, genre-defining.', science: 'Just root + 5th (+ octave). No 3rd means no major/minor quality. Sounds huge with distortion because the simple 3:2 ratio stays clean when clipped.' },
            // Extended voicings (MiniChord-inspired)
            '6': { intervals: [0, 4, 7, 9], symbol: '6', desc: 'Warm, jazzy, classic.', science: 'Major triad + major 6th. Central to Barry Harris harmony. A sweet, sophisticated alternative to maj7.' },
            'min6': { intervals: [0, 3, 7, 9], symbol: 'm6', desc: 'Sophisticated minor.', science: 'Minor triad + major 6th. Key chord in Barry Harris minor system. Creates smooth voice leading with dim7 passing chords.' },
            'add9': { intervals: [0, 2, 4, 7], symbol: 'add9', desc: 'Bright, open, modern pop.', science: 'Major triad + 9th (2nd up an octave). No 7th. Clean, shimmering sound popular in contemporary pop and worship music.' },
            '9': { intervals: [0, 4, 7, 10, 14], symbol: '9', desc: 'Rich, funky, bluesy.', science: 'Dominant 7th + 9th. Full, complex sound. Essential in funk, R&B, and blues. Hendrix made the 7\u266F9 famous.' },
            'Maj9': { intervals: [0, 4, 7, 11, 14], symbol: 'maj9', desc: 'Dreamy, lush.', science: 'Major 7th + 9th. Maximum smoothness and warmth. Neo-soul and jazz ballads. The quintessential "beautiful" chord.' },
            'Min9': { intervals: [0, 3, 7, 10, 14], symbol: 'm9', desc: 'Cool, sophisticated.', science: 'Minor 7th + 9th. The quintessential modern jazz minor chord. Creates a contemplative, introspective mood.' },
            '13': { intervals: [0, 4, 7, 10, 14, 21], symbol: '13', desc: 'Full, orchestral, complex.', science: 'Dominant with 9th + 13th. Six notes! Used in jazz endings, gospel turnarounds, and orchestral voicings.' },
            'dim7': { intervals: [0, 3, 6, 9], symbol: 'dim7', desc: 'Symmetrical, passing.', science: 'All minor 3rds stacked. Only 3 unique dim7 chords exist (due to symmetry). Used as passing chords in Barry Harris harmony for smooth voice leading.' },
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
            sine: { emoji: '\u223F', desc: 'Pure tone, fundamental only', harmonics: 'Fundamental', science: 'A sine wave is the simplest sound \u2014 a single frequency with no overtones. All other waveforms are combinations of sine waves (Fourier theorem).' },
            square: { emoji: '\u25A0', desc: 'Hollow, reed-like', harmonics: 'Odd only (1,3,5,7...)', science: 'Contains only odd harmonics. Sounds like a clarinet or old-school video games. Each harmonic\u2019s amplitude = 1/n.' },
            sawtooth: { emoji: '\u25E2', desc: 'Bright, buzzy, rich', harmonics: 'All harmonics', science: 'Contains ALL harmonics (both odd and even), each at 1/n amplitude. Sounds like a violin or brass. The richest waveform for subtractive synthesis.' },
            triangle: { emoji: '\u25B3', desc: 'Soft, flute-like', harmonics: 'Odd only, fading fast', science: 'Like square but softer \u2014 odd harmonics at 1/n\u00B2. Sounds between sine and square, similar to a flute or ocarina.' }
          };
          var wInfo = WAVE_INFO[d.waveType || 'sine'];

          // ═══ INTERVALS ═══
          var INTERVALS = [
            { name: 'Unison', semitones: 0, ratio: '1:1', song: 'Same note', quality: 'perfect' },
            { name: 'Minor 2nd', semitones: 1, ratio: '16:15', song: 'Jaws theme', quality: 'dissonant' },
            { name: 'Major 2nd', semitones: 2, ratio: '9:8', song: 'Happy Birthday (1st two notes)', quality: 'dissonant' },
            { name: 'Minor 3rd', semitones: 3, ratio: '6:5', song: 'Greensleeves', quality: 'consonant' },
            { name: 'Major 3rd', semitones: 4, ratio: '5:4', song: 'Oh When the Saints', quality: 'consonant' },
            { name: 'Perfect 4th', semitones: 5, ratio: '4:3', song: 'Here Comes the Bride', quality: 'perfect' },
            { name: 'Tritone', semitones: 6, ratio: '\u221A2:1', song: 'The Simpsons theme', quality: 'dissonant' },
            { name: 'Perfect 5th', semitones: 7, ratio: '3:2', song: 'Star Wars opening', quality: 'perfect' },
            { name: 'Minor 6th', semitones: 8, ratio: '8:5', song: 'Love Story theme', quality: 'consonant' },
            { name: 'Major 6th', semitones: 9, ratio: '5:3', song: 'My Bonnie Lies Over the Ocean', quality: 'consonant' },
            { name: 'Minor 7th', semitones: 10, ratio: '16:9', song: 'Star Trek theme', quality: 'dissonant' },
            { name: 'Major 7th', semitones: 11, ratio: '15:8', song: 'Take On Me (chorus)', quality: 'dissonant' },
            { name: 'Octave', semitones: 12, ratio: '2:1', song: 'Somewhere Over the Rainbow', quality: 'perfect' },
          ];

          // ═══ PRESETS (incl Plucked for K-S) ═══
          var PRESETS = {
            'Piano': { waveType: 'triangle', attack: 0.005, decay: 0.15, sustain: 0.4, release: 0.4, volume: 0.6, filterCutoff: 8000, filterQ: 1, synthEngine: 'standard' },
            'Organ': { waveType: 'sine', attack: 0.01, decay: 0.05, sustain: 0.9, release: 0.1, volume: 0.5, chorusMix: 0.3, vibratoDepth: 0.2, vibratoRate: 6, synthEngine: 'standard' },
            'Strings': { waveType: 'sawtooth', attack: 0.3, decay: 0.1, sustain: 0.8, release: 0.6, volume: 0.4, filterCutoff: 3000, filterQ: 2, tremoloDepth: 0.15, tremoloRate: 5, synthEngine: 'standard' },
            'Bass': { waveType: 'sawtooth', attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.2, volume: 0.7, filterCutoff: 800, filterQ: 5, synthEngine: 'standard' },
            'Lead': { waveType: 'square', attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.15, volume: 0.5, distAmount: 15, vibratoDepth: 0.3, vibratoRate: 5.5, synthEngine: 'standard' },
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
            { name: 'I-IV-V-I (Classical)', degrees: [[0, 'Major'], [5, 'Major'], [7, 'Major'], [0, 'Major']], desc: 'The foundation of Western music.' },
            { name: 'I-V-vi-IV (Pop)', degrees: [[0, 'Major'], [7, 'Major'], [9, 'Minor'], [5, 'Major']], desc: 'Used in thousands of pop songs.' },
            { name: 'ii-V-I (Jazz)', degrees: [[2, 'Min7'], [7, 'Dom7'], [0, 'Maj7']], desc: 'The most important jazz progression.' },
            { name: 'I-vi-IV-V (50s)', degrees: [[0, 'Major'], [9, 'Minor'], [5, 'Major'], [7, 'Major']], desc: 'Classic doo-wop progression.' },
            { name: '12-Bar Blues', degrees: [[0, 'Dom7'], [0, 'Dom7'], [0, 'Dom7'], [0, 'Dom7'], [5, 'Dom7'], [5, 'Dom7'], [0, 'Dom7'], [0, 'Dom7'], [7, 'Dom7'], [5, 'Dom7'], [0, 'Dom7'], [7, 'Dom7']], desc: 'Foundation of blues, rock, and jazz.' },
            { name: 'vi-IV-I-V (Emo/Alt)', degrees: [[9, 'Minor'], [5, 'Major'], [0, 'Major'], [7, 'Major']], desc: 'Common in alternative and emo.' }
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
            { n: 1, name: 'Fundamental', interval: 'Unison', ratio: '1x' },
            { n: 2, name: '1st Overtone', interval: 'Octave', ratio: '2x' },
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
            adsr: { title: 'ADSR Envelope', text: 'Attack: time to reach full volume. Decay: time to fall to sustain. Sustain: held volume level. Release: fade-out time after key release.' },
            scales: { title: 'Scales & Modes', text: 'A scale is an ordered set of pitches. Modes are rotations of the scale starting on different degrees. Each creates a different emotional mood.' },
            chords: { title: 'Chord Theory', text: 'Chords are built by stacking intervals (3rds). Major uses a major 3rd + minor 3rd. Minor reverses them. Extended chords add 7ths, 9ths, and beyond.' },
            drums: { title: 'Drum Synthesis', text: 'Kicks use a sine oscillator with a pitch sweep. Snares combine noise (filtered) + tone body. Hi-hats use high-pass filtered noise bursts.' },
            timeSig: { title: 'Time Signatures', text: '4/4 = 4 quarter-note beats per bar (most common). 3/4 = waltz feel. 6/8 = compound duple. 5/4 and 7/8 create asymmetric, exotic grooves.' },
            circleOfFifths: { title: 'Circle of Fifths', text: 'Keys arranged by ascending 5ths clockwise. Adjacent keys share 6 of 7 notes. Moving clockwise adds sharps; counter-clockwise adds flats.' },
            harmonicSeries: { title: 'Harmonic Series', text: 'Every musical sound contains overtones above the fundamental. Their relative strengths determine timbre \u2014 why a trumpet sounds different from a flute at the same pitch.' },
            intervals: { title: 'Musical Intervals', text: 'An interval is the distance between two pitches, measured in semitones. The frequency ratio determines consonance (simple ratios like 3:2 sound smooth).' },
            arpeggiator: { title: 'Arpeggiator', text: 'Plays chord notes one at a time in sequence. Up = low to high, Down = high to low. Creates flowing patterns from static chords.' },
            filter: { title: 'Resonant Filter', text: 'A filter removes frequencies above (lowpass), below (highpass), or around (bandpass) a cutoff frequency. Resonance (Q) amplifies frequencies near cutoff, creating a peak.' },
            tremolo: { title: 'Tremolo & Vibrato', text: 'Tremolo: periodic volume changes (amplitude modulation). Vibrato: periodic pitch changes (frequency modulation). Both controlled by an LFO (Low Frequency Oscillator).' },
            karplusStrong: { title: 'Karplus-Strong Synthesis', text: 'Discovered in 1983. A noise burst feeds into a very short delay line with feedback. The delay time determines pitch. A filter in the feedback loop controls brightness and decay. Naturally simulates plucked strings.' },
            composition: { title: 'Music Composition', text: 'The sequencer is a composition tool. Each step represents a beat subdivision. The melody row sets pitched notes, drums add rhythm. Musical notation shows what you create.' },
            notation: { title: 'Musical Notation', text: 'Notes on lines and spaces represent pitches. Duration is shown by note shape: whole (\u25CB), half (\u{1D15E}), quarter (\u2669), eighth (\u266A). The staff uses 5 lines.' }
          };

          // ═══ MUSIC QUIZ ═══
          var MUSIC_QUIZ = [
            { q: 'What waveform contains ONLY the fundamental frequency?', a: 'Sine', opts: ['Sine', 'Square', 'Sawtooth', 'Triangle'] },
            { q: 'What does ADSR stand for?', a: 'Attack Decay Sustain Release', opts: ['Attack Decay Sustain Release', 'Audio Digital Sound Router', 'Amplitude Duration Signal Response', 'Analog Delay Synth Reverb'] },
            { q: 'Which interval has a 3:2 frequency ratio?', a: 'Perfect Fifth', opts: ['Perfect Fifth', 'Major Third', 'Octave', 'Perfect Fourth'] },
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

          // ═══ KEYBOARD HANDLER ═══
          var KEYBOARD_MAP = {
            'z': 0, 'x': 2, 'c': 4, 'v': 5, 'b': 7, 'n': 9, 'm': 11, ',': 12, '.': 14, '/': 16,
            's': 1, 'd': 3, 'g': 6, 'h': 8, 'j': 10, 'l': 13, ';': 15
          };
          React.useEffect(function () {
            function onKeyDown(e) {
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
            }
            function onKeyUp(e) {
              var semi = KEYBOARD_MAP[e.key.toLowerCase()];
              if (semi !== undefined) {
                var key = KEYS[semi];
                if (key) { var noteId = key.note + key.octave; stopNote(noteId); upd('activeKeys', (d.activeKeys || []).filter(function (x) { return x !== noteId; })); }
              }
            }
            window.addEventListener('keydown', onKeyDown);
            window.addEventListener('keyup', onKeyUp);
            return function () { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
          }, [synthTab, scaleLock, synthEngine, d.octave]);

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

          return React.createElement("div", { className: "max-w-5xl mx-auto animate-in fade-in duration-200" },
            // ── Header ──
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: function () { setStemLabTool(null); stopSequencer(); stopMetronome(); stopArpeggiator(); }, className: "p-1.5 hover:bg-slate-100 rounded-lg transition-colors" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500" }, "\uD83C\uDFB9 Music Synthesizer"),
              React.createElement("span", { className: "px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full" }, synthEngine === 'plucked' ? '\uD83C\uDFB8 PLUCKED' : '\u223F ' + (d.waveType || 'sine').toUpperCase()),
              d.activePreset && React.createElement("span", { className: "px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full" }, "\u2B50 " + d.activePreset),
              // Tab selector
              React.createElement("div", { className: "flex gap-0.5 ml-auto bg-slate-100 rounded-lg p-0.5" },
                [{ id: 'play', icon: '\uD83C\uDFB9', label: 'Play' }, { id: 'scales', icon: '\uD83C\uDFB5', label: 'Scales' }, { id: 'chords', icon: '\uD83C\uDFB6', label: 'Chords' }, { id: 'omnichord', icon: '\uD83C\uDF1F', label: 'Omnichord' }, { id: 'theory', icon: '\uD83D\uDCDA', label: 'Theory' }].map(function (tab) {
                  return React.createElement("button", {
                    key: tab.id,
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
                  }, (name === 'Plucked' ? '\uD83C\uDFB8' : name === 'Guitar' ? '\uD83C\uDFB8' : name === 'Strings' ? '\uD83C\uDFBB' : name === 'Organ' ? '\u26EA' : name === 'Bass' ? '\uD83C\uDFB8' : name === 'Pad' ? '\u2601\uFE0F' : name === 'Lead' ? '\u26A1' : name === 'Retro' ? '\uD83D\uDC7E' : name === 'Spooky' ? '\uD83D\uDC7B' : '\uD83C\uDFB9') + ' ' + name);
                })
              ),

              // Root & Octave & Scale Lock
              React.createElement("div", { className: "flex gap-2 mb-3 items-center" },
                React.createElement("div", { className: "flex items-center gap-1" },
                  React.createElement("span", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Root"),
                  React.createElement("select", {
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
                  (jazzMode ? ['Maj7', 'Min7', 'Dom7', 'dim7', 'Min9', 'Maj9', '9', '13', '6', 'min6'] : ['Major', 'Minor', 'Diminished', 'Augmented', 'Sus2', 'Sus4', 'Power', 'Dom7', 'Maj7', 'Min7']).map(function (chType) {
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
                  [{ k: 'attack', label: 'Attack', min: 0.001, max: 2, step: 0.01, unit: 's' },
                  { k: 'decay', label: 'Decay', min: 0.01, max: 1, step: 0.01, unit: 's' },
                  { k: 'sustain', label: 'Sustain', min: 0, max: 1, step: 0.01, unit: '' },
                  { k: 'release', label: 'Release', min: 0.01, max: 3, step: 0.01, unit: 's' }].map(function (param) {
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
                    [{ k: 'ksBrightness', label: 'Brightness', min: 0.1, max: 1, step: 0.01 },
                    { k: 'ksDamping', label: 'Damping', min: 0.99, max: 0.9999, step: 0.0001 }].map(function (p) {
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
                        value: d.filterType || 'lowpass',
                        onChange: function (e) { upd('filterType', e.target.value); },
                        className: "ml-auto px-1.5 py-0.5 rounded text-[10px] font-bold bg-white border"
                      }, ['lowpass', 'highpass', 'bandpass'].map(function (ft) { return React.createElement("option", { key: ft, value: ft }, ft); }))
                    ),
                    [{ k: 'filterCutoff', label: 'Cutoff', min: 100, max: 12000, step: 50, fmt: function (v) { return (v || 8000) > 1000 ? ((v || 8000) / 1000).toFixed(1) + 'k' : Math.round(v || 8000) + ''; } },
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
                    [{ k: 'tremoloDepth', label: 'Trem Dep', min: 0, max: 1, step: 0.01 },
                    { k: 'tremoloRate', label: 'Trem Rate', min: 0.5, max: 20, step: 0.5 },
                    { k: 'vibratoDepth', label: 'Vib Dep', min: 0, max: 1, step: 0.01 },
                    { k: 'vibratoRate', label: 'Vib Rate', min: 0.5, max: 12, step: 0.5 }].map(function (p) {
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

            // ═══════════ COMPOSE SECTION (in Play tab) ═══════════
            synthTab === 'play' && React.createElement("div", { className: "mt-3" },
              // Transport bar
              React.createElement("div", { className: "flex items-center gap-2 mb-3 bg-slate-50 rounded-xl border p-2" },
                React.createElement("button", {
                  onClick: function () { if (seqPlaying) stopSequencer(); else startSequencer(); },
                  className: "px-4 py-2 rounded-lg text-sm font-bold transition-all " + (seqPlaying ? 'bg-red-500 text-white' : 'bg-green-600 text-white hover:bg-green-700')
                }, seqPlaying ? '\u23F9 Stop' : '\u25B6 Play'),
                React.createElement("button", {
                  onClick: function () { if (metroOn) stopMetronome(); else startMetronome(); },
                  className: "px-3 py-2 rounded-lg text-xs font-bold " + (metroOn ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600')
                }, metroOn ? '\uD83E\uDD41 Metro ON' : '\uD83E\uDD41 Metronome'),
                React.createElement("div", { className: "flex items-center gap-1" },
                  React.createElement("span", { className: "text-[10px] font-bold text-slate-500" }, "BPM"),
                  React.createElement("input", {
                    type: "range", min: 60, max: 200, step: 1, value: d.bpm || 120,
                    onChange: function (e) { upd('bpm', parseInt(e.target.value)); },
                    className: "w-24 accent-purple-600"
                  }),
                  React.createElement("span", { className: "text-xs font-bold text-slate-700 w-8" }, d.bpm || 120)
                ),
                React.createElement("select", {
                  value: timeSig,
                  onChange: function (e) { upd('timeSig', e.target.value); },
                  className: "px-2 py-1 rounded text-xs font-bold bg-white border"
                }, Object.keys(TIME_SIGS).map(function (ts) { return React.createElement("option", { key: ts, value: ts }, ts); })),
                React.createElement("div", { className: "flex gap-1 ml-auto" },
                  LOOP_LENGTHS.map(function (ll) {
                    return React.createElement("button", {
                      key: ll,
                      onClick: function () { upd('loopLen', ll); var newSeq = new Array(ll).fill(0); for (var i = 0; i < Math.min(seq.length, ll); i++) newSeq[i] = seq[i]; upd('sequence', newSeq); var newDrums = Object.assign({}, drumSeq); DRUM_TYPES.forEach(function (dt) { if (newDrums[dt]) { var nd = new Array(ll).fill(0); for (var j = 0; j < Math.min(newDrums[dt].length, ll); j++) nd[j] = newDrums[dt][j]; newDrums[dt] = nd; } }); upd('drumSequence', newDrums); },
                      className: "px-1.5 py-0.5 rounded text-[10px] font-bold " + (loopLen === ll ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500')
                    }, ll);
                  })
                ),
                React.createElement("button", {
                  onClick: function () { upd('looping', !looping); },
                  className: "px-2 py-1 rounded text-xs font-bold " + (looping ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500')
                }, looping ? '\uD83D\uDD01' : '\u27A1')
              ),

              // ── Melody Sequencer Grid ──
              React.createElement("div", { className: "bg-white rounded-xl border p-3 mb-3 overflow-x-auto" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-slate-700" }, "\uD83C\uDFBC Melody"),
                  React.createElement("span", { className: "text-[9px] text-slate-400 cursor-help", title: EFFECT_TIPS.composition.text }, "\u2753"),
                  React.createElement("button", {
                    onClick: function () { upd('sequence', new Array(loopLen).fill(0)); },
                    className: "ml-auto px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }, "\uD83D\uDDD1 Clear")
                ),
                // Note name labels on left + grid
                React.createElement("div", { className: "flex" },
                  React.createElement("div", { className: "flex flex-col gap-0.5 mr-1", style: { width: '28px' } },
                    SEQ_NOTES.slice().reverse().map(function (n, ri) {
                      var origIdx = SEQ_NOTES.length - 1 - ri;
                      var isBlack = SEQ_IS_BLACK[origIdx];
                      return React.createElement("div", { key: n, className: "h-5 flex items-center justify-end pr-1 text-[8px] font-bold " + (isBlack ? 'text-slate-300 bg-slate-100 rounded-l' : 'text-slate-400') }, n);
                    })
                  ),
                  React.createElement("div", { className: "flex-1 grid gap-0.5", style: { gridTemplateColumns: 'repeat(' + loopLen + ', minmax(20px, 1fr))' } },
                    (function () {
                      var cells = [];
                      for (var row = SEQ_NOTES.length - 1; row >= 0; row--) {
                        for (var col = 0; col < loopLen; col++) {
                          (function (r, c) {
                            var noteIdx = r + 1;
                            var isActive = seq[c] === noteIdx;
                            var isCurrentStep = seqPlaying && (d.seqStep || 0) === c;
                            var beatNum = TIME_SIGS[timeSig] ? TIME_SIGS[timeSig].beats : 4;
                            var isDownbeat = c % beatNum === 0;
                            var isBlackRow = SEQ_IS_BLACK[r];
                            cells.push(React.createElement("div", {
                              key: r + '_' + c,
                              onClick: function () { var s = seq.slice(); s[c] = s[c] === noteIdx ? 0 : noteIdx; upd('sequence', s); },
                              className: "h-5 rounded-sm cursor-pointer transition-all select-none " +
                                (isActive ? 'bg-purple-500 shadow-sm' : isCurrentStep ? 'bg-purple-100 border border-purple-300' : isBlackRow ? (isDownbeat ? 'bg-slate-150 hover:bg-purple-100' : 'bg-slate-100 hover:bg-purple-50 border border-slate-150') : isDownbeat ? 'bg-slate-100 hover:bg-purple-100' : 'bg-slate-50 hover:bg-purple-50 border border-slate-100')
                            }));
                          })(row, col);
                        }
                      }
                      return cells;
                    })()
                  )
                ),
                // Step indicators below
                React.createElement("div", { className: "flex mt-1 ml-7" },
                  Array.from({ length: loopLen }, function (_, i) {
                    return React.createElement("div", {
                      key: i,
                      className: "flex-1 text-center text-[7px] font-bold " + (seqPlaying && (d.seqStep || 0) === i ? 'text-purple-600' : 'text-slate-300'),
                      style: { minWidth: '20px' }
                    }, i + 1);
                  })
                )
              ),

              // ── Drum Sequencer ──
              React.createElement("div", { className: "bg-white rounded-xl border p-3 mb-3 overflow-x-auto" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-slate-700" }, "\uD83E\uDD41 Drums"),
                  React.createElement("span", { className: "text-[9px] text-slate-400 cursor-help", title: EFFECT_TIPS.drums.text }, "\u2753"),
                  React.createElement("button", {
                    onClick: function () { upd('drumSequence', {}); },
                    className: "ml-auto px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500"
                  }, "\uD83D\uDDD1 Clear")
                ),
                DRUM_TYPES.map(function (dt, di) {
                  var row = drumSeq[dt] || new Array(loopLen).fill(0);
                  return React.createElement("div", { key: dt, className: "flex items-center gap-1 mb-0.5" },
                    React.createElement("span", { className: "text-[9px] font-bold text-slate-500 w-14 text-right pr-1" }, DRUM_LABELS[di]),
                    Array.from({ length: loopLen }, function (_, i) {
                      var isOn = row[i];
                      var isCurrentStep = seqPlaying && (d.seqStep || 0) === i;
                      var beatNum = TIME_SIGS[timeSig] ? TIME_SIGS[timeSig].beats : 4;
                      var isDownbeat = i % beatNum === 0;
                      var colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-pink-400', 'bg-amber-500'];
                      return React.createElement("div", {
                        key: i,
                        onClick: function () { toggleDrumStep(dt, i); },
                        className: "flex-1 h-5 rounded-sm cursor-pointer transition-all " +
                          (isOn ? colors[di] + ' shadow-sm' : isCurrentStep ? 'bg-slate-200' : isDownbeat ? 'bg-slate-100' : 'bg-slate-50 border border-slate-100') + ' hover:opacity-80',
                        style: { minWidth: '20px' }
                      });
                    })
                  );
                })
              ),

              // ── Musical Notation View ──
              React.createElement("div", { className: "bg-white rounded-xl border p-3 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-slate-700" }, "\uD83C\uDFBC Notation"),
                  React.createElement("span", { className: "text-[9px] text-slate-400 cursor-help", title: EFFECT_TIPS.notation.text }, "\u2753")
                ),
                React.createElement("svg", { viewBox: "0 0 " + (loopLen * 30 + 60) + " 100", className: "w-full bg-[#fefcf3] rounded-lg border border-amber-100", style: { maxHeight: '120px' } },
                  // Staff lines
                  [0, 1, 2, 3, 4].map(function (li) {
                    return React.createElement("line", { key: li, x1: 30, y1: 25 + li * 10, x2: loopLen * 30 + 40, y2: 25 + li * 10, stroke: '#d4d0c8', strokeWidth: 0.8 });
                  }),
                  // Treble clef (SVG path)
                  React.createElement("text", { x: 12, y: 60, fill: "#8b7355", style: { fontSize: '42px', fontFamily: 'serif' } }, "\uD834\uDD1E"),
                  // Time signature
                  React.createElement("text", { x: 38, y: 40, fill: "#8b7355", style: { fontSize: '14px', fontWeight: 'bold', fontFamily: 'serif' } }, timeSig.split('/')[0]),
                  React.createElement("text", { x: 38, y: 57, fill: "#8b7355", style: { fontSize: '14px', fontWeight: 'bold', fontFamily: 'serif' } }, timeSig.split('/')[1]),
                  // Notes
                  seqToNotation(seq).map(function (note, idx) {
                    var x = 55 + idx * 30;
                    var isCurrentStep = seqPlaying && (d.seqStep || 0) === idx;
                    if (note.rest) {
                      // Draw rest symbol (quarter rest)
                      return React.createElement("g", { key: idx },
                        React.createElement("text", { x: x, y: 50, textAnchor: "middle", fill: isCurrentStep ? '#7c3aed' : '#999', style: { fontSize: '16px', fontFamily: 'serif' } }, "\uD834\uDD3D"),
                        isCurrentStep && React.createElement("line", { x1: x, y1: 20, x2: x, y2: 75, stroke: '#7c3aed', strokeWidth: 1, opacity: 0.3 })
                      );
                    }
                    var stave = note.staffPos || 0;
                    var y = 65 - stave * 5;
                    return React.createElement("g", { key: idx },
                      React.createElement("ellipse", { cx: x, cy: y, rx: 5, ry: 3.5, fill: isCurrentStep ? '#7c3aed' : '#333', transform: "rotate(-10 " + x + " " + y + ")" }),
                      React.createElement("line", { x1: x + 4.5, y1: y, x2: x + 4.5, y2: y - 22, stroke: isCurrentStep ? '#7c3aed' : '#333', strokeWidth: 1.2 }),
                      y > 64 && React.createElement("line", { x1: x - 7, y1: 65, x2: x + 7, y2: 65, stroke: '#999', strokeWidth: 0.5 }),
                      React.createElement("text", { x: x, y: y + 14, textAnchor: "middle", fill: '#999', style: { fontSize: '6px' } }, note.note)
                    );
                  }),
                  // Bar lines
                  (function () {
                    var bars = [];
                    var beatsPerBar = TIME_SIGS[timeSig] ? TIME_SIGS[timeSig].beats : 4;
                    for (var bl = beatsPerBar; bl < loopLen; bl += beatsPerBar) {
                      bars.push(React.createElement("line", { key: 'bar_' + bl, x1: 55 + bl * 30 - 15, y1: 25, x2: 55 + bl * 30 - 15, y2: 65, stroke: '#aaa', strokeWidth: 0.8 }));
                    }
                    return bars;
                  })(),
                  // Playhead
                  seqPlaying && React.createElement("line", { x1: 55 + (d.seqStep || 0) * 30, y1: 20, x2: 55 + (d.seqStep || 0) * 30, y2: 75, stroke: '#7c3aed', strokeWidth: 1.5, opacity: 0.6 })
                )
              ),
              // ── Composition Save/Load ──
              React.createElement("div", { className: "bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-3 mt-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-indigo-700" }, "\uD83D\uDCBE Compositions"),
                  React.createElement("button", {
                    onClick: function () {
                      var name = prompt('Name your composition:', 'My Composition ' + new Date().toLocaleDateString());
                      if (!name) return;
                      var comp = { name: name, sequence: seq.slice(), drumSequence: JSON.parse(JSON.stringify(drumSeq)), loopLen: loopLen, bpm: d.bpm || 120, timeSig: timeSig, waveType: d.waveType || 'sine', synthEngine: synthEngine, timestamp: Date.now() };
                      var saved = JSON.parse(localStorage.getItem('alloflow_compositions') || '[]');
                      saved.push(comp); localStorage.setItem('alloflow_compositions', JSON.stringify(saved));
                      upd('compRefresh', Date.now());
                      addToast('\uD83D\uDCBE Composition "' + name + '" saved!', 'success');
                    },
                    className: "px-3 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm"
                  }, "\uD83D\uDCBE Save"),
                  React.createElement("button", { onClick: function () { setToolSnapshots(function (prev) { return prev.concat([{ id: 'sy-' + Date.now(), tool: 'synth', label: 'Composition', data: Object.assign({}, d), timestamp: Date.now() }]); }); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "px-3 py-1.5 rounded-lg text-[11px] font-bold bg-purple-100 text-purple-700 hover:bg-purple-200 transition-all" }, "\uD83D\uDCF8 Snapshot")
                ),
                // Saved compositions list
                (function () {
                  var saved = JSON.parse(localStorage.getItem('alloflow_compositions') || '[]');
                  if (saved.length === 0) return React.createElement("p", { className: "text-[10px] text-slate-400 italic" }, "No saved compositions yet. Click Save to store your work!");
                  return React.createElement("div", { className: "flex flex-col gap-1 max-h-32 overflow-y-auto" },
                    saved.map(function (comp, ci) {
                      return React.createElement("div", { key: ci, className: "flex items-center gap-2 bg-white rounded-lg px-2 py-1.5 border border-indigo-100" },
                        React.createElement("span", { className: "text-[10px] font-bold text-indigo-700 flex-1 truncate" }, comp.name),
                        React.createElement("span", { className: "text-[9px] text-slate-400" }, comp.loopLen + " steps \u00B7 " + comp.bpm + " BPM"),
                        React.createElement("button", {
                          onClick: function () {
                            upd('sequence', comp.sequence); upd('drumSequence', comp.drumSequence); upd('loopLen', comp.loopLen); upd('bpm', comp.bpm); upd('timeSig', comp.timeSig);
                            if (comp.waveType) upd('waveType', comp.waveType); if (comp.synthEngine) upd('synthEngine', comp.synthEngine);
                            addToast('\uD83C\uDFB5 Loaded "' + comp.name + '"', 'success');
                          },
                          className: "px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                        }, "\u25B6 Load"),
                        React.createElement("button", {
                          onClick: function () {
                            var s = JSON.parse(localStorage.getItem('alloflow_compositions') || '[]');
                            s.splice(ci, 1); localStorage.setItem('alloflow_compositions', JSON.stringify(s));
                            upd('compRefresh', Date.now());
                            addToast('\uD83D\uDDD1 Deleted "' + comp.name + '"', 'info');
                          },
                          className: "px-1.5 py-0.5 rounded text-[9px] font-bold text-red-400 hover:text-red-600 hover:bg-red-50"
                        }, "\u2715")
                      );
                    })
                  );
                })()
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
                  (jazzMode ? ['Maj7', 'Min7', 'Dom7', 'dim7', 'Min9', 'Maj9', '9', '13', '6', 'min6', 'add9'] : Object.keys(CHORDS).filter(function (k) { return ['Major', 'Minor', 'Diminished', 'Augmented', 'Maj7', 'Min7', 'Dom7', 'Sus2', 'Sus4', 'Power'].indexOf(k) !== -1; })).map(function (chType) {
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

            // ═══════════ TAB: OMNICHORD ═══════════
            synthTab === 'omnichord' && React.createElement("div", null,
              // Voice presets
              React.createElement("div", { className: "bg-gradient-to-r from-amber-50 to-rose-50 rounded-xl border border-amber-200 p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-amber-800" }, "\uD83C\uDF1F Omnichord"),
                  React.createElement("span", { className: "text-[10px] text-amber-600" }, "Pure sine+triangle blend")
                ),
                React.createElement("p", { className: "text-[10px] text-amber-700 mb-3 leading-relaxed" }, "The Omnichord creates warm, pure tones by blending sine and triangle waves. Choose a voice, pick a chord from the grid below, then strum the plate!"),

                // Voice selector
                React.createElement("div", { className: "flex gap-2 mb-4" },
                  [{ id: 'harp', label: '\uD83C\uDFB5 Harp', desc: 'Pure & clean' },
                  { id: 'organ', label: '\u2728 Organ', desc: 'Warm chorus' },
                  { id: 'pad', label: '\uD83C\uDF0A Pad', desc: 'Slow & lush' }].map(function (v) {
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
                  React.createElement("div", { className: "text-[10px] font-bold text-amber-700 mb-2" }, "\uD83C\uDFB6 Chord Grid \u2014 tap to play"),
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
                            strumOmnichord(root, ct.type, d.omniVoice || 'harp');
                          },
                          className: "py-2 rounded-lg text-[10px] font-bold transition-all " + (isActive ? 'bg-gradient-to-b ' + ct.color + ' text-white shadow-md scale-105' : 'bg-white border border-amber-200 text-amber-800 hover:border-amber-400 hover:bg-amber-50')
                        }, root + ct.label);
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
                      // Add octave above for more strings
                      chordData.intervals.forEach(function (intv) {
                        var nIdx = (ri + intv) % 12; var nOct = oct + 1 + Math.floor((ri + intv) / 12);
                        strings.push({ note: NOTE_NAMES[nIdx], oct: nOct, freq: noteFreq(NOTE_NAMES[nIdx], nOct) });
                      });
                      return strings.slice(0, 8).map(function (s, si) {
                        var isPlaying = (d.omniStrumActive || []).indexOf(si) !== -1;
                        return React.createElement("div", {
                          key: si,
                          onMouseDown: function () {
                            playOmnichordTone(s.freq, 'omniStr_' + si, 900, d.omniVoice || 'harp');
                            upd('omniStrumActive', (d.omniStrumActive || []).concat([si]));
                            setTimeout(function () { upd('omniStrumActive', (d.omniStrumActive || []).filter(function (x) { return x !== si; })); }, 400);
                          },
                          onMouseEnter: function (e) {
                            if (e.buttons === 1) {
                              playOmnichordTone(s.freq, 'omniStr_' + si, 900, d.omniVoice || 'harp');
                              upd('omniStrumActive', (d.omniStrumActive || []).concat([si]));
                              setTimeout(function () { upd('omniStrumActive', (d.omniStrumActive || []).filter(function (x) { return x !== si; })); }, 400);
                            }
                          },
                          className: "flex-1 rounded-lg cursor-pointer transition-all select-none " + (isPlaying ? 'bg-amber-500 shadow-lg scale-y-105' : 'bg-gradient-to-b from-amber-300 to-amber-400 hover:from-amber-400 hover:to-amber-500'),
                          style: { height: '80px', minWidth: '30px' }
                        },
                          React.createElement("div", { className: "text-center pt-1 text-[9px] font-bold " + (isPlaying ? 'text-white' : 'text-amber-800') }, s.note + s.oct),
                          React.createElement("div", { className: "w-px mx-auto h-12 " + (isPlaying ? 'bg-white' : 'bg-amber-600 opacity-40') })
                        );
                      });
                    })()
                  )
                ),

                // Full strum button
                React.createElement("button", {
                  onClick: function () { strumOmnichord(d.omniChordRoot || 'C', d.omniChordType || 'Major', d.omniVoice || 'harp'); },
                  className: "w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:from-amber-600 hover:to-rose-600 shadow-md hover:shadow-lg transition-all"
                }, "\uD83C\uDFB5 Strum " + (d.omniChordRoot || 'C') + " " + (d.omniChordType || 'Major'))
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
                          addToast(correct ? '\u2705 Correct! ' + intv.name : '\u274C It was ' + intervalGame.answer, correct ? 'success' : 'error');
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
                [{ k: 'ksBrightness', label: 'Brightness', min: 0.1, max: 1, step: 0.01 },
                { k: 'ksDamping', label: 'Sustain/Damping', min: 0.99, max: 0.9999, step: 0.0001 }].map(function (p) {
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
              React.createElement("button", { onClick: function () { setToolSnapshots(function (prev) { return prev.concat([{ id: 'sy-' + Date.now(), tool: 'synth', label: 'Synth: ' + (d.waveType || 'sine'), data: Object.assign({}, d), timestamp: Date.now() }]); }); addToast('\uD83D\uDCF8 Synthesizer snapshot saved!', 'success'); }, className: "ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")
            )
          );

        })(),

        // ═══════════════════════════════════════════════════════
        // HUMAN ANATOMY EXPLORER
        stemLabTab === 'explore' && stemLabTool === 'anatomy' && (() => {
          var d = labToolData.anatomy || {};
          var upd = function (k, v) { setLabToolData(function (p) { return Object.assign({}, p, { anatomy: Object.assign({}, p.anatomy, (function () { var o = {}; o[k] = v; return o; })()) }); }); };

          var SYSTEMS = {
            skeletal: {
              name: 'Skeletal', icon: '\uD83E\uDDB4', color: '#fef3c7', accent: '#b45309',
              desc: '206 bones \u2014 support, protection, movement, mineral storage, hematopoiesis.',
              structures: [
                { id: 'skull', name: 'Skull (Cranium)', x: 0.50, y: 0.06, v: 'b', fn: 'Protects the brain. 22 fused bones form the cranial vault (frontal, parietal\u00D72, temporal\u00D72, occipital, sphenoid, ethmoid) and facial skeleton (14 bones).', clinical: 'Fractures may cause epidural or subdural hematoma. Open fontanelles in infants allow brain growth and birth canal passage.', detail: 'Houses meninges, brain, and cranial nerve foramina. Sutures (coronal, sagittal, lambdoid) fuse by age 2.' },
                { id: 'mandible', name: 'Mandible', x: 0.50, y: 0.10, v: 'a', fn: 'Only moveable skull bone. Enables mastication, speech, and facial expression. Houses lower teeth.', clinical: 'TMJ dysfunction causes jaw pain and clicking. Mandibular fractures are the second most common facial fracture.' },
                { id: 'clavicle', name: 'Clavicle', x: 0.40, y: 0.155, v: 'a', fn: 'Horizontal strut connecting scapula to sternum. Transmits forces from upper limb to axial skeleton.', clinical: 'Most frequently fractured bone (fall on outstretched hand). Middle third fractures most common.' },
                { id: 'sternum', name: 'Sternum', x: 0.50, y: 0.22, v: 'a', fn: 'Flat bone protecting heart and great vessels. Manubrium, body, and xiphoid process. Site for bone marrow biopsy in adults.', clinical: 'Sternal fractures from blunt chest trauma (steering wheel). CPR may cause xiphoid fractures.' },
                { id: 'ribs', name: 'Ribs (1\u201312)', x: 0.58, y: 0.25, v: 'b', fn: '12 pairs: 7 true (1\u20137), 3 false (8\u201310), 2 floating (11\u201312). Protect thoracic organs and assist ventilation.', clinical: 'Flail chest: 3+ adjacent ribs fractured in 2+ places. Rib fractures 9\u201311 may lacerate spleen or liver.' },
                { id: 'scapula', name: 'Scapula', x: 0.38, y: 0.22, v: 'p', fn: 'Triangular flat bone on posterior thorax. Attachment for 17 muscles. Acromion and coracoid processes are key landmarks.', clinical: 'Winged scapula from long thoracic nerve (C5\u2013C7) palsy \u2014 serratus anterior paralysis.' },
                { id: 'humerus', name: 'Humerus', x: 0.26, y: 0.27, v: 'a', fn: 'Upper arm bone. Articulates with scapula (shoulder) and radius/ulna (elbow). Greater/lesser tubercles for rotator cuff.', clinical: 'Midshaft fracture \u2192 radial nerve palsy (wrist drop). Surgical neck fracture \u2192 axillary nerve injury.' },
                { id: 'radius', name: 'Radius', x: 0.21, y: 0.36, v: 'a', fn: 'Lateral forearm bone. Pivots around ulna for pronation/supination. Radial head at elbow, styloid process at wrist.', clinical: 'Colles fracture: distal radius fracture from FOOSH (fall on outstretched hand). "Dinner fork" deformity.' },
                { id: 'ulna', name: 'Ulna', x: 0.24, y: 0.36, v: 'a', fn: 'Medial forearm bone. Olecranon forms elbow point. Trochlear notch articulates with humerus for hinge motion.', clinical: 'Olecranon fractures from direct trauma. Monteggia fracture: proximal ulna + radial head dislocation.' },
                { id: 'carpals', name: 'Carpals', x: 0.17, y: 0.44, v: 'a', fn: '8 small bones in 2 rows: scaphoid, lunate, triquetrum, pisiform (proximal); trapezium, trapezoid, capitate, hamate (distal).', clinical: 'Scaphoid fracture: anatomical snuffbox tenderness. Avascular necrosis risk due to retrograde blood supply.' },
                { id: 'vertebral', name: 'Vertebral Column', x: 0.50, y: 0.30, v: 'p', fn: '33 vertebrae: 7 cervical, 12 thoracic, 5 lumbar, 5 sacral (fused), 4 coccygeal (fused). Protects spinal cord. Four curves provide spring-like shock absorption.', clinical: 'Herniated disc (L4\u2013L5, L5\u2013S1 most common). Scoliosis, kyphosis, lordosis. Spinal stenosis.' },
                { id: 'pelvis', name: 'Pelvis', x: 0.50, y: 0.42, v: 'b', fn: 'Ilium, ischium, pubis fused at acetabulum. Transfers weight from spine to lower limbs. Male pelvis narrower; female pelvis wider for childbirth.', clinical: 'Pelvic fractures \u2192 life-threatening hemorrhage from internal iliac vessels. Acetabular fractures require surgical fixation.' },
                { id: 'femur', name: 'Femur', x: 0.42, y: 0.57, v: 'a', fn: 'Longest, strongest bone. Head fits into acetabulum. Neck angled 125\u00B0. Supports 2\u20133\u00D7 body weight during walking.', clinical: 'Hip fractures in elderly have 20\u201330% one-year mortality. Femoral neck fractures may disrupt blood supply \u2192 avascular necrosis.' },
                { id: 'patella', name: 'Patella', x: 0.43, y: 0.66, v: 'a', fn: 'Largest sesamoid bone. Embedded in quadriceps tendon. Increases mechanical advantage of quadriceps by 30%.', clinical: 'Patellar fracture from direct trauma or forceful quad contraction. Patellofemoral syndrome ("runner\'s knee").' },
                { id: 'tibia', name: 'Tibia', x: 0.42, y: 0.76, v: 'a', fn: 'Main weight-bearing bone of the leg. Medial malleolus forms inner ankle. Tibial plateau articulates with femoral condyles.', clinical: 'Tibial plateau fractures from axial loading. Open fractures common (subcutaneous anterior surface). Compartment syndrome risk.' },
                { id: 'fibula', name: 'Fibula', x: 0.46, y: 0.76, v: 'a', fn: 'Non-weight-bearing lateral leg bone. Lateral malleolus forms outer ankle. Attachment for interosseous membrane and lateral compartment muscles.', clinical: 'Lateral malleolus fractures in ankle sprains. Maisonneuve fracture: proximal fibula + medial ankle injury.' },
                { id: 'tarsals', name: 'Tarsals', x: 0.42, y: 0.89, v: 'a', fn: '7 bones: talus, calcaneus, navicular, cuboid, 3 cuneiforms. Form longitudinal and transverse foot arches for shock absorption.', clinical: 'Calcaneal fractures from axial loading (falls from height). Talus fractures risk avascular necrosis.' },
                { id: 'sacrum', name: 'Sacrum & Coccyx', x: 0.50, y: 0.44, v: 'p', fn: 'Sacrum: 5 fused vertebrae forming posterior pelvis. Sacral canal contains cauda equina. Coccyx: vestigial tail bone.', clinical: 'Sacral fractures in high-energy trauma. Coccydynia (tailbone pain) from falls or prolonged sitting.' }
              ]
            },
            muscular: {
              name: 'Muscular', icon: '\uD83D\uDCAA', color: '#fce7f3', accent: '#be185d',
              desc: '600+ muscles \u2014 movement, posture, heat production, joint stabilization.',
              structures: [
                { id: 'deltoid', name: 'Deltoid', x: 0.30, y: 0.18, v: 'a', fn: 'Primary shoulder abductor (middle fibers). Anterior fibers flex/medially rotate; posterior fibers extend/laterally rotate the arm.', origin: 'Lateral third of clavicle, acromion, scapular spine', insertion: 'Deltoid tuberosity of humerus', clinical: 'Atrophy from axillary nerve injury (C5\u2013C6). IM injection site (avoid in children < 3 yrs).' },
                { id: 'pectoralis', name: 'Pectoralis Major', x: 0.42, y: 0.22, v: 'a', fn: 'Powerful arm adductor, flexor, and medial rotator. Clavicular head flexes; sternocostal head adducts and extends from flexed position.', origin: 'Clavicle, sternum, ribs 1\u20136, external oblique aponeurosis', insertion: 'Lateral lip of bicipital groove (humerus)', clinical: 'Rupture during bench press \u2014 "dropped pec" sign. Poland syndrome: congenital absence.' },
                { id: 'biceps', name: 'Biceps Brachii', x: 0.24, y: 0.29, v: 'a', fn: 'Powerful forearm supinator and elbow flexor. Long head stabilizes shoulder joint. Short head assists shoulder flexion.', origin: 'Short head: coracoid process; Long head: supraglenoid tubercle', insertion: 'Radial tuberosity and bicipital aponeurosis', clinical: 'Long head tendon rupture \u2192 "Popeye deformity." Biceps reflex tests C5\u2013C6 nerve roots.' },
                { id: 'triceps', name: 'Triceps Brachii', x: 0.73, y: 0.29, v: 'p', fn: 'Only elbow extensor. Three heads: long (crosses shoulder), lateral, and medial. Essential for pushing movements.', origin: 'Long: infraglenoid tubercle; Lateral/medial: posterior humerus', insertion: 'Olecranon process of ulna', clinical: 'Weakness in radial nerve palsy (C7 root). Triceps reflex tests C7\u2013C8 nerve roots.' },
                { id: 'rectus_ab', name: 'Rectus Abdominis', x: 0.50, y: 0.34, v: 'a', fn: 'Flexes trunk (sit-ups/crunches). Compresses abdominal contents. Assists forced expiration and stabilizes pelvis during walking.', origin: 'Pubic crest and symphysis', insertion: 'Xiphoid process, costal cartilages 5\u20137', clinical: 'Diastasis recti: midline separation (common in pregnancy). "Six-pack" \u2014 tendinous intersections create segmented appearance.' },
                { id: 'obliques', name: 'External Obliques', x: 0.58, y: 0.34, v: 'a', fn: 'Trunk rotation (contralateral), lateral flexion, and abdominal compression. Largest and most superficial abdominal muscle.', origin: 'External surfaces of ribs 5\u201312', insertion: 'Linea alba, pubic tubercle, iliac crest', clinical: 'Strains from twisting sports. Inguinal ligament (lower border) is key landmark for hernia surgery.' },
                { id: 'quads', name: 'Quadriceps Femoris', x: 0.42, y: 0.55, v: 'a', fn: 'Four muscles (rectus femoris, vastus lateralis/medialis/intermedius). Primary knee extensor. Rectus femoris also flexes hip.', origin: 'Rectus femoris: AIIS; Vasti: femoral shaft', insertion: 'Tibial tuberosity via patellar tendon', clinical: 'Quadriceps tendon/patellar tendon rupture. VMO weakness \u2192 patellofemoral tracking issues.' },
                { id: 'hamstrings', name: 'Hamstrings', x: 0.58, y: 0.58, v: 'p', fn: 'Three muscles (biceps femoris, semitendinosus, semimembranosus). Flex knee and extend hip. Critical for deceleration in running.', origin: 'Ischial tuberosity (all three); biceps femoris short head: linea aspera', insertion: 'Biceps: fibular head; Semi-T: pes anserinus; Semi-M: posterior medial tibial condyle', clinical: '"Pulled hamstring" \u2014 most common muscle strain in athletes. Proximal avulsion in sprinters.' },
                { id: 'gastrocnemius', name: 'Gastrocnemius', x: 0.58, y: 0.74, v: 'p', fn: 'Superficial calf muscle. Powerful plantar flexor (push-off in gait) and weak knee flexor. Two heads span the knee joint.', origin: 'Medial and lateral femoral condyles', insertion: 'Calcaneus via Achilles tendon', clinical: 'Achilles tendon rupture (positive Thompson test). "Tennis leg" \u2014 medial head tear.' },
                { id: 'trapezius', name: 'Trapezius', x: 0.50, y: 0.20, v: 'p', fn: 'Large diamond-shaped muscle. Upper fibers elevate scapula (shrug); middle fibers retract; lower fibers depress and rotate scapula upward.', origin: 'External occipital protuberance, nuchal ligament, C7\u2013T12 spinous processes', insertion: 'Lateral third of clavicle, acromion, scapular spine', clinical: 'Spinal accessory nerve (CN XI) palsy \u2192 inability to shrug shoulder. Shoulder droop.' },
                { id: 'lats', name: 'Latissimus Dorsi', x: 0.62, y: 0.32, v: 'p', fn: 'Broadest back muscle. Powerful arm extensor, adductor, and medial rotator. Key muscle in swimming, climbing, and pull-ups.', origin: 'T6\u2013T12 spinous processes, thoracolumbar fascia, iliac crest, ribs 9\u201312', insertion: 'Floor of bicipital (intertubercular) groove', clinical: 'Used in reconstructive surgery (myocutaneous flaps). Thoracodorsal nerve (C6\u2013C8) innervation.' },
                { id: 'glutes', name: 'Gluteus Maximus', x: 0.50, y: 0.44, v: 'p', fn: 'Largest muscle in the body. Powerful hip extensor and lateral rotator. Essential for standing from seated position, climbing stairs, running.', origin: 'Posterior ilium, sacrum, coccyx, sacrotuberous ligament', insertion: 'IT band and gluteal tuberosity of femur', clinical: 'Weakness \u2192 Trendelenburg gait (compensatory trunk lean). Inferior gluteal nerve (L5\u2013S2).' },
                { id: 'sartorius', name: 'Sartorius', x: 0.38, y: 0.52, v: 'a', fn: 'Longest muscle in the body. Crosses hip and knee. Produces the "tailor\'s position" (cross-legged sitting): hip flexion, abduction, lateral rotation + knee flexion.', origin: 'Anterior superior iliac spine (ASIS)', insertion: 'Pes anserinus (medial proximal tibia)', clinical: 'Pes anserinus bursitis causes medial knee pain. Landmark for femoral triangle.' },
                { id: 'tibialis', name: 'Tibialis Anterior', x: 0.40, y: 0.76, v: 'a', fn: 'Primary ankle dorsiflexor and foot inverter. Prevents foot slap during heel strike. Supports medial longitudinal arch.', origin: 'Lateral tibial condyle, upper 2/3 of lateral tibial surface', insertion: 'Medial cuneiform, base of 1st metatarsal', clinical: 'Foot drop from deep peroneal nerve injury. Shin splints (medial tibial stress syndrome).' },
                { id: 'soleus', name: 'Soleus', x: 0.58, y: 0.78, v: 'p', fn: 'Deep calf muscle beneath gastrocnemius. Plantar flexion (postural muscle \u2014 prevents forward falling while standing). Does not cross knee.', origin: 'Soleal line and posterior proximal fibula', insertion: 'Calcaneus via Achilles tendon', clinical: 'Soleus muscle pump aids venous return. DVT risk when immobile (long flights). Soleus strain in runners.' }
              ]
            },
            circulatory: {
              name: 'Circulatory', icon: '\u2764\uFE0F', color: '#fee2e2', accent: '#dc2626',
              desc: 'Heart, 60,000 miles of vessels, 5L of blood \u2014 delivers O\u2082, nutrients, hormones; removes waste.',
              structures: [
                { id: 'heart', name: 'Heart', x: 0.48, y: 0.24, v: 'a', fn: 'Muscular pump. 4 chambers: RA/RV (pulmonary circuit), LA/LV (systemic circuit). Beats ~100,000\u00D7/day, pumps ~5L/min at rest.', clinical: 'MI (heart attack): coronary artery occlusion. Heart failure, arrhythmias, valvular disease. Leading cause of death worldwide.' },
                { id: 'aorta', name: 'Aorta', x: 0.52, y: 0.22, v: 'a', fn: 'Largest artery. Ascending aorta \u2192 aortic arch (brachiocephalic, left common carotid, left subclavian) \u2192 descending thoracic \u2192 abdominal aorta.', clinical: 'Aortic aneurysm (abdominal > 5.5cm \u2192 surgical repair). Aortic dissection: tearing chest pain, emergency.' },
                { id: 'sup_vena', name: 'Superior Vena Cava', x: 0.54, y: 0.20, v: 'a', fn: 'Returns deoxygenated blood from head, neck, upper limbs, and thorax to the right atrium. Formed by union of brachiocephalic veins.', clinical: 'SVC syndrome: obstruction (often by lung cancer/lymphoma) causes facial swelling, dyspnea, distended neck veins.' },
                { id: 'inf_vena', name: 'Inferior Vena Cava', x: 0.52, y: 0.36, v: 'a', fn: 'Largest vein. Returns blood from lower body to right atrium. Formed at L5 by union of common iliac veins. Passes through diaphragm at T8.', clinical: 'IVC filter placement for recurrent PE. IVC compression during pregnancy (supine hypotension syndrome).' },
                { id: 'pulm_art', name: 'Pulmonary Arteries', x: 0.46, y: 0.22, v: 'a', fn: 'Carry deoxygenated blood from RV to lungs. Only arteries that carry deoxygenated blood. Bifurcates at T5.', clinical: 'Pulmonary embolism (PE): clot from DVT lodges in pulmonary arteries. Saddle PE is life-threatening.' },
                { id: 'carotid', name: 'Carotid Arteries', x: 0.44, y: 0.12, v: 'a', fn: 'Common carotid bifurcates at C4 into internal (brain) and external (face/scalp). Internal carotid supplies anterior 2/3 of brain.', clinical: 'Carotid stenosis causes stroke/TIA. Carotid endarterectomy for >70% stenosis. Carotid body senses O\u2082/CO\u2082/pH.' },
                { id: 'jugular', name: 'Jugular Veins', x: 0.56, y: 0.12, v: 'a', fn: 'Internal jugular drains brain and face (runs with carotid in carotid sheath). External jugular visible on neck surface.', clinical: 'JVD (jugular venous distension) \u2192 sign of right heart failure, cardiac tamponade, tension pneumothorax.' },
                { id: 'coronary', name: 'Coronary Arteries', x: 0.46, y: 0.25, v: 'a', fn: 'LAD (left anterior descending) supplies anterior LV wall and septum ("widow maker"). LCx supplies lateral LV. RCA supplies RV and inferior LV.', clinical: 'LAD occlusion: anterior STEMI (most dangerous). RCA occlusion: inferior MI with possible heart block.' },
                { id: 'femoral_a', name: 'Femoral Artery', x: 0.44, y: 0.48, v: 'a', fn: 'Main blood supply to lower limb. Palpable at mid-inguinal point (midway ASIS to pubic symphysis). Becomes popliteal artery behind knee.', clinical: 'Femoral artery catheterization for angiography. Femoral artery laceration \u2192 rapid exsanguination.' },
                { id: 'brachial', name: 'Brachial Artery', x: 0.28, y: 0.30, v: 'a', fn: 'Continuation of axillary artery. Runs medially in arm. Blood pressure measured here (antecubital fossa). Bifurcates into radial and ulnar arteries.', clinical: 'BP cuff occludes brachial artery (Korotkoff sounds). Supracondylar fracture may damage brachial artery \u2192 Volkmann contracture.' },
                { id: 'portal', name: 'Hepatic Portal Vein', x: 0.52, y: 0.32, v: 'a', fn: 'Carries nutrient-rich blood from GI tract and spleen to liver for processing. Formed by superior mesenteric and splenic veins. Portal circulation is unique.', clinical: 'Portal hypertension in cirrhosis \u2192 esophageal varices, caput medusae, hemorrhoids, splenomegaly.' }
              ]
            },
            nervous: {
              name: 'Nervous', icon: '\u26A1', color: '#ede9fe', accent: '#7c3aed',
              desc: 'CNS (brain + spinal cord) and PNS (31 spinal nerve pairs, 12 cranial nerve pairs, autonomic NS).',
              structures: [
                { id: 'brain', name: 'Brain', x: 0.50, y: 0.05, v: 'b', fn: '~86 billion neurons. Cerebrum (cognition, sensation, motor), cerebellum (coordination), brainstem (vital functions). Weighs ~1.4 kg, uses 20% of O\u2082.', clinical: 'Stroke (ischemic/hemorrhagic), TBI, neurodegenerative diseases (Alzheimer, Parkinson), brain tumors, epilepsy.' },
                { id: 'spinal_cord', name: 'Spinal Cord', x: 0.50, y: 0.30, v: 'p', fn: 'Extends from foramen magnum to L1\u2013L2 (conus medullaris). Conducts sensory/motor signals. 31 segments, each with dorsal (sensory) and ventral (motor) roots.', clinical: 'Spinal cord injury: above C4 \u2192 quadriplegia + ventilator. Complete transection \u2192 loss of motor/sensory below level.' },
                { id: 'vagus', name: 'Vagus Nerve (CN X)', x: 0.44, y: 0.14, v: 'a', fn: 'Longest cranial nerve. Parasympathetic innervation to thoracic and abdominal viscera. Slows heart rate, increases GI motility, controls laryngeal muscles.', clinical: 'Vagal stimulation: carotid sinus massage, Valsalva maneuver for SVT. Vagus nerve stimulator for epilepsy/depression. Recurrent laryngeal nerve injury \u2192 hoarseness.' },
                { id: 'sciatic', name: 'Sciatic Nerve', x: 0.55, y: 0.50, v: 'p', fn: 'Largest/longest nerve in body. L4\u2013S3 roots. Exits pelvis through greater sciatic foramen below piriformis. Divides into tibial and common peroneal nerves above knee.', clinical: 'Sciatica: radiculopathy from herniated disc (L4\u2013S1). Piriformis syndrome mimics sciatica. IM injection site avoidance.' },
                { id: 'brachial_plexus', name: 'Brachial Plexus', x: 0.34, y: 0.16, v: 'a', fn: 'C5\u2013T1 nerve roots form trunks, divisions, cords, branches. Innervates entire upper limb. "Robert Taylor Drinks Cold Beer" (roots, trunks, divisions, cords, branches).', clinical: 'Erb-Duchenne palsy (C5\u2013C6): "waiter\'s tip" position. Klumpke palsy (C8\u2013T1): claw hand. Birth injuries, motorcycle accidents.' },
                { id: 'median', name: 'Median Nerve', x: 0.22, y: 0.38, v: 'a', fn: 'C5\u2013T1 via lateral and medial cords. Motor: forearm pronators, wrist/finger flexors, thenar muscles. Sensory: palmar lateral 3.5 digits.', clinical: 'Carpal tunnel syndrome: median nerve compression under flexor retinaculum. Hand of benediction (can\'t flex index/middle fingers).' },
                { id: 'ulnar_n', name: 'Ulnar Nerve', x: 0.78, y: 0.34, v: 'a', fn: 'C8\u2013T1 via medial cord. Motor: intrinsic hand muscles (interossei, hypothenar), FCU, medial FDP. Sensory: medial 1.5 digits.', clinical: '"Funny bone" \u2014 vulnerable at medial epicondyle. Cubital tunnel syndrome. Claw hand deformity. Froment sign.' },
                { id: 'femoral_n', name: 'Femoral Nerve', x: 0.40, y: 0.48, v: 'a', fn: 'L2\u2013L4 via lumbar plexus. Motor: quadriceps (knee extension), iliacus, sartorius. Sensory: anterior thigh, medial leg (saphenous branch).', clinical: 'Femoral neuropathy: difficulty climbing stairs, absent knee jerk. L4 radiculopathy mimics. Femoral nerve block for hip surgery.' },
                { id: 'sympathetic', name: 'Sympathetic Chain', x: 0.54, y: 0.30, v: 'p', fn: 'Paired paravertebral ganglia from C1 to coccyx. "Fight or flight": increases HR, dilates pupils, bronchodilation, vasoconstriction, inhibits GI.', clinical: 'Horner syndrome (sympathetic disruption): miosis, ptosis, anhidrosis. Sympathectomy for hyperhidrosis.' },
                { id: 'cranial_n', name: 'Cranial Nerves (I\u2013XII)', x: 0.50, y: 0.08, v: 'a', fn: '12 pairs: olfactory, optic, oculomotor, trochlear, trigeminal, abducens, facial, vestibulocochlear, glossopharyngeal, vagus, spinal accessory, hypoglossal.', clinical: 'CN III palsy: "down and out" eye, ptosis, dilated pupil. CN VII (Bell palsy): facial droop. CN XII: tongue deviates toward lesion.' }
              ]
            },
            lymphatic: {
              name: 'Lymphatic', icon: '\uD83D\uDFE2', color: '#dcfce7', accent: '#16a34a',
              desc: 'Returns interstitial fluid, absorbs dietary fat, immune surveillance \u2014 600\u2013700 lymph nodes, thymus, spleen.',
              structures: [
                { id: 'thymus', name: 'Thymus', x: 0.50, y: 0.19, v: 'a', fn: 'Primary lymphoid organ in anterior mediastinum. T-cell maturation and positive/negative selection. Largest in childhood, involutes after puberty (replaced by fat).', clinical: 'Thymoma: associated with myasthenia gravis (anti-AChR antibodies). DiGeorge syndrome: thymic aplasia \u2192 T-cell deficiency.' },
                { id: 'spleen', name: 'Spleen', x: 0.58, y: 0.30, v: 'a', fn: 'Largest lymphoid organ. Filters blood: removes old RBCs (red pulp), mounts immune responses to blood-borne antigens (white pulp). Stores 1/3 of platelets.', clinical: 'Splenomegaly in mono, malaria, leukemia. Splenic rupture from trauma \u2192 emergency splenectomy. Post-splenectomy: encapsulated bacteria risk.' },
                { id: 'tonsils', name: 'Tonsils (Waldeyer Ring)', x: 0.50, y: 0.11, v: 'a', fn: 'Pharyngeal (adenoids), palatine, tubal, and lingual tonsils form a lymphoid ring at the oropharyngeal entrance. First line of defense against inhaled/ingested pathogens.', clinical: 'Tonsillitis, peritonsillar abscess ("quinsy"). Adenoid hypertrophy \u2192 mouth breathing, sleep apnea in children.' },
                { id: 'cervical_ln', name: 'Cervical Lymph Nodes', x: 0.56, y: 0.13, v: 'a', fn: 'Drain head and neck including scalp, face, oral cavity, pharynx. Deep cervical chain runs along IJV. Virchow node (left supraclavicular) drains thoracic duct.', clinical: 'Enlarged: infection, lymphoma, metastatic cancer. Virchow node enlargement \u2192 suspect GI malignancy (Troisier sign).' },
                { id: 'axillary_ln', name: 'Axillary Lymph Nodes', x: 0.32, y: 0.22, v: 'a', fn: '5 groups draining upper limb, breast, chest wall. Sentinel lymph node biopsy in breast cancer staging.', clinical: 'Breast cancer staging depends on axillary LN involvement. Axillary dissection may cause lymphedema of arm.' },
                { id: 'inguinal_ln', name: 'Inguinal Lymph Nodes', x: 0.44, y: 0.44, v: 'a', fn: 'Superficial group drains lower limb, perineum, lower abdominal wall, external genitalia. Deep group drains along femoral vein.', clinical: 'Lymphadenopathy in STIs, lower limb infections, lymphoma. Buboes in lymphogranuloma venereum, plague.' },
                { id: 'thoracic_duct', name: 'Thoracic Duct', x: 0.48, y: 0.26, v: 'p', fn: 'Main lymphatic channel (40 cm). Drains \u00BE of body (everything except right upper quadrant). Empties into left subclavian/internal jugular junction (left venous angle).', clinical: 'Chylothorax from thoracic duct injury (trauma, surgery). Milky pleural effusion with high triglycerides.' },
                { id: 'bone_marrow', name: 'Bone Marrow', x: 0.42, y: 0.57, v: 'a', fn: 'Primary lymphoid organ. Red marrow produces all blood cells (hematopoiesis) including lymphocyte precursors. Adults: mainly in axial skeleton, proximal femur/humerus.', clinical: 'Leukemia (malignant WBC proliferation). Aplastic anemia. Bone marrow biopsy from posterior iliac crest. Bone marrow transplant.' }
              ]
            },
            organs: {
              name: 'Organ Systems', icon: '\uD83C\uDFE5', color: '#e0f2fe', accent: '#0284c7',
              desc: 'Major visceral organs \u2014 respiration, digestion, filtration, endocrine regulation.',
              structures: [
                { id: 'lungs', name: 'Lungs', x: 0.42, y: 0.24, v: 'a', fn: 'Right lung: 3 lobes (superior, middle, inferior). Left lung: 2 lobes + lingula (cardiac notch). ~300 million alveoli provide ~70 m\u00B2 surface area for gas exchange.', clinical: 'Pneumonia, COPD, asthma, lung cancer (#1 cancer killer). Pneumothorax. Right bronchus more vertical \u2192 foreign body aspiration.' },
                { id: 'liver', name: 'Liver', x: 0.56, y: 0.30, v: 'a', fn: 'Largest internal organ (1.5 kg). 2 anatomical lobes (right larger). Functions: bile production, detoxification, protein synthesis (albumin, clotting factors), glycogen storage, drug metabolism.', clinical: 'Hepatitis (viral A/B/C), cirrhosis, hepatocellular carcinoma. Liver failure: jaundice, coagulopathy, encephalopathy. Transplantation.' },
                { id: 'stomach', name: 'Stomach', x: 0.55, y: 0.33, v: 'a', fn: 'J-shaped muscular sac. Regions: cardia, fundus, body, antrum, pylorus. Produces HCl (pH 1\u20132), pepsin, intrinsic factor (B12 absorption). Capacity ~1L.', clinical: 'Peptic ulcer disease (H. pylori, NSAIDs). Gastric cancer. GERD. Gastrectomy may cause dumping syndrome, B12 deficiency.' },
                { id: 'kidneys', name: 'Kidneys', x: 0.58, y: 0.36, v: 'p', fn: 'Bean-shaped, retroperitoneal at T12\u2013L3. Each has ~1 million nephrons. Filter 180L/day, produce 1\u20132L urine. Regulate fluid balance, electrolytes, acid-base, blood pressure (RAAS).', clinical: 'CKD, nephrotic/nephritic syndrome, kidney stones, renal cell carcinoma. Right kidney lower due to liver. Dialysis when GFR <15.' },
                { id: 'sm_intestine', name: 'Small Intestine', x: 0.50, y: 0.38, v: 'a', fn: '6m long: duodenum (25cm, C-shaped), jejunum (2.5m), ileum (3.5m). Primary site of nutrient absorption. Villi and microvilli increase surface area to ~200 m\u00B2.', clinical: 'Celiac disease (gluten sensitivity), Crohn disease (often terminal ileum), SBO (adhesions #1 cause), duodenal ulcers.' },
                { id: 'lg_intestine', name: 'Large Intestine', x: 0.50, y: 0.40, v: 'a', fn: '1.5m: cecum, ascending, transverse, descending, sigmoid colon, rectum. Absorbs water and electrolytes. Houses gut microbiome (~100 trillion bacteria). Forms and stores feces.', clinical: 'Colorectal cancer (3rd most common cancer). Diverticulosis/diverticulitis. Ulcerative colitis. Appendicitis (McBurney point).' },
                { id: 'pancreas', name: 'Pancreas', x: 0.52, y: 0.34, v: 'a', fn: 'Retroperitoneal organ. Exocrine (98%): digestive enzymes (lipase, amylase, trypsinogen) and bicarbonate. Endocrine (2%): islets of Langerhans \u2014 insulin (\u03B2), glucagon (\u03B1).', clinical: 'Acute pancreatitis (gallstones, alcohol). Pancreatic cancer (poor prognosis, 5-yr survival <10%). Type 1 diabetes (autoimmune \u03B2-cell destruction).' },
                { id: 'gallbladder', name: 'Gallbladder', x: 0.55, y: 0.31, v: 'a', fn: 'Pear-shaped sac on inferior liver surface. Stores and concentrates bile (5\u201310\u00D7). Contracts in response to CCK after fatty meals to release bile into duodenum.', clinical: 'Cholelithiasis (gallstones, 10\u201315% of adults). Cholecystitis. Murphy sign. Cholecystectomy is one of most common surgeries.' },
                { id: 'bladder', name: 'Urinary Bladder', x: 0.50, y: 0.44, v: 'a', fn: 'Distensible muscular sac. Stores 400\u2013600mL urine. Detrusor muscle contracts for micturition. Internal sphincter (involuntary), external sphincter (voluntary, pudendal nerve).', clinical: 'UTIs (more common in females due to short urethra). Bladder cancer (painless hematuria). Neurogenic bladder in spinal cord injury.' },
                { id: 'diaphragm', name: 'Diaphragm', x: 0.50, y: 0.27, v: 'a', fn: 'Primary muscle of respiration. Dome-shaped, separates thorax from abdomen. Contracts and flattens during inspiration \u2192 negative intrathoracic pressure. Three openings: T8 (IVC), T10 (esophagus), T12 (aorta).', clinical: 'Hiatal hernia (stomach through esophageal hiatus). Diaphragmatic paralysis from phrenic nerve injury (C3\u2013C5). "C3, 4, 5 keeps the diaphragm alive."' },
                { id: 'thyroid', name: 'Thyroid Gland', x: 0.50, y: 0.135, v: 'a', fn: 'Butterfly-shaped, anterior neck at C5\u2013T1. Produces T3/T4 (metabolism, growth, development) and calcitonin (lowers blood calcium). Requires iodine.', clinical: 'Hypothyroidism (Hashimoto): fatigue, weight gain, cold intolerance. Hyperthyroidism (Graves): weight loss, tremor, exophthalmos. Thyroid nodules/cancer.' },
                { id: 'adrenals', name: 'Adrenal Glands', x: 0.56, y: 0.34, v: 'p', fn: 'Suprarenal glands. Cortex (3 zones): zona glomerulosa (aldosterone), zona fasciculata (cortisol), zona reticularis (androgens). Medulla: epinephrine/norepinephrine.', clinical: 'Addison disease (cortical insufficiency): hypotension, hyperpigmentation. Cushing syndrome (cortisol excess). Pheochromocytoma (medullary tumor \u2192 episodic HTN).' }
              ]
            }
          };

          var sysKey = d.system || 'skeletal';
          var sys = SYSTEMS[sysKey];
          var view = d.view || 'anterior';
          var searchTerm = (d.search || '').toLowerCase();
          var complexity = d.complexity || 3;

          // Complexity level lookup — structures shown at each tier
          var ELEMENTARY_IDS = ['skull', 'ribs', 'femur', 'humerus', 'vertebral', 'pelvis', 'biceps', 'quads', 'heart', 'brain', 'lungs', 'stomach', 'kidneys', 'spinal_cord', 'deltoid', 'hamstrings', 'gastrocnemius', 'aorta', 'carotid', 'sciatic', 'liver', 'diaphragm', 'spleen', 'thymus'];
          var MIDDLE_IDS = ELEMENTARY_IDS.concat(['mandible', 'clavicle', 'sternum', 'scapula', 'radius', 'ulna', 'tibia', 'fibula', 'patella', 'tarsals', 'carpals', 'sacrum', 'pectoralis', 'triceps', 'rectus_ab', 'obliques', 'trapezius', 'lats', 'glutes', 'tibialis', 'soleus', 'sartorius', 'sup_vena', 'inf_vena', 'pulm_art', 'jugular', 'coronary', 'femoral_a', 'brachial', 'portal', 'vagus', 'brachial_plexus', 'median', 'ulnar_n', 'femoral_n', 'cranial_n', 'sympathetic', 'sm_intestine', 'lg_intestine', 'pancreas', 'gallbladder', 'bladder', 'thyroid', 'adrenals', 'cervical_ln', 'axillary_ln', 'inguinal_ln', 'thoracic_duct', 'bone_marrow']);
          function passesComplexity(st) {
            if (complexity >= 3) return true;
            if (complexity === 1) return ELEMENTARY_IDS.indexOf(st.id) !== -1;
            return MIDDLE_IDS.indexOf(st.id) !== -1;
          }

          var allStructures = sys.structures;
          var viewFiltered = allStructures.filter(function (s) { return (s.v === 'b' || s.v === (view === 'anterior' ? 'a' : 'p')) && passesComplexity(s); });
          var filtered = searchTerm ? viewFiltered.filter(function (s) { return s.name.toLowerCase().indexOf(searchTerm) >= 0 || s.fn.toLowerCase().indexOf(searchTerm) >= 0; }) : viewFiltered;
          var sel = d.selectedStructure ? allStructures.find(function (s) { return s.id === d.selectedStructure; }) : null;

          // Quiz logic — options memoized in state to prevent re-shuffle on render
          var quizPool = allStructures.filter(function (s) { return s.fn && passesComplexity(s); });
          var quizQ = d.quizMode && quizPool.length > 0 ? quizPool[d.quizIdx % quizPool.length] : null;
          var quizOptions = d._quizOpts || [];
          if (quizQ && d._quizOptsFor !== (sysKey + '|' + d.quizIdx)) {
            var wrong = quizPool.filter(function (s) { return s.id !== quizQ.id; });
            var shuffled = wrong.sort(function () { return Math.random() - 0.5; }).slice(0, 3);
            quizOptions = shuffled.concat([quizQ]).sort(function () { return Math.random() - 0.5; });
            upd('_quizOpts', quizOptions);
            upd('_quizOptsFor', sysKey + '|' + d.quizIdx);
          }

          // Body drawing on canvas
          var canvasRef = function (canvas) {
            if (!canvas) return;
            if (canvas._anatomyDrawn === sysKey + view + d.selectedStructure + searchTerm) return;
            canvas._anatomyDrawn = sysKey + view + d.selectedStructure + searchTerm;
            var ctx = canvas.getContext('2d');
            var W = canvas.width, H = canvas.height;
            ctx.clearRect(0, 0, W, H);

            // Body silhouette
            ctx.save();
            ctx.fillStyle = '#f5f0eb';
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1.5;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            // Head
            ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.065, W * 0.055, H * 0.045, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            // Neck
            ctx.beginPath(); ctx.rect(W * 0.47, H * 0.1, W * 0.06, H * 0.03); ctx.fill(); ctx.stroke();
            // Torso
            ctx.beginPath();
            ctx.moveTo(W * 0.32, H * 0.135); ctx.lineTo(W * 0.68, H * 0.135);
            ctx.quadraticCurveTo(W * 0.70, H * 0.22, W * 0.64, H * 0.40);
            ctx.lineTo(W * 0.57, H * 0.43); ctx.lineTo(W * 0.43, H * 0.43);
            ctx.lineTo(W * 0.36, H * 0.40);
            ctx.quadraticCurveTo(W * 0.30, H * 0.22, W * 0.32, H * 0.135);
            ctx.fill(); ctx.stroke();
            // Left arm
            ctx.beginPath();
            ctx.moveTo(W * 0.32, H * 0.14); ctx.quadraticCurveTo(W * 0.22, H * 0.20, W * 0.19, H * 0.30);
            ctx.quadraticCurveTo(W * 0.16, H * 0.38, W * 0.14, H * 0.45);
            ctx.lineTo(W * 0.18, H * 0.45); ctx.quadraticCurveTo(W * 0.20, H * 0.38, W * 0.23, H * 0.30);
            ctx.quadraticCurveTo(W * 0.26, H * 0.22, W * 0.35, H * 0.14);
            ctx.fill(); ctx.stroke();
            // Right arm
            ctx.beginPath();
            ctx.moveTo(W * 0.68, H * 0.14); ctx.quadraticCurveTo(W * 0.78, H * 0.20, W * 0.81, H * 0.30);
            ctx.quadraticCurveTo(W * 0.84, H * 0.38, W * 0.86, H * 0.45);
            ctx.lineTo(W * 0.82, H * 0.45); ctx.quadraticCurveTo(W * 0.80, H * 0.38, W * 0.77, H * 0.30);
            ctx.quadraticCurveTo(W * 0.74, H * 0.22, W * 0.65, H * 0.14);
            ctx.fill(); ctx.stroke();
            // Left leg
            ctx.beginPath();
            ctx.moveTo(W * 0.43, H * 0.43); ctx.quadraticCurveTo(W * 0.38, H * 0.56, W * 0.36, H * 0.68);
            ctx.quadraticCurveTo(W * 0.35, H * 0.78, W * 0.34, H * 0.88);
            ctx.lineTo(W * 0.30, H * 0.93); ctx.lineTo(W * 0.40, H * 0.93);
            ctx.lineTo(W * 0.42, H * 0.88); ctx.quadraticCurveTo(W * 0.43, H * 0.78, W * 0.44, H * 0.68);
            ctx.quadraticCurveTo(W * 0.46, H * 0.56, W * 0.50, H * 0.43);
            ctx.fill(); ctx.stroke();
            // Right leg
            ctx.beginPath();
            ctx.moveTo(W * 0.57, H * 0.43); ctx.quadraticCurveTo(W * 0.62, H * 0.56, W * 0.64, H * 0.68);
            ctx.quadraticCurveTo(W * 0.65, H * 0.78, W * 0.66, H * 0.88);
            ctx.lineTo(W * 0.70, H * 0.93); ctx.lineTo(W * 0.60, H * 0.93);
            ctx.lineTo(W * 0.58, H * 0.88); ctx.quadraticCurveTo(W * 0.57, H * 0.78, W * 0.56, H * 0.68);
            ctx.quadraticCurveTo(W * 0.54, H * 0.56, W * 0.50, H * 0.43);
            ctx.fill(); ctx.stroke();
            ctx.restore();

            // Draw structure markers
            filtered.forEach(function (st) {
              var px = st.x * W, py = st.y * H;
              var isSel = sel && sel.id === st.id;
              var r = isSel ? 9 : 5;
              // Glow for selected
              if (isSel) {
                ctx.save();
                ctx.shadowColor = sys.accent;
                ctx.shadowBlur = 12;
                ctx.beginPath(); ctx.arc(px, py, r + 2, 0, Math.PI * 2);
                ctx.fillStyle = sys.accent + '40';
                ctx.fill();
                ctx.restore();
              }
              ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
              ctx.fillStyle = isSel ? sys.accent : sys.accent + '99';
              ctx.fill();
              ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
              // Label for selected
              if (isSel) {
                ctx.save();
                ctx.font = 'bold 10px Inter, system-ui, sans-serif';
                ctx.textAlign = px > W * 0.5 ? 'right' : 'left';
                ctx.fillStyle = sys.accent;
                var lx = px > W * 0.5 ? px - 14 : px + 14;
                ctx.fillText(st.name, lx, py + 3);
                ctx.restore();
              }
            });

            // View label
            ctx.save();
            ctx.font = 'bold 10px Inter, system-ui, sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.textAlign = 'center';
            ctx.fillText(view === 'anterior' ? 'ANTERIOR VIEW' : 'POSTERIOR VIEW', W * 0.5, H - 6);
            ctx.restore();
          };

          // Canvas click handler
          var handleClick = function (e) {
            var rect = e.target.getBoundingClientRect();
            var cx = (e.clientX - rect.left) / rect.width;
            var cy = (e.clientY - rect.top) / rect.height;
            var closest = null, minD = 0.06;
            filtered.forEach(function (st) {
              var dist = Math.sqrt(Math.pow(st.x - cx, 2) + Math.pow(st.y - cy, 2));
              if (dist < minD) { minD = dist; closest = st; }
            });
            if (closest) upd('selectedStructure', closest.id);
          };

          return React.createElement("div", { className: "max-w-4xl mx-auto animate-in fade-in duration-200" },
            // Header
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: function () { setStemLabTool(null); }, className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("div", null,
                React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83E\uDEC0 Human Anatomy Explorer"),
                React.createElement("p", { className: "text-xs text-slate-400" }, sys.desc)
              )
            ),
            // System tabs
            React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-3" },
              Object.keys(SYSTEMS).map(function (key) {
                var s = SYSTEMS[key];
                return React.createElement("button", {
                  key: key,
                  onClick: function () { upd('system', key); upd('selectedStructure', null); upd('quizMode', false); upd('search', ''); },
                  className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (sysKey === key ? 'text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'),
                  style: sysKey === key ? { background: s.accent } : {}
                }, s.icon + ' ' + s.name);
              })
            ),
            // Controls: view toggle, search, quiz
            React.createElement("div", { className: "flex items-center gap-2 mb-3 flex-wrap" },
              React.createElement("div", { className: "flex rounded-lg border border-slate-200 overflow-hidden" },
                ['anterior', 'posterior'].map(function (v) {
                  return React.createElement("button", {
                    key: v,
                    onClick: function () { upd('view', v); upd('selectedStructure', null); },
                    className: "px-3 py-1 text-xs font-bold transition-all " + (view === v ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50')
                  }, v.charAt(0).toUpperCase() + v.slice(1));
                })
              ),
              React.createElement("input", {
                type: "text", placeholder: "\uD83D\uDD0D Search structures...",
                value: d.search || '',
                onChange: function (e) { upd('search', e.target.value); },
                className: "flex-1 min-w-[140px] px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-300 outline-none"
              }),
              React.createElement("button", {
                onClick: function () { upd('quizMode', !d.quizMode); upd('quizIdx', 0); upd('quizScore', 0); upd('quizFeedback', null); },
                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.quizMode ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100')
              }, d.quizMode ? '\u2705 Quiz On' : '\uD83E\uDDEA Quiz'),
              React.createElement("div", { className: "flex rounded-lg border border-slate-200 overflow-hidden" },
                [{ v: 1, label: 'K\u20135', tip: 'Elementary' }, { v: 2, label: '6\u20138', tip: 'Middle' }, { v: 3, label: '9\u201312+', tip: 'Advanced' }].map(function (lv) {
                  return React.createElement("button", {
                    key: lv.v, title: lv.tip + ' level',
                    onClick: function () { upd('complexity', lv.v); upd('selectedStructure', null); },
                    className: "px-2 py-1 text-[10px] font-bold transition-all " + (complexity === lv.v ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50')
                  }, lv.label);
                })
              ),
              React.createElement("span", { className: "text-[10px] text-slate-400 font-bold" }, filtered.length + ' structures')
            ),
            // Main content: canvas + detail panel
            React.createElement("div", { className: "flex gap-4", style: { alignItems: 'flex-start' } },
              // Canvas
              React.createElement("div", { className: "flex-shrink-0" },
                React.createElement("canvas", {
                  ref: canvasRef, width: 280, height: 480,
                  onClick: handleClick,
                  className: "rounded-xl border-2 cursor-crosshair",
                  style: { borderColor: sys.accent + '30', background: '#fafaf9' }
                })
              ),
              // Right panel
              React.createElement("div", { className: "flex-1 min-w-0" },
                d.quizMode ? (
                  // Quiz panel
                  quizQ ? React.createElement("div", { className: "bg-white rounded-xl border-2 border-green-200 p-4 space-y-3" },
                    React.createElement("div", { className: "flex items-center justify-between mb-2" },
                      React.createElement("h4", { className: "font-bold text-green-800 text-sm" }, "\uD83E\uDDEA Anatomy Quiz"),
                      React.createElement("span", { className: "text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700" }, "\u2B50 " + (d.quizScore || 0) + "/" + Math.min((d.quizIdx || 0) + 1, quizPool.length))
                    ),
                    React.createElement("p", { className: "text-sm text-slate-800 font-bold leading-relaxed" }, "Which structure has this function?"),
                    React.createElement("p", { className: "text-xs text-slate-600 bg-slate-50 rounded-lg p-3 leading-relaxed italic" }, quizQ.fn.substring(0, 120) + (quizQ.fn.length > 120 ? '...' : '')),
                    React.createElement("div", { className: "grid grid-cols-1 gap-1.5" },
                      quizOptions.map(function (opt) {
                        var fb = d.quizFeedback;
                        var isCorrect = opt.id === quizQ.id;
                        var wasChosen = fb && fb.chosen === opt.id;
                        var showResult = fb !== null && fb !== undefined;
                        return React.createElement("button", {
                          key: opt.id,
                          disabled: showResult,
                          onClick: function () {
                            var correct = opt.id === quizQ.id;
                            upd('quizFeedback', { chosen: opt.id, correct: correct });
                            if (correct) upd('quizScore', (d.quizScore || 0) + 1);
                          },
                          className: "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all border-2 " +
                            (showResult && isCorrect ? 'border-green-400 bg-green-50 text-green-800' :
                              showResult && wasChosen && !isCorrect ? 'border-red-400 bg-red-50 text-red-700' :
                                'border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50')
                        }, (showResult && isCorrect ? '\u2705 ' : showResult && wasChosen ? '\u274C ' : '') + opt.name);
                      })
                    ),
                    d.quizFeedback && React.createElement("div", { className: "rounded-lg p-3 text-xs leading-relaxed space-y-1.5 " + (d.quizFeedback.correct ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200') },
                      React.createElement("p", { className: "font-black " + (d.quizFeedback.correct ? 'text-green-800' : 'text-amber-800') }, (d.quizFeedback.correct ? '\u2705 Correct! ' : '\u274C The answer was: ') + quizQ.name),
                      React.createElement("p", { className: "text-slate-700" }, React.createElement("span", { className: "font-bold text-slate-500" }, "Function: "), quizQ.fn),
                      quizQ.clinical && React.createElement("p", { className: "text-slate-600 italic" }, React.createElement("span", { className: "font-bold text-rose-500" }, "\u26A0 Clinical: "), quizQ.clinical)
                    ),
                    d.quizFeedback && React.createElement("button", {
                      onClick: function () { upd('quizIdx', (d.quizIdx || 0) + 1); upd('quizFeedback', null); },
                      className: "w-full py-2 mt-2 rounded-lg text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition-all"
                    }, "Next Question \u2192")
                  ) : React.createElement("p", { className: "text-sm text-slate-500 italic" }, "No quiz questions available.")
                ) : (
                  sel ? (
                    // Detail panel
                    React.createElement("div", { className: "bg-white rounded-xl border-2 p-4 space-y-3", style: { borderColor: sys.accent + '40' } },
                      React.createElement("div", { className: "flex items-start justify-between" },
                        React.createElement("h4", { className: "text-base font-black", style: { color: sys.accent } }, sel.name),
                        React.createElement("button", { onClick: function () { upd('selectedStructure', null); }, className: "p-1 hover:bg-slate-100 rounded" }, React.createElement(X, { size: 14, className: "text-slate-400" }))
                      ),
                      React.createElement("div", { className: "space-y-2.5" },
                        React.createElement("div", null,
                          React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase mb-0.5" }, "Function"),
                          React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed" }, sel.fn)
                        ),
                        sel.origin && React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                          React.createElement("div", null,
                            React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase mb-0.5" }, "Origin"),
                            React.createElement("p", { className: "text-xs text-slate-600" }, sel.origin)
                          ),
                          React.createElement("div", null,
                            React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase mb-0.5" }, "Insertion"),
                            React.createElement("p", { className: "text-xs text-slate-600" }, sel.insertion)
                          )
                        ),
                        React.createElement("div", null,
                          React.createElement("p", { className: "text-[10px] font-bold text-rose-500 uppercase mb-0.5" }, "\u26A0 Clinical Significance"),
                          React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed bg-rose-50 rounded-lg p-2" }, sel.clinical)
                        ),
                        sel.detail && React.createElement("div", null,
                          React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase mb-0.5" }, "Detail"),
                          React.createElement("p", { className: "text-xs text-slate-500 leading-relaxed" }, sel.detail)
                        )
                      )
                    )
                  ) : (
                    // Structure list
                    React.createElement("div", { className: "space-y-1 max-h-[460px] overflow-y-auto pr-1" },
                      filtered.length === 0 && React.createElement("p", { className: "text-xs text-slate-400 italic py-4 text-center" }, "No structures match your search."),
                      filtered.map(function (st) {
                        return React.createElement("button", {
                          key: st.id,
                          onClick: function () { upd('selectedStructure', st.id); },
                          className: "w-full text-left px-3 py-2 rounded-lg text-xs transition-all hover:shadow-sm " +
                            (d.selectedStructure === st.id ? 'font-bold border-2' : 'bg-slate-50 hover:bg-white border border-slate-200'),
                          style: d.selectedStructure === st.id ? { borderColor: sys.accent, background: sys.color } : {}
                        },
                          React.createElement("div", { className: "font-bold text-slate-800" }, st.name),
                          React.createElement("div", { className: "text-[10px] text-slate-400 mt-0.5 line-clamp-1" }, st.fn.substring(0, 80) + (st.fn.length > 80 ? '...' : ''))
                        );
                      })
                    )
                  )
                )
              )
            )
          );
        })(),

        // ═══════════════════════════════════════════════════════
        // BRAIN ATLAS EXPLORER
        stemLabTab === 'explore' && stemLabTool === 'brainAtlas' && (() => {
          var d = labToolData.brainAtlas || {};
          var upd = function (k, v) { setLabToolData(function (p) { return Object.assign({}, p, { brainAtlas: Object.assign({}, p.brainAtlas, (function () { var o = {}; o[k] = v; return o; })()) }); }); };

          var VIEWS = {
            lateral: {
              name: 'Lateral', desc: 'Side view showing all four lobes, cerebellum, and brainstem',
              regions: [
                { id: 'frontal', name: 'Frontal Lobe', x: 0.28, y: 0.32, w: 0.22, fn: 'Executive function, planning, decision-making, personality, voluntary motor control (precentral gyrus), speech production (Broca\u2019s area, left hemisphere).', brodmann: 'BA 4 (primary motor), BA 6 (premotor), BA 44\u201345 (Broca\u2019s)', blood: 'Anterior cerebral artery (medial), middle cerebral artery (lateral)', conditions: 'Broca\u2019s aphasia (non-fluent speech with intact comprehension), personality changes, disinhibition, abulia. Frontal lobe tumors may present with subtle personality changes before focal signs.', damage: 'Contralateral hemiparesis, impaired judgment, personality changes, motor aphasia (dominant hemisphere).' },
                { id: 'prefrontal', name: 'Prefrontal Cortex', x: 0.18, y: 0.35, w: 0.12, fn: 'Highest-order cognitive functions: working memory, attention, abstract reasoning, social behavior, impulse control. Dorsolateral PFC for executive control; orbitofrontal for social/emotional regulation.', brodmann: 'BA 9, 10, 11, 12, 46, 47', blood: 'Anterior cerebral artery, middle cerebral artery', conditions: 'ADHD, schizophrenia (hypofrontality), OCD, frontotemporal dementia (Pick disease). Phineas Gage case demonstrated personality changes from prefrontal damage.', damage: 'Poor planning, impulsivity, flat affect, socially inappropriate behavior, difficulty with abstract thinking.' },
                { id: 'motor_cortex', name: 'Primary Motor Cortex', x: 0.42, y: 0.18, w: 0.08, fn: 'Precentral gyrus. Contains motor homunculus \u2014 somatotopic map of body. Upper motor neurons project via corticospinal tract to spinal cord. Controls voluntary movement contralaterally.', brodmann: 'BA 4', blood: 'Middle cerebral artery (lateral face/arm), anterior cerebral artery (medial leg)', conditions: 'Stroke: contralateral hemiparesis. Upper motor neuron signs: spasticity, hyperreflexia, Babinski sign, clonus.', damage: 'Contralateral spastic paralysis. Face/arm (MCA stroke) vs leg (ACA stroke).' },
                { id: 'parietal', name: 'Parietal Lobe', x: 0.52, y: 0.22, w: 0.18, fn: 'Somatosensory processing (postcentral gyrus), spatial awareness, visuomotor integration, mathematical calculation. Posterior parietal cortex integrates sensory input for motor planning.', brodmann: 'BA 1,2,3 (primary somatosensory), BA 5,7 (association), BA 39 (angular gyrus), BA 40 (supramarginal gyrus)', blood: 'Middle cerebral artery, posterior cerebral artery', conditions: 'Gerstmann syndrome (dominant): agraphia, acalculia, finger agnosia, left-right confusion. Hemispatial neglect (non-dominant): patient ignores contralateral space.', damage: 'Loss of sensation, neglect syndrome, apraxia, difficulty with spatial reasoning and navigation.' },
                { id: 'temporal', name: 'Temporal Lobe', x: 0.38, y: 0.58, w: 0.20, fn: 'Auditory processing (superior temporal gyrus), language comprehension (Wernicke\u2019s area, left), memory formation (hippocampus), emotion (amygdala), face recognition (fusiform gyrus).', brodmann: 'BA 41,42 (primary auditory), BA 22 (Wernicke\u2019s), BA 20,21,37,38 (association)', blood: 'Middle cerebral artery (lateral), posterior cerebral artery (inferior/medial)', conditions: 'Wernicke\u2019s aphasia: fluent but nonsensical speech, poor comprehension. Temporal lobe epilepsy: aura (d\u00E9j\u00E0 vu, smell), automatisms. Prosopagnosia (face blindness).', damage: 'Language comprehension deficits (dominant), memory impairment, auditory agnosia, emotional changes.' },
                { id: 'occipital', name: 'Occipital Lobe', x: 0.78, y: 0.32, w: 0.14, fn: 'Primary visual cortex (V1) along calcarine sulcus processes raw visual input. Association areas (V2\u2013V5) process color, motion, depth, and object recognition.', brodmann: 'BA 17 (V1 primary visual), BA 18 (V2), BA 19 (V3\u2013V5)', blood: 'Posterior cerebral artery', conditions: 'Cortical blindness with intact pupillary reflex (Anton syndrome: patient denies blindness). Homonymous hemianopia from unilateral lesion. Visual agnosia.', damage: 'Contralateral homonymous hemianopia, cortical blindness (bilateral), visual hallucinations, color blindness (achromatopsia).' },
                { id: 'cerebellum', name: 'Cerebellum', x: 0.78, y: 0.62, w: 0.14, fn: 'Motor coordination, balance, motor learning, timing. Contains 50% of brain\u2019s neurons. Three functional divisions: vestibulocerebellum (balance), spinocerebellum (posture), cerebrocerebellum (planning).', brodmann: 'N/A (has its own cytoarchitecture: Purkinje cells, granule cells)', blood: 'Superior cerebellar, anterior inferior cerebellar (AICA), posterior inferior cerebellar (PICA) arteries', conditions: 'Cerebellar ataxia: wide-based gait, dysmetria (finger-to-nose test), intention tremor, dysdiadochokinesia. PICA stroke \u2192 Wallenberg syndrome.', damage: 'Ipsilateral ataxia (damage affects same side, unlike cerebrum). Nystagmus, scanning speech, hypotonia.' },
                { id: 'brainstem', name: 'Brainstem', x: 0.62, y: 0.68, w: 0.10, fn: 'Midbrain + pons + medulla oblongata. Contains cranial nerve nuclei (III\u2013XII), reticular activating system (consciousness), vital centers (cardiac, respiratory, vasomotor). All ascending/descending tracts pass through.', brodmann: 'N/A', blood: 'Basilar artery, vertebral arteries, PICA, AICA', conditions: 'Locked-in syndrome (ventral pons lesion): conscious but can only move eyes. Brainstem death = legal death criterion. Central pontine myelinolysis from rapid Na correction.', damage: 'Coma, cranial nerve palsies, respiratory failure, cardiovascular collapse. "Crossed" signs: ipsilateral CN deficit + contralateral body weakness.' },
                { id: 'brocas', name: 'Broca\u2019s Area', x: 0.25, y: 0.48, w: 0.08, fn: 'Left inferior frontal gyrus (pars opercularis + triangularis). Speech production and language processing. Part of larger language network connecting to Wernicke\u2019s via arcuate fasciculus.', brodmann: 'BA 44, 45', blood: 'Middle cerebral artery (superior division)', conditions: 'Broca\u2019s aphasia: non-fluent speech, telegraphic output ("want... water..."), intact comprehension, patient frustrated. Often accompanied by right hemiparesis (adjacent motor cortex).', damage: 'Expressive (motor) aphasia. Patient understands language but cannot produce fluent speech.' },
                { id: 'wernickes', name: 'Wernicke\u2019s Area', x: 0.55, y: 0.50, w: 0.10, fn: 'Left posterior superior temporal gyrus. Receptive language processing \u2014 comprehension of spoken and written language. Connected to Broca\u2019s area via arcuate fasciculus.', brodmann: 'BA 22 (posterior part)', blood: 'Middle cerebral artery (inferior division)', conditions: 'Wernicke\u2019s aphasia: fluent but meaningless speech (word salad/neologisms), severely impaired comprehension. Patient often unaware of deficit. Conduction aphasia if arcuate fasciculus damaged.', damage: 'Receptive (sensory) aphasia. Patient speaks fluently but output is meaningless; poor comprehension and repetition.' }
              ]
            },
            medial: {
              name: 'Medial (Sagittal)', desc: 'Midline cut revealing deep structures',
              regions: [
                { id: 'corpus_callosum', name: 'Corpus Callosum', x: 0.48, y: 0.30, w: 0.20, fn: 'Largest white matter commissure (~200 million axons). Connects left and right cerebral hemispheres. Regions: rostrum, genu, body, splenium. Enables interhemispheric communication.', brodmann: 'N/A (white matter tract)', blood: 'Anterior cerebral artery (pericallosal branches)', conditions: 'Split-brain syndrome after callosotomy: hemispheres cannot communicate. Alien hand syndrome. Agenesis of corpus callosum (developmental anomaly).', damage: 'Disconnection syndromes: inability to name objects in left visual field, left hand apraxia to verbal commands.' },
                { id: 'thalamus', name: 'Thalamus', x: 0.52, y: 0.42, w: 0.10, fn: 'Relay station for all sensory input (except olfaction) to cortex. Specific nuclei: VPL (body sensation), VPM (face), LGN (vision), MGN (hearing). Also involved in consciousness, sleep, and memory.', brodmann: 'N/A (diencephalon)', blood: 'Posterior cerebral artery (thalamogeniculate, thalamoperforating branches)', conditions: 'Thalamic pain syndrome (Dejerine-Roussy): contralateral burning/tingling pain after thalamic stroke. Thalamic tumors cause sensory loss and altered consciousness.', damage: 'Contralateral sensory loss, pain syndromes, decreased consciousness, aphasia (dominant thalamus), neglect (non-dominant).' },
                { id: 'hypothalamus', name: 'Hypothalamus', x: 0.42, y: 0.52, w: 0.08, fn: 'Master regulator of homeostasis. Controls: body temperature, hunger/thirst, circadian rhythm, autonomic NS, pituitary hormone release. "Four Fs": feeding, fighting, fleeing, reproduction.', brodmann: 'N/A (diencephalon)', blood: 'Circle of Willis branches, superior hypophyseal artery', conditions: 'Diabetes insipidus (ADH deficiency), SIADH (excess ADH), Kallmann syndrome (GnRH deficiency + anosmia). Craniopharyngioma: tumor compressing hypothalamus.', damage: 'Disrupted temperature regulation, sleep-wake cycle, hunger/satiety, hormonal imbalance, autonomic dysfunction.' },
                { id: 'cingulate', name: 'Cingulate Gyrus', x: 0.42, y: 0.22, w: 0.18, fn: 'C-shaped cortex above corpus callosum. Anterior cingulate: emotion regulation, error detection, pain perception. Posterior cingulate: memory retrieval, default mode network.', brodmann: 'BA 23, 24, 25, 31, 32, 33', blood: 'Anterior cerebral artery (callosomarginal branches)', conditions: 'Anterior cingulate lesions: apathy, akinetic mutism (awake but no spontaneous movement/speech). Implicated in depression, OCD, chronic pain processing.', damage: 'Emotional blunting, apathy, reduced motivation, impaired error monitoring.' },
                { id: 'hippocampus', name: 'Hippocampus', x: 0.58, y: 0.55, w: 0.10, fn: 'Seahorse-shaped structure in medial temporal lobe. Critical for converting short-term to long-term memory (consolidation). Spatial navigation (place cells). One of first areas affected in Alzheimer\u2019s.', brodmann: 'Archicortex (3-layered, not neocortical)', blood: 'Posterior cerebral artery (hippocampal branches)', conditions: 'Alzheimer\u2019s disease: hippocampal atrophy is earliest finding. Anterograde amnesia (HM patient: bilateral hippocampal removal). Temporal lobe epilepsy often originates here. Hippocampal sclerosis.', damage: 'Anterograde amnesia (cannot form new memories), spatial disorientation. Retrograde memory relatively preserved initially.' },
                { id: 'amygdala', name: 'Amygdala', x: 0.38, y: 0.58, w: 0.08, fn: 'Almond-shaped nucleus in anterior medial temporal lobe. Fear conditioning, threat detection, emotional memory. Modulates hippocampal memory consolidation. Part of limbic system.', brodmann: 'N/A (subcortical)', blood: 'Anterior choroidal artery, middle cerebral artery branches', conditions: 'Kl\u00FCver-Bucy syndrome (bilateral amygdala damage): hyperorality, hypersexuality, visual agnosia, placidity. PTSD: hyperactive amygdala. Anxiety disorders.', damage: 'Impaired fear recognition, inability to detect threatening facial expressions, emotional blunting, hypersexuality (bilateral).' },
                { id: 'basal_ganglia', name: 'Basal Ganglia', x: 0.50, y: 0.38, w: 0.10, fn: 'Caudate + putamen (=striatum) + globus pallidus. Movement modulation: direct pathway (facilitates movement) vs indirect pathway (inhibits movement). Also involved in reward, habit formation, procedural learning.', brodmann: 'N/A (subcortical nuclei)', blood: 'Middle cerebral artery (lenticulostriate arteries, "arteries of stroke")', conditions: 'Parkinson\u2019s disease (dopamine depletion in substantia nigra \u2192 striatum): resting tremor, rigidity, bradykinesia, postural instability. Huntington\u2019s disease (caudate atrophy): chorea, dementia, psychiatric symptoms.', damage: 'Hypokinesia (Parkinson\u2019s-like) or hyperkinesia (chorea, ballismus) depending on which pathway is affected.' },
                { id: 'ventricles', name: 'Ventricular System', x: 0.50, y: 0.45, w: 0.10, fn: 'CSF-filled cavities: 2 lateral ventricles \u2192 interventricular foramina (Monro) \u2192 3rd ventricle \u2192 cerebral aqueduct (Sylvius) \u2192 4th ventricle. Choroid plexus produces ~500mL CSF/day. CSF cushions brain.', brodmann: 'N/A', blood: 'Choroid plexus supplied by choroidal arteries', conditions: 'Hydrocephalus: obstructive (non-communicating, e.g. aqueductal stenosis) or communicating (impaired absorption at arachnoid granulations). Normal pressure hydrocephalus: triad of dementia, gait ataxia, urinary incontinence ("wet, wacky, wobbly").', damage: 'Increased ICP from CSF obstruction \u2192 headache, nausea, papilledema, herniation if untreated.' }
              ]
            },
            superior: {
              name: 'Superior (Top)', desc: 'View from above showing hemispheres and sulci',
              regions: [
                { id: 'longitudinal', name: 'Longitudinal Fissure', x: 0.50, y: 0.50, w: 0.04, fn: 'Deep midline cleft separating left and right cerebral hemispheres. Contains the falx cerebri (dural fold) and anterior cerebral arteries. Corpus callosum visible at its depth.', brodmann: 'N/A (anatomical landmark)', blood: 'Superior sagittal sinus runs along its superior border', conditions: 'Superior sagittal sinus thrombosis: headache, seizures, papilledema. Parasagittal meningiomas may compress motor cortex for lower limbs.', damage: 'Bilateral leg weakness if parasagittal tumor/thrombosis compresses medial motor cortex.' },
                { id: 'central_sulcus', name: 'Central Sulcus (Rolandic)', x: 0.50, y: 0.38, w: 0.30, fn: 'Separates frontal lobe (anterior) from parietal lobe (posterior). Precentral gyrus (motor) lies anterior; postcentral gyrus (somatosensory) lies posterior. Key surgical landmark.', brodmann: 'Border between BA 4 (anterior) and BA 3,1,2 (posterior)', blood: 'Middle cerebral artery branches', conditions: 'Central sulcus is critical surgical landmark \u2014 must be identified to avoid motor/sensory cortex damage during neurosurgery. Functional MRI used for preoperative mapping.', damage: 'Lesions anterior \u2192 motor deficit; lesions posterior \u2192 sensory deficit on contralateral body.' },
                { id: 'frontal_sup', name: 'Frontal Lobes (Superior View)', x: 0.35, y: 0.25, w: 0.15, fn: 'Anterior to central sulcus. From above: superior, middle, and inferior frontal gyri visible. Prefrontal cortex dominates anterior portion. Supplementary motor area on medial surface.', brodmann: 'BA 4, 6, 8, 9, 10, 46', blood: 'Anterior cerebral artery (medial), middle cerebral artery (lateral)', conditions: 'Frontal lobe syndrome: disinhibition, poor judgment, abulia (lack of will). Meningiomas of the olfactory groove may compress frontal lobes bilaterally.', damage: 'Executive dysfunction, personality changes, contralateral motor weakness.' },
                { id: 'parietal_sup', name: 'Parietal Lobes (Superior View)', x: 0.55, y: 0.55, w: 0.15, fn: 'Posterior to central sulcus. Superior and inferior parietal lobules visible from above. Precuneus on medial surface (part of default mode network). Interhemispheric parietal areas for spatial integration.', brodmann: 'BA 1,2,3,5,7,39,40', blood: 'Middle cerebral artery, posterior cerebral artery', conditions: 'Balint syndrome (bilateral parietal): simultanagnosia, optic ataxia, oculomotor apraxia. Astereognosis: cannot identify objects by touch despite intact sensation.', damage: 'Sensory loss, neglect (non-dominant), apraxia, spatial disorientation, acalculia (dominant).' }
              ]
            },
            inferior: {
              name: 'Inferior (Bottom)', desc: 'View from below showing cranial nerves and base',
              regions: [
                { id: 'olfactory', name: 'Olfactory Bulbs/Tracts (CN I)', x: 0.50, y: 0.20, w: 0.10, fn: 'Receive input from olfactory epithelium via cribriform plate of ethmoid bone. Only sensory pathway that does NOT relay through thalamus \u2014 projects directly to olfactory cortex, amygdala, entorhinal cortex.', brodmann: 'N/A', blood: 'Anterior cerebral artery (olfactory branches)', conditions: 'Anosmia: loss of smell from head trauma (cribriform plate fracture), COVID-19, Parkinson\u2019s (early sign), Kallmann syndrome, olfactory groove meningioma.', damage: 'Unilateral or bilateral anosmia. Foster Kennedy syndrome: ipsilateral anosmia + optic atrophy + contralateral papilledema (olfactory groove meningioma).' },
                { id: 'optic_chiasm', name: 'Optic Chiasm (CN II)', x: 0.50, y: 0.32, w: 0.10, fn: 'Partial decussation of optic nerve fibers. Nasal fibers cross; temporal fibers remain ipsilateral. Sits above pituitary gland in sella turcica. Critical landmark for visual field deficits.', brodmann: 'N/A', blood: 'Superior hypophyseal artery, ophthalmic artery', conditions: 'Bitemporal hemianopia: classical visual field defect from pituitary adenoma compressing chiasm from below. Craniopharyngioma compresses from above.', damage: 'Bitemporal hemianopia (loss of both temporal visual fields). Pituitary tumors are most common cause.' },
                { id: 'temporal_inf', name: 'Temporal Lobes (Inferior)', x: 0.40, y: 0.50, w: 0.15, fn: 'Inferior surface shows fusiform gyrus (face recognition), parahippocampal gyrus (memory encoding), uncus (olfactory processing). Contains hippocampus and amygdala internally.', brodmann: 'BA 20 (inferior temporal), BA 36,37 (fusiform)', blood: 'Posterior cerebral artery', conditions: 'Uncal herniation: life-threatening transtentorial herniation compresses CN III \u2192 ipsilateral fixed dilated pupil, contralateral hemiparesis, then coma. Neurosurgical emergency. Prosopagnosia from fusiform gyrus damage.', damage: 'Memory deficits, face perception problems, uncal herniation signs if mass effect present.' },
                { id: 'cerebellum_inf', name: 'Cerebellum (Inferior)', x: 0.50, y: 0.72, w: 0.18, fn: 'Cerebellar tonsils visible inferiorly, flanking the foramen magnum. Vermis (midline) controls truncal balance; hemispheres control limb coordination. Flocculonodular lobe controls eye movements.', brodmann: 'N/A', blood: 'PICA (posterior inferior cerebellar artery)', conditions: 'Chiari malformation: cerebellar tonsils herniate through foramen magnum \u2192 headache, syringomyelia. Cerebellar tonsillar herniation is life-threatening (compresses brainstem). Medulloblastoma in children (vermis).', damage: 'Truncal ataxia (vermis lesion), limb ataxia (hemisphere lesion), nystagmus, dysarthria.' },
                { id: 'medulla_inf', name: 'Medulla Oblongata (Inferior)', x: 0.50, y: 0.60, w: 0.08, fn: 'Most inferior brainstem structure. Contains: cardiovascular center, respiratory center, vomiting center, pyramids (corticospinal tracts that decussate here). CN IX, X, XI, XII nuclei.', brodmann: 'N/A', blood: 'Vertebral arteries, PICA', conditions: 'Lateral medullary (Wallenberg) syndrome: PICA occlusion \u2192 ipsilateral facial numbness, Horner syndrome, ataxia + contralateral body pain/temperature loss. Dysphagia from nucleus ambiguus involvement.', damage: 'Respiratory/cardiac arrest if bilateral lesion. Alternating hemiplegia, dysphagia, dysarthria, vertigo.' },
                { id: 'cn_nerves', name: 'Cranial Nerves (II\u2013XII)', x: 0.50, y: 0.45, w: 0.12, fn: 'Emerge from brainstem base. Key exits: CN V from pons (trigeminal), CN VII/VIII from pontomedullary junction (facial/vestibulocochlear), CN IX/X/XI from medulla (glossopharyngeal, vagus, spinal accessory), CN XII from medulla (hypoglossal).', brodmann: 'N/A', blood: 'Various branches of basilar and vertebral arteries', conditions: 'CN III palsy: "down and out" eye, ptosis, mydriasis. CN V: trigeminal neuralgia. CN VII: Bell palsy (LMN facial droop). CN VIII: acoustic neuroma (hearing loss, tinnitus). CN XII: tongue deviates toward lesion.', damage: 'Specific cranial nerve deficits depending on which nerve is affected. Multiple CN palsies suggest brainstem pathology or skull base disease.' }
              ]
            }
          };

          var viewKey = d.view || 'lateral';
          var currentView = VIEWS[viewKey];
          var regions = currentView.regions;
          var searchTerm = (d.search || '').toLowerCase();
          var filtered = searchTerm ? regions.filter(function (r) { return r.name.toLowerCase().indexOf(searchTerm) >= 0 || r.fn.toLowerCase().indexOf(searchTerm) >= 0 || (r.conditions || '').toLowerCase().indexOf(searchTerm) >= 0; }) : regions;
          var sel = d.selectedRegion ? regions.find(function (r) { return r.id === d.selectedRegion; }) : null;

          // Quiz logic — options memoized in state to prevent re-shuffle on render
          var allRegions = []; Object.values(VIEWS).forEach(function (v) { v.regions.forEach(function (r) { if (!allRegions.find(function (a) { return a.id === r.id; })) allRegions.push(r); }); });
          var quizPool = allRegions.filter(function (r) { return r.damage; });
          var quizQ = d.quizMode && quizPool.length > 0 ? quizPool[d.quizIdx % quizPool.length] : null;
          var brainQuizOpts = d._brainQuizOpts || [];
          if (quizQ && d._brainQuizOptsFor !== d.quizIdx) {
            var wrong = quizPool.filter(function (r) { return r.id !== quizQ.id; }).sort(function () { return Math.random() - 0.5; }).slice(0, 3);
            brainQuizOpts = wrong.concat([quizQ]).sort(function () { return Math.random() - 0.5; });
            upd('_brainQuizOpts', brainQuizOpts);
            upd('_brainQuizOptsFor', d.quizIdx);
          }

          // Brain canvas
          var canvasRef = function (canvas) {
            if (!canvas) return;
            if (canvas._brainDrawn === viewKey + d.selectedRegion + searchTerm) return;
            canvas._brainDrawn = viewKey + d.selectedRegion + searchTerm;
            var ctx = canvas.getContext('2d');
            var W = canvas.width, H = canvas.height;
            ctx.clearRect(0, 0, W, H);
            ctx.save();

            // Brain outline per view
            ctx.fillStyle = '#f5f0f8';
            ctx.strokeStyle = '#a78bfa';
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';

            if (viewKey === 'lateral') {
              // Side view brain shape
              ctx.beginPath();
              ctx.moveTo(W * 0.15, H * 0.45);
              ctx.quadraticCurveTo(W * 0.12, H * 0.20, W * 0.35, H * 0.12);
              ctx.quadraticCurveTo(W * 0.55, H * 0.08, W * 0.72, H * 0.15);
              ctx.quadraticCurveTo(W * 0.88, H * 0.25, W * 0.90, H * 0.42);
              ctx.quadraticCurveTo(W * 0.88, H * 0.55, W * 0.78, H * 0.60);
              ctx.quadraticCurveTo(W * 0.70, H * 0.72, W * 0.62, H * 0.76);
              ctx.quadraticCurveTo(W * 0.50, H * 0.78, W * 0.42, H * 0.72);
              ctx.quadraticCurveTo(W * 0.30, H * 0.62, W * 0.20, H * 0.55);
              ctx.quadraticCurveTo(W * 0.14, H * 0.50, W * 0.15, H * 0.45);
              ctx.fill(); ctx.stroke();
              // Central sulcus (divides frontal/parietal)
              ctx.beginPath(); ctx.setLineDash([4, 3]);
              ctx.moveTo(W * 0.50, H * 0.12); ctx.lineTo(W * 0.42, H * 0.55);
              ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.stroke();
              // Lateral sulcus (Sylvian fissure)
              ctx.beginPath();
              ctx.moveTo(W * 0.35, H * 0.50); ctx.quadraticCurveTo(W * 0.50, H * 0.48, W * 0.65, H * 0.42);
              ctx.stroke();
              ctx.setLineDash([]); ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2;
              // Cerebellum (separate shape)
              ctx.beginPath();
              ctx.ellipse(W * 0.80, H * 0.65, W * 0.10, H * 0.08, 0, 0, Math.PI * 2);
              ctx.fillStyle = '#ede9fe'; ctx.fill(); ctx.stroke();
              // Brainstem
              ctx.beginPath();
              ctx.moveTo(W * 0.62, H * 0.62); ctx.lineTo(W * 0.65, H * 0.78);
              ctx.lineTo(W * 0.58, H * 0.78); ctx.lineTo(W * 0.55, H * 0.62);
              ctx.fillStyle = '#e0d6f8'; ctx.fill(); ctx.stroke();
            } else if (viewKey === 'medial') {
              // Sagittal brain
              ctx.beginPath();
              ctx.moveTo(W * 0.20, H * 0.50);
              ctx.quadraticCurveTo(W * 0.15, H * 0.22, W * 0.40, H * 0.12);
              ctx.quadraticCurveTo(W * 0.60, H * 0.08, W * 0.78, H * 0.18);
              ctx.quadraticCurveTo(W * 0.88, H * 0.32, W * 0.85, H * 0.50);
              ctx.quadraticCurveTo(W * 0.82, H * 0.60, W * 0.72, H * 0.62);
              ctx.lineTo(W * 0.60, H * 0.60);
              ctx.quadraticCurveTo(W * 0.50, H * 0.58, W * 0.40, H * 0.60);
              ctx.quadraticCurveTo(W * 0.25, H * 0.58, W * 0.20, H * 0.50);
              ctx.fill(); ctx.stroke();
              // Corpus callosum (arc)
              ctx.beginPath(); ctx.lineWidth = 4; ctx.strokeStyle = '#c084fc';
              ctx.moveTo(W * 0.35, H * 0.38); ctx.quadraticCurveTo(W * 0.52, H * 0.28, W * 0.68, H * 0.35);
              ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = '#a78bfa';
              // Cerebellum
              ctx.beginPath();
              ctx.ellipse(W * 0.78, H * 0.68, W * 0.09, H * 0.08, 0, 0, Math.PI * 2);
              ctx.fillStyle = '#ede9fe'; ctx.fill(); ctx.stroke();
              // Brainstem
              ctx.beginPath();
              ctx.moveTo(W * 0.58, H * 0.58); ctx.lineTo(W * 0.62, H * 0.78);
              ctx.lineTo(W * 0.55, H * 0.78); ctx.lineTo(W * 0.50, H * 0.58);
              ctx.fillStyle = '#e0d6f8'; ctx.fill(); ctx.stroke();
            } else if (viewKey === 'superior') {
              // Top-down: two hemispheres
              ctx.beginPath();
              ctx.ellipse(W * 0.35, H * 0.50, W * 0.20, H * 0.38, 0, 0, Math.PI * 2);
              ctx.fill(); ctx.stroke();
              ctx.beginPath();
              ctx.ellipse(W * 0.65, H * 0.50, W * 0.20, H * 0.38, 0, 0, Math.PI * 2);
              ctx.fill(); ctx.stroke();
              // Longitudinal fissure
              ctx.beginPath(); ctx.setLineDash([5, 3]);
              ctx.moveTo(W * 0.50, H * 0.10); ctx.lineTo(W * 0.50, H * 0.90);
              ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2; ctx.stroke();
              // Central sulcus
              ctx.beginPath();
              ctx.moveTo(W * 0.20, H * 0.38); ctx.quadraticCurveTo(W * 0.50, H * 0.35, W * 0.80, H * 0.38);
              ctx.stroke();
              ctx.setLineDash([]); ctx.strokeStyle = '#a78bfa';
            } else if (viewKey === 'inferior') {
              // Bottom view
              ctx.beginPath();
              ctx.ellipse(W * 0.50, H * 0.40, W * 0.30, H * 0.30, 0, 0, Math.PI * 2);
              ctx.fill(); ctx.stroke();
              // Cerebellum
              ctx.beginPath();
              ctx.ellipse(W * 0.50, H * 0.72, W * 0.22, H * 0.12, 0, 0, Math.PI * 2);
              ctx.fillStyle = '#ede9fe'; ctx.fill(); ctx.stroke();
              // Brainstem
              ctx.beginPath();
              ctx.moveTo(W * 0.46, H * 0.55); ctx.lineTo(W * 0.48, H * 0.68);
              ctx.lineTo(W * 0.52, H * 0.68); ctx.lineTo(W * 0.54, H * 0.55);
              ctx.fillStyle = '#e0d6f8'; ctx.fill(); ctx.stroke();
              // Optic chiasm X
              ctx.beginPath(); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2;
              ctx.moveTo(W * 0.44, H * 0.30); ctx.lineTo(W * 0.56, H * 0.36);
              ctx.moveTo(W * 0.56, H * 0.30); ctx.lineTo(W * 0.44, H * 0.36);
              ctx.stroke(); ctx.strokeStyle = '#a78bfa';
            }

            ctx.restore();

            // Draw region markers
            filtered.forEach(function (r) {
              var px = r.x * W, py = r.y * H;
              var isSel = sel && sel.id === r.id;
              var rad = isSel ? 10 : 6;
              if (isSel) {
                ctx.save();
                ctx.shadowColor = '#7c3aed';
                ctx.shadowBlur = 14;
                ctx.beginPath(); ctx.arc(px, py, rad + 3, 0, Math.PI * 2);
                ctx.fillStyle = '#7c3aed30';
                ctx.fill();
                ctx.restore();
              }
              ctx.beginPath(); ctx.arc(px, py, rad, 0, Math.PI * 2);
              ctx.fillStyle = isSel ? '#7c3aed' : '#7c3aedaa';
              ctx.fill();
              ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
              if (isSel) {
                ctx.save();
                ctx.font = 'bold 9px Inter, system-ui, sans-serif';
                ctx.textAlign = px > W * 0.5 ? 'right' : 'left';
                ctx.fillStyle = '#7c3aed';
                ctx.fillText(r.name, px > W * 0.5 ? px - 15 : px + 15, py + 3);
                ctx.restore();
              }
            });
            // View label
            ctx.save();
            ctx.font = 'bold 10px Inter, system-ui, sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.textAlign = 'center';
            ctx.fillText(currentView.name.toUpperCase() + ' VIEW', W * 0.5, H - 6);
            ctx.restore();
          };

          var handleClick = function (e) {
            var rect = e.target.getBoundingClientRect();
            var cx = (e.clientX - rect.left) / rect.width;
            var cy = (e.clientY - rect.top) / rect.height;
            var closest = null, minD = 0.08;
            filtered.forEach(function (r) {
              var dist = Math.sqrt(Math.pow(r.x - cx, 2) + Math.pow(r.y - cy, 2));
              if (dist < minD) { minD = dist; closest = r; }
            });
            if (closest) upd('selectedRegion', closest.id);
          };

          return React.createElement("div", { className: "max-w-4xl mx-auto animate-in fade-in duration-200" },
            // Header
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: function () { setStemLabTool(null); }, className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("div", null,
                React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83E\uDDE0 Brain Atlas"),
                React.createElement("p", { className: "text-xs text-slate-400" }, currentView.desc)
              )
            ),
            // View tabs
            React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-3" },
              Object.keys(VIEWS).map(function (key) {
                var v = VIEWS[key];
                return React.createElement("button", {
                  key: key,
                  onClick: function () { upd('view', key); upd('selectedRegion', null); upd('quizMode', false); upd('search', ''); },
                  className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (viewKey === key ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-purple-50 border border-slate-200')
                }, v.name);
              })
            ),
            // Controls
            React.createElement("div", { className: "flex items-center gap-2 mb-3 flex-wrap" },
              React.createElement("input", {
                type: "text", placeholder: "\uD83D\uDD0D Search regions, functions, conditions...",
                value: d.search || '',
                onChange: function (e) { upd('search', e.target.value); },
                className: "flex-1 min-w-[160px] px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-300 outline-none"
              }),
              React.createElement("button", {
                onClick: function () { upd('quizMode', !d.quizMode); upd('quizIdx', 0); upd('quizScore', 0); upd('quizFeedback', null); },
                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.quizMode ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100')
              }, d.quizMode ? '\u2705 Quiz On' : '\uD83E\uDDEA Quiz'),
              React.createElement("span", { className: "text-[10px] text-slate-400 font-bold" }, filtered.length + ' regions')
            ),
            // Main: canvas + detail
            React.createElement("div", { className: "flex gap-4", style: { alignItems: 'flex-start' } },
              React.createElement("div", { className: "flex-shrink-0" },
                React.createElement("canvas", {
                  ref: canvasRef, width: 320, height: 400,
                  onClick: handleClick,
                  className: "rounded-xl border-2 border-purple-200 cursor-crosshair",
                  style: { background: '#faf8ff' }
                })
              ),
              React.createElement("div", { className: "flex-1 min-w-0" },
                d.quizMode ? (
                  quizQ ? React.createElement("div", { className: "bg-white rounded-xl border-2 border-green-200 p-4 space-y-3" },
                    React.createElement("div", { className: "flex items-center justify-between mb-2" },
                      React.createElement("h4", { className: "font-bold text-green-800 text-sm" }, "\uD83E\uDDE0 Brain Quiz"),
                      React.createElement("span", { className: "text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700" }, "\u2B50 " + (d.quizScore || 0))
                    ),
                    React.createElement("p", { className: "text-sm text-slate-800 font-bold" }, "What happens when this region is damaged?"),
                    React.createElement("p", { className: "text-xs text-purple-700 bg-purple-50 rounded-lg p-3 font-bold" }, quizQ.name),
                    React.createElement("div", { className: "grid grid-cols-1 gap-1.5" },
                      brainQuizOpts.map(function (opt) {
                        var fb = d.quizFeedback;
                        var isCorrect = opt.id === quizQ.id;
                        var wasChosen = fb && fb.chosen === opt.id;
                        var showResult = fb !== null && fb !== undefined;
                        return React.createElement("button", {
                          key: opt.id, disabled: showResult,
                          onClick: function () {
                            var correct = opt.id === quizQ.id;
                            upd('quizFeedback', { chosen: opt.id, correct: correct });
                            if (correct) upd('quizScore', (d.quizScore || 0) + 1);
                          },
                          className: "w-full text-left px-3 py-2 rounded-lg text-[11px] leading-relaxed font-medium transition-all border-2 " +
                            (showResult && isCorrect ? 'border-green-400 bg-green-50 text-green-800' :
                              showResult && wasChosen && !isCorrect ? 'border-red-400 bg-red-50 text-red-700' :
                                'border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50')
                        }, (showResult && isCorrect ? '\u2705 ' : showResult && wasChosen ? '\u274C ' : '') + (opt.damage || '').substring(0, 100) + ((opt.damage || '').length > 100 ? '...' : ''));
                      })
                    ),
                    d.quizFeedback && React.createElement("div", { className: "rounded-lg p-3 text-xs leading-relaxed space-y-1.5 " + (d.quizFeedback.correct ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200') },
                      React.createElement("p", { className: "font-black " + (d.quizFeedback.correct ? 'text-green-800' : 'text-amber-800') }, (d.quizFeedback.correct ? '\u2705 Correct! ' : '\u274C Correct answer for: ') + quizQ.name),
                      React.createElement("p", { className: "text-slate-700" }, React.createElement("span", { className: "font-bold text-slate-500" }, "Function: "), quizQ.fn),
                      quizQ.damage && React.createElement("p", { className: "text-slate-700" }, React.createElement("span", { className: "font-bold text-rose-500" }, "\uD83C\uDFE5 If Damaged: "), quizQ.damage),
                      quizQ.conditions && React.createElement("p", { className: "text-slate-600 italic" }, React.createElement("span", { className: "font-bold text-amber-600" }, "\u26A0 Conditions: "), quizQ.conditions)
                    ),
                    d.quizFeedback && React.createElement("button", {
                      onClick: function () { upd('quizIdx', (d.quizIdx || 0) + 1); upd('quizFeedback', null); },
                      className: "w-full py-2 mt-2 rounded-lg text-xs font-bold bg-green-600 text-white hover:bg-green-700"
                    }, "Next Question \u2192")
                  ) : null
                ) : (
                  sel ? (
                    React.createElement("div", { className: "bg-white rounded-xl border-2 border-purple-200 p-4 space-y-3" },
                      React.createElement("div", { className: "flex items-start justify-between" },
                        React.createElement("h4", { className: "text-base font-black text-purple-700" }, sel.name),
                        React.createElement("button", { onClick: function () { upd('selectedRegion', null); }, className: "p-1 hover:bg-slate-100 rounded" }, React.createElement(X, { size: 14, className: "text-slate-400" }))
                      ),
                      React.createElement("div", { className: "space-y-2.5" },
                        React.createElement("div", null,
                          React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase mb-0.5" }, "Function"),
                          React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed" }, sel.fn)
                        ),
                        sel.brodmann && React.createElement("div", null,
                          React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase mb-0.5" }, "Brodmann Areas"),
                          React.createElement("p", { className: "text-xs text-purple-600 font-mono" }, sel.brodmann)
                        ),
                        sel.blood && React.createElement("div", null,
                          React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase mb-0.5" }, "Blood Supply"),
                          React.createElement("p", { className: "text-xs text-red-600" }, sel.blood)
                        ),
                        sel.conditions && React.createElement("div", null,
                          React.createElement("p", { className: "text-[10px] font-bold text-amber-600 uppercase mb-0.5" }, "\u26A0 Associated Conditions"),
                          React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed bg-amber-50 rounded-lg p-2" }, sel.conditions)
                        ),
                        sel.damage && React.createElement("div", null,
                          React.createElement("p", { className: "text-[10px] font-bold text-rose-500 uppercase mb-0.5" }, "\uD83C\uDFE5 If Damaged"),
                          React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed bg-rose-50 rounded-lg p-2" }, sel.damage)
                        )
                      )
                    )
                  ) : (
                    React.createElement("div", { className: "space-y-1 max-h-[380px] overflow-y-auto pr-1" },
                      filtered.length === 0 && React.createElement("p", { className: "text-xs text-slate-400 italic py-4 text-center" }, "No regions match your search."),
                      filtered.map(function (r) {
                        return React.createElement("button", {
                          key: r.id,
                          onClick: function () { upd('selectedRegion', r.id); },
                          className: "w-full text-left px-3 py-2 rounded-lg text-xs transition-all hover:shadow-sm " +
                            (d.selectedRegion === r.id ? 'font-bold border-2 border-purple-400 bg-purple-50' : 'bg-slate-50 hover:bg-white border border-slate-200')
                        },
                          React.createElement("div", { className: "font-bold text-slate-800" }, r.name),
                          React.createElement("div", { className: "text-[10px] text-slate-400 mt-0.5 line-clamp-1" }, r.fn.substring(0, 80) + (r.fn.length > 80 ? '...' : ''))
                        );
                      })
                    )
                  )
                )
              )
            )
          );
        })(),

      )));
    };
  }
})();
