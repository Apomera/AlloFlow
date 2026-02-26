const fs = require('fs');
const c = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const lines = c.split('\n');

// Find math probe related terms
const terms = [
    'mathProbe', 'isMathProbe', 'mathProbeMode', 'math_probe',
    'mathAssessment', 'mathTimer', 'mathScore', 'mathElapsed',
    'mathFluency', 'MathFluency', 'math-fluency', 'math_fluency',
    'onMathProbeComplete', 'mathProbeComplete',
    'stemLabProbe', 'isStemProbe', 'stemProbe',
    'assessment-center', 'AssessmentCenter', 'assessmentCenter',
    'mathProbeActive', 'mathProbeTimer',
    'computation', 'Computation', 'mathFact', 'MathFact',
    'stemLabTab', 'setStemLabTab', 'stemLabTool', 'setStemLabTool',
    'mathProblem', 'mathAnswer', 'mathCorrect',
    'mathSessionGoal', 'mathSessionComplete',
];

for (const t of terms) {
    let count = 0;
    let first3 = [];
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(t)) {
            count++;
            if (count <= 3) first3.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 110));
        }
    }
    if (count > 0) {
        console.log(t + ' (' + count + ' refs):');
        first3.forEach(l => console.log('  ' + l));
    }
}
