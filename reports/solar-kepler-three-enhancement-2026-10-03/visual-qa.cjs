const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {buildSync}=require('esbuild'),{chromium}=require('playwright');
const before=process.argv.includes('--before'),dir=__dirname,bundle=path.join(dir,'harness.cjs');
buildSync({entryPoints:['tests/e2e/helpers/stem_gl_harness.ts'],outfile:bundle,bundle:true,platform:'node',format:'cjs',external:['@playwright/test']});
const {GlHarness}=require('./harness.cjs');
function contrast(panel){
  const rgba=c=>c.match(/[\d.]+/g).map(Number),lum=c=>c.slice(0,3).map(v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  return Math.min(...[...panel.querySelectorAll('h3,h4,p,label,span,button,th,td,dt,dd,figcaption')].filter(n=>n.textContent.trim()&&!n.children.length&&n.getBoundingClientRect().height&&!n.disabled&&!n.closest('[aria-hidden="true"]')).map(n=>{
    const layers=[];for(let p=n;p;p=p.parentElement){const c=rgba(getComputedStyle(p).backgroundColor);layers.unshift(c);if((c[3]??1)>=1)break;}
    let bg=[255,255,255];for(const c of layers)bg=bg.map((v,i)=>c[i]*(c[3]??1)+v*(1-(c[3]??1)));
    const a=lum(rgba(getComputedStyle(n).color)),b=lum(bg);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  }));
}
(async()=>{
 const harness=new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:1060,height:1400,appStyles:true,layout:'document'});await harness.start();
 const browser=await chromium.launch(),page=await browser.newPage({deviceScaleFactor:1});await page.emulateMedia({reducedMotion:'reduce'});const results=[];
 try{
  for(const[width,dark]of(before?[[1060,true],[320,false]]:[[1060,true],[1060,false],[736,true],[320,false],[320,true]])){
   await page.setViewportSize({width,height:1400});await page.goto(harness.url+'/__harness');await page.waitForFunction(()=>!!window.StemLab?._registry?.solarSystem);
   await page.locator('#wrap').evaluate((n,w)=>n.style.width=w+'px',width);
   await page.evaluate(data=>{window.__mount({solarSystem:data});window.__ctx.isDark=data.isDark;document.documentElement.classList.toggle('dark',data.isDark);window.__rerender();},{tutorialDismissed:true,solarMissionDashboardOpen:false,orreryMode:true,orr_tab:3,isDark:dark,orr_k3hover:'jupiter',orr_paused:true});
   const canvas=page.getByRole('application',{name:/Kepler III plot/});await canvas.waitFor();
   if(!before)await canvas.evaluate(n=>n.scrollIntoView());
   if(!before)await page.waitForFunction(()=>document.querySelector('#orrery-k3-inspection canvas')?._k3Plot?.points.length===14);
   const panel=before?canvas.locator('..'):page.locator('#orrery-k3-inspection'),name=`${before?'before':'after'}-${width}-${dark?'dark':'light'}`;
   await panel.screenshot({path:path.join(dir,name+'.png')});
   const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,errors:window.__events.errors}));assert.deepEqual(metrics.errors,[]);
   if(!before){
    assert.ok(metrics.scrollWidth<=width+1,JSON.stringify(metrics));metrics.minimumContrast=await panel.evaluate(contrast);assert.ok(metrics.minimumContrast>=4.5,'Contrast '+metrics.minimumContrast);
    metrics.minimumTargetHeight=await panel.evaluate(n=>Math.min(...[...n.querySelectorAll('button,select')].map(c=>c.getBoundingClientRect().height)));assert.ok(metrics.minimumTargetHeight>=43.5,'Targets '+metrics.minimumTargetHeight);
    metrics.plot=await canvas.evaluate(n=>n._k3Plot);assert.ok(Math.abs(metrics.plot.width-(await canvas.evaluate(n=>n.clientWidth)))<=1);
    assert.ok(metrics.plot.points.every(p=>p.x>=metrics.plot.left&&p.x<=metrics.plot.right&&p.y>=metrics.plot.top&&p.y<=metrics.plot.bottom));
    assert.ok(metrics.plot.labels.every(p=>p.x>=0&&p.y>=0&&p.x+p.width<=metrics.plot.width&&p.y+p.height<=metrics.plot.height));
    metrics.localTable=await panel.locator('#orrery-k3-table-scroll').evaluate(n=>({clientWidth:n.clientWidth,scrollWidth:n.scrollWidth}));
    if(width===320){
     assert.ok(metrics.localTable.scrollWidth>metrics.localTable.clientWidth);
     await panel.locator('#orrery-k3-table-scroll').evaluate(n=>n.scrollLeft=n.scrollWidth);
     metrics.stickyWorldColumns=await panel.locator('#orrery-k3-table-scroll').evaluate(n=>{
      const bounds=n.getBoundingClientRect();return [...n.querySelectorAll('tr[data-k3-world]')].map(row=>{
       const heading=row.querySelector('th').getBoundingClientRect(),ratio=row.lastElementChild.getBoundingClientRect();
       return {world:row.dataset.k3World,headingInside:heading.left>=bounds.left-1&&heading.right<=bounds.right+1,ratioInside:ratio.left>=heading.right-1&&ratio.right<=bounds.right+1};
      });
     });
     assert.ok(metrics.stickyWorldColumns.every(row=>row.headingInside&&row.ratioInside));
     await panel.locator('.orr-k3-verification').screenshot({path:path.join(dir,name+'-table-end.png')});
    }
   }
   results.push({dark,...metrics});console.log('Checked Kepler III '+width+'px '+(dark?'dark':'light'));await harness.destroy(page);
  }
  fs.writeFileSync(path.join(dir,(before?'before':'after')+'-metrics.json'),JSON.stringify(results,null,2));
 }finally{await page.close();await browser.close();await harness.stop();fs.unlinkSync(bundle);}
})().catch(e=>{console.error(e);process.exitCode=1;});
