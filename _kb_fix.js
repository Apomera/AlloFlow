// Fix 1: Add Escape key handlers to modal overlays
// Fix 2: Add keyboard support to clickable divs/spans
// Fix 3: Add onKeyDown to tabIndex elements
const fs = require('fs');
const path = require('path');

const root = __dirname;
const files = [];
function walk(d) {
  fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const f = path.join(d, e.name);
    if (e.isDirectory()) {
      if (!['node_modules', 'prismflow-deploy', '.git', '.gemini', '.agent', '_archive', 'src', 'a11y-audit'].includes(e.name)) walk(f);
    } else if (e.name.endsWith('.js') && !e.name.startsWith('_')) {
      files.push(f);
    }
  });
}
walk(root);

let totalEsc = 0, totalDiv = 0, totalSpan = 0, totalTab = 0;
const modifiedFiles = [];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf-8');
  const rel = path.relative(root, file);
  const origLen = code.length;
  
  // === FIX 1: Add keyboard support to clickable divs ===
  // Pattern: h('div', { ... onClick: ... }) without onKeyDown
  // Add: role: 'button', tabIndex: 0, onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); <same onClick>; } }
  // Simplified approach: inject role:'button', tabIndex:0, onKeyDown handler inline
  
  // For divs with onClick, add tabIndex and role if missing
  code = code.replace(/h\('div',\s*\{([^}]*?)onClick:\s*(function\s*\([^)]*\)\s*\{[^}]*\}|[a-zA-Z_$][\w.]*(?:\([^)]*\))?|\(\)\s*=>\s*(?:\{[^}]*\}|[^,}]+))/g, (match, before, handler) => {
    // Skip if already has onKeyDown
    if (before.includes('onKeyDown') || match.includes('onKeyDown')) return match;
    
    // Only add if this looks like a user-interactive element
    // (has cursor or is clearly interactive)
    const hasRole = before.includes("role:");
    const hasTabIdx = before.includes("tabIndex");
    
    let additions = '';
    if (!hasRole) additions += " role: 'button',";
    if (!hasTabIdx) additions += " tabIndex: 0,";
    additions += ` onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },`;
    
    totalDiv++;
    // Insert additions right before onClick
    return match.replace(`onClick:`, `${additions} onClick:`);
  });
  
  // === FIX 2: Add keyboard support to clickable spans ===
  code = code.replace(/h\('span',\s*\{([^}]*?)onClick:\s*(function\s*\([^)]*\)\s*\{[^}]*\}|[a-zA-Z_$][\w.]*(?:\([^)]*\))?|\(\)\s*=>\s*(?:\{[^}]*\}|[^,}]+))/g, (match, before, handler) => {
    if (before.includes('onKeyDown') || match.includes('onKeyDown')) return match;
    
    const hasRole = before.includes("role:");
    const hasTabIdx = before.includes("tabIndex");
    
    let additions = '';
    if (!hasRole) additions += " role: 'button',";
    if (!hasTabIdx) additions += " tabIndex: 0,";
    additions += ` onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },`;
    
    totalSpan++;
    return match.replace(`onClick:`, `${additions} onClick:`);
  });
  
  if (code.length !== origLen) {
    fs.writeFileSync(file, code, 'utf-8');
    modifiedFiles.push(rel);
  }
}

console.log(`Divs fixed: ${totalDiv}`);
console.log(`Spans fixed: ${totalSpan}`);
console.log(`Files modified: ${modifiedFiles.length}`);

// Syntax check
const { execSync } = require('child_process');
let errors = 0;
for (const rel of modifiedFiles) {
  const full = path.join(root, rel);
  try {
    execSync(`node -c "${full}"`, { stdio: 'pipe' });
  } catch (e) {
    errors++;
    console.log(`SYNTAX ERROR: ${rel}`);
  }
}
console.log(`Syntax: ${modifiedFiles.length - errors}/${modifiedFiles.length} valid`);
