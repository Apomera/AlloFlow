// generation_helpers_source.jsx - Phase H.2 of CDN modularization.
// handleGenerateMath + handleGenerateFullPack + handleComplexityAdjustment
// extracted from AlloFlowANTI.txt 2026-04-25.
const FULL_PACK_FALLBACK_TYPES = new Set([
  'analysis', 'simplified', 'glossary', 'image', 'outline', 'sentence-frames',
  'faq', 'timeline', 'persona', 'concept-sort', 'brainstorm', 'quiz',
  'lesson-plan', 'adventure', 'dbq', 'note-taking', 'anchor-chart',
  'alignment-report', 'math', 'gemini-bridge'
]);
const getFullPackKnownTypes = () => {
  try {
    const catalog = typeof window !== 'undefined' && Array.isArray(window.TOOL_CATALOG)
      ? window.TOOL_CATALOG.map(item => item && (item.id || item.type)).filter(Boolean)
      : [];
    return new Set(catalog.length ? catalog : Array.from(FULL_PACK_FALLBACK_TYPES));
  } catch (_) { return new Set(Array.from(FULL_PACK_FALLBACK_TYPES)); }
};
const isUsableGeneratedResource = (item, expectedType) => {
  if (!item || typeof item !== 'object') return false;
  if (expectedType && item.type && item.type !== expectedType) return false;
  if (item.data === null || item.data === undefined) return false;
  if (typeof item.data === 'string' && !item.data.trim()) return false;
  if (Array.isArray(item.data) && item.data.length === 0) return false;
  return true;
};
let _fullPackAbortCtl = null;
let _fullPackRunInFlight = false;
const handleStopFullPack = () => {
  try { if (_fullPackAbortCtl) _fullPackAbortCtl.abort(); } catch (_) {}
  return !!_fullPackAbortCtl;
};

const _isFullPackAbort = (error, signal) => !!(
  (signal && signal.aborted)
  || (error && error.name === 'AbortError')
  || (error && /abort(?:ed|error)/i.test(String(error.message || '')))
);

const _fullPackFingerprint = (value) => {
  const text = String(value || '');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return 'fp-' + (hash >>> 0).toString(36) + '-' + text.length;
};
const _fullPackRosterSignature = (roster) => JSON.stringify(Object.entries(roster && roster.groups || {})
  .sort(([a], [b]) => String(a).localeCompare(String(b)))
  .map(([id, group]) => {
    const profile = group && group.profile || {};
    return {
      id,
      name: group && group.name || id,
      gradeLevel: profile.gradeLevel || '',
      leveledTextLanguage: profile.leveledTextLanguage || '',
      studentInterests: Array.isArray(profile.studentInterests) ? profile.studentInterests : String(profile.studentInterests || ''),
      dokLevel: profile.dokLevel || '',
      selectedLanguages: Array.isArray(profile.selectedLanguages) ? profile.selectedLanguages : [],
      targetStandards: Array.isArray(profile.targetStandards) ? profile.targetStandards : [],
      useEmojis: profile.useEmojis,
      textFormat: profile.textFormat || '',
    };
  }));

const _compactFullPackBatchConfig = (config) => {
  const source = config && typeof config === 'object' ? config : {};
  const out = {};
  const nestedKeys = ['lessonDNA', 'globalSettings', 'glossaryConfig', 'quizConfig', 'outlineConfig', 'visualConfig', 'adventureConfig', 'brainstormConfig'];
  nestedKeys.forEach(key => {
    if (!source[key] || typeof source[key] !== 'object') return;
    try { out[key] = JSON.parse(JSON.stringify(source[key])); } catch (_) {}
  });
  Object.keys(source).forEach(key => {
    if (nestedKeys.includes(key) || ['resourcePlan', 'recommendedResources', 'toolDirectives'].includes(key)) return;
    const value = source[key];
    if (value == null || ['number', 'boolean'].includes(typeof value) || (typeof value === 'string' && value.length <= 4000)) out[key] = value;
  });
  return out;
};
const FULL_PACK_PLAN_SCHEMA_VERSION = 2;
const FULL_PACK_CAPABILITY_FINGERPRINT = 'full-pack-plan-v2';
const _fullPackFailurePolicy = (reason) => {
  const message = String(reason || '');
  if (/auth(?:entication|orization)?|api[ -]?key|forbidden|permission|unsupported|invalid (?:configuration|config)|not configured|unknown resource type|quota exhausted|insufficient quota|unusable|malformed|invalid output/i.test(message)) {
    return { category: 'configuration', retryable: false, delayMs: 0 };
  }
  if (/rate.?limit|429|temporar|timeout|timed out|network|fetch|connection|502|503|504|overload/i.test(message)) {
    return { category: 'transient', retryable: true, delayMs: 1500 };
  }
  return { category: 'unknown', retryable: true, delayMs: 800 };
};

const _waitForFullPackDelay = (delayMs, signal) => new Promise((resolve, reject) => {
  let timer = null;
  const cleanup = () => { if (signal) signal.removeEventListener('abort', onAbort); };
  const onAbort = () => {
    if (timer) clearTimeout(timer);
    cleanup();
    const error = new Error('Full Pack generation aborted');
    error.name = 'AbortError';
    reject(error);
  };
  if (signal && signal.aborted) return onAbort();
  if (signal) signal.addEventListener('abort', onAbort, { once: true });
  timer = setTimeout(() => { cleanup(); resolve(); }, Math.max(0, delayMs));
});

const handleGenerateMath = async (inputOverride = null, switchView = true, modeOverride = null, deps) => {
  const { mathInput, history, inputText, useMathSourceContext, studentInterests, gradeLevel, mathMode, mathSubject, mathQuantity, autoAttachManipulatives, leveledTextLanguage, isMathGraphEnabled, autoSnapshotManipulatives, setIsProcessing, setGenerationStep, setError, setGeneratedContent, setActiveView, setShowMathAnswers, setHistory, setToolSnapshots, addToast, t, callGemini, cleanJson, safeJsonParse, warnLog, verifyMathProblems, flyToElement } = deps;
  try { if (window._DEBUG_GEN_HELPERS) console.log("[GenerationHelpers] handleGenerateMath fired"); } catch(_) {}
      const problemToSolve = typeof inputOverride === 'string' ? inputOverride : mathInput;
      const latestAnalysis = history.slice().reverse().find(h => h && h.type === 'analysis');
      const availableSource = (latestAnalysis && latestAnalysis.data && latestAnalysis.data.originalText)
          ? latestAnalysis.data.originalText
          : inputText;
      let contextText = "";
      if (useMathSourceContext) {
          contextText = availableSource || "";
      }
      let mathContextPrompt = "";
      if (contextText) {
          mathContextPrompt += `Source Context: "${contextText.substring(0, 1500)}..."\n`;
      }
      if (studentInterests.length > 0) {
          mathContextPrompt += `Interests: ${studentInterests.join(', ')}\n`;
      }
      mathContextPrompt += `Grade Level: ${gradeLevel}\n`;
      if (!problemToSolve.trim()) {
          console.error('[MATH] Empty input — nothing to generate');
          addToast('Please enter a topic or problem first', 'error');
          return;
      }
      setIsProcessing(true);
      setGenerationStep(t('status.solving'));
      setError(null);
      if (switchView) {
          setGeneratedContent(null);
          setActiveView('math');
      }
      setShowMathAnswers(false);
      try {
          let prompt = "";
          const effectiveMode = modeOverride || mathMode;
          if (effectiveMode === 'Freeform Builder') {
              prompt = `
                You are an Expert Math Curriculum Designer creating a CUSTOM problem set.
                ${leveledTextLanguage && leveledTextLanguage !== 'English' ? 'IMPORTANT: Generate ALL text content (questions, explanations, steps, real-world applications) in ' + leveledTextLanguage + '. After each text field, include an English translation in parentheses. Keep mathematical expressions and JSON keys in English.' : ''}
                Teacher's Request: "${problemToSolve}"
                ${mathContextPrompt}
                Subject: ${mathSubject}
                Grade Level: ${gradeLevel}
                
                INSTRUCTIONS:
                The teacher has described exactly what they want in natural language. Create the requested mix of problems.
                Number of Problems: Generate EXACTLY ${mathQuantity} problems unless the teacher's request specifies a different count.
                ${autoAttachManipulatives ? `
                MANIPULATIVE INTEGRATION (REQUIRED when toggle is ON):
                You MUST include "manipulativeSupport" and/or "manipulativeResponse" objects for problems where a visual manipulative would aid understanding. Use your judgment on which tool fits best:
                - "base10": for place value, addition/subtraction, regrouping. State: {"hundreds":N, "tens":N, "ones":N}
                - "coordinate": for graphing, plotting, geometry. State: {"points":[{"x":N,"y":N,"label":"A"}]}
                - "numberline": for addition, subtraction, fractions, number sense. State: {"markers":[{"value":N,"label":"..."}], "range":{"min":N,"max":N}}
                - "fractions": for fraction comparison, operations. State: {"numerator":N, "denominator":N}
                - "volume": for 3D geometry, volume calculation. State: {"dims":{"l":N,"w":N,"h":N}}
                - "protractor": for angle measurement, classification. State: {"angle":N}
                - "funcGrapher": for algebra, functions, graphing. State: {"eq":"f(x)","type":"linear|quadratic|trig","a":N,"b":N,"c":N}
                - "physics": for projectile motion, kinematics. State: {"angle":N,"velocity":N,"gravity":9.8}
                - "chemBalance": for balancing chemical equations. State: {"equation":"H2+O2->H2O","coefficients":[2,1,2]}
                - "punnett": for genetics, Punnett squares. State: {"parent1":["A","a"],"parent2":["A","a"]}
                - "circuit": for electrical circuits, Ohm's law. State: {"components":[{"type":"resistor","value":100}],"voltage":9}
                - "dataPlot": for scatter plots, trend lines, statistics. State: {"points":[{"x":N,"y":N}]}
                - "inequality": for graphing inequalities. State: {"expr":"x>3","variable":"x"}
                - "molecule": for molecular structure, chemistry. State: {"formula":"H2O","atoms":[{"element":"O","x":0,"y":0}]}
                - "calculus": for integrals, derivatives, area under curve, Riemann sums. State: {"func":"x^2","a":1,"b":0,"c":0,"xMin":0,"xMax":4,"n":8,"mode":"riemann"}
                - "wave": for wave physics, sound, light, interference patterns. State: {"amplitude":1,"frequency":1,"wavelength":2}
                - "cell": for biology cell diagrams, organelle identification. State: {"type":"animal","selectedOrganelle":"nucleus"}
                "manipulativeSupport" pre-loads the tool as a visual scaffold alongside the problem.
                "manipulativeResponse" replaces the text input — the student must configure the manipulative correctly to answer.
                ` : 'Optionally, you can enable STEAM Lab manipulatives by returning objects in "manipulativeSupport" (to pre-load scaffolding) or "manipulativeResponse" (to grade the student\'s physical configuration instead of typed text). Supported tools are "base10", "coordinate", "numberline", "fractions", "volume", "protractor", "funcGrapher", "physics", "chemBalance", "punnett", "circuit", "dataPlot", "inequality", "molecule", "calculus", "wave", and "cell" — the same set the renderer grades.'}
                You may include ANY type of math problem: computation, word problems, geometry/volume, missing number, algebraic equations, fractions, measurement, data/graphing, etc.
                Follow the teacher's instructions precisely regarding:
                - Number and types of problems
                - Difficulty level
                - Specific topics or concepts
                - Any thematic context they requested
                
                If the teacher's request is vague (e.g. "5 mixed problems for grade 3"), create a diverse set spanning multiple math domains appropriate for that level.
                
                Return ONLY JSON in the following format:
                {
                  "title": "Custom Problem Set: [brief description]",
                  "problems": [
                    {
                      "question": "Problem text WITHOUT any leading directive verb (the renderer prepends it from taskType). For 'simplify' tasks the question is just the expression like '3x + 8 - 15'. For 'solve' tasks the question is the equation like '3x + 8 = 15'. For word_problem tasks the question is the full natural-language prose.",
                      "taskType": "REQUIRED. One of: 'simplify' (combine like terms / reduce; answer is an expression), 'solve' (find the unknown; answer is x = ...), 'evaluate' (compute at given inputs; answer is a number), 'factor' (factor a polynomial), 'graph' (sketch/plot), 'compute' (straight calculation like 5*7), 'word_problem' (natural-language problem; question already reads as a sentence), 'prove' (geometric/mathematical proof), 'convert' (unit conversion). Pick the action the student is being asked to perform.",
                      "expression": "Math expression (e.g. 3 * 4 + 5)",
                      "answer": "The answer",
                      "steps": [{ "explanation": "Clear step-by-step explanation", "latex": "Math expression for this step" }],
                      "type": "computation|word_problem|geometry|missing_number|fraction|algebra|measurement",
                      "realWorld": "1-2 sentence explanation of WHY this math concept matters in real life. Do NOT restate the problem as a word problem. Instead, name a specific career, hobby, or everyday situation where this skill is used (e.g. 'Nurses use unit conversion to calculate medication dosages').",
                      "manipulativeSupport": null,
                      "manipulativeResponse": null
                    }
                  ],
                  "graphData": null
                }
              `;
          } else if (effectiveMode === 'Problem Set Generator') {
              prompt = `
                You are an expert Math Curriculum Designer.
                ${leveledTextLanguage && leveledTextLanguage !== 'English' ? 'IMPORTANT: Generate ALL text content (questions, explanations, steps, real-world applications) in ' + leveledTextLanguage + '. After each text field, include an English translation in parentheses. Keep mathematical expressions and JSON keys in English.' : ''}
                Topic/Skill: "${problemToSolve}"
                ${mathContextPrompt}
                Instruction: Create EXACTLY the number and types of problems described in the Topic/Skill above. Match the count, types, and difficulty the user specified. If no specific count is given, create 5 problems.
                Context Usage: Frame the word problems using characters, settings, or themes from the Source Context. Use names/concepts from the Student Interests.
                Output Format:
                Return a JSON object with a "problems" array.
                Each item in the array must have:
                - "question": The problem text WITHOUT any leading directive verb (no "Simplify:" / "Solve:" prefix — the renderer prepends it from taskType). For simplify tasks the question is just the expression like "3x + 8 - 15"; for solve tasks it's the equation like "3x + 8 = 15"; for word_problem tasks the question is the full natural-language prose.
                - "taskType": REQUIRED. One of: "simplify" (combine like terms / reduce), "solve" (find the unknown), "evaluate" (compute at given inputs), "factor" (factor a polynomial), "graph" (sketch/plot), "compute" (straight calculation like 5*7), "word_problem" (natural-language; question reads as a sentence), "prove", "convert". Pick the action the student is asked to perform.
                - "expression": The math expression that solves this (standard notation: +, -, *, /, ^, parentheses). Example: "15 - (3 * 4)"
                - "answer": The numeric solution (a number).
                - "steps": An array of 2-5 step objects { "explanation": "Clear explanation of what to do in this step", "latex": "The math expression for this step", "expression": "The computed sub-expression" }. CRITICAL: Every problem MUST have detailed steps showing the complete solution process. Students see these after attempting the problem. Make explanations clear and educational.
                Return ONLY JSON in the following format:
                {
                  "title": "Problem Set: ${problemToSolve.substring(0, 30)}...",
                  "problems": [
                    {
                      "question": "Problem 1 text...",
                      "taskType": "simplify",
                      "answer": "Answer 1",
                      "steps": [{ "explanation": "First...", "latex": "x=..." }],
                      "realWorld": "1-2 sentence real-life connection — name a specific career or everyday situation where this skill is used. Do NOT restate the problem as a word problem.",
                      "manipulativeSupport": null,
                      "manipulativeResponse": null
                    }
                  ],
                  "graphData": null
                }
              `;
          } else {
              prompt = `
                You are an Expert Math & Science Tutor.
                ${leveledTextLanguage && leveledTextLanguage !== 'English' ? 'IMPORTANT: Generate ALL text content (explanations, steps, real-world applications) in ' + leveledTextLanguage + '. After each text field, include an English translation in parentheses. Keep mathematical expressions and JSON keys in English.' : ''}
                Subject: ${mathSubject}
                Mode: ${mathMode}
                Problem: "${problemToSolve}",
                Context:
                ${mathContextPrompt}
                Instructions:
                Solve the problem or explain the concept based on the selected mode.
                - If "Step-by-Step": Provide a clear, numbered sequence of steps to reach the solution. Show work for every calculation.
                - If "Conceptual": Explain the "Why" and "How" behind the concept. Use analogies.
                - If "Real-World Application": Explain how this specific concept is used in real life (engineering, finance, nature, etc.).
                ${useMathSourceContext ? 'Relate the explanation to the Source Context concepts.' : ''}
                ${isMathGraphEnabled ? `
                    VISUALS REQUIRED:
                    - PREFER a parametric "manipulativeSupport" {tool,state} over a "graphData" SVG string WHENEVER the visual fits a supported interactive manipulative — these render INLINE as accessible, editable diagrams (vs a static, non-editable SVG). Supported inline: "numberline" (number lines / integers / fractions on a line), "coordinate" (plotting points, lines, geometry on a grid), "fractions" (fraction bars / comparison), "base10" (place value), "protractor" (angles). Use the state shapes from the manipulative instructions.
                    - Only fall back to a "graphData" SVG for visuals that do NOT fit one of those: Math/Physics curves/plots, Biology/Earth Science diagrams (Punnett Square, Water Cycle, Cell Structure), or Computer Science Flowcharts / Logic Gates.
                    - If a "graphData" SVG is used: keep it clean, minimal, responsive (viewBox), standard colors — AND ALWAYS set "graphAlt" to a one-sentence plain-text description of the diagram for screen-reader users.
                ` : ''}
                Return ONLY JSON in the following format:
                {
                  "problem": "Clean Latex string of the input WITHOUT any leading directive verb (no 'Simplify:' / 'Solve:' prefix — the renderer prepends from taskType).",
                  "taskType": "REQUIRED. One of: 'simplify', 'solve', 'evaluate', 'factor', 'graph', 'compute', 'word_problem', 'prove', 'convert'. Pick the action the student is being asked to perform on this single problem.",
                  "answer": "Final Answer string",
                  "steps": [{ "explanation": "Step explanation", "latex": "Step math in Latex" }],
                  "graphData": "SVG string or null (prefer manipulativeSupport for the supported inline types)",
                  "graphAlt": "one-sentence plain-text description of graphData for screen readers (null if no graphData)",
                  "realWorld": "1-2 sentence explanation of a specific career, hobby, or everyday situation where this concept is applied — NOT a word problem restatement",
                  "manipulativeSupport": null,
                  "manipulativeResponse": null
                }
              `;
          }
          console.error('[MATH] Sending prompt to Gemini, mode:', effectiveMode, 'subject:', mathSubject);
          const result = await callGemini(prompt, true);
          console.error('[MATH] Raw Gemini result length:', result?.length, 'first 200 chars:', result?.substring(0, 200));
          let rawContent;
          let cleaned;
          try {
              cleaned = cleanJson(result);
              rawContent = safeJsonParse(result);
              if (!rawContent) {
                try { rawContent = JSON.parse(cleaned); } catch (_) {}
              }
              if (!rawContent) {
                const jsonMatch = result.match(/[\[{][\s\S]*[\]}]/);
                if (jsonMatch) {
                  const extracted = jsonMatch[0];
                  if (typeof window !== 'undefined' && window.jsonrepair) {
                    try { rawContent = JSON.parse(window.jsonrepair(extracted)); } catch (_) {}
                  }
                  if (!rawContent) {
                    try { rawContent = JSON.parse(extracted); } catch (_) {}
                  }
                }
              }
              if (!rawContent) throw new Error("Parsed JSON is null after all strategies");
          } catch (parseErr) {
              console.error('[MATH] JSON Parse Error:', parseErr, 'Cleaned input:', cleaned?.substring(0, 300));
              warnLog("Math Parse Error:", parseErr);
              throw new Error("Failed to parse Math JSON. The AI response was not valid.");
          }
          let normalizedContent = {
              title: rawContent.title || 'Math & STEM Solver',
              problems: [],
              graphData: rawContent.graphData || null
          };
          const normalizeSteps = (steps) => {
              if (!Array.isArray(steps)) return [];
              return steps.map(s => {
                  if (typeof s === 'string') return { explanation: s, latex: '' };
                  return s;
              });
          };
          // Normalize taskType: default missing/invalid to 'simplify' (most common).
          // The renderer's directive map has fallback handling, but defaulting here
          // makes downstream logic (analytics, validators, manipulative auto-attach)
          // simpler since they can assume the field exists.
          const VALID_TASK_TYPES = new Set(['simplify','solve','evaluate','factor','graph','compute','word_problem','prove','convert']);
          const normalizeTaskType = (raw) => {
              const t = (raw || '').toString().trim().toLowerCase();
              return VALID_TASK_TYPES.has(t) ? t : 'simplify';
          };
          if (Array.isArray(rawContent.problems)) {
              normalizedContent.problems = rawContent.problems.map(p => ({
                  ...p,
                  taskType: normalizeTaskType(p.taskType),
                  steps: normalizeSteps(p.steps)
              }));
          } else {
              normalizedContent.problems = [{
                  question: rawContent.problem || problemToSolve,
                  taskType: normalizeTaskType(rawContent.taskType),
                  answer: rawContent.answer,
                  steps: normalizeSteps(rawContent.steps || (Array.isArray(rawContent.steps) ? rawContent.steps : [])),
                  realWorld: rawContent.realWorld
              }];
          }
          normalizedContent.problems = verifyMathProblems(normalizedContent.problems);
          const verifiedCount = normalizedContent.problems.filter(p => p._verification?.verified).length;
          const mismatchCount = normalizedContent.problems.filter(p => p._verification?.mismatch).length;
          if (mismatchCount > 0) {
            warnLog(`Math verification: ${mismatchCount} answer(s) auto-corrected via expression evaluation`);
          }
          if (verifiedCount > 0) {
            console.error('[MATH] ' +`Math verification: ${verifiedCount}/${normalizedContent.problems.length} answers computationally verified ✓`);
          }
          const newItem = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              type: 'math',
              data: normalizedContent,
              meta: `${mathSubject} - ${mathMode}`,
              title: normalizedContent.title,
              timestamp: new Date(),
              config: {}
          };
          setGeneratedContent({ type: 'math', data: normalizedContent, id: newItem.id });
          setHistory(prev => [...prev, newItem]);
          if (autoSnapshotManipulatives && normalizedContent.problems) {
            const newSnaps = [];
            normalizedContent.problems.forEach((p, idx) => {
              const manip = p.manipulativeSupport || p.manipulativeResponse;
              if (manip && manip.tool && manip.state) {
                newSnaps.push({
                  id: 'auto-' + Date.now() + '-' + idx,
                  tool: manip.tool,
                  label: 'P' + (idx + 1) + ': ' + (manip.tool === 'base10' ? (manip.state.hundreds || 0) + 'H ' + (manip.state.tens || 0) + 'T ' + (manip.state.ones || 0) + 'O' : manip.tool === 'coordinate' ? (manip.state.points?.length || 0) + ' points' : manip.tool),
                  mode: 'auto',
                  data: manip.state,
                  timestamp: Date.now()
                });
              }
            });
            if (newSnaps.length > 0) {
              setToolSnapshots(prev => [...prev, ...newSnaps]);
              addToast('📸 Auto-captured ' + newSnaps.length + ' manipulative snapshot(s)', 'info');
            }
          }
          console.error('[MATH] Success! Problems generated:', normalizedContent.problems?.length);
          addToast(t('math.success_toast'), "success");
          flyToElement('tour-tool-math');
      } catch (e) {
          console.error('[MATH] Generation failed:', e.message, e.stack);
          warnLog("Unhandled error:", e);
          setError(t('math.error_generation'));
          addToast(t('math.error_generation'), "error");
      } finally {
          setIsProcessing(false);
      }
};

const handleGenerateFullPack = async (chatContextOverride = null, deps) => {
  const { isProcessing, fullPackTargetGroup, rosterKey, gradeLevel, leveledTextLanguage, studentInterests, dokLevel, differentiationRange, differentiationTypes, differentiationCustomGrades, generationSignal, leveledTextCustomInstructions, selectedLanguages, targetStandards, useEmojis, textFormat, history, inputText, sourceTopic, standardsInput, standardsContext, resourceCount, isAutoConfigEnabled, quizCustomInstructions, adventureCustomInstructions, frameCustomInstructions, brainstormCustomInstructions, faqCustomInstructions, outlineCustomInstructions, visualCustomInstructions, timelineTopic, lessonCustomAdditions, conceptInput, glossaryCustomInstructions, personaCustomInstructions, conceptSortCustomInstructions, dbqCustomInstructions, noteTakingCustomInstructions, anchorChartCustomInstructions, setIsProcessing, setGenerationStep, setFullPackTargetGroup, setGradeLevel, setLeveledTextLanguage, setStudentInterests, setDokLevel, setLeveledTextCustomInstructions, setSelectedLanguages, setTargetStandards, setUseEmojis, setTextFormat, setPersistedLessonDNA, setFullPackRun, setError, addToast, t, warnLog, handleApplyRosterGroup, handleGenerate, autoConfigureSettings, applyDetailedAutoConfig, getGroupDifferentiationContext, getAssetManifest, getDifferentiationGrades } = deps;
  try { if (window._DEBUG_GEN_HELPERS) console.log("[GenerationHelpers] handleGenerateFullPack fired"); } catch(_) {}
    const _fullPackStartedAt = Date.now();
    const _fullPackRunId = 'full-pack-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const recordFullPackFailure = (details) => {
        const d = details || {};
        const reason = String(d.reason || 'unknown generation failure');
        const message = '[FullPack] resource generation failed'
            + ' resource=' + String(d.type || 'unknown')
            + ' step=' + String(Number.isFinite(d.index) ? d.index + 1 : '?')
            + ' reason=' + reason
            + ' sourceTextChars=' + String(Number.isFinite(d.sourceTextChars) ? d.sourceTextChars : 0)
            + ' runId=' + _fullPackRunId
            + ' elapsedMs=' + String(Math.max(0, Date.now() - _fullPackStartedAt));
        try { if (typeof warnLog === 'function') warnLog(message); else if (typeof console !== 'undefined' && console.warn) console.warn(message); } catch (_) {}
        const stack = d.error && d.error.stack ? String(d.error.stack) : '';
        try {
            const reporter = typeof window !== 'undefined'
                && window.AlloModules
                && window.AlloModules.ErrorReporter;
            if (reporter && typeof reporter.record === 'function') {
                reporter.record('error', message, stack, 'full-pack-resource-generation', 0, 0);
            } else if (typeof window !== 'undefined') {
                const pending = window.__alloPendingErrorReports = window.__alloPendingErrorReports || [];
                pending.push({ level: 'error', message: message, stack: stack, source: 'full-pack-resource-generation' });
                while (pending.length > 20) pending.shift();
            }
        } catch (_) {}
        return message;
    };
    const _ownsFullPackAbort = !generationSignal;
    if (isProcessing || (_ownsFullPackAbort && _fullPackRunInFlight)) {
        try { if (typeof addToast === 'function') addToast('A Full Pack is already running.', 'info'); } catch (_) {}
        return false;
    }
    if (_ownsFullPackAbort) _fullPackRunInFlight = true;
    const _fullPackRequest = chatContextOverride && typeof chatContextOverride === 'object' ? chatContextOverride : {};
    const _retryRun = _fullPackRequest.__fullPackRetryRun || null;
    const _approvedRun = _fullPackRequest.__fullPackApprovedRun || null;
    const _groupRetryRun = _fullPackRequest.__fullPackGroupRetryRun || null;
    const _preflightOnly = _fullPackRequest.__fullPackPreflightOnly === true;
    const _planSourceRun = _approvedRun || _retryRun;
    const _fullPackRunAbortCtl = _ownsFullPackAbort && typeof AbortController !== 'undefined' ? new AbortController() : null;
    const _fullPackSignal = generationSignal || (_fullPackRunAbortCtl && _fullPackRunAbortCtl.signal) || null;
    if (_fullPackRunAbortCtl) _fullPackAbortCtl = _fullPackRunAbortCtl;
    const _fullPackSettingsSnapshot = Object.freeze({
        gradeLevel,
        leveledTextLanguage,
        studentInterests: Array.isArray(studentInterests) ? studentInterests.slice() : studentInterests,
        dokLevel,
        selectedLanguages: Array.isArray(selectedLanguages) ? selectedLanguages.slice() : selectedLanguages,
        targetStandards: Array.isArray(targetStandards) ? targetStandards.slice() : targetStandards,
        useEmojis,
        textFormat,
        differentiationRange,
        differentiationTypes: Array.isArray(differentiationTypes) ? differentiationTypes.slice() : differentiationTypes,
        differentiationCustomGrades: Array.isArray(differentiationCustomGrades) ? differentiationCustomGrades.slice() : differentiationCustomGrades,
        resourceCount,
        isAutoConfigEnabled,
        fullPackTargetGroup,
        rosterSignature: _fullPackRosterSignature(rosterKey),
    });
    const updateFullPackRun = (mutator) => {
        if (typeof setFullPackRun !== 'function') return;
        setFullPackRun(prev => mutator(prev || {}));
    };
    if (typeof setFullPackRun === 'function') {
        setFullPackRun({ runId: _fullPackRunId, retryOf: (_retryRun || _groupRetryRun) && (_retryRun || _groupRetryRun).runId || null, approvedFrom: _approvedRun && _approvedRun.runId || null, status: _preflightOnly ? 'planning' : 'running', startedAt: new Date().toISOString(), elapsedMs: 0, settingsSnapshot: _fullPackSettingsSnapshot, resources: {}, groups: {} });
    }
    const targetGroup = (_approvedRun && _approvedRun.targetMode === 'all-groups') || _groupRetryRun ? 'all' : fullPackTargetGroup;
    if (targetGroup === 'all' && rosterKey?.groups && Object.keys(rosterKey.groups).length > 0) {
        const groupEntries = Object.entries(rosterKey.groups);
        updateFullPackRun(prev => Object.assign({}, prev, {
            targetMode: 'all-groups',
            groups: Object.fromEntries(groupEntries.map(([gid, group]) => [gid, {
                groupId: gid,
                groupName: group && group.name || gid,
                status: 'queued',
                resources: {},
            }]))
        }));
        const savedSettings = {
            grade: gradeLevel, lang: leveledTextLanguage, interests: studentInterests,
            dok: dokLevel, custom: leveledTextCustomInstructions,
            selectedLangs: selectedLanguages, standards: targetStandards,
            emojis: useEmojis, fmt: textFormat
        };
        setIsProcessing(true);
        try {
            for (let gi = 0; gi < groupEntries.length && !(_fullPackSignal && _fullPackSignal.aborted); gi++) {
                const [gid, group] = groupEntries[gi];
                const profile = (group && group.profile) || {};
                setGenerationStep(`${_preflightOnly ? 'Planning' : 'Generating'} full pack for ${group.name} (${gi+1}/${groupEntries.length})...`);
                handleApplyRosterGroup(gid);
                await new Promise(r => setTimeout(r, 150));
                setFullPackTargetGroup(_preflightOnly ? 'all' : 'none');
                // React setters above are asynchronous. Pass the profile values
                // directly to the child run so the next pack cannot race with
                // the previous render and silently use the wrong group settings.
                let childRun = null;
                const setChildFullPackRun = (next) => {
                    childRun = typeof next === 'function' ? next(childRun || {}) : next;
                    updateFullPackRun(prev => Object.assign({}, prev, {
                        groups: Object.assign({}, prev.groups, {
                            [gid]: Object.assign({ groupId: gid, groupName: group.name || gid }, childRun || {})
                        })
                    }));
                };
                const groupDeps = Object.assign({}, deps, {
                    isProcessing: false,
                    setIsProcessing: () => {},
                    fullPackTargetGroup: 'none',
                    gradeLevel: profile.gradeLevel || gradeLevel,
                    leveledTextLanguage: profile.leveledTextLanguage || leveledTextLanguage,
                    studentInterests: profile.studentInterests
                        ? (Array.isArray(profile.studentInterests) ? profile.studentInterests : String(profile.studentInterests).split(',').map(s => s.trim()).filter(Boolean))
                        : studentInterests,
                    dokLevel: profile.dokLevel || dokLevel,
                    leveledTextCustomInstructions: profile.leveledTextCustomInstructions || leveledTextCustomInstructions,
                    selectedLanguages: Array.isArray(profile.selectedLanguages) ? profile.selectedLanguages : selectedLanguages,
                    targetStandards: Array.isArray(profile.targetStandards) ? profile.targetStandards : targetStandards,
                    useEmojis: profile.useEmojis === undefined ? useEmojis : profile.useEmojis,
                    textFormat: profile.textFormat || textFormat,
                    generationSignal: _fullPackSignal,
                    setFullPackRun: setChildFullPackRun,
                });
                const childRequest = _groupRetryRun && _groupRetryRun.groups && _groupRetryRun.groups[gid]
                    ? { __fullPackRetryRun: _groupRetryRun.groups[gid] }
                    : (_approvedRun && _approvedRun.groups && _approvedRun.groups[gid]
                        ? { __fullPackApprovedRun: _approvedRun.groups[gid] }
                        : (_preflightOnly ? { __fullPackPreflightOnly: true } : chatContextOverride));
                await handleGenerateFullPack(childRequest, groupDeps);
            }
            const _allStopped = !!(_fullPackSignal && _fullPackSignal.aborted);
            updateFullPackRun(prev => {
                const groups = prev.groups || {};
                const childRuns = Object.values(groups);
                const hasChildFailures = childRuns.some(run => run && (run.status === 'failed' || run.status === 'partial' || run.status === 'interrupted'));
                const finishedAt = new Date().toISOString();
                return Object.assign({}, prev, {
                    status: _allStopped ? 'stopped' : (_preflightOnly ? 'ready' : (hasChildFailures ? 'partial' : 'completed')),
                    finishedAt: _preflightOnly ? null : finishedAt,
                    readyAt: _preflightOnly ? finishedAt : null,
                    elapsedMs: Math.max(0, Date.now() - _fullPackStartedAt),
                });
            });
            addToast(_allStopped
                ? `Full Pack generation stopped. Finished group resources were kept.`
                : (_preflightOnly
                    ? `Full Pack plan ready for ${groupEntries.length} groups. Review it before generating.`
                    : `Generated full packs for ${groupEntries.length} groups!`), _allStopped ? 'info' : (_preflightOnly ? 'info' : 'success'));
        } finally {
            setGradeLevel(savedSettings.grade);
            setLeveledTextLanguage(savedSettings.lang);
            setStudentInterests(savedSettings.interests);
            setDokLevel(savedSettings.dok);
            setLeveledTextCustomInstructions(savedSettings.custom);
            setSelectedLanguages(savedSettings.selectedLangs);
            setTargetStandards(savedSettings.standards);
            setUseEmojis(savedSettings.emojis);
            setTextFormat(savedSettings.fmt);
            setIsProcessing(false);
            setGenerationStep('');
            setFullPackTargetGroup(_preflightOnly ? 'all' : 'none');
            if (_ownsFullPackAbort) _fullPackRunInFlight = false;
            if (_fullPackAbortCtl === _fullPackRunAbortCtl) _fullPackAbortCtl = null;
        }
        return true;
    }
    if (targetGroup !== 'none' && rosterKey?.groups?.[targetGroup]) {
        handleApplyRosterGroup(targetGroup);
        await new Promise(r => setTimeout(r, 100));
    }
    const latestAnalysis = history.slice().reverse().find(h => h && h.type === 'analysis');
    let batchSourceText = (latestAnalysis && latestAnalysis.data && latestAnalysis.data.originalText)
        ? latestAnalysis.data.originalText
        : (typeof inputText === 'string' ? inputText.trim() : '');
    if (!batchSourceText) {
        const noSourceError = new Error('No source text is available for Full Pack generation.');
        recordFullPackFailure({ type: 'preflight', index: 0, reason: noSourceError.message, error: noSourceError, sourceTextChars: 0 });
        addToast(t('process.source_missing'), "error");
        updateFullPackRun(prev => Object.assign({}, prev, { status: 'failed', finishedAt: new Date().toISOString(), elapsedMs: Math.max(0, Date.now() - _fullPackStartedAt) }));
        if (_fullPackAbortCtl === _fullPackRunAbortCtl) _fullPackAbortCtl = null;
        if (_ownsFullPackAbort) _fullPackRunInFlight = false;
        return false;
    }
    const _sourceFingerprint = _fullPackFingerprint(batchSourceText);
    if (_planSourceRun && _planSourceRun.preflight && _planSourceRun.preflight.sourceFingerprint
        && _planSourceRun.preflight.sourceFingerprint !== _sourceFingerprint) {
        const changedSourceError = new Error('The source changed since this Full Pack plan was created. Create a new plan before generating or retrying.');
        recordFullPackFailure({ type: 'preflight', index: 0, reason: changedSourceError.message, error: changedSourceError, sourceTextChars: batchSourceText.length });
        updateFullPackRun(prev => Object.assign({}, prev, { status: 'failed', reason: changedSourceError.message, finishedAt: new Date().toISOString(), elapsedMs: Math.max(0, Date.now() - _fullPackStartedAt) }));
        addToast(changedSourceError.message, 'warning');
        if (_fullPackAbortCtl === _fullPackRunAbortCtl) _fullPackAbortCtl = null;
        if (_ownsFullPackAbort) _fullPackRunInFlight = false;
        return false;
    }
    setIsProcessing(true);
    setGenerationStep(_preflightOnly ? 'Planning Full Pack resources…' : t('fullpack.status_init'));
    addToast(_preflightOnly ? 'Building a Full Pack plan for review…' : t('fullpack.status_start'), "info");
    try {
        const standardsContextModule = typeof window !== 'undefined' && window.AlloModules
            ? window.AlloModules.StandardsContext
            : null;
        const resolvedStandardsContext = standardsContext && Array.isArray(standardsContext.standards)
            ? standardsContext
            : (standardsContextModule && typeof standardsContextModule.resolve === 'function'
                ? standardsContextModule.resolve(standardsInput || targetStandards)
                : null);
        const activeStandardsContext = resolvedStandardsContext
            && Array.isArray(resolvedStandardsContext.standards)
            && resolvedStandardsContext.standards.length
            ? resolvedStandardsContext
            : null;
        const lessonDNA = {
            grade: gradeLevel,
            topic: sourceTopic || "General Topic",
            standard: (activeStandardsContext && activeStandardsContext.promptText) || standardsInput || '',
            concepts: [],
            keyTerms: [],
            visualContext: "",
            essentialQuestion: "",
        };
        if (_approvedRun && _approvedRun.planPayload && _approvedRun.planPayload.lessonDNA) {
            Object.assign(lessonDNA, _approvedRun.planPayload.lessonDNA);
        }
        let batchConfig = _approvedRun && _approvedRun.planPayload && _approvedRun.planPayload.batchConfig
            ? Object.assign({}, _approvedRun.planPayload.batchConfig)
            : {};
        let resourcesToGen = [
            { type: 'glossary', directive: '' },
            { type: 'simplified', directive: '' },
            { type: 'image', directive: '' },
            { type: 'outline', directive: '' },
            { type: 'sentence-frames', directive: '' },
            { type: 'faq', directive: '' },
            { type: 'timeline', directive: '' },
            { type: 'persona', directive: '' },
            { type: 'concept-sort', directive: '' },
            { type: 'brainstorm', directive: '' },
            { type: 'quiz', directive: '' },
            { type: 'lesson-plan', directive: '' },
            { type: 'adventure', directive: '' }
        ];
        if (!_retryRun && !_approvedRun && (resourceCount === 'Auto' || resourceCount === 'All')) {
             const hasAnalysis = history.some(h => h.type === 'analysis');
             if (!hasAnalysis) {
                 resourcesToGen.unshift({ type: 'analysis', directive: "Essential verification step." });
             }
        }
        const existingTypes = history.map(h => h.type);
        if (_approvedRun) {
            resourcesToGen = ((_approvedRun.preflight && _approvedRun.preflight.selected) || [])
                .map((item, index) => ({ type: item.type, directive: item.directive || '', uiId: item.uiId || (item.type + '-' + index) }));
        } else if (_retryRun) {
            resourcesToGen = Object.values(_retryRun.resources || {})
                .filter(item => item && ['failed', 'interrupted', 'stopped'].includes(item.status))
                .map(item => ({ type: item.type, directive: item.directive || '', uiId: item.key || (item.type + '-' + item.index) }));
        } else if (isAutoConfigEnabled) {
            setGenerationStep(t('process.auto_config'));
            const customInputToUse = (chatContextOverride && typeof chatContextOverride === 'string') ? chatContextOverride : leveledTextCustomInstructions;
            const rosterCtx = getGroupDifferentiationContext();
            const enrichedCustomInput = rosterCtx ? `${customInputToUse}\n${rosterCtx}` : customInputToUse;
            batchConfig = await autoConfigureSettings(
                batchSourceText,
                gradeLevel,
                standardsInput,
                leveledTextLanguage,
                enrichedCustomInput,
                existingTypes,
                resourceCount,
                _fullPackSignal
            );
            applyDetailedAutoConfig(batchConfig);
            if (batchConfig.lessonDNA) {
                if (Array.isArray(batchConfig.lessonDNA.goldenThread) && lessonDNA.concepts.length === 0) {
                    lessonDNA.concepts = batchConfig.lessonDNA.goldenThread.slice(0, 5);
                }
                if (Array.isArray(batchConfig.lessonDNA.keyTerms) && lessonDNA.keyTerms.length === 0) {
                    lessonDNA.keyTerms = batchConfig.lessonDNA.keyTerms.slice(0, 8);
                }
                if (batchConfig.lessonDNA.essentialQuestion && !lessonDNA.essentialQuestion) {
                    lessonDNA.essentialQuestion = batchConfig.lessonDNA.essentialQuestion;
                }
                try {
                    const eqLine = lessonDNA.essentialQuestion ? `EQ: "${lessonDNA.essentialQuestion}"` : '';
                    const conceptsLine = lessonDNA.concepts.length ? `Concepts: ${lessonDNA.concepts.slice(0, 3).join(', ')}${lessonDNA.concepts.length > 3 ? '…' : ''}` : '';
                    const parts = [eqLine, conceptsLine].filter(Boolean);
                    if (parts.length > 0) addToast(`Golden Thread locked in — ${parts.join(' · ')}`, 'info');
                } catch(e) { /* best-effort */ }
            }
            if (batchConfig.resourcePlan && Array.isArray(batchConfig.resourcePlan)) {
                 resourcesToGen = batchConfig.resourcePlan.map(item => ({
                     type: item.tool,
                     directive: item.directive || "",
                 }));
            }
            else if (batchConfig.recommendedResources) {
                resourcesToGen = batchConfig.recommendedResources.map(type => ({
                    type,
                    directive: batchConfig.toolDirectives?.[type] || "",
                }));
            }
            if (resourceCount === 'Auto' || resourceCount === 'All') {
                const essentials = ['analysis', 'simplified', 'lesson-plan'];
                essentials.forEach(item => {
                    const inBatch = resourcesToGen.some(r => r.type === item);
                    const inHistory = existingTypes.includes(item);
                    if (!inBatch && !inHistory) {
                        resourcesToGen.push({ type: item, directive: "Essential resource added by default." });
                    }
                });
            }
            const planItems = resourcesToGen.filter(r => r.type === 'lesson-plan');
            resourcesToGen = resourcesToGen.filter(r => r.type !== 'lesson-plan');
            resourcesToGen.sort((a, b) => (a.type === 'analysis' ? -1 : b.type === 'analysis' ? 1 : 0));
            if (planItems.length > 0) {
                resourcesToGen.push(...planItems);
            }
        }
        const fullPackFailures = [];
        const planFailures = [];
        const knownTypes = getFullPackKnownTypes();
        const normalizedResources = [];
        resourcesToGen.forEach((item, planIndex) => {
            const type = item && typeof item.type === 'string' ? item.type.trim() : '';
            if (!type) {
                planFailures.push({ type: 'plan', index: planIndex, reason: 'Full Pack plan item has no resource type', sourceTextChars: batchSourceText.length });
                return;
            }
            if (!knownTypes.has(type)) {
                planFailures.push({ type, index: planIndex, reason: 'Unsupported Full Pack resource type: ' + type, sourceTextChars: batchSourceText.length });
                return;
            }
            normalizedResources.push(Object.assign({}, item, { type }));
        });
        planFailures.forEach(failure => { fullPackFailures.push(failure); recordFullPackFailure(failure); });
        const runnableResources = normalizedResources.filter(item => !(item.type === 'timeline' && batchConfig.hasTimeline === false));
        const _skippedResources = planFailures.map(f => ({ type: f.type, index: f.index, reason: f.reason }))
            .concat(normalizedResources.filter(item => item.type === 'timeline' && batchConfig.hasTimeline === false)
                .map(item => ({ type: item.type, reason: 'Skipped by auto-configuration.' })));
        const _diffLevels = typeof getDifferentiationGrades === 'function'
            ? getDifferentiationGrades(gradeLevel, differentiationRange, differentiationCustomGrades)
            : (differentiationRange === 'None' ? [gradeLevel] : differentiationRange === 'Custom'
                ? Array.from(new Set([gradeLevel].concat(Array.isArray(differentiationCustomGrades) ? differentiationCustomGrades : [])))
                : [gradeLevel, gradeLevel, gradeLevel]);
        const _diffTypeSet = new Set(Array.isArray(differentiationTypes) ? differentiationTypes : ['simplified']);
        const _estimatedResourceGenerations = runnableResources.reduce((total, item) =>
            total + (_diffTypeSet.has(item.type) ? Math.max(1, _diffLevels.length) : 1), 0);
        const _fullPackPreflight = {
            createdAt: new Date().toISOString(),
            sourceTextChars: batchSourceText.length,
            sourceFingerprint: _sourceFingerprint,
            retryOf: _retryRun && _retryRun.runId || null,
            selected: runnableResources.map((item, index) => ({ type: item.type, index, uiId: item.uiId || (item.type + '-' + index), directive: item.directive || '' })),
            skipped: _skippedResources,
            differentiation: { range: differentiationRange || 'None', types: Array.from(_diffTypeSet), levelCount: Math.max(1, _diffLevels.length) },
            estimatedResourceGenerations: _estimatedResourceGenerations,
            planSchemaVersion: FULL_PACK_PLAN_SCHEMA_VERSION,
            capabilityFingerprint: FULL_PACK_CAPABILITY_FINGERPRINT,
            capacity: {
                aiCalls: _estimatedResourceGenerations,
                imageCalls: runnableResources.reduce((sum, item) => sum + (item.type === 'image' ? (_diffTypeSet.has(item.type) ? Math.max(1, _diffLevels.length) : 1) : 0), 0),
                estimatedMinutes: Math.max(1, Math.ceil(_estimatedResourceGenerations * 0.35)),
                warnings: [].concat(
                    _estimatedResourceGenerations >= 20 ? ['Large pack: provider rate limits are more likely. Consider fewer resources or groups.'] : [],
                    runnableResources.some(item => item.type === 'image') && _estimatedResourceGenerations >= 12 ? ['Image generation may extend the run and consume additional provider quota.'] : []
                ),
            },
        };
        const _planPayload = {
            batchConfig: _compactFullPackBatchConfig(batchConfig),
            lessonDNA: Object.assign({}, lessonDNA, {
                concepts: Array.isArray(lessonDNA.concepts) ? lessonDNA.concepts.slice() : [],
                keyTerms: Array.isArray(lessonDNA.keyTerms) ? lessonDNA.keyTerms.slice() : [],
            }),
        };
        updateFullPackRun(prev => Object.assign({}, prev, { preflight: _fullPackPreflight, planPayload: _planPayload }));
        warnLog('[FullPack] preflight runId=' + _fullPackRunId + ' selected=' + runnableResources.length + ' skipped=' + _skippedResources.length + ' estimatedResourceGenerations=' + _estimatedResourceGenerations);
        if (runnableResources.length === 0) {
            throw new Error('Full Pack auto-configuration produced no runnable resources.');
        }
        if (_preflightOnly) {
            updateFullPackRun(prev => Object.assign({}, prev, {
                status: 'ready',
                readyAt: new Date().toISOString(),
                elapsedMs: Math.max(0, Date.now() - _fullPackStartedAt),
            }));
            setGenerationStep('Full Pack plan ready for review.');
            addToast('Full Pack plan ready. Review the resources and settings before generating.', 'info');
            return true;
        }
        let currentSessionHistory = [...history];
        addToast(t('process.gen_batch', { count: runnableResources.length }), "info");
        for (let i = 0; i < runnableResources.length && !(_fullPackSignal && _fullPackSignal.aborted); i++) {
            const { type, directive } = runnableResources[i];
            const resourceKey = String(runnableResources[i].uiId || (type + '-' + i));
            const _resourceStartedAt = Date.now();
            updateFullPackRun(prev => Object.assign({}, prev, { resources: Object.assign({}, prev.resources, { [resourceKey]: { key: resourceKey, type, index: i, directive: directive || '', status: 'running', attempts: 1, startedAt: new Date(_resourceStartedAt).toISOString(), elapsedMs: 0 } }) }));
            let userOverride = "";
            switch(type) {
                case 'simplified': userOverride = leveledTextCustomInstructions; break;
                case 'quiz': userOverride = quizCustomInstructions; break;
                case 'adventure': userOverride = adventureCustomInstructions; break;
                case 'sentence-frames': userOverride = frameCustomInstructions; break;
                case 'brainstorm': userOverride = brainstormCustomInstructions; break;
                case 'faq': userOverride = faqCustomInstructions; break;
                case 'outline': userOverride = outlineCustomInstructions; break;
                case 'image': userOverride = visualCustomInstructions; break;
                case 'timeline': userOverride = timelineTopic; break;
                case 'lesson-plan': userOverride = lessonCustomAdditions; break;
                // conceptInput is unsubmitted category text, NOT an instruction —
                // prefer the real field and fall back, never concatenate.
                case 'concept-sort': userOverride = conceptSortCustomInstructions || conceptInput; break;
                // Added 2026-07-28: without these, a resource generated inside a
                // Full Pack silently ignored the custom instructions that the
                // same resource honours when generated from its own button.
                case 'glossary': userOverride = glossaryCustomInstructions; break;
                case 'persona': userOverride = personaCustomInstructions; break;
                case 'dbq': userOverride = dbqCustomInstructions; break;
                case 'note-taking': userOverride = noteTakingCustomInstructions; break;
                case 'anchor-chart': userOverride = anchorChartCustomInstructions; break;
            }
            const combinedInstructions = `${directive} ${userOverride ? `(User Note: ${userOverride})` : ''}`.trim();
            const stepConfig = {
                ...batchConfig,
                lessonDNA: lessonDNA,
                customInstructions: combinedInstructions,
                standardsContext: activeStandardsContext,
                historyOverride: currentSessionHistory,
                // Full Pack is unattended: do not turn a rejected, throttled,
                // or malformed resource into a false success/no-op.
                rethrowErrors: true,
                // Differentiation is deliberately NOT suppressed here (Aaron,
                // 2026-07-29): differentiationTypes is opt-in per resource, so a
                // pack only multiplies for the types the teacher explicitly
                // chose — and a teacher who opted the quiz in wants the pack's
                // quiz differentiated too. The universal panel's cost preview is
                // the spend disclosure.
            };
            if (type === 'outline' && directive) {
                 const lower = directive.toLowerCase();
                 if (lower.includes('compare') || lower.includes('venn')) stepConfig.outlineType = 'Venn Diagram';
                 else if (lower.includes('process') || lower.includes('flow')) stepConfig.outlineType = 'Flow Chart';
                 else if (lower.includes('cause')) stepConfig.outlineType = 'Cause and Effect';
                 else if (lower.includes('mind') || lower.includes('concept')) stepConfig.outlineType = 'Key Concept Map';
                 else stepConfig.outlineType = 'Structured Outline';
            }
            if (type === 'lesson-plan') {
                 const upToDateManifest = getAssetManifest(currentSessionHistory);
                 stepConfig.assetManifest = upToDateManifest;
            }
            const isLast = i === runnableResources.length - 1;
            const effectiveDokLevel = (batchConfig && batchConfig.quizConfig && batchConfig.quizConfig.dok) || dokLevel;
            const generationLanguageOverride = leveledTextLanguage === 'All Selected Languages' ? null : leveledTextLanguage;
            const generationDepsOverride = {
                // Full Pack can be invoked for roster groups while the React
                // render still contains the previous group's settings. These
                // values are explicit inputs for the dispatcher, not UI state.
                gradeLevel,
                leveledTextLanguage,
                studentInterests,
                dokLevel: effectiveDokLevel,
                selectedLanguages,
                targetStandards,
                useEmojis,
                textFormat,
                differentiationRange,
                differentiationTypes,
                differentiationCustomGrades,
                generationSignal: _fullPackSignal,
            };
            let resultItem = null;
            try {
                resultItem = await handleGenerate(type, generationLanguageOverride, !isLast, batchSourceText, stepConfig, false, generationDepsOverride);
                if (!isUsableGeneratedResource(resultItem, type)) throw new Error('handleGenerate returned an unusable ' + type + ' resource');
            } catch (error) {
                let finalError = error;
                resultItem = null;
                let failureReason = (finalError && (finalError.message || finalError.name)) || String(finalError);
                let failurePolicy = _fullPackFailurePolicy(failureReason);
                if (!_isFullPackAbort(finalError, _fullPackSignal) && failurePolicy.retryable) {
                    updateFullPackRun(prev => Object.assign({}, prev, { resources: Object.assign({}, prev.resources, { [resourceKey]: Object.assign({}, prev.resources && prev.resources[resourceKey], { status: 'retrying', attempts: 2, failureCategory: failurePolicy.category, suggestedDelayMs: failurePolicy.delayMs }) }) }));
                    warnLog('[FullPack] transient failure; retrying resource=' + type + ' afterMs=' + failurePolicy.delayMs + ' reason=' + failureReason);
                    try {
                        await _waitForFullPackDelay(failurePolicy.delayMs, _fullPackSignal);
                        resultItem = await handleGenerate(type, generationLanguageOverride, !isLast, batchSourceText, stepConfig, false, generationDepsOverride);
                        if (!isUsableGeneratedResource(resultItem, type)) throw new Error('handleGenerate retry returned an unusable ' + type + ' resource');
                    } catch (retryError) {
                        finalError = retryError;
                        resultItem = null;
                        failureReason = (finalError && (finalError.message || finalError.name)) || String(finalError);
                        failurePolicy = _fullPackFailurePolicy(failureReason);
                    }
                }
                if (!resultItem) {
                    const _resourceFinishedAt = new Date().toISOString();
                    const _resourceElapsedMs = Math.max(0, Date.now() - _resourceStartedAt);
                    if (_isFullPackAbort(finalError, _fullPackSignal)) {
                        updateFullPackRun(prev => Object.assign({}, prev, { resources: Object.assign({}, prev.resources, { [resourceKey]: Object.assign({}, prev.resources && prev.resources[resourceKey], { key: resourceKey, type, index: i, directive: directive || '', status: 'stopped', finishedAt: _resourceFinishedAt, elapsedMs: _resourceElapsedMs }) }) }));
                    } else {
                        const failure = {
                            type,
                            index: i,
                            reason: failureReason,
                            error: finalError,
                            category: failurePolicy.category,
                            retryable: failurePolicy.retryable,
                            suggestedDelayMs: failurePolicy.delayMs,
                            sourceTextChars: batchSourceText ? batchSourceText.length : 0,
                        };
                        fullPackFailures.push(failure);
                        recordFullPackFailure(failure);
                        updateFullPackRun(prev => Object.assign({}, prev, { resources: Object.assign({}, prev.resources, { [resourceKey]: Object.assign({}, prev.resources && prev.resources[resourceKey], { key: resourceKey, type, index: i, directive: directive || '', status: 'failed', reason: failure.reason, failureCategory: failure.category, retryable: failure.retryable, suggestedDelayMs: failure.suggestedDelayMs, finishedAt: _resourceFinishedAt, elapsedMs: _resourceElapsedMs }) }) }));
                    }
                }
            }
            if (resultItem) {
                updateFullPackRun(prev => Object.assign({}, prev, { resources: Object.assign({}, prev.resources, { [resourceKey]: Object.assign({}, prev.resources && prev.resources[resourceKey], { key: resourceKey, type, index: i, directive: directive || '', status: 'landed', resourceId: resultItem.id || null, finishedAt: new Date().toISOString(), elapsedMs: Math.max(0, Date.now() - _resourceStartedAt) }) }) }));
                currentSessionHistory.push(resultItem);
                if (resultItem.data) {
                    if (type === 'analysis') {
                        if (resultItem.data.originalText) {
                            batchSourceText = resultItem.data.originalText;
                        }
                        if (Array.isArray(resultItem.data.concepts) && lessonDNA.concepts.length === 0) {
                            lessonDNA.concepts = resultItem.data.concepts.slice(0, 5);
                        }
                    }
                    if (type === 'glossary') {
                        if (Array.isArray(resultItem.data) && lessonDNA.keyTerms.length === 0) {
                            lessonDNA.keyTerms = resultItem.data.slice(0, 8).map(t => t.term).filter(Boolean);
                        }
                    }
                    if (type === 'image') {
                        lessonDNA.visualContext = resultItem.data.prompt || resultItem.data.altText;
                    }
                    if (type === 'lesson-plan' && resultItem.data.essentialQuestion && !lessonDNA.essentialQuestion) {
                        lessonDNA.essentialQuestion = resultItem.data.essentialQuestion;
                    }
                }
            }
            if (!isLast && !(_fullPackSignal && _fullPackSignal.aborted)) await _waitForFullPackDelay(800, _fullPackSignal);
        }
        setPersistedLessonDNA(lessonDNA);
        const _fullPackStopped = !!(_fullPackSignal && _fullPackSignal.aborted);
        if (_fullPackStopped) {
            updateFullPackRun(prev => Object.assign({}, prev, { status: 'stopped', finishedAt: new Date().toISOString(), elapsedMs: Math.max(0, Date.now() - _fullPackStartedAt) }));
            addToast('Full Pack generation stopped. Finished resources were kept.', 'info');
        } else if (fullPackFailures.length > 0) {
            const failedTypes = fullPackFailures.map(f => f.type).join(', ');
            const partialMessage = `Full Pack finished with ${fullPackFailures.length} failed resource${fullPackFailures.length === 1 ? '' : 's'}: ${failedTypes}. See Diagnostics & Logs for details.`;
            updateFullPackRun(prev => Object.assign({}, prev, { status: 'partial', finishedAt: new Date().toISOString(), elapsedMs: Math.max(0, Date.now() - _fullPackStartedAt), failureCount: fullPackFailures.length }));
            warnLog('[FullPack] completed with failures=' + fullPackFailures.length + ' types=' + failedTypes);
            addToast(partialMessage, "warning");
        } else {
            updateFullPackRun(prev => Object.assign({}, prev, { status: 'completed', finishedAt: new Date().toISOString(), elapsedMs: Math.max(0, Date.now() - _fullPackStartedAt) }));
            addToast(t('process.pack_complete'), "success");
        }
    } catch (e) {
        if (_isFullPackAbort(e, _fullPackSignal)) {
            updateFullPackRun(prev => Object.assign({}, prev, { status: 'stopped', finishedAt: new Date().toISOString(), elapsedMs: Math.max(0, Date.now() - _fullPackStartedAt) }));
            addToast('Full Pack generation stopped. Finished resources were kept.', 'info');
        } else {
            updateFullPackRun(prev => Object.assign({}, prev, { status: 'failed', finishedAt: new Date().toISOString(), elapsedMs: Math.max(0, Date.now() - _fullPackStartedAt), reason: (e && (e.message || e.name)) || String(e) }));
            recordFullPackFailure({ type: 'run', index: 0, reason: (e && (e.message || e.name)) || String(e), error: e, sourceTextChars: batchSourceText ? batchSourceText.length : 0 });
            setError(t('errors.default_desc'));
            addToast(t('errors.default_desc'), "error");
        }
    } finally {
        setIsProcessing(false);
        if (_fullPackAbortCtl === _fullPackRunAbortCtl) _fullPackAbortCtl = null;
        if (_ownsFullPackAbort) _fullPackRunInFlight = false;
    }
    return true;
};

const handleComplexityAdjustment = async (deps) => {
  const { complexityLevel, generatedContent, gradeLevel, leveledTextLanguage, saveOriginalOnAdjust, generatedTerms, setIsProcessing, setGeneratedContent, setHistory, setError, setComplexityLevel, setWordSoundsCustomTerms, setWsPreloadedWords, callGemini, cleanJson, addToast, t, warnLog, extractSourceTextForProcessing, generateBilingualText, getDefaultTitle } = deps;
  try { if (window._DEBUG_GEN_HELPERS) console.log("[GenerationHelpers] handleComplexityAdjustment fired"); } catch(_) {}
    const supportedTypes = ['simplified', 'quiz', 'sentence-frames', 'glossary'];
    if (complexityLevel === 5 || !generatedContent || !supportedTypes.includes(generatedContent.type)) return;
    setIsProcessing(true);
    try {
        const isSimpler = complexityLevel < 5;
        const intensity = Math.abs(complexityLevel - 5);
        const splitReferenceTrailer = (value) => {
            const helpers = typeof window !== 'undefined' && window.AlloModules;
            const shared = helpers?.TextPipelineHelpers?.splitReferencesFromBody;
            const dispatcherSplit = helpers?.GenDispatcher?.splitAdaptationReferences;
            try {
                if (typeof shared === 'function') return shared(String(value || ''));
                if (typeof dispatcherSplit === 'function') return dispatcherSplit(String(value || ''));
            } catch (_) {}
            return { body: String(value || ''), references: '' };
        };
        const validateCitationsInOrder = (original, candidate) => {
            const helpers = typeof window !== 'undefined' && window.AlloModules;
            const dispatcherValidate = helpers?.GenDispatcher?.validateAdaptationCitationConservation;
            if (typeof dispatcherValidate === 'function') {
                return dispatcherValidate(original, candidate);
            }
            const pipeline = helpers?.TextPipelineHelpers;
            const hasPipelineValidator = typeof pipeline?.validateCitationConservation === 'function';
            const hasPipelineLedger = typeof pipeline?.extractCitationLedger === 'function';
            const citationShaped = /\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\(/.test(`${original}\n${candidate}`);
            if ((!hasPipelineValidator || !hasPipelineLedger) && citationShaped) {
                return {
                    valid: false,
                    ok: false,
                    reason: 'citation-validator-unavailable',
                    beforeCount: null,
                    afterCount: null,
                    orderChanged: false
                };
            }
            if (!hasPipelineValidator || !hasPipelineLedger) {
                return { valid: true, ok: true, beforeCount: 0, afterCount: 0, orderChanged: false };
            }
            const sharedResult = pipeline.validateCitationConservation(original, candidate);
            const originalOccurrences = pipeline.extractCitationLedger(original).occurrences || [];
            const candidateOccurrences = pipeline.extractCitationLedger(candidate).occurrences || [];
            const orderChanged = originalOccurrences.length !== candidateOccurrences.length
                || originalOccurrences.some((entry, index) => entry.key !== candidateOccurrences[index]?.key);
            return {
                ...sharedResult,
                valid: !!sharedResult.valid && !orderChanged,
                orderChanged,
                beforeCount: originalOccurrences.length,
                afterCount: candidateOccurrences.length
            };
        };
        let prompt = '';
        let jsonMode = false;
        let simplifiedCitationContext = null;
        let complexityCitationAudit = null;
        if (generatedContent.type === 'simplified') {
            const rawText = typeof generatedContent?.data === 'string' ? generatedContent?.data : '';
            const referenceParts = splitReferenceTrailer(rawText);
            const sourceExtraction = extractSourceTextForProcessing(referenceParts.body, false);
            const currentText = sourceExtraction.text;
            simplifiedCitationContext = {
                sourceBody: referenceParts.body,
                sourceTarget: currentText,
                references: referenceParts.references || '',
                wasBilingual: !!sourceExtraction.isBilingual
            };
            const direction = isSimpler ? "Simpler / Easier to read" : "More Complex / Academic / Rigorous";
            prompt = `
                Rewrite the following educational text.
                Goal: Make the text ${direction} relative to its current version.
                Intensity of Change: ${intensity} out of 5 (1=Slight adjustment, 5=Major revision).
                Target Audience: ${gradeLevel} students.
                Instructions:
                - Keep the same topic and core information.
                - ${isSimpler ? "Shorten sentences, reduce vocabulary difficulty, focus on clarity." : "Increase sentence variety, use more precise academic vocabulary, add nuance."}
                - Write the rewritten text in ${leveledTextLanguage}.
                - Preserve every inline citation exactly, including its superscript number, URL, occurrence count, and order.
                - Do not produce a Sources, References, Bibliography, or Works Cited section; AlloFlow appends the preserved reference trailer after validation.
                Current Text:
                "${currentText}"
            `;
        }
        else if (generatedContent.type === 'glossary') {
            jsonMode = true;
            const cleanGlossary = generatedContent?.data.map(({ image, ...rest }) => rest);
            const currentData = JSON.stringify(cleanGlossary);
            const direction = isSimpler ? "Simpler definitions / Basic vocabulary" : "More detailed / Academic definitions";
            prompt = `
                Rewrite the definitions in the following glossary to adjust their complexity.
                Goal: Make definitions ${direction}.
                Intensity: ${intensity} out of 5.
                Target Audience: ${gradeLevel} students.
                Current Glossary: ${currentData}
                Instructions:
                - Keep the exact same terms.
                - ${isSimpler ? "Simplify definitions to be very short and use common words." : "Expand definitions with more precise academic language and context."}
                - Maintain the exact JSON structure (Array of objects).
                - IMPORTANT: If translations exist, adjust them to match the new complexity level of the English definition.
                Return ONLY JSON matching the input structure exactly.
            `;
        }
        else if (generatedContent.type === 'quiz') {
            jsonMode = true;
            const currentQuestions = JSON.stringify(generatedContent?.data.questions);
            const direction = isSimpler ? "Easier / Lower DOK" : "Harder / Higher DOK";
            prompt = `
                Rewrite the following quiz questions to adjust their difficulty level.
                Goal: Make questions ${direction}.
                Intensity: ${intensity} out of 5.
                Target Audience: ${gradeLevel} students.
                Current Questions: ${currentQuestions}
                Instructions:
                - ${isSimpler ? "Simplify vocabulary, focus on direct recall (DOK 1), ensure distractors are clearly incorrect/distinct." : "Increase vocabulary rigor, focus on inference/analysis (DOK 2-3), make distractors more plausible to test deep understanding."}
                - Keep the same number of questions.
                - Maintain the exact JSON structure.
                ${leveledTextLanguage !== 'English' ? `Ensure translations (suffix _en) match the new difficulty.` : ''}
                Return ONLY JSON: { "questions": [...] }
            `;
        }
        else if (generatedContent.type === 'sentence-frames') {
            jsonMode = true;
            const currentData = JSON.stringify(generatedContent?.data);
            const direction = isSimpler ? "More Supportive (Heavy Scaffolding)" : "Less Supportive (Open-ended)";
            prompt = `
                Modify the following writing scaffolds.
                Goal: Provide ${direction}.
                Intensity: ${intensity} out of 5.
                Target Audience: ${gradeLevel} students.
                Current Scaffolds: ${currentData}
                Instructions:
                - ${isSimpler ? "Provide longer sentence starters, include specific prompts/clues within the blanks, guide the student's thought process rigidly." : "Shorten starters to just the first word or phrase, remove internal clues, allow for more independent critical thinking."}
                - Maintain the existing format (List or Paragraph Frame).
                ${leveledTextLanguage !== 'English' ? `Ensure translations match the new structure.` : ''}
                Return ONLY JSON matching the input structure exactly.
            `;
        }
        let result = (!jsonMode && generatedContent.type === 'simplified')
            ? await generateBilingualText(prompt, leveledTextLanguage, callGemini)
            : await callGemini(prompt, jsonMode);
        if (generatedContent.type === 'simplified' && simplifiedCitationContext) {
            const candidateParts = splitReferenceTrailer(result);
            const candidateBody = candidateParts.body.trim();
            const candidateExtraction = extractSourceTextForProcessing(candidateBody, false);
            const candidateTarget = candidateExtraction.targetLangBlock || candidateExtraction.text;
            const originalForValidation = simplifiedCitationContext.wasBilingual
                ? simplifiedCitationContext.sourceBody
                : simplifiedCitationContext.sourceTarget;
            const candidateForValidation = simplifiedCitationContext.wasBilingual
                ? candidateBody
                : candidateTarget;
            let conservation = validateCitationsInOrder(originalForValidation, candidateForValidation);
            const shouldValidateGeneratedEnglish = !simplifiedCitationContext.wasBilingual
                && (candidateExtraction.isBilingual || String(leveledTextLanguage || '').trim().toLowerCase() !== 'english');
            if (shouldValidateGeneratedEnglish) {
                const englishConservation = validateCitationsInOrder(
                    candidateTarget,
                    candidateExtraction.isBilingual ? candidateExtraction.englishBlock : ''
                );
                conservation = {
                    ...conservation,
                    valid: !!conservation.valid && !!englishConservation.valid,
                    ok: !!conservation.valid && !!englishConservation.valid,
                    beforeCount: Number(conservation.beforeCount || 0) + Number(englishConservation.beforeCount || 0),
                    afterCount: Number(conservation.afterCount || 0) + Number(englishConservation.afterCount || 0),
                    orderChanged: !!conservation.orderChanged || !!englishConservation.orderChanged,
                    english: englishConservation
                };
            }
            complexityCitationAudit = {
                stage: 'complexity-adjustment',
                valid: !!conservation.valid,
                beforeCount: Number(conservation.beforeCount ?? conservation.originalLedger?.occurrences?.length ?? 0),
                afterCount: Number(conservation.afterCount ?? conservation.candidateLedger?.occurrences?.length ?? 0),
                orderChanged: !!conservation.orderChanged
            };
            if (!conservation.valid) {
                const citationError = new Error('Complexity adjustment changed source citations.');
                citationError.code = 'citation-conservation-failed';
                citationError.details = conservation;
                throw citationError;
            }
            result = [
                candidateBody,
                simplifiedCitationContext.references
            ].filter(Boolean).join('\n\n');
        }
        let updatedData;
        if (jsonMode) {
            const parsed = JSON.parse(cleanJson(result));
            if (generatedContent.type === 'quiz') {
                updatedData = { ...generatedContent?.data, questions: parsed.questions };
            } else if (generatedContent.type === 'glossary') {
                updatedData = parsed.map((item, index) => {
                    const originalItem = generatedContent?.data.find(o => o.term === item.term) || generatedContent?.data[index];
                    return {
                        ...item,
                        image: originalItem?.image,
                        isSelected: originalItem?.isSelected
                    };
                });
            } else {
                updatedData = { ...generatedContent?.data, ...parsed };
            }
        } else {
            updatedData = result;
        }
        const changeLabel = generatedContent.type === 'sentence-frames'
            ? (isSimpler ? 'More Support' : 'Less Support')
            : (isSimpler ? 'Adapted' : 'Increased Rigor');
        const priorConfig = generatedContent.config && typeof generatedContent.config === 'object'
            ? generatedContent.config
            : {};
        const priorAudit = priorConfig.citationAudit && typeof priorConfig.citationAudit === 'object'
            ? priorConfig.citationAudit
            : null;
        const adjustedConfig = {
            ...priorConfig,
            ...(complexityCitationAudit ? {
                citationAudit: {
                    ...(priorAudit || {
                        version: 1,
                        policy: 'exact-marker-order',
                        enabled: complexityCitationAudit.beforeCount > 0,
                        status: 'valid',
                        fallbackCount: 0
                    }),
                    stages: [...(Array.isArray(priorAudit?.stages) ? priorAudit.stages : []), complexityCitationAudit]
                }
            } : {})
        };
        if (saveOriginalOnAdjust) {
            const newItem = {
                ...generatedContent,
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                data: updatedData,
                title: `${generatedContent.title || getDefaultTitle(generatedContent.type)} (${changeLabel})`,
                timestamp: new Date(),
                config: adjustedConfig
            };
            if (newItem.levelCheck) delete newItem.levelCheck;
            if (newItem.alignmentCheck) delete newItem.alignmentCheck;
            setGeneratedContent(newItem); setWordSoundsCustomTerms(generatedTerms); setWsPreloadedWords(generatedTerms);
            setHistory(prev => [...prev, newItem]);
            addToast(t('toasts.saved_new_version', { label: changeLabel }), "success");
        } else {
            const updatedContent = { ...generatedContent, data: updatedData, config: adjustedConfig };
            if (updatedContent.levelCheck) delete updatedContent.levelCheck;
            if (updatedContent.alignmentCheck) delete updatedContent.alignmentCheck;
            setGeneratedContent(updatedContent);
            setHistory(prev => prev.map(item => item.id === generatedContent.id ? updatedContent : item));
            addToast(t('toasts.adjusted_version', { label: changeLabel }), "success");
        }
    } catch (err) {
        if (err?.code === 'citation-conservation-failed') {
            warnLog('[CitationConservation] Complexity adjustment rejected; original resource retained.', err.details || err);
            addToast('The adjustment changed a source citation, so the original citation-safe version was retained.', 'warning');
            return;
        }
        warnLog("Unhandled error:", err);
        setError(t('errors.complexity_adjustment_failed'));
        addToast(t('toasts.adjustment_failed'), "error");
    } finally {
        setIsProcessing(false);
        setComplexityLevel(5);
    }
};

const handlePlanFullPack = async (deps) => handleGenerateFullPack({ __fullPackPreflightOnly: true }, deps);

const handleApproveFullPack = async (priorRun, deps) => {
  const run = priorRun && typeof priorRun === 'object' ? priorRun : null;
  if (!run || run.status !== 'ready') {
    try { if (deps && typeof deps.addToast === 'function') deps.addToast('Create or refresh the Full Pack plan before generating.', 'info'); } catch (_) {}
    return false;
  }
  const planSummaries = run.targetMode === 'all-groups'
    ? Object.values(run.groups || {}).map(group => group && group.preflight).filter(Boolean)
    : [run.preflight].filter(Boolean);
  const incompatiblePlan = planSummaries.some(plan => plan.planSchemaVersion !== FULL_PACK_PLAN_SCHEMA_VERSION || plan.capabilityFingerprint !== FULL_PACK_CAPABILITY_FINGERPRINT);
  if (incompatiblePlan) {
    try { if (deps && typeof deps.addToast === 'function') deps.addToast('This Full Pack plan was created by an older generator. Refresh the plan before generating.', 'warning'); } catch (_) {}
    return false;
  }
  const snapshot = run.settingsSnapshot && typeof run.settingsSnapshot === 'object' ? run.settingsSnapshot : {};
  const approvedDeps = Object.assign({}, deps || {}, snapshot, {
    isProcessing: false,
    fullPackTargetGroup: run.targetMode === 'all-groups' ? 'all' : 'none',
  });
  return handleGenerateFullPack({ __fullPackApprovedRun: run }, approvedDeps);
};

const handleRetryFailedFullPack = async (priorRun, deps) => {
  const run = priorRun && typeof priorRun === 'object' ? priorRun : null;
  const isRetryable = item => item && ['failed', 'interrupted', 'stopped'].includes(item.status) && item.retryable !== false;
  const failed = run ? Object.values(run.resources || {}).filter(isRetryable) : [];
  const affectedGroups = run ? Object.entries(run.groups || {}).filter(([, group]) =>
    group && Object.values(group.resources || {}).some(isRetryable)) : [];
  if (!run || (failed.length === 0 && affectedGroups.length === 0)) {
    try { if (deps && typeof deps.addToast === 'function') deps.addToast('There are no failed or interrupted Full Pack resources to retry.', 'info'); } catch (_) {}
    return false;
  }
  if (affectedGroups.length > 0) {
    const retryGroups = Object.fromEntries(affectedGroups.map(([gid, group]) => [gid, group]));
    const rosterGroups = Object.fromEntries(affectedGroups.map(([gid, group]) => [gid, {
      name: group.groupName || gid,
      profile: group.settingsSnapshot || {},
    }]));
    const retryDeps = Object.assign({}, deps || {}, {
      isProcessing: false,
      fullPackTargetGroup: 'all',
      rosterKey: Object.assign({}, deps && deps.rosterKey || {}, { groups: rosterGroups }),
    });
    return handleGenerateFullPack({ __fullPackGroupRetryRun: Object.assign({}, run, { groups: retryGroups }) }, retryDeps);
  }
  const snapshot = run.settingsSnapshot && typeof run.settingsSnapshot === 'object' ? run.settingsSnapshot : {};
  const retryDeps = Object.assign({}, deps || {}, snapshot, { isProcessing: false, fullPackTargetGroup: 'none' });
  return handleGenerateFullPack({ __fullPackRetryRun: run }, retryDeps);
};window.AlloModules = window.AlloModules || {};
window.AlloModules.GenerationHelpers = {
  handleGenerateMath,
  handleGenerateFullPack,
  handlePlanFullPack,
  handleApproveFullPack,
  handleRetryFailedFullPack,
  handleStopFullPack,
  handleComplexityAdjustment,
};
