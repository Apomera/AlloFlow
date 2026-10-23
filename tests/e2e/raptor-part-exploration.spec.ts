import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng, pixelStats } from './helpers/png_pixels';

test.use({ video: 'off', trace: 'off', hasTouch: true });
test.describe.configure({ timeout: 300_000, retries: 0 });
const output = resolve('reports/avian-simulations-round29-2026-10-22/raptor');
const canvas = '[data-raptor-canvas]';
const toggle = '[data-raptor-part-explore]';
const callout = '[data-raptor-part-callout]';
const rules = ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value',
  'aria-required-children', 'aria-required-parent', 'nested-interactive'];

// The oracle uses CPU vertices, scalar ray/plane intersections and barycentric
// coordinates. It never asks THREE.Raycaster or the feature for its answer.
const probes = `window.AlloPostFXEnabled=false;window.partRenders=0;(()=>{
  const Original=THREE.WebGLRenderer;
  THREE.WebGLRenderer=function(options){
    const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);
    renderer.render=function(scene,camera){window.partProbe={renderer,scene,camera};if(window.partSkipRender)return;window.partRenders++;return render(scene,camera);};return renderer;
  };
  const names={'raptor-left-wing':'wing','raptor-right-wing':'rightWing','fan-tail-silhouette':'tail','raptor-head-rig':'head','raptor-contour-body':'body','raptor-feet':'feet'};
  const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s);
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const transform=(v,m)=>{const e=m.elements,x=v[0],y=v[1],z=v[2],d=e[3]*x+e[7]*y+e[11]*z+e[15];return [(e[0]*x+e[4]*y+e[8]*z+e[12])/d,(e[1]*x+e[5]*y+e[9]*z+e[13])/d,(e[2]*x+e[6]*y+e[10]*z+e[14])/d];};
  function triangles(){
    const p=window.partProbe,root=p.scene.getObjectByName('raptor-head-rig').parent,result=[];
    root.updateWorldMatrix(true,true);
    root.traverseVisible(mesh=>{
      if(!mesh.isMesh||!mesh.geometry?.attributes.position)return;
      let region='whole';for(let n=mesh;n&&n!==root;n=n.parent){if(names[n.name]){region=names[n.name];break;}}
      const g=mesh.geometry,pos=g.attributes.position,index=g.index,morphs=g.morphAttributes.position||[],total=index?index.count:pos.count;
      const drawStart=Math.max(0,g.drawRange.start),drawEnd=Math.min(total,Number.isFinite(g.drawRange.count)?drawStart+g.drawRange.count:total);
      const groups=Array.isArray(mesh.material)?g.groups:[{start:0,count:total,materialIndex:0}];
      const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
      groups.forEach(group=>{
        const material=materials[group.materialIndex];if(!material||!material.visible||(material.transparent&&material.opacity<=0))return;
        const start=Math.max(drawStart,group.start),end=Math.min(drawEnd,group.start+group.count);
        for(let at=start;at+2<end;at+=3){
          const points=[];
          for(let corner=0;corner<3;corner++){
            const i=index?index.getX(at+corner):at+corner,base=[pos.getX(i),pos.getY(i),pos.getZ(i)],v=base.slice();
            if(material.morphTargets)morphs.forEach((m,k)=>{const weight=mesh.morphTargetInfluences?.[k]||0;for(let c=0;c<3;c++){const target=c===0?m.getX(i):c===1?m.getY(i):m.getZ(i);v[c]+=(target-(g.morphTargetsRelative?0:base[c]))*weight;}});
            points.push(transform(v,mesh.matrixWorld));
          }
          const projected=points.map(v=>transform(transform(v,p.camera.matrixWorldInverse),p.camera.projectionMatrix));
          const area=Math.abs((projected[1][0]-projected[0][0])*(projected[2][1]-projected[0][1])-(projected[1][1]-projected[0][1])*(projected[2][0]-projected[0][0]));
          result.push({points,region,name:mesh.name,side:material.side,winding:mesh.matrixWorld.determinant()<0?-1:1,projected,area});
        }
      });
    });return result;
  }
  function nearest(list,x,y){
    const p=window.partProbe,T=THREE,camera=p.camera,origin=camera.position.toArray(),far=new T.Vector3(x,y,.5).unproject(camera).toArray();
    let direction=sub(far,origin);direction=mul(direction,1/Math.sqrt(dot(direction,direction)));let best=null;
    for(const tri of list){
      const [a,b,c]=tri.points,ab=sub(b,a),ac=sub(c,a),normal=cross(ab,ac),denom=dot(normal,direction);
      if(Math.abs(denom)<1e-12||(tri.side===0&&denom*tri.winding>=0)||(tri.side===1&&denom*tri.winding<=0))continue;
      const t=dot(normal,sub(a,origin))/denom;if(t<camera.near||t>camera.far||(best&&t>=best.distance))continue;
      const hit=add(origin,mul(direction,t)),ah=sub(hit,a),aa=dot(ab,ab),bb=dot(ac,ac),cc=dot(ab,ac),ad=dot(ah,ab),bd=dot(ah,ac),d=aa*bb-cc*cc;
      if(Math.abs(d)<1e-18)continue;const u=(ad*bb-bd*cc)/d,v=(bd*aa-ad*cc)/d;
      if(u>=-1e-7&&v>=-1e-7&&u+v<=1+1e-7)best={region:tri.region,name:tri.name,distance:t,point:hit};
    }return best;
  }
  function safe(){const c=document.querySelector('[data-raptor-canvas]').getBoundingClientRect(),h=document.querySelector('.rh-study-header').getBoundingClientRect(),p=document.querySelector('.rh-study-panel').getBoundingClientRect();return {left:c.left,top:c.top,width:c.width,height:c.height,minY:h.bottom-c.top+12,maxY:p.top-c.top-12};}
  window.partOracle=function(mode,input){
    const list=triangles(),s=safe(),ndc=(x,y)=>[x/s.width*2-1,1-y/s.height*2];
    if(mode==='at'){const n=ndc(input.x,input.y);return nearest(list,n[0],n[1]);}
    if(mode==='fit'){
      const points=list.filter(t=>t.region===input).flatMap(t=>t.projected),bounds={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};
      points.forEach(p=>{const x=(p[0]+1)*s.width/2,y=(1-p[1])*s.height/2;bounds.left=Math.min(bounds.left,x);bounds.right=Math.max(bounds.right,x);bounds.top=Math.min(bounds.top,y);bounds.bottom=Math.max(bounds.bottom,y);});
      return {...bounds,vertices:points.length,safe:s};
    }
    if(mode==='blank'){
      for(const xf of [.86,.14,.93,.07,.75,.25])for(const yf of [.3,.5,.7]){const x=s.width*xf,y=s.minY+(s.maxY-s.minY)*yf,n=ndc(x,y);if(!nearest(list,n[0],n[1])&&document.elementFromPoint(s.left+x,s.top+y)===document.querySelector('[data-raptor-canvas]'))return {x,y,clientX:s.left+x,clientY:s.top+y};}return null;
    }
    const target=list.filter(t=>t.region===input).sort((a,b)=>b.area-a.area).slice(0,160);
    for(const tri of target)for(const weights of [[.34,.33,.33],[.6,.2,.2],[.2,.6,.2],[.2,.2,.6]]){
      const point=add(add(mul(tri.points[0],weights[0]),mul(tri.points[1],weights[1])),mul(tri.points[2],weights[2]));
      const projected=transform(transform(point,window.partProbe.camera.matrixWorldInverse),window.partProbe.camera.projectionMatrix),x=(projected[0]+1)*s.width/2,y=(1-projected[1])*s.height/2;
      if(x<12||x>s.width-12||y<s.minY||y>s.maxY||projected[2]<-1||projected[2]>1)continue;
      const found=nearest(list,projected[0],projected[1]);
      if(found?.region===input&&document.elementFromPoint(s.left+x,s.top+y)===document.querySelector('[data-raptor-canvas]'))return {x,y,clientX:s.left+x,clientY:s.top+y,hit:found};
    }return null;
  };
  window.partModel=function(){
    const p=window.partProbe,root=p.scene.getObjectByName('raptor-head-rig').parent,parts=[],geo=new Set(),mat=new Set();
    const hash=a=>{let h=2166136261;const bytes=new Uint8Array(a.buffer,a.byteOffset,a.byteLength);for(const n of bytes)h=Math.imul(h^n,16777619);return h>>>0;};
    root.traverse(mesh=>{if(!mesh.isMesh)return;const g=mesh.geometry,ms=Array.isArray(mesh.material)?mesh.material:[mesh.material];geo.add(g.uuid);ms.forEach(m=>mat.add(m.uuid));
      parts.push({id:mesh.uuid,name:mesh.name,position:mesh.position.toArray(),rotation:mesh.rotation.toArray(),scale:mesh.scale.toArray(),morphs:mesh.morphTargetInfluences?.slice(),geometry:g.uuid,
        buffers:Object.entries(g.attributes).map(([name,a])=>[name,a.uuid,a.version,hash(a.array)]),index:g.index?[g.index.version,hash(g.index.array)]:null,
        targets:Object.entries(g.morphAttributes).map(([name,as])=>[name,as.map(a=>[a.version,hash(a.array)])]),materials:ms.map(m=>({id:m.uuid,color:m.color?.getHex(),map:m.map?.uuid,normal:m.normalMap?.uuid,side:m.side,opacity:m.opacity,visible:m.visible,morphTargets:m.morphTargets}))});});
    const objects=[],geometries=new Set(),materials=new Set();p.scene.traverse(o=>{objects.push(o.uuid);if(o.geometry)geometries.add(o.geometry.uuid);(Array.isArray(o.material)?o.material:o.material?[o.material]:[]).forEach(m=>materials.add(m.uuid));});
    return {parts,root:root.uuid,geometries:[...geo].sort(),materials:[...mat].sort(),scene:{objects:objects.sort(),geometries:[...geometries].sort(),materials:[...materials].sort()},memory:{...p.renderer.info.memory}};
  };
})();`;

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt',
  width: 880, height: 680, appStyles: true, probes });
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1060, height: 1100 });
  await page.addInitScript(() => {
    let now = 1000, next = 0, seed = 731; const pending = new Map<number, FrameRequestCallback>();
    Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    performance.now = () => now;
    window.requestAnimationFrame = fn => { pending.set(++next, fn); return next; };
    window.cancelAnimationFrame = id => { pending.delete(id); };
    (window as any).partStep = (ms = 25) => { now += ms; const frames = [...pending.values()]; pending.clear(); frames.forEach(fn => fn(now)); };
    (window as any).partPending = () => pending.size;
  });
});

async function mount(page: Page, species = 'peregrine', mission = 'highStoop') {
  const errors: string[] = []; page.on('pageerror', error => {
    errors.push(error.stack || error.message);
    writeFileSync(resolve(output, 'native-errors-' + species + '-' + mission + '.json'), JSON.stringify({ errors }, null, 2));
  });
  const consoleErrors: string[] = []; page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  try {
    // This spec owns RAF. The harness's default RAF-polled readiness predicate
    // cannot run a second time until we step it, so use real-time polling while
    // retaining the visible-canvas and actual native renderer requirements.
    await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: mission, selectedSpecies: species,
      flightSession: { speciesId: species, missionId: mission }, huntTutorialDismissed: true, graphicsQuality: 'low',
      activeInvestigation: 'speed', investigations: { speed: { prediction: 'A close view will reveal how the two wings are arranged.' } }
    } }, undefined, { expectCanvas: false });
    await page.waitForFunction(() => {
      const w = window as any, node = document.querySelector('[data-raptor-canvas]') as any;
      if (!node || !node._rhSnapshot || !w.partProbe) return false;
      const rect = node.getBoundingClientRect(), style = getComputedStyle(node), record = w.__glRecord(node);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
        && !!record && !record.ctx.isContextLost() && w.partProbe.renderer.domElement === node;
    }, null, { polling: 50, timeout: 60_000 });
  } catch (error) {
    const native = await page.evaluate(() => {
      const w = window as any;
      return { url: location.href, pendingRAF: w.partPending?.(), probe: !!w.partProbe, renders: w.partRenders,
        toolErrors: w.__events?.errors, canvases: [...document.querySelectorAll('#wrap canvas')].map(node => {
          const rect = node.getBoundingClientRect(), native = node as any, style = getComputedStyle(node), record = w.__glRecord?.(node);
          return { raptor: node.hasAttribute('data-raptor-canvas'), width: rect.width, height: rect.height,
            visibility: style.visibility, display: style.display, snapshot: typeof native._rhSnapshot,
            gl: !!record, lost: record ? record.ctx.isContextLost() : null, draws: record?.draws };
        }) };
    }).catch(cause => ({ diagnosticError: String(cause) }));
    writeFileSync(resolve(output, 'bootstrap-' + species + '-' + mission + '.json'), JSON.stringify({ error: String(error), pageErrors: errors, consoleErrors, native }, null, 2));
    throw error;
  }
  await page.locator(canvas).evaluate((node: any) => { node._rhCommand('environment', { windSpeed: 0, dayPhase: .44, cloudCover: .15 }); for (let i = 0; i < 8; i++) (window as any).partStep(); });
  return errors;
}
async function snap(page: Page): Promise<any> { return page.locator(canvas).evaluate((node: any) => ({ ...node._rhSnapshot(), model: (window as any).partModel() })); }
async function oracle(page: Page, mode: string, input?: any): Promise<any> { return page.evaluate(({ mode, input }) => (window as any).partOracle(mode, input), { mode, input }); }
async function step(page: Page, count = 2) { await page.evaluate(count => { for (let i = 0; i < count; i++) (window as any).partStep(); }, count); }
function frozen(a: any, b: any) {
  for (const key of ['motionTimeMs', 'raptorPosition', 'headingRadians', 'pitchRadians', 'wingAngle', 'wingFold', 'speedMps', 'stamina', 'calories', 'missionCatches', 'gazeYaw', 'gazePitch']) expect(b[key], key).toEqual(a[key]);
  expect(b.model.parts).toEqual(a.model.parts); expect(b.model.root).toBe(a.model.root);
}
function resources(a: any, b: any) { expect(b.model.scene).toEqual(a.model.scene); expect(b.model.memory).toEqual(a.model.memory); }
async function inspect(page: Page, focus = 'whole') { await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption(focus); }
async function study(page: Page) { await page.locator('[data-raptor-study-button]').click(); await expect(page.getByRole('combobox', { name: 'Inspect', exact: true })).toBeVisible(); }
async function find(page: Page, region: string) {
  await inspect(page); let point: any;
  for (const view of ['above', 'front', 'behind', 'side']) {
    await page.locator('[data-study-view=' + view + ']').click(); point = await oracle(page, 'find', region); if (point) return point;
  }
  throw new Error('No independently visible native surface for ' + region);
}
async function clickCanvas(page: Page, point: any, kind: 'mouse' | 'touch' = 'mouse') {
  if (kind === 'touch') { await page.touchscreen.tap(point.clientX, point.clientY); }
  else { await page.mouse.move(point.clientX, point.clientY); await page.mouse.down(); await page.mouse.up(); }
}
async function assertCallouts(page: Page) {
  const labels = await page.locator(callout).evaluateAll(nodes => nodes.filter(n => n.getClientRects().length && getComputedStyle(n).visibility !== 'hidden').map(node => {
    const rect = node.getBoundingClientRect(), stage = document.querySelector('[data-raptor-canvas]')!.getBoundingClientRect(),
      header = document.querySelector('.rh-study-header')!.getBoundingClientRect(), panel = document.querySelector('.rh-study-panel')!.getBoundingClientRect();
    const region = node.getAttribute('data-raptor-part-callout')!, line = document.querySelector('[data-raptor-part-leader="' + region + '"]')!;
    return { region, rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
      stage: { left: stage.left, right: stage.right }, safeTop: header.bottom, safeBottom: panel.top,
      anchor: { x: Number(line.getAttribute('x1')), y: Number(line.getAttribute('y1')) } };
  }));
  for (const label of labels) {
    expect(label.rect.width).toBeGreaterThanOrEqual(44); expect(label.rect.height).toBeGreaterThanOrEqual(44);
    expect(label.rect.left).toBeGreaterThanOrEqual(label.stage.left); expect(label.rect.right).toBeLessThanOrEqual(label.stage.right);
    expect(label.rect.top).toBeGreaterThanOrEqual(label.safeTop); expect(label.rect.bottom).toBeLessThanOrEqual(label.safeBottom);
    const hit = await oracle(page, 'at', label.anchor); expect(hit?.region, 'actual front surface under ' + label.region + ' anchor').toBe(label.region);
  }
  for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
    const a = labels[i].rect, b = labels[j].rect;
    expect(Math.min(a.right, b.right) <= Math.max(a.left, b.left) || Math.min(a.bottom, b.bottom) <= Math.max(a.top, b.top), 'callout labels must not overlap').toBe(true);
  }
  return labels;
}
async function capture(page: Page, selector: string, file: string) {
  await page.locator(selector).evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  // Repaint through a native control without advancing the frozen simulation.
  await page.locator(canvas).focus(); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowRight'); await step(page);
  const clip = await page.locator(selector).evaluate(node => { const r = node.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height, scale: 1 }; });
  const session = await page.context().newCDPSession(page);
  try {
    const result = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip });
    const bytes = Buffer.from(result.data, 'base64'), png = readPng(bytes), stats = pixelStats(png);
    expect(Math.abs(png.width - clip.width)).toBeLessThanOrEqual(2); expect(Math.abs(png.height - clip.height)).toBeLessThanOrEqual(2);
    expect(stats.distinctColors).toBeGreaterThan(40); expect(stats.dominantShare).toBeLessThan(.99);
    writeFileSync(resolve(output, file), bytes); return { file, clip, pixels: stats };
  } finally { await session.detach(); }
}

test('native visible surfaces select the correct part while poses, buffers, resources and saved right-wing context remain intact', async ({ page }) => {
  const errors = await mount(page), flying = await snap(page); await study(page);
  await expect(page.locator(toggle)).not.toBeChecked(); await expect(page.locator(callout + ':visible')).toHaveCount(0);
  await page.locator('[data-study-view=above]').click(); const before = await snap(page);
  await page.locator(toggle).check(); expect((await snap(page)).studyPartExploreActive).toBe(true);
  const whole = await snap(page); frozen(before, whole); resources(before, whole);
  const evidence: any[] = [], visible = await assertCallouts(page); expect(visible.length).toBeGreaterThan(0);
  for (const region of ['wing', 'rightWing', 'tail', 'head', 'body', 'feet']) {
    const point = await find(page, region); expect(point.hit.region).toBe(region); await clickCanvas(page, point);
    await expect(page.getByRole('combobox', { name: 'Inspect', exact: true })).toHaveValue(region);
    const selected = await snap(page); expect(selected.studyFocus).toBe(region); frozen(before, selected); resources(before, selected);
    const fit = await oracle(page, 'fit', region);
    expect(fit.vertices).toBeGreaterThan(0);expect(fit.left).toBeGreaterThan(0);expect(fit.right).toBeLessThan(fit.safe.width);
    expect(fit.top).toBeGreaterThan(fit.safe.minY-4);expect(fit.bottom).toBeLessThan(fit.safe.maxY+4);
    expect(fit.right-fit.left).toBeGreaterThan(80);
    await expect(page.locator(callout + ':visible')).toHaveCount(0); await expect(page.locator('.rh-study-region')).toBeVisible();
    evidence.push({ region, point, camera: selected.cameraPosition,fit });
  }
  await inspect(page, 'rightWing'); await page.getByRole('button', { name: 'Keep moment', exact: true }).click();
  const kept = await page.evaluate(() => (window as any).__toolData.raptorHunt.flightStudyMoments[0]);
  expect(kept.view.focus).toBe('rightWing'); expect(kept.focusLabel).toMatch(/right wing/i);
  const savedCamera = (await snap(page)).cameraPosition; await inspect(page, 'wing');
  await page.getByRole('button', { name: 'Match saved view', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Inspect', exact: true })).toHaveValue('rightWing'); expect((await snap(page)).cameraPosition).toEqual(savedCamera);
  await inspect(page); const stable = await snap(page), blank = await oracle(page, 'blank'); expect(blank).toBeTruthy();
  await clickCanvas(page, blank); expect((await snap(page)).studyFocus).toBe('whole'); frozen(before, await snap(page));
  await page.getByRole('button', { name: 'Habitat', exact: true }).click(); await expect(page.locator(toggle)).toBeDisabled(); await expect(page.locator(toggle)).toBeChecked();
  expect((await snap(page)).studyPartExploreActive).toBe(false); await expect(page.locator(callout + ':visible')).toHaveCount(0);
  await page.getByRole('button', { name: 'Studio', exact: true }).click(); expect((await snap(page)).studyPartExploreActive).toBe(true);
  frozen(stable, await snap(page)); resources(before, await snap(page));
  const renders = await page.evaluate(() => (window as any).partRenders); await page.evaluate(() => (window as any).partStep(60_000));
  expect(await page.evaluate(() => (window as any).partRenders)).toBe(renders);
  await page.getByRole('button', { name: 'Close study', exact: true }).click(); const restored = await snap(page); frozen(flying, restored);
  expect(restored.cameraPosition).toEqual(flying.cameraPosition); expect(restored.cameraQuaternion).toEqual(flying.cameraQuaternion);
  await expect(page.locator(callout + ':visible')).toHaveCount(0); expect(restored.studyPartExploreActive).toBe(false);
  expect(errors).toEqual([]); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  writeFileSync(resolve(output, 'native-surface-checks.json'), JSON.stringify({ evidence, visible, kept: { view: kept.view, focusLabel: kept.focusLabel }, noNewResources: true }, null, 2));
});

test('drawable triangle filters and morphs are honored and gestures never turn a drag, cancellation or second touch into selection', async ({ page }) => {
  const errors = await mount(page, 'greatHorned', 'open'); await study(page); await page.locator(toggle).check();
  const point = await find(page, 'head'), initial = await snap(page);
  await page.locator(canvas).evaluate(node => node.addEventListener('pointerdown', event => { (window as any).partNativePointer = (event as PointerEvent).pointerId; }, { capture: true }));
  const touch = await page.context().newCDPSession(page);
  try {
    for (const kind of ['drag', 'cancel', 'lost', 'multitouch']) {
      await inspect(page); await page.locator('[data-study-view=front]').click(); const target = await oracle(page, 'find', 'head'); expect(target).toBeTruthy();
      const first = { x: target.clientX, y: target.clientY, id: 41, radiusX: 1, radiusY: 1, force: .5 };
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
      if (kind === 'drag') await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...first, x: first.x + 35 }] });
      if (kind === 'cancel') await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      if (kind === 'lost') await page.locator(canvas).evaluate((node: any) => { const id = (window as any).partNativePointer; if (node.hasPointerCapture(id)) node.releasePointerCapture(id); });
      if (kind === 'multitouch') {
        await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first, { ...first, id: 42, x: first.x + 12 }] });
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [first] });
      }
      if (kind !== 'cancel') await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      expect((await snap(page)).studyFocus, kind).toBe('whole'); frozen(initial, await snap(page));
    }
  } finally { await touch.detach(); }
  // Exercise the complete browser mouse capture path as well as the cancellation events.
  await inspect(page); await page.locator('[data-study-view=above]').click(); const drag = await oracle(page, 'find', 'wing'); expect(drag).toBeTruthy();
  const cameraBefore = (await snap(page)).cameraPosition; await page.mouse.move(drag.clientX, drag.clientY); await page.mouse.down(); await page.mouse.move(drag.clientX + 38, drag.clientY + 12, { steps: 3 }); await page.mouse.up();
  expect((await snap(page)).studyFocus).toBe('whole'); expect((await snap(page)).cameraPosition).not.toEqual(cameraBefore);
  await inspect(page, 'body'); const blank = await oracle(page, 'blank'); expect(blank).toBeTruthy(); expect(await oracle(page, 'at', blank)).toBeNull();
  await page.evaluate(point => {
    const w = window as any, T = w.THREE, p = w.partProbe, head = p.scene.getObjectByName('raptor-head-rig'), rect = document.querySelector('[data-raptor-canvas]')!.getBoundingClientRect();
    const nx = point.x / rect.width * 2 - 1, ny = 1 - point.y / rect.height * 2, distance = p.camera.position.distanceTo(head.getWorldPosition(new T.Vector3()));
    const local = (x: number, y: number) => { const direction = new T.Vector3(x, y, .5).unproject(p.camera).sub(p.camera.position).normalize(); return head.worldToLocal(p.camera.position.clone().addScaledVector(direction, distance)); };
    const at = [[nx-.055,ny-.055],[nx+.055,ny-.055],[nx,ny+.055]], here = at.flatMap(v=>local(v[0],v[1]).toArray()), away = at.flatMap(v=>local(v[0]-.5,v[1]).toArray());
    const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute([...here,...away],3)); geometry.setIndex([0,1,2,3,4,5]); geometry.addGroup(0,3,0); geometry.addGroup(3,3,1); geometry.setDrawRange(0,3);
    const materials = [new T.MeshBasicMaterial({color:0xffdd88,side:T.DoubleSide,morphTargets:true}),new T.MeshBasicMaterial({side:T.DoubleSide})], mesh = new T.Mesh(geometry,materials), parent = new T.Group();
    mesh.name='test-only-part-picking-drawable-fixture'; parent.add(mesh);head.add(parent);w.partFixture={geometry,materials,mesh,parent,here,away};
  }, blank);
  const evidence: any[] = [];
  try {
    for (const mode of ['indexed', 'drawRange', 'hiddenMaterial', 'hiddenAncestor', 'nonindexed', 'absoluteMorph', 'relativeMorph']) {
      await page.evaluate(mode => {
        const w = window as any, T = w.THREE, f = w.partFixture, previous = f.geometry, g = new T.BufferGeometry();
        f.parent.visible=true;f.mesh.visible=true;f.materials[0].visible=true;f.mesh.material=f.materials;
        // Three r128 caches morph influence rows by geometry ID on its first
        // draw. Configure each fixture completely before that draw instead of
        // adding morph targets to an already rendered zero-morph geometry.
        g.setAttribute('position',new T.Float32BufferAttribute([...f.here,...f.away],3));g.setIndex([0,1,2,3,4,5]);g.addGroup(0,3,0);g.addGroup(3,3,1);g.setDrawRange(0,3);g.morphTargetsRelative=false;f.mesh.morphTargetInfluences=[];
        if(mode==='drawRange')g.setDrawRange(3,3);
        if(mode==='hiddenMaterial')f.materials[0].visible=false;
        if(mode==='hiddenAncestor')f.parent.visible=false;
        if(mode==='nonindexed'){g.setIndex(null);f.mesh.material=f.materials[0];}
        if(mode==='absoluteMorph'||mode==='relativeMorph'){
          g.setAttribute('position',new T.Float32BufferAttribute([...f.away,...f.away],3));
          const target=[...f.here,...f.away];g.morphTargetsRelative=mode==='relativeMorph';
          if(g.morphTargetsRelative)for(let i=0;i<target.length;i++)target[i]-=[...f.away,...f.away][i];
          g.morphAttributes.position=[new T.Float32BufferAttribute(target,3)];
        }
        f.geometry=g;f.mesh.geometry=g;f.mesh.updateMorphTargets();
        if(mode==='absoluteMorph'||mode==='relativeMorph')f.mesh.morphTargetInfluences[0]=1;
        previous.dispose();
        g.computeBoundingSphere();g.computeBoundingBox();f.materials[0].needsUpdate=true;f.mesh.frustumCulled=false;
      }, mode);
      // Keep the camera fixed while asking the actual canvas handler to pick.
      const result = await oracle(page, 'at', blank), visible = !['drawRange', 'hiddenMaterial', 'hiddenAncestor'].includes(mode);
      expect(result?.region || null, mode).toBe(visible ? 'head' : null);
      await clickCanvas(page, blank);
      expect((await snap(page)).studyFocus, mode).toBe(visible ? 'head' : 'body');
      evidence.push({ mode, hit: result });
      // Selecting the same body region restores the original native fit. The
      // fixture belongs to the head and cannot affect that body's bounds.
      await page.locator(canvas).evaluate((node: any) => { const w=window as any;w.partFixture.mesh.visible=false; });
      await inspect(page,'body');
    }
  } finally {
    await page.evaluate(() => { const w=window as any,f=w.partFixture;f.parent.parent.remove(f.parent);f.geometry.dispose();f.materials.forEach((m:any)=>m.dispose());delete w.partFixture; });
  }
  frozen(initial, await snap(page)); expect(point.hit.region).toBe('head');
  await page.locator(toggle).uncheck(); await inspect(page); await page.locator('[data-study-view=front]').click(); const off = await oracle(page,'find','head');expect(off).toBeTruthy();await clickCanvas(page,off);expect((await snap(page)).studyFocus).toBe('whole');
  expect(errors).toEqual([]);expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  writeFileSync(resolve(output,'triangle-filter-gesture-checks.json'),JSON.stringify({evidence,gestures:['drag','cancel','lostpointercapture','multitouch'],nativeMouseDrag:true},null,2));
});

test('projected callouts fit desktop, phone and embedded hosts with keyboard fallback, native touch, accessibility and clean teardown', async ({ page }) => {
  const errors = await mount(page,'osprey','open');await study(page);await page.locator(toggle).focus();await page.keyboard.press('Space');await expect(page.locator(toggle)).toBeChecked();
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  const evidence:any[]=[],captures:any[]=[],calloutHosts:string[]=[];
  for(const host of [{name:'desktop',viewport:1060,width:880},{name:'phone',viewport:390,width:390},{name:'embedded',viewport:1060,width:560}]){
    await page.setViewportSize({width:host.viewport,height:1000});await page.locator('#wrap').evaluate((node:HTMLElement,width)=>{node.style.width=width+'px';node.style.maxWidth='100%';},host.width);
    await expect.poll(()=>page.locator(canvas).evaluate((node:any)=>{const w=window as any,r=node.getBoundingClientRect();return Math.abs(w.partProbe.camera.aspect-r.width/r.height)<.001;})).toBe(true);
    await inspect(page);await page.locator('[data-study-view=above]').click();await step(page);
    const labels=await assertCallouts(page),layout=await page.locator('.rh-study-panel').evaluate(node=>({width:node.clientWidth,scrollWidth:node.scrollWidth}));expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width+1);
    let calloutActivation:any=null;
    if(labels.length){
      const region=labels[0].region,target=page.locator('[data-raptor-part-callout="'+region+'"]'),before=await snap(page);
      await target.evaluate(node=>node.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'}));
      const point=await target.evaluate(node=>{const rect=node.getBoundingClientRect();return{x:rect.left+rect.width/2,y:rect.top+rect.height/2};});
      await page.touchscreen.tap(point.x,point.y);
      await expect(page.getByRole('combobox',{name:'Inspect',exact:true})).toHaveValue(region);expect((await snap(page)).studyFocus).toBe(region);frozen(before,await snap(page));
      await inspect(page);await page.locator('[data-study-view=above]').click();await expect(target).toBeVisible();
      await target.focus();await page.keyboard.press('Enter');
      await expect(page.getByRole('combobox',{name:'Inspect',exact:true})).toHaveValue(region);expect((await snap(page)).studyFocus).toBe(region);frozen(before,await snap(page));
      await inspect(page);await page.locator('[data-study-view=above]').click();
      calloutActivation={region,singleTouch:true,keyboard:'Enter',poseUnchanged:true};calloutHosts.push(host.name);
    }
    expect(await page.locator(toggle).evaluate(node=>node.closest('label')!.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    const violations=await page.evaluate(async rules=>(await (window as any).axe.run({include:['.rh-study-header','.rh-study-panel','[data-raptor-part-callout]']},{runOnly:{type:'rule',values:rules}})).violations.map((v:any)=>({id:v.id,targets:v.nodes.map((n:any)=>n.target)})),rules);expect(violations).toEqual([]);
    const select=page.getByRole('combobox',{name:'Inspect',exact:true});await select.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await expect(select).toHaveValue('rightWing');
    await inspect(page);const point=await find(page,'rightWing');await clickCanvas(page,point,'touch');await expect(select).toHaveValue('rightWing');
    await page.emulateMedia({forcedColors:'active'});const colors=await select.evaluate(node=>[getComputedStyle(node).color,getComputedStyle(node).backgroundColor]);expect(colors[0]).not.toBe(colors[1]);await page.emulateMedia({forcedColors:'none',reducedMotion:'reduce'});
    await inspect(page);await page.locator('[data-study-view=above]').click();
    if(host.name!=='embedded'){
      captures.push(await capture(page,'[data-raptor-flight-stage]',host.name+'-visible-parts.png'));
      captures.push(await capture(page,'.rh-study-panel',host.name+'-part-controls.png'));
    }
    evidence.push({host,labels,layout,violations,nativeTouch:point.hit,calloutActivation});
  }
  expect(calloutHosts.length,'fresh single-touch and keyboard callouts must work in at least two representative hosts').toBeGreaterThanOrEqual(2);
  const live=await harness.glContexts(page);expect(live.filter(c=>!c.lost&&c.createdBy==='page').length).toBe(1);expect(live[0].draws).toBeGreaterThan(0);
  // Canvas-only readback excludes HTML controls and proves the native surface
  // was drawn; a black renderer beneath a busy overlay cannot satisfy this.
  const native=await page.locator(canvas).evaluate((node:HTMLCanvasElement)=>{const copy=document.createElement('canvas');copy.width=node.width;copy.height=node.height;const ctx=copy.getContext('2d')!;ctx.drawImage(node,0,0);const data=ctx.getImageData(0,0,copy.width,copy.height).data,colors=new Set();let bright=0;for(let i=0;i<data.length;i+=16){colors.add((data[i]>>3)+','+(data[i+1]>>3)+','+(data[i+2]>>3));if(data[i]+data[i+1]+data[i+2]>180)bright++;}return{colors:colors.size,bright};});expect(native.colors).toBeGreaterThan(30);expect(native.bright).toBeGreaterThan(50);
  await harness.destroy(page);await expect(page.locator(callout)).toHaveCount(0);await expect(page.locator(toggle)).toHaveCount(0);await step(page,3);
  expect(await page.evaluate(()=>(window as any).partPending())).toBe(0);expect((await harness.glContexts(page)).every(c=>c.lost)).toBe(true);
  expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  writeFileSync(resolve(output,'responsive-callout-checks.json'),JSON.stringify({evidence,captures,native,teardown:true},null,2));
});
