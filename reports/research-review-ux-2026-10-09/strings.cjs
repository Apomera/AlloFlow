const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const delta = { input: {
  research_use_for_writing: 'Use source for writing: {title}',
  research_passage_selected: '{included} of {total} passage included',
  research_passages_selected: '{included} of {total} passages included',
  research_show_student_details: 'Show source name and excerpts to students',
  research_removed_source: 'Removed: {title}',
  research_writing_selection: 'Included for writing',
  research_feedback: 'Research status',
  research_generate_short: 'Generate',
  research_source_count_one: '{count} source',
  research_source_count_many: '{count} sources',
  research_passage_count_one: '{count} passage',
  research_passage_count_many: '{count} passages'
} };
for (const name of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const filename = path.join(root, name), catalog = JSON.parse(fs.readFileSync(filename, 'utf8'));
  catalog.input = { ...catalog.input, ...delta.input };
  fs.writeFileSync(filename, JSON.stringify(catalog, null, 2) + '\n');
}
fs.writeFileSync(path.join(__dirname, 'ui-strings.delta.json'), JSON.stringify(delta, null, 2) + '\n');
console.log('Registered twelve research review labels in both English catalogs.');
