import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-insights-refresh');
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


for(const width of [1280,390]){
  test('Code chapter map preserves outlines and supports search and navigation at '+width+'px',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await mount(page,width,{view:'codes',insp2_codesTab:'read',codes_pick:'d1_1',insp2_sort:{0:{pick:'same',checked:true}},insp2_clauseIdx:2});
    const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));
    await expect(page.locator('[data-code-reader]')).toHaveAttribute('data-count','11');
    await expect(page.locator('[data-code-reader-nav="previous"]')).toBeDisabled();
    const numbers=await page.locator('[data-code-reader-section]').evaluateAll(els=>els.map(el=>el.getAttribute('data-code-reader-section')!));
    for(const number of numbers){await page.locator('[data-code-reader-section="'+number+'"]').click();await expect(page.locator('[data-code-reader-reading]')).toHaveAttribute('data-number',number);await expect(page.locator('[data-code-reader-section="'+number+'"]')).toHaveAttribute('aria-pressed','true');}
    await expect(page.locator('[data-code-reader-nav="next"]')).toBeDisabled();await page.locator('[data-code-reader-nav="previous"]').click();await expect(page.locator('[data-code-reader-reading]')).toHaveAttribute('data-number',numbers[numbers.length-2]);
    const sizes=await page.locator('[data-code-reader-section]').evaluateAll(els=>els.map(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height})));
    expect(Math.max(...sizes.map(s=>s.w))-Math.min(...sizes.map(s=>s.w))).toBeLessThan(1);expect(Math.max(...sizes.map(s=>s.h))-Math.min(...sizes.map(s=>s.h))).toBeLessThan(1);
    await page.locator('[data-code-reader-search]').fill('zzzz-no-such-section');await expect(page.locator('[data-code-reader-empty]')).toBeVisible();await expect(page.locator('[data-code-reader-reading]')).toHaveCount(0);await expect(page.locator('[data-code-reader-note]')).toBeVisible();
    await page.locator('[data-code-reader-outline] summary').click();await expect(page.locator('[data-code-reader-reference]')).toHaveCount(11);await inspect(page,'code-reader-empty-'+width,'[data-code-reader]');
    await page.locator('[data-code-reader-clear]').click();await page.locator('[data-code-reader-outline] summary').click();await expect(page.locator('[data-code-reader-reading]')).toHaveAttribute('data-number',numbers[0]);
    expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);
    for(const[name,id,count,query]of[['ASME Section IX','asme9',5,'qw-200'],['API 1104','api1104',8,'1-4']]as const){
      await page.getByRole('button',{name,exact:true}).click();await expect(page.locator('[data-code-reader]')).toHaveAttribute('data-code',id);await expect(page.locator('[data-code-reader]')).toHaveAttribute('data-count',String(count));await expect(page.locator('[data-code-reader-search]')).toHaveValue('');
      const stored=await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));await page.locator('[data-code-reader-search]').fill(query);await expect(page.locator('[data-code-reader-section]')).toHaveCount(1);await expect(page.locator('[data-code-reader-reading]')).toHaveAttribute('data-number',query.toUpperCase());await expect(page.locator('[data-code-reader-nav="next"]')).toBeDisabled();expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(stored);
    }
    await page.getByRole('button',{name:'AWS D1.1',exact:true}).click();await page.locator('[data-code-reader-section="6"]').focus();await page.keyboard.press('Enter');await expect(page.locator('[data-code-reader-reading]')).toHaveAttribute('data-number','6');await inspect(page,'code-reader-'+width,'[data-code-reader]');expect(errors).toEqual([]);
  });
  test('Pipeline pay shares an exact signed scale for both periods at '+width+'px',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await mount(page,width,{view:'pipeWelding',pipe_sect:'pipeline',pipe2_rate:51,pipe2_hrs:61,pipe2_pd:135,pipe2_pddays:6,pipe2_weeks:13,pipe2_costs:375,pipe2_passQuiz:{0:1}});
    const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));
    const base=[['straight',0,2040,2040],['overtime',2040,3646.5,1606.5],['perdiem',3646.5,4456.5,810],['costs',4456.5,4081.5,-375],['net',0,4081.5,4081.5]]as const;
    for(const[period,factor]of[['week',1],['job',13]]as const){
      await page.locator('[data-pipe-pay-period="'+period+'"]').click();await expect(page.locator('[data-pipe-pay]')).toHaveAttribute('data-period',period);await expect(page.locator('[data-pipe-pay]')).toHaveAttribute('data-min','0');await expect(page.locator('[data-pipe-pay]')).toHaveAttribute('data-max',String(4456.5*factor));
      const boxes:number[]=[];
      for(const[id,from,to,value]of base){const row=page.locator('[data-pipe-pay-select="'+id+'"]');await row.click();await expect(page.locator('[data-pipe-pay-reading]')).toHaveAttribute('data-pipe-pay-reading',id);await expect(row).toHaveAttribute('data-value',String(value*factor));const bar=page.locator('[data-pipe-pay-bar="'+id+'"]');const x=20+Math.min(from,to)/4456.5*600,w=Math.abs(to-from)/4456.5*600;expect(Number(await bar.getAttribute('x'))).toBeCloseTo(x,6);expect(Number(await bar.getAttribute('width'))).toBeCloseTo(w,6);const box=await page.locator('[data-pipe-pay-plot="'+id+'"]').boundingBox();boxes.push(box!.width);}
      expect(Math.max(...boxes)-Math.min(...boxes)).toBeLessThan(1);
    }
    await expect(page.locator('[data-pipe-pay-summary="job"]')).toHaveText('$53,059.5');await inspect(page,'pipeline-pay-'+width,'[data-pipe-pay]');expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);expect(errors).toEqual([]);
    await mount(page,width,{view:'pipeWelding',pipe_sect:'pipeline',pipe2_rate:20,pipe2_hrs:40,pipe2_pd:0,pipe2_costs:1500,pipe2_weeks:2});
    await expect(page.locator('[data-pipe-pay]')).toHaveAttribute('data-min','-700');await expect(page.locator('[data-pipe-pay]')).toHaveAttribute('data-max','800');await expect(page.locator('[data-pipe-pay-bar="overtime"]')).toHaveCount(0);await expect(page.locator('[data-pipe-pay-zero="overtime"]')).toBeVisible();await expect(page.locator('[data-pipe-pay-bar="perdiem"]')).toHaveCount(0);await expect(page.locator('[data-pipe-pay-zero="perdiem"]')).toBeVisible();
    expect(Number(await page.locator('[data-pipe-pay-bar="costs"]').getAttribute('x'))).toBeCloseTo(20,6);expect(Number(await page.locator('[data-pipe-pay-bar="costs"]').getAttribute('width'))).toBeCloseTo(600,6);expect(Number(await page.locator('[data-pipe-pay-bar="net"]').getAttribute('width'))).toBeCloseTo(280,6);await expect(page.locator('[data-pipe-pay-summary="job"]')).toHaveText('−$1,400');
  });
  test('Aluminum snapshots preserve the plate and static material references at '+width+'px',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,{view:'metallurgy',met_sect:'aluminum',met_ce_c:.19,met_haz_quiz:{0:1}});
    const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));
    const geometry=async()=>page.locator('[data-met-al-scene]').evaluate(el=>['[data-met-al-layer="metal"]','[data-met-al-layer="oxide"]','[data-met-al-torch]'].map(s=>{const node=el.querySelector(s)!;return ['x','y','width','height','transform'].map(a=>node.getAttribute(a));}));const original=await geometry();
    const axis=await page.locator('[data-met-al-axis]').evaluate(el=>el.outerHTML);
    for(const phase of ['surface','ep','en']){await page.locator('[data-met-al-phase="'+phase+'"]').click();await expect(page.locator('[data-met-aluminum]')).toHaveAttribute('data-met-aluminum',phase);await expect(page.locator('[data-met-al-focus="'+phase+'"]')).toBeVisible();expect(await geometry()).toEqual(original);expect(await page.locator('[data-met-al-axis]').evaluate(el=>el.outerHTML)).toBe(axis);await expect(page.locator('[data-met-al-reading]')).toBeVisible();if(phase!=='surface'){await expect(page.locator('[data-met-al-polarity="electrode"]')).toContainText(phase==='ep'?'+':'−');await expect(page.locator('[data-met-al-polarity="workpiece"]')).toContainText(phase==='ep'?'−':'+');}}
    for(const[id,temp]of[['metal',1220],['oxide',3700]]as const){const marker=page.locator('[data-met-al-reference="'+id+'"]');const value=await marker.evaluate(el=>Number(el.querySelector('line')!.getAttribute('x1')));expect(value).toBeCloseTo(32+576*temp/4000,2);}
    await expect(page.locator('[data-met-al-reading]')).toContainText('Electrode negative');await inspect(page,'aluminum-surface-'+width,'[data-met-aluminum]');expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);expect(errors).toEqual([]);
  });
}
test('Chapter, pay and aluminum controls remain readable in high contrast',async({page})=>{
  for(const[name,state,selector]of[
    ['code-reader',{view:'codes',insp2_codesTab:'read',codes_pick:'d1_1'},'[data-code-reader]'],
    ['pipeline-pay',{view:'pipeWelding',pipe_sect:'pipeline'},'[data-pipe-pay]'],
    ['aluminum-surface',{view:'metallurgy',met_sect:'aluminum'},'[data-met-aluminum]']
  ]as const){await mount(page,390,state,true);if(name==='pipeline-pay')await page.locator('[data-pipe-pay-period="job"]').click();if(name==='aluminum-surface')await page.locator('[data-met-al-phase="ep"]').click();await inspect(page,name+'-contrast',selector);}
});
test('Local preview routes expose the three new explorers',async({page})=>{
  await page.setViewportSize({width:390,height:900});await page.goto('http://127.0.0.1:8741/tmp/weld-review/index.html?pass=insights#chapters');await expect(page.locator('[data-code-reader]')).toBeVisible();await page.getByRole('button',{name:'Pipeline pay',exact:true}).click();await expect(page.locator('[data-pipe-pay]')).toBeVisible();await page.getByRole('button',{name:'Aluminum surface',exact:true}).click();await expect(page.locator('[data-met-aluminum]')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
