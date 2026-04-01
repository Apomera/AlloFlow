// Find .map() tab rendering patterns — the most common pattern for tab UIs
// Looking for: [tabs].map(t => h('div/button', { onClick: setTab(t) }))
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

for (const file of files) {
  const code = fs.readFileSync(file, 'utf-8');
  const rel = path.relative(root, file);
  if (rel === 'help_strings.js' || rel === 'ui_strings.js') continue;
  if (code.includes("role: 'tablist'") || code.includes('role: "tablist"')) continue;
  
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Pattern: .map( ... setTab OR setActiveTab 
    if (line.includes('.map(') && (line.includes('setTab') || line.includes('setActiveTab'))) {
      // Look backwards for the container
      for (let j = i; j >= Math.max(0, i - 5); j--) {
        if (lines[j].includes("h('div', {") || lines[j].includes('createElement("div"')) {
          console.log(`${rel}:${j+1}: ${lines[j].trim().substring(0, 120)}`);
          break;
        }
      }
    }
  }
}
