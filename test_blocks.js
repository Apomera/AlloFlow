const fs = require('fs');
const acorn = require('acorn');

const code = fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8');
const regex = /\(function _(\w+)\(\) \{/g;
let match;
const tools = [];

while ((match = regex.exec(code)) !== null) {
  tools.push({ name: match[1], start: match.index });
}

for (let i = 0; i < tools.length; i++) {
  const tool = tools[i];
  const end = (i + 1 < tools.length) ? tools[i+1].start : code.length;
  let block = code.substring(tool.start, end);
  
  // Close the block properly to test it
  // Usually it's `(function _X() { ... })(),`
  // We'll strip the trailing comma or parens and wrap it safely.
  block = block.trim().replace(/,\s*$/, '').replace(/\)\(\)$/, '');
  block = `const x = ${block});`; // wrap the function declaration
  
  try {
    acorn.parse(block, { ecmaVersion: 2020 });
  } catch(e) {
    console.log(`Tool ${tool.name} Failed: ${e.message}`);
    // If it fails, that's our culprit!
  }
}
console.log("Done checking individual tools.");
