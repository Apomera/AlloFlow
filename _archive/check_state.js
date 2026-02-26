const fs = require('fs');
const c = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const lines = c.split('\n');
console.log('File: ' + lines.length + ' lines, ' + c.length + ' bytes\n');

// Check which of our fixes are present
const checks = [
    // Phoneme chip fixes (from earlier in session)
    ['Chip fix: used:false in generateSoundChips', 'used: false,\n                color'],
    ['Chip fix: isDistractor in generateUniqueSoundChips', "isDistractor: false,\n"],

    // Probe architecture fixes (round 1)
    ['Fix 1: Activity tabs hidden during probe', '!isStudentLocked && !isProbeMode &&'],
    ['Fix 2: probeElapsed timer state', 'const [probeElapsed, setProbeElapsed]'],
    ['Fix 3: Back button guarded', 'End probe early? Progress will be lost'],
    ['Fix 4: Probe-aware session completion', 'isProbeMode ? wordSoundsScore.total >= wordSoundsSessionGoal'],
    ['Fix 5: WCPM calculation', 'const wcpm = Math.round(wordSoundsScore.correct / elapsedMinutes)'],
    ['Fix 6: Probe header banner', 'PROBE MODE'],

    // Probe deep audit fixes (round 2)
    ['Deep 1: Timer reset on startActivity', 'probeStartTimeRef.current = null;\n            setProbeElapsed(0)'],
    ['Deep 2: Queue refill blocked in probe', 'Probe: Queue depleted'],
    ['Deep 3a: Auto-advance guarded', 'if (!isProbeMode) setWordSoundsActivity(nextActivity)'],
    ['Deep 4: Feedback delay reduced', 'isProbeMode ? (isCorrect ? 800 : 1200)'],
    ['Deep 5: Hints forced off in probe', "if (isProbeMode) {\n            setShowLetterHints(false)"],
    ['Deep 6: Image visibility off in probe', "if (isProbeMode) setImageVisibilityMode('off')"],

    // Math probe fixes
    ['Math 1: MN Probe active UI', 'PROBE ACTIVE'],
    ['Math 2: QD Probe active UI', 'QD PROBE'],
    ['Math 3: Student selector', 'Assign probe to student'],
    ['Math 4: MN auto-finish', 'mnProbeActive && mnProbeTimer === 0'],
    ['Math 5: QD auto-finish', 'qdProbeActive && qdProbeTimer === 0'],

    // Button nesting fix (the problematic one)
    ['Button fix: Math probe button closed', "▶ Start Math Probe\n                            </button>\n                        </div>\n                    </div>"],
];

let present = 0;
let missing = 0;
for (const [name, pattern] of checks) {
    const found = c.includes(pattern);
    console.log((found ? '✅' : '❌') + ' ' + name);
    if (found) present++; else missing++;
}

console.log('\n=== ' + present + ' present, ' + missing + ' missing ===');

// Also check the original button nesting bug
const originalBug = c.includes('▶ Start Math Probe\n\n                    <div className="bg-gradient-to-r from-emerald-50');
console.log('\n🐛 Original button nesting bug present: ' + (originalBug ? 'YES (needs fix)' : 'NO'));

// Check the structure around L13540
console.log('\n=== Structure around "Start Math Probe" ===');
for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.includes('Start Math Probe')) {
        for (let j = i - 1; j < Math.min(i + 8, lines.length); j++) {
            console.log('L' + (j + 1) + ': ' + lines[j]?.substring(0, 80));
        }
        break;
    }
}
