const fs = require('node:fs'), assert = require('node:assert/strict');
function replace(file, before, after) {
  const source = fs.readFileSync(file, 'utf8'); assert.ok(source.includes(before), file + ': missing edit');
  fs.writeFileSync(file, source.replace(before, after));
}
replace('stem_lab/stem_tool_anatomy.js', '.anatomy-clinical-note a{display:inline-block;color:#075985;text-decoration:underline;margin-block:6px}', '.anatomy-clinical-note a{display:inline-flex;align-items:center;min-height:44px;max-width:100%;color:#075985;text-decoration:underline;margin-block:6px}');
fs.writeFileSync('desktop/web-app/public/stem_lab/stem_tool_anatomy.js', fs.readFileSync('stem_lab/stem_tool_anatomy.js','utf8'));
replace('tests/anatomy_clinical_notes_refinements.test.js', "system: 'lymphatic', selectedStructure: 'spleen', _structureConfidence", "system: 'lymphatic', complexity: 1, selectedStructure: 'spleen', _structureConfidence");
replace('tests/anatomy_clinical_notes_refinements.test.js', "expect(original.props.key).toBe('spleen');", "expect(original.key).toBe('spleen');");
replace(__dirname + '/browser.cjs', "system:'lymphatic',selectedStructure:'spleen',_activeTab:tab", "system:'lymphatic',complexity:1,selectedStructure:'spleen',_activeTab:tab");
replace(__dirname + '/browser.cjs', 'c.height >= 24 && c.width >= 24', 'c.height >= 44 && c.width >= 44');
