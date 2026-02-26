const fs = require('fs');
const content = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const lines = content.split('\n');

// Find Number Line tool closing
const nlStart = content.indexOf("stemLabTool === 'numberline'");
const nlLine = content.substring(0, nlStart).split('\n').length;
console.log('NL tool starts at L' + nlLine);
for (let i = nlLine + 58; i < nlLine + 78; i++) {
    console.log('L' + (i + 1) + ': |' + lines[i] + '|');
}

console.log('---');

// Find Fractions tool closing
const frStart = content.lastIndexOf("stemLabTool === 'fractions'");
const frLine = content.substring(0, frStart).split('\n').length;
console.log('Frac tool starts at L' + frLine);
for (let i = frLine + 60; i < Math.min(frLine + 90, lines.length); i++) {
    console.log('L' + (i + 1) + ': |' + lines[i] + '|');
}
