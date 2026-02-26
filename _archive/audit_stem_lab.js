const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt', 'utf8');
const lines = content.split('\n');

console.log('=== STEM LAB STATE VARIABLES ===');
const stemStates = ['showStemLab', 'stemLabTab', 'stemLabTool', 'assessmentBlocks',
    'showAssessmentBuilder', 'stemLabCreateMode', 'cubeDims', 'cubeChallenge',
    'cubeAnswer', 'cubeFeedback', 'nlMin', 'nlMax', 'nlMarkers', 'areaRows',
    'areaCols', 'fractionPieces', 'buildCubeDims', 'buildMode'];
for (const s of stemStates) {
    const idx = content.indexOf(s);
    if (idx > -1) {
        const lineNum = content.substring(0, idx).split('\n').length;
        console.log(s + ': first at L' + lineNum);
    } else {
        console.log(s + ': *** NOT FOUND');
    }
}

console.log('\n=== STEM LAB MODAL STRUCTURE ===');
// Find the STEM LAB MODAL marker
const modalMarker = 'STEM LAB MODAL';
let modalIdx = content.indexOf(modalMarker);
if (modalIdx > -1) {
    const modalLine = content.substring(0, modalIdx).split('\n').length;
    console.log('Modal marker at L' + modalLine);
}

// Find the showStemLab conditional
const showStem = '{showStemLab && (';
const showIdx = content.indexOf(showStem);
if (showIdx > -1) {
    const showLine = content.substring(0, showIdx).split('\n').length;
    console.log('showStemLab render at L' + showLine);
}

console.log('\n=== STEM LAB TABS ===');
// Find tab definition patterns
const tabPatterns = ['Create', 'Explore', 'stemLabTab'];
for (const t of tabPatterns) {
    let count = 0;
    let pos = 0;
    while ((pos = content.indexOf(t, pos)) !== -1 && count < 5) {
        const lineNum = content.substring(0, pos).split('\n').length;
        if (lineNum > 30000) { // Only in the render section
            const lineText = lines[lineNum - 1]?.trim().substring(0, 80);
            if (lineText.includes('tab') || lineText.includes('Tab') || lineText.includes('onClick')) {
                console.log(t + ' at L' + lineNum + ': ' + lineText);
            }
        }
        pos += t.length;
        count++;
    }
}

console.log('\n=== STEM LAB TOOLS ===');
const tools = ['Volume', 'Number Line', 'Area Model', 'Fraction'];
for (const t of tools) {
    let pos = showIdx || 0;
    let count = 0;
    while ((pos = content.indexOf(t, pos)) !== -1 && count < 3) {
        const lineNum = content.substring(0, pos).split('\n').length;
        if (lineNum > 30000) {
            const lineText = lines[lineNum - 1]?.trim().substring(0, 80);
            if (lineText.includes('button') || lineText.includes('onClick') || lineText.includes('stemLabTool')) {
                console.log(t + ' at L' + lineNum + ': ' + lineText);
            }
        }
        pos += t.length;
        count++;
    }
}

console.log('\n=== STEM LAB BUTTON (entry point) ===');
const stemButton = 'Lab';
let btnCount = 0;
let pos2 = 0;
while ((pos2 = content.indexOf(stemButton, pos2)) !== -1 && btnCount < 20) {
    const lineNum = content.substring(0, pos2).split('\n').length;
    const lineText = lines[lineNum - 1]?.trim();
    if (lineText && (lineText.includes('setShowStemLab') || lineText.includes('🧪'))) {
        console.log('L' + lineNum + ': ' + lineText.substring(0, 80));
    }
    pos2 += stemButton.length;
    btnCount++;
}

console.log('\n=== TEACHER-STUDENT WORKFLOW ===');
// Check if STEM Lab results flow to student profiles, assessment, or reports
const workflows = ['stemLab', 'assessmentBlocks', 'isIndependentMode', 'probeHistory'];
for (const w of workflows) {
    // Check if used near STEM Lab
    let pos3 = showIdx || 0;
    let found = false;
    while ((pos3 = content.indexOf(w, pos3)) !== -1) {
        const lineNum = content.substring(0, pos3).split('\n').length;
        if (lineNum > (showIdx ? content.substring(0, showIdx).split('\n').length : 50000)) {
            if (!found) {
                console.log(w + ' used in STEM Lab area at L' + lineNum);
                found = true;
            }
        }
        pos3 += w.length;
    }
    if (!found) console.log(w + ': NOT referenced in STEM Lab render section');
}

// Check for save/export/assign functionality
console.log('\n=== SAVE/EXPORT/ASSIGN FEATURES ===');
const savePatterns = ['saveAssessment', 'exportAssessment', 'assignToStudent', 'pushToStudent',
    'shareAssessment', 'assessment_blocks', 'stemLabResult'];
for (const p of savePatterns) {
    const idx2 = content.indexOf(p);
    if (idx2 > -1) {
        console.log(p + ' at L' + content.substring(0, idx2).split('\n').length);
    } else {
        console.log(p + ': *** NOT FOUND');
    }
}

// Check math tool integration
console.log('\n=== MATH TOOL / STEM SOLVER INTEGRATION ===');
const mathPatterns = ['stemMode', 'mathMode', 'STEM Solver', 'Math Problem'];
for (const p of mathPatterns) {
    const idx3 = content.indexOf(p);
    if (idx3 > -1) {
        console.log(p + ' at L' + content.substring(0, idx3).split('\n').length);
    } else {
        console.log(p + ': NOT FOUND');
    }
}

console.log('\n=== TOTAL STEM LAB SIZE ===');
if (showIdx > -1) {
    const showLine = content.substring(0, showIdx).split('\n').length;
    // Find the closing )} of the modal
    const modalEnd = content.indexOf(')}', content.indexOf('Fraction Tiles', showIdx) + 100);
    if (modalEnd > -1) {
        const endLine = content.substring(0, modalEnd).split('\n').length;
        const size = modalEnd - showIdx;
        console.log('STEM Lab modal: L' + showLine + ' to ~L' + endLine + ' (' + (size / 1024).toFixed(1) + ' KB)');
    }
}
