import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const require = createRequire(resolve('package.json'));
const { PNG } = require(resolve('node_modules/playwright-core/lib/utilsBundle.js'));
const phase = process.env.WELDLAB_REPAIR_CHECK || 'final';
const results: any[] = [];
const output = resolve('reports/weldlab-repair-accessibility');
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

const retained={car2_reflect:'Keep this reflection.',qp_ans:{0:1},weldBadges:{ppeSafety:true}};
async function setRange(input:Locator,value:number){await input.evaluate((el:HTMLInputElement,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);}
async function observe(page:Page,name:string){const path=resolve(output,phase+'-endpoint-observations.json'),rows=existsSync(path)?JSON.parse(readFileSync(path,'utf8')).filter((r:any)=>r.name!==name):[];rows.push({name,focus:await page.evaluate(()=>({tag:document.activeElement?.tagName,id:document.activeElement?.id,html:document.activeElement?.outerHTML.slice(0,450)}))});writeFileSync(path,JSON.stringify(rows,null,2));}
for(const width of [1280,320])test('Repair candidate feedback and Apply focus '+width+'px',async({page})=>{
 for(const contrast of [false,true]){
  const suffix=width+'-'+(contrast?'contrast':'default');await mount(page,{...retained,view:'defectDiagnose',dd2Idx:1,dd2Shown:[1],dd2Ans:true,dd2Pick:'heatHigh',dh2_ddSec:'travelFast',dd2Score:1,dd2Rounds:1},width,contrast);
  const slider=page.locator('#repair6-candidate'),apply=page.locator('[data-repair-apply]'),panel=page.locator('[data-repair-probe]');const before=await saved(page);
  await slider.focus();await setRange(slider,220);await expect(slider).toBeFocused();await expect(panel).toHaveAttribute('data-live-value','280');expect(await saved(page)).toEqual(before);
  await activate(page,apply);await expect(apply).toBeDisabled();await expect(panel).toHaveAttribute('data-live-value','220');await observe(page,'repair-'+suffix);
  if(phase!=='baseline'){
   await focusVisible(page,slider);const reading=page.locator('#repair6-preview-readings');await expect(reading).toHaveAttribute('aria-live','polite');await expect(reading).toHaveAttribute('aria-atomic','true');await expect(reading.locator('canvas,button,input,svg')).toHaveCount(0);
   await expect(slider).toHaveAccessibleDescription((await reading.innerText()).replace(/\s+/g,' ').trim());
   const node=await reading.elementHandle(),text=await reading.textContent(),after=await saved(page);expect(after).toMatchObject({...retained,dd2Score:1,dd2Rounds:1});expect(after.dh2_diag['2'].fixed).toBe(true);
   await setRange(slider,280);await expect(slider).toBeFocused();await expect(panel).toHaveAttribute('data-live-value','220');expect(await saved(page)).toEqual(after);expect(await reading.textContent()).not.toBe(text);expect(await node!.evaluate(el=>el===document.getElementById('repair6-preview-readings'))).toBe(true);
   const ax=await axRecord(page,['#repair6-candidate','#repair6-preview-readings'],'repair-'+suffix);expect(ax[0].node.role?.value).toBe('slider');expect(ax[1].node.properties?.find(p=>p.name==='live')?.value.value).toBe('polite');
   await audit(page,'repair-'+suffix);await panel.screenshot({path:resolve(output,'repair-'+suffix+'.png')});
  }
 }
});
for(const width of [1280,320])test('Code Section Reader navigation and Clear search focus '+width+'px',async({page})=>{
 for(const contrast of [false,true])for(const code of ['d1_1','asme9','api1104']){
  const suffix=code+'-'+width+'-'+(contrast?'contrast':'default');await mount(page,{...retained,view:'codes',insp2_codesTab:'read',codes_pick:code},width,contrast);const before=await saved(page),panel=page.locator('[data-code-reader]'),tiles=page.locator('[data-code-reader-section]'),count=await tiles.count();
  for(const [direction,start,end]of [['previous',1,0],['next',count-2,count-1]]as const){
   await activate(page,tiles.nth(start));const button=page.locator('[data-code-reader-nav="'+direction+'"]');await activate(page,button);await expect(button).toBeDisabled();await expect(tiles.nth(end)).toHaveAttribute('aria-pressed','true');await observe(page,'reader-'+suffix+'-'+direction);
   if(phase!=='baseline')await focusVisible(page,tiles.nth(end));
  }
  const search=page.locator('#code3-reader-search');await search.fill('no matching clause here');await expect(page.locator('[data-code-reader-empty]')).toBeVisible();const clear=page.locator('[data-code-reader-clear]');await activate(page,clear);await expect(clear).toBeDisabled();await expect(search).toHaveValue('');await expect(tiles).toHaveCount(count);await observe(page,'reader-'+suffix+'-clear');
  if(phase!=='baseline'){
   await focusVisible(page,search);expect(await saved(page)).toEqual(before);const ax=await axRecord(page,['#code3-reader-search','#code3-reader-count'],'reader-'+suffix);expect(ax[0].node.role?.value).toBe('searchbox');expect(ax[1].node.properties?.find(p=>p.name==='live')?.value.value).toBe('polite');await audit(page,'reader-'+suffix);
  }
 }
});

