const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');
const lines = content.split('\n');

// Find isMinimized line inside StudentAnalyticsPanel
for (let i = 10990; i < 11002; i++) {
    if (lines[i] && lines[i].includes('isMinimized') && lines[i].includes('useState')) {
        console.log('Found isMinimized at L' + (i + 1));
        // Insert two new state lines after this line
        lines.splice(i + 1, 0,
            '    const [assessmentCenterTab, setAssessmentCenterTab] = React.useState("assessments");\r',
            '    const [researchStudent, setResearchStudent] = React.useState(null);\r'
        );
        console.log('Inserted state declarations');
        break;
    }
}

fs.writeFileSync(f, lines.join('\n'), 'utf8');
console.log('Saved! (' + lines.join('\n').length + ' bytes)');
