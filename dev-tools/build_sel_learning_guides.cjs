const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const guides = JSON.parse(fs.readFileSync(path.join(root, 'sel_hub/sel_learning_guides.json'), 'utf8'));
const fields = ['purpose', 'model', 'practice', 'reflect', 'transfer', 'boundary'];
const ids = fs.readdirSync(path.join(root, 'sel_hub')).filter(name => /^sel_tool_.*\.js$/.test(name)).map(name => {
  const source = fs.readFileSync(path.join(root, 'sel_hub', name), 'utf8');
  const match = source.match(/registerTool\(\s*['"]([^'"]+)['"]/);
  if (!match) throw new Error('Missing registration in ' + name);
  return match[1];
});
if (JSON.stringify(Object.keys(guides).sort()) !== JSON.stringify(ids.sort())) throw new Error('Learning guides must cover exactly the registered SEL tools.');
for (const [id, guide] of Object.entries(guides)) {
  if (JSON.stringify(Object.keys(guide).sort()) !== JSON.stringify(fields.slice().sort())) throw new Error('Unexpected guide fields: ' + id);
  for (const field of fields) if (typeof guide[field] !== 'string' || !guide[field].trim()) throw new Error('Missing ' + field + ': ' + id);
}
const hubPath = path.join(root, 'sel_hub/sel_hub_module.js');
const publicPath = path.join(root, 'desktop/web-app/public/sel_hub/sel_hub_module.js');
const original = fs.readFileSync(hubPath, 'utf8').replace(/\r\n/g, '\n');
let hub = original;
const begin = '    // BEGIN SEL TOOL LEARNING GUIDES';
const end = '    // END SEL TOOL LEARNING GUIDES';
const block = begin + '\n    var SEL_TOOL_GUIDES = ' + JSON.stringify(guides, null, 2) + ';\n' + end;
if (hub.includes(begin)) {
  if (hub.indexOf(end) < hub.indexOf(begin)) throw new Error('Missing guide end marker');
  hub = hub.slice(0, hub.indexOf(begin)) + block + hub.slice(hub.indexOf(end) + end.length);
} else {
  if (!hub.includes('    var SEL_PATHWAYS = [')) throw new Error('Missing guide insertion point');
  hub = hub.replace('    var SEL_PATHWAYS = [', block + '\n\n    var SEL_PATHWAYS = [');
}
if (process.argv.includes('--check')) {
  if (hub !== original || hub !== fs.readFileSync(publicPath, 'utf8').replace(/\r\n/g, '\n')) throw new Error('Run node dev-tools/build_sel_learning_guides.cjs to refresh the embedded guides and mirror.');
  console.log('Verified ' + ids.length + ' embedded guides and source/public parity.');
} else {
  fs.writeFileSync(hubPath, hub);
  fs.writeFileSync(publicPath, hub);
  console.log('Embedded ' + ids.length + ' SEL learning guides; mirrored hub.');
}
