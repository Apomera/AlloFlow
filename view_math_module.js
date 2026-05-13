/**
 * AlloFlow View - Math Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='math' block.
 * Source range: 565 lines body.
 * Renders: math problem cards with title + step-by-step solutions, student
 * work textarea with AI Check My Work + hint system, manipulative
 * integrations (coordinate, base10, numberline, fractions, volume,
 * protractor, funcGrapher, physics, chemBalance, punnett, circuit,
 * dataPlot, inequality, molecule, calculus, wave, cell), self-grade
 * mode, AlloBot edit chat, generate similar problems.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.MathView) {
    console.log('[CDN] ViewMathModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewMathModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var EyeOff = _lazyIcon('EyeOff');
  var Eye = _lazyIcon('Eye');
  var Copy = _lazyIcon('Copy');
  var ImageIcon = _lazyIcon('ImageIcon');
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var Pencil = _lazyIcon('Pencil');
  var Globe = _lazyIcon('Globe');
  var RefreshCw = _lazyIcon('RefreshCw');
  var Sparkles = _lazyIcon('Sparkles');
  var ChevronDown = _lazyIcon('ChevronDown');

  function MathView(props) {
  // State reads
  var t = props.t;
  var generatedContent = props.generatedContent;
  var isTeacherMode = props.isTeacherMode;
  var isIndependentMode = props.isIndependentMode;
  var isProcessing = props.isProcessing;
  var showMathAnswers = props.showMathAnswers;
  var mathSelfGradeMode = props.mathSelfGradeMode;
  var mathEditInput = props.mathEditInput;
  var isMathEditingChat = props.isMathEditingChat;
  var mathHintData = props.mathHintData;
  var mathCheckResults = props.mathCheckResults;
  var mathSubject = props.mathSubject;
  var studentResponses = props.studentResponses;
  var gridPoints = props.gridPoints;
  var base10Value = props.base10Value;
  var numberLineMarkers = props.numberLineMarkers;
  var fractionPieces = props.fractionPieces;
  var cubeDims = props.cubeDims;
  var angleValue = props.angleValue;
  var labToolData = props.labToolData;
  var cubeBuilderMode = props.cubeBuilderMode;
  var cubePositions = props.cubePositions;
  // Setters
  var setStemLabTool = props.setStemLabTool;
  var setStemLabTab = props.setStemLabTab;
  var setShowStemLab = props.setShowStemLab;
  var setGridPoints = props.setGridPoints;
  var setBase10Value = props.setBase10Value;
  var setNumberLineRange = props.setNumberLineRange;
  var setFractionPieces = props.setFractionPieces;
  var setCubeDims = props.setCubeDims;
  var setAngleValue = props.setAngleValue;
  var setMathEditInput = props.setMathEditInput;
  var setCubeBuilderMode = props.setCubeBuilderMode;
  var setCubePositions = props.setCubePositions;
  var setCubeBuilderChallenge = props.setCubeBuilderChallenge;
  var setCubeBuilderFeedback = props.setCubeBuilderFeedback;
  // Handlers
  var handleToggleShowMathAnswers = props.handleToggleShowMathAnswers;
  var handleSetShowMathAnswersToTrue = props.handleSetShowMathAnswersToTrue;
  var handleToggleMathSelfGrade = props.handleToggleMathSelfGrade;
  var submitMathSelfGrade = props.submitMathSelfGrade;
  var handleStudentInput = props.handleStudentInput;
  var handleMathProblemEdit = props.handleMathProblemEdit;
  var handleCheckMathWork = props.handleCheckMathWork;
  var handleResetMathCheck = props.handleResetMathCheck;
  var handleGetMathHint = props.handleGetMathHint;
  var handleGenerateSimilar = props.handleGenerateSimilar;
  var handleMathEdit = props.handleMathEdit;
  var isMathEditing = props.isMathEditing;
  var toggleMathEdit = props.toggleMathEdit;
  // Pure helpers
  var formatMathQuestion = props.formatMathQuestion;
  var formatInlineText = props.formatInlineText;
  var sanitizeHtml = props.sanitizeHtml;
  var copyToClipboard = props.copyToClipboard;
  var addToast = props.addToast;
  // Components
  var MathSymbol = props.MathSymbol;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6 max-w-4xl mx-auto h-full overflow-y-auto pr-2 pb-10",
    "data-help-key": "math_panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-50 p-6 rounded-xl border border-indigo-100 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-black text-indigo-600 uppercase tracking-widest"
  }, generatedContent.meta ? generatedContent.meta.split(' - ')[0] : mathSubject), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, isTeacherMode && /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.hide'),
    onClick: handleToggleShowMathAnswers,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${showMathAnswers ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'}`,
    "data-help-key": "math_toggle_answers"
  }, showMathAnswers ? /*#__PURE__*/React.createElement(EyeOff, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Eye, {
    size: 14
  }), showMathAnswers ? t('math.display.hide_answers') : t('math.display.reveal_answers')), /*#__PURE__*/React.createElement("button", {
    onClick: handleToggleMathSelfGrade,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${mathSelfGradeMode ? 'bg-emerald-700 text-white shadow-md' : 'bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-50'}`
  }, "\u270F\uFE0F ", mathSelfGradeMode ? t('math.exit_self_grade') : t('math.self_grade')), mathSelfGradeMode && /*#__PURE__*/React.createElement("button", {
    onClick: submitMathSelfGrade,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md hover:from-emerald-600 hover:to-teal-600 transition-all"
  }, "\uD83D\uDCCA Submit Assessment"), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.copy'),
    onClick: () => {
      const text = generatedContent?.data.problems.map((p, i) => `${i + 1}. ${formatMathQuestion(p)}\nAnswer: ${p.answer}`).join('\n\n');
      copyToClipboard(text);
    },
    className: "text-indigo-600 hover:text-indigo-600 p-1.5 rounded-md hover:bg-indigo-100 transition-colors",
    title: t('math.display.copy_all')
  }, /*#__PURE__*/React.createElement(Copy, {
    size: 14
  })))), /*#__PURE__*/React.createElement("div", {
    className: "text-2xl md:text-3xl font-bold text-indigo-900 font-serif leading-tight"
  }, generatedContent?.data.title)), generatedContent?.data.graphData && /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-6 rounded-xl border border-slate-400 shadow-sm animate-in fade-in slide-in-from-bottom-2"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-black text-purple-600 uppercase tracking-widest mb-4 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 14
  }), " ", t('math.display.visual_header')), /*#__PURE__*/React.createElement("div", {
    className: "w-full h-auto flex justify-center bg-slate-50 rounded-lg border border-slate-100 p-4 overflow-hidden svg-container",
    dangerouslySetInnerHTML: {
      __html: sanitizeHtml(generatedContent?.data.graphData)
    },
    "data-help-key": "math_graph"
  })), (generatedContent?.data.problems || [{
    question: generatedContent?.data.problem,
    answer: generatedContent?.data.answer,
    steps: generatedContent?.data.steps,
    realWorld: generatedContent?.data.realWorld
  }]).map((problem, pIdx) => /*#__PURE__*/React.createElement("div", {
    key: pIdx,
    className: "space-y-4 border-b border-slate-100 pb-8 last:border-0",
    "data-help-key": "math_problem"
  }, /*#__PURE__*/React.createElement("div", {
    className: `bg-white p-4 rounded-xl border shadow-sm flex gap-4 items-start ${isMathEditing(pIdx) ? 'border-amber-300 ring-2 ring-amber-100' : 'border-indigo-100'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-600 text-white font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm mt-0.5 shadow-sm"
  }, pIdx + 1), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow"
  }, isMathEditing(pIdx) ? /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('math.edit_problem_question') || `Edit math problem ${pIdx + 1}`,
    className: "w-full p-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none resize-y bg-amber-50/50 font-serif text-lg leading-relaxed text-slate-800 min-h-[60px]",
    value: problem.question || problem.problem || '',
    onChange: e => handleMathProblemEdit(pIdx, 'question', e.target.value),
    placeholder: t('common.placeholder_enter_problem_question')
  }) : /*#__PURE__*/React.createElement("div", {
    className: "text-lg font-medium text-slate-800 font-serif"
  }, formatInlineText(formatMathQuestion(problem), false)), problem._verification && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "11px",
      marginLeft: "6px",
      opacity: 0.8
    },
    title: problem._verification.verified ? "Answer computationally verified" : problem._verification.autoCorrected ? "Answer auto-corrected by evaluator" : ""
  }, problem._verification.verified ? "✅" : problem._verification.autoCorrected ? "🔧" : problem._verification.edited ? "✏️" : "")), isTeacherMode && /*#__PURE__*/React.createElement("button", {
    "aria-label": isMathEditing(pIdx) ? "Save edits" : "Edit problem",
    onClick: () => toggleMathEdit(pIdx),
    className: `shrink-0 p-1.5 rounded-lg transition-all ${isMathEditing(pIdx) ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'text-slate-600 hover:text-amber-600 hover:bg-amber-50'}`,
    title: isMathEditing(pIdx) ? "Done editing" : "Edit this problem"
  }, isMathEditing(pIdx) ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 16
  }) : /*#__PURE__*/React.createElement(Pencil, {
    size: 14
  }))), isTeacherMode ? /*#__PURE__*/React.createElement(React.Fragment, null, isIndependentMode && /*#__PURE__*/React.createElement("div", {
    className: "ml-4 sm:ml-12 mt-4 mb-4 space-y-3"
  }, problem.manipulativeSupport && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setStemLabTool(problem.manipulativeSupport.tool);
      if (problem.manipulativeSupport.tool === 'coordinate' && problem.manipulativeSupport.state?.points) {
        setGridPoints(problem.manipulativeSupport.state.points);
      } else if (problem.manipulativeSupport.tool === 'base10' && problem.manipulativeSupport.state) {
        setBase10Value(problem.manipulativeSupport.state);
      }
      setShowStemLab(true);
      setStemLabTab('explore');
    },
    className: "flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-600 hover:bg-blue-100 transition-all text-sm mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-lg"
  }, "\uD83D\uDCC2"), " Open Visual Support (", problem.manipulativeSupport.tool, ")"), problem.manipulativeResponse ? /*#__PURE__*/React.createElement("div", {
    className: "bg-emerald-50 bg-opacity-50 p-4 rounded-xl border border-emerald-200"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-emerald-800 font-bold mb-3 flex items-center gap-2"
  }, "\uD83E\uDDE9 Solve this problem using the ", problem.manipulativeResponse.tool, " manipulative instead of typing."), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setStemLabTool(problem.manipulativeResponse.tool);
      if (problem.manipulativeResponse.tool === 'numberline' && problem.manipulativeResponse.state?.range) {
        setNumberLineRange(problem.manipulativeResponse.state.range);
      } else if (problem.manipulativeResponse.tool === 'fractions' && problem.manipulativeResponse.state) {
        setFractionPieces({
          numerator: 0,
          denominator: problem.manipulativeResponse.state.denominator || 8
        });
      } else if (problem.manipulativeResponse.tool === 'volume' && problem.manipulativeResponse.state?.dims) {
        setCubeDims({
          l: 1,
          w: 1,
          h: 1
        });
      } else if (problem.manipulativeResponse.tool === 'protractor') {
        setAngleValue(0);
      }
      setShowStemLab(true);
      setStemLabTab('explore');
    },
    className: "px-4 py-2 bg-white text-emerald-700 font-bold rounded-lg border border-emerald-300 hover:bg-emerald-100 transition-all text-sm shadow-sm flex items-center gap-2"
  }, "Open ", problem.manipulativeResponse.tool), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      let isCorrect = false;
      const target = problem.manipulativeResponse.state || {};
      if (problem.manipulativeResponse.tool === 'coordinate') {
        const targetPts = (target.points || []).map(p => `${p.x},${p.y}`).sort();
        const studentPts = gridPoints.map(p => `${p.x},${p.y}`).sort();
        isCorrect = targetPts.length === studentPts.length && targetPts.every((v, i) => v === studentPts[i]);
      } else if (problem.manipulativeResponse.tool === 'base10') {
        isCorrect = base10Value.hundreds === (target.hundreds || 0) && base10Value.tens === (target.tens || 0) && base10Value.ones === (target.ones || 0);
      } else if (problem.manipulativeResponse.tool === 'numberline') {
        const targetMarkers = (target.markers || []).map(m => m.value).sort((a, b) => a - b);
        const studentMarkers = numberLineMarkers.map(m => m.value).sort((a, b) => a - b);
        isCorrect = targetMarkers.length === studentMarkers.length && targetMarkers.every((v, i) => Math.abs(v - studentMarkers[i]) < 0.01);
      } else if (problem.manipulativeResponse.tool === 'fractions') {
        isCorrect = fractionPieces.numerator === (target.numerator || 0) && fractionPieces.denominator === (target.denominator || 1);
      } else if (problem.manipulativeResponse.tool === 'volume') {
        const td = target.dims || {};
        isCorrect = cubeDims.l === (td.l || 1) && cubeDims.w === (td.w || 1) && cubeDims.h === (td.h || 1);
      } else if (problem.manipulativeResponse.tool === 'protractor') {
        isCorrect = Math.abs(angleValue - (target.angle || 0)) <= 2;
      } else if (problem.manipulativeResponse.tool === 'funcGrapher') {
        const lt = labToolData.funcGrapher;
        isCorrect = lt.type === (target.type || 'quadratic') && Math.abs(lt.a - (target.a || 0)) < 0.1 && Math.abs(lt.b - (target.b || 0)) < 0.1 && Math.abs(lt.c - (target.c || 0)) < 0.1;
      } else if (problem.manipulativeResponse.tool === 'physics') {
        const lp = labToolData.physics;
        isCorrect = Math.abs(lp.angle - (target.angle || 45)) <= 2 && Math.abs(lp.velocity - (target.velocity || 20)) <= 1;
      } else if (problem.manipulativeResponse.tool === 'chemBalance') {
        const lc = labToolData.chemBalance;
        const tc = target.coefficients || [];
        isCorrect = tc.length > 0 && lc.coefficients.length === tc.length && lc.coefficients.every((v, i) => v === tc[i]);
      } else if (problem.manipulativeResponse.tool === 'punnett') {
        const lpn = labToolData.punnett;
        isCorrect = JSON.stringify(lpn.parent1.sort()) === JSON.stringify((target.parent1 || []).sort()) && JSON.stringify(lpn.parent2.sort()) === JSON.stringify((target.parent2 || []).sort());
      } else if (problem.manipulativeResponse.tool === 'circuit') {
        const lcr = labToolData.circuit;
        isCorrect = Math.abs(lcr.voltage - (target.voltage || 9)) < 0.5;
      } else if (problem.manipulativeResponse.tool === 'dataPlot') {
        const ldp = labToolData.dataPlot;
        const tPts = (target.points || []).map(p => `${Math.round(p.x)},${Math.round(p.y)}`).sort();
        const sPts = ldp.points.map(p => `${Math.round(p.x)},${Math.round(p.y)}`).sort();
        isCorrect = tPts.length === sPts.length && tPts.every((v, i) => v === sPts[i]);
      } else if (problem.manipulativeResponse.tool === 'inequality') {
        const li = labToolData.inequality;
        isCorrect = li.expr.replace(/\s/g, '') === (target.expr || '').replace(/\s/g, '');
      } else if (problem.manipulativeResponse.tool === 'molecule') {
        const lm = labToolData.molecule;
        isCorrect = lm.formula.replace(/\s/g, '').toLowerCase() === (target.formula || '').replace(/\s/g, '').toLowerCase();
      } else if (problem.manipulativeResponse.tool === 'calculus') {
        const lcl = labToolData.calculus;
        isCorrect = lcl.mode === (target.mode || 'riemann') && Math.abs(lcl.xMin - (target.xMin || 0)) < 0.1 && Math.abs(lcl.xMax - (target.xMax || 4)) < 0.1 && lcl.n === (target.n || 8);
      } else if (problem.manipulativeResponse.tool === 'wave') {
        const lw = labToolData.wave;
        isCorrect = Math.abs(lw.amplitude - (target.amplitude || 1)) < 0.1 && Math.abs(lw.frequency - (target.frequency || 1)) < 0.1;
      } else if (problem.manipulativeResponse.tool === 'cell') {
        const lce = labToolData.cell;
        isCorrect = lce.selectedOrganelle === (target.selectedOrganelle || null);
        const lcl = labToolData.calculus;
        isCorrect = lcl.mode === (target.mode || 'riemann') && Math.abs(lcl.xMin - (target.xMin || 0)) < 0.1 && Math.abs(lcl.xMax - (target.xMax || 4)) < 0.1 && lcl.n === (target.n || 8);
      } else if (problem.manipulativeResponse.tool === 'wave') {
        const lw = labToolData.wave;
        isCorrect = Math.abs(lw.amplitude - (target.amplitude || 1)) < 0.1 && Math.abs(lw.frequency - (target.frequency || 1)) < 0.1;
      } else if (problem.manipulativeResponse.tool === 'cell') {
        const lce = labToolData.cell;
        isCorrect = lce.selectedOrganelle === (target.selectedOrganelle || null);
      }
      handleStudentInput(generatedContent.id, pIdx, isCorrect ? '(Manipulative: CORRECT ✅)' : '(Manipulative: INCORRECT ❌)');
      addToast(isCorrect ? 'Manipulative match correct! 🎉' : 'Manipulative geometry incorrect. Keep trying!', isCorrect ? 'success' : 'error');
    },
    className: "px-4 py-2 bg-emerald-700 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all text-sm shadow-sm"
  }, "Check My Manipulative")), studentResponses[generatedContent.id]?.[pIdx] && /*#__PURE__*/React.createElement("div", {
    className: `mt-3 text-sm font-bold ${studentResponses[generatedContent.id]?.[pIdx].includes('CORRECT') ? 'text-green-600' : 'text-red-600'}`
  }, studentResponses[generatedContent.id]?.[pIdx])) : /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-3 left-3 text-slate-600"
  }, /*#__PURE__*/React.createElement(Pencil, {
    size: 16
  })), /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('math.display.student_work') || `Show your work for problem ${pIdx + 1}`,
    className: "w-full p-3 pl-10 border border-slate-400 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none resize-y bg-slate-50/50 focus:bg-white transition-all font-serif text-lg leading-relaxed text-slate-700 placeholder:text-slate-600 min-h-[120px]",
    placeholder: t('math.display.placeholder_work'),
    value: studentResponses[generatedContent.id]?.[pIdx] || '',
    onChange: e => handleStudentInput(generatedContent.id, pIdx, e.target.value),
    "data-help-key": "math_student_work"
  }))), showMathAnswers ? /*#__PURE__*/React.createElement("div", {
    className: "animate-in fade-in slide-in-from-top-2 duration-300"
  }, problem.steps && problem.steps.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "ml-4 pl-4 border-l-2 border-slate-200 space-y-4 mt-4"
  }, problem.steps.map((step, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "bg-white p-4 rounded-lg border border-slate-100 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-slate-600 uppercase tracking-widest mt-1"
  }, t('math.display.step_label'), " ", idx + 1), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow w-full overflow-hidden"
  }, isMathEditing(pIdx) ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('math.edit_step_explanation') || `Edit step ${idx + 1} explanation`,
    className: "w-full p-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none resize-y bg-amber-50/50 text-sm text-slate-700 min-h-[40px]",
    value: step.explanation || '',
    onChange: e => handleMathProblemEdit(pIdx, 'step_explanation', e.target.value, idx),
    placeholder: t('common.placeholder_step_explanation')
  }), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('math.edit_step_latex') || `Edit step ${idx + 1} LaTeX expression`,
    type: "text",
    className: "w-full p-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none bg-amber-50/50 text-sm font-mono text-slate-600",
    value: step.latex || '',
    onChange: e => handleMathProblemEdit(pIdx, 'step_latex', e.target.value, idx),
    placeholder: t('common.placeholder_latex_expression_optional')
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-slate-700 mb-2 leading-relaxed font-medium text-sm"
  }, formatInlineText(step.explanation, false)), step.latex && /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 p-3 rounded text-center border border-slate-100 overflow-x-auto flex justify-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-lg font-serif text-slate-800 inline-block"
  }, /*#__PURE__*/React.createElement(MathSymbol, {
    text: step.latex
  }))))))))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-4 ml-4 mt-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 p-4 rounded-xl border border-green-200 shadow-sm"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-black text-green-600 uppercase tracking-widest mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14
  }), " ", t('math.display.answer_header')), isMathEditing(pIdx) ? /*#__PURE__*/React.createElement("input", {
    type: "text",
    className: "w-full p-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none bg-amber-50/50 font-serif text-lg font-bold text-green-900",
    value: problem.answer || '',
    onChange: e => handleMathProblemEdit(pIdx, 'answer', e.target.value),
    placeholder: t('common.placeholder_enter_answer')
  }) : /*#__PURE__*/React.createElement("div", {
    className: "text-lg font-bold text-green-900 font-serif"
  }, /*#__PURE__*/React.createElement(MathSymbol, {
    text: problem.answer
  }))), problem.realWorld && /*#__PURE__*/React.createElement("div", {
    className: "bg-orange-50 p-4 rounded-xl border border-orange-200 shadow-sm"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-black text-orange-600 uppercase tracking-widest mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Globe, {
    size: 14
  }), " ", t('math.display.connection_header')), isMathEditing(pIdx) ? /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('math.edit_real_world') || 'Edit real-world connection',
    className: "w-full p-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none resize-y bg-amber-50/50 text-sm text-orange-900 min-h-[40px]",
    value: problem.realWorld || '',
    onChange: e => handleMathProblemEdit(pIdx, 'realWorld', e.target.value),
    placeholder: t('common.placeholder_real_world_connection')
  }) : /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-orange-900 leading-relaxed font-medium"
  }, problem.realWorld)))) : /*#__PURE__*/React.createElement("div", {
    className: "ml-12 p-3 bg-slate-50 border border-slate-400 rounded-lg text-center text-sm text-slate-600 italic flex items-center justify-center gap-2 mt-4"
  }, isIndependentMode ? /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.show_math_answers'),
    onClick: handleSetShowMathAnswersToTrue,
    className: "flex items-center gap-2 text-indigo-500 hover:text-indigo-700 font-bold transition-colors py-2 px-4 hover:bg-white rounded-lg"
  }, /*#__PURE__*/React.createElement(Eye, {
    size: 16
  }), " ", t('math.display.reveal_solution')) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(EyeOff, {
    size: 14
  }), " ", t('math.display.answer_hidden')))) : /*#__PURE__*/React.createElement("div", {
    className: "ml-4 sm:ml-12 mt-4 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-3 left-3 text-slate-600"
  }, /*#__PURE__*/React.createElement(Pencil, {
    size: 16
  })), /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('math.display.student_work') || `Show your work for problem ${pIdx + 1}`,
    className: "w-full p-3 pl-10 border border-slate-400 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none resize-y bg-slate-50/50 focus:bg-white transition-all font-serif text-lg leading-relaxed text-slate-700 placeholder:text-slate-600 min-h-[120px]",
    placeholder: t('math.display.placeholder_work') || 'Show your work here... Type your answer and explain your thinking.',
    value: studentResponses[generatedContent.id]?.[pIdx] || '',
    onChange: e => handleStudentInput(generatedContent.id, pIdx, e.target.value),
    disabled: mathCheckResults[generatedContent.id]?.[pIdx]?.checking
  })), (() => {
    const checkResult = mathCheckResults[generatedContent.id]?.[pIdx];
    const studentWork = studentResponses[generatedContent.id]?.[pIdx] || '';
    return /*#__PURE__*/React.createElement(React.Fragment, null, !checkResult?.checked && /*#__PURE__*/React.createElement("button", {
      onClick: () => handleCheckMathWork(generatedContent.id, pIdx, problem.question || problem.problem, problem.answer, problem.steps, studentWork),
      disabled: !studentWork || studentWork.trim().length < 5 || checkResult?.checking,
      className: "flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 hover:shadow-md active:scale-[0.98]",
      "data-help-key": "math_check_work"
    }, checkResult?.checking ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(RefreshCw, {
      size: 16,
      className: "animate-spin"
    }), " ", t('math.check.checking') || 'Evaluating your work...') : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Sparkles, {
      size: 16
    }), " ", t('math.check.button') || 'Check My Work')), !checkResult?.checked && (() => {
      const hintKey = `${generatedContent.id}_${pIdx}`;
      const hintInfo = mathHintData[hintKey] || {
        hints: [],
        loading: false,
        count: 0
      };
      return /*#__PURE__*/React.createElement("div", {
        className: "space-y-2"
      }, hintInfo.hints.map((hint, hIdx) => /*#__PURE__*/React.createElement("div", {
        key: hIdx,
        className: "flex gap-2 items-start p-3 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 animate-in fade-in slide-in-from-top-1 duration-200"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-lg flex-shrink-0"
      }, hIdx === 0 ? '💡' : hIdx === 1 ? 'ðŸ”¦' : 'ðŸ”'), /*#__PURE__*/React.createElement("div", {
        className: "flex-1"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-[11px] font-black text-amber-600 uppercase tracking-widest"
      }, "Hint ", hIdx + 1, " of 3"), /*#__PURE__*/React.createElement("p", {
        className: "text-sm text-amber-900 font-medium leading-relaxed mt-0.5"
      }, hint)))), hintInfo.count < 3 && /*#__PURE__*/React.createElement("button", {
        onClick: () => handleGetMathHint(generatedContent.id, pIdx, problem.question || problem.problem, problem.answer, problem.steps),
        disabled: hintInfo.loading,
        className: "flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all border-2 border-dashed border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
      }, hintInfo.loading ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(RefreshCw, {
        size: 14,
        className: "animate-spin"
      }), " Thinking...") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
        className: "text-sm"
      }, "\uD83D\uDCA1"), " ", hintInfo.count === 0 ? 'Give me a hint (-25% XP)' : hintInfo.count === 1 ? 'Another hint (-50% XP)' : 'Final hint (-75% XP)')));
    })(), checkResult?.checked && /*#__PURE__*/React.createElement("div", {
      className: `rounded-xl border-2 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 ${checkResult.verdict === 'correct' ? 'border-green-300 bg-green-50' : checkResult.verdict === 'partial' ? 'border-amber-300 bg-amber-50' : 'border-red-300 bg-red-50'}`
    }, /*#__PURE__*/React.createElement("div", {
      className: `px-4 py-3 flex items-center justify-between ${checkResult.verdict === 'correct' ? 'bg-green-100' : checkResult.verdict === 'partial' ? 'bg-amber-100' : 'bg-red-100'}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-xl"
    }, checkResult.verdict === 'correct' ? '✅' : checkResult.verdict === 'partial' ? '🟡' : '❌'), /*#__PURE__*/React.createElement("span", {
      className: `font-black text-sm uppercase tracking-wider ${checkResult.verdict === 'correct' ? 'text-green-700' : checkResult.verdict === 'partial' ? 'text-amber-700' : 'text-red-700'}`
    }, checkResult.verdict === 'correct' ? t('math.check.verdict_correct') || 'Correct!' : checkResult.verdict === 'partial' ? t('math.check.verdict_partial') || 'Partially Correct' : t('math.check.verdict_incorrect') || 'Not Quite Right')), /*#__PURE__*/React.createElement("div", {
      className: `px-3 py-1 rounded-full text-xs font-black ${checkResult.score >= 80 ? 'bg-green-200 text-green-800' : checkResult.score >= 40 ? 'bg-amber-200 text-amber-800' : 'bg-red-200 text-red-800'}`
    }, checkResult.score, "% \xB7 ", checkResult.hintsUsed > 0 ? `-${checkResult.hintsUsed} hint${checkResult.hintsUsed > 1 ? 's' : ''} · ` : '', "+", Math.round(checkResult.score / 10 * Math.max(0.25, 1 - (checkResult.hintsUsed || 0) * 0.25)), " XP")), /*#__PURE__*/React.createElement("div", {
      className: "px-4 py-3"
    }, /*#__PURE__*/React.createElement("p", {
      className: `text-sm leading-relaxed font-medium ${checkResult.verdict === 'correct' ? 'text-green-800' : checkResult.verdict === 'partial' ? 'text-amber-800' : 'text-red-800'}`
    }, checkResult.feedback)), /*#__PURE__*/React.createElement("div", {
      className: "px-4 pb-3 flex justify-end"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => handleResetMathCheck(generatedContent.id, pIdx),
      className: `flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${checkResult.verdict === 'correct' ? 'text-green-600 hover:bg-green-100' : 'text-indigo-600 hover:bg-indigo-100'}`
    }, /*#__PURE__*/React.createElement(RefreshCw, {
      size: 12
    }), checkResult.verdict === 'correct' ? t('math.check.try_another') || 'Revise Answer' : t('math.check.try_again') || 'Try Again'))), checkResult?.checked && problem.steps && problem.steps.length > 0 && /*#__PURE__*/React.createElement("details", {
      className: "mt-3 group"
    }, /*#__PURE__*/React.createElement("summary", {
      className: "flex items-center gap-2 cursor-pointer select-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 hover:from-blue-100 hover:to-indigo-100 transition-all"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-sm"
    }, "\uD83D\uDCD6"), /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-bold text-blue-700"
    }, t('math.show_solution_steps') || 'Show Solution Steps'), /*#__PURE__*/React.createElement(ChevronDown, {
      size: 14,
      className: "text-blue-400 ml-auto group-open:rotate-180 transition-transform"
    })), /*#__PURE__*/React.createElement("div", {
      className: "mt-2 space-y-2 pl-2 border-l-3 border-blue-200"
    }, problem.steps.map((step, sIdx) => /*#__PURE__*/React.createElement("div", {
      key: sIdx,
      className: "flex gap-3 items-start p-3 bg-white rounded-lg border border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200",
      style: {
        animationDelay: `${sIdx * 80}ms`
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex-shrink-0 w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-black shadow-sm"
    }, sIdx + 1), /*#__PURE__*/React.createElement("div", {
      className: "flex-1 min-w-0"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-slate-700 font-medium leading-relaxed"
    }, step.explanation), step.latex && /*#__PURE__*/React.createElement("div", {
      className: "mt-1.5 px-3 py-1.5 bg-slate-50 rounded-md border border-slate-400 text-xs text-indigo-700 overflow-x-auto"
    }, /*#__PURE__*/React.createElement(MathSymbol, {
      text: step.latex
    })), step.expression && !step.latex && /*#__PURE__*/React.createElement("div", {
      className: "mt-1.5 px-3 py-1.5 bg-slate-50 rounded-md border border-slate-400 font-mono text-xs text-indigo-700"
    }, /*#__PURE__*/React.createElement(MathSymbol, {
      text: step.expression
    }))))), problem.answer && /*#__PURE__*/React.createElement("div", {
      className: "p-3 bg-green-50 rounded-lg border border-green-200 flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-sm"
    }, "\u2705"), /*#__PURE__*/React.createElement("span", {
      className: "text-sm font-bold text-green-700"
    }, "Answer: ", problem.answer), (mathSubject === 'Geometry' || /volum|prism|cube|dimension|rectangular/i.test(problem.question || problem.title || '')) && /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setShowStemLab(true);
        setStemLabTab('explore');
        setStemLabTool('volume');
        setCubeBuilderMode('freeform');
        setCubePositions(new Set());
        const vol = parseInt(String(problem.answer).replace(/[^\d]/g, ''));
        if (vol && vol > 0 && vol <= 100) {
          setCubeBuilderChallenge({
            type: 'volume',
            answer: vol,
            shape: 'any'
          });
          setCubeBuilderFeedback(null);
        }
      },
      className: "ml-auto text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-600 rounded-full px-2.5 py-0.5 transition-all hover:shadow-sm"
    }, "\uD83D\uDCE6 Try with cubes")))));
  })()))), (generatedContent?.data.problems?.length === 1 || !generatedContent?.data.problems && generatedContent?.data.problem) && /*#__PURE__*/React.createElement("div", {
    className: "mt-8 flex justify-center pb-4"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.generate_content'),
    onClick: handleGenerateSimilar,
    disabled: isProcessing,
    "aria-busy": isProcessing,
    className: "flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-full font-bold shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100",
    "data-help-key": "math_generate_similar"
  }, isProcessing ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 18,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(RefreshCw, {
    size: 18
  }), t('math.display.generate_similar'))), isTeacherMode && generatedContent?.data?.problems?.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm"
  }, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-indigo-700"
  }, t('math.edit_with_allobot')), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-indigo-400 font-medium"
  }, t('math.edit_helper'))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: mathEditInput,
    onChange: e => setMathEditInput(e.target.value),
    onKeyDown: e => {
      if (e.key === "Enter" && mathEditInput.trim() && !isMathEditingChat) handleMathEdit(mathEditInput);
    },
    placeholder: "e.g. Make these easier, add 2 more division problems, change to a space theme...",
    className: "flex-1 px-3 py-2 text-sm border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none bg-white placeholder-slate-400",
    "aria-label": "Edit math problems",
    disabled: isMathEditingChat
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleMathEdit(mathEditInput),
    disabled: !mathEditInput.trim() || isMathEditingChat,
    className: "px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-sm rounded-lg hover:from-indigo-600 hover:to-purple-600 disabled:opacity-40 transition-all flex items-center gap-2 shadow-md"
  }, isMathEditingChat ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin"
  }), " Editing...") : "✏️ Apply")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1 mt-2"
  }, ["Make easier", "Make harder", "Add word problems", "Add more problems", "Change theme", "Simplify steps"].map(suggestion => /*#__PURE__*/React.createElement("button", {
    key: suggestion,
    onClick: () => {
      setMathEditInput(suggestion);
      handleMathEdit(suggestion);
    },
    disabled: isMathEditing,
    className: "px-2 py-1 text-[11px] font-bold text-indigo-600 bg-white border border-indigo-600 rounded-full hover:bg-indigo-100 transition-all disabled:opacity-40"
  }, suggestion)))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.MathView = MathView;
  window.AlloModules.ViewMathModule = true;
})();
