import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = 'reports/sky-lab-brightness-2026-10-01';
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












const root=page=>page.locator('#astronomy-magnitude-lab');
const saved=page=>page.evaluate(()=>(window as any).__toolData.astronomy);
const linked=page=>page.evaluate(()=>{
 const m=(window as any).__alloAstroPure.magnitudeModel((window as any).__toolData.astronomy),el=document.querySelector('#astronomy-magnitude-lab')!;
 return {m,values:Object.fromEntries(Array.from(el.querySelectorAll('[data-magnitude-metric]')).map(n=>[n.getAttribute('data-magnitude-metric'),Number(n.getAttribute('data-value'))])),
  curveDistance:Number(el.querySelector('#astronomy-magnitude-curve')!.getAttribute('data-distance-pc')),
  point:{x:Number(el.querySelector('[data-magnitude-selected]')!.getAttribute('cx')),y:Number(el.querySelector('[data-magnitude-selected]')!.getAttribute('cy')),value:Number(el.querySelector('[data-magnitude-selected]')!.getAttribute('data-value'))},
  paths:Object.fromEntries(Array.from(el.querySelectorAll('[data-magnitude-path]')).map(n=>[n.getAttribute('data-magnitude-path'),n.getAttribute('points')])),
  rows:Array.from(el.querySelectorAll('[data-magnitude-flux-row]')).map(n=>({id:n.getAttribute('data-magnitude-flux-row'),value:Number(n.getAttribute('data-value')),log:Number(n.getAttribute('data-log-value')),x:Number(n.querySelector('circle')!.getAttribute('cx'))}))};
});
function check(v){
 for(const[k,value]of Object.entries(v.values))expect(value,k).toBe(v.m[k]);
 expect(v.curveDistance).toBe(v.m.distancePc);expect(v.point.value).toBe(v.m.apparentV);
 expect(v.point.x).toBe(66+(v.m.distanceLog+1)/5*264);expect(v.point.y).toBe(46+(v.m.apparentV+20)/55*214);
 for(const[key,field]of[['unextinguished','unextinguishedV'],['apparent','apparentV']])expect(v.paths[key]).toBe(v.m.points.map(p=>(66+(p.distanceLog+1)/5*264)+','+(46+(p[field]+20)/55*214)).join(' '));
 for(const row of v.rows){expect(row.value).toBe(row.id==='distance'?v.m.distanceFlux:v.m.fluxRatio);expect(row.x).toBe(30+(row.log+8)/12*300);}
}

test('published examples reproduce the catalogue, link both figures and preserve other notes',async({page})=>{
 const errors=await mount(page,{tab:'stars',hrHunt:{hypothesis:'Keep my investigation'},selectedCC:'agriculture',rotationGalaxy:'NGC6503'}),lab=root(page);
 await page.getByRole('link',{name:'Explore brightness and distance',exact:true}).click();await expect(page.locator('#astronomy-magnitude-mv')).toBeFocused();
 await expect(lab).toContainText('At zero extinction, the two curves overlap.');
 for(const[name,id]of[['Sun reference','sun'],['Sirius','sirius'],['Vega','vega']]){
  await lab.getByRole('button',{name,exact:true}).click();const v=await linked(page);check(v);expect(v.m.referenceId).toBe(id);
  expect(Number(await page.locator('#astronomy-magnitude-mv').inputValue())).toBeCloseTo(v.m.absoluteV,12);expect(Number(await page.locator('#astronomy-magnitude-distance').inputValue())).toBeCloseTo(v.m.distanceLog,12);
  if(id!=='sun')expect(v.m.apparentV).toBeCloseTo(v.m.reference.apparentV,10);
 }
 await lab.getByRole('button',{name:'100 pc',exact:true}).click();await lab.getByRole('button',{name:'A_V = 3',exact:true}).click();check(await linked(page));
 const state=await saved(page);expect(state.hrHunt.hypothesis).toBe('Keep my investigation');expect(state.selectedCC).toBe('agriculture');expect(state.rotationGalaxy).toBe('NGC6503');
 await lab.screenshot({path:OUT+'/brightness-desktop.png'});expect(errors).toEqual([]);
});

test('keyboard distance and magnitude controls preserve focus and express independent assumptions',async({page})=>{
 const errors=await mount(page,{tab:'stars'}),range=page.locator('#astronomy-magnitude-distance'),chart=page.locator('#astronomy-magnitude-curve'),mv=page.locator('#astronomy-magnitude-mv');
 await range.focus();await range.press('ArrowRight');expect((await linked(page)).m.distanceLog).toBeCloseTo(1.05,10);await expect(range).toBeFocused();
 await range.press('Shift+ArrowRight');expect((await linked(page)).m.distanceLog).toBeCloseTo(1.3,10);
 await chart.focus();await chart.press('Home');expect((await linked(page)).m.distancePc).toBe(.1);await expect(chart).toBeFocused();
 await chart.press('End');expect((await linked(page)).m.distancePc).toBe(10000);
 await mv.focus();await mv.press('ArrowRight');expect((await linked(page)).m.absoluteV).toBeCloseTo(4.91,10);expect((await saved(page)).magnitudeReference).toBe('custom');await expect(mv).toBeFocused();
 await mv.press('Shift+ArrowLeft');expect((await linked(page)).m.absoluteV).toBeCloseTo(3.91,10);
 const dust=page.locator('#astronomy-magnitude-av');await dust.focus();await dust.press('ArrowRight');expect((await linked(page)).m.extinctionV).toBe(.1);await expect(dust).toBeFocused();check(await linked(page));
 expect(errors).toEqual([]);
});

test('touch chooses distance continuously and cancellation leaves the plot usable',async({page})=>{
 const errors=await mount(page,{tab:'stars'}),chart=page.locator('#astronomy-magnitude-curve');await chart.scrollIntoViewIfNeeded();
 const box=(await chart.boundingBox())!;await page.touchscreen.tap(box.x+box.width*(66+264*3/5)/360,box.y+box.height*160/380);
 await expect(chart).toBeFocused();expect(Math.abs((await linked(page)).m.distanceLog-2)).toBeLessThan(.02);check(await linked(page));
 await chart.dispatchEvent('pointercancel',{pointerType:'touch',pointerId:91});await chart.press('Home');expect((await linked(page)).m.distancePc).toBe(.1);
 await root(page).getByRole('button',{name:'10 pc',exact:true}).click();await expect(page.locator('#astronomy-magnitude-status')).toHaveAttribute('data-regime','equal');expect(errors).toEqual([]);
});

test('five-magnitude examples give a hundredfold V-light change and bounded extremes stay visible',async({page})=>{
 const errors=await mount(page,{tab:'stars'}),lab=root(page);const base=(await linked(page)).m;
 await lab.getByRole('button',{name:'Brighten by 5 mag',exact:true}).click();let v=await linked(page);expect(v.m.vLightVsSun/base.vLightVsSun).toBeCloseTo(100,10);check(v);
 await lab.getByRole('button',{name:'Dim by 5 mag',exact:true}).click();expect((await linked(page)).m.absoluteV).toBeCloseTo(base.absoluteV,10);
 await page.locator('#astronomy-magnitude-mv').fill('15');await page.locator('#astronomy-magnitude-distance').fill('4');await page.locator('#astronomy-magnitude-av').fill('5');
 v=await linked(page);check(v);expect(v.m.apparentV).toBe(35);expect(v.m.fluxLog).toBe(-8);expect(v.point.y).toBe(260);
 await expect(lab.getByRole('button',{name:'Dim by 5 mag',exact:true})).toBeDisabled();
 await page.locator('#astronomy-magnitude-mv').fill('-10');await page.locator('#astronomy-magnitude-distance').fill('-1');await page.locator('#astronomy-magnitude-av').fill('0');
 v=await linked(page);check(v);expect(v.m.apparentV).toBe(-20);expect(v.m.fluxLog).toBe(4);expect(v.point.y).toBe(46);
 await expect(lab.getByRole('button',{name:'Brighten by 5 mag',exact:true})).toBeDisabled();
 await lab.screenshot({path:OUT+'/brightness-extreme.png'});
 await lab.getByRole('button',{name:'Reset brightness explorer',exact:true}).click();v=await linked(page);expect(v.m.referenceId).toBe('sun');expect(v.m.distancePc).toBe(10);expect(v.m.extinctionV).toBe(0);expect(errors).toEqual([]);
});

test('restored values recover without snapping catalogue distances or losing independent work',async({page})=>{
 let errors=await mount(page,{tab:'stars',magnitudeReference:'sirius',magnitudeDistancePc:'2.637061258',magnitudeAv:'1.26',hrHunt:{hypothesis:'Saved notebook'}});
 let v=await linked(page);check(v);expect(v.m.distancePc).toBe(2.637061258);expect(v.m.extinctionV).toBe(1.3);await expect(page.locator('#astronomy-magnitude-av')).toHaveValue('1.3');
 const state=await saved(page);errors.push(...await mount(page,state));v=await linked(page);expect(v.m.distancePc).toBe(2.637061258);expect(v.m.referenceId).toBe('sirius');expect((await saved(page)).hrHunt.hypothesis).toBe('Saved notebook');
 errors.push(...await mount(page,{tab:'stars',magnitudeReference:{forged:true},magnitudeMv:[],magnitudeDistancePc:true,magnitudeAv:'bad',hrHunt:{hypothesis:'Preserve me'}}));
 v=await linked(page);check(v);expect(v.m.referenceId).toBe('sun');expect(v.m.distancePc).toBe(10);expect(v.m.extinctionV).toBe(0);expect((await saved(page)).hrHunt.hypothesis).toBe('Preserve me');
 await page.locator('#astronomy-magnitude-mv').fill('2');expect((await linked(page)).m.referenceId).toBe('custom');expect((await linked(page)).m.absoluteV).toBe(2);expect(errors).toEqual([]);
});

test('320px contrast diagrams, controls and catalogue stay readable with scientific limits exposed',async({page})=>{
 await page.setViewportSize({width:320,height:900});const errors=await mount(page,{tab:'stars',magnitudeReference:'sirius',magnitudeDistancePc:100,magnitudeAv:3},true),lab=root(page);
 await lab.getByText('Published inputs and model limits',{exact:true}).click();
 await expect(lab).toContainText('ESA 1997');await expect(lab).toContainText('bolometric correction');await expect(lab).toContainText('uncertainty are not propagated');
 const geometry=await lab.evaluate(el=>{
  const svgs=Array.from(el.querySelectorAll('svg'));
  return {overflow:el.scrollWidth>el.clientWidth+1,background:getComputedStyle(el).backgroundColor,svgs:svgs.map(svg=>{
   const view=svg.viewBox.baseVal,scale=svg.getBoundingClientRect().width/view.width;
   return {id:svg.id,text:Array.from(svg.querySelectorAll('text')).map(t=>{
    const b=t.getBBox(),matrix=svg.getScreenCTM()!.inverse().multiply(t.getScreenCTM()!);const points=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(matrix));
    return {label:t.textContent,font:parseFloat(getComputedStyle(t).fontSize)*scale,left:Math.min(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),right:Math.max(...points.map(p=>p.x)),bottom:Math.max(...points.map(p=>p.y)),width:view.width,height:view.height};
   })};
  }),targets:Array.from(el.querySelectorAll('button,input,summary,a')).map(n=>({label:n.textContent,height:n.getBoundingClientRect().height})),
  table:{overflow:el.querySelector('table')!.scrollWidth>el.querySelector('table')!.clientWidth+1,columnHeaders:el.querySelectorAll('thead th[scope=\"col\"]').length,rowHeaders:el.querySelectorAll('tbody th[scope=\"row\"]').length}};
 });
 writeFileSync(OUT+'/phone-geometry.json',JSON.stringify(geometry,null,2)+'\n');
 expect(geometry.overflow).toBe(false);expect(geometry.background).toBe('rgb(0, 0, 0)');expect(geometry.svgs).toHaveLength(2);expect(geometry.table).toEqual({overflow:false,columnHeaders:4,rowHeaders:2});
 for(const svg of geometry.svgs)for(const t of svg.text){
  expect(t.font,svg.id+' '+t.label).toBeGreaterThanOrEqual(11);expect(t.left,svg.id+' '+t.label).toBeGreaterThanOrEqual(-.5);expect(t.top,svg.id+' '+t.label).toBeGreaterThanOrEqual(-.5);
  expect(t.right,svg.id+' '+t.label).toBeLessThanOrEqual(t.width+.5);expect(t.bottom,svg.id+' '+t.label).toBeLessThanOrEqual(t.height+.5);
 }
 for(const svg of geometry.svgs)for(let i=0;i<svg.text.length;i++)for(let j=i+1;j<svg.text.length;j++){
  const a=svg.text[i],b=svg.text[j];expect(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1,svg.id+' '+a.label+' overlaps '+b.label).toBe(false);
 }
 for(const t of geometry.targets)expect(t.height,t.label||'range').toBeGreaterThanOrEqual(44);
 writeFileSync(OUT+'/phone-geometry.json',JSON.stringify(geometry,null,2)+'\n');
 await lab.screenshot({path:OUT+'/brightness-phone-contrast.png'});await lab.locator('figure').first().screenshot({path:OUT+'/brightness-curve-phone.png'});await lab.locator('figure').nth(1).screenshot({path:OUT+'/brightness-flux-phone.png'});
 await page.locator('#astronomy-magnitude-catalog').screenshot({path:OUT+'/brightness-catalog-phone.png'});
 await expect(lab.getByRole('link',{name:'Willmer 2018 · Solar magnitude reference'})).toHaveAttribute('href','https://arxiv.org/abs/1804.07788');expect(errors).toEqual([]);
});
