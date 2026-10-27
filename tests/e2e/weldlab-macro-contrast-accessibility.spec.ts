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
const harness = new GlHarness({ toolId: 'weldLab', toolFile: phase==='baseline'?'tmp/weld-wcag-macro/before.js':'stem_lab/stem_tool_weldlab.js', preScripts: ['stem_lab/stem_lab_module.js', 'app_styles_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], appStyles: true, layout: 'document' });
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
const defs=[{id:'reference',settings:{bl_V:22,bl_A:180,bl_TS:12,bl_thickness:.25,arc_pin:{V:22,A:180,TS:6,P:'mig',M:'steel',TH:.25,run:[]}}},{id:'cold',settings:{bl_V:22,bl_A:180,bl_TS:30,bl_thickness:.5}},{id:'hot',settings:{bl_V:40,bl_A:350,bl_TS:3,bl_thickness:.125}}];
async function sample(page:Page,plot:Locator,name:string){
 const specs=[{id:'target',selector:'line[stroke="#fbbf24"][stroke-dasharray="6 4"]'},{id:'ghost',selector:'path[stroke="#38bdf8"][stroke-dasharray="5 4"]'},{id:'unfused',selector:'path[stroke="#f87171"][stroke-dasharray="4 3"]'},{id:'leader',selector:'g > line[stroke="#fde68a"]'}];
 await plot.scrollIntoViewIfNeeded();await plot.screenshot({path:resolve(output,phase+'-'+name+'-visible.png')});
 for(const spec of specs){const elements=plot.locator(spec.selector);
  for(let index=0;index<await elements.count();index++){
   const core=elements.nth(index),data=await core.evaluate((el:SVGGeometryElement,id:string)=>{
    const svg=el.closest('svg')!,box=svg.getBoundingClientRect(),matrix=svg.getScreenCTM()!,len=el.getTotalLength(),style=getComputedStyle(el);let distances:number[]=[];
    if(id==='target')distances=[22,82,182,222,282,382];
    else if(id==='ghost'){const max=Math.floor((len-4)/9);distances=[.08,.3,.55,.78,.95].map(f=>2+9*Math.floor(max*f));}
    else if(id==='leader')distances=[.65,.85].map(f=>len*f).filter(n=>n>10);
    else {const d=el.getAttribute('d')!,parts=d.match(/M[^M]+/g)!;let offset=0;for(const part of parts){const n=part.match(/-?[\d.]+(?:e[-+]?\d+)?/gi)!.map(Number),length=Math.abs(n[2]-n[0]);distances.push(offset+Math.min(2,length/2));offset+=length;}}
    return{stroke:style.stroke,width:style.strokeWidth,style:el.getAttribute('style'),box:{width:box.width,height:box.height},points:distances.map(distance=>{const point=el.getPointAtLength(distance),p=new DOMPoint(point.x,point.y).matrixTransform(matrix);return{distance,svgX:point.x,svgY:point.y,x:p.x-box.x,y:p.y-box.y};})};
   },spec.id);
   await core.evaluate((el:SVGElement)=>{el.style.setProperty('opacity','0','important');el.style.setProperty('transition','none','important');});await page.evaluate(()=>new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done()))));let buffer:Buffer;
   try{buffer=await plot.screenshot({path:resolve(output,phase+'-'+name+'-'+spec.id+'-'+index+'-ground.png')});}finally{await core.evaluate((el,style)=>{if(style===null)el.removeAttribute('style');else el.setAttribute('style',style);},data.style);}
   const png=PNG.sync.read(buffer!),fg=data.stroke.match(/[\d.]+/g)!.slice(0,3).map(Number),samples=data.points.map(p=>{const x=Math.floor(p.x*png.width/data.box.width),y=Math.floor(p.y*png.height/data.box.height),i=(y*png.width+x)*4,bg=[png.data[i],png.data[i+1],png.data[i+2]];return{...p,ground:bg,ratio:ratio(fg,bg),pixelX:(x+.5)*data.box.width/png.width,pixelY:(y+.5)*data.box.height/png.height};});
   // A later annotation intersecting this pixel footprint can mix both colors.
   // Retain the raw ratio as an overlap-sensitive diagnostic. This approximate
   // coverage probe does not establish that the foreground is fully occluded.
   // Every annotation is sampled independently above; short subpaths with no
   // clear sample still need explicit review rather than an automatic pass.
   const intersections=await core.evaluate((el:SVGGeometryElement,points:any[])=>{
    const svg=el.closest('svg')!,box=svg.getBoundingClientRect();
    const candidates=[...svg.querySelectorAll('line[stroke="#fbbf24"],path[stroke="#38bdf8"],path[stroke="#f87171"][stroke-width="3"],line[stroke="#fde68a"],[data-arc-xs-target-outline],[data-arc-xs-ghost-outline],[data-arc-xs-unfused-outline],[data-arc-xs-leader-outline],g > circle[fill="#fde68a"]')].filter(other=>other!==el&&Boolean(el.compareDocumentPosition(other)&Node.DOCUMENT_POSITION_FOLLOWING));
    return points.map(p=>candidates.filter(other=>{
     const geometry=other as SVGGeometryElement,inverse=geometry.getScreenCTM()!.inverse();
     return [-.45,0,.45].some(dx=>[-.45,0,.45].some(dy=>{const at=new DOMPoint(box.x+p.pixelX+dx,box.y+p.pixelY+dy).matrixTransform(inverse);return geometry.isPointInStroke(at)||(other.tagName.toLowerCase()==='circle'&&geometry.isPointInFill(at));}));
    }).map(other=>({tag:other.tagName,stroke:other.getAttribute('stroke'),hook:[...other.attributes].filter(a=>a.name.startsWith('data-arc-xs-')).map(a=>[a.name,a.value]),badge:other.tagName.toLowerCase()==='circle'?other.nextElementSibling?.textContent:null})));
   },samples);
   const labeled=samples.map((p,i)=>({...p,coveredBy:intersections[i],unobscured:intersections[i].length===0})),clear=labeled.filter(p=>p.unobscured);
   expect(clear.length,'At least one unobscured sample for '+name+' '+spec.id+' '+index).toBeGreaterThan(0);
   const row={name,id:spec.id,index,...data,samples:labeled,rawMinimum:Math.min(...samples.map(s=>s.ratio)),minimum:Math.min(...clear.map(s=>s.ratio))},file=resolve(output,phase+'-macro-contrast.json'),rows=existsSync(file)?JSON.parse(readFileSync(file,'utf8')).filter((r:any)=>!(r.name===name&&r.id===spec.id&&r.index===index)):[];rows.push(row);writeFileSync(file,JSON.stringify(rows,null,2));
   if(phase!=='baseline')expect(row.minimum,JSON.stringify(row)).toBeGreaterThanOrEqual(3);
  }
 }
}
for(const width of [1280,320])test('Macro-etch guide contrast at '+width+'px',async({page})=>{
 for(const contrast of [false,true])for(const preset of defs){
  const name=preset.id+'-'+width+'-'+(contrast?'contrast':'default');await mount(page,{view:'beadLab',bl_view:'topdown',arc_handsOn:false,bl_process:'mig',bl_material:'steel',car2_reflect:'Keep my notes.',...preset.settings},width,contrast);const before=await saved(page),plot=page.locator('[data-arc-xs]');await sample(page,plot,name);expect(await saved(page)).toEqual(before);if(phase!=='baseline')await audit(page,'macro-'+name);
 }
});
