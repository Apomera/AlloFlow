const fs=require('fs'),vm=require('vm');
const canonical='stem_lab/stem_tool_geometryworld_builder.js';
const mirror='desktop/web-app/public/stem_lab/stem_tool_geometryworld_builder.js';
let source=fs.readFileSync(canonical,'utf8');
if(fs.readFileSync(mirror,'utf8')!==source)throw new Error('Builder mirror differs before patch');
const eol=source.includes('\r\n')?'\r\n':'\n';
function replaceOnce(before,after){if(source.split(before).length!==2)throw new Error('Expected one insertion point: '+before.slice(0,100));source=source.replace(before,after);}
const helper=String.raw`  // Keep the Studio floor's projected shadow soft in world units. This local
  // r128 replacement changes only PCFSoft sampling; construction materials,
  // other shadow modes and the shared shader library remain untouched.
  function configureStudioFloorShadow(material, shadowCamera) {
    var THREE=window.THREE;
    if(!THREE || !material || material.isMeshStandardMaterial!==true || !shadowCamera)return false;
    var extents=[shadowCamera.left,shadowCamera.right,shadowCamera.bottom,shadowCamera.top];
    if(!extents.every(function(value){return typeof value==='number' && isFinite(value);}))return false;
    var width=shadowCamera.right-shadowCamera.left,height=shadowCamera.top-shadowCamera.bottom;
    if(!isFinite(width) || !isFinite(height) || width<=0 || height<=0)return false;
    var include='#include <shadowmap_pars_fragment>',soft='#elif defined( SHADOWMAP_TYPE_PCF_SOFT )',vsm='#elif defined( SHADOWMAP_TYPE_VSM )';
    var chunk=THREE.ShaderChunk && THREE.ShaderChunk.shadowmap_pars_fragment;
    var standard=THREE.ShaderLib && THREE.ShaderLib.standard && THREE.ShaderLib.standard.fragmentShader;
    if(typeof chunk!=='string' || typeof standard!=='string' || standard.indexOf(include)<0)return false;
    var begin=chunk.indexOf(soft),end=chunk.indexOf(vsm,begin+soft.length);
    if(begin<0 || end<0 || chunk.indexOf(soft,begin+soft.length)>=0)return false;
    var taps=[];
    for(var i=0;i<16;i++){
      var angle=i*Math.PI*(3-Math.sqrt(5)),radius=Math.sqrt((i+0.5)/16);
      taps.push('texture2DCompare( shadowMap, shadowCoord.xy + gweStudioShadowSpread * vec2('+(Math.cos(angle)*radius).toFixed(6)+', '+(Math.sin(angle)*radius).toFixed(6)+'), shadowCoord.z )');
    }
    var body='\n shadow = (\n'+taps.join(' +\n')+'\n ) * 0.0625;\n';
    var replacement='uniform vec2 gweStudioShadowSpread;\n'+chunk.slice(0,begin)+soft+body+chunk.slice(end);
    var spread={value:new THREE.Vector2(0.14/width,0.14/height)};
    material.onBeforeCompile=function(shader){
      if(!shader || typeof shader.fragmentShader!=='string' || shader.fragmentShader.indexOf(include)<0 || !shader.uniforms)return;
      shader.uniforms.gweStudioShadowSpread=spread;
      shader.fragmentShader=shader.fragmentShader.replace(include,replacement);
    };
    material.customProgramCacheKey=function(){return 'gwe-studio-floor-vogel16-r014-v1';};
    material.needsUpdate=true;
    return true;
  }

`.replace(/\n/g,eol);
replaceOnce('  // Measure only the persistent presentation controls.',helper+'  // Measure only the persistent presentation controls.');
const setup='      key.shadow.camera.near=0.1;key.shadow.camera.far=studioRadius*6+10;key.shadow.bias=-0.00035;key.shadow.normalBias=0.025;';
replaceOnce(setup,setup+eol+'      configureStudioFloorShadow(floorMaterial,key.shadow.camera);');
replaceOnce('    installStudioBackdropColorSync:installStudioBackdropColorSync,','    installStudioBackdropColorSync:installStudioBackdropColorSync,'+eol+'    configureStudioFloorShadow:configureStudioFloorShadow,');
new vm.Script(source,{filename:canonical});
for(const file of [canonical,mirror]){const handle=fs.openSync(file,'r+');try{const bytes=Buffer.from(source);fs.writeSync(handle,bytes,0,bytes.length,0);fs.ftruncateSync(handle,bytes.length);}finally{fs.closeSync(handle);}}
if(fs.readFileSync(canonical,'utf8')!==fs.readFileSync(mirror,'utf8'))throw new Error('Builder mirror differs after patch');
console.log(JSON.stringify({syntax:true,mirror:true,helper:'configureStudioFloorShadow',radius:0.14,taps:16,cacheKey:'gwe-studio-floor-vogel16-r014-v1',lineEnding:eol==='\r\n'?'CRLF':'LF'}));
