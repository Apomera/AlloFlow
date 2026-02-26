const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt', 'utf8');
const lines = content.split('\n');

// ============================================================
// ASSESSMENT CENTER (StudentAnalyticsPanel) - DEEP DIVE
// ============================================================
console.log('===== ASSESSMENT CENTER DEEP DIVE =====\n');

// 1. How are students imported?
console.log('--- 1. STUDENT IMPORT MECHANISM ---');
const importPatterns = ['importedStudents', 'setImportedStudents', 'handleImport', 'FileReader',
    'rosterQueue', 'setRosterQueue', 'screenerSession', 'rosterKey'];
for (const p of importPatterns) {
    const idx = content.indexOf(p, content.indexOf('StudentAnalyticsPanel'));
    if (idx > -1 && idx < content.indexOf('document.body', content.indexOf('StudentAnalyticsPanel'))) {
        const line = content.substring(0, idx).split('\n').length;
        console.log('  ' + p + ': L' + line);
    }
}

// 2. How are probes launched?
console.log('\n--- 2. PROBE LAUNCH MECHANISM ---');
const probePatterns = ['isProbeMode', 'setIsProbeMode', 'probeTargetStudent', 'setProbeTargetStudent',
    'probeActivity', 'setProbeActivity', 'probeForm', 'isORF', 'onLaunchORF',
    'startProbe', 'launchProbe', 'beginProbe', 'handleStartProbe'];
for (const p of probePatterns) {
    const idx = content.indexOf(p, content.indexOf('StudentAnalyticsPanel'));
    if (idx > -1) {
        const line = content.substring(0, idx).split('\n').length;
        console.log('  ' + p + ': L' + line);
    }
}

// 3. How are probe results saved?
console.log('\n--- 3. PROBE RESULT SAVING ---');
const savePatterns = ['saveProbeResult', 'probeHistory', 'setProbeHistory', 'latestProbeResult'];
for (const p of savePatterns) {
    let pos = 0;
    let count = 0;
    while ((pos = content.indexOf(p, pos)) !== -1 && count < 5) {
        const line = content.substring(0, pos).split('\n').length;
        console.log('  ' + p + ': L' + line);
        pos += p.length;
        count++;
    }
}

// 4. What types of probes exist?
console.log('\n--- 4. PROBE TYPES ---');
const probeTypes = ['literacy', 'math', 'blending', 'segmenting', 'fluency', 'ORF',
    'phoneme', 'letter-naming', 'word-reading', 'nonsense-word',
    'math-fluency', 'mathFluency', 'screener'];
for (const p of probeTypes) {
    const idx = content.indexOf("'" + p + "'");
    if (idx > -1) {
        const line = content.substring(0, idx).split('\n').length;
        console.log('  ' + p + ': L' + line);
    }
}

// 5. How does the student actually TAKE a probe?
console.log('\n--- 5. PROBE TAKING MECHANISM ---');
const takingPatterns = ['isProbeMode && (', 'probeMode &&', 'probeScreen', 'probeQuestion',
    'probeItem', 'currentProbe', 'probeProgress', 'fluencyMode',
    'isFluencyMode', 'setIsFluencyMode', 'fluencyStatus', 'setFluencyStatus'];
for (const p of takingPatterns) {
    const idx = content.indexOf(p);
    if (idx > -1) {
        const line = content.substring(0, idx).split('\n').length;
        console.log('  ' + p + ': L' + line);
    }
}

// 6. How does data flow from student back to teacher?
console.log('\n--- 6. DATA FLOW: STUDENT → TEACHER ---');
const flowPatterns = ['exportStudent', 'importProbe', 'loadProbe', 'probeExport',
    'studentJSON', 'studentSave', 'progressLog', 'setStudentProgressLog'];
for (const p of flowPatterns) {
    const idx = content.indexOf(p);
    if (idx > -1) {
        const line = content.substring(0, idx).split('\n').length;
        console.log('  ' + p + ': L' + line);
    }
}

// 7. How does dashboardData get populated? (TD data source)
console.log('\n--- 7. DASHBOARD DATA POPULATION ---');
const ddPatterns = ['setDashboardData', 'dashboardData.push', 'dashboardData.concat',
    'addToDashboard', 'uploadStudentFile'];
for (const p of ddPatterns) {
    let pos = 0;
    let count = 0;
    while ((pos = content.indexOf(p, pos)) !== -1 && count < 5) {
        const line = content.substring(0, pos).split('\n').length;
        console.log('  ' + p + ': L' + line);
        pos += p.length;
        count++;
    }
}

// 8. What does student project export look like?
console.log('\n--- 8. STUDENT PROJECT EXPORT ---');
const exportPatterns = ['Export Student', 'exportStudent', 'student-project',
    'Save for Student', "mode: 'student'", "mode:'student'"];
for (const p of exportPatterns) {
    const idx = content.indexOf(p);
    if (idx > -1) {
        const line = content.substring(0, idx).split('\n').length;
        console.log('  ' + p + ': L' + line);
    }
}

// 9. calculateAnalyticsMetrics function
console.log('\n--- 9. calculateAnalyticsMetrics ---');
const cam = content.indexOf('const calculateAnalyticsMetrics');
if (cam > -1) {
    const camLine = content.substring(0, cam).split('\n').length;
    console.log('  Defined at L' + camLine);
    // Show first 20 lines
    for (let i = camLine - 1; i < Math.min(camLine + 20, lines.length); i++) {
        console.log('  L' + (i + 1) + ': ' + lines[i].trim().substring(0, 90));
    }
}

// 10. LearnerProgressView
console.log('\n--- 10. LearnerProgressView ---');
const lpv = content.indexOf('const LearnerProgressView');
if (lpv > -1) {
    const lpvLine = content.substring(0, lpv).split('\n').length;
    console.log('  Defined at L' + lpvLine);
    for (let i = lpvLine - 1; i < Math.min(lpvLine + 10, lines.length); i++) {
        console.log('  L' + (i + 1) + ': ' + lines[i].trim().substring(0, 90));
    }
}
