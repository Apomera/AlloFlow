const fs=require('fs'),vm=require('vm');
function edit(file,fn){const raw=fs.readFileSync(file,'utf8'),crlf=raw.includes('\r\n');let s=raw.replace(/\r\n/g,'\n');s=fn(s);new vm.Script(s);const out=crlf?s.replace(/\n/g,'\r\n'):s,fd=fs.openSync(file,'r+');fs.writeSync(fd,out);fs.ftruncateSync(fd,Buffer.byteLength(out));fs.closeSync(fd);}
edit('stem_lab/stem_tool_geometryworld_builder.js',s=>{function r(a,b){if(!s.includes(a)||s.indexOf(a)!==s.lastIndexOf(a))throw Error(a);s=s.replace(a,b);}
r("var height=Math.floor(Math.min(x,w-1-x)*v.rise/(w/2));", "var height=Math.floor(Math.min(x,w-1-x)*v.rise/(w/2))+(v.rise<w/2?1:0);");
r("var oldCursor=canvas.style.cursor,oldTouch=canvas.style.touchAction;", "var keyboardSteps={x:0,y:0,z:0};var oldCursor=canvas.style.cursor,oldTouch=canvas.style.touchAction;");
r("function preview(axis,steps){var offset={x:0,y:0,z:0};offset[axis]=steps;onPreview(previewSelectionEdit(engine,'move',offset),offset);}","function preview(axis,steps){keyboardSteps[axis]=Math.max(-128,Math.min(128,keyboardSteps[axis]+steps));var offset={x:0,y:0,z:0};offset[axis]=keyboardSteps[axis];if(!offset[axis])onPreview(null);else onPreview(previewSelectionEdit(engine,'move',offset),offset);}");
r("pointerMode==='transform' && selectionEditPreview && h('div'", "pointerMode==='transform' && !selectionEditPreview && h('button',{type:'button',onClick:function(){focusSelectedBuild(ctx);}},'Frame selection'),pointerMode==='transform' && selectionEditPreview && h('div'");
return s;});
edit('tests/geometry_world_direct_build.test.js',s=>s.replace('86,112]','86,110]').replace('a.y-b.y||a.z-b.z||a.x-b.x','a.y-b.y||a.x-b.x||a.z-b.z').replace("querySelector('[data-axis=y]')","querySelector('button[data-axis=y]')"));
