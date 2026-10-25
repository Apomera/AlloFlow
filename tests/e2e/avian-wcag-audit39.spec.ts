import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.use({video:'off',trace:'off',hasTouch:true});
test.describe.configure({retries:0,timeout:180000});
const output=resolve('reports/avian-simulations-round39-wcag-2026-10-23');
const baseline=!!process.env.AVIAN_WCAG_BASELINE;
const bird=new GlHarness({toolId:'birdLab',toolFile:'stem_lab/stem_tool_birdlab.js',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],width:1100,height:1000,appStyles:true,layout:'document'});
const raptor=new GlHarness({toolId:'raptorHunt',toolFile:'stem_lab/stem_tool_raptorhunt.js',extraScripts:['node_modules/axe-core/axe.min.js'],width:880,height:680,appStyles:true,layout:'document'});
test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await bird.start();await raptor.start();});
test.afterAll(async()=>{await bird.stop();await raptor.stop();});
const pageErrors=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{const errors:string[]=[];pageErrors.set(page,errors);page.on('pageerror',e=>{errors.push(e.stack||e.message);console.log('PAGE ERROR',e.stack||e.message);});});
test.afterEach(async({page})=>{await bird.destroy(page);expect(pageErrors.get(page)).toEqual([]);});

async function audit(page:Page,id:string,scope:string){
 const results=[];
 for(const width of [1280,320]){
  await page.setViewportSize({width,height:1000});await page.locator('#wrap').evaluate((n:HTMLElement,w)=>{n.style.width=Math.min(w,1100)+'px';n.style.maxWidth='100%';n.setAttribute('data-stem-tool-shell','true');},width);
  const axe=await page.evaluate(async scope=>{const a=await(window as any).axe.run(scope,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return{violations:a.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>({target:n.target,summary:n.failureSummary}))})),incomplete:a.incomplete.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))};},scope);
  const layout=await page.locator(scope).evaluate(n=>({doc:document.documentElement.scrollWidth,root:n.getBoundingClientRect().width}));results.push({width,axe,layout});
 }
 const spacing=await page.addStyleTag({content:`${scope},${scope} *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}${scope} p{margin-bottom:2em!important}`});
 const reflow=await page.locator(scope).evaluate(n=>({doc:document.documentElement.scrollWidth,clipped:[...n.querySelectorAll('button,summary,td,th')].filter((e:any)=>e.getClientRects().length&&(e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2)).map((e:any)=>({tag:e.tagName,text:e.textContent.trim().slice(0,80)}))}));
 await spacing.evaluate(n=>n.remove());writeFileSync(resolve(output,id+(baseline?'-before':'-audit')+'.json'),JSON.stringify({results,textSpacingAt320:reflow},null,2));
 if(!baseline){expect(results.flatMap(r=>r.axe.violations)).toEqual([]);expect(reflow.doc).toBeLessThanOrEqual(320);expect(reflow.clipped).toEqual([]);}
}
async function mountChorus(page:Page){await page.emulateMedia({reducedMotion:'reduce'});await bird.mount(page,{birdLab:{view:'dawnChorus',blXp:0,blLifeList:{},blBadges:{}}},undefined,{expectCanvas:false});}
async function mountSound(page:Page){await page.emulateMedia({reducedMotion:'reduce'});await raptor.mount(page,{raptorHunt:{activeSection:'hearing'}},undefined,{expectCanvas:false});}
async function mountCamera(page:Page){await page.emulateMedia({reducedMotion:'reduce'});await raptor.mount(page,{raptorHunt:{activeSection:'hunt',activeMission:'open',selectedSpecies:'greatHorned',flightSession:{speciesId:'greatHorned',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:'low'}},undefined,{expectCanvas:false});await page.waitForFunction(()=>!!(document.querySelector('[data-raptor-canvas]')as any)?._rhSnapshot,null,{polling:50});await page.locator('[data-raptor-study-button]').click();await page.locator('[data-study-fine] summary').click();}

async function focusCheck(page:Page,selector:string){
 const node=page.locator(selector);await page.keyboard.press('Tab');await node.focus();await expect(node).toBeFocused();
 const result=await node.evaluate((n:HTMLElement)=>{const r=n.getBoundingClientRect();let left=Math.max(0,r.left),right=Math.min(innerWidth,r.right),top=Math.max(0,r.top),bottom=Math.min(innerHeight,r.bottom);for(let p=n.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),b=p.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(s.overflowX)){left=Math.max(left,b.left);right=Math.min(right,b.right);}if(/auto|scroll|hidden|clip/.test(s.overflowY)){top=Math.max(top,b.top);bottom=Math.min(bottom,b.bottom);}}const hit=document.elementFromPoint((left+right)/2,(top+bottom)/2),s=getComputedStyle(n);return{visible:right>left&&bottom>top,unobscured:hit===n||n.contains(hit),outline:s.outlineStyle,outlineWidth:s.outlineWidth,outlineColor:s.outlineColor};});
 expect(result.visible).toBe(true);expect(result.unobscured).toBe(true);expect(result.outline).not.toBe('none');return{selector,...result};
}
async function capture(page:Page,selector:string,name:string){
 const node=page.locator(selector);await node.scrollIntoViewIfNeeded();await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
 const clip=await node.evaluate(n=>{const b=n.getBoundingClientRect();return{x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height,scale:1};});const cdp=await page.context().newCDPSession(page);try{const shot=await cdp.send('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:true});writeFileSync(resolve(output,name),Buffer.from(shot.data,'base64'));}finally{await cdp.detach();}
}
const voices=['robin','chickadee','redwingBlackbird','bluejay'];
// Independent fixtures in integer twentieths of a second.
const score=[[[8,32],[64,88],[136,160],[200,224]],[[20,30],[44,56],[100,112],[168,180]],[[56,80],[120,146],[194,214]],[[36,48],[96,116],[174,192],[226,238]]];
async function verifySchedule(page:Page,id:string,phase:number,offsets:number[],time:number){
 const eligible=[[0],[0,1,2],[0,1,2,3],[1,3]][phase];const table=page.locator(`[data-chorus-schedule=${id}]`);await expect(table.locator('th[scope=col]')).toHaveCount(2);
 for(const [i,voice]of voices.entries()){
  const windows=eligible.includes(i)?score[i].map(([a,b])=>[Math.max(0,a+Math.round(offsets[i]*20)),Math.min(240,b+Math.round(offsets[i]*20))]).filter(([a,b])=>b>a):[];
  const row=table.locator(`[data-chorus-schedule-voice=${voice}]`);await expect(row.locator('li')).toHaveText(windows.map(([a,b])=>(a/20).toFixed(2)+'–'+(b/20).toFixed(2)));
  await expect(row.locator('th[scope=row] small')).toHaveText(!eligible.includes(i)?'Outside this phase':windows.some(([a,b])=>time*20>=a&&time*20<b)?'Active at cursor':'Between phrases');
 }
}

test('chorus schedule and timeline accessibility',async({page})=>{
 await mountChorus(page);
 if(!baseline){
  await page.locator('[data-chorus-data] summary').click();
  const offsets=[1,-2,-1.1,2];for(const [i,voice]of voices.entries()){await page.locator(`[data-chorus-voice-choice=${voice}]`).click();await page.locator('#birdlab-chorus-offset').fill(String(offsets[i]));}
  for(const phase of [0,1,2,3]){await page.locator('#birdlab-dawn-phase').fill(String(phase));for(const time of [0,1.4,2.1,9.7,12]){await page.locator('#birdlab-chorus-time').fill(String(time));await verifySchedule(page,'current',phase,offsets,time);}}
  await page.locator('#birdlab-dawn-phase').fill('2');await page.locator('#birdlab-chorus-time').fill('2.1');await page.locator('[data-chorus-pin]').click();await expect(page.locator('[data-chorus-announcement]')).toContainText('Arrangement frozen');
  await page.locator('#birdlab-dawn-phase').fill('3');await page.locator('#birdlab-chorus-time').fill('10');await verifySchedule(page,'pinned',2,offsets,2.1);await page.locator('[data-chorus-restore]').click();await verifySchedule(page,'current',2,offsets,2.1);await expect(page.locator('[data-chorus-announcement]')).toContainText('Frozen arrangement restored');
  await page.locator('[data-chorus-clear]').click();await expect(page.locator('[data-chorus-pin]')).toBeFocused();await expect(page.locator('[data-chorus-announcement]')).toHaveText('Frozen arrangement cleared.');
  await page.locator('[data-chorus-boundary=next]').click();await expect(page.locator('[data-chorus-announcement]')).toContainText('seconds.');await expect(page.locator('#birdlab-chorus-time')).toHaveAttribute('aria-valuetext',/Active voices:|No voices active/);await expect(page.locator('[data-chorus-timeline]')).toHaveAttribute('aria-describedby','birdlab-chorus-cursor-help');
  await expect(page.locator('[data-birdlab-chorus-study] output:not([aria-hidden=true])')).toHaveCount(0);
  await page.locator('[data-chorus-data] summary').click();await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-chorus-play]').click();const message=await page.locator('[data-chorus-announcement]').textContent();await expect.poll(async()=>Number(await page.locator('#birdlab-chorus-time').inputValue())).toBeGreaterThan(0);await page.waitForTimeout(200);expect(await page.locator('[data-chorus-announcement]').textContent()).toBe(message);
  await page.locator('[data-chorus-data] summary').click();await expect(page.locator('[data-birdlab-chorus-study]')).toHaveAttribute('data-chorus-playing','false');const time=await page.locator('#birdlab-chorus-time').inputValue();await page.waitForTimeout(200);await expect(page.locator('#birdlab-chorus-time')).toHaveValue(time);
  await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('[data-chorus-play]')).toBeDisabled();await page.locator('[data-chorus-pin]').click();
 }
 await audit(page,'chorus','[data-birdlab-chorus-study]');
 if(!baseline){const focus=await focusCheck(page,'[data-chorus-data] summary');await page.emulateMedia({forcedColors:'active'});const forced=await focusCheck(page,'[data-chorus-data] summary');await page.emulateMedia({forcedColors:'none'});await capture(page,'[data-chorus-data]','chorus-schedule-320.png');writeFileSync(resolve(output,'chorus-interactions.json'),JSON.stringify({focus,forced,independentSchedules:20,quietPlayback:true,openingSchedulePauses:true},null,2));}
});
test('sound arrival and receiver comparison accessibility',async({page})=>{
 await mountSound(page);
 if(!baseline){
  await expect(page.getByRole('slider',{name:'Source bearing',exact:true})).toHaveAttribute('aria-valuetext','40 degrees');await expect(page.getByRole('slider',{name:'Head turn',exact:true})).toHaveValue('0');
  await page.getByRole('slider',{name:'Pulse travel',exact:true}).fill('0');await expect(page.locator('#rh-sound-phase')).toHaveAttribute('aria-valuetext','0 diagram units. Left receiver: waiting. Right receiver: waiting.');
  await page.locator('[data-sound-pin]').click();await expect(page.locator('[data-sound-announcement]')).toContainText('Paths pinned. Left');await page.locator('[data-sound-clear-pin]').click();await expect(page.locator('[data-sound-pin]')).toBeFocused();await expect(page.locator('[data-sound-announcement]')).toHaveText('Pinned paths cleared.');
  await page.locator('[data-sound-pin]').click();await page.locator('[data-sound-challenge]').click();await page.locator('[data-sound-clear-pin]').click();await expect(page.locator('[data-sound-challenge]')).toBeFocused();
  const answer=page.locator('[data-sound-answer=left]');await answer.focus();await page.keyboard.press('Enter');await expect(answer).toBeFocused();await expect(answer).toHaveAttribute('aria-disabled','true');await expect(answer).toHaveAttribute('aria-pressed','true');await expect(answer).toHaveAttribute('aria-describedby','rh-sound-trial-feedback');const feedback=await page.locator('#rh-sound-trial-feedback').textContent();await page.locator('[data-sound-answer=right]').focus();await page.keyboard.press('Enter');await expect(page.locator('#rh-sound-trial-feedback')).toHaveText(feedback!);
  await page.locator('[data-sound-explore]').click();await expect(page.locator('[data-sound-challenge]')).toBeFocused();
  await expect(page.locator('[data-raptor-sound-study] output:not([aria-hidden=true])')).toHaveCount(0);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-sound-rewind]').click();await page.locator('[data-sound-play]').click();const message=await page.locator('[data-sound-announcement]').textContent();await expect.poll(async()=>Number(await page.locator('[data-raptor-sound-study]').getAttribute('data-phase'))).toBeGreaterThan(0);expect(await page.locator('[data-sound-announcement]').textContent()).toBe(message);await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('[data-raptor-sound-study]')).toHaveAttribute('data-playing','false');
 }
 await page.locator('[data-ambiguity-hold]').click();await audit(page,'sound','[data-raptor-sound-study]');
 if(!baseline){const focus=await focusCheck(page,'#rh-sound-phase');expect(await page.locator('#rh-sound-phase').evaluate(n=>n.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);await page.emulateMedia({forcedColors:'active'});const forced=await focusCheck(page,'#rh-sound-phase');await page.emulateMedia({forcedColors:'none'});await capture(page,'.rh-sound-controls','sound-controls-320.png');writeFileSync(resolve(output,'sound-interactions.json'),JSON.stringify({focus,forced,answerFocusPreserved:true,clearPinFocusRestored:true,quietPlayback:true},null,2));}
});
async function receiverPoint(page:Page,degrees:number){return page.locator('[data-ambiguity-scene]').evaluate((n:SVGSVGElement,a)=>{const p=new DOMPoint(320+111*Math.sin(a*Math.PI/180),280-111*Math.cos(a*Math.PI/180)).matrixTransform(n.getScreenCTM()!);return{x:p.x,y:p.y};},degrees);}
test('receiver handle restores its angle and releases pointer capture on interruption',async({page})=>{
 test.skip(baseline);await mountSound(page);await page.locator('[data-ambiguity-hold]').click();const handle=page.locator('[data-ambiguity-handle]');
 await handle.scrollIntoViewIfNeeded();await handle.evaluate(n=>n.addEventListener('pointerdown',(e:PointerEvent)=>{(window as any).__receiverPointer=e.pointerId;}));
 const start=await receiverPoint(page,0),end=await receiverPoint(page,30);await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:4});await expect(page.locator('[data-ambiguity-head]')).toHaveValue('30');await page.keyboard.press('Escape');expect(await handle.evaluate(n=>n.hasPointerCapture((window as any).__receiverPointer))).toBe(false);await expect(page.locator('[data-ambiguity-head]')).toHaveValue('0');await page.mouse.move(end.x,end.y);await page.mouse.up();await expect(page.locator('[data-ambiguity-head]')).toHaveValue('0');
 const cdp=await page.context().newCDPSession(page);for(const cancel of ['second-contact','touch-cancel','blur']){await handle.scrollIntoViewIfNeeded();const a=await receiverPoint(page,0),b=await receiverPoint(page,-30);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...a}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,...b}]});await expect(page.locator('[data-ambiguity-head]')).toHaveValue('-30');if(cancel==='second-contact')await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...b},{id:2,x:b.x+90,y:b.y+80}]});else if(cancel==='blur')await page.evaluate(()=>window.dispatchEvent(new Event('blur')));else await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await expect(page.locator('[data-ambiguity-head]')).toHaveValue('0');expect(await handle.evaluate(n=>n.hasPointerCapture((window as any).__receiverPointer))).toBe(false);if(cancel!=='touch-cancel')await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}await cdp.detach();
 await handle.focus();await page.keyboard.press('Shift+ArrowRight');await expect(page.locator('[data-ambiguity-head]')).toHaveValue('10');await expect(handle).toHaveAccessibleDescription(/Shift moves ten degrees/);await page.keyboard.press('End');await expect(page.locator('[data-ambiguity-head]')).toHaveValue('60');writeFileSync(resolve(output,'receiver-interruptions.json'),JSON.stringify({escape:true,secondContact:true,touchCancel:true,blur:true,pointerCaptureReleased:true,keyboard:true},null,2));
});
test('native camera compass accessibility',async({page})=>{
 await mountCamera(page);
 if(!baseline){await page.locator('[data-study-angle=bearing]').fill('42');await expect(page.locator('[data-study-angle=bearing]')).toHaveAttribute('aria-valuetext','42.0 degrees');await expect(page.locator('[data-study-angle=bearing]')).toHaveAccessibleDescription(/Terrain may lift the camera.*Actual camera:/);await expect(page.locator('[data-study-fine] output:not([aria-hidden=true])')).toHaveCount(0);await page.locator('[data-study-angle=bearing]').focus();await page.keyboard.press('ArrowRight');await expect(page.locator('[data-study-angle=bearing]')).toHaveAttribute('aria-valuetext','42.1 degrees');}
 await audit(page,'camera','[data-raptor-flight-stage]');
 if(!baseline){const focus=await focusCheck(page,'[data-study-angle=elevation]');await page.emulateMedia({forcedColors:'active'});const forced=await focusCheck(page,'[data-study-angle=elevation]');await page.emulateMedia({forcedColors:'none'});await capture(page,'[data-study-fine]','camera-compass-320.png');writeFileSync(resolve(output,'camera-interactions.json'),JSON.stringify({focus,forced},null,2));}
});
