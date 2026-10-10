# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: moon-mission-descent-shadow.spec.ts >> reduced-motion WebGL casts one actual-hardware shadow and disposes it on context loss
- Location: tests\e2e\moon-mission-descent-shadow.spec.ts:109:5

# Error details

```
Error: page.goto: net::ERR_ABORTED at http://127.0.0.1:49905/__harness
Call log:
  - navigating to "http://127.0.0.1:49905/__harness", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect, type Page, type TestInfo } from '@playwright/test';
  2   | import { mkdir, writeFile } from 'node:fs/promises';
  3   | import { resolve, join } from 'node:path';
  4   | import { GlHarness } from './helpers/stem_gl_harness';
  5   | 
  6   | const REPORT=resolve(process.env.MM_DESCENT_SHADOW_REPORT_DIR||'reports/moon-mission-enhancement-pass24-2026-10-04/browser/shadow');
  7   | const harness=new GlHarness({toolFile:'stem_lab/stem_tool_moonmission.js',toolId:'moonMission',width:1100,height:1000,layout:'document',appStyles:true});
  8   | const seed=(extra:Record<string,unknown>={})=>({moonMission:{missionPhase:5,descentStarted:true,animPaused:true,soundOff:true,
  9   |   difficulty:'pilot',missionXP:42,landingRewarded:true,lunarSamples:[],quizCorrect:0,earnedBadges:{first_step:true,mission_complete:true},...extra}});
  10  | test.describe.configure({timeout:180000,retries:0});
  11  | test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
  12  | async function mount(page:Page,data=seed(),probe=false){
> 13  |   await page.goto(harness.url+'/__harness');await page.waitForFunction(()=>!!(window as any).StemLab?._registry?.moonMission);
      |              ^ Error: page.goto: net::ERR_ABORTED at http://127.0.0.1:49905/__harness
  14  |   await page.evaluate(({data,probe})=>{
  15  |     Math.random=()=>.999;document.getElementById('wrap')!.style.width='100%';
  16  |     if(probe){
  17  |       const T=(window as any).THREE,Original=T.WebGLRenderer;
  18  |       const Capture=function(...args:any[]){
  19  |         const renderer=new Original(...args),render=renderer.render;
  20  |         renderer.render=function(scene:any,camera:any){
  21  |           const lander=scene.getObjectByName('moon-descent-lander');
  22  |           if(lander)(window as any).__shadowGL={renderer,scene,camera,lander,shadow:scene.getObjectByName('moon-descent-shadow-caster')};
  23  |           return render.apply(renderer,arguments);
  24  |         };return renderer;
  25  |       };Capture.prototype=Original.prototype;Object.setPrototypeOf(Capture,Original);T.WebGLRenderer=Capture;
  26  |     }
  27  |     (window as any).__mount(data);
  28  |   },{data,probe});
  29  |   await expect(page.locator('[data-descent-canvas]')).toHaveCount(1);
  30  |   await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused','true');
  31  | }
  32  | async function flight(page:Page){return page.locator('[data-descent-canvas]').evaluate((c:any)=>c._descentState());}
  33  | async function receipts(page:Page){return page.evaluate(()=>{
  34  |   const d=(window as any).__toolData.moonMission;return JSON.parse(JSON.stringify({missionXP:d.missionXP,landingResult:d.landingResult,
  35  |     landingAttempts:d.landingAttempts,landingRewarded:d.landingRewarded}));
  36  | });}
  37  | async function physicalRecording(page:Page,right=true){return page.evaluate(right=>{
  38  |   const P=(window as any).MoonMissionPure,s:any={alt:300,vVel:-9,hVel:4,fuel:110,thrust:0,tilt:0,x:0,elapsed:0};
  39  |   const rec=P.newDescentRecording();P.recordDescent(rec,s,false);
  40  |   for(let i=0;i<3000&&!s.contact;i++){
  41  |     P.descentStep(s,s.alt<45?{throttle:.32,left:!right,right}: {},1/60);P.recordDescent(rec,s,!!s.contact);
  42  |   }
  43  |   if(!s.contact)throw Error('Original integrator did not reach contact');
  44  |   return {crashed:true,score:0,grade:'—',vVel:Math.abs(s.vVel),hVel:Math.abs(s.hVel),fuel:Math.round(s.fuel),fuelUnit:'s',recording:P.cleanDescentRecording(rec)};
  45  | },right);}
  46  | async function inspectNearSurface(page:Page,result:any){
  47  |   const row=result.recording.samples.findIndex((p:any)=>p.alt>0&&p.alt<20&&Math.abs(p.tilt)>.25);
  48  |   expect(row).toBeGreaterThan(0);await page.locator('[data-landing-scrub]').fill(String(row));
  49  |   await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-review-time',result.recording.samples[row].t.toFixed(3));
  50  |   return result.recording.samples[row];
  51  | }
  52  | async function sidePose(page:Page,row?:any){
  53  |   await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-side-pivot-y',/^-?\d/);
  54  |   const value=await page.locator('[data-descent-canvas]').evaluate((c:any)=>({pivot:Number(c.dataset.descentSidePivotY),
  55  |     surface:Number(c.dataset.descentSideSurfaceY),clearance:Number(c.dataset.descentSideClearance)}));
  56  |   const tilt=row?row.tilt:(await flight(page)).tilt;
  57  |   const pose=await page.evaluate(({surface,clearance,tilt})=>(window as any).MoonMissionPure.descentSidePose(surface,clearance,tilt),{...value,tilt});
  58  |   expect(value.pivot).toBeCloseTo(pose.pivotY,9);
  59  |   const gaps=pose.pads.map(p=>value.surface-p.y-p.radius);
  60  |   expect(Math.min(...gaps)).toBeCloseTo(value.clearance,8);expect(gaps.every(g=>g>=value.clearance-1e-8)).toBe(true);
  61  |   return {value,pose,gaps};
  62  | }
  63  | async function capture(page:Page,info:TestInfo,name:string){
  64  |   await mkdir(REPORT,{recursive:true});const path=join(REPORT,name+'.png');
  65  |   const clip=await page.locator('[data-descent-canvas]').evaluate((c:HTMLElement)=>{
  66  |     const b=c.parentElement!.getBoundingClientRect();return {x:b.left+scrollX,y:b.top+scrollY,width:b.width,height:b.height};
  67  |   });await page.screenshot({path,fullPage:true,clip,animations:'disabled'});await info.attach(name,{path,contentType:'image/png'});
  68  | }
  69  | async function notes(page:Page,name:string){
  70  |   const note=page.locator('[data-descent-shadow-note]');await note.locator('..').locator('summary').click();await expect(note).toBeVisible();
  71  |   await page.addScriptTag({path:resolve('node_modules/axe-core/axe.min.js')});
  72  |   const violations=await note.evaluate(async n=>(await (window as any).axe.run(n.parentElement,
  73  |     {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations);
  74  |   await mkdir(REPORT,{recursive:true});await writeFile(join(REPORT,name+'-axe.json'),JSON.stringify({violations},null,2));expect(violations).toEqual([]);
  75  | }
  76  | 
  77  | test.describe('side-view landing support',()=>{
  78  |   test.beforeEach(async({page})=>page.addInitScript(()=>{
  79  |     const original=HTMLCanvasElement.prototype.getContext;(HTMLCanvasElement.prototype as any).getContext=function(type:string,...args:any[]){
  80  |       if(/webgl/i.test(type))return null;return (original as any).apply(this,[type,...args]);
  81  |     };
  82  |   }));
  83  |   test('recorded left and right banks preserve visible pad clearance through contact',async({page},info)=>{
  84  |     await mount(page);const evidence=[];
  85  |     for(const right of [false,true]){
  86  |       const result=await physicalRecording(page,right);await mount(page,seed({landingResult:result,landingAttempts:[result]}));
  87  |       const held=await flight(page),saved=await receipts(page),row=await inspectNearSurface(page,result);
  88  |       evidence.push(await sidePose(page,row));await capture(page,info,right?'right-bank-approach':'left-bank-approach');
  89  |       await page.getByRole('button',{name:'Return to touchdown',exact:true}).click();
  90  |       await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-review-time','');
  91  |       const contact=await sidePose(page);expect(contact.value.clearance).toBe(0);evidence.push(contact);
  92  |       await capture(page,info,right?'right-bank-contact':'left-bank-contact');expect(await flight(page)).toEqual(held);expect(await receipts(page)).toEqual(saved);
  93  |     }
  94  |     await notes(page,'desktop');await writeFile(join(REPORT,'side-support-evidence.json'),JSON.stringify(evidence,null,2));
  95  |   });
  96  |   test('320 px fallback keeps tilted pads clear and explains high-contrast shadow limits',async({page},info)=>{
  97  |     await page.setViewportSize({width:320,height:850});await page.emulateMedia({reducedMotion:'reduce'});await mount(page);
  98  |     const result=await physicalRecording(page,true);await mount(page,seed({landingResult:result,landingAttempts:[result]}));
  99  |     const saved=await receipts(page),held=await flight(page);await sidePose(page);await capture(page,info,'phone-tilted-contact');
  100 |     expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  101 |     await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await notes(page,'phone-forced');
  102 |     const note=page.locator('[data-descent-shadow-note]');const clip=await note.locator('..').evaluate((n:HTMLElement)=>{
  103 |       const b=n.getBoundingClientRect();return {x:b.left+scrollX,y:b.top+scrollY,width:b.width,height:b.height};
  104 |     });await page.screenshot({path:join(REPORT,'phone-shadow-notes-forced.png'),fullPage:true,clip});
  105 |     await page.waitForTimeout(250);expect(await receipts(page)).toEqual(saved);expect(await flight(page)).toEqual(held);
  106 |   });
  107 | });
  108 | 
  109 | test('reduced-motion WebGL casts one actual-hardware shadow and disposes it on context loss',async({page},info)=>{
  110 |   const errors:string[]=[],shaderErrors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  111 |   page.on('console',m=>{if(m.type()==='error'&&/shader|GL_INVALID|VALIDATE_STATUS/i.test(m.text()))shaderErrors.push(m.text());});
  112 |   await page.addInitScript(()=>Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,value:4}));
  113 |   await page.emulateMedia({reducedMotion:'reduce'});await mount(page,seed(),true);
```