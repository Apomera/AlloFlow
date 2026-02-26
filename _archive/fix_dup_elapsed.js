const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');

// Anti2 already had probeElapsed at L5828. Our fix added a duplicate at L5836.
// Find the SECOND occurrence and remove it (along with its useEffect).

const marker = 'const [probeElapsed, setProbeElapsed] = React.useState(0);';
const first = content.indexOf(marker);
const second = content.indexOf(marker, first + 1);

if (second === -1) {
    console.log('No duplicate found — already fixed or not present');
    process.exit(0);
}

console.log('First probeElapsed at char:', first);
console.log('Second probeElapsed at char:', second);

// The duplicate block we added includes the useState AND the useEffect
// Find the end of the useEffect block (ends with the closing of the dependency array)
const blockEnd = content.indexOf('], [isProbeMode, probeStartTimeRef.current]);', second);
if (blockEnd === -1) {
    console.log('Could not find end of duplicate block');
    process.exit(1);
}

const endOfBlock = blockEnd + '], [isProbeMode, probeStartTimeRef.current]);'.length;

// Remove from the start of the duplicate line to the end of the useEffect
// We need to find the start of the line containing the second occurrence
let lineStart = second;
while (lineStart > 0 && content[lineStart - 1] !== '\n') lineStart--;

content = content.substring(0, lineStart) + content.substring(endOfBlock);

fs.writeFileSync(f, content, 'utf8');
console.log('Removed duplicate probeElapsed block');
console.log('Final lines:', content.split('\n').length);
