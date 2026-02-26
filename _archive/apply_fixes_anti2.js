const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');
let changes = 0;

function fix(name, old, repl) {
    if (content.includes(old)) {
        content = content.replace(old, repl);
        console.log('✅ ' + name);
        changes++;
    } else {
        console.log('❌ ' + name + ' — anchor NOT found');
    }
}

console.log('Starting: ' + content.split('\n').length + ' lines\n');

// ============================================================
// 1. BUTTON NESTING FIX
// Close the button BEFORE Literacy card, remove orphan </button>
// Anti2 has same bug: L13542 "▶ Start Math Probe\r\n\r\n" then Literacy card
// ============================================================
fix('BUTTON: Close button after text',
    '▶ Start Math Probe\r\n\r\n                    <div className="bg-gradient-to-r from-emerald-50',
    '▶ Start Math Probe\r\n                            </button>\r\n                    <div className="bg-gradient-to-r from-emerald-50'
);

// Remove orphan </button> at L13605  
fix('BUTTON: Remove orphan </button>',
    '                    </div>\r\n                            </button>\r\n                        </div>\r\n                        <div className="mt-2',
    '                    </div>\r\n                        </div>\r\n                        <div className="mt-2'
);

// ============================================================
// 2. ACTIVITY TABS: Hide during probe mode
// ============================================================
fix('LIT-1: Activity tabs hidden during probe',
    '{!isStudentLocked && <div className="border-b border-slate-200 px-4 py-3 overflow-x-auto">',
    '{!isStudentLocked && !isProbeMode && <div className="border-b border-slate-200 px-4 py-3 overflow-x-auto">'
);

// ============================================================
// 3. PROBE TIMER: Add elapsed timer state + interval
// ============================================================
fix('LIT-2: Probe elapsed timer',
    "if (isProbeMode && wordSoundsScore.total === 1 && !probeStartTimeRef.current) {\r\n            probeStartTimeRef.current = Date.now();\r\n        }\r\n    }, [isProbeMode, wordSoundsScore.total]);",
    `if (isProbeMode && wordSoundsScore.total === 1 && !probeStartTimeRef.current) {
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
    }, [isProbeMode, probeStartTimeRef.current]);`
);

// ============================================================
// 4. BACK BUTTON: Guard during probe
// ============================================================
fix('LIT-3: Back button guard',
    'onClick={onBackToSetup || onClose}\r\n                        data-help-key="word_sounds_review_back"',
    'onClick={() => { if (isProbeMode && wordSoundsScore.total > 0 && !window.confirm("End probe early? Progress will be lost.")) return; (onBackToSetup || onClose)?.(); }}\r\n                        data-help-key="word_sounds_review_back"'
);

// ============================================================
// 5. SESSION COMPLETION: Probe-aware (total vs correct)
// ============================================================
fix('LIT-4: Probe-aware session completion',
    'if (wordSoundsScore.correct >= (wordSoundsSessionGoal + (orthoSessionGoal || 0))) {',
    'if (isProbeMode ? wordSoundsScore.total >= wordSoundsSessionGoal : wordSoundsScore.correct >= (wordSoundsSessionGoal + (orthoSessionGoal || 0))) {'
);

// ============================================================
// 6. WCPM: Calculate at session completion
// ============================================================
fix('LIT-5: WCPM calculation',
    'debugLog("WordSounds: Session Goal Met! Complete.");\r\n                        setShowSessionComplete(true);',
    `debugLog("WordSounds: Session Goal Met! Complete.");
                        if (isProbeMode && probeStartTimeRef.current && onProbeComplete) {
                            const elapsedMinutes = Math.max((Date.now() - probeStartTimeRef.current) / 60000, 0.01);
                            const wcpm = Math.round(wordSoundsScore.correct / elapsedMinutes);
                            onProbeComplete({ wcpm, correct: wordSoundsScore.correct, total: wordSoundsScore.total, elapsed: Math.round(elapsedMinutes * 60), activity: wordSoundsActivity });
                        }
                        setShowSessionComplete(true);`
);

// ============================================================
// 7. PROBE HEADER BANNER
// ============================================================
fix('LIT-6: Probe header banner',
    '<div className="flex-1 overflow-y-auto p-6">\r\n                    {phonemeError && (',
    `{isProbeMode && (
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
                    {phonemeError && (`
);

// ============================================================
// 8. TIMER RESET on startActivity
// ============================================================
fix('DEEP-1: Timer reset on startActivity',
    "const startActivity = React.useCallback((activityId, forceWord = null, excludeWord = null, recursionDepth = 0) => {\r\n        setWordSoundsActivity(activityId);\r\n        setWordSoundsFeedback?.(null);\r\n        setUserAnswer('');\r\n        setAttempts(0);",
    `const startActivity = React.useCallback((activityId, forceWord = null, excludeWord = null, recursionDepth = 0) => {
        setWordSoundsActivity(activityId);
        setWordSoundsFeedback?.(null);
        setUserAnswer('');
        setAttempts(0);
        if (isProbeMode) {
            probeStartTimeRef.current = null;
            setProbeElapsed(0);
        }`
);

// ============================================================
// 9. QUEUE REFILL blocked in probe
// ============================================================
fix('DEEP-2: Queue refill blocked in probe',
    '} else {\r\n                        debugLog("⚠️ Queue empty but goal not met. Forcing refill...");\r\n                        generateSessionQueue(wordSoundsActivity, \'medium\');',
    `} else if (isProbeMode) {
                        debugLog("📊 Probe: Queue depleted. Ending probe.");
                        if (probeStartTimeRef.current && onProbeComplete) {
                            const elapsedMinutes = Math.max((Date.now() - probeStartTimeRef.current) / 60000, 0.01);
                            const wcpm = Math.round(wordSoundsScore.correct / elapsedMinutes);
                            onProbeComplete({ wcpm, correct: wordSoundsScore.correct, total: wordSoundsScore.total, elapsed: Math.round(elapsedMinutes * 60), activity: wordSoundsActivity });
                        }
                        setShowSessionComplete(true);
                    } else {
                        debugLog("⚠️ Queue empty but goal not met. Forcing refill...");
                        generateSessionQueue(wordSoundsActivity, 'medium');`
);

// ============================================================
// 10. FEEDBACK DELAY reduced in probe mode
// ============================================================
fix('DEEP-3: Feedback delay reduced',
    '}, isCorrect ? 2000 : 3000);',
    '}, isProbeMode ? (isCorrect ? 800 : 1200) : (isCorrect ? 2000 : 3000));'
);

// ============================================================
// 11. HINTS forced off in probe
// ============================================================
fix('DEEP-4: Hints forced off in probe',
    "const [showLetterHints, setShowLetterHints] = React.useState(false);",
    `const [showLetterHints, setShowLetterHints] = React.useState(false);
    React.useEffect(() => {
        if (isProbeMode) {
            setShowLetterHints(false);
        }
    }, [isProbeMode]);`
);

// ============================================================
// 12. IMAGE VISIBILITY off in probe
// ============================================================
fix('DEEP-5: Image visibility off in probe',
    "const [imageVisibilityMode, setImageVisibilityMode] = React.useState('smart');",
    `const [imageVisibilityMode, setImageVisibilityMode] = React.useState('smart');
    React.useEffect(() => {
        if (isProbeMode) setImageVisibilityMode('off');
    }, [isProbeMode]);`
);

// ============================================================
// 13. MN auto-finish on timer expiry
// ============================================================
fix('MATH: MN auto-finish',
    'const [mnProbeTimer, setMnProbeTimer] = React.useState(0);\r\n    const mnProbeTimerRef = React.useRef(null);\r\n    const mnProbeInputRef = React.useRef(null);',
    `const [mnProbeTimer, setMnProbeTimer] = React.useState(0);
    const mnProbeTimerRef = React.useRef(null);
    const mnProbeInputRef = React.useRef(null);
    React.useEffect(() => {
        if (mnProbeActive && mnProbeTimer === 0 && mnProbeTimerRef.current === null && mnProbeProblems.length > 0 && !mnProbeResults) {
            const answered = mnProbeProblems.filter(p => p.studentAnswer !== null);
            const correct = answered.filter(p => p.correct).length;
            setMnProbeResults({ correct, total: answered.length, problems: mnProbeProblems, type: 'missing_number' });
            setMnProbeActive(false);
        }
    }, [mnProbeTimer, mnProbeActive, mnProbeProblems, mnProbeResults]);`
);

// ============================================================
// 14. QD auto-finish on timer expiry
// ============================================================
fix('MATH: QD auto-finish',
    'const [qdProbeTimer, setQdProbeTimer] = React.useState(0);\r\n    const qdProbeTimerRef = React.useRef(null);',
    `const [qdProbeTimer, setQdProbeTimer] = React.useState(0);
    const qdProbeTimerRef = React.useRef(null);
    React.useEffect(() => {
        if (qdProbeActive && qdProbeTimer === 0 && qdProbeTimerRef.current === null && qdProbeProblems.length > 0 && !qdProbeResults) {
            const answered = qdProbeProblems.filter(p => p.studentAnswer !== null);
            const correct = answered.filter(p => p.correct).length;
            setQdProbeResults({ correct, total: answered.length, problems: qdProbeProblems, type: 'quantity_discrimination' });
            setQdProbeActive(false);
        }
    }, [qdProbeTimer, qdProbeActive, qdProbeProblems, qdProbeResults]);`
);

fs.writeFileSync(f, content, 'utf8');
const finalLines = content.split('\n').length;
console.log('\n=== ' + changes + '/14 fixes applied ===');
console.log('Final: ' + finalLines + ' lines (' + content.length + ' bytes)');
