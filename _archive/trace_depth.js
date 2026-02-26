const fs = require('fs');
const lines = fs.readFileSync('AlloFlowANTI.txt', 'utf8').split('\n');

// Trace the nesting depth from L13530 (right before our button fix) 
// to L14945 (the portal close)
let depth = 0;
let jsxDepth = 0;
for (let i = 13530; i < 14945; i++) {
    const l = lines[i] || '';
    const trimmed = l.trim();

    // Count JSX tag opens and closes
    const opens = (l.match(/<[a-zA-Z][^/]*?>/g) || []).length;
    const selfClose = (l.match(/<[a-zA-Z][^>]*\/>/g) || []).length;
    const closes = (l.match(/<\/[a-zA-Z]+>/g) || []).length;
    const netChange = opens - selfClose - closes;

    // Count { and } for JSX expression depth
    const braceOpen = (l.match(/\{/g) || []).length;
    const braceClose = (l.match(/\}/g) || []).length;

    jsxDepth += netChange;

    // Only print lines where depth changes or important structural lines
    if (netChange !== 0 || trimmed.includes(')}') || trimmed === '') {
        if (jsxDepth < 3 || netChange < -1) {
            console.log('L' + (i + 1) + ' [depth=' + jsxDepth + ' Δ=' + netChange + ']: ' + trimmed.substring(0, 90));
        }
    }

    // Flag if depth goes below where it should
    if (jsxDepth < 0) {
        console.log('⚠️  NEGATIVE DEPTH at L' + (i + 1) + ': ' + jsxDepth);
    }
}

console.log('\nFinal depth at L14945: ' + jsxDepth);
console.log('Expected: 2 (for the portal </div>,)');
