const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
// The app loads optional remote fonts; capture the actual rendered fallback rather than waiting for an unavailable font.
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const {buildSync}=require('esbuild'),{chromium}=require('playwright');
const before=process.argv.includes('--before'),dir=__dirname,bundle=path.join(dir,'harness.cjs');
if(before)assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_solarsystem.js')).digest('hex'),'2fa42601621962deae9ea800a14ac27ee3978d02ae1f6a979a2a46f6f633f521','Baseline has changed; preserve the original attempt log instead of recapturing.');
buildSync({entryPoints:['tests/e2e/helpers/stem_gl_harness.ts'],outfile:bundle,bundle:true,platform:'node',format:'cjs',external:['@playwright/test']});
const {GlHarness}=require('./harness.cjs');
function contrast(panel){
 const rgba=c=>c.match(/[\d.]+/g).map(Number),lum=c=>c.slice(0,3).map(v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 return Math.min(...[...panel.querySelectorAll('h4,h5,p,label,span,strong,button,dt,dd,div,li,a,output,th,td')].filter(n=>n.textContent.trim()&&!n.children.length&&n.getBoundingClientRect().height&&!n.closest('svg,[aria-hidden="true"],.sr-only,button:disabled')).map(n=>{
  const layers=[];for(let p=n;p;p=p.parentElement){const c=rgba(getComputedStyle(p).backgroundColor);layers.unshift(c);if((c[3]??1)>=1)break;}
  let bg=[255,255,255];for(const c of layers)bg=bg.map((v,i)=>c[i]*(c[3]??1)+v*(1-(c[3]??1)));
  const a=lum(rgba(getComputedStyle(n).color)),b=lum(bg);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 }));
}
function record(phase){const dec=23.44*Math.sin(phase/100*2*Math.PI),r=d=>d*Math.PI/180,h=lat=>24*Math.acos(-Math.tan(r(lat))*Math.tan(r(dec)))/Math.PI;return{world:'Earth',phase,northHours:h(45),southHours:h(-45),northNoon:90-Math.abs(45-dec),southNoon:90-Math.abs(-45-dec)};}
(async()=>{
 const harness=new GlHarness({toolFile:before?'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js':'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:1060,height:1600,appStyles:true,layout:'document'});await harness.start();
 const browser=await chromium.launch(),page=await browser.newPage({deviceScaleFactor:1});page.setDefaultTimeout(120000);await page.emulateMedia({reducedMotion:'reduce'});const results=[];
 try{
  const cases=before?[[1060,true,'Earth',25,45,'default'],[320,false,'Earth',75,70,'polar-night']]:[
   [1060,true,'Earth',25,45,'default'],[1060,false,'Earth',0,0,'equinox'],[736,false,'Earth',25,0,'equator'],
   [320,false,'Earth',25,70,'polar-day'],[320,true,'Earth',75,70,'polar-night'],[1060,false,'Earth',75,80,'far-polar'],
   [736,true,'Mars',25,45,'mars'],[1060,true,'Uranus',25,45,'uranus-north'],[320,false,'Uranus',75,45,'uranus-south'],
   [320,true,'Earth',2,45,'near-equinox'],[1060,false,'Earth',12.5,45.5,'fractional'],[320,false,'Earth',25,45,'malformed'],
   [1060,true,'Earth',25,45,'guide-predict'],[320,false,'Earth',25,45,'guide-collect'],[736,true,'Earth',75,45,'guide-claim'],
   [1060,false,'Earth',25,45,'guide-explain'],[320,true,'Earth',75,45,'guide-invalid'],[1060,true,'Earth',25,45,'saved']];
  for(const[width,dark,world,phase,latitude,state]of cases){
   await page.setViewportSize({width,height:1600});await page.goto(harness.url+'/__harness');await page.waitForFunction(()=>!!window.StemLab?._registry?.solarSystem);
   await page.locator('#wrap').evaluate((n,w)=>n.style.width=w+'px',width);
   const saved={tutorialDismissed:true,solarMissionDashboardOpen:false,sidebar:true,selectedPlanet:'Earth',viewTab:'overview',orreryMode:false,orr_paused:true,showSeasonsLab:true,seasonsWorld:world,seasonsPhase:phase,seasonsLatitude:latitude,seasonsGuideActive:false,seasonsGuide:{},seasonsPrediction:null,seasonsEvidenceSaved:false,seasonsLatitudeExplanation:'',seasonsLatitudeSaved:null,paused:true,isDark:dark};
   if(state==='malformed'){saved.seasonsWorld='constructor';saved.seasonsPhase=[];saved.seasonsLatitude={};saved.seasonsPrediction={world:'Earth',phase:25,choice:'anything'};saved.seasonsEvidenceSaved='true';}
   if(state.startsWith('guide-')){saved.seasonsGuideActive=true;saved.seasonsGuide=state==='guide-predict'?{}:{prediction:'opposite',step:1};}
   if(['guide-claim','guide-explain','guide-invalid'].includes(state)){saved.seasonsGuide.records={25:record(25),75:record(75)};saved.seasonsGuide.step=state==='guide-claim'?2:3;saved.seasonsGuide.claim=state==='guide-claim'?undefined:'tilt';saved.seasonsGuide.explanation='The observations support opposite seasons because tilt changes daylight and the noon Sun.';}
   if(state==='guide-invalid')saved.seasonsGuide.records[75].northHours=12;
   if(state==='saved'){saved.seasonsPrediction={world,phase,choice:'north'};saved.seasonsEvidenceSaved=true;}
   await page.evaluate(data=>{
    window.__mount({solarSystem:data});window.__ctx.isDark=data.isDark;document.documentElement.classList.toggle('dark',data.isDark);
    const worlds=['Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];window.__ctx.t=(key,fallback)=>worlds.find(name=>key==='stem.solar_sys.'+name.toLowerCase())||fallback||key;window.__rerender();
   },saved);
   const panel=page.locator('#solar-seasons-lab');await panel.waitFor();
   const name=`${before?'before':'after'}-seasons-${width}-${dark?'dark':'light'}-${world}-${phase}-${state}`;
   try { await panel.screenshot({path:path.join(dir,name+'.png'),animations:'disabled',timeout:120000}); }
   catch(error) { console.error(JSON.stringify(await page.evaluate(()=>({errors:window.__events?.errors,flags:window.__ctx?.toolData?.solarSystem,body:document.body.innerText.slice(-5000)})))); throw error; }
   if(!before&&state==='default')await panel.locator('.solar-season-latitude-readings').screenshot({path:path.join(dir,'after-seasons-noon-observers.png')});
   if(!before&&state==='polar-day')await panel.locator('.solar-season-latitude-readings').screenshot({path:path.join(dir,'after-seasons-phone-observers.png')});
   const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,errors:window.__events.errors}));assert.deepEqual(metrics.errors,[]);
   if(!before){
    assert.ok(metrics.scrollWidth<=width+1,'Overflow '+name);metrics.minimumContrast=await panel.evaluate(contrast);assert.ok(metrics.minimumContrast>=4.5,'Contrast '+name+' '+metrics.minimumContrast);
    metrics.minimumTargetHeight=await panel.evaluate(n=>Math.min(...[...n.querySelectorAll('button,input,a')].filter(c=>c.getBoundingClientRect().height).map(c=>c.getBoundingClientRect().height)));assert.ok(metrics.minimumTargetHeight>=43.5,'Targets '+name);
    metrics.minimumTextSize=await panel.evaluate(n=>Math.min(...[...n.querySelectorAll('p,span,button,label,output,dt,dd,a,th,td')].filter(c=>c.textContent.trim()&&c.getBoundingClientRect().height&&!c.closest('svg,.sr-only')).map(c=>parseFloat(getComputedStyle(c).fontSize))));assert.ok(metrics.minimumTextSize>=13,'Text '+name);
    metrics.minimumSvgTextSize=await panel.evaluate(n=>{const sizes=[...n.querySelectorAll('svg text')].filter(c=>c.textContent.trim()&&c.getBoundingClientRect().height).map(c=>parseFloat(getComputedStyle(c).fontSize));return sizes.length?Math.min(...sizes):null;});assert.ok(metrics.minimumSvgTextSize===null||metrics.minimumSvgTextSize>=13,'SVG text '+name);
    metrics.observers=await panel.locator('[data-latitude-noon-observer]').evaluateAll(nodes=>nodes.map(n=>({left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right,altitude:Number(n.querySelector('[data-noon-sun]').getAttribute('data-noon-altitude'))})));for(const observer of metrics.observers)assert.ok(observer.left>=0&&observer.right<=width+1);
    metrics.daylight=await panel.locator('[data-latitude-daylight-meter]').evaluateAll(nodes=>nodes.map(n=>Number(n.getAttribute('aria-valuenow'))));if(metrics.daylight.length)assert.ok(Math.abs(metrics.daylight[0]+metrics.daylight[1]-24)<1e-8);
   }
   results.push({dark,state,world,phase,latitude,...metrics});console.log('Checked '+name);await harness.destroy(page);
  }
  fs.writeFileSync(path.join(dir,(before?'before':'after')+'-metrics.json'),JSON.stringify(results,null,2));
 }finally{await page.close();await browser.close();await harness.stop();fs.unlinkSync(bundle);}
})().catch(e=>{console.error(e);process.exitCode=1;});
