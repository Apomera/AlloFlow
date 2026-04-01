// PHASE C: aria-expanded for toggle/collapsible buttons
// Find onClick handlers that toggle a boolean state and add aria-expanded
// Also handles tabs that lack tablist/tab/tabpanel roles

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

let totalExpanded = 0;
const fileStats = [];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf-8');
  const rel = path.relative(root, file);
  if (rel === 'help_strings.js' || rel === 'ui_strings.js') continue;
  if (code.includes('aria-expanded')) continue; // Already has some
  
  let fixes = 0;
  
  // Pattern 1: onClick: () => setExpanded(!expanded) — add aria-expanded: String(expanded)
  // We need to find the h('div/button/span', { ... onClick: () => setX(!x) ... }) pattern
  // and inject 'aria-expanded': String(x) into the props
  
  // Strategy: Find lines with toggle patterns and add aria-expanded
  // These patterns are: setShowX(!showX), setExpanded(!expanded), setOpen(!open), setIsOpen(!isOpen)
  // toggle(!collapsed), etc.
  
  const togglePattern = /onClick:\s*(?:\(\)\s*=>|function\s*\(\)\s*\{)\s*(?:return\s+)?set(Show\w+|Expanded|Open|IsOpen|Collapsed|Is\w+)\((?:!|\w+\s*=>\s*!)\s*(\w+)\)/g;
  
  let match;
  const lines = code.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Find toggle onClick handlers  
    const toggleRe = /onClick:\s*(?:\(\)\s*=>|function\s*\(\)\s*\{)\s*(?:return\s+)?set\w+\((?:!|\w+\s*=>\s*!)\s*(\w+)\)/;
    const m = line.match(toggleRe);
    
    if (m && !line.includes('aria-expanded')) {
      const stateVar = m[1];
      
      // Verify this is a collapsible toggle (not a checkbox or form toggle)
      // Check surrounding context for rendering pattern: stateVar && h('div'...)
      let isCollapsible = false;
      for (let j = i; j < Math.min(i + 30, lines.length); j++) {
        if (lines[j].includes(stateVar + ' &&') || lines[j].includes(stateVar + '&&') || 
            lines[j].includes(stateVar + ' ?') || lines[j].includes(stateVar + '?')) {
          isCollapsible = true;
          break;
        }
      }
      // Also check backwards
      for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
        if (lines[j].includes(stateVar + ' &&') || lines[j].includes(stateVar + '&&')) {
          isCollapsible = true;
          break;
        }
      }
      
      if (!isCollapsible) continue;
      
      // Add aria-expanded to the element's props
      // Find the h('xxx', { that contains this onClick
      // Look backwards from this line for the element opening
      let injectedOnLine = false;
      
      // Check if onClick is on the same line as h('div/button/span', {
      if (line.includes("h('div', {") || line.includes("h('button', {") || line.includes("h('span', {")) {
        // Add aria-expanded right after the opening {
        lines[i] = line.replace(/(h\('(?:div|button|span)',\s*\{)/, `$1 'aria-expanded': String(${stateVar}),`);
        injectedOnLine = true;
        fixes++;
      } else if (line.includes('createElement("div", {') || line.includes('createElement("button", {') || line.includes('createElement("span", {')) {
        lines[i] = line.replace(/(createElement\("(?:div|button|span)",\s*\{)/, `$1 "aria-expanded": String(${stateVar}),`);
        injectedOnLine = true;
        fixes++;
      }
      
      // If onClick is on its own line, look backwards for the element
      if (!injectedOnLine) {
        for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
          if (lines[j].includes("h('div', {") || lines[j].includes("h('button', {") || lines[j].includes("h('span', {")) {
            if (!lines[j].includes('aria-expanded')) {
              lines[j] = lines[j].replace(/(h\('(?:div|button|span)',\s*\{)/, `$1 'aria-expanded': String(${stateVar}),`);
              fixes++;
              break;
            }
          } else if (lines[j].includes('createElement("div", {') || lines[j].includes('createElement("button", {')) {
            if (!lines[j].includes('aria-expanded')) {
              lines[j] = lines[j].replace(/(createElement\("(?:div|button)",\s*\{)/, `$1 "aria-expanded": String(${stateVar}),`);
              fixes++;
              break;
            }
          }
        }
      }
    }
  }
  
  if (fixes > 0) {
    fs.writeFileSync(file, lines.join('\n'), 'utf-8');
    fileStats.push({ file: rel, count: fixes });
    totalExpanded += fixes;
  }
}

console.log(`Total aria-expanded injections: ${totalExpanded}`);
fileStats.sort((a, b) => b.count - a.count);
for (const { file, count } of fileStats) console.log(`  ${file}: ${count}`);

// Syntax check
const { execSync } = require('child_process');
let errors = 0;
const errFiles = [];
for (const { file } of fileStats) {
  const full = path.join(root, file);
  try { execSync(`node -c "${full}"`, { stdio: 'pipe' }); }
  catch (e) { errors++; errFiles.push(file); }
}
if (errFiles.length > 0) {
  console.log('\nSYNTAX ERRORS:');
  errFiles.forEach(f => console.log(`  ${f}`));
}
console.log(`\nSyntax: ${fileStats.length - errors}/${fileStats.length} valid`);
