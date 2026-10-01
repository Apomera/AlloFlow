import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = 'reports/sky-lab-stellar-comparison-2026-09-30';
const HARNESS = readFileSync('tests/e2e/astronomy-observatory-3d.spec.ts', 'utf8').split('const HARNESS = `')[1].split('`;')[0]
  .replace("gradeLevel: '8th Grade',", "gradeLevel: '8th Grade', isContrast: window.__contrast === true, theme: window.__contrast ? 'contrast' : 'dark',");
let server: Server, base: string;
test.use({ video: 'off', hasTouch: true, viewport: { width: 1280, height: 980 }, reducedMotion: 'reduce', launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
test.describe.configure({ timeout: 120000 });
test.beforeAll(async () => {
  mkdirSync(OUT, { recursive: true });
  server = createServer(async (req, res) => {
    if (req.url === '/__simulators') { res.setHeader('content-type', 'text/html'); res.end(HARNESS); return; }
    const file = resolve(ROOT, '.' + decodeURIComponent((req.url || '/').split('?')[0]));
    if (!file.startsWith(ROOT + sep)) { res.writeHead(403); res.end(); return; }
    try {
      res.setHeader('content-type', ({ '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' })[extname(file)] || 'text/plain');
      res.end(await readFile(file));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
test.afterAll(async () => { await new Promise<void>(done => server.close(() => done())); });
test.afterEach(async ({ page }) => {
  try {
    const events = await page.evaluate(() => (window as any).__events);
    expect(events).toEqual({ errors: [], rejections: [] });
  } finally {
    await page.evaluate(() => (window as any).__destroy?.()).catch(() => {});
  }
});
async function mount(page, state, contrast = false) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/__simulators');
  await page.evaluate(({ state, contrast }) => { (window as any).__contrast = contrast; (window as any).__mount(state); }, { state, contrast });
  return errors;
}






const state=page=>page.evaluate(()=>(window as any).__toolData.astronomy.hrHunt);
const disks=page=>page.locator('#astronomy-hr-size').evaluate(svg=>{
 const sun=Number(svg.querySelector('[data-hr-disk="sun"]')!.getAttribute('r'));
 const star=Number(svg.querySelector('[data-hr-disk="star"]')!.getAttribute('r'));
 return {sun,star,ratio:star/sun};
});
test('published inputs link exact controls, plot, radius and luminosity explanation while keeping notes',async({page})=>{
 const errors=await mount(page,{tab:'hrDiagram',hrHunt:{hypothesis:'Compare small hot stars',log:[{m:1,t:5772,l:1,c:'sunLike'}]}});
 await page.getByRole('button',{name:'Sirius B',exact:true}).click();
 await expect(page.locator('#hr-mass')).toHaveValue('1.018');
 await expect(page.locator('#hr-tempK')).toHaveValue('25369');
 await expect(page.locator('[data-hr-marker]')).toHaveAttribute('data-luminosity','0.02448');
 await expect(page.locator('#astronomy-hr-reference-status')).toHaveAttribute('data-reference','siriusB');
 await expect(page.locator('#astronomy-hr-classification')).toContainText('White-dwarf region');
 await expect(page.getByRole('textbox',{name:'H-R diagram hypothesis'})).toHaveValue('Compare small hot stars');
 await expect(page.getByRole('table',{name:'Logged H-R diagram observations'}).locator('tbody tr')).toHaveCount(1);
 const values=await page.locator('[data-hr-metric]').evaluateAll(nodes=>nodes.map(n=>Number(n.getAttribute('data-value'))));
 expect(values[0]*values[1]).toBeCloseTo(.02448,12);
 await page.getByText('Sources, uncertainties and model',{exact:true}).click();
 await expect(page.locator('#astronomy-hr-references')).toContainText('25,369 ± 46 K');
 await expect(page.getByRole('link',{name:'Sirius study · Bond et al., 2017'})).toHaveAttribute('href','https://arxiv.org/abs/1703.10625');
 await page.getByText('Sources, uncertainties and model',{exact:true}).click();
 await page.getByRole('button',{name:'True scale',exact:true}).click();
 expect((await disks(page)).ratio).toBeCloseTo(.008098,5);
 await page.locator('#astronomy-hr-explorer').screenshot({path:OUT+'/sirius-white-dwarf-desktop.png'});
 await page.locator('#hr-mass').fill('1.02');
 await expect(page.locator('#astronomy-hr-reference-status')).toHaveAttribute('data-reference','custom');
 expect((await state(page)).tempK).toBe(25369);
 expect((await disks(page)).ratio).toBeCloseTo(.008098,5);
 await page.getByRole('button',{name:'Sirius A',exact:true}).click();
 await expect(page.locator('#hr-mass')).toHaveValue('2.063');
 await expect(page.locator('#astronomy-hr-reference-status')).toContainText('Published inputs: Sirius A');
 expect(errors).toEqual([]);
});
test('true scale stays proportional at both extremes and mode changes preserve the investigation',async({page})=>{
 const errors=await mount(page,{tab:'hrDiagram',hrHunt:{tempK:2000,lumin:100000,mass:1,sizeScale:'true',hypothesis:'Big surface',log:[{m:1,t:5772,l:1,c:'sunLike'}]}});
 let d=await disks(page);expect(d.star).toBe(80);expect(d.sun).toBeLessThan(.04);
 await expect(page.locator('#astronomy-hr-size')).toContainText('Tiny disk');
 await page.getByRole('button',{name:'Readable sizes',exact:true}).click();
 d=await disks(page);expect(d.sun).toBe(36);expect(d.star).toBe(72);
 await page.getByRole('button',{name:'True scale',exact:true}).click();
 expect((await disks(page)).star).toBe(80);
 await page.locator('#hr-tempK').fill('50000');await page.locator('#hr-lumin').fill('-3');
 d=await disks(page);expect(d.sun).toBe(80);expect(d.star).toBeLessThan(.04);
 await expect(page.getByRole('textbox',{name:'H-R diagram hypothesis'})).toHaveValue('Big surface');
 await expect(page.getByRole('table',{name:'Logged H-R diagram observations'}).locator('tbody tr')).toHaveCount(1);
 await page.getByRole('button',{name:'Reset investigation',exact:true}).click();
 await expect(page.getByRole('button',{name:'Readable sizes',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('textbox',{name:'H-R diagram hypothesis'})).toHaveValue('');
 expect(errors).toEqual([]);
});
test('phone contrast labels remain readable and contained for the source examples and extreme disks',async({page})=>{
 await page.setViewportSize({width:320,height:850});
 const errors=await mount(page,{tab:'hrDiagram'},true);
 for(const name of ['Sirius A','Sirius B','Cool giant','White dwarf','Sun reference']){
  await page.getByRole('button',{name,exact:true}).click();
  await page.getByRole('button',{name:'True scale',exact:true}).click();
  const bad=await page.locator('#astronomy-hr-size, #astronomy-hr-plot').evaluateAll(svgs=>svgs.flatMap(svg=>{
   const vb=(svg as SVGSVGElement).viewBox.baseVal, factor=svg.getBoundingClientRect().width/vb.width;
   return Array.from(svg.querySelectorAll('text')).flatMap(t=>{
    const b=(t as SVGTextElement).getBBox(),font=parseFloat(getComputedStyle(t).fontSize)*factor;
    return b.x < -1 || b.y < -1 || b.x+b.width > vb.width+1 || b.y+b.height > vb.height+1 || font<11 ? [{text:t.textContent,b:{x:b.x,y:b.y,w:b.width,h:b.height},font}]:[];
   });
  }));
  expect(bad,name).toEqual([]);
  const axisGap=await page.locator('#astronomy-hr-plot').evaluate(svg=>{
   const labels=Array.from(svg.querySelectorAll('text'));
   const axis=labels.find(t=>t.textContent!.includes('kelvin'))! as SVGTextElement;
   const ticks=labels.filter(t=>['50,000','10,000','5,000','2,000'].includes(t.textContent!) && t.getBoundingClientRect().width > 0);
   return Math.min(...ticks.map(t=>axis.getBBox().y-((t as SVGTextElement).getBBox().y+(t as SVGTextElement).getBBox().height)));
  });expect(axisGap).toBeGreaterThan(3);
  const tickSpacing=await page.locator('#astronomy-hr-plot').evaluate(svg=>{
   const ticks=Array.from(svg.querySelectorAll('text')).filter(t=>['50,000','10,000','5,000','2,000'].includes(t.textContent!) && t.getBoundingClientRect().width > 0)
     .map(t=>(t as SVGTextElement).getBBox()).filter(b=>b.width>0).sort((a,b)=>a.x-b.x);
   return {visible:ticks.length,gap:Math.min(...ticks.slice(1).map((b,i)=>b.x-ticks[i].x-ticks[i].width))};
  });
  expect(tickSpacing.visible).toBeGreaterThanOrEqual(3);expect(tickSpacing.gap).toBeGreaterThan(3);
  const circles=await page.locator('#astronomy-hr-size [data-hr-disk]').evaluateAll(nodes=>nodes.map(n=>{
   const x=Number(n.getAttribute('cx')),y=Number(n.getAttribute('cy')),r=Number(n.getAttribute('r'));
   return x-r>=0&&x+r<=360&&y-r>=0&&y+r<=230;
  }));expect(circles).toEqual([true,true]);
 }
 await page.getByRole('button',{name:'Sirius B',exact:true}).click();
 await page.locator('#astronomy-hr-explorer').screenshot({path:OUT+'/sirius-white-dwarf-phone-contrast.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const targets=await page.locator('#astronomy-hr-explorer button, #astronomy-hr-explorer summary').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));
 expect(targets.every(height=>height>=44)).toBe(true);
 expect(errors).toEqual([]);
});
test('saved scale choices survive restore and malformed choices recover without losing notes',async({page})=>{
 let errors=await mount(page,{tab:'hrDiagram',hrHunt:{tempK:9845,lumin:24.74,mass:2.063,sizeScale:'true',hypothesis:'My source comparison'}});
 await expect(page.locator('#astronomy-hr-reference-status')).toHaveAttribute('data-reference','siriusA');
 await expect(page.getByRole('button',{name:'True scale',exact:true})).toHaveAttribute('aria-pressed','true');
 const saved=await state(page);
 errors.push(...await mount(page,{tab:'hrDiagram',hrHunt:saved}));
 await expect(page.getByRole('textbox',{name:'H-R diagram hypothesis'})).toHaveValue('My source comparison');
 await expect(page.locator('#astronomy-hr-size')).toHaveAttribute('data-size-scale','true');
 for(const mode of [true,[],{mode:'true'},'bad']){
  errors.push(...await mount(page,{tab:'hrDiagram',hrHunt:{sizeScale:mode,tempK:{},lumin:false,mass:'',hypothesis:'Keep valid notes'}}));
  await expect(page.locator('#astronomy-hr-size')).toHaveAttribute('data-size-scale','compressed');
  await expect(page.locator('#hr-tempK')).toHaveValue('5800');
  await expect(page.getByRole('textbox',{name:'H-R diagram hypothesis'})).toHaveValue('Keep valid notes');
  await page.getByRole('button',{name:'Sirius B',exact:true}).click();
  await expect(page.locator('#hr-mass')).toHaveValue('1.018');
 }
 expect(errors).toEqual([]);
});
test('diagram touch and keyboard edits update custom inputs without changing the selected size mode',async({page})=>{
 const errors=await mount(page,{tab:'hrDiagram'});
 await page.getByRole('button',{name:'Sirius A',exact:true}).click();
 await page.getByRole('button',{name:'True scale',exact:true}).click();
 const chart=page.locator('#astronomy-hr-plot');await chart.scrollIntoViewIfNeeded();
 const box=(await chart.boundingBox())!;
 await page.touchscreen.tap(box.x+box.width*240/430,box.y+box.height*186/440);
 await expect(chart).toBeFocused();
 expect((await state(page)).tempK).toBeGreaterThan(9000);
 expect((await state(page)).tempK).toBeLessThan(11000);
 await expect(page.locator('#astronomy-hr-reference-status')).toHaveAttribute('data-reference','custom');
 const old=(await state(page)).tempK;await chart.press('ArrowLeft');expect((await state(page)).tempK).toBeGreaterThan(old);
 await chart.press('Home');await expect(page.locator('#hr-tempK')).toHaveValue('5772');
 await expect(page.locator('#astronomy-hr-size')).toHaveAttribute('data-size-scale','true');
 await page.getByRole('button',{name:'Sun reference',exact:true}).click();
 await expect(page.locator('#astronomy-hr-reference-status')).toHaveAttribute('data-reference','sun');
 expect((await disks(page)).ratio).toBeCloseTo(1,12);
 expect(errors).toEqual([]);
});
