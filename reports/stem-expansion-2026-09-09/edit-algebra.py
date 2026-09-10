
from pathlib import Path
p=Path('stem_lab/stem_tool_algebracas.js')
s=p.read_text(encoding='utf-8')
def rep(a,b):
 global s
 assert a in s, a[:100]
 s=s.replace(a,b,1)
helpers=r'''
    function solveLinear(equation) {
      var parts = normalize(equation).split('=');
      if (parts.length !== 2) return { ok: false };
      var left = linearSide(parts[0]), right = linearSide(parts[1]);
      if (!left || !right) return { ok: false };
      var coefficient = rAdd(left.a, rNeg(right.a)), constant = rAdd(right.b, rNeg(left.b));
      var kind = coefficient.n ? 'unique' : constant.n ? 'contradiction' : 'identity';
      var answer = kind === 'unique' ? rText(rDiv(constant, coefficient)) : kind === 'identity' ? 'All real numbers' : 'No solution';
      var steps = ['STEP 1: ' + rText(coefficient) + 'x = ' + rText(constant) + ' [Collect variable terms on the left and constants on the right]'];
      if (kind === 'unique') steps.push('STEP 2: x = ' + answer + ' [Divide both sides by ' + rText(coefficient) + ']');
      else steps.push('STEP 2: ' + (kind === 'identity' ? 'Both sides agree for every real x.' : 'Zero cannot equal a nonzero constant.') + ' [Compare constants]');
      var trial = kind === 'unique' ? balanceTrial(equation, answer) : null;
      return { ok: true, kind: kind, answer: answer, text: steps.join('\n') + '\nANSWER: ' + answer,
        verify: { decidable: true, verified: true, exact: true, detail: trial ? 'x=' + answer + ': LHS=' + trial.left + ', RHS=' + trial.right : 'Exact comparison of the linear coefficients and constants.' } };
    }
    function checkLinearStep(before, after) {
      var a = solveLinear(before), b = solveLinear(after);
      if (!a.ok || !b.ok) return { ok: false, detail: 'Use two complete linear equations in x, with constant nonzero denominators.' };
      var equivalent = a.kind === b.kind && (a.kind !== 'unique' || a.answer === b.answer);
      return { ok: true, equivalent: equivalent, detail: equivalent ? 'These equations have exactly the same solution set.' : 'This step changes the solution set. Check that the operation preserves both sides.' };
    }
    function linearPractice(level, index) {
      var i = Math.abs(Math.floor(Number(index) || 0)) % 36, a = 2 + i % 7, b = i % 9 - 4, x = i % 11 - 5;
      var problem = level === 'advanced' ? '(' + a + 'x + ' + b + ')/3 = ' + (a*x+b) + '/3' :
        level === 'middle' ? a + '(x + ' + b + ') = ' + (a*x+a*b-x) + ' + x' : a + 'x + ' + b + ' = ' + (a*x+b);
      problem = problem.replace(/\+ -/g, '- ');
      var solution = solveLinear(problem);
      return { problem: problem, answer: solution.answer, solution: solution.text, source: 'local-linear', hint: 'Apply the same reversible operation to both sides; collect x terms before dividing.' };
    }
    function gradeLinear(equation, answer) {
      var solved = solveLinear(equation);
      if (!solved.ok) return { decidable: false };
      var candidate = normalize(answer).replace(/^x=/i, '');
      if (solved.kind !== 'unique') return { decidable: true, correct: candidate.toLowerCase() === normalize(solved.answer).toLowerCase(), detail: 'Compare whether the equation is an identity or a contradiction.' };
      var value = linearSide(candidate);
      if (!value || value.a.n) return { decidable: false, detail: 'Enter one number or fraction, optionally starting with x =.' };
      return { decidable: true, correct: rText(value.b) === solved.answer, detail: 'Checked against the exact linear solution.' };
    }
'''
rep('    return { balanceTrial:balanceTrial,',helpers+'\n    return { solveLinear:solveLinear, checkLinearStep:checkLinearStep, linearPractice:linearPractice, gradeLinear:gradeLinear, balanceTrial:balanceTrial,')
rep("          if (!expression.trim() || !callGemini || isLoading) return;",r'''          if (!expression.trim() || isLoading) return;
          var local = mode === 'solve' ? __alloCASPure.solveLinear(expression) : { ok: false };
          if (local.ok) {
            var localHistory = history.slice(-9).concat([{ expr: expression, mode: mode, result: local.text, verify: local.verify, ts: Date.now() }]);
            updMulti({ result: local.text, verify: local.verify, history: localHistory, isLoading: false });
            return;
          }
          if (!callGemini) { updMulti({ result: 'Local solving supports linear equations in x, including fractions and parentheses. Use the Balance tab or enter a linear equation. This expression or mode needs the AI provider.', verify: null }); return; }''')
rep("          upd('isLoading', true); upd('result', null);","          updMulti({ isLoading: true, result: null, verify: null });")
rep("newH.push({ expr: expression, mode: mode, result: res, ts: Date.now() });","newH.push({ expr: expression, mode: mode, result: res, verify: _chk, ts: Date.now() });")
rep("        var handlePracticeGen = function() {",r'''        function startLocalPractice() {
          var index = (d.localPracticeIndex || 0) + 1;
          updMulti({ practiceQ: __alloCASPure.linearPractice(difficulty, index), localPracticeIndex: index, practiceFeedback: null, practiceAnswer: '', practiceNotice: '', showSolution: false, isLoading: false });
        }
        var handlePracticeGen = function() {''')
rep("          if (!callGemini || isLoading) return;\n          updMulti({ isLoading: true, practiceFeedback:", "          if (isLoading) return;\n          if (!callGemini || (practiceQ && practiceQ.source === 'local-linear')) { startLocalPractice(); return; }\n          updMulti({ isLoading: true, practiceFeedback:")
rep("          if (!practiceQ || !practiceAnswer.trim() || !callGemini) return;",r'''          if (!practiceQ || !practiceAnswer.trim() || practiceFeedback || isLoading) return;
          if (practiceQ.source === 'local-linear') {
            var localGrade = __alloCASPure.gradeLinear(practiceQ.problem, practiceAnswer);
            if (!localGrade.decidable) { upd('practiceNotice', localGrade.detail); return; }
            var streak = localGrade.correct ? practiceStreak + 1 : 0;
            updMulti({ practiceNotice: '', practiceFeedback: { correct: localGrade.correct, text: 'FEEDBACK: ' + (localGrade.correct ? 'Your value satisfies the equation.' : 'Your value does not satisfy the equation. Compare the reversible steps below.') + '\nSOLUTION:\n' + practiceQ.solution, gradeSource: 'verified', gradeDetail: localGrade.detail }, practiceScore: practiceScore + (localGrade.correct ? 1 : 0), practiceStreak: streak, _maxStreak: Math.max(d._maxStreak || 0, streak), showSolution: !localGrade.correct });
            if (localGrade.correct && awardStemXP) awardStemXP('algebraCAS', 10, 'Exact linear practice');
            return;
          }
          if (!callGemini) { upd('practiceNotice', 'This generated problem needs the AI provider. Start local linear practice to continue.'); return; }''')
rep("onChange: function(e) { upd('expression', e.target.value); }","onChange: function(e) { updMulti({ expression: e.target.value, result: null, verify: null, stepCheck: null }); }")
rep("updMulti({ mode: m.id, result: null });","updMulti({ mode: m.id, result: null, verify: null });")
rep("updMulti({ expression: hi.expr, mode: hi.mode, result: hi.result });","updMulti({ expression: hi.expr, mode: hi.mode, result: hi.result, verify: hi.verify || null, stepCheck: null });")
rep("upd('expression', ex);","updMulti({ expression: ex, result: null, verify: null, stepCheck: null });")
start=s.index("              verify && verify.decidable ? h('div'")
end=s.index("\n            ) : null,",start)
s=s[:start]+r'''              h('p', { role: 'status', 'data-cas-verification': verify && verify.exact ? 'exact' : 'ai', style: { color: TEXT, fontSize: 12, lineHeight: 1.6 } },
                verify && verify.exact ? 'Exact local solution and algebraic steps. ' + verify.detail :
                  'AI explanation: steps are not independently checked. ' + (verify && verify.decidable ? (verify.verified ? 'Listed roots pass a numerical substitution check; this does not prove all roots were found. ' : 'The proposed answer fails substitution. ') + (verify.detail || '') : 'The answer could not be checked locally.'))'''+s[end:]
rep("            history.length > 0 ? h('div', null,",r'''            h('details', { style: cardStyle, 'data-linear-step-checker': true },
              h('summary', { style: { cursor: 'pointer', fontWeight: 700 } }, 'Check my next algebra step'),
              h('p', null, 'Compare the equation above with your next line. This checks the solution set of linear equations in x.'),
              h('label', { htmlFor: 'cas-next-step' }, 'My next equation'),
              h('input', { id: 'cas-next-step', value: d.nextEquation || '', maxLength: 500, onChange: function(e) { updMulti({ nextEquation: e.target.value, stepCheck: null }); }, style: { display: 'block', width: '100%', boxSizing: 'border-box', padding: 10, background: CARD, color: TEXT, border: '1px solid ' + BORDER } }),
              h('button', { type: 'button', style: btnStyle(false), onClick: function() { upd('stepCheck', __alloCASPure.checkLinearStep(expression, d.nextEquation || '')); } }, 'Check this step'),
              d.stepCheck ? h('p', { role: 'status' }, d.stepCheck.detail) : null),
            history.length > 0 ? h('div', null,''')
rep("        var renderPractice = function() {\n          return h('div', null,",r'''        var renderPractice = function() {
          return h('div', null,
            h('p', { style: { color: MUTED, fontSize: 12 } }, 'Local practice uses exact linear equations: one-step, brackets, or fractions at the selected level.'),
            h('button', { type: 'button', style: btnStyle(false), disabled: isLoading, onClick: startLocalPractice }, 'Start local linear practice'),
            d.practiceNotice ? h('p', { role: 'status' }, d.practiceNotice) : null,''')
p.write_text(s,encoding='utf-8',newline='\n')
print('Algebra local solve, practice and step checker added.')

