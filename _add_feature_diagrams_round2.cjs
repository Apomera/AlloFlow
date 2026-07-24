// Round 2: add 4 more catalog entries to ui_strings.about.features_list.
// Concept Map is intentionally NOT added — it's a sub-type of Visual Organizer
// (Aaron's call). The Visual Organizer diagram entry was updated separately
// to mention concept-map mode.

const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const stringsFile = path.join(ROOT, 'ui_strings.js');
const mirrorStringsFile = path.join(ROOT, 'desktop/web-app', 'public', 'ui_strings.js');

const data = JSON.parse(fs.readFileSync(stringsFile, 'utf-8'));

const newItems = [
  { title: "DBQ Generator",         icon: "FileQuestion",  desc: "Document-Based Question sets for source analysis — DOK-tiered prompts with sourcing/contextualization/corroboration scaffolds + rubric.", category: "creation",   color: "amber" },
  { title: "Note Taking Templates", icon: "ListOrdered",   desc: "Cornell notes, two-column compare/contrast, sketchnote prompts, mindmaps, and summary scaffolds — pre-filled or blank.", category: "creation",   color: "blue" },
  { title: "Anchor Charts",         icon: "Layout",        desc: "Printable classroom-poster anchor charts with iconography, color-coded sections, AI imagery, and differentiated complexity levels.", category: "creation",   color: "rose" },
  { title: "Annotation Suite",      icon: "Quote",         desc: "Overlay annotations on any AlloFlow resource — highlights, sticky notes, voice notes, drawings — with color-coded layers and exportable PDFs.", category: "activities", color: "purple" }
];

const list = data.about.features_list;
const existingTitles = new Set(list.items.map(i => i.title));
const additions = newItems.filter(i => !existingTitles.has(i.title));
list.items.push(...additions);

const out = JSON.stringify(data, null, 2);
fs.writeFileSync(stringsFile, out);
if (fs.existsSync(mirrorStringsFile)) fs.writeFileSync(mirrorStringsFile, out);

console.log(`Added ${additions.length} catalog entries (root + mirror)`);
additions.forEach(a => console.log(`  + ${a.category.padEnd(11)} ${a.title}`));
console.log(`\nTotal features in catalog now: ${list.items.length}`);
