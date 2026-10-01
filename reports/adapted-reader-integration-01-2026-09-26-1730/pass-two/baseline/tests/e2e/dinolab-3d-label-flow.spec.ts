import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
test.describe.configure({timeout:240_000});test.use({video:'off',trace:'off'});
const report='reports/dinolab-3d-label-flow';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,
 probes:"var now=performance.now.bind(performance);window.__flowNow=10000;performance.now=function(){return window.__flowNow==null?now():window.__flowNow;};var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__flowScene=s;window.__flowCamera=c;window.__flowRenderer=r;return render(s,c);};return r;};"});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function tick(page,ms=0,steps=1){await page.evaluate(async({ms,steps})=>{
 for(let i=0;i<steps;i++){(window as any).__flowNow+=ms/steps;await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));}
},{ms,steps});}
async function mount(page,species,width=1180,reduced=true){
 await page.setViewportSize({width,height:920});await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
 await harness.mount(page,{dinoLab:{tab:'field3d',field3dSelected:species,field3dReconstructionMode:'evidence',field3dAutoRotate:false,field3dOrientationDismissed:true,field3dWorkflowStarted:false,field3dShowSkeleton:false,field3dShowBody:true,field3dShowHuman:false,field3dShowEvidence:false,field3dBodyOpacity:100,field3dLabelMode:'anatomy',field3dScanLogged:{skull:true},field3dScanSpecies:species}},undefined,{expectCanvas:false});
 const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {');await page.addStyleTag({content:css.slice(start,css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start)))});
 await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__flowScene)).toBe(true);await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();await page.locator('.dinolab-3d-canvas').scrollIntoViewIfNeeded();await tick(page);
}
async function inspect(page){return page.evaluate(()=>{
 const w=window as any,overlay=document.querySelector('.dinolab-body-label-overlay') as HTMLElement,box=overlay.getBoundingClientRect(),r=w.__flowRenderer;
 const labels=Array.from(overlay.querySelectorAll('[data-dino-part-label]')).filter((n:any)=>n.style.display!=='none'&&overlay.style.display!=='none').map((n:any)=>{
  const b=n.getBoundingClientRect(),id=n.dataset.dinoPartLabel,line=overlay.querySelector('[data-dino-part-line="'+id+'"] line')!;
  return {id,selected:n.dataset.dinoSelected==='true',text:n.textContent,x:b.x-box.x,y:b.y-box.y,width:b.width,height:b.height,anchorX:+line.getAttribute('x1')!,anchorY:+line.getAttribute('y1')!,lineX:+line.getAttribute('x2')!,lineY:+line.getAttribute('y2')!,clientWidth:n.clientWidth,scrollWidth:n.scrollWidth,clientHeight:n.clientHeight,scrollHeight:n.scrollHeight,clipped:n.scrollWidth>n.clientWidth||n.scrollHeight>n.clientHeight};
 });
 return {labels,width:box.width,height:box.height,memory:{...r.info.memory},errors:w.__events.errors,lost:w.__glLive().lost,overflow:document.documentElement.scrollWidth>innerWidth,saved:JSON.stringify(w.__toolData.dinoLab)};
});}
function check(p,min=1){
 expect(p.labels.length).toBeGreaterThanOrEqual(min);expect(p.errors).toEqual([]);expect(p.lost).toBe(false);expect(p.overflow).toBe(false);
 for(const a of p.labels){expect(a.clipped).toBe(false);expect(a.x).toBeGreaterThanOrEqual(7.8);expect(a.x+a.width).toBeLessThanOrEqual(p.width-7.8);
  for(const b of p.labels)if(a!==b){
   expect(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y).toBe(true);
   let blocked=false;for(let t=.01;t<1;t+=.01){const x=a.anchorX+(a.lineX-a.anchorX)*t,y=a.anchorY+(a.lineY-a.anchorY)*t;if(x>b.x+.2&&x<b.x+b.width-.2&&y>b.y+.2&&y<b.y+b.height-.2){blocked=true;break;}}expect(blocked).toBe(false);
   const ax=a.lineX-a.anchorX,ay=a.lineY-a.anchorY,bx=b.lineX-b.anchorX,by=b.lineY-b.anchorY,den=ax*by-ay*bx;
   if(Math.abs(den)>.001){const dx=b.anchorX-a.anchorX,dy=b.anchorY-a.anchorY,t=(dx*by-dy*bx)/den,u=(dx*ay-dy*ax)/den;expect(t>.001&&t<.999&&u>.001&&u<.999).toBe(false);}
  }
 }
}
async function choose(page,id){await page.getByLabel('Locate a body part').selectOption(id);await page.locator('.dinolab-3d-canvas').scrollIntoViewIfNeeded();await tick(page);await expect.poll(async()=>(await inspect(page)).labels.filter(p=>p.selected).map(p=>p.id)).toEqual([id]);}
test('breathing labels remain steady and keyboard orbit keeps routes clear',async({page})=>{
 await mount(page,'therizinosaurus',1180,false);await choose(page,'trunk');const before=await inspect(page),first=before.labels.find(l=>l.selected)!;let maxOffsetChange=0,anchorTravel=0;
 for(let i=0;i<18;i++){await tick(page,70);const p=await inspect(page);check(p,3);const a=p.labels.find(l=>l.selected)!;maxOffsetChange=Math.max(maxOffsetChange,Math.abs((a.x-a.anchorX)-(first.x-first.anchorX)),Math.abs((a.y-a.anchorY)-(first.y-first.anchorY)));anchorTravel=Math.max(anchorTravel,Math.hypot(a.anchorX-first.anchorX,a.anchorY-first.anchorY));}
 expect(anchorTravel).toBeGreaterThan(.01);expect(maxOffsetChange).toBeLessThan(.22);
 await page.getByRole('button',{name:'Pause motion',exact:true}).click();await page.locator('.dinolab-3d-canvas').focus();
 for(let i=0;i<8;i++){await page.keyboard.press('ArrowRight');await tick(page);check(await inspect(page),2);}
 const final=await inspect(page);expect(final.memory).toEqual(before.memory);expect(final.saved).toBe(before.saved);await page.locator('.dinolab-3d-shell').screenshot({path:report+'/orbit-callouts.png'});fs.writeFileSync(report+'/motion-checks.json',JSON.stringify({maxOffsetChange,anchorTravel,memory:final.memory,savedUnchanged:true},null,2));
});
test('long and right-to-left names wrap without clipping after phone resizing',async({page})=>{
 await mount(page,'therizinosaurus',390);await choose(page,'ankle');const before=await inspect(page);
 await page.evaluate(()=>{document.querySelector('[data-dino-part-label="ankle"]')!.textContent='Ankle / articulation de la cheville';});await tick(page);
 let p=await inspect(page);check(p);let a=p.labels.find(l=>l.selected)!;expect(a.height).toBeGreaterThan(28);expect(a.text).toContain('articulation');
 await page.setViewportSize({width:320,height:844});await page.locator('.dinolab-3d-canvas').scrollIntoViewIfNeeded();await tick(page);await expect.poll(async()=>(await inspect(page)).labels.filter(l=>l.selected).map(l=>l.id)).toEqual(['ankle']);p=await inspect(page);check(p);expect(p.labels.find(l=>l.selected)!.width).toBeLessThanOrEqual(144);await page.locator('.dinolab-3d-shell').screenshot({path:report+'/phone-long-label.png'});
 await page.evaluate(()=>{const n=document.querySelector('[data-dino-part-label="ankle"]')!;n.textContent='مفصل الكاحل بين الساق والقدم';n.setAttribute('dir','rtl');});await tick(page);p=await inspect(page);fs.writeFileSync(report+'/phone-label-metrics.json',JSON.stringify(p.labels,null,2));check(p);const shortRtl=p.labels.find(l=>l.selected)!;
 await page.evaluate(()=>{document.querySelector('[data-dino-part-label="ankle"]')!.textContent='مفصل الكاحل بين أسفل الساق وعظام مشط القدم';});await tick(page);p=await inspect(page);check(p);a=p.labels.find(l=>l.selected)!;expect(a.height).toBeGreaterThan(28);fs.writeFileSync(report+'/phone-label-metrics.json',JSON.stringify({shortRtl,longRtl:a},null,2));await page.locator('.dinolab-3d-shell').screenshot({path:report+'/phone-rtl-label.png'});
 await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});const violations=await page.evaluate(async()=>{const r=await (window as any).axe.run(document.querySelector('.dinolab-body-label-controls'));return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));});expect(violations).toEqual([]);expect(p.memory).toEqual(before.memory);expect(p.saved).toBe(before.saved);fs.writeFileSync(report+'/phone-checks.json',JSON.stringify({violations,longLabelWrapped:true,rtlWrapped:true,memory:p.memory,savedUnchanged:true},null,2));
});
test('whole-animal callouts stay clear through camera and study changes',async({page})=>{
 await mount(page,'triceratops');const before=await inspect(page);check(before,3);await page.locator('.dinolab-3d-controls-disclosure > summary').click();
 for(const name of ['Side camera view','Front camera view','Overhead camera view']){await page.getByRole('button',{name,exact:true}).click();await page.locator('.dinolab-3d-canvas').scrollIntoViewIfNeeded();await tick(page);check(await inspect(page),1);}
 await page.getByRole('button',{name:'Side camera view',exact:true}).click();await tick(page);await page.locator('.dinolab-3d-viewer').screenshot({path:report+'/triceratops-callouts.png'});
 await page.getByRole('button',{name:'Study tail details',exact:true}).click();await tick(page);expect((await inspect(page)).labels.map(l=>l.id)).toEqual(['tail']);
 await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();await tick(page);check(await inspect(page),3);
 await page.getByRole('button',{name:'Body-part labels',exact:true}).click();await tick(page);expect((await inspect(page)).labels).toEqual([]);await page.getByRole('button',{name:'Body-part labels',exact:true}).click();await tick(page);const final=await inspect(page);check(final,3);expect(final.memory).toEqual(before.memory);
});
