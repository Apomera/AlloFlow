# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: astronomy-tidal-forcing.spec.ts >> phase presets link geometry and forcing while preserving other investigations
- Location: tests\e2e\astronomy-tidal-forcing.spec.ts:64:5

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Test timeout of 120000ms exceeded while running "afterEach" hook.
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { createServer, Server } from 'node:http';
  3   | import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
  4   | import { readFile } from 'node:fs/promises';
  5   | import { extname, resolve, sep } from 'node:path';
  6   | 
  7   | const ROOT = process.cwd();
  8   | const OUT = 'reports/sky-lab-tidal-forcing-2026-10-01';
  9   | const HARNESS = readFileSync('tests/e2e/astronomy-observatory-3d.spec.ts', 'utf8').split('const HARNESS = `')[1].split('`;')[0]
  10  |   .replace("gradeLevel: '8th Grade',", "gradeLevel: '8th Grade', isContrast: window.__contrast === true, theme: window.__contrast ? 'contrast' : 'dark',");
  11  | let server: Server, base: string;
  12  | test.use({ video: 'off', hasTouch: true, viewport: { width: 1280, height: 980 }, reducedMotion: 'reduce', launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
  13  | test.describe.configure({ timeout: 120000 });
  14  | test.beforeAll(async () => {
  15  |   mkdirSync(OUT, { recursive: true });
  16  |   server = createServer(async (req, res) => {
  17  |     if (req.url === '/__simulators') { res.setHeader('content-type', 'text/html'); res.end(HARNESS); return; }
  18  |     const file = resolve(ROOT, '.' + decodeURIComponent((req.url || '/').split('?')[0]));
  19  |     if (!file.startsWith(ROOT + sep)) { res.writeHead(403); res.end(); return; }
  20  |     try {
  21  |       res.setHeader('content-type', ({ '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' })[extname(file)] || 'text/plain');
  22  |       res.end(await readFile(file));
  23  |     } catch { res.writeHead(404); res.end(); }
  24  |   });
  25  |   await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  26  |   base = `http://127.0.0.1:${(server.address() as any).port}`;
  27  | });
  28  | test.afterAll(async () => { await new Promise<void>(done => server.close(() => done())); });
> 29  | test.afterEach(async ({ page }) => {
      |      ^ Test timeout of 120000ms exceeded while running "afterEach" hook.
  30  |   try {
  31  |     const events = await page.evaluate(() => (window as any).__events);
  32  |     expect(events).toEqual({ errors: [], rejections: [] });
  33  |   } finally {
  34  |     await page.evaluate(() => (window as any).__destroy?.()).catch(() => {});
  35  |   }
  36  | });
  37  | async function mount(page, state, contrast = false) {
  38  |   const errors: string[] = [];
  39  |   page.on('pageerror', error => errors.push(error.message));
  40  |   await page.goto(base + '/__simulators');
  41  |   await page.evaluate(({ state, contrast }) => { (window as any).__contrast = contrast; (window as any).__mount(state); }, { state, contrast });
  42  |   return errors;
  43  | }
  44  | 
  45  | const root=page=>page.locator('#astronomy-tidal-forcing-lab');
  46  | const saved=page=>page.evaluate(()=>(window as any).__toolData.astronomy);
  47  | const linked=page=>page.evaluate(()=>{
  48  |  const m=(window as any).__alloAstroPure.tidalForcingModel((window as any).__toolData.astronomy),el=document.querySelector('#astronomy-tidal-forcing-lab')!;
  49  |  const circle=selector=>{const n=el.querySelector(selector)!;return{x:Number(n.getAttribute('cx')),y:Number(n.getAttribute('cy'))};};
  50  |  return{m,metrics:Object.fromEntries(Array.from(el.querySelectorAll('[data-tf-metric]')).map(n=>[n.getAttribute('data-tf-metric'),Number(n.getAttribute('data-value'))])),
  51  |  selected:{...circle('[data-tf-selected]'),value:Number(el.querySelector('[data-tf-selected]')!.getAttribute('data-value')),hours:Number(el.querySelector('[data-tf-selected]')!.getAttribute('data-hours'))},
  52  |  moon:circle('[data-tf-moon]'),observer:circle('[data-tf-observer]'),regime:el.querySelector('[data-regime]')!.getAttribute('data-regime'),
  53  |  curves:Array.from(el.querySelectorAll('[data-tf-path]')).map(n=>({id:n.getAttribute('data-tf-path')!,points:n.getAttribute('points')!.split(' ').map(p=>p.split(',').map(Number))}))};
  54  | });
  55  | function check(v){
  56  |  const x=h=>64+h/48*270,y=q=>45+(1.8-q)/3.6*210;
  57  |  for(const k of ['moonStrength','sunStrength','illumination'])expect(v.metrics[k]).toBe(v.m[k]);expect(v.metrics.amplitude).toBe(v.m.current.amplitude);
  58  |  expect(v.selected.value).toBe(v.m.current.total);expect(v.selected.hours).toBe(v.m.hours);expect(v.selected.x).toBeCloseTo(x(v.m.hours),10);expect(v.selected.y).toBeCloseTo(y(v.m.current.total),10);
  59  |  expect(v.moon.x).toBeCloseTo(156+100*Math.cos(v.m.current.angle),10);expect(v.moon.y).toBeCloseTo(178-100*Math.sin(v.m.current.angle),10);
  60  |  expect(v.observer.x).toBeCloseTo(156+37*Math.cos(v.m.current.observerAngle),10);expect(v.observer.y).toBeCloseTo(178-37*Math.sin(v.m.current.observerAngle),10);expect(v.regime).toBe(v.m.regime);
  61  |  for(const curve of v.curves){expect(curve.points).toHaveLength(193);for(let i=0;i<193;i++){expect(curve.points[i][0]).toBeCloseTo(x(v.m.points[i].hours),10);expect(curve.points[i][1]).toBeCloseTo(y(v.m.points[i][curve.id]),10);}}
  62  | }
  63  | 
  64  | test('phase presets link geometry and forcing while preserving other investigations',async({page})=>{
  65  |  const errors=await mount(page,{tab:'moon',moonAgeDays:4,magnitudeReference:'sirius',hzDistanceAu:2,hrHunt:{hypothesis:'Keep my notebook'}}),lab=root(page);
  66  |  await page.getByRole('link',{name:'Explore tides and lunar alignment',exact:true}).click();await expect(page.locator('#astronomy-tf-time')).toBeFocused();
  67  |  for(const[name,phase,regime,light]of[['New moon',0,'spring',0],['Full moon',.5,'spring',1],['First quarter',.25,'neap',.5],['Last quarter',.75,'neap',.5]]){
  68  |   await lab.getByRole('button',{name,exact:true}).click();const v=await linked(page);check(v);expect(v.m.phaseStart).toBe(phase);expect(v.m.regime).toBe(regime);expect(v.m.illumination).toBeCloseTo(light,12);expect(v.m.hours).toBe(0);
  69  |  }
  70  |  const s=await saved(page);expect(s.moonAgeDays).toBe(4);expect(s.magnitudeReference).toBe('sirius');expect(s.hzDistanceAu).toBe(2);expect(s.hrHunt.hypothesis).toBe('Keep my notebook');
  71  |  await lab.getByRole('button',{name:'New moon',exact:true}).click();await lab.screenshot({path:OUT+'/tidal-forcing-desktop.png'});expect(errors).toEqual([]);
  72  | });
  73  | 
  74  | test('keyboard controls keep focus, exact increments and documented bounds',async({page})=>{
  75  |  const errors=await mount(page,{tab:'moon',tideHours:13}),phase=page.locator('#astronomy-tf-phase'),distance=page.locator('#astronomy-tf-distance'),time=page.locator('#astronomy-tf-time'),chart=page.locator('#astronomy-tf-chart');
  76  |  await phase.focus();await phase.press('Shift+ArrowRight');let v=await linked(page);check(v);expect(v.m.phaseStart).toBeCloseTo(.05,12);expect(v.m.hours).toBe(0);await expect(phase).toBeFocused();
  77  |  await distance.focus();await distance.press('Shift+ArrowRight');v=await linked(page);expect(v.m.distanceKm).toBe(386900);await expect(distance).toBeFocused();
  78  |  await time.focus();await time.press('ArrowRight');v=await linked(page);expect(v.m.hours).toBe(.5);await expect(time).toBeFocused();
  79  |  await chart.focus();await chart.press('Shift+ArrowRight');v=await linked(page);check(v);expect(v.m.hours).toBe(3);await expect(chart).toBeFocused();
  80  |  await chart.press('End');v=await linked(page);check(v);expect(v.m.hours).toBe(48);await expect(chart).toHaveAttribute('aria-valuenow','48');
  81  |  await chart.press('ArrowRight');expect((await linked(page)).m.hours).toBe(48);await chart.press('Home');expect((await linked(page)).m.hours).toBe(0);
  82  |  await distance.focus();await distance.press('End');expect((await linked(page)).m.distanceKm).toBe(405500);await distance.press('Home');expect((await linked(page)).m.distanceKm).toBe(363300);
  83  |  expect(errors).toEqual([]);
  84  | });
  85  | 
  86  | test('published distance examples and Moon-only mode keep solar contribution independent',async({page})=>{
  87  |  const errors=await mount(page,{tab:'moon',tidePhaseStart:.25}),lab=root(page);
  88  |  const values=[];
  89  |  for(const[name,d]of[['Mean perigee',363300],['Mean distance',384400],['Mean apogee',405500]]){
  90  |   await lab.getByRole('button',{name,exact:true}).click();const v=await linked(page);check(v);expect(v.m.distanceKm).toBe(d);values.push(v.m);
  91  |  }
  92  |  expect(values[0].moonStrength/values[2].moonStrength).toBeCloseTo((405500/363300)**3,12);expect(values[0].sunStrength).toBe(values[2].sunStrength);
  93  |  await lab.getByRole('button',{name:'Moon only',exact:true}).click();let v=await linked(page);check(v);expect(v.m.sunStrength).toBe(0);expect(v.m.regime).toBe('moonOnly');await expect(lab.getByRole('button',{name:'Moon only',exact:true})).toHaveAttribute('aria-pressed','true');
  94  |  await lab.getByRole('button',{name:'Moon + Sun',exact:true}).click();v=await linked(page);check(v);expect(v.m.sunStrength).toBe(values[0].sunStrength);expect(v.m.phaseStart).toBe(.25);expect(errors).toEqual([]);
  95  | });
  96  | 
  97  | test('touch time selection and pointer cancellation retain usable keyboard controls',async({page})=>{
  98  |  const errors=await mount(page,{tab:'moon'}),chart=page.locator('#astronomy-tf-chart');await chart.scrollIntoViewIfNeeded();const box=(await chart.boundingBox())!;
  99  |  await page.touchscreen.tap(box.x+box.width*199/360,box.y+box.height*150/360);let v=await linked(page);check(v);expect(Math.abs(v.m.hours-24)).toBeLessThan(.15);await expect(chart).toBeFocused();
  100 |  await chart.dispatchEvent('pointercancel',{pointerId:77,pointerType:'touch'});await chart.press('Home');v=await linked(page);check(v);expect(v.m.hours).toBe(0);
  101 |  await chart.press('End');v=await linked(page);check(v);expect(v.m.hours).toBe(48);await expect(chart).toBeFocused();
  102 |  await page.locator('#astronomy-tf-phase').fill('0.5');v=await linked(page);check(v);expect(v.m.hours).toBe(0);expect(v.m.regime).toBe('spring');expect(errors).toEqual([]);
  103 | });
  104 | 
  105 | test('restored values recover malformed inputs and reset only the tide experiment',async({page})=>{
  106 |  let errors=await mount(page,{tab:'moon',tidePhaseStart:'.25',tideHours:'12.345',tideDistanceKm:'363300',tideIncludeSun:false,moonAgeDays:8.8,transitTime:.43,selectedCC:'moonlanding'});
  107 |  let v=await linked(page);check(v);expect(v.m.hours).toBe(12.345);expect(v.m.phaseStart).toBe(.25);expect(v.m.distanceKm).toBe(363300);expect(v.m.includeSun).toBe(false);
  108 |  const restored=await saved(page);errors.push(...await mount(page,restored));v=await linked(page);check(v);expect(v.m.hours).toBe(12.345);
  109 |  errors.push(...await mount(page,{...restored,tidePhaseStart:[],tideHours:true,tideDistanceKm:{bad:1},tideIncludeSun:'false'}));v=await linked(page);check(v);expect([v.m.phaseStart,v.m.hours,v.m.distanceKm,v.m.includeSun]).toEqual([0,0,384400,true]);
  110 |  await root(page).getByRole('button',{name:'Full moon',exact:true}).click();await root(page).getByRole('button',{name:'Reset tide explorer',exact:true}).click();v=await linked(page);check(v);expect([v.m.phaseStart,v.m.hours,v.m.distanceKm,v.m.includeSun]).toEqual([0,0,384400,true]);
  111 |  const s=await saved(page);expect(s.moonAgeDays).toBe(8.8);expect(s.transitTime).toBe(.43);expect(s.selectedCC).toBe('moonlanding');expect(errors).toEqual([]);
  112 | });
  113 | 
  114 | test('320px contrast layout has legible linked diagrams, source inputs and clear model limits',async({page})=>{
  115 |  await page.setViewportSize({width:320,height:900});const errors=await mount(page,{tab:'moon'},true),lab=root(page);
  116 |  await lab.getByText('Published inputs and model limits',{exact:true}).click();await expect(lab).toContainText('Both are converted to km³/s²');await expect(lab).toContainText('they do not show local sea level');await expect(lab).toContainText('Real coasts can have one, two unequal');
  117 |  const geometry=await lab.evaluate(el=>({
  118 |   overflow:el.scrollWidth>el.clientWidth+1,background:getComputedStyle(el).backgroundColor,
  119 |   svgs:Array.from(el.querySelectorAll('svg')).map(svg=>{
  120 |    const view=svg.viewBox.baseVal,scale=svg.getBoundingClientRect().width/view.width;
  121 |    return{id:svg.id,text:Array.from(svg.querySelectorAll('text')).map(t=>{
  122 |     const b=t.getBBox(),matrix=svg.getScreenCTM()!.inverse().multiply(t.getScreenCTM()!),points=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(matrix));
  123 |     return{label:t.textContent,font:parseFloat(getComputedStyle(t).fontSize)*scale,left:Math.min(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),right:Math.max(...points.map(p=>p.x)),bottom:Math.max(...points.map(p=>p.y)),width:view.width,height:view.height};
  124 |    })};
  125 |   }),
  126 |   targets:Array.from(el.querySelectorAll('button,input,summary,a')).map(n=>({label:n.textContent,height:n.getBoundingClientRect().height})),
  127 |   table:{overflow:el.querySelector('table')!.scrollWidth>el.querySelector('table')!.clientWidth+1,columnHeaders:el.querySelectorAll('thead th[scope="col"]').length,rowHeaders:el.querySelectorAll('tbody th[scope="row"]').length}
  128 |  }));
  129 |  writeFileSync(OUT+'/phone-geometry.json',JSON.stringify(geometry,null,2)+'\n');
```