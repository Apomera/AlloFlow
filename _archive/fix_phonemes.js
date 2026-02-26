const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');

// Fix: In launchBenchmarkProbe, change nested phoneme objects to flat arrays
// From: phonemes: { phonemes: w.phonemes, source: 'standardized' }
// To:   phonemes: w.phonemes
const old1 = "phonemes: { phonemes: w.phonemes, source: 'standardized' }";
const new1 = "phonemes: w.phonemes";

const count = content.split(old1).length - 1;
console.log('Found', count, 'instances of nested phonemes wrapping');

if (count > 0) {
    content = content.replaceAll(old1, new1);
    console.log('Replaced with flat phonemes arrays');
} else {
    console.log('Pattern not found, searching...');
    const lines = content.split('\n');
    for (let i = 12595; i < 12610; i++) {
        console.log('L' + (i + 1) + ':', lines[i]?.trim().substring(0, 90));
    }
}

fs.writeFileSync(f, content, 'utf8');
console.log('Saved');
