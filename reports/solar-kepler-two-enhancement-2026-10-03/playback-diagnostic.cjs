const fs=require('node:fs'),path=require('node:path'),{buildSync}=require('esbuild'),{chromium}=require('playwright');
const bundle=path.join(__dirname,'debug-harness.cjs');buildSync({entryPoints:['tests/e2e/helpers/stem_gl_harness.ts'],outfile:bundle,bundle:true,platform:'node',format:'cjs',external:['@playwright/test']});
const {GlHarness}=require('./debug-harness.cjs');
(async()=>{
 const h=new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:1060,height:1600,appStyles:true,layout:'document'});await h.start();
 const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1060,height:1600}});
 try{
  if(process.argv.includes('--clock'))await page.clock.install();await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(h.url+'/__harness');await page.waitForFunction(()=>!!window.StemLab?._registry?.solarSystem);
  await page.locator('#wrap').evaluate(n=>n.style.width='1060px');await page.evaluate(()=>window.__mount({solarSystem:{tutorialDismissed:true,solarMissionDashboardOpen:false,orreryMode:true,orr_tab:2,orr_paused:true,orr_k2e:.6,orr_k2s:6,orr_k2phase:.2,orr_k2playing:false}}));
  const orbit=page.getByRole('img',{name:/^Kepler II equal-area visualization/});await orbit.scrollIntoViewIfNeeded();await page.waitForFunction(()=>!!document.querySelector('#orrery-k2-inspection canvas')?._k2Orbit);
  await page.getByRole('button',{name:'Play orbit',exact:true}).click();await orbit.scrollIntoViewIfNeeded();
  for(let i=0;i<3;i++){
   if(process.argv.includes('--clock'))await page.clock.runFor(500);else await page.waitForTimeout(500);
   console.log(JSON.stringify(await orbit.evaluate(n=>({phase:n._k2Orbit?.phase,stamp:n._k2LastStamp,active:n._k2PlaybackActive,time:performance.now(),playing:window.__toolData.solarSystem.orr_k2playing,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,rect:{top:n.getBoundingClientRect().top,bottom:n.getBoundingClientRect().bottom},errors:window.__events.errors}))));
  }
 }finally{await page.close();await browser.close();await h.stop();fs.unlinkSync(bundle);}
})().catch(e=>{console.error(e);process.exitCode=1;});
