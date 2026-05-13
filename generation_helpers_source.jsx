// generation_helpers_source.jsx - Phase H.2 of CDN modularization.
// handleGenerateMath + handleGenerateFullPack + handleComplexityAdjustment
// extracted from AlloFlowANTI.txt 2026-04-25.

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
                ` : 'Optionally, you can enable STEM Lab manipulatives by returning objects in "manipulativeSupport" (to pre-load scaffolding) or "manipulativeResponse" (to grade the student\'s physical configuration instead of typed text). Supported tools are "coordinate", "base10", "numberline", "fractions", "volume", and "protractor".'}
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
                    - If Math/Physics/Economics: Generate a self-contained SVG graph (plots, curves, geometry) in the "graphData" field.
                    - If Biology/Earth Science: Generate a self-contained SVG diagram (e.g. Punnett Square, Water Cycle Flowchart, Cell Structure) in the "graphData" field.
                    - If Computer Science: Generate an SVG Flowchart or Logic Gate diagram in "graphData".
                    - Keep SVG code clean, minimal, responsive (viewBox), and use standard colors.
                ` : ''}
                Return ONLY JSON in the following format:
                {
                  "problem": "Clean Latex string of the input WITHOUT any leading directive verb (no 'Simplify:' / 'Solve:' prefix — the renderer prepends from taskType).",
                  "taskType": "REQUIRED. One of: 'simplify', 'solve', 'evaluate', 'factor', 'graph', 'compute', 'word_problem', 'prove', 'convert'. Pick the action the student is being asked to perform on this single problem.",
                  "answer": "Final Answer string",
                  "steps": [{ "explanation": "Step explanation", "latex": "Step math in Latex" }],
                  "graphData": "SVG string or null",
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
  const { isProcessing, fullPackTargetGroup, rosterKey, gradeLevel, leveledTextLanguage, studentInterests, dokLevel, leveledTextCustomInstructions, selectedLanguages, targetStandards, useEmojis, textFormat, history, inputText, sourceTopic, standardsInput, resourceCount, isAutoConfigEnabled, quizCustomInstructions, adventureCustomInstructions, frameCustomInstructions, brainstormCustomInstructions, faqCustomInstructions, outlineCustomInstructions, visualCustomInstructions, timelineTopic, lessonCustomAdditions, conceptInput, setIsProcessing, setGenerationStep, setFullPackTargetGroup, setGradeLevel, setLeveledTextLanguage, setStudentInterests, setDokLevel, setLeveledTextCustomInstructions, setSelectedLanguages, setTargetStandards, setUseEmojis, setTextFormat, setPersistedLessonDNA, setError, addToast, t, warnLog, handleApplyRosterGroup, handleGenerate, autoConfigureSettings, applyDetailedAutoConfig, getGroupDifferentiationContext, getAssetManifest } = deps;
  try { if (window._DEBUG_GEN_HELPERS) console.log("[GenerationHelpers] handleGenerateFullPack fired"); } catch(_) {}
    if (isProcessing) return;
    const targetGroup = fullPackTargetGroup;
    if (targetGroup === 'all' && rosterKey?.groups && Object.keys(rosterKey.groups).length > 0) {
        const groupEntries = Object.entries(rosterKey.groups);
        const savedSettings = {
            grade: gradeLevel, lang: leveledTextLanguage, interests: studentInterests,
            dok: dokLevel, custom: leveledTextCustomInstructions,
            selectedLangs: selectedLanguages, standards: targetStandards,
            emojis: useEmojis, fmt: textFormat
        };
        setIsProcessing(true);
        try {
            for (let gi = 0; gi < groupEntries.length; gi++) {
                const [gid, group] = groupEntries[gi];
                setGenerationStep(`Generating full pack for ${group.name} (${gi+1}/${groupEntries.length})...`);
                handleApplyRosterGroup(gid);
                await new Promise(r => setTimeout(r, 150));
                setFullPackTargetGroup('none');
                setIsProcessing(false);
                await handleGenerateFullPack(chatContextOverride, deps);
            }
            addToast(`Generated full packs for ${groupEntries.length} groups!`, 'success');
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
            setFullPackTargetGroup('none');
        }
        return;
    }
    if (targetGroup !== 'none' && rosterKey?.groups?.[targetGroup]) {
        handleApplyRosterGroup(targetGroup);
        await new Promise(r => setTimeout(r, 100));
    }
    const latestAnalysis = history.slice().reverse().find(h => h && h.type === 'analysis');
    let batchSourceText = (latestAnalysis && latestAnalysis.data && latestAnalysis.data.originalText)
        ? latestAnalysis.data.originalText
        : inputText.trim();
    if (!batchSourceText) {
        addToast(t('process.source_missing'), "error");
        return;
    }
    setIsProcessing(true);
    setGenerationStep(t('fullpack.status_init'));
    addToast(t('fullpack.status_start'), "info");
    try {
        const lessonDNA = {
            grade: gradeLevel,
            topic: sourceTopic || "General Topic",
            standard: standardsInput,
            concepts: [],
            keyTerms: [],
            visualContext: "",
            essentialQuestion: "",
        };
        let batchConfig = {};
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
        if (resourceCount === 'Auto' || resourceCount === 'All') {
             const hasAnalysis = history.some(h => h.type === 'analysis');
             if (!hasAnalysis) {
                 resourcesToGen.unshift({ type: 'analysis', directive: "Essential verification step." });
             }
        }
        const existingTypes = history.map(h => h.type);
        if (isAutoConfigEnabled) {
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
                resourceCount
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
        let currentSessionHistory = [...history];
        addToast(t('process.gen_batch', { count: resourcesToGen.length }), "info");
        for (let i = 0; i < resourcesToGen.length; i++) {
            const { type, directive } = resourcesToGen[i];
            if (type === 'timeline' && batchConfig.hasTimeline === false) continue;
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
                case 'concept-sort': userOverride = conceptInput; break;
            }
            const combinedInstructions = `${directive} ${userOverride ? `(User Note: ${userOverride})` : ''}`.trim();
            const stepConfig = {
                ...batchConfig,
                lessonDNA: lessonDNA,
                customInstructions: combinedInstructions,
                historyOverride: currentSessionHistory
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
            const isLast = i === resourcesToGen.length - 1;
            const resultItem = await handleGenerate(type, null, !isLast, batchSourceText, stepConfig, false);
            if (resultItem) {
                currentSessionHistory.push(resultItem);
                if (resultItem.data) {
                    if (type === 'analysis') {
                        if (resultItem.data.originalText) {
                            batchSourceText = resultItem.data.originalText;
                        }
                        if (resultItem.data.concepts && Array.isArray(resultItem.data.concepts)) {
                            lessonDNA.concepts = resultItem.data.concepts.slice(0, 5);
                        }
                    }
                    if (type === 'glossary') {
                        if (Array.isArray(resultItem.data)) {
                            lessonDNA.keyTerms = resultItem.data.slice(0, 8).map(t => t.term);
                        }
                    }
                    if (type === 'image') {
                        lessonDNA.visualContext = resultItem.data.prompt || resultItem.data.altText;
                    }
                    if (type === 'lesson-plan') {
                        lessonDNA.essentialQuestion = resultItem.data.essentialQuestion;
                    }
                }
            }
            if (!isLast) await new Promise(r => setTimeout(r, 800));
        }
        setPersistedLessonDNA(lessonDNA);
        addToast(t('process.pack_complete'), "success");
        setTimeout(() => {
             addToast(t('toasts.support_kofi'), "info");
        }, 3500);
    } catch (e) {
        warnLog("Full pack generation interrupted", e);
        setError(t('errors.default_desc'));
    } finally {
        setIsProcessing(false);
    }
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
        let prompt = '';
        let jsonMode = false;
        if (generatedContent.type === 'simplified') {
            const rawText = typeof generatedContent?.data === 'string' ? generatedContent?.data : '';
            const { text: currentText } = extractSourceTextForProcessing(rawText, false);
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
        const result = (!jsonMode && generatedContent.type === 'simplified')
            ? await generateBilingualText(prompt, leveledTextLanguage, callGemini)
            : await callGemini(prompt, jsonMode);
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
        if (saveOriginalOnAdjust) {
            const newItem = {
                ...generatedContent,
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                data: updatedData,
                title: `${generatedContent.title || getDefaultTitle(generatedContent.type)} (${changeLabel})`,
                timestamp: new Date(),
                config: {}
            };
            if (newItem.levelCheck) delete newItem.levelCheck;
            if (newItem.alignmentCheck) delete newItem.alignmentCheck;
            setGeneratedContent(newItem); setWordSoundsCustomTerms(generatedTerms); setWsPreloadedWords(generatedTerms);
            setHistory(prev => [...prev, newItem]);
            addToast(t('toasts.saved_new_version', { label: changeLabel }), "success");
        } else {
            const updatedContent = { ...generatedContent, data: updatedData };
            if (updatedContent.levelCheck) delete updatedContent.levelCheck;
            if (updatedContent.alignmentCheck) delete updatedContent.alignmentCheck;
            setGeneratedContent(updatedContent);
            setHistory(prev => prev.map(item => item.id === generatedContent.id ? updatedContent : item));
            addToast(t('toasts.adjusted_version', { label: changeLabel }), "success");
        }
    } catch (err) {
        warnLog("Unhandled error:", err);
        setError(t('errors.complexity_adjustment_failed'));
        addToast(t('toasts.adjustment_failed'), "error");
    } finally {
        setIsProcessing(false);
        setComplexityLevel(5);
    }
};

window.AlloModules = window.AlloModules || {};
window.AlloModules.GenerationHelpers = {
  handleGenerateMath,
  handleGenerateFullPack,
  handleComplexityAdjustment,
};
