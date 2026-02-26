const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let lines = fs.readFileSync(f, 'utf8').split('\n');

// Find all lines with probeElapsed declaration  
const matches = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const [probeElapsed, setProbeElapsed]')) {
        matches.push(i);
        console.log('Found probeElapsed at L' + (i + 1) + ': ' + lines[i].trim());
    }
}

if (matches.length < 2) {
    console.log('Only ' + matches.length + ' declaration(s) found. No duplicates.');
    process.exit(0);
}

// Remove the SECOND occurrence and its associated useEffect
// The second block starts at matches[1] and includes the useEffect
const startIdx = matches[1];
console.log('\nRemoving duplicate starting at L' + (startIdx + 1));

// Find the end of the useEffect block - look for the closing });
let endIdx = startIdx;
let foundEffect = false;
for (let i = startIdx + 1; i < startIdx + 15; i++) {
    if (lines[i]?.includes('React.useEffect')) foundEffect = true;
    if (foundEffect && lines[i]?.includes('probeStartTimeRef.current]')) {
        endIdx = i;
        break;
    }
}

console.log('Block ends at L' + (endIdx + 1));
console.log('Removing lines L' + (startIdx + 1) + ' to L' + (endIdx + 1));

// Show what we're removing
for (let i = startIdx; i <= endIdx; i++) {
    console.log('  DEL L' + (i + 1) + ': ' + lines[i]?.trim().substring(0, 60));
}

lines.splice(startIdx, endIdx - startIdx + 1);

fs.writeFileSync(f, lines.join('\n'), 'utf8');
console.log('\nDone! Lines: ' + lines.length);
