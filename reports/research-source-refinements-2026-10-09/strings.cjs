const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const delta = { input: {
  research_include_passage: 'Include passage {number}',
  research_undo_limit: 'This source cannot be restored because the research collection is full.'
} };
for (const name of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const filename = path.join(root, name), catalog = JSON.parse(fs.readFileSync(filename, 'utf8'));
  catalog.input = { ...catalog.input, ...delta.input };
  fs.writeFileSync(filename, JSON.stringify(catalog, null, 2) + '\n');
}
fs.writeFileSync(path.join(__dirname, 'ui-strings.delta.json'), JSON.stringify(delta, null, 2) + '\n');
console.log('Registered two research iteration labels in both English catalogs.');
