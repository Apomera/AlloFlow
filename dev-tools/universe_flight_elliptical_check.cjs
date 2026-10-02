'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const repo=process.env.UNIVERSE_REPO||path.resolve(__dirname,'..');
const report=process.env.UNIVERSE_ELLIPTICAL_REPORT||path.join(repo,'reports/universe-flight-2026-09-29/elliptical-depth');
const {chromium}=require(path.join(repo,'node_modules/playwright'));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const baseline=fs.readFileSync(path.join(report,'baseline-renderer.js'));
assert.equal(hash(baseline.toString('utf8').replace(/\r\n/g,'\n')),'e8368b21028217a56f934049fcace31effc75acf868911fe0933317ad9e7d52c','frozen prior renderer');
const source=fs.readFileSync(path.join(repo,'stem_lab/universe_flight_scene.js'));
const ui=fs.readFileSync(path.join(repo,'stem_lab/stem_tool_universe.js'));
fs.mkdirSync(report,{recursive:true});
const result={completed:false,sourceHash:hash(source),uiHash:hash(ui),baselineHash:hash(baseline),captures:[],checks:[],comparisons:[],errors:[],resources:[],geometry:[]};
const save=()=>fs.writeFileSync(path.join(report,'check.json'),JSON.stringify(result,null,2)+'\n');
function png(bytes){
  let width,height,channels,offset=8;const chunks=[];
  assert.equal(bytes.subarray(1,4).toString(),'PNG');
  while(offset<bytes.length){const length=bytes.readUInt32BE(offset),type=bytes.subarray(offset+4,offset+8).toString(),data=bytes.subarray(offset+8,offset+8+length);offset+=length+12;if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);assert.equal(data[8],8);assert.ok([2,6].includes(data[9]));channels=data[9]===6?4:3;}else if(type==='IDAT')chunks.push(data);else if(type==='IEND')break;}
  const raw=zlib.inflateSync(Buffer.concat(chunks)),stride=width*channels,pixels=Buffer.alloc(stride*height);
  function paeth(a,b,c){const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);return da<=db&&da<=dc?a:db<=dc?b:c;}
  for(let y=0;y<height;y++)for(let x=0;x<stride;x++){const i=y*stride+x,f=raw[y*(stride+1)],a=x>=channels?pixels[i-channels]:0,b=y?pixels[i-stride]:0,c=y&&x>=channels?pixels[i-stride-channels]:0;assert.ok(f<=4);pixels[i]=(raw[y*(stride+1)+1+x]+(f===0?0:f===1?a:f===2?b:f===3?(a+b)>>1:paeth(a,b,c)))&255;}
  return {width,height,channels,pixels};
}
function statistics(bytes){const image=png(bytes);let warm=0,clipped=0,sum=0,minX=image.width,minY=image.height,maxX=-1,maxY=-1;for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){const i=(y*image.width+x)*image.channels,r=image.pixels[i],g=image.pixels[i+1],b=image.pixels[i+2];sum+=.2126*r+.7152*g+.0722*b;if(Math.min(r,g,b)>=250)clipped++;if(r>8&&r>g*1.15&&r>b*1.35){warm++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}return {width:image.width,height:image.height,warmPixels:warm,meanLuminance:sum/(image.width*image.height),clippedWhiteFraction:clipped/(image.width*image.height),bounds:maxX<0?null:{width:maxX-minX+1,height:maxY-minY+1}};}
const center=[800000,550000,850000],tilt=1.05,turn=-.55;
function world(local){const ty=local[1]*Math.cos(tilt)-local[2]*Math.sin(tilt),tz=local[1]*Math.sin(tilt)+local[2]*Math.cos(tilt);return [local[0]*Math.cos(turn)-ty*Math.sin(turn),local[0]*Math.sin(turn)+ty*Math.cos(turn),tz];}
function view(name,direction,extra={}){const d=world(direction),length=Math.hypot(...d);return {name,position:center.map((c,i)=>c+d[i]*480000/length),aim:center,fov:50,region:'cosmic',...extra};}
const views=[view('face',[0,1,0]),view('side-x',[1,0,0]),view('side-z',[0,0,1]),view('oblique',[.7,.35,.6]),view('low-exposure',[1,0,0],{exposure:.45}),view('relativity',[.7,.35,.6],{mode:'relativity',beta:.6}),{name:'spiral',position:[0,0,-95000],aim:[0,0,0],fov:60,region:'galaxy'},{name:'nebula',position:[13,-7,24],aim:[9,-2,34],fov:50,region:'neighborhood'}];
async function settled(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function pose(page,view){await page.evaluate(v=>{const scene=window.__ellipseScene,saved=scene.snapshot(),d=v.aim.map((x,i)=>x-v.position[i]);Object.assign(saved.settings,{mode:v.mode||'explore',region:v.region,beta:v.beta||0,compareRest:false,quality:'auto',fov:v.fov,exposure:v.exposure||1});Object.assign(saved.state,{position:v.position,yaw:Math.atan2(d[0],d[2]),pitch:Math.atan2(d[1],Math.hypot(d[0],d[2])),distanceLy:0,universeYears:0,travelerYears:0});saved.targetId=null;if(!scene.restore(saved))throw new Error('Rejected pose');if(v.mode==='relativity'&&!scene.frameTarget('golden-elliptical',.5))throw new Error('Relativistic framing rejected');scene.set({running:false});},view);await settled(page);}
(async()=>{
  save();const served=await fetch('http://127.0.0.1:3187/stem_lab/universe_flight_scene.js');assert.equal(served.status,200);assert.equal(hash(Buffer.from(await served.arrayBuffer())),hash(source));
  const browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const images=new Map(),populations={};
  try{
    for(const phase of ['baseline','refined']){
      const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>result.errors.push(String(e)));let interceptions=0;
      if(phase==='baseline')await page.route(/universe_flight_scene\.js(?:\?.*)?$/,async route=>{interceptions++;await route.fulfill({contentType:'application/javascript',body:baseline});});
      await page.addInitScript(()=>{
        const original=HTMLCanvasElement.prototype.getContext;window.__ellipseGL=[];window.__ellipseOnly=false;
        HTMLCanvasElement.prototype.getContext=function(type,...args){const gl=original.call(this,type,...args);if(type!=='webgl'||!gl||gl.__ellipseProbe)return gl;gl.__ellipseProbe=true;const r={createdTextures:0,deletedTextures:0,createdBuffers:0,deletedBuffers:0,createdPrograms:0,deletedPrograms:0,subUploads:0,points:[],gl};window.__ellipseGL.push(r);
          for(const [create,remove,label] of [['createTexture','deleteTexture','Textures'],['createBuffer','deleteBuffer','Buffers'],['createProgram','deleteProgram','Programs']]){const c=gl[create].bind(gl),d=gl[remove].bind(gl);gl[create]=function(){r['created'+label]++;return c();};gl[remove]=function(resource){if(resource)r['deleted'+label]++;return d(resource);};}
          const data=gl.bufferData.bind(gl),sub=gl.bufferSubData.bind(gl),draw=gl.drawArrays.bind(gl);
          gl.bufferData=function(target,values,...rest){if(values instanceof Float32Array&&[19203,36400,41470].includes(values.length/9)){const bytes=new Uint8Array(values.buffer,values.byteOffset,values.byteLength);r.points.push({count:values.length/9,pending:crypto.subtle.digest('SHA-256',bytes).then(buffer=>Array.from(new Uint8Array(buffer)).map(v=>v.toString(16).padStart(2,'0')).join(''))});}return data(target,values,...rest);};
          gl.bufferSubData=function(...args){r.subUploads++;return sub(...args);};
          gl.drawArrays=function(mode,first,count){if(window.__ellipseOnly){if(mode!==gl.TRIANGLES)return;return draw(mode,384*3,384);}return draw(mode,first,count);};return gl;};
        let api;Object.defineProperty(window,'UniverseFlight',{configurable:true,get(){return api;},set(value){const create=value.create;value.create=function(canvas,options){const status=options.onStatus;const scene=create.call(this,canvas,{...options,onStatus(info){window.__ellipseStatus=info;if(status)status(info);}});window.__ellipseScene=scene;window.__ellipseCanvas=canvas;return scene;};api=value;}});
      });
      await page.goto('http://127.0.0.1:3187/reports/universe-flight-2026-09-29/preview.html?elliptical=qa#universe-flight');await page.waitForFunction(()=>window.__ellipseScene&&window.__ellipseStatus?.state==='ready');
      if(phase==='baseline')assert.ok(interceptions>0,'actual baseline interception');
      await page.getByRole('button',{name:'Toggle full screen for the 3D view',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);
      const hide=page.getByRole('button',{name:'Hide overlay',exact:true});if(await hide.count())await hide.click();
      const canvas=page.locator('canvas[aria-describedby="uf-scene-description"]');assert.equal(await canvas.count(),1);
      for(const v of views){await pose(page,v);const bytes=await canvas.screenshot(),file=phase+'-'+v.name+'.png';fs.writeFileSync(path.join(report,file),bytes);images.set(phase+':'+v.name,bytes);result.captures.push({phase,name:v.name,file,hash:hash(bytes),statistics:statistics(bytes)});
        if(['face','side-x','side-z','oblique'].includes(v.name)){await page.evaluate(()=>{window.__ellipseOnly=true;window.__ellipseScene.set({exposure:1});});await settled(page);const only=await canvas.screenshot(),onlyFile=phase+'-'+v.name+'-diffuse.png';fs.writeFileSync(path.join(report,onlyFile),only);images.set(phase+':'+v.name+':diffuse',only);result.captures.push({phase,name:v.name+'-diffuse',file:onlyFile,hash:hash(only),statistics:statistics(only)});await page.evaluate(()=>{window.__ellipseOnly=false;window.__ellipseScene.set({exposure:1});});await settled(page);}
      }
      await pose(page,views[3]);const frozen=await canvas.screenshot(),before=await page.evaluate(()=>({state:window.__ellipseScene.snapshot(),uploads:window.__ellipseGL[0].subUploads}));await page.waitForTimeout(220);assert.equal(hash(await canvas.screenshot()),hash(frozen),'paused pixels remain frozen');
      await page.evaluate(()=>{window.__ellipseScene.look(.18,.07);window.__ellipseScene.set({fov:62,exposure:.8});});await settled(page);assert.equal(await page.evaluate(()=>window.__ellipseGL[0].subUploads),before.uploads,'look, lens, exposure do not rebuild diffuse surface');
      result.geometry.push({phase,pausedUploads:before.uploads,frozenPixels:hash(frozen),lookReusedSurface:true});
      populations[phase]=await page.evaluate(async()=>{const output={};for(const item of window.__ellipseGL[0].points)output[item.count]=await item.pending;return output;});
      assert.deepEqual(Object.keys(populations[phase]).sort(),['19203','36400','41470'],'all three point populations captured');
      await page.evaluate(()=>window.__ellipseScene.dispose());const resource=await page.evaluate(()=>{const {gl,points,...counts}=window.__ellipseGL[0];return {...counts,error:gl.getError()};});result.resources.push({phase,...resource});assert.deepEqual([resource.createdTextures,resource.deletedTextures,resource.createdBuffers,resource.deletedBuffers,resource.createdPrograms,resource.deletedPrograms,resource.error],[2,2,2,2,2,2,0]);await page.close();
    }
    assert.deepEqual(populations.refined,populations.baseline,'all three generated point buffers preserved');result.pointHashes=populations.refined;result.checks.push('All three point buffers preserve their frozen baseline bytes');
    for(const name of ['spiral','nebula']){assert.equal(hash(images.get('baseline:'+name)),hash(images.get('refined:'+name)),name+' rendered pixels unchanged');result.checks.push(name+' fixed view matches baseline pixels exactly');}
    for(const name of ['side-x','side-z']){const a=statistics(images.get('baseline:'+name+':diffuse')),b=statistics(images.get('refined:'+name+':diffuse'));assert.ok(b.warmPixels>Math.max(500,a.warmPixels*5),'rounded side halo is substantial');assert.ok(b.bounds&&Math.min(b.bounds.width,b.bounds.height)>100,'side halo retains two dimensions');result.comparisons.push({name,baseline:a,refined:b});}
    const faceBefore=statistics(images.get('baseline:face:diffuse')),faceAfter=statistics(images.get('refined:face:diffuse'));assert.ok(Math.abs(faceAfter.warmPixels/faceBefore.warmPixels-1)<.03,'face-on extent retains its original profile');result.comparisons.push({name:'face',baseline:faceBefore,refined:faceAfter});
    assert.ok(result.captures.every(c=>c.statistics.clippedWhiteFraction<.01),'captures retain bounded highlight clipping');assert.deepEqual(result.errors,[]);result.checks.push('Side-on diffuse halos retain breadth; face-on extent stays within 3%','Paused pixels and look-only geometry remain stable','Two textures, buffers, and programs released per scene; no page or WebGL errors');
    assert.deepEqual(fs.readFileSync(path.join(repo,'stem_lab/universe_flight_scene.js')),source,'renderer remained unchanged during captures');
    assert.deepEqual(fs.readFileSync(path.join(repo,'stem_lab/stem_tool_universe.js')),ui,'UI remained unchanged during captures');
    result.served=[];
    for(const [file,digest] of [['universe_flight_scene.js',hash(source)],['stem_tool_universe.js',hash(ui)]]){const response=await fetch('http://127.0.0.1:3187/stem_lab/'+file);assert.equal(response.status,200);assert.equal(hash(Buffer.from(await response.arrayBuffer())),digest,'final served '+file);result.served.push({file,status:response.status,hash:digest});}
    result.completed=true;save();console.log(JSON.stringify({completed:true,captures:result.captures.length,checks:result.checks.length,comparisons:result.comparisons,sourceHash:result.sourceHash},null,2));
  }catch(error){result.failure=String(error);save();throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
