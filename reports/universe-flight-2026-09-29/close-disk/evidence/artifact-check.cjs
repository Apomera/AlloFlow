'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const stage=__dirname,repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(stage,'artifact-report');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const pins={baseline:'8121868ef2aa764c5e3e88284089ebf76fe0c9e1ec264ee4ae95fe434d7e9bc9',candidate:'6f1267255407b7de52bb685922281301fef58de9c91cc8a036577a7c317e56e8'};
const sources=Object.fromEntries(Object.keys(pins).map(phase=>{const value=fs.readFileSync(path.join(stage,phase+'-renderer.js'),'utf8');assert.equal(sha(value),pins[phase]);return[phase,value];}));
process.env.PLAYWRIGHT_BROWSERS_PATH='C:/Users/cabba/AppData/Local/ms-playwright';
const {chromium}=require(path.join(repo,'node_modules/playwright'));
fs.mkdirSync(report,{recursive:true});
assert.ok(!fs.existsSync(path.join(report,'check.json')),'Initial driver never overwrites a previous outcome');
const result={completed:false,pins,harnessSha256:sha(fs.readFileSync(__filename)),matrix:[],captures:[],proof:{},comparisons:[],resources:[],stability:[],errors:[],scope:'Exact recorded 57 near-disk pose replay, isolated surfaces and full scene; no physical photometry claim.'};
const save=()=>fs.writeFileSync(path.join(report,'check.json'),JSON.stringify(result,null,2)+'\n');
const images=new Map();
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
  const draw=gl.drawArrays.bind(gl),use=gl.useProgram.bind(gl);let active;gl.useProgram=program=>{active=program;return use(program);};gl.drawArrays=(mode,first,count)=>{if(__selection.layer==='full')return draw(mode,first,count);if(active!==__programs[1])return;draw(mode,0,384);draw(mode,384,384);draw(mode,768,384);};
  return gl;
 };
}

const poseRecord=JSON.parse(fs.readFileSync(path.join(stage,'artifact-pose.json')));
const cases=[{name:'legacy-near-isolated',layer:'target'},{name:'legacy-near-full',layer:'full'}];result.matrix=cases;result.pose=poseRecord;
async function settled(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
(async()=>{save();let browser;try{
 browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const phase of ['baseline','candidate']){
  const context=await browser.newContext({viewport:{width:720,height:480},deviceScaleFactor:1}),page=await context.newPage();page.on('pageerror',error=>result.errors.push({phase,error:String(error)}));page.on('console',message=>{if(message.type()==='error')result.errors.push({phase,error:message.text()});});
  await page.route('http://127.0.0.1:3187/artifact-native',route=>route.fulfill({contentType:'text/html',body:'<style>body{margin:0;background:#000}canvas{display:block;width:720px;height:480px}</style><canvas></canvas>'}));await page.goto('http://127.0.0.1:3187/artifact-native');await page.evaluate(probeInstall);await page.addScriptTag({content:sources[phase]});
  await page.evaluate(()=>{window.__scene=UniverseFlight.create(document.querySelector('canvas'),{onStatus(status){window.__status=status;}});});await page.waitForFunction(()=>__status?.state==='ready');
  for(const spec of cases){await page.evaluate(({snapshot,layer})=>{__selection={layer};if(!__scene.restore(snapshot))throw new Error('Exact recorded snapshot rejected');__scene.set({running:false});},{snapshot:poseRecord.snapshot,layer:spec.layer});await settled(page);
   const capture=await page.evaluate(()=>{const value=__scene.capture();if(!value)throw new Error('Capture failed');return{dataUrl:value.dataUrl,snapshot:__scene.snapshot(),marker:__probe.planeMarkers[0],finite:__probe.finiteUploads,glError:__probe.gl.getError()};});const bytes=Buffer.from(capture.dataUrl.split(',')[1],'base64'),file=phase+'-'+spec.name+'.png';delete capture.dataUrl;fs.writeFileSync(path.join(report,file),bytes);images.set(phase+':'+spec.name,bytes);result.captures.push({phase,name:spec.name,file,hash:sha(bytes),statistics:stats(bytes),...capture});assert.equal(capture.glError,0);assert.equal(capture.finite,true);console.log(phase+' '+spec.name);save();
  }
  await page.evaluate(()=>__scene.dispose());const r=await page.evaluate(async()=>{await Promise.all(__probe.pending);const{gl,pending,lastProjection,planeMarkers,...counts}=__probe;return{...counts,error:gl.getError(),lost:gl.isContextLost()};});for(const label of['Textures','Buffers','Programs','Shaders'])assert.equal(r['created'+label],r['deleted'+label]);assert.deepEqual([r.createdTextures,r.createdBuffers,r.createdPrograms,r.createdShaders],[2,2,2,4]);assert.equal(r.error,0);assert.equal(r.lost,false);assert.equal(r.finiteUploads,true);result.resources.push({phase,...r});await context.close();save();
 }
 for(const spec of cases){const a=result.captures.find(c=>c.phase==='baseline'&&c.name===spec.name),b=result.captures.find(c=>c.phase==='candidate'&&c.name===spec.name);assert.deepEqual(a.snapshot,b.snapshot,'Exact camera preserved');result.comparisons.push({name:spec.name,baseline:a.statistics,candidate:b.statistics,delta:difference(images.get('baseline:'+spec.name),images.get('candidate:'+spec.name))});if(spec.layer==='target'){assert.equal(a.hash,poseRecord.sourceImageSha256,'Replay reproduces exact recorded 57 isolated artifact pixels');assert.ok(a.statistics.sumLuminance>1000000);assert.ok(b.statistics.sumLuminance<a.statistics.sumLuminance*.01,'Triangle RGB removed');assert.equal(b.marker,.5,'Interior map fully hands off');}else{assert.ok(b.statistics.sumLuminance>1000000&&b.statistics.nonblackPixels>10000,'Full scene retains meaningful 3D/background signal');assert.ok(b.statistics.sumLuminance<a.statistics.sumLuminance,'Invalid overlay removed');}}
 assert.deepEqual(result.errors,[]);assert.deepEqual(result.resources[0].atlasUploads,result.resources[1].atlasUploads);result.completed=true;save();console.log(JSON.stringify({completed:true,captures:4,harnessSha256:result.harnessSha256},null,2));
}catch(error){result.failure=String(error);save();throw error;}finally{if(browser)await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
