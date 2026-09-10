const fs = require('node:fs');
const file = 'stem_lab/stem_tool_geometryworld_builder.js';
const mirror = 'desktop/web-app/public/stem_lab/stem_tool_geometryworld_builder.js';
const original = fs.readFileSync(file, 'utf8');
let source = original.replace(/\r\n/g, '\n');
function replaceOnce(before, after) {
  if (source.split(before).length !== 2) throw new Error('Expected exactly one patch location: ' + before.slice(0, 100));
  source = source.replace(before, after);
}
replaceOnce('  function saveEditableWorld(ctx) {', `  // A portable creation contains the fresh retained selection, including any
  // disconnected parts the student kept selected. Centering changes the file
  // coordinates only; the live world, materials and rotations stay untouched.
  function selectedEditableWorld(engine) {
    if (!engine) return { ok:false, error:'Open the 3D world before saving a creation.' };
    if (engine._showcaseExporting) return { ok:false, error:'Wait for the Showcase image to finish saving.' };
    var selected = selectionMeasurement(engine);
    if (!selected || !selected.measurement || !Array.isArray(selected.measurement.blocks) || !selected.measurement.blocks.length) return { ok:false, error:'Select a creation before saving an editable file.' };
    var blocks = [], minX=Infinity, maxX=-Infinity, minY=Infinity, minZ=Infinity, maxZ=-Infinity;
    for (var i=0; i<selected.measurement.blocks.length; i++) {
      var mesh=engine.blocks[keyFor(selected.measurement.blocks[i])], p=gridPosition(mesh), data=mesh && mesh.userData;
      if (!p || !isStudentBlock(data)) return { ok:false, error:'The selected creation changed. Select it again before saving.' };
      blocks.push({x:p.x,y:p.y,z:p.z,type:data.blockType || 'stone',shape:data.shape || 'cube',rotation:data.rotation == null ? 0 : data.rotation});
      minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);
    }
    var offsetX=-Math.floor((minX+maxX)/2), offsetZ=-Math.floor((minZ+maxZ)/2), offsetY=1-minY;
    blocks.forEach(function(block){block.x+=offsetX;block.y+=offsetY;block.z+=offsetZ;});
    return normalizeEditableWorld({schema:EDITABLE_WORLD_SCHEMA,title:'Geometry World selected creation',coordinateSystem:'x-right,y-up,z-depth',blocks:blocks});
  }
  function saveSelectedEditableWorld(ctx) {
    var checked;
    try {
      checked=selectedEditableWorld(window[ENGINE_KEY]);
      if (!checked.ok) { announce(ctx,checked.error,'error');return false; }
      downloadBlob(new Blob([JSON.stringify(checked.value,null,2)],{type:'application/json'}),'geometry-world-selected-creation-editable.json');
    } catch (error) { announce(ctx,error && error.message ? error.message : 'The editable creation could not be saved.','error');return false; }
    announce(ctx,'Saved '+checked.summary.blockCount+' selected block'+(checked.summary.blockCount===1?'':'s')+' as an editable AlloFlow creation, centered above the sandbox floor.','success');
    return true;
  }
  function saveEditableWorld(ctx) {`);
replaceOnce('  function openSelectedBuildInPrintLab(ctx) {\n    var selected = selectionMeasurement(window[ENGINE_KEY]) || aimedStudentMeasurement(ctx, false);\n    if (!selected) return;', `  // STL does not carry units. Convert a copy to millimetres, retaining face
  // normals, triangle attributes and the original block-unit handoff bytes.
  function scaleStlForDownload(buffer, unitMm) {
    if (!buffer || buffer.byteLength < 84) throw new Error('The selected STL is incomplete.');
    var sourceView=new DataView(buffer), count=sourceView.getUint32(80,true);
    if (84+count*50 !== buffer.byteLength) throw new Error('The selected STL triangle data is incomplete.');
    unitMm=printUnit(unitMm);
    var copy=buffer.slice(0), view=new DataView(copy), header='Geometry World; coordinates in mm; '+unitMm+' mm per block', headerBytes=new Uint8Array(copy,0,80);
    headerBytes.fill(0);for(var hi=0;hi<Math.min(80,header.length);hi++)headerBytes[hi]=header.charCodeAt(hi);
    for(var triangle=0;triangle<count;triangle++){
      for(var coordinate=12;coordinate<48;coordinate+=4){var offset=84+triangle*50+coordinate;view.setFloat32(offset,view.getFloat32(offset,true)*unitMm,true);}
    }
    return copy;
  }
  function selectedBuildStlDownload(ctx) {
    var engine=window[ENGINE_KEY];
    if (engine && engine._showcaseExporting) { announce(ctx,'Wait for the Showcase image to finish saving.','info');return false; }
    var bundle, unitMm=printUnit(printContext(ctx).unitMm);
    try {
      var selected=selectionMeasurement(engine);
      if (!selected) { announce(ctx,'Select a creation before downloading its STL.','info');return false; }
      bundle=buildGeometryWorldStl(engine,selected.measurement.blocks,{title:'Geometry World selected build'});
      downloadBlob(new Blob([scaleStlForDownload(bundle.buffer,unitMm)],{type:'model/stl'}),'geometry-world-selected-build-mm.stl');
    } catch(error) { announce(ctx,error && error.message ? error.message : 'The selected STL could not be saved.','error');return false; }
    announce(ctx,'Downloaded '+bundle.blockCount+' selected block'+(bundle.blockCount===1?'':'s')+' in millimeters at '+unitMm+' mm per block. Import the STL at 100% scale.','success');
    return true;
  }
  function openSelectedBuildInPrintLab(ctx) {
    var engine=window[ENGINE_KEY];
    if (engine && engine._showcaseExporting) { announce(ctx,'Wait for the Showcase image to finish saving.','info');return false; }
    var selected = selectionMeasurement(engine) || (!(engine && engine._showcase) && aimedStudentMeasurement(ctx, false));
    if (!selected) { if(engine && engine._showcase)announce(ctx,'Select a creation before opening Print Lab.','info');return false; }`);
replaceOnce("    window.__alloGeometryWorldReturnProject = captureProject(ctx, eng, projectId);", `    var navigating=ctx && typeof ctx.setStemLabTool === 'function', presentation=eng._showcase;
    // Finish presentation synchronously before capturing the editable return
    // project. React state may still describe Showcase in this event handler.
    if (navigating && presentation) {
      try {
        if (typeof eng.endShowcase !== 'function') throw new Error('Return to building before opening Print Lab.');
        eng.endShowcase();
        if (eng._showcase) throw new Error('Showcase could not return to the building view.');
      } catch(error) { announce(ctx,error && error.message ? error.message : 'The building view could not be restored.','error');return false; }
    }
    var project=captureProject(ctx,eng,projectId);
    if (navigating) {
      project.state.showcaseActive=false;project.state.showcaseSaving=false;
      if (presentation) project.state.sandboxDockCollapsed=!!presentation.collapsed;
    }
    window.__alloGeometryWorldReturnProject = project;`);
replaceOnce("    if (ctx && typeof ctx.setStemLabTool === 'function') {\n      announce(ctx, 'Selected build prepared locally. Opening Print Lab.', 'success');", "    if (navigating) {\n      announce(ctx, 'Selected build prepared locally. Opening Print Lab.', 'success');");
const scaleStart = source.indexOf('      var unitMm=printUnit(context.unitMm),downloadBuffer=bundle.buffer.slice(0)');
const scaleEnd = source.indexOf('      downloadBlob(new Blob([downloadBuffer]',scaleStart);
if (scaleStart < 0 || scaleEnd < scaleStart) throw new Error('Missing standalone scaler');
source = source.slice(0,scaleStart) + '      var unitMm=printUnit(context.unitMm),downloadBuffer=scaleStlForDownload(bundle.buffer,unitMm);\n' + source.slice(scaleEnd);
replaceOnce('    editableWorld: editableWorld,', '    editableWorld: editableWorld,\n    selectedEditableWorld:selectedEditableWorld, saveSelectedEditableWorld:saveSelectedEditableWorld,\n    selectedBuildStlDownload:selectedBuildStlDownload, scaleStlForDownload:scaleStlForDownload,');
new Function(source);
const output=original.includes('\r\n')?source.replace(/\n/g,'\r\n'):source;
for (const path of [file,mirror]) {
  const fd=fs.openSync(path,'r+');
  try { fs.writeFileSync(fd,output,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(output)); }
  finally { fs.closeSync(fd); }
}
console.log(JSON.stringify({syntax:true,mirrorIdentical:fs.readFileSync(file).equals(fs.readFileSync(mirror)),bytes:Buffer.byteLength(output)}));
