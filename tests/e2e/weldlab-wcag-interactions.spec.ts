import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-wcag-refresh');
const harness = new GlHarness({ toolId: 'weldLab', toolFile: 'stem_lab/stem_tool_weldlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], appStyles: true, layout: 'document', probes: `(function(){var original=THREE.PerspectiveCamera.prototype.lookAt;THREE.PerspectiveCamera.prototype.lookAt=function(){window.__wcagCamera=this;var v=arguments[0];window.__wcagTarget=v&&v.isVector3?v.toArray():[arguments[0],arguments[1],arguments[2]];return original.apply(this,arguments);};})();` });
test.describe.configure({ retries: 0, timeout: 120_000 });
test.use({ video: 'off' });
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: any, width: number, state: object, contrast = false) {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { weldLab: state }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: 'html,body{height:auto;background:#f8fafc}#wrap{width:100%;height:auto;display:block}' });
  await page.locator('#wrap').evaluate((el:HTMLElement)=>{el.style.width='100%';el.style.height='auto';el.style.display='block';});
  await page.waitForFunction(()=>Math.abs(document.getElementById('wrap')!.getBoundingClientRect().width-innerWidth)<1);
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
    return { overflow: document.documentElement.scrollWidth - innerWidth,
      overflowNodes: [...document.querySelectorAll('body *')].filter(el => el instanceof HTMLElement && el.getBoundingClientRect().right > innerWidth + 1 && !el.closest('.overflow-x-auto,.preview-bar')).slice(0, 12).map(el => ({ tag: el.tagName, right: el.getBoundingClientRect().right })),
      violations: audit.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) })) };
  }, selector);
  writeFileSync(resolve(output, name + '.json'), JSON.stringify(result, null, 2));
  expect(result.overflow).toBeLessThanOrEqual(1); expect(result.overflowNodes).toEqual([]); expect(result.violations).toEqual([]);
}
const saved = (page: any) => page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab));
const number = async (node: any, attr: string) => Number(await node.getAttribute(attr));
async function range(input: any, value: number) {
  await input.evaluate((element: HTMLInputElement, value: number) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

const tabsets=[['beadLab','bead-view'],['symbolsReader','symbols'],['ppeSafety','ppe'],['careerPaths','careers'],['underwater','underwater'],['consumables','consumables'],['maineEcosystem','ecosystem'],['safetyHealth','safety'],['mathBlueprint','math'],['careerStories','stories']];
async function assertVisibleFocus(page:any){
  const result=await page.evaluate(()=>{const e=document.activeElement as HTMLElement,b=e.getBoundingClientRect(),s=getComputedStyle(e);return {width:parseFloat(s.outlineWidth),style:s.outlineStyle,top:b.top,bottom:b.bottom};});
  expect(result.width).toBeGreaterThanOrEqual(2);expect(result.style).not.toBe('none');expect(result.top).toBeLessThan(900);expect(result.bottom).toBeGreaterThan(0);if(result.bottom-result.top<900){expect(result.top).toBeGreaterThanOrEqual(0);expect(result.bottom).toBeLessThanOrEqual(900);}
}
for(const width of [1280,320]){
  test('Keyboard module navigation restores visible heading focus at '+width+'px',async({page})=>{
    await mount(page,width,{view:'menu',menu_mode:'all'});
    await page.locator('[data-weld-module-query]').fill('Symbols Reader');
    const launch=page.locator('[data-weld-module-result="symbolsReader"] button');await launch.focus();await page.keyboard.press('Enter');
    const heading=page.locator('[data-weld-view="symbolsReader"] h1');await expect(heading).toBeFocused();await assertVisibleFocus(page);
    await heading.locator('..').screenshot({path:resolve(output,'navigation-focus-'+width+'.png')});
    await page.keyboard.press('Shift+Tab');await expect(page.locator('[data-weld-menu-button]')).toBeFocused();await page.keyboard.press('Enter');
    await expect(page.locator('[data-weld-view="menu"] h1')).toBeFocused();await assertVisibleFocus(page);
  });
  test('All ten tab strips expose one tab stop and native exit paths at '+width+'px',async({page})=>{
    for(const[view,name]of tabsets){
      await mount(page,width,{view});const strip=page.locator('[data-weld-tabset="'+name+'"]'),tabs=strip.getByRole('tab');
      await tabs.first().focus();await page.keyboard.press('ArrowLeft');await expect(tabs.last()).toBeFocused();await expect(tabs.last()).toHaveAttribute('aria-selected','true');
      await expect(strip.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
      await page.keyboard.press('Home');await expect(tabs.first()).toBeFocused();await page.keyboard.press('End');await expect(tabs.last()).toBeFocused();
      await page.keyboard.press('Home');await page.keyboard.press('Tab');const panel=page.locator('[data-weld-tabpanel="'+name+'"]');await expect(panel).toBeFocused();await assertVisibleFocus(page);
      const activeId=await tabs.first().getAttribute('id');await expect(panel).toHaveAttribute('aria-labelledby',activeId!);
      await page.keyboard.press('Shift+Tab');await expect(tabs.first()).toBeFocused();
    }
    await inspect(page,'tabs-'+width,'[data-weld-tabset="stories"]');
  });
  test('Single-click camera actions work on the real 3D scene at '+width+'px',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,{view:'beadLab',bl_view:'3d'});
    const controls=page.locator('[data-weld-scene-controls]');await expect(controls).toBeVisible({timeout:30000});
    await page.waitForFunction(()=>Boolean((window as any).__wcagCamera));
    const camera=()=>page.evaluate(()=>{const c=(window as any).__wcagCamera,t=(window as any).__wcagTarget;return {position:c.position.toArray(),radius:c.position.distanceTo(new (window as any).THREE.Vector3(...t))};});
    const before=await camera(),state=await saved(page);
    await controls.locator('[data-weld-scene-orbit="left"]').click();expect((await camera()).position).not.toEqual(before.position);
    await controls.locator('[data-weld-scene-orbit="right"]').click();for(const[i,v]of before.position.entries())expect((await camera()).position[i]).toBeCloseTo(v,9);
    await controls.locator('[data-weld-scene-zoom="out"]').click();expect((await camera()).radius).toBeCloseTo(before.radius+.3,9);
    await controls.locator('[data-weld-scene-zoom="in"]').click();expect((await camera()).radius).toBeCloseTo(before.radius,9);
    await controls.locator('[data-weld-scene-orbit="left"]').focus();await page.keyboard.press('Enter');expect((await camera()).position).not.toEqual(before.position);
    await controls.locator('[data-weld-scene-reset]').click();for(const[i,v]of before.position.entries())expect((await camera()).position[i]).toBeCloseTo(v,9);
    for(const button of await controls.getByRole('button').all()){const b=(await button.boundingBox())!;expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);}
    expect(await saved(page)).toBe(state);await inspect(page,'camera-controls-'+width,'[data-weld-scene-controls]');expect(errors).toEqual([]);
  });
  test('Form errors are associated and announced while element symbols remain in names at '+width+'px',async({page})=>{
    await mount(page,width,{view:'pipeWelding',pipe_sect:'pipeline'});
    const input=page.locator('#pipe2-guess'),status=page.locator('#a11y14_pipe_pay_feedback');await expect(status).toHaveText('');
    const before=await saved(page);await input.fill('');await page.getByRole('button',{name:'Check',exact:true}).click();
    await expect(input).toHaveAttribute('aria-invalid','true');await expect(input).toHaveAccessibleDescription('Type a dollar amount first.');
    await expect(status).toHaveAttribute('role','status');await expect(status).toHaveAttribute('aria-live','polite');
    await status.locator('..').screenshot({path:resolve(output,'pay-validation-'+width+'.png')});
    await input.fill('0');await expect(input).not.toHaveAttribute('aria-invalid','true');await page.getByRole('button',{name:'Check',exact:true}).click();
    await expect(status).toContainText('Off by');expect(await saved(page)).toBe(before);
    await mount(page,width,{view:'metallurgy',met_sect:'ce',met2_ceFree:true});
    await expect(page.getByRole('spinbutton',{name:/C\s*·\s*Carbon\s*·\s*weight percent/i})).toBeVisible();
  });
}
test('Forced colors retain heading and panel focus outlines',async({page})=>{
  await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await mount(page,320,{view:'menu',menu_mode:'all'});
  expect(await page.evaluate(()=>matchMedia('(forced-colors: active)').matches)).toBe(true);
  await page.locator('[data-weld-module-query]').fill('Symbols Reader');await page.locator('[data-weld-module-result="symbolsReader"] button').click();
  await expect(page.locator('[data-weld-view="symbolsReader"] h1')).toBeFocused();await assertVisibleFocus(page);
  await page.locator('[data-weld-view="symbolsReader"] h1').locator('..').screenshot({path:resolve(output,'forced-colors-focus.png')});
});
test('Text spacing and 320px reflow retain access to key module controls',async({page})=>{
  for(const state of [{view:'menu',menu_mode:'all'},{view:'symbolsReader'},{view:'ppeSafety'},{view:'careerStories'},{view:'pipeWelding',pipe_sect:'positions'}]){
    await mount(page,320,state);await page.addStyleTag({content:'[data-weld-view] *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}[data-weld-view] p{margin-bottom:2em!important}'});
    const spacing=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,viewport:innerWidth,wrap:{style:document.getElementById('wrap')!.getAttribute('style'),computed:getComputedStyle(document.getElementById('wrap')!).width},styles:[...document.querySelectorAll('style')].filter(el=>el.textContent?.includes('#wrap')).map(el=>el.textContent?.slice(-1000)),nodes:[...document.querySelectorAll('[data-weld-view] *')].filter(el=>el instanceof HTMLElement&&el.getBoundingClientRect().right>innerWidth+1).slice(0,16).map(el=>({tag:el.tagName,html:el.outerHTML.slice(0,300),right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width}))}));writeFileSync(resolve(output,'text-spacing-'+state.view+'.json'),JSON.stringify(spacing,null,2));expect(spacing.overflow).toBeLessThanOrEqual(1);
    const back=page.locator('[data-weld-menu-button]');if(await back.count()){await back.focus();await assertVisibleFocus(page);}
  }
});

