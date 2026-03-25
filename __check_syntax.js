const fs = require('fs');
const code = fs.readFileSync(__dirname + '/stem_lab/stem_lab_module.js', 'utf-8');
const lines = code.split('\n');

// Track paren depth from return statement (line 45952) through end of IIFE
let parenDepth = 0;
let inStr = false, strCh = '';
let inBC = false;

// Scan from IIFE start to just before the return to get base paren depth
for (let i = 45599; i < 45951; i++) {
  const l = lines[i];
  for (let j = 0; j < l.length; j++) {
    const ch = l[j], nx = l[j+1]||'';
    if (inBC) { if(ch==='*'&&nx==='/'){inBC=false;j++;} continue; }
    if (inStr) { if(ch==='\\'){j++;continue;} if(ch===strCh)inStr=false; continue; }
    if (ch==='/'&&nx==='/') break;
    if (ch==='/'&&nx==='*') { inBC=true;j++; continue; }
    if (ch==='\''||ch==='"'||ch==='`') { inStr=true;strCh=ch; continue; }
    if (ch==='(') parenDepth++;
    if (ch===')') parenDepth--;
  }
}
console.log('Base paren depth before return: ' + parenDepth);

// Now track every line in the return statement
let prevDepth = parenDepth;
let minDepthLine = -1, minDepth = 999;

for (let i = 45951; i < 46300; i++) {
  const l = lines[i];
  const startDepth = parenDepth;
  
  for (let j = 0; j < l.length; j++) {
    const ch = l[j], nx = l[j+1]||'';
    if (inBC) { if(ch==='*'&&nx==='/'){inBC=false;j++;} continue; }
    if (inStr) { if(ch==='\\'){j++;continue;} if(ch===strCh)inStr=false; continue; }
    if (ch==='/'&&nx==='/') break;
    if (ch==='/'&&nx==='*') { inBC=true;j++; continue; }
    if (ch==='\''||ch==='"'||ch==='`') { inStr=true;strCh=ch; continue; }
    if (ch==='(') parenDepth++;
    if (ch===')') parenDepth--;
  }
  
  const delta = parenDepth - startDepth;
  
  // Print lines where depth returns to low levels (structural boundaries)
  // Only print when delta != 0 and depth <= 4 (close to structural level)
  if (delta !== 0 && (parenDepth <= 3 || startDepth <= 3)) {
    const trimmed = lines[i].trim().substring(0, 90);
    console.log('L' + (i+1) + ': depth ' + startDepth + '->' + parenDepth + ' (d=' + (delta >= 0 ? '+' : '') + delta + ')  ' + trimmed);
  }
  
  if (parenDepth < minDepth) {
    minDepth = parenDepth;
    minDepthLine = i + 1;
  }
}

console.log('\nFinal depth: ' + parenDepth);
console.log('Min depth reached: ' + minDepth + ' at line ' + minDepthLine);
