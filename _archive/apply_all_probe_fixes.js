const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');
let changes = 0;

// ============================================================
// BUTTON NESTING FIX (carefully this time!)
// 
// Original structure:
//   L13472: ▶ Start Math Probe    ← button text, no </button>
//   L13473: (empty)
//   L13474: <div> Literacy card   ← renders INSIDE the button!
//   ...
//   L13534: </div>                ← Literacy card close
//   L13535: </button>             ← ORPHAN: closes Start Math Probe
//   L13536: </div>                ← closes flex wrapper
//
// Fix: Close the button RIGHT AFTER its text, then
//      close the flex wrapper and Math card BEFORE Literacy.
//      Remove the orphan </button> at L13535.
//
// Result:
//   ▶ Start Math Probe
//   </button>      ← closes button
//   </div>         ← closes flex wrapper
//   </div>         ← closes Math Fluency card
//   <div> Literacy card ← now a SIBLING
//   ...
//   </div>  ← grid close
//   </div>  ← Literacy card close
//   [remove orphan </button></div>]
// ============================================================

// Step 1: Add </button></div></div> after "Start Math Probe" text
const oldButtonText = '▶ Start Math Probe\n\n                    <div className="bg-gradient-to-r from-emerald-50';
const newButtonText = '▶ Start Math Probe\n                            </button>\n                        </div>\n                    </div>\n                    <div className="bg-gradient-to-r from-emerald-50';

if (content.includes(oldButtonText)) {
    content = content.replace(oldButtonText, newButtonText);
    console.log('✅ BUTTON FIX 1: Added </button></div></div> after Start Math Probe');
    changes++;
} else {
    console.log('❌ BUTTON FIX 1: anchor not found');
}

// Step 2: Remove orphan </button>\n</div> at original L13535-13536
// After our Step 1 fix, the Literacy section has shifted by 3 lines.
// The orphan is right after </div> (Literacy card close).
// Pattern: </div>\n</button>\n</div>  (grid close, orphan button, flex wrapper)
// But we KEEP the flex wrapper </div> since it now has nothing to close
// Actually, after our fix the orphan </button> needs removal AND the </div>
// after it also needs removal since the flex wrapper is already closed above.
const orphanPattern = '                    </div>\n                            </button>\n                        </div>\n                        <div className="mt-2';
const orphanFixed = '                    </div>\n                        <div className="mt-2';

if (content.includes(orphanPattern)) {
    content = content.replace(orphanPattern, orphanFixed);
    console.log('✅ BUTTON FIX 2: Removed orphan </button></div>');
    changes++;
} else {
    console.log('❌ BUTTON FIX 2: orphan pattern not found - checking alternate');
    // The indentation might vary, let's try finding it more precisely
    const alt = '</div>\n                            </button>\n                        </div>';
    if (content.includes(alt)) {
        content = content.replace(alt + '\n                        <div className="mt-2', '</div>\n                        <div className="mt-2');
        console.log('✅ BUTTON FIX 2 (alt): Removed orphan');
        changes++;
    } else {
        console.log('❌ No orphan found at all');
    }
}

// ============================================================
// LITERACY PROBE FIX 1: Hide activity tabs during probe mode
// ============================================================
const oldTabGuard = '{!isStudentLocked && <div className="border-b border-slate-200 px-4 py-3 overflow-x-auto">';
const newTabGuard = '{!isStudentLocked && !isProbeMode && <div className="border-b border-slate-200 px-4 py-3 overflow-x-auto">';
if (content.includes(oldTabGuard)) {
    content = content.replace(oldTabGuard, newTabGuard);
    console.log('✅ LIT 1: Activity tabs hidden during probe');
    changes++;
} else console.log('❌ LIT 1');

// ============================================================
// LITERACY PROBE FIX 2: Probe timer state + interval
// ============================================================
const probeTimerAnchor = "if (isProbeMode && wordSoundsScore.total === 1 && !probeStartTimeRef.current) {\n            probeStartTimeRef.current = Date.now();\n        }\n    }, [isProbeMode, wordSoundsScore.total]);";
const probeTimerReplacement = `if (isProbeMode && wordSoundsScore.total === 1 && !probeStartTimeRef.current) {
            probeStartTimeRef.current = Date.now();
        }
    }, [isProbeMode, wordSoundsScore.total]);
    const [probeElapsed, setProbeElapsed] = React.useState(0);
    React.useEffect(() => {
        if (!isProbeMode || !probeStartTimeRef.current) return;
        const interval = setInterval(() => {
            setProbeElapsed(Math.floor((Date.now() - probeStartTimeRef.current) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [isProbeMode, probeStartTimeRef.current]);`;
if (content.includes(probeTimerAnchor)) {
    content = content.replace(probeTimerAnchor, probeTimerReplacement);
    console.log('✅ LIT 2: Probe elapsed timer');
    changes++;
} else console.log('❌ LIT 2');

// ============================================================
// LITERACY PROBE FIX 3: Guard back button
// ============================================================
const oldBack = 'onClick={onBackToSetup || onClose}\n                        data-help-key="word_sounds_review_back"';
const newBack = 'onClick={() => { if (isProbeMode && wordSoundsScore.total > 0 && !window.confirm("End probe early? Progress will be lost.")) return; (onBackToSetup || onClose)?.(); }}\n                        data-help-key="word_sounds_review_back"';
if (content.includes(oldBack)) {
    content = content.replace(oldBack, newBack);
    console.log('✅ LIT 3: Back button guarded');
    changes++;
} else console.log('❌ LIT 3');

// ============================================================
// LITERACY PROBE FIX 4: Probe-aware session completion
// ============================================================
const oldGoal = 'if (wordSoundsScore.correct >= (wordSoundsSessionGoal + (orthoSessionGoal || 0))) {';
const newGoal = 'if (isProbeMode ? wordSoundsScore.total >= wordSoundsSessionGoal : wordSoundsScore.correct >= (wordSoundsSessionGoal + (orthoSessionGoal || 0))) {';
if (content.includes(oldGoal)) {
    content = content.replace(oldGoal, newGoal);
    console.log('✅ LIT 4: Probe-aware session completion');
    changes++;
} else console.log('❌ LIT 4');

// ============================================================
// LITERACY PROBE FIX 5: WCPM at session completion
// ============================================================
const oldComplete = `debugLog("WordSounds: Session Goal Met! Complete.");
                        setShowSessionComplete(true);`;
const newComplete = `debugLog("WordSounds: Session Goal Met! Complete.");
                        if (isProbeMode && probeStartTimeRef.current && onProbeComplete) {
                            const elapsedMinutes = Math.max((Date.now() - probeStartTimeRef.current) / 60000, 0.01);
                            const wcpm = Math.round(wordSoundsScore.correct / elapsedMinutes);
                            onProbeComplete({ wcpm, correct: wordSoundsScore.correct, total: wordSoundsScore.total, elapsed: Math.round(elapsedMinutes * 60), activity: wordSoundsActivity });
                        }
                        setShowSessionComplete(true);`;
if (content.includes(oldComplete)) {
    content = content.replace(oldComplete, newComplete);
    console.log('✅ LIT 5: WCPM calculation');
    changes++;
} else console.log('❌ LIT 5');

// ============================================================
// LITERACY PROBE FIX 6: Probe header banner
// ============================================================
const oldContentArea = '<div className="flex-1 overflow-y-auto p-6">\n                    {phonemeError && (';
const newContentArea = `{isProbeMode && (
                    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2 flex items-center justify-between text-sm font-bold shadow-inner">
                        <div className="flex items-center gap-3">
                            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">📊 PROBE MODE</span>
                            <span>Word {wordSoundsScore.total + 1} of {wordSoundsSessionGoal}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span>{wordSoundsScore.correct} correct / {wordSoundsScore.total} total</span>
                            {probeStartTimeRef.current && (
                                <span className="bg-white/20 px-2 py-0.5 rounded-full tabular-nums">
                                    ⏱ {Math.floor(probeElapsed / 60)}:{String(probeElapsed % 60).padStart(2, '0')}
                                </span>
                            )}
                        </div>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto p-6">
                    {phonemeError && (`;
if (content.includes(oldContentArea)) {
    content = content.replace(oldContentArea, newContentArea);
    console.log('✅ LIT 6: Probe header banner');
    changes++;
} else console.log('❌ LIT 6');

// ============================================================
// DEEP FIX 1: Timer reset on startActivity
// ============================================================
const oldStartActivity = "const startActivity = React.useCallback((activityId, forceWord = null, excludeWord = null, recursionDepth = 0) => {\n        setWordSoundsActivity(activityId);\n        setWordSoundsFeedback?.(null);\n        setUserAnswer('');\n        setAttempts(0);";
const newStartActivity = `const startActivity = React.useCallback((activityId, forceWord = null, excludeWord = null, recursionDepth = 0) => {
        setWordSoundsActivity(activityId);
        setWordSoundsFeedback?.(null);
        setUserAnswer('');
        setAttempts(0);
        if (isProbeMode) {
            probeStartTimeRef.current = null;
            setProbeElapsed(0);
        }`;
if (content.includes(oldStartActivity)) {
    content = content.replace(oldStartActivity, newStartActivity);
    console.log('✅ DEEP 1: Timer reset on startActivity');
    changes++;
} else console.log('❌ DEEP 1');

// ============================================================
// DEEP FIX 2: Queue refill blocked in probe
// ============================================================
const oldRefill = `} else {
                        debugLog("⚠️ Queue empty but goal not met. Forcing refill...");
                        generateSessionQueue(wordSoundsActivity, 'medium');`;
const newRefill = `} else if (isProbeMode) {
                        debugLog("📊 Probe: Queue depleted. Ending probe.");
                        if (probeStartTimeRef.current && onProbeComplete) {
                            const elapsedMinutes = Math.max((Date.now() - probeStartTimeRef.current) / 60000, 0.01);
                            const wcpm = Math.round(wordSoundsScore.correct / elapsedMinutes);
                            onProbeComplete({ wcpm, correct: wordSoundsScore.correct, total: wordSoundsScore.total, elapsed: Math.round(elapsedMinutes * 60), activity: wordSoundsActivity });
                        }
                        setShowSessionComplete(true);
                    } else {
                        debugLog("⚠️ Queue empty but goal not met. Forcing refill...");
                        generateSessionQueue(wordSoundsActivity, 'medium');`;
if (content.includes(oldRefill)) {
    content = content.replace(oldRefill, newRefill);
    console.log('✅ DEEP 2: Queue refill blocked');
    changes++;
} else console.log('❌ DEEP 2');

// ============================================================
// DEEP FIX 3: Feedback delay reduced in probe mode
// ============================================================
const oldDelay = '}, isCorrect ? 2000 : 3000);';
const newDelay = '}, isProbeMode ? (isCorrect ? 800 : 1200) : (isCorrect ? 2000 : 3000));';
if (content.includes(oldDelay)) {
    content = content.replace(oldDelay, newDelay);
    console.log('✅ DEEP 3: Feedback delay reduced');
    changes++;
} else console.log('❌ DEEP 3');

// ============================================================
// DEEP FIX 4: Hints forced off + image off in probe
// ============================================================
const hintStateDecl = "const [showLetterHints, setShowLetterHints] = React.useState(false);";
const probeHintGuard = `const [showLetterHints, setShowLetterHints] = React.useState(false);
    React.useEffect(() => {
        if (isProbeMode) {
            setShowLetterHints(false);
        }
    }, [isProbeMode]);`;
if (content.includes(hintStateDecl)) {
    content = content.replace(hintStateDecl, probeHintGuard);
    console.log('✅ DEEP 4: Hints forced off in probe');
    changes++;
} else console.log('❌ DEEP 4');

// ============================================================
// DEEP FIX 5: Image visibility off in probe
// ============================================================
const imgModeDecl = "const [imageVisibilityMode, setImageVisibilityMode] = React.useState('smart');";
const probeImgGuard = `const [imageVisibilityMode, setImageVisibilityMode] = React.useState('smart');
    React.useEffect(() => {
        if (isProbeMode) setImageVisibilityMode('off');
    }, [isProbeMode]);`;
if (content.includes(imgModeDecl)) {
    content = content.replace(imgModeDecl, probeImgGuard);
    console.log('✅ DEEP 5: Image vis off in probe');
    changes++;
} else console.log('❌ DEEP 5');

// ============================================================
// MATH FIX 1: MN Probe auto-finish on timer expiry
// ============================================================
const mnTimerState = 'const [mnProbeTimer, setMnProbeTimer] = React.useState(0);\n    const mnProbeTimerRef = React.useRef(null);\n    const mnProbeInputRef = React.useRef(null);';
const mnTimerFix = `const [mnProbeTimer, setMnProbeTimer] = React.useState(0);
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
    content = content.replace(mnTimerState, mnTimerFix);
    console.log('✅ MATH 1: MN auto-finish');
    changes++;
} else console.log('❌ MATH 1');

// ============================================================
// MATH FIX 2: QD Probe auto-finish on timer expiry
// ============================================================
const qdTimerState = 'const [qdProbeTimer, setQdProbeTimer] = React.useState(0);\n    const qdProbeTimerRef = React.useRef(null);';
const qdTimerFix = `const [qdProbeTimer, setQdProbeTimer] = React.useState(0);
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
    content = content.replace(qdTimerState, qdTimerFix);
    console.log('✅ MATH 2: QD auto-finish');
    changes++;
} else console.log('❌ MATH 2');

// ============================================================
// MATH FIX 3: MN Probe active UI (after "Start Missing Number" button)
// ============================================================
const mnLaunchEnd = '▶ Start Missing Number\n                            </button>\n                        </div>\n                    </div>';
const mnUI = `▶ Start Missing Number
                            </button>
                        </div>
                        {mnProbeActive && (
                            <div className="mt-4 bg-white rounded-xl border-2 border-purple-300 p-6 shadow-lg animate-in fade-in slide-in-from-top-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">📊 MN PROBE</span>
                                        <span className="text-sm font-medium text-slate-600">Problem {mnProbeIndex + 1} of {mnProbeProblems.length}</span>
                                    </div>
                                    <span className={\`tabular-nums px-3 py-1 rounded-full text-sm font-bold \${mnProbeTimer <= 10 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-700'}\`}>⏱ {Math.floor(mnProbeTimer / 60)}:{String(mnProbeTimer % 60).padStart(2, '0')}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 mb-4"><div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: \`\${(mnProbeIndex / mnProbeProblems.length) * 100}%\` }} /></div>
                                {mnProbeTimer > 0 && mnProbeIndex < mnProbeProblems.length ? (() => {
                                    const problem = mnProbeProblems[mnProbeIndex];
                                    return (
                                        <div className="text-center">
                                            <div className="text-3xl font-bold text-slate-800 mb-6 tracking-wider">{problem.sequence.map((item, i) => (<span key={i} className={\`mx-1 \${item === '___' ? 'inline-block w-16 border-b-4 border-purple-400 text-purple-600' : ''}\`}>{item === '___' ? (mnProbeAnswer || '?') : item}</span>))}</div>
                                            <div className="flex items-center justify-center gap-3">
                                                <input ref={mnProbeInputRef} type="number" value={mnProbeAnswer} onChange={(e) => setMnProbeAnswer(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && mnProbeAnswer !== '') { const ans = parseInt(mnProbeAnswer, 10); const isCorrect = ans === problem.answer; const updated = [...mnProbeProblems]; updated[mnProbeIndex] = { ...updated[mnProbeIndex], studentAnswer: ans, correct: isCorrect }; setMnProbeProblems(updated); setMnProbeAnswer(''); if (mnProbeIndex + 1 < mnProbeProblems.length) { setMnProbeIndex(mnProbeIndex + 1); setTimeout(() => mnProbeInputRef.current?.focus(), 50); } else { clearInterval(mnProbeTimerRef.current); mnProbeTimerRef.current = null; const correct = updated.filter(p => p.correct).length; setMnProbeResults({ correct, total: updated.length, problems: updated, type: 'missing_number' }); setMnProbeActive(false); } } }} className="w-24 text-center text-2xl font-bold border-2 border-purple-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="?" autoFocus />
                                            </div>
                                        </div>
                                    );
                                })() : <p className="text-center text-lg font-bold text-red-600 py-4">⏰ Time&apos;s Up!</p>}
                            </div>
                        )}
                        {mnProbeResults && (
                            <div className="mt-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-4">
                                <h4 className="font-bold text-slate-700 mb-2">📊 Missing Number Results</h4>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div className="bg-white rounded-lg p-3 shadow-sm"><div className="text-2xl font-bold text-green-600">{mnProbeResults.correct}</div><div className="text-xs text-slate-500">Correct</div></div>
                                    <div className="bg-white rounded-lg p-3 shadow-sm"><div className="text-2xl font-bold text-slate-700">{mnProbeResults.total}</div><div className="text-xs text-slate-500">Attempted</div></div>
                                    <div className="bg-white rounded-lg p-3 shadow-sm"><div className="text-2xl font-bold text-indigo-600">{mnProbeResults.total > 0 ? Math.round((mnProbeResults.correct / mnProbeResults.total) * 100) : 0}%</div><div className="text-xs text-slate-500">Accuracy</div></div>
                                </div>
                            </div>
                        )}
                    </div>`;
if (content.includes(mnLaunchEnd)) {
    content = content.replace(mnLaunchEnd, mnUI);
    console.log('✅ MATH 3: MN Probe active UI');
    changes++;
} else console.log('❌ MATH 3');

// ============================================================
// MATH FIX 4: QD Probe active UI (after "Start QD Probe" button)
// ============================================================
const qdLaunchEnd = '▶ Start QD Probe\n                            </button>\n                        </div>\n                    </div>';
const qdUI = `▶ Start QD Probe
                            </button>
                        </div>
                        {qdProbeActive && (
                            <div className="mt-4 bg-white rounded-xl border-2 border-cyan-300 p-6 shadow-lg animate-in fade-in slide-in-from-top-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-xs font-bold">⚖️ QD PROBE</span>
                                        <span className="text-sm font-medium text-slate-600">Item {qdProbeIndex + 1} of {qdProbeProblems.length}</span>
                                    </div>
                                    <span className={\`tabular-nums px-3 py-1 rounded-full text-sm font-bold \${qdProbeTimer <= 10 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-700'}\`}>⏱ {Math.floor(qdProbeTimer / 60)}:{String(qdProbeTimer % 60).padStart(2, '0')}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 mb-4"><div className="bg-cyan-500 h-2 rounded-full transition-all" style={{ width: \`\${(qdProbeIndex / qdProbeProblems.length) * 100}%\` }} /></div>
                                {qdProbeTimer > 0 && qdProbeIndex < qdProbeProblems.length ? (() => { const problem = qdProbeProblems[qdProbeIndex]; return (<div className="text-center"><p className="text-sm text-slate-500 mb-4 font-medium">Which number is bigger?</p><div className="flex items-center justify-center gap-8">{[problem.a, problem.b].map((num, idx) => (<button key={idx} onClick={() => { const isCorrect = num === problem.answer; const updated = [...qdProbeProblems]; updated[qdProbeIndex] = { ...updated[qdProbeIndex], studentAnswer: num, correct: isCorrect }; setQdProbeProblems(updated); if (qdProbeIndex + 1 < qdProbeProblems.length) { setQdProbeIndex(qdProbeIndex + 1); } else { clearInterval(qdProbeTimerRef.current); qdProbeTimerRef.current = null; const correct = updated.filter(p => p.correct).length; setQdProbeResults({ correct, total: updated.length, problems: updated, type: 'quantity_discrimination' }); setQdProbeActive(false); } }} className="w-28 h-28 text-4xl font-bold rounded-2xl border-4 border-cyan-200 bg-white hover:border-cyan-500 hover:scale-110 transition-all shadow-lg">{num}</button>))}</div></div>); })() : <p className="text-center text-lg font-bold text-red-600 py-4">⏰ Time&apos;s Up!</p>}
                            </div>
                        )}
                        {qdProbeResults && (
                            <div className="mt-4 bg-gradient-to-r from-cyan-50 to-sky-50 rounded-xl border border-cyan-200 p-4">
                                <h4 className="font-bold text-slate-700 mb-2">⚖️ QD Results</h4>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div className="bg-white rounded-lg p-3 shadow-sm"><div className="text-2xl font-bold text-green-600">{qdProbeResults.correct}</div><div className="text-xs text-slate-500">Correct</div></div>
                                    <div className="bg-white rounded-lg p-3 shadow-sm"><div className="text-2xl font-bold text-slate-700">{qdProbeResults.total}</div><div className="text-xs text-slate-500">Attempted</div></div>
                                    <div className="bg-white rounded-lg p-3 shadow-sm"><div className="text-2xl font-bold text-cyan-600">{qdProbeResults.total > 0 ? Math.round((qdProbeResults.correct / qdProbeResults.total) * 100) : 0}%</div><div className="text-xs text-slate-500">Accuracy</div></div>
                                </div>
                            </div>
                        )}
                    </div>`;
if (content.includes(qdLaunchEnd)) {
    content = content.replace(qdLaunchEnd, qdUI);
    console.log('✅ MATH 4: QD Probe active UI');
    changes++;
} else console.log('❌ MATH 4');

fs.writeFileSync(f, content, 'utf8');
console.log('\n=== ' + changes + ' fixes applied ===');
console.log('Saved! (' + content.split('\n').length + ' lines, ' + content.length + ' bytes)');
