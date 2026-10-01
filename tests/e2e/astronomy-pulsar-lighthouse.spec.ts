import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = 'reports/sky-lab-pulsar-2026-09-30';
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

test('four geometry examples link the observer, curves and receiver status',async({page})=>{
  const errors=await mount(page,state),lab=page.locator('#astronomy-pulsar-lab');
  for(const [label,kind]of [['One pulse','one'],['Two pulses','two'],['Miss both beams','none'],['Steady signal','steady']]){
    const button=lab.getByRole('button',{name:label,exact:true});await button.click();
    await expect(button).toBeFocused();await expect(button).toHaveAttribute('aria-pressed','true');
    await expect(lab.locator('#astronomy-pulsar-status')).toHaveAttribute('data-kind',kind);
    const chart=lab.locator('#astronomy-pulsar-curve');
    await chart.focus();await chart.press('Home');
    for(const key of ['ArrowRight','ArrowRight','End','Home']){
      await chart.press(key);
      const v=await page.evaluate(()=>{
        const w=window as any,m=w.__alloAstroPure.pulsarLighthouseModel(w.__toolData.astronomy);
        return {model:m.current.signal,scene:Number(document.querySelector('#astronomy-pulsar-diagram')?.getAttribute('data-signal')),chart:Number(document.querySelector('#astronomy-pulsar-curve')?.getAttribute('data-signal')),readout:Number(document.querySelector('[data-pulsar-signal]')?.getAttribute('data-pulsar-signal'))};
      });
      expect(v.scene).toBe(v.model);expect(v.chart).toBe(v.model);expect(v.readout).toBe(v.model);
    }
  }
  await lab.getByRole('button',{name:'Two pulses',exact:true}).click();
  await lab.getByRole('button',{name:'50%',exact:true}).click();
  await expect(lab.locator('#astronomy-pulsar-status')).toContainText('same pulse wrapping around');
  await expect(lab.locator('[data-pulsar-visible]')).toHaveAttribute('data-pulsar-visible','true');
  await expect(lab.locator('[data-pulsar-signal]')).toHaveText('1.000');
  await lab.screenshot({path:OUT+'/two-beam-desktop.png'});
  const tilt=lab.locator('#astr-pulsarTilt');await tilt.focus();await tilt.press('ArrowLeft');
  await expect(tilt).toHaveValue('89');await expect(tilt).toBeFocused();
  await expect(lab.getByRole('button',{name:'Two pulses',exact:true})).toHaveAttribute('aria-pressed','false');
  expect(errors).toEqual([]);
});

test('published spin choices change time and preserve chosen angles and signal',async({page})=>{
  const errors=await mount(page,{...state,pulsarTilt:74,pulsarObserver:103,pulsarWidth:39,pulsarPhase:.5}),lab=page.locator('#astronomy-pulsar-lab');
  const signal=await lab.locator('[data-pulsar-signal]').getAttribute('data-pulsar-signal');
  const before=await data(page),fast=lab.getByRole('button',{name:'J1748−2446ad · 716 Hz',exact:true});
  await fast.click();await expect(fast).toBeFocused();await expect(fast).toHaveAttribute('aria-pressed','true');
  const after=await data(page);for(const key of ['pulsarTilt','pulsarObserver','pulsarWidth','pulsarPhase'])expect(after[key]).toBe(before[key]);
  await expect(lab.locator('[data-pulsar-signal]')).toHaveAttribute('data-pulsar-signal',signal!);
  const period=Number(await lab.locator('[data-pulsar-period]').getAttribute('data-pulsar-period'));
  expect(period).toBeCloseTo(1000/716,12);
  expect(Number(await lab.locator('[data-pulsar-time]').getAttribute('data-pulsar-time'))).toBeCloseTo(period/2,12);
  await expect(lab.locator('#astronomy-pulsar-reference')).toContainText('2006');
  await expect(lab.getByRole('link',{name:'Read the published reference',exact:true})).toHaveAttribute('href','https://arxiv.org/abs/astro-ph/0601337');
  await lab.locator('#astronomy-pulsar-curve').focus();await lab.locator('#astronomy-pulsar-curve').press('End');
  await expect(lab.locator('#astronomy-pulsar-curve')).toHaveAttribute('aria-valuetext',/1.397 ms/);
  const details=lab.locator('details'),summary=details.locator('summary');await summary.click();
  await expect(summary).toBeFocused();await expect(details).toHaveAttribute('open','');
  await expect(details).toContainText('chosen smooth profile');
  await lab.getByRole('button',{name:'B1919+21 · 1.33730 s',exact:true}).click();
  await expect(lab.locator('[data-pulsar-time]')).toHaveText('1337.30 ms');
  expect(errors).toEqual([]);
});

test('very narrow pulses and south-facing observers remain finite and visible at their peaks',async({page})=>{
  const errors=await mount(page,{...state,pulsarTilt:89,pulsarObserver:89,pulsarWidth:1}),lab=page.locator('#astronomy-pulsar-lab');
  const info=await lab.locator('[data-pulsar-trace="A"]').evaluate(el=>{
    const points=el.getAttribute('points')!.split(' ').map(x=>x.split(',').map(Number));
    return {peak:Math.min(...points.map(p=>p[1])),first:points[0],last:points.at(-1),count:points.length};
  });
  expect(info.peak).toBeCloseTo(36,3);expect(info.first[1]).toBeCloseTo(36,3);expect(info.last![1]).toBeCloseTo(36,3);expect(info.count).toBeGreaterThan(275);
  const width=lab.locator('#astr-pulsarWidth');await width.focus();await width.press('End');await expect(width).toHaveValue('45');
  const observer=lab.locator('#astr-pulsarObserver');await observer.focus();await observer.press('End');await expect(observer).toHaveValue('180');
  await expect(lab.locator('#astronomy-pulsar-status')).toHaveAttribute('data-kind','none');
  await expect(lab.locator('[data-pulsar-signal]')).toHaveText('0.000');
  await observer.press('Home');await expect(observer).toHaveValue('0');
  const tilt=lab.locator('#astr-pulsarTilt');await tilt.focus();await tilt.press('Home');
  await expect(lab.locator('#astronomy-pulsar-status')).toHaveAttribute('data-kind','steady');
  await expect(lab.locator('[data-pulsar-signal]')).toHaveText('1.000');
  expect(errors).toEqual([]);
});

test('phone contrast layout keeps labels readable and supports touch and keyboard exploration',async({page})=>{
  await page.setViewportSize({width:320,height:900});
  const errors=await mount(page,state,true),lab=page.locator('#astronomy-pulsar-lab');
  await lab.getByRole('button',{name:'Two pulses',exact:true}).click();
  const chart=lab.locator('#astronomy-pulsar-curve');await chart.scrollIntoViewIfNeeded();
  const box=await chart.boundingBox();expect(box).toBeTruthy();
  await page.touchscreen.tap(box!.x+box!.width*(44+292*.5)/360,box!.y+box!.height*.5);
  await expect(chart).toBeFocused();expect((await data(page)).pulsarPhase).toBeCloseTo(.5,2);
  await chart.press('ArrowRight');await expect(chart).toBeFocused();
  const progress=lab.locator('#astr-pulsarPhase');await progress.focus();await progress.press('Home');await progress.press('ArrowRight');
  await expect(progress).toHaveValue('1');expect((await data(page)).pulsarPhase).toBeCloseTo(.01,12);
  const metrics=await lab.evaluate(el=>{
    const labels=Array.from(el.querySelectorAll('svg text')).map((node:any)=>{
      const svg=node.ownerSVGElement,scale=svg.getBoundingClientRect().width/svg.viewBox.baseVal.width,b=node.getBBox();
      return {font:parseFloat(getComputedStyle(node).fontSize)*scale,left:b.x,right:b.x+b.width,top:b.y,bottom:b.y+b.height,w:svg.viewBox.baseVal.width,h:svg.viewBox.baseVal.height};
    });
    const targets=Array.from(el.querySelectorAll('button,input,summary,a')).map(node=>node.getBoundingClientRect().height);
    return {labels,targets,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  expect(metrics.overflow).toBe(false);for(const size of metrics.targets)expect(size).toBeGreaterThanOrEqual(44);
  for(const l of metrics.labels){expect(l.font).toBeGreaterThanOrEqual(11);expect(l.left).toBeGreaterThanOrEqual(0);expect(l.right).toBeLessThanOrEqual(l.w);expect(l.top).toBeGreaterThanOrEqual(0);expect(l.bottom).toBeLessThanOrEqual(l.h);}
  await lab.getByRole('button',{name:'50%',exact:true}).click();
  await lab.getByRole('button',{name:'J1748−2446ad · 716 Hz',exact:true}).click();
  await lab.screenshot({path:OUT+'/pulsar-phone-contrast.png'});
  await lab.getByRole('button',{name:'Miss both beams',exact:true}).click();
  await expect(lab.locator('[data-pulsar-signal]')).toHaveText('0.000');
  expect(errors).toEqual([]);
});

test('playback pauses on controls, finishes once, and releases its clock when leaving the section',async({page})=>{
  await page.clock.install();
  const errors=await mount(page,state),lab=page.locator('#astronomy-pulsar-lab');
  await lab.getByRole('button',{name:'Play rotation',exact:true}).click();await page.clock.runFor(750);
  expect((await data(page)).pulsarPhase).toBeGreaterThan(0);
  await expect(lab.locator('#astronomy-pulsar-status')).toHaveAttribute('aria-live','off');
  const observer=lab.locator('#astr-pulsarObserver');await observer.focus();await observer.press('ArrowRight');
  const paused=await data(page);expect(paused.pulsarPlaying).toBe(false);
  await page.clock.runFor(2000);expect((await data(page)).pulsarPhase).toBe(paused.pulsarPhase);
  await lab.getByRole('button',{name:'Play rotation',exact:true}).click();await page.clock.runFor(11000);
  await expect(lab.getByRole('button',{name:'Replay rotation',exact:true})).toBeVisible();
  expect((await data(page)).pulsarPhase).toBe(1);expect((await data(page)).pulsarPlaying).toBe(false);
  await lab.getByRole('button',{name:'Replay rotation',exact:true}).click();await page.clock.runFor(500);
  await page.getByRole('combobox',{name:'Explore a section'}).selectOption('stars');
  const left=await data(page);await page.clock.runFor(4000);expect((await data(page)).pulsarPhase).toBe(left.pulsarPhase);
  await page.getByRole('combobox',{name:'Explore a section'}).selectOption('galaxies');
  await lab.getByRole('button',{name:'Pause rotation',exact:true}).click();
  const end=await data(page);await page.clock.runFor(1000);expect((await data(page)).pulsarPhase).toBe(end.pulsarPhase);
  await page.evaluate(()=>(window as any).__destroy());await page.clock.runFor(2000);expect((await data(page)).pulsarPhase).toBe(end.pulsarPhase);
  expect(errors).toEqual([]);
});

test('malformed restored state and repeated edits preserve a coherent simulator',async({page})=>{
  const errors=await mount(page,{...state,pulsarTilt:{bad:true},pulsarObserver:[],pulsarWidth:false,pulsarPhase:'bad',pulsarSpin:{bad:true},selectedPSR:{bad:true},pulsarPlaying:'true'});
  const lab=page.locator('#astronomy-pulsar-lab');await expect(lab.locator('#astr-pulsarTilt')).toHaveValue('45');
  await expect(lab.locator('#astr-pulsarObserver')).toHaveValue('45');await expect(lab.locator('#astr-pulsarPhase')).toHaveValue('0');
  for(let i=0;i<12;i++)await lab.getByRole('button',{name:i%2?'Two pulses':'One pulse',exact:true}).click();
  await lab.getByRole('button',{name:'J1748−2446ad · 716 Hz',exact:true}).click();
  await lab.getByRole('button',{name:'75%',exact:true}).click();
  const saved=await data(page);await page.evaluate(()=>(window as any).__destroy());
  await page.reload();await page.evaluate(s=>(window as any).__mount(s),saved);
  await expect(lab.locator('#astr-pulsarTilt')).toHaveValue('90');await expect(lab.locator('#astr-pulsarPhase')).toHaveValue('75');
  await expect(lab.getByRole('button',{name:'J1748−2446ad · 716 Hz',exact:true})).toHaveAttribute('aria-pressed','true');
  const values=await lab.locator('svg').evaluateAll(elements=>elements.flatMap(el=>Array.from(el.querySelectorAll('*')).flatMap(node=>Array.from(node.attributes).map(a=>a.value))));
  for(const value of values)expect(value).not.toMatch(/NaN|Infinity|\[object Object\]/);
  expect(errors).toEqual([]);
});
