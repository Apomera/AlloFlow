const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {buildSync}=require('esbuild'),{chromium}=require('playwright');
const before=process.argv.includes('--before'),dir=__dirname,bundle=path.join(dir,'harness.cjs');
buildSync({entryPoints:['tests/e2e/helpers/stem_gl_harness.ts'],outfile:bundle,bundle:true,platform:'node',format:'cjs',external:['@playwright/test']});
const {GlHarness}=require('./harness.cjs');
const radii={Mercury:.387,Venus:.723,Mars:1.524,Jupiter:5.203,Saturn:9.537,Uranus:19.19,Neptune:30.07,Pluto:39.48};
function observation(target,angle){const a=radii[target],distanceAU=Math.sqrt(1+a*a-2*a*Math.cos(angle*Math.PI/180));return{target,angle,distanceAU,oneWaySeconds:distanceAU*499.0047838};}
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
  const cases=before?[[1060,true,'Mars',0,'default'],[320,false,'Neptune',90,'clipped']]:[
   [1060,true,'Mars',0,'default'],[1060,false,'Mars',180,'far'],[736,true,'Jupiter',90,'right-angle'],
   [320,false,'Mars',90,'right-angle'],[320,true,'Neptune',90,'outer-world'],[320,false,'Pluto',90,'outer-world'],
   [1060,true,'Mercury',180,'inner-world'],[1060,false,'Venus',0,'inner-world'],[320,true,'Mars',90,'captured'],
   [320,false,'Mars',90,'equal-observations'],[1060,true,'constructor',0,'malformed'],[320,false,'Mars',0,'invalid-prediction'],
   [1060,true,'Pluto',180,'frozen-ping'],[320,false,'Mars',175,'conjunction']];
  for(const[width,dark,target,angle,state]of cases){
   await page.setViewportSize({width,height:1600});await page.goto(harness.url+'/__harness');await page.waitForFunction(()=>!!window.StemLab?._registry?.solarSystem);
   await page.locator('#wrap').evaluate((n,w)=>n.style.width=w+'px',width);
   const saved={tutorialDismissed:true,solarMissionDashboardOpen:false,selectedPlanet:'Earth',viewTab:'overview',orreryMode:false,showSignalLab:true,signalTarget:target,signalAngle:angle,paused:true,isDark:dark};
   if(state==='captured'||state==='equal-observations')saved.signalNotebooks={Mars:{observations:state==='captured'?[observation('Mars',0),observation('Mars',180)]:[observation('Mars',90),observation('Mars',90)],explanation:'The signal speed is unchanged; path length determines the delay.'}};
   if(state==='malformed'){saved.signalNotebooks=[];saved.signalLastPing={target:'Mars',angle:0,oneWaySeconds:'4'};saved.signalPulseNonce='broken';}
   if(state==='invalid-prediction'){saved.signalPrediction='wrong';saved.signalEvidenceSaved='false';}
   if(state==='frozen-ping'){const ping=observation('Pluto',0);saved.signalLastPing={target:'Pluto',angle:0,oneWaySeconds:ping.oneWaySeconds};saved.signalPulseNonce=1;}
   await page.evaluate(data=>{
    window.__mount({solarSystem:data});window.__ctx.isDark=data.isDark;document.documentElement.classList.toggle('dark',data.isDark);
    const worlds=['Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];window.__ctx.t=(key,fallback)=>worlds.find(name=>key==='stem.solar_sys.'+name.toLowerCase())||fallback||key;window.__rerender();
   },saved);
   const panel=page.locator('#solar-signal-lab');await panel.waitFor();
   if(!before&&width===320){const stage=panel.locator('.solar-signal-stage');await stage.evaluate(n=>n.scrollLeft=(n.scrollWidth-n.clientWidth)/2);}
   const name=`${before?'before':'after'}-signal-${width}-${dark?'dark':'light'}-${target}-${angle}-${state}`;
   await panel.screenshot({path:path.join(dir,name+'.png')});
   if(!before&&width===1060&&dark&&state==='default')await panel.locator('#solar-signal-journey').screenshot({path:path.join(dir,'after-signal-journey.png')});
   if(!before&&width===320&&state==='captured')await panel.locator('[data-signal-notebook]').screenshot({path:path.join(dir,'after-signal-phone-notebook.png')});
   if(!before&&width===320&&target==='Pluto')await panel.locator('.solar-signal-stage').screenshot({path:path.join(dir,'after-signal-phone-outer-orbit.png')});
   const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,errors:window.__events.errors}));assert.deepEqual(metrics.errors,[]);
   if(!before){assert.ok(metrics.scrollWidth<=width+1,'Overflow '+name);metrics.minimumContrast=await panel.evaluate(contrast);assert.ok(metrics.minimumContrast>=4.5,'Contrast '+name+' '+metrics.minimumContrast);metrics.minimumTargetHeight=await panel.evaluate(n=>Math.min(...[...n.querySelectorAll('button,input,a')].filter(c=>c.getBoundingClientRect().height).map(c=>c.getBoundingClientRect().height)));assert.ok(metrics.minimumTargetHeight>=43.5,'Targets '+name);metrics.geometry=await panel.locator('svg[role="img"]').evaluate(n=>({width:n.viewBox.baseVal.width,height:n.viewBox.baseVal.height,dots:[...n.querySelectorAll('[data-signal-world-dot]')].map(c=>({key:c.dataset.signalWorldDot,x:Number(c.getAttribute('cx')),y:Number(c.getAttribute('cy')),r:Number(c.getAttribute('r'))}))}));assert.equal(metrics.geometry.dots.length,2);for(const dot of metrics.geometry.dots)assert.ok(dot.x-dot.r>=0&&dot.y-dot.r>=0&&dot.x+dot.r<=metrics.geometry.width&&dot.y+dot.r<=metrics.geometry.height,'Clipped world '+name);}
   results.push({dark,state,target,angle,...metrics});console.log('Checked '+name);await harness.destroy(page);
  }
  fs.writeFileSync(path.join(dir,(before?'before':'after')+'-metrics.json'),JSON.stringify(results,null,2));
 }finally{await page.close();await browser.close();await harness.stop();fs.unlinkSync(bundle);}
})().catch(e=>{console.error(e);process.exitCode=1;});
