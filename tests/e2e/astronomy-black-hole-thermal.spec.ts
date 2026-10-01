import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = 'reports/sky-lab-black-hole-thermal-2026-09-30';
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







const root=page=>page.locator('#astronomy-black-hole-thermal');
const state=page=>page.evaluate(()=>(window as any).__toolData.astronomy);
const linked=page=>page.evaluate(()=>{
 const mass=Number(document.querySelector('#astronomy-bht-horizons')!.getAttribute('data-mass-solar'));
 const solar=Number(document.querySelector('[data-bht-disk="solar"]')!.getAttribute('r'));
 const selected=Number(document.querySelector('[data-bht-disk="selected"]')!.getAttribute('r'));
 return {mass,ratio:selected/solar,chartMass:Number(document.querySelector('#astronomy-bht-curve')!.getAttribute('data-mass-solar')),
  diameter:Number(document.querySelector('#astronomy-bht-horizons')!.getAttribute('data-diameter-m')),
  readoutDiameter:Number(document.querySelector('[data-bht-metric="diameter"]')!.getAttribute('data-value')),
  temperature:Number(document.querySelector('#astronomy-bht-curve')!.getAttribute('data-temperature-k')),
  readoutTemperature:Number(document.querySelector('[data-bht-metric="temperature"]')!.getAttribute('data-value'))};
});
test('mass examples keep horizon, temperature curve, physical readouts and source labels synchronized',async({page})=>{
 const errors=await mount(page,{tab:'galaxies',bhMassSolar:1,selectedBH:'hawking',hrHunt:{hypothesis:'Keep my stars'},wavePhase:.4,pulsarPhase:.3});
 const lab=root(page);
 for(const name of ['One solar mass','1 mm horizon','Sagittarius A*','M87*','Match CMB temperature']){
  await lab.getByRole('button',{name,exact:true}).click();
  const values=await linked(page);
  expect(values.ratio/values.mass).toBeCloseTo(1,12);expect(values.chartMass).toBe(values.mass);
  expect(values.diameter).toBe(values.readoutDiameter);expect(values.temperature).toBe(values.readoutTemperature);
 }
 await expect(page.locator('#astronomy-bht-cmb-status')).toHaveAttribute('data-cmb-relation','balanced');
 await lab.getByRole('button',{name:'1 mm horizon',exact:true}).click();
 await expect(page.locator('[data-bht-metric="diameter"]')).toHaveText('1 mm');
 await expect(page.locator('[data-bht-metric="temperature"]')).toContainText('364 mK');
 await expect(page.locator('#astronomy-bh-panel')).toContainText('0.36 K');
 await lab.screenshot({path:OUT+'/millimetre-horizon-desktop.png'});
 const saved=await state(page);expect(saved.hrHunt.hypothesis).toBe('Keep my stars');expect(saved.wavePhase).toBe(.4);expect(saved.pulsarPhase).toBe(.3);
 expect(errors).toEqual([]);
});
test('log controls and keyboard changes move to custom mass and explain both sides of CMB balance',async({page})=>{
 const errors=await mount(page,{tab:'galaxies'}),lab=root(page),chart=page.locator('#astronomy-bht-curve');
 await lab.getByRole('button',{name:'Sagittarius A*',exact:true}).click();
 await expect(page.locator('#astronomy-bht-input-status')).toHaveAttribute('data-bht-example','sgrA');
 await chart.focus();await chart.press('ArrowRight');
 await expect(page.locator('#astronomy-bht-input-status')).toHaveAttribute('data-bht-example','custom');
 expect((await state(page)).bhMassSolar).toBeGreaterThan(4e6);
 await chart.press('Home');expect((await state(page)).bhMassSolar).toBe(1);
 const slider=page.locator('#astronomy-bht-mass');
 await slider.fill('-10');await expect(page.locator('#astronomy-bht-cmb-status')).toHaveAttribute('data-cmb-relation','hotter');
 await slider.fill('0');await expect(page.locator('#astronomy-bht-cmb-status')).toHaveAttribute('data-cmb-relation','colder');
 await slider.focus();await slider.press('PageUp');expect((await state(page)).bhMassSolar).toBe(10);
 await chart.focus();await chart.press('Shift+ArrowLeft');expect((await state(page)).bhMassSolar).toBe(1);
 expect(errors).toEqual([]);
});
test('touch input and restored published presets use the same mass without disturbing topic focus',async({page})=>{
 const errors=await mount(page,{tab:'galaxies',bhMassSolar:6.5e9,selectedBH:'page'}),chart=page.locator('#astronomy-bht-curve');
 await expect(root(page).getByRole('button',{name:'M87*',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#astronomy-bh-panel')).toHaveAttribute('aria-labelledby','astronomy-bh-tab-page');
 await chart.scrollIntoViewIfNeeded();const box=(await chart.boundingBox())!;
 await page.touchscreen.tap(box.x+box.width*225.833333333/360,box.y+box.height*160/360);
 await expect(chart).toBeFocused();expect((await state(page)).bhMassSolar).toBeGreaterThan(.999);expect((await state(page)).bhMassSolar).toBeLessThan(1.001);
 const tab=page.locator('#astronomy-bh-tab-page');await tab.focus();await tab.press('ArrowLeft');
 await expect(page.locator('#astronomy-bh-tab-firewall')).toBeFocused();
 const current=await state(page);expect(current.bhMassSolar).toBeGreaterThan(.999);expect(current.bhMassSolar).toBeLessThan(1.001);
 expect(errors).toEqual([]);
});
test('sources give study uncertainties and distinguish horizon size from EHT imagery and Hawking detection',async({page})=>{
 const errors=await mount(page,{tab:'galaxies'}),lab=root(page);
 await lab.getByRole('button',{name:'M87*',exact:true}).click();
 await lab.getByText('Sources, uncertainties and equations',{exact:true}).click();
 await expect(lab).toContainText('±0.2 billion statistical and ±0.7 billion systematic');
 await expect(lab.getByRole('link',{name:'M87* · EHT 2019'})).toHaveAttribute('href','https://arxiv.org/abs/1906.11243');
 await expect(lab).toContainText('not an accretion ring');
 await expect(lab).toContainText('has not been directly detected');
 await lab.getByText('Sources, uncertainties and equations',{exact:true}).click();
 await lab.screenshot({path:OUT+'/m87-horizon-desktop.png'});
 expect(errors).toEqual([]);
});
test('phone contrast diagrams have readable separated labels, real disk ratios and usable information comparison',async({page})=>{
 await page.setViewportSize({width:320,height:900});
 const errors=await mount(page,{tab:'galaxies'},true),lab=root(page);
 await lab.getByText('Compare information models',{exact:true}).click();
 for(const name of ['One solar mass','1 mm horizon','M87*','Match CMB temperature']){
  await lab.getByRole('button',{name,exact:true}).click();
  const failures=await lab.locator('svg').evaluateAll(svgs=>svgs.flatMap(svg=>{
   const vb=(svg as SVGSVGElement).viewBox.baseVal,factor=svg.getBoundingClientRect().width/vb.width;
   return Array.from(svg.querySelectorAll('text')).filter(t=>t.getBoundingClientRect().width>0).flatMap(t=>{
    const b=(t as SVGTextElement).getBBox(),font=parseFloat(getComputedStyle(t).fontSize)*factor;
    return b.x < -1 || b.y < -1 || b.x+b.width>vb.width+1 || b.y+b.height>vb.height+1 || font<11 ? [{text:t.textContent,b:{x:b.x,y:b.y,width:b.width,height:b.height},font}]:[];
   });
  }));
  expect(failures,name).toEqual([]);
  const ticks=await page.locator('#astronomy-bht-curve [data-bht-mass-tick] text').evaluateAll(nodes=>{
   const boxes=nodes.map(n=>(n as SVGTextElement).getBBox()).sort((a,b)=>a.x-b.x);
   return Math.min(...boxes.slice(1).map((b,i)=>b.x-boxes[i].x-boxes[i].width));
  });expect(ticks).toBeGreaterThan(3);
  const values=await linked(page);expect(values.ratio/values.mass).toBeCloseTo(1,12);
 }
 await expect(page.locator('#astronomy-page-comparison')).toContainText('not a fixed fraction of mass lost');
 await lab.getByRole('button',{name:'1 mm horizon',exact:true}).click();
 await lab.screenshot({path:OUT+'/millimetre-horizon-phone-contrast.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const targets=await lab.locator('button,summary,input[type="range"]').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));
 expect(targets.every(height=>height>=44)).toBe(true);
 expect(errors).toEqual([]);
});
test('damaged and extreme saved masses recover to finite diagrams and remain editable',async({page})=>{
 let errors:string[]=[];
 for(const mass of [{forged:1},false,'',1e50,0]){
  errors.push(...await mount(page,{tab:'galaxies',bhMassSolar:mass,selectedBH:'hawking',hrHunt:{hypothesis:'Keep the valid notes'}}));
  const saved=await page.evaluate(()=>(window as any).__alloAstroPure.blackHoleThermalModel((window as any).__toolData.astronomy));
  expect(Number.isFinite(saved.temperatureK)).toBe(true);expect(saved.massSolar).toBeGreaterThanOrEqual(1e-14);expect(saved.massSolar).toBeLessThanOrEqual(1e10);
  await root(page).getByRole('button',{name:'Sagittarius A*',exact:true}).click();
  expect((await state(page)).bhMassSolar).toBe(4e6);expect((await state(page)).hrHunt.hypothesis).toBe('Keep the valid notes');
  await expect(page.locator('#astronomy-bht-input-status')).toHaveAttribute('data-bht-example','sgrA');
 }
 expect(errors).toEqual([]);
});
