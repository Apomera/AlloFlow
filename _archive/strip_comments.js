const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
const content = fs.readFileSync(f, 'utf8');
const lines = content.split('\n');
const originalSize = Buffer.byteLength(content, 'utf8');
const originalLines = lines.length;

console.log('Original: ' + (originalSize / 1024 / 1024).toFixed(2) + ' MB, ' + originalLines + ' lines');

const newLines = [];
let removedComments = 0;
let removedEmpty = 0;
let consecutiveEmpty = 0;
let inMultiLineComment = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // PRESERVE: #region / #endregion markers (even though they're comments)
    if (trimmed.includes('#region') || trimmed.includes('#endregion')) {
        newLines.push(line);
        consecutiveEmpty = 0;
        continue;
    }

    // PRESERVE: eslint comments, istanbul comments, copyright, license
    if (trimmed.includes('eslint') || trimmed.includes('istanbul') || trimmed.includes('Copyright') || trimmed.includes('License')) {
        newLines.push(line);
        consecutiveEmpty = 0;
        continue;
    }

    // REMOVE: Pure JSX comment lines {/* ... */}
    if (/^\s*\{\/\*.*\*\/\}\s*$/.test(line)) {
        removedComments++;
        continue;
    }

    // REMOVE: Pure JS comment lines (// only)
    // But be careful: some // lines are actually important dividers or region markers
    if (/^\s*\/\//.test(line) && !trimmed.includes('#region') && !trimmed.includes('#endregion')) {
        removedComments++;
        continue;
    }

    // REMOVE: Multi-line comment blocks /* ... */
    if (/^\s*\/\*/.test(line) && !trimmed.includes('*/')) {
        inMultiLineComment = true;
        removedComments++;
        continue;
    }
    if (inMultiLineComment) {
        removedComments++;
        if (trimmed.includes('*/')) {
            inMultiLineComment = false;
        }
        continue;
    }

    // REMOVE: Empty lines - but keep at most 1 consecutive empty line
    if (trimmed === '' || trimmed === '\r') {
        consecutiveEmpty++;
        if (consecutiveEmpty <= 1) {
            newLines.push(line);
        } else {
            removedEmpty++;
        }
        continue;
    }

    consecutiveEmpty = 0;
    newLines.push(line);
}

const newContent = newLines.join('\n');
const newSize = Buffer.byteLength(newContent, 'utf8');
const savedBytes = originalSize - newSize;

console.log('After cleanup: ' + (newSize / 1024 / 1024).toFixed(2) + ' MB, ' + newLines.length + ' lines');
console.log('Removed: ' + removedComments + ' comment lines, ' + removedEmpty + ' excess empty lines');
console.log('Saved: ' + (savedBytes / 1024).toFixed(1) + ' KB (' + (savedBytes / 1024 / 1024).toFixed(2) + ' MB)');
console.log('Line reduction: ' + (originalLines - newLines.length) + ' lines');

fs.writeFileSync(f, newContent, 'utf8');
console.log('Saved to file!');
