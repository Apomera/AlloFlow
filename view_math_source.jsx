
// ── Inline parametric diagram renderer — DELEGATE (canonical impl in utils_pure / UtilsPure) ──
function _renderDiagramSvg(tool, state, titleText) {
  try {
    // Canonical impl lives in utils_pure (window.AlloModules.UtilsPure) — shared with QuizView so
    // math + quiz never drift. Delegate to it; null if not loaded (caller falls back to the button).
    var _U = (typeof window !== 'undefined' && window.AlloModules && window.AlloModules.UtilsPure);
    return (_U && typeof _U._renderDiagramSvg === 'function') ? _U._renderDiagramSvg(tool, state, titleText) : null;
  } catch (error) {
    try { console.warn('[MathView] Could not render restored manipulative diagram:', error); } catch (_) {}
    return null;
  }
}

function _mathStableHash(value) {
  var text = String(value == null ? '' : value);
  var hash = 2166136261;
  for (var i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function _mathProblemKey(problem, index, resourceId) {
  var suppliedKey = problem && _mathScalarText(problem.id != null ? problem.id : problem.problemId).trim();
  if (suppliedKey) {
    return Object.prototype.hasOwnProperty.call(Object.prototype, suppliedKey)
      ? 'problem-id-' + _mathStableHash((resourceId || 'math') + '|' + suppliedKey)
      : suppliedKey;
  }
  var seed = [
    resourceId || 'legacy-math',
    problem && (problem.question || problem.problem || ''),
    problem && (problem.answer || problem.correct_answer || ''),
    problem && (problem.taskType || ''),
  ].join('|');
  return 'problem-' + _mathStableHash(seed) + '-' + index;
}

function _mathScalarText(value, maxLength = 12000) {
  try {
    if (typeof value !== 'string' && typeof value !== 'number') return '';
    var limit = Number.isFinite(maxLength)
      ? Math.max(0, Math.min(250000, Math.floor(maxLength)))
      : 12000;
    return String(value).slice(0, limit);
  } catch (_) {
    return '';
  }
}

function _mathPlainRecord(value) {
  try {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (_) {
    return {};
  }
}

function _mathSafeShallowCopy(value) {
  var copy = {};
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return copy;
    var visited = 0;
    for (var key in value) {
      if (visited++ >= 256) break;
      var ownsKey = false;
      try { ownsKey = Object.prototype.hasOwnProperty.call(value, key); } catch (_) {}
      if (!ownsKey) continue;
      if (key === '__proto__' || key === 'prototype' || key === 'constructor') continue;
      try { copy[key] = value[key]; } catch (_) {}
    }
  } catch (_) {}
  return copy;
}

function _mathSafeArraySnapshot(value, maxLength) {
  var copy = [];
  try {
    if (!Array.isArray(value)) return copy;
    var length = Number(value.length);
    var limit = Number.isFinite(maxLength) ? Math.max(0, Math.floor(maxLength)) : 0;
    if (!Number.isInteger(length) || length < 0) return copy;
    var count = Math.min(length, limit);
    for (var index = 0; index < count; index += 1) {
      try { copy.push(value[index]); } catch (_) { copy.push(undefined); }
    }
  } catch (_) {}
  return copy;
}

var _MATH_MANIPULATIVE_TOOLS = Object.freeze([
  'coordinate', 'base10', 'numberline', 'fractions', 'volume', 'protractor',
  'funcGrapher', 'physics', 'chemBalance', 'punnett', 'circuit', 'dataPlot',
  'inequality', 'molecule', 'calculus', 'wave', 'cell'
]);

function _mathIsSupportedManipulativeTool(tool) {
  return typeof tool === 'string'
    && tool.length <= 32
    && _MATH_MANIPULATIVE_TOOLS.includes(tool);
}

function _mathManipulativeResponseAvailability(response) {
  if (!response || !_mathIsSupportedManipulativeTool(response.tool)) {
    return { available: false, reason: 'invalid-tool' };
  }
  try {
    var grader = typeof window !== 'undefined' && window.AlloModules
      ? window.AlloModules.MathManipulativeGrader
      : null;
    var hasViewGrader = grader && (
      typeof grader.evaluateMathViewManipulativeResponse === 'function'
      || typeof grader.gradeMathViewManipulativeResponse === 'function'
    );
    if (!hasViewGrader || typeof grader.evaluateManipulativeResponse !== 'function') {
      return { available: false, reason: 'checker-unavailable' };
    }
    if (Array.isArray(grader.supportedTools) && !grader.supportedTools.includes(response.tool)) {
      return { available: false, reason: 'checker-unavailable' };
    }
    // A structured probe with no actual state must reach `invalid-actual` only
    // after the canonical grader has accepted the target. This avoids trapping
    // learners in a manipulative-only UI for malformed restored/generated data.
    var targetCheck = grader.evaluateManipulativeResponse(response.tool, undefined, response.state);
    if (targetCheck && targetCheck.supported === true && targetCheck.reason === 'invalid-actual') {
      return { available: true, reason: 'ready' };
    }
    if (targetCheck && targetCheck.reason === 'invalid-target') {
      return { available: false, reason: 'invalid-target' };
    }
    return { available: false, reason: 'checker-unavailable' };
  } catch (_) {
    return { available: false, reason: 'checker-unavailable' };
  }
}

function _mathManipulativeFallbackMessage(availability) {
  if (availability && availability.reason === 'lab-unavailable') {
    return 'This problem\u2019s manipulative lab is unavailable here. Type your work instead.';
  }
  if (availability && availability.reason === 'invalid-tool') {
    return 'This problem\u2019s manipulative response is unavailable because its tool type is invalid. Type your work instead.';
  }
  if (availability && availability.reason === 'invalid-target') {
    return 'This problem has an invalid manipulative target. Type your work instead; your answer will not be marked wrong because of this setup issue.';
  }
  return 'This problem\u2019s manipulative checker is unavailable. Type your work instead.';
}

function _mathFractionDenominatorLimit() {
  try {
    var grader = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.MathManipulativeGrader;
    var configured = Number(grader && grader.limits && grader.limits.maxFractionDenominator);
    return Number.isInteger(configured) && configured >= 2 ? Math.min(20, configured) : 20;
  } catch (_) {
    return 20;
  }
}

function _mathRequestActivity(kind, resourceId, problemKey) {
  try {
    var helpers = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.MathHelpers;
    var query = kind === 'check'
      ? helpers && helpers.isMathCheckRequestActive
      : helpers && helpers.isMathHintRequestActive;
    return typeof query === 'function' ? query(resourceId, problemKey) === true : null;
  } catch (_) {
    return null;
  }
}

function _normalizeMathManipulative(value) {
  var raw = _mathSafeShallowCopy(value);
  var tool = _mathScalarText(raw.tool);
  if (!tool) return null;
  return { tool, state: _mathSafeShallowCopy(raw.state), __source: value };
}

function _normalizeMathCheckResult(value) {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    var raw = _mathSafeShallowCopy(value);
    var verdict = typeof raw.verdict === 'string' && ['correct', 'partial', 'incorrect', 'error'].includes(raw.verdict)
      ? raw.verdict
      : 'incorrect';
    var score = Number.isFinite(raw.score) ? Math.max(0, Math.min(100, Math.round(raw.score))) : 0;
    var hintsUsed = Number.isFinite(raw.hintsUsed) ? Math.max(0, Math.min(3, Math.floor(raw.hintsUsed))) : 0;
    return {
      ...raw,
      checking: raw.checking === true,
      checked: raw.checked === true,
      verdict,
      score,
      hintsUsed,
      feedback: _mathScalarText(raw.feedback) || 'Your saved result could not be fully restored. Try checking your work again.',
      xpEarned: Number.isFinite(raw.xpEarned) ? Math.max(0, Math.floor(raw.xpEarned)) : 0
    };
  } catch (_) {
    return null;
  }
}

function _normalizeMathHintState(value) {
  try {
    var raw = _mathSafeShallowCopy(value);
    var hints = [];
    var rawHints = _mathSafeArraySnapshot(raw.hints, 12);
    for (var hintIndex = 0; hintIndex < rawHints.length && hints.length < 3; hintIndex += 1) {
      if (typeof rawHints[hintIndex] !== 'string') continue;
      var hint = rawHints[hintIndex].slice(0, 1000).trim();
      if (hint) hints.push(hint);
    }
    var declaredCount = Number(raw.count);
    var count = Math.max(hints.length, Number.isFinite(declaredCount) ? Math.floor(declaredCount) : 0);
    return {
      hints,
      loading: raw.loading === true,
      count: Math.max(0, Math.min(3, count))
    };
  } catch (_) {
    return { hints: [], loading: false, count: 0 };
  }
}

function _normalizeMathSteps(steps) {
  try {
    if (!Array.isArray(steps)) {
      var singleStep = _mathScalarText(steps).trim();
      if (singleStep) return [{ explanation: singleStep, latex: '' }];
      return [];
    }
    var normalizedSteps = [];
    var rawSteps = _mathSafeArraySnapshot(steps, 50);
    for (var stepIndex = 0; stepIndex < rawSteps.length; stepIndex += 1) {
      var step = rawSteps[stepIndex];
      var isStepRecord = false;
      try { isStepRecord = !!step && typeof step === 'object' && !Array.isArray(step); } catch (_) {}
      if (typeof step !== 'string' && !isStepRecord) continue;
      if (typeof step === 'string') {
        var explanation = _mathScalarText(step);
        if (explanation) normalizedSteps.push({ explanation, latex: '' });
      } else {
        var safeStep = _mathSafeShallowCopy(step);
        var normalizedStep = {
          ...safeStep,
          explanation: _mathScalarText(safeStep.explanation),
          latex: _mathScalarText(safeStep.latex),
          expression: _mathScalarText(safeStep.expression),
        };
        if (normalizedStep.explanation || normalizedStep.latex || normalizedStep.expression) {
          normalizedSteps.push(normalizedStep);
        }
      }
    }
    return normalizedSteps;
  } catch (_) {
    return [];
  }
}

// Accessible-math prompts can outlive the render that opened them. These pure
// comparisons operate on per-MathView refs so separate or concurrent instances
// cannot invalidate one another.
function _mathAccessibleContextMatches(registry, request) {
  if (!request || registry.resourceId !== request.resourceId || registry.artifact !== request.artifact) return false;
  var current = registry.contexts.get(request.contextKey);
  return !!current
    && current.enabled === true
    && current.value === request.value
    && current.problemToken === request.problemToken;
}

function _mathAccessibleRequestIsCurrent(registry, pending, request) {
  return pending.get(request.contextKey) === request.requestId
    && _mathAccessibleContextMatches(registry, request);
}

function _mathManipulativeActualState(tool, snapshot) {
  try {
    var state = _mathPlainRecord(snapshot);
    var directKeys = {
      coordinate: 'gridPoints',
      base10: 'base10Value',
      numberline: 'numberLineMarkers',
      fractions: 'fractionPieces',
      volume: 'cubeDims',
      protractor: 'angleValue'
    };
    if (Object.prototype.hasOwnProperty.call(directKeys, tool)) return state[directKeys[tool]];
    var toolData = _mathPlainRecord(state.labToolData);
    if (tool === 'circuit' && Object.prototype.hasOwnProperty.call(toolData, '_circuit')) return toolData._circuit;
    return Object.prototype.hasOwnProperty.call(toolData, tool) ? toolData[tool] : undefined;
  } catch (_) {
    return undefined;
  }
}

function _mathManipulativeDiagnostic(evaluation) {
  var result = _mathPlainRecord(evaluation);
  if (result.supported !== true || result.reason === 'unsupported-tool') {
    return { response: null, message: 'This manipulative checker is temporarily unavailable. Your work was not marked wrong.', tone: 'error' };
  }
  if (result.correct === true && result.reason === 'match') {
    return { response: '(Manipulative: CORRECT ✅)', message: 'Manipulative match correct! 🎉', tone: 'success' };
  }
  if (result.reason === 'mismatch') {
    return { response: '(Manipulative: INCORRECT ❌)', message: 'That manipulative setup does not match yet. Keep trying!', tone: 'error' };
  }
  if (result.reason === 'invalid-actual') {
    return { response: null, message: 'Complete every required part of the manipulative before checking. Your work was not marked wrong.', tone: 'info' };
  }
  if (result.reason === 'invalid-target') {
    return { response: null, message: 'This problem has an invalid manipulative target. Your work was not marked wrong.', tone: 'error' };
  }
  return { response: null, message: 'The manipulative state could not be checked safely. Reopen it and try again.', tone: 'error' };
}

function _normalizeMathProblems(generatedContent, resourceId) {
  try {
    var data = generatedContent && generatedContent.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
    var rawProblems = Array.isArray(data.problems)
      ? data.problems
      : (data.problem != null || data.question != null)
        ? [{
            question: data.problem != null ? data.problem : data.question,
            answer: data.answer,
            taskType: data.taskType,
            expression: data.expression,
            steps: data.steps,
            realWorld: data.realWorld,
            manipulativeSupport: data.manipulativeSupport,
            manipulativeResponse: data.manipulativeResponse,
            _verification: data._verification,
          }]
        : [];
    var usedViewKeys = new Set();
    return _mathSafeArraySnapshot(rawProblems, 200)
      .filter(problem => {
        try { return problem && typeof problem === 'object' && !Array.isArray(problem); } catch (_) { return false; }
      })
      .map((problem, index) => {
        var safeProblem = _mathSafeShallowCopy(problem);
        var baseViewKey = _mathProblemKey(safeProblem, index, resourceId);
        var viewKey = baseViewKey;
        var collision = 0;
        while (usedViewKeys.has(viewKey)) {
          viewKey = `${baseViewKey}-duplicate-${index}-${++collision}`;
        }
        usedViewKeys.add(viewKey);
        return {
          ...safeProblem,
          question: _mathScalarText(safeProblem.question),
          problem: _mathScalarText(safeProblem.problem),
          answer: _mathScalarText(safeProblem.answer ?? safeProblem.correct_answer),
          correct_answer: _mathScalarText(safeProblem.correct_answer),
          taskType: _mathScalarText(safeProblem.taskType),
          expression: _mathScalarText(safeProblem.expression),
          realWorld: _mathScalarText(safeProblem.realWorld),
          manipulativeSupport: _normalizeMathManipulative(safeProblem.manipulativeSupport),
          manipulativeResponse: _normalizeMathManipulative(safeProblem.manipulativeResponse),
          _verification: safeProblem._verification ? _mathSafeShallowCopy(safeProblem._verification) : null,
          steps: _normalizeMathSteps(safeProblem.steps),
          __viewKey: viewKey,
        };
      })
      .filter(problem => problem.question.trim() || problem.problem.trim());
  } catch (_) {
    return [];
  }
}

function MathView(props) {
  props = _mathSafeShallowCopy(props);
  var noop = () => {};
  var accessibleInputRegistryRef = React.useRef({ resourceId: null, artifact: null, contexts: new Map() });
  var nextAccessibleInputRegistry = { resourceId: null, artifact: null, contexts: new Map() };
  var accessibleInputPendingRef = React.useRef(new Map());
  var accessibleInputSequenceRef = React.useRef(0);
  var activeManipulativeSessionRef = React.useRef(null);
  React.useLayoutEffect(() => {
    var previousRegistry = accessibleInputRegistryRef.current;
    var pending = accessibleInputPendingRef.current;
    pending.forEach((requestId, contextKey) => {
      var previousContext = previousRegistry && previousRegistry.contexts
        ? previousRegistry.contexts.get(contextKey)
        : null;
      var nextContext = nextAccessibleInputRegistry.contexts.get(contextKey);
      var unchanged = previousRegistry.resourceId === nextAccessibleInputRegistry.resourceId
        && previousRegistry.artifact === nextAccessibleInputRegistry.artifact
        && previousContext
        && nextContext
        && previousContext.enabled === nextContext.enabled
        && previousContext.value === nextContext.value
        && previousContext.problemToken === nextContext.problemToken;
      if (!unchanged) pending.delete(contextKey);
    });
    accessibleInputRegistryRef.current = nextAccessibleInputRegistry;
  });
  React.useEffect(() => () => {
    accessibleInputRegistryRef.current = { resourceId: null, artifact: null, contexts: new Map() };
    accessibleInputPendingRef.current.clear();
    activeManipulativeSessionRef.current = null;
  }, []);
  // State reads
  var t = typeof props.t === 'function' ? props.t : (key => key);
  var generatedContentArtifact = props.generatedContent;
  React.useLayoutEffect(() => {
    if (activeManipulativeSessionRef.current
      && activeManipulativeSessionRef.current.artifact !== generatedContentArtifact) {
      activeManipulativeSessionRef.current = null;
    }
  }, [generatedContentArtifact]);
  var generatedContent = _mathSafeShallowCopy(generatedContentArtifact);
  var rawGeneratedMathData = generatedContent.data;
  var plainGeneratedMathData = _mathPlainRecord(rawGeneratedMathData);
  var hasGeneratedMathData = !!rawGeneratedMathData && plainGeneratedMathData === rawGeneratedMathData;
  generatedContent.data = _mathSafeShallowCopy(plainGeneratedMathData);
  var isProcessing = props.isProcessing === true;
  if (generatedContent.type !== 'math' || !hasGeneratedMathData) {
    return <div role="status" aria-live="polite">{isProcessing ? 'Preparing math content...' : 'No math activity is ready. Generate one or select one from history.'}</div>;
  }
  var mathTitle = _mathScalarText(generatedContent.data.title, 2000);
  var mathMeta = _mathScalarText(generatedContent.meta, 2000);
  var mathGraphAlt = _mathScalarText(generatedContent.data.graphAlt, 4000);
  var resourceSeed = mathTitle
    || _mathScalarText(generatedContent.data.problem, 12000)
    || _mathScalarText(generatedContent.timestamp, 500)
    || 'math';
  var suppliedResourceId = _mathScalarText(generatedContent.id, 500).trim();
  var suppliedMathResourceId = _mathScalarText(props.mathResourceId).trim().slice(0, 1000);
  var mathResourceId = suppliedMathResourceId || (
    suppliedResourceId
      ? Object.prototype.hasOwnProperty.call(Object.prototype, suppliedResourceId)
        ? 'math-resource-' + _mathStableHash(resourceSeed + '|' + suppliedResourceId)
        : suppliedResourceId
      : 'legacy-math-' + _mathStableHash(resourceSeed)
  );
  var mathProblems = _normalizeMathProblems(generatedContent, mathResourceId);
  if (!mathProblems.length) return <div role="alert">This math activity has no displayable problems. Try regenerating it.</div>;
  var isTeacherMode = props.isTeacherMode === true;
  var isIndependentMode = props.isIndependentMode === true;
  var showMathAnswers = props.showMathAnswers === true;
  var mathSelfGradeMode = props.mathSelfGradeMode === true;
  var mathStudentAnswers = _mathSafeShallowCopy(props.mathStudentAnswers);
  var mathEditInput = _mathScalarText(props.mathEditInput);
  var isMathEditingChat = props.isMathEditingChat === true;
  var mathHintData = _mathSafeShallowCopy(props.mathHintData);
  var mathCheckResults = _mathSafeShallowCopy(props.mathCheckResults);
  var mathSubject = _mathScalarText(props.mathSubject) || 'Math';
  var studentResponses = _mathSafeShallowCopy(props.studentResponses);
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
  var setStemLabTool = typeof props.setStemLabTool === 'function' ? props.setStemLabTool : noop;
  var setStemLabTab = typeof props.setStemLabTab === 'function' ? props.setStemLabTab : noop;
  var setShowStemLab = typeof props.setShowStemLab === 'function' ? props.setShowStemLab : noop;
  var canSetGridPoints = typeof props.setGridPoints === 'function';
  var setGridPoints = canSetGridPoints ? props.setGridPoints : noop;
  var canSetBase10Value = typeof props.setBase10Value === 'function';
  var setBase10Value = canSetBase10Value ? props.setBase10Value : noop;
  var setNumberLineRange = typeof props.setNumberLineRange === 'function' ? props.setNumberLineRange : noop;
  var canSetNumberLineMarkers = typeof props.setNumberLineMarkers === 'function';
  var setNumberLineMarkers = canSetNumberLineMarkers ? props.setNumberLineMarkers : noop;
  var canSetFractionPieces = typeof props.setFractionPieces === 'function';
  var setFractionPieces = canSetFractionPieces ? props.setFractionPieces : noop;
  var canSetCubeDims = typeof props.setCubeDims === 'function';
  var setCubeDims = canSetCubeDims ? props.setCubeDims : noop;
  var canSetAngleValue = typeof props.setAngleValue === 'function';
  var setAngleValue = canSetAngleValue ? props.setAngleValue : noop;
  var canSetLabToolData = typeof props.setLabToolData === 'function';
  var setLabToolData = canSetLabToolData ? props.setLabToolData : noop;
  var canSetMathEditInput = typeof props.setMathEditInput === 'function';
  var setMathEditInput = canSetMathEditInput ? props.setMathEditInput : noop;
  var canSetMathStudentAnswers = typeof props.setMathStudentAnswers === 'function';
  var setMathStudentAnswers = canSetMathStudentAnswers ? props.setMathStudentAnswers : noop;
  var setCubeBuilderMode = typeof props.setCubeBuilderMode === 'function' ? props.setCubeBuilderMode : noop;
  var setCubePositions = typeof props.setCubePositions === 'function' ? props.setCubePositions : noop;
  var setCubeBuilderChallenge = typeof props.setCubeBuilderChallenge === 'function' ? props.setCubeBuilderChallenge : noop;
  var setCubeBuilderFeedback = typeof props.setCubeBuilderFeedback === 'function' ? props.setCubeBuilderFeedback : noop;
  // Handlers
  var canToggleShowMathAnswers = typeof props.handleToggleShowMathAnswers === 'function';
  var canToggleMathSelfGrade = typeof props.handleToggleMathSelfGrade === 'function';
  var canSubmitMathSelfGrade = typeof props.submitMathSelfGrade === 'function';
  var canHandleStudentInput = typeof props.handleStudentInput === 'function';
  var canHandleMathProblemEdit = typeof props.handleMathProblemEdit === 'function';
  var canHandleCheckMathWork = typeof props.handleCheckMathWork === 'function';
  var canHandleResetMathCheck = typeof props.handleResetMathCheck === 'function';
  var canHandleGetMathHint = typeof props.handleGetMathHint === 'function';
  var canHandleGenerateSimilar = typeof props.handleGenerateSimilar === 'function';
  var canHandleMathEdit = typeof props.handleMathEdit === 'function';
  var canToggleMathEdit = typeof props.toggleMathEdit === 'function';
  var canCopyToClipboard = typeof props.copyToClipboard === 'function';
  var canSetShowMathAnswers = typeof props.handleSetShowMathAnswersToTrue === 'function';
  var canOpenStemLab = typeof props.setStemLabTool === 'function'
    && typeof props.setStemLabTab === 'function'
    && typeof props.setShowStemLab === 'function';
  var canPrepareMathManipulativeTool = tool => {
    if (tool === 'coordinate') return canSetGridPoints;
    if (tool === 'base10') return canSetBase10Value;
    if (tool === 'numberline') return canSetNumberLineMarkers;
    if (tool === 'fractions') return canSetFractionPieces;
    if (tool === 'volume') return canSetCubeDims;
    if (tool === 'protractor') return canSetAngleValue;
    return canSetLabToolData;
  };
  var canOpenCubeLab = canOpenStemLab
    && typeof props.setCubeBuilderMode === 'function'
    && typeof props.setCubePositions === 'function'
    && typeof props.setCubeBuilderChallenge === 'function'
    && typeof props.setCubeBuilderFeedback === 'function';
  var handleToggleShowMathAnswers = canToggleShowMathAnswers ? props.handleToggleShowMathAnswers : noop;
  var handleSetShowMathAnswersToTrue = canSetShowMathAnswers ? props.handleSetShowMathAnswersToTrue : noop;
  var handleToggleMathSelfGrade = canToggleMathSelfGrade ? props.handleToggleMathSelfGrade : noop;
  var submitMathSelfGrade = canSubmitMathSelfGrade ? props.submitMathSelfGrade : noop;
  var handleStudentInput = canHandleStudentInput ? props.handleStudentInput : noop;
  var handleMathProblemEdit = canHandleMathProblemEdit ? props.handleMathProblemEdit : noop;
  var handleCheckMathWork = canHandleCheckMathWork ? props.handleCheckMathWork : noop;
  var handleResetMathCheck = canHandleResetMathCheck ? props.handleResetMathCheck : noop;
  var handleGetMathHint = canHandleGetMathHint ? props.handleGetMathHint : noop;
  var handleGenerateSimilar = canHandleGenerateSimilar ? props.handleGenerateSimilar : noop;
  var handleMathEdit = canHandleMathEdit ? props.handleMathEdit : noop;
  var isMathEditing = typeof props.isMathEditing === 'function' ? props.isMathEditing : (() => false);
  var toggleMathEdit = canToggleMathEdit ? props.toggleMathEdit : noop;
  // Pure helpers
  var formatMathQuestion = typeof props.formatMathQuestion === 'function'
    ? props.formatMathQuestion
    : (problem => problem.question || problem.problem || problem.expression || '');
  var formatInlineText = typeof props.formatInlineText === 'function' ? props.formatInlineText : (text => _mathScalarText(text));
  var sanitizeHtml = typeof props.sanitizeHtml === 'function' ? props.sanitizeHtml : (() => '');
  var copyToClipboard = canCopyToClipboard ? props.copyToClipboard : noop;
  var addToast = typeof props.addToast === 'function' ? props.addToast : noop;
  // Components
  var MathSymbol = typeof props.MathSymbol === 'function' ? props.MathSymbol : (symbolProps => <span>{_mathScalarText(symbolProps?.text)}</span>);
  var callTTS = props.callTTS;
  var selectedVoice = props.selectedVoice;

  // Shared accessible math entry: this only inserts notation into the existing
  // response/edit flows. It does not generate problems or grade answers.
  var ensureAccessibleMathInput = () => {
    if (typeof window === 'undefined') return Promise.reject(new Error('Math input is unavailable outside the browser'));
    if (window.AlloMathInput) return Promise.resolve(window.AlloMathInput);
    if (typeof window.__alloLoadPlugin !== 'function') return Promise.reject(new Error('Math input loader is unavailable'));
    return window.__alloLoadPlugin('mathlive_loader.js').then(() => window.AlloMathInput);
  };
  var playSpokenMath = async (formats) => {
    const spoken = formats?.spoken || formats?.plainText || formats?.latex || '';
    if (!spoken) return;
    if (typeof callTTS === 'function') {
      const url = await callTTS(spoken, selectedVoice);
      if (url) {
        const audio = new Audio(url);
        await audio.play();
      }
      return;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis && typeof SpeechSynthesisUtterance === 'function') {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(spoken));
    }
  };
  var appendInlineMath = (currentValue, latex) => {
    const current = String(currentValue || '').trimEnd();
    const normalizedLatex = String(latex || '').trim();
    if (!normalizedLatex) return current;
    const math = `\\(${normalizedLatex}\\)`;
    return current ? `${current} ${math}` : math;
  };
  var openAccessibleMathInput = (rawOptions) => {
    var options = _mathPlainRecord(rawOptions);
    var contextKey = _mathScalarText(options.contextKey);
    var registry = accessibleInputRegistryRef.current;
    var pending = accessibleInputPendingRef.current;
    var currentContext = registry.contexts.get(contextKey);
    if (!contextKey || !currentContext || currentContext.enabled !== true || typeof options.onInsert !== 'function') return;
    var request = {
      requestId: ++accessibleInputSequenceRef.current,
      contextKey,
      resourceId: registry.resourceId,
      artifact: registry.artifact,
      value: currentContext.value,
      problemToken: currentContext.problemToken
    };
    pending.set(contextKey, request.requestId);
    ensureAccessibleMathInput().then((mathInput) => {
      if (!mathInput || typeof mathInput.promptEquation !== 'function') throw new Error('Accessible math input did not initialize');
      return mathInput.promptEquation({
        title: options.title || 'Enter math',
        initialLatex: options.initialLatex || '',
        insertLabel: options.insertLabel || 'Insert math',
        onSpeak: playSpokenMath
      });
    }).then((result) => {
      if (!result || !_mathAccessibleRequestIsCurrent(accessibleInputRegistryRef.current, pending, request)) return;
      var latestContext = accessibleInputRegistryRef.current.contexts.get(contextKey);
      options.onInsert(result, latestContext.value, () => _mathAccessibleContextMatches(accessibleInputRegistryRef.current, request));
    }).catch((error) => {
      if (_mathAccessibleRequestIsCurrent(accessibleInputRegistryRef.current, pending, request)) {
        addToast(`Accessible math input is unavailable: ${error?.message || 'unknown error'}`, 'error');
      }
    }).then(() => {
      if (pending.get(contextKey) === request.requestId) {
        pending.delete(contextKey);
      }
    });
  };
  var mathKeyboardButton = (onClick, label = 'Open accessible math keyboard', disabled = false) => (
    <button
      type="button"
      data-math-input-launch="math-work"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span aria-hidden="true">⌨</span> Math keyboard
    </button>
  );
  var resourceCheckResults = _mathSafeShallowCopy(mathCheckResults[mathResourceId]);
  var resourceStudentResponses = _mathSafeShallowCopy(studentResponses[mathResourceId]);
  var getMathCheckResult = problemKey => {
    var result = _normalizeMathCheckResult(resourceCheckResults[problemKey]);
    if (result?.checking === true && _mathRequestActivity('check', mathResourceId, problemKey) === false) {
      return { ...result, checking: false };
    }
    return result;
  };
  var getMathHintState = problemKey => {
    var resourceHints = _mathSafeShallowCopy(mathHintData[mathResourceId]);
    var nestedHint = Object.prototype.hasOwnProperty.call(resourceHints, String(problemKey))
      ? resourceHints[String(problemKey)]
      : undefined;
    var legacyKey = `${mathResourceId}_${problemKey}`;
    var legacyHint = Object.prototype.hasOwnProperty.call(mathHintData, legacyKey) ? mathHintData[legacyKey] : undefined;
    var state = _normalizeMathHintState(nestedHint !== undefined ? nestedHint : legacyHint);
    return state.loading === true && _mathRequestActivity('hint', mathResourceId, problemKey) === false
      ? { ...state, loading: false }
      : state;
  };
  var isMathResponseLocked = problemKey => {
    var result = getMathCheckResult(problemKey);
    return result?.checking === true || result?.checked === true;
  };
  var manipulativeResponseAvailability = new Map(mathProblems.map(problem => {
    var availability = _mathManipulativeResponseAvailability(problem.manipulativeResponse);
    if (availability.available === true && (
      !canOpenStemLab
      || !canPrepareMathManipulativeTool(problem.manipulativeResponse.tool)
    )) {
      availability = { available: false, reason: 'lab-unavailable' };
    }
    return [problem.__viewKey, availability];
  }));
  var getMathManipulativeResponseAvailability = problem => (
    manipulativeResponseAvailability.get(problem.__viewKey)
    || { available: false, reason: 'checker-unavailable' }
  );
  var mathAccessibleContextKey = (kind, problemKey) => [mathResourceId, kind, String(problemKey)].join('|');
  var accessibleContexts = new Map();
  mathProblems.forEach((problem, problemIndex) => {
    var usesManipulativeResponse = getMathManipulativeResponseAvailability(problem).available === true;
    var problemToken = _mathStableHash([
      problem.__viewKey,
      problem.question,
      problem.problem,
      problem.answer,
      problem.taskType,
      problemIndex
    ].join('|'));
    var responseValue = _mathScalarText(resourceStudentResponses[problem.__viewKey]);
    accessibleContexts.set(mathAccessibleContextKey('problem-question', problem.__viewKey), {
      enabled: canHandleMathProblemEdit && isMathEditing(problemIndex, problem.__viewKey, mathResourceId),
      value: problem.question || problem.problem || '',
      problemToken
    });
    accessibleContexts.set(mathAccessibleContextKey('self-answer', problem.__viewKey), {
      enabled: mathSelfGradeMode && canSetMathStudentAnswers,
      value: _mathScalarText(mathStudentAnswers[problem.__viewKey]),
      problemToken
    });
    accessibleContexts.set(mathAccessibleContextKey('teacher-work', problem.__viewKey), {
      enabled: isTeacherMode && isIndependentMode && !mathSelfGradeMode && !usesManipulativeResponse && canHandleStudentInput,
      value: responseValue,
      problemToken
    });
    accessibleContexts.set(mathAccessibleContextKey('student-work', problem.__viewKey), {
      enabled: !isTeacherMode
        && !mathSelfGradeMode
        && !usesManipulativeResponse
        && canHandleStudentInput
        && !isMathResponseLocked(problem.__viewKey),
      value: responseValue,
      problemToken
    });
  });
  nextAccessibleInputRegistry = { resourceId: mathResourceId, artifact: generatedContentArtifact, contexts: accessibleContexts };
  var mathResponseInputId = problemKey => 'math-response-' + _mathStableHash(mathResourceId + '|' + problemKey);
  var mathSelfAnswerInputId = problemKey => 'math-self-answer-' + _mathStableHash(mathResourceId + '|' + problemKey);
  var mathEditButtonId = problemKey => 'math-edit-toggle-' + _mathStableHash(mathResourceId + '|' + problemKey);
  var answeredSelfGradeCount = mathProblems.filter(problem => _mathScalarText(mathStudentAnswers[problem.__viewKey]).trim()).length;
  var hasAllSelfGradeAnswers = answeredSelfGradeCount === mathProblems.length;
  var selfGradeHelpId = 'math-self-grade-help-' + _mathStableHash(mathResourceId);
  var activeCheckIndex = mathProblems.findIndex(problem => getMathCheckResult(problem.__viewKey)?.checking === true);
  var activeHintIndex = mathProblems.findIndex(problem => getMathHintState(problem.__viewKey).loading === true);
  var mathAsyncStatus = isMathEditingChat
    ? 'Updating math problems...'
    : activeCheckIndex >= 0
      ? `Evaluating work for problem ${activeCheckIndex + 1}.`
      : activeHintIndex >= 0
        ? `Preparing a hint for problem ${activeHintIndex + 1}.`
        : isProcessing ? 'Generating math content...' : '';
  var graphHtml = '';
  if (typeof generatedContent.data.graphData === 'string' && generatedContent.data.graphData) {
    try {
      var graphSource = _mathScalarText(generatedContent.data.graphData, 250000);
      graphHtml = _mathScalarText(sanitizeHtml(graphSource), 250000);
    } catch (_) {
      graphHtml = '';
    }
  }
  var currentManipulativeSnapshot = () => ({
    gridPoints,
    base10Value,
    numberLineMarkers,
    fractionPieces,
    cubeDims,
    angleValue,
    labToolData
  });
  var openMathManipulativeSupport = problem => {
    try {
      var support = problem.manipulativeSupport;
      if (!support) return;
      var tool = support.tool;
      var target = _mathPlainRecord(support.state);
      if (!_mathIsSupportedManipulativeTool(tool)) {
        addToast('This visual support is unavailable because its tool type is invalid.', 'error');
        return;
      }
      if (!canOpenStemLab) {
        addToast('This visual support cannot open because the manipulative lab is unavailable.', 'error');
        return;
      }
      if (!canPrepareMathManipulativeTool(tool)) {
        addToast('This visual support cannot open because its lab state controls are unavailable.', 'error');
        return;
      }
      var ownsSupportValue = key => {
        try { return Object.prototype.hasOwnProperty.call(target, key); } catch (_) { return false; }
      };
      var finiteSupportValue = (value, fallback, required) => {
        if (value == null && !required) return fallback;
        var numeric;
        try { numeric = Number(value); } catch (_) { throw new Error('invalid numeric support state'); }
        if (!Number.isFinite(numeric)) {
          if (required) throw new Error('invalid numeric support state');
          return fallback;
        }
        return numeric;
      };
      var applySupportState = noop;
      if (tool === 'coordinate') {
        var supportPoints = _mathSafeArraySnapshot(target.points, 128)
          .map(point => _mathSafeShallowCopy(point));
        applySupportState = () => setGridPoints(supportPoints);
      } else if (tool === 'base10') {
        var supportBase10 = { ...target };
        applySupportState = () => setBase10Value(supportBase10);
      } else if (tool === 'numberline') {
        var rawSupportRange = target.range;
        var supportRange = null;
        if (rawSupportRange != null) {
          if (_mathPlainRecord(rawSupportRange) !== rawSupportRange) throw new Error('invalid number-line range');
          supportRange = _mathSafeShallowCopy(rawSupportRange);
        }
        var supportMarkers = _mathSafeArraySnapshot(target.markers, 128).map(marker => (
          marker && typeof marker === 'object' ? _mathSafeShallowCopy(marker) : marker
        ));
        applySupportState = () => {
          setNumberLineMarkers(supportMarkers);
          if (supportRange) setNumberLineRange(supportRange);
        };
      } else if (tool === 'fractions') {
        var supportFractionLimit = _mathFractionDenominatorLimit();
        var supportDenominatorRaw = finiteSupportValue(target.denominator, 8, ownsSupportValue('denominator'));
        var supportDenominator = Number.isInteger(supportDenominatorRaw) && supportDenominatorRaw >= 2
          ? Math.min(supportFractionLimit, supportDenominatorRaw)
          : Math.min(8, supportFractionLimit);
        var supportNumeratorRaw = finiteSupportValue(target.numerator, 0, ownsSupportValue('numerator'));
        var supportFraction = {
          numerator: Math.max(0, Math.min(supportDenominator, Math.floor(supportNumeratorRaw))),
          denominator: supportDenominator
        };
        applySupportState = () => setFractionPieces(supportFraction);
      } else if (tool === 'volume') {
        var rawSupportDims = target.dims;
        if (rawSupportDims != null && _mathPlainRecord(rawSupportDims) !== rawSupportDims) {
          throw new Error('invalid volume dimensions');
        }
        var supportDims = _mathSafeShallowCopy(rawSupportDims);
        var normalizedSupportDims = {
          l: finiteSupportValue(supportDims.l, 1, Object.prototype.hasOwnProperty.call(supportDims, 'l')),
          w: finiteSupportValue(supportDims.w, 1, Object.prototype.hasOwnProperty.call(supportDims, 'w')),
          h: finiteSupportValue(supportDims.h, 1, Object.prototype.hasOwnProperty.call(supportDims, 'h'))
        };
        applySupportState = () => setCubeDims(normalizedSupportDims);
      } else if (tool === 'protractor') {
        var supportAngle = finiteSupportValue(target.angle, 0, ownsSupportValue('angle'));
        applySupportState = () => setAngleValue(supportAngle);
      } else {
        var seeded = { ...target };
        if (tool === 'wave') {
          if (Object.prototype.hasOwnProperty.call(target, 'wave2')) seeded.showSecond = target.wave2;
          if (Object.prototype.hasOwnProperty.call(target, 'amp2')) seeded.amplitude2 = target.amp2;
          if (Object.prototype.hasOwnProperty.call(target, 'freq2')) seeded.frequency2 = target.freq2;
        } else if (tool === 'cell') {
          seeded.mode = 'interior';
          if (typeof target.type === 'string') seeded.interiorCellType = target.type;
          if (typeof target.selectedOrganelle === 'string') seeded.interiorSel = target.selectedOrganelle;
        }
        applySupportState = () => setLabToolData(previous => {
          var next = { ..._mathPlainRecord(previous) };
          if (tool === 'circuit') next._circuit = seeded;
          else next[tool] = seeded;
          return next;
        });
      }
      activeManipulativeSessionRef.current = null;
      applySupportState();
      setStemLabTool(tool);
      setShowStemLab(true);
      setStemLabTab('explore');
    } catch (_) {
      activeManipulativeSessionRef.current = null;
      addToast('This visual support contains invalid data and could not be opened safely.', 'error');
    }
  };
  var openMathManipulativeResponse = problem => {
    var response = problem.manipulativeResponse;
    var availability = getMathManipulativeResponseAvailability(problem);
    if (!response || availability.available !== true) {
      addToast(_mathManipulativeFallbackMessage(availability), 'error');
      return;
    }
    var tool = response.tool;
    var target = _mathPlainRecord(response.state);
    var baseline = _mathManipulativeActualState(tool, currentManipulativeSnapshot());
    var resetAvailable = true;
    if (problem.manipulativeResponse.tool === 'coordinate') {
      resetAvailable = canSetGridPoints;
      setGridPoints([]);
    } else if (problem.manipulativeResponse.tool === 'base10') {
      resetAvailable = canSetBase10Value;
      setBase10Value({ ones: 0, tens: 0, hundreds: 0, thousands: 0 });
    } else if (problem.manipulativeResponse.tool === 'numberline') {
      resetAvailable = canSetNumberLineMarkers;
      setNumberLineMarkers([]);
      if (_mathPlainRecord(target.range) === target.range) {
        setNumberLineRange({ min: target.range.min, max: target.range.max });
      }
    } else if (problem.manipulativeResponse.tool === 'fractions') {
      var fractionLimit = _mathFractionDenominatorLimit();
      var denominator = Number(target.denominator);
      setFractionPieces({
        numerator: 0,
        denominator: Number.isInteger(denominator) && denominator >= 2
          ? Math.min(fractionLimit, denominator)
          : Math.min(8, fractionLimit)
      });
      resetAvailable = canSetFractionPieces;
    } else if (problem.manipulativeResponse.tool === 'volume') {
      setCubeDims({ l: 1, w: 1, h: 1 });
      resetAvailable = canSetCubeDims;
    } else if (problem.manipulativeResponse.tool === 'protractor') {
      setAngleValue(0);
      resetAvailable = canSetAngleValue;
    } else {
      resetAvailable = canSetLabToolData;
      setLabToolData(previous => {
        var next = { ..._mathPlainRecord(previous) };
        delete next[tool];
        if (tool === 'circuit') delete next._circuit;
        return next;
      });
    }
    activeManipulativeSessionRef.current = {
      artifact: generatedContentArtifact,
      resourceId: mathResourceId,
      problemKey: problem.__viewKey,
      responseSource: response.__source,
      tool,
      baseline,
      requiresChange: !resetAvailable
    };
    setStemLabTool(tool);
    setShowStemLab(true);
    setStemLabTab('explore');
  };
  var checkMathManipulativeResponse = problem => {
    var response = problem.manipulativeResponse;
    var availability = getMathManipulativeResponseAvailability(problem);
    if (!response || availability.available !== true) {
      addToast(_mathManipulativeFallbackMessage(availability), 'error');
      return;
    }
    var tool = response.tool;
    var session = activeManipulativeSessionRef.current;
    if (!session
      || session.artifact !== generatedContentArtifact
      || session.resourceId !== mathResourceId
      || session.problemKey !== problem.__viewKey
      || session.responseSource !== response.__source
      || session.tool !== tool) {
      addToast('Open this problem’s manipulative before checking so its workspace can be prepared safely.', 'info');
      return;
    }
    var currentActual = _mathManipulativeActualState(tool, currentManipulativeSnapshot());
    if (session.requiresChange && currentActual === session.baseline) {
      addToast('Complete this problem’s manipulative before checking. Previous problem work is not reused.', 'info');
      return;
    }
    var evaluation;
    try {
      const manipulativeGrader = typeof window !== 'undefined' && window.AlloModules
        ? window.AlloModules.MathManipulativeGrader
        : null;
      if (manipulativeGrader && typeof manipulativeGrader.evaluateMathViewManipulativeResponse === 'function') {
        evaluation = manipulativeGrader.evaluateMathViewManipulativeResponse(response, currentManipulativeSnapshot());
      } else if (manipulativeGrader && typeof manipulativeGrader.gradeMathViewManipulativeResponse === 'function') {
        var supported = !Array.isArray(manipulativeGrader.supportedTools) || manipulativeGrader.supportedTools.includes(tool);
        var correct = supported && manipulativeGrader.gradeMathViewManipulativeResponse(response, currentManipulativeSnapshot());
        evaluation = { correct, supported, reason: supported ? (correct ? 'match' : 'mismatch') : 'unsupported-tool', tool };
      } else {
        evaluation = { correct: false, supported: false, reason: 'unsupported-tool', tool };
      }
    } catch (_) {
      evaluation = { correct: false, supported: true, reason: 'invalid-state', tool };
    }
    var diagnostic = _mathManipulativeDiagnostic(evaluation);
    if (diagnostic.response) handleStudentInput(mathResourceId, problem.__viewKey, diagnostic.response);
    addToast(diagnostic.message, diagnostic.tone);
  };
  var renderMathManipulativeResponse = problem => {
    var response = problem.manipulativeResponse;
    if (!response || getMathManipulativeResponseAvailability(problem).available !== true) return null;
    return (
      <div
        data-math-manipulative-response={response.tool}
        className="bg-emerald-50 bg-opacity-50 p-4 rounded-xl border border-emerald-200"
      >
        <p className="text-sm text-emerald-800 font-bold mb-3 flex items-center gap-2">
          🧩 Solve this problem using the {response.tool} manipulative instead of typing.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canOpenStemLab}
            onClick={() => openMathManipulativeResponse(problem)}
            className="min-h-[44px] px-4 py-2 bg-white text-emerald-700 font-bold rounded-lg border border-emerald-300 hover:bg-emerald-100 transition-all text-sm shadow-sm flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Open {response.tool}
          </button>
          <button
            type="button"
            disabled={!canHandleStudentInput}
            onClick={() => checkMathManipulativeResponse(problem)}
            className="min-h-[44px] px-4 py-2 bg-emerald-700 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Check My Manipulative
          </button>
        </div>
        {typeof resourceStudentResponses[problem.__viewKey] === 'string' && resourceStudentResponses[problem.__viewKey] && (
          <div role="status" aria-live="polite" className={`mt-3 text-sm font-bold ${resourceStudentResponses[problem.__viewKey].startsWith('(Manipulative: CORRECT') ? 'text-green-600' : 'text-red-600'}`}>
            {resourceStudentResponses[problem.__viewKey]}
          </div>
        )}
      </div>
    );
  };
  return (
                    <div className="min-w-0 space-y-6 max-w-4xl mx-auto h-full overflow-y-auto pr-2 pb-10" data-help-key="math_panel">
                        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{mathAsyncStatus}</div>
                        <div className="bg-indigo-50 p-4 sm:p-6 rounded-xl border border-indigo-100 shadow-sm">
                            <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                                <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">
                                    {mathMeta ? mathMeta.split(' - ')[0] : mathSubject}
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {isTeacherMode && !mathSelfGradeMode && (
                                        <button
                                            type="button"
                                            aria-label={showMathAnswers ? t('math.display.hide_answers') : t('math.display.reveal_answers')}
                                            aria-pressed={showMathAnswers}
                                            onClick={handleToggleShowMathAnswers}
                                            disabled={!canToggleShowMathAnswers}
                                            className={`flex min-h-[44px] items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${showMathAnswers ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'}`}
                                            data-help-key="math_toggle_answers"
                                        >
                                            {showMathAnswers ? <EyeOff size={14}/> : <Eye size={14}/>}
                                            {showMathAnswers ? t('math.display.hide_answers') : t('math.display.reveal_answers')}
                                        </button>
                                    )}
                                    <button type="button" onClick={handleToggleMathSelfGrade}
                                        aria-pressed={mathSelfGradeMode}
                                        disabled={!canToggleMathSelfGrade}
                                        className={`flex min-h-[44px] items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${mathSelfGradeMode ? 'bg-emerald-700 text-white shadow-md' : 'bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-50'}`}>
                                        ✏️ {mathSelfGradeMode ? t('math.exit_self_grade') : t('math.self_grade')}
                                    </button>
                                    {mathSelfGradeMode && (
                                        <button type="button" onClick={() => submitMathSelfGrade(mathResourceId, mathProblems)}
                                            aria-describedby={selfGradeHelpId}
                                            disabled={!canSubmitMathSelfGrade || !hasAllSelfGradeAnswers}
                                            className="flex min-h-[44px] items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md hover:from-emerald-600 hover:to-teal-600 transition-all disabled:cursor-not-allowed disabled:opacity-50">
                                            📊 Submit Assessment
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        aria-label={t('common.copy')}
                                        disabled={!canCopyToClipboard}
                                        onClick={() => {
                                            const includeAnswers = isTeacherMode && showMathAnswers;
                                            const text = mathProblems.map((p, i) => {
                                                const answer = includeAnswers && p.answer != null ? `\nAnswer: ${p.answer}` : '';
                                                return `${i + 1}. ${formatMathQuestion(p)}${answer}`;
                                            }).join('\n\n');
                                            copyToClipboard(text);
                                        }}
                                        className="min-h-[44px] min-w-[44px] text-indigo-600 hover:text-indigo-600 p-1.5 rounded-md hover:bg-indigo-100 transition-colors"
                                        title={t('math.display.copy_all')}
                                    >
                                        <Copy size={14}/>
                                    </button>
                                </div>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-indigo-900 font-serif leading-tight">
                                {mathTitle || 'Math Practice'}
                            </h2>
                            {mathSelfGradeMode && (
                                <p id={selfGradeHelpId} className="mt-2 text-sm font-medium text-emerald-800">
                                    {hasAllSelfGradeAnswers
                                        ? `All ${mathProblems.length} problems are answered. Review your responses, then submit.`
                                        : `Answered ${answeredSelfGradeCount} of ${mathProblems.length}. Answer every problem to enable Submit Assessment.`}
                                </p>
                            )}
                        </div>
                        {graphHtml && (
                            <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-400 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                                <h4 className="text-xs font-black text-purple-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <ImageIcon size={14}/> {t('math.display.visual_header')}
                                </h4>
                                <div
                                    className="w-full h-auto flex justify-center bg-slate-50 rounded-lg border border-slate-100 p-4 overflow-x-auto svg-container"
                                    role="img"
                                    aria-label={mathGraphAlt || 'Visual diagram for this problem'}
                                    dangerouslySetInnerHTML={{ __html: graphHtml }}
                                    data-help-key="math_graph"
                                />
                            </div>
                        )}
                        {mathProblems.map((problem, pIdx) => (
                            <section key={problem.__viewKey} aria-label={`Problem ${pIdx + 1}`} className="space-y-4 border-b border-slate-100 pb-8 last:border-0" data-help-key="math_problem">
                                <div className={`bg-white p-4 rounded-xl border shadow-sm flex flex-wrap sm:flex-nowrap gap-4 items-start ${isMathEditing(pIdx, problem.__viewKey, mathResourceId) ? 'border-amber-300 ring-2 ring-amber-100' : 'border-indigo-100'}`}>
                                    <div aria-hidden="true" className="bg-indigo-600 text-white font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm mt-0.5 shadow-sm">
                                        {pIdx + 1}
                                    </div>
                                    <div className="min-w-0 flex-grow">
                                        {isMathEditing(pIdx, problem.__viewKey, mathResourceId) ? (
                                            <>
                                            <textarea
                                                autoFocus
                                                aria-label={t('math.edit_problem_question') || `Edit math problem ${pIdx + 1}`}
                                                aria-describedby={`math-edit-hint-${_mathStableHash(mathResourceId + '|' + problem.__viewKey)}`}
                                                className="w-full p-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none resize-y bg-amber-50/50 font-serif text-lg leading-relaxed text-slate-800 min-h-[60px]"
                                                value={problem.question || problem.problem || ''}
                                                onChange={(e) => handleMathProblemEdit(pIdx, 'question', e.target.value, null, problem.__viewKey, mathResourceId)}
                                                disabled={!canHandleMathProblemEdit}
                                                onKeyDown={(event) => {
                                                    if (event.key !== 'Enter' || (!event.ctrlKey && !event.metaKey) || !canToggleMathEdit) return;
                                                    event.preventDefault();
                                                    toggleMathEdit(pIdx, problem.__viewKey, mathResourceId);
                                                    if (typeof window !== 'undefined') window.setTimeout(() => {
                                                        if (typeof document !== 'undefined') document.getElementById(mathEditButtonId(problem.__viewKey))?.focus();
                                                    }, 0);
                                                }}
                                                placeholder={t('common.placeholder_enter_problem_question')}
                                            />
                                            {mathKeyboardButton(() => openAccessibleMathInput({
                                                title: `Add math to problem ${pIdx + 1}`,
                                                contextKey: mathAccessibleContextKey('problem-question', problem.__viewKey),
                                                onInsert: (result, currentValue) => handleMathProblemEdit(
                                                    pIdx,
                                                    'question',
                                                    appendInlineMath(currentValue, result.latex),
                                                    null,
                                                    problem.__viewKey,
                                                    mathResourceId
                                                )
                                            }), 'Open accessible math keyboard for this problem', !canHandleMathProblemEdit)}
                                            <p id={`math-edit-hint-${_mathStableHash(mathResourceId + '|' + problem.__viewKey)}`} className="mt-1 text-xs text-slate-600">
                                                Press Ctrl+Enter or Command+Enter to finish editing.
                                            </p>
                                            </>
                                        ) : (
                                            <h3 className="text-lg font-medium text-slate-800 font-serif">
                                                <span className="sr-only">{`Problem ${pIdx + 1}: `}</span>
                                                {formatInlineText(formatMathQuestion(problem), false)}
                                            </h3>
                                        )}
                                        {problem._verification && <span style={{ fontSize: "11px", marginLeft: "6px", opacity: 0.8 }} title={problem._verification.verified ? "Answer computationally verified" : problem._verification.autoCorrected ? "Answer auto-corrected by evaluator" : ""}>{problem._verification.verified ? "✅" : problem._verification.autoCorrected ? "🔧" : problem._verification.edited ? "✏️" : ""}</span>}
                                    </div>
                                    {isTeacherMode && !mathSelfGradeMode && (
                                        <button
                                            id={mathEditButtonId(problem.__viewKey)}
                                            type="button"
                                            aria-label={isMathEditing(pIdx, problem.__viewKey, mathResourceId) ? "Save edits" : "Edit problem"}
                                            onClick={() => toggleMathEdit(pIdx, problem.__viewKey, mathResourceId)}
                                            disabled={!canToggleMathEdit}
                                            className={`min-h-[44px] min-w-[44px] shrink-0 p-1.5 rounded-lg transition-all disabled:cursor-not-allowed disabled:opacity-50 ${isMathEditing(pIdx, problem.__viewKey, mathResourceId) ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'text-slate-600 hover:text-amber-600 hover:bg-amber-50'}`}
                                            title={isMathEditing(pIdx, problem.__viewKey, mathResourceId) ? "Done editing" : "Edit this problem"}
                                        >
                                            {isMathEditing(pIdx, problem.__viewKey, mathResourceId) ? <CheckCircle2 size={16} /> : <Pencil size={14} />}
                                        </button>
                                    )}
                                </div>
                                {problem.manipulativeResponse && getMathManipulativeResponseAvailability(problem).available !== true && (
                                    <div
                                        role="alert"
                                        data-math-manipulative-error={getMathManipulativeResponseAvailability(problem).reason}
                                        className="ml-0 sm:ml-12 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800"
                                    >
                                        {_mathManipulativeFallbackMessage(getMathManipulativeResponseAvailability(problem))}
                                    </div>
                                )}
                                {mathSelfGradeMode ? (
                                    <div className="ml-0 sm:ml-12 mt-4 space-y-2">
                                        <label htmlFor={mathSelfAnswerInputId(problem.__viewKey)} className="block text-sm font-bold text-emerald-800">
                                            {'Your answer for problem ' + (pIdx + 1)}
                                        </label>
                                        <input
                                            id={mathSelfAnswerInputId(problem.__viewKey)}
                                            type="text"
                                            value={_mathScalarText(mathStudentAnswers[problem.__viewKey])}
                                            onChange={(event) => setMathStudentAnswers(previous => ({ ..._mathPlainRecord(previous), [problem.__viewKey]: event.target.value }))}
                                            disabled={!canSetMathStudentAnswers}
                                            className="w-full min-h-[44px] rounded-xl border border-emerald-300 bg-white px-3 py-2 text-lg font-serif text-slate-800 outline-none focus:ring-2 focus:ring-emerald-300"
                                            autoComplete="off"
                                        />
                                        {mathKeyboardButton(() => openAccessibleMathInput({
                                            title: `Enter answer for problem ${pIdx + 1}`,
                                            contextKey: mathAccessibleContextKey('self-answer', problem.__viewKey),
                                            onInsert: (result, currentValue, isContextCurrent) => setMathStudentAnswers(previous => (
                                                isContextCurrent() ? {
                                                    ..._mathPlainRecord(previous),
                                                    [problem.__viewKey]: appendInlineMath(currentValue, result.latex)
                                                } : previous
                                            ))
                                        }), `Open accessible math keyboard for answer ${pIdx + 1}`, !canSetMathStudentAnswers)}
                                    </div>
                                ) : isTeacherMode ? (
                                    <>
                                    {isIndependentMode && (
                                        <div className="ml-0 sm:ml-12 mt-4 mb-4 space-y-3">
                                            {problem.manipulativeSupport && (() => {
                                               // Inline accessible diagram (step 2): show the parametric scaffold inline +
                                               // screen-readable for supported types; the Open-in-Lab button below stays for full editing.
                                               var _suppSvg = _renderDiagramSvg(problem.manipulativeSupport.tool, problem.manipulativeSupport.state, mathTitle);
                                               return _suppSvg ? (<div className="mb-2 flex justify-center bg-slate-50 rounded-lg border border-slate-100 p-3 overflow-x-auto" dangerouslySetInnerHTML={{ __html: _suppSvg }} />) : null;
                                            })()}
                                            {problem.manipulativeSupport && (
                                               <button type="button" disabled={!canOpenStemLab} onClick={() => openMathManipulativeSupport(problem)} className="flex min-h-[44px] items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-600 hover:bg-blue-100 transition-all text-sm mb-2 disabled:cursor-not-allowed disabled:opacity-50">
                                                   <span className="text-lg">📂</span> Open Visual Support ({problem.manipulativeSupport.tool})
                                               </button>
                                            )}
                                            {getMathManipulativeResponseAvailability(problem).available === true ? (
                                                renderMathManipulativeResponse(problem)
                                            ) : (
                                                <div className="relative">
                                                    <div className="absolute top-3 left-3 text-slate-600">
                                                        <Pencil size={16} />
                                                    </div>
                                                    <textarea
                                                        id={mathResponseInputId(problem.__viewKey)}
                                                        aria-label={t('math.display.student_work') || `Show your work for problem ${pIdx + 1}`}
                                                        className="w-full p-3 pl-10 border border-slate-400 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none resize-y bg-slate-50/50 focus:bg-white transition-all font-serif text-lg leading-relaxed text-slate-700 placeholder:text-slate-600 min-h-[120px]"
                                                        placeholder={t('math.display.placeholder_work')}
                                                        value={_mathScalarText(resourceStudentResponses[problem.__viewKey])}
                                                        onChange={(e) => handleStudentInput(mathResourceId, problem.__viewKey, e.target.value)}
                                                        disabled={!canHandleStudentInput}
                                                        data-help-key="math_student_work"
                                                    />
                                                    {mathKeyboardButton(() => openAccessibleMathInput({
                                                        title: `Add math to work for problem ${pIdx + 1}`,
                                                        contextKey: mathAccessibleContextKey('teacher-work', problem.__viewKey),
                                                        onInsert: (result, currentValue) => {
                                                            const responseInput = typeof document !== 'undefined'
                                                                ? document.getElementById(mathResponseInputId(problem.__viewKey))
                                                                : null;
                                                            if (!responseInput || responseInput.disabled) return;
                                                            handleStudentInput(
                                                                mathResourceId,
                                                                problem.__viewKey,
                                                                appendInlineMath(currentValue, result.latex)
                                                            );
                                                        }
                                                    }), `Open accessible math keyboard for work on problem ${pIdx + 1}`, !canHandleStudentInput)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {showMathAnswers ? (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                            {problem.steps && problem.steps.length > 0 && (
                                            <div className="ml-0 sm:ml-4 pl-4 border-l-2 border-slate-200 space-y-4 mt-4">
                                                {problem.steps.map((step, idx) => (
                                                    <div key={idx} className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                                        <div className="flex items-start gap-3">
                                                            <div className="text-xs font-bold text-slate-600 uppercase tracking-widest mt-1">{t('math.display.step_label')} {idx + 1}</div>
                                                            <div className="min-w-0 flex-grow w-full overflow-x-auto">
                                                                {isMathEditing(pIdx, problem.__viewKey, mathResourceId) ? (
                                                                    <div className="space-y-2">
                                                                        <textarea
                                                                            aria-label={t('math.edit_step_explanation') || `Edit step ${idx + 1} explanation`}
                                                                            className="w-full p-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none resize-y bg-amber-50/50 text-sm text-slate-700 min-h-[40px]"
                                                                            value={step.explanation || ''}
                                                                            onChange={(e) => handleMathProblemEdit(pIdx, 'step_explanation', e.target.value, idx, problem.__viewKey, mathResourceId)}
                                                                            disabled={!canHandleMathProblemEdit}
                                                                            placeholder={t('common.placeholder_step_explanation')}
                                                                        />
                                                                        <input
                                                                            aria-label={t('math.edit_step_latex') || `Edit step ${idx + 1} LaTeX expression`}
                                                                            type="text"
                                                                            className="w-full p-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none bg-amber-50/50 text-sm font-mono text-slate-600"
                                                                            value={step.latex || ''}
                                                                            onChange={(e) => handleMathProblemEdit(pIdx, 'step_latex', e.target.value, idx, problem.__viewKey, mathResourceId)}
                                                                            disabled={!canHandleMathProblemEdit}
                                                                            placeholder={t('common.placeholder_latex_expression_optional')}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                <div className="text-slate-700 mb-2 leading-relaxed font-medium text-sm">
                                                                    {formatInlineText(step.explanation, false)}
                                                                </div>
                                                                {step.latex && (
                                                                    <div className="bg-slate-50 p-3 rounded text-center border border-slate-100 overflow-x-auto flex justify-center">
                                                                        <span className="text-lg font-serif text-slate-800 inline-block">
                                                                            <MathSymbol text={step.latex} />
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            )}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-0 sm:ml-4 mt-4">
                                                <div className="bg-green-50 p-4 rounded-xl border border-green-200 shadow-sm">
                                                    <h4 className="text-xs font-black text-green-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                        <CheckCircle2 size={14}/> {t('math.display.answer_header')}
                                                    </h4>
                                                     {isMathEditing(pIdx, problem.__viewKey, mathResourceId) ? (
                                                         <input
                                                             type="text"
                                                             className="w-full p-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none bg-amber-50/50 font-serif text-lg font-bold text-green-900"
                                                             aria-label={t('math.edit_answer') || `Edit answer for problem ${pIdx + 1}`}
                                                             value={problem.answer || ''}
                                                             onChange={(e) => handleMathProblemEdit(pIdx, 'answer', e.target.value, null, problem.__viewKey, mathResourceId)}
                                                             disabled={!canHandleMathProblemEdit}
                                                             placeholder={t('common.placeholder_enter_answer')}
                                                         />
                                                     ) : (
                                                         <div className="text-lg font-bold text-green-900 font-serif">
                                                             <MathSymbol text={problem.answer} />
                                                         </div>
                                                     )}
                                                </div>
                                                {problem.realWorld && (
                                                <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 shadow-sm">
                                                    <h4 className="text-xs font-black text-orange-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                        <Globe size={14}/> {t('math.display.connection_header')}
                                                    </h4>
                                                     {isMathEditing(pIdx, problem.__viewKey, mathResourceId) ? (
                                                         <textarea
                                                             aria-label={t('math.edit_real_world') || 'Edit real-world connection'}
                                                             className="w-full p-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none resize-y bg-amber-50/50 text-sm text-orange-900 min-h-[40px]"
                                                             value={problem.realWorld || ''}
                                                             onChange={(e) => handleMathProblemEdit(pIdx, 'realWorld', e.target.value, null, problem.__viewKey, mathResourceId)}
                                                             disabled={!canHandleMathProblemEdit}
                                                             placeholder={t('common.placeholder_real_world_connection')}
                                                         />
                                                     ) : (
                                                    <p className="text-sm text-orange-900 leading-relaxed font-medium">
                                                        {problem.realWorld}
                                                    </p>
                                                     )}
                                                </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="ml-0 sm:ml-12 p-3 bg-slate-50 border border-slate-400 rounded-lg text-center text-sm text-slate-600 italic flex items-center justify-center gap-2 mt-4">
                                            {isIndependentMode ? (
                                                <button
                                                    type="button"
                                                    aria-label={t('common.show_math_answers')}
                                                    onClick={handleSetShowMathAnswersToTrue}
                                                    disabled={!canSetShowMathAnswers}
                                                    className="flex min-h-[44px] items-center gap-2 text-indigo-500 hover:text-indigo-700 font-bold transition-colors py-2 px-4 hover:bg-white rounded-lg disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <Eye size={16} /> {t('math.display.reveal_solution')}
                                                </button>
                                            ) : (
                                                <><EyeOff size={14} /> {t('math.display.answer_hidden')}</>
                                            )}
                                        </div>
                                    )}
                                    </>
                                ) : (
                                    <div className="ml-0 sm:ml-12 mt-4 space-y-3">
                                        {getMathManipulativeResponseAvailability(problem).available === true ? (
                                            renderMathManipulativeResponse(problem)
                                        ) : (
                                        <>
                                        <div className="relative">
                                            <div className="absolute top-3 left-3 text-slate-600">
                                                <Pencil size={16} />
                                            </div>
                                            <textarea
                                                id={mathResponseInputId(problem.__viewKey)}
                                                aria-label={t('math.display.student_work') || `Show your work for problem ${pIdx + 1}`}
                                                className="w-full p-3 pl-10 border border-slate-400 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none resize-y bg-slate-50/50 focus:bg-white transition-all font-serif text-lg leading-relaxed text-slate-700 placeholder:text-slate-600 min-h-[120px]"
                                                placeholder={t('math.display.placeholder_work') || 'Show your work here... Type your answer and explain your thinking.'}
                                                value={_mathScalarText(resourceStudentResponses[problem.__viewKey])}
                                                onChange={(e) => handleStudentInput(mathResourceId, problem.__viewKey, e.target.value)}
                                                disabled={!canHandleStudentInput || isMathResponseLocked(problem.__viewKey)}
                                            />
                                            {mathKeyboardButton(() => openAccessibleMathInput({
                                                title: `Add math to work for problem ${pIdx + 1}`,
                                                contextKey: mathAccessibleContextKey('student-work', problem.__viewKey),
                                                onInsert: (result, currentValue) => {
                                                    const responseInput = typeof document !== 'undefined'
                                                        ? document.getElementById(mathResponseInputId(problem.__viewKey))
                                                        : null;
                                                    if (!responseInput || responseInput.disabled) return;
                                                    handleStudentInput(
                                                        mathResourceId,
                                                        problem.__viewKey,
                                                        appendInlineMath(currentValue, result.latex)
                                                    );
                                                }
                                            }), `Open accessible math keyboard for work on problem ${pIdx + 1}`, !canHandleStudentInput || isMathResponseLocked(problem.__viewKey))}
                                        </div>
                                        {(() => {
                                            const checkResult = getMathCheckResult(problem.__viewKey);
                                            const studentWork = _mathScalarText(resourceStudentResponses[problem.__viewKey]);
                                            return (
                                                <>
                                                    {!checkResult?.checked && (
                                                        <button
                                                            type="button"
                                                            aria-busy={checkResult?.checking === true}
                                                            onClick={() => handleCheckMathWork(
                                                                mathResourceId, problem.__viewKey,
                                                                problem.question || problem.problem,
                                                                problem.answer,
                                                                problem.steps,
                                                                studentWork
                                                            )}
                                                            disabled={!canHandleCheckMathWork || !studentWork.trim() || checkResult?.checking === true}
                                                            className="flex min-h-[44px] items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 hover:shadow-md active:scale-[0.98]"
                                                            data-help-key="math_check_work"
                                                        >
                                                            {checkResult?.checking ? (
                                                                <><RefreshCw size={16} className="animate-spin motion-reduce:animate-none" /> {t('math.check.checking') || 'Evaluating your work...'}</>
                                                            ) : (
                                                                <><Sparkles size={16} /> {t('math.check.button') || 'Check My Work'}</>
                                                            )}
                                                        </button>
                                                    )}
{/* 💡 Hint System */ }
{
    !checkResult?.checked && (() => {
        const hintInfo = getMathHintState(problem.__viewKey);
        return (
            <div className="space-y-2" aria-live="polite">
                {hintInfo.hints.map((hint, hIdx) => (
                    <div key={hIdx} className="flex gap-2 items-start p-3 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 animate-in fade-in slide-in-from-top-1 duration-200">
                        <span className="text-lg flex-shrink-0">{hIdx === 0 ? '💡' : hIdx === 1 ? '🔦' : '🔍'}</span>
                        <div className="flex-1">
                            <span className="text-[11px] font-black text-amber-600 uppercase tracking-widest">Hint {hIdx + 1} of 3</span>
                            <p className="text-sm text-amber-900 font-medium leading-relaxed mt-0.5">{hint}</p>
                        </div>
                    </div>
                ))}
                {hintInfo.count < 3 && (
                    <button
                        type="button"
                        aria-busy={hintInfo.loading}
                        onClick={() => handleGetMathHint(mathResourceId, problem.__viewKey, problem.question || problem.problem, problem.answer, problem.steps)}
                        disabled={!canHandleGetMathHint || hintInfo.loading}
                        className="flex min-h-[44px] items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all border-2 border-dashed border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                        {hintInfo.loading ? (
                            <><RefreshCw size={14} className="animate-spin motion-reduce:animate-none" /> Thinking...</>
                        ) : (
                            <><span className="text-sm">💡</span> {hintInfo.count === 0 ? 'Give me a hint (-25% XP)' : hintInfo.count === 1 ? 'Another hint (-50% XP)' : 'Final hint (-75% XP)'}</>
                        )}
                    </button>
                )}
            </div>
        );
    })()
}
                                                    {checkResult?.checked && (
                                                        <div role="status" aria-live="polite" className={`rounded-xl border-2 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                                                            checkResult.verdict === 'correct' ? 'border-green-300 bg-green-50' :
                                                            checkResult.verdict === 'partial' ? 'border-amber-300 bg-amber-50' :
                                                            'border-red-300 bg-red-50'
                                                        }`}>
                                                            <div className={`px-4 py-3 flex flex-wrap items-center justify-between gap-2 ${
                                                                checkResult.verdict === 'correct' ? 'bg-green-100' :
                                                                checkResult.verdict === 'partial' ? 'bg-amber-100' :
                                                                'bg-red-100'
                                                            }`}>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xl">
                                                                        {checkResult.verdict === 'correct' ? '✅' : checkResult.verdict === 'partial' ? '🟡' : '❌'}
                                                                    </span>
                                                                    <span className={`font-black text-sm uppercase tracking-wider ${
                                                                        checkResult.verdict === 'correct' ? 'text-green-700' :
                                                                        checkResult.verdict === 'partial' ? 'text-amber-700' :
                                                                        'text-red-700'
                                                                    }`}>
                                                                        {checkResult.verdict === 'correct' ? (t('math.check.verdict_correct') || 'Correct!')
                                                                         : checkResult.verdict === 'partial' ? (t('math.check.verdict_partial') || 'Partially Correct')
                                                                         : (t('math.check.verdict_incorrect') || 'Not Quite Right')}
                                                                    </span>
                                                                </div>
                                                                <div className={`px-3 py-1 rounded-full text-xs font-black ${
                                                                    checkResult.score >= 80 ? 'bg-green-200 text-green-800' :
                                                                    checkResult.score >= 40 ? 'bg-amber-200 text-amber-800' :
                                                                    'bg-red-200 text-red-800'
                                                                }`}>
                                                                    {checkResult.score}%
                                                                    {checkResult.hintsUsed > 0 ? ` · -${checkResult.hintsUsed} hint${checkResult.hintsUsed > 1 ? 's' : ''}` : ''}
                                                                    {checkResult.xpEarned > 0 ? ` · +${checkResult.xpEarned} XP` : ''}
                                                                </div>
                                                            </div>
                                                            <div className="px-4 py-3">
                                                                <p className={`text-sm leading-relaxed font-medium ${
                                                                    checkResult.verdict === 'correct' ? 'text-green-800' :
                                                                    checkResult.verdict === 'partial' ? 'text-amber-800' :
                                                                    'text-red-800'
                                                                }`}>
                                                                    {checkResult.feedback}
                                                                </p>
                                                            </div>
                                                            <div className="px-4 pb-3 flex justify-end">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleResetMathCheck(mathResourceId, problem.__viewKey)}
                                                                    disabled={!canHandleResetMathCheck}
                                                                    className={`flex min-h-[44px] items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                                                        checkResult.verdict === 'correct'
                                                                            ? 'text-green-600 hover:bg-green-100'
                                                                            : 'text-indigo-600 hover:bg-indigo-100'
                                                                    }`}
                                                                >
                                                                    <RefreshCw size={12} />
                                                                    {checkResult.verdict === 'correct'
                                                                        ? (t('math.check.try_another') || 'Revise Answer')
                                                                        : (t('math.check.try_again') || 'Try Again')
                                                                    }
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {checkResult?.checked && problem.steps && problem.steps.length > 0 && (
                                                        <details className="mt-3 group">
                                                            <summary className="flex min-h-[44px] items-center gap-2 cursor-pointer select-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 hover:from-blue-100 hover:to-indigo-100 transition-all">
                                                                <span className="text-sm">📖</span>
                                                                <span className="text-xs font-bold text-blue-700">{t('math.show_solution_steps') || 'Show Solution Steps'}</span>
                                                                <ChevronDown size={14} className="text-blue-700 ml-auto group-open:rotate-180 transition-transform" />
                                                            </summary>
                                                            <div className="mt-2 space-y-2 pl-2 border-l-3 border-blue-200">
                                                                {problem.steps.map((step, sIdx) => (
                                                                    <div key={sIdx} className="flex gap-3 items-start p-3 bg-white rounded-lg border border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200" style={{ animationDelay: `${sIdx * 80}ms` }}>
                                                                        <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-black shadow-sm">
                                                                            {sIdx + 1}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm text-slate-700 font-medium leading-relaxed">{step.explanation}</p>
                                                                            {step.latex && (
                                                                                <div className="mt-1.5 px-3 py-1.5 bg-slate-50 rounded-md border border-slate-400 text-xs text-indigo-700 overflow-x-auto">
                                                                                    <MathSymbol text={step.latex} />
                                                                                </div>
                                                                            )}
                                                                            {step.expression && !step.latex && (
                                                                                <div className="mt-1.5 max-w-full overflow-x-auto px-3 py-1.5 bg-slate-50 rounded-md border border-slate-400 font-mono text-xs text-indigo-700">
                                                                                    <MathSymbol text={step.expression} />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {problem.answer && (
                                                                    <div className="p-3 bg-green-50 rounded-lg border border-green-200 flex items-center gap-2">
                                                                        <span className="text-sm">✅</span>
                                                                        <span className="text-sm font-bold text-green-700">Answer: {problem.answer}</span>
                                                                        {(mathSubject === 'Geometry' || /volum|prism|cube|dimension|rectangular/i.test(problem.question || problem.title || '')) && (
                                                                            <button type="button" disabled={!canOpenCubeLab} onClick={() => { setShowStemLab(true); setStemLabTab('explore'); setStemLabTool('volume'); setCubeBuilderMode('freeform'); setCubePositions(new Set()); const vol = parseInt(String(problem.answer).replace(/[^\d]/g,'')); if (vol && vol > 0 && vol <= 100) { setCubeBuilderChallenge({type:'volume', answer: vol, shape:'any'}); setCubeBuilderFeedback(null); } }} className="ml-auto min-h-[44px] text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-600 rounded-full px-2.5 py-0.5 transition-all hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50">
                                                                                📦 Try with cubes
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </details>
                                                    )}
                                                </>
                                            );
                                        })()}
                                        </>
                                        )}
                                    </div>
                                )}
                            </section>
                        ))}
                        {mathProblems.length === 1 && (
                            <div className="mt-8 flex justify-center pb-4">
                                <button type="button" aria-label={t('common.generate_content')}
                                    onClick={handleGenerateSimilar}
                                    disabled={!canHandleGenerateSimilar || isProcessing} aria-busy={isProcessing}
                                    className="flex min-h-[44px] items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-full font-bold shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                                    data-help-key="math_generate_similar"
                                >
                                    {isProcessing ? <RefreshCw size={18} className="animate-spin motion-reduce:animate-none"/> : <RefreshCw size={18}/>}
                                    {t('math.display.generate_similar')}
                                </button>
                            </div>
                        )}
                        {isTeacherMode && mathProblems.length > 0 && (
                            <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm">✏️</span>
                                    <span className="text-xs font-bold text-indigo-700">{t('math.edit_with_allobot')}</span>
                                    <span className="text-[11px] text-indigo-400 font-medium">{t('math.edit_helper')}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <input
                                        type="text"
                                        value={mathEditInput}
                                        onChange={(e) => setMathEditInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key !== "Enter" || !mathEditInput.trim() || isMathEditingChat || isProcessing || !canHandleMathEdit) return;
                                            e.preventDefault();
                                            handleMathEdit(mathEditInput, mathResourceId);
                                        }}
                                        placeholder="e.g. Make these easier, add 2 more division problems, change to a space theme..."
                                        className="flex-1 px-3 py-2 text-sm border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none bg-white placeholder-slate-400"
                                        aria-label={t("a11y.edit_math_problems")}
                                        aria-busy={isMathEditingChat || isProcessing}
                                        disabled={!canSetMathEditInput || isMathEditingChat || isProcessing}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleMathEdit(mathEditInput, mathResourceId)}
                                        aria-busy={isMathEditingChat || isProcessing}
                                        disabled={!canHandleMathEdit || !mathEditInput.trim() || isMathEditingChat || isProcessing}
                                        className="min-h-[44px] px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-sm rounded-lg hover:from-indigo-600 hover:to-purple-600 disabled:opacity-40 transition-all flex items-center gap-2 shadow-md"
                                    >
                                        {isMathEditingChat ? <><RefreshCw size={14} className="animate-spin motion-reduce:animate-none" /> Editing...</> : "✏️ Apply"}
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {["Make easier", "Make harder", "Add word problems", "Add more problems", "Change theme", "Simplify steps"].map(suggestion => (
                                        <button key={suggestion} type="button"
                                            onClick={() => { setMathEditInput(suggestion); handleMathEdit(suggestion, mathResourceId); }}
                                            disabled={!canSetMathEditInput || !canHandleMathEdit || isMathEditingChat || isProcessing}
                                            className="min-h-[44px] px-2 py-1 text-[11px] font-bold text-indigo-600 bg-white border border-indigo-600 rounded-full hover:bg-indigo-100 transition-all disabled:opacity-40"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
  );
}
