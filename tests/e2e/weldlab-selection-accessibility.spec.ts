import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const require = createRequire(resolve('package.json'));
const { PNG } = require(resolve('node_modules/playwright-core/lib/utilsBundle.js'));
const phase = process.env.WELDLAB_MACRO_CHECK || 'final';
const results: any[] = [];
const output = resolve('reports/weldlab-macro-accessibility');
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


const cases=[{id:'pressed',state:{view:'codes',insp2_codesTab:'read',codes_pick:'d1_1'},selector:'[data-code-reader-section]',attr:'aria-pressed',group:'[data-code-reader]'},
 {id:'selected',state:{view:'consumables',cons_mode:'browse'},selector:'[data-weld-tabset="consumables"] button',attr:'aria-selected',group:'[data-weld-tabset="consumables"]'},
 {id:'checked',state:{view:'defectHunt'},selector:'[role="radiogroup"][aria-label="Select sample to inspect"] button',attr:'aria-checked',group:'[role="radiogroup"][aria-label="Select sample to inspect"]'}];
async function styles(control:Locator){return control.evaluate(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return{color:s.color,background:s.backgroundColor,border:s.borderTopColor,borderWidth:s.borderTopWidth,borderStyle:s.borderTopStyle,line:s.textDecorationLine,thickness:s.textDecorationThickness,offset:s.textUnderlineOffset,width:r.width,height:r.height};});}
async function record(name:string,value:any){const file=resolve(output,phase+'-selection-observations.json'),rows=existsSync(file)?JSON.parse(readFileSync(file,'utf8')).filter((r:any)=>r.name!==name):[];rows.push({name,...value});writeFileSync(file,JSON.stringify(rows,null,2));}
for(const width of [1280,320])test('Selected controls remain distinct with actual app styles '+width+'px',async({page})=>{
 for(const contrast of [false,true])for(const item of cases){
  const name=item.id+'-'+width+'-'+(contrast?'contrast':'default');await mount(page,{...item.state,car2_reflect:'Keep my reflection.',weldBadges:{ppeSafety:true}},width,contrast);const controls=page.locator(item.selector),first=controls.first(),next=controls.nth(1);
  await expect(first).toHaveAttribute(item.attr,'true');await expect(next).toHaveAttribute(item.attr,'false');await first.scrollIntoViewIfNeeded();await page.mouse.move(0,0);const before={on:await styles(first),off:await styles(next)};
  await activate(page,next);await expect(next).toHaveAttribute(item.attr,'true');await expect(first).toHaveAttribute(item.attr,'false');await page.mouse.move(0,0);await page.waitForTimeout(180);const after={on:await styles(next),off:await styles(first)};await record(name,{before,after});
  if(phase!=='baseline'){
   if(contrast){for(const on of [before.on,after.on]){expect(on.border).toBe('rgb(255, 255, 255)');expect(on.line).toContain('underline');expect(on.thickness).toBe('2px');expect(on.offset).toBe('3px');}
    for(const off of [before.off,after.off])expect(off.line).toBe('none');expect(after.on.borderWidth).toBe(before.off.borderWidth);expect(after.on.width).toBeCloseTo(before.off.width,1);expect(after.on.height).toBeCloseTo(before.off.height,1);
    await next.hover();const hover=await styles(next);expect(hover.background).toBe('rgb(0, 255, 0)');expect(hover.color).toBe('rgb(0, 0, 0)');expect(hover.border).toBe('rgb(255, 255, 255)');expect(hover.line).toContain('underline');
   }else{expect(before.on.line).toBe('none');expect(after.on.line).toBe('none');}
   await page.mouse.move(0,0);await next.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await focusVisible(page,next);
   const current=await saved(page);expect(current.car2_reflect).toBe('Keep my reflection.');expect(current.weldBadges).toEqual({ppeSafety:true});
   const ax=await axRecord(page,[item.selector+'['+item.attr+'="true"]'],'selection-'+name);expect(String(ax[0].node.properties?.find(p=>p.name===item.id)?.value.value)).toBe('true');
   await audit(page,'selection-'+name);await page.locator(item.group).screenshot({path:resolve(output,'selection-'+name+'.png')});
   if(contrast){await page.emulateMedia({reducedMotion:'reduce',forcedColors:'active'});await focusVisible(page,next);expect((await styles(next)).line).toContain('underline');await page.locator(item.group).screenshot({path:resolve(output,'forced-selection-'+name+'.png')});await page.emulateMedia({reducedMotion:'reduce',forcedColors:'none'});}
  }
 }
});
