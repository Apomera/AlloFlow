import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const output = resolve('reports/avian-simulations-round22-2026-10-21/final');
test.use({ video: 'off', trace: { mode: 'retain-on-failure', screenshots: false, snapshots: true } });
test.describe.configure({ timeout: 240_000, retries: 0 });
async function capture(page: Page, selector: string, name: string) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const viewport = page.viewportSize()!, initial = (await page.locator(selector).boundingBox())!;
  if (initial.height > viewport.height) {
    await page.setViewportSize({ width: viewport.width, height: Math.ceil(initial.height) + 200 });
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.locator(selector).scrollIntoViewIfNeeded();
  }
  let prior = '', stable = 0;
  await expect.poll(async () => { const r=(await page.locator(selector).boundingBox())!; const value=JSON.stringify([r.width,r.height]);stable=value===prior?stable+1:0;prior=value;return stable; }, { intervals:[50,100,150],timeout:10_000 }).toBeGreaterThanOrEqual(3);
  const png=await page.locator(selector).screenshot({ path:resolve(output,name),timeout:90_000 });
  const bounds=(await page.locator(selector).boundingBox())!;
  expect(Math.abs(png.readUInt32BE(16)-bounds.width)).toBeLessThanOrEqual(2);expect(Math.abs(png.readUInt32BE(20)-bounds.height)).toBeLessThanOrEqual(2);
}
async function inspect(page: Page, selector: string) {
  return page.locator(selector).evaluate(root => {
    const box = (node: Element) => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    return { root: box(root), scrollOverflow: root.scrollWidth - root.clientWidth,
      inputs: [...root.querySelectorAll('input,select')].map(node => { const input = node as HTMLInputElement; return { id: input.id, value: input.value, checked: input.checked, min: input.min, max: input.max }; }),
      conditions: [...root.querySelectorAll('[data-tide-condition],[data-summary-condition]')].map(node => ({ attributes: Object.fromEntries([...node.attributes].map(attribute => [attribute.name, attribute.value])) })),
      blocks: [...root.querySelectorAll('figure,svg,button,input,select,label,h2,h3,p,summary')].map(node => ({ tag: node.tagName, text: node.textContent?.trim().slice(0, 100), box: box(node), overflow: node.scrollWidth - node.clientWidth, fontSize: getComputedStyle(node).fontSize })),
      shapes: [...root.querySelectorAll('svg path,svg line,svg rect,svg circle')].map(node => ({ tag: node.tagName, attributes: Object.fromEntries([...node.attributes].map(attribute => [attribute.name, attribute.value])), stroke: getComputedStyle(node).stroke, fill: getComputedStyle(node).fill })),
      svgText: [...root.querySelectorAll('svg text')].map(node => { const text = node as SVGTextElement, r = text.getBBox(), view = text.ownerSVGElement!.viewBox.baseVal, matrix = text.getScreenCTM(); return { text: text.textContent, x: r.x, y: r.y, width: r.width, height: r.height, viewWidth: view.width, viewHeight: view.height, renderedFontPx: parseFloat(getComputedStyle(text).fontSize) * (matrix ? Math.hypot(matrix.a, matrix.b) : 0) }; }) };
  });
}





for (const surface of ['tide','summary']) test.describe(surface+' visual review',()=>{
  const bird=surface==='tide';
  const harness=new GlHarness({toolId:bird?'birdLab':'raptorHunt',toolFile:'stem_lab/stem_tool_'+(bird?'birdlab':'raptorhunt')+'.js',preScripts:bird?['stem_lab/stem_lab_module.js']:[],appStyles:true,layout:'document',width:1280,height:960});
  test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
  for(const width of [1280,390]) test(surface+' at '+width+'px',async({page})=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.setViewportSize({width,height:960});await page.emulateMedia({reducedMotion:'reduce'});
    await harness.mount(page,bird?{birdLab:{view:'shorebirds'}}:{raptorHunt:{activeSection:'datatables'}},undefined,{expectCanvas:false});
    await page.locator('#wrap').evaluate((element:HTMLElement,size)=>{element.style.width=size+'px';element.style.maxWidth='100%';element.style.height='auto';element.style.padding='0';element.setAttribute('data-stem-tool-shell','true');},width);
    const selector=bird?'[data-birdlab-tide-study]':'[data-raptor-summary-study]';await expect(page.locator(selector)).toBeVisible();
    if(bird){await page.locator('#birdlab-tide-level').fill('1.25');await page.locator('[data-tide-pin]').click();await page.locator('[data-tide-experiment="lower"]').click();await page.locator('#birdlab-tide-probe').fill('5');await page.locator('[data-tide-answer="shape"]').click();await expect(page.locator('#birdlab-tide-level')).toHaveValue('0.75');}
    else{await page.locator('[data-summary-pin]').click();await page.locator('#rh-summary-value').fill('20');await page.locator('[data-summary-answer="context"]').click();await expect(page.locator('#rh-summary-value')).toHaveValue('20');}
    await capture(page,selector,surface+'-'+width+'.png');const readability=await inspect(page,selector),overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),harnessErrors=await page.evaluate(()=>(window as any).__events.errors);
    writeFileSync(resolve(output,surface+'-'+width+'.json'),JSON.stringify({surface,width,captureViewport:page.viewportSize(),overflow,errors,harnessErrors,geometry:null,readability,stageReadability:null},null,2));
    expect(overflow).toBeLessThanOrEqual(1);expect(errors).toEqual([]);expect(harnessErrors).toEqual([]);
    for(const label of readability.svgText){expect(label.x).toBeGreaterThanOrEqual(0);expect(label.x+label.width).toBeLessThanOrEqual(label.viewWidth);expect(label.y).toBeGreaterThanOrEqual(0);expect(label.y+label.height).toBeLessThanOrEqual(label.viewHeight);expect(label.renderedFontPx).toBeGreaterThanOrEqual(11);}
  });
});

async function nativePickPoint(page: Page, id: string, blocked = false, centre = false): Promise<any> {
  return page.evaluate(({ id, blocked, centre }) => {
    const w = window as any, T = w.THREE, p = w.round22Woodland, roots: any[] = [], targets: any[] = [], owners = new Map(), solids: any[] = [], ray = new T.Raycaster();
    p.scene.updateMatrixWorld(true); p.camera.updateMatrixWorld(true);
    const hawk = p.scene.getObjectByName('birdlab-red-tailed-hawk'); roots.push({ root: hawk, id: 'orbit' });
    p.scene.getObjectByName('birdlab-woodland-residents').children.forEach((root: any) => { if (root.name.startsWith('woodland-')) roots.push({ root, id: root.name.slice(9) }); });
    const shown = (node: any) => { for (; node; node = node.parent) if (node.visible === false) return false; return true; };
    roots.forEach(entry => entry.root.traverse((mesh: any) => { if (mesh.isMesh) { targets.push(mesh); owners.set(mesh, entry.id); } }));
    p.scene.traverse((mesh: any) => { if (mesh.isMesh && ['continuous-woodland-ground', 'distant-connected-woodland-ridge', 'weathered-landing-limb', 'branching-woodland-trunks', 'weathered-wood-broken-end-grain', 'weathered-clearing-stones'].includes(mesh.name) && shown(mesh)) solids.push(mesh); });
    const root = roots.find(entry => entry.id === id)?.root, rect = p.renderer.domElement.getBoundingClientRect(), candidates: any[] = [];
    if (centre) candidates.push(new T.Vector3(0, 0, 0));
    else if (root) {
      const meshes: any[] = []; root.traverse((mesh: any) => { if (mesh.isMesh) meshes.push(mesh); }); meshes.sort((a, b) => Number(/body|breast|head/.test(b.name)) - Number(/body|breast|head/.test(a.name)));
      meshes.forEach(mesh => { mesh.geometry.computeBoundingBox(); candidates.push(mesh.geometry.boundingBox.getCenter(new T.Vector3()).applyMatrix4(mesh.matrixWorld).project(p.camera)); });
    }
    for (const ndc of candidates) {
      if (Math.abs(ndc.x) > .97 || Math.abs(ndc.y) > .97 || ndc.z < -1 || ndc.z > 1) continue;
      const x = centre ? rect.left + rect.width / 2 : Math.floor(rect.left + (ndc.x + 1) * rect.width / 2) + .5, y = centre ? rect.top + rect.height / 2 : Math.floor(rect.top + (1 - ndc.y) * rect.height / 2) + .5;
      ray.setFromCamera(new T.Vector2((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2), p.camera);
      const hit = ray.intersectObjects(targets, false).find((hit: any) => shown(hit.object)); if (!hit || owners.get(hit.object) !== id) continue;
      const solid = ray.intersectObjects(solids, false).find((candidate: any) => candidate.distance < hit.distance - .025);
      if (!!solid !== blocked) continue;
      return { id, x, y, mesh: hit.object.uuid, world: hit.point.toArray(), distance: hit.distance, blocker: solid ? { name: solid.object.name, distance: solid.distance, instance: solid.instanceId } : null };
    }
    return null;
  }, { id, blocked, centre });
}


test.describe('woodland visual review',()=>{
  const harness=new GlHarness({toolId:'birdLab',toolFile:'stem_lab/stem_tool_birdlab.js',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,layout:'document',width:1280,height:960,
    probes:'window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round22Woodland={scene,camera,renderer};return render(scene,camera);};return renderer;};})();'});
  test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
  for(const width of [1280,390])test('woodland at '+width+'px',async({page})=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/shader|WebGL|GL_INVALID/i.test(message.text()))errors.push(message.text());});
    await page.setViewportSize({width,height:960});await page.emulateMedia({reducedMotion:'reduce'});
    await harness.mount(page,{birdLab:{view:'observatory3d'}},undefined,{expectCanvas:false});
    await page.locator('#wrap').evaluate((element:HTMLElement,size)=>{element.style.width=size+'px';element.style.maxWidth='100%';element.style.height='auto';element.style.padding='0';element.setAttribute('data-stem-tool-shell','true');},width);
    const selector='[data-birdlab-3d-shell]',stage='.birdlab-3d-stage',canvas='[data-birdlab-3d-canvas]';
    await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d && !!window.round22Woodland",null,{polling:50,timeout:60_000});
    await page.locator(canvas).scrollIntoViewIfNeeded();
    const before=await page.locator(canvas).evaluate((node:any)=>{node._birdlab3d.setCamera('wide');node._birdlab3d.seek(7.375);return node._birdlab3d.getState();});
    await expect(page.locator(canvas)).toHaveAttribute('data-scene-picking','true');
    await expect.poll(()=>page.evaluate(()=>{const p=(window as any).round22Woodland;return Math.abs(p.camera.aspect-p.renderer.domElement.clientWidth/p.renderer.domElement.clientHeight);})).toBeLessThan(.002);
    let point:any=null;for(const id of ['grouse','mourningDove','blueJay','northernCardinal','robin']){point=await nativePickPoint(page,id);if(point)break;}
    expect(point).not.toBeNull();expect(point.blocker).toBeNull();await page.mouse.click(point.x,point.y);
    await expect.poll(()=>page.locator(canvas).evaluate((node:any)=>node._birdlab3d.getState().camera)).toBe(point.id);
    await capture(page,selector,'woodland-'+width+'.png');const readability=await inspect(page,selector);
    await capture(page,stage,'woodland-stage-'+width+'.png');const stageReadability=await inspect(page,stage);
    const geometry=await page.evaluate(()=>{const w=window as any,{scene,camera,renderer}=w.round22Woodland,controller=(document.querySelector('[data-birdlab-3d-canvas]') as any)._birdlab3d,state=controller.getState();let meshes=0;const geos=new Set(),mats=new Set();scene.traverse((node:any)=>{if(node.isMesh)meshes++;if(node.geometry)geos.add(node.geometry.uuid);for(const m of Array.isArray(node.material)?node.material:node.material?[node.material]:[])mats.add(m.uuid);});return {state,scene:scene.uuid,meshes,geometries:geos.size,materials:mats.size,camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),aspect:camera.aspect,fov:camera.fov},renderer:{live:!renderer.getContext().isContextLost(),calls:renderer.info.render.calls,shaders:renderer.info.programs.every((p:any)=>!p.diagnostics||p.diagnostics.runnable)}};});
    for(const key of ['time','paused','position','orientation','pose','wildlife','sightings'])expect((geometry.state as any)[key],key).toEqual((before as any)[key]);
    expect(geometry.state.camera).toBe(point.id);expect(geometry.state.canSelectBird).toBe(true);expect(geometry.renderer.live).toBe(true);expect(geometry.renderer.shaders).toBe(true);expect(geometry.renderer.calls).toBeGreaterThan(0);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),harnessErrors=await page.evaluate(()=>(window as any).__events.errors);
    writeFileSync(resolve(output,'woodland-'+width+'.json'),JSON.stringify({surface:'woodland',width,captureViewport:page.viewportSize(),overflow,errors,harnessErrors,selection:point,geometry,readability,stageReadability},null,2));
    expect(overflow).toBeLessThanOrEqual(1);expect(errors).toEqual([]);expect(harnessErrors).toEqual([]);
  });
});
