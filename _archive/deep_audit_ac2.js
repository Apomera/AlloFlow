const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt', 'utf8');
const lines = content.split('\n');
const out = [];

// Deep dive into how probes actually work end to end

// 1. Find where probes are administered inside AC
out.push('=== PROBE ADMINISTRATION IN AC ===');

// Find the "Start Probe" or probe launch buttons
for (let i = 11000; i < 14600; i++) {
    if (lines[i] && (
        lines[i].includes('Start Probe') || lines[i].includes('startProbe') ||
        lines[i].includes('Start Screener') || lines[i].includes('Launch Probe') ||
        lines[i].includes('Begin Probe') || lines[i].includes('Run Probe') ||
        lines[i].includes('setIsProbeMode(true)') || lines[i].includes('onLaunchORF')
    )) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 95));
    }
}

// 2. What happens when probe completes?
out.push('\n=== PROBE COMPLETION ===');
for (let i = 0; i < lines.length; i++) {
    if (lines[i] && (
        lines[i].includes('saveProbeResult') ||
        lines[i].includes('finishProbe') || lines[i].includes('endProbe') ||
        lines[i].includes('completeProbe') || lines[i].includes('submitProbe')
    )) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 95));
    }
}

// 3. What about the screener?
out.push('\n=== SCREENER WORKFLOW ===');
for (let i = 11000; i < 14600; i++) {
    if (lines[i] && (
        lines[i].includes('screener') || lines[i].includes('Screener')
    )) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 95));
    }
}

// 4. Probe history view
out.push('\n=== PROBE HISTORY DISPLAY ===');
for (let i = 11000; i < 14600; i++) {
    if (lines[i] && (
        lines[i].includes('probeHistory') && !lines[i].includes('const [probeHistory')
    )) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 95));
    }
}

// 5. How is dashboardData populated?
out.push('\n=== DASHBOARD DATA POPULATION ===');
for (let i = 0; i < lines.length; i++) {
    if (lines[i] && lines[i].includes('setDashboardData')) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 95));
    }
}

// 6. Find the student JSON file export structure
out.push('\n=== STUDENT EXPORT FORMAT ===');
let exportFn = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i] && (lines[i].includes('Export Student') || lines[i].includes('exportStudent') || lines[i].includes('student-project'))) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 95));
        if (exportFn === -1) exportFn = i;
    }
}

// 7. LearnerProgressView - what does student see?
out.push('\n=== LEARNER PROGRESS VIEW ===');
const lpvIdx = content.indexOf('const LearnerProgressView');
if (lpvIdx > -1) {
    const lpvLine = content.substring(0, lpvIdx).split('\n').length;
    out.push('Starts at L' + lpvLine);
    // Find end
    for (let i = lpvLine; i < Math.min(lpvLine + 500, lines.length); i++) {
        if (i > lpvLine + 10 && lines[i].match(/^const \w+ = React/)) {
            out.push('Ends at ~L' + (i + 1) + ' (' + (i - lpvLine) + ' lines)');
            break;
        }
    }
    // Show props
    out.push('Props: ' + lines[lpvLine - 1].substring(0, 200));
}

// 8. How does AC handle student file upload?
out.push('\n=== STUDENT FILE UPLOAD IN AC ===');
for (let i = 11000; i < 14600; i++) {
    if (lines[i] && (
        lines[i].includes('FileReader') || lines[i].includes('readAsText') ||
        lines[i].includes('handleFileUpload') || lines[i].includes('type="file"') ||
        lines[i].includes("type='file'") || lines[i].includes('importCSV') ||
        lines[i].includes('importStudent') || lines[i].includes('Import Student')
    )) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 95));
    }
}

// 9. Check for "roster" logic
out.push('\n=== ROSTER MANAGEMENT ===');
for (let i = 11000; i < 14600; i++) {
    if (lines[i] && (
        lines[i].includes('roster') || lines[i].includes('Roster')
    ) && !lines[i].includes('rosterKey') && !lines[i].includes('rosterQueue')) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 95));
    }
}

// 10. How do quizzes get into dashboardData?
out.push('\n=== QUIZ → DASHBOARD FLOW ===');
for (let i = 0; i < lines.length; i++) {
    if (lines[i] && lines[i].includes('handleBatchUpload')) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 95));
    }
}

// Write results to file
fs.writeFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\_archive\\ac_deep_results.txt', out.join('\n'), 'utf8');
console.log('Results written to ac_deep_results.txt (' + out.length + ' lines)');
