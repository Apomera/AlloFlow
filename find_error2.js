const fs = require('fs');
const vm = require('vm');

const file = process.argv[2];
const code = fs.readFileSync(file, 'utf8');
const lines = code.split('\n');

function checkLines(n) {
  const partial = lines.slice(0, n + 1).join('\n');
  try {
    new vm.Script(partial, { filename: file });
    return { status: 'ok' };
  } catch (e) {
    if (e.message.includes('Unexpected end of input') || e.message.includes('Unterminated')) {
      return { status: 'incomplete', msg: e.message };
    }
    return { status: 'error', msg: e.message };
  }
}

// Binary search for error line
let lo = 0, hi = lines.length - 1;
while (lo < hi) {
  const mid = Math.floor((lo + hi) / 2);
  const result = checkLines(mid);
  if (result.status === 'ok' || result.status === 'incomplete') {
    lo = mid + 1;
  } else {
    hi = mid;
  }
}

const errorLine = lo;
const errorResult = checkLines(errorLine);
const prevResult = checkLines(errorLine - 1);

console.log('=== ERROR FOUND ===');
console.log('Error at line ' + (errorLine + 1) + ' (0-indexed: ' + errorLine + ')');
console.log('Error message: ' + errorResult.msg);
console.log('Previous line status: ' + prevResult.status + ' - ' + (prevResult.msg || 'OK'));
console.log('');
console.log('=== CONTEXT (10 lines before and after) ===');
for (let i = Math.max(0, errorLine - 10); i <= Math.min(lines.length - 1, errorLine + 5); i++) {
  const marker = i === errorLine ? '>>>' : '   ';
  console.log(marker + ' ' + (i + 1) + ': ' + lines[i].trimRight().substring(0, 120));
}
