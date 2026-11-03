const path=require('node:path'),assert=require('node:assert/strict');
const {modes,density}=require('./rocks_accessibility_views.cjs');
const {layout,settle}=require('./rocks_accessibility_harness.cjs');
async function runEnvironments(h){
 const p=h.page,report={checks:[],failures:[],views:[]};
 const mount=async state=>{await p.reload({timeout:45000});await p.waitForFunction(()=>typeof window.__setState==='function',null,{timeout:45000});await p.evaluate(state=>window.__setState({rocks:state,rockCycle:{}}),state);await p.waitForTimeout(150);};
 const check=async(name,fn)=>{try{await fn();report.checks.push(name);console.log('PASS '+name);}catch(e){report.failures.push({name,error:e.message});console.log('FAIL '+name+': '+e.message);}};
 await check('Density instruments reflow while plot and trial table scroll by keyboard at 320px',async()=>{
  await p.setViewportSize({width:320,height:1000});await mount({mode:'densityLab',densityLab:density});
  const instruments=p.locator('[data-rk-density-instruments]');
  const dimensions=await instruments.evaluate(element=>({width:element.clientWidth,scrollWidth:element.scrollWidth,figures:[...element.querySelectorAll('figure')].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right};})}));
  assert.ok(dimensions.scrollWidth<=dimensions.width+1);assert.equal(dimensions.figures.length,2);
  assert.ok(dimensions.figures.every(f=>f.x>=0&&f.right<=320));assert.ok(dimensions.figures[1].y>dimensions.figures[0].y);
  assert.equal(await instruments.getAttribute('tabindex'),null);
  await instruments.screenshot({path:path.join(h.output,'reflow-density-instruments.png')});
  for(const [name,selector] of [['plot','[data-rk-density-plot]'],['trials','[data-rk-density-trials]']]){
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
   const active=p.locator('[data-rocks-mode="'+mode+'"][aria-pressed=true]');
   const trigger=p.locator('[data-rk-mode-trigger]');
   await trigger.waitFor();
   assert.equal(await active.isVisible(),false);
   await trigger.focus();
   row.focus=await trigger.evaluate(e=>{const s=getComputedStyle(e);return{outline:s.outline,color:s.color,background:s.backgroundColor,border:s.border};});
   assert.match(row.focus.outline,/solid 3px/);report.views.push(row);
   await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:path.join(h.output,media+'-'+mode+'.png'),animations:'disabled'});
   await trigger.press('Enter');await active.focus();
   row.choiceFocus=await active.evaluate(e=>({outline:getComputedStyle(e).outline,active:e===document.activeElement}));
   assert.ok(row.choiceFocus.active);assert.match(row.choiceFocus.outline,/solid 3px/);
   await active.press('Escape');await p.waitForFunction(()=>document.activeElement.hasAttribute('data-rk-mode-trigger'));
  }
  if(media==='forced-colors'){
   await mount({mode:'densityLab',densityLab:density});
   await p.locator('[data-rk-density-instruments]').screenshot({path:path.join(h.output,'forced-colors-density-instruments.png')});
   await p.locator('[data-rk-density-plot]').locator('xpath=ancestor::*[@role="region"][1]').screenshot({path:path.join(h.output,'forced-colors-density-plot.png')});
   await mount({mode:'rocks'});const family=p.locator('.rk-family-filters');if(await family.count()){await family.getByRole('button',{name:/Igneous/}).click();await family.screenshot({path:path.join(h.output,'forced-colors-families.png')});}
  }
 });
 await p.emulateMedia({forcedColors:'none',reducedMotion:'no-preference'});return report;
}
module.exports={runEnvironments};
