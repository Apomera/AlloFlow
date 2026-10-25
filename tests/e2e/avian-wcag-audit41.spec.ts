import {test, expect, type Page} from '@playwright/test';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.use({video:'off', trace:'off', hasTouch:true});
test.describe.configure({retries:0, timeout:180000});
const output=resolve('reports/avian-simulations-round41-wcag-2026-10-23');
const bird=new GlHarness({toolId:'birdLab',toolFile:'stem_lab/stem_tool_birdlab.js',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],width:1100,height:1000,appStyles:true,layout:'document'});
const raptor=new GlHarness({toolId:'raptorHunt',toolFile:'stem_lab/stem_tool_raptorhunt.js',extraScripts:['node_modules/axe-core/axe.min.js'],width:1100,height:1000,appStyles:true,layout:'document'});
const errors=new WeakMap<Page,string[]>();
test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await bird.start();await raptor.start();});
test.afterAll(async()=>{await bird.stop();await raptor.stop();});
test.beforeEach(async({page})=>{const list:string[]=[];errors.set(page,list);page.on('pageerror',e=>list.push(e.stack||e.message));});
test.afterEach(async({page})=>{await bird.destroy(page);expect(errors.get(page)).toEqual([]);});
async function mount(page:Page,kind:'bird'|'raptor'){
 await page.setViewportSize({width:1280,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
 await (kind==='bird'?bird:raptor).mount(page,kind==='bird'?{birdLab:{view:'footTypes',blXp:0,blLifeList:{},blBadges:{}}}:{raptorHunt:{activeSection:'urban'}},undefined,{expectCanvas:false});
 await page.locator('#wrap').evaluate((n:HTMLElement)=>{n.style.maxWidth='100%';n.setAttribute('data-stem-tool-shell','true');});
}
async function audit(page:Page,scope:string,id:string){
 const scans=[];
 for(const width of [1280,320]){
  await page.setViewportSize({width,height:1000});await page.locator('#wrap').evaluate((n:HTMLElement,w)=>n.style.width=Math.min(1100,w)+'px',width);
  const scan=await page.evaluate(async scope=>{const result=await(window as any).axe.run(scope,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});return {violations:result.violations,incomplete:result.incomplete.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)})),pageWidth:document.documentElement.scrollWidth};},scope);
  scans.push({width,...scan});expect(scan.violations).toEqual([]);expect(scan.pageWidth).toBeLessThanOrEqual(width);
 }
 const style=await page.addStyleTag({content:`${scope},${scope} *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}${scope} p{margin-bottom:2em!important}`});
 const spacing=await page.locator(scope).evaluate(n=>({width:document.documentElement.scrollWidth,clipped:[...n.querySelectorAll('button,summary,td,th,dt,dd')].filter(e=>e.getClientRects().length&&(e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2)).map(e=>({tag:e.tagName,text:e.textContent}))}));
 await style.evaluate(n=>n.remove());writeFileSync(resolve(output,id+'-audit.json'),JSON.stringify({scans,spacing},null,2));expect(spacing.width).toBeLessThanOrEqual(320);expect(spacing.clipped).toEqual([]);
}
async function focus(page:Page,selector:string){
 await page.keyboard.press('Tab');const item=page.locator(selector);await item.focus();await item.scrollIntoViewIfNeeded();await expect(item).toBeFocused();
 const result=await item.evaluate(n=>{const s=getComputedStyle(n);return{outline:s.outlineStyle,width:s.outlineWidth,color:s.outlineColor,visible:n.matches(':focus-visible')};});expect(result.visible).toBe(true);expect(result.outline).toBe('solid');expect(result.width).toBe('3px');return {selector,...result};
}
async function photo(page:Page,selector:string,file:string){await page.locator(selector).scrollIntoViewIfNeeded();await page.locator(selector).screenshot({path:resolve(output,file),animations:'disabled'});}

test('toe studio respects motion preferences and exposes complete, restorable pose comparisons',async({page})=>{
 await mount(page,'bird');const scope='[data-birdlab-toe-study]',status=page.locator('[data-toe-status]'),play=page.locator('[data-toe-play]');
 await expect(play).toBeDisabled();await expect(page.locator('#birdlab-toe-motion-help')).toContainText('Reduced motion is enabled');
 await expect(page.getByRole('slider',{name:'Branch radius',exact:true})).toHaveAttribute('aria-valuetext','56 drawing units');await expect(page.getByRole('slider',{name:'Illustrated curl',exact:true})).toHaveAttribute('aria-valuetext','45 percent illustrated curl');
 await page.locator('[data-toe-data] summary').click();const rows=page.locator('[data-toe-data] tbody tr');await expect(rows.locator('td')).toHaveText(['Backward','Forward','Forward · selected','Forward']);
 await expect(page.locator('[data-toe-map=current]')).toHaveAccessibleName(/Toe I backward; Toe II forward; Toe III forward; Toe IV forward/);
 await page.locator('[data-toe-pin]').click();await expect(status).toContainText('Pose pinned. Songbird pattern. Selected toe III, 45 percent');
 await page.locator('button[data-toe-kind=parrot]').click();await expect(rows.nth(3).locator('td')).toHaveText(['Backward','Forward']);await expect(status).toContainText('Toe identity stays the same');
 await page.locator('button[data-toe-kind=owl]').click();await page.locator('#birdlab-toe-outer').fill('40');await expect(rows.nth(3).locator('td').first()).toHaveText('Forward');await page.locator('#birdlab-toe-outer').fill('50');await expect(rows.nth(3).locator('td').first()).toHaveText('Backward');
 await page.locator('[data-toe-select="3"]').click();await page.locator('#birdlab-toe-branch').fill('82');await page.locator('#birdlab-toe-curl').fill('100');await page.locator('[data-toe-read]').click();await expect(status).toContainText('Current: Reversible outer toe. Selected toe IV, 100 percent illustrated curl, branch radius 82 drawing units. Outer toe IV sweep 50 percent.');await expect(status).toContainText('Pinned: Songbird pattern. Selected toe III, 45 percent');
 await page.locator('[data-toe-restore]').focus();await page.keyboard.press('Enter');await expect(page.locator('[data-toe-restore]')).toBeFocused();await expect(page.locator(scope)).toHaveAttribute('data-toe-kind','songbird');await expect(page.locator('#birdlab-toe-branch')).toHaveValue('56');await expect(page.locator('#birdlab-toe-curl')).toHaveValue('45');await expect(page.locator('[data-toe-select="2"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-toe-clear-pin]').click();await expect(page.locator('[data-toe-pin]')).toBeFocused();await expect(status).toHaveText('Pinned pose cleared. Current pose kept.');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-toe-data] summary').click();await play.click();const message=await status.textContent();await expect.poll(async()=>Number(await page.locator(scope).getAttribute('data-toe-curl'))).toBeGreaterThan(45);await page.waitForTimeout(100);await expect(status).toHaveText(message!);
 await page.locator('[data-toe-data] summary').click();await expect(page.locator(scope)).toHaveAttribute('data-playing','false');await expect(status).toContainText('pose measurements are ready');await expect(page.locator('output[for=birdlab-toe-curl]')).toHaveText(/^\d+%$/);const stopped=await page.locator(scope).getAttribute('data-toe-curl');await page.waitForTimeout(100);await expect(page.locator(scope)).toHaveAttribute('data-toe-curl',stopped!);
 await play.click();await page.emulateMedia({reducedMotion:'reduce'});await expect(play).toBeDisabled();await expect(page.locator(scope)).toHaveAttribute('data-playing','false');await expect(status).toContainText('Curl paused at');
 await page.locator('[data-toe-pin]').click();await page.locator('button[data-toe-kind=parrot]').click();await expect(page.locator(scope+' output:not([aria-hidden=true])')).toHaveCount(0);await audit(page,scope,'toe');
 const small=await page.locator(scope+' button,'+scope+' input').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).filter(n=>{const r=n.getBoundingClientRect();return r.width<44||r.height<44;}).map(n=>n.id||n.textContent));expect(small).toEqual([]);
 const normal=await focus(page,'[data-toe-data] summary');await photo(page,'[data-toe-data]','toe-comparison-320.png');await photo(page,'.birdlab-toe-control:has(#birdlab-toe-curl)','toe-curl-320.png');await page.emulateMedia({forcedColors:'active'});const forced=await focus(page,'[data-toe-data] summary');await expect(page.locator('[data-toe-map=current] > rect').first()).toHaveCSS('fill','rgb(255, 255, 255)');await photo(page,'[data-toe-map=current]','toe-forced-320.png');writeFileSync(resolve(output,'toe-feedback.json'),JSON.stringify({normal,forced,completeRestore:true,quietPlayback:true,initialReducedMotion:true,clearRestoresFocus:true},null,2));
});

test('skyline boundaries describe contacts and gaps while keeping keyboard focus and motion control',async({page})=>{
 await mount(page,'raptor');const scope='[data-raptor-skyline-study]',status=page.locator('[data-sky-status]'),next=page.locator('[data-sky-boundary=next]'),previous=page.locator('[data-sky-boundary=previous]');
 await expect(page.locator('#rh-sky-eye')).toHaveAttribute('aria-valuetext','12 meters high');await expect(page.locator('#rh-sky-probe')).toHaveAttribute('aria-valuetext','50 meters along the section; ray height 35 meters, building B, 3 meters below the roof');
 await page.locator('[data-sky-pin]').click();await page.locator('#rh-sky-probe').fill('0');await next.focus();
 const fixtures=[[25,'23.5','A','3.5 meters above'],[35,'28.1','A','8.1 meters above'],[50,'35','B','3 meters below'],[60,'39.6','B','1.6 meters above'],[75,'46.5','C','4.5 meters above'],[85,'51.1','C','9.1 meters above'],[100,'58',null,null]]as const;
 for(const [distance,height,roof,clearance]of fixtures){await page.keyboard.press('Enter');await expect(next).toBeFocused();await expect(page.locator('#rh-sky-probe')).toHaveValue(String(distance));await expect(status).toContainText('Probe at '+distance+' meters. Current: ray height '+height+' meters, '+(roof?'building '+roof+', '+clearance+' the roof':'open gap with no roof'));await expect(status).toContainText('Frozen:');}
 await expect(next).toHaveAttribute('aria-disabled','true');const end=await status.textContent();await page.keyboard.press('Enter');await expect(status).toHaveText(end!);await expect(next).toBeFocused();
 await previous.focus();for(const value of [85,75,60,50,35,25,0]){await page.keyboard.press('Space');await expect(page.locator('#rh-sky-probe')).toHaveValue(String(value));await expect(previous).toBeFocused();}await expect(previous).toHaveAttribute('aria-disabled','true');
 await page.locator('#rh-sky-probe').fill('40');await page.locator('[data-sky-read]').click();await expect(status).toContainText('ray height 30.4 meters, open gap with no roof');await expect(status).toContainText('First solid contact at 50 meters');
 await page.locator('#rh-sky-eye').fill('20');await page.locator('#rh-sky-target').fill('20');await page.locator('#rh-sky-probe').fill('25');await page.locator('[data-sky-read]').click();await expect(status).toContainText('building A, touching the roof');await expect(status).toContainText('First solid contact at 25 meters');
 await page.locator('[data-sky-play]').click();await expect(status).toContainText('Reduced motion is enabled');await expect(page.locator(scope)).toHaveAttribute('data-sky-playing','false');await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-sky-play]').click();const message=await status.textContent();await expect.poll(async()=>Number(await page.locator('#rh-sky-probe').inputValue())).toBeGreaterThan(25);await page.waitForTimeout(100);await expect(status).toHaveText(message!);
 await next.click();await expect(page.locator(scope)).toHaveAttribute('data-sky-playing','false');await expect(status).toContainText('Boundary selected.');await page.locator('[data-sky-clear]').click();await expect(page.locator('[data-sky-pin]')).toBeFocused();await expect(status).toContainText('cleared');
 await page.locator('[data-sky-reset]').click();await page.locator('[data-sky-pin]').click();await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator(scope+' output:not([aria-hidden=true])')).toHaveCount(0);await audit(page,scope,'skyline');
 const normal=[];for(const selector of ['[data-sky-boundary=next]','[data-sky-handle=roofB]','[data-sky-handle=probe]','.rh-sky-model summary'])normal.push(await focus(page,selector));await photo(page,'.rh-sky-controls','skyline-controls-320.png');await photo(page,'[data-sky-condition=current] .rh-sky-readings','skyline-readings-320.png');
 await page.emulateMedia({forcedColors:'active'});const forced=await focus(page,'[data-sky-handle=roofB]');await expect(page.locator('[data-sky-scene=current] > rect').first()).toHaveCSS('fill','rgb(255, 255, 255)');await photo(page,'[data-sky-scene=current]','skyline-forced-320.png');writeFileSync(resolve(output,'skyline-feedback.json'),JSON.stringify({normal,forced,independentBoundaryFixtures:fixtures,quietSweep:true,boundaryButtonsKeepFocus:true,readoutContactAndGap:true},null,2));
});

async function points(page:Page,key:string,start:number,end:number){
 await page.locator('#rh-sky-'+key).fill(String(start));const handle=page.locator('[data-sky-handle='+key+']');await handle.scrollIntoViewIfNeeded();return handle.evaluate((node,values)=>{const svg=(node as SVGGElement).ownerSVGElement!,circle=node.querySelector<SVGCircleElement>('[data-sky-handle-center]')!,matrix=svg.getScreenCTM()!;const a=new DOMPoint(circle.cx.baseVal.value,circle.cy.baseVal.value).matrixTransform(matrix),b=new DOMPoint(values.key==='probe'?60+4.8*values.end:circle.cx.baseVal.value,values.key==='probe'?674:540-4.8*values.end).matrixTransform(matrix);return{start:{x:a.x,y:a.y},end:{x:b.x,y:b.y}};},{key,end});
}
test('skyline height and distance gestures restore their starting values on interruption',async({page})=>{
 await mount(page,'raptor');const results=[];
 for(const target of [{key:'roofB',start:38,end:50},{key:'probe',start:50,end:75}]){
  const handle=page.locator('[data-sky-handle='+target.key+']'),input=page.locator('#rh-sky-'+target.key);await handle.evaluate(n=>n.addEventListener('pointerdown',(e:PointerEvent)=>(window as any).__pointer41=e.pointerId));
  for(const interrupt of ['escape','focus','blur','hidden','capture']){
   const p=await points(page,target.key,target.start,target.end);await page.mouse.move(p.start.x,p.start.y);await page.mouse.down();await page.mouse.move(p.end.x,p.end.y,{steps:5});await expect(input).toHaveValue(String(target.end));
   if(interrupt==='escape')await page.keyboard.press('Escape');if(interrupt==='focus')await input.focus();if(interrupt==='blur')await page.evaluate(()=>window.dispatchEvent(new Event('blur')));if(interrupt==='hidden')await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete(document as any).hidden;});if(interrupt==='capture'){await handle.evaluate(n=>n.releasePointerCapture((window as any).__pointer41));await page.mouse.move(p.end.x+1,p.end.y);}
   await expect(input).toHaveValue(String(target.start));expect(await handle.evaluate(n=>n.hasPointerCapture((window as any).__pointer41))).toBe(false);await page.mouse.up();await expect(input).toHaveValue(String(target.start));results.push({key:target.key,interrupt,restored:true});
  }
  const cdp=await page.context().newCDPSession(page);try{for(const interrupt of ['touch-cancel','outside-contact']){const p=await points(page,target.key,target.start,target.end);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p.start,id:1}]});for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.start.x+(p.end.x-p.start.x)*i/5,y:p.start.y+(p.end.y-p.start.y)*i/5,id:1}]});await expect(input).toHaveValue(String(target.end));if(interrupt==='touch-cancel')await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});else await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p.end,id:1},{x:4,y:4,id:2}]});await expect(input).toHaveValue(String(target.start));expect(await handle.evaluate(n=>n.hasPointerCapture((window as any).__pointer41))).toBe(false);if(interrupt!=='touch-cancel')await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});results.push({key:target.key,interrupt,restored:true});}}finally{await cdp.detach();}
 }
 for(const [key,min,max,step]of [['eye',2,30,1],['target',5,85,1],['roofA',5,60,1],['roofB',5,60,1],['roofC',5,60,1],['probe',0,100,.5]]as const){const handle=page.locator('[data-sky-handle='+key+']');await handle.focus();await expect(handle).toHaveAccessibleDescription(/Escape cancels a drag/);await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');await expect(page.locator('#rh-sky-'+key)).toHaveValue(String(min+step));await page.keyboard.press('End');await page.keyboard.press('PageDown');await expect(page.locator('#rh-sky-'+key)).toHaveValue(String(max-10*step));await expect(handle).toBeFocused();}
 writeFileSync(resolve(output,'skyline-interruptions.json'),JSON.stringify(results,null,2));
});

