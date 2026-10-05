const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {buildSync}=require('esbuild'),{chromium}=require('playwright');
const before=process.argv.includes('--before'),dir=__dirname,bundle=path.join(dir,'harness.cjs');
buildSync({entryPoints:['tests/e2e/helpers/stem_gl_harness.ts'],outfile:bundle,bundle:true,platform:'node',format:'cjs',external:['@playwright/test']});
const {GlHarness}=require('./harness.cjs');
function contrast(panel){
 const rgba=c=>c.match(/[\d.]+/g).map(Number),lum=c=>c.slice(0,3).map(v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 return Math.min(...[...panel.querySelectorAll('h3,h4,p,label,span,strong,button,dt,dd,summary,li,div,th,td,a')].filter(n=>n.textContent.trim()&&!n.children.length&&n.getBoundingClientRect().height&&!n.disabled&&!n.closest('[aria-hidden="true"],.sr-only,.orr-transfer-sr')).map(n=>{
  const layers=[];for(let p=n;p;p=p.parentElement){const c=rgba(getComputedStyle(p).backgroundColor);layers.unshift(c);if((c[3]??1)>=1)break;}
  let bg=[255,255,255];for(const c of layers)bg=bg.map((v,i)=>c[i]*(c[3]??1)+v*(1-(c[3]??1)));
  const a=lum(rgba(getComputedStyle(n).color)),b=lum(bg);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 }));
}
(async()=>{
 const harness=new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:1060,height:1600,appStyles:true,layout:'document'});await harness.start();
 const browser=await chromium.launch(),page=await browser.newPage({deviceScaleFactor:1});await page.emulateMedia({reducedMotion:'reduce'});const results=[];
 try{
  const cases=before?[[1060,true,'earth','mars','departure'],[320,false,'earth','mars','departure']]:[
   [1060,true,'earth','mars','departure'],[1060,false,'earth','mars','departure'],[736,true,'mars','earth','arrival'],[320,false,'earth','venus','departure'],
   [320,true,'mercury','neptune','extreme'],[1060,true,'neptune','mercury','arrival'],[320,false,'earth','earth','same'],[320,true,'bad','sun','invalid'],
   [1060,false,'earth','mars','table'],[320,false,'earth','mars','table'],[320,true,'earth','mars','arrival'],[1060,true,'earth','mars','comparison'],
   [320,false,'earth','mars','comparison'],[320,true,'earth','mars','missed']];
  for(const[width,dark,from,to,state]of cases){
   await page.setViewportSize({width,height:1600});await page.goto(harness.url+'/__harness');await page.waitForFunction(()=>!!window.StemLab?._registry?.solarSystem);
   await page.locator('#wrap').evaluate((n,w)=>n.style.width=w+'px',width);
   const saved={tutorialDismissed:true,solarMissionDashboardOpen:false,orreryMode:true,orr_tab:5,isDark:dark,orr_paused:true,orr_trf:from,orr_trt:to,orr_trburn:state==='arrival'?'arrival':'departure'};
   await page.evaluate(data=>{window.__mount({solarSystem:data});window.__ctx.isDark=data.isDark;document.documentElement.classList.toggle('dark',data.isDark);window.__rerender();},saved);
   const flight=page.locator('[data-transfer-flight]');await flight.waitFor();const panel=before?flight.locator('xpath=ancestor::div[contains(@class,"space-y-3")][1]'):page.locator('#orrery-transfer-planner');await panel.waitFor();
   if(state==='arrival'||state==='missed'||state==='comparison')await flight.getByRole('button',{name:'Show transfer arrival',exact:true}).click();
   if(state==='extreme')await page.locator('#orrery-transfer-progress').fill('6.3');
   if(state==='comparison')await flight.getByRole('button',{name:'Compare launch alignments',exact:true}).click();
   if(state==='missed')await page.locator('#orrery-transfer-offset').fill('30');
   if(state==='table'){await panel.getByText('Exact transfer values',{exact:true}).click();if(width===320)await panel.getByRole('region',{name:'Earth transfer values',exact:true}).evaluate(n=>n.scrollLeft=n.scrollWidth);}
   await flight.locator('canvas').evaluate(n=>n.scrollIntoView({behavior:'instant',block:'center',inline:'nearest'}));
   await page.waitForFunction(()=>{const n=document.querySelector('[data-transfer-flight] canvas');return !!n?._transferInspection&&Math.abs(n._transferInspection.width-n.clientWidth)<1;});
   if(state==='extreme')await page.waitForFunction(()=>Math.abs(Number(document.querySelector('[data-transfer-flight] canvas').dataset.transferProgress)-.063)<1e-5);
   if(state==='missed')await page.waitForFunction(()=>Number(document.querySelector('[data-transfer-flight] canvas').dataset.transferSeparation)>.78);
   const name=`${before?'before':'after'}-transfer-${width}-${dark?'dark':'light'}-${from}-${to}-${state}`;await panel.screenshot({path:path.join(dir,name+'.png')});
   if(!before&&width===1060&&dark&&state==='departure'){
    await panel.locator('#orrery-transfer-burn-inspection').screenshot({path:path.join(dir,'after-burn-inspection.png')});
    await panel.locator('#orrery-transfer-budget').screenshot({path:path.join(dir,'after-earth-budget.png')});
   }
   if(!before&&state==='table'&&width===320)await panel.getByRole('region',{name:'Earth transfer values',exact:true}).screenshot({path:path.join(dir,'after-phone-exact-values.png')});
   if(!before&&state==='extreme')await flight.locator('canvas').screenshot({path:path.join(dir,'after-extreme-route-canvas.png')});
   const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,errors:window.__events.errors}));assert.deepEqual(metrics.errors,[]);
   metrics.canvas=await flight.locator('canvas').evaluate(n=>({inspection:n._transferInspection,contentWidth:n.clientWidth-parseFloat(getComputedStyle(n).paddingLeft)-parseFloat(getComputedStyle(n).paddingRight),rectWidth:n.getBoundingClientRect().width,progress:Number(n.dataset.transferProgress)}));
   if(!before){assert.ok(metrics.scrollWidth<=width+1,'Overflow '+name);metrics.minimumContrast=await panel.evaluate(contrast);assert.ok(metrics.minimumContrast>=4.5,'Contrast '+name+' '+metrics.minimumContrast);metrics.minimumTargetHeight=await panel.evaluate(n=>Math.min(...[...n.querySelectorAll('button,input:not([type=checkbox]),summary,select,a')].filter(c=>c.getBoundingClientRect().height).map(c=>c.getBoundingClientRect().height)));assert.ok(metrics.minimumTargetHeight>=43.5,'Targets '+name+' '+metrics.minimumTargetHeight);assert.ok(Math.abs(metrics.canvas.inspection.width-metrics.canvas.contentWidth)<1,'Canvas content scale '+name);}
   results.push({dark,state,from,to,...metrics});console.log('Checked '+name);await harness.destroy(page);
  }
  fs.writeFileSync(path.join(dir,(before?'before':'after')+'-metrics.json'),JSON.stringify(results,null,2));
 }finally{await page.close();await browser.close();await harness.stop();fs.unlinkSync(bundle);}
})().catch(e=>{console.error(e);process.exitCode=1;});
