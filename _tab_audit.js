// Audit tab patterns to understand the DOM structure for tablist injection
const fs = require('fs');
const path = require('path');
const root = __dirname;

// Check a couple representative modules for tab rendering patterns
const targets = [
  'stem_lab\\stem_tool_circuit.js',
  'sel_hub\\sel_tool_goals.js',
  'report_writer_module.js',
];

for (const rel of targets) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  const code = fs.readFileSync(file, 'utf-8');
  const lines = code.split('\n');
  
  console.log(`\n=== ${rel} ===`);
  console.log(`  Has tablist: ${code.includes("role: 'tablist'") || code.includes('role: "tablist"')}`);
  console.log(`  Has tab role: ${code.includes("role: 'tab'") || code.includes('role: "tab"')}`);
  
  // Find tab button patterns: onClick: () => setTab(...), className includes 'tab === '
  let shown = 0;
  for (let i = 0; i < lines.length && shown < 10; i++) {
    const line = lines[i];
    if ((line.includes('setTab(') || line.includes('setActiveTab(') || line.includes('selectedTab')) && 
        (line.includes("h('div'") || line.includes("h('button'") || line.includes('createElement'))) {
      console.log(`  TAB L${i+1}: ${line.trim().substring(0, 180)}`);
      shown++;
    }
  }
  
  // Find the tab container — usually a flex row with multiple tab buttons
  shown = 0;
  for (let i = 0; i < lines.length && shown < 5; i++) {
    const line = lines[i];
    if ((line.includes('flex') || line.includes('gap')) && 
        (line.includes("tab") || line.includes("Tab")) &&
        (line.includes("h('div', {") || line.includes('createElement("div"'))) {
      console.log(`  CONTAINER L${i+1}: ${line.trim().substring(0, 180)}`);
      shown++;
    }
  }
}
