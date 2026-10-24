import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-spatial-refresh');
const harness = new GlHarness({ toolId: 'weldLab', toolFile: 'stem_lab/stem_tool_weldlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], appStyles: true, layout: 'document' });
test.describe.configure({ retries: 0, timeout: 120_000 });
test.use({ video: 'off' });
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: any, width: number, state: object, contrast = false) {
  await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { weldLab: state }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: 'html,body{height:auto;background:#f8fafc}#wrap{width:100%;height:auto;display:block}' });
  if (contrast) await page.evaluate(() => {
    document.body.classList.add('theme-contrast');
    (window as any).__ctx.isContrast = true; (window as any).__ctx.theme = 'contrast'; (window as any).__rerender();
  });
}
async function inspect(page: any, name: string, selector: string) {
  await expect(page.locator(selector)).toBeVisible();
  await page.locator(selector).screenshot({ path: resolve(output, name + '.png') });
  const result = await page.evaluate(async (selector: string) => {
    const audit = await (window as any).axe.run(document.querySelector(selector), { runOnly: { type: 'rule',
      values: ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value', 'nested-interactive'] } });
    return { overflow: document.documentElement.scrollWidth - innerWidth, overflowNodes: [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1 && !el.closest('[data-noise-chart-scroll],.overflow-x-auto,.preview-bar')).slice(0, 12).map(el => ({ tag: el.tagName, className: el.getAttribute('class'), right: el.getBoundingClientRect().right })), violations: audit.violations.map((v: any) => ({ id: v.id,
      nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) })) };
  }, selector);
  writeFileSync(resolve(output, name + '.json'), JSON.stringify(result, null, 2));
  expect(result.overflow).toBeLessThanOrEqual(1); expect(result.violations).toEqual([]);
}










async function setRange(input:any,value:number){await input.evaluate((element:HTMLInputElement,value:number)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(element,String(value));element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));},value);}
const savedWork = (page:any)=>page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));
const n = async(node:any,attr:string)=>Number(await node.getAttribute(attr));
const symbolState={view:'symbolsReader',sr_view:'library',sym2_pr_ans:{'0_0':1},sym2_b_res:{},sym2_bp_ans:{}};
const pipeState={view:'pipeWelding',pipe_sect:'passes',pipe2_wall:.432,pipe2_stack:['root','hot']};
async function openDetails(panel:any){const details=panel.locator('xpath=ancestor-or-self::details[1]');await expect(details).not.toHaveAttribute('open','');await details.locator('summary').first().click();await expect(panel).toBeVisible();}
function area(points:string){const p=points.trim().split(/\s+/).map(pair=>pair.split(',').map(Number));return Math.abs(p.reduce((sum,pt,i)=>{const q=p[(i+1)%p.length];return sum+pt[0]*q[1]-q[0]*pt[1]},0))/2;}
for(const width of [1280,390]){
 test('Fillet face probe explains the perpendicular throat at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,symbolState);const panel=page.locator('[data-fillet-throat]');await openDetails(panel);const saved=await savedWork(page);const vb=await panel.locator('[data-fillet-drawing]').getAttribute('viewBox');
  for(const leg of [.1875,.25,.375]){await panel.locator('[data-fillet-leg="'+leg+'"]').click();for(const percent of [0,25,50,75,100]){await setRange(panel.locator('[data-fillet-face-probe]'),percent);const u=percent/100,x=180+640*leg*(1-u),y=340-640*leg*u,expected=leg*Math.hypot(1-u,u);const point=panel.locator('[data-fillet-probe-point]'),line=panel.locator('[data-fillet-probe-line]');expect(await n(point,'cx')).toBeCloseTo(x,8);expect(await n(point,'cy')).toBeCloseTo(y,8);expect(await n(line,'data-length')).toBeCloseTo(expected,10);expect(await n(panel.locator('[data-fillet-minimum]'),'data-length')).toBeCloseTo(leg/Math.SQRT2,10);expect(expected+1e-12).toBeGreaterThanOrEqual(leg/Math.SQRT2);expect(await panel.locator('[data-fillet-drawing]').getAttribute('viewBox')).toBe(vb);}}
  await panel.locator('[data-fillet-midpoint]').click();await expect(panel).toHaveAttribute('data-probe-percent','50');await panel.locator('[data-fillet-face-probe]').focus();await page.keyboard.press('ArrowRight');await expect(panel).toHaveAttribute('data-probe-percent','51');await panel.locator('[data-fillet-midpoint]').click();await inspect(page,'fillet-throat-'+width,'[data-fillet-throat]');expect(await savedWork(page)).toBe(saved);expect(errors).toEqual([]);
 });
 test('Two pipe grooves retain a shared physical scale and exact areas at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,pipeState);const panel=page.locator('[data-pipe-area-comparison]');await openDetails(panel);const saved=await savedWork(page),oldGroove=await page.locator('[data-pipe-groove]').evaluate(el=>el.outerHTML);const vb=await panel.locator('svg').getAttribute('viewBox');
  for(const wall of [.218,.432,.719]){await panel.locator('[data-pipe-area-preset="'+wall+'"]').click();expect(await n(panel,'data-wall-b')).toBe(wall);for(const role of ['a','b']){const c=panel.locator('[data-pipe-area-case="'+role+'"]'),t=await n(c,'data-wall'),scale=160;const rectangle=area((await c.locator('[data-pipe-area-rectangle]').getAttribute('points'))!),wedges=await c.locator('[data-pipe-area-bevel]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('points')!));const bevel=wedges.reduce((sum,p)=>sum+area(p),0);expect(rectangle/scale**2).toBeCloseTo(.125*t,10);expect(bevel/scale**2).toBeCloseTo(Math.max(0,t-.0625)**2*Math.tan(37.5*Math.PI/180),10);const core=await page.evaluate(t=>(window as any).__WeldLabCore.pipe2GroovePlan(t).area,t);expect((rectangle+bevel)/scale**2).toBeCloseTo(core,10);expect(await n(c,'data-area')).toBeCloseTo(core,10);}expect(await panel.locator('svg').getAttribute('viewBox')).toBe(vb);}
  await panel.locator('[data-pipe-area-match]').click();expect(await n(panel,'data-wall-b')).toBe(.432);const ratio=panel.locator('[data-pipe-area-ratios]');expect(await n(ratio,'data-wall-ratio')).toBeCloseTo(1,10);expect(await n(ratio,'data-area-ratio')).toBeCloseTo(1,10);await panel.locator('[data-pipe-area-range]').focus();await page.keyboard.press('ArrowRight');expect(await n(panel,'data-wall-b')).toBeGreaterThan(.432);await panel.locator('[data-pipe-area-preset="0.719"]').click();await inspect(page,'pipe-groove-area-'+width,'[data-pipe-area-comparison]');expect(await page.locator('[data-pipe-groove]').evaluate(el=>el.outerHTML)).toBe(oldGroove);expect(await savedWork(page)).toBe(saved);expect(errors).toEqual([]);
 });
}

const beadState={view:'beadLab',bl_view:'topdown',arc_handsOn:true,arc_run:[6,12,24,10,18],bl_V:22,bl_A:180,bl_TS:12,bl_process:'mig',bl_material:'steel',bl_thickness:.25};
for(const width of [1280,390]){
 test('Recorded bead intervals link location and local geometry at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,beadState);const panel=page.locator('[data-arc-intervals]');await openDetails(panel);const saved=await savedWork(page),oldScore=await page.locator('[data-arc-verdict]').evaluate(el=>el.outerHTML),oldTrace=await page.locator('[data-arc-trace]').evaluate(el=>el.outerHTML);await expect(panel).toHaveAttribute('data-count','5');await expect(panel.locator('[data-arc-interval-slot]')).toHaveCount(32);await expect(panel.locator('[data-arc-interval-slot][data-recorded="false"] [data-arc-interval-footprint]')).toHaveCount(0);
  for(let i=0;i<5;i++){await panel.locator('[data-arc-interval-select]').selectOption(String(i));const p=panel.locator('[data-arc-interval-position]');expect(await n(p,'data-start')).toBe(i*.25);expect(await n(p,'data-end')).toBe((i+1)*.25);expect(await n(p,'data-recorded-end')).toBe(1.25);const model=await page.evaluate(speed=>(window as any).__WeldLabCore.beadGeometry(22,180,speed,'mig','steel',.25),beadState.arc_run[i]);for(const[key,value]of Object.entries({speed:beadState.arc_run[i],net:model.net,width:model.width,reinforcement:model.reinf,penetration:model.penetration,thickness:.25})){expect(await n(panel.locator('[data-arc-interval-reading="'+key+'"]'),'data-value')).toBeCloseTo(value as number,10);}const section=panel.locator('[data-arc-interval-section]');expect(await n(section,'data-scale')).toBe(200);expect(await section.getAttribute('viewBox')).toBe('0 0 480 280');const line=panel.locator('[data-arc-interval-width-line]');expect(await n(line,'x2')-await n(line,'x1')).toBeCloseTo(model.width*200,8);const focus=panel.locator('[data-arc-interval-focus]');expect(await n(focus,'x')).toBe(32+i*18);expect(await n(focus,'width')).toBe(18);}
  await panel.locator('[data-arc-interval-prev]').click();await expect(panel.locator('[data-arc-interval-select]')).toHaveValue('3');await panel.locator('[data-arc-interval-select]').focus();await page.keyboard.press('ArrowUp');await expect(panel.locator('[data-arc-interval-select]')).toHaveValue('2');await inspect(page,'recorded-bead-interval-'+width,'[data-arc-intervals]');expect(await page.locator('[data-arc-verdict]').evaluate(el=>el.outerHTML)).toBe(oldScore);expect(await page.locator('[data-arc-trace]').evaluate(el=>el.outerHTML)).toBe(oldTrace);expect(await savedWork(page)).toBe(saved);expect(errors).toEqual([]);
 });
}
test('New geometry details stay readable in high contrast',async({page})=>{
 for(const[name,state,selector]of[['recorded-bead-interval',beadState,'[data-arc-intervals]'],['fillet-throat',symbolState,'[data-fillet-throat]'],['pipe-groove-area',pipeState,'[data-pipe-area-comparison]']]as const){await mount(page,390,state,true);const panel=page.locator(selector);await openDetails(panel);if(name==='recorded-bead-interval')await panel.locator('[data-arc-interval-select]').selectOption('2');if(name==='fillet-throat')await setRange(panel.locator('[data-fillet-face-probe]'),20);if(name==='pipe-groove-area')await panel.locator('[data-pipe-area-preset="0.719"]').click();await inspect(page,name+'-contrast',selector);}
});
test('Local review page opens all three new geometry tools',async({page})=>{
 const url=process.env.WELDLAB_PREVIEW_URL;test.skip(!url,'Local review page is opt-in.');await page.setViewportSize({width:390,height:900});await page.goto(url!);await page.waitForFunction(()=>Boolean((document.getElementById('preview-app-css')as HTMLLinkElement)?.sheet));await openDetails(page.locator('[data-arc-intervals]'));await page.getByRole('button',{name:'Fillet throat',exact:true}).click();await openDetails(page.locator('[data-fillet-throat]'));await page.getByRole('button',{name:'Groove areas',exact:true}).click();await openDetails(page.locator('[data-pipe-area-comparison]'));expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
