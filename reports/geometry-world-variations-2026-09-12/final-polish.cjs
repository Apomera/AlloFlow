const fs=require('fs'),vm=require('vm');function edit(file,edits){const raw=fs.readFileSync(file,'utf8');let s=raw.replace(/\r\n/g,'\n');for(const [a,b]of edits){if(s.split(a).length!==2)throw Error('Expected one: '+a);s=s.replace(a,b);}new vm.Script(s.replace(/^import .*$/mg,''));if(raw.includes('\r\n'))s=s.replace(/\n/g,'\r\n');const fd=fs.openSync(file,'r+');fs.writeSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}
edit('stem_lab/stem_tool_geometryworld_builder.js',[
 ["var material=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.76,", "var material=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:data.focus?.36:.76,"],
 ["    if(requested && !focus)patchGeometryState(ctx,{builderPrintFocus:null});", "    if(requested && !focus)patchGeometryState(ctx,{builderPrintFocus:null});\n    if(engine._builderSelectionFrame)engine._builderSelectionFrame.visible=!focus;"],
 ["publishProjectNotice('Created '+result.project.world.title+' from the saved project. Open it to begin editing.');}", "publishProjectNotice('Created '+result.project.world.title+' from the saved project. Open it to begin editing.');window.requestAnimationFrame(function(){var card=document.querySelector('.gwe-project-pick[aria-pressed=true]');if(card)card.focus();});}"]
]);
edit('tests/geometry_world_reopened_print_check.test.js',[
 ["const mesh=app.engine.blocks['0,1,0'];mesh.geometry.dispose();mesh.geometry=null;", "app.groups.a.forEach(p=>{const mesh=app.engine.blocks[key(p)];mesh.geometry.dispose();mesh.geometry=null;});"],
 ["const check=app.state().builderPrintCheck;expect(check.selectionSignature).toBeTruthy();", "const check=app.state().builderPrintCheck;expect(check.error).toContain('printable student geometry');expect(check.selectionSignature).toBeTruthy();"]
]);
console.log('Improved focused-region contrast and keyboard focus after duplication; tightened the failure-path test.');
