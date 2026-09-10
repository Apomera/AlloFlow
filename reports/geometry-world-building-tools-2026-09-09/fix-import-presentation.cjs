const fs=require('node:fs'),crypto=require('node:crypto');
const file='stem_lab/stem_tool_geometryworld_builder.js';
let source=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
function replaceOnce(before,after){if(source.split(before).length!==2)throw new Error('Expected one anchor: '+before.slice(0,80));source=source.replace(before,after);}
function replaceImportCamera(before,after){const start=source.indexOf('function restoreEditableImportRecovery'),end=source.indexOf('function restoreEditableWorld');const pos=source.indexOf(before,start);if(pos<start || pos>=end)throw new Error('Missing import camera anchor');source=source.slice(0,pos)+after+source.slice(pos+before.length);}
replaceOnce("      '_fillTruncated'].forEach(function(key) {", "      '_fillTruncated','_playerBlockCount'].forEach(function(key) {");
replaceOnce("    saved.velocity = engine.velocity && engine.velocity.toArray ? engine.velocity.toArray() : null;", `    saved.cameraProjection = engine.camera ? {fov:engine.camera.fov,near:engine.camera.near,far:engine.camera.far,
      zoom:engine.camera.zoom,up:engine.camera.up && engine.camera.up.toArray()} : null;
    saved.velocity = engine.velocity && engine.velocity.toArray ? engine.velocity.toArray() : null;`);
replaceImportCamera("    if (saved.camera && engine.camera) engine.camera.position.fromArray(saved.camera);\n    if (saved.cameraQuaternion && engine.camera) {", `    if (saved.cameraProjection && engine.camera) {
      ['fov','near','far','zoom'].forEach(function(key){engine.camera[key]=saved.cameraProjection[key];});
      if (saved.cameraProjection.up && engine.camera.up) engine.camera.up.fromArray(saved.cameraProjection.up);
      if (engine.camera.updateProjectionMatrix) engine.camera.updateProjectionMatrix();
    }
    if (saved.camera && engine.camera) engine.camera.position.fromArray(saved.camera);
    if (saved.cameraQuaternion && engine.camera) {`);
replaceOnce("    var saved;\n    try { saved=captureEditableImportRecovery(ctx,engine); }\n    catch (_) { return {ok:false,error:'The current workspace could not be backed up. No blocks were changed.'}; }", `    if (engine._showcaseExporting) return {ok:false,error:'Wait for the Showcase image to finish saving.'};
    var saved, presentation=engine._showcase;
    // End Showcase before capturing the building camera. Its event handler may
    // still hold React state from the old overlay until the next render.
    if (presentation) {
      try {
        if (typeof engine.endShowcase!=='function') throw new Error('Showcase cannot return to building yet.');
        engine.endShowcase();
        if (engine._showcase) throw new Error('Showcase did not return to building.');
      } catch (_) { return {ok:false,error:'Return to building before opening an editable world. No blocks were changed.'}; }
      patchGeometryState(ctx,{showcaseActive:false,showcaseSaving:false,sandboxDockCollapsed:!!presentation.collapsed});
    }
    try {
      saved=captureEditableImportRecovery(ctx,engine);
      if (presentation) {
        saved.state.showcaseActive=false;saved.state.showcaseSaving=false;
        saved.state.sandboxDockCollapsed=!!presentation.collapsed;
      }
    } catch (_) { return {ok:false,error:'The current workspace could not be backed up. No blocks were changed.'}; }`);
replaceOnce("        if (liveEngine && liveEngine.endShowcase) liveEngine.endShowcase();\n",'');
source=source.replace(/\n/g,'\r\n');new Function(source);
for(const target of [file,'desktop/web-app/public/'+file]){
  const fd=fs.openSync(target,'r+');try{fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));}finally{fs.closeSync(fd);}
}
console.log(JSON.stringify({builderSha256:crypto.createHash('sha256').update(source).digest('hex'),mirrorsIdentical:true}));
