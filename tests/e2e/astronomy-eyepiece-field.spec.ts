import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = 'reports/sky-lab-eyepiece-2026-09-29';
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




test('Moon geometry grows and crops at the field edge with readable measurements',async({page})=>{
  const errors=await mount(page,{tab:'observe',eyepieceTarget:'moon'}),lab=page.locator('#astronomy-eyepiece-lab'),field=lab.locator('#astronomy-eyepiece-field');
  await expect(field).toHaveAttribute('data-target-radius','92');await expect(field).toHaveAttribute('data-fits','true');
  await lab.screenshot({path:OUT+'/moon-wide-desktop.png'});
  await lab.locator('#astr-ey-ep').focus();await lab.locator('#astr-ey-ep').press('Home');
  await expect(lab.locator('#astr-ey-ep')).toHaveValue('4');await expect(lab.locator('#astr-ey-ep')).toBeFocused();
  await expect(field).toHaveAttribute('data-target-radius','575');await expect(field).toHaveAttribute('data-fits','false');
  await expect(lab.locator('#astronomy-eyepiece-status')).toContainText('Cropped by the field edge');
  await expect(lab.locator('#astronomy-eyepiece-measurements')).toContainText('300×');
  await expect(lab.locator('figcaption')).toBeVisible();await expect(lab.locator('svg text')).toHaveCount(0);
  
  await lab.screenshot({path:OUT+'/moon-cropped-desktop.png'});
  const quick=lab.getByRole('group',{name:'Compare eyepieces',exact:true});
  await quick.getByRole('button',{name:'25 mm',exact:true}).click();
  await expect(quick.getByRole('button',{name:'25 mm',exact:true})).toBeFocused();
  await expect(field).toHaveAttribute('data-target-radius','92');await expect(lab.locator('#astr-ey-ep')).toHaveValue('25');
  await quick.getByRole('button',{name:'10 mm',exact:true}).click();await expect(field).toHaveAttribute('data-target-radius','230');

  await expect(lab.locator('#astronomy-eyepiece-status')).toContainText('120×');
  await lab.getByRole('button',{name:'Whirlpool Galaxy (M51)',exact:true}).click();
  await expect(lab.locator('[data-target-shape="spiral-pair"]')).toHaveCount(1);
  await lab.screenshot({path:OUT+'/whirlpool-desktop.png'});
  await lab.getByRole('button',{name:'Double Cluster (NGC 869/884)',exact:true}).click();
  await quick.getByRole('button',{name:'25 mm',exact:true}).click();
  await expect(lab.locator('[data-cluster-center]')).toHaveCount(2);
  await lab.screenshot({path:OUT+'/double-cluster-desktop.png'});
  expect(errors).toEqual([]);
});

test('real instrument presets and keyboard controls preserve independent optics and focus',async({page})=>{
  const errors=await mount(page,{tab:'observe',eyEpField:80,eySeeing:4,eyBortle:7}),lab=page.locator('#astronomy-eyepiece-lab');
  await lab.getByRole('button',{name:'130EQ · 20 mm',exact:true}).click();
  await expect(lab.getByRole('button',{name:'130EQ · 20 mm',exact:true})).toBeFocused();
  await expect(lab.locator('#astr-ey-ap')).toHaveValue('130');await expect(lab.locator('#astr-ey-fl')).toHaveValue('650');
  await expect(lab.locator('#astr-ey-fld')).toHaveValue('80');await expect(lab.locator('#astr-ey-see')).toHaveValue('4');await expect(lab.locator('#astr-ey-bort')).toHaveValue('7');
  await expect(lab.locator('#astronomy-eyepiece-measurements')).toContainText('32.5×');
  const radius=Number(await lab.locator('#astronomy-eyepiece-field').getAttribute('data-target-radius'));
  await lab.getByRole('button',{name:'130EQ · 10 mm',exact:true}).click();
  await expect(lab.getByRole('button',{name:'130EQ · 10 mm',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(lab.locator('#astronomy-eyepiece-measurements')).toContainText('65×');
  expect(Number(await lab.locator('#astronomy-eyepiece-field').getAttribute('data-target-radius'))).toBeCloseTo(radius*2,10);
  const aperture=lab.locator('#astr-ey-ap');await aperture.focus();await aperture.press('ArrowRight');
  await expect(aperture).toHaveValue('140');await expect(aperture).toBeFocused();await expect(lab.locator('#astr-ey-fl')).toHaveValue('650');
  await expect(lab.getByRole('button',{name:'130EQ · 10 mm',exact:true})).toHaveAttribute('aria-pressed','false');
  await lab.locator('#astr-ey-fl').focus();await lab.locator('#astr-ey-fl').press('ArrowRight');
  await expect(lab.locator('#astr-ey-fl')).toHaveValue('700');await expect(aperture).toHaveValue('140');
  await page.getByRole('combobox',{name:'Explore a section'}).selectOption('stars');
  await page.getByRole('combobox',{name:'Explore a section'}).selectOption('observe');
  await expect(lab.locator('#astr-ey-fl')).toHaveValue('700');await expect(aperture).toHaveValue('140');
  await lab.getByRole('button',{name:'Reset eyepiece field lab',exact:true}).click();
  await expect(lab.getByRole('button',{name:'Reset eyepiece field lab',exact:true})).toBeFocused();
  for(const [id,value]of [['ap','150'],['fl','1200'],['ep','25'],['fld','60'],['see','2.5'],['bort','4']])await expect(lab.locator('#astr-ey-'+id)).toHaveValue(value);
  expect(errors).toEqual([]);
});

test('seeing and sky brightness affect the sketch while corrupted settings recover',async({page})=>{
  const errors=await mount(page,{tab:'observe',eyepieceTarget:'orion-nebula',eyFocalMm:4000,eyEpFlMm:4}),lab=page.locator('#astronomy-eyepiece-lab');
  const initial=Number(await lab.locator('feGaussianBlur').getAttribute('stdDeviation'));
  await lab.locator('#astr-ey-see').focus();await lab.locator('#astr-ey-see').press('End');
  await expect(lab.locator('#astr-ey-see')).toBeFocused();expect(Number(await lab.locator('feGaussianBlur').getAttribute('stdDeviation'))).toBeCloseTo(initial*4,10);
  await lab.locator('#astr-ey-bort').focus();await lab.locator('#astr-ey-bort').press('End');
  expect(Number(await lab.locator('[data-target-contrast]').getAttribute('opacity'))).toBeCloseTo(.28,10);
  await lab.getByRole('button',{name:'The Moon',exact:true}).click();await expect(lab.locator('[data-target-contrast]')).toHaveAttribute('opacity','1');
  await lab.locator('#astronomy-eyepiece-reference summary').click();
  await expect(lab.getByRole('link',{name:'Celestron · instrument specifications',exact:true})).toBeVisible();
  await page.evaluate(()=>{(window as any).__destroy();(window as any).__mount({tab:'observe',eyepieceTarget:{bad:true},eyFocalMm:'NaN',eyApertureMm:{},eySeeing:[],eyBortle:false});});
  await expect(lab.locator('#astr-ey-fl')).toHaveValue('1200');await expect(lab.locator('#astr-ey-ap')).toHaveValue('150');
  await expect(lab.locator('#astr-ey-see')).toHaveValue('2.5');await expect(lab.locator('#astr-ey-bort')).toHaveValue('4');
  await expect(lab.getByRole('button',{name:'Orion Nebula (M42)',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(lab).not.toContainText(/NaN|Infinity|\[object Object\]/);expect(errors).toEqual([]);
});

test('320px contrast view keeps all target controls and readouts within the screen',async({page})=>{
  await page.setViewportSize({width:320,height:900});
  const errors=await mount(page,{tab:'observe'},true),lab=page.locator('#astronomy-eyepiece-lab'),targets=lab.getByRole('group',{name:'Observing targets',exact:true}).getByRole('button');
  await expect(targets).toHaveCount(12);
  for(let i=0;i<12;i++){
    await targets.nth(i).click();await expect(targets.nth(i)).toBeFocused();await expect(targets.nth(i)).toHaveAttribute('aria-pressed','true');
    const boxes=await lab.locator('button,input,svg,dl,figcaption,fieldset').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return {left:b.left,right:b.right,height:b.height,control:n.tagName==='BUTTON'||n.tagName==='INPUT'};}));
    for(const b of boxes){expect(b.left).toBeGreaterThanOrEqual(-.5);expect(b.right).toBeLessThanOrEqual(320.5);if(b.control)expect(b.height).toBeGreaterThanOrEqual(44);}
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  
  await targets.nth(10).click();await expect(lab.locator('[data-target-shape="cluster-pair"]')).toHaveCount(1);
  await targets.nth(11).click();await expect(lab.locator('[data-target-shape="spiral-pair"]')).toHaveCount(1);
  const quick=lab.getByRole('group',{name:'Compare eyepieces',exact:true});
  await quick.getByRole('button',{name:'10 mm',exact:true}).click();await expect(lab.locator('#astr-ey-ep')).toHaveValue('10');
  await expect(quick.getByRole('button',{name:'10 mm',exact:true})).toBeFocused();
  await targets.nth(5).click();await lab.screenshot({path:OUT+'/orion-phone-contrast.png'});expect(errors).toEqual([]);
});
