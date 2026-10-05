import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = 'reports/sky-lab-rotation-curves-2026-10-01';
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










const root=page=>page.locator('#astronomy-rotation-lab');
const saved=page=>page.evaluate(()=>(window as any).__toolData.astronomy);
const linked=page=>page.evaluate(()=>{
 const m=(window as any).__alloAstroPure.galaxyRotationModel((window as any).__toolData.astronomy);
 const values=Object.fromEntries(Array.from(document.querySelectorAll('[data-rotation-metric]')).map(n=>[n.getAttribute('data-rotation-metric'),Number(n.getAttribute('data-value'))]));
 const chart=document.querySelector('#astronomy-rotation-chart')!,difference=document.querySelector('#astronomy-rotation-difference')!;
 const samples=el=>Array.from(el.querySelectorAll('[data-rotation-sample]')).map(n=>({radius:Number(n.getAttribute('data-radius')),value:Number(n.getAttribute('data-value')),error:Number(n.getAttribute('data-error'))}));
 return {m,values,index:Number(chart.getAttribute('data-index')),differenceIndex:Number(difference.getAttribute('data-index')),
 observed:samples(chart),differences:samples(difference),modelPoints:document.querySelector('[data-rotation-model]')!.getAttribute('points')};
});

test('galaxy and mass choices synchronize both charts and ratios while retaining published measurements and notes',async({page})=>{
 const errors=await mount(page,{tab:'galaxies',hrHunt:{hypothesis:'Keep my investigation'},inflationFolds:10,cosmoZ:3,pulsarPhase:.23});
 const lab=root(page);
 for(const [name,id,count]of [['NGC 3198','NGC3198',43],['NGC 6503','NGC6503',31]]){
  await lab.getByRole('button',{name,exact:true}).click();const observed=(await linked(page)).observed;
  for(const ml of [.2,.5,1]){
   await lab.getByRole('button',{name:'M/L = '+ml,exact:true}).click();const v=await linked(page);
   expect(v.m.galaxy).toBe(id);expect(v.m.points).toHaveLength(count);expect(v.index).toBe(count-1);expect(v.differenceIndex).toBe(v.index);
   expect(v.observed).toEqual(observed);
   for(const[key,value]of Object.entries(v.values))expect(value,key).toBe(v.m.selected[key]);
   for(let i=0;i<count;i++){expect(v.differences[i].value).toBe(v.m.points[i].differenceKms);expect(v.differences[i].error).toBe(v.m.points[i].errorKms);}
  }
 }
 const state=await saved(page);expect(state.hrHunt.hypothesis).toBe('Keep my investigation');
 expect(state.inflationFolds).toBe(10);expect(state.cosmoZ).toBe(3);expect(state.pulsarPhase).toBe(.23);
 await lab.getByRole('button',{name:'Reset rotation explorer',exact:true}).click();
 expect((await linked(page)).m.galaxy).toBe('NGC3198');expect((await linked(page)).m.ml).toBe(.5);
 await lab.screenshot({path:OUT+'/rotation-desktop.png'});expect(errors).toEqual([]);
});

test('keyboard controls preserve focus, step through measured radii and display overpredictions honestly',async({page})=>{
 const errors=await mount(page,{tab:'galaxies'}),lab=root(page),chart=page.locator('#astronomy-rotation-chart');
 await chart.focus();await chart.press('Home');expect((await linked(page)).index).toBe(0);
 await chart.press('ArrowRight');expect((await linked(page)).index).toBe(1);
 await chart.press('Shift+ArrowRight');expect((await linked(page)).index).toBe(6);await expect(chart).toBeFocused();
 await chart.press('End');expect((await linked(page)).index).toBe(42);
 const range=page.locator('#astronomy-rotation-point');await range.focus();await range.press('ArrowLeft');expect((await linked(page)).index).toBe(41);
 await lab.getByRole('button',{name:'NGC 6503',exact:true}).click();await range.fill('2');
 const ml=page.locator('#astronomy-rotation-ml');await ml.focus();await ml.press('ArrowRight');
 expect((await linked(page)).m.ml).toBe(.55);await expect(ml).toBeFocused();
 await ml.fill('0.6');await expect(page.locator('#astronomy-rotation-status')).toHaveAttribute('data-regime','overlap');
 await lab.getByRole('button',{name:'M/L = 1',exact:true}).click();
 const v=await linked(page);expect(v.m.selected.differenceKms).toBeLessThan(-30);
 await expect(page.locator('[data-rotation-metric="differenceKms"]')).toContainText('-');
 await expect(page.locator('#astronomy-rotation-status')).toHaveAttribute('data-regime','below');
 await lab.screenshot({path:OUT+'/rotation-overprediction.png'});
 expect(errors).toEqual([]);
});

test('touch selection snaps to an actual radial measurement and cancellation leaves controls usable',async({page})=>{
 const errors=await mount(page,{tab:'galaxies'}),chart=page.locator('#astronomy-rotation-chart');
 await chart.scrollIntoViewIfNeeded();const box=(await chart.boundingBox())!,maxRadius=(await linked(page)).m.radiusMaxKpc;
 await page.touchscreen.tap(box.x+box.width*(70+264*12.05/maxRadius)/360,box.y+box.height*140/330);
 await expect(chart).toBeFocused();expect((await linked(page)).index).toBe(26);expect((await linked(page)).m.selected.radiusKpc).toBe(12.05);
 await chart.dispatchEvent('pointercancel',{pointerId:99,pointerType:'touch'});
 await chart.press('ArrowRight');expect((await linked(page)).index).toBe(27);
 await page.locator('#astronomy-rotation-point').fill('0');expect((await linked(page)).index).toBe(0);
 expect(errors).toEqual([]);
});

test('restored controls align to native steps, recover malformed values and preserve other notes',async({page})=>{
 let errors=await mount(page,{tab:'galaxies',rotationGalaxy:'NGC6503',rotationML:'0.33',rotationPoint:'2.7',hrHunt:{hypothesis:'Saved notebook'}});
 let v=await linked(page);expect(v.m.ml).toBe(.35);expect(v.index).toBe(3);
 await expect(page.locator('#astronomy-rotation-ml')).toHaveValue('0.35');await expect(page.locator('#astronomy-rotation-point')).toHaveValue('3');
 await root(page).getByRole('button',{name:'M/L = 0.5',exact:true}).click();const state=await saved(page);
 errors.push(...await mount(page,state));v=await linked(page);expect(v.m.ml).toBe(.5);expect(v.index).toBe(3);expect(v.m.galaxy).toBe('NGC6503');
 expect((await saved(page)).hrHunt.hypothesis).toBe('Saved notebook');
 errors.push(...await mount(page,{tab:'galaxies',rotationGalaxy:{forged:true},rotationML:[],rotationPoint:'bad',hrHunt:{hypothesis:'Recover this note'}}));
 v=await linked(page);expect(v.m.galaxy).toBe('NGC3198');expect(v.m.ml).toBe(.5);expect(v.index).toBe(42);
 expect((await saved(page)).hrHunt.hypothesis).toBe('Recover this note');
 errors.push(...await mount(page,{tab:'galaxies',rotationGalaxy:'NGC6503',rotationML:-100,rotationPoint:10000}));
 v=await linked(page);expect(v.m.ml).toBe(.1);expect(v.index).toBe(30);
 expect(errors).toEqual([]);
});

test('320px contrast diagrams retain readable glyphs, complete error bars and 44px controls',async({page})=>{
 await page.setViewportSize({width:320,height:900});
 const errors=await mount(page,{tab:'galaxies'},true),lab=root(page);
 await lab.getByText('Measurements, sources and model limits',{exact:true}).click();
 const geometry=await lab.evaluate(el=>{
  const svgs=Array.from(el.querySelectorAll('svg'));
  return {overflow:el.scrollWidth>el.clientWidth+1,background:getComputedStyle(el).backgroundColor,svgs:svgs.map(svg=>{
   const view=svg.viewBox.baseVal,scale=svg.getBoundingClientRect().width/view.width;
   return {id:svg.id,text:Array.from(svg.querySelectorAll('text')).map(t=>{
    const b=t.getBBox();return {label:t.textContent,font:parseFloat(getComputedStyle(t).fontSize)*scale,left:b.x,top:b.y,right:b.x+b.width,bottom:b.y+b.height,width:view.width,height:view.height};}),
    samples:Array.from(svg.querySelectorAll('[data-rotation-sample]')).map(g=>{const b=g.getBBox();return {left:b.x,right:b.x+b.width,top:b.y,bottom:b.y+b.height};})};
  }),targets:Array.from(el.querySelectorAll('button,input,summary,a')).map(n=>({label:n.textContent,height:n.getBoundingClientRect().height}))};
 });
 expect(geometry.overflow).toBe(false);expect(geometry.background).toBe('rgb(0, 0, 0)');expect(geometry.svgs).toHaveLength(2);
 for(const svg of geometry.svgs){for(const t of svg.text){
  expect(t.font,svg.id+' '+t.label).toBeGreaterThanOrEqual(11);
  expect(t.left,svg.id+' '+t.label).toBeGreaterThanOrEqual(-.5);expect(t.top).toBeGreaterThanOrEqual(-.5);
  expect(t.right,svg.id+' '+t.label).toBeLessThanOrEqual(t.width+.5);expect(t.bottom,svg.id+' '+t.label).toBeLessThanOrEqual(t.height+.5);
 }for(const s of svg.samples){expect(s.left).toBeGreaterThanOrEqual(0);expect(s.right).toBeLessThanOrEqual(360);expect(s.top).toBeGreaterThanOrEqual(44);expect(s.bottom).toBeLessThanOrEqual(258);}}
 for(const t of geometry.targets)expect(t.height,t.label||'range').toBeGreaterThanOrEqual(44);
 const fractions=await page.locator('#astronomy-energy-budget > div').first().evaluate(el=>{
  const widths=Array.from(el.children).map(n=>n.getBoundingClientRect().width),sum=widths.reduce((a,b)=>a+b,0);return widths.map(w=>w/sum);
 });expect(fractions[0]).toBeCloseTo(.05,2);expect(fractions[1]).toBeCloseTo(.27,2);expect(fractions[2]).toBeCloseTo(.68,2);
 writeFileSync(OUT+'/phone-geometry.json',JSON.stringify(geometry,null,2)+'\n');
 await lab.screenshot({path:OUT+'/rotation-phone-contrast.png'});
 await lab.locator('figure').first().screenshot({path:OUT+'/rotation-chart-phone.png'});
 await lab.locator('figure').nth(1).screenshot({path:OUT+'/rotation-difference-phone.png'});
 expect(errors).toEqual([]);
});

test('source disclosure identifies adopted assumptions and topic navigation retains the investigation',async({page})=>{
 const errors=await mount(page,{tab:'galaxies'}),lab=root(page);
 await lab.getByRole('button',{name:'NGC 6503',exact:true}).click();await lab.getByRole('button',{name:'M/L = 1',exact:true}).click();
 await page.locator('#astronomy-rotation-point').fill('2');
 await lab.getByText('Measurements, sources and model limits',{exact:true}).click();
 await expect(lab).toContainText('exclude inclination systematics');await expect(lab).toContainText('factor 1.33 for helium');
 await expect(lab.getByRole('link',{name:'SPARC 2016 · mass model equations'})).toHaveAttribute('href','https://arxiv.org/abs/1606.09251');
 await expect(lab.getByRole('link',{name:'Published rotation and mass-model table'})).toHaveAttribute('href','https://astroweb.cwru.edu/SPARC/MassModels_Lelli2016c.mrt');
 const rotation=page.locator('#astronomy-dm-tab-rotation');await rotation.focus();await rotation.press('ArrowRight');
 await expect(page.locator('#astronomy-dm-tab-lensing')).toBeFocused();await expect(page.locator('#astronomy-dm-panel')).toHaveAttribute('aria-labelledby','astronomy-dm-tab-lensing');
 await page.locator('#astronomy-dm-tab-lensing').press('Home');await expect(rotation).toBeFocused();
 const v=await linked(page);expect(v.m.galaxy).toBe('NGC6503');expect(v.m.ml).toBe(1);expect(v.index).toBe(2);
 await page.locator('#astronomy-dm-tab-cmb').click();await expect(page.locator('#astronomy-dm-panel')).toContainText('present epoch under base ΛCDM');
 expect(errors).toEqual([]);
});
