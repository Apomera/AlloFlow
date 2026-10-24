import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const output = resolve('reports/avian-simulations-round17-2026-10-20/final');
test.use({ video: 'off' });
test.describe.configure({ timeout: 240_000, retries: 0 });
async function capture(page: Page, selector: string, name: string) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const viewport = page.viewportSize()!, initial = (await page.locator(selector).boundingBox())!;
  if (initial.height > viewport.height) {
    await page.setViewportSize({ width: viewport.width, height: Math.ceil(initial.height) + 200 });
    await page.evaluate(() => { const step = (window as any).round17VisualStep; if (step) for (let i=0;i<4;i++) step(); });
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
      conditions: [...root.querySelectorAll('[data-shell-condition],[data-encounter-budget]')].map(node => ({ attributes: Object.fromEntries([...node.attributes].map(attribute => [attribute.name, attribute.value])) })),
      blocks: [...root.querySelectorAll('figure,svg,button,input,select,label,h2,h3,p,summary')].map(node => ({ tag: node.tagName, text: node.textContent?.trim().slice(0, 100), box: box(node), overflow: node.scrollWidth - node.clientWidth, fontSize: getComputedStyle(node).fontSize })),
      shapes: [...root.querySelectorAll('svg path,svg line,svg rect,svg circle')].map(node => ({ tag: node.tagName, attributes: Object.fromEntries([...node.attributes].map(attribute => [attribute.name, attribute.value])), stroke: getComputedStyle(node).stroke, fill: getComputedStyle(node).fill })),
      svgText: [...root.querySelectorAll('svg text')].map(node => { const text = node as SVGTextElement, r = text.getBBox(), view = text.ownerSVGElement!.viewBox.baseVal, matrix = text.getScreenCTM(); return { text: text.textContent, x: r.x, y: r.y, width: r.width, height: r.height, viewWidth: view.width, viewHeight: view.height, renderedFontPx: parseFloat(getComputedStyle(text).fontSize) * (matrix ? Math.hypot(matrix.a, matrix.b) : 0) }; }) };
  });
}


for (const surface of ['diffusion','encounters','shape']) test.describe(surface+' visual review',()=>{
  const bird=surface!=='encounters';
  const harness=new GlHarness({toolId:bird?'birdLab':'raptorHunt',toolFile:'stem_lab/stem_tool_'+(bird?'birdlab':'raptorhunt')+'.js',preScripts:bird?['stem_lab/stem_lab_module.js']:[],appStyles:true,layout:'document',width:1280,height:960,
    probes:surface==='shape'?'window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round17Visual={scene,camera,renderer};return render(scene,camera);};return renderer;};})();':undefined});
  test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
  for(const width of [1280,390]) test(surface+' at '+width+'px',async({page})=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/shader|WebGL|GL_INVALID/i.test(message.text()))errors.push(message.text());});
    await page.setViewportSize({width,height:960});await page.emulateMedia({reducedMotion:'reduce'});
    if(surface==='shape')await page.addInitScript(()=>{let time=1000,next=1,seed=731;const pending=new Map<number,FrameRequestCallback>();Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};window.requestAnimationFrame=callback=>{const id=next++;pending.set(id,callback);return id;};window.cancelAnimationFrame=id=>{pending.delete(id);};(window as any).round17VisualStep=()=>{time+=25;const callbacks=[...pending.values()];pending.clear();callbacks.forEach(callback=>callback(time));};});
    const data=surface==='encounters'?{raptorHunt:{activeSection:'ecology'}}:{birdLab:{view:surface==='diffusion'?'reproDeep':'observatory3d'}};
    await harness.mount(page,data,undefined,{expectCanvas:false});await page.locator('#wrap').evaluate((element:HTMLElement,size)=>{element.style.width=size+'px';element.style.maxWidth='100%';element.style.height='auto';element.style.padding='0';element.setAttribute('data-stem-tool-shell','true');},width);
    let selector:string,geometry:any=null,controls:any=null;
    if(surface==='diffusion'){
      selector='[data-birdlab-shell-study]';await expect(page.locator(selector)).toBeVisible();await page.locator('[data-shell-pin]').click();await page.locator('[data-shell-experiment="radius"]').click();await page.locator('[data-shell-answer="limits"]').click();await expect(page.locator('#birdlab-shell-radius')).toHaveValue('1');
    }else if(surface==='encounters'){
      selector='[data-raptor-encounter-study]';await expect(page.locator(selector)).toBeVisible();await page.locator('[data-encounter-pin]').click();await page.locator('[data-encounter-experiment="double-handling"]').click();await page.locator('#rh-encounter-density').fill('35');await expect(page.locator('#rh-encounter-handling')).toHaveValue('0.4');
    }else{
      await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d && !!window.round17Visual",null,{polling:50,timeout:60_000});
      await page.locator('[data-birdlab-3d-canvas]').evaluate((canvas:any)=>{const c=canvas._birdlab3d;c.seek(7.5);c.setAnatomyStudy(true);c.setAnatomyPart('leftWing');c.setAnatomyIsolate(true);c.pinAnatomyShape();c.seek(35.2);c.setAnatomyView('above');c.frameAnatomyPart();});await page.evaluate(()=>{for(let i=0;i<4;i++)(window as any).round17VisualStep();});
      await capture(page,'[data-birdlab-anatomy-study]','shape-controls-'+width+'.png');controls=await inspect(page,'[data-birdlab-anatomy-study]');selector='.birdlab-3d-stage';
      geometry=await page.evaluate(()=>{const w=window as any,{scene,camera,renderer}=w.round17Visual,T=w.THREE,state=(document.querySelector('[data-birdlab-3d-canvas]') as any)._birdlab3d.getState(),study=state.anatomyInvestigation,bird=scene.getObjectByName('birdlab-red-tailed-hawk');scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const gl=renderer.getContext();return {time:state.time,paused:state.paused,study,bodyMatrix:bird.matrixWorld.toArray(),projected:[...study.corners,...study.pinned.corners].map((p:number[])=>new T.Vector3(...p).project(camera).toArray()),camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.toArray(),matrixWorld:camera.matrixWorld.toArray(),fov:camera.fov,aspect:camera.aspect},renderer:{live:!gl.isContextLost(),calls:renderer.info.render.calls,shaders:renderer.info.programs.every((p:any)=>!p.diagnostics||p.diagnostics.runnable)}};});
      expect(geometry.time).toBe(35.2);expect(geometry.paused).toBe(true);expect(geometry.study.pinned.time).toBe(7.5);expect(geometry.study.pinned.matching).toBe(true);expect(geometry.renderer.live).toBe(true);expect(geometry.renderer.calls).toBeGreaterThan(0);expect(geometry.renderer.shaders).toBe(true);for(const p of geometry.projected)for(const axis of [0,1,2])expect(Math.abs(p[axis])).toBeLessThan(1);await expect(page.locator('[data-anatomy-pinned-edge]')).toHaveCount(12);
    }
    await capture(page,selector,surface+'-'+width+'.png');const readability=await inspect(page,selector),overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),harnessErrors=await page.evaluate(()=>(window as any).__events.errors);
    writeFileSync(resolve(output,surface+'-'+width+'.json'),JSON.stringify({surface,width,captureViewport:page.viewportSize(),overflow,errors,harnessErrors,geometry,readability,controlsReadability:controls},null,2));expect(overflow).toBeLessThanOrEqual(1);expect(errors).toEqual([]);expect(harnessErrors).toEqual([]);
    for(const labels of [readability.svgText,controls?.svgText||[]])for(const label of labels){expect(label.x).toBeGreaterThanOrEqual(0);expect(label.x+label.width).toBeLessThanOrEqual(label.viewWidth);expect(label.y).toBeGreaterThanOrEqual(0);expect(label.y+label.height).toBeLessThanOrEqual(label.viewHeight);}
  });
});
