const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt', 'utf8');

// Find all hardcoded English strings from today's features
// These are strings NOT wrapped in t() calls
const hardcodedPatterns = [
    // STEM Lab Assessment Builder
    '💾 Save to Resources',
    'STEM Assessment saved to resources',
    'STEM Assessment:',

    // Self-grading
    'Exit Self-Grade', 'Self-Grade',
    '📊 Submit Assessment',
    'Assessment submitted:',

    // Explore tools challenges
    'Number Line Challenge', 'Multiplication Challenge', 'Fraction Challenge',
    'Generate Challenge', 'Next Challenge', 'Your answer...',
    'Check', 'Product...', 'Answer...',
    'What number is at this position',
    'What is the distance between',
    'What is the midpoint between',
    'Use the grid to help',
    'How many pieces are shaded',
    'find the missing numerator',
    'Which is larger',
    'Place a marker at',

    // TD Assessment panel
    'Assessment & Research Data',
    'Probe Results', 'Intervention Logs', 'Survey Responses',
    'Sessions Completed', 'fidelity records',
    'Recent Probe Results', 'External CBM Scores',
    'Probes', 'Surveys',

    // Insights Research panels
    'Research & Assessment Analytics',
    'Probe Data Summary', 'Total Probes', 'Students Assessed',
    'Avg WCPM', 'Avg DCPM', 'Avg Accuracy',
    'TAM Survey Analysis', 'Total Responses', 'Respondents',
    'Perceived Usefulness', 'Ease of Use', 'Behavioral Intention',
    'responses', 'Session & Fidelity Summary',
    'Total Sessions', 'Avg Per Student', 'Fidelity Records',

    // Fluency bridge
    'Fluency drill started',

    // TAM survey items
    'AlloFlow helps me get better at reading and math',
    'AlloFlow is easy to use',
    'I want to keep using AlloFlow',
    'AlloFlow meaningfully improves student literacy outcomes',
    'AlloFlow integrates easily into my existing workflow',
    'I plan to continue using AlloFlow next school year',
    'AlloFlow has been helpful for my child',
    'I would recommend AlloFlow to other parents',
];

const lines = content.split('\n');
let count = 0;
for (const pattern of hardcodedPatterns) {
    const idx = content.indexOf(pattern);
    if (idx > -1) {
        const l = content.substring(0, idx).split('\n').length;
        console.log('L' + l + ': "' + pattern + '"');
        count++;
    }
}
console.log('\nTotal hardcoded strings found: ' + count + '/' + hardcodedPatterns.length);
