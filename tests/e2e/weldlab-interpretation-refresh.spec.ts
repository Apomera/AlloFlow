import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-interpretation-refresh');
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










async function setRange(input:any,value:number){await input.evaluate((element:HTMLInputElement,value:number)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(element,String(value));element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));},value);}
const savedWork = (page:any)=>page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));
const n = async(node:any,attr:string)=>Number(await node.getAttribute(attr));

const utState={view:'inspection',insp_sect:'ndt',insp2_ndtMode:'choose',insp2_ndtDemo:'ut',insp2_ndtMat:'cs',insp2_utDepth:.5};
const consState={view:'consumables',cons_sect:'decoder',cons_mode:'browse',tech2_cons_code:'E7018'};
const storyState={view:'careerStories',cs_mode:'compare',car2_cmp:[0,1],car2_reflect:'Keep my reflection.',cs_milestones:{sarah:1}};
async function readable(svg:any){const data=await svg.evaluate((svg:SVGSVGElement)=>{const box=svg.getAttribute('viewBox')!.split(/\s+/).map(Number);return{box,text:[...svg.querySelectorAll('text')].map(t=>{const b=t.getBBox();return{x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height,size:parseFloat(getComputedStyle(t).fontSize)*svg.getBoundingClientRect().width/box[2]};})};});for(const t of data.text){expect(t.size).toBeGreaterThanOrEqual(10);expect(t.x).toBeGreaterThanOrEqual(data.box[0]);expect(t.y).toBeGreaterThanOrEqual(data.box[1]);expect(t.right).toBeLessThanOrEqual(data.box[0]+data.box[2]);expect(t.bottom).toBeLessThanOrEqual(data.box[1]+data.box[3]);}}
for(const width of [1280,390]){
 test('UT journey uses a fixed absolute time scale at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,utState);const flight=page.locator('[data-ut-flight]'),svg=page.locator('[data-ut-flight-diagram]');
  for(const[id,label,v]of[['cs','Carbon steel',5.92],['ss304','304 stainless',5.74],['al','Aluminum',6.32]]as const){await page.getByRole('radiogroup',{name:'Material',exact:true}).getByRole('radio').filter({hasText:label}).click();const saved=await savedWork(page),tf=2*.5*25.4/v,tb=2*25.4/v;for(const percent of [0,25,50,75,100]){await setRange(flight.locator('[data-ut-flight-progress]'),percent);const f=percent/100,pos=2*.5*(f<=.5?f:1-f);expect(await n(flight,'data-time')).toBeCloseTo(tf*f,10);expect(await n(flight,'data-position')).toBeCloseTo(pos,10);expect(await n(flight,'data-path')).toBeCloseTo(f,10);expect(await n(svg.locator('[data-ut-flight-cursor]'),'x1')).toBeCloseTo(28+22*tf*f,8);expect(await n(svg.locator('[data-ut-flight-marker]'),'cy')).toBeCloseTo(30+80*pos,8);expect(await n(svg.locator('[data-ut-flight-echo="flaw"]'),'x')).toBeCloseTo(28+22*tf,8);expect(await n(svg.locator('[data-ut-flight-echo="backwall"]'),'x')).toBeCloseTo(28+22*tb,8);await expect(svg.locator('[data-ut-flight-fixed-axis]')).toHaveAttribute('data-max','12');}expect(await savedWork(page)).toBe(saved);}
  await flight.locator('[data-ut-flight-preset="50"]').click();await flight.locator('[data-ut-flight-progress]').focus();await page.keyboard.press('ArrowRight');await expect(flight).toHaveAttribute('data-progress','51');const box=await svg.boundingBox();await svg.click({position:{x:box!.width/2,y:box!.height*90/220}});await expect(flight).toHaveAttribute('data-depth','0.75');await flight.locator('[data-ut-flight-preset="50"]').click();await readable(svg);await inspect(page,'ut-flight-'+width,'[data-ut-flight-workspace]');expect(errors).toEqual([]);
 });
 test('Pinned classifications align semantic fields without fabricating strength at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,consState);const input=page.locator('#tech2-dec-input'),pin=page.locator('[data-cons-code-pin]');let saved=await savedWork(page);await pin.click();expect(await savedWork(page)).toBe(saved);await expect(page.locator('[data-cons-code-identical]')).toBeVisible();await input.fill('E71T-1');let row=page.locator('[data-cons-code-row="tensile"]');await expect(row.locator('[data-cons-code-cell="current"] [data-cons-code-token]')).toHaveText('7');await expect(row.locator('[data-cons-code-cell="pinned"] [data-cons-code-token]')).toHaveText('70');for(const side of ['current','pinned'])expect(await n(row.locator('[data-cons-code-cell="'+side+'"] [data-cons-code-token]'),'data-value')).toBe(70);
  await expect(page.locator('[data-cons-code-compare]')).toHaveAttribute('data-default-role','tensile');await expect(page.locator('[data-cons-code-row][open]')).toHaveCount(1);await expect(row).toHaveAttribute('open','');await expect(row.locator('[data-cons-code-summary-token="current"]')).toHaveText('7');await expect(row.locator('[data-cons-code-summary-token="pinned"]')).toHaveText('70');
  await input.fill('ER4043');await expect(page.locator('[data-cons-code-row="tensile"] [data-cons-code-cell="current"]')).toHaveAttribute('data-present','false');saved=await savedWork(page);await pin.click();expect(await savedWork(page)).toBe(saved);await input.fill('ER308L');await expect(page.locator('[data-cons-code-row="tensile"]')).toHaveCount(0);await expect(page.locator('[data-cons-code-compare]')).toHaveAttribute('data-default-role','alloy_number');await expect(page.locator('[data-cons-code-row][open]')).toHaveCount(1);await expect(page.locator('[data-cons-code-row="alloy_number"]')).toHaveAttribute('open','');await expect(page.locator('[data-cons-code-row="alloy_number"]')).toBeVisible();await expect(page.locator('[data-cons-code-row="alloy_number"]')).toContainText('not a strength');await input.fill('E9999');await expect(pin).toBeDisabled();await expect(page.locator('[data-cons-code-compare]')).toHaveCount(0);await expect(page.locator('#tech2-dec-result')).toContainText('classification');saved=await savedWork(page);await page.locator('[data-cons-code-clear]').click();expect(await savedWork(page)).toBe(saved);await input.fill('E7018');await pin.click();await input.fill('E71T-1');
  row=page.locator('[data-cons-code-row="tensile"]');const summary=row.locator('summary');saved=await savedWork(page);await summary.click();await expect(row).not.toHaveAttribute('open','');await expect(row.locator('[data-cons-code-meaning]').first()).toBeHidden();await summary.focus();await page.keyboard.press('Enter');await expect(row).toHaveAttribute('open','');await expect(row.locator('[data-cons-code-meaning]').first()).toBeVisible();expect(await savedWork(page)).toBe(saved);await inspect(page,'classification-compare-'+width,'div:has(> #tech2-dec-result)');expect(errors).toEqual([]);
 });
 test('One career age cursor links both existing timelines at '+width+'px',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,width,storyState);const controls=page.locator('[data-career-age-controls]'),slider=page.locator('[data-career-age-slider]'),min=await n(controls,'data-min'),max=await n(controls,'data-max');const saved=await savedWork(page);const original=await page.locator('[data-career-timeline]').evaluateAll(nodes=>nodes.map(node=>{const clone=node.cloneNode(true)as Element;clone.querySelectorAll('[data-career-age-marker]').forEach(n=>n.remove());return clone.outerHTML;}));const profiles=await page.evaluate(()=>(window as any).__WeldLabCore.CAR2_PROFILES.slice(0,2));
  for(const age of [min,max,profiles[0].segs[1].from,25]){await setRange(slider,Math.max(min,Math.min(max,age)));const current=await n(controls,'data-age');for(const p of profiles){let index=p.segs.findIndex((s:any)=>current>=s.from&&current<s.to);if(current===p.age)index=p.segs.length-1;const marker=page.locator('[data-career-age-marker="'+p.id+'"]'),reading=page.locator('[data-career-age-reading="'+p.id+'"]');expect(await n(marker.locator('line'),'x1')).toBeCloseTo(54+(current-min)/(max-min)*354,8);expect(await n(reading,'data-stage-index')).toBe(index);if(index<0){await expect(reading.locator('[data-career-age-pay]')).toHaveCount(0);await expect(reading.locator('[data-career-age-outside]')).toBeVisible();}else{const stage=p.segs[index],span=reading.locator('[data-career-age-span]');expect(await n(span,'data-from')).toBe(stage.from);expect(await n(span,'data-to')).toBe(stage.to);await expect(reading.locator('[data-career-age-kind]')).toHaveAttribute('data-career-age-kind',stage.kind);await expect(reading.locator('[data-career-age-pay]')).toContainText('Whole-stage pay context:');}}}
  await setRange(slider,min);await page.locator('[data-career-age-next]').click();expect(await n(controls,'data-age')).toBeGreaterThan(min);await slider.focus();const before=await n(controls,'data-age');await page.keyboard.press('ArrowRight');expect(await n(controls,'data-age')).toBeCloseTo(before+.25,8);await setRange(slider,Math.min(max,Math.max(min,25)));for(const svg of await page.locator('[data-career-timeline]').all())await readable(svg);const after=await page.locator('[data-career-timeline]').evaluateAll(nodes=>nodes.map(node=>{const clone=node.cloneNode(true)as Element;clone.querySelectorAll('[data-career-age-marker]').forEach(n=>n.remove());return clone.outerHTML;}));expect(after).toEqual(original);expect(await savedWork(page)).toBe(saved);await inspect(page,'career-age-'+width,'[data-career-age-comparison]');expect(errors).toEqual([]);
 });
}
test('Existing-view enhancements remain readable in high contrast',async({page})=>{for(const[name,state,selector]of[['ut-flight',utState,'[data-ut-flight-workspace]'],['classification-compare',consState,'div:has(> #tech2-dec-result)'],['career-age',storyState,'[data-career-age-comparison]']]as const){await mount(page,390,state,true);if(name==='ut-flight')await page.locator('[data-ut-flight-preset="50"]').click();if(name==='classification-compare'){await page.locator('[data-cons-code-pin]').click();await page.locator('#tech2-dec-input').fill('E71T-1');}if(name==='career-age')await setRange(page.locator('[data-career-age-slider]'),25);await inspect(page,name+'-contrast',selector);}});
test('Local review shortcuts open all three strengthened views',async({page})=>{const url=process.env.WELDLAB_PREVIEW_URL;test.skip(!url,'Local preview is opt-in.');await page.setViewportSize({width:390,height:900});await page.goto(url!);await page.waitForFunction(()=>Boolean((document.getElementById('preview-app-css')as HTMLLinkElement)?.sheet));await expect(page.locator('[data-ut-flight]')).toBeVisible();await page.getByRole('button',{name:'Classification comparison',exact:true}).click();await page.locator('[data-cons-code-pin]').click();await page.locator('#tech2-dec-input').fill('E71T-1');await expect(page.locator('[data-cons-code-compare]')).toBeVisible();await page.getByRole('button',{name:'Career age cursor',exact:true}).click();await expect(page.locator('[data-career-age-controls]')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);});
