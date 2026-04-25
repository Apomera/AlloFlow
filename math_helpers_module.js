(function() {
'use strict';
if (window.AlloModules && window.AlloModules.MathHelpersModule) { console.log('[CDN] MathHelpersModule already loaded, skipping'); return; }
// math_helpers_source.jsx - Phase I.2 of CDN modularization.
// 5 math-related handlers extracted as a standalone module.

const handleCheckMathWork = async (resourceId, problemIdx, question, correctAnswer, steps, studentWork, deps) => {
  const { mathCheckResults, mathHintData, setMathCheckResults, addToast, t, callGemini, warnLog, handleScoreUpdate } = deps;
  try { if (window._DEBUG_MATH_HELPERS) console.log("[MathHelpers] handleCheckMathWork fired"); } catch(_) {}
      if (!studentWork || studentWork.trim().length < 5) {
          addToast(t('math.check.too_short') || 'Please write more before checking!', 'info');
          return;
      }
      const existing = mathCheckResults[resourceId]?.[problemIdx];
      if (existing?.checking) return;
      const studentNumericMatch = parseFloat(studentWork.replace(/[^0-9.\-]/g, ''));
      const correctNumericMatch = parseFloat(String(correctAnswer).replace(/[^0-9.\-]/g, ''));
      if (!isNaN(studentNumericMatch) && !isNaN(correctNumericMatch) && Math.abs(studentNumericMatch - correctNumericMatch) < 0.01) {
        setMathCheckResults(prev => ({
            ...prev,
            [resourceId]: {
                ...(prev[resourceId] || {}),
                [problemIdx]: { checking: false, verdict: 'correct', score: 100, feedback: 'Perfect! Your answer is exactly right. ✅', checked: true, xpAwarded: true, fastPath: true }
            }
        }));
        addToast(t('math.check.correct') || 'Correct! Great work! 🎉', 'success');
        return;
      }
      setMathCheckResults(prev => ({
          ...prev,
          [resourceId]: {
              ...(prev[resourceId] || {}),
              [problemIdx]: { checking: true, verdict: null, score: 0, feedback: '' }
          }
      }));
      try {
          const stepsText = (steps || []).map((s, i) => `Step ${i+1}: ${s.explanation}${s.latex ? ' (' + s.latex + ')' : ''}`).join('\n');
          const prompt = `You are a patient, encouraging math teacher evaluating a student's work.
PROBLEM: ${question}
CORRECT ANSWER: ${correctAnswer}
${stepsText ? 'SOLUTION STEPS:\n' + stepsText : ''}
STUDENT'S RESPONSE:
${studentWork}
Evaluate the student's work. Consider:
1. Is the final answer correct or close?
2. Did the student show reasonable work/reasoning?
3. Are there any conceptual misunderstandings?
Return ONLY valid JSON:
{
  "verdict": "correct" | "partial" | "incorrect",
  "score": <number 0-100>,
  "feedback": "<2-3 sentences of encouraging, specific feedback. If incorrect, hint at the right approach without giving the answer. If partial, acknowledge what's right and guide toward completion.>"
}`;
          const result = await callGemini(prompt, true);
          let parsed;
          try {
              const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
              parsed = JSON.parse(cleaned);
          } catch (parseErr) {
              const jsonMatch = result.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                  parsed = JSON.parse(jsonMatch[0]);
              } else {
                  throw new Error('Could not parse evaluation response');
              }
          }
          const verdict = parsed.verdict || 'incorrect';
          const score = Math.max(0, Math.min(100, parsed.score || 0));
          const feedback = parsed.feedback || 'Keep trying!';
          setMathCheckResults(prev => ({
              ...prev,
              [resourceId]: {
                  ...(prev[resourceId] || {}),
                  [problemIdx]: { checking: false, verdict, score, feedback, checked: true, hintsUsed: (mathHintData[`${resourceId}_${problemIdx}`]?.count || 0), xpAwarded: (!mathCheckResults[resourceId]?.[problemIdx]?.xpAwarded && Math.round(score / 10) > 0) || mathCheckResults[resourceId]?.[problemIdx]?.xpAwarded || false }
              }
          }));
          const hintKey = `${resourceId}_${problemIdx}`; const hintsUsed = (mathHintData[hintKey]?.count || 0); const hintMultiplier = Math.max(0.25, 1 - (hintsUsed * 0.25)); const xpAwarded = Math.round((score / 10) * hintMultiplier);
          const alreadyAwarded = mathCheckResults[resourceId]?.[problemIdx]?.xpAwarded;
          if (xpAwarded > 0 && !alreadyAwarded) {
              handleScoreUpdate(xpAwarded, "Math Problem", resourceId);
          }
          const toastMsg = verdict === 'correct' ? (t('math.check.correct') || 'Excellent work! ✨')
              : verdict === 'partial' ? (t('math.check.partial') || 'Good effort, keep going! 🟡')
              : (t('math.check.incorrect') || 'Not quite right — try again! 💪');
          addToast(toastMsg, verdict === 'correct' ? 'success' : verdict === 'partial' ? 'info' : 'warning');
      } catch (err) {
          warnLog("Math check failed:", err);
          setMathCheckResults(prev => ({
              ...prev,
              [resourceId]: {
                  ...(prev[resourceId] || {}),
                  [problemIdx]: { checking: false, verdict: 'error', score: 0, feedback: t('math.check.error') || 'Could not evaluate — please try again.', checked: false }
              }
          }));
          addToast(t('math.check.error') || 'Evaluation failed — try again', 'error');
      }
};

const handleGetMathHint = async (resourceId, problemIdx, question, correctAnswer, steps, deps) => {
  const { mathHintData, studentResponses, setMathHintData, addToast, callGemini, warnLog } = deps;
  try { if (window._DEBUG_MATH_HELPERS) console.log("[MathHelpers] handleGetMathHint fired"); } catch(_) {}
    const hintKey = `${resourceId}_${problemIdx}`;
    const existing = mathHintData[hintKey] || { hints: [], loading: false, count: 0 };
    if (existing.loading || existing.count >= 3) return;
    setMathHintData(prev => ({ ...prev, [hintKey]: { ...existing, loading: true } }));
    try {
        const hintLevel = existing.count + 1;
        const prevHints = existing.hints.map((h, i) => `Hint ${i + 1}: ${h}`).join('\n');
        const studentWork = studentResponses[resourceId]?.[problemIdx] || '';
        const prompt = `You are a patient math tutor giving a hint for a problem.
PROBLEM: ${question}
CORRECT ANSWER: ${correctAnswer}
${steps ? 'SOLUTION STEPS:\n' + steps.map((s, i) => 'Step ' + (i + 1) + ': ' + s.explanation).join('\n') : ''}
${studentWork ? 'STUDENT WORK SO FAR: ' + studentWork : 'Student has not started yet.'}
${prevHints ? 'PREVIOUS HINTS GIVEN:\n' + prevHints : ''}
Give HINT #${hintLevel} of 3 (progressive difficulty):
- Hint 1: A gentle nudge about what strategy or concept to use. Do NOT reveal numbers or the answer.
- Hint 2: More specific guidance â€” point to the key step or operation needed. Still don't give the answer.
- Hint 3: Walk through the first step explicitly and set up the equation. Stop just before the final answer.
Return ONLY the hint text as a single paragraph (no JSON, no markdown). Keep it under 2 sentences. Be encouraging.`;
        const hintText = await callGemini(prompt, true);
        const cleanHint = hintText.replace(/```/g, '').replace(/^["']|["']$/g, '').trim();
        setMathHintData(prev => ({
            ...prev,
            [hintKey]: {
                hints: [...existing.hints, cleanHint],
                loading: false,
                count: existing.count + 1
            }
        }));
        addToast(existing.count === 0 ? 'Hint unlocked! 💡 (-25% max XP)' : existing.count === 1 ? 'Second hint! 💡 (-50% max XP)' : 'Final hint! 💡 (-75% max XP)', 'info');
    } catch (err) {
        warnLog("Hint generation failed:", err);
        setMathHintData(prev => ({ ...prev, [hintKey]: { ...existing, loading: false } }));
        addToast('Could not generate hint â€” try again', 'error');
    }
};

const handleMathEdit = async (editInstruction, deps) => {
  const { generatedContent, leveledTextLanguage, gradeLevel, mathSubject, setIsMathEditingChat, setGeneratedContent, setMathEditInput, callGemini, cleanJson, safeJsonParse, addToast, warnLog } = deps;
  try { if (window._DEBUG_MATH_HELPERS) console.log("[MathHelpers] handleMathEdit fired"); } catch(_) {}
      if (!editInstruction.trim() || !generatedContent?.data?.problems) return;
      setIsMathEditingChat(true);
      try {
          const currentProblems = generatedContent.data.problems.map((p, i) =>
              `Problem ${i+1} [${p.taskType || 'simplify'}]: ${p.question} (Answer: ${p.answer})`
          ).join("\n");
          const prompt = `
              You are an Expert Math Curriculum Designer.
              ${leveledTextLanguage && leveledTextLanguage !== 'English' ? 'IMPORTANT: Generate ALL text content (questions, explanations, steps, real-world applications) in ' + leveledTextLanguage + '. After each text field, include an English translation in parentheses. Keep mathematical expressions and JSON keys in English.' : ''}
              A teacher has an existing problem set and wants to modify it.

              CURRENT PROBLEMS (the [bracket] tag is the taskType — preserve unless edit specifically changes the action):
              ${currentProblems}

              TEACHER'S EDIT REQUEST: "${editInstruction}"
              Grade Level: ${gradeLevel}
              Subject: ${mathSubject}

              INSTRUCTIONS:
              Apply the teacher's requested changes to the problem set.
              This may include: making problems easier/harder, adding more problems,
              changing topics, adjusting difficulty, adding specific problem types,
              changing the theme/context, or any other modification.
              Keep problems the teacher didn't mention unchanged unless the edit applies to all.
              The "question" field must NOT include a leading directive verb (no "Simplify:" / "Solve:") — the renderer prepends it from taskType.

              Return ONLY the MODIFIED problem set as JSON:
              {
                "title": "Modified Problem Set",
                "problems": [
                  {
                    "question": "Problem text without leading directive...",
                    "taskType": "simplify | solve | evaluate | factor | graph | compute | word_problem | prove | convert",
                    "expression": "Math expression",
                    "answer": "The answer",
                    "steps": [{ "explanation": "Clear step-by-step explanation", "latex": "Math expression" }],
                    "realWorld": "1-2 sentence real-life connection — name a specific career or situation, NOT a word problem restatement"
                  }
                ],
                "graphData": null
              }
          `;
          const result = await callGemini(prompt, true);
          let cleaned = cleanJson(result);
          let rawContent = safeJsonParse(result);
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
          if (!rawContent) throw new Error("Parse failed after all strategies");
          const normalizeSteps = (steps) => {
              if (!Array.isArray(steps)) return [];
              return steps.map(s => typeof s === "string" ? { explanation: s, latex: "" } : s);
          };
          const VALID_TT = new Set(['simplify','solve','evaluate','factor','graph','compute','word_problem','prove','convert']);
          const normTaskType = (raw, fallback) => {
              const t = (raw || '').toString().trim().toLowerCase();
              if (VALID_TT.has(t)) return t;
              return VALID_TT.has(fallback) ? fallback : 'simplify';
          };
          const normalizedContent = {
              title: rawContent.title || generatedContent.data.title || "Modified Problems",
              problems: (rawContent.problems || []).map((p, i) => ({
                  ...p,
                  taskType: normTaskType(p.taskType, generatedContent.data.problems?.[i]?.taskType),
                  steps: normalizeSteps(p.steps)
              })),
              graphData: rawContent.graphData || generatedContent.data.graphData || null
          };
          setGeneratedContent(prev => ({ ...prev, data: normalizedContent }));
          addToast(`✏️ Problems updated: "${editInstruction.substring(0, 40)}..."`, "success");
          setMathEditInput("");
      } catch (e) {
          warnLog("Math Edit Error:", e);
          addToast("Failed to modify problems — try rephrasing your request", "error");
      } finally {
          setIsMathEditingChat(false);
      }
};

const handleGenerateSimilar = async (deps) => {
  const { generatedContent, setIsProcessing, setMathInput, addToast, t, callGemini, warnLog, handleGenerateMath } = deps;
  try { if (window._DEBUG_MATH_HELPERS) console.log("[MathHelpers] handleGenerateSimilar fired"); } catch(_) {}
      const firstProblem = generatedContent?.data?.problems?.[0]?.question;
      if (!firstProblem) return;
      setIsProcessing(true);
      addToast(t('math.creating_variation'), "info");
      try {
          const prompt = `
            Create a single new math problem that is a variation of this one with different numbers.
            Keep the difficulty and concept identical.
            Original Problem: "${firstProblem}",
            Return ONLY the raw text of the new problem. No intro/outro.
          `;
          const newProblem = await callGemini(prompt);
          const cleanProblem = newProblem.trim();
          setMathInput(cleanProblem);
          await handleGenerateMath(cleanProblem);
      } catch (e) {
          warnLog("Similar Problem Error:", e);
          addToast(t('math.error_variation'), "error");
          setIsProcessing(false);
      }
};

const handleGenerateOutcome = async (deps) => {
  const { generatedContent, setIsProcessing, setGenerationStep, setError, addToast, t, callGemini, warnLog, handleAddToMapList } = deps;
  try { if (window._DEBUG_MATH_HELPERS) console.log("[MathHelpers] handleGenerateOutcome fired"); } catch(_) {}
      if (!generatedContent || generatedContent.type !== 'outline') return;
      const branches = generatedContent?.data?.branches || [];
      const problems = branches.filter(b => b.title.toLowerCase().includes('problem') || b.title.toLowerCase().includes('challenge'));
      const solutions = branches.filter(b => !b.title.toLowerCase().includes('problem') && !b.title.toLowerCase().includes('challenge') && !b.title.toLowerCase().includes('outcome'));
      const problemText = problems.map(b => `${b.title}: ${b.items.join(', ')}`).join('\n');
      const solutionText = solutions.map(b => `Solution: ${b.title} (${b.items.join(', ')})`).join('\n');
      if (!problemText && !solutionText) {
          addToast(t('errors.no_context_for_outcome'), "error");
          return;
      }
      setIsProcessing(true);
      setGenerationStep("Analyzing solutions & generating outcome...");
      const prompt = `
        You are analyzing a Problem Solving scenario.
        CONTEXT:
        ${problemText}
        PROPOSED SOLUTIONS:
        ${solutionText}
        TASK:
        Generate a realistic 'Outcome & Evaluation' step.
        1. Briefly describe the likely result of implementing these solutions.
        2. Evaluate the success (e.g., 'The immediate issue was resolved, but...').
        3. Mention one trade-off or lesson learned.
        Return ONLY the text of the outcome (max 50 words). Do not include "Outcome:" prefix.
      `;
      try {
          const result = await callGemini(prompt);
          if (result) {
              const cleanResult = result.replace(/^Outcome:\s*/i, '').replace(/['"]/g, '').trim();
              handleAddToMapList(cleanResult);
          }
      } catch (error) {
          warnLog("Outcome Generation Failed", error);
          setError(t('errors.generation_failed'));
      } finally {
          setIsProcessing(false);
      }
};

window.AlloModules = window.AlloModules || {};
window.AlloModules.MathHelpers = {
  handleCheckMathWork,
  handleGetMathHint,
  handleMathEdit,
  handleGenerateSimilar,
  handleGenerateOutcome,
};

window.AlloModules.MathHelpersModule = true;
console.log('[MathHelpers] 5 helpers registered');
})();
