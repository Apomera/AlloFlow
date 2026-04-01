// PHASE B: Complex widget ARIA patterns
// 1. role="dialog" + aria-modal on modal overlays (position:fixed or modal backgrounds)
// 2. role="progressbar" + aria-valuenow on progress bars (width % patterns)

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

let totalDialog = 0, totalProgress = 0;
const fileStats = [];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf-8');
  const rel = path.relative(root, file);
  let dialogFixes = 0, progressFixes = 0;
  
  // Skip string-only files
  if (rel === 'help_strings.js' || rel === 'ui_strings.js') continue;
  
  // ─── FIX 1: Modal dialogs ───
  // Pattern: h('div', { className: '...fixed...', ... }) — modal overlays
  // Add role: 'dialog', 'aria-modal': 'true' after the opening {
  
  // h() pattern: fixed inset overlay divs
  code = code.replace(
    /h\('div',\s*\{(\s*(?:className:\s*['"][^'"]*(?:fixed\s+inset|fixed inset|overlay|modal-backdrop)[^'"]*['"]))/gi,
    (match, afterBrace) => {
      if (match.includes("role: 'dialog'") || match.includes('role: "dialog"')) return match;
      dialogFixes++;
      return match.replace("h('div', {", "h('div', { role: 'dialog', 'aria-modal': 'true',");
    }
  );
  
  // React.createElement pattern for modal containers
  code = code.replace(
    /React\.createElement\("div",\s*\{(\s*(?:className:\s*"[^"]*(?:fixed\s+inset|fixed inset|overlay|modal-backdrop)[^"]*"))/gi,
    (match, afterBrace) => {
      if (match.includes('role: "dialog"') || match.includes("role: 'dialog'")) return match;
      dialogFixes++;
      return match.replace('React.createElement("div", {', 'React.createElement("div", { role: "dialog", "aria-modal": "true",');
    }
  );
  
  // ─── FIX 2: Progress bars ───
  // Pattern: div with style width as percentage (progress indicators)
  // h('div', { className: '...bg-...', style: { width: X + '%' } })
  // h('div', { className: '...bg-...', style: { width: `${X}%` } })
  
  // h() pattern with style width percentage
  code = code.replace(
    /h\('div',\s*\{([^}]*?)style:\s*\{([^}]*?)width:\s*(?:['"`]?\d+%['"`]?|[a-zA-Z_]+\s*\+\s*['"]%['"]|`\$\{[^}]+\}%`)/g,
    (match, propsBeforeStyle, styleBeforeWidth) => {
      if (match.includes("role: 'progressbar'") || match.includes('role: "progressbar"')) return match;
      // Check if this looks like a progress bar (has bg- color class)
      if (!match.includes('bg-') && !match.includes('background')) return match;
      // Don't add to grid layouts or containers
      if (match.includes('grid') || match.includes('flex-wrap') || match.includes('overflow')) return match;
      progressFixes++;
      return match.replace("h('div', {", "h('div', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100',");
    }
  );
  
  // React.createElement pattern with inline style width %
  code = code.replace(
    /React\.createElement\("div",\s*\{([^}]*?)style:\s*\{([^}]*?)width:\s*(?:["'`]?\d+%["'`]?|[a-zA-Z_]+\s*\+\s*["']%["']|`\$\{[^}]+\}%`)/g,
    (match, propsBeforeStyle, styleBeforeWidth) => {
      if (match.includes('role: "progressbar"') || match.includes("role: 'progressbar'")) return match;
      if (!match.includes('bg-') && !match.includes('background')) return match;
      if (match.includes('grid') || match.includes('flex-wrap') || match.includes('overflow')) return match;
      progressFixes++;
      return match.replace('React.createElement("div", {', 'React.createElement("div", { role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100",');
    }
  );
  
  if (dialogFixes > 0 || progressFixes > 0) {
    fs.writeFileSync(file, code, 'utf-8');
    fileStats.push({ file: rel, dialogs: dialogFixes, progress: progressFixes });
    totalDialog += dialogFixes;
    totalProgress += progressFixes;
  }
}

console.log(`Dialog role fixes: ${totalDialog}`);
console.log(`Progressbar role fixes: ${totalProgress}`);
console.log(`Total fixes: ${totalDialog + totalProgress}\n`);

fileStats.sort((a, b) => (b.dialogs + b.progress) - (a.dialogs + a.progress));
for (const { file, dialogs, progress } of fileStats) {
  const parts = [];
  if (dialogs > 0) parts.push(`${dialogs} dialog`);
  if (progress > 0) parts.push(`${progress} progressbar`);
  console.log(`  ${file}: ${parts.join(', ')}`);
}

// Syntax check
const { execSync } = require('child_process');
let errors = 0;
for (const { file } of fileStats) {
  const full = path.join(root, file);
  try { execSync(`node -c "${full}"`, { stdio: 'pipe' }); }
  catch (e) { errors++; console.log(`SYNTAX ERROR: ${file}`); }
}
console.log(`\nSyntax: ${fileStats.length - errors}/${fileStats.length} valid`);
