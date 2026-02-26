#!/usr/bin/env python3
"""Add teacher inline editing to math problem cards.
- Edit toggle per problem (pencil/check button)
- Inline editable fields: question, answer, step explanations, realWorld
- Updates generatedContent.data.problems[] and syncs to history
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# ====================================================================
# 1. Add state: mathEditingProblem = { resourceId: pIdx } or null
# Find an existing math-related state variable to insert near
# ====================================================================
anchor_state = "const [showMathAnswers, setShowMathAnswers] = useState(false);"
new_state = """const [showMathAnswers, setShowMathAnswers] = useState(false);
  const [mathEditingProblem, setMathEditingProblem] = useState({}); // { [resourceId_pIdx]: true }"""

if anchor_state in content:
    content = content.replace(anchor_state, new_state, 1)
    changes += 1
    print("1: Added mathEditingProblem state")
else:
    print("1: FAILED - could not find showMathAnswers state")

# ====================================================================
# 2. Add handler: handleMathProblemEdit(resourceId, pIdx, field, value)
# Insert after handleToggleShowMathAnswers or similar
# ====================================================================
handler_anchor = "const handleToggleShowMathAnswers"
if handler_anchor not in content:
    handler_anchor = "const handleSetShowMathAnswersToTrue"

handler_code = """
  // === MATH PROBLEM TEACHER EDITING ===
  const handleMathProblemEdit = (pIdx, field, value, stepIdx = null) => {
    setGeneratedContent(prev => {
      if (!prev || !prev.data || !prev.data.problems) return prev;
      const updatedProblems = [...prev.data.problems];
      const problem = { ...updatedProblems[pIdx] };
      if (stepIdx !== null && field === 'step_explanation') {
        const updatedSteps = [...(problem.steps || [])];
        updatedSteps[stepIdx] = { ...updatedSteps[stepIdx], explanation: value };
        problem.steps = updatedSteps;
      } else if (stepIdx !== null && field === 'step_latex') {
        const updatedSteps = [...(problem.steps || [])];
        updatedSteps[stepIdx] = { ...updatedSteps[stepIdx], latex: value };
        problem.steps = updatedSteps;
      } else {
        problem[field] = value;
      }
      // Clear verification since content changed
      if (problem._verification) {
        problem._verification = { ...problem._verification, verified: false, edited: true };
      }
      updatedProblems[pIdx] = problem;
      const updatedData = { ...prev.data, problems: updatedProblems };
      // Also update the history item
      const historyIdx = history.findIndex(h => h.id === prev.id);
      if (historyIdx >= 0) {
        const updatedHistory = [...history];
        updatedHistory[historyIdx] = { ...updatedHistory[historyIdx], data: updatedData };
        setHistory(updatedHistory);
      }
      return { ...prev, data: updatedData };
    });
  };

  const toggleMathEdit = (pIdx) => {
    const key = `${generatedContent?.id}_${pIdx}`;
    setMathEditingProblem(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isMathEditing = (pIdx) => {
    const key = `${generatedContent?.id}_${pIdx}`;
    return !!mathEditingProblem[key];
  };

"""

# Find the anchor and insert after the function
if handler_anchor in content:
    # Find the end of the handler function to insert after it
    idx = content.find(handler_anchor)
    # Find the next semicolon-terminated line after a function block
    # Simpler: insert before the anchor
    content = content[:idx] + handler_code + content[idx:]
    changes += 1
    print("2: Added handleMathProblemEdit, toggleMathEdit, isMathEditing")
else:
    print("2: FAILED - could not find handler anchor")

# ====================================================================
# 3. Add Edit button to problem header (next to problem number)
# Currently: problem number badge + question text
# Add: Edit toggle button (teacher mode only)
# ====================================================================
# The problem card header area (L73416-73426):
# <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex gap-4 items-start">
#     <div className="bg-indigo-600 ..."> {pIdx + 1} </div>
#     <div className="flex-grow">
#         <div className="text-lg ..."> {formatInlineText(problem.question...)} </div>
#         {problem._verification && ...}
#     </div>
# </div>

old_question_display = """<div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex gap-4 items-start">
                                    <div className="bg-indigo-600 text-white font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm mt-0.5 shadow-sm">
                                        {pIdx + 1}
                                    </div>
                                    <div className="flex-grow">
                                        <div className="text-lg font-medium text-slate-800 font-serif">
                                            {formatInlineText(problem.question || problem.problem, false)}
                                        </div>
                                        {problem._verification && <span style={{ fontSize: "11px", marginLeft: "6px", opacity: 0.8 }} title={problem._verification.verified ? "Answer computationally verified" : problem._verification.autoCorrected ? "Answer auto-corrected by evaluator" : ""}>{problem._verification.verified ? "✅" : problem._verification.autoCorrected ? "🔧" : ""}</span>}
                                    </div>
                                </div>"""

new_question_display = """<div className={`bg-white p-4 rounded-xl border shadow-sm flex gap-4 items-start ${isMathEditing(pIdx) ? 'border-amber-300 ring-2 ring-amber-100' : 'border-indigo-100'}`}>
                                    <div className="bg-indigo-600 text-white font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm mt-0.5 shadow-sm">
                                        {pIdx + 1}
                                    </div>
                                    <div className="flex-grow">
                                        {isMathEditing(pIdx) ? (
                                            <textarea
                                                className="w-full p-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none resize-y bg-amber-50/50 font-serif text-lg leading-relaxed text-slate-800 min-h-[60px]"
                                                value={problem.question || problem.problem || ''}
                                                onChange={(e) => handleMathProblemEdit(pIdx, 'question', e.target.value)}
                                                placeholder="Enter problem question..."
                                            />
                                        ) : (
                                            <div className="text-lg font-medium text-slate-800 font-serif">
                                                {formatInlineText(problem.question || problem.problem, false)}
                                            </div>
                                        )}
                                        {problem._verification && <span style={{ fontSize: "11px", marginLeft: "6px", opacity: 0.8 }} title={problem._verification.verified ? "Answer computationally verified" : problem._verification.autoCorrected ? "Answer auto-corrected by evaluator" : ""}>{problem._verification.verified ? "✅" : problem._verification.autoCorrected ? "🔧" : problem._verification.edited ? "✏️" : ""}</span>}
                                    </div>
                                    {isTeacherMode && (
                                        <button
                                            aria-label={isMathEditing(pIdx) ? "Save edits" : "Edit problem"}
                                            onClick={() => toggleMathEdit(pIdx)}
                                            className={`shrink-0 p-1.5 rounded-lg transition-all ${isMathEditing(pIdx) ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'}`}
                                            title={isMathEditing(pIdx) ? "Done editing" : "Edit this problem"}
                                        >
                                            {isMathEditing(pIdx) ? <CheckCircle2 size={16} /> : <Pencil size={14} />}
                                        </button>
                                    )}
                                </div>"""

if old_question_display in content:
    content = content.replace(old_question_display, new_question_display, 1)
    changes += 1
    print("3: Replaced question display with editable version + edit toggle button")
else:
    print("3: FAILED - could not find question display block")

# ====================================================================
# 4. Make Answer editable when in edit mode
# Currently: <MathSymbol text={problem.answer} />
# Replace with: editable textarea or MathSymbol depending on edit mode
# ====================================================================
old_answer = """<h4 className="text-xs font-black text-green-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                         <CheckCircle2 size={14}/> {t('math.display.answer_header')}
                                                     </h4>
                                                     <div className="text-lg font-bold text-green-900 font-serif">
                                                         <MathSymbol text={problem.answer} />
                                                     </div>"""

new_answer = """<h4 className="text-xs font-black text-green-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                         <CheckCircle2 size={14}/> {t('math.display.answer_header')}
                                                     </h4>
                                                     {isMathEditing(pIdx) ? (
                                                         <input
                                                             type="text"
                                                             className="w-full p-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none bg-amber-50/50 font-serif text-lg font-bold text-green-900"
                                                             value={problem.answer || ''}
                                                             onChange={(e) => handleMathProblemEdit(pIdx, 'answer', e.target.value)}
                                                             placeholder="Enter answer..."
                                                         />
                                                     ) : (
                                                         <div className="text-lg font-bold text-green-900 font-serif">
                                                             <MathSymbol text={problem.answer} />
                                                         </div>
                                                     )}"""

if old_answer in content:
    content = content.replace(old_answer, new_answer, 1)
    changes += 1
    print("4: Made answer field editable")
else:
    print("4: FAILED - could not find answer display block")

# ====================================================================
# 5. Make Step explanations editable when in edit mode
# Currently: {formatInlineText(step.explanation, false)}
# In the steps section within showMathAnswers
# ====================================================================
old_step = """<div className="text-slate-700 mb-2 leading-relaxed font-medium text-sm">
                                                                     {formatInlineText(step.explanation, false)}
                                                                 </div>
                                                                 {step.latex && (
                                                                     <div className="bg-slate-50 p-3 rounded text-center border border-slate-100 overflow-x-auto flex justify-center">
                                                                         <span className="text-lg font-serif text-slate-800 inline-block">
                                                                             <MathSymbol text={step.latex} />
                                                                         </span>
                                                                     </div>
                                                                 )}"""

new_step = """{isMathEditing(pIdx) ? (
                                                                     <div className="space-y-2">
                                                                         <textarea
                                                                             className="w-full p-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none resize-y bg-amber-50/50 text-sm text-slate-700 min-h-[40px]"
                                                                             value={step.explanation || ''}
                                                                             onChange={(e) => handleMathProblemEdit(pIdx, 'step_explanation', e.target.value, idx)}
                                                                             placeholder="Step explanation..."
                                                                         />
                                                                         <input
                                                                             type="text"
                                                                             className="w-full p-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none bg-amber-50/50 text-sm font-mono text-slate-600"
                                                                             value={step.latex || ''}
                                                                             onChange={(e) => handleMathProblemEdit(pIdx, 'step_latex', e.target.value, idx)}
                                                                             placeholder="LaTeX expression (optional)..."
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
                                                                 )}"""

if old_step in content:
    content = content.replace(old_step, new_step, 1)
    changes += 1
    print("5: Made step explanations and LaTeX editable")
else:
    print("5: FAILED - could not find step display block")

# ====================================================================
# 6. Make realWorld connection editable
# ====================================================================
old_realworld = """<h4 className="text-xs font-black text-orange-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                         <Globe size={14}/> {t('math.display.connection_header')}
                                                     </h4>
                                                     <p className="text-sm text-orange-900 leading-relaxed font-medium">
                                                         {problem.realWorld}
                                                     </p>"""

new_realworld = """<h4 className="text-xs font-black text-orange-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                         <Globe size={14}/> {t('math.display.connection_header')}
                                                     </h4>
                                                     {isMathEditing(pIdx) ? (
                                                         <textarea
                                                             className="w-full p-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none resize-y bg-amber-50/50 text-sm text-orange-900 min-h-[40px]"
                                                             value={problem.realWorld || ''}
                                                             onChange={(e) => handleMathProblemEdit(pIdx, 'realWorld', e.target.value)}
                                                             placeholder="Real-world connection..."
                                                         />
                                                     ) : (
                                                         <p className="text-sm text-orange-900 leading-relaxed font-medium">
                                                             {problem.realWorld}
                                                         </p>
                                                     )}"""

if old_realworld in content:
    content = content.replace(old_realworld, new_realworld, 1)
    changes += 1
    print("6: Made realWorld connection editable")
else:
    print("6: FAILED - could not find realWorld display block")

# ====================================================================
# SAVE
# ====================================================================
with open(FILE, 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied.")
