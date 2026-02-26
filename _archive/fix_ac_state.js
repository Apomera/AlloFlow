const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');

// Add assessmentCenterTab state after isMinimized in StudentAnalyticsPanel
const anchor = "const [isMinimized, setIsMinimized] = React.useState(false);";
const anchorIdx = content.indexOf(anchor);
if (anchorIdx > -1) {
    const lineNum = content.substring(0, anchorIdx).split('\n').length;
    if (lineNum > 10900 && lineNum < 11100) {
        content = content.replace(anchor,
            anchor + '\n    const [assessmentCenterTab, setAssessmentCenterTab] = React.useState(\'assessments\');\n    const [researchStudent, setResearchStudent] = React.useState(null);');
        console.log('✅ Added state vars at L' + lineNum);
    }
}

fs.writeFileSync(f, content, 'utf8');
console.log('Saved! (' + content.length + ' bytes)');
