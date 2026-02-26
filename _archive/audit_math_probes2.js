const fs = require('fs');
const c = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const lines = c.split('\n');

// Deep search for math assessment / probe features
const terms = [
    // Assessment Center probe launching
    'startMathProbe', 'launchMathProbe', 'mathProbe',
    'startComputationProbe', 'computationProbe',
    'beginAssessment', 'startAssessment',
    // Math facts/computation
    'mathFactScore', 'mathFactTimer', 'mathFactComplete',
    'computeFluency', 'computationFluency',
    'mathChallengeScore', 'mathChallengeTimer',
    // STEM Lab challenge/score
    'stemLabScore', 'setStemLabScore',
    'stemLabTimer', 'stemLabElapsed',
    'stemLabComplete', 'stemLabGoal', 'stemLabSessionGoal',
    // Explore challenge score
    'exploreScore', 'submitExploreScore',
    'exploreChallenge', 'exploreDifficulty',
    // Assessment center integration
    'onProbeComplete', 'probeComplete',
    'probeType', 'probeActivity',
    // Math fact drills / timed
    'factDrill', 'mathDrill', 'timedDrill', 'speedDrill',
    'mathSession', 'mathGoal',
];

for (const t of terms) {
    let count = 0;
    let first3 = [];
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(t)) {
            count++;
            if (count <= 2) first3.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 110));
        }
    }
    if (count > 0) {
        console.log(t + ' (' + count + ' refs):');
        first3.forEach(l => console.log('  ' + l));
    }
}

// Also check the Assessment Center for math probe launching
console.log('\n=== Assessment Center math probe launch ===');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('assessment') && (lines[i].includes('math') || lines[i].includes('computation') || lines[i].includes('fluency'))
        && !lines[i].includes('//')) {
        console.log('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
    }
}
