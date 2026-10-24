import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const output = resolve('reports/avian-simulations-round25-2026-10-21/final');
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
      conditions: [...root.querySelectorAll('[data-heat-condition],[data-sky-condition]')].map(node => ({ attributes: Object.fromEntries([...node.attributes].map(attribute => [attribute.name, attribute.value])) })),
      blocks: [...root.querySelectorAll('figure,svg,button,input,select,label,h2,h3,p,summary')].map(node => ({ tag: node.tagName, text: node.textContent?.trim().slice(0, 100), box: box(node), overflow: node.scrollWidth - node.clientWidth, fontSize: getComputedStyle(node).fontSize })),
      shapes: [...root.querySelectorAll('svg path,svg line,svg rect,svg circle')].map(node => ({ tag: node.tagName, attributes: Object.fromEntries([...node.attributes].map(attribute => [attribute.name, attribute.value])), stroke: getComputedStyle(node).stroke, fill: getComputedStyle(node).fill })),
      svgText: [...root.querySelectorAll('svg text')].map(node => { const text = node as SVGTextElement, r = text.getBBox(), view = text.ownerSVGElement!.viewBox.baseVal, matrix = text.getScreenCTM(); return { text: text.textContent, x: r.x, y: r.y, width: r.width, height: r.height, viewWidth: view.width, viewHeight: view.height, renderedFontPx: parseFloat(getComputedStyle(text).fontSize) * (matrix ? Math.hypot(matrix.a, matrix.b) : 0) }; }) };
  });
}

test.describe('native frozen surface visual review', () => {
  const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true, layout: 'document', width: 1280, height: 960,
    probes: 'window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round25Native={scene,camera,renderer};return render(scene,camera);};return renderer;};})();' });
  test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
  test.afterAll(async () => harness.stop()); test.afterEach(async ({ page }) => harness.destroy(page));
  for (const width of [1280, 390]) test('frozen surface at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && /shader|WebGL|GL_INVALID/i.test(message.text())) errors.push(message.text()); });
    await page.setViewportSize({ width, height: 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
    await harness.mount(page, { birdLab: { view: 'observatory3d' } }, undefined, { expectCanvas: false });
    await page.locator('#wrap').evaluate((node: HTMLElement, width) => { node.style.width = width + 'px'; node.style.maxWidth = '100%'; node.style.height = 'auto'; node.style.padding = '0'; node.setAttribute('data-stem-tool-shell', 'true'); }, width);
    const canvas = '[data-birdlab-3d-canvas]', selector = '[data-birdlab-3d-shell]', stage = '.birdlab-3d-stage';
    await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d && !!window.round25Native", null, { polling: 50, timeout: 60_000 });
    await page.locator(canvas).evaluate((node: any) => { const c=node._birdlab3d; c.seek(7.5);c.setAnatomyStudy(true);c.setAnatomyPart('leftWing');c.setAnatomyIsolate(true);c.setAnatomyView('above'); });
    const oracle = await page.evaluate(() => {
      const w=window as any,T=w.THREE,p=w.round25Native,body=p.scene.getObjectByName('birdlab-red-tailed-hawk');body.updateMatrixWorld(true);
      const inverse=body.matrixWorld.clone().invert(),values:number[]=[],sources:any[]=[];
      body.traverse((mesh:any)=>{
        if(!mesh.isMesh||mesh.name==='curved-lower-eyelid'||!mesh.geometry?.attributes.position)return;
        let chosen=false;for(let node=mesh;node&&node!==body;node=node.parent)if(node.name==='left-shoulder')chosen=true;if(!chosen)return;
        for(let node=mesh;node;node=node.parent)if(!node.visible)return;
        const g=mesh.geometry,position=g.attributes.position,index=g.index,limit=index?index.count:position.count,draw=g.drawRange,groups=Array.isArray(mesh.material)?g.groups.filter((group:any)=>mesh.material[group.materialIndex]?.visible!==false):mesh.material?.visible!==false?[{start:0,count:limit}]:[];
        const start=values.length/3;
        for(const group of groups){const first=Math.max(0,draw.start,group.start),last=Math.min(limit,draw.start+draw.count,group.start+group.count);for(let face=first;face+2<last;face+=3)for(let corner=0;corner<3;corner++){
          const id=index?index.getX(face+corner):face+corner,base=new T.Vector3().fromBufferAttribute(position,id),v=base.clone();
          (g.morphAttributes.position||[]).forEach((attribute:any,m:number)=>{const weight=mesh.morphTargetInfluences?.[m]||0;if(weight){const delta=new T.Vector3().fromBufferAttribute(attribute,id);if(!g.morphTargetsRelative)delta.sub(base);v.addScaledVector(delta,weight);}});
          v.applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);values.push(v.x,v.y,v.z);
        }}
        if(values.length/3>start)sources.push({id:mesh.uuid,name:mesh.name,triangles:(values.length/3-start)/3});
      });
      w.round25ExpectedFrozen=values;return {triangles:values.length/9,sources};
    });
    expect(oracle.triangles).toBeGreaterThan(100);await page.locator('[data-anatomy-pin]').click();
    await page.locator('[data-anatomy-moment="approach"]').click(); await page.locator('[data-anatomy-frozen-toggle]').check();
    await page.locator('[data-anatomy-frozen-opacity]').fill('20');
    await page.locator('[data-anatomy-view="above"]').click();await page.locator('[data-anatomy-frame]').click();
    await expect(page.locator('[data-anatomy-frozen-toggle]')).toBeChecked();
    await expect.poll(()=>page.locator(canvas).evaluate((node:any)=>node._birdlab3d.getState().anatomyInvestigation.frozenSurface.visible)).toBe(true);
    const before=await page.locator(canvas).evaluate((node:any)=>node._birdlab3d.getState());
    await capture(page,selector,'frozen-'+width+'.png');const readability=await inspect(page,selector);
    await capture(page,stage,'frozen-stage-'+width+'.png');const stageReadability=await inspect(page,stage);
    const geometry=await page.evaluate(()=>{
      const w=window as any,p=w.round25Native,T=w.THREE,body=p.scene.getObjectByName('birdlab-red-tailed-hawk'),root=p.scene.getObjectByName('birdlab-anatomy-frozen-surface'),surface=root.getObjectByName('birdlab-anatomy-frozen-triangles'),edges=root.getObjectByName('birdlab-anatomy-frozen-creases');p.scene.updateMatrixWorld(true);
      const attribute=surface.geometry.attributes.position,expected=w.round25ExpectedFrozen;let maxBodyError=0,maxWorldError=0;
      for(let i=0;i<attribute.count;i++){
        const local=new T.Vector3().fromBufferAttribute(attribute,i),wanted=new T.Vector3(expected[i*3],expected[i*3+1],expected[i*3+2]);maxBodyError=Math.max(maxBodyError,local.distanceTo(wanted));maxWorldError=Math.max(maxWorldError,local.clone().applyMatrix4(surface.matrixWorld).distanceTo(wanted.applyMatrix4(body.matrixWorld)));
      }
      const gl=p.renderer.getContext(),size=gl.drawingBufferWidth*gl.drawingBufferHeight*4;
      const pixels=()=>{p.renderer.render(p.scene,p.camera);const values=new Uint8Array(size);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,values);return values;};
      let changedPixels=0;try{root.visible=true;const shown=pixels();root.visible=false;const hidden=pixels();for(let i=0;i<size;i+=4)if(Math.abs(shown[i]-hidden[i])+Math.abs(shown[i+1]-hidden[i+1])+Math.abs(shown[i+2]-hidden[i+2])>15)changedPixels++;}finally{root.visible=true;p.renderer.render(p.scene,p.camera);}
      return {state:(document.querySelector('[data-birdlab-3d-canvas]') as any)._birdlab3d.getState(),expectedVertices:expected.length/3,actualVertices:attribute.count,maxBodyError,maxWorldError,changedPixels,overlay:{name:root.name,parent:root.parent.name||root.parent.type,visible:root.visible,matrix:root.matrix.elements,bodyMatrix:body.matrixWorld.elements,surface:{triangles:attribute.count/3,opacity:surface.material.opacity,depthTest:surface.material.depthTest,depthWrite:surface.material.depthWrite},edges:{segments:edges.geometry.attributes.position.count/2,depthTest:edges.material.depthTest,depthWrite:edges.material.depthWrite}},renderer:{live:!gl.isContextLost(),calls:p.renderer.info.render.calls,shaders:p.renderer.info.programs.every((program:any)=>!program.diagnostics||program.diagnostics.runnable)}};
    });
    for(const key of ['time','paused','position','orientation','pose','wildlife','sightings'])expect((geometry.state as any)[key],key).toEqual((before as any)[key]);
    const investigation=geometry.state.anatomyInvestigation;expect(investigation.part).toBe('leftWing');expect(investigation.pinned.time).toBe(7.5);expect(geometry.state.time).toBe(35.2);expect(investigation.frozenSurface.triangles).toBe(oracle.triangles);expect(investigation.frozenSurface.sourceMeshes).toEqual(oracle.sources);
    expect(geometry.actualVertices).toBe(geometry.expectedVertices);expect(geometry.maxBodyError).toBeLessThan(2e-7);expect(geometry.maxWorldError).toBeLessThan(3e-7);expect(geometry.changedPixels).toBeGreaterThan(100);
    expect(geometry.overlay.parent).toBe('Scene');expect(geometry.overlay.visible).toBe(true);expect(geometry.overlay.matrix).toEqual(geometry.overlay.bodyMatrix);expect(geometry.overlay.surface.opacity).toBe(.2);expect(geometry.overlay.surface.depthTest).toBe(true);expect(geometry.overlay.surface.depthWrite).toBe(false);expect(geometry.overlay.edges.depthTest).toBe(true);expect(geometry.overlay.edges.depthWrite).toBe(false);
    expect(geometry.renderer.live).toBe(true);expect(geometry.renderer.shaders).toBe(true);expect(geometry.renderer.calls).toBeGreaterThan(0);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),harnessErrors=await page.evaluate(()=>(window as any).__events.errors);
    writeFileSync(resolve(output,'frozen-'+width+'.json'),JSON.stringify({surface:'frozen',width,captureViewport:page.viewportSize(),overflow,errors,harnessErrors,oracle,geometry,readability,stageReadability},null,2));
    expect(overflow).toBeLessThanOrEqual(1);expect(errors).toEqual([]);expect(harnessErrors).toEqual([]);
  });
});

for (const surface of ['heat', 'skyline']) test.describe(surface + ' visual review', () => {
  const bird = surface === 'heat';
  const harness = new GlHarness({ toolId: bird ? 'birdLab' : 'raptorHunt', toolFile: 'stem_lab/stem_tool_' + (bird ? 'birdlab' : 'raptorhunt') + '.js', preScripts: bird ? ['stem_lab/stem_lab_module.js'] : [], appStyles: true, layout: 'document', width: 1280, height: 960 });
  test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
  test.afterAll(async () => harness.stop()); test.afterEach(async ({ page }) => harness.destroy(page));
  for (const width of [1280, 390]) test(surface + ' at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
    await harness.mount(page, bird ? { birdLab: { view: 'thermo' } } : { raptorHunt: { activeSection: 'urban', skylineStudy: { version: 1, eye: 12, target: 58, roofA: 20, roofB: 38, roofC: 42, probe: 50 }, xp: 0 } }, undefined, { expectCanvas: false });
    await page.locator('#wrap').evaluate((node: HTMLElement, width) => { node.style.width = width + 'px'; node.style.maxWidth = '100%'; node.style.height = 'auto'; node.style.padding = '0'; node.setAttribute('data-stem-tool-shell', 'true'); }, width);
    const selector = bird ? '[data-birdlab-heat-study]' : '[data-raptor-skyline-study]'; await expect(page.locator(selector)).toBeVisible();
    if (bird) {
      await page.locator('[data-heat-pin]').click(); await page.locator('[data-heat-experiment="flow"]').click();
      await page.locator('#birdlab-heat-position').fill('0.72'); await page.locator('[data-heat-answer="ends"]').click();
      await expect(page.locator('[data-heat-condition="current"]')).toHaveAttribute('data-heat-flow','parallel');
      await expect(page.locator('[data-heat-condition="pinned"]')).toHaveAttribute('data-heat-flow','counter');
    } else {
      await page.locator('[data-sky-pin]').click(); await page.locator('[data-sky-experiment="target"]').click();
      await page.locator('#rh-sky-probe').fill('55');
      await expect(page.locator('[data-sky-condition="current"]')).toHaveAttribute('data-sky-design','12,68,20,38,42');
      await expect(page.locator('[data-sky-condition="pinned"]')).toHaveAttribute('data-sky-design','12,58,20,38,42');
      await expect(page.locator('[data-sky-condition="current"] [data-sky-reading="first"]')).toHaveText('No contact');
      await expect(page.locator('[data-sky-condition="pinned"] [data-sky-reading="first"]')).toHaveText('50 m');
      await expect(page.locator('[data-sky-condition="current"] [data-sky-reading="clearance"]')).toHaveText('4.8 m');
      await expect(page.locator('[data-sky-condition="pinned"] [data-sky-reading="clearance"]')).toHaveText('-0.7 m');
    }
    await capture(page, selector, surface + '-' + width + '.png'); const readability = await inspect(page, selector);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), harnessErrors = await page.evaluate(() => (window as any).__events.errors);
    writeFileSync(resolve(output, surface + '-' + width + '.json'), JSON.stringify({ surface, width, captureViewport: page.viewportSize(), overflow, errors, harnessErrors, geometry: null, readability, stageReadability: null }, null, 2));
    expect(overflow).toBeLessThanOrEqual(1); expect(errors).toEqual([]); expect(harnessErrors).toEqual([]);
    const invalid = readability.svgText.filter(label => !(label.x >= 0 && label.x + label.width <= label.viewWidth && label.y >= 0 && label.y + label.height <= label.viewHeight && label.renderedFontPx >= 11));
    expect(invalid).toEqual([]);
  });
});
