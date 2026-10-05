import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = 'reports/sky-lab-cosmic-calendar-2026-10-01';
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











const root=page=>page.locator('#astronomy-calendar-lab');
const saved=page=>page.evaluate(()=>(window as any).__toolData.astronomy);
const linked=page=>page.evaluate(()=>{
 const m=(window as any).__alloAstroPure.cosmicCalendarModel((window as any).__toolData.astronomy);
 const el=document.querySelector('#astronomy-calendar-lab')!;
 return {m, values:Object.fromEntries(Array.from(el.querySelectorAll('[data-calendar-metric]')).map(n=>[n.getAttribute('data-calendar-metric'),Number(n.getAttribute('data-value'))])),
  date:el.querySelector('[data-calendar-date]')!.textContent,yearX:Number(el.querySelector('#astronomy-cosmic-calendar-diagram')!.getAttribute('data-marker-x')),
  rows:Array.from(el.querySelectorAll('[data-calendar-row]')).map(n=>({id:n.getAttribute('data-calendar-row'),seconds:Number(n.getAttribute('data-before-end')),x:Number(n.getAttribute('data-marker-x'))})),
  lifetime:Number(el.querySelector('[data-calendar-lifetime-seconds]')!.getAttribute('data-calendar-lifetime-seconds'))};
});
function check(v) {
 for(const[k,n]of Object.entries(v.values))expect(n,k).toBe(v.m.selected.position[k]);
 expect(v.date).toBe(v.m.selected.position.date);expect(v.yearX).toBe(30+300*v.m.selected.position.yearFraction);
 expect(v.lifetime).toBe(v.m.lifetime.beforeEndSeconds);
 for(const row of v.rows){
  const p=row.id==='lifetime'?v.m.lifetime:v.m.events.find(e=>e.id===row.id).position;
  expect(row.seconds).toBe(p.beforeEndSeconds);expect(row.x).toBe(30+300*(1-p.beforeEndSeconds/v.m.windowSeconds));
 }
}

test('all milestone choices link computed dates, markers, source ages and saved notes',async({page})=>{
 const errors=await mount(page,{tab:'galaxies',hrHunt:{hypothesis:'Keep my notebook'},rotationGalaxy:'NGC6503',cosmoZ:4,inflationFolds:8}),lab=root(page);
 const events=(await linked(page)).m.events;
 for(const e of events){
  await page.locator('#astronomy-cc-tab-'+e.id).click();const v=await linked(page);check(v);expect(v.m.selectedId).toBe(e.id);
  await expect(page.locator('#astronomy-cc-panel')).toHaveAttribute('aria-labelledby','astronomy-cc-tab-'+e.id);
  await expect(page.locator('#astronomy-cc-panel a')).toHaveAttribute('href',e.href);
 }
 const state=await saved(page);expect(state.hrHunt.hypothesis).toBe('Keep my notebook');expect(state.rotationGalaxy).toBe('NGC6503');expect(state.cosmoZ).toBe(4);expect(state.inflationFolds).toBe(8);
 await page.locator('#astronomy-cc-tab-dec31').click();await lab.getByRole('button',{name:'Hour',exact:true}).click();
 await lab.screenshot({path:OUT+'/calendar-desktop.png'});expect(errors).toEqual([]);
});

test('roving tabs wrap, preserve focus and navigate with Home and End',async({page})=>{
 const errors=await mount(page,{tab:'galaxies'});const first=page.locator('#astronomy-cc-tab-jan1');
 await first.focus();await first.press('ArrowLeft');await expect(page.locator('#astronomy-cc-tab-now')).toBeFocused();
 expect((await linked(page)).m.selectedId).toBe('now');
 await page.locator('#astronomy-cc-tab-now').press('ArrowRight');await expect(first).toBeFocused();
 await first.press('ArrowDown');await expect(page.locator('#astronomy-cc-tab-cmb')).toBeFocused();
 await page.locator('#astronomy-cc-tab-cmb').press('End');await expect(page.locator('#astronomy-cc-tab-now')).toBeFocused();
 await page.locator('#astronomy-cc-tab-now').press('Home');await expect(first).toBeFocused();
 expect(await root(page).locator('[role=\"tab\"][tabindex=\"0\"]').count()).toBe(1);expect(errors).toEqual([]);
});

test('zoom rows accept touch and keyboard without jumping the scale or faking offscreen markers',async({page})=>{
 const errors=await mount(page,{tab:'galaxies',selectedCC:'dec31',ccZoom:'second'}),lab=root(page);
 await expect(page.locator('#astronomy-cc-zoom-status')).toHaveAttribute('data-selected-visible','false');expect(await lab.locator('[data-calendar-row=\"dec31\"]').count()).toBe(0);
 await lab.getByRole('button',{name:'Hour',exact:true}).click();const humans=page.locator('#astronomy-cc-zoom-dec31');
 await humans.focus();await humans.press('Enter');await expect(humans).toBeFocused();check(await linked(page));
 const farm=page.locator('#astronomy-cc-zoom-agriculture');await farm.tap();expect((await linked(page)).m.selectedId).toBe('agriculture');expect((await saved(page)).ccZoom).toBe('hour');
 await humans.focus();await humans.press('Space');expect((await linked(page)).m.selectedId).toBe('dec31');await expect(humans).toBeFocused();
 await humans.dispatchEvent('pointercancel',{pointerId:97,pointerType:'touch'});await farm.tap();
 await lab.getByRole('button',{name:'Minute',exact:true}).click();await expect(page.locator('#astronomy-cc-zoom-status')).toHaveAttribute('data-selected-visible','true');
 await lab.getByRole('button',{name:'Second',exact:true}).click();await expect(page.locator('#astronomy-cc-zoom-status')).toHaveAttribute('data-selected-visible','false');check(await linked(page));expect(errors).toEqual([]);
});

test('lifetime range and examples stay synchronized across scales, including zero',async({page})=>{
 const errors=await mount(page,{tab:'galaxies',ccLifetimeYears:12}),lab=root(page),range=page.locator('#astronomy-cc-lifetime');
 for(const age of[1,12,80]){await lab.getByRole('button',{name:age+(age===1?' year':' years'),exact:true}).click();await expect(range).toHaveValue(String(age));check(await linked(page));}
 await range.focus();await range.press('ArrowRight');await expect(range).toBeFocused();expect((await linked(page)).m.lifetimeYears).toBe(81);
 await range.press('Home');expect((await linked(page)).lifetime).toBe(0);check(await linked(page));
 await range.press('End');expect((await linked(page)).m.lifetimeYears).toBe(100);
 for(const name of['Hour','Minute','Second']){await lab.getByRole('button',{name,exact:true}).click();check(await linked(page));}
 await lab.getByRole('button',{name:'12 years',exact:true}).click();await expect(page.locator('[data-calendar-lifetime-seconds]')).toContainText('0.0274');
 expect(errors).toEqual([]);
});

test('restored legacy selections and malformed controls recover coherently while retaining other work',async({page})=>{
 let errors=await mount(page,{tab:'galaxies',selectedCC:'aug28',ccZoom:'hour',ccLifetimeYears:'12.8',hrHunt:{hypothesis:'Saved investigation'}});
 let v=await linked(page);check(v);expect(v.m.selectedId).toBe('aug28');expect(v.date).toContain('September 1');expect(v.m.lifetimeYears).toBe(13);await expect(page.locator('#astronomy-cc-lifetime')).toHaveValue('13');
 await root(page).getByRole('button',{name:'Second',exact:true}).click();const state=await saved(page);
 errors.push(...await mount(page,state));v=await linked(page);expect(v.m.zoom).toBe('second');expect(v.m.selectedId).toBe('aug28');expect((await saved(page)).hrHunt.hypothesis).toBe('Saved investigation');
 errors.push(...await mount(page,{tab:'galaxies',selectedCC:{forged:true},ccZoom:[],ccLifetimeYears:true,hrHunt:{hypothesis:'Preserve me'}}));
 v=await linked(page);check(v);expect(v.m.selectedId).toBe('jan1');expect(v.m.zoom).toBe('minute');expect(v.m.lifetimeYears).toBe(12);expect((await saved(page)).hrHunt.hypothesis).toBe('Preserve me');
 await root(page).getByRole('button',{name:'80 years',exact:true}).click();expect((await saved(page)).ccLifetimeYears).toBe(80);expect(errors).toEqual([]);
});

test('320px contrast retains readable, unclipped figures and 44px controls with clear age limits',async({page})=>{
 await page.setViewportSize({width:320,height:900});const errors=await mount(page,{tab:'galaxies',selectedCC:'mar15',ccZoom:'hour'},true),lab=root(page);
 await lab.getByText('Scale, sources and limits',{exact:true}).click();
 await expect(lab.locator('[data-calendar-basis]')).toHaveAttribute('data-calendar-basis','phase');
 await expect(lab).toContainText('uncertainty is not propagated');
 const collect=()=>lab.evaluate(el=>{
  const svgs=Array.from(el.querySelectorAll('svg'));
  return {overflow:el.scrollWidth>el.clientWidth+1,background:getComputedStyle(el).backgroundColor,svgs:svgs.map(svg=>{
   const view=svg.viewBox.baseVal,scale=svg.getBoundingClientRect().width/view.width;
   return {id:svg.id,text:Array.from(svg.querySelectorAll('text')).map(t=>{
    const b=t.getBBox(),matrix=svg.getScreenCTM()!.inverse().multiply(t.getScreenCTM()!);const points=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(matrix));return {label:t.textContent,font:parseFloat(getComputedStyle(t).fontSize)*scale,left:Math.min(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),right:Math.max(...points.map(p=>p.x)),bottom:Math.max(...points.map(p=>p.y)),width:view.width,height:view.height};}),
    rows:Array.from(svg.querySelectorAll('[data-calendar-row]')).map(g=>({id:g.getAttribute('data-calendar-row'),height:g.getBoundingClientRect().height}))};
  }),targets:Array.from(el.querySelectorAll('button,input,summary,a')).map(n=>({label:n.textContent,height:n.getBoundingClientRect().height}))};
 });
 let geometry=await collect();expect(geometry.overflow).toBe(false);expect(geometry.background).toBe('rgb(0, 0, 0)');expect(geometry.svgs).toHaveLength(2);
 for(const svg of geometry.svgs)for(const t of svg.text){
  expect(t.font,svg.id+' '+t.label).toBeGreaterThanOrEqual(11);
  expect(t.left,svg.id+' '+t.label).toBeGreaterThanOrEqual(-.5);expect(t.top,svg.id+' '+t.label).toBeGreaterThanOrEqual(-.5);
  expect(t.right,svg.id+' '+t.label).toBeLessThanOrEqual(t.width+.5);expect(t.bottom,svg.id+' '+t.label).toBeLessThanOrEqual(t.height+.5);
 }
 for(const svg of geometry.svgs)for(let i=0;i<svg.text.length;i++)for(let j=i+1;j<svg.text.length;j++){const a=svg.text[i],b=svg.text[j];const overlapX=Math.min(a.right,b.right)-Math.max(a.left,b.left),overlapY=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);expect(overlapX>1&&overlapY>1,svg.id+' '+a.label+' overlaps '+b.label).toBe(false);}
 for(const t of geometry.targets)expect(t.height,t.label||'range').toBeGreaterThanOrEqual(44);
 for(const svg of geometry.svgs)for(const r of svg.rows)expect(r.height,r.id).toBeGreaterThanOrEqual(44);
 writeFileSync(OUT+'/phone-geometry.json',JSON.stringify(geometry,null,2)+'\n');
 await lab.screenshot({path:OUT+'/calendar-phone-contrast.png'});
 await lab.locator('figure').first().screenshot({path:OUT+'/calendar-year-phone.png'});
 await lab.locator('figure').nth(1).screenshot({path:OUT+'/calendar-hour-phone.png'});
 await page.locator('#astronomy-cc-tab-now').click();await lab.getByRole('button',{name:'Second',exact:true}).click();
 await lab.locator('figure').nth(1).screenshot({path:OUT+'/calendar-second-phone.png'});
 const v=await linked(page);check(v);expect(v.date).toContain('Year end');expect(v.m.selected.position.beforeEndSeconds).toBe(0);expect(errors).toEqual([]);
});
