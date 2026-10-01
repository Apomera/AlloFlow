# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: moon-mission-powered-approach.spec.ts >> corrupt terminal save restarts unverified and manual landing keeps its practice reserve
- Location: tests\e2e\moon-mission-powered-approach.spec.ts:25:5

# Error details

```
Error: expect(received).toBeNull()

Received: {"altitude": 299.99999999720603, "deltaV": 1967.4408364978792, "downrange": 513668.49611169763, "duration": 720.0023993750123, "mass": 7984.149295460494, "outcome": "handover", "planDuration": 720, "propellantRemaining": 974.1492954604937, "propellantUsed": 7225.850704539506, "radialSpeed": -9.000586675847869, "saturatedSeconds": 0, "tangentialSpeed": 3.9998687398630643, "version": 1}
```

# Test source

```ts
  1  | import { test, expect, type Page, type TestInfo } from '@playwright/test';
  2  | import { mkdir, writeFile } from 'node:fs/promises';
  3  | import { resolve, join } from 'node:path';
  4  | import { GlHarness } from './helpers/stem_gl_harness';
  5  | const REPORT=resolve('reports/moon-mission-enhancement-pass9-2026-09-29/browser');
  6  | const harness=new GlHarness({toolFile:'stem_lab/stem_tool_moonmission.js',toolId:'moonMission',width:1100,height:1000,layout:'document',appStyles:true});
  7  | const seed=(extra:Record<string,unknown>={})=>({moonMission:{missionPhase:5,missionXP:0,missionLog:[],animPaused:true,soundOff:true,difficulty:'pilot',earnedBadges:{first_step:true,mission_complete:true},...extra}});
  8  | async function mount(page:Page,data=seed()) {await page.goto(harness.url+'/__harness');await page.waitForFunction(()=>!!(window as any).StemLab?._registry?.moonMission);await page.evaluate(value=>{document.getElementById('wrap')!.style.width='100%';Math.random=()=>0.999;(window as any).__mount(value);},data);await expect(page.locator('[data-approach-canvas]')).toBeVisible();await expect.poll(()=>page.locator('[data-approach-canvas]').getAttribute('data-approach-time')).not.toBeNull();}
  9  | async function saved(page:Page){return page.evaluate(()=>JSON.parse(JSON.stringify((window as any).__toolData.moonMission)));}
  10 | async function live(page:Page){return page.locator('[data-approach-canvas]').evaluate((cv:HTMLCanvasElement)=>({time:Number(cv.dataset.approachTime),altitude:Number(cv.dataset.approachAltitude),radial:Number(cv.dataset.approachRadial),tangential:Number(cv.dataset.approachTangential),mass:Number(cv.dataset.approachMass),thrust:Number(cv.dataset.approachThrust),pitch:Number(cv.dataset.approachPitch),plume:cv.dataset.approachPlume,recorded:cv.dataset.approachRecorded}));}
  11 | async function seek(page:Page,time:number){await page.locator('[data-approach-seek]').evaluate((el:HTMLInputElement,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},time);await expect.poll(async()=>Math.abs((await live(page)).time-time)).toBeLessThan(0.11);}
  12 | async function capture(page:Page,info:TestInfo,name:string){await mkdir(REPORT,{recursive:true});const path=join(REPORT,name+'-'+info.project.name+'.png');await page.locator('[data-approach-workspace]').screenshot({path});await info.attach(name,{path,contentType:'image/png'});}
  13 | test.describe.configure({timeout:180000,retries:0});test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
  14 | test('approach instruments, thrust direction and both cameras follow the computed trajectory',async({page},info)=>{
  15 |   const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page);expect((await live(page)).plume).toBe('false');await seek(page,300);const s=await live(page),expected=await page.evaluate(t=>(window as any).MoonMissionPure.approachSample((window as any).MoonMissionPure.approachProfile(),t),s.time);
  16 |   expect(s.altitude).toBeCloseTo(expected.altitude,6);expect(s.radial).toBeCloseTo(expected.radialSpeed,6);expect(s.tangential).toBeCloseTo(expected.tangentialSpeed,6);expect(s.mass).toBeCloseTo(expected.mass,6);expect(s.thrust).toBeCloseTo(expected.thrust,6);expect(s.pitch).toBeLessThan(0);expect(s.plume).toBe('true');await capture(page,info,'approach-whole');
  17 |   await page.locator('[data-approach-view]').selectOption('local');expect(await live(page)).toEqual(s);await capture(page,info,'approach-local');
  18 |   await page.locator('[data-approach-milestone="lowGate"]').click();expect((await live(page)).altitude).toBeLessThanOrEqual(2000);await capture(page,info,'approach-low-gate');expect(errors).toEqual([]);
  19 | });
  20 | test('review, rewind, reload and plan changes retain only matching computed evidence',async({page},info)=>{
  21 |   await mount(page);await page.locator('[data-approach-review]').click();await expect(page.locator('[data-approach-result]')).toBeVisible();const end=await live(page),data=await saved(page);expect(end.altitude).toBeCloseTo(300,6);expect(end.radial).toBeCloseTo(-9,2);expect(data.missionXP).toBe(0);expect(data.approachRun.recorded).toBe(true);await capture(page,info,'approach-handover');
  22 |   await seek(page,100);await mount(page,seed(await saved(page)));expect((await live(page)).time).toBeCloseTo(100,6);expect((await saved(page)).approachRun.recorded).toBe(true);
  23 |   await page.locator('[data-approach-plan]').selectOption('600');await expect(page.locator('[data-approach-result]')).toHaveCount(0);expect((await live(page)).time).toBe(0);await page.locator('[data-approach-review]').click();const short=await saved(page);expect(short.approachResult.saturatedSeconds).toBeGreaterThan(100);expect(short.approachResult.propellantUsed).toBeLessThan(data.approachResult.propellantUsed);await capture(page,info,'approach-short-plan');
  24 | });
  25 | test('corrupt terminal save restarts unverified and manual landing keeps its practice reserve',async({page})=>{
> 26 |   await mount(page);await page.locator('[data-approach-review]').click();const raw=await saved(page);raw.approachResult.mass+=10;await mount(page,seed(raw));expect((await live(page)).time).toBe(0);expect((await saved(page)).approachResult).toBeNull();await page.waitForTimeout(250);expect((await saved(page)).approachRun.recorded).toBe(false);
     |                                                                                                                                                                                                                                                 ^ Error: expect(received).toBeNull()
  27 |   await page.locator('[data-approach-plan]').selectOption('900');await page.locator('[data-approach-review]').click();await page.getByRole('button',{name:/Begin Descent/}).click();await expect(page.locator('[data-descent-canvas]')).toBeVisible();await page.locator('[data-descent-pause]').click();expect(Number(await page.locator('[data-descent-canvas]').getAttribute('data-descent-fuel'))).toBeCloseTo(110,1);expect((await saved(page)).missionXP).toBe(0);await expect(page.locator('[data-approach-canvas]')).toHaveCount(0);
  28 | });
  29 | test('approach clock freezes while hidden and resumes without catch-up',async({page})=>{
  30 |   await mount(page);await page.locator('[data-approach-rate]').selectOption('10');await page.locator('[data-approach-pause]').click();await expect.poll(async()=>(await live(page)).time).toBeGreaterThan(1);
  31 |   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});const held=await live(page);await page.waitForTimeout(500);expect(await live(page)).toEqual(held);
  32 |   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(150);expect((await live(page)).time-held.time).toBeLessThan(4);await page.locator('[data-approach-pause]').click();const paused=await live(page);await page.waitForTimeout(150);expect(await live(page)).toEqual(paused);
  33 | });
  34 | test('320px keyboard, resize, reload and accessibility preserve the measured approach',async({page},info)=>{
  35 |   await page.setViewportSize({width:320,height:850});await mount(page);const slider=page.locator('[data-approach-seek]');await slider.focus();await page.keyboard.press('ArrowRight');await expect.poll(async()=>(await live(page)).time).toBeGreaterThan(0);await page.keyboard.press('End');await expect(page.locator('[data-approach-result]')).toBeVisible();const end=await live(page);await page.setViewportSize({width:500,height:850});expect(await live(page)).toEqual(end);await page.setViewportSize({width:320,height:850});await mount(page,seed(await saved(page)));expect(await live(page)).toEqual(end);await capture(page,info,'approach-phone-320');
  36 |   expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)).toBe(false);
  37 |   await page.addScriptTag({path:resolve('node_modules/axe-core/axe.min.js')});const violations=await page.evaluate(async()=>{const r=await (window as any).axe.run(document.querySelector('[data-approach-workspace]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return r.violations;});await writeFile(join(REPORT,'phone-axe.json'),JSON.stringify(violations,null,2));expect(violations).toEqual([]);
  38 | });
  39 | 
```