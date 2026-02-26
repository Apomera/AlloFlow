const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');
let changes = 0;

// ============================================================
// FIX 1: Reset probeStartTimeRef when probe starts
// Add reset + probeElapsed reset at startActivity
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
    console.log('✅ FIX 1: probeStartTimeRef + probeElapsed reset on startActivity');
    changes++;
} else {
    console.log('❌ FIX 1: startActivity anchor not found');
}

// ============================================================
// FIX 2: Guard queue refill during probe mode
// At L8487, generateSessionQueue is called when queue empty but goal not met
// In probe mode, just end the probe — don't add random words
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
    console.log('✅ FIX 2: Queue refill blocked in probe mode — ends probe instead');
    changes++;
} else {
    console.log('❌ FIX 2: Queue refill anchor not found');
}

// ============================================================
// FIX 3: Guard auto-advance activity switching during probe
// At L8146/8167/8178, setWordSoundsActivity switches to next activity
// In probe mode, should NOT switch — just continue with current activity
// ============================================================
// L8146 context: where it auto-advances to next activity in sequence
const oldAutoAdvance = 'setWordSoundsActivity(nextActivity);';
// Only applies in the advance path, not in startActivity
// Need to find the right one — check context
let advanceIdx = content.indexOf(oldAutoAdvance);
if (advanceIdx > -1) {
    // Get the line number
    const lineNum = content.substring(0, advanceIdx).split('\n').length;
    console.log('  Auto-advance at L' + lineNum);
    // Only guard if it's in the answer-checking path (around L8146)
    if (lineNum > 8100 && lineNum < 8200) {
        content = content.replace(oldAutoAdvance,
            'if (!isProbeMode) setWordSoundsActivity(nextActivity);');
        console.log('✅ FIX 3a: Auto-advance guarded at L' + lineNum);
        changes++;
    }
}

const oldOrthoAdvance = "setWordSoundsActivity('orthography');";
let orthoIdx = content.indexOf(oldOrthoAdvance);
if (orthoIdx > -1) {
    const lineNum2 = content.substring(0, orthoIdx).split('\n').length;
    if (lineNum2 > 8100 && lineNum2 < 8200) {
        content = content.replace(oldOrthoAdvance,
            "if (!isProbeMode) setWordSoundsActivity('orthography');");
        console.log('✅ FIX 3b: Ortho auto-advance guarded at L' + lineNum2);
        changes++;
    }
}

const oldNextOrtho = 'setWordSoundsActivity(nextOrtho);';
let nextOrthoIdx = content.indexOf(oldNextOrtho);
if (nextOrthoIdx > -1) {
    const lineNum3 = content.substring(0, nextOrthoIdx).split('\n').length;
    if (lineNum3 > 8100 && lineNum3 < 8200) {
        content = content.replace(oldNextOrtho,
            'if (!isProbeMode) setWordSoundsActivity(nextOrtho);');
        console.log('✅ FIX 3c: Next ortho advance guarded at L' + lineNum3);
        changes++;
    }
}

// ============================================================
// FIX 4: Reduce feedback delay in probe mode (2s/3s → 0.8s/1.2s)
// ============================================================
const oldDelay = '}, isCorrect ? 2000 : 3000);';
const newDelay = '}, isProbeMode ? (isCorrect ? 800 : 1200) : (isCorrect ? 2000 : 3000));';

if (content.includes(oldDelay)) {
    content = content.replace(oldDelay, newDelay);
    console.log('✅ FIX 4: Feedback delay reduced in probe mode (800ms/1200ms)');
    changes++;
} else {
    console.log('❌ FIX 4: Delay anchor not found');
}

// ============================================================
// FIX 5: Hide hints/scaffolding during probes
// Disable: showLetterHints toggle, showWordText toggle, image reveal
// Find the Show Letters toggle and guard with isProbeMode
// ============================================================
// The showLetterHints toggle button
const oldLetterHints = "onClick={() => setShowLetterHints(!showLetterHints)}";
const newLetterHints = "onClick={() => { if (isProbeMode) return; setShowLetterHints(!showLetterHints); }}";

if (content.includes(oldLetterHints)) {
    content = content.replace(oldLetterHints, newLetterHints);
    console.log('✅ FIX 5a: Letter hints toggle disabled during probes');
    changes++;
} else {
    console.log('❌ FIX 5a: Letter hints toggle not found');
}

// The "Show Word" reveal button
const oldShowWord = "onClick={() => setShowWordText(!showWordText)}";
const newShowWord = "onClick={() => { if (isProbeMode) return; setShowWordText(!showWordText); }}";

if (content.includes(oldShowWord)) {
    content = content.replace(oldShowWord, newShowWord);
    console.log('✅ FIX 5b: Show word toggle disabled during probes');
    changes++;
} else {
    console.log('❌ FIX 5b: Show word toggle not found');
}

// ============================================================
// FIX 6: Session complete screen shows WCPM in probe mode
// Find the showSessionComplete rendering and add probe results
// ============================================================
const oldSessionComplete = '{showSessionComplete && (';
const oldSessionCompleteIdx = content.indexOf(oldSessionComplete);
if (oldSessionCompleteIdx > -1) {
    const lineNum = content.substring(0, oldSessionCompleteIdx).split('\n').length;
    console.log('  Session complete screen at L' + lineNum);
    // We need to view what comes after to add probe results
}

fs.writeFileSync(f, content, 'utf8');
console.log('\n=== ' + changes + ' fixes applied ===');
console.log('Saved! (' + content.length + ' bytes)');
