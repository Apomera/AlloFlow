const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt', 'utf8');
const lines = content.split('\n');
const out = [];

// 1. Is probeHistory included in any JSON export?
out.push('=== probeHistory IN JSON EXPORTS ===');
// Search for probeHistory near Blob, JSON.stringify, or download
for (let i = 0; i < lines.length; i++) {
    if (lines[i] && lines[i].includes('probeHistory') && (
        lines[i - 1]?.includes('Blob') || lines[i - 1]?.includes('stringify') ||
        lines[i + 1]?.includes('Blob') || lines[i + 1]?.includes('stringify') ||
        lines[i].includes('stringify') || lines[i].includes('export')
    )) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 95));
    }
}

// Search for probeHistory near the student export / save functions
for (let i = 43400; i < 43700; i++) {
    if (lines[i] && lines[i].includes('probeHistory')) {
        out.push('Export area L' + (i + 1) + ': ' + lines[i].trim().substring(0, 95));
    }
}

// Search in the save modal area
out.push('\n=== SAVE MODAL / EXPORT STUDENT PROJECT ===');
for (let i = 0; i < lines.length; i++) {
    if (lines[i] && (
        lines[i].includes('Save for Student') ||
        lines[i].includes('Export Student') ||
        lines[i].includes('student_project') ||
        lines[i].includes("mode: 'student'") ||
        lines[i].includes('mode: "student"')
    )) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 95));
    }
}

// 2. What data gets packed into the JSON export?
out.push('\n=== JSON EXPORT DATA SHAPE ===');
for (let i = 0; i < lines.length; i++) {
    if (lines[i] && lines[i].includes('JSON.stringify') && (
        lines[i].includes('history') || lines[i].includes('mode') ||
        lines[i].includes('settings')
    )) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
    }
}

// 3. How does AC import students? (L13039 type="file")
out.push('\n=== AC STUDENT IMPORT (L13030-13060) ===');
for (let i = 13025; i < 13070; i++) {
    out.push('L' + (i + 1) + ': ' + (lines[i]?.trim().substring(0, 95) || ''));
}

// 4. What is the AC student table row? (probe buttons per student)
out.push('\n=== AC STUDENT TABLE (probe buttons, L13440-13530) ===');
for (let i = 13440; i < 13530; i++) {
    if (lines[i] && (
        lines[i].includes('button') || lines[i].includes('probe') ||
        lines[i].includes('Probe') || lines[i].includes('Launch') ||
        lines[i].includes('onClick') || lines[i].includes('student')
    )) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 95));
    }
}

// 5. Does the student export include probeHistory or interventionLogs?
out.push('\n=== EXPORT WITH PROBE DATA? ===');
// Find the main export function (handleSaveProject area)
for (let i = 33200; i < 33400; i++) {
    if (lines[i] && (
        lines[i].includes('probeHistory') || lines[i].includes('interventionLogs')
    )) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 95));
    }
}

// Also check handleExport and the save modal
for (let i = 0; i < lines.length; i++) {
    if (lines[i] && lines[i].includes('probeHistory') && (
        lines[i].includes('JSON') || lines[i].includes('export')
    )) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 95));
    }
}

// 6. What does the save modal look like?
out.push('\n=== SAVE MODAL (showSaveModal) ===');
for (let i = 0; i < lines.length; i++) {
    if (lines[i] && lines[i].includes('showSaveModal')) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 95));
    }
}

// 7. Does AC export its data at all?
out.push('\n=== AC DATA EXPORT ===');
for (let i = 11000; i < 14600; i++) {
    if (lines[i] && (
        lines[i].includes('downloadCSV') || lines[i].includes('exportCSV') ||
        lines[i].includes('CSV') || lines[i].includes('Download') ||
        lines[i].includes('Export') || lines[i].includes('download')
    )) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 95));
    }
}

fs.writeFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\_archive\\ac_deep_results2.txt', out.join('\n'), 'utf8');
console.log('Results written to ac_deep_results2.txt (' + out.length + ' lines)');
