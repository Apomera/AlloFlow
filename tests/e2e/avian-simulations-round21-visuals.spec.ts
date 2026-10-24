import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const output = resolve('reports/avian-simulations-round21-2026-10-21/final');
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
      conditions: [...root.querySelectorAll('[data-wind-condition],[data-fov-condition]')].map(node => ({ attributes: Object.fromEntries([...node.attributes].map(attribute => [attribute.name, attribute.value])) })),
      blocks: [...root.querySelectorAll('figure,svg,button,input,select,label,h2,h3,p,summary')].map(node => ({ tag: node.tagName, text: node.textContent?.trim().slice(0, 100), box: box(node), overflow: node.scrollWidth - node.clientWidth, fontSize: getComputedStyle(node).fontSize })),
      shapes: [...root.querySelectorAll('svg path,svg line,svg rect,svg circle')].map(node => ({ tag: node.tagName, attributes: Object.fromEntries([...node.attributes].map(attribute => [attribute.name, attribute.value])), stroke: getComputedStyle(node).stroke, fill: getComputedStyle(node).fill })),
      svgText: [...root.querySelectorAll('svg text')].map(node => { const text = node as SVGTextElement, r = text.getBBox(), view = text.ownerSVGElement!.viewBox.baseVal, matrix = text.getScreenCTM(); return { text: text.textContent, x: r.x, y: r.y, width: r.width, height: r.height, viewWidth: view.width, viewHeight: view.height, renderedFontPx: parseFloat(getComputedStyle(text).fontSize) * (matrix ? Math.hypot(matrix.a, matrix.b) : 0) }; }) };
  });
}





for (const surface of ['wind','fov','section']) test.describe(surface+' visual review',()=>{
  const bird=surface!=='fov';
  const harness=new GlHarness({toolId:bird?'birdLab':'raptorHunt',toolFile:'stem_lab/stem_tool_'+(bird?'birdlab':'raptorhunt')+'.js',preScripts:bird?['stem_lab/stem_lab_module.js']:[],appStyles:true,layout:'document',width:1280,height:960,
    probes:surface==='section'?'(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){if(scene.getObjectByName("birdlab-wing-construction"))window.round21Visual={scene,camera,renderer};return render(scene,camera);};return renderer;};})();':undefined});
  test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
  for(const width of [1280,390]) test(surface+' at '+width+'px',async({page})=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/shader|WebGL|GL_INVALID/i.test(message.text()))errors.push(message.text());});
    await page.setViewportSize({width,height:960});await page.emulateMedia({reducedMotion:'reduce'});
    const data=surface==='fov'?{raptorHunt:{activeSection:'gear'}}:{birdLab:{view:surface==='wind'?'weather':'wingTypes'}};
    await harness.mount(page,data,undefined,{expectCanvas:false});await page.locator('#wrap').evaluate((element:HTMLElement,size)=>{element.style.width=size+'px';element.style.maxWidth='100%';element.style.height='auto';element.style.padding='0';element.setAttribute('data-stem-tool-shell','true');},width);
    let selector:string,geometry:any=null,stageReadability:any=null;
    if(surface==='wind'){
      selector='[data-birdlab-wind-study]';await expect(page.locator(selector)).toBeVisible();
      await page.locator('#birdlab-wind-speed').fill('6');await page.locator('#birdlab-wind-course').fill('45');await page.locator('#birdlab-wind-wx').fill('3');await page.locator('#birdlab-wind-wy').fill('-3');await page.locator('[data-wind-pin]').click();await page.locator('[data-wind-experiment="reverse"]').click();await page.locator('#birdlab-wind-time').fill('4');await page.locator('[data-wind-answer="vector"]').click();await expect(page.locator('#birdlab-wind-wx')).toHaveValue('-3');
    }else if(surface==='fov'){
      selector='[data-raptor-fov-study]';await expect(page.locator(selector)).toBeVisible();await page.locator('[data-fov-pin]').click();await page.locator('[data-fov-experiment="doubleM"]').click();await page.locator('[data-fov-answer="narrow"]').click();await expect(page.locator('#rh-fov-magnification')).toHaveValue('8');
    }else{
      selector='[data-birdlab-wing-assembly]';await expect(page.locator(selector)).toBeVisible();await page.waitForFunction('!!window.round21Visual?.scene.getObjectByName("birdlab-wing-section-probe")',null,{polling:50,timeout:60_000});
      await page.locator('[data-wing-view="above"]').click();await page.getByRole('button',{name:'Rotate wing right',exact:true}).click();await page.getByRole('button',{name:'Rotate wing right',exact:true}).click();await page.locator('[data-wing-section-toggle]').click();await expect(page.locator('[data-wing-mesh-section]')).toHaveAttribute('data-wing-section-ready','true');await page.locator('[data-wing-construction-stage]').scrollIntoViewIfNeeded();
      await expect.poll(()=>page.evaluate(()=>(window as any).round21Visual.scene.getObjectByName('birdlab-wing-section-probe').visible)).toBe(true);
    }
    await capture(page,selector,surface+'-'+width+'.png');const readability=await inspect(page,selector);
    if(surface==='section'){
      await capture(page,'[data-wing-construction-stage]','section-stage-'+width+'.png');stageReadability=await inspect(page,'[data-wing-construction-stage]');
      geometry=await page.evaluate(()=>{const w=window as any,{scene,camera,renderer}=w.round21Visual,root=scene.getObjectByName('birdlab-wing-construction'),guide=scene.getObjectByName('birdlab-wing-section-probe'),line=scene.getObjectByName('birdlab-wing-section-lines');scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
        const groups=['secondaries','primaries','body'].map(part=>{const group=root.getObjectByName('wing-construction-'+part);let pieces=0,vertices=0;group.traverse((mesh:any)=>{if(mesh.isMesh){pieces++;vertices+=mesh.geometry.attributes.position.count;}});return {part,visible:group.visible,position:group.position.toArray(),scale:group.scale.toArray(),pieces,vertices};});
        return {scale:root.scale.toArray(),separation:root.userData.separation,isolatedPart:root.userData.isolatedPart,groups,section:{...guide.userData.section,visible:guide.visible,drawCount:line.geometry.drawRange.count,profileSegments:document.querySelectorAll('[data-wing-section-profile-lines] line').length},camera:{position:camera.position.toArray(),projection:camera.projectionMatrix.toArray(),matrixWorld:camera.matrixWorld.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov,aspect:camera.aspect,orbitYaw:Math.atan2(camera.position.x,camera.position.z),orbitPitch:Math.atan2(camera.position.y,Math.hypot(camera.position.x,camera.position.z))},renderer:{live:!renderer.getContext().isContextLost(),calls:renderer.info.render.calls,shaders:renderer.info.programs.every((p:any)=>!p.diagnostics||p.diagnostics.runnable)}};});
      expect(geometry.camera.orbitPitch).toBeCloseTo(1.33,3);expect(geometry.camera.orbitYaw).toBeCloseTo(.56,3);expect(geometry.scale).toEqual([.7,.7,.7]);expect(geometry.separation).toBe(0);expect(geometry.renderer.live).toBe(true);expect(geometry.renderer.calls).toBeGreaterThan(0);expect(geometry.renderer.shaders).toBe(true);
      expect(geometry.section.visible).toBe(true);expect(geometry.section.station).toBe(45);expect(geometry.section.x).toBeCloseTo(2.16,6);expect(geometry.section.segments).toBeGreaterThan(0);expect(geometry.section.drawCount).toBe(geometry.section.segments*2);expect(geometry.section.profileSegments).toBe(geometry.section.segments);expect(geometry.groups.map((g:any)=>g.pieces)).toEqual([98,94,2]);expect(geometry.groups.map((g:any)=>g.visible)).toEqual([true,true,true]);
    }
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),harnessErrors=await page.evaluate(()=>(window as any).__events.errors);
    writeFileSync(resolve(output,surface+'-'+width+'.json'),JSON.stringify({surface,width,captureViewport:page.viewportSize(),overflow,errors,harnessErrors,geometry,readability,stageReadability},null,2));
    expect(overflow).toBeLessThanOrEqual(1);expect(errors).toEqual([]);expect(harnessErrors).toEqual([]);
    for(const label of readability.svgText){expect(label.x).toBeGreaterThanOrEqual(0);expect(label.x+label.width).toBeLessThanOrEqual(label.viewWidth);expect(label.y).toBeGreaterThanOrEqual(0);expect(label.y+label.height).toBeLessThanOrEqual(label.viewHeight);expect(label.renderedFontPx).toBeGreaterThanOrEqual(11);}
  });
});
