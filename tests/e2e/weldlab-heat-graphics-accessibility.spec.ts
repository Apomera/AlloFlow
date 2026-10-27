import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
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

const rgb=(s:string)=>s.match(/[\d.]+/g)!.slice(0,3).map(Number);
const lum=(c:number[])=>c.map(v=>v/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
const ratio=(a:number[],b:number[])=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
const states=[
 {name:'thin-through',tech2_hi_th:.125,hi_V:40,hi_A:350,hi_TS:3},
 {name:'three-sixteenths',tech2_hi_th:.1875,hi_V:22,hi_A:180,hi_TS:12},
 {name:'quarter',tech2_hi_th:.25,hi_V:22,hi_A:180,hi_TS:12},
 {name:'thick-shallow',tech2_hi_th:.375,hi_V:10,hi_A:50,hi_TS:30}
];
// Use canonical computed stroke colors against sampled rendered ground, as
// required by WCAG 1.4.11. Screenshots also retain actual line antialiasing.
async function measure(page:Page,plot:Locator,name:string){
 await plot.scrollIntoViewIfNeeded();
 const data=await plot.evaluate((svg:SVGSVGElement)=>{
  const lines=[...svg.querySelectorAll('line')],box=svg.getBoundingClientRect(),matrix=svg.getScreenCTM()!;
  const n=(line:Element,k:string)=>Number(line.getAttribute(k));
  const current=Boolean(svg.querySelector('[data-hi-width-guide]'));
  const th=Number(svg.querySelectorAll('rect')[1].getAttribute('height'));
  const segments:any[]=[];
  for(const [index,edge]of ['start','end'].entries())for(const ground of ['plate','canvas']){
   const line=current?svg.querySelector('[data-hi-width-guide="'+edge+'"] [data-hi-guide-ground="'+ground+'"]')!:lines[index+1];
   const from=ground==='plate'?50:50+th,to=ground==='plate'?50+th:50+th+14;
   const points=[];
   for(let y=from+1;y<to-1;y+=1){if((y-50)%4!==1||Math.abs(y-(50+th+10))<1.5)continue;const p=new DOMPoint(n(line,'x1'),y).matrixTransform(matrix);points.push({x:p.x-box.x,y:p.y-box.y});}
   segments.push({label:edge+'-'+ground,stroke:getComputedStyle(line).stroke,width:getComputedStyle(line).strokeWidth,points});
  }
  const depth=current?svg.querySelector('[data-hi-penetration-dimension]')!:lines[4];
  const y1=n(depth,'y1'),y2=n(depth,'y2');
  segments.push({label:'penetration',stroke:getComputedStyle(depth).stroke,width:getComputedStyle(depth).strokeWidth,points:[.3,.5,.7].map(f=>{const p=new DOMPoint(n(depth,'x1'),y1+(y2-y1)*f).matrixTransform(matrix);return{x:p.x-box.x,y:p.y-box.y};})});
  return{segments,width:box.width,height:box.height};
 });
 await plot.screenshot({path:resolve(output,phase+'-'+name+'-visible.png')});
 const styles=await plot.locator('line').evaluateAll(nodes=>nodes.map(el=>el.getAttribute('style')));
 await plot.locator('line').evaluateAll(nodes=>nodes.forEach(el=>{const s=(el as SVGElement).style;s.setProperty('transition','none','important');s.setProperty('opacity','0','important');}));
 await page.evaluate(()=>new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done()))));
 let buffer:Buffer;
 try{buffer=await plot.screenshot({path:resolve(output,phase+'-'+name+'-ground.png')});}
 finally{await plot.locator('line').evaluateAll((nodes,styles)=>nodes.forEach((el,i)=>{if(styles[i]===null)el.removeAttribute('style');else el.setAttribute('style',styles[i]!);}),styles);}
 const png=PNG.sync.read(buffer!),rows=data.segments.map(segment=>{
  const readings=segment.points.map((point:any)=>{const x=Math.floor(point.x*png.width/data.width),y=Math.floor(point.y*png.height/data.height),i=(y*png.width+x)*4;const bg=[png.data[i],png.data[i+1],png.data[i+2]];return{bg,ratio:ratio(rgb(segment.stroke),bg)};});
  return{name,segment:segment.label,stroke:segment.stroke,width:segment.width,samples:readings.length,minimum:Math.min(...readings.map((r:any)=>r.ratio)),grounds:[...new Set(readings.map((r:any)=>r.bg.join(',')))]};
 });
 results.push(...rows);writeFileSync(resolve(output,phase+'-graphics-contrast.json'),JSON.stringify(results,null,2));
 for(const row of rows){expect(row.samples).toBeGreaterThan(0);if(phase!=='baseline')expect(row.minimum,JSON.stringify(row)).toBeGreaterThanOrEqual(3);}
}
test('Meaningful heat dimensions retain contrast on every plate thickness',async({page})=>{
 for(const width of [1280,320])for(const contrast of [false,true])for(const state of states){
  await mount(page,{view:'heatInput',hi_process:'mig',...state},width,contrast);
  const name='graphics-'+state.name+'-'+width+'-'+(contrast?'contrast':'default');
  await measure(page,page.locator('svg[aria-label^="Bead cross-section on"]'),name);
  if(phase!=='baseline'&&['thin-through','three-sixteenths'].includes(state.name))await audit(page,name);
 }
});

