'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const stage=__dirname,repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/universe-flight-2026-09-29/cluster-passage',process.argv.find(a=>a.startsWith('--run='))?.slice(6)||'native'),sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const candidatePin=process.argv.find(a=>a.startsWith('--candidate-sha='))?.slice(16);assert.match(candidatePin||'',/^[0-9a-f]{64}$/);
const pins={baseline:'11c9f95d62c511ea9b4575598c6847a53c1fc1f37e04e4cd976916d53ef7ee4b',candidate:candidatePin};
const sources=Object.fromEntries(Object.keys(pins).map(phase=>{const value=fs.readFileSync(phase==='baseline'?path.join(stage,'baseline-renderer.js'):path.join(repo,'stem_lab/universe_flight_scene.js'),'utf8');assert.equal(sha(value),pins[phase]);return[phase,value];}));
process.env.PLAYWRIGHT_BROWSERS_PATH='C:/Users/cabba/AppData/Local/ms-playwright';const {chromium}=require(path.join(repo,'node_modules/playwright'));fs.mkdirSync(report,{recursive:true});assert.ok(!fs.existsSync(path.join(report,'check.json')),'This frozen initial driver never overwrites evidence');
const result={completed:false,pins,harnessSha256:sha(fs.readFileSync(__filename)),matrix:[],captures:[],proof:{},comparisons:[],resources:[],stability:[],errors:[],scope:'Generated teaching scenery and an authored camera path, with encoded display RGB statistics; no survey, relativistic spacecraft trajectory or physical photometry claim.'};
const save=()=>fs.writeFileSync(path.join(report,'check.json'),JSON.stringify(result,null,2)+'\n');const images=new Map();
function pixels(bytes) {
  let width, height, channels, offset = 8;
  const parts = [];
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
  while (offset < bytes.length) {
    const size = bytes.readUInt32BE(offset), type = bytes.subarray(offset + 4, offset + 8).toString(), data = bytes.subarray(offset + 8, offset + 8 + size);
    offset += size + 12;
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); assert.equal(data[8], 8); assert.ok([2, 6].includes(data[9])); channels = data[9] === 6 ? 4 : 3; }
    if (type === 'IDAT') parts.push(data);
    if (type === 'IEND') break;
  }
  const raw = zlib.inflateSync(Buffer.concat(parts)), stride = width * channels, data = Buffer.alloc(stride * height);
  const paeth = (a, b, c) => { const p = a + b - c, da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c); return da <= db && da <= dc ? a : db <= dc ? b : c; };
  for (let y = 0; y < height; y++) for (let x = 0; x < stride; x++) {
    const i = y * stride + x, f = raw[y * (stride + 1)], a = x >= channels ? data[i - channels] : 0, b = y ? data[i - stride] : 0, c = y && x >= channels ? data[i - stride - channels] : 0;
    assert.ok(f <= 4);
    data[i] = (raw[y * (stride + 1) + 1 + x] + (f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c))) & 255;
  }
  return { width, height, channels, data };
}
function stats(bytes) {
  const p = pixels(bytes), luminance = new Float64Array(p.width * p.height);
  let sum = 0, clipped = 0, nonblack = 0, xsum = 0, ysum = 0;
  for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
    const i = (y * p.width + x) * p.channels, r = p.data[i], g = p.data[i + 1], b = p.data[i + 2], l = .2126 * Math.max(0, r - 1) + .7152 * Math.max(0, g - 3) + .0722 * Math.max(0, b - 6);
    luminance[y * p.width + x] = l; sum += l; xsum += x * l; ysum += y * l;
    if (l > 1) nonblack++;
    if (Math.min(r, g, b) >= 250) clipped++;
  }
  const cx = sum ? xsum / sum : 0, cy = sum ? ysum / sum : 0;
  let xx = 0, yy = 0, xy = 0, outer = 0;
  for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
    const l = luminance[y * p.width + x], dx = x - cx, dy = y - cy;
    xx += dx * dx * l; yy += dy * dy * l; xy += dx * dy * l;
    // Exclude the central bulge to measure the surrounding emitted disk.
    if (Math.hypot(dx, dy) > p.height * .12) outer += l;
  }
  const discriminant = Math.hypot(xx - yy, 2 * xy), major = sum ? Math.sqrt(Math.max(0, (xx + yy + discriminant) / (2 * sum))) : 0, minor = sum ? Math.sqrt(Math.max(0, (xx + yy - discriminant) / (2 * sum))) : 0;
  return { width: p.width, height: p.height, sumLuminance: sum, meanLuminance: sum / (p.width * p.height), outerLuminance: outer, nonblackPixels: nonblack, clippedFraction: clipped / (p.width * p.height), centroid: [cx, cy], majorSigma: major, minorSigma: minor };
}
function difference(aBytes, bBytes) {
  const a = pixels(aBytes), b = pixels(bBytes);
  assert.equal(a.width, b.width); assert.equal(a.height, b.height);
  let absolute = 0, changed = 0, maximum = 0;
  for (let pixel = 0; pixel < a.width * a.height; pixel++) { let d = 0; for (let channel = 0; channel < 3; channel++) d += Math.abs(a.data[pixel * a.channels + channel] - b.data[pixel * b.channels + channel]); absolute += d; maximum = Math.max(maximum, d / 3); if (d) changed++; }
  return { meanAbsoluteRgb: absolute / (a.width * a.height * 3), changedFraction: changed / (a.width * a.height), maxMeanRgb: maximum };
}

function probeInstall(){
 window.__selection={layer:'full'};window.__programs=[];
 const getContext=HTMLCanvasElement.prototype.getContext;
 HTMLCanvasElement.prototype.getContext=function(type,...args){
  const gl=getContext.call(this,type,...args);if(type!=='webgl'||!gl)return gl;
  const p={createdTextures:0,deletedTextures:0,createdBuffers:0,deletedBuffers:0,createdPrograms:0,deletedPrograms:0,createdShaders:0,deletedShaders:0,subUploads:0,fullUploads:[],atlasUploads:[],lastProjection:{},planeMarkers:{},pending:[],finiteUploads:true,beta:null,gl};window.__probe=p;
  for(const[create,remove,label]of[['createTexture','deleteTexture','Textures'],['createBuffer','deleteBuffer','Buffers'],['createProgram','deleteProgram','Programs'],['createShader','deleteShader','Shaders']]){const c=gl[create].bind(gl),d=gl[remove].bind(gl);gl[create]=(...args)=>{p['created'+label]++;const value=c(...args);if(label==='Programs')__programs.push(value);return value;};gl[remove]=value=>{if(value)p['deleted'+label]++;return d(value);};}
  const locations=new Map(),location=gl.getUniformLocation.bind(gl),uniform=gl.uniform1f.bind(gl);
  gl.getUniformLocation=(program,name)=>{const value=location(program,name);locations.set(value,name);return value;};gl.uniform1f=(loc,value)=>{if(locations.get(loc)==='u_beta')p.beta=value;return uniform(loc,value);};
  const digest=(values,record)=>p.pending.push(crypto.subtle.digest('SHA-256',new Uint8Array(values.buffer,values.byteOffset,values.byteLength)).then(bytes=>record.hash=Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('')));
  const data=gl.bufferData.bind(gl),sub=gl.bufferSubData.bind(gl),texture=gl.texImage2D.bind(gl);
  gl.bufferData=(target,values,...rest)=>{if(values instanceof Float32Array){p.finiteUploads&&=values.every(Number.isFinite);const record={floats:values.length};p.fullUploads.push(record);digest(values,record);}return data(target,values,...rest);};
  gl.bufferSubData=(target,offset,values,...rest)=>{p.subUploads++;if(values instanceof Float32Array){p.finiteUploads&&=values.every(Number.isFinite);p.lastProjection[offset]={count:values.length,marker:values[5]};if(values[5]>=0&&values[5]<1)p.planeMarkers[offset]=values[5];}return sub(target,offset,values,...rest);};
  gl.texImage2D=(...args)=>{const values=args[args.length-1];if(ArrayBuffer.isView(values)){const record={bytes:values.byteLength,width:args[3],height:args[4]};p.atlasUploads.push(record);digest(values,record);}return texture(...args);};
  return gl;
 };
}

async function settled(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function canvasBytes(page){const value=await page.evaluate(()=>__scene.capture());assert.ok(value?.dataUrl,'Capture available');return Buffer.from(value.dataUrl.split(',')[1],'base64');}
async function capture(page,phase,spec){
 await page.evaluate(spec=>{
  if(spec.beta){const m=__native.models('galaxy').galaxies[0],position=[Math.cos(m.turn)*m.radius*3,Math.sin(m.turn)*m.radius*3,0],chief=position.map(v=>-v/Math.hypot(...position)),aim=UniverseFlight.math.aberrate(chief,spec.beta),snapshot=__scene.snapshot();Object.assign(snapshot.settings,{mode:'relativity',region:'galaxy',beta:spec.beta,compareRest:false,quality:'high',fov:50,exposure:1,running:false});Object.assign(snapshot.state,{position,yaw:Math.atan2(aim[0],aim[2]),pitch:Math.atan2(aim[1],Math.hypot(aim[0],aim[2])),distanceLy:0,universeYears:0,travelerYears:0});snapshot.targetId=null;if(!__scene.restore(snapshot))throw new Error('Beta control rejected');}
  else{__scene.set({mode:'explore',region:spec.region,beta:0,compareRest:false,quality:'high',fov:spec.fov,exposure:spec.routeId==='stellar'?.86:1,running:false});if(!__scene.startFlyby(spec.routeId))throw new Error('Route start failed');const accepted=spec.highlightId?__scene.seekFlybyHighlight(spec.highlightId):__scene.seekFlyby(spec.seconds);if(!accepted)throw new Error('Route pose seek failed');__scene.set({running:false});}
 },spec);await settled(page);
 const bytes=await canvasBytes(page),file=phase+'-'+spec.name+'.png';fs.writeFileSync(path.join(report,file),bytes);images.set(phase+':'+spec.name,bytes);
 const info=await page.evaluate(()=>({snapshot:__scene.snapshot(),telemetry:__telemetry,glError:__probe.gl.getError(),actualBeta:__probe.beta,finiteUploads:__probe.finiteUploads,subUploads:__probe.subUploads})),statistics=stats(bytes);
 result.captures.push({phase,name:spec.name,file,hash:sha(bytes),statistics,...info});console.log(phase+' '+spec.name);save();assert.equal(info.glError,0);assert.equal(info.finiteUploads,true);assert.equal(info.actualBeta,spec.beta||0);assert.ok(statistics.sumLuminance>100&&statistics.nonblackPixels>100,'Meaningful visible field');assert.ok(statistics.clippedFraction<.15,'No dominant clipped-white frame');
 return bytes;
}
async function proof(page){return page.evaluate(async()=>{
 const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join(''),populations={},functions={},routes=UniverseFlight.flybys(),routeFunctions={};
 for(const region of['neighborhood','galaxy','cosmic']){const value=__native.models(region);populations[region]={points:value.points.length/9,hash:await digest(new Uint8Array(value.points.buffer,value.points.byteOffset,value.points.byteLength)),galaxies:value.galaxies};}
 for(const[name,fn]of Object.entries(UniverseFlight.math))functions[name]=await digest(new TextEncoder().encode(fn.toString()));
 for(const id of['halo','nebula','group','stellar','disk'])routeFunctions[id]=await digest(new TextEncoder().encode(__native.route(id).atTime.toString()));
 return{populations,functions,routes,routeFunctions};
});}
(async()=>{save();let browser;try{
 browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});let controlCases;
 for(const phase of['baseline','candidate']){
  const context=await browser.newContext({viewport:{width:720,height:480},deviceScaleFactor:1}),page=await context.newPage();page.on('pageerror',error=>result.errors.push({phase,error:String(error)}));page.on('console',message=>{if(message.type()==='error')result.errors.push({phase,error:message.text()});});
  await page.route('http://127.0.0.1:3187/cluster-native62',route=>route.fulfill({contentType:'text/html',body:'<style>body{margin:0;background:#000}canvas{display:block;width:720px;height:480px}</style><canvas></canvas>'}));await page.goto('http://127.0.0.1:3187/cluster-native62');await page.evaluate(probeInstall);
  const marker='  global.UniverseFlight = {';assert.ok(sources[phase].includes(marker));await page.addScriptTag({content:sources[phase].replace(marker,'  global.__native={models:makeRegion,geometry:galaxyGeometry,route:flybyRoute};\n'+marker)});
  await page.evaluate(()=>{window.__scene=UniverseFlight.create(document.querySelector('canvas'),{onStatus(status){window.__status=status;},onTelemetry(info){window.__telemetry=info;}});});await page.waitForFunction(()=>__status?.state==='ready');result.proof[phase]=await proof(page);
  const routes=result.proof[phase].routes;
  if(!controlCases){controlCases=routes.flatMap(route=>route.highlights.map(h=>({name:'old-'+route.id+'-'+h.id,routeId:route.id,region:route.region,seconds:h.seconds,highlightId:h.id,fov:route.fov})));controlCases.push({name:'beta09-control',beta:.9});result.matrix.push(...controlCases.map(s=>({...s,control:true})));}
  for(const spec of controlCases)await capture(page,phase,spec);
  if(phase==='candidate'){
   const oldIds=['halo','nebula','group','stellar','disk'],added=routes.filter(route=>!oldIds.includes(route.id));assert.equal(added.length,1,'Exactly one route appended');const route=added[0];assert.equal(route.durationSeconds,36);assert.equal(route.highlights.length,3);result.newRoute=route;
   const times=[{name:'cluster-initial',seconds:0},...route.highlights.map(h=>({name:'cluster-'+h.id,seconds:h.seconds,highlightId:h.id})),{name:'cluster-mid-first',seconds:(route.highlights[0].seconds+route.highlights[1].seconds)/2},{name:'cluster-mid-last',seconds:(route.highlights[1].seconds+route.highlights[2].seconds)/2},{name:'cluster-completion',seconds:route.durationSeconds}].sort((a,b)=>a.seconds-b.seconds);
   for(const entry of times){const spec={routeId:route.id,region:route.region,fov:route.fov,...entry};result.matrix.push(spec);await capture(page,phase,spec);}
   const pauseSpec={routeId:route.id,region:route.region,fov:route.fov,name:'cluster-paused-check',seconds:route.highlights[1].seconds,highlightId:route.highlights[1].id};await capture(page,phase,pauseSpec);const frozen=await canvasBytes(page),snapshot=await page.evaluate(()=>__scene.snapshot()),uploads=await page.evaluate(()=>__probe.subUploads);await page.waitForTimeout(150);assert.deepEqual(await page.evaluate(()=>__scene.snapshot()),snapshot,'Paused route camera/counters exact');assert.equal(sha(await canvasBytes(page)),sha(frozen),'Paused route pixels exact');
   await page.evaluate(()=>{__scene.look(.2,.06);__scene.set({fov:70,exposure:.9,running:false});});await settled(page);assert.equal(await page.evaluate(()=>__probe.subUploads),uploads,'Paused look and lens reuse geometry');const freeLook=await page.evaluate(()=>__scene.snapshot());const freeLookRoute=await page.evaluate(()=>__telemetry.flyby);assert.equal(freeLookRoute.autoLook,false);assert.deepEqual(freeLook.state.position,snapshot.state.position);assert.equal(freeLook.state.distanceLy,snapshot.state.distanceLy);assert.equal(freeLook.state.universeYears,0);assert.equal(freeLook.state.travelerYears,0);result.stability.push({pausedExact:true,pixelsExact:true,noUploadsForPauseLookLens:true,freeLookRetainsPositionAndCounters:true,snapshot,freeLook,freeLookRoute});
  }
  await page.evaluate(()=>__scene.dispose());const resources=await page.evaluate(async()=>{await Promise.all(__probe.pending);const{gl,pending,lastProjection,planeMarkers,...counts}=__probe;return{...counts,error:gl.getError(),lost:gl.isContextLost()};});for(const label of['Textures','Buffers','Programs','Shaders'])assert.equal(resources['created'+label],resources['deleted'+label]);assert.deepEqual([resources.createdTextures,resources.createdBuffers,resources.createdPrograms,resources.createdShaders],[2,2,2,4]);assert.equal(resources.error,0);assert.equal(resources.lost,false);assert.equal(resources.finiteUploads,true);result.resources.push({phase,...resources});await context.close();save();
 }
 const a=result.proof.baseline,b=result.proof.candidate;for(const key of['populations','functions','routeFunctions'])assert.deepEqual(b[key],a[key]);assert.deepEqual(b.routes.slice(0,5),a.routes,'Existing five route metadata exact');assert.deepEqual(result.resources[1].atlasUploads,result.resources[0].atlasUploads,'Atlas upload bytes exact');
 for(const spec of controlCases){const old=result.captures.find(c=>c.phase==='baseline'&&c.name===spec.name),current=result.captures.find(c=>c.phase==='candidate'&&c.name===spec.name);assert.deepEqual(old.snapshot,current.snapshot,'Existing control camera exact');assert.equal(old.hash,current.hash,'Existing control pixels exact');result.comparisons.push({name:spec.name,exact:true});}
 const newCaptures=result.captures.filter(c=>c.phase==='candidate'&&c.name.startsWith('cluster-')&&c.name!=='cluster-paused-check').sort((a,b)=>a.telemetry.flyby.elapsedSeconds-b.telemetry.flyby.elapsedSeconds);result.newRouteVariation=[];for(let i=1;i<newCaptures.length;i++){const old=newCaptures[i-1],current=newCaptures[i],delta=difference(images.get('candidate:'+old.name),images.get('candidate:'+current.name));assert.ok(delta.changedFraction>.02,'Authored traversal changes visible surroundings');result.newRouteVariation.push({from:old.name,to:current.name,delta,cameraTravelLy:Math.hypot(...old.snapshot.state.position.map((v,j)=>v-current.snapshot.state.position[j]))});}
 assert.deepEqual(result.errors,[]);for(const phase of Object.keys(pins))assert.equal(sha(fs.readFileSync(phase==='baseline'?path.join(stage,'baseline-renderer.js'):path.join(repo,'stem_lab/universe_flight_scene.js'))),pins[phase]);fs.writeFileSync(path.join(report,'gallery.html'),'<!doctype html><meta charset="utf-8"><title>Star cluster passage</title><style>body{font:16px system-ui;background:#111;color:white;max-width:1500px;margin:auto}main{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}img{width:100%}</style><h1>Star cluster passage</h1><main>'+newCaptures.map(c=>'<figure><img src="'+c.file+'"><figcaption>'+c.name+' · '+c.telemetry.flyby.elapsedSeconds+' s</figcaption></figure>').join('')+'</main>');result.completed=true;save();console.log(JSON.stringify({completed:true,captures:result.captures.length,newRoute:result.newRoute,harnessSha256:result.harnessSha256},null,2));
}catch(error){result.failure=String(error);save();throw error;}finally{if(browser)await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
