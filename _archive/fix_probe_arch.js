const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');
let changes = 0;

// ============================================================
// FIX 1: Hide activity tabs during probe mode (L10948)
// Currently: {!isStudentLocked && <div ...>
// Fix: {!isStudentLocked && !isProbeMode && <div ...>
// ============================================================
const oldTabGuard = '{!isStudentLocked && <div className="border-b border-slate-200 px-4 py-3 overflow-x-auto">';
const newTabGuard = '{!isStudentLocked && !isProbeMode && <div className="border-b border-slate-200 px-4 py-3 overflow-x-auto">';

if (content.includes(oldTabGuard)) {
    content = content.replace(oldTabGuard, newTabGuard);
    console.log('✅ FIX 1: Activity tabs hidden during probe mode');
    changes++;
} else {
    console.log('❌ FIX 1: Activity tab guard anchor not found');
}

// ============================================================
// FIX 2: Add probe timer state + interval (after probeStartTimeRef L5807)
// Insert probeElapsed state and a useEffect timer
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
    console.log('✅ FIX 2: Probe elapsed timer state + interval added');
    changes++;
} else {
    console.log('❌ FIX 2: Probe timer anchor not found');
}

// ============================================================
// FIX 3: Guard back button during probe mode (L4205)
// Currently: onClick={onBackToSetup || onClose}
// Fix: Add isProbeMode confirmation guard
// ============================================================
const oldBack = 'onClick={onBackToSetup || onClose}\n                        data-help-key="word_sounds_review_back"';
const newBack = 'onClick={() => { if (isProbeMode && wordSoundsScore.total > 0 && !window.confirm("End probe early? Progress will be lost.")) return; (onBackToSetup || onClose)?.(); }}\n                        data-help-key="word_sounds_review_back"';

if (content.includes(oldBack)) {
    content = content.replace(oldBack, newBack);
    console.log('✅ FIX 3: Back button guarded during probe mode');
    changes++;
} else {
    console.log('❌ FIX 3: Back button anchor not found');
}

// ============================================================
// FIX 4: Probe-aware session completion (L8482)
// Currently: if (wordSoundsScore.correct >= (wordSoundsSessionGoal + (orthoSessionGoal || 0)))
// Fix: In probe mode, check total >= goal instead of correct >= goal
// ============================================================
const oldGoal = 'if (wordSoundsScore.correct >= (wordSoundsSessionGoal + (orthoSessionGoal || 0))) {';
const newGoal = 'if (isProbeMode ? wordSoundsScore.total >= wordSoundsSessionGoal : wordSoundsScore.correct >= (wordSoundsSessionGoal + (orthoSessionGoal || 0))) {';

if (content.includes(oldGoal)) {
    content = content.replace(oldGoal, newGoal);
    console.log('✅ FIX 4: Probe-aware session completion (total >= goal in probe mode)');
    changes++;
} else {
    console.log('❌ FIX 4: Session goal anchor not found');
}

// ============================================================
// FIX 5: WCPM calculation + onProbeComplete at session completion
// Find showSessionComplete(true) in the goal-met path and add WCPM calc
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
    console.log('✅ FIX 5: WCPM calculation + onProbeComplete at session completion');
    changes++;
} else {
    console.log('❌ FIX 5: Session complete anchor not found');
}

// ============================================================
// FIX 6: Probe header with timer + progress indicator
// Add a probe banner before the activity content area (L10967)
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
    console.log('✅ FIX 6: Probe header with timer + progress indicator added');
    changes++;
} else {
    console.log('❌ FIX 6: Content area anchor not found');
}

fs.writeFileSync(f, content, 'utf8');
console.log('\n=== ' + changes + '/6 fixes applied ===');
console.log('Saved! (' + content.length + ' bytes)');
