// Audit actual accordion/collapsible toggle patterns to understand code structure
const fs = require('fs');
const path = require('path');
const root = __dirname;

// Sample a few files with high accordion counts to understand patterns
const targets = [
  'behavior_lens_module.js',
  'stem_lab\\stem_tool_circuit.js',
  'sel_hub\\sel_tool_social.js',
  'sel_hub\\sel_tool_safety.js',
  'stem_lab\\stem_tool_aquarium.js',
];

for (const rel of targets) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  const code = fs.readFileSync(file, 'utf-8');
  const lines = code.split('\n');
  
  console.log(`\n=== ${rel} ===`);
  
  // Find toggle patterns: setExpanded, setOpen, toggle, collapsed
  let shown = 0;
  for (let i = 0; i < lines.length && shown < 8; i++) {
    const line = lines[i];
    if (line.match(/set(Expanded|Open|Collapsed|Show)|toggle.*\(/i) && line.includes('!')) {
      console.log(`  L${i+1}: ${line.trim().substring(0, 150)}`);
      shown++;
    }
  }
  
  // Find collapsible div rendering patterns
  shown = 0;
  for (let i = 0; i < lines.length && shown < 6; i++) {
    const line = lines[i];
    // Look for conditional rendering based on expanded/open/collapsed state
    if (line.match(/(expanded|isOpen|collapsed|showDetail|isCollapsed)\s*[?&|]/) && (line.includes("h('div'") || line.includes("h('section'") || line.includes('createElement'))) {
      console.log(`  RENDER L${i+1}: ${line.trim().substring(0, 150)}`);
      shown++;
    }
  }
  
  // Check for existing aria-expanded
  const hasExpanded = code.includes('aria-expanded');
  console.log(`  Has aria-expanded: ${hasExpanded}`);
}
