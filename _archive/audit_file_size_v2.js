const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt', 'utf8');
const lines = content.split('\n');

console.log('=== LARGE CONST BLOCKS (scanning by region marker lines) ===');

// Instead of char-by-char, find region markers and known large blocks
const regions = [];
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('#region') || line.includes('#endregion')) {
        regions.push({ line: i + 1, text: line.trim().substring(0, 80) });
    }
}

console.log('Regions found: ' + regions.length);
for (let i = 0; i < regions.length; i++) {
    const r = regions[i];
    const nextLine = (i + 1 < regions.length) ? regions[i + 1].line : lines.length;
    const regionLines = nextLine - r.line;
    let regionBytes = 0;
    for (let j = r.line - 1; j < nextLine - 1 && j < lines.length; j++) {
        regionBytes += lines[j].length + 1;
    }
    const kb = (regionBytes / 1024).toFixed(1);
    const mb = (regionBytes / 1024 / 1024).toFixed(2);
    const flag = regionBytes >= 200000 ? ' ⚠️ EXTERNALIZE' : regionBytes >= 100000 ? ' 📦' : '';
    if (regionBytes > 20000) {
        console.log('  L' + r.line + '-L' + nextLine + ' (' + regionLines + ' lines, ' + kb + ' KB / ' + mb + ' MB)' + flag);
        console.log('    ' + r.text);
    }
}

// Also find specific known large blocks
console.log('\n=== SPECIFIC LARGE OBJECTS ===');

const targets = [
    'PHONEME_AUDIO_BANK', 'INSTRUCTION_AUDIO', 'UI_STRINGS', 'HELP_STRINGS',
    'psychometricProbesData', 'LANGUAGE_CONFIG', 'LANGUAGE_DATA',
    'PROBE_DEFINITIONS', 'PARENTING_EMOTIONS', 'PARENTING_MILESTONES'
];

for (const name of targets) {
    const idx = content.indexOf('const ' + name + ' ');
    if (idx === -1) {
        const idx2 = content.indexOf('const ' + name + '=');
        if (idx2 === -1) continue;
    }
    const startLine = content.substring(0, content.indexOf('const ' + name)).split('\n').length;
    console.log(name + ': starts at L' + startLine);
}

// Scan for base64 data URIs (large inline data)
console.log('\n=== BASE64 DATA URIS ===');
let base64Count = 0;
let base64Bytes = 0;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('data:audio/') || lines[i].includes('data:image/')) {
        base64Count++;
        base64Bytes += lines[i].length;
    }
}
console.log('Lines with base64 data URIs: ' + base64Count + ' (' + (base64Bytes / 1024).toFixed(0) + ' KB / ' + (base64Bytes / 1024 / 1024).toFixed(2) + ' MB)');

// Dead functions (from first audit)
console.log('\n=== DEAD FUNCTIONS (full list) ===');
const funcRegex = /^\s*(?:const|function|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|function|React\.memo|useMemo|useCallback)/;
const deadFuncs = [];

for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(funcRegex);
    if (!match) continue;
    const name = match[1];
    if (name.length < 4 || name === 'AlloFlowContent') continue;

    // Count references
    let count = 0;
    let searchIdx = 0;
    while (searchIdx < content.length) {
        const found = content.indexOf(name, searchIdx);
        if (found === -1) break;
        // Check word boundaries
        const before = found > 0 ? content[found - 1] : ' ';
        const after = found + name.length < content.length ? content[found + name.length] : ' ';
        if (!/\w/.test(before) && !/\w/.test(after)) count++;
        searchIdx = found + name.length;
    }

    if (count <= 1) {
        deadFuncs.push({ name, line: i + 1 });
    }
}

console.log('Total dead functions: ' + deadFuncs.length);
for (const df of deadFuncs) {
    // Estimate size - find the end of the function
    const startIdx = content.indexOf(lines[df.line - 1]);
    let funcSize = 0;
    for (let j = df.line - 1; j < Math.min(df.line + 200, lines.length); j++) {
        funcSize += lines[j].length + 1;
        // Rough end detection
        if (j > df.line && (lines[j].match(/^\s*\};?\s*$/) || lines[j].match(/^\s*\)\s*;?\s*$/))) {
            break;
        }
    }
    console.log('  L' + df.line + ': ' + df.name + ' (~' + (funcSize / 1024).toFixed(1) + ' KB)');
}
