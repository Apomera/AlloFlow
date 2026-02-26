const fs = require('fs');
const lines = fs.readFileSync('AlloFlowANTI.txt', 'utf8').split('\n');

// Focus on finding where depth first becomes problematic
// Look at the area around our fix (L13540-13550) and trace forward
console.log('=== Area around button fix (L13535-13550) ===');
for (let i = 13534; i < 13550; i++) {
    console.log('L' + (i + 1) + ': ' + lines[i]?.substring(0, 80));
}

console.log('\n=== Area around L14930-14945 (portal close) ===');
for (let i = 14929; i < 14945; i++) {
    console.log('L' + (i + 1) + ': ' + lines[i]?.substring(0, 80));
}

// The actual issue: Our fix at L13543-13545 added </button></div></div>
// But the original </button></div> from the math probe section was ALREADY
// somewhere. Let me find where the math probe section ORIGINALLY closed

// Search for the math computation probe wrapping div closings
console.log('\n=== Math probe section structure (L13500-13615) ===');
for (let i = 13499; i < 13615; i++) {
    const l = lines[i]?.trim() || '';
    if (l.startsWith('</') || l.startsWith(')}') || l.startsWith('<div') || l.startsWith('<button') || l.includes('Start Math') || l.includes('Math Probe') || l.includes('Literacy') || l.includes('Missing Number')) {
        console.log('L' + (i + 1) + ': ' + lines[i]?.substring(0, 80));
    }
}
