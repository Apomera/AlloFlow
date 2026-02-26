// This file contains the hint system code to inject
// Lines to inject after handleResetMathCheck (after line 30967)

const [mathHintData, setMathHintData] = useState({});
const handleGetMathHint = async (resourceId, problemIdx, question, correctAnswer, steps) => {
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
- Hint 2: More specific guidance — point to the key step or operation needed. Still don't give the answer.
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
        addToast('Could not generate hint — try again', 'error');
    }
};
