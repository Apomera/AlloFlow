import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-relationships-refresh');
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



const sideValues={a:3,b:4,c:5};
const points=(s:string)=>s.trim().split(/\s+/).map(p=>p.split(',').map(Number));
const area=(p:number[][])=>Math.abs(p.reduce((sum,v,i)=>{const n=p[(i+1)%p.length];return sum+v[0]*n[1]-n[0]*v[1];},0))/2;
for(const width of [1280,390]){
 test('3-4-5 squares show exact areas on one physical scale at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,{view:'mathBlueprint',mb_mode:'browse',mb_sect:'geometry',sym2_m_seed:12345,sym2_m_score:3,sym2_m_tries:5,mb_q_score:2});
  const lens=page.locator('[data-pythagoras-area]');await expect(lens).toBeVisible();const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));await expect(lens).toHaveAttribute('data-scale','12');
  const geometry=async()=>lens.locator('[data-pythagoras-square],[data-pythagoras-triangle],[data-pythagoras-side]').evaluateAll(els=>els.map(el=>['points','x1','y1','x2','y2'].map(a=>el.getAttribute(a))));
  for(const k of [1,2,3,4]){await page.locator('[data-pythagoras-preset="'+k+'"]').click();await expect(lens).toHaveAttribute('data-multiple',String(k));await expect(lens.locator('[data-pythagoras-drawing]')).toHaveAttribute('viewBox','0 0 600 590');
   for(const id of ['a','b','c']){const length=sideValues[id]*k,square=lens.locator('[data-pythagoras-square="'+id+'"]'),p=points((await square.getAttribute('points'))!);expect(p).toHaveLength(4);expect(area(p)).toBeCloseTo(length*length*144,6);for(let i=0;i<4;i++){const u=[p[(i+1)%4][0]-p[i][0],p[(i+1)%4][1]-p[i][1]],v=[p[(i+2)%4][0]-p[(i+1)%4][0],p[(i+2)%4][1]-p[(i+1)%4][1]];expect(Math.hypot(...u)).toBeCloseTo(length*12,6);expect(u[0]*v[0]+u[1]*v[1]).toBeCloseTo(0,6);}await expect(lens.locator('[data-pythagoras-reading="'+id+'"]')).toHaveAttribute('data-length',String(length));await expect(lens.locator('[data-pythagoras-reading="'+id+'"]')).toHaveAttribute('data-area',String(length*length));}
   const fixed=await geometry();for(const focus of ['legs','hypotenuse','all']){await page.locator('[data-pythagoras-focus="'+focus+'"]').click();await expect(lens).toHaveAttribute('data-focus',focus);expect(await geometry()).toEqual(fixed);}
  }
  await inspect(page,'pythagoras-largest-'+width,'[data-pythagoras-area]');await page.locator('[data-pythagoras-preset="1"]').click();await inspect(page,'pythagoras-smallest-'+width,'[data-pythagoras-area]');
  expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);expect(errors).toEqual([]);
 });
 test('Oxy-acetylene references distinguish the feather and shorter oxygen-rich cone at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,{view:'consumables',cons_mode:'browse',cons_sect:'gases',cons_sc_idx:1,cons_sc_score:2,tech2_cons_code:'E7018',tech2_cons_proc:'fcaw'});
  const lens=page.locator('[data-oxy-flame-bench]');await expect(lens).toBeVisible();const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));const selected=lens.locator('[data-oxy-flame-view="selected"]');const torch=await selected.locator('[data-oxy-torch]').evaluate(el=>el.outerHTML);const extents:any={};
  for(const id of ['neutral','fuel','oxygen']){const pick=page.locator('[data-oxy-flame-pick="'+id+'"]');await pick.click();await expect(lens).toHaveAttribute('data-oxy-flame-bench',id);await expect(selected).toHaveAttribute('data-flame',id);expect(await selected.locator('[data-oxy-torch]').evaluate(el=>el.outerHTML)).toBe(torch);await expect(selected.locator('[data-oxy-feather]')).toHaveCount(id==='fuel'?1:0);await expect(selected.locator('[data-oxy-balance-reading]')).toBeVisible();await expect(selected.locator('[data-oxy-cone-reading]')).toBeVisible();extents[id]=await selected.locator('[data-oxy-cone],[data-oxy-envelope]').evaluateAll(els=>els.map(el=>{const b=(el as SVGGraphicsElement).getBBox();return{w:b.width,h:b.height};}));expect((await pick.boundingBox())!.height).toBeGreaterThanOrEqual(44);}
  expect(extents.oxygen[0].w).toBeLessThan(extents.neutral[0].w);expect(extents.oxygen[1].w).toBeLessThan(extents.neutral[1].w);
  await page.locator('[data-oxy-flame-compare]').click();await page.locator('[data-oxy-flame-peer]').selectOption('neutral');await expect(lens.locator('[data-oxy-flame-view="comparison"]')).toHaveAttribute('data-flame','neutral');expect(await lens.locator('[data-oxy-torch]').evaluateAll(els=>els.map(el=>el.outerHTML))).toEqual([torch,torch]);const sizes=await lens.locator('[data-oxy-flame-scene]').evaluateAll(els=>els.map(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height})));expect(sizes[0].w).toBeCloseTo(sizes[1].w,1);expect(sizes[0].h).toBeCloseTo(sizes[1].h,1);
  await inspect(page,'oxy-flame-'+width,'[data-oxy-flame-bench]');expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);expect(errors).toEqual([]);
 });
 test('Connection focus preserves the conceptual graph and saved safety work at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,{view:'safetyHealth',sh_mode:'browse',sh_sect:'electrical',sh_audit:{},safe2_nz_rows:[{db:90,hours:2}]});
  const lens=page.locator('[data-connection-roles]');await expect(lens).toBeVisible();const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));const base=await lens.locator('[data-connection-base]').evaluate(el=>el.outerHTML);
  for(const id of ['electrode','workpiece','return','frame']){const pick=page.locator('[data-connection-pick="'+id+'"]');await pick.click();await expect(lens).toHaveAttribute('data-connection-roles',id);await expect(lens.locator('[data-connection-focus="'+id+'"]')).toBeVisible();await expect(lens.locator('[data-connection-reading="'+id+'"]')).toBeVisible();await expect(lens.locator('[data-connection-reading]')).toHaveAttribute('data-context',id==='frame'?'installation':'secondary');expect(await lens.locator('[data-connection-base]').evaluate(el=>el.outerHTML)).toBe(base);expect((await pick.boundingBox())!.height).toBeGreaterThanOrEqual(44);}
  await expect(lens.locator('[data-connection-path="return"]')).toHaveAttribute('data-to','work-connection');await expect(lens.locator('[data-connection-path="frame"]')).toHaveAttribute('data-to','installation-boundary');await inspect(page,'connection-roles-'+width,'[data-connection-roles]');expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);expect(errors).toEqual([]);
 });
}
test('New relationship explorers stay readable in high contrast',async({page})=>{
 for(const[name,state,selector]of[
  ['pythagoras',{view:'mathBlueprint',mb_mode:'browse',mb_sect:'geometry'},'[data-pythagoras-area]'],
  ['oxy-flame',{view:'consumables',cons_mode:'browse',cons_sect:'gases'},'[data-oxy-flame-bench]'],
  ['connection-roles',{view:'safetyHealth',sh_mode:'browse',sh_sect:'electrical'},'[data-connection-roles]']
 ]as const){await mount(page,390,state,true);if(name==='pythagoras'){await page.locator('[data-pythagoras-preset="4"]').click();await page.locator('[data-pythagoras-focus="legs"]').click();}if(name==='oxy-flame'){await page.locator('[data-oxy-flame-pick="fuel"]').click();await page.locator('[data-oxy-flame-compare]').click();}if(name==='connection-roles')await page.locator('[data-connection-pick="return"]').click();await inspect(page,name+'-contrast',selector);}
});
test('Local preview connects all three relationship explorers',async({page})=>{
 const previewURL=process.env.WELDLAB_PREVIEW_URL;test.skip(!previewURL,'The local review page is opt-in and is not a CI fixture.');await page.setViewportSize({width:390,height:900});await page.goto(previewURL!);await expect(page.locator('[data-pythagoras-area]')).toBeVisible();await page.getByRole('button',{name:'Flame references',exact:true}).click();await expect(page.locator('[data-oxy-flame-bench]')).toBeVisible();await page.getByRole('button',{name:'Connection roles',exact:true}).click();await expect(page.locator('[data-connection-roles]')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
