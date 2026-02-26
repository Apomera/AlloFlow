const fs = require('fs');
const c = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const lines = c.split('\n');

// Issue 1: Find button-inside-button nesting
// The stack trace shows: button > div > div > button
// This means a <button> contains divs that contain another <button>
// Most likely in our new probe UI additions

console.log('=== NWF Probe section (likely has literacy probe buttons) ===');
for (let i = 13710; i < 13820; i++) {
    if (lines[i] && (lines[i].includes('<button') || lines[i].includes('</button>'))) {
        console.log('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
    }
}

console.log('\n=== Literacy probe launchers (NWF/ORF sections) ===');
for (let i = 13500; i < 13610; i++) {
    if (lines[i] && (lines[i].includes('<button') || lines[i].includes('isProbeMode') || lines[i].includes('setIsWordSoundsMode'))) {
        console.log('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
    }
}

// Issue 2: Check if Word Sounds modal renders INSIDE Assessment Center
console.log('\n=== isWordSoundsMode rendering (where does WS modal appear?) ===');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('isWordSoundsMode') && (lines[i].includes('{') || lines[i].includes('&&'))) {
        console.log('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
    }
}

// Check the probe launchers for nested button issues
console.log('\n=== Fluency blocks rendering ===');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('fluencyBlocks') && (lines[i].includes('map') || lines[i].includes('forEach') || lines[i].includes('<'))) {
        console.log('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
    }
}

// Check for the NWF/ORF Word Sounds launcher nesting
console.log('\n=== setIsProbeMode calls ===');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('setIsProbeMode')) {
        console.log('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
    }
}
