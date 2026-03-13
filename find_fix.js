// Focused fix finder: test adding/removing specific chars near error
const fs = require('fs');
const vm = require('vm');

const file = process.argv[2];
const code = fs.readFileSync(file, 'utf8');
const lines = code.split('\n');
const results = [];

function check(codeStr) {
  try { new vm.Script(codeStr); return 'ok'; } 
  catch (e) {
    if (e.message.includes('Unexpected end') || e.message.includes('Unterminated')) return 'inc';
    return 'ERR:' + e.message.substring(0, 60);
  }
}

// Find error line
let lo = 0, hi = lines.length - 1;
while (lo < hi) {
  const mid = Math.floor((lo + hi) / 2);
  const r = check(lines.slice(0, mid + 1).join('\n'));
  if (r === 'ok' || r === 'inc') lo = mid + 1; else hi = mid;
}
const errLine = lo;
results.push('ERROR LINE: ' + (errLine + 1));
const errMsg = check(lines.slice(0, errLine + 1).join('\n'));
results.push('ERROR MSG: ' + errMsg);
results.push('CONTENT: ' + lines[errLine].trim().substring(0, 100));
results.push('');

// Test removing lines in a wide range around the error
results.push('=== LINE REMOVAL TEST ===');
for (let i = Math.max(0, errLine - 100); i <= Math.min(lines.length - 1, errLine + 5); i++) {
  const mod = [...lines]; mod.splice(i, 1);
  const r = check(mod.join('\n'));
  if (r === 'ok') {
    results.push('REMOVING LINE ' + (i + 1) + ' FIXES FILE! Content: ' + lines[i].trim().substring(0, 100));
  }
}
results.push('');

// Test adding ')' at various points
results.push('=== ADDING ) TEST ===');
for (let i = Math.max(0, errLine - 100); i <= errLine; i++) {
  const mod = [...lines]; mod.splice(i, 0, ')');
  const r = check(mod.join('\n'));
  if (r === 'ok') {
    results.push('ADDING ) BEFORE LINE ' + (i + 1) + ' FIXES FILE!');
  }
}

fs.writeFileSync('C:/tmp/' + file.replace('.js', '_diag.txt'), results.join('\n'), 'utf8');
console.log('Done. Results in C:/tmp/' + file.replace('.js', '_diag.txt'));
