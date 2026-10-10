const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const delta = { input: {
  research_added_one: 'Added {count} passage.',
  research_added_many: 'Added {count} passages.',
  research_no_additions: 'No new passages added.',
  research_paste_kept: 'No new passages added. Your pasted text has been kept.'
} };
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const name = path.join(root, file), catalog = JSON.parse(fs.readFileSync(name, 'utf8'));
  Object.assign(catalog.input, delta.input);
  fs.writeFileSync(name, JSON.stringify(catalog, null, 2) + '\n');
}
fs.writeFileSync(path.join(__dirname, 'ui-strings.delta.json'), JSON.stringify(delta, null, 2) + '\n');
console.log('Registered four research recovery labels.');
