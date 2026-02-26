#!/usr/bin/env python3
"""
Math Fluency Probe — Phase 1: State vars, dropdown option, probe config UI,
generation function, and fluency probe rendering.

Modifications:
1. Add state variables after L35129
2. Add 'Fluency Probe' option to the math mode dropdown (L64328)
3. Add probe config UI when Fluency Probe is selected (after L64331)
4. Add math fluency generation/timer logic (after the generation handler area near L41300)
5. Add fluency probe rendering view in the math output section (near L72890)
"""

import sys, re, os

FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'AlloFlowANTI.txt')

def read_file():
    with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
        return f.readlines()

def write_file(lines):
    with open(FILE, 'w', encoding='utf-8', newline='\r\n') as f:
        f.writelines(l.rstrip('\r\n') + '\n' for l in lines)

# ─── NEW CODE BLOCKS ──────────────────────────────────────────────────

STATE_VARS = r"""
  // === MATH FLUENCY PROBE STATE ===
  const [mathFluencyActive, setMathFluencyActive] = useState(false);
  const [mathFluencyOperation, setMathFluencyOperation] = useState('add');
  const [mathFluencyDifficulty, setMathFluencyDifficulty] = useState('single');
  const [mathFluencyTimeLimit, setMathFluencyTimeLimit] = useState(120);
  const [mathFluencyProblems, setMathFluencyProblems] = useState([]);
  const [mathFluencyCurrentIndex, setMathFluencyCurrentIndex] = useState(0);
  const [mathFluencyTimer, setMathFluencyTimer] = useState(0);
  const [mathFluencyResults, setMathFluencyResults] = useState(null);
  const [mathFluencyHistory, setMathFluencyHistory] = useState([]);
  const [mathFluencyStudentInput, setMathFluencyStudentInput] = useState('');
  const mathFluencyInputRef = React.useRef(null);
  const mathFluencyTimerRef = React.useRef(null);

  // Math fluency problem generator (pure JS, no AI)
  const generateMathFluencySet = (operation, difficulty) => {
      const problems = [];
      const used = new Set();
      const maxOp = difficulty === 'single' ? 12 : (difficulty === 'double' ? 99 : 12);
      const minOp = difficulty === 'double' ? 10 : 0;
      for (let attempt = 0; attempt < 500 && problems.length < 120; attempt++) {
          let a, b, answer, op;
          const ops = operation === 'mixed' ? ['add','sub','mul','div'] : [operation];
          op = ops[Math.floor(Math.random() * ops.length)];
          if (op === 'add') {
              a = Math.floor(Math.random() * (maxOp - minOp + 1)) + minOp;
              b = Math.floor(Math.random() * (maxOp - minOp + 1)) + minOp;
              answer = a + b;
          } else if (op === 'sub') {
              a = Math.floor(Math.random() * (maxOp - minOp + 1)) + minOp;
              b = Math.floor(Math.random() * (a + 1));
              answer = a - b;
          } else if (op === 'mul') {
              const mulMax = difficulty === 'double' ? 15 : 12;
              a = Math.floor(Math.random() * (mulMax + 1));
              b = Math.floor(Math.random() * (12 + 1));
              answer = a * b;
          } else {
              // Division: ensure whole number answers
              b = Math.floor(Math.random() * 12) + 1;
              answer = Math.floor(Math.random() * (12 + 1));
              a = b * answer;
          }
          const key = `${a}${op}${b}`;
          if (!used.has(key)) {
              used.add(key);
              const symbol = op === 'add' ? '+' : op === 'sub' ? '−' : op === 'mul' ? '×' : '÷';
              problems.push({ a, b, op, symbol, answer, studentAnswer: null, correct: null });
          }
      }
      return problems;
  };

  // Count digits in a number (for DCPM)
  const countDigits = (n) => Math.max(1, String(Math.abs(n)).length);

  // Start a math fluency probe
  const startMathFluencyProbe = () => {
      const problems = generateMathFluencySet(mathFluencyOperation, mathFluencyDifficulty);
      setMathFluencyProblems(problems);
      setMathFluencyCurrentIndex(0);
      setMathFluencyResults(null);
      setMathFluencyStudentInput('');
      setMathFluencyTimer(mathFluencyTimeLimit);
      setMathFluencyActive(true);
      // Start countdown
      if (mathFluencyTimerRef.current) clearInterval(mathFluencyTimerRef.current);
      mathFluencyTimerRef.current = setInterval(() => {
          setMathFluencyTimer(prev => {
              if (prev <= 1) {
                  clearInterval(mathFluencyTimerRef.current);
                  mathFluencyTimerRef.current = null;
                  finishMathFluencyProbe();
                  return 0;
              }
              return prev - 1;
          });
      }, 1000);
      setTimeout(() => mathFluencyInputRef.current?.focus(), 100);
  };

  // Submit answer and advance
  const submitMathFluencyAnswer = (skip = false) => {
      setMathFluencyProblems(prev => {
          const updated = [...prev];
          const idx = mathFluencyCurrentIndex;
          if (idx < updated.length) {
              const studentVal = skip ? null : parseInt(mathFluencyStudentInput);
              updated[idx] = { 
                  ...updated[idx], 
                  studentAnswer: skip ? 'SKIP' : studentVal,
                  correct: skip ? false : (studentVal === updated[idx].answer)
              };
          }
          return updated;
      });
      setMathFluencyStudentInput('');
      setMathFluencyCurrentIndex(prev => {
          const next = prev + 1;
          if (next >= mathFluencyProblems.length) {
              finishMathFluencyProbe();
          }
          return next;
      });
      setTimeout(() => mathFluencyInputRef.current?.focus(), 50);
  };

  // Finish probe and calculate DCPM
  const finishMathFluencyProbe = () => {
      if (mathFluencyTimerRef.current) {
          clearInterval(mathFluencyTimerRef.current);
          mathFluencyTimerRef.current = null;
      }
      setMathFluencyActive(false);
      setMathFluencyProblems(prev => {
          const attempted = prev.filter(p => p.studentAnswer !== null);
          const correct = attempted.filter(p => p.correct);
          const totalDigitsCorrect = correct.reduce((sum, p) => sum + countDigits(p.answer), 0);
          const elapsedSeconds = mathFluencyTimeLimit - mathFluencyTimer;
          const elapsedMinutes = Math.max(0.1, elapsedSeconds / 60);
          const dcpm = Math.round(totalDigitsCorrect / elapsedMinutes);
          const accuracy = attempted.length > 0 ? Math.round((correct.length / attempted.length) * 100) : 0;
          const result = {
              date: new Date().toISOString(),
              operation: mathFluencyOperation,
              difficulty: mathFluencyDifficulty,
              dcpm,
              accuracy,
              totalCorrect: correct.length,
              totalAttempted: attempted.length,
              totalDigitsCorrect,
              timeLimit: mathFluencyTimeLimit,
              elapsedSeconds
          };
          setMathFluencyResults(result);
          setMathFluencyHistory(h => [...h, result]);
          return prev;
      });
  };
"""

DROPDOWN_OPTION = '                                        <option value="Fluency Probe">⏱️ {t(\'math.modes.fluency_probe\') || \'Fluency Probe\'}</option>\n'

PROBE_CONFIG_UI = r"""
                        {mathMode === 'Fluency Probe' && (
                            <div className="space-y-3 p-3 bg-amber-50 rounded-xl border border-amber-200 animate-in fade-in slide-in-from-top-1">
                                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                                    <Timer size={14} /> Math Fluency Probe (CBM-Math)
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1 font-medium">Operation</label>
                                        <select aria-label="Math operation" value={mathFluencyOperation} onChange={(e) => setMathFluencyOperation(e.target.value)} className="w-full text-xs border-slate-300 rounded-md p-1.5 focus:ring-2 focus:ring-amber-300 outline-none">
                                            <option value="add">➕ Addition</option>
                                            <option value="sub">➖ Subtraction</option>
                                            <option value="mul">✖️ Multiplication</option>
                                            <option value="div">➗ Division</option>
                                            <option value="mixed">🔀 Mixed</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1 font-medium">Difficulty</label>
                                        <select aria-label="Difficulty level" value={mathFluencyDifficulty} onChange={(e) => setMathFluencyDifficulty(e.target.value)} className="w-full text-xs border-slate-300 rounded-md p-1.5 focus:ring-2 focus:ring-amber-300 outline-none">
                                            <option value="single">Single Digit (0-12)</option>
                                            <option value="double">Double Digit (10-99)</option>
                                            <option value="mixed">Mixed</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1 font-medium">Timer</label>
                                        <select aria-label="Time limit" value={mathFluencyTimeLimit} onChange={(e) => setMathFluencyTimeLimit(parseInt(e.target.value))} className="w-full text-xs border-slate-300 rounded-md p-1.5 focus:ring-2 focus:ring-amber-300 outline-none">
                                            <option value={60}>60 seconds</option>
                                            <option value={120}>120 seconds</option>
                                            <option value={180}>180 seconds</option>
                                        </select>
                                    </div>
                                </div>
                                <button
                                    onClick={startMathFluencyProbe}
                                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md flex items-center justify-center gap-2"
                                >
                                    <Play size={16} /> Start Fluency Probe
                                </button>
                                <p className="text-xs text-amber-700/70 text-center">Timed math fact drill — measures Digits Correct Per Minute (DCPM)</p>
                            </div>
                        )}
"""

FLUENCY_PROBE_VIEW = r"""
                    {/* === MATH FLUENCY PROBE ACTIVE VIEW === */}
                    {mathFluencyActive && mathFluencyProblems.length > 0 && mathFluencyCurrentIndex < mathFluencyProblems.length && (
                        <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-amber-50 via-white to-orange-50 flex flex-col items-center justify-center p-4">
                            {/* Timer bar */}
                            <div className="w-full max-w-md mb-8">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-bold text-amber-700">⏱️ {Math.floor(mathFluencyTimer / 60)}:{String(mathFluencyTimer % 60).padStart(2, '0')}</span>
                                    <span className="text-sm font-bold text-slate-600">#{mathFluencyCurrentIndex + 1} • ✅ {mathFluencyProblems.filter(p => p.correct).length}</span>
                                </div>
                                <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-1000" style={{ width: `${(mathFluencyTimer / mathFluencyTimeLimit) * 100}%` }} />
                                </div>
                            </div>
                            {/* Problem display */}
                            <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-8 md:p-12 w-full max-w-md text-center">
                                <div className="text-5xl md:text-6xl font-black text-slate-800 tracking-tight mb-8 font-mono">
                                    {mathFluencyProblems[mathFluencyCurrentIndex].a} {mathFluencyProblems[mathFluencyCurrentIndex].symbol} {mathFluencyProblems[mathFluencyCurrentIndex].b} = ?
                                </div>
                                <form onSubmit={(e) => { e.preventDefault(); submitMathFluencyAnswer(); }}>
                                    <input
                                        ref={mathFluencyInputRef}
                                        type="number"
                                        value={mathFluencyStudentInput}
                                        onChange={(e) => setMathFluencyStudentInput(e.target.value)}
                                        className="w-32 text-center text-4xl font-bold border-b-4 border-amber-400 bg-transparent outline-none focus:border-amber-600 transition-colors py-2 mx-auto block"
                                        autoFocus
                                        aria-label="Your answer"
                                    />
                                    <div className="flex gap-3 mt-6 justify-center">
                                        <button type="submit" className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold rounded-xl text-lg hover:from-emerald-600 hover:to-green-600 transition-all shadow-lg">
                                            Enter ↵
                                        </button>
                                        <button type="button" onClick={() => submitMathFluencyAnswer(true)} className="px-6 py-3 bg-slate-200 text-slate-600 font-bold rounded-xl text-lg hover:bg-slate-300 transition-all">
                                            Skip →
                                        </button>
                                    </div>
                                </form>
                            </div>
                            <button onClick={() => { if (mathFluencyTimerRef.current) clearInterval(mathFluencyTimerRef.current); finishMathFluencyProbe(); }} className="mt-6 text-sm text-slate-500 hover:text-red-600 transition-colors font-medium">
                                End probe early
                            </button>
                        </div>
                    )}
                    {/* === MATH FLUENCY RESULTS === */}
                    {mathFluencyResults && !mathFluencyActive && (
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200 p-6 mb-6 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-black text-amber-800 flex items-center gap-2">📊 Fluency Probe Results</h3>
                                <button onClick={() => setMathFluencyResults(null)} className="text-slate-400 hover:text-slate-600 p-1"><X size={18} /></button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                <div className="bg-white rounded-xl p-4 text-center border border-amber-100 shadow-sm">
                                    <div className="text-3xl font-black text-amber-600">{mathFluencyResults.dcpm}</div>
                                    <div className="text-xs font-bold text-slate-500 mt-1">DCPM</div>
                                    <div className="text-[10px] text-slate-400">Digits Correct/Min</div>
                                </div>
                                <div className="bg-white rounded-xl p-4 text-center border border-amber-100 shadow-sm">
                                    <div className="text-3xl font-black text-emerald-600">{mathFluencyResults.accuracy}%</div>
                                    <div className="text-xs font-bold text-slate-500 mt-1">Accuracy</div>
                                </div>
                                <div className="bg-white rounded-xl p-4 text-center border border-amber-100 shadow-sm">
                                    <div className="text-3xl font-black text-blue-600">{mathFluencyResults.totalCorrect}/{mathFluencyResults.totalAttempted}</div>
                                    <div className="text-xs font-bold text-slate-500 mt-1">Correct</div>
                                </div>
                                <div className="bg-white rounded-xl p-4 text-center border border-amber-100 shadow-sm">
                                    <div className="text-3xl font-black text-purple-600">{mathFluencyResults.totalDigitsCorrect}</div>
                                    <div className="text-xs font-bold text-slate-500 mt-1">Total Digits</div>
                                </div>
                            </div>
                            {mathFluencyHistory.length >= 2 && (
                                <div className="bg-white rounded-xl p-3 border border-amber-100">
                                    <div className="text-xs font-bold text-slate-500 mb-2">📈 DCPM Trend ({mathFluencyHistory.length} sessions)</div>
                                    <div className="flex items-end gap-1 h-16">
                                        {mathFluencyHistory.map((h, i) => {
                                            const maxDcpm = Math.max(...mathFluencyHistory.map(x => x.dcpm), 1);
                                            const heightPct = (h.dcpm / maxDcpm) * 100;
                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                                    <span className="text-[9px] font-bold text-amber-600">{h.dcpm}</span>
                                                    <div className="w-full bg-gradient-to-t from-amber-400 to-orange-300 rounded-t" style={{ height: `${heightPct}%`, minHeight: '4px' }} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-2 mt-4">
                                <button onClick={startMathFluencyProbe} className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md flex items-center justify-center gap-2">
                                    <RefreshCw size={14} /> Run Again
                                </button>
                            </div>
                        </div>
                    )}
"""

# ─── APPLY MODIFICATIONS ─────────────────────────────────────────────

def apply():
    lines = read_file()
    original_len = len(lines)
    mods = []

    # === MOD 1: Add state variables after mathQuantity/showMathAnswers (L35129) ===
    anchor1 = None
    for i, l in enumerate(lines):
        if 'showMathAnswers' in l and 'useState' in l:
            anchor1 = i
            break
    if anchor1 is None:
        print("ERROR: Could not find showMathAnswers useState line")
        sys.exit(1)
    print(f"MOD 1: Adding state vars after L{anchor1+1}")
    state_lines = STATE_VARS.strip().split('\n')
    for j, sl in enumerate(state_lines):
        lines.insert(anchor1 + 1 + j, sl)
    offset1 = len(state_lines)
    mods.append(('state_vars', anchor1, offset1))
    print(f"  Inserted {offset1} lines")

    # === MOD 2: Add 'Fluency Probe' option in math mode dropdown ===
    anchor2 = None
    for i, l in enumerate(lines):
        if "Real-World Application" in l and "option" in l.lower() and i > 60000 + offset1:
            anchor2 = i
            break
    if anchor2 is None:
        print("ERROR: Could not find Real-World Application option line")
        sys.exit(1)
    print(f"MOD 2: Adding Fluency Probe dropdown option after L{anchor2+1}")
    lines.insert(anchor2 + 1, DROPDOWN_OPTION.rstrip('\n'))
    offset2 = 1
    mods.append(('dropdown', anchor2, offset2))
    print(f"  Inserted {offset2} line")

    # === MOD 3: Add probe config UI after the </div> that closes the math mode dropdown area ===
    # Find the closing </div> of the mode dropdown group
    anchor3 = None
    for i in range(anchor2 + offset2 + 1, min(anchor2 + offset2 + 10, len(lines))):
        if '</select>' in lines[i]:
            anchor3 = i
            # Find closing </div> after select
            for k in range(anchor3, min(anchor3 + 5, len(lines))):
                if '</div>' in lines[k]:
                    anchor3 = k
                    break
            break
    # Actually, insert after the closing of the mode dropdown div group
    # The pattern is: </select> </div> </div> then the quantity section
    # Find the line that has (mathMode === 'Problem Set Generator' 
    for i in range(anchor2 + offset2 + 1, min(anchor2 + offset2 + 20, len(lines))):
        if 'Problem Set Generator' in lines[i] and '&&' in lines[i]:
            anchor3 = i
            break
    if anchor3 is None:
        print("ERROR: Could not find Problem Set Generator conditional")
        sys.exit(1)
    print(f"MOD 3: Adding probe config UI before L{anchor3+1}")
    config_lines = PROBE_CONFIG_UI.strip().split('\n')
    for j, cl in enumerate(config_lines):
        lines.insert(anchor3 + j, cl)
    offset3 = len(config_lines)
    mods.append(('config_ui', anchor3, offset3))
    print(f"  Inserted {offset3} lines")

    # === MOD 4: Add fluency probe rendering view in the math output section ===
    # Find the math output rendering area - look for the "STEM Solver" heading or showMathAnswers toggle
    anchor4 = None
    for i, l in enumerate(lines):
        if 'handleToggleShowMathAnswers' in l and i > 70000 + offset1 + offset2 + offset3:
            # Go up to find the start of the math output section
            for k in range(i - 10, i):
                if 'generatedContent' in lines[k] and 'math' in lines[k]:
                    anchor4 = k
                    break
            if anchor4 is None:
                anchor4 = i - 5
            break
    if anchor4 is None:
        print("ERROR: Could not find math output rendering area")
        sys.exit(1)
    print(f"MOD 4: Adding fluency probe view before L{anchor4+1}")
    view_lines = FLUENCY_PROBE_VIEW.strip().split('\n')
    for j, vl in enumerate(view_lines):
        lines.insert(anchor4 + j, vl)
    offset4 = len(view_lines)
    mods.append(('fluency_view', anchor4, offset4))
    print(f"  Inserted {offset4} lines")

    # === WRITE ===
    total_added = sum(m[2] for m in mods)
    print(f"\nTotal lines added: {total_added}")
    print(f"Original: {original_len} lines -> New: {len(lines)} lines")
    write_file(lines)
    print("✅ File written successfully")

if __name__ == '__main__':
    apply()
