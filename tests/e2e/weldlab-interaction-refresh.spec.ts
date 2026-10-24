import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-interaction-refresh');
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
const shapeArea=(s:string)=>{const p=s.trim().split(/\s+/).map(v=>v.split(',').map(Number));return Math.abs(p.reduce((sum,v,i)=>{const n=p[(i+1)%p.length];return sum+v[0]*n[1]-n[0]*v[1];},0))/2;};
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
for(const width of [1280,390]){
 test('Section station cuts actual BRKT-01 material at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,{view:'mathBlueprint',mb_mode:'browse',mb_sect:'prints',sym2_m_seed:12345,sym2_m_score:3,sym2_m_tries:5,mb_q_score:2});
  const lens=page.locator('[data-section-planes]');await expect(lens).toBeVisible();const saved=await savedWork(page),parent=await lens.locator('[data-section-parent-part]').evaluateAll(els=>els.map(el=>el.outerHTML));let initialX:number|undefined;
  for(const[index,x,member,area]of[[0,.75,'none',0],[1,1.75,'upright',24],[2,2.5,'gusset',1.25],[3,3.5,'gusset',.75],[4,4.5,'gusset',.25],[5,5.5,'none',0]]as const){
   await lens.locator('[data-section-plane-preset="'+index+'"]').click();await expect(lens).toHaveAttribute('data-cut-x',String(x));const plane=lens.locator('[data-section-plane]'),actualX=Number(await plane.getAttribute('x1'));if(initialX===undefined)initialX=actualX;expect(actualX-initialX).toBeCloseTo((x-.75)*40,8);
   expect(shapeArea((await lens.locator('[data-section-part="base"]').getAttribute('points'))!)).toBeCloseTo(2*1600,6);
   for(const id of ['upright','gusset'])await expect(lens.locator('[data-section-part="'+id+'"]')).toHaveCount(id===member?1:0);
   if(member!=='none')expect(shapeArea((await lens.locator('[data-section-part="'+member+'"]').getAttribute('points'))!)).toBeCloseTo(area*1600,6);
   const section=await lens.locator('[data-section-part]').evaluateAll(els=>els.map(el=>el.outerHTML));for(const detail of ['parent','section','all']){await lens.locator('[data-section-view="'+detail+'"]').click();await expect(lens).toHaveAttribute('data-detail',detail);expect(await lens.locator('[data-section-parent-part]').evaluateAll(els=>els.map(el=>el.outerHTML))).toEqual(parent);expect(await lens.locator('[data-section-part]').evaluateAll(els=>els.map(el=>el.outerHTML))).toEqual(section);}
  }
  await lens.locator('[data-section-plane-preset="2"]').click();await inspect(page,'section-planes-'+width,'[data-section-planes]');await lens.locator('[data-section-view="section"]').click();await inspect(page,'section-detail-'+width,'[data-section-planes]');expect(await savedWork(page)).toBe(saved);expect(errors).toEqual([]);
 });
 test('Filler mass conservation stays on a fixed scale at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,{view:'consumables',cons_mode:'browse',cons_sect:'cost',tech2_cons_proc:'fcaw',tech2_cons_leg:.25,tech2_cons_labor:60,cons_sc_idx:1,cons_sc_score:2});
  const lens=page.locator('[data-mass-balance]');await expect(lens).toBeVisible();const saved=await savedWork(page);const axis=await lens.locator('[data-mass-axis-tick]').evaluateAll(els=>els.map(el=>el.outerHTML));
  for(const[id,eff]of[['smaw',.675],['gmaw_sc',.925],['gmaw_spray',.925],['fcaw',.85],['gtaw',.975],['saw',.97]]as const){await lens.locator('[data-mass-process]').selectOption(id);await lens.locator('[data-mass-preset="5"]').click();const input=5/eff,remainder=input-5;await expect(lens).toHaveAttribute('data-process',id);expect(Number(await lens.getAttribute('data-input'))).toBeCloseTo(input,10);expect(Number(await lens.getAttribute('data-remainder'))).toBeCloseTo(remainder,10);expect(Number(await lens.locator('[data-mass-target-bar]').getAttribute('width'))).toBe(350);const deposited=lens.locator('[data-mass-segment="deposited"]'),other=lens.locator('[data-mass-segment="remainder"]');expect(Number(await deposited.getAttribute('width'))).toBe(350);expect(Number(await other.getAttribute('x'))).toBe(414);expect(Number(await other.getAttribute('width'))).toBeCloseTo(remainder*70,8);expect(Number(await lens.locator('[data-mass-input-outline]').getAttribute('width'))).toBeCloseTo(input*70,8);expect(await lens.locator('[data-mass-axis-tick]').evaluateAll(els=>els.map(el=>el.outerHTML))).toEqual(axis);}
  await lens.locator('[data-mass-process]').selectOption('smaw');await inspect(page,'mass-balance-'+width,'[data-mass-balance]');await lens.locator('[data-mass-target]').focus();await page.keyboard.press('ArrowLeft');await expect(lens).toHaveAttribute('data-target','4.5');expect(await savedWork(page)).toBe(saved);expect(errors).toEqual([]);
 });
 test('Wavelength probes share exact boundary positions and ratios at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,{view:'safetyHealth',sh_mode:'browse',sh_sect:'eyes',sh_audit:{},safe2_nz_rows:[{db:90,hours:2}]});
  const lens=page.locator('[data-wavelength-compare]');await expect(lens).toBeVisible();const saved=await savedWork(page),bands=await lens.locator('[data-wavelength-band]').evaluateAll(els=>els.map(el=>el.outerHTML));
  for(const[a,b]of[[200,1400],[400,700],[700,400],[600,600],[300,600]]as const){await lens.locator('[data-wavelength-probe="a"]').fill(String(a));await lens.locator('[data-wavelength-probe="b"]').fill(String(b));for(const[id,nm]of[['a',a],['b',b]]as const){const marker=lens.locator('[data-wavelength-marker="'+id+'"]');await expect(marker).toHaveAttribute('data-value',String(nm));expect(Number(await marker.locator('circle').getAttribute('cx'))).toBeCloseTo(64+(nm-200)*592/1200,8);if(nm===400||nm===700)await expect(marker).toHaveAttribute('data-band','boundary'+nm);}const d=gcd(a,b);await expect(lens.locator('[data-wavelength-ratio]')).toHaveAttribute('data-numerator',String(b/d));await expect(lens.locator('[data-wavelength-ratio]')).toHaveAttribute('data-denominator',String(a/d));expect(await lens.locator('[data-wavelength-band]').evaluateAll(els=>els.map(el=>el.outerHTML))).toEqual(bands);}
  await lens.locator('[data-wavelength-swap]').click();await expect(lens.locator('[data-wavelength-marker="a"]')).toHaveAttribute('data-value','600');await expect(lens.locator('[data-wavelength-marker="b"]')).toHaveAttribute('data-value','300');await lens.locator('[data-wavelength-equal]').click();await expect(lens.locator('[data-wavelength-marker="b"]')).toHaveAttribute('data-value','600');await expect(lens.locator('[data-wavelength-ratio]')).toHaveAttribute('data-numerator','1');await expect(lens.locator('[data-wavelength-ratio]')).toHaveAttribute('data-denominator','1');
  await lens.locator('[data-wavelength-probe="a"]').fill('400');await lens.locator('[data-wavelength-probe="b"]').fill('700');await inspect(page,'wavelength-compare-'+width,'[data-wavelength-compare]');expect(await savedWork(page)).toBe(saved);expect(errors).toEqual([]);
 });
}

test('The new interaction benches stay readable in high contrast',async({page})=>{
 for(const[name,state,selector]of[
  ['section-planes',{view:'mathBlueprint',mb_mode:'browse',mb_sect:'prints'},'[data-section-planes]'],
  ['mass-balance',{view:'consumables',cons_mode:'browse',cons_sect:'cost'},'[data-mass-balance]'],
  ['wavelength-compare',{view:'safetyHealth',sh_mode:'browse',sh_sect:'eyes'},'[data-wavelength-compare]']
 ]as const){await mount(page,390,state,true);if(name==='section-planes'){await page.locator('[data-section-plane-preset="1"]').click();await page.locator('[data-section-view="section"]').click();}if(name==='mass-balance'){await page.locator('[data-mass-process]').selectOption('smaw');await page.locator('[data-mass-preset="5"]').click();}if(name==='wavelength-compare'){await page.locator('[data-wavelength-probe="a"]').fill('700');await page.locator('[data-wavelength-probe="b"]').fill('700');}await inspect(page,name+'-contrast',selector);}
});
test('Local preview opens the three new interaction benches',async({page})=>{
 const previewURL=process.env.WELDLAB_PREVIEW_URL;test.skip(!previewURL,'The local review page is opt-in and is not a CI fixture.');await page.setViewportSize({width:390,height:900});await page.goto(previewURL!);await page.waitForFunction(()=>Boolean((document.getElementById('preview-app-css') as HTMLLinkElement)?.sheet));await expect(page.locator('[data-section-planes]')).toBeVisible();await page.getByRole('button',{name:'Filler mass balance',exact:true}).click();await expect(page.locator('[data-mass-balance]')).toBeVisible();await page.getByRole('button',{name:'Wavelength comparison',exact:true}).click();await expect(page.locator('[data-wavelength-compare]')).toBeVisible();const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,nodes:[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1&&!el.closest('.preview-bar')).slice(0,25).map(el=>({tag:el.tagName,classes:el.className?.baseVal??el.className,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width,text:el.textContent?.slice(0,100)}))}));writeFileSync(resolve(output,'preview-layout.json'),JSON.stringify(layout,null,2));expect(layout.overflow).toBeLessThanOrEqual(1);
});
