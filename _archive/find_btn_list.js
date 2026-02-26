const fs = require('fs');
const lines = fs.readFileSync('AlloFlowANTI.txt', 'utf8').split('\n');

let depth = 0;
let parentBtnStart = -1;
let allIssues = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const openMatches = line.match(/<button\b(?![^>]*\/>)/g) || [];
    const closeMatches = line.match(/<\/button>/g) || [];

    for (const _ of openMatches) {
        depth++;
        if (depth === 1) parentBtnStart = i;
        if (depth > 1) {
            allIssues.push({ nested: i + 1, parent: parentBtnStart + 1 });
        }
    }
    for (const _ of closeMatches) {
        depth--;
        if (depth < 0) depth = 0;
    }
}

console.log('Total: ' + allIssues.length + ' nested buttons\n');
for (const issue of allIssues) {
    console.log('Parent L' + issue.parent + ' -> Nested L' + issue.nested);
}
