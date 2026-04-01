// PHASE C2: Catch remaining collapsible patterns (broader search)
// Handles: set*(!*) patterns in createElement, and files with partial coverage

const fs = require('fs');
const path = require('path');
const root = __dirname;
const files = [];
function walk(d) {
  fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const f = path.join(d, e.name);
    if (e.isDirectory()) {
      if (!['node_modules', 'prismflow-deploy', '.git', '.gemini', '.agent', '_archive', 'src', 'a11y-audit'].includes(e.name)) walk(f);
    } else if (e.name.endsWith('.js') && !e.name.startsWith('_') && !e.name.startsWith('build')) {
      files.push(f);
    }
  });
}
walk(root);

let totalFixes = 0;
const fileStats = [];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf-8');
  const rel = path.relative(root, file);
  if (rel === 'help_strings.js' || rel === 'ui_strings.js') continue;
  
  let fixes = 0;
  const lines = code.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Pattern: onClick that toggles boolean state
    // But only if the line also has an h() or createElement call AND doesn't already have aria-expanded
    const toggleRe = /onClick:\s*(?:\(\)\s*=>|function\s*\(\)\s*\{)\s*(?:return\s+)?set(\w+)\((?:!|\w+\s*=>\s*!)\s*(\w+)\)/;
    const m = line.match(toggleRe);
    
    if (m && !line.includes('aria-expanded')) {
      const stateVar = m[2];
      
      // Check if this state var is used for conditional rendering (collapsible)
      let isCollapsible = false;
      for (let j = i + 1; j < Math.min(i + 40, lines.length); j++) {
        if (lines[j].includes(stateVar + ' &&') || lines[j].includes(stateVar + '&&') ||
            lines[j].includes(stateVar + ' ?') || lines[j].includes('!' + stateVar + ' &&') ||
            lines[j].includes('!' + stateVar + ' ?')) {
          isCollapsible = true;
          break;
        }
      }
      if (!isCollapsible) continue;
      
      // Find the nearest containing element props that doesn't already have aria-expanded
      // Look at same line first, then backward
      let done = false;
      
      // Same line
      if (!done && (line.includes("h('div', {") || line.includes("h('button', {") || line.includes("h('span', {"))) {
        if (!line.includes('aria-expanded')) {
          lines[i] = line.replace(/(h\('(?:div|button|span)',\s*\{)/, `$1 'aria-expanded': String(${stateVar}),`);
          fixes++;
          done = true;
        }
      }
      if (!done && (line.includes('React.createElement("div", {') || line.includes('React.createElement("button", {') || line.includes('React.createElement("span", {'))) {
        if (!line.includes('aria-expanded')) {
          lines[i] = line.replace(/(React\.createElement\("(?:div|button|span)",\s*\{)/, `$1 "aria-expanded": String(${stateVar}),`);
          fixes++;
          done = true;
        }
      }
      
      // Look backward
      if (!done) {
        for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
          if ((lines[j].includes("h('div', {") || lines[j].includes("h('button', {") || lines[j].includes("h('span', {")) && !lines[j].includes('aria-expanded')) {
            lines[j] = lines[j].replace(/(h\('(?:div|button|span)',\s*\{)/, `$1 'aria-expanded': String(${stateVar}),`);
            fixes++;
            done = true;
            break;
          }
          if ((lines[j].includes('createElement("div", {') || lines[j].includes('createElement("button", {')) && !lines[j].includes('aria-expanded')) {
            lines[j] = lines[j].replace(/(createElement\("(?:div|button)",\s*\{)/, `$1 "aria-expanded": String(${stateVar}),`);
            fixes++;
            done = true;
            break;
          }
        }
      }
    }
  }
  
  if (fixes > 0) {
    fs.writeFileSync(file, lines.join('\n'), 'utf-8');
    fileStats.push({ file: rel, count: fixes });
    totalFixes += fixes;
  }
}

console.log(`Additional aria-expanded injections: ${totalFixes}`);
fileStats.sort((a, b) => b.count - a.count);
for (const { file, count } of fileStats) console.log(`  ${file}: ${count}`);

// Syntax check
const { execSync } = require('child_process');
let errors = 0;
for (const { file } of fileStats) {
  const full = path.join(root, file);
  try { execSync(`node -c "${full}"`, { stdio: 'pipe' }); }
  catch (e) { errors++; console.log(`SYNTAX ERROR: ${file}`); }
}
console.log(`\nSyntax: ${fileStats.length - errors}/${fileStats.length} valid`);
