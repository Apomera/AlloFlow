import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = 'reports/sky-lab-inflation-2026-10-01';
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









const root=page=>page.locator('#astronomy-inflation-lab');
const saved=page=>page.evaluate(()=>(window as any).__toolData.astronomy);
const linked=page=>page.evaluate(()=>{
 const m=(window as any).__alloAstroPure.inflationExpansionModel((window as any).__toolData.astronomy);
 const values=Object.fromEntries(Array.from(document.querySelectorAll('[data-inflation-metric]')).map(n=>[n.getAttribute('data-inflation-metric'),Number(n.getAttribute('data-value'))]));
 const dots=Object.fromEntries(Array.from(document.querySelectorAll('[data-inflation-dot]')).map(n=>[n.getAttribute('data-inflation-dot'),Number(n.getAttribute('data-log-value'))]));
 return {m,values,dots,diagramN:Number(document.querySelector('#astronomy-inflation-diagram')!.getAttribute('data-folds')),
 chartN:Number(document.querySelector('#astronomy-inflation-growth')!.getAttribute('data-folds')),
 beforeWave:Number(document.querySelector('[data-inflation-pattern="before"]')!.getAttribute('data-wave-h')),
 afterWave:Number(document.querySelector('[data-inflation-pattern="after"]')!.getAttribute('data-wave-h'))};
});

test('expansion examples synchronize the fixed-window pattern, growth chart and ratios while preserving notes',async({page})=>{
 const errors=await mount(page,{tab:'galaxies',hrHunt:{hypothesis:'Keep my stellar investigation'},cosmoZ:3,redshiftZ:2,pulsarPhase:.23,wavePhase:.37});
 const lab=root(page);
 for(const n of [0,3,10,60]){
  await lab.getByRole('button',{name:'N = '+n,exact:true}).click();
  const v=await linked(page);expect(v.diagramN).toBe(n);expect(v.chartN).toBe(n);
  for(const[key,value]of Object.entries(v.values))expect(value,key).toBe(v.m[key]);
  for(const[key,value]of Object.entries(v.dots))expect(value,key).toBe(v.m[key]);
  expect(v.beforeWave).toBe(v.m.initialWaveH);expect(v.afterWave).toBe(v.m.waveH);
  await expect(lab.getByRole('button',{name:'N = '+n,exact:true})).toHaveAttribute('aria-pressed','true');
 }
 const state=await saved(page);expect(state.hrHunt.hypothesis).toBe('Keep my stellar investigation');
 expect(state.cosmoZ).toBe(3);expect(state.redshiftZ).toBe(2);expect(state.pulsarPhase).toBe(.23);expect(state.wavePhase).toBe(.37);
 await lab.getByRole('button',{name:'N = 3',exact:true}).click();
 await lab.screenshot({path:OUT+'/inflation-desktop.png'});
 expect(errors).toEqual([]);
});

test('keyboard and wavelength controls use the full wavelength crossing convention and retain focus',async({page})=>{
 const errors=await mount(page,{tab:'galaxies'}),lab=root(page),chart=page.locator('#astronomy-inflation-growth');
 await chart.focus();await chart.press('ArrowRight');expect((await saved(page)).inflationFolds).toBe(3.5);
 await chart.press('Shift+ArrowRight');expect((await saved(page)).inflationFolds).toBe(8.5);
 await chart.press('Home');expect((await saved(page)).inflationFolds).toBe(0);
 await expect(lab.locator('label[for="astronomy-inflation-folds"]')).toHaveText('Expansion stage: N = 0');
 await chart.press('End');expect((await saved(page)).inflationFolds).toBe(60);
 const range=page.locator('#astronomy-inflation-folds');await range.focus();await range.press('ArrowLeft');
 expect((await saved(page)).inflationFolds).toBe(59.5);await expect(range).toBeFocused();
 const wavelength=page.locator('#astronomy-inflation-wavelength');await wavelength.focus();await wavelength.press('ArrowRight');
 expect((await saved(page)).inflationWaveH).toBeCloseTo(.55,12);
 await lab.getByRole('button',{name:'At Hubble scale',exact:true}).click();
 let v=await linked(page);expect(v.m.modeScale).toBeCloseTo(1,12);expect(v.m.waveH).toBeCloseTo(2*Math.PI,12);
 await expect(page.locator('#astronomy-inflation-status')).toHaveAttribute('data-regime','crossing');
 await chart.focus();await chart.press('ArrowLeft');await expect(page.locator('#astronomy-inflation-status')).toHaveAttribute('data-regime','below');
 await chart.press('Shift+ArrowRight');await expect(page.locator('#astronomy-inflation-status')).toHaveAttribute('data-regime','above');
 await lab.getByRole('button',{name:'Reset expansion',exact:true}).click();
 expect((await saved(page)).inflationFolds).toBe(3);expect((await saved(page)).inflationWaveH).toBe(.5);
 await expect(lab.getByRole('button',{name:'Reset expansion',exact:true})).not.toHaveAttribute('aria-pressed');
 expect(errors).toEqual([]);
});

test('touch chart selection and cancellation leave keyboard and range input usable',async({page})=>{
 const errors=await mount(page,{tab:'galaxies'}),chart=page.locator('#astronomy-inflation-growth');
 await chart.scrollIntoViewIfNeeded();const box=(await chart.boundingBox())!;
 await page.touchscreen.tap(box.x+box.width*(82+250*10/60)/360,box.y+box.height*150/350);
 await expect(chart).toBeFocused();expect((await saved(page)).inflationFolds).toBeCloseTo(10,2);
 await chart.dispatchEvent('pointercancel',{pointerId:99,pointerType:'touch'});
 await chart.press('ArrowRight');expect((await saved(page)).inflationFolds).toBeCloseTo(10.5,2);
 await page.locator('#astronomy-inflation-folds').fill('3');expect((await saved(page)).inflationFolds).toBe(3);
 expect(errors).toEqual([]);
});

test('published spectral tilt and its uncertainty remain independent of teaching controls',async({page})=>{
 const errors=await mount(page,{tab:'galaxies'}),lab=root(page);
 await lab.getByText('What published observations constrain',{exact:true}).click();
 const curve=page.locator('[data-inflation-spectrum-mean]'),band=page.locator('[data-inflation-spectrum-band]');
 const initial=[await curve.getAttribute('points'),await band.getAttribute('points')];
 await lab.getByRole('button',{name:'N = 60',exact:true}).click();await page.locator('#astronomy-inflation-wavelength').fill('2');
 expect([await curve.getAttribute('points'),await band.getAttribute('points')]).toEqual(initial);
 const observations=page.locator('#astronomy-inflation-observations');
 await expect(observations).toContainText('0.9649 ± 0.0042 (68% confidence)');
 await expect(observations).toContainText('r < 0.036 at 95% confidence');
 await expect(observations).toContainText('normalization is held fixed');
 await expect(observations).toContainText('upper limit is not a tensor detection');
 await expect(observations.getByRole('link',{name:'Planck 2018 · spectral index'})).toHaveAttribute('href','https://arxiv.org/abs/1807.06211');
 await expect(observations.getByRole('link',{name:'BICEP/Keck 2021 · tensor upper limit'})).toHaveAttribute('href','https://arxiv.org/abs/2110.00483');
 await observations.screenshot({path:OUT+'/inflation-observations-desktop.png'});
 expect(errors).toEqual([]);
});

test('320px contrast view keeps text within all three diagrams and offers 44px controls',async({page})=>{
 await page.setViewportSize({width:320,height:900});
 const errors=await mount(page,{tab:'galaxies'},true),lab=root(page);
 await lab.getByText('What published observations constrain',{exact:true}).click();
 await lab.getByText('Model equations and limits',{exact:true}).click();
 const geometry=await lab.evaluate(el=>{
  const svgs=Array.from(el.querySelectorAll('svg'));
  return {overflow:el.scrollWidth>el.clientWidth+1,background:getComputedStyle(el).backgroundColor,svgs:svgs.map(svg=>{
   const view=svg.viewBox.baseVal,scale=svg.getBoundingClientRect().width/view.width;
   return {id:svg.id,text:Array.from(svg.querySelectorAll('text')).map(t=>{
    const b=t.getBBox();return {label:t.textContent,font:parseFloat(getComputedStyle(t).fontSize)*scale,left:b.x,top:b.y,right:b.x+b.width,bottom:b.y+b.height,width:view.width,height:view.height};})};
  }),targets:Array.from(el.querySelectorAll('button,input,summary,a')).map(n=>({label:n.textContent,height:n.getBoundingClientRect().height}))};
 });
 expect(geometry.overflow).toBe(false);expect(geometry.background).toBe('rgb(0, 0, 0)');expect(geometry.svgs).toHaveLength(3);
 for(const svg of geometry.svgs)for(const t of svg.text){
  expect(t.font,svg.id+' '+t.label).toBeGreaterThanOrEqual(11);
  expect(t.left,svg.id+' '+t.label).toBeGreaterThanOrEqual(-.5);
  expect(t.top,svg.id+' '+t.label).toBeGreaterThanOrEqual(-.5);
  expect(t.right,svg.id+' '+t.label).toBeLessThanOrEqual(t.width+.5);
  expect(t.bottom,svg.id+' '+t.label).toBeLessThanOrEqual(t.height+.5);
 }
 for(const target of geometry.targets)expect(target.height,target.label||'range').toBeGreaterThanOrEqual(44);
 writeFileSync(OUT+'/phone-geometry.json',JSON.stringify(geometry,null,2)+'\n');
 await lab.screenshot({path:OUT+'/inflation-phone-contrast.png'});
 expect(errors).toEqual([]);
});

test('saved expansion state and malformed inputs recover without erasing other investigation data',async({page})=>{
 let errors=await mount(page,{tab:'galaxies',inflationFolds:'10',inflationWaveH:'1',hrHunt:{hypothesis:'Persistent notes'}});
 let v=await linked(page);expect(v.m.folds).toBe(10);expect(v.m.initialWaveH).toBe(1);
 await root(page).getByRole('button',{name:'At Hubble scale',exact:true}).click();const state=await saved(page);
 errors.push(...await mount(page,state));v=await linked(page);expect(v.m.regime).toBe('crossing');
 expect((await saved(page)).hrHunt.hypothesis).toBe('Persistent notes');
 errors.push(...await mount(page,{tab:'galaxies',inflationFolds:{bad:true},inflationWaveH:[],hrHunt:{hypothesis:'Recovered notes'}}));
 v=await linked(page);expect(v.m.folds).toBe(3);expect(v.m.initialWaveH).toBe(.5);
 expect((await saved(page)).hrHunt.hypothesis).toBe('Recovered notes');
 errors.push(...await mount(page,{tab:'galaxies',inflationFolds:1000,inflationWaveH:-100}));
 v=await linked(page);expect(v.m.folds).toBe(60);expect(v.m.initialWaveH).toBe(.25);
 expect(errors).toEqual([]);
});
