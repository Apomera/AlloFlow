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
        label: 'Fraction Tiles',
        desc: 'Circle and bar models for comparing, adding, and visualizing fractions.',
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
        id: 'cell', icon: '🧫', label: 'Cell Diagram',
        desc: 'Interactive labeled cell with organelles. Animal and plant cells.',
        color: 'green', ready: true
      },
      { id: 'solarSystem', icon: '\uD83C\uDF0D', label: 'Solar System' },
      { id: 'waterCycle', icon: '\uD83C\uDF0A', label: 'Water Cycle' },
      { id: 'rockCycle', icon: '\uD83E\uDEA8', label: 'Rock Cycle' },
      { id: 'ecosystem', icon: '\uD83D\uDC3A', label: 'Ecosystem' },
      { id: 'decomposer', icon: '⚗️', label: 'Decomposer', desc: 'Break materials into elements', ready: true },
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
      }
      ]].map(tool => tool.category
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
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'calc-' + Date.now(), tool: 'calculus', label: `∫[${d.xMin},${d.xMax}] n=${d.n}`, data: { ...d }, timestamp: Date.now() }]); addToast('📸 Calculus snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "📸 Snapshot")
          )
        })(),

        stemLabTab === 'explore' && stemLabTool === 'wave' && (() => {
          const d = labToolData.wave;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, wave: { ...prev.wave, [key]: val } }));
          const W = 440, H = 250, pad = 30;
          const toSX = x => pad + (x / (4 * Math.PI)) * (W - 2 * pad);
          const toSY = y => H / 2 - y * (H / 2 - pad);
          const wave1Pts = [], wave2Pts = [], sumPts = [];
          for (let px = 0; px <= W - 2 * pad; px += 2) {
            const x = (px / (W - 2 * pad)) * 4 * Math.PI;
            const y1 = d.amplitude * Math.sin(d.frequency * x + d.phase);
            wave1Pts.push(`${toSX(x)},${toSY(y1)}`);
            if (d.wave2) {
              const y2 = d.amp2 * Math.sin(d.freq2 * x);
              wave2Pts.push(`${toSX(x)},${toSY(y2)}`);
              sumPts.push(`${toSX(x)},${toSY(y1 + y2)}`);
            }
          }
          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-4" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "🌊 Wave Simulator"),
              React.createElement("p", { className: "text-xs text-slate-400 italic -mt-2 mb-3" }, "Visualize sine waves. Toggle Interference Mode for superposition."),
              React.createElement("label", { className: "ml-auto flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer" },
                React.createElement("input", { type: "checkbox", checked: d.wave2, onChange: e => upd('wave2', e.target.checked), className: "accent-cyan-600" }),
                "Interference Mode"
              )
            ),
            React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, className: "w-full bg-gradient-to-b from-cyan-50 to-white rounded-xl border border-cyan-200", style: { maxHeight: "260px" } },
              React.createElement("line", { x1: pad, y1: H / 2, x2: W - pad, y2: H / 2, stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "4 2" }),
              wave1Pts.length > 1 && React.createElement("polyline", { points: wave1Pts.join(" "), fill: "none", stroke: "#0891b2", strokeWidth: 2.5 }),
              wave2Pts.length > 1 && React.createElement("polyline", { points: wave2Pts.join(" "), fill: "none", stroke: "#f59e0b", strokeWidth: 2, strokeDasharray: "6 3" }),
              sumPts.length > 1 && React.createElement("polyline", { points: sumPts.join(" "), fill: "none", stroke: "#ef4444", strokeWidth: 3 }),
              React.createElement("text", { x: W - pad - 5, y: H / 2 - 5, textAnchor: "end", style: { fontSize: '9px' }, fill: "#0891b2" }, "Wave 1"),
              d.wave2 && React.createElement("text", { x: W - pad - 5, y: H / 2 + 15, textAnchor: "end", style: { fontSize: '9px' }, fill: "#f59e0b" }, "Wave 2"),
              d.wave2 && React.createElement("text", { x: W - pad - 5, y: H / 2 + 30, textAnchor: "end", style: { fontSize: '9px' }, fill: "#ef4444" }, "Superposition")
            ),
            React.createElement("div", { className: "grid grid-cols-3 gap-3 mt-3" },
              [{ k: 'amplitude', label: 'Amplitude', min: 0.1, max: 2, step: 0.1 }, { k: 'frequency', label: 'Frequency', min: 0.1, max: 4, step: 0.1 }, { k: 'phase', label: 'Phase', min: 0, max: 6.28, step: 0.1 }].map(s =>
                React.createElement("div", { key: s.k, className: "text-center" },
                  React.createElement("label", { className: "text-xs font-bold text-cyan-600" }, s.label + ": " + Number(d[s.k]).toFixed(1)),
                  React.createElement("input", { type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k], onChange: e => upd(s.k, parseFloat(e.target.value)), className: "w-full accent-cyan-600" })
                )
              )
            ),
            d.wave2 && React.createElement("div", { className: "grid grid-cols-2 gap-3 mt-2" },
              [{ k: 'amp2', label: 'Wave 2 Amp', min: 0.1, max: 2, step: 0.1 }, { k: 'freq2', label: 'Wave 2 Freq', min: 0.1, max: 4, step: 0.1 }].map(s =>
                React.createElement("div", { key: s.k, className: "text-center" },
                  React.createElement("label", { className: "text-xs font-bold text-amber-600" }, s.label + ": " + Number(d[s.k]).toFixed(1)),
                  React.createElement("input", { type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k], onChange: e => upd(s.k, parseFloat(e.target.value)), className: "w-full accent-amber-500" })
                )
              )
            ),
            React.createElement("div", { className: "mt-3 bg-slate-50 rounded-lg p-2 text-center text-xs text-slate-500" },
              `λ = ${(2 * Math.PI / d.frequency).toFixed(2)} | T = ${(1 / d.frequency).toFixed(2)}s | A = ${Number(d.amplitude).toFixed(1)}`
            ),
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'wv-' + Date.now(), tool: 'wave', label: `A=${d.amplitude} f=${d.frequency}`, data: { ...d }, timestamp: Date.now() }]); addToast('📸 Wave snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "📸 Snapshot")
          )
        })(),

        stemLabTab === 'explore' && stemLabTool === 'cell' && (() => {
          const d = labToolData.cell;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, cell: { ...prev.cell, [key]: val } }));
          const W = 440, H = 380;
          const organelles = [
            { id: 'nucleus', label: 'Nucleus', x: 220, y: 190, r: 45, color: '#7c3aed', desc: 'Contains DNA and controls cell activities. Has a double membrane with nuclear pores.' },
            { id: 'mitochondria', label: 'Mitochondria', x: 130, y: 140, r: 22, color: '#ef4444', desc: 'Powerhouse of the cell. Produces ATP through cellular respiration.' },
            { id: 'ribosome', label: 'Ribosomes', x: 310, y: 130, r: 10, color: '#1e293b', desc: 'Synthesize proteins from mRNA instructions. Found free or on rough ER.' },
            { id: 'er', label: 'Endoplasmic Reticulum', x: 310, y: 200, r: 28, color: '#2563eb', desc: 'Rough ER has ribosomes and makes proteins. Smooth ER makes lipids.' },
            { id: 'golgi', label: 'Golgi Apparatus', x: 140, y: 260, r: 25, color: '#d97706', desc: 'Packages and ships proteins. Modifies, sorts, and delivers cellular products.' },
            { id: 'lysosome', label: 'Lysosomes', x: 310, y: 280, r: 16, color: '#16a34a', desc: 'Digestive enzymes break down waste, old organelles, and foreign material.' },
            { id: 'membrane', label: 'Cell Membrane', x: 220, y: 360, r: 20, color: '#0891b2', desc: 'Phospholipid bilayer controls what enters/exits the cell. Semi-permeable.' },
            { id: 'cytoplasm', label: 'Cytoplasm', x: 100, y: 320, r: 18, color: '#94a3b8', desc: 'Gel-like fluid filling the cell. Site of many chemical reactions.' },
          ];
          if (d.type === 'plant') {
            organelles.push(
              { id: 'cellwall', label: 'Cell Wall', x: 220, y: 30, r: 20, color: '#65a30d', desc: 'Rigid outer layer made of cellulose. Provides structure and protection.' },
              { id: 'chloroplast', label: 'Chloroplast', x: 330, y: 330, r: 22, color: '#22c55e', desc: 'Site of photosynthesis. Contains chlorophyll to capture light energy.' },
              { id: 'vacuole', label: 'Central Vacuole', x: 180, y: 130, r: 35, color: '#a78bfa', desc: 'Large water-filled sac providing turgor pressure and storing nutrients.' }
            );
          }
          const selected = organelles.find(o => o.id === d.selectedOrganelle);
          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-4" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "🧫 Cell Diagram"),
              React.createElement("div", { className: "flex gap-1 ml-auto" },
                ["animal", "plant"].map(t2 => React.createElement("button", { key: t2, onClick: () => { upd("type", t2); upd("selectedOrganelle", null); }, className: `px-3 py-1 rounded-lg text-xs font-bold capitalize ${d.type === t2 ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600'}` }, t2 + " Cell"))
              )
            ),
            React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, className: "w-full bg-gradient-to-b from-green-50 to-white rounded-xl border border-green-200", style: { maxHeight: "380px" } },
              d.type === 'plant' ? React.createElement("rect", { x: 20, y: 20, width: W - 40, height: H - 40, rx: 8, fill: "none", stroke: "#65a30d", strokeWidth: 4 }) : null,
              React.createElement("ellipse", { cx: W / 2, cy: H / 2, rx: W / 2 - 30, ry: H / 2 - 30, fill: "rgba(209,250,229,0.3)", stroke: "#0891b2", strokeWidth: 3 }),
              organelles.map(o => React.createElement("g", { key: o.id, style: { cursor: 'pointer' }, onClick: () => { if (d.quizMode) { if (o.id === d.quizTarget) { upd('quizFeedback', { correct: true, msg: 'Correct! That is the ' + o.label }); upd('selectedOrganelle', o.id); } else { upd('quizFeedback', { correct: false, msg: 'Try again!' }); } } else { upd('selectedOrganelle', o.id === d.selectedOrganelle ? null : o.id); } } },
                o.id === 'er' ? React.createElement("path", { d: `M${o.x - 25},${o.y - 15} Q${o.x},${o.y - 25} ${o.x + 25},${o.y - 15} Q${o.x + 10},${o.y} ${o.x + 25},${o.y + 15} Q${o.x},${o.y + 25} ${o.x - 25},${o.y + 15} Q${o.x - 10},${o.y} ${o.x - 25},${o.y - 15}`, fill: o.color + '33', stroke: o.color, strokeWidth: d.selectedOrganelle === o.id ? 3 : 1.5 }) :
                  o.id === 'golgi' ? React.createElement("g", null, [-8, -3, 2, 7, 12].map((off, i) => React.createElement("ellipse", { key: i, cx: o.x, cy: o.y + off, rx: o.r, ry: 4, fill: o.color + '44', stroke: o.color, strokeWidth: d.selectedOrganelle === o.id ? 2 : 1 }))) :
                    o.id === 'mitochondria' ? React.createElement("ellipse", { cx: o.x, cy: o.y, rx: o.r + 8, ry: o.r, fill: o.color + '33', stroke: o.color, strokeWidth: d.selectedOrganelle === o.id ? 3 : 1.5, transform: `rotate(-20 ${o.x} ${o.y})` }) :
                      React.createElement("circle", { cx: o.x, cy: o.y, r: o.r, fill: o.color + '33', stroke: o.color, strokeWidth: d.selectedOrganelle === o.id ? 3 : 1.5 }),
                d.labels && React.createElement("text", { x: o.x, y: o.y - o.r - 6, textAnchor: "middle", style: { fontSize: '9px', fontWeight: 'bold' }, fill: o.color }, o.label)
              ))
            ),
            selected && React.createElement("div", { className: "mt-3 bg-white rounded-xl border-2 p-4 animate-in fade-in", style: { borderColor: selected.color } },
              React.createElement("h4", { className: "font-bold text-sm mb-1", style: { color: selected.color } }, selected.label),
              React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, selected.desc)
            ),
            !selected && React.createElement("p", { className: "mt-3 text-center text-xs " + (d.quizMode ? "text-purple-600 font-bold" : "text-slate-400") }, d.quizMode ? ("Find: " + (organelles.find(o => o.id === d.quizTarget) || {}).label) : "Click an organelle to learn about it"),
            d.quizMode && d.quizFeedback && React.createElement("div", { className: "mt-2 p-2 rounded-lg text-center text-sm font-bold " + (d.quizFeedback.correct ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200") }, d.quizFeedback.msg, d.quizFeedback.correct && React.createElement("button", { onClick: () => { const target = organelles[Math.floor(Math.random() * organelles.length)]; upd("quizTarget", target.id); upd("quizFeedback", null); upd("selectedOrganelle", null); }, className: "ml-3 px-2 py-0.5 bg-green-600 text-white rounded text-xs" }, "Next")),
            React.createElement("div", { className: "flex gap-3 mt-3 items-center" },
              React.createElement("label", { className: "flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer" },
                React.createElement("input", { type: "checkbox", checked: d.labels, onChange: e => upd('labels', e.target.checked), className: "accent-green-600" }),
                "Show Labels"
              ),
              React.createElement("label", { className: "flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer" },
                React.createElement("input", { type: "checkbox", checked: d.quizMode, onChange: e => { upd("quizMode", e.target.checked); if (e.target.checked) { const orgs = organelles; const target = orgs[Math.floor(Math.random() * orgs.length)]; upd("quizTarget", target.id); upd("quizFeedback", null); upd("labels", false); } }, className: "accent-purple-600" }),
                "Quiz Mode"
              ),
              React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'ce-' + Date.now(), tool: 'cell', label: d.type + ' cell' + (d.selectedOrganelle ? ': ' + d.selectedOrganelle : ''), data: { ...d }, timestamp: Date.now() }]); addToast('📸 Cell snapshot saved!', 'success'); }, className: "ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "📸 Snapshot")
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
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'ph-' + Date.now(), tool: 'physics', label: d.angle + '° ' + d.velocity + 'm/s', data: { ...d }, timestamp: Date.now() }]); addToast('📸 Physics snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "📸 Snapshot")
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
          const parseIneq = expr => { const m = expr.match(/([a-z])\s*([<>]=?|[≤≥])\s*(-?\d+\.?\d*)/); return m ? { v: m[1], op: m[2], val: parseFloat(m[3]) } : null; };
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
            { n: 80, s: 'Hg', name: 'Mercury', cat: 'transition', c: '#fb923c' }, { n: 81, s: 'Tl', name: 'Thallium', cat: 'metal', c: '#94a3b8' },
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
            H:  { desc: 'Lightest element; fuels stars via fusion', uses: ['Fuel cells', 'Rocket propellant', 'Ammonia production'], compounds: ['H₂O (Water)', 'HCl (Hydrochloric Acid)', 'NH₃ (Ammonia)', 'CH₄ (Methane)'] },
            He: { desc: 'Inert noble gas; 2nd most abundant in universe', uses: ['Balloons & blimps', 'MRI coolant', 'Deep-sea diving gas'], compounds: ['None (noble gas — does not form compounds)'] },
            Li: { desc: 'Lightest metal; soft enough to cut with a knife', uses: ['Rechargeable batteries', 'Mood-stabilizing medication', 'Ceramics & glass'], compounds: ['LiOH (Lithium Hydroxide)', 'Li₂CO₃ (Lithium Carbonate)'] },
            Be: { desc: 'Rare, toxic metal that is very stiff and light', uses: ['Aerospace alloys', 'X-ray windows', 'Satellite components'], compounds: ['BeO (Beryllium Oxide)'] },
            B:  { desc: 'Metalloid essential for plant growth', uses: ['Borosilicate glass (Pyrex)', 'Cleaning products (borax)', 'Semiconductors'], compounds: ['B₂O₃ (Boron Trioxide)', 'H₃BO₃ (Boric Acid)'] },
            C:  { desc: 'Basis of all known life; forms diamond & graphite', uses: ['Steel production', 'Graphite pencils', 'Carbon fiber composites'], compounds: ['CO₂ (Carbon Dioxide)', 'CH₄ (Methane)', 'C₆H₁₂O₆ (Glucose)', 'CaCO₃ (Limestone)'] },
            N:  { desc: 'Makes up 78% of Earth\'s atmosphere', uses: ['Fertilizers', 'Explosives (TNT)', 'Food preservation'], compounds: ['NH₃ (Ammonia)', 'NO₂ (Nitrogen Dioxide)', 'N₂O (Laughing Gas)', 'HNO₃ (Nitric Acid)'] },
            O:  { desc: 'Essential for respiration; most abundant element in Earth\'s crust', uses: ['Medical oxygen', 'Welding & cutting', 'Water purification'], compounds: ['H₂O (Water)', 'CO₂ (Carbon Dioxide)', 'Fe₂O₃ (Rust)', 'O₃ (Ozone)'] },
            F:  { desc: 'Most reactive and electronegative element', uses: ['Toothpaste (fluoride)', 'Teflon coatings', 'Refrigerants'], compounds: ['HF (Hydrofluoric Acid)', 'NaF (Sodium Fluoride)', 'CF₄ (Carbon Tetrafluoride)'] },
            Ne: { desc: 'Produces iconic reddish-orange glow in signs', uses: ['Neon signs', 'High-voltage indicators', 'Laser technology'], compounds: ['None (noble gas)'] },
            Na: { desc: 'Soft, silvery metal that reacts explosively with water', uses: ['Table salt (NaCl)', 'Street lighting', 'Baking soda'], compounds: ['NaCl (Table Salt)', 'NaOH (Lye)', 'NaHCO₃ (Baking Soda)', 'Na₂CO₃ (Washing Soda)'] },
            Mg: { desc: 'Lightweight metal that burns with brilliant white flame', uses: ['Alloy wheels', 'Fireworks & flares', 'Antacid tablets'], compounds: ['MgO (Magnesium Oxide)', 'MgSO₄ (Epsom Salt)', 'Mg(OH)₂ (Milk of Magnesia)'] },
            Al: { desc: 'Most abundant metal in Earth\'s crust', uses: ['Cans & foil', 'Aircraft frames', 'Window frames'], compounds: ['Al₂O₃ (Alumina)', 'AlCl₃ (Aluminum Chloride)'] },
            Si: { desc: 'Semiconductor that powers the digital age', uses: ['Computer chips', 'Solar panels', 'Glass & concrete'], compounds: ['SiO₂ (Sand/Quartz)', 'SiC (Silicon Carbide)'] },
            P:  { desc: 'Essential for DNA and bones; glows in the dark', uses: ['Fertilizers', 'Matches', 'Detergents'], compounds: ['H₃PO₄ (Phosphoric Acid)', 'Ca₃(PO₄)₂ (Bone mineral)'] },
            S:  { desc: 'Yellow element with distinctive rotten-egg smell', uses: ['Vulcanizing rubber', 'Sulfuric acid production', 'Gunpowder'], compounds: ['H₂SO₄ (Sulfuric Acid)', 'SO₂ (Sulfur Dioxide)', 'H₂S (Hydrogen Sulfide)'] },
            Cl: { desc: 'Greenish-yellow gas used to purify water', uses: ['Water treatment', 'PVC plastic', 'Bleach & disinfectants'], compounds: ['NaCl (Table Salt)', 'HCl (Hydrochloric Acid)', 'NaOCl (Bleach)'] },
            Ar: { desc: 'Third most abundant gas in atmosphere', uses: ['Welding shield gas', 'Light bulb filling', 'Window insulation'], compounds: ['None (noble gas)'] },
            K:  { desc: 'Essential nutrient found in bananas', uses: ['Fertilizers (potash)', 'Soap making', 'Food preservation'], compounds: ['KCl (Potassium Chloride)', 'KOH (Potassium Hydroxide)', 'KNO₃ (Saltpeter)'] },
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
            I:  { desc: 'Essential trace element for thyroid function', uses: ['Antiseptic (tincture)', 'Iodized salt', 'Medical imaging'], compounds: ['KI (Potassium Iodide)', 'HI (Hydroiodic Acid)'] },
            Pt: { desc: 'Precious metal rarer than gold', uses: ['Catalytic converters', 'Jewelry', 'Anti-cancer drugs'], compounds: ['PtCl₂ (Platinum Chloride)', 'H₂PtCl₆ (Chloroplatinic Acid)'] },
            U:  { desc: 'Dense radioactive metal that powers nuclear plants', uses: ['Nuclear power', 'Nuclear weapons', 'Radiation shielding'], compounds: ['UO₂ (Uranium Dioxide)', 'UF₆ (Uranium Hexafluoride)'] },
            Hg: { desc: 'Only metal liquid at room temperature', uses: ['Thermometers (historic)', 'Fluorescent lights', 'Dental amalgams'], compounds: ['HgCl₂ (Mercury Chloride)', 'HgO (Mercury Oxide)'] },
            Pb: { desc: 'Dense, soft metal once used in pipes & paint', uses: ['Car batteries', 'Radiation shielding', 'Solder (lead-free now)'], compounds: ['PbO (Lead Oxide)', 'PbSO₄ (Lead Sulfate)'] },
            Sn: { desc: 'Soft, silvery metal used since the Bronze Age', uses: ['Tin cans (coating)', 'Solder', 'Bronze alloy'], compounds: ['SnO₂ (Tin Oxide)', 'SnCl₂ (Tin Chloride)'] },
            W:  { desc: 'Has the highest melting point of all metals', uses: ['Light bulb filaments', 'Drill bits & cutting tools', 'Military armor'], compounds: ['WO₃ (Tungsten Trioxide)', 'WC (Tungsten Carbide)'] },
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
        // SOLAR SYSTEM EXPLORER
        // ═══════════════════════════════════════════════════════
        stemLabTab === 'explore' && stemLabTool === 'solarSystem' && (() => {
          const d = labToolData.solarSystem;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, solarSystem: { ...prev.solarSystem, [key]: val } }));
          const PLANETS = [
            { name: 'Mercury', emoji: '\u2638', color: '#94a3b8', size: 12, dist: 0.4, moons: 0, diameter: '4,879 km', dayLen: '59 Earth days', yearLen: '88 days', temp: '−180 to 430°C', fact: 'Smallest planet; no atmosphere to retain heat.' },
            { name: 'Venus', emoji: '\u2640', color: '#fbbf24', size: 16, dist: 0.7, moons: 0, diameter: '12,104 km', dayLen: '243 Earth days', yearLen: '225 days', temp: '462°C avg.', fact: 'Hottest planet due to runaway greenhouse effect. Rotates backwards!' },
            { name: 'Earth', emoji: '\uD83C\uDF0D', color: '#3b82f6', size: 17, dist: 1.0, moons: 1, diameter: '12,742 km', dayLen: '24 hours', yearLen: '365.25 days', temp: '15°C avg.', fact: 'Only known planet with liquid water and life.' },
            { name: 'Mars', emoji: '\uD83D\uDD34', color: '#ef4444', size: 14, dist: 1.5, moons: 2, diameter: '6,779 km', dayLen: '24h 37m', yearLen: '687 days', temp: '−65°C avg.', fact: 'Has the tallest volcano in the solar system: Olympus Mons (21.9 km high).' },
            { name: 'Jupiter', emoji: '\uD83E\uDE90', color: '#f97316', size: 32, dist: 5.2, moons: 95, diameter: '139,820 km', dayLen: '10 hours', yearLen: '12 years', temp: '−110°C', fact: 'Largest planet. The Great Red Spot is a storm larger than Earth!' },
            { name: 'Saturn', emoji: '\uD83E\uDE90', color: '#eab308', size: 28, dist: 9.5, moons: 146, diameter: '116,460 km', dayLen: '10.7 hours', yearLen: '29 years', temp: '−140°C', fact: 'Its rings are made of ice and rock. Could float in a giant bathtub!' },
            { name: 'Uranus', emoji: '\u26AA', color: '#67e8f9', size: 22, dist: 19.2, moons: 28, diameter: '50,724 km', dayLen: '17 hours', yearLen: '84 years', temp: '−195°C', fact: 'Rotates on its side! An ice giant with methane atmosphere.' },
            { name: 'Neptune', emoji: '\uD83D\uDD35', color: '#6366f1', size: 21, dist: 30.1, moons: 16, diameter: '49,244 km', dayLen: '16 hours', yearLen: '165 years', temp: '−200°C', fact: 'Windiest planet: winds up to 2,100 km/h. Deep blue from methane.' },
            { name: 'Pluto', emoji: '\u2B50', color: '#a78bfa', size: 8, dist: 39.5, moons: 5, diameter: '2,377 km', dayLen: '6.4 Earth days', yearLen: '248 years', temp: '−230°C', fact: 'Dwarf planet since 2006. Has a heart-shaped glacier named Tombaugh Regio.' },
          ];
          const sel = d.selectedPlanet ? PLANETS.find(p => p.name === d.selectedPlanet) : null;
          const W = 460, H = 260;
          return React.createElement("div", { className: "max-w-4xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83C\uDF0D Solar System Explorer")
            ),
            React.createElement("svg", { viewBox: "0 0 " + W + " " + H, className: "w-full bg-gradient-to-b from-slate-900 to-indigo-950 rounded-xl border border-indigo-800", style: { maxHeight: "280px" } },
              React.createElement("circle", { cx: 40, cy: H/2, r: 24, fill: "#fbbf24", filter: "url(#sunGlow)" }),
              React.createElement("defs", null, React.createElement("radialGradient", { id: "sunGlow" }, React.createElement("stop", { offset: "0%", stopColor: "#fde68a" }), React.createElement("stop", { offset: "100%", stopColor: "#f59e0b" }))),
              React.createElement("text", { x: 40, y: H/2 + 38, textAnchor: "middle", fill: "#fbbf24", style: { fontSize: '8px', fontWeight: 'bold' } }, "Sun"),
              PLANETS.map((p, i) => {
                const cx = 80 + (i / (PLANETS.length - 1)) * (W - 110);
                const isSelected = d.selectedPlanet === p.name;
                return React.createElement("g", { key: p.name, style: { cursor: 'pointer' }, onClick: () => upd('selectedPlanet', p.name) },
                  React.createElement("circle", { cx, cy: H/2, r: p.size / 2, fill: p.color, stroke: isSelected ? '#fff' : 'none', strokeWidth: 2, style: { filter: isSelected ? 'drop-shadow(0 0 8px ' + p.color + ')' : 'none' } }),
                  React.createElement("text", { x: cx, y: H/2 + p.size / 2 + 12, textAnchor: "middle", fill: "#94a3b8", style: { fontSize: '7px' } }, p.name)
                );
              })
            ),
            sel && React.createElement("div", { className: "mt-3 bg-slate-50 rounded-xl border border-slate-200 p-4 animate-in slide-in-from-bottom duration-300" },
              React.createElement("div", { className: "flex items-center gap-3 mb-3" },
                React.createElement("div", { className: "w-12 h-12 rounded-xl flex items-center justify-center text-2xl", style: { backgroundColor: sel.color + '20', border: '2px solid ' + sel.color } }, sel.emoji),
                React.createElement("div", null,
                  React.createElement("h4", { className: "text-lg font-black text-slate-800" }, sel.name),
                  React.createElement("p", { className: "text-xs text-slate-500" }, sel.diameter + " \u2022 " + sel.moons + " moon" + (sel.moons !== 1 ? 's' : ''))
                )
              ),
              React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2 mb-3" },
                [['\uD83C\uDF21', 'Temp', sel.temp], ['\u2600', 'Day', sel.dayLen], ['\uD83C\uDF0D', 'Year', sel.yearLen], ['\uD83D\uDCCF', 'Size', sel.diameter]].map(([ico, label, val]) =>
                  React.createElement("div", { key: label, className: "bg-white rounded-lg p-2 text-center border" },
                    React.createElement("p", { className: "text-xs text-slate-400 font-bold" }, ico + ' ' + label),
                    React.createElement("p", { className: "text-sm font-bold text-slate-700" }, val)
                  )
                )
              ),
              React.createElement("p", { className: "text-sm text-slate-600 italic bg-indigo-50 rounded-lg p-2 border border-indigo-100" }, "\uD83D\uDCA1 " + sel.fact)
            ),
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'ss-' + Date.now(), tool: 'solarSystem', label: sel ? sel.name : 'Solar System', data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")
          );
        })(),

        // ═══════════════════════════════════════════════════════
        // WATER CYCLE
        // ═══════════════════════════════════════════════════════
        stemLabTab === 'explore' && stemLabTool === 'waterCycle' && (() => {
          const d = labToolData.waterCycle;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, waterCycle: { ...prev.waterCycle, [key]: val } }));
          const STAGES = [
            { id: 'evaporation', label: 'Evaporation', emoji: '\u2600', color: '#f59e0b', x: 100, y: 240, desc: 'Heat from the sun causes water to change from liquid to gas (water vapor). Oceans, lakes, and rivers provide most of the evaporated water.' },
            { id: 'condensation', label: 'Condensation', emoji: '\u2601', color: '#94a3b8', x: 200, y: 60, desc: 'As water vapor rises and cools, it condenses into tiny water droplets that form clouds. This is the reverse of evaporation.' },
            { id: 'precipitation', label: 'Precipitation', emoji: '\uD83C\uDF27', color: '#3b82f6', x: 340, y: 120, desc: 'When clouds become heavy with water droplets, they fall as rain, snow, sleet, or hail. This returns water to Earth\u2019s surface.' },
            { id: 'collection', label: 'Collection', emoji: '\uD83C\uDF0A', color: '#0ea5e9', x: 360, y: 240, desc: 'Water collects in oceans, rivers, lakes, and underground aquifers. Some seeps into soil as groundwater. The cycle then repeats.' },
            { id: 'transpiration', label: 'Transpiration', emoji: '\uD83C\uDF3F', color: '#22c55e', x: 30, y: 160, desc: 'Plants release water vapor through their leaves into the atmosphere. A single tree can transpire hundreds of liters per day.' },
          ];
          const sel = d.selectedStage ? STAGES.find(s => s.id === d.selectedStage) : null;
          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83C\uDF0A Water Cycle")
            ),
            React.createElement("p", { className: "text-xs text-slate-500 mb-2" }, "Click each stage to learn how water moves through Earth\u2019s systems."),
            React.createElement("svg", { viewBox: "0 0 460 300", className: "w-full bg-gradient-to-b from-sky-100 via-sky-50 to-blue-100 rounded-xl border border-sky-200", style: { maxHeight: "300px" } },
              React.createElement("path", { d: "M100,240 Q150,60 200,60", fill: "none", stroke: "#f59e0b80", strokeWidth: 2, strokeDasharray: "6 4" }),
              React.createElement("path", { d: "M200,60 Q300,40 340,120", fill: "none", stroke: "#94a3b880", strokeWidth: 2, strokeDasharray: "6 4" }),
              React.createElement("path", { d: "M340,120 L360,240", fill: "none", stroke: "#3b82f680", strokeWidth: 2, strokeDasharray: "6 4" }),
              React.createElement("path", { d: "M360,240 Q230,280 100,240", fill: "none", stroke: "#0ea5e980", strokeWidth: 2, strokeDasharray: "6 4" }),
              React.createElement("path", { d: "M30,160 Q60,80 200,60", fill: "none", stroke: "#22c55e80", strokeWidth: 2, strokeDasharray: "6 4" }),
              React.createElement("rect", { x: 0, y: 250, width: 460, height: 50, fill: "#3b82f620", rx: 0 }),
              React.createElement("text", { x: 230, y: 280, textAnchor: "middle", fill: "#3b82f6", style: { fontSize: '10px', fontWeight: 'bold' } }, "Oceans, Rivers & Lakes"),
              STAGES.map(st => {
                const isSel = d.selectedStage === st.id;
                return React.createElement("g", { key: st.id, style: { cursor: 'pointer' }, onClick: () => upd('selectedStage', st.id) },
                  React.createElement("circle", { cx: st.x, cy: st.y, r: isSel ? 28 : 22, fill: st.color + '20', stroke: st.color, strokeWidth: isSel ? 3 : 1.5 }),
                  React.createElement("text", { x: st.x, y: st.y + 5, textAnchor: "middle", style: { fontSize: '18px' } }, st.emoji),
                  React.createElement("text", { x: st.x, y: st.y + (isSel ? 42 : 36), textAnchor: "middle", fill: st.color, style: { fontSize: '8px', fontWeight: 'bold' } }, st.label)
                );
              })
            ),
            sel && React.createElement("div", { className: "mt-3 p-3 rounded-xl border-2 animate-in slide-in-from-bottom", style: { borderColor: sel.color, backgroundColor: sel.color + '10' } },
              React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                React.createElement("span", { className: "text-2xl" }, sel.emoji),
                React.createElement("h4", { className: "text-lg font-bold", style: { color: sel.color } }, sel.label)
              ),
              React.createElement("p", { className: "text-sm text-slate-600 leading-relaxed" }, sel.desc)
            )
          ,
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
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'rc-' + Date.now(), tool: 'rockCycle', label: sel ? sel.label : 'Rock Cycle', data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")
);
        })(),

        // ═══════════════════════════════════════════════════════
        // ECOSYSTEM SIMULATOR
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
          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83D\uDC3A Ecosystem Simulator")
            ),
            React.createElement("p", { className: "text-xs text-slate-500 mb-2" }, "Model predator-prey population dynamics (Lotka-Volterra). Adjust rates and see how populations change."),
            React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2 mb-3" },
              [{ k: 'prey0', label: '\uD83D\uDC07 Prey Start', min: 10, max: 200, step: 5 }, { k: 'pred0', label: '\uD83D\uDC3A Predators', min: 5, max: 100, step: 5 }, { k: 'preyBirth', label: 'Prey Birth Rate', min: 0.01, max: 0.5, step: 0.01 }, { k: 'predDeath', label: 'Pred Death Rate', min: 0.01, max: 0.5, step: 0.01 }].map(s =>
                React.createElement("div", { key: s.k, className: "text-center bg-slate-50 rounded-lg p-2 border" },
                  React.createElement("label", { className: "text-[10px] font-bold text-slate-500 block" }, s.label),
                  React.createElement("span", { className: "text-sm font-bold text-slate-700 block" }, d[s.k]),
                  React.createElement("input", { type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k], onChange: e => upd(s.k, parseFloat(e.target.value)), className: "w-full accent-emerald-600" })
                )
              )
            ),
            React.createElement("button", { onClick: simulate, className: "mb-3 px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-teal-600 shadow-md transition-all" }, "\u25B6 Run Simulation"),
            d.data.length > 0 && React.createElement("svg", { viewBox: "0 0 " + W + " " + H, className: "w-full bg-white rounded-xl border border-emerald-200", style: { maxHeight: "270px" } },
              React.createElement("line", { x1: pad, y1: H - pad, x2: W - pad, y2: H - pad, stroke: "#e2e8f0", strokeWidth: 1 }),
              React.createElement("line", { x1: pad, y1: pad, x2: pad, y2: H - pad, stroke: "#e2e8f0", strokeWidth: 1 }),
              React.createElement("polyline", { points: d.data.map((dp, i) => (pad + i / 100 * (W - 2 * pad)) + "," + (H - pad - dp.prey / maxVal * (H - 2 * pad))).join(" "), fill: "none", stroke: "#22c55e", strokeWidth: 2 }),
              React.createElement("polyline", { points: d.data.map((dp, i) => (pad + i / 100 * (W - 2 * pad)) + "," + (H - pad - dp.pred / maxVal * (H - 2 * pad))).join(" "), fill: "none", stroke: "#ef4444", strokeWidth: 2 }),
              React.createElement("text", { x: W - pad + 5, y: pad, fill: "#22c55e", style: { fontSize: '9px', fontWeight: 'bold' } }, "Prey"),
              React.createElement("text", { x: W - pad + 5, y: pad + 14, fill: "#ef4444", style: { fontSize: '9px', fontWeight: 'bold' } }, "Predators")
            )
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
              const x1 = size/2 + (size/2 - 2) * Math.cos(startAngle * Math.PI / 180);
              const y1 = size/2 + (size/2 - 2) * Math.sin(startAngle * Math.PI / 180);
              const x2 = size/2 + (size/2 - 2) * Math.cos(endAngle * Math.PI / 180);
              const y2 = size/2 + (size/2 - 2) * Math.sin(endAngle * Math.PI / 180);
              const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
              slices.push(React.createElement("path", { key: i, d: "M " + size/2 + " " + size/2 + " L " + x1 + " " + y1 + " A " + (size/2-2) + " " + (size/2-2) + " 0 " + largeArc + " 1 " + x2 + " " + y2 + " Z", fill: i < num ? color : '#e2e8f0', stroke: 'white', strokeWidth: 1.5 }));
            }
            return React.createElement("svg", { viewBox: "0 0 " + size + " " + size, width: size, height: size }, slices);
          };
          return React.createElement("div", { className: "max-w-2xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83C\uDF55 Fraction Visualizer"),
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
              if (d.fromUnit === '°C' && d.toUnit === '°F') return v * 9/5 + 32;
              if (d.fromUnit === '°F' && d.toUnit === '°C') return (v - 32) * 5/9;
              if (d.fromUnit === '°C' && d.toUnit === 'K') return v + 273.15;
              if (d.fromUnit === 'K' && d.toUnit === '°C') return v - 273.15;
              if (d.fromUnit === '°F' && d.toUnit === 'K') return (v - 32) * 5/9 + 273.15;
              if (d.fromUnit === 'K' && d.toUnit === '°F') return (v - 273.15) * 9/5 + 32;
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
              React.createElement("button", { onClick: () => { const tmp = d.fromUnit; upd('fromUnit', d.toUnit); upd('toUnit', tmp); }, className: "block mx-auto mt-3 px-4 py-1 bg-cyan-50 text-cyan-600 rounded-full text-xs font-bold hover:bg-cyan-100" }, "\u21C4 Swap")
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
          const expected = d.mode === 'coin' ? { H: 0.5, T: 0.5 } : d.mode === 'dice' ? { 1: 1/6, 2: 1/6, 3: 1/6, 4: 1/6, 5: 1/6, 6: 1/6 } : { Red: 0.25, Blue: 0.25, Green: 0.25, Yellow: 0.25 };
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
              React.createElement("p", { className: "mt-3 text-xs text-slate-400 text-center italic" }, "Black lines show expected probability. With more trials, observed frequencies approach expected values (Law of Large Numbers).")
            ),
            d.trials > 0 && React.createElement("div", { className: "mt-2 text-xs text-slate-400 text-center" }, "Last 10: " + d.results.slice(-10).join(', '))
          );
        })(),   stemLabTab === 'explore' && stemLabTool === 'decomposer' && (() => {
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
            { name: 'Sugar', emoji: '\uD83C\uDF6C', elements: { C: 42.1, H: 6.5, O: 51.4 }, formula: 'C\u2082H\u2082\u2082O\u2081\u2081', fact: 'Sucrose is extracted from sugarcane or sugar beets' },
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
              MATERIALS.map(m => React.createElement("button", { key: m.name, onClick: () => { upd('material', m.name); upd('decomposed', false,
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'dc-' + Date.now(), tool: 'decomposer', label: d.material || 'Material', data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")
); }, className: "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.material === m.name ? 'bg-violet-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-violet-50 border border-slate-200') }, m.emoji + " " + m.name))
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
            )
          )
        })(),

// ═══════════════════════════════════════════════════════
// SOLAR SYSTEM EXPLORER

      )));
    };
  }
})();
