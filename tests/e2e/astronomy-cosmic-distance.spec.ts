import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = 'reports/sky-lab-cosmic-distance-2026-10-01';
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








const root=page=>page.locator('#astronomy-cosmo-lab');
const saved=page=>page.evaluate(()=>(window as any).__toolData.astronomy);
const linked=page=>page.evaluate(()=>{
 const m=(window as any).__alloAstroPure.cosmicDistanceModel((window as any).__toolData.astronomy);
 const values=Object.fromEntries(Array.from(document.querySelectorAll('[data-cosmo-metric]')).map(n=>[n.getAttribute('data-cosmo-metric'),Number(n.getAttribute('data-value'))]));
 const galaxies=Object.fromEntries(Array.from(document.querySelectorAll('[data-cosmo-galaxy]')).map(n=>[n.getAttribute('data-cosmo-galaxy'),{
  distance:Number(n.getAttribute('data-distance')),position:Number(n.getAttribute('data-position'))}]));
 const dots=Object.fromEntries(Array.from(document.querySelectorAll('[data-cosmo-dot]')).map(n=>[n.getAttribute('data-cosmo-dot'),Number(n.getAttribute('data-value'))]));
 return {m,values,galaxies,dots,chartZ:Number(document.querySelector('#astronomy-cosmo-chart')!.getAttribute('data-redshift')),
  epochsZ:Number(document.querySelector('#astronomy-cosmo-epochs')!.getAttribute('data-redshift'))};
});

test('redshift examples synchronize both views, travel time and cosmic ages while preserving other simulations',async({page})=>{
 const errors=await mount(page,{tab:'galaxies',hrHunt:{hypothesis:'Keep my stellar notes'},redshiftZ:3,pulsarPhase:.23,wavePhase:.37,bhMassSolar:1});
 const lab=root(page);
 for(const z of [0,1,3,10,15]){
  await lab.getByRole('button',{name:'z = '+z,exact:true}).click();
  const v=await linked(page);expect(v.chartZ).toBe(z);expect(v.epochsZ).toBe(z);
  for(const[key,value]of Object.entries(v.values))expect(value,key).toBe(v.m[key]);
  for(const key of ['nowGly','thenGly']){
   expect(v.galaxies[key].distance).toBe(v.m[key]);expect(v.dots[key]).toBe(v.m[key]);
   expect(v.galaxies[key].position-32).toBeCloseTo(v.m[key]/50*296,10);
  }
  expect(v.m.ageGyr+v.m.lookbackGyr).toBeCloseTo(v.m.ageNowGyr,10);
  if(z>0)expect(v.m.nowGly/v.m.thenGly).toBeCloseTo(1+z,12);
 }
 const state=await saved(page);expect(state.hrHunt.hypothesis).toBe('Keep my stellar notes');
 expect(state.redshiftZ).toBe(3);expect(state.wavePhase).toBe(.37);expect(state.pulsarPhase).toBe(.23);
 await lab.getByRole('button',{name:'z = 3',exact:true}).click();
 await lab.screenshot({path:OUT+'/cosmic-distance-desktop.png'});
 expect(errors).toEqual([]);
});

test('keyboard and native rate controls keep fixed matter assumptions and published input labels accurate',async({page})=>{
 const errors=await mount(page,{tab:'galaxies'}),lab=root(page),chart=page.locator('#astronomy-cosmo-chart');
 await chart.focus();await chart.press('ArrowRight');expect((await saved(page)).cosmoZ).toBe(1.1);
 await chart.press('Shift+ArrowRight');expect((await saved(page)).cosmoZ).toBe(2.1);
 await chart.press('Home');await expect(page.locator('#astronomy-cosmo-status')).toContainText('distances are zero');
 await chart.press('End');expect((await saved(page)).cosmoZ).toBe(15);
 const range=page.locator('#astronomy-cosmo-z');await range.focus();await range.press('ArrowLeft');expect((await saved(page)).cosmoZ).toBe(14.9);
 await lab.getByText('Expansion rates, sources and equations',{exact:true}).click();
 await lab.getByRole('button',{name:'z = 3',exact:true}).click();const planck=await linked(page);
 await lab.getByRole('button',{name:'SH0ES 2022 · 73.04',exact:true}).click();const shoes=await linked(page);
 await expect(page.locator('#astronomy-cosmo-model-status')).toHaveAttribute('data-cosmo-source','shoes');
 await expect(page.locator('#astronomy-cosmo-model-status')).toContainText('not a new cosmological fit');
 expect(shoes.m.omegaM).toBe(planck.m.omegaM);
 expect(shoes.m.nowGly/planck.m.nowGly).toBeCloseTo(67.4/73.04,12);
 const h0=page.locator('#astronomy-cosmo-h0');await h0.focus();await h0.press('ArrowRight');
 expect((await saved(page)).cosmoH0).toBe(73.05);
 await expect(page.locator('#astronomy-cosmo-model-status')).toHaveAttribute('data-cosmo-source','custom');
 await lab.getByRole('button',{name:'Reset distance lab',exact:true}).click();
 expect((await saved(page)).cosmoZ).toBe(1);expect((await saved(page)).cosmoH0).toBe(67.4);
 expect(errors).toEqual([]);
});

test('touch chart selection and pointer cancellation leave controls editable and focus intact',async({page})=>{
 const errors=await mount(page,{tab:'galaxies'}),chart=page.locator('#astronomy-cosmo-chart');
 await chart.scrollIntoViewIfNeeded();const box=(await chart.boundingBox())!;
 await page.touchscreen.tap(box.x+box.width*(64+274*3/15)/360,box.y+box.height*150/320);
 await expect(chart).toBeFocused();expect((await saved(page)).cosmoZ).toBeCloseTo(3,3);
 await chart.dispatchEvent('pointercancel',{pointerId:99,pointerType:'touch'});
 await chart.press('ArrowRight');expect((await saved(page)).cosmoZ).toBeCloseTo(3.1,3);
 await page.locator('#astronomy-cosmo-z').fill('10');expect((await saved(page)).cosmoZ).toBe(10);
 expect(errors).toEqual([]);
});

test('published spectrum redshift imports its provenance and survives restore until the distance setting changes',async({page})=>{
 let errors=await mount(page,{tab:'galaxies',hrHunt:{hypothesis:'Saved investigation'}});
 const spectrum=page.locator('#astronomy-redshift-lab');
 await spectrum.getByRole('button',{name:'JADES-GS-z14-0',exact:true}).click();
 await spectrum.getByRole('button',{name:'Explore distance and time',exact:true}).click();
 await expect(root(page)).toBeFocused();
 const imported=await saved(page);expect(imported.cosmoZ).toBe(imported.redshiftZ);expect(imported.cosmoRedshiftReference).toBe(imported.redshiftReference);
 await expect(page.locator('#astronomy-cosmo-redshift-source')).toContainText('Published redshift input: JADES-GS-z14-0');
 await expect(page.locator('#astronomy-cosmo-redshift-source')).toContainText('remain model calculations');
 errors.push(...await mount(page,imported));
 await expect(page.locator('#astronomy-cosmo-redshift-source')).toContainText('JADES-GS-z14-0');
 await root(page).getByText('Expansion rates, sources and equations',{exact:true}).click();
 await expect(root(page).getByRole('link',{name:'JADES-GS-z14-0 · redshift measurement'})).toHaveAttribute('href',/arxiv.org/);
 await page.locator('#astronomy-cosmo-z').fill('3');
 await expect(page.locator('#astronomy-cosmo-redshift-source')).toHaveAttribute('data-cosmo-redshift-source','chosen');
 expect((await saved(page)).redshiftReference).toBe(imported.redshiftReference);
 expect((await saved(page)).hrHunt.hypothesis).toBe('Saved investigation');
 await root(page).getByRole('button',{name:/^Use spectrum redshift/}).click();
 await expect(page.locator('#astronomy-cosmo-redshift-source')).toContainText('Published redshift input: JADES-GS-z14-0');
 expect(errors).toEqual([]);
});

test('phone contrast keeps glyphs readable, axis labels separated, shared scales accurate and targets usable',async({page})=>{
 await page.setViewportSize({width:320,height:900});
 const errors=await mount(page,{tab:'galaxies'},true),lab=root(page);
 await lab.getByText('Expansion rates, sources and equations',{exact:true}).click();
 for(const z of [0,1,3,15]){
  await lab.getByRole('button',{name:'z = '+z,exact:true}).click();
  const failures=await lab.locator('svg').evaluateAll(svgs=>svgs.flatMap(svg=>{
   const vb=(svg as SVGSVGElement).viewBox.baseVal,factor=svg.getBoundingClientRect().width/vb.width;
   return Array.from(svg.querySelectorAll('text')).filter(t=>t.getBoundingClientRect().width>0).flatMap(t=>{
    const b=(t as SVGTextElement).getBBox(),font=parseFloat(getComputedStyle(t).fontSize)*factor;
    return b.x < -1 || b.y < -1 || b.x+b.width>vb.width+1 || b.y+b.height>vb.height+1 || font<11
     ?[{text:t.textContent,b:{x:b.x,y:b.y,width:b.width,height:b.height},font}]:[];
   });
  }));expect(failures,'z='+z).toEqual([]);
  const gap=await page.locator('[data-cosmo-z-tick]').evaluateAll(nodes=>{
   const boxes=nodes.map(n=>(n as SVGTextElement).getBBox()).sort((a,b)=>a.x-b.x);
   return Math.min(...boxes.slice(1).map((b,i)=>b.x-boxes[i].x-boxes[i].width));
  });expect(gap).toBeGreaterThan(4);
 }
 const heights=await lab.locator('button,summary,input[type="range"],a').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().width>0).map(n=>n.getBoundingClientRect().height));
 expect(heights.every(height=>height>=44)).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await lab.getByText('Expansion rates, sources and equations',{exact:true}).click();
 await lab.getByRole('button',{name:'z = 3',exact:true}).click();
 await lab.screenshot({path:OUT+'/cosmic-distance-phone-contrast.png'});
 expect(errors).toEqual([]);
});

test('damaged persisted values recover to finite linked views and retain valid notes',async({page})=>{
 const errors:string[]=[];
 for(const raw of [null,false,{},'',1e30,-1e30]){
  errors.push(...await mount(page,{tab:'galaxies',cosmoZ:raw,cosmoH0:raw,cosmoRedshiftReference:{forged:1},hrHunt:{hypothesis:'Keep these notes'}}));
  const v=await linked(page);
  expect(Number.isFinite(v.m.nowGly)).toBe(true);expect(Number.isFinite(v.m.ageGyr)).toBe(true);
  expect(v.m.z).toBeGreaterThanOrEqual(0);expect(v.m.z).toBeLessThanOrEqual(15);expect(v.m.redshiftReference).toBeNull();
  await root(page).getByRole('button',{name:'z = 3',exact:true}).click();expect((await saved(page)).cosmoZ).toBe(3);
  expect((await saved(page)).hrHunt.hypothesis).toBe('Keep these notes');
 }
 expect(errors).toEqual([]);
});
