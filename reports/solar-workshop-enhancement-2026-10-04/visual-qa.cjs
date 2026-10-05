const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {buildSync}=require('esbuild'),{chromium}=require('playwright');
const before=process.argv.includes('--before'),dir=__dirname,bundle=path.join(dir,'harness.cjs');
buildSync({entryPoints:['tests/e2e/helpers/stem_gl_harness.ts'],outfile:bundle,bundle:true,platform:'node',format:'cjs',external:['@playwright/test']});
const {GlHarness}=require('./harness.cjs');
function contrast(panel){
 const rgba=c=>c.match(/[\d.]+/g).map(Number),lum=c=>c.slice(0,3).map(v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 return Math.min(...[...panel.querySelectorAll('h3,h4,p,label,span,strong,button,dt,dd')].filter(n=>n.textContent.trim()&&!n.children.length&&n.getBoundingClientRect().height&&!n.disabled&&!n.closest('[aria-hidden="true"]')).map(n=>{
  const layers=[];for(let p=n;p;p=p.parentElement){const c=rgba(getComputedStyle(p).backgroundColor);layers.unshift(c);if((c[3]??1)>=1)break;}
  let bg=[255,255,255];for(const c of layers)bg=bg.map((v,i)=>c[i]*(c[3]??1)+v*(1-(c[3]??1)));
  const a=lum(rgba(getComputedStyle(n).color)),b=lum(bg);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 }));
}
(async()=>{
 const harness=new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:1060,height:1600,appStyles:true,layout:'document'});await harness.start();
 const browser=await chromium.launch(),page=await browser.newPage({deviceScaleFactor:1});await page.emulateMedia({reducedMotion:'reduce'});const results=[];
 try{
  const cases=before?[[1060,true,.3,1,.25,'earth',false,true,''],[320,false,.3,1,.25,'earth',false,true,'']]:[
   [1060,true,.3,1,.25,'earth',false,true,''],[1060,false,.3,1,.25,'earth',false,true,''],[736,true,.3,1,.25,'earth',false,true,''],
   [320,false,.3,1,.25,'earth',false,true,''],[320,true,.3,1,.25,'earth',false,true,''],[1060,false,.99,.05,0,'earth',false,false,'-high-e'],
   [320,true,0,1,.25,'earth',false,true,'-circle'],[1060,true,.3,1,.5,'pluto',true,true,'-reference'],
   [320,false,.05,.05,0,'earth',false,false,'-hot-jupiter'],[736,true,.96,17.8,.25,'earth',false,true,'-halley']];
  for(const[width,dark,e,a,phase,body,compare,band,suffix]of cases){
   await page.setViewportSize({width,height:1600});await page.goto(harness.url+'/__harness');await page.waitForFunction(()=>!!window.StemLab?._registry?.solarSystem);
   await page.locator('#wrap').evaluate((n,w)=>n.style.width=w+'px',width);
   await page.evaluate(data=>{window.__mount({solarSystem:data});window.__ctx.isDark=data.isDark;document.documentElement.classList.toggle('dark',data.isDark);window.__rerender();},{tutorialDismissed:true,solarMissionDashboardOpen:false,orreryMode:true,orr_tab:4,isDark:dark,orr_wsb:body,orr_wse:e,orr_wsa:a,orr_wsphase:phase,orr_wscompare:compare,orr_wshz:band,orr_paused:true});
   const orbitCanvas=page.getByRole('img',{name:/^Orbit Workshop preview/}),energyCanvas=page.getByRole('img',{name:/^Orbit Workshop energy diagram/});await orbitCanvas.waitFor();
   for(const canvas of [orbitCanvas,energyCanvas]){await canvas.evaluate(n=>n.scrollIntoView({behavior:'instant',block:'center'}));if(!before)await canvas.evaluate(n=>new Promise(resolve=>{const check=()=>{if(n._wsOrbit||n._wsEnergy)resolve();else requestAnimationFrame(check);};check();}));}
   const panel=before?orbitCanvas.locator('..').locator('..'):page.locator('#orrery-workshop-inspection'),name=`${before?'before':'after'}-${width}-${dark?'dark':'light'}${suffix}`;
   await panel.screenshot({path:path.join(dir,name+'.png')});
   const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,errors:window.__events.errors}));assert.deepEqual(metrics.errors,[]);
   if(!before){
    assert.ok(metrics.scrollWidth<=width+1);metrics.minimumContrast=await panel.evaluate(contrast);assert.ok(metrics.minimumContrast>=4.5,'Contrast '+metrics.minimumContrast);
    metrics.minimumTargetHeight=await panel.evaluate(n=>Math.min(...[...n.querySelectorAll('button,input')].map(c=>c.getBoundingClientRect().height)));assert.ok(metrics.minimumTargetHeight>=43.5);
    metrics.orbit=await orbitCanvas.evaluate(n=>n._wsOrbit);metrics.energy=await energyCanvas.evaluate(n=>n._wsEnergy);
    for(const canvas of [orbitCanvas,energyCanvas]){const frame=await canvas.evaluate(n=>({w:n.clientWidth,h:n.clientHeight,lw:n._logicalWidth,lh:n._logicalHeight}));assert.ok(Math.abs(frame.w-frame.lw)<=1&&Math.abs(frame.h-frame.lh)<=1);}
    const o=metrics.orbit,g=metrics.energy,inside=p=>p.x>=0&&p.x<=o.width&&p.y>=0&&p.y<=o.height;
    assert.ok([o.focus,o.point,o.peri,o.aph].every(inside));assert.ok(Math.abs(Math.hypot(o.point.x-o.focus.x,o.point.y-o.focus.y)/o.scale-o.point.r)<1e-9);
    if(o.reference){assert.ok([o.reference.peri,o.reference.aph].every(inside));assert.ok(o.reference.cy-o.reference.b>=0&&o.reference.cy+o.reference.b<=o.height);}
    if(o.band){assert.ok(Math.abs(o.band.inner/o.scale-.75)<1e-10&&Math.abs(o.band.outer/o.scale-1.7)<1e-10);assert.ok(o.focus.x-o.band.outer>=0&&o.focus.x+o.band.outer<=o.width&&o.focus.y-o.band.outer>=0&&o.focus.y+o.band.outer<=o.height);}
    assert.ok(o.tags.every(t=>t.x>=0&&t.y>=0&&t.x+t.width<=o.width&&t.y+t.height<=o.height));
    assert.ok(o.tags.every((a,i)=>o.tags.slice(i+1).every(b=>a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y)),'Labels overlap');
    assert.equal(g.samples.length,257);assert.ok(g.samples.every(p=>Number.isFinite(p.r)&&p.r>0&&Math.abs(p.sum+1/(2*a))<1e-9&&p.x>=g.plot.left&&p.x<=g.plot.right&&[p.potentialY,p.kineticY,p.totalY].every(y=>y>=g.plot.top&&y<=g.plot.bottom)));
    assert.ok(Math.abs(g.samples[0].r-a*(1-e))<1e-9&&Math.abs(g.samples[128].r-a*(1+e))<1e-9&&Math.abs(g.samples[256].r-a*(1-e))<1e-9);
    metrics.bandState=await panel.locator('#orrery-workshop-band-note').getAttribute('data-ws-band-state');metrics.bandFraction=Number(await panel.locator('[data-ws-band-fraction]').getAttribute('data-value'));
   }
   results.push({dark,e,a,phase,body,compare,band,suffix,...metrics});console.log('Checked Workshop '+width+'px '+(dark?'dark':'light')+' e='+e+' a='+a);await harness.destroy(page);
  }
  fs.writeFileSync(path.join(dir,(before?'before':'after')+'-metrics.json'),JSON.stringify(results,null,2));
 }finally{await page.close();await browser.close();await harness.stop();fs.unlinkSync(bundle);}
})().catch(e=>{console.error(e);process.exitCode=1;});
