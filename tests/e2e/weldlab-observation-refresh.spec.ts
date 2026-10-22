import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-observation-refresh');
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


const ids=['mig','tig','stick','fcawg','fcaws','oxy','spot'];
const metrics=['learn','speed','finish','outdoor','portable','afford','dirty'];
const ratings={mig:[5,4,4,1,2,3,2],tig:[1,2,5,1,2,2,1],stick:[3,3,2,5,5,5,5],fcawg:[4,5,3,2,2,3,3],fcaws:[4,4,2,4,4,4,4],oxy:[3,1,2,3,4,3,2],spot:[4,5,4,1,1,1,1]};
for(const width of [1280,390]){
 test('Process rating lens keeps all seven authored ordinal readings and fixed rows at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await mount(page,width,{view:'processCompare',proc2_sel:'tig',proc2_job:{mat:'aluminum',thk:'sheet',loc:'shop',pos:'flat',vol:'one',look:'visible',surf:'clean',budget:'mid',port:'cart'},proc2_guess:{}});
  const lens=page.locator('[data-proc-rating-lens]');await expect(lens).toBeVisible();const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));
  const geometry=async()=>lens.locator('[data-proc-rating-plot]').evaluateAll(els=>els.map(el=>[...el.querySelectorAll('circle')].map(n=>['cx','cy','r'].map(a=>n.getAttribute(a)))));const fixed=await geometry();
  for(const[mi,metric]of metrics.entries()){
   await page.locator('[data-proc-rating-metric="'+metric+'"]').click();await expect(lens).toHaveAttribute('data-proc-rating-lens',metric);
   expect(await lens.locator('[data-proc-rating-row]').evaluateAll(els=>els.map(el=>el.getAttribute('data-proc-rating-row')))).toEqual(ids);
   for(const id of ids){const row=lens.locator('[data-proc-rating-row="'+id+'"]');await expect(row).toHaveAttribute('data-value',String(ratings[id][mi]));expect(await row.locator('[data-proc-rating-dot][data-filled="true"]').count()).toBe(ratings[id][mi]);}
   expect(await geometry()).toEqual(fixed);
  }
  await lens.locator('[data-proc-rating-row="stick"]').click();await expect(lens.locator('[data-proc-rating-reading]')).toHaveAttribute('data-proc-rating-reading','stick');
  await inspect(page,'process-ratings-'+width,'[data-proc-rating-lens]');await lens.locator('[data-proc-rating-reference] summary').click();await expect(lens.locator('table')).toBeVisible();await inspect(page,'process-rating-reference-'+width,'[data-proc-rating-lens]');
  expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);expect(errors).toEqual([]);
 });
 test('Pi tape shows one circumference with two honest scales at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,{view:'mathBlueprint',mb_mode:'browse',mb_sect:'measure',sym2_m_seed:12345,sym2_m_score:3,sym2_m_tries:5,mb_q_score:2});
  const lens=page.locator('[data-pi-tape]');await expect(lens).toBeVisible();const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));
  for(const d of [2,4,6,8,10]){await page.locator('[data-pi-tape-preset="'+d+'"]').click();await expect(lens).toHaveAttribute('data-diameter',String(d));const circumference=Number(await lens.getAttribute('data-circumference'));expect(circumference).toBeCloseTo(Math.PI*d,7);expect(Number(await lens.locator('[data-pi-tape-circle]').getAttribute('r'))).toBeCloseTo(d*10,7);}
  const fixed=await lens.locator('svg').evaluate(el=>[...el.querySelectorAll('circle,line,rect')].map(n=>['x','y','x1','y1','x2','y2','cx','cy','r','width','height'].map(a=>n.getAttribute(a))));
  for(const focus of ['diameter','circumference']){await page.locator('[data-pi-tape-focus="'+focus+'"]').click();await expect(lens).toHaveAttribute('data-focus',focus);expect(await lens.locator('svg').evaluate(el=>[...el.querySelectorAll('circle,line,rect')].map(n=>['x','y','x1','y1','x2','y2','cx','cy','r','width','height'].map(a=>n.getAttribute(a))))).toEqual(fixed);}
  await inspect(page,'pi-tape-'+width,'[data-pi-tape]');await page.locator('[data-pi-tape-diameter]').focus();await page.keyboard.press('Home');await expect(lens).toHaveAttribute('data-diameter','2');await page.keyboard.press('ArrowRight');await expect(lens).toHaveAttribute('data-diameter','2.25');
  expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);expect(errors).toEqual([]);
 });
}

const tungstenIds=['EWP','EWCe-2','EWLa-1','EWLa-1.5','EWLa-2','EWTh-1','EWTh-2','EWZr-1','EWG'];
for(const width of [1280,390])test('Tungsten identification connects printed class and paint without changing the rod at '+width+'px',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,{view:'consumables',cons_mode:'browse',cons_sect:'tig_rods',cons_sc_idx:1,cons_sc_score:2,tech2_cons_code:'E7018',tech2_cons_proc:'fcaw'});
 const lens=page.locator('[data-tungsten-bench]');await expect(lens).toBeVisible();const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));const selected=page.locator('[data-tungsten-view="selected"]');
 const geometry=async()=>selected.locator('[data-tungsten-rod],[data-tungsten-paint],[data-tungsten-box],[data-tungsten-grinding-marks] path').evaluateAll(els=>els.map(el=>['x','y','width','height','d'].map(a=>el.getAttribute(a))));const fixed=await geometry();
 for(const id of tungstenIds){const pick=page.locator('[data-tungsten-pick="'+id+'"]');await pick.click();await expect(lens).toHaveAttribute('data-tungsten-bench',id);await expect(selected.locator('[data-tungsten-printed-class]')).toHaveText(id);await expect(selected.locator('[data-tungsten-class-reading]')).toContainText(id);expect(await geometry()).toEqual(fixed);expect((await pick.boundingBox())!.height).toBeGreaterThanOrEqual(44);}
 for(const focus of ['paint','classification','preparation']){await page.locator('[data-tungsten-focus="'+focus+'"]').click();await expect(selected.locator('[data-tungsten-focus-region]')).toHaveAttribute('data-tungsten-focus-region',focus);expect(await geometry()).toEqual(fixed);}
 await page.locator('[data-tungsten-compare]').click();await expect(page.locator('[data-tungsten-view]')).toHaveCount(2);await page.locator('[data-tungsten-peer]').selectOption('EWLa-2');await expect(page.locator('[data-tungsten-view="comparison"]')).toHaveAttribute('data-class','EWLa-2');
 const sizes=await page.locator('[data-tungsten-scene]').evaluateAll(els=>els.map(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height})));expect(sizes[0].w).toBeCloseTo(sizes[1].w,1);expect(sizes[0].h).toBeCloseTo(sizes[1].h,1);
 await inspect(page,'tungsten-identification-'+width,'[data-tungsten-bench]');await page.locator('[data-tungsten-reference] summary').click();await expect(page.locator('[data-tungsten-reference-row]')).toHaveCount(9);
 expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);expect(errors).toEqual([]);
});
test('New observation controls remain readable in high contrast',async({page})=>{
 for(const[name,state,selector]of[
  ['process-ratings',{view:'processCompare'},'[data-proc-rating-lens]'],
  ['pi-tape',{view:'mathBlueprint',mb_mode:'browse',mb_sect:'measure'},'[data-pi-tape]'],
  ['tungsten-identification',{view:'consumables',cons_mode:'browse',cons_sect:'tig_rods'},'[data-tungsten-bench]']
 ]as const){await mount(page,390,state,true);if(name==='process-ratings'){await page.locator('[data-proc-rating-metric="outdoor"]').click();await page.locator('[data-proc-rating-row="stick"]').click();}if(name==='pi-tape'){await page.locator('[data-pi-tape-preset="6"]').click();await page.locator('[data-pi-tape-focus="circumference"]').click();}if(name==='tungsten-identification'){await page.locator('[data-tungsten-pick="EWCe-2"]').click();await page.locator('[data-tungsten-focus="classification"]').click();}await inspect(page,name+'-contrast',selector);}
});
test('Local preview connects the new observation lessons',async({page})=>{
 await page.setViewportSize({width:390,height:900});await page.goto('http://127.0.0.1:8741/tmp/weld-review/index.html?pass=observation#ratings');await expect(page.locator('[data-proc-rating-lens]')).toBeVisible();await page.getByRole('button',{name:'Pi tape readings',exact:true}).click();await expect(page.locator('[data-pi-tape]')).toBeVisible();await page.getByRole('button',{name:'Tungsten identification',exact:true}).click();await expect(page.locator('[data-tungsten-bench]')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
