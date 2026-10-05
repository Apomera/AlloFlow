const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {buildSync}=require('esbuild'),{chromium}=require('playwright');
const before=process.argv.includes('--before'),dir=__dirname,bundle=path.join(dir,'harness.cjs');
buildSync({entryPoints:['tests/e2e/helpers/stem_gl_harness.ts'],outfile:bundle,bundle:true,platform:'node',format:'cjs',external:['@playwright/test']});
const {GlHarness}=require('./harness.cjs');
function contrast(panel){
 const rgba=c=>c.match(/[\d.]+/g).map(Number),lum=c=>c.slice(0,3).map(v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 return Math.min(...[...panel.querySelectorAll('h3,h4,p,label,span,button,th,td,dt,dd')].filter(n=>n.textContent.trim()&&!n.children.length&&n.getBoundingClientRect().height&&!n.disabled&&!n.closest('[aria-hidden="true"]')).map(n=>{
  const layers=[];for(let p=n;p;p=p.parentElement){const c=rgba(getComputedStyle(p).backgroundColor);layers.unshift(c);if((c[3]??1)>=1)break;}
  let bg=[255,255,255];for(const c of layers)bg=bg.map((v,i)=>c[i]*(c[3]??1)+v*(1-(c[3]??1)));
  const a=lum(rgba(getComputedStyle(n).color)),b=lum(bg);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 }));
}
(async()=>{
 const harness=new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:1060,height:1400,appStyles:true,layout:'document'});await harness.start();
 const browser=await chromium.launch(),page=await browser.newPage({deviceScaleFactor:1});await page.emulateMedia({reducedMotion:'reduce'});const results=[];
 try{
  const cases=before?[[1060,true,.95,0,''],[320,false,.95,0,'']]:[[1060,true,.6,.25,''],[1060,false,.6,.25,''],[736,true,.6,.25,''],[320,false,.6,.25,''],[320,true,.6,.25,''],[1060,false,.95,0,'-high-e'],[736,true,0,.25,'-circle']];
  for(const[width,dark,e,phase,suffix]of cases){
   await page.setViewportSize({width,height:1400});await page.goto(harness.url+'/__harness');await page.waitForFunction(()=>!!window.StemLab?._registry?.solarSystem);
   await page.locator('#wrap').evaluate((n,w)=>n.style.width=w+'px',width);
   await page.evaluate(data=>{window.__mount({solarSystem:data});window.__ctx.isDark=data.isDark;document.documentElement.classList.toggle('dark',data.isDark);window.__rerender();},{tutorialDismissed:true,solarMissionDashboardOpen:false,orreryMode:true,orr_tab:2,isDark:dark,orr_k2e:e,orr_k2s:6,orr_k2phase:phase,orr_k2playing:false,orr_paused:true});
   const canvas=page.getByRole('img',{name:/Kepler II equal-area visualization/});await canvas.waitFor();
   if(!before)await canvas.evaluate(n=>n.scrollIntoView());
   if(!before)await page.waitForFunction(()=>document.querySelector('#orrery-k2-inspection canvas')?._k2Orbit?.sectors.length===6);
   const panel=before?canvas.locator('..'):page.locator('#orrery-k2-inspection'),name=`${before?'before':'after'}-${width}-${dark?'dark':'light'}${suffix}`;
   if(!before)for(const diagram of await panel.locator('canvas').all()){
    await diagram.scrollIntoViewIfNeeded();await page.waitForFunction(n=>!!(n._k2Orbit||n._k2Graph),await diagram.elementHandle());
   }
   await panel.screenshot({path:path.join(dir,name+'.png')});
   const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,errors:window.__events.errors}));assert.deepEqual(metrics.errors,[]);
   if(!before){
    assert.ok(metrics.scrollWidth<=width+1);metrics.minimumContrast=await panel.evaluate(contrast);assert.ok(metrics.minimumContrast>=4.5,'Contrast '+metrics.minimumContrast);
    metrics.minimumTargetHeight=await panel.evaluate(n=>Math.min(...[...n.querySelectorAll('button,select,input')].map(c=>c.getBoundingClientRect().height)));assert.ok(metrics.minimumTargetHeight>=43.5);
    metrics.orbit=await canvas.evaluate(n=>n._k2Orbit);assert.ok(Math.abs(metrics.orbit.width-(await canvas.evaluate(n=>n.clientWidth)))<=1);
    assert.ok(metrics.orbit.sectors.every(s=>s.points.every(p=>p.x>=0&&p.x<=metrics.orbit.width&&p.y>=0&&p.y<=metrics.orbit.height)));
    metrics.graphs=await panel.locator('canvas').evaluateAll(nodes=>nodes.map(n=>n._k2Graph).filter(Boolean));assert.equal(metrics.graphs.length,2);
    assert.ok(metrics.graphs.every(g=>g.curves.every(c=>c.points.every(p=>p.x>=g.left-1&&p.x<=g.right+1&&p.y>=g.top-1&&p.y<=g.bottom+1))));
    metrics.localTable=await panel.locator('#orrery-k2-table-scroll').evaluate(n=>({clientWidth:n.clientWidth,scrollWidth:n.scrollWidth}));
    if(width===320){
     assert.ok(metrics.localTable.scrollWidth>metrics.localTable.clientWidth);await panel.locator('#orrery-k2-table-scroll').evaluate(n=>n.scrollLeft=n.scrollWidth);
     metrics.pinnedNames=await panel.locator('#orrery-k2-table-scroll').evaluate(n=>{const b=n.getBoundingClientRect();return [...n.querySelectorAll('tbody th')].every(h=>{const r=h.getBoundingClientRect();return r.left>=b.left-1&&r.right<=b.right+1;});});assert.ok(metrics.pinnedNames);
     await panel.locator('.orr-k2-table-panel').screenshot({path:path.join(dir,name+'-table-end.png')});
    }
   }
   results.push({dark,e,phase,suffix,...metrics});console.log('Checked Kepler II '+width+'px '+(dark?'dark':'light')+' e='+e);await harness.destroy(page);
  }
  fs.writeFileSync(path.join(dir,(before?'before':'after')+'-metrics.json'),JSON.stringify(results,null,2));
 }finally{await page.close();await browser.close();await harness.stop();fs.unlinkSync(bundle);}
})().catch(e=>{console.error(e);process.exitCode=1;});
