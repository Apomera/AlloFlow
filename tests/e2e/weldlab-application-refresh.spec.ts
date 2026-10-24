import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-application-refresh');
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
for(const width of [1280,390]){
 test('Gas composition uses one percentage scale and exact component differences at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,{view:'consumables',cons_mode:'browse',cons_sect:'gases',cons_sc_idx:1,cons_sc_score:2,tech2_cons_code:'E7018',tech2_cons_proc:'fcaw'});
  const lens=page.locator('[data-gas-composition]');await expect(lens).toBeVisible();const saved=await savedWork(page);
  for(const[a,b,component,pctA,pctB]of[[1,2,'CO2',25,10],[4,5,'He',90,0],[1,3,'O2',0,2],[5,5,'Ar',100,100],[5,5,'O2',0,0]]as const){
   await lens.locator('[data-gas-mixture="a"]').selectOption(String(a));await lens.locator('[data-gas-mixture="b"]').selectOption(String(b));await lens.locator('[data-gas-component="'+component+'"]').click();
   await expect(lens).toHaveAttribute('data-component',component);await expect(lens.locator('[data-gas-difference]')).toHaveAttribute('data-value',String(pctB-pctA));
   for(const[id,pct]of[['a',pctA],['b',pctB]]as const){const bar=lens.locator('[data-gas-component-bar="'+id+'"]');await expect(bar).toHaveAttribute('x','64');expect(Number(await bar.getAttribute('width'))).toBeCloseTo(560*pct/100,8);await expect(lens.locator('[data-gas-percent="'+id+'"]')).toContainText(pct+'%');await expect(lens.locator('[data-gas-zero="'+id+'"]')).toHaveCount(pct===0?1:0);}
   await expect(lens.locator('[data-gas-component-plot]')).toHaveAttribute('viewBox','0 0 720 260');
  }
  await lens.locator('[data-gas-mixture="a"]').selectOption('1');await lens.locator('[data-gas-mixture="b"]').selectOption('2');await lens.locator('[data-gas-component="CO2"]').click();await inspect(page,'gas-composition-'+width,'[data-gas-composition]');
  expect(await savedWork(page)).toBe(saved);expect(errors).toEqual([]);
 });
 test('WPS example thicknesses keep an exact shared scale at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,{view:'codes',insp2_codesTab:'flow',insp2_wpsField:'base',insp2_sortIdx:2,insp2_sortPicks:{0:'nonessential'},insp2_clauseIdx:1});
  const lens=page.locator('[data-wps-thickness]');await expect(lens).toBeVisible();const saved=await savedWork(page);const upper=await lens.locator('[data-wps-thickness-upper]').evaluate(el=>el.outerHTML);
  for(const[id,value,ratio]of[['coupon',.375,1],['upper',.75,2],['proposal',1.5,4]]as const){const pick=lens.locator('[data-wps-thickness-preset="'+id+'"]');await pick.focus();await page.keyboard.press('Space');await expect(lens).toHaveAttribute('data-wps-thickness',id);const bar=lens.locator('[data-wps-thickness-bar="comparison"]');expect(Number(await bar.getAttribute('height'))).toBeCloseTo(value*112,8);expect(Number(await bar.getAttribute('y'))).toBeCloseTo(236-value*112,8);await expect(bar).toHaveAttribute('data-ratio',String(ratio));expect(Number(await lens.locator('[data-wps-thickness-bar="coupon"]').getAttribute('height'))).toBe(42);expect(await lens.locator('[data-wps-thickness-upper]').evaluate(el=>el.outerHTML)).toBe(upper);expect((await pick.boundingBox())!.height).toBeGreaterThanOrEqual(44);}
  await inspect(page,'wps-thickness-'+width,'[data-wps-thickness]');expect(await savedWork(page)).toBe(saved);expect(errors).toEqual([]);
 });
}

for(const width of [1280,390])test('Robot application focus keeps the complete assembly and task scope visible at '+width+'px',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,{view:'robotic',rob_sect:'cobots',tech2_rob_prog:[{x:4,y:6,m:'J',w:false},{x:12,y:6,m:'L',w:true}],rob_sortIdx:1,rob_sortPicks:{0:1}});
 const lens=page.locator('[data-rob-app]');await expect(lens).toBeVisible();const saved=await savedWork(page),base=await lens.locator('[data-rob-app-base]').evaluate(el=>el.outerHTML);
 for(const id of ['arm','tool','workpiece','process']){const pick=lens.locator('[data-rob-app-pick="'+id+'"]');await pick.click();await expect(lens).toHaveAttribute('data-rob-app',id);await expect(pick).toHaveAttribute('aria-pressed','true');await expect(lens.locator('[data-rob-app-focus="'+id+'"]')).toBeVisible();await expect(lens.locator('[data-rob-app-reading="'+id+'"]')).toBeVisible();expect(await lens.locator('[data-rob-app-base]').evaluate(el=>el.outerHTML)).toBe(base);await expect(lens.locator('[data-rob-app-assessment]')).toBeVisible();expect((await pick.boundingBox())!.height).toBeGreaterThanOrEqual(44);}
 await expect(page.getByText(/no cage needed|without safety cages/)).toHaveCount(0);await inspect(page,'robot-application-'+width,'[data-rob-app]');expect(await savedWork(page)).toBe(saved);expect(errors).toEqual([]);
});
test('Application and comparison explorers stay readable in high contrast',async({page})=>{
 for(const[name,state,selector]of[
  ['gas-composition',{view:'consumables',cons_mode:'browse',cons_sect:'gases'},'[data-gas-composition]'],
  ['wps-thickness',{view:'codes',insp2_codesTab:'flow',insp2_wpsField:'base'},'[data-wps-thickness]'],
  ['robot-application',{view:'robotic',rob_sect:'cobots'},'[data-rob-app]']
 ]as const){await mount(page,390,state,true);if(name==='gas-composition'){await page.locator('[data-gas-mixture="a"]').selectOption('3');await page.locator('[data-gas-mixture="b"]').selectOption('7');await page.locator('[data-gas-component="O2"]').click();}if(name==='wps-thickness')await page.locator('[data-wps-thickness-preset="proposal"]').click();if(name==='robot-application')await page.locator('[data-rob-app-pick="tool"]').click();await inspect(page,name+'-contrast',selector);}
});
test('Local preview opens all three new application explorers',async({page})=>{
 const previewURL=process.env.WELDLAB_PREVIEW_URL;test.skip(!previewURL,'The local review page is opt-in and is not a CI fixture.');await page.setViewportSize({width:390,height:900});await page.goto(previewURL!);await expect(page.locator('[data-gas-composition]')).toBeVisible();await page.getByRole('button',{name:'WPS thickness',exact:true}).click();await expect(page.locator('[data-wps-thickness]')).toBeVisible();await page.getByRole('button',{name:'Robot application',exact:true}).click();await expect(page.locator('[data-rob-app]')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
