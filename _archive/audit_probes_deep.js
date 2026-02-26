const fs = require('fs');
const c = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const lines = c.split('\n');
let issues = [];

console.log('📋 Probe Deep Bug & UX Audit — Second Pass\n');

// ============================================================
// AUDIT 1: probeStartTimeRef initialization edge case
// Does it get reset between probes? What if user runs two probes?
// ============================================================
console.log('=== 1. probeStartTimeRef lifecycle ===');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('probeStartTimeRef')) {
        console.log('  L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
    }
}
// Check if it's ever cleared
const hasReset = c.includes('probeStartTimeRef.current = null') || c.includes('probeStartTimeRef.current = 0');
console.log('  Reset to null/0: ' + (hasReset ? '✅' : '❌ NEVER RESET'));
if (!hasReset) issues.push('BUG: probeStartTimeRef never reset between probes — second probe will use stale start time');

// ============================================================
// AUDIT 2: Score state reset between probes
// ============================================================
console.log('\n=== 2. Score reset between probes ===');
const scoreReset = c.includes('setWordSoundsScore({ correct: 0, total: 0');
console.log('  Score reset to {0,0}: ' + (scoreReset ? '✅ found' : '❌ NOT FOUND'));
// Check if score resets on activity start
for (let i = 7440; i < 7500; i++) {
    if (lines[i] && lines[i].includes('setWordSoundsScore')) {
        console.log('  L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
    }
}

// ============================================================
// AUDIT 3: showSessionComplete in probe mode
// What does the session complete screen show? Is it probe-aware?
// ============================================================
console.log('\n=== 3. Session complete screen ===');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('showSessionComplete') && (lines[i].includes('div') || lines[i].includes('className') || lines[i].includes('<'))) {
        console.log('  L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
    }
}

// ============================================================
// AUDIT 4: Probe word source — does it use glossary or dedicated probe words?
// ============================================================
console.log('\n=== 4. Probe word source ===');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('probeWord') && !lines[i].includes('probeStartTimeRef')) {
        console.log('  L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
    }
}
const probeGradeUsed = c.includes('probeGradeLevel');
console.log('  probeGradeLevel used: ' + (probeGradeUsed ? '✅' : '⚠️ prop exists but may not be used'));

// ============================================================
// AUDIT 5: Queue depletion in probe mode
// What happens when probe queue runs out mid-probe?
// ============================================================
console.log('\n=== 5. Queue refill during probe ===');
const refillInProbe = c.includes('isProbeMode') && c.includes('generateSessionQueue');
// Check if generateSessionQueue is called during probe without guard
for (let i = 8480; i < 8510; i++) {
    if (lines[i] && lines[i].includes('generateSessionQueue')) {
        console.log('  L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
        if (!lines[i - 3]?.includes('isProbeMode') && !lines[i - 2]?.includes('isProbeMode') && !lines[i - 1]?.includes('isProbeMode')) {
            issues.push('BUG: Queue refill at L' + (i + 1) + ' not guarded by isProbeMode — can add non-probe words mid-assessment');
        }
    }
}

// ============================================================
// AUDIT 6: Auto-advance to next activity during probe
// startActivity call after session complete could switch activity
// ============================================================
console.log('\n=== 6. Auto-advance during probe ===');
for (let i = 8140; i < 8190; i++) {
    if (lines[i] && (lines[i].includes('setWordSoundsActivity') || lines[i].includes('startActivity'))) {
        console.log('  L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
        const nearbyProbeGuard = lines.slice(Math.max(0, i - 5), i).some(l => l.includes('isProbeMode'));
        if (!nearbyProbeGuard) {
            issues.push('BUG: Auto-advance at L' + (i + 1) + ' not guarded by isProbeMode — can switch activity mid-probe');
        }
    }
}

// ============================================================
// AUDIT 7: Feedback timing — does auto-advance wait too long?
// ============================================================
console.log('\n=== 7. Feedback delay before advance ===');
for (let i = 8510; i < 8520; i++) {
    if (lines[i] && lines[i].includes('isCorrect ?')) {
        console.log('  L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
    }
}
console.log('  (2s correct, 3s incorrect — may be too slow for timed probe)');
issues.push('UX: 2-3s feedback delay per word — for a 60s probe, this wastes 20-30s of assessment time');

// ============================================================
// AUDIT 8: Multiple answer submission
// Can students spam the answer button during feedback delay?
// ============================================================
console.log('\n=== 8. Double-submit prevention ===');
const hasLock = c.includes('submissionLockRef');
console.log('  submissionLockRef: ' + (hasLock ? '✅ exists' : '❌ MISSING'));
// Check if lock is properly used
const lockSet = c.includes('submissionLockRef.current = true');
const lockClear = c.includes('submissionLockRef.current = false');
console.log('  Lock set: ' + (lockSet ? '✅' : '❌'));
console.log('  Lock clear: ' + (lockClear ? '✅' : '❌'));

// ============================================================
// AUDIT 9: probeHistory data shape consistency
// ============================================================
console.log('\n=== 9. probeHistory data recording ===');
const probeHistoryRefs = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('probeHistory') && (lines[i].includes('set') || lines[i].includes('push') || lines[i].includes('=') && !lines[i].includes('==='))) {
        probeHistoryRefs.push('  L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
    }
}
if (probeHistoryRefs.length > 0) {
    probeHistoryRefs.slice(0, 5).forEach(r => console.log(r));
} else {
    console.log('  No probeHistory write ops found');
    issues.push('UX: probeHistory may not be updated from within Word Sounds component');
}

// ============================================================
// AUDIT 10: Close modal during probe (X button)
// ============================================================
console.log('\n=== 10. Modal X button during probe ===');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('onClose') && i > 4200 && i < 4350 && (lines[i].includes('button') || lines[i].includes('onClick'))) {
        console.log('  L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
    }
}
// Check if there's an X close button in the word sounds modal header
for (let i = 10800; i < 10960; i++) {
    if (lines[i] && (lines[i].includes('onClose') || lines[i].includes('X') || lines[i].includes('×')) && lines[i].includes('onClick')) {
        console.log('  L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
    }
}

// ============================================================
// AUDIT 11: Probe word count vs session goal consistency
// ============================================================
console.log('\n=== 11. Probe word count ===');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('probeWords') || lines[i].includes('probeWordCount') || lines[i].includes('PROBE_WORD_COUNT')) {
        console.log('  L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
    }
}

// ============================================================
// AUDIT 12: isProbeMode effect on hints/scaffolding
// During probes, should hints be disabled?
// ============================================================
console.log('\n=== 12. Hints during probe ===');
const hintsGuarded = c.includes('isProbeMode') && (
    c.includes('showLetterHints') || c.includes('showHint') || c.includes('hintButton')
);
console.log('  Hints guarded by isProbeMode: ' + (hintsGuarded ? '✅' : '⚠️ Not found — hints may be available during probes'));
if (!hintsGuarded) {
    issues.push('UX: Show Letter Hints toggle, word text reveal, and image hints are all available during probes — should be hidden for standardized assessment');
}

// ============================================================
// SUMMARY
// ============================================================
console.log('\n' + '='.repeat(60));
console.log('⚠️ ' + issues.length + ' issues found:\n');
issues.forEach((iss, i) => console.log((i + 1) + '. ' + iss));
console.log('\n' + '='.repeat(60));
