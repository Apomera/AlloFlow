const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const delta = { input: {
  research_link_only_one: '{count} source link needs readable text.',
  research_link_only_many: '{count} source links need readable text.',
  research_duplicate_count: 'Already in collection: {count}.',
  research_removed_count: 'Passages from removed sources: {count}.',
  research_collection_full: 'Collection limit reached (24 passages).',
  research_source_full: 'Source limit reached (4 passages per source).',
  research_invalid_count: 'Unusable source entries: {count}.',
  research_draft_kept: 'Your pasted text has been kept.'
} };
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const name = path.join(root, file), catalog = JSON.parse(fs.readFileSync(name, 'utf8'));
  Object.assign(catalog.input, delta.input);
  fs.writeFileSync(name, JSON.stringify(catalog, null, 2) + '\n');
}
fs.writeFileSync(path.join(__dirname, 'ui-strings.delta.json'), JSON.stringify(delta, null, 2) + '\n');
console.log('Registered eight collection outcome labels.');
