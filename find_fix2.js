// Multi-fix finder: test swapping ) for , and vice versa, and combined fixes
const fs = require('fs');
const vm = require('vm');

const file = process.argv[2];
const code = fs.readFileSync(file, 'utf8');
const lines = code.split('\n');
const results = [];

function check(codeLines) {
  const s = codeLines.join('\n');
  try { new vm.Script(s); return 'ok'; } 
  catch (e) {
    if (e.message.includes('Unexpected end') || e.message.includes('Unterminated')) return 'inc';
    return 'ERR:' + e.message.substring(0, 60);
  }
}

// Find error line
let lo = 0, hi = lines.length - 1;
while (lo < hi) {
  const mid = Math.floor((lo + hi) / 2);
  const r = check(lines.slice(0, mid + 1));
  if (r === 'ok' || r === 'inc') lo = mid + 1; else hi = mid;
}
const errLine = lo;
results.push('ERROR LINE: ' + (errLine + 1));
results.push('ERROR CONTENT: ' + lines[errLine].trim().substring(0, 100));
results.push('');

// Strategy 1: Find lines where replacing ), with ) or ) with ), changes things
results.push('=== STRATEGY 1: Swap ), with ) and vice versa ===');
const range = 500;
for (let i = Math.max(0, errLine - range); i <= Math.min(lines.length - 1, errLine + 5); i++) {
  const line = lines[i];
  // Try replacing ), with ) (removing comma after close paren)
  if (line.includes('),')) {
    const mod = [...lines];
    mod[i] = line.replace(/\),\s*$/, ')');
    const r = check(mod);
    if (r === 'ok') {
      results.push('LINE ' + (i+1) + ': Removing trailing comma after ) FIXES IT!');
      results.push('  WAS: ' + line.trim().substring(0, 100));
    }
  }
  // Try replacing ) with ), (adding comma after close paren)
  if (line.match(/\)\s*$/) && !line.includes('),')) {
    const mod = [...lines];
    mod[i] = line.replace(/\)\s*$/, '),');
    const r = check(mod);
    if (r === 'ok') {
      results.push('LINE ' + (i+1) + ': Adding comma after ) FIXES IT!');
      results.push('  WAS: ' + line.trim().substring(0, 100));
    }
  }
}
results.push('');

// Strategy 2: Find lines where changing ) to , or , to ) fixes things
results.push('=== STRATEGY 2: Replace ) with , ===');
for (let i = Math.max(0, errLine - range); i <= Math.min(lines.length - 1, errLine + 5); i++) {
  const line = lines[i];
  if (line.trimRight().endsWith('),')) {
    // Try changing ), to ,  (remove the closing paren entirely)
    const mod = [...lines];
    mod[i] = line.replace(/\),\s*$/, ',');
    const r = check(mod);
    if (r === 'ok') {
      results.push('LINE ' + (i+1) + ': Changing ), to , FIXES IT!');
      results.push('  WAS: ' + line.trim().substring(0, 100));
    }
  }
}
results.push('');

// Strategy 3: Try removing 2 lines at once
results.push('=== STRATEGY 3: Remove pairs of lines ===');
for (let i = Math.max(0, errLine - 50); i <= Math.min(lines.length - 1, errLine + 5); i++) {
  for (let j = i + 1; j <= Math.min(lines.length - 1, errLine + 5); j++) {
    const mod = lines.filter((_, idx) => idx !== i && idx !== j);
    const r = check(mod);
    if (r === 'ok') {
      results.push('REMOVING LINES ' + (i+1) + ' AND ' + (j+1) + ' FIXES IT!');
      results.push('  Line ' + (i+1) + ': ' + lines[i].trim().substring(0, 100));
      results.push('  Line ' + (j+1) + ': ' + lines[j].trim().substring(0, 100));
    }
  }
}

const outFile = 'C:/tmp/' + file.replace('.js', '_fix2.txt');
fs.writeFileSync(outFile, results.join('\n'), 'utf8');
console.log('Done. Results in ' + outFile);
