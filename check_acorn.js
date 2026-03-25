const fs = require('fs');
const acorn = require('acorn');
const code = fs.readFileSync('src/stem_lab_module.js', 'utf8');

try {
  acorn.parse(code, { ecmaVersion: 2020 });
  console.log("No syntax errors found by acorn!?");
} catch (e) {
  console.error("Syntax Error found by acorn:");
  console.error(e.message);
  console.error("Line:", e.loc.line, "Column:", e.loc.column);
}
