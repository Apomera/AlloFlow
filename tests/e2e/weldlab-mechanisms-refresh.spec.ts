import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-mechanisms-refresh');
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
  test('Blueprint projections share physical dimensions and crop the same geometry at '+width+'px',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,{view:'mathBlueprint',mb_mode:'browse',mb_sect:'prints',sym2_m_seed:12345,sym2_m_score:3,sym2_m_tries:5,mb_q_score:2});
    await expect(page.locator('[data-print-projections]')).toBeVisible();const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));
    const geometry=async()=>page.locator('[data-projection-drawing]').evaluate(el=>[...el.querySelectorAll('[data-projection-part]')].map(n=>({view:n.getAttribute('data-view'),part:n.getAttribute('data-projection-part'),geometry:[n,...n.querySelectorAll('*')].map(x=>['x','y','width','height','d','points','transform'].map(a=>x.getAttribute(a)))})));const fixed=await geometry();
    await expect(page.locator('[data-print-projections]')).toHaveAttribute('data-scale','40');
    for(const[dimension,length,views]of[['width',6,['front','top']],['depth',4,['top','right']],['height',6.5,['front','right']]]as const){await page.locator('[data-projection-focus="'+dimension+'"]').click();await expect(page.locator('[data-print-projections]')).toHaveAttribute('data-focus',dimension);for(const view of views)await expect(page.locator('[data-projection-dimension="'+dimension+'"][data-view="'+view+'"]')).toHaveAttribute('data-length',String(length));expect(await geometry()).toEqual(fixed);}
    const expected=[['front','base',240,20],['front','upright',20,240],['front','gusset',120,120],['top','base',240,160],['top','upright',20,160],['top','gusset',120,20],['right','base',160,20],['right','upright',160,240],['right','gusset',20,120]]as const;
    for(const[view,part,w,h]of expected){const bounds=await page.locator('[data-projection-part="'+part+'"][data-view="'+view+'"]').evaluate(el=>{const b=(el as SVGGraphicsElement).getBBox();return{w:b.width,h:b.height};});expect(bounds.w).toBeCloseTo(w,5);expect(bounds.h).toBeCloseTo(h,5);}
    await page.locator('[data-projection-focus="width"]').click();const guides=page.locator('[data-projection-guides]');if(await guides.getAttribute('aria-pressed')==='true')await guides.click();await expect(page.locator('[data-projection-guide]')).toHaveCount(0);await guides.click();expect(await page.locator('[data-projection-guide]').count()).toBeGreaterThan(0);
    await page.locator('[data-projection-detail="all"]').click();const overview=await page.locator('[data-projection-drawing]').getAttribute('viewBox');await inspect(page,'blueprint-projections-'+width,'[data-print-projections]');
    for(const view of ['front','top','right']){await page.locator('[data-projection-detail="'+view+'"]').click();await expect(page.locator('[data-print-projections]')).toHaveAttribute('data-detail',view);expect(await page.locator('[data-projection-drawing]').getAttribute('viewBox')).not.toBe(overview);expect(await geometry()).toEqual(fixed);}
    await inspect(page,'blueprint-projection-detail-'+width,'[data-print-projections]');await page.locator('[data-projection-reference] summary').click();await expect(page.locator('[data-projection-original]')).toHaveCount(9);expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);expect(errors).toEqual([]);
  });
  test('BCC and FCC show exact site coordinates at one common projection at '+width+'px',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,{view:'metallurgy',met_sect:'phase'});await expect(page.locator('[data-crystal-inspector]')).toBeVisible();const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));
    const cornerIds=[];for(const x of [0,1])for(const y of [0,1])for(const z of [0,1])cornerIds.push('corner-'+x+y+z);
    const faceIds=['face-x0','face-x1','face-y0','face-y1','face-z0','face-z1'];
    const selected=page.locator('[data-crystal-cell="selected"]');expect((await selected.locator('[data-crystal-scene]').boundingBox())!.width).toBeLessThanOrEqual(400.1);
    const sitePositions=async()=>selected.locator('[data-crystal-site]').evaluateAll(els=>els.map(el=>({id:el.getAttribute('data-crystal-site'),x:Number(el.getAttribute('data-x')),y:Number(el.getAttribute('data-y')),z:Number(el.getAttribute('data-z')),cx:Number(el.getAttribute('cx')),cy:Number(el.getAttribute('cy'))})));
    for(const structure of ['bcc','fcc']){
      await page.locator('[data-crystal-select="'+structure+'"]').click();await expect(page.locator('[data-crystal-inspector]')).toHaveAttribute('data-crystal-inspector',structure);const positions=await sitePositions();expect(positions.map(p=>p.id).sort()).toEqual([...cornerIds,...(structure==='bcc'?['body']:faceIds)].sort());
      for(const point of positions){expect([0,.5,1]).toContain(point.x);expect([0,.5,1]).toContain(point.y);expect([0,.5,1]).toContain(point.z);expect(point.cx).toBeCloseTo(64+120*point.x+50*point.y,6);expect(point.cy).toBeCloseTo(210-40*point.y-120*point.z,6);}
      expect(new Set(positions.map(p=>p.cx+','+p.cy)).size).toBe(positions.length);
      for(const focus of ['corners','centres']){await page.locator('[data-crystal-focus="'+focus+'"]').click();await expect(page.locator('[data-crystal-focus="'+focus+'"]')).toHaveAttribute('aria-pressed','true');expect(await sitePositions()).toEqual(positions);for(const point of positions)await expect(selected.locator('[data-crystal-site="'+point.id+'"]')).toBeVisible();}
    }
    await page.locator('[data-crystal-compare]').click();await expect(page.locator('[data-crystal-cell]')).toHaveCount(2);const edgeGeometry=await page.locator('[data-crystal-edges]').evaluateAll(els=>els.map(el=>[...el.querySelectorAll('line')].map(line=>['x1','y1','x2','y2'].map(a=>line.getAttribute(a)))));expect(edgeGeometry[0]).toHaveLength(12);expect(edgeGeometry[1]).toHaveLength(12);expect(edgeGeometry[0]).toEqual(edgeGeometry[1]);
    const sizes=await page.locator('[data-crystal-scene]').evaluateAll(els=>els.map(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height})));expect(sizes[0].w).toBeLessThanOrEqual(400.1);expect(sizes[1].w).toBeLessThanOrEqual(400.1);expect(sizes[0].w).toBeCloseTo(sizes[1].w,1);expect(sizes[0].h).toBeCloseTo(sizes[1].h,1);await inspect(page,'crystal-sites-'+width,'[data-crystal-inspector]');
    await page.locator('[data-crystal-coordinates] summary').first().click();await expect(page.locator('[data-crystal-reading]').first()).toBeVisible();expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);expect(errors).toEqual([]);
  });
  test('Robot programming choices highlight information routes without running a program at '+width+'px',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,{view:'robotic',rob_sect:'program',tech2_rob_prog:[{x:3,y:5,m:'L',w:false},{x:5,y:5,m:'L',w:true}],tech2_rob_sort:{0:'manual'}});await expect(page.locator('[data-robot-program-routes]')).toBeVisible();const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));const fixed=await page.locator('[data-robot-program-route-base]').evaluate(el=>el.outerHTML);
    for(const id of ['pendant','offline','sensors']){const button=page.locator('[data-robot-program-route-pick="'+id+'"]');await button.click();await expect(button).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-robot-program-routes]')).toHaveAttribute('data-robot-program-routes',id);await expect(page.locator('[data-robot-program-route-focus="'+id+'"]')).toBeVisible();await expect(page.locator('[data-robot-program-route-reading="'+id+'"]')).toBeVisible();expect(await page.locator('[data-robot-program-route-base]').evaluate(el=>el.outerHTML)).toBe(fixed);expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);}
    await inspect(page,'robot-programming-'+width,'[data-robot-program-routes]');await page.locator('[data-robot-program-routes] details summary').click();await expect(page.locator('[data-robot-program-route-reference]')).toHaveCount(3);expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);expect(errors).toEqual([]);
  });
}
test('Projection, crystal and programming controls remain readable in high contrast',async({page})=>{
  for(const[name,state,selector]of[
    ['blueprint-projections',{view:'mathBlueprint',mb_mode:'browse',mb_sect:'prints',sym2_m_seed:12345},'[data-print-projections]'],
    ['crystal-sites',{view:'metallurgy',met_sect:'phase'},'[data-crystal-inspector]'],
    ['robot-programming',{view:'robotic',rob_sect:'program'},'[data-robot-program-routes]']
  ]as const){await mount(page,390,state,true);if(name==='blueprint-projections'){await page.locator('[data-projection-focus="height"]').click();await page.locator('[data-projection-detail="right"]').click();}if(name==='crystal-sites')await page.locator('[data-crystal-compare]').click();if(name==='robot-programming')await page.locator('[data-robot-program-route-pick="offline"]').click();await inspect(page,name+'-contrast',selector);}
});
test('Local preview shows all three mechanisms explorers',async({page})=>{
  await page.setViewportSize({width:390,height:900});await page.goto('http://127.0.0.1:8741/tmp/weld-review/index.html?pass=mechanisms#projections');await expect(page.locator('[data-print-projections]')).toBeVisible();await page.getByRole('button',{name:'Crystal sites',exact:true}).click();await expect(page.locator('[data-crystal-inspector]')).toBeVisible();await page.getByRole('button',{name:'Robot programming',exact:true}).click();await expect(page.locator('[data-robot-program-routes]')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
