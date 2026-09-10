const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function edit(name,fn){let s=fs.readFileSync('stem_lab/'+name,'utf8'),crlf=s.includes('\r\n');s=s.replaceAll('\r\n','\n');const rep=(a,b)=>{if(s.split(a).length!==2)throw Error('Anchor '+a);s=s.replace(a,b);};fn(rep);new vm.Script(s);if(crlf)s=s.replaceAll('\n','\r\n');for(const base of ['stem_lab','desktop/web-app/public/stem_lab']){const fd=fs.openSync(path.join(base,name),'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}}
edit('stem_tool_geometryworld_builder.js',rep=>{
 rep('homeSaveNotice(),renderEditableRecovery())','homeSaveNotice(),renderEditableRecovery(true))');
 rep('function renderEditableRecovery() {','function renderEditableRecovery(inHome) {\n        if(homeOpen && !inHome)return null;');
 rep('var target = showcaseFilesOpen ? showcaseFileChooseRef.current : editableOpenRef.current;','var target = homeOpen && homeRef.current ? homeRef.current.querySelector(\'.gwe-home-file button\') : showcaseFilesOpen ? showcaseFileChooseRef.current : editableOpenRef.current;');
 rep('function startSandboxMode(ctx) {','function startSandboxMode(ctx, options) {');
 rep("    focusWorldSurface(50);\n    return true;\n  }\n  // Keep the entire workspace", "    if(!options || options.focus!==false)focusWorldSurface(50);\n    return true;\n  }\n  // Keep the entire workspace");
 rep('if(blank && !startSandboxMode(ctx))return;','if(blank && !startSandboxMode(ctx,{focus:false}))return;');
});
edit('stem_tool_geometryworld.js',rep=>{
 rep('if(engine.updateCreationFocus)engine.updateCreationFocus(dt);','if(engine.updateCreationFocus && !(engine._modalState && engine._modalState.showGeometryHome))engine.updateCreationFocus(dt);');
 rep('          if (engine._guidedTour) {\n            if (engine.isInputActive())','          if (engine._guidedTour && !(engine._modalState && engine._modalState.showGeometryHome)) {\n            if (engine.isInputActive())');
});
console.log('Home import scope, creator focus, and camera pause refined.');
