import { test, expect, type Page } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { showScaleExplorerTools } from './helpers/scale_explorer_workspace';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 180000 });
test.use({ video: 'off', trace: 'off', hasTouch: true });
const out = path.resolve(process.env.SCALE_RIBO_REPORT_DIR || 'reports/scale-explorer-ribosome');
const canvas = (p: Page) => p.locator('[data-atlas-ready]');
const route = (p: Page) => p.getByRole('region', { name: 'Ribosome navigation', exact: true });
const study = (p: Page) => p.getByRole('region', { name: 'Ribosome observatory', exact: true });
const slider = (p: Page) => route(p).getByRole('slider', { name: 'Translation landmark', exact: true });
const ids = ['mrna-channel', 'trna-a', 'trna-p', 'peptide-center', 'trna-e'];
const replacement = (process.env.STEM_GL_SUBSTITUTE || '').split(';').find(p => p.startsWith('stem_lab/stem_tool_scaleexplorer.js='));
const sourceFile = replacement ? replacement.slice(replacement.indexOf('=') + 1) : 'stem_lab/stem_tool_scaleexplorer.js';
const sandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {} } } as any;
vm.runInNewContext(readFileSync(sourceFile, 'utf8').replace("  window.StemLab.registerTool('scaleExplorer', {", "  window.__riboPoints=RIBOSOME_STRUCTURE.landmarks;\n  window.StemLab.registerTool('scaleExplorer', {"), sandbox);
const landmarks = JSON.parse(JSON.stringify(sandbox.window.__riboPoints));
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_scaleexplorer.js', toolId: 'scaleExplorer', width: 1400, height: 1100,
  layout: 'document', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['vendor/three-r128/GLTFLoader.js'],
  probes: `const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__riboCamera=c;window.__riboRenderer=r;return render.apply(this,arguments);};return r;}});`
});
function save(name: string, value: unknown) { writeFileSync(path.join(out, name + '.json'), JSON.stringify(value, null, 2) + '\n'); }
async function mount(page: Page, phone = false) {
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/*', request => {
    const url = request.request().url();
    if (/^https?:/.test(url) && !/^http:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(url)) { external.push(url); return request.abort(); }
    return request.continue();
  });
  if (phone) await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) { return type === 'webgl2' ? null : original.apply(this, [type, ...args] as any); };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: phone ? 320 : 1400, height: phone ? 780 : 1100 });
  await harness.mount(page, { _scaleExplorer: { ambient: false } }, '!!document.querySelector("[data-atlas-ready]")');
  await showScaleExplorerTools(page);
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  await fly(page, 'ribosome');
  return { errors, external };
}
async function fly(page: Page, id: string) {
  await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).selectOption(id);
  await expect(canvas(page)).toHaveAttribute('data-atlas-objects', id);
  await expect.poll(() => canvas(page).evaluate((c: HTMLElement) => Math.abs(Number(c.dataset.atlasExponent) - Number(c.dataset.atlasTarget)))).toBeLessThan(.002);
}
async function scene(page: Page) {
  return page.evaluate(landmarks => {
    const w=window as any,T=w.THREE,rec=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;
    rec.scene.traverse((o:any)=>{if(o.userData.itemId==='ribosome')root=o;});
    const model=root.userData.model,ribo=model.userData.ribosome,camera=w.__riboCamera;
    const c=document.querySelector('[data-atlas-ready]') as HTMLElement,detail=c.dataset.atlasDetail||'',p=landmarks.find((v:any)=>v.id===detail);
    const aim=new T.Vector3().fromArray(c.dataset.atlasAim!.split(',').map(Number)),at=p?p.at.slice():null;
    if(at&&ribo.cutaway)at[1]+=p.part==='small'?-.16:p.part==='large'?.16:0;
    const expected=at?model.localToWorld(new T.Vector3().fromArray(at)):null;
    const bounds=new T.Box3().setFromObject(ribo.body),scale=root.scale.x,markers:any[]=[];
    rec.scene.traverse((o:any)=>{if(o.isMesh&&o.geometry.type==='TorusGeometry'&&o.material.depthTest===false)markers.push({visible:o.visible,scale:o.scale.toArray(),projected:o.position.clone().project(camera).toArray()});});
    return {type:rec.type,scale,declaredExtent:model.userData.extent,dimension:model.userData.dimension,measureCenter:model.userData.measureCenter,
      width:(bounds.max.x-bounds.min.x)/scale,aligned:camera.getWorldDirection(new T.Vector3()).dot(aim.clone().sub(camera.position).normalize()),targetError:expected?expected.distanceTo(aim):0,
      cutaway:ribo.cutaway,small:ribo.small.position.toArray(),large:ribo.large.position.toArray(),bound:[ribo.mrna,ribo.trnaA,ribo.trnaP,ribo.trnaE].map((g:any)=>g.position.toArray()),
      meshes:ribo.meshes.map((m:any)=>({geometry:m.geometry.uuid,material:m.material.uuid,kind:m.userData.ribosomeKind,part:m.userData.ribosomePart,visible:m.visible,triangles:m.geometry.index.count/3,
        clips:(m.material.clippingPlanes||[]).map((p:any)=>({normal:p.normal.toArray(),constant:p.constant}))})),
      stats:ribo.stats,detail:ribo.detailId,draws:rec.draws,renders:rec.renders,localClipping:w.__riboRenderer.localClippingEnabled,sliceActive:ribo.sliceActive,markers};
  },landmarks);
}
async function site(page: Page,n: number) {
  await expect(canvas(page)).toHaveAttribute('data-atlas-ribo-site',ids[n-1]);
  await expect(canvas(page)).toHaveAttribute('data-atlas-detail',ids[n-1]);
  await expect(slider(page)).toHaveValue(String(n));
  await expect.poll(async()=> (await scene(page)).aligned).toBeGreaterThan(.99999);
  await expect.poll(async()=> (await scene(page)).targetError).toBeLessThan(.0002);
}
async function capture(page:Page,name:string) {
  await canvas(page).scrollIntoViewIfNeeded();await page.locator('.sx-stage').screenshot({path:path.join(out,name+'-stage.png')});
  const pixels=await harness.glPixels(page);expect(pixels).not.toBeNull();expect(looksBlank(pixels!)).toBe(false);writeFileSync(path.join(out,name+'-gl.png'),pixels!.png);
}
async function pickActualRNA(page:Page,wanted:string) {
  await canvas(page).scrollIntoViewIfNeeded();
  const point=await page.evaluate(wanted=>{
    const w=window as any,T=w.THREE,rec=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;
    rec.scene.traverse((o:any)=>{if(o.userData.itemId==='ribosome')root=o;});
    const model=root.userData.model,camera=w.__riboCamera,ray=new T.Raycaster(),element=document.querySelector('[data-atlas-ready]')!,rect=element.getBoundingClientRect();
    const visible=(object:any)=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;};
    const hit=(x:number,y:number)=>{ray.setFromCamera(new T.Vector2((x-rect.x)/rect.width*2-1,1-(y-rect.y)/rect.height*2),camera);return ray.intersectObjects(model.children,true).find((h:any)=>h.object.isMesh&&visible(h.object));};
    const targets=model.userData.ribosome.meshes.filter((m:any)=>m.userData.ribosomeDetailId===wanted&&visible(m));
    for(const mesh of targets){const positions=mesh.geometry.attributes.position,indices=mesh.geometry.index,step=Math.max(3,Math.floor(indices.count/900/3)*3);
      for(let i=0;i+2<indices.count;i+=step){const centroid=new T.Vector3();for(let j=0;j<3;j++)centroid.add(new T.Vector3().fromBufferAttribute(positions,indices.getX(i+j)));
        const p=mesh.localToWorld(centroid.multiplyScalar(1/3)).project(camera);if(Math.abs(p.x)>.82||Math.abs(p.y)>.64||p.z>=1)continue;
        const x=Math.round(rect.x+(p.x+1)*rect.width/2),y=Math.round(rect.y+(1-p.y)*rect.height/2);let margin=true;
        for(let dx=-1;dx<=1&&margin;dx++)for(let dy=-1;dy<=1;dy++)if(document.elementFromPoint(x+dx,y+dy)!==element||hit(x+dx,y+dy)?.object.userData.ribosomeDetailId!==wanted){margin=false;break;}
        if(margin)return {x,y,wanted,marginPx:1};
      }
    }return null;
  },wanted);
  expect(point,'an exposed face of the actual experimental RNA trace').not.toBeNull();await page.mouse.click(point!.x,point!.y);return point;
}
test.beforeAll(async()=>{
  mkdirSync(out,{recursive:true});const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
  save('ribo-browser-source',{checkedAt:new Date().toISOString(),source:sha('stem_lab/stem_tool_scaleexplorer.js'),desktop:sha('desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js'),substitution:process.env.STEM_GL_SUBSTITUTE||null});await harness.start();
});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});

test('experimental RNA supports real picking, site navigation, subunit separation and fixed scale comparisons',async({page})=>{
  const log=await mount(page),initial=await scene(page);expect(initial.stats.residues).toBe(10596);expect(initial.stats.drawables).toBe(8);
  expect(initial.stats.triangles).toBeLessThan(190000);expect(initial.declaredExtent).toBe(1);expect(initial.dimension).toBe('x');expect(initial.measureCenter).toBe(0);
  expect(initial.cutaway).toBe(false);await capture(page,'ribo-desktop-assembled');
  await study(page).getByRole('button',{name:'Separate subunits',exact:true}).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-ribo-pose','separated');const separated=await scene(page);
  expect(separated.small).toEqual([0,-.16,0]);expect(separated.large).toEqual([0,.16,0]);expect(separated.bound).toEqual(initial.bound);
  expect(separated.scale).toBe(initial.scale);expect(separated.width).toBeCloseTo(initial.width,8);
  await study(page).getByRole('button',{name:'Explore the translation channel',exact:true}).click();await site(page,1);
  const clicked=await pickActualRNA(page,'trna-a');await site(page,2);
  const next=route(page).getByRole('button',{name:'Next site',exact:true});await next.focus();await next.press('Enter');await site(page,3);await expect(next).toBeFocused();
  await slider(page).fill('4');await site(page,4);await capture(page,'ribo-desktop-catalytic-region');const pocket=await scene(page);
  expect(pocket.localClipping).toBe(true);expect(pocket.sliceActive).toBe(true);expect(pocket.meshes.filter(m=>m.part==='large').every(m=>m.clips.length===1)).toBe(true);expect(pocket.meshes.filter(m=>m.part!=='large').every(m=>m.clips.length===0)).toBe(true);
  await study(page).getByRole('button',{name:'Separate subunits',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-ribo-pose','assembled');await site(page,4);
  expect((await scene(page)).meshes.every(m=>m.clips.length===0)).toBe(true);
  await study(page).getByRole('button',{name:'Separate subunits',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-ribo-slice','active');await site(page,4);
  await study(page).getByRole('button',{name:'Show ribosomal proteins',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-ribo-proteins','hidden');
  const rnaOnly=await scene(page);expect(rnaOnly.meshes.filter(m=>m.kind==='protein').every(m=>!m.visible)).toBe(true);expect(rnaOnly.meshes.filter(m=>m.kind==='rna').every(m=>m.visible)).toBe(true);
  expect(rnaOnly.scale).toBe(initial.scale);expect(rnaOnly.meshes.map(m=>m.geometry)).toEqual(initial.meshes.map(m=>m.geometry));expect(rnaOnly.meshes.map(m=>m.material)).toEqual(initial.meshes.map(m=>m.material));
  await slider(page).fill('5');await site(page,5);await capture(page,'ribo-desktop-exit');
  await route(page).getByRole('button',{name:'Whole ribosome',exact:true}).click();await expect(route(page)).toHaveCount(0);await expect(canvas(page)).toHaveAttribute('data-atlas-ribo-pose','assembled');
  const restored=await scene(page);expect(restored.small).toEqual([0,0,0]);expect(restored.large).toEqual([0,0,0]);expect(restored.meshes.every(m=>m.clips.length===0)).toBe(true);
  const panel=page.locator('.sx-comparison-workbench');if(await panel.getAttribute('open')===null)await panel.locator(':scope > summary').click();
  await panel.getByRole('combobox',{name:'First thing',exact:true}).selectOption('ribosome');await panel.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('virus');await panel.getByRole('button',{name:'Compare them',exact:true}).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-comparison','ribosome:virus');const compared=await scene(page);expect(compared.cutaway).toBe(false);expect(compared.meshes.every(m=>m.clips.length===0)).toBe(true);
  const ratio=await page.evaluate(()=>{const rec=(window as any).__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()),scales:any={};rec.scene.traverse((o:any)=>{if(o.userData.itemId&&o.visible)scales[o.userData.itemId]=o.scale.x;});return scales.virus/scales.ribosome;});expect(ratio).toBeCloseTo(4,8);
  save('ribo-desktop',{initial,separated,clicked,pocket,rnaOnly,restored,compared,...log});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});

test('320 pixel WebGL 1 view supports touch, native slider keys, route bounds and Escape focus',async({page})=>{
  const log=await mount(page,true),initial=await scene(page);expect(initial.type).toBe('webgl');
  const start=study(page).getByRole('button',{name:'Explore the translation channel',exact:true});await start.scrollIntoViewIfNeeded();
  const box=await start.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.width).toBeGreaterThanOrEqual(44);await start.tap();await site(page,1);
  await slider(page).focus();await slider(page).press('ArrowRight');await site(page,2);await slider(page).press('End');await site(page,5);
  await expect(route(page).getByRole('button',{name:'Next site',exact:true})).toBeDisabled();await slider(page).press('Home');await site(page,1);
  await expect(route(page).getByRole('button',{name:'Previous site',exact:true})).toBeDisabled();await slider(page).press('End');await site(page,5);
  for(const label of ['Previous site','Next site','Whole ribosome'])expect((await route(page).getByRole('button',{name:label,exact:true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect((await slider(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await slider(page).fill('4');await site(page,4);await capture(page,'ribo-phone-catalytic-region');
  await slider(page).press('Escape');await expect(route(page)).toHaveCount(0);await expect(start).toBeFocused();await expect(canvas(page)).toHaveAttribute('data-atlas-ribo-pose','assembled');await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','1.00');
  expect((await scene(page)).scale).toBe(initial.scale);save('ribo-phone',{initial,...log});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});

test('field notebook restores an exact translation site and the bacterial portal preserves its return route',async({page})=>{
  const log=await mount(page),book=page.getByRole('region',{name:'Field notebook',exact:true});
  await study(page).getByRole('button',{name:'Explore the translation channel',exact:true}).click();await slider(page).fill('3');await site(page,3);
  const zoom=Number(await canvas(page).getAttribute('data-atlas-zoom'));
  await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('The P-site RNA links the two subunits.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
  const saved=await page.evaluate(()=>(window as any).__toolData._scaleExplorer.observations[0]);expect(saved).toMatchObject({itemId:'ribosome',detailId:'trna-p',size:2.5e-8,zoom,cutaway:true,note:'The P-site RNA links the two subunits.'});
  await fly(page,'ecoli');await page.locator('.sx-details').getByRole('button',{name:/Ribosomes in the cytoplasm/}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','ribosomes');
  await page.getByRole('region',{name:'Continue the journey',exact:true}).getByRole('button',{name:/^Explore/}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-objects','ribosome');
  await page.getByRole('navigation',{name:'Your exploration route',exact:true}).getByRole('button',{name:/^Return to/}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-objects','ecoli');await expect(canvas(page)).toHaveAttribute('data-atlas-detail','ribosomes');
  await book.locator('[data-observation="ribosome:trna-p"]').getByRole('button',{name:/^Return to/}).click();await site(page,3);
  await expect(canvas(page)).toHaveAttribute('data-atlas-zoom',zoom.toFixed(2));await expect(canvas(page)).toHaveAttribute('data-atlas-ribo-pose','separated');await expect(book.getByRole('textbox')).toHaveValue('The P-site RNA links the two subunits.');
  await expect(page.locator('.sx-details').getByRole('link',{name:'Read the science source',exact:true})).toHaveAttribute('href','https://www.rcsb.org/structure/4V5D');
  await page.getByRole('button',{name:'Reset camera',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','');await expect(route(page)).toHaveCount(0);
  save('ribo-notebook-portal',{saved,...log});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});
