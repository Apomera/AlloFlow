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

const rgb=(s:string)=>s.match(/[\d.]+/g)!.slice(0,3).map(Number);
const luminance=(c:number[])=>c.map(v=>v/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
const ratio=(a:number[],b:number[])=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
async function setRange(input:Locator,value:number){await input.evaluate((el:HTMLInputElement,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);}
// Sample ground beneath the core, including the near-endpoint camera-ray merge.
// Final ground includes the new dark edge. Palette checks supplement these
// rendered samples; neither establishes spoken AT behavior or full conformance.
async function measure(page:Page,plot:Locator,name:string){
 await plot.scrollIntoViewIfNeeded();const line=plot.locator(phase==='baseline'?'[data-robot-sensing-laser] > line':'[data-robot-sensing-projection]');
 const data=await line.evaluate((el:SVGLineElement)=>{
  const svg=el.closest('svg')!,box=svg.getBoundingClientRect(),m=svg.getScreenCTM()!,x=Number(el.getAttribute('x1')),s=getComputedStyle(el);
  return{stroke:s.stroke,width:s.strokeWidth,style:el.getAttribute('style'),box:{width:box.width,height:box.height},groups:[{surface:'upper',ys:[190,205]},{surface:'lower',ys:[228,232,248,251]}].map(g=>({...g,points:g.ys.map(y=>{const p=new DOMPoint(x,y).matrixTransform(m);return{x:p.x-box.x,y:p.y-box.y};})}))};
 });
 await plot.screenshot({path:resolve(output,phase+'-'+name+'-visible.png')});
 await line.evaluate((el:SVGElement)=>{el.style.setProperty('transition','none','important');el.style.setProperty('opacity','0','important');});
 await page.evaluate(()=>new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done()))));let buffer:Buffer;
 try{buffer=await plot.screenshot({path:resolve(output,phase+'-'+name+'-ground.png')});}finally{await line.evaluate((el,style)=>{if(style===null)el.removeAttribute('style');else el.setAttribute('style',style);},data.style);}
 const png=PNG.sync.read(buffer!),rows=data.groups.map(g=>{
  const values=g.points.map(p=>{const x=Math.floor(p.x*png.width/data.box.width),y=Math.floor(p.y*png.height/data.box.height),i=(y*png.width+x)*4,bg=[png.data[i],png.data[i+1],png.data[i+2]];return{background:bg,ratio:ratio(rgb(data.stroke),bg)};});
  return{name,surface:g.surface,stroke:data.stroke,width:data.width,ys:g.ys,values,minimum:Math.min(...values.map(v=>v.ratio))};
 });
 results.push(...rows);writeFileSync(resolve(output,phase+'-sensing-contrast.json'),JSON.stringify(results,null,2));
 if(phase!=='baseline')for(const row of rows)expect(row.minimum,JSON.stringify(row)).toBeGreaterThanOrEqual(3);
}
test('Laser projection remains distinguishable on both plate surfaces',async({page})=>{
 for(const width of [1280,320])for(const contrast of [false,true]){
  const suffix=width+'-'+(contrast?'contrast':'default');await mount(page,{view:'robotic',rob_sect:'vision',car2_reflect:'Keep my work.'},width,contrast);
  const before=await saved(page),slider=page.locator('#rob5-position'),plot=page.locator('[data-robot-sensing-diagram="laser"]');
  for(const position of [0,50,100]){
   await slider.focus();await setRange(slider,position);await expect(slider).toBeFocused();await expect(plot.locator('[data-robot-sensing-laser]')).toHaveAttribute('data-observation-x',String(165+3.8*position));
   await measure(page,plot,'laser-'+suffix+'-'+position);
  }
  expect(await saved(page)).toEqual(before);if(phase!=='baseline')await audit(page,'laser-'+suffix);
 }
});

