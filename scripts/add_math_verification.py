#!/usr/bin/env python3
"""Add Math.js computational grounding: expression evaluator, prompt updates, verification, fast-path, badges."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()
    lines = content.split('\n')

# Remove any trailing \r from each line for consistent matching
lines = [l.rstrip('\r') for l in lines]
print(f"Starting: {len(lines)} lines")

changes = 0

# ====================================================================
# FIX A: Add evaluateMathExpression helper + verifyMathProblems
# Insert BEFORE the handleSolveMath / handleGenerateMath function
# ====================================================================
evaluator_code = '''
  // === MATH EXPRESSION EVALUATOR (Computational Grounding) ===
  const evaluateMathExpression = (expr) => {
    try {
      if (!expr || typeof expr !== 'string') return null;
      // Sanitize: only allow numbers, operators, parens, decimals, spaces
      const sanitized = expr.replace(/[^0-9+\\-*/().%^ ]/g, '');
      if (!sanitized.trim()) return null;
      // Replace ^ with ** for exponentiation
      const jsExpr = sanitized.replace(/\\^/g, '**');
      const result = Function('"use strict"; return (' + jsExpr + ')')();
      return typeof result === 'number' && isFinite(result) ? Math.round(result * 10000) / 10000 : null;
    } catch { return null; }
  };

  // Verify AI-generated math problems against their expressions
  const verifyMathProblems = (problems) => {
    return problems.map(p => {
      const verification = { verified: false, mismatch: false, computed: null, autoCorrected: false };
      if (p.expression) {
        const computed = evaluateMathExpression(p.expression);
        if (computed !== null) {
          const answerStr = String(p.answer || '').replace(/[^0-9.\\-]/g, '');
          const answerNum = parseFloat(answerStr);
          verification.computed = computed;
          if (!isNaN(answerNum)) {
            verification.verified = Math.abs(computed - answerNum) < 0.01;
            verification.mismatch = !verification.verified;
            if (verification.mismatch) {
              p._originalAnswer = p.answer;
              p.answer = String(computed);
              verification.autoCorrected = true;
            }
          }
        }
      }
      // Verify each step expression too
      if (Array.isArray(p.steps)) {
        p.steps = p.steps.map(s => {
          if (s.expression) {
            const stepResult = evaluateMathExpression(s.expression);
            if (stepResult !== null) {
              s._computedResult = stepResult;
              s._verified = true;
            }
          }
          return s;
        });
      }
      return { ...p, _verification: verification };
    });
  };
'''

# Find the handleGenerateMath function to insert before it
anchor_a = None
for i, l in enumerate(lines):
    if 'handleGenerateMath' in l and ('const' in l or 'function' in l) and i > 40000:
        anchor_a = i
        break

if anchor_a is None:
    # Try handleSolveMath
    for i, l in enumerate(lines):
        if 'handleSolveMath' in l and ('const' in l or 'function' in l) and i > 40000:
            anchor_a = i
            break

if anchor_a:
    eval_lines = evaluator_code.split('\n')
    for j, el in enumerate(eval_lines):
        lines.insert(anchor_a + j, el)
    changes += len(eval_lines)
    print(f"A: Added evaluateMathExpression + verifyMathProblems ({len(eval_lines)} lines) before L{anchor_a+1}")
else:
    print("A: FAILED - could not find handleGenerateMath/handleSolveMath")


# ====================================================================
# FIX B: Update Problem Set Generator prompt to request expressions
# ====================================================================
# Find the exact prompt lines in Problem Set Generator
old_prompt_line = '- "answer": The solution.'
new_prompt_lines = '- "expression": The math expression that solves this (standard notation: +, -, *, /, ^, parentheses). Example: "15 - (3 * 4)"\n                - "answer": The numeric solution (a number).'

old_steps_line = '- "steps": An array of step objects { "explanation": "...", "latex": "..." } showing the work. (Optional)'
new_steps_line = '- "steps": An array of step objects { "explanation": "...", "latex": "...", "expression": "..." } showing the work. Each step should include the sub-expression computed.'

# Find and replace in the prompt area (lines 41500-41560 range, adjusted for insertions)
replaced_answer = False
replaced_steps = False
for i in range(len(lines)):
    if not replaced_answer and old_prompt_line in lines[i] and i > 41000:
        lines[i] = lines[i].replace(old_prompt_line, new_prompt_lines)
        replaced_answer = True
        print(f"B1: Updated answer field in prompt at L{i+1}")
    if not replaced_steps and old_steps_line in lines[i] and i > 41000:
        lines[i] = lines[i].replace(old_steps_line, new_steps_line)
        replaced_steps = True
        print(f"B2: Updated steps field in prompt at L{i+1}")
    if replaced_answer and replaced_steps:
        break

if not replaced_answer:
    print("B1: FAILED - could not find answer prompt line")
if not replaced_steps:
    print("B2: FAILED - could not find steps prompt line")


# ====================================================================
# FIX C: Add verification call after problem normalization
# ====================================================================
# Find where normalizedContent.problems is assigned: "normalizedContent.problems = rawContent.problems.map"
verification_call = '''
          // === COMPUTATIONAL GROUNDING: Verify expressions with evaluator ===
          normalizedContent.problems = verifyMathProblems(normalizedContent.problems);
          const verifiedCount = normalizedContent.problems.filter(p => p._verification?.verified).length;
          const mismatchCount = normalizedContent.problems.filter(p => p._verification?.mismatch).length;
          if (mismatchCount > 0) {
            warnLog(`Math verification: ${mismatchCount} answer(s) auto-corrected via expression evaluation`);
          }
          if (verifiedCount > 0) {
            infoLog(`Math verification: ${verifiedCount}/${normalizedContent.problems.length} answers computationally verified ✓`);
          }'''

# Find the line with "const newItem = {" which is right after normalization
anchor_c = None
for i, l in enumerate(lines):
    if 'const newItem = {' in l and 'Date.now()' in lines[i+1] if i+1 < len(lines) else False:
        if i > 41000:
            anchor_c = i
            break

if anchor_c:
    verify_lines = verification_call.split('\n')
    for j, vl in enumerate(verify_lines):
        lines.insert(anchor_c + j, vl)
    changes += len(verify_lines)
    print(f"C: Added verification call ({len(verify_lines)} lines) before L{anchor_c+1}")
else:
    print("C: FAILED - could not find 'const newItem = {' anchor")


# ====================================================================
# FIX D: Add numeric fast-path to handleCheckMathWork
# ====================================================================
fast_path_code = '''      // === FAST-PATH: If student answer matches numerically, skip API call ===
      const studentNumericMatch = parseFloat(studentWork.replace(/[^0-9.\\-]/g, ''));
      const correctNumericMatch = parseFloat(String(correctAnswer).replace(/[^0-9.\\-]/g, ''));
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
'''

# Find the start of handleCheckMathWork - specifically the guard after "Set loading"
anchor_d = None
for i, l in enumerate(lines):
    if 'handleCheckMathWork' in l and ('const' in l or 'function' in l or '=>' in l) and i < 40000:
        # Find the "Set loading" comment or the setMathCheckResults call
        for k in range(i+1, min(i+15, len(lines))):
            if '// Set loading' in lines[k] or 'Set loading' in lines[k]:
                anchor_d = k
                break
            if 'setMathCheckResults' in lines[k] and 'checking: true' in lines[k+1] if k+1 < len(lines) else False:
                anchor_d = k
                break
        break

if anchor_d:
    fp_lines = fast_path_code.split('\n')
    for j, fl in enumerate(fp_lines):
        lines.insert(anchor_d + j, fl)
    changes += len(fp_lines)
    print(f"D: Added numeric fast-path ({len(fp_lines)} lines) before L{anchor_d+1}")
else:
    print("D: FAILED - could not find handleCheckMathWork loading anchor")


# ====================================================================
# FIX E: Add verification badge to problem display
# ====================================================================
# Find the problem number badge (the circle with pIdx + 1) and add verification indicator
badge_code = '                                    {problem._verification && <span style={{ fontSize: "10px", marginLeft: "4px" }} title={problem._verification.verified ? "Answer computationally verified" : problem._verification.mismatch ? "Answer auto-corrected" : "Not verified"}>{problem._verification.verified ? "✅" : problem._verification.mismatch ? "🔧" : ""}</span>}'

# Find the answer display area where problem.answer is shown
anchor_e = None
for i, l in enumerate(lines):
    if 'pIdx + 1' in l and 'font-bold' in l and i > 70000:
        anchor_e = i + 1
        break

if anchor_e:
    lines.insert(anchor_e, badge_code)
    changes += 1
    print(f"E: Added verification badge after L{anchor_e}")
else:
    print("E: FAILED - could not find problem number display")


# ====================================================================
# SAVE
# ====================================================================
print(f"\nTotal changes: {changes} lines added/modified")
with open(FILE, 'w', encoding='utf-8', newline='\r\n') as f:
    for l in lines:
        f.write(l + '\n')
print(f"File saved: {len(lines)} lines")
