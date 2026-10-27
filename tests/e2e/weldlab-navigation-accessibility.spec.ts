import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const require = createRequire(resolve('package.json'));
const { PNG } = require(resolve('node_modules/playwright-core/lib/utilsBundle.js'));
const phase = process.env.WELDLAB_NAVIGATION_CHECK || 'final';
const results: any[] = [];
const output = resolve('reports/weldlab-navigation-accessibility');
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

const retained={car2_reflect:'Keep my project notes.',qp_ans:{0:1},weldBadges:{ppeSafety:true}};
async function observe(page:Page,name:string){
 const path=resolve(output,phase+'-endpoint-observations.json');const rows=existsSync(path)?JSON.parse(readFileSync(path,'utf8')).filter((r:any)=>r.name!==name):[];
 rows.push({name,focus:await page.evaluate(()=>({tag:document.activeElement?.tagName,id:document.activeElement?.id,html:document.activeElement?.outerHTML.slice(0,500)}))});writeFileSync(path,JSON.stringify(rows,null,2));
}
for(const width of [1280,320])test('Blueprint pan retains focus at every drawing edge '+width+'px',async({page})=>{
 for(const contrast of [false,true]){
  await mount(page,{...retained,view:'symbolsReader',sr_view:'blueprint',sym2_bp_ans:{},sym2_pr_score:3,sym2_pr_tries:5},width,contrast);
  const suffix=width+'-'+(contrast?'contrast':'default'),panel=page.locator('[data-blueprint-magnifier]'),reading=page.locator('[data-blueprint-reading]');const before=await saved(page);
  const read=()=>panel.evaluate(el=>({x:el.getAttribute('data-x'),y:el.getAttribute('data-y'),zoom:el.getAttribute('data-zoom')}));
  const live=await reading.elementHandle();
  for(const zoom of [2,3])for(const direction of ['left','right','up','down']){
   await activate(page,page.locator('[data-blueprint-reset]'));await activate(page,page.locator('[data-blueprint-zoom="'+zoom+'"]'));
   const button=page.locator('[data-blueprint-pan="'+direction+'"]');await button.focus();
   let count=0;while(!(await button.isDisabled())&&count++<16)await page.keyboard.press('Enter');
   await expect(button).toBeDisabled();await observe(page,'blueprint-'+suffix+'-'+zoom+'-'+direction);
   if(phase!=='baseline'){
    await focusVisible(page,button);await expect(button).toHaveAttribute('aria-disabled','true');expect(await button.evaluate((el:HTMLButtonElement)=>el.disabled)).toBe(false);expect(await button.evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
    const at=await read(),text=await reading.textContent();
    await page.keyboard.press('Enter');await page.keyboard.press('Space');await button.evaluate((el:HTMLButtonElement)=>el.click());
    const box=await button.boundingBox();await page.mouse.click(box!.x+box!.width/2,box!.y+box!.height/2);
    const style=await button.evaluate(el=>{const s=getComputedStyle(el);return{border:s.borderTopStyle,background:s.backgroundColor,color:s.color,cursor:s.cursor};});
    expect(style).toEqual({border:'dashed',background:contrast?'rgb(0, 0, 0)':'rgb(255, 255, 255)',color:contrast?'rgb(255, 255, 255)':'rgb(71, 85, 105)',cursor:'not-allowed'});
    expect(await read()).toEqual(at);expect(await reading.textContent()).toBe(text);await expect(button).toBeFocused();
    expect(await live!.evaluate(el=>el===document.querySelector('[data-blueprint-reading]'))).toBe(true);
    await page.keyboard.press('Tab');const next=direction==='down'?'[data-blueprint-reset]':'[data-blueprint-pan="'+({left:'right',right:'up',up:'down'}as any)[direction]+'"]';await expect(page.locator(next)).toBeFocused();
   }
  }
  if(phase!=='baseline'){
   expect(await saved(page)).toEqual(before);await audit(page,'blueprint-'+suffix);
   const records=await axRecord(page,['[data-blueprint-pan="down"]','[data-blueprint-reading]'],'blueprint-'+suffix);
   expect(records[0].node.role?.value).toBe('button');expect(records[0].node.properties?.find(p=>p.name==='disabled')?.value.value).toBe(true);
   expect(records[1].node.properties?.find(p=>p.name==='live')?.value.value).toBe('polite');
   await panel.screenshot({path:resolve(output,'blueprint-'+suffix+'.png')});
  }
 }
});
for(const width of [1280,320])test('Codes workflow and WPS field endpoint keyboard flow '+width+'px',async({page})=>{
 for(const contrast of [false,true]){
  await mount(page,{...retained,view:'codes',insp2_codesTab:'flow'},width,contrast);const suffix=width+'-'+(contrast?'contrast':'default'),before=await saved(page);
  const select=page.locator('#wps3-field'),options=await select.locator('option').evaluateAll(nodes=>nodes.map(el=>(el as HTMLOptionElement).value));
  for(const [direction,start,end]of [['prev',1,0],['next',options.length-2,options.length-1]]as const){
   await select.selectOption(options[start]);const button=page.locator('[data-wps-field-'+direction+']');await activate(page,button);await expect(button).toBeDisabled();await expect(select).toHaveValue(options[end]);await observe(page,'wps-'+suffix+'-'+direction);
   if(phase!=='baseline')await focusVisible(page,select);
  }
  const step=(n:number)=>page.locator('[data-codes-flow-step="'+n+'"]');
  await activate(page,step(2));await activate(page,page.locator('[data-codes-flow-prev]'));await expect(step(1)).toHaveAttribute('aria-pressed','true');await observe(page,'flow-'+suffix+'-first');
  if(phase!=='baseline')await focusVisible(page,step(1));
  await activate(page,step(7));await activate(page,page.locator('[data-codes-flow-next]'));await expect(step(8)).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-codes-flow-next]')).toBeDisabled();await observe(page,'flow-'+suffix+'-last');
  if(phase!=='baseline'){
   await focusVisible(page,step(8));expect(await saved(page)).toEqual({...before,insp2_wpsField:options[options.length-1]});
   const field=page.locator('#wps3-field-reading'),result=page.locator('#codes6-flow-result');
   const fieldNode=await field.elementHandle(),resultNode=await result.elementHandle();
   await expect(field).toHaveAttribute('aria-live','polite');await expect(result).toHaveAttribute('aria-live','polite');
   const fieldBefore=await field.textContent();await select.focus();await select.selectOption(options[0]);await expect(select).toBeFocused();expect(await field.textContent()).not.toBe(fieldBefore);await expect(select).toHaveAccessibleDescription((await field.innerText()).replace(/\s+/g,' ').trim());
   await activate(page,step(3));await activate(page,page.locator('[data-codes-flow-route="retry"]'));await expect(result).toContainText('step 3 → step 1');
   await activate(page,page.locator('[data-codes-flow-next]'));await expect(page.locator('[data-codes-flow-next]')).toBeFocused();await expect(step(1)).toHaveAttribute('aria-pressed','true');await expect(result).toContainText('Last followed connection: step 3 → step 1');
   expect(await fieldNode!.evaluate(el=>el===document.getElementById('wps3-field-reading'))).toBe(true);expect(await resultNode!.evaluate(el=>el===document.getElementById('codes6-flow-result'))).toBe(true);
   const ax=await axRecord(page,['#wps3-field','#wps3-field-reading','#codes6-flow-result'],'codes-'+suffix);expect(ax[0].node.role?.value).toBe('combobox');for(const row of ax.slice(1))expect(row.node.properties?.find(p=>p.name==='live')?.value.value).toBe('polite');
   await audit(page,'codes-'+suffix);
  }
 }
});

