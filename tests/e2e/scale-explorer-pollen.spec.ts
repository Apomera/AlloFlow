import { test, expect, type Page } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { showScaleExplorerTools } from './helpers/scale_explorer_workspace';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 180000 });
test.use({ video: 'off', trace: 'off', hasTouch: true });
const out = path.resolve(process.env.SCALE_POLLEN_REPORT_DIR || 'reports/scale-explorer-pollen');
const canvas = (p: Page) => p.locator('[data-atlas-ready]');
const route = (p: Page) => p.getByRole('region', { name: 'Pollen navigation', exact: true });
const study = (p: Page) => p.getByRole('region', { name: 'Pollen observatory', exact: true });
const slider = (p: Page) => route(p).getByRole('slider', { name: 'Botanical landmark', exact: true });
const growth = (p: Page) => route(p).getByRole('slider', { name: 'Illustrated tube extension', exact: true });
const ids = ['exine', 'colpus-1', 'colpus-2', 'colpus-3', 'intine', 'vegetative-nucleus', 'generative-cell', 'pollen-tube'];
const replacement = (process.env.STEM_GL_SUBSTITUTE || '').split(';').find(p => p.startsWith('stem_lab/stem_tool_scaleexplorer.js='));
const sourceFile = replacement ? replacement.slice(replacement.indexOf('=') + 1) : 'stem_lab/stem_tool_scaleexplorer.js';
const sandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {} } } as any;
vm.runInNewContext(readFileSync(sourceFile, 'utf8').replace("  window.StemLab.registerTool('scaleExplorer', {", "  window.__pollenPath=POLLEN_TUBE_PATH;window.__pollenSites=POLLEN_SITES;\n  window.StemLab.registerTool('scaleExplorer', {"), sandbox);
const metadata = JSON.parse(JSON.stringify({path:sandbox.window.__pollenPath,sites:sandbox.window.__pollenSites}));
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_scaleexplorer.js', toolId: 'scaleExplorer', width: 1400, height: 1100,
  layout: 'document', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['vendor/three-r128/GLTFLoader.js'],
  probes: `const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__pollenCamera=c;return render.apply(this,arguments);};return r;}});`
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
  await fly(page, 'pollen');
  return { errors, external };
}
async function fly(page: Page, id: string) {
  await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).selectOption(id);
  await expect(canvas(page)).toHaveAttribute('data-atlas-objects', id);
  await expect.poll(() => canvas(page).evaluate((c: HTMLElement) => Math.abs(Number(c.dataset.atlasExponent) - Number(c.dataset.atlasTarget)))).toBeLessThan(.002);
}
async function scene(page: Page) {
  return page.evaluate(metadata => {
    const w=window as any,T=w.THREE,rec=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;
    rec.scene.traverse((o:any)=>{if(o.userData.itemId==='pollen')root=o;});
    const model=root.userData.model,pollen=model.userData.pollen,camera=w.__pollenCamera;
    const c=document.querySelector('[data-atlas-ready]') as HTMLElement,detail=c.dataset.atlasDetail||'',point=metadata.sites.find((v:any)=>v.id===detail);
    const aim=new T.Vector3().fromArray(c.dataset.atlasAim!.split(',').map(Number));
    const t=pollen.growth,u=1-t,tip=metadata.path[0].map((_:number,k:number)=>u*u*u*metadata.path[0][k]+3*u*u*t*metadata.path[1][k]+3*u*t*t*metadata.path[2][k]+t*t*t*metadata.path[3][k]);
    const expected=point?model.localToWorld(new T.Vector3().fromArray(detail==='pollen-tube'?tip:point.at)):null;
    const bounds=new T.Box3();for(const g of [pollen.back,pollen.cover,pollen.inside,pollen.cutEdge])bounds.union(new T.Box3().setFromObject(g));
    return {type:rec.type,scale:root.scale.x,declaredExtent:model.userData.extent,dimension:model.userData.dimension,measureCenter:model.userData.measureCenter,
      grainWidth:(bounds.max.x-bounds.min.x)/root.scale.x,aligned:camera.getWorldDirection(new T.Vector3()).dot(aim.clone().sub(camera.position).normalize()),targetError:expected?expected.distanceTo(aim):0,
      aim:aim.toArray(),cutaway:pollen.cutaway,cover:pollen.cover.visible,inside:pollen.inside.visible,cutEdge:pollen.cutEdge.visible,tube:pollen.tube.visible,growth:t,
      actualTip:pollen.apex.position.toArray(),expectedTip:tip,drawRange:pollen.extension.geometry.drawRange.count,
      meshes:pollen.meshes.map((m:any)=>({geometry:m.geometry.uuid,material:m.material.uuid,detail:m.userData.pollenDetailId})),stats:pollen.stats,detail:pollen.detailId,draws:rec.draws,renders:rec.renders};
  },metadata);
}
async function site(page: Page,n: number) {
  await expect(canvas(page)).toHaveAttribute('data-atlas-pollen-site',ids[n-1]);
  await expect(canvas(page)).toHaveAttribute('data-atlas-detail',ids[n-1]);
  await expect(slider(page)).toHaveValue(String(n));
  await expect.poll(async()=> (await scene(page)).aligned).toBeGreaterThan(.99999);
  await expect.poll(async()=> (await scene(page)).targetError).toBeLessThan(.0002);
}
async function capture(page:Page,name:string) {
  await canvas(page).scrollIntoViewIfNeeded();await page.locator('.sx-stage').screenshot({path:path.join(out,name+'-stage.png')});
  const pixels=await harness.glPixels(page);expect(pixels).not.toBeNull();expect(looksBlank(pixels!)).toBe(false);writeFileSync(path.join(out,name+'-gl.png'),pixels!.png);
}
async function pickActual(page:Page,wanted:string) {
  await canvas(page).scrollIntoViewIfNeeded();
  const point=await page.evaluate(wanted=>{
    const w=window as any,T=w.THREE,rec=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;
    rec.scene.traverse((o:any)=>{if(o.userData.itemId==='pollen')root=o;});
    const model=root.userData.model,camera=w.__pollenCamera,ray=new T.Raycaster(),element=document.querySelector('[data-atlas-ready]')!,rect=element.getBoundingClientRect();
    const visible=(object:any)=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;};
    const hit=(x:number,y:number)=>{ray.setFromCamera(new T.Vector2((x-rect.x)/rect.width*2-1,1-(y-rect.y)/rect.height*2),camera);return ray.intersectObjects(model.children,true).find((h:any)=>h.object.isMesh&&visible(h.object));};
    const targets=model.userData.pollen.meshes.filter((m:any)=>m.userData.pollenDetailId===wanted&&visible(m));
    for(const mesh of targets){const positions=mesh.geometry.attributes.position,indices=mesh.geometry.index,count=indices?indices.count:positions.count,step=Math.max(3,Math.floor(count/900/3)*3);
      for(let i=0;i+2<count;i+=step){const centroid=new T.Vector3();for(let j=0;j<3;j++)centroid.add(new T.Vector3().fromBufferAttribute(positions,indices?indices.getX(i+j):i+j));
        const p=mesh.localToWorld(centroid.multiplyScalar(1/3)).project(camera);if(Math.abs(p.x)>.82||Math.abs(p.y)>.64||p.z>=1)continue;
        const x=Math.round(rect.x+(p.x+1)*rect.width/2),y=Math.round(rect.y+(1-p.y)*rect.height/2);let margin=true;
        for(let dx=-1;dx<=1&&margin;dx++)for(let dy=-1;dy<=1;dy++)if(document.elementFromPoint(x+dx,y+dy)!==element||hit(x+dx,y+dy)?.object.userData.pollenDetailId!==wanted){margin=false;break;}
        if(margin)return {x,y,wanted,marginPx:1};
      }
    }return null;
  },wanted);
  expect(point,'an exposed face of the actual pollen structure').not.toBeNull();await page.mouse.click(point!.x,point!.y);return point;
}

test.beforeAll(async()=>{
  mkdirSync(out,{recursive:true});const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
  save('pollen-browser-source',{checkedAt:new Date().toISOString(),source:sha('stem_lab/stem_tool_scaleexplorer.js'),desktop:sha('desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js'),substitution:process.env.STEM_GL_SUBSTITUTE||null});await harness.start();
});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});

test('native pollen anatomy supports picking, eight viewpoints, tube extension and fixed grain comparisons',async({page})=>{
  const log=await mount(page),initial=await scene(page);expect(initial.stats.apertures).toBe(3);expect(initial.stats.reticulumCells).toBeGreaterThan(100);
  expect(initial.stats.triangles).toBeLessThan(250000);expect(initial.declaredExtent).toBe(1);expect(initial.dimension).toBe('x');expect(initial.measureCenter).toBe(0);
  expect(initial.cutaway).toBe(false);expect(initial.growth).toBe(0);await capture(page,'pollen-desktop-whole');
  await study(page).getByRole('button',{name:'Explore the pollen grain',exact:true}).click();await site(page,1);
  const clicked=await pickActual(page,'colpus-1');await site(page,2);
  const next=route(page).getByRole('button',{name:'Next structure',exact:true});await next.focus();await next.press('Enter');await site(page,3);await expect(next).toBeFocused();const second=await scene(page);
  await slider(page).fill('4');await site(page,4);const third=await scene(page);expect(second.aim).not.toEqual(third.aim);
  await slider(page).fill('5');await site(page,5);const open=await scene(page);expect(open.cover).toBe(false);expect(open.inside).toBe(true);expect(open.cutEdge).toBe(true);
  expect(open.scale).toBe(initial.scale);await capture(page,'pollen-desktop-intine');
  await slider(page).fill('6');await site(page,6);await capture(page,'pollen-desktop-nucleus');
  await slider(page).fill('7');await site(page,7);await capture(page,'pollen-desktop-generative-cell');
  await slider(page).fill('8');await site(page,8);expect((await scene(page)).growth).toBe(.25);
  await growth(page).fill('73');await expect(canvas(page)).toHaveAttribute('data-atlas-pollen-growth','0.730');await site(page,8);const extending=await scene(page);
  for(let k=0;k<3;k++)expect(extending.actualTip[k]).toBeCloseTo(extending.expectedTip[k],12);expect(extending.drawRange).toBe(Math.ceil(.73*96)*12*6);
  expect(extending.scale).toBe(initial.scale);expect(extending.meshes).toEqual(initial.meshes);await capture(page,'pollen-desktop-tube');
  await route(page).getByRole('button',{name:'Whole pollen grain',exact:true}).click();await expect(route(page)).toHaveCount(0);await expect(canvas(page)).toHaveAttribute('data-atlas-pollen-wall','closed');
  const restored=await scene(page);expect(restored.growth).toBe(0);expect(restored.tube).toBe(false);expect(restored.grainWidth).toBeCloseTo(initial.grainWidth,8);
  const panel=page.locator('.sx-comparison-workbench');if(await panel.getAttribute('open')===null)await panel.locator(':scope > summary').click();
  await panel.getByRole('combobox',{name:'First thing',exact:true}).selectOption('pollen');await panel.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('rbc');await panel.getByRole('button',{name:'Compare them',exact:true}).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-comparison','pollen:rbc');const compared=await scene(page);expect(compared.cutaway).toBe(false);expect(compared.tube).toBe(false);expect(compared.drawRange).toBe(0);
  const ratio=await page.evaluate(()=>{const rec=(window as any).__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()),scales:any={};rec.scene.traverse((o:any)=>{if(o.userData.itemId&&o.visible)scales[o.userData.itemId]=o.scale.x;});return scales.pollen/scales.rbc;});expect(ratio).toBeCloseTo(25/7.5,8);
  save('pollen-desktop',{initial,clicked,second,third,open,extending,restored,compared,...log});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});

test('320 pixel WebGL 1 view supports touch, native anatomy and growth sliders, and Escape focus',async({page})=>{
  const log=await mount(page,true),initial=await scene(page);expect(initial.type).toBe('webgl');
  const start=study(page).getByRole('button',{name:'Explore the pollen grain',exact:true});await start.scrollIntoViewIfNeeded();
  const box=await start.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.width).toBeGreaterThanOrEqual(44);await start.tap();await site(page,1);
  await slider(page).focus();await slider(page).press('ArrowRight');await site(page,2);await slider(page).press('End');await site(page,8);
  await expect(route(page).getByRole('button',{name:'Next structure',exact:true})).toBeDisabled();await slider(page).press('Home');await site(page,1);
  await expect(route(page).getByRole('button',{name:'Previous structure',exact:true})).toBeDisabled();await slider(page).press('End');await site(page,8);
  for(const label of ['Previous structure','Next structure','Whole pollen grain'])expect((await route(page).getByRole('button',{name:label,exact:true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect((await slider(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);expect((await growth(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await growth(page).focus();await growth(page).press('Home');await expect(canvas(page)).toHaveAttribute('data-atlas-pollen-growth','0.000');expect((await scene(page)).tube).toBe(false);
  await growth(page).press('End');await expect(canvas(page)).toHaveAttribute('data-atlas-pollen-growth','1.000');await site(page,8);await growth(page).press('ArrowLeft');await expect(canvas(page)).toHaveAttribute('data-atlas-pollen-growth','0.990');await site(page,8);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await capture(page,'pollen-phone-tube');
  await growth(page).press('Escape');await expect(route(page)).toHaveCount(0);await expect(start).toBeFocused();await expect(canvas(page)).toHaveAttribute('data-atlas-pollen-wall','closed');await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','1.00');
  expect((await scene(page)).scale).toBe(initial.scale);save('pollen-phone',{initial,...log});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});

test('field notebook restores the exact botanical structure, opening and chosen extension',async({page})=>{
  const log=await mount(page),book=page.getByRole('region',{name:'Field notebook',exact:true});
  await study(page).getByRole('button',{name:'Follow the pollen tube',exact:true}).click();await site(page,8);await growth(page).fill('73');await site(page,8);
  const zoom=Number(await canvas(page).getAttribute('data-atlas-zoom'));
  await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('A tube emerges from an aperture.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
  const saved=await page.evaluate(()=>(window as any).__toolData._scaleExplorer.observations[0]);expect(saved).toMatchObject({itemId:'pollen',detailId:'pollen-tube',size:2.5e-5,zoom,cutaway:false,pollenGrowth:.73,note:'A tube emerges from an aperture.'});
  await fly(page,'earth');await book.locator('[data-observation="pollen:pollen-tube"]').getByRole('button',{name:/^Return to/}).click();await site(page,8);
  await expect(canvas(page)).toHaveAttribute('data-atlas-zoom',zoom.toFixed(2));await expect(canvas(page)).toHaveAttribute('data-atlas-pollen-growth','0.730');await expect(book.getByRole('textbox')).toHaveValue('A tube emerges from an aperture.');const restored=await scene(page);
  for(let k=0;k<3;k++)expect(restored.actualTip[k]).toBeCloseTo(restored.expectedTip[k],12);
  await slider(page).fill('7');await site(page,7);await book.getByRole('textbox').fill('The generative cell sits inside the vegetative cell.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
  await route(page).getByRole('button',{name:'Whole pollen grain',exact:true}).click();await book.locator('[data-observation="pollen:generative-cell"]').getByRole('button',{name:/^Return to/}).click();await site(page,7);await expect(canvas(page)).toHaveAttribute('data-atlas-pollen-wall','open');await expect(canvas(page)).toHaveAttribute('data-atlas-pollen-growth','0.730');
  await expect(page.locator('.sx-details').getByRole('link',{name:'Read the science source',exact:true})).toHaveAttribute('href','https://pmc.ncbi.nlm.nih.gov/articles/PMC4367165/');
  await page.getByRole('button',{name:'Reset camera',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','');await expect(route(page)).toHaveCount(0);
  save('pollen-notebook',{saved,restored,...log});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});
