import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = 'reports/sky-lab-lensing-2026-09-29';
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



test('finite rings and asymmetric images track source alignment with clear readouts',async({page})=>{
  const errors=await mount(page,{tab:'galaxies'}),lab=page.locator('#astronomy-lens-lab');
  await expect(lab.locator('#astronomy-lens-diagram')).toHaveAttribute('data-appearance','ring');
  await expect(lab.locator('#astronomy-lens-measurements')).toContainText('11.16×');
  await expect(lab.locator('#astronomy-lens-measurements')).toContainText('5.1 arcsec');
  await lab.screenshot({path:OUT+'/aligned-desktop.png'});
  await lab.getByRole('button',{name:'Near alignment',exact:true}).click();
  await expect(lab.getByRole('button',{name:'Near alignment',exact:true})).toBeFocused();
  await expect(lab.locator('#astronomy-lens-diagram')).toHaveAttribute('data-appearance','distorted-ring');
  for(const [name,offset,outer,inner]of [['Source left','-5','-8.18 arcsec','+3.18 arcsec'],['Source right','5','+8.18 arcsec','-3.18 arcsec']]){
    await lab.getByRole('button',{name,exact:true}).click();
    await expect(lab.getByRole('button',{name,exact:true})).toBeFocused();
    await expect(lab.getByRole('button',{name,exact:true})).toHaveAttribute('aria-pressed','true');
    await expect(lab.locator('#astronomy-lens-source-diagram')).toHaveAttribute('data-source-arcsec',offset);
    await expect(lab.locator('#astronomy-lens-diagram')).toHaveAttribute('data-source-arcsec',offset);
    await expect(lab.locator('#astronomy-lens-measurements')).toContainText(outer);
    await expect(lab.locator('#astronomy-lens-measurements')).toContainText(inner);
  }
  await lab.screenshot({path:OUT+'/images-desktop.png'});
  expect(errors).toEqual([]);
});

test('keyboard controls respect physical steps, bounds and saved comparisons',async({page})=>{
  const errors=await mount(page,{tab:'galaxies'}),lab=page.locator('#astronomy-lens-lab'),mass=lab.locator('#astronomy-lens-mass'),offset=lab.locator('#astronomy-lens-offset');
  await mass.focus();await mass.press('ArrowRight');await expect(mass).toHaveValue('1.1');await expect(mass).toBeFocused();
  await mass.press('End');await expect(mass).toHaveValue('4');await mass.press('ArrowRight');await expect(mass).toHaveValue('4');
  await expect(lab.locator('#astronomy-lens-measurements')).toContainText('10.2 arcsec');
  await offset.focus();await offset.press('ArrowLeft');await expect(offset).toHaveValue('-0.25');await expect(offset).toBeFocused();
  await offset.press('Home');await expect(offset).toHaveValue('-10');await offset.press('ArrowLeft');await expect(offset).toHaveValue('-10');
  await offset.press('End');await expect(offset).toHaveValue('10');await offset.press('ArrowRight');await expect(offset).toHaveValue('10');
  await page.getByRole('combobox',{name:'Explore a section'}).selectOption('stars');
  await page.getByRole('combobox',{name:'Explore a section'}).selectOption('galaxies');
  await expect(mass).toHaveValue('4');await expect(offset).toHaveValue('10');
  await lab.getByRole('button',{name:'Reset gravitational lens simulation',exact:true}).click();
  await expect(lab.getByRole('button',{name:'Reset gravitational lens simulation',exact:true})).toBeFocused();
  await expect(mass).toHaveValue('1');await expect(offset).toHaveValue('0');
  expect(errors).toEqual([]);
});

test('legacy and malformed settings recover while measured references stay explicit',async({page})=>{
  const errors=await mount(page,{tab:'galaxies',lensMass:100,lensOffset:40}),lab=page.locator('#astronomy-lens-lab');
  await expect(lab.locator('#astronomy-lens-mass')).toHaveValue('2');await expect(lab.locator('#astronomy-lens-offset')).toHaveValue('5');
  await expect(lab.locator('#astronomy-lens-reference')).toContainText('10.2 arcseconds');
  await expect(lab.locator('#astronomy-lens-reference')).toContainText('about 300°');
  await expect(lab.locator('#astronomy-lens-reference')).toContainText('Mass ratios, source size and alignments are teaching choices');
  await expect(lab.getByRole('link',{name:'Discovery paper · measured ring',exact:true})).toHaveAttribute('href','https://arxiv.org/pdf/0706.2326');
  await page.evaluate(()=>{(window as any).__destroy();(window as any).__mount({tab:'galaxies',lensMassRatio:{forged:true},lensSourceArcsec:'NaN'});});
  await expect(lab.locator('#astronomy-lens-mass')).toHaveValue('1');await expect(lab.locator('#astronomy-lens-offset')).toHaveValue('0');
  await expect(lab).not.toContainText(/NaN|Infinity|\[object Object\]/);
  expect(errors).toEqual([]);
});

test('320px contrast layout keeps comparison charts, labels and controls readable',async({page})=>{
  await page.setViewportSize({width:320,height:900});
  const errors=await mount(page,{tab:'galaxies',lensMassRatio:4,lensSourceArcsec:10},true),lab=page.locator('#astronomy-lens-lab');
  for(const name of ['Source left','Near alignment','Show perfect gravitational lens alignment','Source right']){
    await lab.getByRole('button',{name,exact:true}).click();await expect(lab.getByRole('button',{name,exact:true})).toBeFocused();
    const boxes=await lab.locator('button,input,svg,dl').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return {left:b.left,right:b.right,height:b.height,control:n.tagName==='BUTTON'||n.tagName==='INPUT'};}));
    for(const b of boxes){expect(b.left).toBeGreaterThanOrEqual(-.5);expect(b.right).toBeLessThanOrEqual(320.5);if(b.control)expect(b.height).toBeGreaterThanOrEqual(44);}
    const labels=await lab.locator('svg text').evaluateAll(nodes=>nodes.map(n=>{const t=n as SVGTextElement,b=t.getBoundingClientRect(),svg=t.ownerSVGElement!.getBoundingClientRect();return {font:getComputedStyle(t).fontFamily,size:parseFloat(getComputedStyle(t).fontSize)*Math.abs(t.getScreenCTM()!.a),left:b.left,right:b.right,top:b.top,bottom:b.bottom,svgLeft:svg.left,svgRight:svg.right,svgTop:svg.top,svgBottom:svg.bottom};}));
    for(const label of labels){expect(label.font).toMatch(/sans-serif/);expect(label.size).toBeGreaterThanOrEqual(11);expect(label.left).toBeGreaterThanOrEqual(label.svgLeft);expect(label.right).toBeLessThanOrEqual(label.svgRight);expect(label.top).toBeGreaterThanOrEqual(label.svgTop);expect(label.bottom).toBeLessThanOrEqual(label.svgBottom);}
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  await lab.screenshot({path:OUT+'/images-phone-contrast.png'});
  expect(errors).toEqual([]);
});
