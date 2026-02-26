const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt', 'utf8');

console.log('=== SAVE/LOAD JSON SYSTEM ===');
const savePatterns = ['downloadJSON', 'exportJSON', 'saveToJSON', 'JSON.stringify', 'handleSave', 'handleLoad',
    'handleExport', 'savedResources', 'resourcePack', 'saveState', 'loadState', 'handleImport',
    'importData', 'fileInput', 'type="file"', 'download', '.json', 'Blob'];

for (const p of savePatterns) {
    let count = 0;
    let pos = 0;
    let firstLine = -1;
    while ((pos = content.indexOf(p, pos)) !== -1) {
        if (firstLine === -1) firstLine = content.substring(0, pos).split('\n').length;
        count++;
        pos += p.length;
    }
    if (count > 0 && count < 200) {
        console.log(p + ': ' + count + ' occurrences (first at L' + firstLine + ')');
    }
}

console.log('\n=== SAVED RESOURCES SYSTEM ===');
const resPatterns = ['savedResource', 'SavedResource', 'savedContent', 'savedItems',
    'resourceLibrary', 'Resource Library', 'myResources', 'My Resources',
    'savedGenerations', 'generationHistory'];
for (const p of resPatterns) {
    const idx = content.indexOf(p);
    if (idx > -1) {
        console.log(p + ': L' + content.substring(0, idx).split('\n').length);
    }
}

console.log('\n=== TEACHER/STUDENT VIEW SEPARATION ===');
const viewPatterns = ['isIndependentMode', 'isTeacherView', 'teacherView', 'studentView',
    'TeacherView', 'StudentView', 'isTeacher', 'isStudent', 'userRole',
    'activeView', 'viewMode'];
for (const p of viewPatterns) {
    const idx = content.indexOf(p);
    if (idx > -1) {
        console.log(p + ': L' + content.substring(0, idx).split('\n').length);
    }
}

console.log('\n=== RESOURCE PACK / JSON FILE SYSTEM ===');
const rpPatterns = ['resource-pack', 'resourcePack', 'ResourcePack', 'loadResourcePack',
    'saveResourcePack', 'exportResourcePack', 'importResourcePack',
    'FileReader', 'readAsText', 'createObjectURL'];
for (const p of rpPatterns) {
    const idx = content.indexOf(p);
    if (idx > -1) {
        console.log(p + ': L' + content.substring(0, idx).split('\n').length);
    }
}

console.log('\n=== DOWNLOAD/EXPORT FUNCTIONS ===');
// Find const functions with download/export/save in name
const funcRegex = /const\s+(handle\w*(?:Save|Export|Download|Import|Load)\w*)\s*=/g;
let match;
while ((match = funcRegex.exec(content)) !== null) {
    const line = content.substring(0, match.index).split('\n').length;
    console.log('L' + line + ': ' + match[1]);
}

console.log('\n=== HISTORY/STATE THAT PERSISTS ===');
const histPatterns = ['history', 'probeHistory', 'sessionData', 'rosterData'];
for (const p of histPatterns) {
    const defIdx = content.indexOf('const [' + p);
    if (defIdx > -1) {
        console.log(p + ' state def at L' + content.substring(0, defIdx).split('\n').length);
    }
}
