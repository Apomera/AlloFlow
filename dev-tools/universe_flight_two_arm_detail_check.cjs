'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const repo=process.env.UNIVERSE_REPO||path.resolve(__dirname,'..');
const report=process.env.UNIVERSE_TWO_ARM_DETAIL_REPORT||path.join(repo,'reports/universe-flight-2026-09-29/two-arm-detail');
const baselineFile=process.env.UNIVERSE_TWO_ARM_DETAIL_BASELINE||path.join(report,'baseline-renderer.js');
const phase=process.argv[2]; assert.ok(['baseline','refined'].includes(phase),'Supply baseline or refined');
const expectedRefinedHash=process.argv[3]||'99e10af488ce6d1e9722acc9e8c6b85a1705c4dbca7ff9c22578970cc8bcecad';assert.match(expectedRefinedHash,/^[a-f0-9]{64}$/);
const sourceFile=path.join(repo,'stem_lab/universe_flight_scene.js'),uiFile=path.join(repo,'stem_lab/stem_tool_universe.js');
const source=fs.readFileSync(phase==='baseline'?baselineFile:sourceFile),hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const baselineHash='1633bc6ef42094656572094488ffea6c7c33b756ad83e1b11a6244e907b0526d';
const uiHash='25c11847e69de8808090feda135315f467cd02ae5042cdbbeade2e393b8fd717';
assert.equal(hash(fs.readFileSync(baselineFile)),baselineHash); assert.equal(hash(fs.readFileSync(uiFile)),uiHash);
if(phase==='refined'){assert.equal(hash(source),expectedRefinedHash);assert.deepEqual(source,fs.readFileSync(path.join(repo,'desktop/web-app/public/stem_lab/universe_flight_scene.js')));}
fs.mkdirSync(report,{recursive:true});
const result={phase,completed:false,sourceHash:hash(source),baselineHash,uiHash,checks:[],captures:[],comparisons:[],errors:[],graphics:[],served:[],resources:[]};
const save=()=>fs.writeFileSync(path.join(report,'two-arm-'+phase+'.json'),JSON.stringify(result,null,2)+'\n');
function png(bytes){
  assert.deepEqual(bytes.subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]));
  let width,height,channels,offset=8;const chunks=[];
  while(offset<bytes.length){const size=bytes.readUInt32BE(offset),type=bytes.subarray(offset+4,offset+8).toString(),data=bytes.subarray(offset+8,offset+8+size);offset+=size+12;
    if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);assert.equal(data[8],8);assert.ok([2,6].includes(data[9]));channels=data[9]===6?4:3;}
    else if(type==='IDAT')chunks.push(data);else if(type==='IEND')break;}
  const raw=zlib.inflateSync(Buffer.concat(chunks)),stride=width*channels,pixels=Buffer.alloc(stride*height);
  assert.equal(raw.length,(stride+1)*height);
  const paeth=(a,b,c)=>{const p=a+b-c,aa=Math.abs(p-a),bb=Math.abs(p-b),cc=Math.abs(p-c);return aa<=bb&&aa<=cc?a:bb<=cc?b:c;};
  for(let y=0;y<height;y++)for(let x=0;x<stride;x++){const i=y*stride+x,f=raw[y*(stride+1)],a=x>=channels?pixels[i-channels]:0,b=y?pixels[i-stride]:0,c=y&&x>=channels?pixels[i-stride-channels]:0;assert.ok(f<=4);pixels[i]=(raw[y*(stride+1)+1+x]+(f===0?0:f===1?a:f===2?b:f===3?(a+b)>>1:paeth(a,b,c)))&255;}
  return{width,height,channels,pixels};
}
function stats(image){let sum=0,max=0,clipped=0,visible=0,count=0;for(let y=0;y<image.height;y+=2)for(let x=0;x<image.width;x+=2){const i=(y*image.width+x)*image.channels,r=image.pixels[i],g=image.pixels[i+1],b=image.pixels[i+2],light=.2126*r+.7152*g+.0722*b;sum+=light;max=Math.max(max,r,g,b);if(Math.min(r,g,b)>=250)clipped++;if(light>8)visible++;count++;}return{mean:sum/count,max,clippedWhiteFraction:clipped/count,visibleFraction:visible/count};}
function difference(a,b){assert.deepEqual([a.width,a.height],[b.width,b.height]);let sum=0,max=0,changed=0,count=0;for(let y=0;y<a.height;y+=2)for(let x=0;x<a.width;x+=2){let d=0;for(let c=0;c<3;c++){const delta=Math.abs(a.pixels[(y*a.width+x)*a.channels+c]-b.pixels[(y*b.width+x)*b.channels+c]);sum+=delta;max=Math.max(max,delta);d+=delta;count++;}if(d>12)changed++;}return{meanAbsolute:sum/count,maximumChannelDifference:max,changedFraction:changed/(count/3)};}
async function main(){
  const{chromium}=require(path.join(repo,'node_modules/playwright'));
  const browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const context=await browser.newContext({viewport:{width:1280,height:1000},deviceScaleFactor:1});
    const page=await context.newPage();page.setDefaultTimeout(60000);page.setDefaultNavigationTimeout(90000);
    page.on('pageerror',error=>result.errors.push(String(error)));
    page.on('response',async response=>{if(/\/(universe_flight_scene|stem_tool_universe)\.js(?:\?|$)/.test(response.url()))try{result.served.push({url:response.url(),status:response.status(),hash:hash(await response.body())});}catch(error){result.errors.push(String(error));}});
    if(phase==='baseline')await page.route(/\/stem_lab\/universe_flight_scene\.js(?:\?.*)?$/,route=>route.fulfill({status:200,contentType:'text/javascript',body:source}));
    await page.addInitScript(()=>{
      window.__shellRecords=[];window.__shellStatuses=[];window.__shellInfo=null;window.__shellFilter='all';window.__shellNeutral=false;
      const original=HTMLCanvasElement.prototype.getContext,seen=new WeakSet();
      HTMLCanvasElement.prototype.getContext=function(kind,...args){const gl=original.call(this,kind,...args);if(!gl||!/^webgl/.test(kind)||seen.has(gl))return gl;seen.add(gl);
        const rec={gl,buffers:[],textures:[],programs:[],deletedBuffers:0,deletedTextures:0,deletedPrograms:0,pointData:null,bandUniform:null,uploads:0,updates:0,textureUploads:0};window.__shellRecords.push(rec);
        for(const[type,list,removed]of[['Buffer','buffers','deletedBuffers'],['Texture','textures','deletedTextures'],['Program','programs','deletedPrograms']]){const create=gl['create'+type].bind(gl),remove=gl['delete'+type].bind(gl);gl['create'+type]=function(){const item=create();rec[list].push(item);return item;};gl['delete'+type]=function(item){if(item)rec[removed]++;return remove(item);};}
        const imageUpload=gl.texImage2D.bind(gl);gl.texImage2D=function(...args){rec.textureUploads++;return imageUpload(...args);};
        let bound=null;const bind=gl.bindBuffer.bind(gl),upload=gl.bufferData.bind(gl),place=gl.getUniformLocation.bind(gl),scalar=gl.uniform1f.bind(gl),names=new Map();
        gl.bindBuffer=function(target,item){if(target===gl.ARRAY_BUFFER)bound=item;return bind(target,item);};
        const sub=gl.bufferSubData.bind(gl);gl.bufferSubData=function(...args){rec.updates++;return sub(...args);};
        gl.bufferData=function(target,values,...rest){rec.uploads++;if(target===gl.ARRAY_BUFFER&&bound===rec.buffers[0]&&values instanceof Float32Array){rec.pointData=values.slice();if(window.__shellFilter!=='all'){values=values.slice();for(let i=0;i<values.length;i+=9){const band=values.length===19203*9&&i>=9070*9&&i<9500*9; if(window.__shellFilter==='violet'?!band:band)values[i+7]=0;}}}return upload(target,values,...rest);};
        gl.getUniformLocation=function(program,name){const item=place(program,name);names.set(item,name);return item;};
        gl.uniform1f=function(item,value){if(names.get(item)==='u_galacticBand'){if(window.__shellNeutral)value=0;rec.bandUniform=value;}return scalar(item,value);};return gl;
      };
      let api;Object.defineProperty(window,'UniverseFlight',{configurable:true,get(){return api;},set(value){const create=value.create;value.create=function(canvas,options){const scene=create.call(this,canvas,{...options,onStatus(info){window.__shellStatuses.push(info);if(options.onStatus)options.onStatus(info);},onTelemetry(info){window.__shellInfo=info;if(options.onTelemetry)options.onTelemetry(info);}});window.__shellScene=scene;window.__shellCanvas=canvas;return scene;};api=value;}});
    });
    await page.goto('http://127.0.0.1:3187/reports/universe-flight-2026-09-29/preview.html?enhanced=38&two-arm-detail=qa#universe-flight');
    try{await page.waitForFunction(()=>window.__shellScene&&window.__shellRecords.some(item=>item.pointData));}catch(error){result.initialization=await page.evaluate(()=>({statuses:window.__shellStatuses,hidden:document.hidden,contexts:window.__shellRecords.map(r=>({lost:r.gl.isContextLost(),error:r.gl.getError(),buffers:r.buffers.length,programs:r.programs.length}))}));throw error;}
    await page.evaluate(()=>{const canvas=window.__shellCanvas;canvas.style.height='800px';canvas.parentElement.style.height='800px';window.__shellScene.set({running:false,quality:'high'});window.dispatchEvent(new Event('resize'));});
    const next=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await next();
    const initial=await page.evaluate(()=>window.__shellScene.snapshot());
    async function pose(options={}){await page.locator('select:has(option[value="galaxy"])').first().selectOption(options.region||'neighborhood');await next();await page.evaluate(({initial,options})=>{window.__shellFilter=options.filter||'all';window.__shellNeutral=!!options.neutral;const scene=window.__shellScene;scene.set({region:'galaxy'});const saved=JSON.parse(JSON.stringify(initial));saved.settings={...saved.settings,mode:options.mode||'explore',region:options.region||'neighborhood',beta:options.beta??.9,fov:options.fov||70,exposure:options.exposure??1,quality:'high',running:false};saved.state={...saved.state,position:options.position||[0,0,0],yaw:options.yaw||0,pitch:options.pitch||0};if(!scene.restore(saved))throw new Error('Shell pose rejected');scene.set({running:false});},{initial,options});await next();}
    async function capture(name,stable=false){await next();const data=await page.evaluate(()=>window.__shellScene.capture());const bytes=Buffer.from(data.dataUrl.split(',')[1],'base64'),image=png(bytes);fs.writeFileSync(path.join(report,'two-arm-'+phase+'-'+name+'.png'),bytes);const graphic=await page.evaluate(()=>window.__shellRecords.map(rec=>({errors:[rec.gl.getError()],bandUniform:rec.bandUniform})));result.graphics.push({name,records:graphic});assert.ok(graphic.every(rec=>rec.errors.every(error=>error===0)));const record={name,width:image.width,height:image.height,pixelHash:hash(image.pixels),snapshot:data.snapshot,stats:stats(image)};if(stable){await page.waitForTimeout(100);const again=await page.evaluate(()=>window.__shellScene.capture());assert.deepEqual(again.snapshot,data.snapshot);assert.deepEqual(png(Buffer.from(again.dataUrl.split(',')[1],'base64')).pixels,image.pixels);record.pausedPixelsStable=true;}result.captures.push(record);save();return image;}
    const fixedPoses=[["neighborhood",{}],["relativity",{"mode":"relativity","beta":0.9}],["galaxy-front",{"position":[16685.430485280096,74615.30117537656,92488.66546787632],"yaw":-2.963107319322449,"pitch":-0.6710315100641399,"region":"galaxy","fov":64,"exposure":1}],["galaxy-reverse",{"position":[-16685.430485280096,-74615.30117537656,-92488.66546787632],"yaw":0.17848533426734423,"pitch":0.6710315100641399,"region":"galaxy","fov":64,"exposure":1}],["galaxy-edge",{"position":[137738.0049386368,-25577.793819629936,6165.911031191755],"yaw":-1.6155319627786864,"pitch":0.18342783867897372,"region":"galaxy","fov":64,"exposure":1}],["galaxy-arm",{"position":[26918.546776240717,1236.0427278928537,22690.615633564546],"yaw":-2.531948302495886,"pitch":-0.5153860676667326,"region":"galaxy","fov":64,"exposure":0.8}],["galaxy-dim",{"position":[16685.430485280096,74615.30117537656,92488.66546787632],"yaw":-2.963107319322449,"pitch":-0.6710315100641399,"region":"galaxy","fov":64,"exposure":0.55}],["galaxy-wide",{"position":[58399.00669848033,261153.55411381793,323710.3291375671],"yaw":-2.963107319322449,"pitch":-0.6710315100641399,"region":"galaxy","fov":60,"exposure":1}],["cosmic-front",{"position":[62113.79279940781,170161.49062078845,186512.58363387594],"yaw":-2.8201175030477037,"pitch":-0.7134778224473634,"region":"cosmic","fov":64,"exposure":1}],["cosmic-reverse",{"position":[-62113.79279940781,-170161.49062078845,-186512.58363387594],"yaw":0.3214751505420893,"pitch":0.7134778224473634,"region":"cosmic","fov":64,"exposure":1}],["cosmic-edge",{"position":[293594.5330134339,-99753.64759500575,7173.560908995228],"yaw":-1.595225030593018,"pitch":0.3274384868662055,"region":"cosmic","fov":64,"exposure":1}],["cosmic-group",{"region":"cosmic","position":[0,140000,-480000]}],["two-arm-front",{"position":[-531942.3015850823,297528.7379892857,1508181.574142564],"yaw":2.8970801172964453,"pitch":-0.46456775346127177,"region":"cosmic","fov":58,"exposure":1}],["barred",{"position":[2133429.1508125607,-635088.8216822859,4341727.891192292],"yaw":-2.9099577671575934,"pitch":-0.8474519002038478,"region":"cosmic","fov":58,"exposure":1}],["elliptical",{"position":[800000,550000,1170000],"yaw":3.141592653589793,"pitch":0,"region":"cosmic","fov":58,"exposure":1}],["cosmic-dim",{"position":[62113.79279940781,170161.49062078845,186512.58363387594],"yaw":-2.8201175030477037,"pitch":-0.7134778224473634,"region":"cosmic","fov":64,"exposure":0.55}],["two-arm-reverse",{"position":[-428057.6984149177,82471.26201071427,1091818.425857436],"yaw":-0.24451253629334813,"pitch":0.46456775346127177,"region":"cosmic","fov":58,"exposure":1}],["two-arm-edge",{"position":[-240342.10247044938,314609.27674265124,1313878.7716095042],"yaw":-1.6286424817498037,"pitch":-0.47879231038119724,"region":"cosmic","fov":58,"exposure":1}],["two-arm-arm",{"position":[-491781.72515636904,170532.76392570793,1382050.09245557],"yaw":2.8970801172964453,"pitch":-0.46456775346127116,"region":"cosmic","fov":64,"exposure":0.8}],["two-arm-dim",{"position":[-531942.3015850823,297528.7379892857,1508181.574142564],"yaw":2.8970801172964453,"pitch":-0.46456775346127177,"region":"cosmic","fov":58,"exposure":0.55}],["two-arm-wide",{"position":[-609855.7539627057,458821.8449732143,1820453.9353564102],"yaw":2.8970801172964453,"pitch":-0.46456775346127177,"region":"cosmic","fov":58,"exposure":1}]];
    for(const[name,options]of fixedPoses){await pose(options);await capture(name,true);}
    result.checks.push("twenty-one fixed compositions remain exactly stable while paused");
    await pose();
    for(const id of['halo','group']){await pose({region:id==='halo'?'galaxy':'cosmic'});const highlights=await page.evaluate(id=>window.UniverseFlight.flybys().find(route=>route.id===id).highlights,id);for(const item of highlights){await page.evaluate(({id,highlight})=>{const scene=window.__shellScene;if(!scene.startFlyby(id))throw new Error('Flight launch rejected');scene.set({running:false});if(!scene.seekFlybyHighlight(highlight))throw new Error('Flight highlight rejected');},{id,highlight:item.id});await capture(id+'-'+item.id,true);}}
    result.checks.push('all halo and galaxy-group highlights remain stable while paused');
    result.pointData=await page.evaluate(async()=>{const bytes=window.__shellRecords[0].pointData;const digest=await crypto.subtle.digest('SHA-256',new Uint8Array(bytes.buffer,bytes.byteOffset,bytes.byteLength));return{count:bytes.length/9,hash:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')};});assert.equal(result.pointData.count,41470);assert.equal(result.pointData.hash,'156c66d7c6805406f2d231fb18affab8e613952ec32b5fdf9e9e805104966b85');result.checks.push('cosmic region retains its 41470 source records');
    result.comparisonCaptureCount=result.captures.length;assert.equal(result.comparisonCaptureCount,27);
    if(phase==='refined'){
      const baseline=JSON.parse(fs.readFileSync(path.join(report,'two-arm-baseline.json'),'utf8'));
      assert.equal(baseline.completed,true);assert.equal(baseline.sourceHash,baselineHash);
      assert.equal(result.pointData.count,baseline.pointData.count);assert.equal(result.pointData.hash,baseline.pointData.hash);
      for(const actual of result.captures){const a=png(fs.readFileSync(path.join(report,'two-arm-baseline-'+actual.name+'.png'))),b=png(fs.readFileSync(path.join(report,'two-arm-refined-'+actual.name+'.png')));result.comparisons.push({name:actual.name,...difference(a,b),before:stats(a),after:stats(b)});}
      for(const name of['neighborhood','relativity','galaxy-front','galaxy-arm']){const comparison=result.comparisons.find(item=>item.name===name);assert.ok(comparison.meanAbsolute===0&&comparison.maximumChannelDifference===0,'Unchanged scenery: '+name);}
      result.checks.push('nearby exploration, relativistic sky and the four-arm galaxy preserve their accepted pixels');
      for(const name of['two-arm-front','two-arm-reverse','two-arm-arm','two-arm-dim'])assert.ok(result.comparisons.find(item=>item.name===name).meanAbsolute>.15,'Visible two-arm ribbon detail: '+name);
      result.checks.push('front, reverse, arm and dim compositions visibly reveal added two-arm ribbon detail');
      for(const name of['two-arm-front','two-arm-reverse','two-arm-arm','two-arm-dim']){const after=result.comparisons.find(item=>item.name===name).after;assert.ok(after.mean>0&&after.max>32&&after.clippedWhiteFraction<.005,'Visible colored two-arm detail: '+name);}
      result.checks.push('key two-arm views retain luminous detail without broad white clipping');
    }
    async function navigationState(){return page.evaluate(async()=>{
      const values=window.__shellRecords[0].pointData;
      const digest=await crypto.subtle.digest('SHA-256',new Uint8Array(values.buffer,values.byteOffset,values.byteLength));
      return {snapshot:window.__shellScene.snapshot(),info:window.__shellInfo,pointData:{count:values.length/9,hash:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')},
        records:window.__shellRecords.map(r=>({uploads:r.uploads,textureUploads:r.textureUploads,updates:r.updates,buffers:r.buffers.length,textures:r.textures.length,programs:r.programs.length}))};
    });}
    function stableNavigationResources(before,after){
      const fixed=state=>state.records.map(({updates,...resource})=>resource);
      assert.deepEqual(fixed(after),fixed(before),'navigation has no bufferData, texImage2D or new GPU objects');
      assert.equal(after.records.length,before.records.length);
      for(let i=0;i<after.records.length;i++)assert.ok(after.records[i].updates>=before.records[i].updates,'cosmic observer bufferSubData counts remain monotone');
      assert.deepEqual(before.pointData,result.pointData);assert.deepEqual(after.pointData,result.pointData);
      assert.equal(before.snapshot.state.universeYears,0);assert.equal(before.snapshot.state.travelerYears,0);
      assert.equal(after.snapshot.state.universeYears,0);assert.equal(after.snapshot.state.travelerYears,0);
      assert.equal(before.info.running,false);assert.equal(after.info.running,false);
    }
    await pose({region:'cosmic',position:[0,0,-2200000]});
    await page.getByRole('button',{name:'Select destination: Companion spiral',exact:true}).click();
    await page.locator('#uf-arrival-distance').selectOption('1');
    await page.locator('#uf-speed').focus();await page.locator('#uf-speed').press('End');
    await page.locator('.uf-stage').scrollIntoViewIfNeeded();await next();
    const approachBefore=await capture('approach-before',true),beforeApproach=await navigationState();
    assert.equal(beforeApproach.snapshot.targetId,'companion-galaxy');
    await page.locator('#uf-target-info').getByRole('button',{name:'Fly to destination',exact:true}).click();
    await page.locator('.uf-stage').scrollIntoViewIfNeeded();
    try{await page.waitForFunction(()=>{const info=window.__shellInfo;return info&&info.navigation&&info.navigation.completed&&info.navigation.targetId==='companion-galaxy'&&!info.running;});}
    catch(error){result.approachFailure=await navigationState();throw error;}
    await next();const approachAfter=await capture('approach-after',true),afterApproach=await navigationState();
    stableNavigationResources(beforeApproach,afterApproach);
    assert.equal(afterApproach.snapshot.targetId,'companion-galaxy');assert.equal(afterApproach.info.navigation.active,false);assert.equal(afterApproach.info.navigation.completed,true);
    assert.equal(afterApproach.info.navigation.arrivalRadiusLy,330000);
    assert.ok(Math.abs(Math.hypot(...afterApproach.snapshot.state.position.map((value,i)=>value-[-480000,190000,1300000][i]))-330000)<.001,'native approach reaches Companion survey standoff');
    assert.notDeepEqual(afterApproach.snapshot.state.position,beforeApproach.snapshot.state.position);
    result.approach={before:beforeApproach.snapshot,after:afterApproach.snapshot,navigation:afterApproach.info.navigation,comparison:difference(approachBefore,approachAfter),resourcesBefore:beforeApproach.records,resourcesAfter:afterApproach.records,pointData:afterApproach.pointData,resourcesStable:true};
    assert.ok(result.approach.comparison.meanAbsolute>.1,'Native approach changes the Companion view');
    result.checks.push('native Companion approach arrives paused at 330000 light-years with fixed clocks, source points and GPU objects');
    await pose({"position":[-557913.4523776234,351293.1069839286,1612272.3612138461],"yaw":2.8970801172964453,"pitch":-0.46456775346127177,"region":"cosmic","fov":58,"exposure":1});
    await page.getByRole('button',{name:'Select destination: Companion spiral',exact:true}).click();
    await page.locator('#uf-orbit-rate').focus();await page.locator('#uf-orbit-rate').press('End');
    await page.locator('.uf-stage').scrollIntoViewIfNeeded();await next();
    const orbitBefore=await capture('orbit-before',true),beforeOrbit=await navigationState();
    assert.ok(Math.hypot(...beforeOrbit.snapshot.state.position.map((value,i)=>value-[-480000,190000,1300000][i]))>330000,'Companion orbit starts outside the survey standoff');
    await page.locator('#uf-target-info').getByRole('button',{name:'Orbit destination',exact:true}).click();
    await page.locator('.uf-stage').scrollIntoViewIfNeeded();
    try{await page.waitForFunction(position=>Math.hypot(...window.__shellScene.snapshot().state.position.map((value,i)=>value-position[i]))>.5,beforeOrbit.snapshot.state.position);}
    catch(error){result.orbitFailure=await navigationState();throw error;}
    await page.waitForTimeout(900);await page.locator('.uf-stage canvas').focus();await page.locator('.uf-stage canvas').press('Space');
    await page.waitForFunction(()=>window.__shellInfo&&!window.__shellInfo.running);await next();
    const orbitAfter=await capture('orbit-after',true),afterOrbit=await navigationState();
    stableNavigationResources(beforeOrbit,afterOrbit);
    assert.equal(afterOrbit.snapshot.targetId,'companion-galaxy');assert.equal(afterOrbit.info.orbit.active,true);assert.equal(afterOrbit.info.orbit.targetId,'companion-galaxy');
    assert.notDeepEqual(afterOrbit.snapshot.state.position,beforeOrbit.snapshot.state.position);
    result.orbit={before:beforeOrbit.snapshot,after:afterOrbit.snapshot,comparison:difference(orbitBefore,orbitAfter),resourcesBefore:beforeOrbit.records,resourcesAfter:afterOrbit.records,pointData:afterOrbit.pointData,resourcesStable:true};
    assert.ok(result.orbit.comparison.meanAbsolute>.1,'Native Companion orbit reveals changing world depth');
    result.checks.push('native Companion orbit changes position and pixels with fixed physical clocks, source points and GPU objects');
    assert.equal(result.captures.length,31);assert.ok(result.captures.every(item=>item.pausedPixelsStable));
    result.resources=await page.evaluate(()=>{window.__shellScene.dispose();return window.__shellRecords.map(rec=>({buffers:rec.buffers.length,deletedBuffers:rec.deletedBuffers,textures:rec.textures.length,deletedTextures:rec.deletedTextures,programs:rec.programs.length,deletedPrograms:rec.deletedPrograms,error:rec.gl.getError()}));});
    for(const rec of result.resources){assert.deepEqual([rec.buffers,rec.deletedBuffers,rec.textures,rec.deletedTextures,rec.programs,rec.deletedPrograms],[2,2,2,2,2,2]);assert.equal(rec.error,0);}result.checks.push('all two buffers, textures and programs release without GL errors');
    assert.deepEqual(result.errors,[]);for(const[name,digest]of[['universe_flight_scene.js',result.sourceHash],['stem_tool_universe.js',uiHash]])assert.ok(result.served.some(item=>item.url.includes(name)&&item.status===200&&item.hash===digest));
    assert.equal(hash(fs.readFileSync(uiFile)),uiHash);if(phase==='refined'){assert.equal(hash(fs.readFileSync(sourceFile)),result.sourceHash);assert.deepEqual(fs.readFileSync(sourceFile),fs.readFileSync(path.join(repo,'desktop/web-app/public/stem_lab/universe_flight_scene.js')));}
    result.checks.push('served modules and final mirrors match accepted source hashes');result.completed=true;save();console.log(JSON.stringify({completed:true,phase,sourceHash:result.sourceHash,groups:result.checks.length,captures:result.captures.length,output:path.join(report,'two-arm-'+phase+'.json')},null,2));
  }finally{await browser.close();}
}
main().catch(error=>{result.failure=String(error);save();console.error(error);process.exitCode=1;});
