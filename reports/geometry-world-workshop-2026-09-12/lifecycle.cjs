const fs=require('fs'),vm=require('vm');
function edit(file,fn){let s=fs.readFileSync(file,'utf8'),crlf=s.includes('\r\n');s=s.replace(/\r\n/g,'\n');const r=(a,b)=>{if(s.split(a).length!==2)throw Error('Anchor '+a.slice(0,100));s=s.replace(a,b);};fn(r,()=>s,n=>s=n);new vm.Script(s);const buf=Buffer.from(crlf?s.replace(/\n/g,'\r\n'):s),fd=fs.openSync(file,'r+');fs.writeSync(fd,buf);fs.ftruncateSync(fd,buf.length);fs.closeSync(fd);}
edit('stem_lab/stem_tool_geometryworld_builder.js',(r,get,set)=>{
 r("return !!data && data.blockType !== 'grass' && measurementLayerFor(data) === 'student';","return !!data && !data._lessonBlock && data.blockType !== 'grass' && measurementLayerFor(data) === 'student';");
 r("engine._builderSelection=blocks.length?{blocks:blocks}:null;","engine._builderSelection=blocks.length?{blocks:blocks,exact:true}:null;");
 r("engine.measureStructure(seed.x, seed.y, seed.z, selected.blocks);","engine.measureStructure(seed.x, seed.y, seed.z, selected.blocks, !!selected.exact);");
 r("if (measurement && measurement.isComplete !== false) engine._builderSelection = {blocks:measurement.blocks.slice()};","if (measurement && measurement.isComplete !== false) engine._builderSelection = Object.assign({blocks:measurement.blocks.slice()},selected.exact?{exact:true}:{});");
 r("engine._builderSelection={blocks:selected.measurement.blocks.slice()};","engine._builderSelection=Object.assign({blocks:selected.measurement.blocks.slice()},engine._builderSelection && engine._builderSelection.exact?{exact:true}:{});");
 r("return {engine:engine,measure:engine.measureStructure,keys:keys,members:members,","return {engine:engine,measure:engine.measureStructure,exact:!!selected.exact,keys:keys,members:members,");
 r("!selected || !Array.isArray(selected.blocks) || selected.blocks.length !== saved.keys.length)","!selected || !Array.isArray(selected.blocks) || !!selected.exact!==saved.exact || selected.blocks.length !== saved.keys.length)");
 r("    var signature = selected.blocks.map(function(p) {","    var signature = (selected.exact?'exact:':'connected:')+selected.blocks.map(function(p) {");
 r("afterSelection:{blocks:plan.additions.map(function(b){return {x:b.x,y:b.y,z:b.z};})}});","afterSelection:Object.assign({blocks:plan.additions.map(function(b){return {x:b.x,y:b.y,z:b.z};})},engine._builderSelection.exact?{exact:true}:{})});");
 r("    engine.loadLesson=load;","    engine.loadLesson=load;engine.flushWorkshopDraft=save;");
 r("return function(){save();clearInterval(timer);window.removeEventListener('pagehide',save);", "return function(){if(!engine._destroyed)save();if(engine.flushWorkshopDraft===save)delete engine.flushWorkshopDraft;clearInterval(timer);window.removeEventListener('pagehide',save);");
 r("savedDraft(backup);if(!backup.ok)return;","savedDraft(backup);if(!backup.ok)return;if(backup.project && chosen.id===backup.project.id)chosen=backup.project;");
 r("savedDraft({ok:true,projects:fresh.projects,project:chosen});","savedDraft({ok:true,projects:readWorldShelf().projects,project:chosen});");
 r("h('button',{type:'button',onClick:function(){downloadBlob(new Blob([JSON.stringify(p.world,null,2)]", "h('button',{type:'button',disabled:!p.world.blocks.length,onClick:function(){downloadBlob(new Blob([JSON.stringify(p.world,null,2)]");
 r("if(engine._creationFocus)engine._creationFocus.manual=true;","if(engine._creationFocus){engine._creationFocus.manual=true;engine._creationFocus.transition=null;}");
});
edit('stem_lab/stem_tool_geometryworld.js',(r)=>{
 r('engine.measureStructure = function(startX, startY, startZ, retainedBlocks) {','engine.measureStructure = function(startX, startY, startZ, retainedBlocks, exactSelection) {');
 r("            [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].forEach(function(dir) {", "            if(!exactSelection) [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].forEach(function(dir) {");
 r("function copySelection(value) { return value && Array.isArray(value.blocks) ? {blocks:value.blocks.map(function(b){return {x:b.x,y:b.y,z:b.z};})} : null; }", "function copySelection(value) { return value && Array.isArray(value.blocks) ? Object.assign({blocks:value.blocks.map(function(b){return {x:b.x,y:b.y,z:b.z};})},value.exact?{exact:true}:{}) : null; }");
 r("          engine._destroyed = true;","          if(engine.flushWorkshopDraft)engine.flushWorkshopDraft();\n          engine._destroyed = true;");
});
console.log('Exact selections and final draft flush integrated.');
