import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-evidence-refresh');
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
const fitState={view:'careerStories',cs_mode:'fit',cs_q_want:'steady',cs_q_school:'cc',cs_q_place:'big',car2_reflect:'Keep this reflection.',cs_milestones:{marcus:1}};
const numberAttr=async(node:any,attr:string)=>Number(await node.getAttribute(attr));
for(const width of [1280,390]){
 test('Career match evidence traces existing contributions and ties at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,fitState);
  const lens=page.locator('[data-career-fit-evidence]');await expect(lens).toBeVisible();const saved=await savedWork(page);
  const options=await lens.locator('[data-fit-inspect] option').evaluateAll(nodes=>nodes.map(node=>(node as HTMLOptionElement).value));expect(options).toHaveLength(3);
  for(const id of options){await lens.locator('[data-fit-inspect]').selectOption(id);await expect(lens).toHaveAttribute('data-career-fit-evidence',id);let total=0;for(const dim of ['want','school','place']){const bar=lens.locator('[data-fit-contribution="'+dim+'"]');const points=await numberAttr(bar,'data-points'),max=dim==='want'?3:2;expect(points===0||points===max).toBe(true);expect(await numberAttr(bar,'width')).toBe(72*points);expect(await numberAttr(lens.locator('[data-fit-lane="'+dim+'"]'),'width')).toBe(72*max);total+=points;}expect(await numberAttr(lens,'data-score')).toBe(total);expect(await numberAttr(lens.locator('[data-fit-total]'),'width')).toBe(72*total);}
  await lens.locator('[data-fit-inspect]').selectOption(options[0]);const labelSizes=await lens.locator('[data-fit-contribution-plot]').evaluate(svg=>Array.from(svg.querySelectorAll('text')).map(text=>parseFloat(getComputedStyle(text).fontSize)*svg.getBoundingClientRect().width/720));expect(Math.min(...labelSizes)).toBeGreaterThanOrEqual(10);
  await inspect(page,'career-fit-'+width,'[data-career-fit-evidence]');const tied=await lens.locator('[data-fit-inspect] option').evaluateAll(nodes=>nodes.map(node=>(node as HTMLOptionElement).value));let found=false;for(const id of tied){await lens.locator('[data-fit-inspect]').selectOption(id);const detail=lens.locator('[data-fit-tie-detail]');if(await detail.count()){await detail.locator('summary').click();await expect(detail.locator('[data-fit-tie-profile]')).toHaveCount(2);await inspect(page,'career-tie-'+width,'[data-fit-tie-detail]');found=true;break;}}expect(found).toBe(true);
  await lens.locator('[data-fit-context] summary').click();await expect(lens.locator('[data-fit-context-voice]')).toBeVisible();expect(await savedWork(page)).toBe(saved);expect(errors).toEqual([]);
 });
 test('Bend opening rotation preserves physical length and measured result at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,{view:'qualPrep',qp_view:'bend',pipe2_flaw:5,pipe2_bend:'face',qp_ans:{0:1},pipe2_scn:{1:0}});
  const lens=page.locator('[data-qp-opening-direction]');await expect(lens).toBeVisible();const saved=await savedWork(page);await expect(page.locator('[data-pipe2-bend-result]')).toHaveAttribute('data-pipe2-bend-result','reject');
  for(const angle of [0,45,90,135,180]){await lens.locator('[data-qp-opening-angle="'+angle+'"]').click();await expect(lens).toHaveAttribute('data-angle',String(angle));const line=lens.locator('[data-qp-opening-extent]');const ax=await numberAttr(line,'x1'),ay=await numberAttr(line,'y1'),bx=await numberAttr(line,'x2'),by=await numberAttr(line,'y2');expect(Math.hypot(bx-ax,by-ay)).toBeCloseTo(640*5/32,10);const ruler=lens.locator('[data-qp-opening-reference]');expect(await numberAttr(ruler,'x2')-await numberAttr(ruler,'x1')).toBe(80);await expect(page.locator('[data-pipe2-bend-result]')).toHaveAttribute('data-pipe2-bend-result','reject');}
  await lens.locator('[data-qp-opening-angle-number]').fill('90');await lens.locator('[data-qp-opening-angle-range]').focus();await page.keyboard.press('ArrowRight');await expect(lens).toHaveAttribute('data-angle','91');expect(await savedWork(page)).toBe(saved);await inspect(page,'opening-direction-'+width,'[data-qp-opening-direction]');expect(errors).toEqual([]);
 });
 test('Underwater pressure and volume controls solve the same reversible model at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,{view:'underwater',uw_view:'pressure',uw_depth:66,uw_tech:'wet',tech2_uw_pred:'skip',tech2_uw_dec:{1:0},uw_probe_time:7.25});
  const lens=page.locator('[data-uw-gas-bench]');await expect(lens).toBeVisible();const saved=await savedWork(page);
  for(const[d,v]of[[0,1],[33,.5],[99,.25],[300,1/(1+300/33)]]){await lens.locator('[data-uw-gas-preset="'+d+'"]').click();expect(await numberAttr(lens,'data-depth-ft')).toBe(d);const p=1+d/33;expect(await numberAttr(lens,'data-pressure-atm')).toBeCloseTo(p,10);expect(await numberAttr(lens,'data-volume-ratio')).toBeCloseTo(v,10);expect((await numberAttr(lens,'data-width-ratio'))**3).toBeCloseTo(v,10);expect(await numberAttr(lens,'data-product')).toBeCloseTo(1,10);const marker=lens.locator('[data-uw-gas-marker]');expect(await numberAttr(marker,'cx')).toBeCloseTo(72+(p-1)*576/10,8);expect(await numberAttr(marker,'cy')).toBeCloseTo(264-v*228,8);}
  await lens.locator('[data-uw-gas-volume]').fill('');await lens.locator('[data-uw-gas-volume]').pressSequentially('25',{delay:40});await expect(lens.locator('[data-uw-gas-volume]')).toHaveValue('25');expect(await numberAttr(lens,'data-depth-ft')).toBeCloseTo(99,10);
  await lens.locator('[data-uw-gas-volume]').fill('50');expect(await numberAttr(lens,'data-depth-ft')).toBeCloseTo(33,10);await lens.locator('[data-uw-gas-depth]').focus();await page.keyboard.press('ArrowRight');expect(await numberAttr(lens,'data-depth-ft')).toBeGreaterThan(33);await lens.locator('[data-uw-gas-use-lab]').click();expect(await numberAttr(lens,'data-depth-ft')).toBeCloseTo(66,10);const labelSizes=await lens.locator('[data-uw-gas-plot]').evaluate(svg=>Array.from(svg.querySelectorAll('text')).map(text=>parseFloat(getComputedStyle(text).fontSize)*svg.getBoundingClientRect().width/720));expect(Math.min(...labelSizes)).toBeGreaterThanOrEqual(10);const bounds=await lens.locator('[data-uw-gas-plot]').evaluate(svg=>Array.from(svg.querySelectorAll('text')).map(text=>{const b=text.getBBox();return{x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height};}));for(const b of bounds){expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y).toBeGreaterThanOrEqual(0);expect(b.right).toBeLessThanOrEqual(720);expect(b.bottom).toBeLessThanOrEqual(320);}const surfaceLabelRight=await lens.locator('[data-uw-gas-volume-tick="100"] text').evaluate(text=>{const b=(text as SVGGraphicsElement).getBBox();return b.x+b.width;});expect(surfaceLabelRight).toBeLessThanOrEqual(62);await inspect(page,'gas-volume-'+width,'[data-uw-gas-bench]');expect(await savedWork(page)).toBe(saved);expect(errors).toEqual([]);
 });
}
test('New reference interactions remain readable in high contrast',async({page})=>{
 for(const[name,state,selector]of[
  ['career-fit',fitState,'[data-career-fit-evidence]'],
  ['opening-direction',{view:'qualPrep',qp_view:'bend',pipe2_flaw:5},'[data-qp-opening-direction]'],
  ['gas-volume',{view:'underwater',uw_view:'pressure',uw_depth:99,tech2_uw_pred:'skip'},'[data-uw-gas-bench]']
 ]as const){await mount(page,390,state,true);if(name==='opening-direction')await page.locator('[data-qp-opening-angle="90"]').click();if(name==='gas-volume')await page.locator('[data-uw-gas-preset="99"]').click();await inspect(page,name+'-contrast',selector);if(name==='career-fit'){const options=await page.locator('[data-fit-inspect] option').evaluateAll(nodes=>nodes.map(node=>(node as HTMLOptionElement).value));for(const id of options){await page.locator('[data-fit-inspect]').selectOption(id);if(await page.locator('[data-fit-tie-detail]').count()){await page.locator('[data-fit-tie-detail] summary').click();await inspect(page,'career-tie-contrast','[data-fit-tie-detail]');break;}}}}
});
test('Local review page opens the three evidence explorers',async({page})=>{
 const url=process.env.WELDLAB_PREVIEW_URL;test.skip(!url,'The local review page is opt-in.');await page.setViewportSize({width:390,height:900});await page.goto(url!);await page.waitForFunction(()=>Boolean((document.getElementById('preview-app-css') as HTMLLinkElement)?.sheet));await expect(page.locator('[data-career-fit-evidence]')).toBeVisible();await page.getByRole('button',{name:'Opening direction',exact:true}).click();await expect(page.locator('[data-qp-opening-direction]')).toBeVisible();await page.getByRole('button',{name:'Gas volume',exact:true}).click();await expect(page.locator('[data-uw-gas-bench]')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
