// Audit for aria-live regions and complex widget ARIA patterns
const fs = require('fs');
const path = require('path');
const root = __dirname;
const files = [];
function walk(d) {
  fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const f = path.join(d, e.name);
    if (e.isDirectory()) {
      if (!['node_modules', 'prismflow-deploy', '.git', '.gemini', '.agent', '_archive', 'src', 'a11y-audit'].includes(e.name)) walk(f);
    } else if ((e.name.endsWith('.js') || e.name === 'AlloFlowANTI.txt') && !e.name.startsWith('_') && !e.name.startsWith('build')) {
      files.push(f);
    }
  });
}
walk(root);

// ════════════════════════════════════════════════
// 1. ARIA-LIVE AUDIT
// ════════════════════════════════════════════════
console.log('=== ARIA-LIVE AUDIT ===\n');

// Already has aria-live
let hasLive = 0;
const liveFiles = {};
for (const file of files) {
  const code = fs.readFileSync(file, 'utf-8');
  const rel = path.relative(root, file);
  const count = (code.match(/aria-live/g) || []).length;
  if (count > 0) { liveFiles[rel] = count; hasLive += count; }
}
console.log(`Existing aria-live regions: ${hasLive}`);
for (const [f, c] of Object.entries(liveFiles)) console.log(`  ✓ ${f}: ${c}`);

// Dynamic content patterns that NEED aria-live:
console.log('\n--- Patterns needing aria-live ---\n');

const needsLive = {};
for (const file of files) {
  const code = fs.readFileSync(file, 'utf-8');
  const rel = path.relative(root, file);
  const patterns = [];
  
  // 1. Loading/spinner patterns
  const loading = (code.match(/loading|Loading|isLoading|setLoading|spinner|Spinner/g) || []).length;
  if (loading > 2) patterns.push(`loading states: ${loading}`);
  
  // 2. Toast/notification patterns
  const toast = (code.match(/toast|Toast|notification|snackbar|Snackbar|showMessage|showSuccess|showError/g) || []).length;
  if (toast > 0) patterns.push(`toasts/notifications: ${toast}`);
  
  // 3. Live score/timer/counter
  const counter = (code.match(/score|Score|timer|Timer|countdown|progress|Progress/g) || []).length;
  if (counter > 5) patterns.push(`scores/timers: ${counter}`);
  
  // 4. Status messages
  const status = (code.match(/status|Status|statusMessage|feedback|Feedback|result|Result/g) || []).length;
  if (status > 3) patterns.push(`status/results: ${status}`);
  
  // 5. AI response/streaming
  const ai = (code.match(/aiResponse|streaming|streamResponse|aiGenerat|generating/g) || []).length;
  if (ai > 0) patterns.push(`AI responses: ${ai}`);
  
  // Check if file already has aria-live
  const alreadyHas = code.includes('aria-live');
  
  if (patterns.length > 0) {
    needsLive[rel] = { patterns, alreadyHas };
  }
}

const sorted = Object.entries(needsLive).sort((a, b) => b[1].patterns.length - a[1].patterns.length);
for (const [f, { patterns, alreadyHas }] of sorted) {
  const status = alreadyHas ? '(has some aria-live)' : '(NO aria-live)';
  console.log(`  ${f} ${status}`);
  patterns.forEach(p => console.log(`    - ${p}`));
}

// ════════════════════════════════════════════════
// 2. COMPLEX WIDGET ARIA PATTERNS
// ════════════════════════════════════════════════
console.log('\n=== COMPLEX WIDGET AUDIT ===\n');

const widgetPatterns = {};
for (const file of files) {
  const code = fs.readFileSync(file, 'utf-8');
  const rel = path.relative(root, file);
  const widgets = [];
  
  // 1. Tab panels (need role="tablist", role="tab", role="tabpanel")
  const tabs = (code.match(/setTab|setActiveTab|activeTab|selectedTab|tabIndex|tab === |tab==/g) || []).length;
  const hasTabRole = code.includes("role: 'tablist'") || code.includes('role: "tablist"') || code.includes("role: 'tab'");
  if (tabs > 3 && !hasTabRole) widgets.push(`tabs: ${tabs} refs, missing tablist/tab roles`);
  
  // 2. Accordions / collapsibles (need aria-expanded)
  const accord = (code.match(/expanded|collapsed|isOpen|setOpen|toggle|accordion/gi) || []).length;
  const hasExpanded = code.includes('aria-expanded');
  if (accord > 3 && !hasExpanded) widgets.push(`accordion/collapsible: ${accord} refs, missing aria-expanded`);
  
  // 3. Dropdown menus (need role="menu", role="menuitem")
  const dropdowns = (code.match(/dropdown|Dropdown|showMenu|menuOpen|isMenuOpen/g) || []).length;
  const hasMenuRole = code.includes("role: 'menu'") || code.includes('role: "menu"');
  if (dropdowns > 1 && !hasMenuRole) widgets.push(`dropdown: ${dropdowns} refs, missing role="menu"`);
  
  // 4. Tree views
  const tree = (code.match(/treeView|TreeView|expandNode|collapseNode|treeNode/g) || []).length;
  if (tree > 0) widgets.push(`tree view: ${tree} refs`);
  
  // 5. Progress bars (need role="progressbar", aria-valuenow)
  const progress = (code.match(/progressBar|ProgressBar|progress-bar|w-\[.*%\]|width:.*%/g) || []).length;
  const hasProgressRole = code.includes("role: 'progressbar'") || code.includes('role: "progressbar"');
  if (progress > 2 && !hasProgressRole) widgets.push(`progress bars: ${progress} refs, missing role="progressbar"`);
  
  // 6. Sliders (need role="slider")
  const sliders = (code.match(/range|slider|Slider/g) || []).length;
  const hasSliderInput = code.includes("type: 'range'") || code.includes('type: "range"') || code.includes("type='range'");
  if (sliders > 2 && !hasSliderInput) widgets.push(`sliders: ${sliders} refs`);
  
  // 7. Dialogs/modals (need role="dialog", aria-modal)
  const dialogs = (code.match(/modal|Modal|dialog|Dialog/gi) || []).length;
  const hasDialogRole = code.includes("role: 'dialog'") || code.includes('role: "dialog"');
  if (dialogs > 2 && !hasDialogRole) widgets.push(`modals: ${dialogs} refs, missing role="dialog"`);
  
  // Check what's already present
  const existingRoles = [];
  if (code.includes("role: 'tablist'") || code.includes('role: "tablist"')) existingRoles.push('tablist');
  if (hasExpanded) existingRoles.push('aria-expanded');
  if (hasMenuRole) existingRoles.push('menu');
  if (hasProgressRole) existingRoles.push('progressbar');
  if (hasDialogRole) existingRoles.push('dialog');
  
  if (widgets.length > 0) {
    widgetPatterns[rel] = { widgets, existingRoles };
  }
}

const sorted2 = Object.entries(widgetPatterns).sort((a, b) => b[1].widgets.length - a[1].widgets.length);
for (const [f, { widgets, existingRoles }] of sorted2) {
  const existing = existingRoles.length > 0 ? ` [has: ${existingRoles.join(', ')}]` : '';
  console.log(`  ${f}${existing}`);
  widgets.forEach(w => console.log(`    - ${w}`));
}
