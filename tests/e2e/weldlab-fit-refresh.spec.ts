import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-fit-refresh');
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




const savedWork = async (page:any) => page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));
for (const width of [1280,390]) {
 test('Stainless face and root keep distinct shielding regions at '+width+'px',async({page})=>{
  const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  await mount(page,width,{view:'metallurgy',met_sect:'stainless',met2_cdIdx:2,met2_cdScore:1,met2_hazPred:2,met_qScore:3});
  const lens=page.locator('[data-stainless-surfaces]');await expect(lens).toBeVisible();
  const saved=await savedWork(page), base=await lens.locator('[data-stainless-base]').evaluate(el=>el.outerHTML);
  for(const id of ['face','root','both']){
   const pick=lens.locator('[data-stainless-surface-pick="'+id+'"]');await pick.focus();await page.keyboard.press('Space');
   await expect(lens).toHaveAttribute('data-stainless-surfaces',id);await expect(pick).toHaveAttribute('aria-pressed','true');
   const expected=id==='both'?['face','root','external-shield','backing-region']:id==='face'?['face','external-shield']:['root','backing-region'];
   expect(await lens.locator('[data-stainless-highlight]').evaluateAll(els=>els.map(el=>el.getAttribute('data-stainless-highlight')).sort())).toEqual(expected.sort());
   for(const surface of ['face','root'])await expect(lens.locator('[data-stainless-reading="'+surface+'"]')).toHaveAttribute('data-active',String(id===surface||id==='both'));
   expect(await lens.locator('[data-stainless-base]').evaluate(el=>el.outerHTML)).toBe(base);expect((await pick.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await inspect(page,'stainless-surfaces-'+width,'[data-stainless-surfaces]');await lens.locator('[data-stainless-surface-pick="root"]').click();await inspect(page,'stainless-root-'+width,'[data-stainless-surfaces]');
  expect(await savedWork(page)).toBe(saved);expect(errors).toEqual([]);
 });
 test('Ship systems connect hull, structure and piping at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,{view:'maineEcosystem',me_mode:'browse',me_sect:'biw',me_road_path:'ua',me_road_d1:'pipeline',me_road_d2:'shop'});
  const lens=page.locator('[data-ship-systems]');await expect(lens).toBeVisible();const saved=await savedWork(page),base=await lens.locator('[data-ship-base]').evaluate(el=>el.outerHTML);
  for(const id of ['hull','structure','piping']){
   const pick=lens.locator('[data-ship-pick="'+id+'"]');await pick.click();await expect(lens).toHaveAttribute('data-ship-systems',id);await expect(pick).toHaveAttribute('aria-pressed','true');
   await expect(lens.locator('[data-ship-focus="'+id+'"]')).toBeVisible();await expect(lens.locator('[data-ship-reading="'+id+'"]')).toBeVisible();
   expect(await lens.locator('[data-ship-base]').evaluate(el=>el.outerHTML)).toBe(base);expect((await pick.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await expect(lens.locator('[data-ship-authored]')).toBeVisible();await inspect(page,'ship-systems-'+width,'[data-ship-systems]');expect(await savedWork(page)).toBe(saved);expect(errors).toEqual([]);
 });
}

const linePoints=(attrs:(string|null)[])=>attrs.map(Number);
for(const width of [1280,390])test('Groove angles follow both actual cut faces at '+width+'px',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,{view:'jointCatalog',jc_tab:'butt',proc2_prep:'v',proc2_jqSeed:31,proc2_jqAns:['butt'],proc2_jqBest:7,proc2_pos:'3G'});
 const lens=page.locator('[data-joint-angles]');await expect(lens).toBeVisible();const saved=await savedWork(page);
 const coords=async(selector:string)=>lens.locator(selector).evaluateAll(els=>els.map(el=>['points','d','x1','y1','x2','y2','cx','cy'].map(a=>el.getAttribute(a))));
 const fixed=await coords('[data-joint-angle-root],[data-joint-angle-land]');
 for(const [id,left,right]of[['v30',30,30],['v375',37.5,37.5],['bevel45',45,0]]as const){
  const pick=lens.locator('[data-joint-angle-preset="'+id+'"]');await pick.click();await expect(lens).toHaveAttribute('data-joint-angles',id);await expect(lens).toHaveAttribute('data-included-angle',String(left+right));
  for(const [side,degrees]of[['left',left],['right',right]]as const){const [x1,y1,x2,y2]=linePoints(await lens.locator('[data-joint-angle-face="'+side+'"]').evaluate(el=>['x1','y1','x2','y2'].map(a=>el.getAttribute(a))));expect(Math.atan2(Math.abs(x2-x1),Math.abs(y2-y1))*180/Math.PI).toBeCloseTo(degrees,8);await expect(lens.locator('[data-joint-angle-reading="'+side+'"]')).toHaveAttribute('data-value',String(degrees));}
  expect(await coords('[data-joint-angle-root],[data-joint-angle-land]')).toEqual(fixed);const geom=await coords('[data-joint-angle-plate],[data-joint-angle-face],[data-joint-angle-ray],[data-joint-angle-reference],[data-joint-angle-arc],[data-joint-angle-vertex]');
  for(const focus of ['bevel','included','root','land']){await lens.locator('[data-joint-angle-focus="'+focus+'"]').click();await expect(lens).toHaveAttribute('data-focus',focus);expect(await coords('[data-joint-angle-plate],[data-joint-angle-face],[data-joint-angle-ray],[data-joint-angle-reference],[data-joint-angle-arc],[data-joint-angle-vertex]')).toEqual(geom);}
  expect((await pick.boundingBox())!.height).toBeGreaterThanOrEqual(44);
 }
 await inspect(page,'joint-angles-'+width,'[data-joint-angles]');await lens.locator('[data-joint-angle-preset="v375"]').click();await lens.locator('[data-joint-angle-focus="included"]').click();await inspect(page,'joint-v375-'+width,'[data-joint-angles]');expect(await savedWork(page)).toBe(saved);expect(errors).toEqual([]);
});
test('New fit and structure explorers remain readable in high contrast',async({page})=>{
 for(const[name,state,selector]of[
  ['joint-angles',{view:'jointCatalog',jc_tab:'butt',proc2_prep:'v'},'[data-joint-angles]'],
  ['stainless-surfaces',{view:'metallurgy',met_sect:'stainless'},'[data-stainless-surfaces]'],
  ['ship-systems',{view:'maineEcosystem',me_mode:'browse',me_sect:'biw'},'[data-ship-systems]']
 ]as const){await mount(page,390,state,true);if(name==='joint-angles'){await page.locator('[data-joint-angle-preset="v375"]').click();await page.locator('[data-joint-angle-focus="bevel"]').click();}if(name==='stainless-surfaces')await page.locator('[data-stainless-surface-pick="both"]').click();if(name==='ship-systems')await page.locator('[data-ship-pick="structure"]').click();await inspect(page,name+'-contrast',selector);}
});
test('Local preview connects the three new fit and structure explorers',async({page})=>{
 const previewURL=process.env.WELDLAB_PREVIEW_URL;test.skip(!previewURL,'The local review page is opt-in and is not a CI fixture.');await page.setViewportSize({width:390,height:900});await page.goto(previewURL!);await expect(page.locator('[data-joint-angles]')).toBeVisible();await page.getByRole('button',{name:'Pipe surfaces',exact:true}).click();await expect(page.locator('[data-stainless-surfaces]')).toBeVisible();await page.getByRole('button',{name:'Ship systems',exact:true}).click();await expect(page.locator('[data-ship-systems]')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
