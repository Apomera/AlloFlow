const fs = require('fs');
const vm = require('vm');

const file = process.argv[2];
const code = fs.readFileSync(file, 'utf8');

// Try the full file first
try {
  new vm.Script(code, { filename: file });
  console.log('No syntax errors found!');
  process.exit(0);
} catch (e) {
  console.log('Full file error:', e.message);
}

// Binary search for the error line
const lines = code.split('\n');
let lo = 0, hi = lines.length - 1;

// First, find the earliest line where the code up to that line has an error
// Actually, let's try a different approach: find the line where adding it causes a new error
// Binary search: find smallest N where lines[0..N] has an error different from "unexpected end"

function checkLines(n) {
  const partial = lines.slice(0, n + 1).join('\n');
  try {
    new vm.Script(partial, { filename: file });
    return 'ok';
  } catch (e) {
    if (e.message.includes('Unexpected end of input') || e.message.includes('Unterminated')) {
      return 'incomplete';
    }
    return e.message;
  }
}

// Linear scan from near end, or use binary search
// Let's try: find the first line where code[0..line] gives a non-"incomplete" error
lo = 0;
hi = lines.length - 1;

while (lo < hi) {
  const mid = Math.floor((lo + hi) / 2);
  const result = checkLines(mid);
  if (result === 'ok' || result === 'incomplete') {
    lo = mid + 1;
  } else {
    hi = mid;
  }
}

console.log('Error at line', lo + 1, ':', lines[lo]);
console.log('Check result:', checkLines(lo));

// Show context
for (let i = Math.max(0, lo - 5); i <= Math.min(lines.length - 1, lo + 5); i++) {
  const marker = i === lo ? '>>>' : '   ';
  console.log(`${marker} ${i + 1}: ${lines[i]}`);
}
