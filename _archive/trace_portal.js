const fs = require('fs');
const lines = fs.readFileSync('AlloFlowANTI.txt', 'utf8').split('\n');

// The error is at L14938 </div>. "Unterminated regular expression" means
// esbuild has already LEFT JSX mode — there are too many closing tags above.
// 
// Strategy: Find the ReactDOM.createPortal( call and trace from its opening
// <div> to the closing </div>, counting ONLY JSX tags (not template literals).

// Find the createPortal call
let portalStart = -1;
for (let i = 14940; i > 11000; i--) {
    if (lines[i]?.includes('createPortal') || lines[i]?.includes('ReactDOM.createPortal')) {
        portalStart = i;
        break;
    }
}
console.log('Portal start: L' + (portalStart + 1) + ': ' + lines[portalStart]?.trim().substring(0, 80));

// Find portal close
let portalClose = -1;
for (let i = portalStart; i < portalStart + 5000; i++) {
    if (lines[i]?.includes('document.body')) {
        portalClose = i;
        break;
    }
}
console.log('Portal close: L' + (portalClose + 1) + ': ' + lines[portalClose]?.trim().substring(0, 80));

// Now trace tag depth from portal opening to portal close
// Don't count tags inside template literals (backtick strings)
let depth = 0;
let inTemplate = false;
let negativeLines = [];

for (let i = portalStart; i <= portalClose; i++) {
    const line = lines[i] || '';

    // Track template literal state (simplified - count backticks)
    const backticks = (line.match(/`/g) || []).length;
    if (backticks % 2 !== 0) inTemplate = !inTemplate;

    if (inTemplate) continue; // Skip lines inside template literals

    // Count JSX opens: <TagName or <TagName followed by space/attributes
    const opens = (line.match(/<(?!\/)[a-zA-Z][^>]*(?<!\/)\s*>/g) || []).length;
    const selfCloses = (line.match(/<[a-zA-Z][^>]*\/\s*>/g) || []).length;
    const closes = (line.match(/<\/[a-zA-Z]+\s*>/g) || []).length;

    const delta = opens - closes;
    depth += delta;

    if (depth < 0 || delta < -1) {
        negativeLines.push({ line: i + 1, depth, delta, text: line.trim().substring(0, 80) });
    }
}

console.log('\nFinal depth at portal close: ' + depth);
console.log('Expected: 0 (portal div should be balanced)');
console.log('\nLines where depth goes negative or drops sharply:');
negativeLines.forEach(n => {
    console.log('  L' + n.line + ' [depth=' + n.depth + ' Δ=' + n.delta + ']: ' + n.text);
});

// Also print L14930-14942 to see the current state
console.log('\n=== L14930-14942 current state ===');
for (let i = 14929; i < 14942; i++) {
    console.log('L' + (i + 1) + ': ' + JSON.stringify(lines[i]));
}
