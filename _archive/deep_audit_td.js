const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt', 'utf8');
const lines = content.split('\n');

// ============================================================
// PART 1: Find TeacherDashboard component
// ============================================================
console.log('===== TEACHER DASHBOARD COMPONENT =====');
let tdStart = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const TeacherDashboard') && lines[i].includes('React.memo')) {
        tdStart = i;
        console.log('TeacherDashboard starts at L' + (i + 1));
        break;
    }
}
if (tdStart === -1) {
    // Try without React.memo
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('const TeacherDashboard') && (lines[i].includes('=') || lines[i].includes('{'))) {
            tdStart = i;
            console.log('TeacherDashboard (non-memo) starts at L' + (i + 1));
            break;
        }
    }
}

if (tdStart > -1) {
    // Print the first 40 lines to see props and structure
    console.log('--- Props & Init (first 40 lines) ---');
    for (let j = tdStart; j < Math.min(tdStart + 40, lines.length); j++) {
        console.log('L' + (j + 1) + ': ' + lines[j].trim().substring(0, 100));
    }
}

// ============================================================
// PART 2: Find all functions/features INSIDE TeacherDashboard
// ============================================================
console.log('\n===== TD INTERNAL FEATURES =====');
if (tdStart > -1) {
    // Find the end of TeacherDashboard (next top-level const)
    let tdEnd = lines.length;
    for (let i = tdStart + 50; i < lines.length; i++) {
        // Look for next component definition at top level
        if (lines[i].match(/^const \w+ = React\.memo/) || lines[i].match(/^function \w+\(/) ||
            (lines[i].includes('#endregion') && !lines[i].includes('//'))) {
            tdEnd = i;
            break;
        }
    }
    console.log('TeacherDashboard ends at ~L' + (tdEnd + 1));
    console.log('Size: ' + (tdEnd - tdStart) + ' lines');

    // Find all const functions inside TD
    for (let i = tdStart; i < tdEnd; i++) {
        if (lines[i].match(/^\s+const\s+\w+\s*=\s*(\(|React\.|use)/) ||
            lines[i].match(/^\s+const\s+handle\w+/) ||
            lines[i].match(/^\s+const\s+render\w+/)) {
            const name = lines[i].trim().match(/const\s+(\w+)/);
            if (name && name[1].length > 3) {
                console.log('L' + (i + 1) + ': ' + name[1]);
            }
        }
    }

    // Check for student-specific features
    console.log('\n--- Student-specific features in TD ---');
    const studentFeatures = ['selectedStudent', 'studentDetail', 'StudentDetail', 'longitudinal',
        'studentProgress', 'growthTrajectory', 'progressSnapshot', 'studentProfile',
        'probeData', 'probeResult', 'benchmark', 'screening', 'tier', 'intervention'];
    for (const f of studentFeatures) {
        let found = false;
        for (let i = tdStart; i < tdEnd; i++) {
            if (lines[i].includes(f)) {
                if (!found) {
                    console.log(f + ': first at L' + (i + 1));
                    found = true;
                }
            }
        }
        if (!found) console.log(f + ': NOT in TD');
    }
}
