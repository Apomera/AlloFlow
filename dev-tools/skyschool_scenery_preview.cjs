#!/usr/bin/env node
'use strict';
// Durable local visual QA fixture. It loads the unchanged production simulator,
// pins pose through its existing test hooks, and exposes diagnostics in the DOM.
// This is not a flight-physics benchmark, an FPS benchmark, or a production page.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('node dev-tools/skyschool_scenery_preview.cjs [--state FILE] [--baseline FILE]\n' +
    'Defaults: .skyschool-scenery-preview.json and .skyschool-cloud-field-baseline.js\n' +
    'Query: lat, lon, alt, heading, pitch, bank, hour, timeOffset, weather, visibility, tas, ac;\n' +
    'quality=0/1/2 holds the requested visual tier; omit it to keep the FPS governor.\n' +
    'rm=1, cockpit=1, baseline=1, renderer=canvas, online=1, autostart=0.\n' +
    'Visible QA controls change pose/weather/quality; body.dataset.sceneryQa holds diagnostics.');
  process.exit(0);
}
function option(name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error('Missing value for ' + name);
  return args[index + 1];
}
const statePath = path.resolve(root, option('--state', '.skyschool-scenery-preview.json'));
const baselinePath = path.resolve(root, option('--baseline', '.skyschool-cloud-field-baseline.js'));
const routes = new Map([
  ['/react.js', path.join(root, 'desktop/web-app/node_modules/react/umd/react.production.min.js')],
  ['/react-dom.js', path.join(root, 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js')],
  ['/three.js', path.join(root, 'vendor/three-r128/three.min.js')],
  ['/skyschool-geo.js', path.join(root, 'stem_lab/stem_data_skyschool_geo.js')],
  ['/skyschool.js', path.join(root, 'stem_lab/stem_tool_flightsim.js')],
  ['/baseline.js', baselinePath],
]);
for (const [route, filename] of routes) {
  if (route !== '/baseline.js' && !fs.existsSync(filename)) throw new Error('Missing preview dependency: ' + filename);
}

const html = String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SkySchool scenery preview</title><link rel="icon" href="data:,"><style>
html,body{margin:0;background:#0b1222;color:#e2e8f0;font:14px system-ui}#app{width:100%;min-height:300px}
#qa-controls{padding:8px 12px;background:#172238;border-bottom:1px solid #475569}#qa-controls summary{cursor:pointer;font-weight:650}
#qa-form{display:flex;flex-wrap:wrap;gap:8px;align-items:end;padding-top:10px}#qa-form label{display:grid;gap:3px;font-size:12px}
#qa-form input,#qa-form select,#qa-form button{font:inherit;border:1px solid #64748b;border-radius:4px;background:#0b1222;color:#f1f5f9;padding:5px}
#qa-form input{width:85px}#qa-form button{cursor:pointer;min-height:30px}#qa-status{display:block;margin-top:8px;color:#cbd5e1;font-size:12px}
</style></head><body>
<details id="qa-controls" open><summary>Scenery QA controls</summary>
<form id="qa-form">
<label>Latitude<input id="qa-lat" name="lat" type="number" step="0.001" min="-89" max="89"></label>
<label>Longitude<input id="qa-lon" name="lon" type="number" step="0.001"></label>
<label>Altitude ft<input id="qa-alt" name="alt" type="number" step="100" min="0" max="65000"></label>
<label>Heading °<input id="qa-heading" name="heading" type="number" step="1"></label>
<label>Pitch °<input id="qa-pitch" name="pitch" type="number" step="1" min="-89" max="89"></label>
<label>Bank °<input id="qa-bank" name="bank" type="number" step="1"></label>
<label>Solar hour<input id="qa-hour" name="hour" type="number" step="0.1"></label>
<label>Scenery time offset s<input id="qa-timeOffset" name="timeOffset" type="number" step="1"></label>
<label>Weather<select id="qa-weather" name="weather"><option value="clear">Clear</option><option value="breezy">Breezy</option><option value="gusty">Gusty</option><option value="partly_cloudy">Partly cloudy</option><option value="overcast">Overcast</option><option value="stormy">Stormy</option><option value="foggy">Foggy</option></select></label>
<label>Visibility<input id="qa-visibility" name="visibility" type="number" min="0.25" max="1" step="0.05"></label>
<label>Visual quality<select id="qa-quality" name="quality"><option value="auto">Auto</option><option value="0">Full</option><option value="1">Reduced</option><option value="2">ECO</option></select></label>
<button type="submit">Apply scenery</button><button id="qa-weather-only" type="button">Apply weather</button>
<button id="qa-east" type="button">Travel east 0.5°</button><button id="qa-reset" type="button">Reset pose</button>
</form><output id="qa-status" aria-live="polite">Loading production simulator…</output></details>
<div id="app"></div>
<script>
var params=new URLSearchParams(location.search);
var qaErrors=[],qaLast=null,qaFrames=0;
function qaError(kind,value){var message=String(value&&value.message||value).slice(0,700);qaErrors.push({kind:kind,message:message});if(qaErrors.length>20)qaErrors.shift();document.body.dataset.sceneryErrors=JSON.stringify(qaErrors);if(qaLast){qaLast.errors=qaErrors.slice();document.body.dataset.sceneryQa=JSON.stringify(qaLast);}}
window.addEventListener('error',function(event){qaError('error',event.error||event.message);});
window.addEventListener('unhandledrejection',function(event){qaError('rejection',event.reason);});
var originalConsoleError=console.error.bind(console);console.error=function(){qaError('console',Array.from(arguments).map(function(v){return v&&v.message||String(v);}).join(' '));return originalConsoleError.apply(console,arguments);};
if(params.get('rm')==='1'){var nativeMatchMedia=window.matchMedia.bind(window);window.matchMedia=function(query){if(query.indexOf('prefers-reduced-motion: reduce')>=0)return{matches:true,media:query,onchange:null,addListener:function(){},removeListener:function(){},addEventListener:function(){},removeEventListener:function(){},dispatchEvent:function(){return true;}};return nativeMatchMedia(query);};}
</script>
<script src="/react.js"></script><script src="/react-dom.js"></script>
<script>
if(params.get('renderer')!=='canvas')document.write('<script src="/three.js">'+'</'+'script>');
</script>
<script>
function numericParam(name,fallback){var value=params.has(name)?Number(params.get(name)):NaN;return Number.isFinite(value)?value:fallback;}
var qaInitial={lat:numericParam('lat',43.646),lon:numericParam('lon',-70.309),alt:numericParam('alt',5000),heading:numericParam('heading',0),pitch:numericParam('pitch',0),bank:numericParam('bank',0),hour:numericParam('hour',12),timeOffset:numericParam('timeOffset',0),weather:params.get('weather')||'clear',visibility:numericParam('visibility',1)};
var qaQuality=params.has('quality')?Number(params.get('quality')):null;
if(!Number.isInteger(qaQuality)||qaQuality<0||qaQuality>2)qaQuality=null;
var qaInitialQuality=qaQuality;
var qaConfig=Object.assign({},qaInitial),qaGeneration=0;
var qaNames=['lat','lon','alt','heading','pitch','bank','hour','timeOffset','weather','visibility'];
function showControls(){qaNames.forEach(function(name){document.getElementById('qa-'+name).value=qaConfig[name];});document.getElementById('qa-quality').value=qaQuality===null?'auto':String(qaQuality);}
function status(message){document.getElementById('qa-status').textContent=message;}
function normalizedLongitude(value){return((value%360+540)%360)-180;}
function pinPose(){
  var hooks=window.__testHooks&&window.__testHooks.flightSim;
  var api=window.__RR_TEST_EXPORTS__&&window.__RR_TEST_EXPORTS__.flightSim;
  if(!hooks||!api||!hooks.flyingRef.current)return;
  var longitude=normalizedLongitude(qaConfig.lon);
  Object.assign(hooks.flightRef.current,{lat:qaConfig.lat,lon:longitude,altitude:qaConfig.alt,
    fieldElev:api.getFlightGroundElevation(qaConfig.lat,longitude),speed:numericParam('tas',140)/.5924838,vsi:0,
    heading:qaConfig.heading,bank:qaConfig.bank,onGround:false,stalling:false,lowAirspeed:false,aoa:qaConfig.pitch});
  Object.assign(hooks.controlsRef.current,{pitch:qaConfig.pitch,bank:qaConfig.bank,throttle:numericParam('power',.7),yawRate:0,flaps:0,brake:0});
  Object.assign(hooks.getWeatherRef().current,{type:qaConfig.weather,wind:0,windDir:270,turbulence:0,visibility:qaConfig.visibility});
  hooks.timeRef.current=((qaConfig.hour-12-longitude/15+48)%24+24)%24*100+qaConfig.timeOffset;
  if(qaQuality!==null&&hooks.qualityRef)Object.assign(hooks.qualityRef.current,{tier:qaQuality,sum:0,n:0});
}
function applyControls(weatherOnly){
  var next=Object.assign({},qaConfig),names=weatherOnly?['weather','visibility']:qaNames;
  for(var name of names){var value=document.getElementById('qa-'+name).value;if(name==='weather')next[name]=value;else{var number=Number(value);if(!Number.isFinite(number)){status('Enter a finite number for '+name+'.');return;}next[name]=number;}}
  if(Math.abs(next.lat)>89||next.alt<0||next.alt>65000||Math.abs(next.pitch)>89||next.visibility<.25||next.visibility>1){status('Use latitude/pitch ±89°, altitude 0–65,000 ft, and visibility 0.25–1.');return;}
  var qualityValue=document.getElementById('qa-quality').value,nextQuality=qualityValue==='auto'?null:Number(qualityValue);
  if(nextQuality!==null&&(!Number.isInteger(nextQuality)||nextQuality<0||nextQuality>2)){status('Choose Auto, Full, Reduced, or ECO quality.');return;}
  qaQuality=nextQuality;qaConfig=next;qaGeneration++;pinPose();showControls();status('Pinned pose · '+qaConfig.weather+' · '+qaConfig.hour+' solar hour · update '+qaGeneration);
}
document.getElementById('qa-form').addEventListener('submit',function(event){event.preventDefault();applyControls(false);});
document.getElementById('qa-weather-only').addEventListener('click',function(){applyControls(true);});
document.getElementById('qa-east').addEventListener('click',function(){qaConfig.lon+=.5;qaGeneration++;pinPose();showControls();status('Travelled east 0.5° · update '+qaGeneration);});
document.getElementById('qa-reset').addEventListener('click',function(){qaConfig=Object.assign({},qaInitial);qaQuality=qaInitialQuality;qaGeneration++;pinPose();showControls();status('Reset pinned pose · update '+qaGeneration);});
showControls();
function rounded(value){return Number.isFinite(value)?Math.round(value*1000000)/1000000:null;}
function vector(value){return value&&typeof value.toArray==='function'?value.toArray().map(rounded):null;}
function euler(value){return value?[rounded(value.x),rounded(value.y),rounded(value.z)]:null;}
function isSpriteSize(item,width,height){var image=item&&item.isSprite&&item.material&&item.material.map&&item.material.map.image;return image&&image.width===width&&image.height===height;}
function spriteDiagnostic(sprite,index){return{index:index,id:sprite.id,visible:sprite.visible,position:vector(sprite.position),scale:vector(sprite.scale),rotation:rounded(sprite.material.rotation),opacity:rounded(sprite.material.opacity),materialId:sprite.material.id,textureId:sprite.material.map?sprite.material.map.id:null,geometryId:sprite.geometry?sprite.geometry.id:null};}
function celestialSprite(scene,name,baselineScale){var named=scene.getObjectByName(name);if(named&&named.isSprite)return named;return baselineScale?scene.children.find(function(item){return isSpriteSize(item,128,128)&&item.scale.x===baselineScale&&item.scale.y===baselineScale;}):null;}
function attributeTriples(attribute,limit){var values=[];if(attribute)for(var i=0;i<Math.min(attribute.count,limit);i++)values.push([rounded(attribute.getX(i)),rounded(attribute.getY(i)),rounded(attribute.getZ(i))]);return values;}
var qaResourceIds=new WeakMap(),qaNextResourceId=1;
function resourceId(resource){if(!resource)return null;if(resource.id!=null)return resource.id;if(!qaResourceIds.has(resource))qaResourceIds.set(resource,'qa-resource-'+qaNextResourceId++);return qaResourceIds.get(resource);}
function waterDiagnostic(mesh){
  if(!mesh)return null;
  var records=mesh.userData.waterIdx,attributes=mesh.geometry.attributes,colors=attributes.color,positions=attributes.position;
  var maxRed=0,maxChannel=0,sumSquares=0,top=[];
  for(var i=0;i<records.length;i++){
    var record=records[i],dr=colors.getX(record.i)-record.r,dg=colors.getY(record.i)-record.g,db=colors.getZ(record.i)-record.b;
    var channel=Math.max(Math.abs(dr),Math.abs(dg),Math.abs(db));
    maxRed=Math.max(maxRed,dr);maxChannel=Math.max(maxChannel,channel);sumSquares+=dr*dr+dg*dg+db*db;
    if(i>=4){var rank=0;while(rank<top.length&&(top[rank].red>dr||(top[rank].red===dr&&top[rank].channel>=channel)))rank++;if(rank<4){top.splice(rank,0,{recordIndex:i,red:dr,channel:channel});if(top.length>4)top.pop();}}
  }
  var sampleIndices=[];for(var first=0;first<Math.min(4,records.length);first++)sampleIndices.push({recordIndex:first,kind:'first'});
  top.forEach(function(item){sampleIndices.push({recordIndex:item.recordIndex,kind:'highestRedDelta'});});
  var samples=sampleIndices.map(function(item){var record=records[item.recordIndex],height=Number.isFinite(record.height)?record.height:Number.isFinite(record.h)?record.h:positions.getZ(record.i),world=new THREE.Vector3(record.x,record.y,height).applyMatrix4(mesh.matrixWorld);return{kind:item.kind,recordIndex:item.recordIndex,vertexIndex:record.i,worldPosition:vector(world),baseRGB:[rounded(record.r),rounded(record.g),rounded(record.b)],currentRGB:[rounded(colors.getX(record.i)),rounded(colors.getY(record.i)),rounded(colors.getZ(record.i))]};});
  return{waterCount:records.length,landCount:positions.count-records.length,surfaceVersion:mesh.userData.surfaceVersion==null?null:mesh.userData.surfaceVersion,colorVersion:colors.version,geometryId:resourceId(mesh.geometry),materialId:resourceId(mesh.material),mapId:resourceId(mesh.material.map),coverageId:resourceId(attributes.landCoverage),fieldCoverageId:resourceId(attributes.fieldCoverage),active:typeof mesh.userData.flightWaterEffectsActive==='boolean'?mesh.userData.flightWaterEffectsActive:null,maxRedDelta:rounded(maxRed),maxChannelDelta:rounded(maxChannel),rmsDelta:rounded(Math.sqrt(sumSquares/Math.max(1,records.length*3))),samples:samples};
}
function presenceOf(cloud){var data=cloud.userData||{};for(var name of ['presence','cloudPresence','flightCloudPresence']){if(Number.isFinite(data[name]))return rounded(data[name]);}var state=data.flightCloud||data.cloudState;return state&&Number.isFinite(state.presence)?rounded(state.presence):null;}
if(window.THREE){
  var OriginalRenderer=THREE.WebGLRenderer;
  THREE.WebGLRenderer=function(options){
    var renderer=new OriginalRenderer(options),originalRender=renderer.render;
    if(renderer.debug)renderer.debug.checkShaderErrors=true;
    renderer.render=function(scene,camera){
      var result=originalRender.call(renderer,scene,camera);
      var clouds=scene.children.find(function(item){return item.isGroup&&item.children.length===24&&item.children.every(function(child){return child.isSprite&&child.material&&child.material.map&&child.material.map.image&&child.material.map.image.width===128&&child.material.map.image.height===64;});});
      var sky=scene.children.find(function(item){return item.isMesh&&item.material&&item.material.side===THREE.BackSide&&item.geometry.type==='SphereGeometry';});
      var hooks=window.__testHooks&&window.__testHooks.flightSim;
      var jets=scene.children.filter(function(item){return item.isGroup&&item.userData&&item.userData.dotMat&&item.userData.trailMat;});
      var sunSprite=celestialSprite(scene,'flight-sun-disc',34000),sunHalo=celestialSprite(scene,'flight-sun-halo');
      var moonSprite=celestialSprite(scene,'flight-moon-disc',16000),moonHalo=celestialSprite(scene,'flight-moon-halo');
      var starPoints=scene.children.find(function(item){return item.isPoints&&item.geometry&&item.geometry.attributes.position&&item.geometry.attributes.position.count===600;});
      var waterMesh=scene.children.find(function(item){return item.isMesh&&item.geometry&&item.geometry.type==='PlaneGeometry'&&item.material&&item.material.vertexColors&&item.userData&&Array.isArray(item.userData.waterIdx);});
      qaLast={renderer:'webgl',frame:++qaFrames,generation:qaGeneration,requested:Object.assign({},qaConfig),
        quality:hooks&&hooks.qualityRef?hooks.qualityRef.current.tier:null,pinnedQuality:qaQuality,
        sceneryTime:hooks?rounded(hooks.timeRef.current):null,solarHour:hooks&&hooks.getCitySolarFrame?rounded(hooks.getCitySolarFrame().solarHour):null,
        camera:{position:vector(camera.position),horizontalPosition:[rounded(camera.position.x),rounded(camera.position.z)],quaternion:vector(camera.quaternion),fov:rounded(camera.fov),aspect:rounded(camera.aspect)},
        sunSprite:sunSprite?spriteDiagnostic(sunSprite):null,sunHalo:sunHalo?spriteDiagnostic(sunHalo):null,
        moonSprite:moonSprite?spriteDiagnostic(moonSprite):null,moonHalo:moonHalo?spriteDiagnostic(moonHalo):null,
        starPoints:starPoints?{visible:starPoints.visible,position:vector(starPoints.position),rotation:euler(starPoints.rotation),quaternion:vector(starPoints.quaternion),opacity:rounded(starPoints.material.opacity),materialId:starPoints.material.id,geometryId:starPoints.geometry.id,count:starPoints.geometry.attributes.position.count,positions:attributeTriples(starPoints.geometry.attributes.position,6),colors:attributeTriples(starPoints.geometry.attributes.color,6)}:null,
        water:waterDiagnostic(waterMesh),
        clouds:clouds?clouds.children.map(function(cloud,index){return{index:index,visible:cloud.visible,position:vector(cloud.position),scale:vector(cloud.scale),opacity:rounded(cloud.material.opacity),presence:presenceOf(cloud),rotation:rounded(cloud.material.rotation)};}):[],
        ambientJets:jets.map(function(jet,index){return{index:index,id:jet.id,visible:jet.visible,position:vector(jet.position),rotation:euler(jet.rotation),scale:vector(jet.scale),dotOpacity:rounded(jet.userData.dotMat.opacity),trailOpacity:rounded(jet.userData.trailMat.opacity),dotMaterialId:jet.userData.dotMat.id,trailMaterialId:jet.userData.trailMat.id,geometryIds:jet.children.map(function(child){return child.geometry?child.geometry.id:null;})};}),
        balloons:scene.children.filter(function(item){return isSpriteSize(item,64,96);}).map(spriteDiagnostic),
        birds:scene.children.filter(function(item){return isSpriteSize(item,96,32);}).map(spriteDiagnostic),
        cloudCount:clouds?clouds.children.length:0,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,
        lights:scene.children.filter(function(item){return item.isAmbientLight||item.isDirectionalLight;}).map(function(light){return{id:light.id,type:light.type,intensity:rounded(light.intensity),color:vector(light.color),position:vector(light.position),targetPosition:light.target?vector(light.target.position):null};}),
        atmosphere:sky?{horizon:vector(sky.material.color),zenith:vector(sky.material.userData.flightSkyGradient&&sky.material.userData.flightSkyGradient.uniforms.zenith.value),fog:scene.fog?vector(scene.fog.color):null,fogNear:scene.fog?rounded(scene.fog.near):null,fogFar:scene.fog?rounded(scene.fog.far):null}:null,
        weather:hooks?Object.assign({},hooks.getWeatherRef().current):null,errors:qaErrors.slice()};
      document.body.dataset.sceneryQa=JSON.stringify(qaLast);return result;
    };return renderer;
  };
}
// Observe actual weather paint on the production canvas without changing it.
var qaWeatherPaint=null,qaWeatherPaths=new WeakMap();
function emptyWeatherPaint(){return{rain:0,nearRain:0,droplets:0,frost:0,flash:0,vectors:[],rainAlpha:null};}
['beginPath','moveTo','lineTo','ellipse','stroke','fill','fillRect'].forEach(function(method){
  var original=CanvasRenderingContext2D.prototype[method];
  CanvasRenderingContext2D.prototype[method]=function(){
    if(qaWeatherPaint&&this.canvas.getAttribute('role')==='application'){
      var args=Array.from(arguments),path=qaWeatherPaths.get(this)||[];
      if(method==='beginPath'){path=[];qaWeatherPaths.set(this,path);}
      else if(['moveTo','lineTo','ellipse'].includes(method)&&path.length<8)path.push({method:method,args:args});
      var stroke=String(this.strokeStyle).replace(/\s/g,''),fill=String(this.fillStyle).replace(/\s/g,'');
      if(method==='stroke'&&this.lineWidth===1&&stroke.startsWith('rgba(150,180,220,')){
        qaWeatherPaint.rain++;qaWeatherPaint.rainAlpha=Number(stroke.slice(stroke.lastIndexOf(',')+1,-1));
        if(path.length===2&&qaWeatherPaint.vectors.length<3)qaWeatherPaint.vectors.push([rounded(path[1].args[0]-path[0].args[0]),rounded(path[1].args[1]-path[0].args[1])]);
      }
      if(method==='stroke'&&this.lineWidth===1.25&&stroke.startsWith('rgba(205,225,245,'))qaWeatherPaint.nearRain++;
      if(method==='fill'&&fill.startsWith('rgba(180,210,240,')&&path.length===1&&path[0].method==='ellipse'&&path[0].args[2]===2)qaWeatherPaint.droplets++;
      if(method==='fillRect'&&fill.startsWith('rgba(200,220,240,'))qaWeatherPaint.frost++;
      if(method==='fillRect'&&fill.startsWith('rgba(255,255,255,')&&args[0]===0&&args[1]===0&&args[2]===this.canvas.width&&args[3]===this.canvas.height)qaWeatherPaint.flash++;
    }
    return original.apply(this,arguments);
  };
});
var nativeRAF=window.requestAnimationFrame.bind(window);
window.requestAnimationFrame=function(callback){return nativeRAF(function(time){
  if(callback.name==='loop'){pinPose();qaWeatherPaint=emptyWeatherPaint();}callback(time);
  if(params.get('renderer')==='canvas'&&callback.name==='loop'){
    var hooks=window.__testHooks&&window.__testHooks.flightSim;
    qaLast={renderer:'canvas',frame:++qaFrames,generation:qaGeneration,requested:Object.assign({},qaConfig),quality:hooks&&hooks.qualityRef?hooks.qualityRef.current.tier:null,pinnedQuality:qaQuality,sceneryTime:hooks?rounded(hooks.timeRef.current):null,camera:null,clouds:[],ambientJets:[],balloons:[],birds:[],drawCalls:0,triangles:0,geometries:0,errors:qaErrors.slice()};document.body.dataset.sceneryQa=JSON.stringify(qaLast);
  }
  if(callback.name==='loop'&&qaLast){qaLast.precipitation=qaWeatherPaint;qaWeatherPaint=null;document.body.dataset.sceneryQa=JSON.stringify(qaLast);}
});};
window.AlloPostFXEnabled=false;
if(params.get('online')!=='1')window.SkySchoolCityServices={enabled:false};
window.__RR_TEST_EXPORTS__={};window.__testHooks={};
window.StemLab={registerTool:function(id,config){window.skyTool=config;},isRegistered:function(){return false;},ensureThree:function(){return window.THREE?Promise.resolve(window.THREE):new Promise(function(){});},loadScriptResilient:function(){return new Promise(function(){});}};
// The simulator's geography loads first, as the STEM loader does (stemModuleDependencies).
document.write('<script src="/skyschool-geo.js">'+'</'+'script>');
document.write('<script src="/'+(params.get('baseline')==='1'?'baseline':'skyschool')+'.js">'+'</'+'script>');
</script>
<script>
var noop=function(){},srOnly={position:'absolute',width:1,height:1,overflow:'hidden',clip:'rect(0,0,0,0)'},icons=new Proxy({},{get:function(){return function(){return null;};}});
function App(){
  var state=React.useState({flightSim:{view:'menu',aircraft:params.get('ac')||'cessna172',railCollapsed:true,thirdPerson:params.get('cockpit')!=='1',takeoffTutorialDismissed:true,landingTutorialDismissed:true,earnedBadges:Object.fromEntries(window.__RR_TEST_EXPORTS__.flightSim.ACHIEVEMENTS.map(function(a){return[a.id,true];}))}}),data=state[0],setData=state[1];
  React.useEffect(function(){
    if(params.get('autostart')==='0')return;
    // Use the production menu action so no lesson/challenge panel is started.
    var timer=setTimeout(function(){
      var start=document.querySelector('button[aria-label="Free Flight from Portland, ME"]');
      if(start){start.click();status('Pinned free flight · '+qaConfig.weather+' · '+qaConfig.hour+' solar hour');}
      else status('Free Flight menu action unavailable.');
    },0);
    return function(){clearTimeout(timer);};
  },[]);
  return skyTool.render({React:React,toolData:data,setToolData:setData,labToolData:{},setLabToolData:noop,
    update:function(id,key,value){setData(function(old){return Object.assign({},old,{[id]:Object.assign({},old[id],{[key]:value})});});},
    updateMulti:function(id,patch){setData(function(old){return Object.assign({},old,{[id]:Object.assign({},old[id],patch)});});},
    icons:icons,srOnly:srOnly,t:function(key,fallback){return fallback||key;},setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,addToast:noop,announceToSR:noop,awardXP:noop,beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,tryAward:noop,getXP:function(){return 0;},gradeLevel:'5th Grade',props:{},toolSnapshots:[],a11yClick:function(fn){return{onClick:fn,role:'button',tabIndex:0,onKeyDown:function(event){if(event.key==='Enter'||event.key===' ')fn();}};}});
}
if(window.skyTool)ReactDOM.createRoot(document.getElementById('app')).render(React.createElement(App));else status('Production script unavailable; inspect sceneryErrors and the server output.');
</script></body></html>`;

const server = http.createServer((request, response) => {
  let route;
  try { route = new URL(request.url, 'http://127.0.0.1').pathname; }
  catch (_) { response.writeHead(400); response.end('Invalid request'); return; }
  if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405); response.end(); return; }
  if (route !== '/' && !routes.has(route)) { response.writeHead(404); response.end(); return; }
  try {
    const body = route === '/' ? html : fs.readFileSync(routes.get(route));
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', route === '/' ? 'text/html; charset=utf-8' : 'application/javascript; charset=utf-8');
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500);
    response.end(route === '/baseline.js' ? 'Optional baseline file unavailable' : 'Preview asset unavailable');
  }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(0, '127.0.0.1', () => {
  const metadata = { pid: process.pid, port: server.address().port, url: 'http://127.0.0.1:' + server.address().port + '/',
    statePath, baseline: fs.existsSync(baselinePath) ? baselinePath : null };
  try { fs.writeFileSync(statePath, JSON.stringify(metadata, null, 2) + '\n'); }
  catch (error) { console.error('Cannot write preview state: ' + error.message); server.close(); process.exitCode = 1; return; }
  console.log(JSON.stringify(metadata));
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
