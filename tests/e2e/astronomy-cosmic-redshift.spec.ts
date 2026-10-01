import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = 'reports/sky-lab-redshift-2026-09-29';
const HARNESS = readFileSync('tests/e2e/astronomy-observatory-3d.spec.ts', 'utf8').split('const HARNESS = `')[1].split('`;')[0]
  .replace("gradeLevel: '8th Grade',", "gradeLevel: '8th Grade', isContrast: window.__contrast === true, theme: window.__contrast ? 'contrast' : 'dark',");
let server: Server, base: string;
test.use({ hasTouch: true, viewport: { width: 1280, height: 980 }, reducedMotion: 'reduce', launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
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


test('teaching presets preserve the physical wavelength ratios and accessible values', async ({page}) => {
  const errors=await mount(page,{tab:'galaxies'});
  const lab=page.locator('#astronomy-redshift-lab');
  for(const [name,z] of [['No stretch',0],['Double wavelength',1],['Four times longer',3]] as const) {
    await lab.getByRole('button',{name,exact:true}).click();
    await expect(lab.getByRole('button',{name,exact:true})).toBeFocused();
    await expect(lab.locator('#astronomy-redshift-chart')).toHaveAttribute('data-redshift',String(z));
    const marks=await lab.locator('[data-redshift-line]').evaluateAll(nodes=>nodes.map(n=>({id:n.getAttribute('data-redshift-line'),slot:n.getAttribute('data-slot'),nm:Number(n.getAttribute('data-wavelength-nm'))})));
    for(const id of ['lya','hb','oiii','ha']) expect(marks.find(m=>m.id===id&&m.slot==='observed')!.nm/marks.find(m=>m.id===id&&m.slot==='emitted')!.nm).toBeCloseTo(1+z,10);
  }
  await lab.getByRole('button',{name:'H-alpha',exact:true}).click();
  await expect(lab.getByRole('button',{name:'H-alpha',exact:true})).toHaveAccessibleDescription(/Observed wavelength:.*Infrared/);
  await lab.screenshot({path:OUT+'/redshift-desktop.png'});
  expect(errors).toEqual([]);
});

test('measured galaxy examples preserve precision and distinguish measurements from modeled lines', async ({page}) => {
  const errors=await mount(page,{tab:'galaxies'});
  const lab=page.locator('#astronomy-redshift-lab');
  await lab.getByRole('button',{name:'GN-z11',exact:true}).click();
  await expect(lab.locator('#astronomy-redshift-z')).toHaveValue('10.603');
  await expect(lab.locator('#astronomy-redshift-reference')).toContainText('GN-z11 · z = 10.603');
  await lab.getByRole('button',{name:'JADES-GS-z14-0',exact:true}).click();
  await expect(lab.locator('#astronomy-redshift-z')).toHaveValue('14.1793');
  await expect(lab.locator('#astronomy-redshift-reference')).toContainText('14.1793 ± 0.0007');
  await expect(lab.getByRole('link',{name:'Measurement paper (2025)',exact:true})).toHaveAttribute('href','https://arxiv.org/abs/2409.20549');
  await lab.getByRole('button',{name:'H-alpha',exact:true}).click();
  expect(Number(await lab.locator('[data-redshift-line="ha"][data-slot="observed"]').getAttribute('data-wavelength-nm'))).toBeCloseTo(656.4614*15.1793,8);
  await expect(lab.getByRole('button',{name:'JADES-GS-z14-0',exact:true})).toHaveAttribute('aria-pressed','true');
  await lab.screenshot({path:OUT+'/jades-desktop.png'});
  expect(errors).toEqual([]);
});

test('keyboard changes, bounds and section navigation keep the current comparison coherent', async ({page}) => {
  const errors=await mount(page,{tab:'galaxies'});
  const lab=page.locator('#astronomy-redshift-lab'), slider=lab.getByRole('slider',{name:'Redshift z',exact:true});
  await lab.getByRole('button',{name:'JADES-GS-z14-0',exact:true}).click();
  await slider.focus(); await slider.press('ArrowLeft');
  await expect(slider).toHaveValue('14.1293'); await expect(slider).toBeFocused();
  await expect(lab.locator('#astronomy-redshift-reference')).toContainText('Teaching setting');
  await expect(lab.getByRole('button',{name:'JADES-GS-z14-0',exact:true})).toHaveAttribute('aria-pressed','false');
  await slider.press('Shift+ArrowLeft'); await expect(slider).toHaveValue('13.6293');
  await slider.press('Home'); await expect(slider).toHaveValue('0');
  await slider.press('ArrowLeft'); await expect(slider).toHaveValue('0');
  await slider.press('End'); await slider.press('ArrowRight'); await expect(slider).toHaveValue('15');
  await lab.getByRole('button',{name:'H-beta',exact:true}).click();
  await page.getByRole('combobox',{name:'Explore a section'}).selectOption('seasons');
  await page.getByRole('combobox',{name:'Explore a section'}).selectOption('galaxies');
  await expect(slider).toHaveValue('15');
  await expect(lab.getByRole('button',{name:'H-beta',exact:true})).toHaveAttribute('aria-pressed','true');
  await lab.getByRole('button',{name:'Compare with stellar Doppler shift',exact:true}).click();
  await expect(page.getByRole('combobox',{name:'Explore a section'})).toHaveValue('stars');
  await page.getByRole('button',{name:'Open cosmic redshift lab',exact:true}).click();
  await expect(slider).toHaveValue('15');
  expect(errors).toEqual([]);
});

test('320px contrast layout keeps measured values, controls and chart within the viewport', async ({page}) => {
  await page.setViewportSize({width:320,height:900});
  const errors=await mount(page,{tab:'galaxies',redshiftZ:'NaN',redshiftLine:{forged:true}},true);
  const lab=page.locator('#astronomy-redshift-lab');
  await expect(lab.locator('#astronomy-redshift-z')).toHaveValue('1');
  await lab.getByRole('button',{name:'JADES-GS-z14-0',exact:true}).click();
  await expect(lab.locator('#astronomy-redshift-reference')).toContainText('14.1793 ± 0.0007');
  for(const button of ['Lyman-alpha','H-beta','[O III]','H-alpha']) {
    await lab.getByRole('button',{name:button,exact:true}).click();
    await expect(lab.getByRole('button',{name:button,exact:true})).toBeFocused();
  }
  const boxes=await lab.locator('button,input,svg,dl').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return {left:b.left,right:b.right,height:b.height,control:n.tagName==='BUTTON'||n.tagName==='INPUT'};}));
  for(const b of boxes) {expect(b.left).toBeGreaterThanOrEqual(-0.5);expect(b.right).toBeLessThanOrEqual(320.5);if(b.control)expect(b.height).toBeGreaterThanOrEqual(44);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await lab.screenshot({path:OUT+'/redshift-phone-contrast.png'});
  expect(errors).toEqual([]);
});
