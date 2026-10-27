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


const luminance=(c:number[])=>c.map(v=>v/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
const ratio=(a:number[],b:number[])=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
const records:any[]=[];
// Use the midpoint of the first painted dash on each shoulder. The exact
// authored core color is compared with rendered ground while hiding only it.
async function measure(page:Page,plot:Locator,core:Locator,name:string){
 await plot.scrollIntoViewIfNeeded();const data=await core.evaluate((el:SVGPathElement)=>{
  const svg=el.closest('svg')!,box=svg.getBoundingClientRect(),m=svg.getScreenCTM()!,d=el.getAttribute('d')!,s=getComputedStyle(el),parts=d.match(/M[^M]+/g)!;
  return{d,stroke:s.stroke,width:s.strokeWidth,style:el.getAttribute('style'),box:{width:box.width,height:box.height},points:parts.map(part=>{const n=part.match(/-?[\d.]+(?:e[-+]?\d+)?/gi)!.map(Number),a=n[0],b=n[2],y=n[1],length=Math.abs(b-a),x=a+Math.sign(b-a)*Math.min(2,length/2),p=new DOMPoint(x,y).matrixTransform(m);return{x:p.x-box.x,y:p.y-box.y,length,svgX:x,svgY:y};})};
 });
 await plot.screenshot({path:resolve(output,phase+'-'+name+'-visible.png')});
 await core.evaluate((el:SVGElement)=>{el.style.setProperty('opacity','0','important');el.style.setProperty('transition','none','important');});await page.evaluate(()=>new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done()))));let buffer:Buffer;
 try{buffer=await plot.screenshot({path:resolve(output,phase+'-'+name+'-ground.png')});}finally{await core.evaluate((el,style)=>{if(style===null)el.removeAttribute('style');else el.setAttribute('style',style);},data.style);}
 const png=PNG.sync.read(buffer!),fg=data.stroke.match(/[\d.]+/g)!.slice(0,3).map(Number),samples=data.points.map(p=>{const x=Math.floor(p.x*png.width/data.box.width),y=Math.floor(p.y*png.height/data.box.height),i=(y*png.width+x)*4,bg=[png.data[i],png.data[i+1],png.data[i+2]];return{...p,ground:bg,ratio:ratio(fg,bg)};});
 const row={name,...data,samples,minimum:Math.min(...samples.map(s=>s.ratio))},file=resolve(output,phase+'-shoulder-contrast.json'),prior=existsSync(file)?JSON.parse(readFileSync(file,'utf8')).filter((r:any)=>r.name!==name):[];prior.push(row);writeFileSync(file,JSON.stringify(prior,null,2));if(phase!=='baseline')expect(row.minimum,JSON.stringify(row)).toBeGreaterThanOrEqual(3);
}
test('Unfused shoulders remain distinguishable in Bead Lab sections',async({page})=>{
 for(const width of [1280,320])for(const contrast of [false,true]){
  const name=width+'-'+(contrast?'contrast':'default');await mount(page,{view:'beadLab',bl_view:'topdown',arc_handsOn:true,arc_run:[6,12,24,40],arc_runHand:true,bl_V:22,bl_A:180,bl_TS:12,bl_process:'mig',bl_material:'steel',bl_thickness:.5,car2_reflect:'Keep my notes.'},width,contrast);
  await page.locator('[data-arc-intervals] > summary').click();const select=page.locator('[data-arc-interval-select]'),plot=page.locator('[data-arc-interval-section]'),before=await saved(page);let measured=0;
  for(const index of [0,2,3]){await select.focus();await select.selectOption(String(index));await expect(select).toBeFocused();const core=plot.locator('[data-arc-interval-unfused]');if(await core.count()){await measure(page,plot,core,'interval-'+name+'-'+index);measured++;}}
  expect(measured).toBeGreaterThan(0);expect(await saved(page)).toEqual(before);if(phase!=='baseline')await audit(page,'interval-'+name);
 }
});
test('Pinned comparison shows the same unfused shoulder convention',async({page})=>{
 for(const width of [1280,320])for(const contrast of [false,true]){
  const name=width+'-'+(contrast?'contrast':'default');await mount(page,{view:'beadLab',bl_view:'topdown',arc_handsOn:false,bl_V:22,bl_A:80,bl_TS:3,bl_process:'mig',bl_material:'steel',bl_thickness:.5,arc_pin:{V:22,A:180,TS:40,P:'mig',M:'steel',TH:.5,run:[]}},width,contrast);
  const before=await saved(page);
  for(const which of ['pinned','current']){
   const plot=page.locator('[data-arc-compare-specimen="'+which+'"] svg'),core=plot.locator(phase==='baseline'?'path[stroke="#f87171"][stroke-width="3"][stroke-dasharray="4 3"]':'[data-arc-compare-unfused]');
   await expect(core).toHaveCount(1);await measure(page,plot,core,'comparison-'+which+'-'+name);
  }
  expect(await saved(page)).toEqual(before);if(phase!=='baseline')await audit(page,'comparison-'+name);
 }
});
