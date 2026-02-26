const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let lines = fs.readFileSync(f, 'utf8').split('\n');
let changes = 0;

// Check what's at L60158-60162 now
console.log('=== Volume area NOW ===');
for (let i = 60155; i < 60170; i++) {
    console.log('L' + (i + 1) + ': ' + lines[i].substring(0, 140));
}

// Check AC
console.log('\n=== AC ===');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const AssessmentCenter') && lines[i].includes('=')) {
        console.log('AC def at L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
        break;
    }
}
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<AssessmentCenter') && !lines[i].includes('const ')) {
        console.log('AC render at L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
        break;
    }
}

// Check volume header
for (let i = 60100; i < 60180; i++) {
    if (lines[i] && lines[i].includes('Volume Challenge')) {
        console.log('\nVol header at L' + (i + 1) + ': ' + lines[i].trim().substring(0, 100));
    }
}
