const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const stage=__dirname;
const original=fs.readFileSync(path.join(stage,'../universe-disk-depth57/native-check.cjs'),'utf8');
const blocks={pixels:original.slice(original.indexOf('function pixels('),original.indexOf('const cases = []')),proof:original.slice(original.indexOf('async function proofs('),original.indexOf('function png(')),png:original.slice(original.indexOf('function png('),original.indexOf('function contactSheet('))};
const head=`'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const stage=__dirname,repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(stage,'native-report');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const pins={baseline:'8121868ef2aa764c5e3e88284089ebf76fe0c9e1ec264ee4ae95fe434d7e9bc9',candidate:'6f1267255407b7de52bb685922281301fef58de9c91cc8a036577a7c317e56e8'};
const sources=Object.fromEntries(Object.keys(pins).map(phase=>{const value=fs.readFileSync(path.join(stage,phase+'-renderer.js'),'utf8');assert.equal(sha(value),pins[phase]);return[phase,value];}));
process.env.PLAYWRIGHT_BROWSERS_PATH='C:/Users/cabba/AppData/Local/ms-playwright';
const {chromium}=require(path.join(repo,'node_modules/playwright'));
fs.mkdirSync(report,{recursive:true});
assert.ok(!fs.existsSync(path.join(report,'check.json')),'Initial driver never overwrites a previous outcome');
const result={completed:false,pins,harnessSha256:sha(fs.readFileSync(__filename)),matrix:[],captures:[],proof:{},comparisons:[],resources:[],stability:[],errors:[],scope:'Encoded display RGB and visible clipping artifacts; no physical photometry claim.'};
const save=()=>fs.writeFileSync(path.join(report,'check.json'),JSON.stringify(result,null,2)+'\\n');
const images=new Map();
`;
const rest=`
const cases=[
 {name:'galaxy-near008',region:'galaxy',radial:.08,height:0},
 {name:'galaxy-inner0',region:'galaxy',radial:.8,height:0},
 {name:'galaxy-inner012',region:'galaxy',radial:.8,height:.012},
 {name:'galaxy-inner03',region:'galaxy',radial:.8,height:.03},
 {name:'galaxy-inner048',region:'galaxy',radial:.8,height:.048,exact:true},
 {name:'galaxy-radial112',region:'galaxy',radial:1.12,height:0},
 {name:'galaxy-radial117',region:'galaxy',radial:1.17,height:0},
 {name:'galaxy-radial122',region:'galaxy',radial:1.22,height:0,exact:true},
 {name:'galaxy-above08-dpr2',region:'galaxy',radial:.8,height:.08,dpr:2,exact:true},
 {name:'galaxy-exterior3',region:'galaxy',radial:3,height:0,exact:true},
 {name:'cosmic-twoarm-inner',region:'cosmic',index:1,radial:.8,height:.03},
 {name:'cosmic-barred-inner',region:'cosmic',index:2,radial:.8,height:.03},
 {name:'elliptical-near',region:'cosmic',index:3,radial:.08,height:0,exact:true},
 {name:'neighborhood-control',region:'neighborhood',exact:true},
 {name:'beta09-inner',region:'galaxy',radial:.8,height:.03,beta:.9},
 {name:'beta099-inner',region:'galaxy',radial:.8,height:.03,beta:.99}
].map(spec=>({index:0,fov:80,dpr:1,beta:0,layer:'full',...spec}));
result.matrix=cases;
async function settled(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function pose(page,spec){
 return page.evaluate(spec=>{
  const models=__native.models(spec.region).galaxies,m=models[spec.index],snapshot=__scene.snapshot();
  let position,direction,chiefRay;
  if(m){
   const local=[spec.radial,spec.height,0],ct=Math.cos(m.tilt),st=Math.sin(m.tilt),cr=Math.cos(m.turn),sr=Math.sin(m.turn),ty=local[1]*ct-local[2]*st,tz=local[1]*st+local[2]*ct;
   const vector=[local[0]*cr-ty*sr,local[0]*sr+ty*cr,tz];position=m.center.map((c,i)=>c+vector[i]*m.radius);
   const toward=m.center.map((c,i)=>c-position[i]),length=Math.hypot(...toward);chiefRay=toward.map(v=>v/length);
   direction=UniverseFlight.math.aberrate(chiefRay,spec.beta);
  }else{position=[0,0,0];chiefRay=[0,0,1];direction=UniverseFlight.math.aberrate(chiefRay,spec.beta);}
  Object.assign(snapshot.settings,{mode:spec.beta?'relativity':'explore',region:spec.region,beta:spec.beta,compareRest:false,quality:'high',fov:spec.fov,exposure:1,running:false});
  Object.assign(snapshot.state,{position,yaw:Math.atan2(direction[0],direction[2]),pitch:Math.atan2(direction[1],Math.hypot(direction[0],direction[2])),distanceLy:0,universeYears:0,travelerYears:0});snapshot.targetId=null;
  __selection={layer:'full'};
  if(!__scene.restore(snapshot))throw new Error('Rejected pose '+spec.name);__scene.set({running:false});
  return{chiefRay,apparentAim:direction};
 },spec);
}
async function canvasBytes(page){const url=await page.evaluate(()=>{const value=__scene.capture();if(!value)throw new Error('Capture unavailable');return value.dataUrl;});return Buffer.from(url.split(',')[1],'base64');}
async function capture(page,phase,spec){
 const aim=await pose(page,spec);await settled(page);const bytes=await canvasBytes(page),file=phase+'-'+spec.name+'.png';fs.writeFileSync(path.join(report,file),bytes);images.set(phase+':'+spec.name,bytes);
 const probe=await page.evaluate(()=>({finiteUploads:__probe.finiteUploads,actualBeta:__probe.beta,glError:__probe.gl.getError(),planeMarkers:__probe.planeMarkers,subUploads:__probe.subUploads}));
 const statistics=stats(bytes);result.captures.push({phase,name:spec.name,file,hash:sha(bytes),statistics,snapshot:await page.evaluate(()=>__scene.snapshot()),...aim,...probe});
 assert.equal(probe.glError,0);assert.equal(probe.actualBeta,spec.beta);assert.equal(probe.finiteUploads,true);
 if(spec.beta){assert.ok(statistics.sumLuminance>100,'Meaningful apparent-aim beta signal');assert.ok(statistics.nonblackPixels>100,'Meaningful apparent-aim beta pixels');}
 console.log(phase+' '+spec.name);save();
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
function contactSheet(){
 const tw=300,th=200,gap=4,width=tw*4+gap*3,height=th*8+gap*7,data=Buffer.alloc(width*height*3,12);
 cases.forEach((spec,index)=>{for(const[phaseIndex,phase]of['baseline','candidate'].entries()){const pic=pixels(images.get(phase+':'+spec.name)),col=index%2*2+phaseIndex,row=Math.floor(index/2);for(let y=0;y<th;y++)for(let x=0;x<tw;x++){const src=(Math.floor(y/th*pic.height)*pic.width+Math.floor(x/tw*pic.width))*pic.channels,dst=((row*(th+gap)+y)*width+col*(tw+gap)+x)*3;pic.data.copy(data,dst,src,src+3);}}});
 fs.writeFileSync(path.join(report,'contact-sheet.png'),png(width,height,data));
 fs.writeFileSync(path.join(report,'contact-sheet.html'),'<!doctype html><meta charset="utf-8"><title>Close galaxy comparison</title><style>body{font:14px system-ui;background:#151515;color:white;margin:16px}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}section{display:grid;grid-template-columns:1fr 1fr;gap:4px}h2{grid-column:span 2;font-size:14px;margin:5px}img{width:100%;background:black}</style><h1>Tool 58 close galaxy handoff</h1><p>Baseline left; candidate right. Camera snapshots and renderer pins are recorded in check.json.</p><main>'+cases.map(spec=>'<section><h2>'+spec.name+'</h2>'+['baseline','candidate'].map(phase=>'<figure style="margin:0"><img src="'+phase+'-'+spec.name+'.png"><figcaption>'+phase+'</figcaption></figure>').join('')+'</section>').join('')+'</main>');
}
(async()=>{
 save();let browser;
 try{
  browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  for(const phase of['baseline','candidate'])for(const dpr of[1,2]){
   const context=await browser.newContext({viewport:{width:720,height:480},deviceScaleFactor:dpr}),page=await context.newPage();
   page.on('pageerror',error=>result.errors.push({phase,dpr,kind:'page',error:String(error)}));page.on('console',message=>{if(message.type()==='error')result.errors.push({phase,dpr,kind:'console',error:message.text()});});
   await page.route('http://127.0.0.1:3187/close-native',route=>route.fulfill({contentType:'text/html',body:'<style>body{margin:0;background:#000}canvas{display:block;width:720px;height:480px}</style><canvas></canvas>'}));await page.goto('http://127.0.0.1:3187/close-native');await page.evaluate(probeInstall);
   const marker='  global.UniverseFlight = {';assert.ok(sources[phase].includes(marker));await page.addScriptTag({content:sources[phase].replace(marker,'  global.__native={models:makeRegion,geometry:galaxyGeometry,route:flybyRoute};\\n'+marker)});
   await page.evaluate(()=>{window.__scene=UniverseFlight.create(document.querySelector('canvas'),{onStatus(status){window.__status=status;}});});await page.waitForFunction(()=>__status?.state==='ready');
   for(const spec of cases.filter(spec=>spec.dpr===dpr))await capture(page,phase,spec);
   if(dpr===1){
    result.proof[phase]=await proofs(page);await pose(page,cases.find(spec=>spec.name==='galaxy-inner03'));await settled(page);
    const snapshot=await page.evaluate(()=>__scene.snapshot()),frozen=await canvasBytes(page),uploads=await page.evaluate(()=>__probe.subUploads);
    await page.waitForTimeout(100);assert.equal(sha(await canvasBytes(page)),sha(frozen),'Paused exact pixels');
    await page.evaluate(()=>{__scene.look(.18,.07);__scene.set({fov:62,exposure:.8,running:false});});await settled(page);assert.equal(await page.evaluate(()=>__probe.subUploads),uploads,'Look/lens/exposure reuse uploads');
    await page.evaluate(snapshot=>{if(!__scene.restore(snapshot))throw new Error('Restore rejected');},snapshot);await settled(page);assert.equal(sha(await canvasBytes(page)),sha(frozen),'Exact restore pixels');assert.equal(await page.evaluate(()=>__probe.subUploads),uploads,'Same-position snapshot uses cached surfaces');
    result.stability.push({phase,pausedHash:sha(frozen),exactRestore:true,noUploadsForPauseLookLensExposureSnapshot:true,uploads});
   }
   await page.evaluate(()=>__scene.dispose());
   const resources=await page.evaluate(async()=>{await Promise.all(__probe.pending);const{gl,pending,lastProjection,planeMarkers,...counts}=__probe,errors=[];let code;while((code=gl.getError())!==0)errors.push(code);return{...counts,errors,lost:gl.isContextLost()};});
   for(const label of['Textures','Buffers','Programs','Shaders'])assert.equal(resources['created'+label],resources['deleted'+label]);assert.deepEqual([resources.createdTextures,resources.createdBuffers,resources.createdPrograms,resources.createdShaders],[2,2,2,4]);assert.deepEqual(resources.errors,[]);assert.equal(resources.lost,false);assert.equal(resources.finiteUploads,true);
   result.resources.push({phase,dpr,...resources});await context.close();save();
  }
  for(const key of['populations','metadata','functions','routeFunctions','snapshots','pointUploads'])assert.deepEqual(result.proof.candidate[key],result.proof.baseline[key],key+' exact');
  for(const dpr of[1,2])assert.deepEqual(result.resources.find(r=>r.phase==='candidate'&&r.dpr===dpr).atlasUploads,result.resources.find(r=>r.phase==='baseline'&&r.dpr===dpr).atlasUploads,'Actual texture uploads exact');
  for(const spec of cases){const a=result.captures.find(c=>c.phase==='baseline'&&c.name===spec.name),b=result.captures.find(c=>c.phase==='candidate'&&c.name===spec.name);assert.deepEqual(a.snapshot,b.snapshot,spec.name+' camera exact');const delta=difference(images.get('baseline:'+spec.name),images.get('candidate:'+spec.name));result.comparisons.push({name:spec.name,baseline:a.statistics,candidate:b.statistics,delta,exactControl:!!spec.exact});if(spec.exact)assert.equal(a.hash,b.hash,spec.name+' outside envelope exact pixels');assert.ok(b.statistics.clippedFraction<.15,spec.name+' finite clipping bound');}
  const near=result.comparisons.find(c=>c.name==='galaxy-near008');assert.ok(near.delta.changedFraction>.01,'Near-map artifact visibly changes');assert.ok(near.candidate.sumLuminance<near.baseline.sumLuminance,'Near exterior map contribution removed');
  assert.deepEqual(result.errors,[]);for(const phase of Object.keys(pins))assert.equal(sha(fs.readFileSync(path.join(stage,phase+'-renderer.js'))),pins[phase]);contactSheet();result.completed=true;save();console.log(JSON.stringify({completed:true,captures:result.captures.length,harnessSha256:result.harnessSha256},null,2));
 }catch(error){result.failure=String(error);save();throw error;}finally{if(browser)await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
`;
fs.writeFileSync(path.join(stage,'native-check.cjs'),head+blocks.pixels+blocks.proof+blocks.png+rest);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
fs.writeFileSync(path.join(stage,'native-driver-provenance.json'),JSON.stringify({original:'../universe-disk-depth57/native-check.cjs',originalSha256:hash(original),driverSha256:hash(fs.readFileSync(path.join(stage,'native-check.cjs'))),reused:['PNG decoder','encoded RGB statistics','exact pixel difference','population/math/route proofs','PNG contact-sheet encoder'],matrix:16},null,2)+'\n');
console.log(hash(fs.readFileSync(path.join(stage,'native-check.cjs'))));
