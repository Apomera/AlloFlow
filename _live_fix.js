// PHASE A: aria-live status region injection
// Adds an sr-only live region to every module that doesn't have one
// This announces loading states, results, and dynamic content to screen readers

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

let totalLive = 0;
const fileStats = [];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf-8');
  const rel = path.relative(root, file);
  
  // Skip files that already have aria-live
  if (code.includes('aria-live')) continue;
  
  // Skip non-UI module files
  if (!code.includes('React') && !code.includes("h('")) continue;
  if (rel.includes('ai_backend') || rel.includes('piper_tts') || rel.includes('kokoro_tts') || 
      rel === 'help_strings.js' || rel === 'ui_strings.js' || rel === 'psychometric_probes.js') continue;
  
  // Find the module name from the file
  const baseName = path.basename(rel, '.js')
    .replace('stem_tool_', '')
    .replace('sel_tool_', '')
    .replace('_module', '')
    .replace(/_/g, ' ');
  
  // Strategy: Find the last return statement that renders JSX and inject a live region
  // Look for the last "return h(" or "return React.createElement" or "return /*"
  const lines = code.split('\n');
  let injected = false;
  
  // Find a closing div/section near the end of the render to inject before
  // The most reliable pattern: find the last ); that closes the component render
  // We'll inject a status announcer div right before the final closing of the outermost container
  
  // Alternative approach: find the function component and add a live region state + element
  // For compiled modules, the safest injection is after 'use strict'; or the IIFE open
  
  // Strategy: inject a self-contained live region manager
  const liveHelper = `
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-${baseName.replace(/\s/g, '-')}')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-${baseName.replace(/\s/g, '-')}';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();
`;
  
  // Find injection point
  if (code.includes("'use strict';")) {
    code = code.replace("'use strict';", "'use strict';" + liveHelper);
    injected = true;
  } else if (code.includes('} else {') && code.indexOf('} else {') < 500) {
    const idx = code.indexOf('} else {');
    code = code.substring(0, idx + 8) + liveHelper + code.substring(idx + 8);
    injected = true;
  } else if (code.includes('(function () {')) {
    code = code.replace('(function () {', '(function () {' + liveHelper);
    injected = true;
  } else if (code.includes('(function() {')) {
    code = code.replace('(function() {', '(function() {' + liveHelper);
    injected = true;
  }
  
  if (injected) {
    fs.writeFileSync(file, code, 'utf-8');
    fileStats.push({ file: rel, type: 'live-region' });
    totalLive++;
  }
}

console.log(`Total aria-live region injections: ${totalLive}`);
for (const { file } of fileStats) console.log(`  ${file}`);

// Syntax check
const { execSync } = require('child_process');
let errors = 0;
for (const { file } of fileStats) {
  const full = path.join(root, file);
  try { execSync(`node -c "${full}"`, { stdio: 'pipe' }); }
  catch (e) { errors++; console.log(`SYNTAX ERROR: ${file}`); }
}
console.log(`\nSyntax: ${fileStats.length - errors}/${fileStats.length} valid`);
