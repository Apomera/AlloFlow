const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');

// Print diagnostic of current state around both fix areas
const lines = content.split('\n');
console.log('=== Current state L13540-13548 ===');
for (let i = 13539; i < 13548; i++) {
    console.log('L' + (i + 1) + ': ' + JSON.stringify(lines[i]));
}
console.log('\n=== Current state L14930-14943 ===');
for (let i = 14929; i < 14943; i++) {
    console.log('L' + (i + 1) + ': ' + JSON.stringify(lines[i]));
}
