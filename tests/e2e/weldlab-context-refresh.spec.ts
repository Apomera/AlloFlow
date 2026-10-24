import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-context-refresh');
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






for (const width of [1280,390]) {
  test('Capture-hood references retain shared distance and airflow scales at '+width+'px', async ({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await mount(page,width,{view:'ppeSafety',ps_view:'reference',safe2_sAnswers:{2:1},safe2_floorDone:true});
    await expect(page.locator('[data-ppe-ventilation]')).toBeVisible();
    const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));
    for (const [id,midpoint,lo,hi] of [['near',5,4,6],['far',11,10,12]] as const) {
      await page.locator('[data-ppe-vent-band="'+id+'"]').focus();await page.keyboard.press('Space');
      await expect(page.locator('[data-ppe-ventilation]')).toHaveAttribute('data-ppe-ventilation',id);
      const hood=page.locator('[data-ppe-vent-hood]'),arc=page.locator('[data-ppe-vent-arc]');
      expect(Number(await hood.getAttribute('data-midpoint'))).toBe(midpoint);
      expect(Number(await hood.getAttribute('data-x'))-Number(await arc.getAttribute('data-x'))).toBe(36*midpoint);
      expect(Number(await hood.getAttribute('data-y'))).toBe(Number(await arc.getAttribute('data-y')));
      const band=page.locator('[data-ppe-vent-distance-band="'+id+'"]');
      expect(Number(await band.getAttribute('data-min'))).toBe(lo);expect(Number(await band.getAttribute('data-max'))).toBe(hi);
      await expect(page.locator('[data-ppe-vent-reading]')).toContainText(id==='near'?'150':'600');
    }
    const bars=await page.locator('[data-ppe-vent-flow-bar]').evaluateAll(els=>els.map(el=>({value:Number(el.getAttribute('data-value')),width:Number(el.getAttribute('width')),physicalWidth:el.getBoundingClientRect().width})));
    expect(bars.map(b=>b.value)).toEqual([150,600]);expect(bars[1].width/bars[0].width).toBe(4);expect(bars[1].physicalWidth/bars[0].physicalWidth).toBeCloseTo(4,3);
    await inspect(page,'hood-distance-'+width,'[data-ppe-ventilation]');
    expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);expect(errors).toEqual([]);
  });
}

for (const width of [1280,390]) {
  test('Bevel geometry keeps the same face when the angle reference changes at '+width+'px', async ({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await mount(page,width,{view:'mathBlueprint',mb_mode:'browse',mb_sect:'geometry',sym2_m_seed:12345,sym2_m_score:3,sym2_m_tries:4,mb_q_score:2});
    const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));
    for(const degrees of [0,15,30,45,60]){
      await page.locator('[data-bevel-angle]').fill(String(degrees));
      const face=.5/Math.cos(degrees*Math.PI/180),run=.5*Math.tan(degrees*Math.PI/180);
      expect(Number(await page.locator('[data-math-bevel]').getAttribute('data-face'))).toBeCloseTo(face,8);
      expect(Number(await page.locator('[data-math-bevel]').getAttribute('data-run'))).toBeCloseTo(run,8);
      const outline=await page.locator('[data-bevel-body]').getAttribute('d');
      for(const lens of ['vertical','horizontal']){
        await page.locator('[data-bevel-lens="'+lens+'"]').focus();await page.keyboard.press('Space');
        expect(await page.locator('[data-bevel-body]').getAttribute('d')).toBe(outline);
        const actual=await page.evaluate((lens:string)=>{
          const face=document.querySelector('[data-bevel-face]') as SVGGeometryElement,len=face.getTotalLength();
          const a=face.getPointAtLength(0),b=face.getPointAtLength(len);
          const arc=document.querySelector('[data-bevel-active-arc]') as SVGGeometryElement|null;
          let angle=null;
          if(arc){const center=lens==='vertical'?b:a,p=arc.getPointAtLength(0),q=arc.getPointAtLength(arc.getTotalLength());
            const u=[p.x-center.x,p.y-center.y],v=[q.x-center.x,q.y-center.y];
            angle=Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/(Math.hypot(...u)*Math.hypot(...v)))))*180/Math.PI;}
          return {length:len,a:{x:a.x,y:a.y},b:{x:b.x,y:b.y},angle,arcD:arc?.getAttribute('d'),computedD:arc?getComputedStyle(arc).getPropertyValue('d'):null,transition:arc?getComputedStyle(arc).transition:null,activeLens:document.querySelector('[data-math-bevel]')?.getAttribute('data-lens'),activeAngle:document.querySelector('[data-math-bevel]')?.getAttribute('data-angle-vertical')};
        },lens);
        expect(actual.length/240).toBeCloseTo(face,5);expect((actual.b.x-actual.a.x)/240).toBeCloseTo(run,5);expect((actual.b.y-actual.a.y)/240).toBeCloseTo(.5,5);
        if(degrees===0&&lens==='vertical'){expect(actual.angle).toBeNull();await expect(page.locator('[data-bevel-zero-angle]')).toHaveCount(1);}
        else {if(Math.abs((actual.angle??999)-(lens==='vertical'?degrees:90-degrees))>.0005)console.log('Bevel diagnostic',JSON.stringify({degrees,lens,...actual}));expect(actual.angle).toBeCloseTo(lens==='vertical'?degrees:90-degrees,3);}
        await expect(page.locator('[data-bevel-formula]')).toContainText(lens==='vertical'?'cos':'sin');
      }
    }
    await page.locator('[data-bevel-angle]').fill('45');await page.locator('[data-bevel-lens="horizontal"]').click();
    await inspect(page,'bevel-geometry-'+width,'[data-math-bevel]');
    await page.locator('[data-bevel-reset]').click();await expect(page.locator('[data-math-bevel]')).toHaveAttribute('data-angle-vertical','30');await expect(page.locator('[data-math-bevel]')).toHaveAttribute('data-lens','vertical');
    expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);expect(errors).toEqual([]);
  });
}

for(const width of [1280,390]){
  test('Visual inspection tools keep one unscored specimen and crop its real geometry at '+width+'px',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await mount(page,width,{view:'inspection',insp_sect:'visual',insp2_benchIdx:2,insp2_bench:{0:{pick:'accept',checked:true}},insp2_ndtQuiz:{0:2},insp2_ndtQIdx:1});
    await expect(page.locator('[data-insp-vt-toolkit]')).toBeVisible();
    const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));
    const specimen=await page.locator('[data-insp-vt-specimen]').evaluate(el=>el.outerHTML);
    for(const id of ['light','magnifier','mirror','weld-gauge','pit-gauge','borescope','code']){
      const tool=page.locator('[data-insp-vt-tool]');await tool.selectOption(id);
      await expect(tool).toHaveValue(id);await expect(tool).toHaveAttribute('data-insp-vt-tool',id);
      await expect(page.locator('[data-insp-vt-target]')).toBeVisible();
      expect(await page.locator('[data-insp-vt-specimen]').evaluate(el=>el.outerHTML)).toBe(specimen);
    }
    await page.locator('[data-insp-vt-tool]').selectOption('magnifier');
    const original=await page.locator('[data-insp-vt-scene]').getAttribute('viewBox');
    await page.locator('[data-insp-vt-detail-toggle]').click();
    expect(await page.locator('[data-insp-vt-scene]').getAttribute('viewBox')).not.toBe(original);
    expect(await page.locator('[data-insp-vt-specimen]').evaluate(el=>el.outerHTML)).toBe(specimen);
    await inspect(page,'vt-toolkit-detail-'+width,'[data-insp-vt-toolkit]');
    await page.locator('[data-insp-vt-detail-toggle]').click();await expect(page.locator('[data-insp-vt-scene]')).toHaveAttribute('viewBox',original!);
    await page.locator('[data-insp-vt-tool]').selectOption('borescope');await page.locator('[data-insp-vt-reference-list] summary').click();await inspect(page,'vt-toolkit-'+width,'[data-insp-vt-toolkit]');
    expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);expect(errors).toEqual([]);
  });
}
test('Bevel, toolkit and hood controls remain readable in high contrast',async({page})=>{
  for(const[name,state,selector]of[
    ['bevel-geometry',{view:'mathBlueprint',mb_mode:'browse',mb_sect:'geometry',sym2_m_seed:12345},'[data-math-bevel]'],
    ['vt-toolkit',{view:'inspection',insp_sect:'visual'},'[data-insp-vt-toolkit]'],
    ['hood-distance',{view:'ppeSafety',ps_view:'reference'},'[data-ppe-ventilation]']
  ]as const){await mount(page,390,state,true);if(name==='bevel-geometry')await page.locator('[data-bevel-lens="horizontal"]').click();if(name==='vt-toolkit'){await page.locator('[data-insp-vt-tool]').selectOption('mirror');await page.locator('[data-insp-vt-reference-list] summary').click();}if(name==='hood-distance')await page.locator('[data-ppe-vent-band="far"]').click();await inspect(page,name+'-contrast',selector);}
});
test('Local preview routes show the three new lesson interactions',async({page})=>{
  await page.setViewportSize({width:390,height:900});await page.goto('http://127.0.0.1:8741/tmp/weld-review/index.html?pass=context#bevel');
  await expect(page.locator('[data-math-bevel]')).toBeVisible();await page.getByRole('button',{name:'VT toolkit',exact:true}).click();await expect(page.locator('[data-insp-vt-toolkit]')).toBeVisible();await page.getByRole('button',{name:'Hood distance',exact:true}).click();await expect(page.locator('[data-ppe-ventilation]')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
