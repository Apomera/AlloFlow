const fs = require('fs');
const c = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const lines = c.split('\n');

// Comprehensive probe architecture audit
const terms = [
    // Probe state
    'probeActive', 'isProbeMode', 'probeMode', 'setProbeMode', 'isProbeActive', 'setIsProbeActive',
    'probeRunning', 'isProbing', 'probeInProgress',
    // Probe timer
    'probeTimer', 'probeTime', 'probeCountdown', 'probeDuration', 'probeElapsed',
    'setProbeTimer', 'probeTimerRef',
    // Probe session
    'probeSession', 'probeStarted', 'startProbe', 'beginProbe', 'handleStartProbe',
    'endProbe', 'handleEndProbe', 'finishProbe', 'completeProbe', 'submitProbe',
    // Probe words
    'probeWords', 'probeWordList', 'probeWordIndex', 'probeCurrentWord',
    // Probe results
    'probeResults', 'probeScore', 'probeWCPM', 'wcpm', 'WCPM',
    'wordsCorrect', 'wordsRead', 'probeData',
    // Activity switching (the main concern)
    'setWordSoundsActivity', 'wordSoundsActivity',
    // Word sounds modal states
    'showWordSoundsModal', 'setShowWordSoundsModal', 'wordSoundsOpen',
    // Assessment / probe flags
    'isAssessment', 'assessmentMode', 'isTimedProbe', 'timedProbe',
    // Session goal
    'wordSoundsSessionGoal', 'setWordSoundsSessionGoal',
];

for (const t of terms) {
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(t)) {
            count++;
            if (count <= 3) {
                console.log(t + ' L' + (i + 1) + ': ' + lines[i].trim().substring(0, 100));
            }
        }
    }
    if (count > 3) console.log(t + ' ... (' + count + ' total refs)');
    if (count === 0) console.log(t + ': NOT FOUND');
}
