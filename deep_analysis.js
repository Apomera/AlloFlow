// Extract lines around error from HEAD version
const {execSync} = require('child_process');
const old = execSync('git show HEAD:stem_lab_module.js', {encoding:'utf8', maxBuffer:10*1024*1024});
const lines = old.split('\n');
console.log('Total lines in HEAD:', lines.length);
console.log('\n=== LINES 23410-23450 (around original error at 23445) ===');
for (let i = 23409; i < 23450; i++) {
  const marker = (i+1 === 23445) ? '>>>' : '   ';
  console.log(`${marker} ${i+1}: ${lines[i]}`);
}
// Also check what's just above to understand the nesting
console.log('\n=== LINES 23390-23425 (context above) ===');
for (let i = 23389; i < 23425; i++) {
  console.log(`   ${i+1}: ${lines[i]}`);
}
