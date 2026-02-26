const fs = require('fs');
const c = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const lines = c.split('\n');

// Key probe-related terms — first 3 occurrences each
const terms = [
    'wsProbeActive', 'probeActive', 'isProbe', 'probeTimer', 'probeElapsed',
    'probeResults', 'probeScore', 'startProbe', 'endProbe', 'finishProbe',
    'wcpm', 'WCPM', 'probeHistory', 'submitProbe', 'handleProbe',
    'startAssessment', 'wordSoundsTimer', 'wsTimer', 'timerRunning',
    'timerRef', 'wordSoundsMode', 'wsMode',
    'handleWordSoundsClose', 'closeWordSounds',
];

for (const t of terms) {
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(t)) {
            count++;
            if (count <= 2) {
                console.log(t + ' L' + (i + 1) + ': ' + lines[i].trim().substring(0, 110));
            }
        }
    }
    if (count > 2) console.log('  ... (' + count + ' total)');
    if (count === 0) console.log(t + ': NOT FOUND');
}
