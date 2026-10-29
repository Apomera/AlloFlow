const path=require('node:path'),assert=require('node:assert/strict');
const {modes,density}=require('./rocks_accessibility_views.cjs');
const {layout,settle}=require('./rocks_accessibility_harness.cjs');
async function runEnvironments(h){
 const p=h.page,report={checks:[],failures:[],views:[]};
 const mount=async state=>{await p.reload();await p.waitForFunction(()=>typeof window.__setState==='function');await p.evaluate(state=>window.__setState({rocks:state,rockCycle:{}}),state);await p.waitForTimeout(150);};
 const check=async(name,fn)=>{try{await fn();report.checks.push(name);console.log('PASS '+name);}catch(e){report.failures.push({name,error:e.message});console.log('FAIL '+name+': '+e.message);}};
 await check('Density instrument, plot, and trial table scroll by keyboard at 320px',async()=>{
  await p.setViewportSize({width:320,height:1000});await mount({mode:'densityLab',densityLab:density});
  for(const [name,selector] of [['instruments','[data-rk-density-instruments]'],['plot','[data-rk-density-plot]'],['trials','[data-rk-density-trials]']]){
   const region=p.locator(selector).locator('xpath=ancestor::*[@role="region"][1]');assert.equal(await region.getAttribute('tabindex'),'0');await region.focus();await p.keyboard.press('ArrowRight');
   await p.waitForFunction(selector=>document.querySelector(selector).closest('[role=region]').scrollLeft>0,selector);
   await region.screenshot({path:path.join(h.output,'keyboard-density-'+name+'.png')});
  }
 });
 for(const media of ['forced-colors','reduced-motion'])await check(media+' all 11 modes at 320px',async()=>{
  await p.emulateMedia(media==='forced-colors'?{forcedColors:'active',reducedMotion:'reduce'}:{forcedColors:'none',reducedMotion:'reduce'});
  for(const mode of modes){
   await mount({mode,...(mode==='densityLab'?{densityLab:density}:{})});
   const row={media,mode,layout:await layout(p),activeAnimations:await p.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length)};
   assert.ok(row.layout.width<=321);await settle(p);
   const active=p.locator('[data-rocks-mode="'+mode+'"][aria-pressed=true]');await active.focus();
   row.focus=await active.evaluate(e=>{const s=getComputedStyle(e);return{outline:s.outline,color:s.color,background:s.backgroundColor,border:s.border};});
   assert.match(row.focus.outline,/solid 3px/);report.views.push(row);
   await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:path.join(h.output,media+'-'+mode+'.png'),animations:'disabled'});
  }
  if(media==='forced-colors'){
   await mount({mode:'densityLab',densityLab:density});
   for(const [name,selector] of [['instruments','[data-rk-density-instruments]'],['plot','[data-rk-density-plot]']])await p.locator(selector).locator('xpath=ancestor::*[@role="region"][1]').screenshot({path:path.join(h.output,'forced-colors-density-'+name+'.png')});
   await mount({mode:'rocks'});const family=p.locator('.rk-family-filters');if(await family.count()){await family.getByRole('button',{name:/Igneous/}).click();await family.screenshot({path:path.join(h.output,'forced-colors-families.png')});}
  }
 });
 await p.emulateMedia({forcedColors:'none',reducedMotion:'no-preference'});return report;
}
module.exports={runEnvironments};
