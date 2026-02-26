const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt', 'utf8');

const funcs = ['renderInsightsPanel', 'renderClassInsights', 'renderCBMImportModal',
    'renderSurveyModal', 'renderScatterPlot', 'renderResearchToolbar',
    'renderResearchSetupModal', 'renderAutoSurveyPrompt', 'renderResearchDashboard'];

console.log('=== FUNCTION WIRING AUDIT ===');
for (const fn of funcs) {
    const defIdx = content.indexOf('const ' + fn);
    const defLine = defIdx > -1 ? content.substring(0, defIdx).split('\n').length : -1;

    // Count usages (excluding definition)
    let usages = 0;
    let pos = 0;
    while ((pos = content.indexOf(fn, pos)) !== -1) {
        // Check it's not the definition
        const lineStart = content.lastIndexOf('\n', pos);
        const lineText = content.substring(lineStart, content.indexOf('\n', pos));
        if (!lineText.includes('const ' + fn)) usages++;
        pos += fn.length;
    }

    const status = usages > 0 ? ' WIRED' : ' *** NOT WIRED';
    console.log(fn + ': def L' + defLine + ', ' + usages + ' usage(s)' + status);
}

// Check dependencies
console.log('\n=== DEPENDENCY CHECK ===');
const deps = ['generateStudentInsights', 'DOMAIN_LABELS', 'probeHistory', 'importedStudents'];
for (const dep of deps) {
    const idx = content.indexOf(dep);
    if (idx > -1) {
        const lineNum = content.substring(0, idx).split('\n').length;
        console.log(dep + ' first at L' + lineNum);
    } else {
        console.log(dep + ' *** MISSING');
    }
}

// Check tab bar completeness
console.log('\n=== TAB BAR ===');
const tabBarIdx = content.indexOf("id: 'assessments'");
if (tabBarIdx > -1) {
    const tabLine = content.substring(0, tabBarIdx).split('\n').length;
    console.log('Tab bar with assessments at L' + tabLine);
}
const researchTabIdx = content.indexOf("id: 'research'");
if (researchTabIdx > -1) {
    const tabLine = content.substring(0, researchTabIdx).split('\n').length;
    console.log('Tab bar with research at L' + tabLine);
}

// Check display toggle
const displayIdx = content.indexOf("assessmentCenterTab === 'research'");
if (displayIdx > -1) {
    const displayLine = content.substring(0, displayIdx).split('\n').length;
    console.log('\nDisplay toggle at L' + displayLine);
}

// Check research content
const researchH3 = content.indexOf('Research & Insights');
if (researchH3 > -1) {
    const resLine = content.substring(0, researchH3).split('\n').length;
    console.log('Research content at L' + resLine);
}

// Check renderInsightsPanel call in research tab
const insightsCall = content.indexOf('renderInsightsPanel(researchStudent)');
if (insightsCall > -1) {
    const callLine = content.substring(0, insightsCall).split('\n').length;
    console.log('Insights call at L' + callLine);
}

// Check for generateStudentInsights function def
const genInsights = content.indexOf('const generateStudentInsights');
if (genInsights > -1) {
    console.log('\ngenerateStudentInsights def at L' + content.substring(0, genInsights).split('\n').length);
} else {
    const genInsights2 = content.indexOf('function generateStudentInsights');
    if (genInsights2 > -1) {
        console.log('\ngenerateStudentInsights def at L' + content.substring(0, genInsights2).split('\n').length);
    } else {
        console.log('\n*** generateStudentInsights NOT FOUND - renderInsightsPanel will crash!');
    }
}
