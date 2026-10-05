import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = 'reports/sky-lab-habitable-zone-2026-10-01';
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

const root=page=>page.locator('#astronomy-habitable-zone-lab');
const saved=page=>page.evaluate(()=>(window as any).__toolData.astronomy);
const linked=page=>page.evaluate(()=>{
 const m=(window as any).__alloAstroPure.habitableZoneModel((window as any).__toolData.astronomy),el=document.querySelector('#astronomy-habitable-zone-lab')!;
 return {m,metrics:Object.fromEntries(Array.from(el.querySelectorAll('[data-hz-metric]')).map(n=>[n.getAttribute('data-hz-metric'),Number(n.getAttribute('data-value'))])),
  selected:{value:Number(el.querySelector('[data-hz-selected]')!.getAttribute('data-value')),x:Number(el.querySelector('[data-hz-selected]')!.getAttribute('cx'))},
  bounds:Array.from(el.querySelectorAll('[data-hz-boundary]')).map(n=>({id:n.getAttribute('data-hz-boundary'),value:Number(n.getAttribute('data-value')),x:Number(n.getAttribute('x1'))})),
  energy:Array.from(el.querySelectorAll('[data-hz-energy-row]')).map(n=>({id:n.getAttribute('data-hz-energy-row'),fraction:Number(n.getAttribute('data-fraction')),width:Number(n.querySelectorAll('rect')[1].getAttribute('width'))})),
  energyValues:Object.fromEntries(Array.from(el.querySelectorAll('[data-hz-energy]')).map(n=>[n.getAttribute('data-hz-energy'),Number(n.getAttribute('data-value'))]))};
});
function check(v){
 const x=r=>44+(Math.log10(r)-Math.log10(.03))/(Math.log10(20)-Math.log10(.03))*276;
 expect(v.metrics.flux).toBe(v.m.flux);expect(v.metrics.innerAu).toBe(v.m.inner.distanceAu);expect(v.metrics.outerAu).toBe(v.m.outer.distanceAu);expect(v.metrics.equilibriumK).toBe(v.m.equilibriumK);
 expect(v.selected.value).toBe(v.m.distanceAu);expect(v.selected.x).toBeCloseTo(x(v.m.distanceAu),10);
 for(const b of v.bounds){expect(b.value).toBe(v.m[b.id].distanceAu);expect(b.x).toBeCloseTo(x(b.value),10);}
 for(const row of v.energy){expect(row.fraction).toBe(row.id==='incident'?1:v.m[row.id+'Fraction']);expect(row.width).toBe(row.fraction*296);}
 expect(v.energyValues.irradiance).toBe(v.m.irradiance);expect(v.energyValues.meanAbsorbed).toBe(v.m.meanAbsorbed);
}

test('published planet presets link energy and orbit figures while preserving independent investigations',async({page})=>{
 const errors=await mount(page,{tab:'exoplanets',selectedCC:'agriculture',magnitudeReference:'sirius',hrHunt:{hypothesis:'Keep my notebook'}}),lab=root(page);
 await page.getByRole('link',{name:'Explore the habitable zone',exact:true}).click();await expect(page.locator('#astronomy-hz-distance')).toBeFocused();
 for(const[id,name,r,a]of[['venus','Venus reference',.72333199,.77],['earth','Earth reference',1.00000011,.294],['mars','Mars reference',1.52366231,.25]]){
  await lab.getByRole('button',{name,exact:true}).click();const v=await linked(page);check(v);expect(v.m.reference.id).toBe(id);expect(v.m.distanceAu).toBe(r);expect(v.m.albedo).toBe(a);
  expect(Number(await page.locator('#astronomy-hz-distance').inputValue())).toBeCloseTo(Math.log10(r),12);expect(Number(await page.locator('#astronomy-hz-albedo').inputValue())).toBe(a);
 }
 const s=await saved(page);expect(s.selectedCC).toBe('agriculture');expect(s.magnitudeReference).toBe('sirius');expect(s.hrHunt.hypothesis).toBe('Keep my notebook');
 await lab.getByRole('button',{name:'Earth reference',exact:true}).click();await lab.screenshot({path:OUT+'/habitable-zone-desktop.png'});
 expect(errors).toEqual([]);
});

test('native keyboard controls keep focus and the climate boundaries remain independent of reflectivity',async({page})=>{
 const errors=await mount(page,{tab:'exoplanets'}),temp=page.locator('#astronomy-hz-temperature'),lum=page.locator('#astronomy-hz-luminosity'),albedo=page.locator('#astronomy-hz-albedo');
 const before=await linked(page);await albedo.focus();await albedo.press('ArrowRight');let v=await linked(page);check(v);
 expect(v.m.albedo).toBeCloseTo(.304,12);expect(v.bounds).toEqual(before.bounds);expect(v.m.equilibriumK).toBeLessThan(before.m.equilibriumK);await expect(albedo).toBeFocused();
 await temp.focus();await temp.press('Shift+ArrowLeft');v=await linked(page);expect(v.m.temperatureK).toBe(5272);expect(v.m.irradiance).toBe(before.m.irradiance);await expect(temp).toBeFocused();
 await lum.focus();await lum.press('Shift+ArrowRight');v=await linked(page);expect(v.m.luminosityLog).toBeCloseTo(.25,12);check(v);await expect(lum).toBeFocused();
 const range=page.locator('#astronomy-hz-distance');await range.focus();await range.press('ArrowRight');expect((await linked(page)).m.distanceLog).toBeCloseTo(Math.log10(1.00000011)+.05,12);await expect(range).toBeFocused();
 expect(errors).toEqual([]);
});

test('teaching star scenarios retain orbit assumptions and centering respects the selected climate limits',async({page})=>{
 const errors=await mount(page,{tab:'exoplanets',hzDistanceAu:2,hzAlbedo:.5}),lab=root(page);
 await lab.getByRole('button',{name:'Cool star scenario',exact:true}).click();let v=await linked(page);check(v);
 expect(v.m.temperatureK).toBe(3000);expect(v.m.luminosity).toBe(.01);expect(v.m.distanceAu).toBe(2);expect(v.m.albedo).toBe(.5);expect(v.m.reference).toBeNull();expect(v.m.regime).toBe('outer');
 await lab.getByRole('button',{name:'Move between the boundaries',exact:true}).click();v=await linked(page);check(v);expect(v.m.distanceAu).toBe(v.m.zoneCenterAu);expect(v.m.regime).toBe('within');
 await lab.getByRole('button',{name:'Hot star scenario',exact:true}).click();v=await linked(page);check(v);expect(v.m.temperatureK).toBe(7000);expect(v.m.luminosity).toBe(5);expect(v.m.albedo).toBe(.5);
 expect(errors).toEqual([]);
});

test('touch distance selection and cancellation stay usable at both bounded extremes',async({page})=>{
 const errors=await mount(page,{tab:'exoplanets'}),chart=page.locator('#astronomy-hz-orbit');await chart.scrollIntoViewIfNeeded();const box=(await chart.boundingBox())!;
 const ratio=(Math.log10(2)-Math.log10(.03))/(Math.log10(20)-Math.log10(.03));
 await page.touchscreen.tap(box.x+box.width*(44+ratio*276)/360,box.y+box.height*140/330);let v=await linked(page);check(v);expect(Math.abs(v.m.distanceLog-Math.log10(2))).toBeLessThan(.02);await expect(chart).toBeFocused();
 await chart.dispatchEvent('pointercancel',{pointerId:77,pointerType:'touch'});await chart.press('Home');v=await linked(page);check(v);expect(v.m.distanceAu).toBe(.03);await expect(chart).toBeFocused();
 await chart.press('End');v=await linked(page);check(v);expect(v.m.distanceAu).toBe(20);
 await page.locator('#astronomy-hz-luminosity').fill('-2');await page.locator('#astronomy-hz-albedo').fill('0.9');v=await linked(page);check(v);expect(v.m.flux).toBe(.000025);await expect(root(page).locator('[data-hz-metric="flux"]')).not.toContainText('0×');
 await root(page).screenshot({path:OUT+'/habitable-zone-extreme.png'});expect(errors).toEqual([]);
});

test('restored inputs keep exact published distances and reset preserves other simulator state',async({page})=>{
 let errors=await mount(page,{tab:'exoplanets',hzTemperatureK:'5772',hzLuminosity:'1',hzDistanceAu:'.72333199',hzAlbedo:'.77',transitTime:.43,selectedCC:'moonlanding'});
 let v=await linked(page);check(v);expect(v.m.reference.id).toBe('venus');const restored=await saved(page);errors.push(...await mount(page,restored));v=await linked(page);expect(v.m.distanceAu).toBe(.72333199);expect(v.m.albedo).toBe(.77);
 errors.push(...await mount(page,{...restored,hzTemperatureK:[],hzLuminosity:true,hzDistanceAu:{bad:1},hzAlbedo:'not a number'}));v=await linked(page);check(v);expect(v.m.reference.id).toBe('earth');
 await root(page).getByRole('button',{name:'Hot star scenario',exact:true}).click();await root(page).getByRole('button',{name:'Reset habitable-zone explorer',exact:true}).click();v=await linked(page);expect(v.m.reference.id).toBe('earth');
 const state=await saved(page);expect(state.transitTime).toBe(.43);expect(state.selectedCC).toBe('moonlanding');expect(errors).toEqual([]);
});

test('320px contrast layout has legible diagrams, a usable catalogue and clear model limits',async({page})=>{
 await page.setViewportSize({width:320,height:900});const errors=await mount(page,{tab:'exoplanets'},true),lab=root(page);
 await lab.getByText('Published inputs and model limits',{exact:true}).click();
 await expect(lab).toContainText('Measurement uncertainty is not propagated');await expect(lab).toContainText('5,780 K polynomial offset');await expect(lab).toContainText('no greenhouse warming');
 const geometry=await lab.evaluate(el=>{
  return {overflow:el.scrollWidth>el.clientWidth+1,background:getComputedStyle(el).backgroundColor,svgs:Array.from(el.querySelectorAll('svg')).map(svg=>{
   const view=svg.viewBox.baseVal,scale=svg.getBoundingClientRect().width/view.width;
   return {id:svg.id,text:Array.from(svg.querySelectorAll('text')).map(t=>{
    const b=t.getBBox(),matrix=svg.getScreenCTM()!.inverse().multiply(t.getScreenCTM()!),points=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(matrix));
    return {label:t.textContent,font:parseFloat(getComputedStyle(t).fontSize)*scale,left:Math.min(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),right:Math.max(...points.map(p=>p.x)),bottom:Math.max(...points.map(p=>p.y)),width:view.width,height:view.height};
   })};
  }),targets:Array.from(el.querySelectorAll('button,input,summary,a')).map(n=>({label:n.textContent,height:n.getBoundingClientRect().height})),
  table:{overflow:el.querySelector('table')!.scrollWidth>el.querySelector('table')!.clientWidth+1,columnHeaders:el.querySelectorAll('thead th[scope="col"]').length,rowHeaders:el.querySelectorAll('tbody th[scope="row"]').length}};
 });
 writeFileSync(OUT+'/phone-geometry.json',JSON.stringify(geometry,null,2)+'\n');
 expect(geometry.overflow).toBe(false);expect(geometry.background).toBe('rgb(0, 0, 0)');expect(geometry.svgs).toHaveLength(2);expect(geometry.table).toEqual({overflow:false,columnHeaders:4,rowHeaders:3});
 for(const svg of geometry.svgs)for(const t of svg.text){expect(t.font,svg.id+' '+t.label).toBeGreaterThanOrEqual(11);expect(t.left).toBeGreaterThanOrEqual(-.5);expect(t.top).toBeGreaterThanOrEqual(-.5);expect(t.right).toBeLessThanOrEqual(t.width+.5);expect(t.bottom).toBeLessThanOrEqual(t.height+.5);}
 for(const svg of geometry.svgs)for(let i=0;i<svg.text.length;i++)for(let j=i+1;j<svg.text.length;j++){
  const a=svg.text[i],b=svg.text[j];expect(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1,svg.id+' '+a.label+' overlaps '+b.label).toBe(false);
 }
 const axis=geometry.svgs.find(s=>s.id==='astronomy-hz-orbit')!.text.filter(t=>['0.03','0.1','1','10','20'].includes(t.label||'')).sort((a,b)=>a.left-b.left);
 for(let i=1;i<axis.length;i++)expect((axis[i].left-axis[i-1].right)*206/360,'distance labels need separation').toBeGreaterThanOrEqual(4);
 for(const target of geometry.targets)expect(target.height,target.label||'range').toBeGreaterThanOrEqual(44);
 await lab.screenshot({path:OUT+'/habitable-zone-phone-contrast.png'});await lab.locator('figure').first().screenshot({path:OUT+'/habitable-zone-orbit-phone.png'});await lab.locator('figure').nth(1).screenshot({path:OUT+'/habitable-zone-energy-phone.png'});await page.locator('#astronomy-hz-catalog').screenshot({path:OUT+'/habitable-zone-catalog-phone.png'});
 await expect(lab.getByRole('link',{name:'Kopparapu 2014 · Climate boundaries'})).toHaveAttribute('href','https://arxiv.org/abs/1404.5292');expect(errors).toEqual([]);
});
