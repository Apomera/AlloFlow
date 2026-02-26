const fs = require('fs');
const lines = fs.readFileSync('AlloFlowANTI.txt', 'utf8').split('\n');

let depth = 0;
let parentBtnStart = -1;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const openMatches = line.match(/<button\b(?![^>]*\/>)/g) || [];
    const closeMatches = line.match(/<\/button>/g) || [];

    for (const _ of openMatches) {
        depth++;
        if (depth === 1) parentBtnStart = i;
        if (depth > 1) {
            console.log('NESTED BUTTON at L' + (i + 1) + ' (parent btn at L' + (parentBtnStart + 1) + ')');
            console.log('  Parent: ' + lines[parentBtnStart].trim().substring(0, 100));
            console.log('  Nested: ' + line.trim().substring(0, 100));
            console.log();
        }
    }
    for (const _ of closeMatches) {
        depth--;
        if (depth < 0) depth = 0;
    }
}
