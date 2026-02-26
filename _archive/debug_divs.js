const fs = require('fs');
const path = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
const lines = fs.readFileSync(path, 'utf8').split('\n');

const startLine = 44608;
const endLine = 45056;

const snippet = lines.slice(startLine - 1, endLine);

let openDivs = 0;
let closeDivs = 0;

for (let line of snippet) {
    const matchesOpen = line.match(/<div\b/g);
    const matchesClose = line.match(/<\/div>/g);
    const matchesSelf = line.match(/<div\b[^>]*\/>/g);

    if (matchesOpen) openDivs += matchesOpen.length;
    if (matchesClose) closeDivs += matchesClose.length;
    if (matchesSelf) {
        openDivs -= matchesSelf.length;
    }
}

console.log(`OPENS: ${openDivs}, CLOSES: ${closeDivs}, BALANCE: ${openDivs - closeDivs}`);
