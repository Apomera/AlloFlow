const fs = require('fs');
const lines = fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8').split('\n');

// Track paren depth through Cyber Defense IIFE
let pd = 0;
for (let i = 45599; i < 46304; i++) {
  const ln = lines[i];
  let inStr = false, esc = false, sq = false;
  for (let j = 0; j < ln.length; j++) {
    const c = ln[j];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (!inStr && c === "'") { inStr = true; sq = true; continue; }
    if (!inStr && c === '"') { inStr = true; sq = false; continue; }
    if (inStr && sq && c === "'") { inStr = false; continue; }
    if (inStr && !sq && c === '"') { inStr = false; continue; }
    if (inStr) continue;
    // Skip single-line comments
    if (c === '/' && j + 1 < ln.length && ln[j + 1] === '/') break;
    if (c === '(') pd++;
    if (c === ')') pd--;
  }
  if (pd < 0) {
    console.log('NEGATIVE pd at L' + (i + 1) + ' pd=' + pd + ': ' + ln.trim().substring(0, 100));
  }
}
console.log('Final pd at end of IIFE (L46304)=' + pd);
console.log('Expected: 0');

// Also check specific problem areas
console.log('\n--- Lines around Password Forge / Cipher Playground transitions ---');
for (let i = 46170; i < 46230; i++) {
  console.log('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 100));
}
