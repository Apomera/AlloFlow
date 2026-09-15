const fs=require('node:fs'),assert=require('node:assert/strict'),file='stem_lab/stem_tool_geometryworld_builder.js';
const raw=fs.readFileSync(file,'utf8'),eol=raw.includes('\r\n')?'\r\n':'\n';let source=raw.replace(/\r\n/g,'\n');
function replace(a,b){assert.equal(source.split(a).length,2,a.slice(0,80));source=source.replace(a,b);}
replace('  function frameGeometryPrintGuide(ctx) {',`  function focusPrintCameraControl(engine, selector) {
    window.requestAnimationFrame(function(){
      if(window[ENGINE_KEY]!==engine || engine._destroyed || engine._showcase)return;
      var control=document.querySelector(selector);if(control)control.focus({preventScroll:true});
    });
  }
  function frameGeometryPrintGuide(ctx) {`);
replace("    patchGeometryState(ctx,{sandboxDockCollapsed:true,hudPanel:''});focusWorldSurface(40);return true;","    patchGeometryState(ctx,{sandboxDockCollapsed:true,hudPanel:''});focusPrintCameraControl(engine,'.gwe-collapse');return true;");
replace("onClick:function(){engine.setViewPreset('free');focusWorldSurface(30);}},'Return camera'","onClick:function(){engine.setViewPreset('free');focusPrintCameraControl(engine,'.gwe-print-guide-options > summary');}},'Return camera'");
new Function(source);const bytes=Buffer.from(source.replace(/\n/g,eol)),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,bytes);fs.ftruncateSync(fd,bytes.length);}finally{fs.closeSync(fd);}
console.log('Print camera actions retain keyboard focus on visible controls while camera transitions complete.');
