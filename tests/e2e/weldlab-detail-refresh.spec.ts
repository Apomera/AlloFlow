import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-detail-refresh');
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







const savedWork=async(page:any)=>page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));
const box=(s:string)=>s.trim().split(/\s+/).map(Number);
for(const width of [1280,390]){
 test('Blueprint magnifier preserves the drawing and bounds manual navigation at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,{view:'symbolsReader',sr_view:'blueprint',sym2_bp_ans:{},sym2_pr_score:3,sym2_pr_tries:5});
  const lens=page.locator('[data-blueprint-magnifier]');await expect(lens).toBeVisible();const saved=await savedWork(page);const drawing=lens.locator('[data-blueprint-viewport]');const children=await drawing.evaluate(el=>el.innerHTML);
  for(const zoom of [1,2,3]){await lens.locator('[data-blueprint-zoom="'+zoom+'"]').click();const[x,y,w,h]=box((await drawing.getAttribute('viewBox'))!);expect(w).toBeCloseTo(660/zoom,8);expect(h).toBeCloseTo(430/zoom,8);expect(x).toBeGreaterThanOrEqual(0);expect(y).toBeGreaterThanOrEqual(0);expect(x+w).toBeLessThanOrEqual(660.000001);expect(y+h).toBeLessThanOrEqual(430.000001);for(const dir of ['left','up','right','down'])for(let i=0;i<8;i++){const pan=lens.locator('[data-blueprint-pan="'+dir+'"]');if(await pan.isEnabled())await pan.click();}const[bX,bY,bW,bH]=box((await drawing.getAttribute('viewBox'))!);expect(bX).toBeGreaterThanOrEqual(0);expect(bY).toBeGreaterThanOrEqual(0);expect(bX+bW).toBeLessThanOrEqual(660.000001);expect(bY+bH).toBeLessThanOrEqual(430.000001);expect(await drawing.evaluate(el=>el.innerHTML)).toBe(children);}
  await lens.locator('[data-blueprint-reset]').click();await expect(drawing).toHaveAttribute('viewBox','0 0 660 430');await lens.locator('[data-blueprint-center]').click();expect(await drawing.evaluate(el=>el.innerHTML)).toBe(children);await inspect(page,'blueprint-magnifier-'+width,'[data-blueprint-magnifier]');expect(await savedWork(page)).toBe(saved);expect(errors).toEqual([]);
 });
 test('Gauge position inputs and detail follow the same inspection specimen at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,{view:'inspection',insp_sect:'bench'});
  const nav=page.locator('[data-insp-position-navigation]');await expect(nav).toBeVisible();const saved=await savedWork(page);await nav.locator('[data-insp-detail-toggle]').click();
  for(const value of [0,1.25,6,11]){await nav.locator('[data-insp-position-number]').fill(String(value));const detail=page.locator('[data-insp-detail-window]');await expect(detail).toHaveAttribute('data-gauge',String(value));const start=Number(await detail.getAttribute('data-start')),end=Number(await detail.getAttribute('data-end'));expect(start).toBeGreaterThanOrEqual(0);expect(end).toBeLessThanOrEqual(12);expect(end-start).toBe(3);await expect(nav.locator('[data-insp-position-range]')).toHaveValue(String(value));await expect(detail.locator('[data-insp-detail-svg]')).toHaveAttribute('role','img');expect((await detail.locator('[data-insp-detail-svg]').getAttribute('viewBox'))!.split(' ').map(Number)[2]).toBe(168);}
  await nav.locator('[data-insp-position-range]').focus();await page.keyboard.press('ArrowLeft');await expect(nav.locator('[data-insp-position-number]')).toHaveValue('10.875');await inspect(page,'inspection-detail-'+width,'[data-insp-position-navigation]');await inspect(page,'inspection-crop-'+width,'[data-insp-detail-window]');expect(await savedWork(page)).toBe(saved);expect(errors).toEqual([]);
 });
}

for(const width of [1280,390])test('Lever-rule arms and mass shares follow the existing equilibrium example at '+width+'px',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,{view:'metallurgy',met_sect:'phase',met2_cdIdx:2,met2_ceTally:{n:4,right:3},met2_hazPred:-1});
 const lens=page.locator('[data-lever-bench]');await expect(lens).toBeVisible();const saved=await savedWork(page);
 for(const c of [.022,.2,.4,.77]){await lens.locator('[data-lever-preset="'+c+'"]').click();const p=(c-.022)/.748,f=1-p;expect(Number(await lens.getAttribute('data-carbon'))).toBe(c);expect(Number(await lens.getAttribute('data-pearlite'))).toBeCloseTo(p,10);expect(Number(await lens.getAttribute('data-ferrite'))).toBeCloseTo(f,10);expect(Number(await lens.getAttribute('data-weighted-carbon'))).toBeCloseTo(c,10);for(const[id,share]of[['ferrite',f],['pearlite',p]]as const){expect(Number(await lens.locator('[data-lever-share="'+id+'"]').getAttribute('width'))).toBeCloseTo(592*share,8);}const left=lens.locator('[data-lever-tie-arm="left"]'),right=lens.locator('[data-lever-tie-arm="right"]');expect(Number(await left.getAttribute('x2'))-Number(await left.getAttribute('x1'))).toBeCloseTo(592*p,8);expect(Number(await right.getAttribute('x2'))-Number(await right.getAttribute('x1'))).toBeCloseTo(592*f,8);await expect(left).toHaveAttribute('data-share-for','pearlite');await expect(right).toHaveAttribute('data-share-for','ferrite');}
 await lens.locator('[data-lever-preset="0.4"]').click();await lens.locator('[data-lever-carbon]').focus();await page.keyboard.press('ArrowRight');await expect(lens).toHaveAttribute('data-carbon','0.401');const labelSizes=await lens.locator('[data-lever-plot]').evaluate(svg=>Array.from(svg.querySelectorAll('text')).map(text=>parseFloat(getComputedStyle(text).fontSize)*svg.getBoundingClientRect().width/720));expect(Math.min(...labelSizes)).toBeGreaterThanOrEqual(10);await inspect(page,'lever-rule-'+width,'[data-lever-bench]');expect(await savedWork(page)).toBe(saved);expect(errors).toEqual([]);
});
test('The new detail controls stay readable in high contrast',async({page})=>{
 for(const[name,state,selector]of[
  ['blueprint-magnifier',{view:'symbolsReader',sr_view:'blueprint'},'[data-blueprint-magnifier]'],
  ['inspection-detail',{view:'inspection',insp_sect:'bench'},'[data-insp-position-navigation]'],
  ['lever-rule',{view:'metallurgy',met_sect:'phase'},'[data-lever-bench]']
 ]as const){await mount(page,390,state,true);if(name==='blueprint-magnifier')await page.locator('[data-blueprint-center]').click();if(name==='inspection-detail'){await page.locator('[data-insp-detail-toggle]').click();await page.locator('[data-insp-position-number]').fill('6');}await inspect(page,name+'-contrast',selector);if(name==='inspection-detail')await inspect(page,'inspection-crop-contrast','[data-insp-detail-window]');}
});
test('Local preview opens the three new detail explorers',async({page})=>{
 const previewURL=process.env.WELDLAB_PREVIEW_URL;test.skip(!previewURL,'The local review page is opt-in and is not a CI fixture.');await page.setViewportSize({width:390,height:900});await page.goto(previewURL!);await page.waitForFunction(()=>Boolean((document.getElementById('preview-app-css') as HTMLLinkElement)?.sheet));await expect(page.locator('[data-blueprint-magnifier]')).toBeVisible();await page.getByRole('button',{name:'Lever rule',exact:true}).click();await expect(page.locator('[data-lever-bench]')).toBeVisible();await page.getByRole('button',{name:'Gauge detail',exact:true}).click();await expect(page.locator('[data-insp-position-navigation]')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
