const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');
let changes = 0;

// ============================================================
// FIX 1: Add MN Probe active UI rendering
// Insert after the "Start Missing Number" button section (L13654-13656)
// The MN probe UI shows: timer, current problem, answer input, progress
// ============================================================
const mnLaunchEnd = `▶ Start Missing Number
                            </button>
                        </div>
                    </div>`;

const mnLaunchEndReplacement = `▶ Start Missing Number
                            </button>
                        </div>
                        {mnProbeActive && (
                            <div className="mt-4 bg-white rounded-xl border-2 border-purple-300 p-6 shadow-lg animate-in fade-in slide-in-from-top-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">📊 PROBE ACTIVE</span>
                                        <span className="text-sm font-medium text-slate-600">Problem {mnProbeIndex + 1} of {mnProbeProblems.length}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={\`tabular-nums px-3 py-1 rounded-full text-sm font-bold \${mnProbeTimer <= 10 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-700'}\`}>
                                            ⏱ {Math.floor(mnProbeTimer / 60)}:{String(mnProbeTimer % 60).padStart(2, '0')}
                                        </span>
                                        <button onClick={() => {
                                            if (window.confirm("End probe early? Progress will be saved.")) {
                                                clearInterval(mnProbeTimerRef.current);
                                                mnProbeTimerRef.current = null;
                                                const answered = mnProbeProblems.filter(p => p.studentAnswer !== null);
                                                const correct = answered.filter(p => p.correct).length;
                                                setMnProbeResults({ correct, total: answered.length, problems: mnProbeProblems, type: 'missing_number' });
                                                setMnProbeActive(false);
                                            }
                                        }} className="text-xs text-red-500 hover:text-red-700 font-bold">⏹ End Early</button>
                                    </div>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                                    <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: \`\${(mnProbeIndex / mnProbeProblems.length) * 100}%\` }} />
                                </div>
                                {mnProbeTimer > 0 && mnProbeIndex < mnProbeProblems.length ? (() => {
                                    const problem = mnProbeProblems[mnProbeIndex];
                                    return (
                                        <div className="text-center">
                                            <div className="text-3xl font-bold text-slate-800 mb-6 tracking-wider">
                                                {problem.sequence.map((item, i) => (
                                                    <span key={i} className={\`mx-1 \${item === '___' ? 'inline-block w-16 border-b-4 border-purple-400 text-purple-600' : ''}\`}>
                                                        {item === '___' ? (mnProbeAnswer || '?') : item}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="flex items-center justify-center gap-3">
                                                <input
                                                    ref={mnProbeInputRef}
                                                    type="number"
                                                    value={mnProbeAnswer}
                                                    onChange={(e) => setMnProbeAnswer(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && mnProbeAnswer !== '') {
                                                            const ans = parseInt(mnProbeAnswer, 10);
                                                            const isCorrect = ans === problem.answer;
                                                            const updated = [...mnProbeProblems];
                                                            updated[mnProbeIndex] = { ...updated[mnProbeIndex], studentAnswer: ans, correct: isCorrect };
                                                            setMnProbeProblems(updated);
                                                            setMnProbeAnswer('');
                                                            if (mnProbeIndex + 1 < mnProbeProblems.length) {
                                                                setMnProbeIndex(mnProbeIndex + 1);
                                                                setTimeout(() => mnProbeInputRef.current?.focus(), 50);
                                                            } else {
                                                                clearInterval(mnProbeTimerRef.current);
                                                                mnProbeTimerRef.current = null;
                                                                const correct = updated.filter(p => p.correct).length;
                                                                setMnProbeResults({ correct, total: updated.length, problems: updated, type: 'missing_number' });
                                                                setMnProbeActive(false);
                                                            }
                                                        }
                                                    }}
                                                    className="w-24 text-center text-2xl font-bold border-2 border-purple-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                                    placeholder="?"
                                                    autoFocus
                                                />
                                                <button onClick={() => {
                                                    // Skip button
                                                    const updated = [...mnProbeProblems];
                                                    updated[mnProbeIndex] = { ...updated[mnProbeIndex], studentAnswer: null, correct: false };
                                                    setMnProbeProblems(updated);
                                                    setMnProbeAnswer('');
                                                    if (mnProbeIndex + 1 < mnProbeProblems.length) {
                                                        setMnProbeIndex(mnProbeIndex + 1);
                                                        setTimeout(() => mnProbeInputRef.current?.focus(), 50);
                                                    } else {
                                                        clearInterval(mnProbeTimerRef.current);
                                                        mnProbeTimerRef.current = null;
                                                        const correct = updated.filter(p => p.correct).length;
                                                        setMnProbeResults({ correct, total: updated.length, problems: updated, type: 'missing_number' });
                                                        setMnProbeActive(false);
                                                    }
                                                }} className="text-sm text-slate-400 hover:text-slate-600 font-bold">Skip →</button>
                                            </div>
                                        </div>
                                    );
                                })() : (
                                    <div className="text-center py-4">
                                        <p className="text-lg font-bold text-red-600">⏰ Time's Up!</p>
                                        {(() => {
                                            const answered = mnProbeProblems.filter(p => p.studentAnswer !== null);
                                            const correct = answered.filter(p => p.correct).length;
                                            if (!mnProbeResults) {
                                                setMnProbeResults({ correct, total: answered.length, problems: mnProbeProblems, type: 'missing_number' });
                                                setMnProbeActive(false);
                                            }
                                            return null;
                                        })()}
                                    </div>
                                )}
                            </div>
                        )}
                        {mnProbeResults && (
                            <div className="mt-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-4">
                                <h4 className="font-bold text-slate-700 mb-2">📊 Missing Number Probe Results</h4>
                                <div className="grid grid-cols-3 gap-3 text-center mb-3">
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                        <div className="text-2xl font-bold text-green-600">{mnProbeResults.correct}</div>
                                        <div className="text-xs text-slate-500">Correct</div>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                        <div className="text-2xl font-bold text-slate-700">{mnProbeResults.total}</div>
                                        <div className="text-xs text-slate-500">Attempted</div>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                        <div className="text-2xl font-bold text-indigo-600">{mnProbeResults.total > 0 ? Math.round((mnProbeResults.correct / mnProbeResults.total) * 100) : 0}%</div>
                                        <div className="text-xs text-slate-500">Accuracy</div>
                                    </div>
                                </div>
                                {mathProbeStudent && (
                                    <button onClick={() => {
                                        setLatestProbeResult({
                                            student: mathProbeStudent,
                                            type: 'missing_number',
                                            date: new Date().toISOString(),
                                            correct: mnProbeResults.correct,
                                            total: mnProbeResults.total,
                                            accuracy: mnProbeResults.total > 0 ? Math.round((mnProbeResults.correct / mnProbeResults.total) * 100) : 0,
                                            grade: mathProbeGrade,
                                            form: mathProbeForm
                                        });
                                        addToast(\`Probe results saved for \${mathProbeStudent}\`, 'success');
                                    }} className="w-full mt-2 px-4 py-2 bg-purple-500 text-white rounded-lg font-bold text-sm hover:bg-purple-600 transition-colors">
                                        💾 Save to Student Record
                                    </button>
                                )}
                            </div>
                        )}
                    </div>`;

if (content.includes(mnLaunchEnd)) {
    content = content.replace(mnLaunchEnd, mnLaunchEndReplacement);
    console.log('✅ FIX 1: MN Probe active UI + results + timer expiry + save');
    changes++;
} else {
    console.log('❌ FIX 1: MN launch end anchor not found');
}

// ============================================================
// FIX 2: Add QD Probe active UI rendering
// Insert after "Start QD Probe" button
// QD probes show two numbers — student picks the bigger one
// ============================================================
const qdLaunchEnd = `▶ Start QD Probe
                            </button>
                        </div>
                    </div>`;

const qdLaunchEndReplacement = `▶ Start QD Probe
                            </button>
                        </div>
                        {qdProbeActive && (
                            <div className="mt-4 bg-white rounded-xl border-2 border-cyan-300 p-6 shadow-lg animate-in fade-in slide-in-from-top-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-xs font-bold">⚖️ QD PROBE</span>
                                        <span className="text-sm font-medium text-slate-600">Item {qdProbeIndex + 1} of {qdProbeProblems.length}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={\`tabular-nums px-3 py-1 rounded-full text-sm font-bold \${qdProbeTimer <= 10 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-700'}\`}>
                                            ⏱ {Math.floor(qdProbeTimer / 60)}:{String(qdProbeTimer % 60).padStart(2, '0')}
                                        </span>
                                        <button onClick={() => {
                                            if (window.confirm("End probe early?")) {
                                                clearInterval(qdProbeTimerRef.current);
                                                qdProbeTimerRef.current = null;
                                                const answered = qdProbeProblems.filter(p => p.studentAnswer !== null);
                                                const correct = answered.filter(p => p.correct).length;
                                                setQdProbeResults({ correct, total: answered.length, problems: qdProbeProblems, type: 'quantity_discrimination' });
                                                setQdProbeActive(false);
                                            }
                                        }} className="text-xs text-red-500 hover:text-red-700 font-bold">⏹ End Early</button>
                                    </div>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                                    <div className="bg-cyan-500 h-2 rounded-full transition-all" style={{ width: \`\${(qdProbeIndex / qdProbeProblems.length) * 100}%\` }} />
                                </div>
                                {qdProbeTimer > 0 && qdProbeIndex < qdProbeProblems.length ? (() => {
                                    const problem = qdProbeProblems[qdProbeIndex];
                                    return (
                                        <div className="text-center">
                                            <p className="text-sm text-slate-500 mb-4 font-medium">Which number is bigger?</p>
                                            <div className="flex items-center justify-center gap-8">
                                                {[problem.a, problem.b].map((num, i) => (
                                                    <button key={i} onClick={() => {
                                                        const chosen = num;
                                                        const isCorrect = chosen === problem.answer;
                                                        const updated = [...qdProbeProblems];
                                                        updated[qdProbeIndex] = { ...updated[qdProbeIndex], studentAnswer: chosen, correct: isCorrect };
                                                        setQdProbeProblems(updated);
                                                        if (qdProbeIndex + 1 < qdProbeProblems.length) {
                                                            setQdProbeIndex(qdProbeIndex + 1);
                                                        } else {
                                                            clearInterval(qdProbeTimerRef.current);
                                                            qdProbeTimerRef.current = null;
                                                            const correct = updated.filter(p => p.correct).length;
                                                            setQdProbeResults({ correct, total: updated.length, problems: updated, type: 'quantity_discrimination' });
                                                            setQdProbeActive(false);
                                                        }
                                                    }} className="w-28 h-28 text-4xl font-bold rounded-2xl border-4 border-cyan-200 bg-white hover:border-cyan-500 hover:bg-cyan-50 hover:scale-110 transition-all shadow-lg cursor-pointer">
                                                        {num}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })() : (
                                    <div className="text-center py-4">
                                        <p className="text-lg font-bold text-red-600">⏰ Time's Up!</p>
                                        {(() => {
                                            const answered = qdProbeProblems.filter(p => p.studentAnswer !== null);
                                            const correct = answered.filter(p => p.correct).length;
                                            if (!qdProbeResults) {
                                                setQdProbeResults({ correct, total: answered.length, problems: qdProbeProblems, type: 'quantity_discrimination' });
                                                setQdProbeActive(false);
                                            }
                                            return null;
                                        })()}
                                    </div>
                                )}
                            </div>
                        )}
                        {qdProbeResults && (
                            <div className="mt-4 bg-gradient-to-r from-cyan-50 to-sky-50 rounded-xl border border-cyan-200 p-4">
                                <h4 className="font-bold text-slate-700 mb-2">⚖️ Quantity Discrimination Results</h4>
                                <div className="grid grid-cols-3 gap-3 text-center mb-3">
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                        <div className="text-2xl font-bold text-green-600">{qdProbeResults.correct}</div>
                                        <div className="text-xs text-slate-500">Correct</div>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                        <div className="text-2xl font-bold text-slate-700">{qdProbeResults.total}</div>
                                        <div className="text-xs text-slate-500">Attempted</div>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                        <div className="text-2xl font-bold text-cyan-600">{qdProbeResults.total > 0 ? Math.round((qdProbeResults.correct / qdProbeResults.total) * 100) : 0}%</div>
                                        <div className="text-xs text-slate-500">Accuracy</div>
                                    </div>
                                </div>
                                {mathProbeStudent && (
                                    <button onClick={() => {
                                        setLatestProbeResult({
                                            student: mathProbeStudent,
                                            type: 'quantity_discrimination',
                                            date: new Date().toISOString(),
                                            correct: qdProbeResults.correct,
                                            total: qdProbeResults.total,
                                            accuracy: qdProbeResults.total > 0 ? Math.round((qdProbeResults.correct / qdProbeResults.total) * 100) : 0,
                                            grade: mathProbeGrade,
                                            form: mathProbeForm
                                        });
                                        addToast(\`QD results saved for \${mathProbeStudent}\`, 'success');
                                    }} className="w-full mt-2 px-4 py-2 bg-cyan-500 text-white rounded-lg font-bold text-sm hover:bg-cyan-600 transition-colors">
                                        💾 Save to Student Record
                                    </button>
                                )}
                            </div>
                        )}
                    </div>`;

if (content.includes(qdLaunchEnd)) {
    content = content.replace(qdLaunchEnd, qdLaunchEndReplacement);
    console.log('✅ FIX 2: QD Probe active UI + results + timer expiry + save');
    changes++;
} else {
    console.log('❌ FIX 2: QD launch end anchor not found');
}

// ============================================================  
// FIX 3: Add student selector before probe launches
// Insert a student picker dropdown near the grade/form selectors
// ============================================================
const gradeSelector = `<select aria-label="Probe grade"
                                value={mathProbeGrade || "1"}
                                onChange={(e) => setMathProbeGrade(e.target.value)}`;

const gradeSelectorReplacement = `{importedStudents.length > 0 && (
                            <select aria-label="Assign to student"
                                value={mathProbeStudent || ""}
                                onChange={(e) => setMathProbeStudent(e.target.value)}
                                className="text-xs font-bold border border-purple-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-300 mb-2"
                            >
                                <option value="">📋 Select Student...</option>
                                {importedStudents.map(s => (
                                    <option key={s.id || s.name} value={s.nickname || s.name}>{s.nickname || s.name}</option>
                                ))}
                            </select>
                        )}
                            <select aria-label="Probe grade"
                                value={mathProbeGrade || "1"}
                                onChange={(e) => setMathProbeGrade(e.target.value)}`;

if (content.includes(gradeSelector)) {
    content = content.replace(gradeSelector, gradeSelectorReplacement);
    console.log('✅ FIX 3: Student selector added to MN probe');
    changes++;
} else {
    console.log('❌ FIX 3: Grade selector anchor not found');
}

// ============================================================
// FIX 4: Timer-expiry auto-finish for MN probe
// The timer counts to 0 but doesn't auto-finish the probe
// Add a useEffect that watches mnProbeTimer === 0 && mnProbeActive
// ============================================================
const mnTimerState = 'const [mnProbeTimer, setMnProbeTimer] = React.useState(0);\n    const mnProbeTimerRef = React.useRef(null);\n    const mnProbeInputRef = React.useRef(null);';

const mnTimerStateReplacement = `const [mnProbeTimer, setMnProbeTimer] = React.useState(0);
    const mnProbeTimerRef = React.useRef(null);
    const mnProbeInputRef = React.useRef(null);
    React.useEffect(() => {
        if (mnProbeActive && mnProbeTimer === 0 && mnProbeTimerRef.current === null && mnProbeProblems.length > 0 && !mnProbeResults) {
            const answered = mnProbeProblems.filter(p => p.studentAnswer !== null);
            const correct = answered.filter(p => p.correct).length;
            setMnProbeResults({ correct, total: answered.length, problems: mnProbeProblems, type: 'missing_number' });
            setMnProbeActive(false);
        }
    }, [mnProbeTimer, mnProbeActive, mnProbeProblems, mnProbeResults]);`;

if (content.includes(mnTimerState)) {
    content = content.replace(mnTimerState, mnTimerStateReplacement);
    console.log('✅ FIX 4: MN probe auto-finish on timer expiry');
    changes++;
} else {
    console.log('❌ FIX 4: MN timer state anchor not found');
}

// ============================================================
// FIX 5: Timer-expiry auto-finish for QD probe
// ============================================================
const qdTimerState = 'const [qdProbeTimer, setQdProbeTimer] = React.useState(0);\n    const qdProbeTimerRef = React.useRef(null);';

const qdTimerStateReplacement = `const [qdProbeTimer, setQdProbeTimer] = React.useState(0);
    const qdProbeTimerRef = React.useRef(null);
    React.useEffect(() => {
        if (qdProbeActive && qdProbeTimer === 0 && qdProbeTimerRef.current === null && qdProbeProblems.length > 0 && !qdProbeResults) {
            const answered = qdProbeProblems.filter(p => p.studentAnswer !== null);
            const correct = answered.filter(p => p.correct).length;
            setQdProbeResults({ correct, total: answered.length, problems: qdProbeProblems, type: 'quantity_discrimination' });
            setQdProbeActive(false);
        }
    }, [qdProbeTimer, qdProbeActive, qdProbeProblems, qdProbeResults]);`;

if (content.includes(qdTimerState)) {
    content = content.replace(qdTimerState, qdTimerStateReplacement);
    console.log('✅ FIX 5: QD probe auto-finish on timer expiry');
    changes++;
} else {
    console.log('❌ FIX 5: QD timer state anchor not found');
}

fs.writeFileSync(f, content, 'utf8');
console.log('\n=== ' + changes + '/5 fixes applied ===');
console.log('Saved! (' + content.length + ' bytes)');
