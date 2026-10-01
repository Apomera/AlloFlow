import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = 'reports/sky-lab-spectra-2026-09-29';
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


test('approaching and receding motion produces visible, physically scaled line shifts', async ({page}) => {
  const errors=await mount(page,{tab:'stars'});
  const lab=page.locator('#astronomy-spectrum-lab'), zoom=lab.locator('#astronomy-spectrum-closeup');
  await expect(lab.getByRole('button',{name:'Absorption',exact:true})).toHaveAttribute('aria-pressed','true');
  for(const [button,v,direction] of [['Approaching',-300,'Approaching · blueshift'],['At rest',0,'At rest along the line of sight'],['Moving away',300,'Moving away · redshift']] as const) {
    await lab.getByRole('button',{name:button,exact:true}).click();
    await expect(lab.getByRole('button',{name:button,exact:true})).toBeFocused();
    await expect(zoom).toHaveAttribute('data-velocity-kms',String(v));
    await expect(lab.locator('#astronomy-spectrum-status')).toContainText(direction);
    const rest=Number(await zoom.locator('[data-spectrum-profile="rest"]').getAttribute('data-center-x'));
    const observed=Number(await zoom.locator('[data-spectrum-profile="observed"]').getAttribute('data-center-x'));
    expect(Math.sign(observed-rest)).toBe(Math.sign(v));
  }
  await expect(lab.locator('#astronomy-spectrum-measurements')).toContainText('+0.6572 nm');
  await lab.screenshot({path:OUT+'/absorption-desktop.png'});
  expect(errors).toEqual([]);
});

test('line selection and spectrum modes preserve velocity and teach when lines are absent', async ({page}) => {
  const errors=await mount(page,{tab:'stars',spectrumType:'absorption',dopplerKms:-100});
  const lab=page.locator('#astronomy-spectrum-lab');
  await lab.getByRole('button',{name:'H-beta',exact:true}).click();
  await expect(lab.getByRole('button',{name:'H-beta',exact:true})).toBeFocused();
  await expect(lab.getByRole('button',{name:'H-beta',exact:true})).toHaveAccessibleDescription(/Rest wavelength: 486.2683 nm.*Observed wavelength:/);
  await lab.getByRole('button',{name:'Emission',exact:true}).click();
  await expect(lab.locator('#astronomy-spectrum-overview')).toHaveAttribute('data-mode','emission');
  await expect(lab.locator('#astronomy-spectrum-closeup')).toHaveAttribute('data-line','hb');
  await expect(lab.locator('#astronomy-spectrum-velocity')).toHaveValue('-100');
  await lab.screenshot({path:OUT+'/emission-desktop.png'});
  await lab.getByRole('button',{name:'Continuous',exact:true}).click();
  await expect(lab.getByRole('button',{name:'Continuous',exact:true})).toBeFocused();
  await expect(lab.locator('[data-spectrum-line]')).toHaveCount(0);
  await expect(lab.locator('#astronomy-spectrum-closeup')).toHaveCount(0);
  await expect(lab.locator('#astronomy-spectrum-measurements')).toHaveCount(0);
  await expect(lab.locator('#astronomy-spectrum-velocity')).toBeDisabled();
  await expect(lab.locator('#astronomy-spectrum-status')).toContainText('no sharp lines to track');
  await lab.getByRole('button',{name:'Show absorption lines',exact:true}).click();
  await expect(lab.locator('#astronomy-spectrum-velocity')).toBeEnabled();
  await expect(lab.locator('#astronomy-spectrum-velocity')).toHaveValue('-100');
  await expect(lab.locator('#astronomy-spectrum-closeup')).toHaveAttribute('data-line','hb');
  expect(errors).toEqual([]);
});

test('keyboard, restoration and section navigation retain a coherent comparison', async ({page}) => {
  const errors=await mount(page,{tab:'stars',spectrumType:{forged:true},dopplerKms:'NaN',spectrumLine:[]});
  const lab=page.locator('#astronomy-spectrum-lab'), slider=lab.getByRole('slider',{name:'Doppler radial velocity in km/s',exact:true});
  await expect(slider).toHaveValue('0');
  await slider.focus();await slider.press('ArrowRight');await expect(slider).toHaveValue('10');await expect(slider).toBeFocused();
  await slider.press('Home');await expect(slider).toHaveValue('-300');await slider.press('ArrowLeft');await expect(slider).toHaveValue('-300');
  await slider.press('End');await expect(slider).toHaveValue('300');await slider.press('ArrowRight');await expect(slider).toHaveValue('300');
  await lab.getByRole('button',{name:'H-delta',exact:true}).click();
  await lab.getByRole('button',{name:'Open cosmic redshift lab',exact:true}).click();
  const cosmic=page.locator('#astronomy-redshift-lab');
  await expect(cosmic).toBeFocused();
  expect(await cosmic.evaluate(node=>{const p=document.getElementById('astronomy-main')!,b=node.querySelector('h2')!.getBoundingClientRect(),panel=p.getBoundingClientRect();return b.top>=Math.max(0,panel.top)-1&&b.bottom<=Math.min(innerHeight,panel.bottom)+1;})).toBe(true);
  await page.getByRole('button',{name:'Compare with stellar Doppler shift',exact:true}).click();
  await expect(lab).toBeFocused();
  expect(await lab.evaluate(node=>{const p=document.getElementById('astronomy-main')!,b=node.querySelector('h2')!.getBoundingClientRect(),panel=p.getBoundingClientRect();return b.top>=Math.max(0,panel.top)-1&&b.bottom<=Math.min(innerHeight,panel.bottom)+1;})).toBe(true);
  await expect(slider).toHaveValue('300');
  await expect(lab.locator('#astronomy-spectrum-closeup')).toHaveAttribute('data-line','hd');
  await expect(lab.locator('#astronomy-spectrum-status')).toContainText('H-delta');
  expect(errors).toEqual([]);
});

test('phone contrast layouts keep all modes and magnified profiles within the viewport', async ({page}) => {
  await page.setViewportSize({width:320,height:900});
  const errors=await mount(page,{tab:'stars',spectrumType:'absorption',dopplerKms:300},true);
  const lab=page.locator('#astronomy-spectrum-lab');
  for(const mode of ['Absorption','Emission','Continuous']) {
    await lab.getByRole('button',{name:mode,exact:true}).click();
    await expect(lab.getByRole('button',{name:mode,exact:true})).toBeFocused();
    const boxes=await lab.locator('button,input,svg,dl').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return {left:b.left,right:b.right,height:b.height,control:n.tagName==='BUTTON'||n.tagName==='INPUT'};}));
    for(const b of boxes){expect(b.left).toBeGreaterThanOrEqual(-0.5);expect(b.right).toBeLessThanOrEqual(320.5);if(b.control)expect(b.height).toBeGreaterThanOrEqual(44);}
    const labels=await lab.locator('svg text').evaluateAll(nodes=>nodes.map(n=>{const t=n as SVGTextElement,b=t.getBoundingClientRect(),svg=t.ownerSVGElement!.getBoundingClientRect();return {size:parseFloat(getComputedStyle(t).fontSize)*Math.abs(t.getScreenCTM()!.a),left:b.left,right:b.right,top:b.top,bottom:b.bottom,svgLeft:svg.left,svgRight:svg.right,svgTop:svg.top,svgBottom:svg.bottom};}));
    for(const label of labels){expect(label.size).toBeGreaterThanOrEqual(10.5);expect(label.left).toBeGreaterThanOrEqual(label.svgLeft);expect(label.right).toBeLessThanOrEqual(label.svgRight);expect(label.top).toBeGreaterThanOrEqual(label.svgTop);expect(label.bottom).toBeLessThanOrEqual(label.svgBottom);}
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  await lab.screenshot({path:OUT+'/continuous-phone-contrast.png'});
  await lab.getByRole('button',{name:'Show absorption lines',exact:true}).click();
  await lab.screenshot({path:OUT+'/absorption-phone-contrast.png'});
  expect(errors).toEqual([]);
});
