import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = 'reports/sky-lab-optics-2026-09-29';
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





test('design tabs and light stages preserve focus and explain the folded reflector path',async({page})=>{
  const errors=await mount(page,{tab:'observe'}),lab=page.locator('#astronomy-scope-lab');
  await expect(lab.locator('#astronomy-scope-refractor-diagram')).toBeVisible();
  await lab.screenshot({path:OUT+'/refractor-desktop.png'});
  const first=lab.getByRole('tab',{name:'Refractor · lens',exact:true}),second=lab.getByRole('tab',{name:'Reflector · mirror',exact:true});
  await first.focus();await first.press('ArrowRight');await expect(second).toBeFocused();await expect(second).toHaveAttribute('aria-selected','true');
  await expect(lab.getByRole('tabpanel')).toHaveAttribute('aria-labelledby','astronomy-scope-tab-reflector');
  const stages=lab.getByRole('group',{name:'Follow the light path',exact:true});
  for(const [title,id]of [['1 · Collect','collect'],['2 · Focus','focus'],['3 · View','eyepiece'],['All rays','all']]){
    const button=stages.getByRole('button',{name:title,exact:true});await button.click();await expect(button).toBeFocused();await expect(button).toHaveAttribute('aria-pressed','true');
    await expect(lab.locator('#astronomy-scope-reflector-diagram')).toHaveAttribute('data-ray-view',id);
    for(const target of ['collect','focus','eyepiece'])await expect(lab.locator('[data-ray-stage="'+target+'"]')).toHaveAttribute('opacity',id==='all'||target===id?'1':'0.18');
    if(id==='focus')await expect(lab.locator('#astronomy-scope-ray-status')).toContainText('side focus after the secondary');
  }
  await lab.screenshot({path:OUT+'/reflector-desktop.png'});
  await second.focus();await second.press('Home');await expect(first).toBeFocused();await first.press('End');await expect(second).toBeFocused();
  expect(errors).toEqual([]);
});

test('real telescope presets connect the selected optics to the field preview',async({page})=>{
  const errors=await mount(page,{tab:'observe',eyepieceTarget:'moon',eyEpField:80,eySeeing:4,eyBortle:7}),lab=page.locator('#astronomy-scope-lab');
  await lab.getByRole('button',{name:'AstroMaster 90EQ · 20 mm',exact:true}).click();
  await expect(lab.getByRole('button',{name:'AstroMaster 90EQ · 20 mm',exact:true})).toBeFocused();
  await expect(lab.locator('#astronomy-scope-stats')).toContainText('50×');
  await expect(lab.locator('#astronomy-scope-pupil')).toHaveAttribute('data-exit-pupil','1.8');
  await lab.getByRole('button',{name:'AstroMaster 130EQ · 20 mm',exact:true}).click();
  await expect(lab.getByRole('tab',{name:'Reflector · mirror',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(lab.locator('#astronomy-scope-stats')).toContainText('32.5×');
  await expect(lab.locator('#astronomy-scope-pupil')).toHaveAttribute('data-exit-pupil','4');
  const aperture=lab.locator('#astronomy-scope-aperture');await aperture.focus();await aperture.press('ArrowRight');
  await expect(aperture).toBeFocused();await expect(aperture).toHaveValue('140');await expect(lab.locator('#astronomy-scope-focal-length')).toHaveValue('650');
  await expect(lab.getByRole('button',{name:'AstroMaster 130EQ · 20 mm',exact:true})).toHaveAttribute('aria-pressed','false');
  await lab.getByRole('button',{name:'Preview this setup in the field lab',exact:true}).click();
  const field=page.locator('#astronomy-eyepiece-lab');await expect(field).toBeFocused();
  for(const[id,value]of [['ap','140'],['fl','650'],['ep','20'],['fld','80'],['see','4'],['bort','7']])await expect(field.locator('#astr-ey-'+id)).toHaveValue(value);
  await expect(field.getByRole('button',{name:'The Moon',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(field.locator('#astronomy-eyepiece-measurements')).toContainText('32.5×');
  expect(errors).toEqual([]);
});

test('extreme optics, saved stages and corrupted state remain coherent',async({page})=>{
  const errors=await mount(page,{tab:'observe',scopeType:'reflector',scopeRayStage:'focus',scopeAperture:50,scopeFocalLen:3000,eyepieceFl:4}),lab=page.locator('#astronomy-scope-lab');
  await expect(lab.locator('#astronomy-scope-status')).toContainText('750 times magnification');
  await expect(lab.locator('#astronomy-scope-status')).toContainText('approximate useful limit of 100 times.');
  await lab.screenshot({path:OUT+'/high-power-desktop.png'});
  await page.getByRole('combobox',{name:'Explore a section'}).selectOption('stars');
  await page.getByRole('combobox',{name:'Explore a section'}).selectOption('observe');
  await expect(lab.locator('#astronomy-scope-reflector-diagram')).toHaveAttribute('data-ray-view','focus');
  await expect(lab.locator('#astronomy-scope-eyepiece')).toHaveValue('4');
  await lab.getByRole('button',{name:'Reset telescope simulator',exact:true}).click();
  await expect(lab.getByRole('button',{name:'Reset telescope simulator',exact:true})).toBeFocused();
  await expect(lab.locator('#astronomy-scope-refractor-diagram')).toHaveAttribute('data-ray-view','all');
  for(const[id,value]of [['aperture','100'],['focal-length','1000'],['eyepiece','25']])await expect(lab.locator('#astronomy-scope-'+id)).toHaveValue(value);
  await page.evaluate(()=>{(window as any).__destroy();(window as any).__mount({tab:'observe',scopeType:{bad:true},scopeAperture:true,scopeFocalLen:'',eyepieceFl:[],scopeRayStage:{bad:true}});});
  for(const[id,value]of [['aperture','100'],['focal-length','1000'],['eyepiece','25']])await expect(lab.locator('#astronomy-scope-'+id)).toHaveValue(value);
  await expect(lab).not.toContainText(/NaN|Infinity|\[object Object\]/);expect(errors).toEqual([]);
});

test('320px contrast layout retains readable diagrams, touch controls and clear limits',async({page})=>{
  await page.setViewportSize({width:320,height:900});
  const errors=await mount(page,{tab:'observe'},true),lab=page.locator('#astronomy-scope-lab');
  for(const name of ['AstroMaster 90EQ · 20 mm','AstroMaster 130EQ · 20 mm']){
    await lab.getByRole('button',{name,exact:true}).click();await expect(lab.getByRole('button',{name,exact:true})).toBeFocused();
    const boxes=await lab.locator('button,input,svg,dl,figcaption').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return{left:b.left,right:b.right,height:b.height,control:n.tagName==='BUTTON'||n.tagName==='INPUT'};}));
    for(const b of boxes){expect(b.left).toBeGreaterThanOrEqual(-.5);expect(b.right).toBeLessThanOrEqual(320.5);if(b.control)expect(b.height).toBeGreaterThanOrEqual(44);}
    const labels=await lab.locator('svg text').evaluateAll(nodes=>nodes.map(n=>{const t=n as SVGTextElement,b=t.getBoundingClientRect(),svg=t.ownerSVGElement!.getBoundingClientRect();return{size:parseFloat(getComputedStyle(t).fontSize)*Math.abs(t.getScreenCTM()!.a),left:b.left,right:b.right,top:b.top,bottom:b.bottom,sleft:svg.left,sright:svg.right,stop:svg.top,sbottom:svg.bottom,font:getComputedStyle(t).fontFamily};}));
    for(const label of labels){expect(label.size).toBeGreaterThanOrEqual(11);expect(label.font).toMatch(/sans-serif/);expect(label.left).toBeGreaterThanOrEqual(label.sleft);expect(label.right).toBeLessThanOrEqual(label.sright);expect(label.top).toBeGreaterThanOrEqual(label.stop);expect(label.bottom).toBeLessThanOrEqual(label.sbottom);}
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  await lab.locator('#astronomy-scope-reference summary').click();
  await expect(lab.getByRole('link',{name:'Celestron · 90EQ',exact:true})).toBeVisible();
  await expect(lab.locator('#astronomy-scope-help')).toContainText('dimensions are not drawn to scale');
  await lab.screenshot({path:OUT+'/reflector-phone-contrast.png'});expect(errors).toEqual([]);
});
