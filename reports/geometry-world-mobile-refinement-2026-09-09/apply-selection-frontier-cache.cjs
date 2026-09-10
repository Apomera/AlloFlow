const fs=require('node:fs'),vm=require('node:vm');
const file='stem_lab/stem_tool_geometryworld_builder.js';
let source=fs.readFileSync(file,'utf8');
function replaceOnce(before,after){if(!source.includes(before)||source.indexOf(before)!==source.lastIndexOf(before))throw new Error('Patch anchor missing/ambiguous: '+before.slice(0,90));source=source.replace(before,after);}
replaceOnce('// Scan the entire world: a new neighbour may not be in the retained selection.', '// A complete component can change only through a retained cell or its frontier.');
const start=source.indexOf('  function selectionRefreshSignature(engine) {');
const end=source.indexOf('  function polledSelectionMeasurement(engine, cache) {',start);
if(start<0||end<0)throw new Error('Selection signature boundaries missing');
const helper=`  function selectionRefreshSignature(engine) {
    var selected = engine && engine._builderSelection;
    if (!selected || !Array.isArray(selected.blocks) || !engine.blocks) return null;
    var frontier = Object.create(null), directions = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    selected.blocks.forEach(function(p) {
      frontier[keyFor(p)] = true;
      directions.forEach(function(d) { frontier[(p.x+d[0])+','+(p.y+d[1])+','+(p.z+d[2])] = true; });
    });
    // Missing frontier cells matter: filling one can attach an entire remote build.
    // Each disconnected retained part contributes its own six-face frontier.
    return JSON.stringify(selected.blocks.map(keyFor).sort()) + '|' +
      blockMeasurementSignature(engine, Object.keys(frontier));
  }
`;
source=source.slice(0,start)+helper.replace(/\n/g,source.includes('\r\n')?'\r\n':'\n')+source.slice(end);
replaceOnce('    var result = selectionMeasurement(engine);\r\n    // Measurement can add connected cells or remove missing retained cells.', '    var result = selectionMeasurement(engine);\r\n    // A truncated/null measurement has no proven complete frontier; retry it.\r\n    if (!result) { cache.current = null; return null; }\r\n    // Measurement can add connected cells or remove missing retained cells.');
new vm.Script(source,{filename:file});
for(const target of [file,'desktop/web-app/public/'+file]){const fd=fs.openSync(target,'r+');try{fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));}finally{fs.closeSync(fd);}}
console.log(JSON.stringify({syntax:'passed',mirror:fs.readFileSync(file).equals(fs.readFileSync('desktop/web-app/public/'+file)),strategy:'Complete selection plus six-face frontier; null/incomplete results retry.'}));
