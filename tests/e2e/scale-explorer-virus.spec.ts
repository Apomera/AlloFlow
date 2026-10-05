import { test, expect, type Page } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { showScaleExplorerTools } from './helpers/scale_explorer_workspace';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 180000 });
test.use({ video: 'off', trace: 'off', hasTouch: true });
const out = path.resolve(process.env.SCALE_VIRUS_REPORT_DIR || 'reports/scale-explorer-virus');
const canvas = (p: Page) => p.locator('[data-atlas-ready]');
const route = (p: Page) => p.getByRole('region', { name: 'Virus navigation', exact: true });
const study = (p: Page) => p.getByRole('region', { name: 'Influenza observatory', exact: true });
const slider = (p: Page) => route(p).getByRole('slider', { name: 'Virion landmark', exact: true });
const ids = ['ha','na','lipid-envelope','m2-channel','m1-matrix',...Array.from({length:8},(_,i)=>'rnp-'+(i+1)),'polymerase'];
const replacement = (process.env.STEM_GL_SUBSTITUTE || '').split(';').find(p => p.startsWith('stem_lab/stem_tool_scaleexplorer.js='));
const sourceFile = replacement ? replacement.slice(replacement.indexOf('=') + 1) : 'stem_lab/stem_tool_scaleexplorer.js';
const sandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {} } } as any;
vm.runInNewContext(readFileSync(sourceFile, 'utf8').replace("  window.StemLab.registerTool('scaleExplorer', {", "  window.__virusSites=VIRUS_SITES;\n  window.StemLab.registerTool('scaleExplorer', {"), sandbox);
const metadata = JSON.parse(JSON.stringify({sites:sandbox.window.__virusSites}));
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_scaleexplorer.js', toolId: 'scaleExplorer', width: 1400, height: 1100,
  layout: 'document', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['vendor/three-r128/GLTFLoader.js'],
  probes: `const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__virusCamera=c;return render.apply(this,arguments);};return r;}});`
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
  await fly(page, 'virus');
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
    rec.scene.traverse((o:any)=>{if(o.userData.itemId==='virus')root=o;});
    const model=root.userData.model,virus=model.userData.virus,camera=w.__virusCamera;
    const c=document.querySelector('[data-atlas-ready]') as HTMLElement,detail=c.dataset.atlasDetail||'',point=metadata.sites.find((v:any)=>v.id===detail);
    const aim=new T.Vector3().fromArray(c.dataset.atlasAim!.split(',').map(Number)),expected=point?model.localToWorld(new T.Vector3().fromArray(point.at)):null;
    const bounds=new T.Box3().setFromObject(virus.body);
    return {type:rec.type,scale:root.scale.x,declaredExtent:model.userData.extent,dimension:model.userData.dimension,measureCenter:model.userData.measureCenter,
      width:(bounds.max.x-bounds.min.x)/root.scale.x,aligned:camera.getWorldDirection(new T.Vector3()).dot(aim.clone().sub(camera.position).normalize()),targetError:expected?expected.distanceTo(aim):0,
      aim:aim.toArray(),cutaway:virus.cutaway,cover:virus.cover.visible,inside:virus.inside.visible,cutEdge:virus.cutEdge.visible,
      rnps:virus.rnps.map((g:any)=>g.position.toArray()),rnpMaterials:virus.rnps.map((g:any)=>g.children.map((m:any)=>({opacity:m.material.opacity,transparent:m.material.transparent,depthWrite:m.material.depthWrite}))),meshes:virus.meshes.map((m:any)=>({geometry:m.geometry.uuid,material:m.material.uuid,detail:m.userData.virusDetailId})),stats:virus.stats,detail:virus.detailId,draws:rec.draws,renders:rec.renders};
  },metadata);
}
async function site(page: Page,n: number) {
  await expect(canvas(page)).toHaveAttribute('data-atlas-virus-site',ids[n-1]);
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
    rec.scene.traverse((o:any)=>{if(o.userData.itemId==='virus')root=o;});
    const model=root.userData.model,camera=w.__virusCamera,ray=new T.Raycaster(),element=document.querySelector('[data-atlas-ready]')!,rect=element.getBoundingClientRect();
    const visible=(object:any)=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;};
    const hit=(x:number,y:number)=>{ray.setFromCamera(new T.Vector2((x-rect.x)/rect.width*2-1,1-(y-rect.y)/rect.height*2),camera);return ray.intersectObjects(model.children,true).find((h:any)=>h.object.isMesh&&visible(h.object));};
    const targets=model.userData.virus.meshes.filter((m:any)=>m.userData.virusDetailId===wanted&&visible(m));
    for(const mesh of targets){const positions=mesh.geometry.attributes.position,indices=mesh.geometry.index,count=indices?indices.count:positions.count,step=Math.max(3,Math.floor(count/900/3)*3);
      for(let i=0;i+2<count;i+=step){const centroid=new T.Vector3();for(let j=0;j<3;j++)centroid.add(new T.Vector3().fromBufferAttribute(positions,indices?indices.getX(i+j):i+j));
        const p=mesh.localToWorld(centroid.multiplyScalar(1/3)).project(camera);if(Math.abs(p.x)>.82||Math.abs(p.y)>.64||p.z>=1)continue;
        const x=Math.round(rect.x+(p.x+1)*rect.width/2),y=Math.round(rect.y+(1-p.y)*rect.height/2);let margin=true;
        for(let dx=-1;dx<=1&&margin;dx++)for(let dy=-1;dy<=1;dy++)if(document.elementFromPoint(x+dx,y+dy)!==element||hit(x+dx,y+dy)?.object.userData.virusDetailId!==wanted){margin=false;break;}
        if(margin)return {x,y,wanted,marginPx:1};
      }
    }return null;
  },wanted);
  expect(point,'an exposed face of the actual virus structure').not.toBeNull();await page.mouse.click(point!.x,point!.y);return point;
}

test.beforeAll(async()=>{
  mkdirSync(out,{recursive:true});const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
  save('virus-browser-source',{checkedAt:new Date().toISOString(),source:sha('stem_lab/stem_tool_scaleexplorer.js'),desktop:sha('desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js'),substitution:process.env.STEM_GL_SUBSTITUTE||null});await harness.start();
});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});


test('surface proteins, eight genome bundles and the envelope section support native picking and a fixed comparison scale',async({page})=>{
  const log=await mount(page),initial=await scene(page);expect(initial.stats).toMatchObject({rnpBundles:8,haSubunits:3,naSubunits:4,m2Helices:4});expect(initial.rnps).toHaveLength(8);
  expect(initial.stats.triangles).toBeLessThan(300000);expect(initial.declaredExtent).toBe(1);expect(initial.dimension).toBe('x');expect(initial.measureCenter).toBe(0);expect(initial.cutaway).toBe(false);await capture(page,'virus-desktop-whole');
  const clicked=await pickActual(page,'ha');await site(page,1);await capture(page,'virus-desktop-ha');
  const next=route(page).getByRole('button',{name:'Next structure',exact:true});await next.focus();await next.press('Enter');await site(page,2);await expect(next).toBeFocused();const pickedNA=await pickActual(page,'na');await site(page,2);await capture(page,'virus-desktop-na');
  await slider(page).fill('3');await site(page,3);await slider(page).fill('4');await site(page,4);await capture(page,'virus-desktop-m2');
  await slider(page).fill('5');await site(page,5);const section=await scene(page);expect(section.cover).toBe(false);expect(section.inside).toBe(true);expect(section.cutEdge).toBe(true);expect(section.scale).toBe(initial.scale);await capture(page,'virus-desktop-matrix');
  const views=[];for(let n=6;n<=13;n++){await slider(page).fill(String(n));await site(page,n);const view=await scene(page);for(let i=0;i<8;i++)expect(view.rnpMaterials[i].every((m:any)=>m.opacity===(i===n-6?1:.18)&&m.transparent===(i!==n-6)&&m.depthWrite===(i===n-6))).toBe(true);views.push(view);}
  expect(new Set(views.map(v=>v.aim.join(','))).size).toBe(8);await capture(page,'virus-desktop-central-rna');
  const selected=await scene(page);expect(selected.meshes).toEqual(initial.meshes);expect(selected.rnps).toEqual(initial.rnps);expect(selected.width).toBeCloseTo(initial.width,8);
  await slider(page).fill('14');await site(page,14);await capture(page,'virus-desktop-polymerase');
  await route(page).getByRole('button',{name:'Whole particle',exact:true}).click();await expect(route(page)).toHaveCount(0);await expect(canvas(page)).toHaveAttribute('data-atlas-virus-wall','closed');const restored=await scene(page);expect(restored.cover).toBe(true);expect(restored.inside).toBe(false);expect(restored.width).toBeCloseTo(initial.width,8);
  const panel=page.locator('.sx-comparison-workbench');if(await panel.getAttribute('open')===null)await panel.locator(':scope > summary').click();
  await panel.getByRole('combobox',{name:'First thing',exact:true}).selectOption('virus');await panel.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('ribosome');await panel.getByRole('button',{name:'Compare them',exact:true}).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-comparison','virus:ribosome');const compared=await scene(page);expect(compared.cutaway).toBe(false);expect(compared.cover).toBe(true);expect(compared.inside).toBe(false);expect(compared.rnpMaterials.every((r:any)=>r.every((m:any)=>m.opacity===1&&!m.transparent&&m.depthWrite))).toBe(true);
  const ratio=await page.evaluate(()=>{const rec=(window as any).__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()),scales:any={};rec.scene.traverse((o:any)=>{if(o.userData.itemId&&o.visible)scales[o.userData.itemId]=o.scale.x;});return scales.virus/scales.ribosome;});expect(ratio).toBeCloseTo(4,8);
  save('virus-desktop',{initial,clicked,pickedNA,section,views,selected,restored,compared,...log});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});

test('320 pixel WebGL 1 view supports touch, fourteen native route stops, genome choices and Escape focus',async({page})=>{
  const log=await mount(page,true),initial=await scene(page);expect(initial.type).toBe('webgl');
  const start=study(page).getByRole('button',{name:'Explore the particle',exact:true});await start.scrollIntoViewIfNeeded();const box=await start.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.width).toBeGreaterThanOrEqual(44);await start.tap();await site(page,1);
  await slider(page).focus();await slider(page).press('ArrowRight');await site(page,2);await slider(page).press('End');await site(page,14);await expect(route(page).getByRole('button',{name:'Next structure',exact:true})).toBeDisabled();await slider(page).press('Home');await site(page,1);await expect(route(page).getByRole('button',{name:'Previous structure',exact:true})).toBeDisabled();
  await slider(page).fill('6');await site(page,6);const central=route(page).getByRole('button',{name:'Inspect RNA bundle 8',exact:true});expect((await central.boundingBox())!.height).toBeGreaterThanOrEqual(44);await central.tap();await site(page,13);await expect(central).toHaveAttribute('aria-pressed','true');
  for(const label of ['Previous structure','Next structure','Whole particle'])expect((await route(page).getByRole('button',{name:label,exact:true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);expect((await slider(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await capture(page,'virus-phone-central-rna');
  await slider(page).focus();await slider(page).press('Escape');await expect(route(page)).toHaveCount(0);await expect(start).toBeFocused();await expect(canvas(page)).toHaveAttribute('data-atlas-virus-wall','closed');await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','1.00');expect((await scene(page)).scale).toBe(initial.scale);
  save('virus-phone',{initial,...log});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});

test('field notebook restores the exact RNA bundle, section opening and inspection zoom',async({page})=>{
  const log=await mount(page),book=page.getByRole('region',{name:'Field notebook',exact:true});await study(page).getByRole('button',{name:'Follow the RNA bundles',exact:true}).click();await site(page,6);await route(page).getByRole('button',{name:'Inspect RNA bundle 8',exact:true}).click();await site(page,13);
  const zoom=Number(await canvas(page).getAttribute('data-atlas-zoom'));await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('A central bundle sits among seven others.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
  const saved=await page.evaluate(()=>(window as any).__toolData._scaleExplorer.observations[0]);expect(saved).toMatchObject({itemId:'virus',detailId:'rnp-8',size:1e-7,zoom,cutaway:true,note:'A central bundle sits among seven others.'});
  await fly(page,'earth');await book.locator('[data-observation="virus:rnp-8"]').getByRole('button',{name:/^Return to/}).click();await site(page,13);await expect(canvas(page)).toHaveAttribute('data-atlas-zoom',zoom.toFixed(2));await expect(canvas(page)).toHaveAttribute('data-atlas-virus-wall','open');await expect(book.getByRole('textbox')).toHaveValue('A central bundle sits among seven others.');
  await expect(page.locator('.sx-details').getByRole('link',{name:'Read the science source',exact:true})).toHaveAttribute('href','https://pmc.ncbi.nlm.nih.gov/articles/PMC12550032/');await page.getByRole('button',{name:'Reset camera',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','');await expect(route(page)).toHaveCount(0);
  save('virus-notebook',{saved,...log});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});
