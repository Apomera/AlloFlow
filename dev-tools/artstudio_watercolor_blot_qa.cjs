const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),read=file=>fs.readFileSync(file,'utf8'),out=path.resolve('reports/artstudio-workspace');
const shell=read('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1]
 .replace('var ctx = { React: React','var saved=React.useState([]);window.__saved=saved[0];window.__edit=pair[1];window.__state=pair[0];var ctx = { React: React')
 .replace('setToolSnapshots: function(){},','setToolSnapshots: saved[1],').replace('toolSnapshots: [],','toolSnapshots: saved[0],');
(async()=>{
 const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],checks=[];
 page.on('pageerror',error=>errors.push(error.message));const paper=page.locator('#watercolorCanvas'),workspace=page.locator('#watercolorFullscreenWorkspace');
 const png=()=>paper.evaluate(node=>node._watercolorEngine.captureExport());
 const summary=()=>paper.evaluate(node=>{const s=node._watercolorEngine.captureState(),sum=a=>a.reduce((n,v)=>n+v,0);return {water:sum(s.water),mobile:sum(s.pigmentDensity),fixed:sum(s.stainDensity),mask:sum(s.mask),paused:s.paused};});
 const range=async(name,value)=>page.getByRole('slider',{name,exact:true}).evaluate((node,next)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,String(next));node.dispatchEvent(new Event('input',{bubbles:true}));},value);
 const stroke=async()=>{const b=await paper.boundingBox();await page.mouse.move(b.x+b.width*70/192,b.y+b.height*96/192);await page.mouse.down();await page.mouse.move(b.x+b.width*122/192,b.y+b.height*96/192,{steps:8});await page.mouse.up();};
 try{
  // Use an intercepted local origin so the real IndexedDB study store is
  // available. An opaque about:blank origin can only restore the PNG fallback.
  await page.route('http://localhost:47831/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
  await page.goto('http://localhost:47831/');
  await page.setContent('<!doctype html><html><head><style>'+read('dev-tools/.cache/sweep-tailwind.css')+'</style><style>body{margin:0;font-family:system-ui}*{box-sizing:border-box}</style></head><body><div id="slot"></div></body></html>');
  for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_artstudio.js'])await page.addScriptTag({content:read(file)});
  await page.addScriptTag({content:shell});await page.evaluate(()=>__mount('artStudio',false,{tab:'watercolor',studioStarted:true,studioHome:false,watercolorFlowDirection:'none',watercolorSize:42,watercolorDrying:0,watercolorHumidity:100,watercolorAirflow:0}));await paper.waitFor();
  await paper.evaluate(node=>{
   const e=node._watercolorEngine;e.togglePause();const s=e.captureState();
   for(let y=55;y<=137;y++)for(let x=35;x<=157;x++){
    const i=y*192+x,r=Math.hypot((x-96)/64,(y-96)/43);if(r>1)continue;const m=.62;
    s.water[i]=.46;s.pigmentDensity[i]=m;s.pigmentR[i]=m*.18;s.pigmentG[i]=m*.43;s.pigmentB[i]=m*.69;s.pigmentStainingMass[i]=m*.32;s.pigmentOpacityMass[i]=m*.1;s.pigmentGranulationMass[i]=m*.35;s.pigmentMobilityMass[i]=m*.65;
    for(const c of ['R','G','B'])s['pigmentMobility'+c+'Mass'][i]=s['pigment'+c][i]*.65;
    s.stainDensity[i]=.08;s.stainR[i]=.05;s.stainG[i]=.03;s.stainB[i]=.015;s.stainStainingMass[i]=.07;
   }
   for(let y=87;y<=105;y++)for(let x=93;x<=98;x++)s.mask[y*192+x]=1;
   e.restoreState(s);window.__blotSeed=e.captureState();
  });
  await workspace.getByRole('button',{name:/ Blot$/,exact:false}).click();const strength=page.getByRole('slider',{name:'Blot strength',exact:true});assert.equal(await strength.inputValue(),'70');
  for(const name of ['Water','Pigment'])assert(await page.getByRole('slider',{name,exact:true}).isDisabled());await range('Blot strength',85);assert.equal(await page.evaluate(()=>__state.artStudio.watercolorBlotting),85);checks.push('Actual Blot selection exposes strength, keeps help associated, and disables inactive Water and Pigment loads');
  await page.getByRole('button',{name:'Expand watercolor canvas',exact:true}).click();await page.waitForFunction(()=>document.getElementById('watercolorCanvas').getBoundingClientRect().width>700);
  const desktop=await paper.boundingBox();const beforePNG=await png(),before=await summary();await stroke();const afterPNG=await png(),after=await summary();assert(after.water<before.water && after.mobile<before.mobile);assert.equal(after.fixed,before.fixed);assert.equal(after.mask,before.mask);assert.notEqual(afterPNG,beforePNG);
  const preservation=await paper.evaluate(node=>{const s=node._watercolorEngine.captureState(),b=__blotSeed;let masked=true,dry=true;for(let i=0;i<s.water.length;i++){if(b.mask[i]===1&&(s.water[i]!==b.water[i]||s.pigmentDensity[i]!==b.pigmentDensity[i]))masked=false;if(b.water[i]===0&&s.pigmentDensity[i]!==b.pigmentDensity[i])dry=false;}window.__blotAfter=s;return {masked,dry};});assert(preservation.masked&&preservation.dry);
  checks.push({desktopCanvas:desktop,backing:[1024,1024],pickup:{before,after,preservation}});
  await page.locator('#artstudio-watercolor-undo').click();const undo=await paper.evaluate(node=>{const s=node._watercolorEngine.captureState();return Math.max(...s.water.map((v,i)=>Math.abs(v-__blotSeed.water[i])));});assert(undo<.00006);await page.locator('#artstudio-watercolor-redo').click();const redo=await paper.evaluate(node=>{const s=node._watercolorEngine.captureState();return Math.max(...s.pigmentDensity.map((v,i)=>Math.abs(v-__blotAfter.pigmentDensity[i])));});assert(redo<.00006);checks.push({visibleHistory:{undoMaxWaterError:undo,redoMaxPigmentError:redo}});
  await strength.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'watercolor-blot-desktop.png')});
  const finalPNG=await png(),downloadEvent=page.waitForEvent('download');await workspace.getByRole('button',{name:'Export PNG',exact:true}).click();const download=await downloadEvent;await download.saveAs(path.join(out,'watercolor-blot-export.png'));assert.deepEqual(fs.readFileSync(path.join(out,'watercolor-blot-export.png')),Buffer.from(finalPNG.split(',')[1],'base64'));checks.push('The visible Export PNG action downloads the exact 1024-pixel painting');
  await page.getByRole('button',{name:'Exit expanded watercolor canvas (Esc)',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement&&!document.getElementById('watercolorFullscreenWorkspace').hasAttribute('data-allo-fullscreen-active'));
  await page.locator('summary[aria-label="Studio actions"]').click();await page.getByRole('button',{name:'Save current study',exact:true}).click();await page.waitForFunction(()=>__saved.length===1);const saved=await page.evaluate(()=>({snapshot:__saved[0].data.watercolorSnapshot,brush:__saved[0].data.watercolorBrush,strength:__saved[0].data.watercolorBlotting}));assert.equal(saved.brush,'blot');assert.equal(saved.strength,85);assert(saved.snapshot.startsWith('data:image/png'));
  await workspace.getByRole('button',{name:'Clear',exact:true}).click();if(await page.locator('#artstudio-process-button').getAttribute('aria-expanded')!=='true')await page.locator('#artstudio-process-button').click();await page.getByRole('button',{name:/^Fork /}).click();await page.waitForFunction(()=>{const c=document.getElementById('watercolorCanvas');return c&&c._watercolorEngine.captureState().pigmentDensity.some(v=>v>0);});
  const restored=await summary();assert(Math.abs(restored.mobile/after.mobile-1)<.001);assert(Math.abs(restored.water/after.water-1)<.001);assert.equal(await page.evaluate(()=>__saved[0].data.watercolorSnapshot),saved.snapshot);checks.push({savedStudy:{brush:saved.brush,strength:saved.strength,restored,originalUnchanged:true}});
  for(const width of [390,320]){
   await page.setViewportSize({width,height:844});await strength.scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const height=await strength.evaluate(node=>node.getBoundingClientRect().height);assert(height>=44);assert((await summary()).mobile>0);checks.push({phoneWidth:width,strengthHeight:height,noHorizontalOverflow:true});
   await page.screenshot({path:path.join(out,'watercolor-blot-phone-'+width+'.png')});
  }
  const sheet=await browser.newPage({viewport:{width:1140,height:670}});await sheet.setContent('<html><body style="margin:0;padding:24px;background:#f1f5f9;font:16px system-ui;color:#0f172a"><h1 style="margin:0 0 8px;font-size:24px">Watercolor: blotting a wet wash</h1><p style="margin:0 0 16px">An absorbent tool takes up water and loose pigment. The masked stripe and settled underpainting remain intact.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">'+[['Before blotting',beforePNG],['After one stroke',afterPNG]].map(([label,src])=>'<figure style="margin:0;padding:12px;background:white;border-radius:12px"><figcaption style="margin-bottom:8px;font-weight:700">'+label+'</figcaption><img src="'+src+'" style="display:block;width:100%"/></figure>').join('')+'</div></body></html>');await sheet.screenshot({path:path.join(out,'watercolor-blot-comparison.png')});await sheet.close();
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'watercolor-blot-browser-results.json'),JSON.stringify({passed:true,checks,errors},null,2));console.log(JSON.stringify({passed:true,checks}));
 }catch(error){fs.writeFileSync(path.join(out,'watercolor-blot-browser-results.json'),JSON.stringify({passed:false,checks,errors,failure:String(error)},null,2));await page.screenshot({path:path.join(out,'watercolor-blot-failure.png')});throw error;}
 finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
