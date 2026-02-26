const fs = require('fs');
const lines = fs.readFileSync('AlloFlowANTI.txt', 'utf8').split('\n');

// Track button depth properly - handle JSX open/close tags
let depth = 0;
let issues = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Count button opens (not self-closing, not </button>)
    const openMatches = line.match(/<button\b(?![^>]*\/>)/g) || [];
    const closeMatches = line.match(/<\/button>/g) || [];

    for (const _ of openMatches) {
        depth++;
        if (depth > 1) {
            issues.push({ line: i + 1, depth, text: line.trim().substring(0, 120) });
        }
    }
    for (const _ of closeMatches) {
        depth--;
        if (depth < 0) depth = 0;
    }
}

console.log('Found ' + issues.length + ' button-nesting issues:\n');
for (const issue of issues) {
    console.log('L' + issue.line + ' (depth ' + issue.depth + '): ' + issue.text);
    // Show context
    for (let j = Math.max(0, issue.line - 6); j < issue.line - 1; j++) {
        if (lines[j].includes('<button') || lines[j].includes('</button>')) {
            console.log('  context L' + (j + 1) + ': ' + lines[j].trim().substring(0, 100));
        }
    }
    console.log();
}
