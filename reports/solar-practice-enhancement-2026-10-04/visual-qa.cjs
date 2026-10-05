const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {buildSync}=require('esbuild'),{chromium}=require('playwright');
const before=process.argv.includes('--before'),dir=__dirname,bundle=path.join(dir,'harness.cjs');
buildSync({entryPoints:['tests/e2e/helpers/stem_gl_harness.ts'],outfile:bundle,bundle:true,platform:'node',format:'cjs',external:['@playwright/test']});
const {GlHarness}=require('./harness.cjs');
function contrast(panel){
 const rgba=c=>c.match(/[\d.]+/g).map(Number),lum=c=>c.slice(0,3).map(v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 return Math.min(...[...panel.querySelectorAll('h3,h4,p,label,span,strong,button,dt,dd,summary,li,div')].filter(n=>n.textContent.trim()&&!n.children.length&&n.getBoundingClientRect().height&&!n.disabled&&!n.closest('[aria-hidden="true"],.orr-practice-sr')).map(n=>{
  const layers=[];for(let p=n;p;p=p.parentElement){const c=rgba(getComputedStyle(p).backgroundColor);layers.unshift(c);if((c[3]??1)>=1)break;}
  let bg=[255,255,255];for(const c of layers)bg=bg.map((v,i)=>c[i]*(c[3]??1)+v*(1-(c[3]??1)));
  const a=lum(rgba(getComputedStyle(n).color)),b=lum(bg);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 }));
}
(async()=>{
 const harness=new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:1060,height:1600,appStyles:true,layout:'document'});await harness.start();
 const browser=await chromium.launch(),page=await browser.newPage({deviceScaleFactor:1});await page.emulateMedia({reducedMotion:'reduce'});const results=[];
 try{
  const cases=before?[[6,1060,true,'pending'],[6,320,false,'pending'],[7,1060,true,'pending'],[7,320,false,'pending']]:[
   [6,1060,true,'pending'],[6,1060,false,'wrong'],[6,736,true,'solved'],[6,320,false,'pending'],[6,320,true,'solved'],[6,320,false,'solution'],[6,1060,true,'practice'],[6,320,false,'reference'],
   [7,1060,true,'pending'],[7,1060,false,'wrong'],[7,736,true,'reviewed'],[7,320,false,'pending'],[7,320,true,'reviewing'],[7,320,false,'reviewed']];
  for(const[tab,width,dark,state]of cases){
   await page.setViewportSize({width,height:1600});await page.goto(harness.url+'/__harness');await page.waitForFunction(()=>!!window.StemLab?._registry?.solarSystem);
   await page.locator('#wrap').evaluate((n,w)=>n.style.width=w+'px',width);
   const saved={tutorialDismissed:true,solarMissionDashboardOpen:false,orreryMode:true,orr_tab:tab,isDark:dark,orr_paused:true};
   if(tab===6){if(state==='wrong'){saved.orr_chf={0:'Your answer is too low. Try again or reveal a hint.'};saved.orr_cha={0:'10'};}if(state==='solved'||state==='practice'){saved.orr_chc={0:true};saved.orr_cha={0:'11.86'};}if(state==='solution'){saved.orr_chh={0:3};saved.orr_chsolution={0:true};}if(state==='practice'){saved.orr_chpractice={0:true};saved.orr_chf={0:'Your answer is too high. Try again or reveal a hint.'};saved.orr_cha={0:'20'};}}
   else if(['wrong','reviewed','reviewing'].includes(state)){saved.orr_tfa={0:true};if(state==='reviewing')saved.orr_tfreviewing={0:true};if(state==='reviewed')saved.orr_tfreview={0:false};}
   await page.evaluate(data=>{window.__mount({solarSystem:data});window.__ctx.isDark=data.isDark;document.documentElement.classList.toggle('dark',data.isDark);window.__rerender();},saved);
   let panel;if(before){const anchor=tab===6?page.locator('input[aria-label^="Jupiter orbits"]'):page.getByRole('button',{name:/TRUE/});await anchor.waitFor();panel=anchor.locator('xpath=ancestor::div[contains(@class,"space-y-3")][1]');}else panel=page.locator(tab===6?'#orrery-calculation-practice':'#orrery-misconception-practice');await panel.waitFor();
   if(state==='reference')await panel.getByText('Equation quick reference',{exact:true}).click();
   const name=`${before?'before':'after'}-${tab===6?'calculation':'ideas'}-${width}-${dark?'dark':'light'}-${state}`;await panel.screenshot({path:path.join(dir,name+'.png')});
   const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,errors:window.__events.errors}));assert.deepEqual(metrics.errors,[]);
   if(!before){assert.ok(metrics.scrollWidth<=width+1,'Overflow '+name);metrics.minimumContrast=await panel.evaluate(contrast);assert.ok(metrics.minimumContrast>=4.5,'Contrast '+name+' '+metrics.minimumContrast);metrics.minimumTargetHeight=await panel.evaluate(n=>Math.min(...[...n.querySelectorAll('button,input,summary')].filter(c=>c.getBoundingClientRect().height).map(c=>c.getBoundingClientRect().height)));assert.ok(metrics.minimumTargetHeight>=43.5,'Targets '+name);}
   results.push({tab,dark,state,...metrics});console.log('Checked '+name);await harness.destroy(page);
  }
  fs.writeFileSync(path.join(dir,(before?'before':'after')+'-metrics.json'),JSON.stringify(results,null,2));
 }finally{await page.close();await browser.close();await harness.stop();fs.unlinkSync(bundle);}
})().catch(e=>{console.error(e);process.exitCode=1;});
