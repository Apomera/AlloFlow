import { test, expect, type Page } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { showScaleExplorerTools } from './helpers/scale_explorer_workspace';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 180000 });
test.use({ video: 'off', trace: 'off', hasTouch: true });
const out = path.resolve(process.env.SCALE_WHALE_REPORT_DIR || 'reports/scale-explorer-whale');
const canvas = (p: Page) => p.locator('[data-atlas-ready]');
const route = (p: Page) => p.getByRole('region', { name: 'Whale navigation', exact: true });
const study = (p: Page) => p.getByRole('region', { name: 'Blue whale observatory', exact: true });
const slider = (p: Page) => route(p).getByRole('slider', { name: 'Whale landmark', exact: true });
const ids = ['rostrum','blowholes','eye','flipper','pleats','baleen','dorsal-fin','peduncle','flukes'];
const replacement = (process.env.STEM_GL_SUBSTITUTE || '').split(';').find(p => p.startsWith('stem_lab/stem_tool_scaleexplorer.js='));
const sourceFile = replacement ? replacement.slice(replacement.indexOf('=') + 1) : 'stem_lab/stem_tool_scaleexplorer.js';
const sandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {} } } as any;
vm.runInNewContext(readFileSync(sourceFile, 'utf8').replace("  window.StemLab.registerTool('scaleExplorer', {", "  window.__whaleSites=WHALE_SITES;\n  window.StemLab.registerTool('scaleExplorer', {"), sandbox);
const metadata = JSON.parse(JSON.stringify({sites:sandbox.window.__whaleSites}));
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_scaleexplorer.js', toolId: 'scaleExplorer', width: 1400, height: 1100,
  layout: 'document', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['vendor/three-r128/GLTFLoader.js'],
  probes: `const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__whaleCamera=c;return render.apply(this,arguments);};return r;}});`
});
function save(name: string, value: unknown) { writeFileSync(path.join(out, name + '.json'), JSON.stringify(value, null, 2) + '\n'); }
async function mount(page: Page, phone = false, scrub = false) {
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/*', request => {
    const url = request.request().url();
    if (/^https?:/.test(url) && !/^http:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(url)) { external.push(url); return request.abort(); }
    return request.continue();
  });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) { return type === 'webgl2' ? null : original.apply(this, [type, ...args] as any); };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: phone ? 320 : 1400, height: phone ? 780 : 1100 });
  await harness.mount(page, { _scaleExplorer: { ambient: false } }, '!!document.querySelector("[data-atlas-ready]")');
  await showScaleExplorerTools(page);
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  if(scrub){await page.getByRole('slider',{name:'Scale position, in powers of ten',exact:true}).fill('1.4');await expect(canvas(page)).toHaveAttribute('data-atlas-objects','blue-whale');await canvas(page).scrollIntoViewIfNeeded();await expect(canvas(page)).toHaveAttribute('data-atlas-whale-mouth','closed');}
  else await fly(page, 'blue-whale');
  return { errors, external };
}
async function fly(page: Page, id: string) {
  await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).selectOption(id);
  await expect(canvas(page)).toHaveAttribute('data-atlas-objects', id);
  await expect.poll(() => canvas(page).evaluate((c: HTMLElement) => Math.abs(Number(c.dataset.atlasExponent) - Number(c.dataset.atlasTarget)))).toBeLessThan(.002);
}
async function scene(page: Page) {
  return page.evaluate(metadata => {
    const w=window as any,T=w.THREE,rec=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()); let root:any;
    rec.scene.traverse((o:any)=>{if(o.userData.itemId==='blue-whale')root=o;});
    const model=root.userData.model,whale=model.userData.whale,camera=w.__whaleCamera;
    const c=document.querySelector('[data-atlas-ready]') as HTMLElement,detail=c.dataset.atlasDetail||'',point=metadata.sites.find((v:any)=>v.id===detail);
    const aim=new T.Vector3().fromArray(c.dataset.atlasAim!.split(',').map(Number)),expected=point?model.localToWorld(new T.Vector3().fromArray(point.at)):null;
    const visible=(object:any)=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;};
    return {type:rec.type,scale:root.scale.x,declaredExtent:model.userData.extent,dimension:model.userData.dimension,measureCenter:model.userData.measureCenter,
      aligned:camera.getWorldDirection(new T.Vector3()).dot(aim.clone().sub(camera.position).normalize()),targetError:expected?expected.distanceTo(aim):0,
      referenceLength:model.localToWorld(new T.Vector3(.5,0,0)).distanceTo(model.localToWorld(new T.Vector3(-.5,0,0)))/root.scale.x,
      aim:aim.toArray(),mouthOpen:whale.mouthOpen,baleenVisible:visible(whale.baleen),jaw:whale.jaw.matrix.toArray(),
      meshes:whale.meshes.map((m:any)=>({geometry:m.geometry.uuid,material:m.material.uuid,detail:m.userData.whaleDetailId})),
      stats:whale.stats,detail:whale.detailId,draws:rec.draws,renders:rec.renders};
  },metadata);
}
async function site(page: Page,n: number) {
  await expect(canvas(page)).toHaveAttribute('data-atlas-whale-site',ids[n-1]);
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
    rec.scene.traverse((o:any)=>{if(o.userData.itemId==='blue-whale')root=o;});
    const model=root.userData.model,camera=w.__whaleCamera,ray=new T.Raycaster(),element=document.querySelector('[data-atlas-ready]')!,rect=element.getBoundingClientRect();
    const visible=(object:any)=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;};
    const hit=(x:number,y:number)=>{ray.setFromCamera(new T.Vector2((x-rect.x)/rect.width*2-1,1-(y-rect.y)/rect.height*2),camera);return ray.intersectObjects(model.children,true).find((h:any)=>h.object.isMesh&&visible(h.object));};
    const targets=model.userData.whale.meshes.filter((m:any)=>m.userData.whaleDetailId===wanted&&visible(m));
    for(const mesh of targets){const positions=mesh.geometry.attributes.position,indices=mesh.geometry.index,count=indices?indices.count:positions.count,step=Math.max(3,Math.floor(count/900/3)*3);
      for(let i=0;i+2<count;i+=step){const centroid=new T.Vector3();for(let j=0;j<3;j++)centroid.add(new T.Vector3().fromBufferAttribute(positions,indices?indices.getX(i+j):i+j));
        const p=mesh.localToWorld(centroid.multiplyScalar(1/3)).project(camera);if(Math.abs(p.x)>.82||Math.abs(p.y)>.64||p.z>=1)continue;
        const x=Math.round(rect.x+(p.x+1)*rect.width/2),y=Math.round(rect.y+(1-p.y)*rect.height/2);let margin=true;
        for(let dx=-1;dx<=1&&margin;dx++)for(let dy=-1;dy<=1;dy++)if(document.elementFromPoint(x+dx,y+dy)!==element||hit(x+dx,y+dy)?.object.userData.whaleDetailId!==wanted){margin=false;break;}
        if(margin)return {x,y,wanted,marginPx:1};
      }
    }return null;
  },wanted);
  expect(point,'an exposed face of the actual whale anatomy').not.toBeNull();await page.mouse.click(point!.x,point!.y);return point;
}

test.beforeAll(async()=>{
  mkdirSync(out,{recursive:true});const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
  save('whale-browser-source',{checkedAt:new Date().toISOString(),source:sha('stem_lab/stem_tool_scaleexplorer.js'),desktop:sha('desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js'),substitution:process.env.STEM_GL_SUBSTITUTE||null});await harness.start();
});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});



test('nine anatomical views expose native surface picking and a fixed human comparison',async({page})=>{
  const log=await mount(page,false,true),initial=await scene(page);
  expect(initial.type).toBe('webgl');expect(initial.stats).toMatchObject({lengthMeters:25,reference:'snout-to-fluke-notch',flukeSpanRatio:.24,headLengthRatio:.25,pleatLengthRatio:.55});
  expect(initial.stats.triangles).toBeLessThan(300000);expect(initial.declaredExtent).toBe(1);expect(initial.dimension).toBe('x');expect(initial.measureCenter).toBe(0);
  expect(initial.mouthOpen).toBe(false);expect(initial.baleenVisible).toBe(false);expect(initial.referenceLength).toBeCloseTo(1,8);await capture(page,'whale-desktop-whole');
  const pickedRostrum=await pickActual(page,'rostrum');await site(page,1);await capture(page,'whale-desktop-rostrum');
  const next=route(page).getByRole('button',{name:'Next feature',exact:true});await next.focus();await next.press('Enter');await site(page,2);await expect(next).toBeFocused();await capture(page,'whale-desktop-blowholes');
  const views=[];for(let n=3;n<=9;n++){
    await slider(page).fill(String(n));await site(page,n);const view=await scene(page);expect(view.mouthOpen).toBe(n===6);expect(view.baleenVisible).toBe(n===6);
    expect(view.referenceLength).toBeCloseTo(1,8);expect(view.scale).toBe(initial.scale);expect(view.meshes).toEqual(initial.meshes);views.push(view);
    if([4,5,6,7,9].includes(n))await capture(page,'whale-desktop-'+ids[n-1]);
  }
  expect(new Set(views.map(v=>v.aim.join(','))).size).toBe(7);
  await slider(page).fill('3');await site(page,3);await study(page).getByRole('button',{name:'Open the mouth',exact:true}).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-whale-mouth','open');expect((await scene(page)).baleenVisible).toBe(true);
  const pickedBaleen=await pickActual(page,'baleen');await site(page,6);const opened=await scene(page);expect(opened.jaw).not.toEqual(initial.jaw);await capture(page,'whale-desktop-picked-baleen');
  await route(page).getByRole('button',{name:'Whole whale',exact:true}).click();await expect(route(page)).toHaveCount(0);
  await expect(canvas(page)).toHaveAttribute('data-atlas-whale-mouth','closed');const restored=await scene(page);
  expect(restored.mouthOpen).toBe(false);expect(restored.baleenVisible).toBe(false);expect(restored.jaw).toEqual(initial.jaw);expect(restored.meshes).toEqual(initial.meshes);
  const panel=page.locator('.sx-comparison-workbench');if(await panel.getAttribute('open')===null)await panel.locator(':scope > summary').click();
  await panel.getByRole('combobox',{name:'First thing',exact:true}).selectOption('blue-whale');await panel.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('human');
  await panel.getByRole('button',{name:'Compare them',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-comparison','blue-whale:human');
  const compared=await scene(page);expect(compared.mouthOpen).toBe(false);expect(compared.baleenVisible).toBe(false);expect(compared.jaw).toEqual(initial.jaw);
  const ratio=await page.evaluate(()=>{const rec=(window as any).__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()),scales:any={};rec.scene.traverse((o:any)=>{if(o.userData.itemId&&o.visible)scales[o.userData.itemId]=o.scale.x;});return scales['blue-whale']/scales.human;});
  expect(ratio).toBeCloseTo(25/1.7,8);save('whale-desktop',{initial,pickedRostrum,views,pickedBaleen,opened,restored,compared,ratio,...log});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});

test('320 pixel WebGL 1 view supports touch, native route bounds and Escape focus',async({page})=>{
  const log=await mount(page,true),initial=await scene(page);expect(initial.type).toBe('webgl');await capture(page,'whale-phone-whole');
  const start=page.getByRole('region',{name:'Enter the whale journey',exact:true}).getByRole('button',{name:'Swim beside the whale',exact:true});
  await start.scrollIntoViewIfNeeded();const box=await start.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.width).toBeGreaterThanOrEqual(44);await start.tap();await site(page,1);
  await slider(page).focus();await slider(page).press('ArrowRight');await site(page,2);await slider(page).press('End');await site(page,9);
  await expect(route(page).getByRole('button',{name:'Next feature',exact:true})).toBeDisabled();await slider(page).press('Home');await site(page,1);
  await expect(route(page).getByRole('button',{name:'Previous feature',exact:true})).toBeDisabled();await slider(page).fill('6');await site(page,6);
  await expect(canvas(page)).toHaveAttribute('data-atlas-whale-mouth','open');expect((await scene(page)).baleenVisible).toBe(true);
  for(const label of ['Previous feature','Next feature','Whole whale'])expect((await route(page).getByRole('button',{name:label,exact:true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect((await slider(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await capture(page,'whale-phone-baleen');
  await slider(page).focus();await slider(page).press('Escape');await expect(route(page)).toHaveCount(0);await expect(study(page).getByRole('button',{name:'Swim beside the whale',exact:true})).toBeFocused();
  await expect(canvas(page)).toHaveAttribute('data-atlas-whale-mouth','closed');await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','1.00');
  const restored=await scene(page);expect(restored.mouthOpen).toBe(false);expect(restored.baleenVisible).toBe(false);expect(restored.scale).toBe(initial.scale);
  save('whale-phone',{initial,restored,...log});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});

test('field notebook restores exact baleen and closed fluke views with their inspection zoom',async({page})=>{
  const log=await mount(page),book=page.getByRole('region',{name:'Field notebook',exact:true});
  await study(page).getByRole('button',{name:'Inspect the feeding apparatus',exact:true}).click();await site(page,6);
  const zoom=Number(await canvas(page).getAttribute('data-atlas-zoom'));await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('Baleen hangs from the upper jaw.');
  await book.getByRole('button',{name:'Save observation',exact:true}).click();
  const saved=await page.evaluate(()=>(window as any).__toolData._scaleExplorer.observations[0]);
  expect(saved).toMatchObject({itemId:'blue-whale',detailId:'baleen',size:25,zoom,cutaway:true,note:'Baleen hangs from the upper jaw.'});
  await fly(page,'earth');await book.locator('[data-observation="blue-whale:baleen"]').getByRole('button',{name:/^Return to/}).click();await site(page,6);
  await expect(canvas(page)).toHaveAttribute('data-atlas-zoom',zoom.toFixed(2));await expect(canvas(page)).toHaveAttribute('data-atlas-whale-mouth','open');
  await expect(book.getByRole('textbox')).toHaveValue('Baleen hangs from the upper jaw.');
  await expect(page.locator('.sx-details').getByRole('link',{name:'Read the science source',exact:true})).toHaveAttribute('href','https://www.fisheries.noaa.gov/species/blue-whale');
  await study(page).getByRole('button',{name:'Follow the tail',exact:true}).click();await site(page,8);await slider(page).fill('9');await site(page,9);
  const closedZoom=Number(await canvas(page).getAttribute('data-atlas-zoom'));await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('The notch marks total body length.');
  await book.getByRole('button',{name:'Save observation',exact:true}).click();await fly(page,'earth');
  await book.locator('[data-observation="blue-whale:flukes"]').getByRole('button',{name:/^Return to/}).click();await site(page,9);
  await expect(canvas(page)).toHaveAttribute('data-atlas-zoom',closedZoom.toFixed(2));await expect(canvas(page)).toHaveAttribute('data-atlas-whale-mouth','closed');
  expect((await scene(page)).baleenVisible).toBe(false);await expect(book.getByRole('textbox')).toHaveValue('The notch marks total body length.');
  const notes=await page.evaluate(()=>(window as any).__toolData._scaleExplorer.observations);
  expect(notes.find((v:any)=>v.detailId==='flukes')).toMatchObject({itemId:'blue-whale',detailId:'flukes',size:25,zoom:closedZoom,cutaway:false,note:'The notch marks total body length.'});
  await page.getByRole('button',{name:'Reset camera',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','');await expect(route(page)).toHaveCount(0);
  save('whale-notebook',{saved,notes,...log});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});
