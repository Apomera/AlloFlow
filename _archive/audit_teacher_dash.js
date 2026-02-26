const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt', 'utf8');

// Search comprehensively for dashboard-related features
console.log('=== ALL DASHBOARD REFERENCES ===');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i] && (lines[i].toLowerCase().includes('dashboard') || lines[i].includes('Dashboard'))) {
        const trimmed = lines[i].trim().substring(0, 90);
        if (!trimmed.includes('renderResearchDashboard')) { // skip our new addition
            console.log('L' + (i + 1) + ': ' + trimmed);
        }
    }
}

console.log('\n=== SIDEBAR/NAVIGATION ITEMS ===');
// Find buttons/links in the sidebar that open panels
const navPatterns = ['title=', 'aria-label='];
for (let i = 55000; i < 57000; i++) { // Sidebar area
    if (lines[i] && lines[i].includes('title=') && (lines[i].includes('Assessment') || lines[i].includes('Dashboard'))) {
        console.log('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 90));
    }
}

// Check for teacher_dashboard in help strings or rti
console.log('\n=== TEACHER DASHBOARD IN HELP/RTI ===');
for (let i = 0; i < lines.length; i++) {
    if (lines[i] && (lines[i].includes('teacher_dashboard') || lines[i].includes('rti_dashboard') || lines[i].includes('TeacherDashboard'))) {
        console.log('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 90));
    }
}

// Check what the Assessment Center button is near in the UI
console.log('\n=== ASSESSMENT CENTER BUTTON CONTEXT ===');
for (let i = 55900; i < 56100; i++) {
    if (lines[i] && (lines[i].includes('Assessment') || lines[i].includes('setShowAnalytics') || lines[i].includes('StudentAnalyticsPanel'))) {
        console.log('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 90));
    }
}

// Check the KI system for teacher dashboard
console.log('\n=== RTI / MONITORING REFERENCES ===');
const rtiPatterns = ['showRTI', 'setShowRTI', 'RTIPanel', 'rtiPanel', 'MonitoringDashboard', 'interventionLogs'];
for (const p of rtiPatterns) {
    const idx = content.indexOf(p);
    if (idx > -1) {
        console.log(p + ': L' + content.substring(0, idx).split('\n').length);
    } else {
        console.log(p + ': NOT FOUND');
    }
}
