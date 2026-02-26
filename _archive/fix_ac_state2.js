const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');

if (content.includes('assessmentCenterTab')) {
    console.log('assessmentCenterTab already exists - checking location');
    const idx = content.indexOf('assessmentCenterTab');
    const lineNum = content.substring(0, idx).split('\n').length;
    console.log('First occurrence at L' + lineNum);
} else {
    console.log('Adding assessmentCenterTab state...');
    const anchor = 'isMinimized, setIsMinimized';
    const idx = content.indexOf(anchor);
    if (idx > -1) {
        const lineNum = content.substring(0, idx).split('\n').length;
        console.log('isMinimized at L' + lineNum);
        const lineEnd = content.indexOf('\n', idx);
        content = content.substring(0, lineEnd + 1) +
            '    const [assessmentCenterTab, setAssessmentCenterTab] = React.useState("assessments");\n' +
            '    const [researchStudent, setResearchStudent] = React.useState(null);\n' +
            content.substring(lineEnd + 1);
        fs.writeFileSync(f, content, 'utf8');
        console.log('Added state vars! New size: ' + content.length + ' bytes');
    } else {
        console.log('ERROR: Cannot find isMinimized anchor');
    }
}
