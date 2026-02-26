const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
const content = fs.readFileSync(f, 'utf8');
const lines = content.split('\n');
const totalBytes = Buffer.byteLength(content, 'utf8');
const totalLines = lines.length;

console.log('=== ALLOFLOW FILE AUDIT ===');
console.log('Total: ' + (totalBytes / 1024 / 1024).toFixed(2) + ' MB, ' + totalLines + ' lines\n');

// ============================================================
// 1. COMMENT ANALYSIS
// ============================================================
let commentOnlyLines = 0;
let jsxCommentBytes = 0;
let jsCommentBytes = 0;
let debugLogLines = 0;
let debugLogBytes = 0;
let consoleLines = 0;
let consoleBytes = 0;
const commentBlocks = [];
let inBlockComment = false;
let blockStart = -1;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // JSX comments: {/* ... */}
    if (trimmed.startsWith('{/*') || trimmed.startsWith('/* ') || trimmed.startsWith('//')) {
        commentOnlyLines++;
        if (trimmed.startsWith('{/*')) jsxCommentBytes += Buffer.byteLength(line, 'utf8');
        if (trimmed.startsWith('//')) jsCommentBytes += Buffer.byteLength(line, 'utf8');
    }

    // Debug logs
    if (trimmed.includes('debugLog(') || trimmed.includes('console.log(') || trimmed.includes('console.warn(') || trimmed.includes('console.error(')) {
        if (trimmed.includes('debugLog(')) { debugLogLines++; debugLogBytes += Buffer.byteLength(line, 'utf8'); }
        if (trimmed.includes('console.')) { consoleLines++; consoleBytes += Buffer.byteLength(line, 'utf8'); }
    }
}

console.log('--- COMMENTS ---');
console.log('Comment-only lines: ' + commentOnlyLines + ' (' + (commentOnlyLines / totalLines * 100).toFixed(1) + '%)');
console.log('JSX comment bytes: ' + (jsxCommentBytes / 1024).toFixed(1) + ' KB');
console.log('JS comment bytes: ' + (jsCommentBytes / 1024).toFixed(1) + ' KB');
console.log('');
console.log('--- DEBUG/LOGGING ---');
console.log('debugLog() calls: ' + debugLogLines + ' (' + (debugLogBytes / 1024).toFixed(1) + ' KB)');
console.log('console.* calls: ' + consoleLines + ' (' + (consoleBytes / 1024).toFixed(1) + ' KB)');

// ============================================================
// 2. LARGE INLINE DATA BLOCKS
// ============================================================
console.log('\n--- LARGE DATA BLOCKS ---');

// Find PHONEME_AUDIO_BANK and similar inline data
const dataPatterns = [
    { name: 'PHONEME_AUDIO_BANK', start: 'const PHONEME_AUDIO_BANK', end: '};' },
    { name: 'INSTRUCTION_AUDIO', start: 'const INSTRUCTION_AUDIO', end: '};' },
    { name: 'UI_STRINGS', start: 'const UI_STRINGS', end: '};' },
    { name: 'HELP_STRINGS', start: 'const HELP_STRINGS', end: '};' },
    { name: 'LANGUAGE_DATA', start: 'const LANGUAGE_DATA', end: '};' },
    { name: 'BASE64_AUDIO', start: 'data:audio', end: null },
];

for (const pattern of dataPatterns) {
    if (pattern.end === null) {
        // Count base64 audio occurrences
        let count = 0;
        let totalSize = 0;
        let idx = 0;
        while ((idx = content.indexOf(pattern.start, idx)) !== -1) {
            count++;
            // Estimate size of the base64 string
            const lineIdx = content.lastIndexOf('\n', idx);
            const lineEnd = content.indexOf('\n', idx);
            totalSize += lineEnd - lineIdx;
            idx = lineEnd;
        }
        console.log(pattern.name + ': ' + count + ' occurrences, ~' + (totalSize / 1024).toFixed(0) + ' KB');
        continue;
    }

    const startIdx = content.indexOf(pattern.start);
    if (startIdx === -1) continue;

    // Find the matching closing
    let depth = 0;
    let endIdx = -1;
    for (let j = startIdx; j < content.length; j++) {
        if (content[j] === '{') depth++;
        if (content[j] === '}') {
            depth--;
            if (depth === 0) {
                endIdx = j + 1;
                break;
            }
        }
    }

    if (endIdx > -1) {
        const blockSize = endIdx - startIdx;
        const startLine = content.substring(0, startIdx).split('\n').length;
        const endLine = content.substring(0, endIdx).split('\n').length;
        const sizeKB = (blockSize / 1024).toFixed(1);
        const sizeMB = (blockSize / 1024 / 1024).toFixed(2);
        const flag = blockSize >= 200000 ? ' ⚠️ EXTERNALIZABLE' : '';
        console.log(pattern.name + ': L' + startLine + '-L' + endLine + ' = ' + sizeKB + ' KB (' + sizeMB + ' MB)' + flag);
    }
}

// ============================================================
// 3. DEAD CODE DETECTION
// ============================================================
console.log('\n--- POTENTIAL DEAD CODE ---');

// Find functions defined but never called (simple heuristic)
const funcDefs = [];
const funcRegex = /(?:const|function|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|function|React\.memo|useMemo|useCallback)/g;
let match;
while ((match = funcRegex.exec(content)) !== null) {
    const name = match[1];
    // Skip common patterns
    if (name.length < 3 || name.startsWith('_') || name === 'App' || name === 'AlloFlowContent') continue;
    funcDefs.push({ name, pos: match.index });
}

let deadFuncs = 0;
const deadList = [];
for (const func of funcDefs) {
    // Count occurrences beyond the definition
    const regex = new RegExp('\\b' + func.name + '\\b', 'g');
    let count = 0;
    let m;
    while ((m = regex.exec(content)) !== null) {
        count++;
    }
    // If only appears once (the definition), it's dead
    if (count <= 1) {
        const line = content.substring(0, func.pos).split('\n').length;
        deadFuncs++;
        deadList.push('  L' + line + ': ' + func.name);
    }
}
console.log('Functions defined but potentially never called: ' + deadFuncs);
deadList.slice(0, 20).forEach(d => console.log(d));
if (deadList.length > 20) console.log('  ... and ' + (deadList.length - 20) + ' more');

// ============================================================
// 4. LEGACY PATTERNS
// ============================================================
console.log('\n--- LEGACY PATTERNS ---');

// Old Volume Builder SVG (should have been removed)
const oldVolIdx = content.indexOf('cubeSize * 0.866');
console.log('Old SVG Volume Builder: ' + (oldVolIdx > -1 ? 'STILL PRESENT at ' + oldVolIdx : 'Removed ✅'));

// TODO/FIXME/HACK comments
let todos = 0, fixmes = 0, hacks = 0;
for (const line of lines) {
    if (line.includes('TODO')) todos++;
    if (line.includes('FIXME')) fixmes++;
    if (line.includes('HACK')) hacks++;
}
console.log('TODO: ' + todos + ', FIXME: ' + fixmes + ', HACK: ' + hacks);

// Disabled/commented-out code blocks (lines starting with //)
let commentedCodeLines = 0;
for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('//') && (t.includes('const ') || t.includes('return ') || t.includes('setState') || t.includes('function ') || t.includes('if (') || t.includes('.map('))) {
        commentedCodeLines++;
    }
}
console.log('Commented-out code lines: ' + commentedCodeLines);

// ============================================================
// 5. WHITESPACE ANALYSIS
// ============================================================
console.log('\n--- WHITESPACE ---');
let trailingWhitespaceLines = 0;
let emptyLines = 0;
let trailingBytes = 0;
for (const line of lines) {
    if (line.endsWith(' ') || line.endsWith('\t') || line.endsWith(' \r')) {
        trailingWhitespaceLines++;
        // Calculate extra bytes
        const trimmedRight = line.trimEnd();
        trailingBytes += line.length - trimmedRight.length;
    }
    if (line.trim() === '' || line.trim() === '\r') emptyLines++;
}
console.log('Trailing whitespace lines: ' + trailingWhitespaceLines + ' (' + (trailingBytes / 1024).toFixed(1) + ' KB)');
console.log('Empty lines: ' + emptyLines);

// ============================================================
// SUMMARY
// ============================================================
const commentTotal = jsxCommentBytes + jsCommentBytes;
const debugTotal = debugLogBytes + consoleBytes;
console.log('\n=== SAVINGS SUMMARY ===');
console.log('Comments: ~' + (commentTotal / 1024).toFixed(0) + ' KB');
console.log('Debug/console logs: ~' + (debugTotal / 1024).toFixed(0) + ' KB');
console.log('Trailing whitespace: ~' + (trailingBytes / 1024).toFixed(0) + ' KB');
console.log('Commented-out code: ~' + commentedCodeLines + ' lines');
