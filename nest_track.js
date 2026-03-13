// Precise bracket-tracking parser that handles strings and comments
const fs = require('fs');
const file = process.argv[2];
const targetLine = parseInt(process.argv[3]) - 1; // 0-indexed
const rangeBack = parseInt(process.argv[4] || '100');
const code = fs.readFileSync(file, 'utf8');
const lines = code.split('\n');

const results = [];
let paren = 0, brace = 0, bracket = 0;
let inString = false, stringChar = '', escaped = false;
let inLineComment = false, inBlockComment = false;

// Parse from beginning up to target area  
const startLine = Math.max(0, targetLine - rangeBack);

// First count from line 0 to startLine
for (let i = 0; i < startLine; i++) {
  const l = lines[i];
  for (let j = 0; j < l.length; j++) {
    const c = l[j];
    const next = j + 1 < l.length ? l[j + 1] : '';
    
    if (escaped) { escaped = false; continue; }
    if (c === '\\' && inString) { escaped = true; continue; }
    
    if (inBlockComment) {
      if (c === '*' && next === '/') { inBlockComment = false; j++; }
      continue;
    }
    if (inLineComment) continue;
    
    if (inString) {
      if (c === stringChar) inString = false;
      continue;
    }
    
    if (c === '/' && next === '/') { inLineComment = true; continue; }
    if (c === '/' && next === '*') { inBlockComment = true; j++; continue; }
    if (c === '\'' || c === '"' || c === '`') { inString = true; stringChar = c; continue; }
    
    if (c === '(') paren++;
    if (c === ')') paren--;
    if (c === '{') brace++;
    if (c === '}') brace--;
    if (c === '[') bracket++;
    if (c === ']') bracket--;
  }
  inLineComment = false;
}

results.push('State at line ' + (startLine + 1) + ': p=' + paren + ' b=' + brace + ' br=' + bracket);

// Now track each line in detail
for (let i = startLine; i <= Math.min(targetLine + 10, lines.length - 1); i++) {
  const l = lines[i];
  const sp = paren, sb = brace, sbr = bracket;
  
  for (let j = 0; j < l.length; j++) {
    const c = l[j];
    const next = j + 1 < l.length ? l[j + 1] : '';
    
    if (escaped) { escaped = false; continue; }
    if (c === '\\' && inString) { escaped = true; continue; }
    
    if (inBlockComment) {
      if (c === '*' && next === '/') { inBlockComment = false; j++; }
      continue;
    }
    if (inLineComment) continue;
    
    if (inString) {
      if (c === stringChar) inString = false;
      continue;
    }
    
    if (c === '/' && next === '/') { inLineComment = true; continue; }
    if (c === '/' && next === '*') { inBlockComment = true; j++; continue; }
    if (c === '\'' || c === '"' || c === '`') { inString = true; stringChar = c; continue; }
    
    if (c === '(') paren++;
    if (c === ')') paren--;
    if (c === '{') brace++;
    if (c === '}') brace--;
    if (c === '[') bracket++;
    if (c === ']') bracket--;
  }
  inLineComment = false;
  
  const marker = i === targetLine ? '>>>' : '   ';
  const changes = [];
  if (paren !== sp) changes.push('p:' + sp + '>' + paren);
  if (brace !== sb) changes.push('b:' + sb + '>' + brace);
  if (bracket !== sbr) changes.push('br:' + sbr + '>' + bracket);
  
  results.push(marker + (i+1) + ': p=' + paren + ' b=' + brace + ' br=' + bracket + 
    (changes.length ? ' [' + changes.join(' ') + ']' : '') +
    ' | ' + l.trim().substring(0, 80));
}

const outFile = 'C:/tmp/' + file.replace('.js', '_nesting.txt');
fs.writeFileSync(outFile, results.join('\n'), 'utf8');
console.log('Done. Results in ' + outFile);
