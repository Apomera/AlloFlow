'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const arg=name=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3);
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const rendererFile='stem_lab/universe_flight_scene.js',uiFile='stem_lab/stem_tool_universe.js';
const baselineFile=path.join(__dirname,'baseline-renderer.js');
const pins={baseline:arg('baseline-sha'),renderer:arg('renderer-sha'),ui:arg('ui-sha')};
for(const value of Object.values(pins))assert.match(value||'',/^[0-9a-f]{64}$/,'Each source SHA-256 pin is required');
const baseline=fs.readFileSync(baselineFile),renderer=fs.readFileSync(path.join(repo,rendererFile)),ui=fs.readFileSync(path.join(repo,uiFile));
function verifySources(){
  assert.equal(hash(fs.readFileSync(baselineFile)),pins.baseline,'Baseline source remains pinned');
  for(const [file,pin]of[[rendererFile,pins.renderer],[uiFile,pins.ui]]){
    const bytes=fs.readFileSync(path.join(repo,file));assert.equal(hash(bytes),pin,file+' remains pinned');
    assert.deepEqual(bytes,fs.readFileSync(path.join(repo,'desktop/web-app/public',file)),file+' mirror');
  }
}
verifySources();assert.notEqual(pins.renderer,pins.baseline,'Use the enhanced renderer and its saved baseline');
const run=arg('run');assert.match(run||'',/^nebula-browser-attempt\d+$/,'Use a fresh numbered nebula browser attempt');
const report=path.join(repo,'reports/universe-flight-2026-09-29/scenic-detail',run);
assert.ok(!fs.existsSync(report),'Use a new report directory');fs.mkdirSync(report,{recursive:true});
const manifestFile=path.join(repo,'stem_lab/assets/universe-flight/highlights/manifest.json'),manifestBytes=fs.readFileSync(manifestFile),manifest=JSON.parse(manifestBytes);
const result={completed:false,pins,harnessSha256:hash(fs.readFileSync(__filename)),manifestSha256:hash(manifestBytes),viewport:{width:640,height:400,deviceScaleFactor:1},served:[],workflows:[],comparisons:[],captures:[],errors:[]};
const save=()=>fs.writeFileSync(path.join(report,'check.json'),JSON.stringify(result,null,2)+'\n');save();
const clone=value=>JSON.parse(JSON.stringify(value));
function authored(highlight){const view=manifest.views.find(v=>v.routeId==='nebula'&&v.highlightId===highlight);assert.ok(view,'Authored '+highlight+' sample exists');return clone(view.snapshot);}
function pose(position,yaw=0,pitch=0,mode='explore',beta=.9,region='neighborhood'){
  return{version:1,settings:{mode,region,beta,compareRest:false,dust:true,fov:64,exposure:1,quality:'high'},state:{position,yaw,pitch,distanceLy:0,universeYears:0,travelerYears:0},targetId:null};
}
const blue=authored('filaments'),violet=authored('violet');
// The original violet reveal is about28.5ly from its center. Its largest
// projected wisps only begin to resolve the96px fine profile at this size.
// Preserve that diagnostic and move along the same viewing ray to16ly for
// the genuinely close sample. This changes the observer, never the sources.
const violetNear=clone(violet),violetCenter=[-22,11,83],violetRay=violet.state.position.map((value,i)=>value-violetCenter[i]),violetRange=Math.hypot(...violetRay);
violetNear.state.position=violetCenter.map((value,i)=>value+violetRay[i]*16/violetRange);
const toward=violetCenter.map((value,i)=>value-violetNear.state.position[i]);
violetNear.state.yaw=Math.atan2(toward[0],toward[2]);violetNear.state.pitch=Math.atan2(toward[1],Math.hypot(toward[0],toward[2]));
violetNear.state.distanceLy=0;
assert.ok(Math.abs(Math.hypot(...violetNear.state.position.map((value,i)=>value-violetCenter[i]))-16)<1e-12);
const blueClear=clone(blue),violetClear=clone(violetNear);blueClear.settings.dust=false;violetClear.settings.dust=false;
const rotation=clone(blue);rotation.state.yaw+=.12;rotation.state.pitch+=.04;
const cases=[
  {name:'blue-approach',snapshot:authored('approach'),expect:'diagnostic'},
  {name:'blue-filaments',snapshot:blue,expect:'different'},
  {name:'violet-reveal',snapshot:violet,expect:'diagnostic'},
  {name:'violet-near16',snapshot:violetNear,expect:'different'},
  {name:'blue-filaments-no-dust',snapshot:blueClear,expect:'different'},
  {name:'violet-near16-no-dust',snapshot:violetClear,expect:'different'},
  {name:'blue-filaments-rotated',snapshot:rotation,expect:'different'},
  {name:'far-neighborhood',snapshot:pose([0,0,-2000]),expect:'exact'},
  {name:'relativity-rest-unresolved',snapshot:pose([0,0,-2000],0,0,'relativity',0),expect:'exact'},
  {name:'relativity-fast-unresolved',snapshot:pose([0,0,-2000],0,0,'relativity',.9),expect:'exact'},
  {name:'galaxy-nonlocal',snapshot:pose([0,0,-95000],0,0,'explore',.9,'galaxy'),expect:'exact'},
  {name:'cosmic-nonlocal',snapshot:pose([0,0,-2200000],0,0,'explore',.9,'cosmic'),expect:'exact'}
];
result.samples=cases.map(c=>({name:c.name,expected:c.expect,snapshot:c.snapshot}));save();
process.env.PLAYWRIGHT_BROWSERS_PATH='C:/Users/cabba/AppData/Local/ms-playwright';
const {chromium}=require(path.join(repo,'node_modules/playwright'));
const html='<!doctype html><html><head><meta charset="utf-8"><title>Universe emission comparison</title><style>html,body{margin:0;background:#000}canvas{display:block;width:640px;height:400px}</style></head><body><canvas id="scene" width="640" height="400"></canvas><script src="/stem_lab/universe_flight_scene.js"></script><script>window.__scene=UniverseFlight.create(document.querySelector("canvas"),{quality:"high",running:false,onStatus(s){window.__status=s},onTelemetry(t){window.__telemetry=t}});</script></body></html>';
const images={baseline:{},final:{}},snapshots={baseline:{},final:{}};
function record(name,detail={}){result.workflows.push({name,...detail});save();}
(async()=>{let browser,context,page;try{
  browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  for(const variant of['baseline','final']){
    context=await browser.newContext({viewport:{width:640,height:400},deviceScaleFactor:1});page=await context.newPage();page.setDefaultTimeout(45000);
    page.on('pageerror',error=>result.errors.push({variant,error:String(error)}));
    const pending=[];page.on('response',response=>{if(new URL(response.url()).pathname==='/'+rendererFile&&response.status()===200)pending.push(response.body().then(bytes=>result.served.push({variant,file:rendererFile,sha256:hash(bytes)})));});
    await page.route('http://127.0.0.1:3187/**',route=>{
      const pathname=new URL(route.request().url()).pathname;
      if(pathname==='/reports/universe-flight-2026-09-29/nebula-render-check.html')return route.fulfill({status:200,contentType:'text/html',body:html});
      if(pathname==='/'+rendererFile)return route.fulfill({status:200,contentType:'text/javascript',body:variant==='baseline'?baseline:renderer});
      return route.fulfill({status:404,body:'Missing'});
    });
    await page.goto('http://127.0.0.1:3187/reports/universe-flight-2026-09-29/nebula-render-check.html?variant='+variant,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__scene&&window.__status?.state==='ready');
    const frames=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    async function capture(){return page.evaluate(()=>{const capture=__scene.capture();if(!capture)throw Error('Canvas capture unavailable');return{...capture,size:[document.querySelector('canvas').width,document.querySelector('canvas').height],running:__telemetry?.running};});}
    for(const sample of cases){
      assert.equal(await page.evaluate(saved=>__scene.restore(saved),sample.snapshot),true,'Restore '+sample.name);await frames();
      const first=await capture();await frames();const repeat=await capture();
      assert.deepEqual(first.size,[640,400],'Physical-pixel canvas dimensions stay fixed');
      assert.equal(first.running,false,'Restored scene stays paused');assert.equal(repeat.running,false);
      assert.equal(first.dataUrl,repeat.dataUrl,variant+' '+sample.name+' repeated capture is exact');
      assert.deepEqual(first.snapshot,repeat.snapshot,variant+' '+sample.name+' repeated state is exact');
      const expected=clone(sample.snapshot);expected.state.yaw=((expected.state.yaw%(2*Math.PI))+(2*Math.PI))%(2*Math.PI);
      assert.deepEqual(first.snapshot,expected,'Rendering preserves requested snapshot after yaw normalization');
      const bytes=Buffer.from(first.dataUrl.split(',')[1],'base64'),file=variant+'-'+sample.name+'.png';
      fs.writeFileSync(path.join(report,file),bytes);images[variant][sample.name]=first.dataUrl;snapshots[variant][sample.name]=first.snapshot;
      result.captures.push({variant,name:sample.name,file,sha256:hash(bytes),snapshot:first.snapshot});
      record(variant+'-'+sample.name+'-paused-repeat');
    }
    // A pure gaze change changes the viewpoint while position and travel clocks
    // remain fixed. Returning after other regions recreates the exact cloud view.
    const before=snapshots[variant]['blue-filaments'],turned=snapshots[variant]['blue-filaments-rotated'];
    assert.deepEqual(before.state.position,turned.state.position);for(const key of['distanceLy','universeYears','travelerYears'])assert.equal(before.state[key],turned.state[key]);
    assert.notEqual(images[variant]['blue-filaments'],images[variant]['blue-filaments-rotated'],'Rotation changes visible viewpoint');
    assert.equal(await page.evaluate(saved=>__scene.restore(saved),blue),true);await frames();const returned=await capture();
    assert.equal(returned.dataUrl,images[variant]['blue-filaments'],'Returning gaze after region changes reproduces original cloud pixels');
    assert.deepEqual(returned.snapshot,before);record(variant+'-gaze-rotation-and-exact-return');
    await Promise.all(pending);assert.ok(result.served.some(s=>s.variant===variant&&s.sha256===(variant==='baseline'?pins.baseline:pins.renderer)),'Requested renderer bytes served');
    if(variant==='baseline'){await context.close();context=null;page=null;}
  }
  for(const sample of cases){
    assert.deepEqual(snapshots.baseline[sample.name],snapshots.final[sample.name],'Renderer variants preserve exactly the same camera/settings/counters');
    const comparison=await page.evaluate(async ({baseline,final})=>{
      async function pixels(src){const image=new Image();image.src=src;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);return{bytes:ctx.getImageData(0,0,c.width,c.height).data,width:c.width,height:c.height};}
      const a=await pixels(baseline),b=await pixels(final);if(a.width!==b.width||a.height!==b.height)throw Error('Image dimensions differ');
      let changedPixels=0,absoluteDelta=0,maxDelta=0,baselineBrightness=0,finalBrightness=0;
      for(let i=0;i<a.bytes.length;i+=4){let changed=false;for(let channel=0;channel<3;channel++){const delta=Math.abs(a.bytes[i+channel]-b.bytes[i+channel]);absoluteDelta+=delta;maxDelta=Math.max(maxDelta,delta);changed=changed||delta>0;baselineBrightness+=a.bytes[i+channel];finalBrightness+=b.bytes[i+channel];}if(changed)changedPixels++;if(a.bytes[i+3]!==b.bytes[i+3])throw Error('Canvas alpha changed');}
      return{width:a.width,height:a.height,changedPixels,changedFraction:changedPixels/(a.width*a.height),meanAbsoluteChannelDelta:absoluteDelta/(a.width*a.height*3),maxDelta,baselineBrightness,finalBrightness};
    },{baseline:images.baseline[sample.name],final:images.final[sample.name]});
    result.comparisons.push({name:sample.name,expected:sample.expect,...comparison});save();
    if(sample.expect==='exact'){assert.equal(comparison.changedPixels,0,sample.name+' remains byte-exact');assert.equal(images.baseline[sample.name],images.final[sample.name],sample.name+' PNG is exact');}
    if(sample.expect==='different'){assert.ok(comparison.changedPixels>=1000,sample.name+' visibly changes at least 1,000 pixels');assert.ok(comparison.meanAbsoluteChannelDelta>=.05,sample.name+' has measurable rendered detail');}
    record(sample.name+'-baseline-final-comparison',{expected:sample.expect,changedPixels:comparison.changedPixels});
  }
  verifySources();assert.equal(hash(fs.readFileSync(manifestFile)),result.manifestSha256,'Authored samples remain unchanged');assert.deepEqual(result.errors,[]);
  result.completed=true;save();console.log(JSON.stringify({completed:true,workflows:result.workflows.length,comparisons:result.comparisons.length,captures:result.captures.length,pins}));
  await context.close();context=null;page=null;
}catch(error){result.failure=String(error.stack||error);save();if(page){try{await page.screenshot({path:path.join(report,'failure.png')});fs.writeFileSync(path.join(report,'failure-state.json'),JSON.stringify(await page.evaluate(()=>({snapshot:window.__scene?.snapshot(),status:window.__status,telemetry:window.__telemetry})),null,2));}catch{}}throw error;
}finally{if(context)await context.close();if(browser)await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
