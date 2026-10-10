'use strict';
// Real browser downloads, decoded pixels, export cancellation, and focused/mobile workflows.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const runtime=process.env.PERCEPTION_QA_RUNTIME_ROOT||process.cwd(),runtimeRequire=createRequire(path.join(runtime,'package.json'));
const {chromium}=runtimeRequire('playwright');
const read=file=>fs.readFileSync(file,'utf8'),runtimeRead=file=>read(path.join(runtime,file));
const out=path.resolve('reports/artstudio-workspace/perception-png-export');fs.mkdirSync(out,{recursive:true});
const hash=()=>crypto.createHash('sha256').update(read('stem_lab/stem_tool_perception.js')).digest('hex');
const shell=runtimeRead('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1]
  .replace('var init = {}; init[id] = state || {};','var init = {otherTool:{preserved:37}}; init[id] = state || {};')
  .replace('var ctx = { React: React','window.__state=pair[0];window.__edit=pair[1];var pp=React.useState("png-profile");window.__setProfile=pp[1];var ctx = { activeProfileId:pp[0], React: React')
  .replace('isContrast: false','isContrast:!!window.__qaContrast');
(async()=>{
 const downloadsPath=path.join(out,'.downloads');fs.mkdirSync(downloadsPath,{recursive:true});
 const browser=await chromium.launch({downloadsPath}),page=await browser.newPage({acceptDownloads:true,viewport:{width:1600,height:1100}}),sourceSHA256=hash(),checks=[],errors=[];let phase='mount';
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.route('http://localhost:47839/**',route=>route.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));await page.goto('http://localhost:47839/');
  await page.setContent('<html><head><style>'+runtimeRead('dev-tools/.cache/sweep-tailwind.css')+'</style><style>body{margin:0;font-family:system-ui}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
  for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'])await page.addScriptTag({content:runtimeRead(file)});
  for(const file of ['stem_lab/stem_lab_module.js','stem_lab/stem_tool_perception.js'])await page.addScriptTag({content:read(file)});
  await page.addScriptTag({content:runtimeRead('node_modules/axe-core/axe.min.js')});await page.addScriptTag({content:shell});
  const mount=async(state={},theme='light')=>page.evaluate(({state,theme})=>{ReactDOM.unmountComponentAtNode(document.getElementById('slot'));document.documentElement.style.fontSize='';window.__qaContrast=theme==='contrast';document.getElementById('slot').className=theme==='dark'?'theme-dark':theme==='contrast'?'theme-contrast':'theme-default';__mount('perceptionLab',theme==='dark',StemLab.PerceptionEngine.normalize(state));},{state,theme});
  const button=name=>page.getByRole('button',{name,exact:true}),state=()=>page.evaluate(()=>__state),png=page.locator('[data-perception-export-png]');
  const exportImage=async(name)=>{
   const event=page.waitForEvent('download');await button('Export PNG').click();const download=await event;const file=path.join(out,name+'.png');await download.saveAs(file);
   const data=fs.readFileSync(file);assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(data.readUInt32BE(16),2400);assert.equal(data.readUInt32BE(20),1440);
   await button('Export PNG').waitFor({state:'visible'});assert.equal(await png.isDisabled(),false);
   const pixels=await page.evaluate(async encoded=>{const image=new Image();image.src='data:image/png;base64,'+encoded;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;let opaque=true,ink=0;for(let i=0;i<data.length;i+=4){if(data[i+3]!==255)opaque=false;if(data[i]<245||data[i+1]<245||data[i+2]<245)ink++;}const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(v=>v.toString(16).padStart(2,'0')).join('');const sample=(x,y)=>Array.from(ctx.getImageData(x,y,1,1).data);return{opaque,ink,digest,corner:sample(2,2),leftCenter:sample(720,720),rightCenter:sample(1680,720)};},data.toString('base64'));
   assert(pixels.opaque);assert(pixels.ink>1000,'Export must contain actual drawing pixels.');return{filename:download.suggestedFilename(),file,pixels};
  };
  for(const id of ['brightness','ebbinghaus','mullerLyer','cafeWall','necker','moire']){
   phase='export-'+id;await mount({experiment:id});const before=await state(),result=await exportImage('drawing-'+id);
   assert.equal(result.filename,'perception-'+id+'.png');assert.deepEqual(await state(),before);
   if(id==='brightness'){assert.deepEqual(result.pixels.leftCenter,[128,128,128,255]);assert.deepEqual(result.pixels.rightCenter,[128,128,128,255]);}
   if(['brightness','ebbinghaus','mullerLyer','necker'].includes(id))assert.deepEqual(result.pixels.corner,[255,255,255,255]);
   checks.push({experiment:id,width:2400,height:1440,opaque:true,drawingPixels:true,savedStateUnchanged:true});
  }
  phase='theme-baseline';await mount({experiment:'ebbinghaus',models:{ebbinghaus:{surround:43,gap:20,reveal:true}}});const baseline=await exportImage('theme-light');
  for(const theme of ['dark','contrast','forced-light','forced-dark']){
   phase=theme;await page.emulateMedia({forcedColors:theme.startsWith('forced')?'active':'none',colorScheme:theme==='forced-dark'?'dark':'light'});await mount({experiment:'ebbinghaus',models:{ebbinghaus:{surround:43,gap:20,reveal:true}}},theme);const result=await exportImage('theme-'+theme);assert.equal(result.pixels.digest,baseline.pixels.digest);checks.push({theme,exportPixelsMatchLightTheme:true});
  }
  await page.emulateMedia({forcedColors:'none',colorScheme:'light'});
  for(const width of [320,390,768,1280,1600]){
   phase='focus-'+width;await page.setViewportSize({width,height:1000});await mount({experiment:'brightness',models:{brightness:{target:117,note:'PNG draft',prediction:'Same'}},comparison:{experiment:'brightness',model:{target:200}}});await button('Focus experiment').click();
   const before=await state(),result=await exportImage('focus-'+width);assert.deepEqual(result.pixels.leftCenter,[117,117,117,255]);assert.deepEqual(await state(),before);
   assert.equal(await page.locator('[data-perception-focus-dialog]').evaluate(node=>node.open),true);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const box=await png.boundingBox();assert(box.width>=44&&box.height>=44);
   const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('[data-perception-focus-dialog]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.length})));assert.deepEqual(violations,[]);
   await page.screenshot({path:path.join(out,'workspace-'+width+'.png')});await button('Back to workspace').click();checks.push({width,focusedExport:true,pinnedSettingsPreserved:true,controls44px:true,axe:[]});
  }
  phase='large-text';await page.setViewportSize({width:390,height:844});await mount();await page.evaluate(()=>document.documentElement.style.fontSize='32px');await button('Focus experiment').click();await exportImage('large-text');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'workspace-large-text.png')});checks.push({text200Percent:true,noOverflow:true});
  phase='matching';await mount({models:{brightness:{matching:true}}});await button('Start three matches').click();assert.equal(await png.isDisabled(),true);
  for(let i=0;i<3;i++){await button('Same').click();await button('Record match').click();assert.equal(await png.isDisabled(),true);}await button('Reveal study results').click();await exportImage('revealed-study');checks.push({studyExportHiddenUntilReveal:true});
  phase='rotation';await mount({experiment:'moire'});await button('Play slow rotation').click();await exportImage('rotation-frame');assert.equal(await button('Pause rotation').getAttribute('aria-pressed'),'true');await button('Pause rotation').click();checks.push({motionSnapshotWithoutStoppingPlayback:true});
  phase='cancel';await mount({models:{brightness:{matching:true}}});
  await page.evaluate(()=>{window.__realToBlob=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(callback,type){window.__lateEncode=()=>window.__realToBlob.call(this,callback,type);};});
  await button('Export PNG').click();await page.waitForFunction(()=>typeof __lateEncode==='function');assert.equal(await png.isDisabled(),true);await button('Start three matches').click();
  let cancelledDownload=false;const track=()=>cancelledDownload=true;page.on('download',track);await page.evaluate(()=>__lateEncode());await page.waitForFunction(()=>document.querySelector('[data-perception-export-png]').textContent==='Export PNG');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(cancelledDownload,false);page.off('download',track);await page.evaluate(()=>HTMLCanvasElement.prototype.toBlob=__realToBlob);checks.push({pendingExportCancelledWhenStudyStarts:true});
  const finalSourceSHA256=hash();assert.equal(finalSourceSHA256,sourceSHA256);assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'png-browser-results.json'),JSON.stringify({sourceSHA256,loadedSourceSHA256:sourceSHA256,finalSourceSHA256,checks,errors},null,2)+'\n');console.log(JSON.stringify({passedGroups:checks.length,sourceSHA256,errors}));
 }catch(error){fs.writeFileSync(path.join(out,'png-browser-failure.json'),JSON.stringify({phase,message:error.message,stack:error.stack,checks,errors,sourceSHA256,finalSourceSHA256:hash()},null,2)+'\n');console.error(error);process.exitCode=1;}finally{await browser.close();}
})();
