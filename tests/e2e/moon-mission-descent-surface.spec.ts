import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT=resolve(process.env.MM_DESCENT_SURFACE_REPORT_DIR||'reports/moon-mission-enhancement-pass25-2026-10-04/browser/surface');
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_moonmission.js',toolId:'moonMission',width:1100,height:1000,layout:'document',appStyles:true});
const seed=(extra:Record<string,unknown>={})=>({moonMission:{missionPhase:5,descentStarted:true,animPaused:true,soundOff:true,
  difficulty:'pilot',missionXP:42,landingRewarded:true,lunarSamples:[],quizCorrect:0,earnedBadges:{first_step:true,mission_complete:true},...extra}});
test.describe.configure({timeout:180000,retries:0});
test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:Page,data=seed()){
  await page.goto(harness.url+'/__harness');await page.waitForFunction(()=>!!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(data=>{
    Math.random=()=>.999;document.getElementById('wrap')!.style.width='100%';
    const T=(window as any).THREE,Original=T.WebGLRenderer;
    const Capture=function(...args:any[]){
      const renderer=new Original(...args),render=renderer.render;
      renderer.render=function(scene:any,camera:any){
        const lander=scene.getObjectByName('moon-descent-lander'),terrain=scene.getObjectByName('moon-descent-terrain');
        if(lander&&terrain)(window as any).__surfaceGL={renderer,scene,camera,lander,terrain,
          nadir:scene.getObjectByName('moon-descent-nadir'),drift:scene.getObjectByName('moon-descent-drift')};
        return render.apply(renderer,arguments);
      };return renderer;
    };Capture.prototype=Original.prototype;Object.setPrototypeOf(Capture,Original);T.WebGLRenderer=Capture;
    (window as any).__surfaceGL=null;(window as any).__mount(data);
  },data);
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused','true');
  await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-terrain-mode','mesh-triangles');
  await page.waitForFunction(()=>!!(window as any).__surfaceGL?.terrain);
}
async function flight(page:Page){return page.locator('[data-descent-canvas]').evaluate((c:any)=>c._descentState());}
async function receipts(page:Page){return page.evaluate(()=>{
  const d=(window as any).__toolData.moonMission;return JSON.parse(JSON.stringify({missionXP:d.missionXP,landingResult:d.landingResult,
    landingAttempts:d.landingAttempts,landingRewarded:d.landingRewarded}));
});}
async function physicalRecording(page:Page,right=true){return page.evaluate(right=>{
  const P=(window as any).MoonMissionPure,s:any={alt:300,vVel:-9,hVel:right?22:-22,fuel:110,thrust:0,tilt:0,x:0,elapsed:0};
  const rec=P.newDescentRecording();P.recordDescent(rec,s,false);
  for(let i=0;i<3000&&!s.contact;i++){
    P.descentStep(s,s.alt<45?{throttle:.32,left:!right,right}: {},1/60);P.recordDescent(rec,s,!!s.contact);
  }
  if(!s.contact)throw Error('Original integrator did not reach contact');
  return {crashed:true,score:0,grade:'—',vVel:Math.abs(s.vVel),hVel:Math.abs(s.hVel),fuel:Math.round(s.fuel),fuelUnit:'s',recording:P.cleanDescentRecording(rec)};
},right);}
async function approach(page:Page,result:any){
  const row=result.recording.samples.findIndex((p:any)=>p.alt>0&&p.alt<20&&Math.abs(p.tilt)>.25);
  expect(row).toBeGreaterThan(0);await page.locator('[data-landing-scrub]').fill(String(row));
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-review-time',result.recording.samples[row].t.toFixed(3));
  return result.recording.samples[row];
}
async function inspect(page:Page,alt:number){
  const measured=await page.evaluate(()=>{
    const w=(window as any).__surfaceGL,T=(window as any).THREE;
    w.renderer.render(w.scene,w.camera);w.scene.updateMatrixWorld(true);
    const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),origin=new T.Vector3();let rays=0;
    function height(x:number,z:number){
      ray.set(origin.set(x,10000,z),down);const hit=ray.intersectObject(w.terrain,false)[0];rays++;
      if(!hit)throw Error('No rendered terrain triangle beneath '+x+', '+z);return hit.point.y;
    }
    const padGaps:number[]=[],probeGaps:number[]=[],nadirGaps:number[]=[],driftGaps:number[]=[];
    let pads=0,probes=0;
    w.lander.traverse((n:any)=>{
      if(n.userData?.mmPad&&n.geometry){
        pads++;const p=n.geometry.attributes.position,seen=new Set<string>();
        for(let i=0;i<p.count;i++){
          const v=new T.Vector3().fromBufferAttribute(p,i),key=v.toArray().join(',');if(seen.has(key))continue;seen.add(key);
          v.applyMatrix4(n.matrixWorld);padGaps.push(v.y-height(v.x,v.z));
        }
      }
      const parameters=n.geometry?.parameters;
      if(parameters&&Math.abs(parameters.height-1.05)<1e-8&&Math.abs(parameters.radiusTop-.014)<1e-8&&Math.abs(parameters.radiusBottom-.014)<1e-8){
        const tip=new T.Vector3(0,-.525,0).applyMatrix4(n.matrixWorld);probes++;probeGaps.push(tip.y-height(tip.x,tip.z));
      }
    });
    const nadir=w.nadir.geometry.attributes.position;
    for(let i=0;i<nadir.count;i++){
      const v=new T.Vector3().fromBufferAttribute(nadir,i).applyMatrix4(w.nadir.matrixWorld);nadirGaps.push(v.y-height(v.x,v.z));
    }
    const drift=w.drift.geometry.attributes.position,count=w.drift.geometry.drawRange.count;
    if(!Number.isInteger(count)||count<0||count>drift.count||count%2)throw Error('Invalid drift draw range');
    for(let i=0;i<count;i+=2){
      const a=new T.Vector3().fromBufferAttribute(drift,i).applyMatrix4(w.drift.matrixWorld);
      const b=new T.Vector3().fromBufferAttribute(drift,i+1).applyMatrix4(w.drift.matrixWorld);
      for(const t of [0,.25,.5,.75,1]){const v=a.clone().lerp(b,t);driftGaps.push(v.y-height(v.x,v.z));}
    }
    return {pads,padVertices:padGaps.length,padMin:Math.min(...padGaps),padGaps,probes,probeGaps,
      nadirVertices:nadir.count,nadirGaps,driftCount:count,driftCapacity:drift.count,driftVisible:w.drift.visible,driftGaps,
      cameraGap:w.camera.position.y-height(w.camera.position.x,w.camera.position.z),rays,
      terrainVertices:w.terrain.geometry.attributes.position.count,terrainPosition:w.terrain.position.toArray(),
      surfaceColumns:w.terrain.userData.descentSurface.columns,surfaceRows:w.terrain.userData.descentSurface.rows};
  });
  const clearance=.01+32*Math.log(1+alt/60)/Math.log(6);
  expect(measured.pads).toBe(4);expect(measured.padVertices).toBeGreaterThan(40);
  expect(Math.abs(measured.padMin-clearance)).toBeLessThan(1e-4);
  expect(measured.padGaps.every(g=>g>=clearance-1e-4)).toBe(true);
  expect(measured.nadirVertices).toBeGreaterThan(10);expect(measured.nadirGaps.every(g=>Math.abs(g-.3)<1e-4)).toBe(true);
  expect(measured.driftCount).toBeGreaterThan(6);expect(measured.driftCount).toBeLessThanOrEqual(measured.driftCapacity);
  expect(measured.driftGaps.every(g=>Math.abs(g-.45)<1e-4)).toBe(true);expect(measured.cameraGap).toBeGreaterThanOrEqual(3-1e-4);
  expect(measured.probes).toBe(3);expect(measured.probeGaps.every(g=>g>=-.005)).toBe(true);
  return {alt,clearance,...measured};
}
async function capture(page:Page,info:TestInfo,name:string){
  await mkdir(REPORT,{recursive:true});const path=join(REPORT,name+'.png');
  const clip=await page.locator('[data-descent-canvas]').evaluate((c:HTMLElement)=>{
    const b=c.parentElement!.getBoundingClientRect();return {x:b.left+scrollX,y:b.top+scrollY,width:b.width,height:b.height};
  });await page.screenshot({path,fullPage:true,clip,animations:'disabled'});await info.attach(name,{path,contentType:'image/png'});
}
async function evidence(name:string,value:unknown){await mkdir(REPORT,{recursive:true});await writeFile(join(REPORT,name+'.json'),JSON.stringify(value,null,2));}
async function notes(page:Page,name:string,info?:TestInfo){
  const note=page.locator('[data-descent-surface-note]'),parent=note.locator('..');
  const summary=parent.locator('summary');if(!await note.isVisible())await summary.click();await expect(note).toBeVisible();
  await page.addScriptTag({path:resolve('node_modules/axe-core/axe.min.js')});
  const violations=await note.evaluate(async n=>(await (window as any).axe.run(n.parentElement,
    {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations);
  await evidence(name+'-axe',{violations});expect(violations).toEqual([]);
  if(info){
    const path=join(REPORT,name+'-notes.png'),clip=await parent.evaluate((n:HTMLElement)=>{
      const b=n.getBoundingClientRect();return {x:b.left+scrollX,y:b.top+scrollY,width:b.width,height:b.height};
    });await page.screenshot({path,fullPage:true,clip,animations:'disabled'});await info.attach(name+'-notes',{path,contentType:'image/png'});
  }
}
async function driftPixels(page:Page){return page.evaluate(()=>{
  const {renderer,scene,camera,drift}=(window as any).__surfaceGL,gl=renderer.getContext(),width=gl.drawingBufferWidth,height=gl.drawingBufferHeight;
  function read(){const a=new Uint8Array(width*height*4);renderer.render(scene,camera);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,a);return a;}
  const visible=drift.visible,before=read();drift.visible=false;const after=read();drift.visible=visible;renderer.render(scene,camera);
  let changed=0,delta=0;for(let i=0;i<before.length;i+=4){const d=Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2]);if(d){changed++;delta+=d;}}
  return {width,height,visible,changed,delta,glError:gl.getError()};
});}

test('lighter WebGL follows actual crater triangles through both banked approaches and contact',async({page},info)=>{
  const errors:string[]=[],shaderErrors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/shader|GL_INVALID|VALIDATE_STATUS/i.test(m.text()))shaderErrors.push(m.text());});
  await page.addInitScript(()=>Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,value:4}));
  await page.emulateMedia({reducedMotion:'reduce'});await mount(page);const rows:any[]=[],pixels:any[]=[];
  for(const right of [false,true]){
    const result=await physicalRecording(page,right);await mount(page,seed({landingResult:result,landingAttempts:[result]}));
    const held=await flight(page),saved=await receipts(page),row=await approach(page,result);
    await page.locator('select[data-descent-camera]').selectOption('landing');
    await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-camera','landing');
    const near=await inspect(page,row.alt);expect(near.surfaceColumns).toBe(141);expect(near.surfaceRows).toBe(141);
    rows.push({right,row,near});await capture(page,info,right?'right-bank-approach':'left-bank-approach');
    const pixel=await driftPixels(page);pixels.push({right,...pixel});expect(pixel.visible).toBe(true);expect(pixel.changed).toBeGreaterThan(5);expect(pixel.glError).toBe(0);
    await page.getByRole('button',{name:'Return to touchdown',exact:true}).click();
    await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-review-time','');
    rows.push({right,contact:await inspect(page,0)});await capture(page,info,right?'right-bank-contact':'left-bank-contact');
    expect(await flight(page)).toEqual(held);expect(await receipts(page)).toEqual(saved);
  }
  await notes(page,'desktop',info);expect(errors).toEqual([]);expect(shaderErrors).toEqual([]);await evidence('lighter-surface',{rows,pixels,errors,shaderErrors});
});

test('detailed WebGL holds flight and receipts while terrain support survives camera and resize changes',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,value:8}));
  await mount(page);const result=await physicalRecording(page,true);await mount(page,seed({landingResult:result,landingAttempts:[result]}));
  const held=await flight(page),saved=await receipts(page),row=await approach(page,result);
  await page.locator('select[data-descent-camera]').selectOption('landing');
  await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-camera','landing');
  const near=await inspect(page,row.alt);expect(near.surfaceColumns).toBe(221);expect(near.surfaceRows).toBe(221);await capture(page,info,'detailed-bank-approach');
  await page.getByRole('button',{name:'Return to touchdown',exact:true}).click();
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-review-time','');
  const contact=await inspect(page,0);await capture(page,info,'detailed-bank-contact');
  await page.locator('select[data-descent-camera]').selectOption('overhead');await page.setViewportSize({width:1000,height:900});
  await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-camera','overhead');
  const overhead=await inspect(page,0);await capture(page,info,'detailed-overhead-contact');
  expect(await flight(page)).toEqual(held);expect(await receipts(page)).toEqual(saved);expect(errors).toEqual([]);
  await evidence('detailed-surface',{row,near,contact,overhead,held,errors});
});

test('320 px WebGL contact recovers after context loss and keeps the surface note readable in forced colors',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:320,height:850});await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,value:4}));
  await mount(page);const result=await physicalRecording(page,false);await mount(page,seed({landingResult:result,landingAttempts:[result]}));
  const held=await flight(page),saved=await receipts(page),contact=await inspect(page,0);await capture(page,info,'phone-bank-contact');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.evaluate(()=>{
    const extension=(window as any).__surfaceGL.renderer.getContext().getExtension('WEBGL_lose_context');
    if(!extension)throw Error('WEBGL_lose_context unavailable');extension.loseContext();
  });
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent3d','lost');await expect(page.locator('[data-descent-gl]')).toHaveCount(0);
  await capture(page,info,'phone-context-loss-support');expect(await flight(page)).toEqual(held);expect(await receipts(page)).toEqual(saved);
  await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await notes(page,'phone-forced',info);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  expect(await flight(page)).toEqual(held);expect(await receipts(page)).toEqual(saved);expect(errors).toEqual([]);
  await evidence('phone-surface',{contact,held,errors});
});
