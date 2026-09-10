const fs = require('fs');
const vm = require('vm');
const canonical = 'stem_lab/stem_tool_geometryworld_builder.js';
const mirror = 'desktop/web-app/public/stem_lab/stem_tool_geometryworld_builder.js';
let source = fs.readFileSync(canonical, 'utf8');
if (fs.readFileSync(mirror, 'utf8') !== source) throw new Error('Builder mirror differs before patch');
const eol = source.includes('\r\n') ? '\r\n' : '\n';
function replaceOnce(before, after) {
  if (source.split(before).length !== 2) throw new Error('Expected one insertion point: ' + before.slice(0, 100));
  source = source.replace(before, after);
}
const helper = `  // r128 clears a Color background directly and applies fog after its material
  // encoding chunk. Keep both in the active render target's output space.
  // Own only this Studio callback and these two environment Color objects.
  function installStudioBackdropColorSync(scene, displayHex) {
    var THREE=window.THREE;
    if(!THREE || !scene)return function(){};
    var display=new THREE.Color(displayHex===undefined?0xf1eee8:displayHex),linear=display.clone().convertSRGBToLinear();
    var background=scene.background,fog=scene.fog,previous=scene.onBeforeRender,active=true;
    function syncStudioBackdrop(renderer,renderScene,camera,renderTarget) {
      var result=typeof previous==='function'?previous.apply(this,arguments):undefined;
      if(!active)return result;
      var target=arguments.length>3?renderTarget:renderer && renderer.getRenderTarget?renderer.getRenderTarget():null;
      var encoding=target?(target.texture && target.texture.encoding):renderer && renderer.outputEncoding;
      var color=encoding===THREE.sRGBEncoding?display:linear;
      if(scene.background===background && background && background.isColor)background.copy(color);
      if(scene.fog===fog && fog && fog.color && fog.color.isColor)fog.color.copy(color);
      return result;
    }
    scene.onBeforeRender=syncStudioBackdrop;
    return function() {
      if(!active)return;
      active=false;
      if(scene.onBeforeRender===syncStudioBackdrop)scene.onBeforeRender=previous;
    };
  }

`.replace(/\n/g, eol);
replaceOnce('  // Measure only the persistent presentation controls.', helper + '  // Measure only the persistent presentation controls.');
replaceOnce('      saved.studio=null;' + eol + '      engine.scene.background=studio.background;engine.scene.fog=studio.fog;',
  '      saved.studio=null;' + eol + '      if(studio.releaseBackdropColorSync)studio.releaseBackdropColorSync();' + eol + '      engine.scene.background=studio.background;engine.scene.fog=studio.fog;');
replaceOnce('      engine.scene.fog=new THREE.Fog(ivory,55,145);',
  '      engine.scene.fog=new THREE.Fog(ivory,55,145);' + eol + '      studio.releaseBackdropColorSync=installStudioBackdropColorSync(engine.scene,0xf1eee8);');
replaceOnce('    studioGroundFootprints:studioGroundFootprints, studioContactMap:studioContactMap,',
  '    studioGroundFootprints:studioGroundFootprints, studioContactMap:studioContactMap,' + eol + '    installStudioBackdropColorSync:installStudioBackdropColorSync,');
new vm.Script(source, {filename: canonical});
for (const file of [canonical, mirror]) {
  const handle = fs.openSync(file, 'r+');
  try { const bytes=Buffer.from(source); fs.writeSync(handle,bytes,0,bytes.length,0);fs.ftruncateSync(handle,bytes.length); }
  finally { fs.closeSync(handle); }
}
if(fs.readFileSync(canonical,'utf8')!==fs.readFileSync(mirror,'utf8'))throw new Error('Builder mirror differs after patch');
console.log(JSON.stringify({syntax:true,mirror:true,helper:'installStudioBackdropColorSync',floorAndFogRangesUnchanged:true}));
