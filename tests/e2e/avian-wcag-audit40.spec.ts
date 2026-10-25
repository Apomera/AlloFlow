import {test, expect, type Page} from '@playwright/test';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.use({video:'off', trace:'off', hasTouch:true});
test.describe.configure({retries:0, timeout:180000});
const output=resolve('reports/avian-simulations-round40-wcag-2026-10-23');
const bird=new GlHarness({toolId:'birdLab',toolFile:'stem_lab/stem_tool_birdlab.js',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],width:1100,height:1000,appStyles:true,layout:'document'});
const raptor=new GlHarness({toolId:'raptorHunt',toolFile:'stem_lab/stem_tool_raptorhunt.js',extraScripts:['node_modules/axe-core/axe.min.js'],width:1100,height:1000,appStyles:true,layout:'document'});
const errors=new WeakMap<Page,string[]>();
test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await bird.start();await raptor.start();});
test.afterAll(async()=>{await bird.stop();await raptor.stop();});
test.beforeEach(async({page})=>{const list:string[]=[];errors.set(page,list);page.on('pageerror',e=>list.push(e.stack||e.message));});
test.afterEach(async({page})=>{await bird.destroy(page);expect(errors.get(page)).toEqual([]);});
async function mount(page:Page,kind:'bird'|'raptor'){
 await page.setViewportSize({width:1280,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
 await (kind==='bird'?bird:raptor).mount(page,kind==='bird'?{birdLab:{view:'optics',blXp:0,blLifeList:{},blBadges:{}}}:{raptorHunt:{activeSection:'flight_dynamics'}},undefined,{expectCanvas:false});
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

test('alignment results, semantic measurements, stable names and narrow layouts',async({page})=>{
 await mount(page,'bird');const scope='[data-birdlab-pupil-study]',status=page.locator('[data-pupil-status]');
 await expect(page.getByRole('slider',{name:'Horizontal eye offset ·',exact:true})).toHaveValue('0');
 await expect(page.locator('#birdlab-pupil-offset')).toHaveAttribute('aria-valuetext','0.0 millimeters; 32.7 percent of beam area inside eye');
 await page.locator('[data-pupil-pin]').click();await expect(status).toContainText('Frozen 8 × 42');
 await page.locator('#birdlab-pupil-offset').fill('12');await page.locator('[data-pupil-read]').focus();await page.keyboard.press('Enter');await expect(page.locator('[data-pupil-read]')).toBeFocused();
 await expect(status).toHaveText('Current alignment: 12.0 millimeters; 0.0 percent of beam area inside eye, 0.0 percent of eye area covered, 0.00 square millimeters shared. Frozen beam area inside eye: 32.7 percent. Current minus frozen: -32.7 percentage points.');
 await expect(page.locator(scope+' dl')).toHaveCount(2);await expect(page.locator(scope+' dl dt')).toHaveCount(6);await expect(page.locator(scope+' output:not([aria-hidden=true])')).toHaveCount(0);
 await page.locator('[data-pupil-experiment=restore]').click();await expect(status).toHaveText('All four frozen settings restored.');await expect(page.locator('#birdlab-pupil-offset')).toHaveValue('0');
 await page.locator('[data-pupil-clear]').click();await expect(page.locator('[data-pupil-pin]')).toBeFocused();await expect(status).toContainText('cleared');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-pupil-sweep]').click();const message=await status.textContent();await expect.poll(async()=>Number(await page.locator('#birdlab-pupil-offset').inputValue())).toBeGreaterThan(-12);await page.waitForTimeout(200);await expect(status).toHaveText(message!);
 await page.locator('[data-pupil-read]').click();await expect(page.locator(scope)).toHaveAttribute('data-pupil-sweeping','false');const offset=await page.locator('#birdlab-pupil-offset').inputValue();await page.waitForTimeout(100);await expect(page.locator('#birdlab-pupil-offset')).toHaveValue(offset);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('[data-pupil-sweep]')).toBeDisabled();await page.locator('[data-pupil-reset]').click();await page.locator('[data-pupil-pin]').click();await page.locator('#birdlab-pupil-offset').fill('2');
 await audit(page,scope,'alignment');const normal=await focus(page,'[data-pupil-graph]');await photo(page,'.birdlab-pupil-controls','alignment-controls-320.png');await photo(page,'[data-pupil-condition=current]','alignment-measurements-320.png');
 await page.emulateMedia({forcedColors:'active'});const forced=await focus(page,'[data-pupil-graph]');await expect(page.locator('[data-pupil-graph] > rect')).toHaveCSS('fill','rgb(255, 255, 255)');await expect(page.locator('[data-pupil-graph] text').first()).toHaveCSS('fill','rgb(0, 0, 0)');await photo(page,'[data-pupil-condition=current]','alignment-forced-320.png');writeFileSync(resolve(output,'alignment-feedback.json'),JSON.stringify({normal,forced,quietSweep:true,onDemandReadout:true,clearRestoresFocus:true},null,2));
});

test('bank comparison table, result feedback, reduced motion and narrow layouts',async({page})=>{
 await mount(page,'raptor');const scope='[data-raptor-bank-study]',status=page.locator('[data-bank-status]');
 await expect(page.getByRole('slider',{name:'Current speed',exact:true})).toHaveAttribute('aria-valuetext','12 meters per second');await expect(page.getByRole('slider',{name:'Current bank · right is positive',exact:true})).toHaveAttribute('aria-valuetext','30 degrees right');
 await page.locator('[data-bank-pin]').click();await expect(status).toContainText('Turn frozen:');await page.locator('[data-bank-experiment=mirror]').click();await expect(status).toContainText('30 degrees left');
 await page.locator('[data-bank-measurements] summary').click();const table=page.locator('.rh-bank-table');await expect(table.locator('th[scope=col]')).toHaveText(['Measurement','Current','Frozen']);await expect(table.locator('tbody tr').nth(1).locator('td')).toHaveText(['-30','30']);await expect(table.locator('tbody tr').nth(2).locator('td')).toHaveText(['1.155','1.155']);
 await page.locator('[data-bank-experiment=double]').click();await expect(table.locator('tbody tr').first().locator('td')).toHaveText(['24','12']);await expect(table.locator('tbody tr').last().locator('td')).toHaveText(['48','24']);
 await page.locator('[data-bank-experiment=level]').click();await expect(table.locator('tbody tr').nth(3).locator('td').first()).toHaveText('Straight path');await expect(table.locator('tbody tr').nth(4).locator('td').first()).toHaveText('0');await page.locator('[data-bank-read]').click();await expect(status).toContainText('Current: 0 degrees, wings level');await expect(status).toContainText('Frozen: 30 degrees right');
 await page.locator('[data-bank-play]').click();await expect(status).toContainText('Reduced motion is enabled');await expect(page.locator(scope)).toHaveAttribute('data-bank-playing','false');
 await page.locator('[data-bank-measurements] summary').click();await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-bank-play]').click();const message=await status.textContent();await expect.poll(async()=>Number(await page.locator('#rh-bank-time').inputValue())).toBeGreaterThan(2);await page.waitForTimeout(100);await expect(status).toHaveText(message!);
 await page.locator('[data-bank-measurements] summary').click();await expect(page.locator(scope)).toHaveAttribute('data-bank-playing','false');await expect(status).toContainText('Comparison measurements are ready to read.');const time=await page.locator('#rh-bank-time').inputValue();await page.waitForTimeout(100);await expect(page.locator('#rh-bank-time')).toHaveValue(time);await expect(table.locator('caption')).toContainText('at '+time+' seconds');
 await page.locator('[data-bank-clear]').click();await expect(page.locator('[data-bank-pin]')).toBeFocused();await expect(status).toContainText('cleared');await page.locator('[data-bank-pin]').click();await page.locator('[data-bank-measurements] summary').click();await page.emulateMedia({reducedMotion:'reduce'});
 await expect(page.locator(scope+' output:not([aria-hidden=true])')).toHaveCount(0);await audit(page,scope,'bank');const normal=[];for(const selector of ['[data-bank-measurements] summary','[data-bank-handle=bank]','[data-bank-handle=time]','.rh-bank-model summary'])normal.push(await focus(page,selector));await photo(page,'.rh-bank-comparison','bank-comparison-320.png');await photo(page,'.rh-bank-controls','bank-controls-320.png');
 await page.emulateMedia({forcedColors:'active'});const forced=[];for(const selector of ['[data-bank-measurements] summary','[data-bank-handle=bank]','[data-bank-handle=time]'])forced.push(await focus(page,selector));await expect(page.locator('[data-bank-forces=current] > rect').first()).toHaveCSS('fill','rgb(255, 255, 255)');await expect(page.locator('[data-bank-forces=current] text').first()).toHaveCSS('fill','rgb(0, 0, 0)');await photo(page,'[data-bank-forces=current]','bank-forced-320.png');writeFileSync(resolve(output,'bank-feedback.json'),JSON.stringify({normal,forced,quietSweep:true,openingTablePauses:true,clearRestoresFocus:true},null,2));
});

type Target={selector:string;input:string;start:number;end:number;mode:'disks'|'graph'|'bank'|'time'};
async function points(page:Page,target:Target){
 await page.locator(target.input).fill(String(target.start));await page.locator(target.selector).scrollIntoViewIfNeeded();
 return page.locator(target.selector).evaluate((node,config)=>{const svg=(node.tagName.toLowerCase()==='svg'?node:(node as SVGGElement).ownerSVGElement)as SVGSVGElement;const matrix=svg.getScreenCTM()!;function point(v:number){const native=config.mode==='disks'?new DOMPoint(380+16*v,210):config.mode==='graph'?new DOMPoint(60+(v+12)*640/24,150):config.mode==='bank'?new DOMPoint(300+130*Math.cos(v*Math.PI/180),300+130*Math.sin(v*Math.PI/180)):new DOMPoint(90+105*v,650);const p=native.matrixTransform(matrix);return{x:p.x,y:p.y};}return{start:point(config.start),end:point(config.end)};},target);
}
for(const kind of ['bird','raptor']as const)test(kind+' drawing gestures restore values on interruption and release capture',async({page})=>{
 await mount(page,kind);const targets:Target[]=kind==='bird'?[{selector:'[data-pupil-disks=current]',input:'#birdlab-pupil-offset',start:0,end:2,mode:'disks'},{selector:'[data-pupil-graph]',input:'#birdlab-pupil-offset',start:0,end:2,mode:'graph'}]:[{selector:'[data-bank-handle=bank]',input:'#rh-bank-bank',start:30,end:-30,mode:'bank'},{selector:'[data-bank-handle=time]',input:'#rh-bank-time',start:2,end:3,mode:'time'}];
 const results=[];
 for(const target of targets){
  const handle=page.locator(target.selector);await handle.evaluate(node=>node.addEventListener('pointerdown',(e:PointerEvent)=>{(window as any).__pointer40=e.pointerId;}));
  for(const interrupt of ['escape','focus','blur','hidden','capture']){
   const p=await points(page,target);await page.mouse.move(p.start.x,p.start.y);await page.mouse.down();await page.mouse.move(p.end.x,p.end.y,{steps:5});await expect(page.locator(target.input)).toHaveValue(String(target.end));
   if(interrupt==='escape')await page.keyboard.press('Escape');
   if(interrupt==='focus')await page.locator(target.input).focus();
   if(interrupt==='blur')await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
   if(interrupt==='hidden')await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete(document as any).hidden;});
   if(interrupt==='capture'){await handle.evaluate(n=>(n as Element).releasePointerCapture((window as any).__pointer40));await page.mouse.move(p.end.x+1,p.end.y);}
   await expect(page.locator(target.input)).toHaveValue(String(target.start));expect(await handle.evaluate(n=>(n as Element).hasPointerCapture((window as any).__pointer40))).toBe(false);await page.mouse.up();await expect(page.locator(target.input)).toHaveValue(String(target.start));results.push({mode:target.mode,interrupt,restored:true});
  }
  const cdp=await page.context().newCDPSession(page);
  try{for(const interrupt of ['touch-cancel','outside-contact']){
   const p=await points(page,target);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p.start,id:1}]});for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.start.x+(p.end.x-p.start.x)*i/5,y:p.start.y+(p.end.y-p.start.y)*i/5,id:1}]});await expect(page.locator(target.input)).toHaveValue(String(target.end));
   if(interrupt==='touch-cancel')await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});else await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p.end,id:1},{x:4,y:4,id:2}]});
   await expect(page.locator(target.input)).toHaveValue(String(target.start));expect(await handle.evaluate(n=>(n as Element).hasPointerCapture((window as any).__pointer40))).toBe(false);if(interrupt!=='touch-cancel')await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});results.push({mode:target.mode,interrupt,restored:true});
  }}finally{await cdp.detach();}
  await handle.focus();await expect(handle).toHaveAccessibleDescription(/Escape cancels a drag/);await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');await expect(page.locator(target.input)).toHaveValue(kind==='bird'?'-11.9':target.mode==='bank'?'-59':'0.05');await expect(handle).toBeFocused();
 }
 writeFileSync(resolve(output,kind+'-interruptions.json'),JSON.stringify(results,null,2));
});
