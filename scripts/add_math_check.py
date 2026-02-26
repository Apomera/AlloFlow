"""
Math "Check My Work" Feature - Add Gemini evaluation, feedback UI, and XP to math student view.

Changes:
1. Add mathCheckResults state + handleCheckMathWork handler (after studentResponses at ~L33637)
2. Replace student view bare textarea (L71502-71516) with textarea + Check button + feedback card
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

changes = []

# ============================================================
# CHANGE 1: Add state + handler after handleStudentInput
# Find the closing of handleStudentInput (the }; after setStudentResponses block)
# ============================================================
insert_after_line = None
for i, l in enumerate(lines):
    if 'handleStudentInput' in l and 'const' in l:
        # Find the closing }; of this function
        for j in range(i, min(len(lines), i + 15)):
            if lines[j].strip() == '};':
                insert_after_line = j
                break
        break

if insert_after_line is None:
    print("[ERROR] Could not find handleStudentInput closing!")
else:
    state_and_handler = '''
  // === MATH CHECK MY WORK ===
  const [mathCheckResults, setMathCheckResults] = useState({});
  // Shape: { [resourceId]: { [problemIdx]: { verdict, score, feedback, checking } } }
  const handleCheckMathWork = async (resourceId, problemIdx, question, correctAnswer, steps, studentWork) => {
      if (!studentWork || studentWork.trim().length < 5) {
          addToast(t('math.check.too_short') || 'Please write more before checking!', 'info');
          return;
      }
      // Guard: already checking
      const existing = mathCheckResults[resourceId]?.[problemIdx];
      if (existing?.checking) return;
      // Set loading
      setMathCheckResults(prev => ({
          ...prev,
          [resourceId]: {
              ...(prev[resourceId] || {}),
              [problemIdx]: { checking: true, verdict: null, score: 0, feedback: '' }
          }
      }));
      try {
          const stepsText = (steps || []).map((s, i) => `Step ${i+1}: ${s.explanation}${s.latex ? ' (' + s.latex + ')' : ''}`).join('\\n');
          const prompt = `You are a patient, encouraging math teacher evaluating a student's work.

PROBLEM: ${question}
CORRECT ANSWER: ${correctAnswer}
${stepsText ? 'SOLUTION STEPS:\\n' + stepsText : ''}

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
              const cleaned = result.replace(/```json\\n?/g, '').replace(/```\\n?/g, '').trim();
              parsed = JSON.parse(cleaned);
          } catch (parseErr) {
              // Try to extract JSON from response
              const jsonMatch = result.match(/\\{[\\s\\S]*\\}/);
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
                  [problemIdx]: { checking: false, verdict, score, feedback, checked: true }
              }
          }));
          // Award XP: 0-10 based on score
          const xpAwarded = Math.round(score / 10);
          if (xpAwarded > 0) {
              handleScoreUpdate(xpAwarded, "Math Problem", resourceId);
          }
          // Toast
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
  const handleResetMathCheck = (resourceId, problemIdx) => {
      setMathCheckResults(prev => ({
          ...prev,
          [resourceId]: {
              ...(prev[resourceId] || {}),
              [problemIdx]: { checking: false, verdict: null, score: 0, feedback: '', checked: false }
          }
      }));
  };
'''
    # Insert after the closing of handleStudentInput
    lines.insert(insert_after_line + 1, state_and_handler + '\r\n')
    changes.append("Added mathCheckResults state + handleCheckMathWork handler after L%d" % (insert_after_line + 1))

# ============================================================
# CHANGE 2: Replace student view UI (the else branch at L71502)
# The current student view is just a textarea from L71502-71516
# We need to find it after the insertion (line numbers shifted)
# ============================================================

# Re-read to get updated content
content = ''.join(lines)

# Find the student view section — the else branch after teacher mode
# Pattern: ) : (\n<div className="ml-4 sm:ml-12 mt-4">\n<div className="relative">\n...Pencil...\n<textarea...\nplaceholder={t('math.display.placeholder_work')}
# This is the STUDENT-ONLY branch (not the one inside isIndependentMode)

# Find the student branch by looking for the pattern
# ) : (\n                                    <div className="ml-4 sm:ml-12 mt-4">
# after the teacher mode closing </> tag

# Strategy: find the second occurrence of placeholder_work textarea
# (first is in isIndependentMode teacher view, second is student view)
old_student_view = '''                                    <div className="ml-4 sm:ml-12 mt-4">
                                        <div className="relative">
                                            <div className="absolute top-3 left-3 text-slate-500">
                                                <Pencil size={16} />
                                            </div>
                                            <textarea
                                                className="w-full p-3 pl-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none resize-y bg-slate-50/50 focus:bg-white transition-all font-serif text-lg leading-relaxed text-slate-700 placeholder:text-slate-500 min-h-[120px]"
                                                placeholder={t('math.display.placeholder_work')}
                                                value={studentResponses[generatedContent.id]?.[pIdx] || ''}
                                                onChange={(e) => handleStudentInput(generatedContent.id, pIdx, e.target.value)}
                                            />
                                        </div>
                                    </div>'''

new_student_view = '''                                    <div className="ml-4 sm:ml-12 mt-4 space-y-3">
                                        <div className="relative">
                                            <div className="absolute top-3 left-3 text-slate-500">
                                                <Pencil size={16} />
                                            </div>
                                            <textarea
                                                className="w-full p-3 pl-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none resize-y bg-slate-50/50 focus:bg-white transition-all font-serif text-lg leading-relaxed text-slate-700 placeholder:text-slate-500 min-h-[120px]"
                                                placeholder={t('math.display.placeholder_work') || 'Show your work here... Type your answer and explain your thinking.'}
                                                value={studentResponses[generatedContent.id]?.[pIdx] || ''}
                                                onChange={(e) => handleStudentInput(generatedContent.id, pIdx, e.target.value)}
                                                disabled={mathCheckResults[generatedContent.id]?.[pIdx]?.checking}
                                            />
                                        </div>
                                        {/* Check My Work Button */}
                                        {(() => {
                                            const checkResult = mathCheckResults[generatedContent.id]?.[pIdx];
                                            const studentWork = studentResponses[generatedContent.id]?.[pIdx] || '';
                                            return (
                                                <>
                                                    {!checkResult?.checked && (
                                                        <button
                                                            onClick={() => handleCheckMathWork(
                                                                generatedContent.id, pIdx,
                                                                problem.question || problem.problem,
                                                                problem.answer,
                                                                problem.steps,
                                                                studentWork
                                                            )}
                                                            disabled={!studentWork || studentWork.trim().length < 5 || checkResult?.checking}
                                                            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 hover:shadow-md active:scale-[0.98]"
                                                            data-help-key="math_check_work"
                                                        >
                                                            {checkResult?.checking ? (
                                                                <><RefreshCw size={16} className="animate-spin" /> {t('math.check.checking') || 'Evaluating your work...'}</>
                                                            ) : (
                                                                <><Sparkles size={16} /> {t('math.check.button') || 'Check My Work'}</>
                                                            )}
                                                        </button>
                                                    )}
                                                    {/* Feedback Card */}
                                                    {checkResult?.checked && (
                                                        <div className={`rounded-xl border-2 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                                                            checkResult.verdict === 'correct' ? 'border-green-300 bg-green-50' :
                                                            checkResult.verdict === 'partial' ? 'border-amber-300 bg-amber-50' :
                                                            'border-red-300 bg-red-50'
                                                        }`}>
                                                            <div className={`px-4 py-3 flex items-center justify-between ${
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
                                                                    {checkResult.score}% · +{Math.round(checkResult.score / 10)} XP
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
                                                                    onClick={() => handleResetMathCheck(generatedContent.id, pIdx)}
                                                                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
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
                                                </>
                                            );
                                        })()}
                                    </div>'''

# Find the second occurrence (student view)
# The first is inside isIndependentMode (teacher), the second is the else branch
first_idx = content.find(old_student_view)
if first_idx == -1:
    print("[ERROR] Could not find student view textarea block!")
    print("Searching for partial matches...")
    # Try finding by unique pattern
    search = 'placeholder={t(\'math.display.placeholder_work\')}'
    positions = []
    start = 0
    while True:
        idx = content.find(search, start)
        if idx == -1:
            break
        positions.append(idx)
        start = idx + 1
    print("Found placeholder_work at %d positions" % len(positions))
else:
    # Find the SECOND occurrence (student view, not teacher's isIndependentMode)
    second_idx = content.find(old_student_view, first_idx + len(old_student_view))
    if second_idx == -1:
        print("[WARN] Only one occurrence found - using it (likely the student view)")
        # Check if this first one is actually the student view
        # Look at context before it: should have ") : ("
        context_before = content[max(0, first_idx - 100):first_idx]
        if ') : (' in context_before:
            print("Confirmed: this is the student view branch")
            content = content[:first_idx] + new_student_view + content[first_idx + len(old_student_view):]
            changes.append("Replaced student view with Check My Work UI")
        else:
            print("[ERROR] First occurrence is NOT the student view branch!")
    else:
        print("Found second occurrence (student view) - replacing")
        content = content[:second_idx] + new_student_view + content[second_idx + len(old_student_view):]
        changes.append("Replaced student view with Check My Work UI (second occurrence)")

# Write
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n" + "=" * 60)
print("Applied %d changes:" % len(changes))
for c in changes:
    print("  + %s" % c)
print("=" * 60)
