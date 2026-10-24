import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-perspective-refresh');
const harness = new GlHarness({ toolId: 'weldLab', toolFile: 'stem_lab/stem_tool_weldlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], appStyles: true, layout: 'document' });
test.describe.configure({ retries: 0, timeout: 120_000 });
test.use({ video: 'off' });
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: any, width: number, state: object, contrast = false) {
  await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { weldLab: state }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: 'html,body{height:auto;background:#f8fafc}#wrap{width:100%;height:auto;display:block}' });
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
    return { overflow: document.documentElement.scrollWidth - innerWidth, overflowNodes: [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1 && !el.closest('[data-noise-chart-scroll],.overflow-x-auto,.preview-bar')).slice(0, 12).map(el => ({ tag: el.tagName, className: el.getAttribute('class'), right: el.getBoundingClientRect().right })), violations: audit.violations.map((v: any) => ({ id: v.id,
      nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) })) };
  }, selector);
  writeFileSync(resolve(output, name + '.json'), JSON.stringify(result, null, 2));
  expect(result.overflow).toBeLessThanOrEqual(1); expect(result.violations).toEqual([]);
}









const savedWork=async(page:any)=>page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));
const numberAttr=async(node:any,attr:string)=>Number(await node.getAttribute(attr));
const heatState={view:'heatInput',hi_V:22,hi_A:180,hi_TS:12,hi_process:'mig',tech2_hi_th:.25,hi3_progress:50,hi_inquiry:{hypothesis:'Hold heat input and compare.',log:[],explanation:'Keep this text.'}};
const program=[{x:1,y:1,m:'J',w:false},{x:4,y:6,m:'J',w:false},{x:12,y:6,m:'L',w:true},{x:12,y:1,m:'J',w:false},{x:1,y:1,m:'L',w:false}];
const robotState={view:'robotic',rob_sect:'pendant',tech2_rob_prog:program,tech2_rob_sort:{0:'manual'}};
const noiseState={view:'safetyHealth',sh_sect:'noise',sh_mode:'browse',safe2_noise:[{db:100,h:1},{db:85,h:6},{db:75,h:2}],sh_audit:{lev:'yes'},safe2_hoc:{quieter:1}};
async function readableChart(chart:any){const data=await chart.evaluate((svg:SVGSVGElement)=>{const [,,w,h]=svg.getAttribute('viewBox')!.split(/\s+/).map(Number);return{w,h,texts:Array.from(svg.querySelectorAll('text')).map(text=>{const b=text.getBBox();return{x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height,size:parseFloat(getComputedStyle(text).fontSize)*svg.getBoundingClientRect().width/w};})};});for(const t of data.texts){expect(t.size).toBeGreaterThanOrEqual(10);expect(t.x).toBeGreaterThanOrEqual(0);expect(t.y).toBeGreaterThanOrEqual(0);expect(t.right).toBeLessThanOrEqual(data.w);expect(t.bottom).toBeLessThanOrEqual(data.h);}}
for(const width of [1280,390]){
 test('Captured equal-heat exchange preserves the original bead model at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,heatState);const lens=page.locator('[data-hi-exchange]');await expect(lens).toHaveAttribute('data-hi-exchange','empty');await expect(lens.locator('[data-hi-exchange-result]')).toHaveCount(0);const saved=await savedWork(page);await lens.locator('[data-hi-exchange-capture]').click();await expect(lens).toHaveAttribute('data-hi-exchange','captured');const result=lens.locator('[data-hi-exchange-result]');
  for(const preset of ['lower','reference','upper']){await lens.locator('[data-hi-exchange-preset="'+preset+'"]').click();const v=await numberAttr(result,'data-voltage'),a=await numberAttr(result,'data-amperage'),power=await numberAttr(result,'data-power');expect(v*a).toBeCloseTo(power,9);expect(power).toBe(3960);expect(v).toBeGreaterThanOrEqual(10);expect(v).toBeLessThanOrEqual(40);expect(a).toBeGreaterThanOrEqual(50-1e-10);expect(a).toBeLessThanOrEqual(350+1e-10);expect(await numberAttr(result,'data-net')).toBeCloseTo(await numberAttr(result,'data-reference-net'),10);const marker=lens.locator('[data-hi-exchange-marker="candidate"]');expect(await numberAttr(marker,'cx')).toBeCloseTo(72+(v-10)*576/30,8);expect(await numberAttr(marker,'cy')).toBeCloseTo(264-(a-50)*228/300,8);
   const sections=await result.evaluate(el=>Array.from(el.querySelectorAll('[data-hi-exchange-specimen]')).map(card=>{const n=(key:string)=>Number(card.getAttribute('data-'+key));const expected=(window as any).__WeldLabCore.beadGeometry(n('voltage'),n('amperage'),Number(el.getAttribute('data-speed')),el.getAttribute('data-process'),'steel',n('thickness'));const line=card.querySelector('[data-hi-exchange-width-line]')!;return{width:n('width'),penetration:n('penetration'),reinforcement:n('reinforcement'),net:n('net'),scale:n('scale'),lineWidth:Number(line.getAttribute('x2'))-Number(line.getAttribute('x1')),plateHeight:Number(card.querySelector('[data-hi-exchange-plate]')!.getAttribute('height')),thickness:n('thickness'),expected};}));expect(sections).toHaveLength(2);for(const s of sections){expect(s.width).toBeCloseTo(s.expected.width,10);expect(s.penetration).toBeCloseTo(s.expected.penetration,10);expect(s.reinforcement).toBeCloseTo(s.expected.reinf,10);expect(s.net).toBeCloseTo(s.expected.net,10);expect(s.scale).toBe(160);expect(s.lineWidth).toBeCloseTo(160*s.width,8);expect(s.plateHeight).toBeCloseTo(160*s.thickness,8);}}
  await lens.locator('[data-hi-exchange-voltage]').focus();await page.keyboard.press('ArrowLeft');expect(await numberAttr(result,'data-voltage')).toBeLessThan(40);await lens.locator('[data-hi-exchange-preset="upper"]').click();await readableChart(lens.locator('[data-hi-exchange-plot]'));await inspect(page,'equal-heat-'+width,'[data-hi-exchange]');expect(await savedWork(page)).toBe(saved);expect(errors).toEqual([]);
 });
 test('Robot time ledger accounts for sequence and command totals at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,robotState);const ledger=page.locator('[data-rob-time-ledger]');await expect(ledger).toBeVisible();const saved=await savedWork(page),inspector=await page.locator('[data-robot-inspector]').evaluate(el=>el.outerHTML);const total=await numberAttr(ledger,'data-total'),arc=await numberAttr(ledger,'data-arc');expect(total).toBeGreaterThan(0);expect(arc).toBeCloseTo(40/6,10);const records=await ledger.locator('[data-rob-time-segment]').evaluateAll(nodes=>nodes.map(el=>{const n=(key:string)=>Number(el.getAttribute('data-'+key)),bar=el.querySelector('[data-rob-time-span]')!;return{index:n('rob-time-segment'),start:n('start'),end:n('end'),seconds:n('seconds'),mm:n('mm'),speed:n('speed'),command:el.getAttribute('data-command'),x:Number(bar.getAttribute('x')),width:Number(bar.getAttribute('width'))};}));expect(records).toHaveLength(program.length);let prefix=0;for(const row of records){expect(row.start).toBeCloseTo(prefix,10);expect(row.seconds).toBeCloseTo(row.mm/row.speed,10);expect(row.x).toBeCloseTo(80+520*row.start/total,8);expect(row.width).toBeCloseTo(520*row.seconds/total,8);prefix+=row.seconds;expect(row.end).toBeCloseTo(prefix,10);}expect(prefix).toBeCloseTo(total,10);expect(records[0].width).toBe(0);await expect(ledger.locator('[data-rob-time-zero="0"]')).toHaveCount(1);
  for(let i=0;i<records.length;i++){await ledger.locator('[data-rob-time-select]').selectOption(String(i));await expect(ledger.locator('[data-rob-time-reading]')).toHaveAttribute('data-rob-time-reading',String(i));expect(await numberAttr(ledger.locator('[data-rob-time-reading]'),'data-seconds')).toBeCloseTo(records[i].seconds,10);}await inspect(page,'robot-time-sequence-'+width,'[data-rob-time-ledger]');await ledger.locator('[data-rob-time-view="commands"]').click();let grouped=0;for(const id of ['on','offJoint','offLinear']){const group=ledger.locator('[data-rob-time-group="'+id+'"]'),seconds=records.filter(r=>r.command===id).reduce((sum,r)=>sum+r.seconds,0);expect(await numberAttr(group,'data-seconds')).toBeCloseTo(seconds,10);expect(await numberAttr(group,'width')).toBeCloseTo(520*seconds/total,8);grouped+=seconds;}expect(grouped).toBeCloseTo(total,10);await inspect(page,'robot-time-commands-'+width,'[data-rob-time-ledger]');expect(await page.locator('[data-robot-inspector]').evaluate(el=>el.outerHTML)).toBe(inspector);expect(await savedWork(page)).toBe(saved);expect(errors).toEqual([]);
 });
 test('Noise exchange steps retain the existing reference-duration model at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,noiseState);const lens=page.locator('[data-noise-exchange]');await expect(lens).toBeVisible();const saved=await savedWork(page),journey=await page.locator('[data-noise-journey]').evaluate(el=>el.outerHTML);const curves=await lens.locator('[data-noise-exchange-curve]').evaluateAll(nodes=>nodes.map(el=>el.getAttribute('points')));
  for(const step of [0,1,2,3,4]){await lens.locator('[data-noise-exchange-preset="'+step+'"]').click();await expect(lens).toHaveAttribute('data-step',String(step));for(const[id,criterion,exchange]of[['osha',90,5],['niosh',85,3]]as const){const level=criterion+step*exchange,T=8/2**step,reading=lens.locator('[data-noise-exchange-reading="'+id+'"]');expect(await numberAttr(reading,'data-level')).toBe(level);expect(await numberAttr(reading,'data-hours')).toBe(T);const fromCore=await page.evaluate(({id,level})=>(window as any).__WeldLabCore.safe2NoiseDose([{db:level,h:1}],id).parts[0].T,{id,level});expect(fromCore).toBe(T);const marker=lens.locator('[data-noise-exchange-marker="'+id+'"]');expect(await numberAttr(marker,id==='osha'?'cx':'data-center-x')).toBeCloseTo(92+(level-85)*560/25,8);expect(await numberAttr(marker,id==='osha'?'cy':'data-center-y')).toBeCloseTo(284-T*240/8,8);expect(await numberAttr(lens.locator('[data-noise-exchange-timebar="'+id+'"]'),'width')).toBe(64*T);}}expect(await lens.locator('[data-noise-exchange-curve]').evaluateAll(nodes=>nodes.map(el=>el.getAttribute('points')))).toEqual(curves);
  await lens.locator('[data-noise-exchange-step]').focus();await page.keyboard.press('ArrowLeft');await expect(lens).toHaveAttribute('data-step','3');await lens.locator('[data-noise-exchange-preset="1"]').click();await readableChart(lens.locator('[data-noise-exchange-plot]'));await inspect(page,'noise-exchange-'+width,'[data-noise-exchange]');expect(await page.locator('[data-noise-journey]').evaluate(el=>el.outerHTML)).toBe(journey);expect(await savedWork(page)).toBe(saved);expect(errors).toEqual([]);
 });
}
test('New perspective tools remain readable in high contrast',async({page})=>{
 for(const[name,state,selector]of[['equal-heat',heatState,'[data-hi-exchange]'],['robot-time',robotState,'[data-rob-time-ledger]'],['noise-exchange',noiseState,'[data-noise-exchange]']]as const){await mount(page,390,state,true);if(name==='equal-heat'){await page.locator('[data-hi-exchange-capture]').click();await page.locator('[data-hi-exchange-preset="upper"]').click();}if(name==='robot-time')await page.locator('[data-rob-time-select]').selectOption('4');if(name==='noise-exchange')await page.locator('[data-noise-exchange-preset="1"]').click();await inspect(page,name+'-contrast',selector);if(name==='robot-time'){await page.locator('[data-rob-time-view="commands"]').click();await inspect(page,'robot-time-commands-contrast',selector);}}
});
test('Local review page opens the three new perspective tools',async({page})=>{
 const url=process.env.WELDLAB_PREVIEW_URL;test.skip(!url,'The local review page is opt-in.');await page.setViewportSize({width:390,height:900});await page.goto(url!);await page.waitForFunction(()=>Boolean((document.getElementById('preview-app-css') as HTMLLinkElement)?.sheet));await expect(page.locator('[data-hi-exchange]')).toBeVisible();await page.locator('[data-hi-exchange-capture]').click();await expect(page.locator('[data-hi-exchange-result]')).toBeVisible();await page.getByRole('button',{name:'Robot time ledger',exact:true}).click();await expect(page.locator('[data-rob-time-ledger]')).toBeVisible();await page.getByRole('button',{name:'Noise exchange',exact:true}).click();await expect(page.locator('[data-noise-exchange]')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
