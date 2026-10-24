import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const output = resolve('reports/avian-simulations-round18-2026-10-21/final');
test.use({ video: 'off' });
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
      conditions: [...root.querySelectorAll('[data-molt-condition],[data-skeletal-inventory]')].map(node => ({ attributes: Object.fromEntries([...node.attributes].map(attribute => [attribute.name, attribute.value])) })),
      blocks: [...root.querySelectorAll('figure,svg,button,input,select,label,h2,h3,p,summary')].map(node => ({ tag: node.tagName, text: node.textContent?.trim().slice(0, 100), box: box(node), overflow: node.scrollWidth - node.clientWidth, fontSize: getComputedStyle(node).fontSize })),
      shapes: [...root.querySelectorAll('svg path,svg line,svg rect,svg circle')].map(node => ({ tag: node.tagName, attributes: Object.fromEntries([...node.attributes].map(attribute => [attribute.name, attribute.value])), stroke: getComputedStyle(node).stroke, fill: getComputedStyle(node).fill })),
      svgText: [...root.querySelectorAll('svg text')].map(node => { const text = node as SVGTextElement, r = text.getBBox(), view = text.ownerSVGElement!.viewBox.baseVal, matrix = text.getScreenCTM(); return { text: text.textContent, x: r.x, y: r.y, width: r.width, height: r.height, viewWidth: view.width, viewHeight: view.height, renderedFontPx: parseFloat(getComputedStyle(text).fontSize) * (matrix ? Math.hypot(matrix.a, matrix.b) : 0) }; }) };
  });
}



for (const surface of ['replacement','skeletal','construction']) test.describe(surface+' visual review',()=>{
  const bird=surface!=='skeletal';
  const harness=new GlHarness({toolId:bird?'birdLab':'raptorHunt',toolFile:'stem_lab/stem_tool_'+(bird?'birdlab':'raptorhunt')+'.js',preScripts:bird?['stem_lab/stem_lab_module.js']:[],appStyles:true,layout:'document',width:1280,height:960,
    probes:surface==='construction'?'(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round18Visual={scene,camera,renderer};return render(scene,camera);};return renderer;};})();':undefined});
  test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
  for(const width of [1280,390]) test(surface+' at '+width+'px',async({page})=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/shader|WebGL|GL_INVALID/i.test(message.text()))errors.push(message.text());});
    await page.setViewportSize({width,height:960});await page.emulateMedia({reducedMotion:'reduce'});
    const data=surface==='skeletal'?{raptorHunt:{activeSection:'pelletkey'}}:{birdLab:{view:surface==='replacement'?'plumage':'wingTypes'}};
    await harness.mount(page,data,undefined,{expectCanvas:false});await page.locator('#wrap').evaluate((element:HTMLElement,size)=>{element.style.width=size+'px';element.style.maxWidth='100%';element.style.height='auto';element.style.padding='0';element.setAttribute('data-stem-tool-shell','true');},width);
    let selector:string,geometry:any=null,stageReadability:any=null;
    if(surface==='replacement'){
      selector='[data-birdlab-molt-study]';await expect(page.locator(selector)).toBeVisible();await page.locator('[data-molt-pin]').click();await page.locator('[data-molt-experiment="closer"]').click();await page.locator('[data-molt-answer="limits"]').click();await expect(page.locator('#birdlab-molt-gap')).toHaveValue('2');
    }else if(surface==='skeletal'){
      selector='[data-raptor-skeletal-study]';await expect(page.locator(selector)).toBeVisible();await page.locator('[data-skeletal-pin]').click();await page.locator('[data-skeletal-experiment="right"]').click();await expect(page.locator('#rh-skeletal-right')).toHaveValue('3');
    }else{
      selector='[data-birdlab-wing-assembly]';await expect(page.locator(selector)).toBeVisible();
      await page.waitForFunction('!!window.round18Visual?.scene.getObjectByName("birdlab-wing-construction")',null,{polling:50,timeout:60_000});
      await page.locator('#birdlab-wing-separation').fill('60');await page.locator('[data-wing-select="primaries"]').click();
      await expect.poll(()=>page.evaluate(()=>(window as any).round18Visual.scene.getObjectByName('birdlab-wing-construction').userData.separation)).toBe(60);
    }
    await capture(page,selector,surface+'-'+width+'.png');
    const readability=await inspect(page,selector);
    if(surface==='construction'){
      await capture(page,'[data-wing-construction-stage]','construction-stage-'+width+'.png');stageReadability=await inspect(page,'[data-wing-construction-stage]');
      geometry=await page.evaluate(()=>{const w=window as any,{scene,camera,renderer}=w.round18Visual,T=w.THREE,root=scene.getObjectByName('birdlab-wing-construction');scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const groups=['secondaries','primaries','body'].map(part=>{const group=root.getObjectByName('wing-construction-'+part),points:number[][]=[],ids:string[]=[];group.traverse((mesh:any)=>{if(!mesh.isMesh)return;ids.push(mesh.uuid);const attr=mesh.geometry.attributes.position;for(let i=0;i<attr.count;i++)points.push(new T.Vector3().fromBufferAttribute(attr,i).applyMatrix4(mesh.matrixWorld).project(camera).toArray());});return {part,position:group.position.toArray(),scale:group.scale.toArray(),pieces:ids.length,projected:points};});return {scale:root.scale.toArray(),separation:root.userData.separation,groups,camera:{position:camera.position.toArray(),projection:camera.projectionMatrix.toArray(),matrixWorld:camera.matrixWorld.toArray(),fov:camera.fov,aspect:camera.aspect},renderer:{live:!renderer.getContext().isContextLost(),calls:renderer.info.render.calls,shaders:renderer.info.programs.every((p:any)=>!p.diagnostics||p.diagnostics.runnable)}};});
      expect(geometry.scale).toEqual([.7,.7,.7]);expect(geometry.separation).toBe(60);expect(geometry.renderer.live).toBe(true);expect(geometry.renderer.calls).toBeGreaterThan(0);expect(geometry.renderer.shaders).toBe(true);
      expect(geometry.groups.map((g:any)=>g.pieces)).toEqual([98,94,2]);
      for(const group of geometry.groups)for(const point of group.projected)for(const axis of [0,1,2])expect(Math.abs(point[axis])).toBeLessThan(1);
    }
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),harnessErrors=await page.evaluate(()=>(window as any).__events.errors);
    writeFileSync(resolve(output,surface+'-'+width+'.json'),JSON.stringify({surface,width,captureViewport:page.viewportSize(),overflow,errors,harnessErrors,geometry,readability,stageReadability},null,2));
    expect(overflow).toBeLessThanOrEqual(1);expect(errors).toEqual([]);expect(harnessErrors).toEqual([]);
    for(const label of readability.svgText){expect(label.x).toBeGreaterThanOrEqual(0);expect(label.x+label.width).toBeLessThanOrEqual(label.viewWidth);expect(label.y).toBeGreaterThanOrEqual(0);expect(label.y+label.height).toBeLessThanOrEqual(label.viewHeight);expect(label.renderedFontPx).toBeGreaterThanOrEqual(11);}
  });
});
