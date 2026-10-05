import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = 'reports/sky-lab-tidal-forcing-2026-10-01';
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

const root=page=>page.locator('#astronomy-tidal-forcing-lab');
const saved=page=>page.evaluate(()=>(window as any).__toolData.astronomy);
const linked=page=>page.evaluate(()=>{
 const m=(window as any).__alloAstroPure.tidalForcingModel((window as any).__toolData.astronomy),el=document.querySelector('#astronomy-tidal-forcing-lab')!;
 const circle=selector=>{const n=el.querySelector(selector)!;return{x:Number(n.getAttribute('cx')),y:Number(n.getAttribute('cy'))};};
 return{m,metrics:Object.fromEntries(Array.from(el.querySelectorAll('[data-tf-metric]')).map(n=>[n.getAttribute('data-tf-metric'),Number(n.getAttribute('data-value'))])),
 selected:{...circle('[data-tf-selected]'),value:Number(el.querySelector('[data-tf-selected]')!.getAttribute('data-value')),hours:Number(el.querySelector('[data-tf-selected]')!.getAttribute('data-hours'))},
 moon:circle('[data-tf-moon]'),observer:circle('[data-tf-observer]'),regime:el.querySelector('[data-regime]')!.getAttribute('data-regime'),
 curves:Array.from(el.querySelectorAll('[data-tf-path]')).map(n=>({id:n.getAttribute('data-tf-path')!,points:n.getAttribute('points')!.split(' ').map(p=>p.split(',').map(Number))}))};
});
function check(v){
 const x=h=>64+h/48*270,y=q=>45+(1.8-q)/3.6*210;
 for(const k of ['moonStrength','sunStrength','illumination'])expect(v.metrics[k]).toBe(v.m[k]);expect(v.metrics.amplitude).toBe(v.m.current.amplitude);
 expect(v.selected.value).toBe(v.m.current.total);expect(v.selected.hours).toBe(v.m.hours);expect(v.selected.x).toBeCloseTo(x(v.m.hours),10);expect(v.selected.y).toBeCloseTo(y(v.m.current.total),10);
 expect(v.moon.x).toBeCloseTo(156+100*Math.cos(v.m.current.angle),10);expect(v.moon.y).toBeCloseTo(178-100*Math.sin(v.m.current.angle),10);
 expect(v.observer.x).toBeCloseTo(156+37*Math.cos(v.m.current.observerAngle),10);expect(v.observer.y).toBeCloseTo(178-37*Math.sin(v.m.current.observerAngle),10);expect(v.regime).toBe(v.m.regime);
 for(const curve of v.curves){expect(curve.points).toHaveLength(193);for(let i=0;i<193;i++){expect(curve.points[i][0]).toBeCloseTo(x(v.m.points[i].hours),10);expect(curve.points[i][1]).toBeCloseTo(y(v.m.points[i][curve.id]),10);}}
}

test('phase presets link geometry and forcing while preserving other investigations',async({page})=>{
 const errors=await mount(page,{tab:'moon',moonAgeDays:4,magnitudeReference:'sirius',hzDistanceAu:2,hrHunt:{hypothesis:'Keep my notebook'}}),lab=root(page);
 await page.getByRole('link',{name:'Explore tides and lunar alignment',exact:true}).click();await expect(page.locator('#astronomy-tf-time')).toBeFocused();
 for(const[name,phase,regime,light]of[['New moon',0,'spring',0],['Full moon',.5,'spring',1],['First quarter',.25,'neap',.5],['Last quarter',.75,'neap',.5]]){
  await lab.getByRole('button',{name,exact:true}).click();const v=await linked(page);check(v);expect(v.m.phaseStart).toBe(phase);expect(v.m.regime).toBe(regime);expect(v.m.illumination).toBeCloseTo(light,12);expect(v.m.hours).toBe(0);
 }
 const s=await saved(page);expect(s.moonAgeDays).toBe(4);expect(s.magnitudeReference).toBe('sirius');expect(s.hzDistanceAu).toBe(2);expect(s.hrHunt.hypothesis).toBe('Keep my notebook');
 await lab.getByRole('button',{name:'New moon',exact:true}).click();await lab.screenshot({path:OUT+'/tidal-forcing-desktop.png'});expect(errors).toEqual([]);
});

test('keyboard controls keep focus, exact increments and documented bounds',async({page})=>{
 const errors=await mount(page,{tab:'moon',tideHours:13}),phase=page.locator('#astronomy-tf-phase'),distance=page.locator('#astronomy-tf-distance'),time=page.locator('#astronomy-tf-time'),chart=page.locator('#astronomy-tf-chart');
 await phase.focus();await phase.press('Shift+ArrowRight');let v=await linked(page);check(v);expect(v.m.phaseStart).toBeCloseTo(.05,12);expect(v.m.hours).toBe(0);await expect(phase).toBeFocused();
 await distance.focus();await distance.press('Shift+ArrowRight');v=await linked(page);expect(v.m.distanceKm).toBe(386900);await expect(distance).toBeFocused();
 await time.focus();await time.press('ArrowRight');v=await linked(page);expect(v.m.hours).toBe(.5);await expect(time).toBeFocused();
 await chart.focus();await chart.press('Shift+ArrowRight');v=await linked(page);check(v);expect(v.m.hours).toBe(3);await expect(chart).toBeFocused();
 await chart.press('End');v=await linked(page);check(v);expect(v.m.hours).toBe(48);await expect(chart).toHaveAttribute('aria-valuenow','48');
 await chart.press('ArrowRight');expect((await linked(page)).m.hours).toBe(48);await chart.press('Home');expect((await linked(page)).m.hours).toBe(0);
 await distance.focus();await distance.press('End');expect((await linked(page)).m.distanceKm).toBe(405500);await distance.press('Home');expect((await linked(page)).m.distanceKm).toBe(363300);
 expect(errors).toEqual([]);
});

test('published distance examples and Moon-only mode keep solar contribution independent',async({page})=>{
 const errors=await mount(page,{tab:'moon',tidePhaseStart:.25}),lab=root(page);
 const values=[];
 for(const[name,d]of[['Mean perigee',363300],['Mean distance',384400],['Mean apogee',405500]]){
  await lab.getByRole('button',{name,exact:true}).click();const v=await linked(page);check(v);expect(v.m.distanceKm).toBe(d);values.push(v.m);
 }
 expect(values[0].moonStrength/values[2].moonStrength).toBeCloseTo((405500/363300)**3,12);expect(values[0].sunStrength).toBe(values[2].sunStrength);
 await lab.getByRole('button',{name:'Moon only',exact:true}).click();let v=await linked(page);check(v);expect(v.m.sunStrength).toBe(0);expect(v.m.regime).toBe('moonOnly');await expect(lab.getByRole('button',{name:'Moon only',exact:true})).toHaveAttribute('aria-pressed','true');
 await lab.getByRole('button',{name:'Moon + Sun',exact:true}).click();v=await linked(page);check(v);expect(v.m.sunStrength).toBe(values[0].sunStrength);expect(v.m.phaseStart).toBe(.25);expect(errors).toEqual([]);
});

test('touch time selection and pointer cancellation retain usable keyboard controls',async({page})=>{
 const errors=await mount(page,{tab:'moon'}),chart=page.locator('#astronomy-tf-chart');await chart.scrollIntoViewIfNeeded();const box=(await chart.boundingBox())!;
 await page.touchscreen.tap(box.x+box.width*199/360,box.y+box.height*150/360);let v=await linked(page);check(v);expect(Math.abs(v.m.hours-24)).toBeLessThan(.15);await expect(chart).toBeFocused();
 await chart.dispatchEvent('pointercancel',{pointerId:77,pointerType:'touch'});await chart.press('Home');v=await linked(page);check(v);expect(v.m.hours).toBe(0);
 await chart.press('End');v=await linked(page);check(v);expect(v.m.hours).toBe(48);await expect(chart).toBeFocused();
 await chart.scrollIntoViewIfNeeded();const dragBox=(await chart.boundingBox())!,yy=dragBox.y+dragBox.height*150/360;
 await page.mouse.move(dragBox.x+dragBox.width*131.5/360,yy);await page.mouse.down();await page.mouse.move(dragBox.x+dragBox.width*266.5/360,yy,{steps:4});await page.mouse.up();
 v=await linked(page);check(v);expect(Math.abs(v.m.hours-36)).toBeLessThan(.15);await expect(chart).toBeFocused();
 await page.locator('#astronomy-tf-phase').fill('0.5');v=await linked(page);check(v);expect(v.m.hours).toBe(0);expect(v.m.regime).toBe('spring');expect(errors).toEqual([]);
});

test('restored values recover malformed inputs and reset only the tide experiment',async({page})=>{
 let errors=await mount(page,{tab:'moon',tidePhaseStart:'.25',tideHours:'12.345',tideDistanceKm:'363300',tideIncludeSun:false,moonAgeDays:8.8,transitTime:.43,selectedCC:'moonlanding'});
 let v=await linked(page);check(v);expect(v.m.hours).toBe(12.345);expect(v.m.phaseStart).toBe(.25);expect(v.m.distanceKm).toBe(363300);expect(v.m.includeSun).toBe(false);
 const restored=await saved(page);errors.push(...await mount(page,restored));v=await linked(page);check(v);expect(v.m.hours).toBe(12.345);
 errors.push(...await mount(page,{...restored,tidePhaseStart:[],tideHours:true,tideDistanceKm:{bad:1},tideIncludeSun:'false'}));v=await linked(page);check(v);expect([v.m.phaseStart,v.m.hours,v.m.distanceKm,v.m.includeSun]).toEqual([0,0,384400,true]);
 await root(page).getByRole('button',{name:'Full moon',exact:true}).click();await root(page).getByRole('button',{name:'Reset tide explorer',exact:true}).click();v=await linked(page);check(v);expect([v.m.phaseStart,v.m.hours,v.m.distanceKm,v.m.includeSun]).toEqual([0,0,384400,true]);
 const s=await saved(page);expect(s.moonAgeDays).toBe(8.8);expect(s.transitTime).toBe(.43);expect(s.selectedCC).toBe('moonlanding');expect(errors).toEqual([]);
});

test('320px contrast layout has legible linked diagrams, source inputs and clear model limits',async({page})=>{
 await page.setViewportSize({width:320,height:900});const errors=await mount(page,{tab:'moon'},true),lab=root(page);
 await expect(lab.locator('summary')).toHaveCSS('display','list-item'); await lab.getByText('Published inputs and model limits',{exact:true}).click();await expect(lab).toContainText('Both are converted to km³/s²');await expect(lab).toContainText('they do not show local sea level');await expect(lab).toContainText('Real coasts can have one, two unequal');
 await expect(page.locator('#astronomy-tf-inputs')).toContainText('1.3271244 × 10¹¹ km³/s²');await expect(lab).toContainText('rounded for display');
 const geometry=await lab.evaluate(el=>({
  overflow:el.scrollWidth>el.clientWidth+1,background:getComputedStyle(el).backgroundColor,
  svgs:Array.from(el.querySelectorAll('svg')).map(svg=>{
   const view=svg.viewBox.baseVal,scale=svg.getBoundingClientRect().width/view.width;
   return{id:svg.id,text:Array.from(svg.querySelectorAll('text')).map(t=>{
    const b=t.getBBox(),matrix=svg.getScreenCTM()!.inverse().multiply(t.getScreenCTM()!),points=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(matrix));
    return{label:t.textContent,font:parseFloat(getComputedStyle(t).fontSize)*scale,left:Math.min(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),right:Math.max(...points.map(p=>p.x)),bottom:Math.max(...points.map(p=>p.y)),width:view.width,height:view.height};
   })};
  }),
  targets:Array.from(el.querySelectorAll('button,input,summary,a')).map(n=>({label:n.textContent,height:n.getBoundingClientRect().height})),
  table:{overflow:el.querySelector('table')!.scrollWidth>el.querySelector('table')!.clientWidth+1,columnHeaders:el.querySelectorAll('thead th[scope="col"]').length,rowHeaders:el.querySelectorAll('tbody th[scope="row"]').length}
 }));
 writeFileSync(OUT+'/phone-geometry.json',JSON.stringify(geometry,null,2)+'\n');
 expect(geometry.overflow).toBe(false);expect(geometry.background).toBe('rgb(0, 0, 0)');expect(geometry.svgs).toHaveLength(2);expect(geometry.table).toEqual({overflow:false,columnHeaders:2,rowHeaders:6});
 for(const svg of geometry.svgs)for(const t of svg.text){expect(t.font,svg.id+' '+t.label).toBeGreaterThanOrEqual(11);expect(t.left).toBeGreaterThanOrEqual(-.5);expect(t.top).toBeGreaterThanOrEqual(-.5);expect(t.right).toBeLessThanOrEqual(t.width+.5);expect(t.bottom).toBeLessThanOrEqual(t.height+.5);}
 for(const svg of geometry.svgs)for(let i=0;i<svg.text.length;i++)for(let j=i+1;j<svg.text.length;j++){
  const a=svg.text[i],b=svg.text[j];expect(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1,svg.id+' '+a.label+' overlaps '+b.label).toBe(false);
 }
 for(const target of geometry.targets)expect(target.height,target.label||'range').toBeGreaterThanOrEqual(44);
 await lab.screenshot({path:OUT+'/tidal-forcing-phone-contrast.png'});await lab.locator('figure').first().screenshot({path:OUT+'/tidal-geometry-phone.png'});await lab.locator('figure').nth(1).screenshot({path:OUT+'/tidal-curve-phone.png'});await page.locator('#astronomy-tf-inputs').screenshot({path:OUT+'/tidal-inputs-phone.png'});
 await expect(lab.getByRole('link',{name:'NOAA · Local tide observations and predictions',exact:true})).toHaveAttribute('href','https://tidesandcurrents.noaa.gov/map/');expect(errors).toEqual([]);
});

test('Moon GPU drawing pauses outside the viewport and resumes with the latest model',async({page})=>{
 const errors=await mount(page,{tab:'moon',moonAgeDays:4}),lab=root(page);
 await lab.scrollIntoViewIfNeeded();
 const debug=()=>page.evaluate(()=>(window as any).__alloAstroMoonGL.debug());
 await expect.poll(async()=>(await debug()).state,{timeout:60000}).toBe('ready');
 await page.waitForTimeout(250);const outside=(await debug()).renderCount;
 await page.evaluate(()=>{(window as any).__toolData.astronomy.moonAgeDays=9;(window as any).__bump();});
 await expect.poll(async()=>(await debug()).ageDays).toBe(9);await page.waitForTimeout(250);expect((await debug()).renderCount).toBe(outside);
 const canvas=page.locator('canvas[data-astro-moon-gl]');await canvas.scrollIntoViewIfNeeded();
 await expect.poll(async()=>(await debug()).renderCount,{timeout:60000}).toBeGreaterThan(outside);
 const visible=await debug();expect(visible.ageDays).toBe(9);
 await lab.scrollIntoViewIfNeeded();await page.waitForTimeout(250);const stopped=(await debug()).renderCount;
 await lab.getByRole('button',{name:'Full moon',exact:true}).click();await page.waitForTimeout(250);expect((await debug()).renderCount).toBe(stopped);
 writeFileSync(OUT+'/moon-render-visibility.json',JSON.stringify({initialOffscreenRenderCount:outside,visibleRenderCount:visible.renderCount,returnedOffscreenRenderCount:stopped,latestAgeDays:visible.ageDays,pausedWhileOffscreen:true,resumedWhenVisible:true},null,2)+'\n');expect(errors).toEqual([]);
});
