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
      }, /*#__PURE__*/React.createElement("div", {
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
        label: '📝 Create',
        desc: 'Generate & assess'
      }, {
        id: 'explore',
        label: '🔧 Explore',
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
        id: 'fractions',
        icon: '🍕',
        label: 'Fractions'
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
      }, "\uD83D\uDCBE Save to Resources"), toolSnapshots.length > 0 && /*#__PURE__*/React.createElement("div", {
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
      }, [{
        id: 'volume',
        icon: '📦',
        label: '3D Volume Explorer',
        desc: 'Build rectangular prisms with unit cubes. Rotate, zoom, explore layers.',
        color: 'emerald',
        ready: true
      }, {
        id: 'numberline',
        icon: '📏',
        label: 'Number Line',
        desc: 'Interactive number line with draggable markers. Great for addition, subtraction, fractions.',
        color: 'blue',
        ready: true
      }, {
        id: 'areamodel',
        icon: '🟧',
        label: 'Area Model',
        desc: 'Visual multiplication and division with color-coded rows and columns.',
        color: 'amber',
        ready: true
      }, {
        id: 'fractions',
        icon: '🍕',
        label: 'Fraction Tiles',
        desc: 'Circle and bar models for comparing, adding, and visualizing fractions.',
        color: 'rose',
        ready: true
      }, {
        id: 'base10',
        icon: '🧮',
        label: 'Base-10 Blocks',
        desc: 'Place value with ones, tens, hundreds. Regroup and decompose numbers.',
        color: 'orange',
        ready: true
      }, {
        id: 'coordinate',
        icon: '📍',
        label: 'Coordinate Grid',
        desc: 'Plot points, draw lines, and explore the coordinate plane.',
        color: 'cyan',
        ready: true
      }, {
        id: 'protractor',
        icon: '📐',
        label: 'Angle Explorer',
        desc: 'Measure and construct angles. Classify acute, right, obtuse, and reflex.',
        color: 'purple',
        ready: true
      }, {
        id: 'multtable',
        icon: '🔢',
        label: 'Multiplication Table',
        desc: 'Interactive times table grid. Spot patterns, practice facts with challenges.',
        color: 'pink',
        ready: true
      }, {
        id: 'funcGrapher', icon: '📈', label: 'Function Grapher',
        desc: 'Plot linear, quadratic, and trig functions. Adjust coefficients in real-time.',
        color: 'indigo', ready: true
      }, {
        id: 'physics', icon: '⚡', label: 'Physics Simulator',
        desc: 'Projectile motion, velocity vectors, and trajectory visualization.',
        color: 'sky', ready: true
      }, {
        id: 'chemBalance', icon: '⚗️', label: 'Equation Balancer',
        desc: 'Balance chemical equations with visual atom counting.',
        color: 'lime', ready: true
      }, {
        id: 'punnett', icon: '🧬', label: 'Punnett Square',
        desc: 'Genetic crosses with alleles. Predict genotype and phenotype ratios.',
        color: 'violet', ready: true
      }, {
        id: 'circuit', icon: '🔌', label: 'Circuit Builder',
        desc: 'Build circuits with resistors and batteries. Calculate voltage and current.',
        color: 'yellow', ready: true
      }, {
        id: 'dataPlot', icon: '📊', label: 'Data Plotter',
        desc: 'Plot data points, fit trend lines, calculate correlation.',
        color: 'teal', ready: true
      }, {
        id: 'inequality', icon: '🎨', label: 'Inequality Grapher',
        desc: 'Graph inequalities on number lines and coordinate planes.',
        color: 'fuchsia', ready: true
      }, {
        id: 'molecule', icon: '🔬', label: 'Molecule Builder',
        desc: 'Build molecules with atoms and bonds. Explore molecular geometry.',
        color: 'stone', ready: true
  }, {
    id: 'calculus', icon: '∫', label: 'Calculus Visualizer',
    desc: 'Riemann sums, area under curves, and derivative tangent lines.',
    color: 'red', ready: true
  }, {
    id: 'wave', icon: '🌊', label: 'Wave Simulator',
    desc: 'Adjust frequency, amplitude, wavelength. Explore interference patterns.',
    color: 'cyan', ready: true
  }, {
    id: 'cell', icon: '🧫', label: 'Cell Diagram',
    desc: 'Interactive labeled cell with organelles. Animal and plant cells.',
    color: 'green', ready: true
      }].map(tool => /*#__PURE__*/React.createElement("button", {
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
        const handleGridClick = e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = fromSvg(e.clientX - rect.left, 'x');
          const y = fromSvg(e.clientY - rect.top, 'y');
          if (x < gridRange.min || x > gridRange.max || y < gridRange.min || y > gridRange.max) return;
          const existing = gridPoints.findIndex(p => p.x === x && p.y === y);
          if (existing >= 0) {
            setGridPoints(prev => prev.filter((_, i) => i !== existing));
          } else {
            setGridPoints(prev => [...prev, {
              x,
              y
            }]);
          }
          setGridFeedback(null);
        };
        const checkGrid = () => {
          if (!gridChallenge) return;
          if (gridChallenge.type === 'plot') {
            const ok = gridPoints.some(p => p.x === gridChallenge.target.x && p.y === gridChallenge.target.y);
            setGridFeedback(ok ? {
              correct: true,
              msg: '✅ Correct! Point (' + gridChallenge.target.x + ', ' + gridChallenge.target.y + ') plotted!'
            } : {
              correct: false,
              msg: '❌ Point (' + gridChallenge.target.x + ', ' + gridChallenge.target.y + ') not found on your grid.'
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
        }), gridPoints.map((p, i) => React.createElement('circle', {
          key: i,
          cx: toSvg(p.x, 'x'),
          cy: toSvg(p.y, 'y'),
          r: 5,
          fill: '#0891b2',
          stroke: '#fff',
          strokeWidth: 2,
          className: 'cursor-pointer'
        })), gridPoints.map((p, i) => React.createElement('text', {
          key: 't' + i,
          x: toSvg(p.x, 'x') + 8,
          y: toSvg(p.y, 'y') - 8,
          className: 'text-[10px] fill-cyan-700 font-bold'
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
        }, "\uD83D\uDCCD Plot a Point"), /*#__PURE__*/React.createElement("button", {
          onClick: () => {
            setGridPoints([]);
            setGridChallenge(null);
            setGridFeedback(null);
          },
          className: "px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all"
        }, "\u21BA Clear")), gridChallenge && /*#__PURE__*/React.createElement("div", {
          className: "bg-cyan-50 rounded-lg p-3 border border-cyan-200"
        }, /*#__PURE__*/React.createElement("p", {
          className: "text-sm font-bold text-cyan-800 mb-2"
        }, "\uD83D\uDCCD Plot the point (", gridChallenge.target.x, ", ", gridChallenge.target.y, ")"), /*#__PURE__*/React.createElement("div", {
          className: "flex gap-2 items-center"
        }, /*#__PURE__*/React.createElement("span", {
          className: "text-xs text-cyan-600"
        }, "Points placed: ", /*#__PURE__*/React.createElement("span", {
          className: "font-bold"
        }, gridPoints.length)), /*#__PURE__*/React.createElement("button", {
          onClick: checkGrid,
          className: "ml-auto px-4 py-1.5 bg-cyan-500 text-white font-bold rounded-lg text-sm hover:bg-cyan-600 transition-all"
        }, "\u2714 Check")), gridFeedback && /*#__PURE__*/React.createElement("p", {
          className: 'text-sm font-bold mt-2 ' + (gridFeedback.correct ? 'text-green-600' : 'text-red-600')
        }, gridFeedback.msg)), /*#__PURE__*/React.createElement("div", {
          className: "grid grid-cols-2 gap-3"
        }, /*#__PURE__*/React.createElement("div", {
          className: "bg-white rounded-xl p-3 border border-cyan-100 text-center"
        }, /*#__PURE__*/React.createElement("div", {
          className: "text-xs font-bold text-cyan-600 uppercase mb-1"
        }, "Points"), /*#__PURE__*/React.createElement("div", {
          className: "text-2xl font-bold text-cyan-800"
        }, gridPoints.length)), /*#__PURE__*/React.createElement("div", {
          className: "bg-white rounded-xl p-3 border border-cyan-100 text-center"
        }, /*#__PURE__*/React.createElement("div", {
          className: "text-xs font-bold text-cyan-600 uppercase mb-1"
        }, "Quadrants Used"), /*#__PURE__*/React.createElement("div", {
          className: "text-2xl font-bold text-cyan-800"
        }, new Set(gridPoints.map(p => p.x >= 0 && p.y >= 0 ? 'I' : p.x < 0 && p.y >= 0 ? 'II' : p.x < 0 && p.y < 0 ? 'III' : 'IV')).size))));
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
      }, "\uD83C\uDF55 Fraction Tiles")), /*#__PURE__*/React.createElement("div", {
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
      }, t('explore.next_challenge'))))))));
// ═══════════════════════════════════════════════════════
// TIER 3: Calculus Visualizer, Wave Simulator, Cell Diagram
// ═══════════════════════════════════════════════════════

), stemLabTab === 'explore' && stemLabTool === 'calculus' && (() => {
  const d = labToolData.calculus;
  const upd = (key, val) => setLabToolData(prev => ({...prev, calculus: {...prev.calculus, [key]: val}}));
  const W = 440, H = 300, pad = 40;
  const evalF = x => d.a * x * x + d.b * x + d.c;
  const xR = {min: -2, max: Math.max(d.xMax + 1, 6)};
  const yMax = Math.max(...Array.from({length: 50}, (_, i) => Math.abs(evalF(xR.min + i/49 * (xR.max - xR.min)))), 1);
  const yR = {min: -yMax * 0.2, max: yMax * 1.2};
  const toSX = x => pad + ((x - xR.min) / (xR.max - xR.min)) * (W - 2*pad);
  const toSY = y => (H - pad) - ((y - yR.min) / (yR.max - yR.min)) * (H - 2*pad);
  const dx = (d.xMax - d.xMin) / d.n;
  const rects = [];
  let area = 0;
  for (let i = 0; i < d.n; i++) {
    const xi = d.xMin + i * dx;
    const yi = d.mode === 'left' ? evalF(xi) : d.mode === 'right' ? evalF(xi + dx) : evalF(xi + dx/2);
    area += yi * dx;
    rects.push({x: xi, w: dx, h: yi});
  }
  const curvePts = [];
  for (let px = 0; px <= W - 2*pad; px += 2) {
    const x = xR.min + (px / (W - 2*pad)) * (xR.max - xR.min);
    curvePts.push(`${toSX(x)},${toSY(evalF(x))}`);
  }
  return React.createElement("div", {className: "max-w-3xl mx-auto animate-in fade-in duration-200"},
    React.createElement("div", {className: "flex items-center gap-3 mb-4"},
      React.createElement("button", {onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg"}, React.createElement(ArrowLeft, {size: 18, className: "text-slate-500"})),
      React.createElement("h3", {className: "text-lg font-bold text-slate-800"}, "∫ Calculus Visualizer"),
      React.createElement("div", {className: "flex gap-1 ml-auto"},
        ["left","midpoint","right"].map(m => React.createElement("button", {key: m, onClick: () => upd("mode", m), className: `px-3 py-1 rounded-lg text-xs font-bold ${d.mode === m ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}, m))
      )
    ),
    React.createElement("svg", {viewBox: `0 0 ${W} ${H}`, className: "w-full bg-white rounded-xl border border-red-200", style: {maxHeight: "320px"}},
      React.createElement("line", {x1: pad, y1: toSY(0), x2: W-pad, y2: toSY(0), stroke: "#94a3b8", strokeWidth: 1}),
      React.createElement("line", {x1: toSX(0), y1: pad, x2: toSX(0), y2: H-pad, stroke: "#94a3b8", strokeWidth: 1}),
      rects.map((r, i) => React.createElement("rect", {key: i, x: toSX(r.x), y: r.h >= 0 ? toSY(r.h) : toSY(0), width: Math.abs(toSX(r.x + r.w) - toSX(r.x)), height: Math.abs(toSY(r.h) - toSY(0)), fill: "rgba(239,68,68,0.2)", stroke: "#ef4444", strokeWidth: 1})),
      curvePts.length > 1 && React.createElement("polyline", {points: curvePts.join(" "), fill: "none", stroke: "#1e293b", strokeWidth: 2.5}),
      React.createElement("rect", {x: toSX(d.xMin), y: pad, width: Math.abs(toSX(d.xMax) - toSX(d.xMin)), height: H-2*pad, fill: "none", stroke: "#ef4444", strokeWidth: 1, strokeDasharray: "4 2"}),
      React.createElement("text", {x: W/2, y: H-8, textAnchor: "middle", className: "text-[10px]", fill: "#64748b"}, `f(x) = ${d.a}x² + ${d.b}x + ${d.c} | Area ≈ ${area.toFixed(3)} (n=${d.n}, ${d.mode})`)
    ),
    React.createElement("div", {className: "grid grid-cols-2 gap-3 mt-3"},
      [{k:'xMin',label:'a (lower)',min:-2,max:8,step:0.5},{k:'xMax',label:'b (upper)',min:1,max:10,step:0.5},{k:'n',label:'Rectangles (n)',min:2,max:50,step:1},{k:'a',label:'Coeff a',min:-3,max:3,step:0.1}].map(s =>
        React.createElement("div", {key: s.k, className: "text-center"},
          React.createElement("label", {className: "text-xs font-bold text-slate-500"}, s.label + ": " + d[s.k]),
          React.createElement("input", {type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k], onChange: e => upd(s.k, parseFloat(e.target.value)), className: "w-full accent-red-600"})
        )
      )
    ),
    React.createElement("button", {onClick: () => { setToolSnapshots(prev => [...prev, {id:'calc-'+Date.now(), tool:'calculus', label: `∫[${d.xMin},${d.xMax}] n=${d.n}`, data:{...d}, timestamp: Date.now()}]); addToast('📸 Calculus snapshot saved!','success'); }, className: "mt-3 px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200"}, "📸 Snapshot")
  );
})()

, stemLabTab === 'explore' && stemLabTool === 'wave' && (() => {
  const d = labToolData.wave;
  const upd = (key, val) => setLabToolData(prev => ({...prev, wave: {...prev.wave, [key]: val}}));
  const W = 440, H = 250, pad = 30;
  const toSX = x => pad + (x / (4 * Math.PI)) * (W - 2*pad);
  const toSY = y => H/2 - y * (H/2 - pad);
  const wave1Pts = [], wave2Pts = [], sumPts = [];
  for (let px = 0; px <= W - 2*pad; px += 2) {
    const x = (px / (W - 2*pad)) * 4 * Math.PI;
    const y1 = d.amplitude * Math.sin(d.frequency * x + d.phase);
    wave1Pts.push(`${toSX(x)},${toSY(y1)}`);
    if (d.wave2) {
      const y2 = d.amp2 * Math.sin(d.freq2 * x);
      wave2Pts.push(`${toSX(x)},${toSY(y2)}`);
      sumPts.push(`${toSX(x)},${toSY(y1 + y2)}`);
    }
  }
  return React.createElement("div", {className: "max-w-3xl mx-auto animate-in fade-in duration-200"},
    React.createElement("div", {className: "flex items-center gap-3 mb-4"},
      React.createElement("button", {onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg"}, React.createElement(ArrowLeft, {size: 18, className: "text-slate-500"})),
      React.createElement("h3", {className: "text-lg font-bold text-slate-800"}, "🌊 Wave Simulator"),
      React.createElement("label", {className: "ml-auto flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer"},
        React.createElement("input", {type: "checkbox", checked: d.wave2, onChange: e => upd('wave2', e.target.checked), className: "accent-cyan-600"}),
        "Interference Mode"
      )
    ),
    React.createElement("svg", {viewBox: `0 0 ${W} ${H}`, className: "w-full bg-gradient-to-b from-cyan-50 to-white rounded-xl border border-cyan-200", style: {maxHeight: "260px"}},
      React.createElement("line", {x1: pad, y1: H/2, x2: W-pad, y2: H/2, stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "4 2"}),
      wave1Pts.length > 1 && React.createElement("polyline", {points: wave1Pts.join(" "), fill: "none", stroke: "#0891b2", strokeWidth: 2.5}),
      wave2Pts.length > 1 && React.createElement("polyline", {points: wave2Pts.join(" "), fill: "none", stroke: "#f59e0b", strokeWidth: 2, strokeDasharray: "6 3"}),
      sumPts.length > 1 && React.createElement("polyline", {points: sumPts.join(" "), fill: "none", stroke: "#ef4444", strokeWidth: 3}),
      React.createElement("text", {x: W-pad-5, y: H/2-5, textAnchor: "end", style: {fontSize: '9px'}, fill: "#0891b2"}, "Wave 1"),
      d.wave2 && React.createElement("text", {x: W-pad-5, y: H/2+15, textAnchor: "end", style: {fontSize: '9px'}, fill: "#f59e0b"}, "Wave 2"),
      d.wave2 && React.createElement("text", {x: W-pad-5, y: H/2+30, textAnchor: "end", style: {fontSize: '9px'}, fill: "#ef4444"}, "Superposition")
    ),
    React.createElement("div", {className: "grid grid-cols-3 gap-3 mt-3"},
      [{k:'amplitude',label:'Amplitude',min:0.1,max:2,step:0.1},{k:'frequency',label:'Frequency',min:0.1,max:4,step:0.1},{k:'phase',label:'Phase',min:0,max:6.28,step:0.1}].map(s =>
        React.createElement("div", {key: s.k, className: "text-center"},
          React.createElement("label", {className: "text-xs font-bold text-cyan-600"}, s.label + ": " + Number(d[s.k]).toFixed(1)),
          React.createElement("input", {type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k], onChange: e => upd(s.k, parseFloat(e.target.value)), className: "w-full accent-cyan-600"})
        )
      )
    ),
    d.wave2 && React.createElement("div", {className: "grid grid-cols-2 gap-3 mt-2"},
      [{k:'amp2',label:'Wave 2 Amp',min:0.1,max:2,step:0.1},{k:'freq2',label:'Wave 2 Freq',min:0.1,max:4,step:0.1}].map(s =>
        React.createElement("div", {key: s.k, className: "text-center"},
          React.createElement("label", {className: "text-xs font-bold text-amber-600"}, s.label + ": " + Number(d[s.k]).toFixed(1)),
          React.createElement("input", {type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k], onChange: e => upd(s.k, parseFloat(e.target.value)), className: "w-full accent-amber-500"})
        )
      )
    ),
    React.createElement("div", {className: "mt-3 bg-slate-50 rounded-lg p-2 text-center text-xs text-slate-500"},
      `λ = ${(2*Math.PI/d.frequency).toFixed(2)} | T = ${(1/d.frequency).toFixed(2)}s | v = ${(d.frequency * 2*Math.PI/d.frequency).toFixed(2)} units/s`
    ),
    React.createElement("button", {onClick: () => { setToolSnapshots(prev => [...prev, {id:'wv-'+Date.now(), tool:'wave', label: `A=${d.amplitude} f=${d.frequency}`, data:{...d}, timestamp: Date.now()}]); addToast('📸 Wave snapshot saved!','success'); }, className: "mt-3 px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200"}, "📸 Snapshot")
  );
})()

, stemLabTab === 'explore' && stemLabTool === 'cell' && (() => {
  const d = labToolData.cell;
  const upd = (key, val) => setLabToolData(prev => ({...prev, cell: {...prev.cell, [key]: val}}));
  const W = 440, H = 380;
  const organelles = [
    {id:'nucleus', label:'Nucleus', x:220, y:190, r:45, color:'#7c3aed', desc:'Contains DNA and controls cell activities. Has a double membrane with nuclear pores.'},
    {id:'mitochondria', label:'Mitochondria', x:130, y:140, r:22, color:'#ef4444', desc:'Powerhouse of the cell. Produces ATP through cellular respiration.'},
    {id:'ribosome', label:'Ribosomes', x:310, y:130, r:10, color:'#1e293b', desc:'Synthesize proteins from mRNA instructions. Found free or on rough ER.'},
    {id:'er', label:'Endoplasmic Reticulum', x:310, y:200, r:28, color:'#2563eb', desc:'Rough ER has ribosomes and makes proteins. Smooth ER makes lipids.'},
    {id:'golgi', label:'Golgi Apparatus', x:140, y:260, r:25, color:'#d97706', desc:'Packages and ships proteins. Modifies, sorts, and delivers cellular products.'},
    {id:'lysosome', label:'Lysosomes', x:310, y:280, r:16, color:'#16a34a', desc:'Digestive enzymes break down waste, old organelles, and foreign material.'},
    {id:'membrane', label:'Cell Membrane', x:220, y:360, r:20, color:'#0891b2', desc:'Phospholipid bilayer controls what enters/exits the cell. Semi-permeable.'},
    {id:'cytoplasm', label:'Cytoplasm', x:100, y:320, r:18, color:'#94a3b8', desc:'Gel-like fluid filling the cell. Site of many chemical reactions.'},
  ];
  if (d.type === 'plant') {
    organelles.push(
      {id:'cellwall', label:'Cell Wall', x:220, y:30, r:20, color:'#65a30d', desc:'Rigid outer layer made of cellulose. Provides structure and protection.'},
      {id:'chloroplast', label:'Chloroplast', x:330, y:330, r:22, color:'#22c55e', desc:'Site of photosynthesis. Contains chlorophyll to capture light energy.'},
      {id:'vacuole', label:'Central Vacuole', x:180, y:130, r:35, color:'#a78bfa', desc:'Large water-filled sac providing turgor pressure and storing nutrients.'}
    );
  }
  const selected = organelles.find(o => o.id === d.selectedOrganelle);
  return React.createElement("div", {className: "max-w-3xl mx-auto animate-in fade-in duration-200"},
    React.createElement("div", {className: "flex items-center gap-3 mb-4"},
      React.createElement("button", {onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg"}, React.createElement(ArrowLeft, {size: 18, className: "text-slate-500"})),
      React.createElement("h3", {className: "text-lg font-bold text-slate-800"}, "🧫 Cell Diagram"),
      React.createElement("div", {className: "flex gap-1 ml-auto"},
        ["animal","plant"].map(t2 => React.createElement("button", {key: t2, onClick: () => { upd("type", t2); upd("selectedOrganelle", null); }, className: `px-3 py-1 rounded-lg text-xs font-bold capitalize ${d.type === t2 ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600'}`}, t2 + " Cell"))
      )
    ),
    React.createElement("svg", {viewBox: `0 0 ${W} ${H}`, className: "w-full bg-gradient-to-b from-green-50 to-white rounded-xl border border-green-200", style: {maxHeight: "380px"}},
      d.type === 'plant' ? React.createElement("rect", {x: 20, y: 20, width: W-40, height: H-40, rx: 8, fill: "none", stroke: "#65a30d", strokeWidth: 4}) : null,
      React.createElement("ellipse", {cx: W/2, cy: H/2, rx: W/2-30, ry: H/2-30, fill: "rgba(209,250,229,0.3)", stroke: "#0891b2", strokeWidth: 3}),
      organelles.map(o => React.createElement("g", {key: o.id, style: {cursor: 'pointer'}, onClick: () => upd('selectedOrganelle', o.id === d.selectedOrganelle ? null : o.id)},
        o.id === 'er' ? React.createElement("path", {d: `M${o.x-25},${o.y-15} Q${o.x},${o.y-25} ${o.x+25},${o.y-15} Q${o.x+10},${o.y} ${o.x+25},${o.y+15} Q${o.x},${o.y+25} ${o.x-25},${o.y+15} Q${o.x-10},${o.y} ${o.x-25},${o.y-15}`, fill: o.color+'33', stroke: o.color, strokeWidth: d.selectedOrganelle === o.id ? 3 : 1.5}) :
        o.id === 'golgi' ? React.createElement("g", null, [-8,-3,2,7,12].map((off,i) => React.createElement("ellipse", {key: i, cx: o.x, cy: o.y+off, rx: o.r, ry: 4, fill: o.color+'44', stroke: o.color, strokeWidth: d.selectedOrganelle === o.id ? 2 : 1}))) :
        o.id === 'mitochondria' ? React.createElement("ellipse", {cx: o.x, cy: o.y, rx: o.r+8, ry: o.r, fill: o.color+'33', stroke: o.color, strokeWidth: d.selectedOrganelle === o.id ? 3 : 1.5, transform: `rotate(-20 ${o.x} ${o.y})`}) :
        React.createElement("circle", {cx: o.x, cy: o.y, r: o.r, fill: o.color+'33', stroke: o.color, strokeWidth: d.selectedOrganelle === o.id ? 3 : 1.5}),
        d.labels && React.createElement("text", {x: o.x, y: o.y - o.r - 6, textAnchor: "middle", style: {fontSize: '9px', fontWeight: 'bold'}, fill: o.color}, o.label)
      ))
    ),
    selected && React.createElement("div", {className: "mt-3 bg-white rounded-xl border-2 p-4 animate-in fade-in", style: {borderColor: selected.color}},
      React.createElement("h4", {className: "font-bold text-sm mb-1", style: {color: selected.color}}, selected.label),
      React.createElement("p", {className: "text-xs text-slate-600 leading-relaxed"}, selected.desc)
    ),
    !selected && React.createElement("p", {className: "mt-3 text-center text-xs text-slate-400"}, "Click an organelle to learn about it"),
    React.createElement("div", {className: "flex gap-3 mt-3 items-center"},
      React.createElement("label", {className: "flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer"},
        React.createElement("input", {type: "checkbox", checked: d.labels, onChange: e => upd('labels', e.target.checked), className: "accent-green-600"}),
        "Show Labels"
      ),
      React.createElement("button", {onClick: () => { setToolSnapshots(prev => [...prev, {id:'ce-'+Date.now(), tool:'cell', label: d.type+' cell'+(d.selectedOrganelle ? ': '+d.selectedOrganelle : ''), data:{...d}, timestamp: Date.now()}]); addToast('📸 Cell snapshot saved!','success'); }, className: "ml-auto px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200"}, "📸 Snapshot")
    )
  );
})()
// ═══════════════════════════════════════════════════════
// NEW TOOLS: Function Grapher, Physics, Chem, Punnett, Circuit, Data, Inequality, Molecule
// ═══════════════════════════════════════════════════════

), stemLabTab === 'explore' && stemLabTool === 'funcGrapher' && (() => {
        const d = labToolData.funcGrapher;
        const upd = (key, val) => setLabToolData(prev => ({ ...prev, funcGrapher: { ...prev.funcGrapher, [key]: val } }));
        const W = 400, H = 300, pad = 40;
        const xR = d.range, yR = d.range;
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
          React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'fg-' + Date.now(), tool: 'funcGrapher', label: d.type + ': a=' + d.a + ' b=' + d.b, data: { ...d }, timestamp: Date.now() }]); addToast('📸 Function snapshot saved!', 'success'); }, className: "mt-3 px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200" }, "📸 Snapshot")
        );
      })()

        , stemLabTab === 'explore' && stemLabTool === 'physics' && (() => {
          const d = labToolData.physics;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, physics: { ...prev.physics, [key]: val } }));
          const W = 440, H = 280, pad = 30;
          const rad = d.angle * Math.PI / 180;
          const vx = d.velocity * Math.cos(rad), vy = d.velocity * Math.sin(rad);
          const tFlight = 2 * vy / d.gravity;
          const range = vx * tFlight;
          const maxH = (vy * vy) / (2 * d.gravity);
          const scale = Math.min((W - 2 * pad) / Math.max(range, 1), (H - 2 * pad) / Math.max(maxH, 1)) * 0.85;
          const trajPts = [];
          for (let i = 0; i <= 50; i++) {
            const tt = (i / 50) * tFlight;
            const px = pad + vx * tt * scale;
            const py = (H - pad) - (vy * tt - 0.5 * d.gravity * tt * tt) * scale;
            if (px >= pad && px <= W - pad && py >= pad && py <= H - pad) trajPts.push(`${px},${py}`);
          }
          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-4" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "⚡ Physics Simulator")
            ),
            React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, className: "w-full bg-gradient-to-b from-sky-50 to-white rounded-xl border border-sky-200", style: { maxHeight: "300px" } },
              React.createElement("line", { x1: pad, y1: H - pad, x2: W - pad, y2: H - pad, stroke: "#65a30d", strokeWidth: 2 }),
              trajPts.length > 1 && React.createElement("polyline", { points: trajPts.join(" "), fill: "none", stroke: "#ef4444", strokeWidth: 2.5, strokeDasharray: "4 2" }),
              React.createElement("line", { x1: pad, y1: H - pad, x2: pad + Math.cos(rad) * 60, y2: H - pad - Math.sin(rad) * 60, stroke: "#3b82f6", strokeWidth: 3, markerEnd: "url(#arrow)" }),
              React.createElement("defs", null, React.createElement("marker", { id: "arrow", viewBox: "0 0 10 10", refX: 5, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto" }, React.createElement("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#3b82f6" }))),
              React.createElement("text", { x: W / 2, y: 20, textAnchor: "middle", className: "text-xs", fill: "#64748b" }, `Range: ${range.toFixed(1)}m | Max Height: ${maxH.toFixed(1)}m | Time: ${tFlight.toFixed(2)}s`)
            ),
            React.createElement("div", { className: "grid grid-cols-3 gap-3 mt-3" },
              [{ k: 'angle', label: 'Angle (°)', min: 5, max: 85, step: 1 }, { k: 'velocity', label: 'Velocity (m/s)', min: 5, max: 50, step: 1 }, { k: 'gravity', label: 'Gravity (m/s²)', min: 1, max: 20, step: 0.1 }].map(s =>
                React.createElement("div", { key: s.k, className: "text-center" },
                  React.createElement("label", { className: "text-xs font-bold text-slate-500" }, s.label + ": " + d[s.k]),
                  React.createElement("input", { type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k], onChange: e => upd(s.k, parseFloat(e.target.value)), className: "w-full accent-sky-600" })
                )
              )
            ),
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'ph-' + Date.now(), tool: 'physics', label: d.angle + '° ' + d.velocity + 'm/s', data: { ...d }, timestamp: Date.now() }]); addToast('📸 Physics snapshot saved!', 'success'); }, className: "mt-3 px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200" }, "📸 Snapshot")
          );
        })()

        , stemLabTab === 'explore' && stemLabTool === 'chemBalance' && (() => {
          const d = labToolData.chemBalance;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, chemBalance: { ...prev.chemBalance, [key]: val } }));
          const presets = [
            { name: 'Water', eq: 'H₂ + O₂ → H₂O', coeffs: [2, 1, 2, 0], target: [2, 1, 2, 0], atoms: { H: [2, 0, 2], O: [0, 2, 1] } },
            { name: 'Rust', eq: 'Fe + O₂ → Fe₂O₃', coeffs: [1, 1, 1, 0], target: [4, 3, 2, 0], atoms: { Fe: [1, 0, 2], O: [0, 2, 3] } },
            { name: 'Combustion', eq: 'CH₄ + O₂ → CO₂ + H₂O', coeffs: [1, 1, 1, 1], target: [1, 2, 1, 2], atoms: { C: [1, 0, 1, 0], H: [4, 0, 0, 2], O: [0, 2, 2, 1] } },
            { name: 'Photosynthesis', eq: 'CO₂ + H₂O → C₆H₁₂O₆ + O₂', coeffs: [1, 1, 1, 1], target: [6, 6, 1, 6], atoms: { C: [1, 0, 6, 0], O: [2, 1, 6, 2], H: [0, 2, 12, 0] } },
          ];
          const preset = presets.find(p => p.name === d.equation) || presets[0];
          const checkBalance = () => {
            const isCorrect = d.coefficients.every((c, i) => c === preset.target[i]);
            upd('feedback', isCorrect ? { correct: true, msg: '✅ Balanced! Atom counts match on both sides.' } : { correct: false, msg: '❌ Not balanced yet. Check atom counts on each side.' });
          };
          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-4" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "⚗️ Equation Balancer"),
              React.createElement("div", { className: "flex gap-1 ml-auto" }, presets.map(p => React.createElement("button", { key: p.name, onClick: () => { upd('equation', p.name); upd('coefficients', [1, 1, 1, 1]); upd('feedback', null); }, className: `px-3 py-1 rounded-lg text-xs font-bold ${d.equation === p.name ? 'bg-lime-600 text-white' : 'bg-slate-100 text-slate-600'}` }, p.name)))
            ),
            React.createElement("div", { className: "bg-white rounded-xl border border-lime-200 p-6 text-center" },
              React.createElement("p", { className: "text-2xl font-bold text-slate-800 mb-4 tracking-wide" },
                d.coefficients.map((c, i) => (i > 0 && i < preset.target.filter(t => t > 0).length ? (i < preset.eq.split('→')[0].split('+').length ? ' + ' : (i === preset.eq.split('→')[0].split('+').length ? ' → ' : ' + ')) : '') + (c > 1 ? c : '') + preset.eq.split(/[+→]/).map(s => s.trim())[i]).join('')
              ),
              React.createElement("div", { className: "flex justify-center gap-4 mb-4" },
                d.coefficients.slice(0, preset.target.filter(t => t > 0).length).map((c, i) =>
                  React.createElement("div", { key: i, className: "flex flex-col items-center gap-1" },
                    React.createElement("button", { onClick: () => { const nc = [...d.coefficients]; nc[i] = Math.min(10, nc[i] + 1); upd('coefficients', nc); upd('feedback', null); }, className: "w-8 h-8 bg-lime-100 rounded-lg font-bold text-lime-700 hover:bg-lime-200" }, "+"),
                    React.createElement("span", { className: "text-xl font-bold text-slate-700 w-8 text-center" }, c),
                    React.createElement("button", { onClick: () => { const nc = [...d.coefficients]; nc[i] = Math.max(1, nc[i] - 1); upd('coefficients', nc); upd('feedback', null); }, className: "w-8 h-8 bg-red-50 rounded-lg font-bold text-red-500 hover:bg-red-100" }, "−")
                  )
                )
              ),
              React.createElement("button", { onClick: checkBalance, className: "px-6 py-2 bg-lime-600 text-white font-bold rounded-lg hover:bg-lime-700" }, "⚖️ Check Balance"),
              d.feedback && React.createElement("p", { className: "mt-3 text-sm font-bold " + (d.feedback.correct ? 'text-green-600' : 'text-red-600') }, d.feedback.msg)
            )
          );
        })()

        , stemLabTab === 'explore' && stemLabTool === 'punnett' && (() => {
          const d = labToolData.punnett;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, punnett: { ...prev.punnett, [key]: val } }));
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
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'pn-' + Date.now(), tool: 'punnett', label: d.parent1.join('') + ' × ' + d.parent2.join(''), data: { ...d }, timestamp: Date.now() }]); addToast('📸 Punnett snapshot saved!', 'success'); }, className: "mt-3 px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200" }, "📸 Snapshot")
          );
        })()

        , stemLabTab === 'explore' && stemLabTool === 'circuit' && (() => {
          const d = labToolData.circuit;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, circuit: { ...prev.circuit, [key]: val } }));
          const totalR = d.components.filter(c => c.type === 'resistor').reduce((s, c) => s + c.value, 0) || 1;
          const current = d.voltage / totalR;
          const power = d.voltage * current;
          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-4" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "🔌 Circuit Builder")
            ),
            React.createElement("div", { className: "flex gap-2 mb-3" },
              React.createElement("button", { onClick: () => upd('components', [...d.components, { type: 'resistor', value: 100, id: Date.now() }]), className: "px-3 py-1.5 bg-yellow-100 text-yellow-800 font-bold rounded-lg text-sm border border-yellow-300 hover:bg-yellow-200" }, "➕ Add Resistor"),
              React.createElement("button", { onClick: () => upd('components', [...d.components, { type: 'bulb', value: 50, id: Date.now() }]), className: "px-3 py-1.5 bg-amber-100 text-amber-800 font-bold rounded-lg text-sm border border-amber-300 hover:bg-amber-200" }, "💡 Add Bulb"),
              React.createElement("button", { onClick: () => upd('components', []), className: "px-3 py-1.5 bg-red-50 text-red-600 font-bold rounded-lg text-sm border border-red-200 hover:bg-red-100" }, "🗑 Clear")
            ),
            React.createElement("div", { className: "bg-white rounded-xl border border-yellow-200 p-4" },
              React.createElement("div", { className: "flex items-center gap-3 mb-4" },
                React.createElement("span", { className: "text-2xl" }, "🔋"),
                React.createElement("span", { className: "text-sm font-bold text-slate-600" }, "Battery:"),
                React.createElement("input", { type: "range", min: 1, max: 24, step: 0.5, value: d.voltage, onChange: e => upd('voltage', parseFloat(e.target.value)), className: "flex-1 accent-yellow-600" }),
                React.createElement("span", { className: "font-bold text-yellow-700" }, d.voltage + "V")
              ),
              d.components.length === 0 && React.createElement("p", { className: "text-center text-slate-400 py-8" }, "Add components to build your circuit"),
              React.createElement("div", { className: "flex flex-wrap gap-2" },
                d.components.map((comp, i) => React.createElement("div", { key: comp.id, className: "flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200" },
                  React.createElement("span", null, comp.type === 'resistor' ? '⫘' : '💡'),
                  React.createElement("input", { type: "number", min: 1, max: 10000, value: comp.value, onChange: e => { const nc = [...d.components]; nc[i].value = parseInt(e.target.value) || 1; upd('components', nc); }, className: "w-20 px-2 py-1 text-sm border rounded text-center font-mono" }),
                  React.createElement("span", { className: "text-xs text-slate-500" }, "Ω"),
                  React.createElement("button", { onClick: () => upd('components', d.components.filter((_, j) => j !== i)), className: "text-red-400 hover:text-red-600" }, "×")
                ))
              )
            ),
            React.createElement("div", { className: "mt-3 grid grid-cols-3 gap-3" },
              [{ label: 'Total Resistance', val: totalR.toFixed(1) + 'Ω', color: 'yellow' }, { label: 'Current', val: current.toFixed(3) + 'A', color: 'blue' }, { label: 'Power', val: power.toFixed(2) + 'W', color: 'red' }].map(m =>
                React.createElement("div", { key: m.label, className: `text-center p-3 bg-${m.color}-50 rounded-xl border border-${m.color}-200` },
                  React.createElement("p", { className: `text-xs font-bold text-${m.color}-600 uppercase` }, m.label),
                  React.createElement("p", { className: `text-lg font-bold text-${m.color}-800` }, m.val)
                )
              )
            ),
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'ci-' + Date.now(), tool: 'circuit', label: d.components.length + ' parts ' + d.voltage + 'V', data: { ...d }, timestamp: Date.now() }]); addToast('📸 Circuit snapshot saved!', 'success'); }, className: "mt-3 px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200" }, "📸 Snapshot")
          );
        })()

        , stemLabTab === 'explore' && stemLabTool === 'dataPlot' && (() => {
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
              React.createElement("span", { className: "text-xs text-slate-400 ml-auto" }, d.points.length + " points")
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
            React.createElement("div", { className: "flex gap-3 mt-3" },
              React.createElement("button", { onClick: () => upd('points', d.points.slice(0, -1)), className: "px-3 py-1.5 bg-slate-100 text-slate-600 font-bold rounded-lg text-sm" }, "↩ Undo"),
              React.createElement("button", { onClick: () => upd('points', []), className: "px-3 py-1.5 bg-red-50 text-red-600 font-bold rounded-lg text-sm" }, "🗑 Clear"),
              d.points.length >= 2 && React.createElement("span", { className: "text-xs text-slate-500 self-center ml-auto" }, "y = " + slope.toFixed(2) + "x + " + intercept.toFixed(2) + " | r² = " + r2.toFixed(3))
            ),
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'dp-' + Date.now(), tool: 'dataPlot', label: d.points.length + ' pts r²=' + r2.toFixed(2), data: { points: [...d.points] }, timestamp: Date.now() }]); addToast('📸 Data snapshot saved!', 'success'); }, className: "mt-3 px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200" }, "📸 Snapshot")
          );
        })()

        , stemLabTab === 'explore' && stemLabTool === 'inequality' && (() => {
          const d = labToolData.inequality;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, inequality: { ...prev.inequality, [key]: val } }));
          const W = 400, H = 100, pad = 30;
          const toSX = x => pad + ((x - d.range.min) / (d.range.max - d.range.min)) * (W - 2 * pad);
          const parseIneq = expr => { const m = expr.match(/([a-z])\s*([<>]=?|[≤≥])\s*(-?\d+\.?\d*)/); return m ? { v: m[1], op: m[2], val: parseFloat(m[3]) } : null; };
          const ineq = parseIneq(d.expr);
          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-4" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "🎨 Inequality Grapher")
            ),
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
              ineq && React.createElement("line", { x1: toSX(ineq.val) + (ineq.op.includes('>') ? 10 : -10), y1: 40, x2: ineq.op.includes('>') ? W - pad : pad, y2: 40, stroke: "#d946ef", strokeWidth: 3 })
            ),
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'iq-' + Date.now(), tool: 'inequality', label: d.expr, data: { ...d }, timestamp: Date.now() }]); addToast('📸 Inequality snapshot saved!', 'success'); }, className: "mt-3 px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200" }, "📸 Snapshot")
          );
        })()

        , stemLabTab === 'explore' && stemLabTool === 'molecule' && (() => {
          const d = labToolData.molecule;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, molecule: { ...prev.molecule, [key]: val } }));
          const W = 400, H = 300;
          const presets = [
            { name: 'H₂O', atoms: [{ el: 'O', x: 200, y: 120, color: '#ef4444' }, { el: 'H', x: 140, y: 190, color: '#60a5fa' }, { el: 'H', x: 260, y: 190, color: '#60a5fa' }], bonds: [[0, 1], [0, 2]], formula: 'H2O' },
            { name: 'CO₂', atoms: [{ el: 'C', x: 200, y: 150, color: '#1e293b' }, { el: 'O', x: 120, y: 150, color: '#ef4444' }, { el: 'O', x: 280, y: 150, color: '#ef4444' }], bonds: [[0, 1], [0, 2]], formula: 'CO2' },
            { name: 'CH₄', atoms: [{ el: 'C', x: 200, y: 150, color: '#1e293b' }, { el: 'H', x: 200, y: 80, color: '#60a5fa' }, { el: 'H', x: 270, y: 180, color: '#60a5fa' }, { el: 'H', x: 130, y: 180, color: '#60a5fa' }, { el: 'H', x: 200, y: 220, color: '#60a5fa' }], bonds: [[0, 1], [0, 2], [0, 3], [0, 4]], formula: 'CH4' },
            { name: 'NaCl', atoms: [{ el: 'Na', x: 160, y: 150, color: '#a855f7' }, { el: 'Cl', x: 240, y: 150, color: '#22c55e' }], bonds: [[0, 1]], formula: 'NaCl' },
            { name: 'O₂', atoms: [{ el: 'O', x: 170, y: 150, color: '#ef4444' }, { el: 'O', x: 230, y: 150, color: '#ef4444' }], bonds: [[0, 1]], formula: 'O2' },
          ];
          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-4" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "🔬 Molecule Builder"),
              React.createElement("div", { className: "flex gap-1 ml-auto" }, presets.map(p => React.createElement("button", { key: p.name, onClick: () => { upd('atoms', p.atoms.map(a => ({ ...a }))); upd('bonds', [...p.bonds]); upd('formula', p.formula); }, className: `px-2 py-1 rounded-lg text-xs font-bold ${d.formula === p.formula ? 'bg-stone-700 text-white' : 'bg-stone-100 text-stone-600'}` }, p.name)))
            ),
            React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, className: "w-full bg-gradient-to-b from-slate-50 to-white rounded-xl border border-stone-200", style: { maxHeight: "300px" } },
              d.bonds.map((b, i) => d.atoms[b[0]] && d.atoms[b[1]] ? React.createElement("line", { key: 'b' + i, x1: d.atoms[b[0]].x, y1: d.atoms[b[0]].y, x2: d.atoms[b[1]].x, y2: d.atoms[b[1]].y, stroke: "#94a3b8", strokeWidth: 4, strokeLinecap: "round" }) : null),
              d.atoms.map((a, i) => React.createElement("g", { key: i },
                React.createElement("circle", { cx: a.x, cy: a.y, r: 24, fill: a.color || '#64748b', stroke: '#fff', strokeWidth: 3, style: { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' } }),
                React.createElement("text", { x: a.x, y: a.y + 5, textAnchor: "middle", fill: "white", style: { fontSize: '14px', fontWeight: 'bold' } }, a.el)
              ))
            ),
            React.createElement("div", { className: "mt-3 text-center" },
              React.createElement("span", { className: "text-sm font-bold text-slate-500" }, "Formula: "),
              React.createElement("span", { className: "text-lg font-bold text-slate-800" }, d.formula || '—'),
              React.createElement("span", { className: "text-xs text-slate-400 ml-4" }, d.atoms.length + " atoms, " + d.bonds.length + " bonds")
            ),
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'ml-' + Date.now(), tool: 'molecule', label: d.formula || 'molecule', data: { atoms: d.atoms.map(a => ({ ...a })), bonds: [...d.bonds], formula: d.formula }, timestamp: Date.now() }]); addToast('📸 Molecule snapshot saved!', 'success'); }, className: "mt-3 px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200" }, "📸 Snapshot")
          );
        })()
    };
  }
})();
