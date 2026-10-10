'use strict';
// Render the existing authored highlights once for lightweight discovery cards.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),relative='stem_lab/assets/universe-flight/highlights',folder=path.join(root,relative),mirror=path.join(root,'desktop/web-app/public',relative);
const source=fs.readFileSync(path.join(root,'stem_lab/universe_flight_scene.js')),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const mode=process.argv[2];assert.ok(['--build','--check'].includes(mode),'Use --build or --check');
function verify(allowPrevious){
 const bytes=fs.readFileSync(path.join(folder,'manifest.json')),manifest=JSON.parse(bytes);
 assert.equal(manifest.version,1);assert.ok(allowPrevious?[12,15].includes(manifest.views.length):manifest.views.length===15);assert.equal(new Set(manifest.views.map(v=>v.file)).size,manifest.views.length);if(!allowPrevious)assert.equal(manifest.rendererHash,hash(source));
 assert.deepEqual(bytes,fs.readFileSync(path.join(mirror,'manifest.json')));
 for(const view of manifest.views){assert.match(view.file,/^(halo|nebula|group|stellar|disk)-[a-z-]+\.webp$/);const image=fs.readFileSync(path.join(folder,view.file));assert.equal(image.toString('ascii',0,4),'RIFF');assert.equal(image.toString('ascii',8,12),'WEBP');assert.equal(hash(image),view.hash);assert.equal(image.length,view.bytes);assert.deepEqual(image,fs.readFileSync(path.join(mirror,view.file)));}
 return manifest;
}
async function main(){
 if(mode==='--check'){const manifest=verify();console.log(JSON.stringify({completed:true,views:manifest.views.length,bytes:manifest.views.reduce((n,v)=>n+v.bytes,0)}));return;}
 if(fs.existsSync(path.join(folder,'manifest.json')))verify(true);
 fs.mkdirSync(folder,{recursive:true});fs.mkdirSync(mirror,{recursive:true});
 const {chromium}=require(path.join(root,'node_modules/playwright'));
 const browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:480,height:300},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.setContent('<!doctype html><html><body style="margin:0;background:#030912"><canvas width="480" height="300" style="display:block;width:480px;height:300px"></canvas></body></html>');
  await page.addScriptTag({path:path.join(root,'stem_lab/universe_flight_scene.js')});
  await page.evaluate(()=>{window.previewCanvas=document.querySelector('canvas');window.previewScene=UniverseFlight.create(previewCanvas,{onStatus(s){window.previewStatus=s;},onTelemetry(i){window.previewInfo=i;}});});
  await page.waitForFunction(()=>window.previewStatus?.state==='ready');
  const catalog=await page.evaluate(()=>UniverseFlight.flybys());const views=[];
  for(const route of catalog)for(const highlight of route.highlights){
   const view=await page.evaluate(async({route,highlight})=>{
    previewScene.set({mode:'explore',region:route.region,fov:route.fov,exposure:route.id==='stellar'?.86:1,quality:'high',running:false});
    if(!previewScene.startFlyby(route.id)||!previewScene.seekFlybyHighlight(highlight.id))throw new Error('Highlight unavailable');
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const first=previewScene.capture();await new Promise(r=>requestAnimationFrame(r));const second=previewScene.capture();
    if(first.dataUrl!==second.dataUrl||JSON.stringify(first.snapshot)!==JSON.stringify(second.snapshot))throw new Error('Unstable paused preview');
    return{snapshot:first.snapshot,width:previewCanvas.width,height:previewCanvas.height,image:previewCanvas.toDataURL('image/webp',.88),seconds:previewInfo.flyby.elapsedSeconds,glError:previewCanvas.getContext('webgl').getError()};
   },{route,highlight});
   assert.equal(view.seconds,highlight.seconds);assert.equal(view.glError,0);assert.equal(view.width,480);assert.equal(view.height,300);assert.equal(view.snapshot.targetId,highlight.targetId);
   const file=route.id+'-'+highlight.id+'.webp',bytes=Buffer.from(view.image.split(',')[1],'base64');assert.ok(bytes.length>500&&bytes.length<100000);assert.equal(bytes.toString('ascii',8,12),'WEBP');
   for(const directory of[folder,mirror])fs.writeFileSync(path.join(directory,file),bytes);
   views.push({routeId:route.id,highlightId:highlight.id,name:highlight.name,seconds:view.seconds,file,width:view.width,height:view.height,bytes:bytes.length,hash:hash(bytes),snapshot:view.snapshot});
  }
  await page.evaluate(()=>previewScene.dispose());assert.deepEqual(errors,[]);assert.equal(hash(fs.readFileSync(path.join(root,'stem_lab/universe_flight_scene.js'))),hash(source));
  const manifest={version:1,rendererHash:hash(source),description:'Generated views of the authored Universe flight highlights at their launch lens and exposure. Procedural teaching scenery.',views};
  const json=JSON.stringify(manifest,null,2)+'\n';for(const directory of[folder,mirror])fs.writeFileSync(path.join(directory,'manifest.json'),json);
  verify();
  // A contact sheet makes all fifteen generated views easy to review together.
  const cards=views.map(v=>'<figure><img src="data:image/webp;base64,'+fs.readFileSync(path.join(folder,v.file)).toString('base64')+'"><figcaption>'+v.routeId+' · '+v.name+' · '+v.seconds+'s</figcaption></figure>').join('');
  await page.setViewportSize({width:1200,height:880});await page.setContent('<!doctype html><html><head><style>body{margin:0;padding:18px;background:#07111e;color:#d8eaf4;font:14px sans-serif;display:grid;grid-template-columns:repeat(4,1fr);gap:14px}figure{margin:0}img{display:block;width:100%;aspect-ratio:1.6;border-radius:8px}figcaption{padding:8px 0;line-height:1.4}</style></head><body>'+cards+'</body></html>');
  const report=process.env.UNIVERSE_PREVIEW_REPORT||path.join(root,'reports/universe-flight-2026-09-29/storyboard');fs.mkdirSync(report,{recursive:true});await page.screenshot({path:path.join(report,'contact-sheet.png'),fullPage:true});
  console.log(JSON.stringify({completed:true,views:views.length,bytes:views.reduce((n,v)=>n+v.bytes,0),rendererHash:manifest.rendererHash}));
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
