const fs=require('node:fs'),vm=require('node:vm');
const file='stem_lab/stem_tool_geometryworld_builder.js';
let source=fs.readFileSync(file,'utf8');
const start=source.indexOf('  // Polling compares semantic occupancy before the connected-component walk.');
const end=source.indexOf('  // Closing the inspector hides its result, not the outlined selection.',start);
if(start<0||end<0)throw new Error('Polling helper boundaries missing');
const helper=`  // A complete component can change only through a retained cell or its frontier.
  // Save field tuples after measuring; idle polls compare primitives without
  // rebuilding/sorting a world snapshot or walking the connected component.
  function blockMeasurementTuple(engine, key) {
    var mesh = engine.blocks[key], u = mesh && mesh.userData, p = u && u.gridPos;
    return [key, !!mesh, !!u, p && p.x, p && p.y, p && p.z,
      u && u.shape, u && u.rotation, u && u.blockType, u && u.volume,
      u && u._measurementLayer, u && u._lessonBlock];
  }
  function blockMeasurementSignature(engine, keys) {
    return JSON.stringify(keys.slice().sort().map(function(key) { return blockMeasurementTuple(engine,key); }));
  }
  function selectionRefreshSnapshot(engine) {
    var selected = engine && engine._builderSelection;
    if (!selected || !Array.isArray(selected.blocks) || !engine.blocks) return null;
    var frontier = Object.create(null), members = Object.create(null);
    var directions = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    var keys = selected.blocks.map(keyFor).sort();
    keys.forEach(function(key) { members[key] = true; });
    selected.blocks.forEach(function(p) {
      frontier[keyFor(p)] = true;
      directions.forEach(function(d) { frontier[(p.x+d[0])+','+(p.y+d[1])+','+(p.z+d[2])] = true; });
    });
    // Missing cells matter: filling one can attach an entire remote build.
    // Each disconnected retained part contributes its own six-face frontier.
    var frontierKeys = Object.keys(frontier).sort();
    return {engine:engine,measure:engine.measureStructure,keys:keys,members:members,
      frontier:frontierKeys.map(function(key) { return blockMeasurementTuple(engine,key); })};
  }
  function selectionRefreshUnchanged(engine, saved) {
    var selected = engine && engine._builderSelection;
    if (!saved || saved.engine !== engine || saved.measure !== engine.measureStructure || !engine.blocks ||
      !selected || !Array.isArray(selected.blocks) || selected.blocks.length !== saved.keys.length) return false;
    var seen = Object.create(null);
    for (var i=0;i<selected.blocks.length;i++) {
      var key = keyFor(selected.blocks[i]);
      if (!saved.members[key] || seen[key]) return false;
      seen[key] = true;
    }
    for (var j=0;j<saved.frontier.length;j++) {
      var row = saved.frontier[j], mesh = engine.blocks[row[0]], u = mesh && mesh.userData, p = u && u.gridPos;
      if (row[1] !== !!mesh || row[2] !== !!u || row[3] !== (p && p.x) || row[4] !== (p && p.y) || row[5] !== (p && p.z) ||
        row[6] !== (u && u.shape) || row[7] !== (u && u.rotation) || row[8] !== (u && u.blockType) || row[9] !== (u && u.volume) ||
        row[10] !== (u && u._measurementLayer) || row[11] !== (u && u._lessonBlock)) return false;
    }
    return true;
  }
  function polledSelectionMeasurement(engine, cache) {
    if (selectionRefreshUnchanged(engine,cache.current)) return cache.current.result;
    var result = selectionMeasurement(engine);
    // A truncated/null measurement has no proven complete frontier; retry it.
    if (!result) { cache.current = null; return null; }
    // The fresh measurement normalizes removals and expands connected cells.
    cache.current = selectionRefreshSnapshot(engine);
    cache.current.result = result;
    return result;
  }
`;
source=source.slice(0,start)+helper.replace(/\n/g,source.includes('\r\n')?'\r\n':'\n')+source.slice(end);
function replaceOnce(before,after){if(!source.includes(before)||source.indexOf(before)!==source.lastIndexOf(before))throw new Error('Patch anchor missing/ambiguous: '+before.slice(0,90));source=source.replace(before,after);}
replaceOnce('outline=null, selectionPollCache={current:null};','outline=null, selectionPollCache={current:null}, selectionPollResult=null;');
replaceOnce('          var selected=polledSelectionMeasurement(eng,selectionPollCache);','          var selected=polledSelectionMeasurement(eng,selectionPollCache);\n          if(selected && selected===selectionPollResult)return;\n          selectionPollResult=selected;');
new vm.Script(source,{filename:file});
for(const target of [file,'desktop/web-app/public/'+file]){const fd=fs.openSync(target,'r+');try{fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));}finally{fs.closeSync(fd);}}
console.log(JSON.stringify({syntax:'passed',mirror:fs.readFileSync(file).equals(fs.readFileSync('desktop/web-app/public/'+file)),strategy:'Saved frontier field tuples; unchanged polls avoid JSON and traversal.'}));
