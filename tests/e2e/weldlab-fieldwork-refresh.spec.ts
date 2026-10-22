import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-fieldwork-refresh');
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
  test('Career entry paths compare complete evidence and keep exploration local at '+width+'px',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await mount(page,width,{view:'careerPaths',cp_view:'paths',car2_pred:{a25:'apprentice',a35:'college',shown:true},car2_ladder:['sense','d11'],car2_lad_chk:true,car2_lad_ref:true});
    const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));await expect(page.locator('[data-career-entry]')).toBeVisible();
    for(let index=0;index<4;index++){
      const right=(index+1)%4;await page.locator('[data-career-entry-pick="left"]').selectOption(String(index));await page.locator('[data-career-entry-pick="right"]').selectOption(String(right));
      await expect(page.locator('[data-career-entry]')).toHaveAttribute('data-left',String(index));await expect(page.locator('[data-career-entry]')).toHaveAttribute('data-right',String(right));await expect(page.locator('[data-career-entry-illustration="'+index+'"]')).toBeVisible();
      for(const focus of ['learning','benefits','commitments','maine','all']){await page.locator('[data-career-entry-focus="'+focus+'"]').click();await expect(page.locator('[data-career-entry-focus="'+focus+'"]').first()).toHaveAttribute('aria-pressed','true');for(const row of ['learning','benefits','commitments','maine'])await expect(page.locator('[data-career-entry-evidence="'+row+'"]').first()).toBeVisible();}
    }
    await page.locator('[data-career-entry-swap]').click();await expect(page.locator('[data-career-entry]')).toHaveAttribute('data-left','0');await expect(page.locator('[data-career-entry]')).toHaveAttribute('data-right','3');
    await page.locator('[data-career-entry-pick="left"]').selectOption('2');await page.locator('[data-career-entry-pick="right"]').selectOption('2');await expect(page.locator('[data-career-entry-same]')).toBeVisible();
    await page.locator('[data-career-entry-pick="right"]').selectOption('0');await page.locator('[data-career-entry-focus="commitments"]').focus();await page.keyboard.press('Enter');await expect(page.locator('[data-career-entry]')).toHaveAttribute('data-focus','commitments');
    await inspect(page,'career-entry-'+width,'[data-career-entry]');
    await page.locator('[data-career-entry-reference] summary').click();await expect(page.locator('[data-career-entry-original]')).toHaveCount(4);for(let i=0;i<4;i++)await expect(page.locator('[data-career-entry-original="'+i+'"]').first()).toBeVisible();if(width===390)await inspect(page,'career-entry-reference-'+width,'[data-career-entry]');
    expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);expect(errors).toEqual([]);
  });
  test('Hierarchy reference locates controls without revealing the sort at '+width+'px',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await mount(page,width,{view:'safetyHealth',sh_mode:'browse',sh_sect:'controls',safe2_hoc:{eng1:1,ppe2:4},sh_audit:{lev:'no'},safe2_noise:[{db:95,h:2}]});
    const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));
    const geometry=async()=>page.locator('[data-control-map]').evaluate(el=>[...el.querySelectorAll('[data-control-node]')].map(n=>({id:n.getAttribute('data-control-node'),geometry:[n,...n.querySelectorAll('*')].filter(x=>!x.hasAttribute('data-control-focus')).map(x=>['x','y','width','height','d','cx','cy','r','transform'].map(a=>x.getAttribute(a)))})));const fixed=await geometry();
    const definition=['Remove the hazard completely.','Swap in something less hazardous.','Isolate people from the hazard with equipment.','Change the way people work: rules, schedules, training.','Protect the worker with gear they wear.'];
    const targets=['source','source','equipment','method','worker'];
    for(let level=0;level<5;level++){
      const button=page.locator('[data-control-level="'+level+'"]');await button.click();await expect(page.locator('[data-control-hierarchy]')).toHaveAttribute('data-control-hierarchy',String(level));await expect(page.locator('[data-control-reading]')).toContainText(definition[level]);await expect(page.locator('[data-control-focus]')).toHaveAttribute('data-control-focus',targets[level]);expect(await geometry()).toEqual(fixed);expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await expect(page.getByText('PPE: the noise is still there; a plug protects only the ear it is in, and only when it is fitted.',{exact:true})).toHaveCount(0);
    }
    await inspect(page,'control-hierarchy-'+width,'[data-control-hierarchy]');expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);
    await page.getByRole('button',{name:'Check my sort',exact:true}).click();await expect(page.getByText('✓ PPE: the noise is still there; a plug protects only the ear it is in, and only when it is fitted.',{exact:true})).toBeVisible();
    await page.locator('[data-control-level="0"]').click();await expect(page.getByText('✓ PPE: the noise is still there; a plug protects only the ear it is in, and only when it is fitted.',{exact:true})).toBeVisible();expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);expect(errors).toEqual([]);
  });
  test('Underwater hazard lenses preserve one fixed scene and saved results at '+width+'px',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,{view:'underwater',uw_view:'safety',uw_depth:66,uw_tech:'wet',tech2_uw_pred:'skip'});
    const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));const fixed=await page.locator('[data-uw-hazard-base]').evaluate(el=>el.outerHTML);
    for(const id of ['shock','explosion','decompression','cold','visibility','collapse']){const button=page.locator('[data-uw-hazard-pick="'+id+'"]');await button.click();await expect(button).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-uw-hazard]')).toHaveAttribute('data-uw-hazard',id);await expect(page.locator('[data-uw-hazard-focus="'+id+'"]')).toBeVisible();await expect(page.locator('[data-uw-hazard-reading="'+id+'"]')).toBeVisible();expect(await page.locator('[data-uw-hazard-base]').evaluate(el=>el.outerHTML)).toBe(fixed);expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);}
    await page.locator('[data-uw-hazard-pick="visibility"]').click();await expect(page.locator('[data-uw-hazard-reading]')).toContainText('two-way voice communication');await expect(page.locator('[data-uw-hazard-reading]')).not.toContainText('60 seconds');await inspect(page,'underwater-hazards-'+width,'[data-uw-hazard]');
    const reference=page.locator('[data-uw-hazard] details summary');await reference.click();await expect(page.locator('[data-uw-hazard-reference]')).toHaveCount(6);await expect(page.locator('[data-uw-hazard-reference="collapse"]')).toContainText('team requirements depend on the diving operation');if(width===390)await inspect(page,'underwater-hazards-reference-'+width,'[data-uw-hazard]');
    expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);expect(errors).toEqual([]);
  });
}
test('Career, control hierarchy and dive hazard readers stay clear in high contrast',async({page})=>{
  for(const[name,state,selector]of[
    ['career-entry',{view:'careerPaths',cp_view:'paths'},'[data-career-entry]'],
    ['control-hierarchy',{view:'safetyHealth',sh_mode:'browse',sh_sect:'controls'},'[data-control-hierarchy]'],
    ['underwater-hazards',{view:'underwater',uw_view:'safety'},'[data-uw-hazard]']
  ]as const){await mount(page,390,state,true);if(name==='career-entry')await page.locator('[data-career-entry-focus="benefits"]').click();if(name==='control-hierarchy')await page.locator('[data-control-level="2"]').click();if(name==='underwater-hazards')await page.locator('[data-uw-hazard-pick="shock"]').click();await inspect(page,name+'-contrast',selector);}
});
test('Local preview reaches all three new fieldwork explorers',async({page})=>{
  await page.setViewportSize({width:390,height:900});await page.goto('http://127.0.0.1:8741/tmp/weld-review/index.html?pass=fieldwork#fieldpaths');await expect(page.locator('[data-career-entry]')).toBeVisible();await page.getByRole('button',{name:'Control hierarchy',exact:true}).click();await expect(page.locator('[data-control-hierarchy]')).toBeVisible();await page.getByRole('button',{name:'Underwater hazards',exact:true}).click();await expect(page.locator('[data-uw-hazard]')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
