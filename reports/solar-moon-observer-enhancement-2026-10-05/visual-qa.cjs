const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {buildSync}=require('esbuild'),{chromium}=require('playwright');
const before=process.argv.includes('--before'),dir=__dirname,bundle=path.join(dir,'harness.cjs');
buildSync({entryPoints:['tests/e2e/helpers/stem_gl_harness.ts'],outfile:bundle,bundle:true,platform:'node',format:'cjs',external:['@playwright/test']});
const {GlHarness}=require('./harness.cjs');
function contrast(panel){
 const rgba=c=>c.match(/[\d.]+/g).map(Number),lum=c=>c.slice(0,3).map(v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 return Math.min(...[...panel.querySelectorAll('h4,h5,p,label,span,strong,button,dt,dd,div,li,a,output')].filter(n=>n.textContent.trim()&&!n.children.length&&n.getBoundingClientRect().height&&!n.closest('svg,[aria-hidden="true"],.sr-only,button:disabled')).map(n=>{
  const layers=[];for(let p=n;p;p=p.parentElement){const c=rgba(getComputedStyle(p).backgroundColor);layers.unshift(c);if((c[3]??1)>=1)break;}
  let bg=[255,255,255];for(const c of layers)bg=bg.map((v,i)=>c[i]*(c[3]??1)+v*(1-(c[3]??1)));
  const a=lum(rgba(getComputedStyle(n).color)),b=lum(bg);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 }));
}
(async()=>{
 const harness=new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:1060,height:1600,appStyles:true,layout:'document'});await harness.start();
 const browser=await chromium.launch(),page=await browser.newPage({deviceScaleFactor:1});await page.emulateMedia({reducedMotion:'reduce'});const results=[];
 try{
  const cases=before?[[1060,true,45,30,false,'default'],[320,false,45,30,false,'phone']]:[
   [1060,true,45,30,false,'default'],[1060,false,0,0,false,'new'],[1060,true,90,30,false,'quarter'],
   [736,false,135,30,false,'gibbous'],[1060,true,180,0,false,'full'],[736,true,225,30,false,'waning'],
   [320,false,270,30,false,'third-quarter'],[320,true,315,30,false,'crescent'],[320,false,45,30,true,'southern'],
   [1060,true,0,0,false,'committed-solar'],[320,true,180,0,true,'committed-lunar'],[320,false,0,90,false,'missed-node'],
   [1060,false,89.6,12.4,false,'fractional'],[320,true,45,30,false,'malformed'],[320,false,45,30,false,'invalid-prediction'],
   [1060,true,0,0,false,'saved']];
  for(const[width,dark,phase,node,south,state]of cases){
   await page.setViewportSize({width,height:1600});await page.goto(harness.url+'/__harness');await page.waitForFunction(()=>!!window.StemLab?._registry?.solarSystem);
   await page.locator('#wrap').evaluate((n,w)=>n.style.width=w+'px',width);
   const saved={tutorialDismissed:true,solarMissionDashboardOpen:false,selectedPlanet:'Earth',viewTab:'overview',orreryMode:false,showMoonLab:true,moonPhaseAngle:phase,moonNodeOffset:node,moonSouthernView:south,paused:true,isDark:dark};
   if(state==='committed-solar'||state==='saved'){saved.moonPrediction={phase,node,choice:'solar'};saved.moonEvidenceSaved=state==='saved';}
   if(state==='committed-lunar')saved.moonPrediction={phase,node,choice:'lunar'};
   if(state==='malformed'){saved.moonPhaseAngle=[];saved.moonNodeOffset={};saved.moonSouthernView='false';saved.moonEvidenceSaved='false';}
   if(state==='invalid-prediction'){saved.moonPrediction={phase,node,choice:'anything'};saved.moonEvidenceSaved='true';}
   await page.evaluate(data=>{
    window.__mount({solarSystem:data});window.__ctx.isDark=data.isDark;document.documentElement.classList.toggle('dark',data.isDark);
    const worlds=['Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];window.__ctx.t=(key,fallback)=>worlds.find(name=>key==='stem.solar_sys.'+name.toLowerCase())||fallback||key;window.__rerender();
   },saved);
   const panel=page.locator('#solar-moon-lab');await panel.waitFor();
   const name=`${before?'before':'after'}-moon-${width}-${dark?'dark':'light'}-${phase}-${node}-${state}`;
   await panel.screenshot({path:path.join(dir,name+'.png')});
   if(!before&&state==='default')await panel.locator('.solar-moon-overview').screenshot({path:path.join(dir,'after-moon-overview.png')});
   if(!before&&width===320&&state==='southern')await panel.locator('.solar-moon-overview').screenshot({path:path.join(dir,'after-moon-phone-overview.png')});
   const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,errors:window.__events.errors}));assert.deepEqual(metrics.errors,[]);
   if(!before){
    assert.ok(metrics.scrollWidth<=width+1,'Overflow '+name);metrics.minimumContrast=await panel.evaluate(contrast);assert.ok(metrics.minimumContrast>=4.5,'Contrast '+name+' '+metrics.minimumContrast);
    metrics.minimumTargetHeight=await panel.evaluate(n=>Math.min(...[...n.querySelectorAll('button,input,a')].filter(c=>c.getBoundingClientRect().height).map(c=>c.getBoundingClientRect().height)));assert.ok(metrics.minimumTargetHeight>=43.5,'Targets '+name);
    metrics.minimumTextSize=await panel.evaluate(n=>Math.min(...[...n.querySelectorAll('p,span,button,label,output,dt,dd,a')].filter(c=>c.textContent.trim()&&c.getBoundingClientRect().height&&!c.closest('svg,.sr-only')).map(c=>parseFloat(getComputedStyle(c).fontSize))));assert.ok(metrics.minimumTextSize>=13,'Text '+name);
    metrics.portrait=await panel.locator('[data-moon-observer]').evaluate(n=>({x:n.getBoundingClientRect().x,right:n.getBoundingClientRect().right,view:n.querySelector('svg').getAttribute('viewBox'),orientation:n.querySelector('[data-moon-observer-disk]').getAttribute('data-moon-observer-view')}));assert.ok(metrics.portrait.x>=0&&metrics.portrait.right<=width+1);assert.equal(metrics.portrait.view,'0 0 220 220');
    metrics.illumination=Number(await panel.locator('[data-moon-illumination-meter]').getAttribute('aria-valuenow'));assert.ok(Math.abs(metrics.illumination-.5*(1-Math.cos(phase*Math.PI/180)))<1e-12);
   }
   results.push({dark,state,phase,node,south,...metrics});console.log('Checked '+name);await harness.destroy(page);
  }
  fs.writeFileSync(path.join(dir,(before?'before':'after')+'-metrics.json'),JSON.stringify(results,null,2));
 }finally{await page.close();await browser.close();await harness.stop();fs.unlinkSync(bundle);}
})().catch(e=>{console.error(e);process.exitCode=1;});
