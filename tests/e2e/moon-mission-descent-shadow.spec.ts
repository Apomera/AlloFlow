import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT=resolve(process.env.MM_DESCENT_SHADOW_REPORT_DIR||'reports/moon-mission-enhancement-pass24-2026-10-04/browser/shadow');
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_moonmission.js',toolId:'moonMission',width:1100,height:1000,layout:'document',appStyles:true});
const seed=(extra:Record<string,unknown>={})=>({moonMission:{missionPhase:5,descentStarted:true,animPaused:true,soundOff:true,
  difficulty:'pilot',missionXP:42,landingRewarded:true,lunarSamples:[],quizCorrect:0,earnedBadges:{first_step:true,mission_complete:true},...extra}});
test.describe.configure({timeout:180000,retries:0});
test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page:Page,data=seed(),probe=false){
  await page.goto(harness.url+'/__harness');await page.waitForFunction(()=>!!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(({data,probe})=>{
    Math.random=()=>.999;document.getElementById('wrap')!.style.width='100%';
    if(probe){
      const T=(window as any).THREE,Original=T.WebGLRenderer;
      const Capture=function(...args:any[]){
        const renderer=new Original(...args),render=renderer.render;
        renderer.render=function(scene:any,camera:any){
          const lander=scene.getObjectByName('moon-descent-lander');
          if(lander)(window as any).__shadowGL={renderer,scene,camera,lander,shadow:scene.getObjectByName('moon-descent-shadow-caster')};
          return render.apply(renderer,arguments);
        };return renderer;
      };Capture.prototype=Original.prototype;Object.setPrototypeOf(Capture,Original);T.WebGLRenderer=Capture;
    }
    (window as any).__mount(data);
  },{data,probe});
  await expect(page.locator('[data-descent-canvas]')).toHaveCount(1);
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused','true');
}
async function flight(page:Page){return page.locator('[data-descent-canvas]').evaluate((c:any)=>c._descentState());}
async function receipts(page:Page){return page.evaluate(()=>{
  const d=(window as any).__toolData.moonMission;return JSON.parse(JSON.stringify({missionXP:d.missionXP,landingResult:d.landingResult,
    landingAttempts:d.landingAttempts,landingRewarded:d.landingRewarded}));
});}
async function physicalRecording(page:Page,right=true){return page.evaluate(right=>{
  const P=(window as any).MoonMissionPure,s:any={alt:300,vVel:-9,hVel:4,fuel:110,thrust:0,tilt:0,x:0,elapsed:0};
  const rec=P.newDescentRecording();P.recordDescent(rec,s,false);
  for(let i=0;i<3000&&!s.contact;i++){
    P.descentStep(s,s.alt<45?{throttle:.32,left:!right,right}: {},1/60);P.recordDescent(rec,s,!!s.contact);
  }
  if(!s.contact)throw Error('Original integrator did not reach contact');
  return {crashed:true,score:0,grade:'—',vVel:Math.abs(s.vVel),hVel:Math.abs(s.hVel),fuel:Math.round(s.fuel),fuelUnit:'s',recording:P.cleanDescentRecording(rec)};
},right);}
async function inspectNearSurface(page:Page,result:any){
  const row=result.recording.samples.findIndex((p:any)=>p.alt>0&&p.alt<20&&Math.abs(p.tilt)>.25);
  expect(row).toBeGreaterThan(0);await page.locator('[data-landing-scrub]').fill(String(row));
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-review-time',result.recording.samples[row].t.toFixed(3));
  return result.recording.samples[row];
}
async function sidePose(page:Page,row?:any){
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-side-pivot-y',/^-?\d/);
  const value=await page.locator('[data-descent-canvas]').evaluate((c:any)=>({pivot:Number(c.dataset.descentSidePivotY),
    surface:Number(c.dataset.descentSideSurfaceY),clearance:Number(c.dataset.descentSideClearance)}));
  const tilt=row?row.tilt:(await flight(page)).tilt;
  const pose=await page.evaluate(({surface,clearance,tilt})=>(window as any).MoonMissionPure.descentSidePose(surface,clearance,tilt),{...value,tilt});
  expect(value.pivot).toBeCloseTo(pose.pivotY,9);
  const gaps=pose.pads.map(p=>value.surface-p.y-p.radius);
  expect(Math.min(...gaps)).toBeCloseTo(value.clearance,8);expect(gaps.every(g=>g>=value.clearance-1e-8)).toBe(true);
  return {value,pose,gaps};
}
async function capture(page:Page,info:TestInfo,name:string){
  await mkdir(REPORT,{recursive:true});const path=join(REPORT,name+'.png');
  const clip=await page.locator('[data-descent-canvas]').evaluate((c:HTMLElement)=>{
    const b=c.parentElement!.getBoundingClientRect();return {x:b.left+scrollX,y:b.top+scrollY,width:b.width,height:b.height};
  });await page.screenshot({path,fullPage:true,clip,animations:'disabled'});await info.attach(name,{path,contentType:'image/png'});
}
async function notes(page:Page,name:string){
  const note=page.locator('[data-descent-shadow-note]');await note.locator('..').locator('summary').click();await expect(note).toBeVisible();
  await page.addScriptTag({path:resolve('node_modules/axe-core/axe.min.js')});
  const violations=await note.evaluate(async n=>(await (window as any).axe.run(n.parentElement,
    {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations);
  await mkdir(REPORT,{recursive:true});await writeFile(join(REPORT,name+'-axe.json'),JSON.stringify({violations},null,2));expect(violations).toEqual([]);
}

test.describe('side-view landing support',()=>{
  test.beforeEach(async({page})=>page.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;(HTMLCanvasElement.prototype as any).getContext=function(type:string,...args:any[]){
      if(/webgl/i.test(type))return null;return (original as any).apply(this,[type,...args]);
    };
  }));
  test('recorded left and right banks preserve visible pad clearance through contact',async({page},info)=>{
    await mount(page);const evidence=[];
    for(const right of [false,true]){
      const result=await physicalRecording(page,right);await mount(page,seed({landingResult:result,landingAttempts:[result]}));
      const held=await flight(page),saved=await receipts(page),row=await inspectNearSurface(page,result);
      evidence.push(await sidePose(page,row));await capture(page,info,right?'right-bank-approach':'left-bank-approach');
      await page.getByRole('button',{name:'Return to touchdown',exact:true}).click();
      await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-review-time','');
      const contact=await sidePose(page);expect(contact.value.clearance).toBe(0);evidence.push(contact);
      await capture(page,info,right?'right-bank-contact':'left-bank-contact');expect(await flight(page)).toEqual(held);expect(await receipts(page)).toEqual(saved);
    }
    await notes(page,'desktop');await writeFile(join(REPORT,'side-support-evidence.json'),JSON.stringify(evidence,null,2));
  });
  test('320 px fallback keeps tilted pads clear and explains high-contrast shadow limits',async({page},info)=>{
    await page.setViewportSize({width:320,height:850});await page.emulateMedia({reducedMotion:'reduce'});await mount(page);
    const result=await physicalRecording(page,true);await mount(page,seed({landingResult:result,landingAttempts:[result]}));
    const saved=await receipts(page),held=await flight(page);await sidePose(page);await capture(page,info,'phone-tilted-contact');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await notes(page,'phone-forced');
    const note=page.locator('[data-descent-shadow-note]');const clip=await note.locator('..').evaluate((n:HTMLElement)=>{
      const b=n.getBoundingClientRect();return {x:b.left+scrollX,y:b.top+scrollY,width:b.width,height:b.height};
    });await page.screenshot({path:join(REPORT,'phone-shadow-notes-forced.png'),fullPage:true,clip});
    await page.waitForTimeout(250);expect(await receipts(page)).toEqual(saved);expect(await flight(page)).toEqual(held);
  });
});

test('reduced-motion WebGL casts one actual-hardware shadow and disposes it on context loss',async({page},info)=>{
  const errors:string[]=[],shaderErrors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/shader|GL_INVALID|VALIDATE_STATUS/i.test(m.text()))shaderErrors.push(m.text());});
  await page.addInitScript(()=>Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,value:4}));
  await page.emulateMedia({reducedMotion:'reduce'});await mount(page,seed(),true);
  const result=await physicalRecording(page,false);await mount(page,seed({landingResult:result,landingAttempts:[result]}),true);
  const row=await inspectNearSurface(page,result),held=await flight(page),saved=await receipts(page);
  await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-shadow-mode','merged-shadow-map');
  await page.locator('select[data-descent-camera]').selectOption('landing');
  const measured=await page.evaluate(()=>{
    const w=(window as any).__shadowGL,T=(window as any).THREE,P=(window as any).MoonMissionPure,shadow=w.shadow;
    w.scene.updateMatrixWorld(true);const p=shadow.geometry.attributes.position,sun=w.scene.getObjectByName('moon-descent-sun');
    const box=new T.Box3().setFromObject(w.lander),plane={x:0,y:1,z:0,constant:1-box.min.y};
    let maximumResidual=0,maximumLightProjectionError=0,inspected=0,casters=0;
    w.scene.traverse((n:any)=>{if(n.isMesh&&n.castShadow)casters++;});
    for(let i=0;i<p.count;i+=Math.max(1,Math.floor(p.count/80))){
      const point=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(shadow.matrixWorld);
      const q=P.projectDescentShadow(point,plane);if(!q)continue;
      maximumResidual=Math.max(maximumResidual,Math.abs(plane.x*q.x+plane.y*q.y+plane.z*q.z+plane.constant));
      const a=point.clone().project(sun.shadow.camera),b=new T.Vector3(q.x,q.y,q.z).project(sun.shadow.camera);
      maximumLightProjectionError=Math.max(maximumLightProjectionError,Math.abs(a.x-b.x),Math.abs(a.y-b.y));inspected++;
    }
    (window as any).__shadowDisposed={geometry:0,material:0,shadowMap:0};
    shadow.geometry.addEventListener('dispose',()=>{(window as any).__shadowDisposed.geometry++;});
    shadow.material.addEventListener('dispose',()=>{(window as any).__shadowDisposed.material++;});
    sun.shadow.map.addEventListener('dispose',()=>{(window as any).__shadowDisposed.shadowMap++;});
    let shadowMeshes=0;w.scene.traverse((n:any)=>{if(n.name==='moon-descent-shadow-caster')shadowMeshes++;});
    return {vertices:p.count,shadowMeshes,casters,visible:shadow.visible,maximumLightProjectionError,
      maximumResidual,inspected,plane,sun:sun.position.clone().sub(sun.target.position).toArray(),shadowMap:w.renderer.shadowMap.enabled,
      shadowMapSize:sun.shadow.mapSize.toArray(),shadowType:w.renderer.shadowMap.type,colorWrite:shadow.material.colorWrite,
      lander:w.lander.position.toArray(),camera:w.camera.position.toArray(),target:!!w.renderer.getRenderTarget()};
  });
  expect(measured.vertices).toBeGreaterThan(3000);expect(measured.shadowMeshes).toBe(1);expect(measured.inspected).toBeGreaterThan(20);
  expect(measured.maximumResidual).toBeLessThan(1e-8);expect(measured.maximumLightProjectionError).toBeLessThan(1e-7);
  expect(measured.shadowMap).toBe(true);expect(measured.shadowMapSize).toEqual([256,256]);expect(measured.casters).toBe(1);expect(measured.colorWrite).toBe(false);
  const pixels=await page.evaluate(()=>{
    const {renderer,scene,camera,shadow}=(window as any).__shadowGL,gl=renderer.getContext(),width=gl.drawingBufferWidth,height=gl.drawingBufferHeight;
    function read(){const a=new Uint8Array(width*height*4);renderer.render(scene,camera);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,a);return a;}
    const before=read();shadow.visible=false;const after=read();shadow.visible=true;renderer.render(scene,camera);
    let changed=0,delta=0;for(let i=0;i<before.length;i+=4){const d=Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2]);if(d){changed++;delta+=d;}}
    return {width,height,changed,delta,glError:gl.getError()};
  });
  await capture(page,info,'reduced-motion-landing-shadow');
  await writeFile(join(REPORT,'projection-diagnostic.json'),JSON.stringify({measured,pixels,shaderErrors},null,2));
  expect(pixels.changed).toBeGreaterThan(30);expect(pixels.delta).toBeGreaterThan(100);
  await page.getByRole('button',{name:'Return to touchdown',exact:true}).click();await capture(page,info,'reduced-motion-contact-shadow');
  expect(await flight(page)).toEqual(held);expect(await receipts(page)).toEqual(saved);
  await page.evaluate(()=>(window as any).__shadowGL.renderer.getContext().getExtension('WEBGL_lose_context').loseContext());
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent3d','lost');await expect(page.locator('[data-descent-gl]')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>(window as any).__shadowDisposed)).toEqual({geometry:1,material:1,shadowMap:1});
  await sidePose(page);await capture(page,info,'shadow-context-loss-support');expect(await flight(page)).toEqual(held);expect(await receipts(page)).toEqual(saved);
  expect(errors).toEqual([]);expect(shaderErrors).toEqual([]);
  await writeFile(join(REPORT,'merged-shadow-evidence.json'),JSON.stringify({row,measured,pixels,errors,shaderErrors,held,disposed:{geometry:1,material:1,shadowMap:1}},null,2));
});

test('full-detail WebGL retains terrain shadow maps and a held physical flight',async({page},info)=>{
  await page.addInitScript(()=>Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,value:8}));
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,seed(),true);
  const held=await flight(page),saved=await receipts(page);
  await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-shadow-mode','shadow-map');
  const detail=await page.evaluate(()=>{
    const w=(window as any).__shadowGL;let casters=0;w.lander.traverse((n:any)=>{if(n.isMesh&&n.castShadow)casters++;});
    return {shadowMap:w.renderer.shadowMap.enabled,projected:!!w.shadow,casters};
  });expect(detail.shadowMap).toBe(true);expect(detail.projected).toBe(false);expect(detail.casters).toBeGreaterThan(20);
  await page.locator('select[data-descent-camera]').selectOption('overhead');await page.setViewportSize({width:1000,height:900});
  await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-camera','overhead');
  await page.waitForTimeout(250);expect(await flight(page)).toEqual(held);expect(await receipts(page)).toEqual(saved);expect(errors).toEqual([]);
  await capture(page,info,'full-detail-shadow-map');await writeFile(join(REPORT,'full-detail-evidence.json'),JSON.stringify({detail,errors,held},null,2));
});
