const fs=require('fs'),vm=require('vm');
function edit(file,fn){const raw=fs.readFileSync(file,'utf8');let s=raw.replace(/\r\n/g,'\n');fn((a,b)=>{if(s.split(a).length!==2)throw Error('Expected one match: '+a.slice(0,100));s=s.replace(a,b);});new vm.Script(s);const data=Buffer.from(raw.includes('\r\n')?s.replace(/\n/g,'\r\n'):s),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,data);fs.ftruncateSync(fd,data.length);}finally{fs.closeSync(fd);}console.log('Polished '+file);}
edit('stem_lab/stem_tool_geometryworld.js',replace=>{
 replace("if (ev.ctrlKey || ev.metaKey) { ev.preventDefault(); engine.undo(); if (addToast) addToast('\\u21A9\\uFE0F Undo', 'info'); }", "if (ev.ctrlKey || ev.metaKey) { ev.preventDefault(); if(ev.shiftKey){engine.redo();if(addToast)addToast('\\u21AA\\uFE0F Redo','info');}else{engine.undo();if(addToast)addToast('\\u21A9\\uFE0F Undo','info');} }");
 replace("}, 'Ctrl+Y'), 'Redo',","}, 'Ctrl+Y / Ctrl+Shift+Z'), 'Redo',");
 replace("title: 'Redo (Ctrl+Y) — '","title: 'Redo (Ctrl+Y or Ctrl+Shift+Z) — '");
});
edit('stem_lab/stem_tool_geometryworld_builder.js',replace=>{
 replace("var blocks=plan && plan.additions;if(!Array.isArray(blocks) || !blocks.length || blocks.length>MAX_BLOCKS)return null;", "var additions=plan && plan.additions,blocks=plan && (plan.frameBlocks || plan.additions);if(!Array.isArray(additions) || !additions.length || additions.length>MAX_BLOCKS || !Array.isArray(blocks) || !blocks.length || blocks.length>MAX_BLOCKS)return null;");
 replace("return {count:blocks.length,net:blocks.length-(Array.isArray(plan.removals)?plan.removals.length:0),width:max.x-min.x", "return {count:additions.length,net:additions.length-(Array.isArray(plan.removals)?plan.removals.length:0),width:max.x-min.x");
 replace("sourceSignature:snapshot.signature,additions:plan.additions,removals:plan.removals,label:plan.label", "sourceSignature:snapshot.signature,additions:plan.additions,removals:plan.removals,frameBlocks:plan.selection,label:plan.label");
});
