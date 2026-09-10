const fs = require('node:fs');
const vm = require('node:vm');
const file = 'stem_lab/stem_tool_geometryworld_builder.js';
let source = fs.readFileSync(file, 'utf8');
const newline = source.includes('\r\n') ? '\r\n' : '\n';
const helper = `  // Polling compares semantic occupancy before the connected-component walk.
  // Scan the entire world: a new neighbour may not be in the retained selection.
  function blockMeasurementSignature(engine, keys) {
    return JSON.stringify(keys.slice().sort().map(function(key) {
      var mesh = engine.blocks[key], u = mesh && mesh.userData, p = u && u.gridPos;
      return [key, !!mesh, !!u, p && p.x, p && p.y, p && p.z,
        u && u.shape, u && u.rotation, u && u.blockType, u && u.volume,
        u && u._measurementLayer, u && u._lessonBlock];
    }));
  }
  function selectionRefreshSignature(engine) {
    var selected = engine && engine._builderSelection;
    if (!selected || !Array.isArray(selected.blocks) || !engine.blocks) return null;
    return JSON.stringify(selected.blocks.map(keyFor).sort()) + '|' +
      blockMeasurementSignature(engine, Object.keys(engine.blocks));
  }
  function polledSelectionMeasurement(engine, cache) {
    var signature = selectionRefreshSignature(engine), saved = cache.current;
    if (signature === null) { cache.current = null; return null; }
    if (saved && saved.engine === engine && saved.measure === engine.measureStructure && saved.signature === signature) return saved.result;
    var result = selectionMeasurement(engine);
    // Measurement can add connected cells or remove missing retained cells.
    // Store the normalized selection so its own update does not trigger a poll.
    cache.current = {engine:engine, measure:engine.measureStructure,
      signature:selectionRefreshSignature(engine), result:result};
    return result;
  }
`;
function replaceOnce(before, after) {
  if (!source.includes(before) || source.indexOf(before) !== source.lastIndexOf(before)) throw new Error('Expected one patch anchor: ' + before.slice(0,100));
  source = source.replace(before, after);
}
replaceOnce('  // Closing the inspector hides its result, not the outlined selection.', helper.replace(/\n/g,newline) + '  // Closing the inspector hides its result, not the outlined selection.');
replaceOnce("var previousEngine=null, signature='', selectedBlockKeys='', outline=null;", "var previousEngine=null, signature='', selectedBlockKeys='', outline=null, selectionPollCache={current:null};");
replaceOnce('          var selected=selectionMeasurement(eng);', '          var selected=polledSelectionMeasurement(eng,selectionPollCache);');
replaceOnce("var next=m.blocks.map(function(p){var u=eng.blocks[keyFor(p)].userData;return keyFor(p)+':'+u.shape+':'+u.rotation+':'+u.blockType;}).sort().join('|');", 'var next=blockMeasurementSignature(eng,m.blocks.map(keyFor));');
replaceOnce('selectionMeasurement:selectionMeasurement,', 'selectionMeasurement:selectionMeasurement, polledSelectionMeasurement:polledSelectionMeasurement,');
new vm.Script(source, {filename:file});
for (const target of [file,'desktop/web-app/public/' + file]) {
  const fd=fs.openSync(target,'r+');
  try { fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source)); } finally { fs.closeSync(fd); }
}
console.log(JSON.stringify({syntax:'passed',mirror:fs.readFileSync(file).equals(fs.readFileSync('desktop/web-app/public/' + file)),changes:'Interval-only semantic selection cache; selected metadata signature expanded.'}));
