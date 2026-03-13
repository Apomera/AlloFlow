// Smart context-aware syntax error finder
// Uses the VM parser to find the actual structural problem
const fs = require('fs');
const vm = require('vm');

const file = process.argv[2];
const code = fs.readFileSync(file, 'utf8');
const lines = code.split('\n');

console.log('Total lines:', lines.length);

// Binary search already told us the error line - now find what's wrong
// Strategy: find the largest prefix that parses as "incomplete" then look
// at what adding the next few lines does

function check(n) {
  const partial = lines.slice(0, n + 1).join('\n');
  try {
    new vm.Script(partial);
    return { status: 'ok' };
  } catch (e) {
    if (e.message.includes('Unexpected end of input') || e.message.includes('Unterminated')) {
      return { status: 'incomplete', msg: e.message };
    }
    return { status: 'error', msg: e.message };
  }
}

// Find the error line via binary search
let lo = 0, hi = lines.length - 1;
while (lo < hi) {
  const mid = Math.floor((lo + hi) / 2);
  const r = check(mid);
  if (r.status === 'ok' || r.status === 'incomplete') {
    lo = mid + 1;
  } else {
    hi = mid;
  }
}
const errorLine = lo;
console.log('Error at line', errorLine + 1, ':', check(errorLine).msg);
console.log('Line content:', lines[errorLine].trim().substring(0, 100));
console.log('');

// Now let's find the structural problem
// Try removing line X and checking if that fixes or changes the error
console.log('=== Testing line removals near error ===');
for (let i = Math.max(0, errorLine - 20); i <= errorLine + 5; i++) {
  const modified = [...lines];
  modified.splice(i, 1); // remove line i
  const partial = modified.slice(0, Math.min(errorLine + 5, modified.length)).join('\n');
  try {
    new vm.Script(partial);
    console.log('REMOVING line', i + 1, 'FIXES IT!', lines[i].trim().substring(0, 80));
  } catch (e) {
    if (e.message !== check(Math.min(errorLine + 5, lines.length - 1)).msg) {
      console.log('Removing line', i + 1, 'changes error to:', e.message.substring(0, 60));
    }
  }
}

// Also try inserting a ')' before each line
console.log('');
console.log('=== Testing ) insertion ===');
for (let i = Math.max(0, errorLine - 20); i <= errorLine; i++) {
  const modified = [...lines];
  modified.splice(i, 0, ')'); // insert ) before line i
  const partial = modified.slice(0, errorLine + 10).join('\n');
  try {
    new vm.Script(partial);
    console.log('INSERTING ) before line', i + 1, 'FIXES IT!');
  } catch (e) {
    if (!e.message.includes(check(errorLine).msg.substring(0, 20))) {
      // Different error - interesting
    }
  }
}
