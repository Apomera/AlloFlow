import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = 'reports/sky-lab-gravitational-wave-2026-09-30';
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





const data = page => page.evaluate(() => (window as any).__toolData.astronomy);
const state = { tab:'galaxies', observingList:[] };
async function linked(page){
 return page.evaluate(()=>{
  const w=window as any,m=w.__alloAstroPure.gravitationalWaveModel(w.__toolData.astronomy);
  return {phase:m.phase,orbit:Number(document.querySelector('#astronomy-wave-orbit')?.getAttribute('data-wave-phase')),chart:Number(document.querySelector('#astronomy-wave-curve')?.getAttribute('data-wave-strain')),
   strain:m.current.strain,diagram:Number(document.querySelector('#astronomy-interferometer-diagram')?.getAttribute('data-wave-strain')),readout:Number(document.querySelector('[data-wave-strain-value]')?.getAttribute('data-wave-strain-value')),
   difference:m.current.differential,diagramDifference:Number(document.querySelector('#astronomy-interferometer-diagram')?.getAttribute('data-wave-differential')),readoutDifference:Number(document.querySelector('[data-wave-difference]')?.getAttribute('data-wave-difference'))};
 });
}
test('one orbit links two signal cycles, the moving black holes and opposite arm changes',async({page})=>{
 const errors=await mount(page,state),lab=page.locator('#astronomy-wave-lab');
 await expect(lab.locator('#astronomy-wave-reference')).toContainText('published source inputs');
 for(const phase of ['0%','12.5%','25%','50%','100%']){
  const button=lab.getByRole('button',{name:phase,exact:true});await button.click();await expect(button).toBeFocused();
  const v=await linked(page);expect(v.orbit).toBe(v.phase);expect(v.chart).toBe(v.strain);expect(v.diagram).toBe(v.strain);expect(v.readout).toBe(v.strain);
  expect(v.diagramDifference).toBe(v.difference);expect(v.readoutDifference).toBe(v.difference);
  if(phase==='12.5%'){await expect(lab.locator('#astronomy-wave-curve')).toHaveAttribute('aria-valuenow','12.5');await expect(lab.locator('#astronomy-wave-curve')).toHaveAttribute('aria-valuetext',/^12.5%/);expect(v.difference).toBe(0);await expect(lab.locator('#astronomy-wave-status')).toContainText('equal length');}
  if(phase==='25%')expect(v.difference).toBeLessThan(0);
 }
 const chart=lab.locator('#astronomy-wave-curve');await chart.focus();await chart.press('Home');await chart.press('ArrowRight');
 await expect(chart).toBeFocused();expect((await data(page)).wavePhase).toBeCloseTo(.01,12);
 await chart.press('End');await expect(chart).toHaveAttribute('aria-valuetext',/100.0 ms/);
 await lab.getByRole('button',{name:'25%',exact:true}).click();
 await lab.screenshot({path:OUT+'/binary-detector-desktop.png'});
 expect(errors).toEqual([]);
});
test('alignment changes detector sensitivity without removing the arriving plus component',async({page})=>{
 const errors=await mount(page,state),lab=page.locator('#astronomy-wave-lab');
 const plus=await lab.locator('[data-wave-trace="plus"]').getAttribute('points'),amp=await lab.locator('[data-wave-amplitude]').getAttribute('data-wave-amplitude');
 const nullButton=lab.getByRole('button',{name:'45° · no plus response',exact:true});await nullButton.click();
 await expect(nullButton).toBeFocused();await expect(nullButton).toHaveAttribute('aria-pressed','true');
 await expect(lab.locator('#astr-waveOrientation')).toHaveValue('45');
 await expect(lab.locator('[data-wave-response]')).toHaveAttribute('data-wave-response','0');
 await expect(lab.locator('[data-wave-difference]')).toHaveText('0.00e+0 m');
 await expect(lab.locator('[data-wave-trace="plus"]')).toHaveAttribute('points',plus!);
 const ys=await lab.locator('[data-wave-trace="detector"]').evaluate(el=>el.getAttribute('points')!.split(' ').map(p=>Number(p.split(',')[1])));
 expect(new Set(ys).size).toBe(1);
 await lab.screenshot({path:OUT+'/plus-component-null-desktop.png'});
 await lab.getByRole('button',{name:'90° · reversed',exact:true}).click();
 const v=await linked(page);expect(v.strain).toBe(-Number(amp));
 const slider=lab.locator('#astr-waveOrientation');await slider.focus();await slider.press('ArrowLeft');await expect(slider).toHaveValue('89');await expect(slider).toBeFocused();
 await expect(lab.getByRole('button',{name:'90° · reversed',exact:true})).toHaveAttribute('aria-pressed','false');
 expect(errors).toEqual([]);
});
test('physical clocks, distance scaling and source provenance follow native controls',async({page})=>{
 const errors=await mount(page,{...state,wavePhase:.25,waveFrequency:10}),lab=page.locator('#astronomy-wave-lab');
 const amp=Number(await lab.locator('[data-wave-amplitude]').getAttribute('data-wave-amplitude'));
 const distance=lab.locator('#astr-waveDistance');await distance.focus();await distance.press('ArrowRight');await expect(distance).toHaveValue('420');await expect(distance).toBeFocused();
 const farther=Number(await lab.locator('[data-wave-amplitude]').getAttribute('data-wave-amplitude'));expect(farther/amp).toBeCloseTo(410/420,12);
 await expect(lab.locator('#astronomy-wave-reference')).toContainText('Chosen binary');
 const frequency=lab.locator('#astr-waveFrequency');await frequency.focus();await frequency.press('ArrowRight');await expect(frequency).toHaveValue('10.1');
 const clock=Number(await lab.locator('[data-wave-time]').getAttribute('data-wave-time'));expect(clock).toBeCloseTo(.25*2/10.1,12);
 await lab.getByRole('button',{name:'GW150914 inputs',exact:true}).click();await expect(lab.locator('#astronomy-wave-reference')).toContainText('published source inputs');
 const mass=lab.locator('#astr-waveMass1');await mass.focus();await mass.press('End');await expect(mass).toHaveValue('80');
 expect(Number(await frequency.getAttribute('max'))).toBeLessThan(20);expect(Number(await frequency.inputValue())).toBeLessThan(20);
 await expect(lab.locator('#astronomy-wave-reference')).toContainText('Chosen binary');
 await lab.getByRole('button',{name:'Smaller 10 + 10',exact:true}).click();await expect(frequency).toHaveValue('40');
 const details=lab.locator('details'),summary=details.locator('summary');await summary.click();await expect(summary).toBeFocused();await expect(details).toHaveAttribute('open','');
 await expect(details).toContainText('cross component');expect(errors).toEqual([]);
});
test('phone contrast layout keeps moving labels in view and supports touch and precise progress',async({page})=>{
 await page.setViewportSize({width:320,height:900});
 const errors=await mount(page,state,true),lab=page.locator('#astronomy-wave-lab');
 for(const label of ['0%','12.5%','25%','50%','75%','100%']){
  await lab.getByRole('button',{name:label,exact:true}).click();
  const result=await lab.evaluate(el=>{
   const labels=Array.from(el.querySelectorAll('svg text')).map((node:any)=>{
    const svg=node.ownerSVGElement,scale=svg.getBoundingClientRect().width/svg.viewBox.baseVal.width,b=node.getBBox();
    return {font:parseFloat(getComputedStyle(node).fontSize)*scale,left:b.x,right:b.x+b.width,top:b.y,bottom:b.y+b.height,w:svg.viewBox.baseVal.width,h:svg.viewBox.baseVal.height};
   });
   return {labels,targets:Array.from(el.querySelectorAll('button,input,summary,a')).map(node=>node.getBoundingClientRect().height),overflow:document.documentElement.scrollWidth>innerWidth};
  });
  expect(result.overflow).toBe(false);for(const size of result.targets)expect(size).toBeGreaterThanOrEqual(44);
  for(const l of result.labels){expect(l.font).toBeGreaterThanOrEqual(11);expect(l.left).toBeGreaterThanOrEqual(0);expect(l.right).toBeLessThanOrEqual(l.w);expect(l.top).toBeGreaterThanOrEqual(0);expect(l.bottom).toBeLessThanOrEqual(l.h);}
 }
 const chart=lab.locator('#astronomy-wave-curve');await chart.scrollIntoViewIfNeeded();const box=await chart.boundingBox();expect(box).toBeTruthy();
 await page.touchscreen.tap(box!.x+box!.width*(46+286*.25)/360,box!.y+box!.height*.5);await expect(chart).toBeFocused();expect((await data(page)).wavePhase).toBeCloseTo(.25,2);
 const progress=lab.locator('#astr-wavePhase');await progress.focus();await progress.press('Home');await progress.press('ArrowRight');
 await expect(progress).toHaveValue('0.1');expect((await data(page)).wavePhase).toBeCloseTo(.001,12);
 await lab.getByRole('button',{name:'25%',exact:true}).click();await lab.screenshot({path:OUT+'/binary-detector-phone-contrast.png'});
 expect(errors).toEqual([]);
});
test('playback pauses on edits, stops once and hands off cleanly between simulators',async({page})=>{
 await page.clock.install();const errors=await mount(page,state),lab=page.locator('#astronomy-wave-lab'),pulsar=page.locator('#astronomy-pulsar-lab');
 await lab.getByRole('button',{name:'Play orbit',exact:true}).click();await page.clock.runFor(750);expect((await data(page)).wavePhase).toBeGreaterThan(0);
 await expect(lab.locator('#astronomy-wave-status')).toHaveAttribute('aria-live','off');
 const distance=lab.locator('#astr-waveDistance');await distance.focus();await distance.press('ArrowRight');const paused=await data(page);expect(paused.wavePlaying).toBe(false);
 await page.clock.runFor(1000);expect((await data(page)).wavePhase).toBe(paused.wavePhase);
 await lab.getByRole('button',{name:'Play orbit',exact:true}).click();await page.clock.runFor(11000);
 await expect(lab.getByRole('button',{name:'Replay orbit',exact:true})).toBeVisible();expect((await data(page)).wavePhase).toBe(1);expect((await data(page)).wavePlaying).toBe(false);
 await lab.getByRole('button',{name:'Replay orbit',exact:true}).click();await page.clock.runFor(500);
 await pulsar.getByRole('button',{name:'Play rotation',exact:true}).click();const handing=await data(page);expect(handing.wavePlaying).toBe(false);
 await page.clock.runFor(500);expect((await data(page)).wavePhase).toBe(handing.wavePhase);expect((await data(page)).pulsarPhase).toBeGreaterThan(0);
 await lab.getByRole('button',{name:'Play orbit',exact:true}).click();expect((await data(page)).pulsarPlaying).toBe(false);
 const pulsarPaused=(await data(page)).pulsarPhase;await page.clock.runFor(500);expect((await data(page)).pulsarPhase).toBe(pulsarPaused);
 await page.getByRole('combobox',{name:'Explore a section'}).selectOption('stars');const left=await data(page);await page.clock.runFor(2000);expect((await data(page)).wavePhase).toBe(left.wavePhase);
 await page.evaluate(()=>(window as any).__destroy());await page.clock.runFor(2000);expect((await data(page)).wavePhase).toBe(left.wavePhase);expect(errors).toEqual([]);
});
test('malformed restored settings, extreme sources and repeated edits stay coherent',async({page})=>{
 const errors=await mount(page,{...state,waveMass1:{bad:true},waveMass2:true,waveDistance:[],waveRedshift:false,waveOrientation:'bad',wavePhase:'bad',wavePlaying:'true',waveFrequency:'bad'});
 const lab=page.locator('#astronomy-wave-lab');await expect(lab.locator('#astr-waveMass1')).toHaveValue('36');await expect(lab.locator('#astr-waveFrequency')).toHaveValue('20');
 for(let i=0;i<10;i++)await lab.getByRole('button',{name:i%2?'Smaller 10 + 10':'Equal 30 + 30',exact:true}).click();
 await lab.getByRole('button',{name:'45° · no plus response',exact:true}).click();await lab.getByRole('button',{name:'12.5%',exact:true}).click();
 const saved=await data(page);await page.evaluate(()=>(window as any).__destroy());await page.reload();await page.evaluate(s=>(window as any).__mount(s),saved);
 await expect(lab.locator('#astr-waveMass1')).toHaveValue('10');await expect(lab.locator('#astr-wavePhase')).toHaveValue('12.5');await expect(lab.locator('#astr-waveOrientation')).toHaveValue('45');
 const values=await lab.locator('svg').evaluateAll(elements=>elements.flatMap(el=>Array.from(el.querySelectorAll('*')).flatMap(node=>Array.from(node.attributes).map(a=>a.value))));
 for(const value of values)expect(value).not.toMatch(/NaN|Infinity|\[object Object\]/);expect(errors).toEqual([]);
});

test('a restored pair of playing flags starts only the wave clock and does not resume a second animation',async({page})=>{
 await page.clock.install();
 const errors=await mount(page,{...state,wavePlaying:true,pulsarPlaying:true}),lab=page.locator('#astronomy-wave-lab'),pulsar=page.locator('#astronomy-pulsar-lab');
 await expect(lab.getByRole('button',{name:'Pause orbit',exact:true})).toBeVisible();
 await expect(pulsar.getByRole('button',{name:'Play rotation',exact:true})).toBeVisible();
 await page.clock.runFor(1000);const running=await data(page);
 expect(running.wavePhase).toBeGreaterThan(0);expect(running.pulsarPhase||0).toBe(0);expect(running.pulsarPlaying).toBe(false);
 await page.clock.runFor(11000);const complete=await data(page);
 expect(complete.wavePhase).toBe(1);expect(complete.wavePlaying).toBe(false);expect(complete.pulsarPlaying).toBe(false);
 await page.clock.runFor(2000);expect((await data(page)).pulsarPhase||0).toBe(0);expect(errors).toEqual([]);
});
