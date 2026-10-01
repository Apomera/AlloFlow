import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = 'reports/sky-lab-transit-profile-2026-09-29';
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





const measured = { tab:'exoplanets', transitPlanetR:.920, transitStarR:.1192, transitImpact:.191, transitOrbit:'trappist' };
const data = page => page.evaluate(() => (window as any).__toolData.astronomy);

test('brightness choices and native controls link the scene and comparison without changing geometry',async({page})=>{
  const errors=await mount(page,{tab:'exoplanets'}),lab=page.locator('#astronomy-transit-lab');
  await lab.getByRole('button',{name:'Jupiter-size / Sun',exact:true}).click();
  const original=await lab.locator('[data-transit-depth]').innerText();
  const dim=lab.getByRole('button',{name:'Dimmer edge · u = 0.6',exact:true});await dim.click();
  await expect(dim).toBeFocused();await expect(dim).toHaveAttribute('aria-pressed','true');
  await expect(lab.locator('#astronomy-transit-scene')).toHaveAttribute('data-limb-coefficient','0.6');
  await expect(lab.locator('[data-transit-uniform]')).toHaveCount(1);
  expect(parseFloat(await lab.locator('[data-transit-depth]').innerText())).toBeGreaterThan(parseFloat(original));
  await expect(lab.locator('#astr-transitPlanetR')).toHaveValue('11.2');
  await lab.screenshot({path:OUT+'/dim-edge-desktop.png'});
  const performanceSamples=await page.evaluate(()=>{
    const cases=[
      {name:'small planet',state:{transitPlanetR:.3,transitStarR:3,transitLimb:1}},
      {name:'central gas giant',state:{transitPlanetR:11.2,transitLimb:.6}},
      {name:'grazing crossing',state:{transitPlanetR:11.2,transitImpact:1,transitLimb:1}},
      {name:'large occulting disc',state:{transitPlanetR:12,transitStarR:.1,transitImpact:1.2,transitLimb:1}},
      {name:'published orbit',state:{transitPlanetR:.920,transitStarR:.1192,transitImpact:.191,transitOrbit:'trappist',transitLimb:.6}}
    ];
    return cases.map(c=>{
      const durations=[];
      for(let run=0;run<5;run++){
        const start=performance.now(),m=(window as any).__alloAstroPure.transitModel(c.state);
        for(let i=0;i<=240;i++)m.at(i/240);
        durations.push(performance.now()-start);
      }
      durations.sort((a,b)=>a-b);
      return{name:c.name,samples:241,medianMs:durations[2],maxMs:durations[4]};
    });
  });
  writeFileSync(OUT+'/model-performance.json',JSON.stringify({browser:'Chromium',scope:'Model calculation for 241 curve samples; excludes rendering',cases:performanceSamples},null,2)+'\n');
  for(const result of performanceSamples)expect(result.medianMs).toBeLessThan(80);
  const slider=lab.locator('#astr-transitLimb');await slider.focus();await slider.press('ArrowRight');
  await expect(slider).toBeFocused();await expect(slider).toHaveValue('0.65');
  await expect(lab.locator('#astronomy-transit-profile-note')).toContainText('35%');
  const compare=lab.getByRole('button',{name:'Compare a uniform star',exact:true});await expect(compare).toHaveCSS('background-color','rgb(22, 78, 99)');await compare.click();
  await expect(compare).toBeFocused();await expect(compare).toHaveAttribute('aria-pressed','false');await expect(lab.locator('[data-transit-uniform]')).toHaveCount(0);
  await compare.click();await expect(lab.locator('[data-transit-uniform]')).toHaveCount(1);
  await page.getByRole('combobox',{name:'Explore a section'}).selectOption('stars');
  await page.getByRole('combobox',{name:'Explore a section'}).selectOption('exoplanets');
  await expect(slider).toHaveValue('0.65');await expect(lab.locator('[data-transit-uniform]')).toHaveCount(1);
  await lab.getByRole('button',{name:'Uniform star',exact:true}).click();await expect(compare).toBeDisabled();
  await expect(lab.locator('[data-transit-depth]')).toHaveText(original);expect(errors).toEqual([]);
});

test('measured example preserves the clock across brightness changes and removes it on geometry changes',async({page})=>{
  const errors=await mount(page,{tab:'exoplanets'}),lab=page.locator('#astronomy-transit-lab');
  const measuredButton=lab.getByRole('button',{name:'TRAPPIST-1 e · measured path',exact:true});await measuredButton.click();
  await expect(measuredButton).toBeFocused();await expect(measuredButton).toHaveAttribute('aria-pressed','true');
  await expect(lab.locator('#astr-transitImpact')).toHaveValue('0.191');
  const details=lab.locator('#astronomy-transit-reference details'),summary=details.locator('summary');
  await expect(details).not.toHaveAttribute('open','');await summary.click();await expect(summary).toBeFocused();await expect(details).toHaveAttribute('open','');await summary.click();
  await expect(lab.locator('#astronomy-transit-reference')).toContainText('55.76 ± 0.26');
  await expect(lab.locator('#astronomy-transit-scene')).toHaveAttribute('data-orbit-model','circular');
  const duration=await lab.locator('[data-transit-duration]').innerText();
  expect(parseFloat(duration)).toBeCloseTo(55.76,1);
  await lab.getByRole('button',{name:'Dimmer edge · u = 0.6',exact:true}).click();
  await expect(lab.locator('[data-transit-duration]')).toHaveText(duration);
  await lab.screenshot({path:OUT+'/measured-transit-desktop.png'});
  const chart=lab.locator('#astronomy-transit-curve');await chart.focus();await chart.press('Home');
  const first=Number(await lab.locator('[data-transit-minutes]').getAttribute('data-transit-minutes'));expect(first).toBeLessThan(-35);
  await chart.press('End');await expect(chart).toHaveAttribute('aria-valuetext',/min/);expect(Number(await lab.locator('[data-transit-minutes]').getAttribute('data-transit-minutes'))).toBeCloseTo(-first,10);
  await lab.getByRole('button',{name:'Midpoint',exact:true}).click();await expect(lab.locator('[data-transit-minutes]')).toHaveText('0.0 min');
  const offset=lab.locator('#astr-transitImpact');await offset.focus();await offset.press('ArrowRight');
  await expect(offset).toBeFocused();await expect(offset).toHaveValue('0.201');await expect(measuredButton).toHaveAttribute('aria-pressed','false');
  await expect(lab.locator('[data-transit-duration]')).toHaveCount(0);await expect(chart).toContainText('Progress through crossing');
  await expect(lab.locator('#astronomy-transit-scene')).toHaveAttribute('data-orbit-model','straight');
  await measuredButton.click();await expect(lab.locator('[data-transit-duration]')).toHaveText(duration);
  await lab.getByRole('button',{name:'TRAPPIST-1 e radii',exact:true}).click();
  await expect(lab.locator('#astronomy-transit-reference')).toContainText('chosen central path');await expect(lab.locator('[data-transit-duration]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('320px contrast charts have readable labels, touch scrubbing and unclipped comparison curves',async({page})=>{
  await page.setViewportSize({width:320,height:900});
  const errors=await mount(page,{...measured,transitLimb:.6},true),lab=page.locator('#astronomy-transit-lab');
  await lab.screenshot({path:OUT+'/measured-transit-phone-contrast.png'});
  const chart=lab.locator('#astronomy-transit-curve');await chart.scrollIntoViewIfNeeded();const box=(await chart.boundingBox())!;
  await page.touchscreen.tap(box.x+box.width*((65+315*.25)/400),box.y+box.height*.5);
  await expect(chart).toBeFocused();expect((await data(page)).transitTime).toBeCloseTo(.25,2);
  expect(Number(await lab.locator('[data-transit-minutes]').getAttribute('data-transit-minutes'))).toBeLessThan(0);
  const boxes=await lab.locator('button,input,svg,dl,p,summary').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return{left:b.left,right:b.right,height:b.height,control:n.tagName==='BUTTON'||n.tagName==='INPUT'||n.tagName==='SUMMARY'};}));
  for(const b of boxes){expect(b.left).toBeGreaterThanOrEqual(-.5);expect(b.right).toBeLessThanOrEqual(320.5);if(b.control)expect(b.height).toBeGreaterThanOrEqual(44);}
  const labels=await lab.locator('svg text').evaluateAll(nodes=>nodes.map(n=>{const t=n as SVGTextElement,b=t.getBBox();return{size:parseFloat(getComputedStyle(t).fontSize)*Math.abs(t.getScreenCTM()!.a),left:b.x,right:b.x+b.width,top:b.y,bottom:b.y+b.height,font:getComputedStyle(t).fontFamily};}));
  for(const l of labels){expect(l.size).toBeGreaterThanOrEqual(11);expect(l.left).toBeGreaterThanOrEqual(-1);expect(l.right).toBeLessThanOrEqual(401);expect(l.top).toBeGreaterThanOrEqual(-1);expect(l.bottom).toBeLessThanOrEqual(301);expect(l.font).toMatch(/sans-serif/);}
  await lab.getByRole('button',{name:'Grazing crossing',exact:true}).click();await lab.locator('#astr-transitLimb').fill('1');
  const ys=(await lab.locator('[data-transit-uniform]').getAttribute('points'))!.split(' ').map(p=>Number(p.split(',')[1]));
  expect(Math.max(...ys)).toBeLessThanOrEqual(234.01);
  await lab.screenshot({path:OUT+'/grazing-transit-phone-contrast.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect(errors).toEqual([]);
});

test('dim-edge playback pauses on input, releases its timer and restores corrupt saved state',async({page})=>{
  await page.clock.install();
  const errors=await mount(page,{...measured,transitLimb:1,transitTime:.98}),lab=page.locator('#astronomy-transit-lab');
  await lab.getByRole('button',{name:'Play transit',exact:true}).click();await page.clock.runFor(1000);
  await expect(lab.getByRole('button',{name:'Replay transit',exact:true})).toBeVisible();expect((await data(page)).transitTime).toBe(1);
  await lab.getByRole('button',{name:'Replay transit',exact:true}).click();await page.clock.runFor(500);
  await lab.locator('#astr-transitLimb').focus();await lab.locator('#astr-transitLimb').press('ArrowLeft');
  const stopped=(await data(page)).transitTime;expect((await data(page)).transitPlaying).toBe(false);
  await page.clock.runFor(1000);expect((await data(page)).transitTime).toBe(stopped);
  await lab.getByRole('button',{name:'Play transit',exact:true}).click();
  await page.getByRole('combobox',{name:'Explore a section'}).selectOption('stars');const before=(await data(page)).transitTime;
  await page.clock.runFor(1000);expect((await data(page)).transitTime).toBe(before);
  await page.evaluate(()=>{(window as any).__destroy();(window as any).__mount({tab:'exoplanets',transitPlanetR:{},transitStarR:[],transitImpact:true,transitLimb:false,transitTime:'',transitOrbit:{},transitCompare:{}});});
  await expect(lab.locator('#astr-transitLimb')).toHaveValue('0');
  await expect(lab.locator('#astr-transitPlanetR')).toHaveValue('1');await expect(lab.locator('[data-transit-duration]')).toHaveCount(0);
  await expect(lab).not.toContainText(/NaN|Infinity|\[object Object\]/);expect(errors).toEqual([]);
});
