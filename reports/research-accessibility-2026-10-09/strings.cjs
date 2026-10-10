const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const delta = {
  research_transcript_results: '{count} matching excerpts. Page {page} of {pages}.',
  research_clip_format: 'Time in seconds, minutes:seconds, or hours:minutes:seconds.',
  research_paste_disclosure: 'Paste text',
  research_cancelled: 'Research cancelled.'
};
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const filename = path.join(root, file), catalog = JSON.parse(fs.readFileSync(filename, 'utf8'));
  Object.assign(catalog.input, delta);
  fs.writeFileSync(filename, JSON.stringify(catalog, null, 2) + '\n');
}
fs.writeFileSync(path.join(__dirname, 'ui-strings.delta.json'), JSON.stringify({ input: delta }, null, 2) + '\n');
console.log('Registered four English accessibility labels.');
