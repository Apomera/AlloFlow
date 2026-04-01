// Find tab container divs — look for multiple consecutive setTab calls within a flex container
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

let totalTablist = 0, totalTabItems = 0;
const fileStats = [];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf-8');
  const rel = path.relative(root, file);
  if (rel === 'help_strings.js' || rel === 'ui_strings.js') continue;
  
  // Look for divs that contain multiple setTab/setActiveTab calls
  // These are tab bar containers
  const lines = code.split('\n');
  let fixes = 0, tabItemFixes = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Find a line that starts a div and has "flex" + multiple setTab calls on same line
    // Common pattern: h('div', { className: 'flex ...' }, h('button', { onClick: ()=>setTab('a')}, 'A'), h('button', {onClick: ()=>setTab('b')}, 'B'))
    
    if ((line.includes("h('div', {") || line.includes('React.createElement("div", {')) && 
        (line.includes('flex') || line.includes('gap')) &&
        !line.includes("role: 'tablist'") && !line.includes('role: "tablist"')) {
      
      // Count setTab calls on this line and next few lines
      let tabCalls = 0;
      const searchRange = line.length > 500 ? line : lines.slice(i, Math.min(i + 5, lines.length)).join('\n');
      tabCalls = (searchRange.match(/setTab|setActiveTab|set\w*Tab/g) || []).length;
      
      if (tabCalls >= 2) {
        // This is a tab bar! Add role="tablist"
        if (line.includes("h('div', {")) {
          lines[i] = line.replace("h('div', {", "h('div', { role: 'tablist',");
          fixes++;
        } else if (line.includes('React.createElement("div", {')) {
          lines[i] = line.replace('React.createElement("div", {', 'React.createElement("div", { role: "tablist",');
          fixes++;
        }
      }
    }
    
    // Also upgrade individual tab buttons: onClick: () => setTab('xxx') → add role: 'tab'
    // For h('button') or h('div') with setTab onClick
    if ((line.includes("h('div', {") || line.includes("h('button', {") || line.includes("h('span', {")) &&
        (line.includes('setTab(') || line.includes('setActiveTab(')) &&
        !line.includes("role: 'tab'") && !line.includes('role: "tab"') &&
        !line.includes("role: 'tablist'")) {
      
      // Extract the tab value to determine aria-selected
      const tabValMatch = line.match(/set(?:Active)?Tab\(['"](\w+)['"]\)/);
      const tabStateMatch = line.match(/(?:tab|activeTab)\s*===?\s*['"](\w+)['"]/);
      
      if (tabValMatch || tabStateMatch) {
        const tag = line.includes("h('div', {") ? 'div' : line.includes("h('button', {") ? 'button' : 'span';
        lines[i] = line.replace(`h('${tag}', {`, `h('${tag}', { role: 'tab',`);
        tabItemFixes++;
      }
    }
    
    // React.createElement pattern for tab items
    if ((line.includes('React.createElement("div", {') || line.includes('React.createElement("button", {')) &&
        (line.includes('setTab(') || line.includes('setActiveTab(')) &&
        !line.includes('role: "tab"') && !line.includes("role: 'tab'") &&
        !line.includes('role: "tablist"')) {
      
      const tag = line.includes('React.createElement("div", {') ? 'div' : 'button';
      lines[i] = line.replace(`React.createElement("${tag}", {`, `React.createElement("${tag}", { role: "tab",`);
      tabItemFixes++;
    }
  }
  
  if (fixes > 0 || tabItemFixes > 0) {
    fs.writeFileSync(file, lines.join('\n'), 'utf-8');
    fileStats.push({ file: rel, tablists: fixes, tabs: tabItemFixes });
    totalTablist += fixes;
    totalTabItems += tabItemFixes;
  }
}

console.log(`Tablist role injections: ${totalTablist}`);
console.log(`Tab role injections: ${totalTabItems}`);
console.log(`Total: ${totalTablist + totalTabItems}\n`);

fileStats.sort((a, b) => (b.tablists + b.tabs) - (a.tablists + a.tabs));
for (const { file, tablists, tabs } of fileStats) {
  const parts = [];
  if (tablists > 0) parts.push(`${tablists} tablist`);
  if (tabs > 0) parts.push(`${tabs} tab`);
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
