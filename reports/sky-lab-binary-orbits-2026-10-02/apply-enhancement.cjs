const fs = require('fs');
const out = 'reports/sky-lab-binary-orbits-2026-10-02';
const read = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
let source = read('stem_lab/stem_tool_astronomy.js');
if (source !== read(out + '/source-before.js')) throw Error('Source changed since baseline capture');
const model = read(out + '/model-insertion.js'), helper = read(out + '/helper-insertion.js');
const navigation = `          h('a', { href: '#astronomy-binary-orbit-lab', className: 'astr-focus',
            onClick: function(e) { e.preventDefault(); var target = document.getElementById('astronomy-binary-orbit-lab'), control = document.getElementById('astronomy-binary-time'); if (target) target.scrollIntoView({ block: 'start' }); if (control) control.focus({ preventScroll: true }); },
            style: { display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '8px 12px', margin: '0 8px 12px 0', borderRadius: 8, border: '1px solid #475569', background: '#091323', color: '#67e8f9', fontSize: 14, fontWeight: 700, textDecoration: 'underline' }
          }, __alloT('stem.astronomy.binary_jump', 'Explore binary orbits and stellar masses')),

`;
function insert(anchor, piece) {
  if (source.split(anchor).length !== 2) throw Error('Anchor missing or repeated: ' + anchor);
  source = source.replace(anchor, piece + anchor);
}
insert('  function tidalForcingModel(saved) {', model);
insert('      function renderStars() {', helper);
insert("          h('a', { href: '#astronomy-magnitude-lab', className: 'astr-focus',", navigation);
const render = '          renderBinaryOrbit(),\n\n';
insert("          sectionCard('☁️ Nebulae + star formation — where stars are born',", render);
source = source.replace('      tidalForcingModel: tidalForcingModel,', '      binaryOrbitModel: binaryOrbitModel, tidalForcingModel: tidalForcingModel,');
new Function(source);
const labels = { binary_jump: 'Explore binary orbits and stellar masses' };
for (const match of helper.matchAll(/text\('([^']+)', '((?:\\.|[^'\\])*)'\)/g)) {
  labels['binary_' + match[1]] = new Function('return \'' + match[2] + '\'')();
}
for (const path of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const registry = JSON.parse(read(path));
  for (const [key, value] of Object.entries(labels)) {
    if (Object.hasOwn(registry.stem.astronomy, key)) throw Error('Label already exists: ' + key);
    registry.stem.astronomy[key] = value;
  }
  fs.writeFileSync(path, JSON.stringify(registry, null, 2) + '\n');
}
fs.writeFileSync(out + '/navigation-insertion.js', navigation);
fs.writeFileSync(out + '/render-insertion.js', render);
fs.writeFileSync(out + '/english-labels.json', JSON.stringify(labels, null, 2) + '\n');
fs.writeFileSync('stem_lab/stem_tool_astronomy.js', source);
fs.writeFileSync('desktop/web-app/public/stem_lab/stem_tool_astronomy.js', source);
console.log({ labels: Object.keys(labels).length, sourceCharacters: source.length });
