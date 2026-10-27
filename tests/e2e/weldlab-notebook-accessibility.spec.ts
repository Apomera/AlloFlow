import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const require = createRequire(resolve('package.json'));
const { PNG } = require(resolve('node_modules/playwright-core/lib/utilsBundle.js'));
const phase = process.env.WELDLAB_NOTEBOOK_CHECK || 'final';
const results: any[] = [];
const output = resolve('reports/weldlab-notebook-accessibility');
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

async function probeHunt(page: any, id: string, sample = 'sampleA') {
  const canvas = page.locator('[aria-roledescription="inspection surface"] canvas');
  const point = await canvas.evaluate((canvas: HTMLCanvasElement, arg: { id: string, sample: string }) => {
    const core = (window as any).__WeldLabCore, c = canvas as any;
    const geometry = core.DH_SAMPLE_GEOM[arg.sample], mark = geometry.marks.find((m: any) => m.id === arg.id);
    const W = c._logicalW || canvas.width, H = c._logicalH || canvas.height;
    const at = core.dhToPx(core.dhFrame(geometry, W, H), mark.u, mark.v), rect = canvas.getBoundingClientRect();
    return { x: at.x / W * rect.width, y: at.y / H * rect.height };
  }, { id, sample });
  await canvas.click({ position: point });
}
async function classifyHunt(page: any, cls: string) {
  const index = await page.evaluate((cls: string) => {
    const types = (window as any).__WeldLabCore.DH_DEFECT_TYPES;
    return cls === 'ok' ? types.length : types.indexOf(cls);
  }, cls);
  await page.getByRole('radiogroup', { name: 'Classify the selected spot', exact: true }).getByRole('radio').nth(index).click();
  await page.getByRole('button', { name: /^Confirm classification/ }).click();
}

async function observe(page:Page,name:string){const path=resolve(output,phase+'-endpoint-observations.json'),rows=existsSync(path)?JSON.parse(readFileSync(path,'utf8')).filter((r:any)=>r.name!==name):[];rows.push({name,focus:await page.evaluate(()=>({tag:document.activeElement?.tagName,id:document.activeElement?.id,html:document.activeElement?.outerHTML.slice(0,450)}))});writeFileSync(path,JSON.stringify(rows,null,2));}
for(const width of [1280,320])test('Committed notebook keyboard flow and result exposure '+width+'px',async({page})=>{
 for(const contrast of [false,true]){
  const suffix=width+'-'+(contrast?'contrast':'default');await mount(page,{view:'defectHunt',car2_reflect:'Keep my notes.',qp_ans:{0:1},weldBadges:{ppeSafety:true}},width,contrast);
  const panel=page.locator('[data-hunt-review]'),pick=(id:string)=>page.locator('[data-hunt-review-pick="'+id+'"]');
  await expect(panel).toHaveAttribute('data-hunt-review','empty');await expect(page.locator('[data-hunt-review-truth]')).toHaveCount(0);
  for(const id of ['A1','A5','A2']){await probeHunt(page,id);await classifyHunt(page,'undercut');}
  await expect(page.locator('[data-hunt-review-map]')).toHaveAttribute('data-hunt-review-map','A1,A5,A2');
  const before=await saved(page),stats=await page.locator('[aria-roledescription="inspection surface"] canvas').getAttribute('aria-label');
  for(const [direction,end]of [['prev','A1'],['next','A2']]){
   await activate(page,pick('A5'));const button=page.locator('[data-hunt-review-'+direction+']');await activate(page,button);await expect(button).toBeDisabled();await expect(panel).toHaveAttribute('data-hunt-review',end);await observe(page,'notebook-'+suffix+'-'+direction);
   if(phase!=='baseline')await focusVisible(page,pick(end));
  }
  if(phase!=='baseline'){
   const reading=page.locator('#hunt6-review-reading'),element=await reading.elementHandle();await expect(reading).toHaveAttribute('aria-live','polite');await expect(reading).toHaveAttribute('aria-atomic','true');await expect(reading.locator('canvas,svg,button,input,select')).toHaveCount(0);
   await activate(page,pick('A1'));const text=await reading.textContent();await activate(page,page.locator('[data-hunt-review-next]'));await expect(page.locator('[data-hunt-review-next]')).toBeFocused();await expect(panel).toHaveAttribute('data-hunt-review','A5');expect(await reading.textContent()).not.toBe(text);await expect(page.locator('[data-hunt-review-truth]')).toHaveAttribute('data-hunt-review-truth','ok');await expect(page.locator('[data-hunt-review-first-call]')).toHaveAttribute('data-hunt-review-first-call','undercut');
   await activate(page,page.locator('[data-hunt-review-view="lighting"]'));await expect(page.locator('[data-hunt-review-view="lighting"]')).toBeFocused();expect(await element!.evaluate(el=>el===document.getElementById('hunt6-review-reading'))).toBe(true);
   expect(await saved(page)).toEqual(before);expect(await page.locator('[aria-roledescription="inspection surface"] canvas').getAttribute('aria-label')).toBe(stats);
   const ax=await axRecord(page,['[data-hunt-review-pick="A5"]','#hunt6-review-reading'],'notebook-'+suffix);expect(ax[0].node.role?.value).toBe('button');expect(ax[1].node.properties?.find(p=>p.name==='live')?.value.value).toBe('polite');
   await audit(page,'notebook-'+suffix);await panel.screenshot({path:resolve(output,'notebook-'+suffix+'.png')});
  }
 }
});
