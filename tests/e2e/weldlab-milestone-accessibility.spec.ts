import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const require = createRequire(resolve('package.json'));
const { PNG } = require(resolve('node_modules/playwright-core/lib/utilsBundle.js'));
const phase = process.env.WELDLAB_MILESTONE_CHECK || 'final';
const results: any[] = [];
const output = resolve('reports/weldlab-milestone-accessibility');
const harness = new GlHarness({ toolId: 'weldLab', toolFile: 'stem_lab/stem_tool_weldlab.js', preScripts: ['stem_lab/stem_lab_module.js', 'app_styles_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], appStyles: true, layout: 'document' });
test.describe.configure({ timeout: 420_000, retries: 0 });
test.use({ video: 'off' });
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, state: object, width: number, contrast: boolean) {
  await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { weldLab: state }, undefined, { expectCanvas: false });
  await page.evaluate(() => { const host = document.createElement('div'); document.body.append(host); const w = window as any; w.ReactDOM.render(w.React.createElement(w.AlloModules.AppStyles.AppStyles), host); });
  await page.addStyleTag({ content: 'html,body{height:auto;background:#f8fafc}#wrap{width:100%;height:auto;display:block}' });
  await page.locator('#wrap').evaluate((el: HTMLElement) => { el.style.width = '100%'; el.style.height = 'auto'; el.style.display = 'block'; });
  await page.waitForFunction(() => Math.abs(document.getElementById('wrap')!.getBoundingClientRect().width - innerWidth) < 1);
  if (contrast) await page.evaluate(() => { document.body.classList.add('theme-contrast'); Object.assign((window as any).__ctx, { isContrast: true, theme: 'contrast' }); (window as any).__rerender(); });
  await page.waitForTimeout(250);
}
async function activate(page: Page, control: Locator) { await control.focus(); await page.keyboard.press('Enter'); }
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.weldLab))); }
async function focusVisible(page: Page, target: Locator) {
  await expect(target).toBeFocused();
  const box = await target.boundingBox(); expect(box).toBeTruthy();
  expect(box!.y).toBeLessThan(900); expect(box!.y + box!.height).toBeGreaterThan(0);
  const outline = await target.evaluate(el => ({ width: parseFloat(getComputedStyle(el).outlineWidth), style: getComputedStyle(el).outlineStyle }));
  expect(outline.width).toBeGreaterThanOrEqual(2); expect(outline.style).not.toBe('none');
}
async function audit(page: Page, name: string) {
  const result = await page.evaluate(async () => {
    const axe = (window as any).axe; axe.reset();
    const r = await axe.run(document.getElementById('wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
    const detail = (v: any) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n: any) => ({ target: n.target, html: n.html, summary: n.failureSummary, checks: [...n.any, ...n.all, ...n.none].map((c: any) => ({ id: c.id, message: c.message, data: c.data })) })) });
    return { violations: r.violations.map(detail), incomplete: r.incomplete.map(detail), overflow: document.documentElement.scrollWidth - innerWidth };
  });
  writeFileSync(resolve(output, 'reader-' + name + '-axe.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toBeLessThanOrEqual(1);
}
// These are actual browser accessibility nodes. They do not establish the
// spoken behavior of NVDA, Narrator, JAWS, VoiceOver, or another screen reader.
async function axRecord(page: Page, selectors: string[], name: string) {
  const client = await page.context().newCDPSession(page);
  try {
    await client.send('Accessibility.enable');
    const { root } = await client.send('DOM.getDocument');
    const targets = [];
    for (const selector of selectors) {
      const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector });
      expect(nodeId, selector).toBeGreaterThan(0);
      const { node } = await client.send('DOM.describeNode', { nodeId });
      targets.push({ selector, backendDOMNodeId: node.backendNodeId });
    }
    const { nodes } = await client.send('Accessibility.getFullAXTree');
    const records = targets.map(target => {
      const node = nodes.find(n => n.backendDOMNodeId === target.backendDOMNodeId);
      expect(node, target.selector).toBeTruthy();
      const children = new Set(node!.childIds || []);
      return { selector: target.selector, node: node!, children: nodes.filter(n => children.has(n.nodeId)) };
    });
    writeFileSync(resolve(output, 'reader-' + name + '-ax.json'), JSON.stringify({ method: 'Chromium CDP Accessibility.getFullAXTree; browser exposure only, not spoken assistive-technology validation', totalNodes: nodes.length, records }, null, 2));
    return records;
  } finally { await client.detach(); }
}

const retained={car2_reflect:'Keep my reflection.',qp_ans:{0:1},weldBadges:{ppeSafety:true}};
const robot={view:'robotic',rob_sect:'pendant',tech2_rob_prog:[{x:1,y:1,m:'J',w:false},{x:4,y:6,m:'J',w:false},{x:12,y:6,m:'L',w:true},{x:12,y:1,m:'J',w:false},{x:1,y:1,m:'L',w:false}],tech2_rob_sort:{0:'manual'}};
const bead={view:'beadLab',bl_view:'topdown',arc_handsOn:true,arc_run:[6,12,24,10,18],bl_V:22,bl_A:180,bl_TS:12,bl_process:'mig',bl_material:'steel',bl_thickness:.25};
async function setRange(input:Locator,value:number){await input.evaluate((el:HTMLInputElement,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);}
async function observe(page:Page,name:string){
 const path=resolve(output,phase+'-endpoint-observations.json');
 // Keep completed contexts if a later assertion restarts the Playwright worker.
 const observations=existsSync(path)?JSON.parse(readFileSync(path,'utf8')).filter((row:any)=>row.name!==name):[];
 observations.push({name,focus:await page.evaluate(()=>({tag:document.activeElement?.tagName,id:document.activeElement?.id,html:document.activeElement?.outerHTML.slice(0,450)}))});writeFileSync(path,JSON.stringify(observations,null,2));
}
for(const width of [1280,320]) test('Career navigation and identified reader results at '+width+'px',async({page})=>{
 for(const contrast of [false,true]){
  const suffix=width+'-'+(contrast?'contrast':'default');
  await mount(page,{...retained,view:'careerStories',cs_mode:'browse',cs_sel:1,cs_milestones:{sarah:1}},width,contrast);
  const pick=(n:number)=>page.locator('[data-career-milestone-pick="'+n+'"]'),prev=page.locator('[data-career-milestone-prev]'),next=page.locator('[data-career-milestone-next]');
  const last=await page.locator('[data-career-milestone-pick]').count()-1;
  await activate(page,prev);await expect(prev).toBeDisabled();await expect(pick(0)).toHaveAttribute('aria-pressed','true');await observe(page,'milestone-first-'+suffix);
  if(phase!=='baseline')await focusVisible(page,pick(0));
  await activate(page,pick(last-1));await activate(page,next);await expect(next).toBeDisabled();await observe(page,'milestone-last-'+suffix);
  if(phase!=='baseline'){
   await focusVisible(page,pick(last));
   const reading=page.locator('#story5-milestone-readings');await expect(reading).toHaveAttribute('aria-live','polite');await expect(reading).toHaveAttribute('aria-atomic','true');
   const handle=await reading.elementHandle(),old=await reading.textContent();await activate(page,pick(1));await expect(pick(1)).toBeFocused();expect(await reading.textContent()).not.toBe(old);expect(await handle!.evaluate(el=>el===document.getElementById('story5-milestone-readings'))).toBe(true);
   await audit(page,'milestone-'+suffix);
   const ax=await axRecord(page,['[data-career-milestone-pick="1"]','#story5-milestone-readings'],'milestone-'+suffix);
   expect(ax[0].node.role?.value).toBe('button');expect(ax[1].node.properties?.find(p=>p.name==='live')?.value.value).toBe('polite');
   expect(await saved(page)).toMatchObject(retained);
  }
  await mount(page,{...retained,view:'careerStories',cs_mode:'compare',car2_cmp:[1,9]},width,contrast);
  const slider=page.locator('[data-career-age-slider]'),back=page.locator('[data-career-age-prev]'),forward=page.locator('[data-career-age-next]');
  const before=await saved(page),min=Number(await slider.getAttribute('min')),max=Number(await slider.getAttribute('max'));
  await setRange(slider,min+.25);await activate(page,back);await expect(back).toBeDisabled();await expect(slider).toHaveValue(String(min));await observe(page,'age-first-'+suffix);
  if(phase!=='baseline')await focusVisible(page,slider);
  await setRange(slider,max-.25);await activate(page,forward);await expect(forward).toBeDisabled();await expect(slider).toHaveValue(String(max));await observe(page,'age-last-'+suffix);
  if(phase!=='baseline'){
   await focusVisible(page,slider);await expect(slider).toHaveAccessibleDescription(/Sarah[\s\S]*Mike/);
   const readings=page.locator('[data-career-age-reading]');await expect(readings).toHaveCount(2);
   for(const row of await readings.all())await expect(row).toHaveAttribute('aria-live','polite');
   const ax=await axRecord(page,['[data-career-age-slider]','[data-career-age-reading="sarah"]','[data-career-age-reading="mike"]'],'age-'+suffix);
   expect(ax[0].node.role?.value).toBe('slider');expect(ax[0].node.description?.value).toMatch(/Sarah[\s\S]*Mike/);
   expect(await saved(page)).toEqual(before);await audit(page,'age-'+suffix);
  }
 }
});
for(const width of [1280,320])test('Recorded bead and robot time navigation at '+width+'px',async({page})=>{
 for(const contrast of [false,true])for(const [module,state,attr]of [['bead',bead,'arc-interval'],['robot',robot,'rob-time']]as const){
  const suffix=module+'-'+width+'-'+(contrast?'contrast':'default');await mount(page,{...retained,...state},width,contrast);
  if(module==='bead')await page.locator('[data-arc-intervals] > summary').click();
  const select=page.locator('[data-'+attr+'-select]'),prev=page.locator('[data-'+attr+'-prev]'),next=page.locator('[data-'+attr+'-next]');
  const before=await saved(page),last=await select.locator('option').count()-1;
  await select.selectOption('1');await activate(page,prev);await expect(select).toHaveValue('0');await expect(prev).toBeDisabled();await observe(page,suffix+'-first');
  if(phase!=='baseline')await focusVisible(page,select);
  await select.selectOption(String(last-1));await activate(page,next);await expect(select).toHaveValue(String(last));await expect(next).toBeDisabled();await observe(page,suffix+'-last');
  if(phase!=='baseline'){
   await focusVisible(page,select);await select.selectOption('1');await activate(page,next);await expect(next).toBeFocused();await expect(select).toHaveValue('2');
   await select.focus();await select.selectOption('3');await expect(select).toBeFocused();expect(await saved(page)).toEqual(before);await audit(page,suffix);
   const ax=await axRecord(page,['[data-'+attr+'-select]'],suffix);expect(ax[0].node.role?.value).toBe('combobox');
  }
 }
});
