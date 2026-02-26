const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt', 'utf8');

// ============================================================
// ASSESSMENT CENTER AUDIT
// ============================================================
console.log('===== ASSESSMENT CENTER (StudentAnalyticsPanel) =====');

// Find the component and its props
const acStart = content.indexOf('const StudentAnalyticsPanel = React.memo');
const acLine = content.substring(0, acStart).split('\n').length;
console.log('Component starts at L' + acLine);

// Find what data it receives
const acProps = content.substring(acStart, content.indexOf(') =>', acStart) + 4);
const propNames = acProps.match(/(\w+)(?=[,\s}])/g);
console.log('Props count: ' + (propNames ? propNames.length : 0));

// Find its functional sections
const acContent = content.substring(acStart);
const acSections = [
    'importedStudents', 'probeHistory', 'probeGradeLevel', 'probeActivity',
    'isProbeMode', 'probeTargetStudent', 'saveProbeResult',
    'renderInsightsPanel', 'renderClassInsights', 'renderResearchDashboard',
    'renderScatterPlot', 'renderCBMImportModal', 'renderSurveyModal',
    'renderResearchToolbar', 'renderResearchSetupModal', 'renderAutoSurveyPrompt'
];
console.log('\nFeature flags in AC:');
for (const s of acSections) {
    if (acContent.includes(s)) {
        console.log('  ✅ ' + s);
    } else {
        console.log('  ❌ ' + s);
    }
}

// ============================================================
// TEACHER DASHBOARD AUDIT
// ============================================================
console.log('\n===== TEACHER DASHBOARD =====');

// Find teacher dashboard references
const tdPatterns = ['Teacher Dashboard', 'teacherDashboard', 'TeacherDashboard',
    'showTeacherDashboard', 'setShowTeacherDashboard', 'dashboard',
    'Dashboard', 'showDashboard'];
for (const p of tdPatterns) {
    const idx = content.indexOf(p);
    if (idx > -1) {
        const line = content.substring(0, idx).split('\n').length;
        console.log(p + ': L' + line);
    }
}

// Check for analytics panel / dashboard component
const dashComponents = ['AnalyticsDashboard', 'TeacherAnalytics', 'DashboardPanel',
    'StudentProgress', 'progressDashboard', 'ProgressDashboard',
    'TeacherView', 'showAnalytics'];
console.log('\nDashboard components:');
for (const c of dashComponents) {
    const idx = content.indexOf(c);
    if (idx > -1) {
        console.log('  ' + c + ' at L' + content.substring(0, idx).split('\n').length);
    }
}

// ============================================================
// WHAT FEEDS INTO WHAT?
// ============================================================
console.log('\n===== DATA FLOW ANALYSIS =====');

// Where is probeHistory used?
const probeHistUsages = [];
let phPos = 0;
let phCount = 0;
while ((phPos = content.indexOf('probeHistory', phPos)) !== -1 && phCount < 30) {
    const line = content.substring(0, phPos).split('\n').length;
    probeHistUsages.push(line);
    phPos += 12;
    phCount++;
}
console.log('probeHistory used at ' + probeHistUsages.length + ' locations');
console.log('  First 10: ' + probeHistUsages.slice(0, 10).join(', '));

// Where is history used near assessment/dashboard?
console.log('\nHistory types (what gets saved):');
const typePattern = /type:\s*['"]([a-z-]+)['"]/g;
const types = new Set();
let typeMatch;
while ((typeMatch = typePattern.exec(content)) !== null) {
    types.add(typeMatch[1]);
}
console.log('  ' + [...types].sort().join(', '));

// Check if stem-assessment type exists
if (types.has('stem-assessment')) {
    console.log('\n✅ stem-assessment type EXISTS');
} else {
    console.log('\n❌ stem-assessment type does NOT exist');
}

// ============================================================
// STEM LAB → HISTORY INTEGRATION CHECK
// ============================================================
console.log('\n===== STEM LAB → HISTORY INTEGRATION =====');

// Check if setHistory is called anywhere in STEM Lab
const stemLabSection = content.substring(content.indexOf('{showStemLab && ('));
if (stemLabSection.includes('setHistory')) {
    console.log('✅ setHistory called in STEM Lab');
} else {
    console.log('❌ setHistory NOT called in STEM Lab');
}

if (stemLabSection.includes('addToHistory')) {
    console.log('✅ addToHistory called in STEM Lab');
} else {
    console.log('❌ addToHistory NOT called in STEM Lab');
}

// Check getDefaultTitle for stem types
const titleSwitch = content.substring(content.indexOf('const getDefaultTitle'));
if (titleSwitch.includes('stem-assessment')) {
    console.log('✅ getDefaultTitle has stem-assessment case');
} else {
    console.log('❌ getDefaultTitle missing stem-assessment case');
}

// Check if studentProjectSettings has allowStemLab
if (content.includes('allowStemLab')) {
    console.log('✅ allowStemLab exists in settings');
} else {
    console.log('❌ allowStemLab NOT in settings');
}

// ============================================================
// ENTRY POINTS / BUTTONS
// ============================================================
console.log('\n===== ENTRY POINTS =====');
const buttons = ['Assessment Center', 'Teacher Dashboard', 'STEM Lab', 'My Learning Journey'];
for (const btn of buttons) {
    const idx = content.indexOf(btn);
    if (idx > -1) {
        const line = content.substring(0, idx).split('\n').length;
        console.log(btn + ': L' + line);
    } else {
        console.log(btn + ': NOT FOUND');
    }
}

// Check if there's a dedicated teacher dashboard separate from AC
console.log('\n===== TEACHER DASHBOARD vs ASSESSMENT CENTER =====');
const acOpen = content.indexOf('setShowAnalyticsPanel');
if (acOpen > -1) {
    console.log('setShowAnalyticsPanel at L' + content.substring(0, acOpen).split('\n').length);
}
const tdOpen = content.indexOf('setShowTeacherDashboard');
if (tdOpen > -1) {
    console.log('setShowTeacherDashboard at L' + content.substring(0, tdOpen).split('\n').length);
} else {
    console.log('setShowTeacherDashboard: NOT FOUND');
}

// Check what opens the analytics panel
const openPatterns = ['showAnalyticsPanel', 'setShowAnalyticsPanel(true)'];
for (const op of openPatterns) {
    let opPos = 0;
    let opCount = 0;
    while ((opPos = content.indexOf(op, opPos)) !== -1 && opCount < 5) {
        const line = content.substring(0, opPos).split('\n').length;
        console.log('  ' + op + ' at L' + line);
        opPos += op.length;
        opCount++;
    }
}
