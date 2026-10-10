import { test, expect, type Page, type Locator } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { showScaleExplorerTools } from './helpers/scale_explorer_workspace';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 240000 });
test.use({ video: 'off', trace: 'off', hasTouch: true });
const out = path.resolve(process.env.SCALE_SEQUOIA_REPORT_DIR || 'reports/scale-explorer-sequoia');
const canvas = (p: Page) => p.locator('[data-atlas-ready]');
const route = (p: Page) => p.getByRole('region', { name: 'Sequoia navigation', exact: true });
const study = (p: Page) => p.getByRole('region', { name: 'Sequoia observatory', exact: true });
const slider = (p: Page) => route(p).getByRole('slider', { name: 'Height above the ground', exact: true });
const ids = ['root-flare','bark','trunk','branch-fork','old-wood','crown','summit'];
const replacement = (process.env.STEM_GL_SUBSTITUTE || '').split(';').find(p => p.startsWith('stem_lab/stem_tool_scaleexplorer.js='));
const sourceFile = replacement ? replacement.slice(replacement.indexOf('=') + 1) : 'stem_lab/stem_tool_scaleexplorer.js';
const sandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {} } } as any;
vm.runInNewContext(readFileSync(sourceFile, 'utf8').replace("  window.StemLab.registerTool('scaleExplorer', {", "  window.__sequoiaChecks={details:atlasDetails,point:sequoiaPoint};\n  window.StemLab.registerTool('scaleExplorer', {"), sandbox);
const checks=sandbox.window.__sequoiaChecks;
const metadata=JSON.parse(JSON.stringify({details:checks.details('sequoia',(_:string,fallback:string)=>fallback),points:ids.map(id=>checks.point(id))}));
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_scaleexplorer.js', toolId: 'scaleExplorer', width: 1400, height: 1100,
  layout: 'document', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['vendor/three-r128/GLTFLoader.js'],
  probes: `const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__sequoiaCamera=c;return render.apply(this,arguments);};return r;}});`
});
function save(name:string,value:unknown){writeFileSync(path.join(out,name+'.json'),JSON.stringify(value,null,2)+'\n');}
async function mount(page:Page,phone=false){
  const errors:string[]=[],external:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/*',request=>{
    const url=request.request().url();
    if(/^https?:/.test(url)&&!/^http:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(url)){external.push(url);return request.abort();}
    return request.continue();
  });
  await page.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    (HTMLCanvasElement.prototype as any).getContext=function(type:string,...args:any[]){return type==='webgl2'?null:original.apply(this,[type,...args] as any);};
  });
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:phone?320:1400,height:phone?780:1100});
  await harness.mount(page,{_scaleExplorer:{ambient:false}},'!!document.querySelector("[data-atlas-ready]")');await showScaleExplorerTools(page);
  await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});
  await fly(page,'sequoia');return {errors,external};
}
async function fly(page:Page,id:string){
  await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);
  await expect(canvas(page)).toHaveAttribute('data-atlas-objects',id);
  await expect.poll(()=>canvas(page).evaluate((c:HTMLElement)=>Math.abs(Number(c.dataset.atlasExponent)-Number(c.dataset.atlasTarget)))).toBeLessThan(.002);
}
async function scene(page:Page){
  return page.evaluate(metadata=>{
    const w=window as any,T=w.THREE,rec=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;
    const visible=(object:any)=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;};
    const grove:any[]=[];rec.scene.traverse((o:any)=>{if(o.userData.itemId==='sequoia')root=o;if(o.userData.forestGrove||o.name==='forest grove')grove.push({name:o.name,visible:visible(o)});});
    const model=root.userData.model,tree=model.userData.sequoia,camera=w.__sequoiaCamera,c=document.querySelector('[data-atlas-ready]') as HTMLElement;
    const detail=c.dataset.atlasDetail||'',point=metadata.details.find((d:any)=>d.id===detail),aim=new T.Vector3().fromArray(c.dataset.atlasAim!.split(',').map(Number));
    const expected=point?model.localToWorld(new T.Vector3().fromArray(point.at)):null;
    const bounds=new T.Box3().setFromObject(model),direction=camera.getWorldDirection(new T.Vector3());
    return {type:rec.type,scale:root.scale.x,declaredExtent:model.userData.extent,dimension:model.userData.dimension,measureCenter:model.userData.measureCenter,
      aligned:direction.dot(aim.clone().sub(camera.position).normalize()),targetError:expected?expected.distanceTo(aim):0,
      referenceHeight:model.localToWorld(new T.Vector3(0,.5,0)).distanceTo(model.localToWorld(new T.Vector3(0,-.5,0)))/root.scale.x,
      actualHeight:(bounds.max.y-bounds.min.y)/root.scale.x,aim:aim.toArray(),yaw:Math.atan2(-direction.x,-direction.z),
      pitch:Math.asin(-direction.y),near:camera.near,grove,
      meshes:tree.meshes.map((m:any)=>({geometry:m.geometry.uuid,material:Array.isArray(m.material)?m.material.map((a:any)=>a.uuid):m.material.uuid,detail:m.userData.sequoiaDetailId})),
      stats:tree.stats,detail:tree.detailId,draws:rec.draws,renders:rec.renders};
  },metadata);
}
async function site(page:Page,id:string){
  const point=metadata.points.find((p:any)=>p.id===id);
  await expect(canvas(page)).toHaveAttribute('data-atlas-sequoia-site',id);await expect(canvas(page)).toHaveAttribute('data-atlas-detail',id);
  await expect(slider(page)).toHaveValue(String(point?point.meters:Number(id.slice(7))));
  await expect.poll(async()=>(await scene(page)).aligned).toBeGreaterThan(.99999);
  await expect.poll(async()=>(await scene(page)).targetError).toBeLessThan(.0002);
}
async function setRange(control:Locator,value:number){
  await control.evaluate((input:HTMLInputElement,value:number)=>{
    const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;
    set.call(input,String(value));input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
  },value);
}
async function ascent(page:Page,meters:number){
  await setRange(slider(page),meters);await site(page,'ascent-'+meters);
  await expect(canvas(page)).toHaveAttribute('data-atlas-sequoia-height',String(meters));
}
async function capture(page:Page,name:string){
  await canvas(page).scrollIntoViewIfNeeded();await page.locator('.sx-stage').screenshot({path:path.join(out,name+'-stage.png')});
  const pixels=await harness.glPixels(page);expect(pixels).not.toBeNull();expect(looksBlank(pixels!)).toBe(false);writeFileSync(path.join(out,name+'-gl.png'),pixels!.png);
}
async function pickActual(page:Page,wanted:string){
  await canvas(page).scrollIntoViewIfNeeded();
  const point=await page.evaluate(wanted=>{
    const w=window as any,T=w.THREE,rec=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;
    rec.scene.traverse((o:any)=>{if(o.userData.itemId==='sequoia')root=o;});
    const model=root.userData.model,camera=w.__sequoiaCamera,ray=new T.Raycaster(),element=document.querySelector('[data-atlas-ready]')!,rect=element.getBoundingClientRect();
    const visible=(object:any)=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;};
    const hit=(x:number,y:number)=>{ray.setFromCamera(new T.Vector2((x-rect.x)/rect.width*2-1,1-(y-rect.y)/rect.height*2),camera);return ray.intersectObjects(model.children,true).find((h:any)=>h.object.isMesh&&visible(h.object));};
    const targets=model.userData.sequoia.meshes.filter((m:any)=>m.userData.sequoiaDetailId===wanted&&visible(m));
    for(const mesh of targets){
      const positions=mesh.geometry.attributes.position,indices=mesh.geometry.index,count=indices?indices.count:positions.count,step=Math.max(3,Math.floor(count/900/3)*3);
      for(let i=0;i+2<count;i+=step){
        const centroid=new T.Vector3();for(let j=0;j<3;j++)centroid.add(new T.Vector3().fromBufferAttribute(positions,indices?indices.getX(i+j):i+j));
        const p=mesh.localToWorld(centroid.multiplyScalar(1/3)).project(camera);if(Math.abs(p.x)>.82||Math.abs(p.y)>.64||p.z>=1)continue;
        const x=Math.round(rect.x+(p.x+1)*rect.width/2),y=Math.round(rect.y+(1-p.y)*rect.height/2);let margin=true;
        for(let dx=-1;dx<=1&&margin;dx++)for(let dy=-1;dy<=1;dy++)if(document.elementFromPoint(x+dx,y+dy)!==element||hit(x+dx,y+dy)?.object.userData.sequoiaDetailId!==wanted){margin=false;break;}
        if(margin)return {x,y,wanted,marginPx:1};
      }
    }return null;
  },wanted);
  expect(point,'an exposed face of the actual sequoia surface').not.toBeNull();await page.mouse.click(point!.x,point!.y);return point;
}
function groveVisible(view:any){expect(view.grove.length,'separate forest environment is present').toBeGreaterThan(0);expect(view.grove.some((g:any)=>g.visible)).toBe(true);}
function groveHidden(view:any){expect(view.grove.every((g:any)=>!g.visible)).toBe(true);}

test.beforeAll(async()=>{
  mkdirSync(out,{recursive:true});const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
  save('sequoia-browser-source',{checkedAt:new Date().toISOString(),source:sha('stem_lab/stem_tool_scaleexplorer.js'),desktop:sha('desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js'),substitution:process.env.STEM_GL_SUBSTITUTE||null});await harness.start();
});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});

test('continuous height ascent and seven pickable landmarks retain one fixed tree scale and a neutral comparison',async({page})=>{
  const log=await mount(page),initial=await scene(page);expect(initial.type).toBe('webgl');
  expect(initial.declaredExtent).toBe(1);expect(initial.dimension).toBe('y');expect(initial.measureCenter).toBe(0);
  expect(initial.referenceHeight).toBeCloseTo(1,8);expect(initial.actualHeight).toBeCloseTo(1,4);groveVisible(initial);
  await capture(page,'sequoia-desktop-whole');
  await study(page).getByRole('button',{name:'Begin the ascent',exact:true}).click();await site(page,'ascent-2');
  const pickedRoot=await pickActual(page,'root-flare');await site(page,'root-flare');await capture(page,'sequoia-desktop-root-flare');
  const views:any[]=[];
  for(let i=0;i<ids.length;i++){
    const d=metadata.details.find((d:any)=>d.id===ids[i]);await study(page).getByRole('button',{name:d.label,exact:true}).click();await site(page,d.id);
    const view=await scene(page);expect(view.scale).toBe(initial.scale);expect(view.referenceHeight).toBeCloseTo(1,8);expect(view.meshes).toEqual(initial.meshes);expect(view.near).toBeLessThanOrEqual(.003);groveVisible(view);views.push(view);
    if(['bark','branch-fork','old-wood','crown','summit'].includes(d.id))await capture(page,'sequoia-desktop-'+d.id);
  }
  await ascent(page,3);const pickedBark=await pickActual(page,'bark');await site(page,'bark');
  const heights:any[]=[];
  for(let meters=0;meters<=84;meters++){
    await ascent(page,meters);const view=await scene(page);expect(view.scale).toBe(initial.scale);expect(view.referenceHeight).toBeCloseTo(1,8);expect(view.meshes).toEqual(initial.meshes);groveVisible(view);
    heights.push({meters,aim:view.aim,error:view.targetError,aligned:view.aligned});
  }
  expect(new Set(heights.map(v=>v.aim[1])).size).toBe(85);await capture(page,'sequoia-desktop-ascent-84');
  await route(page).getByRole('button',{name:'Whole tree',exact:true}).click();await expect(route(page)).toHaveCount(0);
  await expect(canvas(page)).toHaveAttribute('data-atlas-detail','');await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','1.00');
  const restored=await scene(page);expect(restored.meshes).toEqual(initial.meshes);groveVisible(restored);
  const panel=page.locator('.sx-comparison-workbench');if(await panel.getAttribute('open')===null)await panel.locator(':scope > summary').click();
  await panel.getByRole('combobox',{name:'First thing',exact:true}).selectOption('sequoia');await panel.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('human');
  await panel.getByRole('button',{name:'Compare them',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-comparison','sequoia:human');
  const compared=await scene(page);groveHidden(compared);expect(compared.referenceHeight).toBeCloseTo(1,8);expect(compared.detail).toBe('');
  const ratio=await page.evaluate(()=>{const rec=(window as any).__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()),scales:any={};rec.scene.traverse((o:any)=>{if(o.userData.itemId&&o.visible)scales[o.userData.itemId]=o.scale.x;});return scales.sequoia/scales.human;});
  expect(ratio).toBeCloseTo(84/1.7,8);await capture(page,'sequoia-human-comparison');
  await page.getByRole('button',{name:'Back to exploration',exact:true}).click();await fly(page,'blue-whale');groveHidden(await scene(page));
  save('sequoia-desktop',{initial,pickedRoot,pickedBark,views,heights,restored,compared,ratio,...log});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});

test('320 pixel WebGL 1 ascent supports touch, metre keyboard bounds and Escape focus without overflow',async({page})=>{
  const log=await mount(page,true),initial=await scene(page);expect(initial.type).toBe('webgl');await capture(page,'sequoia-phone-whole');
  const start=page.getByRole('region',{name:'Enter the sequoia grove',exact:true}).getByRole('button',{name:'Begin the ascent',exact:true});
  await start.scrollIntoViewIfNeeded();const box=await start.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.width).toBeGreaterThanOrEqual(44);await start.tap();await site(page,'ascent-2');
  await expect(slider(page)).toHaveAttribute('min','0');await expect(slider(page)).toHaveAttribute('max','84');await expect(slider(page)).toHaveAttribute('step','1');
  await slider(page).focus();await slider(page).press('ArrowRight');await site(page,'ascent-3');await slider(page).press('End');await site(page,'ascent-84');
  await expect(route(page).getByRole('button',{name:'Next landmark',exact:true})).toBeDisabled();await slider(page).press('Home');await site(page,'ascent-0');
  await expect(route(page).getByRole('button',{name:'Previous landmark',exact:true})).toBeDisabled();
  await route(page).getByRole('button',{name:'Next landmark',exact:true}).tap();const next=await scene(page);expect(ids).toContain(next.detail);
  await ascent(page,47);expect((await scene(page)).referenceHeight).toBeCloseTo(1,8);
  for(const label of ['Previous landmark','Next landmark','Whole tree'])expect((await route(page).getByRole('button',{name:label,exact:true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect((await slider(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await capture(page,'sequoia-phone-ascent-47');
  await study(page).getByRole('button',{name:'Visit the crown',exact:true}).tap();await site(page,'crown');await capture(page,'sequoia-phone-crown');
  await slider(page).focus();await slider(page).press('Escape');await expect(route(page)).toHaveCount(0);await expect(study(page).getByRole('button',{name:'Begin the ascent',exact:true})).toBeFocused();
  await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','1.00');const restored=await scene(page);expect(restored.scale).toBe(initial.scale);groveVisible(restored);
  await study(page).getByRole('button',{name:'Visit the crown',exact:true}).tap();await site(page,'crown');
  await canvas(page).focus();await canvas(page).press('Escape');await expect(route(page)).toHaveCount(0);
  await expect(canvas(page)).toHaveAttribute('data-atlas-detail','');await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','1.00');
  await expect(study(page).getByRole('button',{name:'Begin the ascent',exact:true})).toBeFocused();
  save('sequoia-phone',{initial,next,restored,...log});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});

test('field notebook restores an exact 47 metre viewpoint and bark observation with independent zoom and orientation',async({page})=>{
  const log=await mount(page),book=page.getByRole('region',{name:'Field notebook',exact:true});
  await capture(page,'sequoia-notebook-whole');
  await study(page).getByRole('button',{name:'Begin the ascent',exact:true}).click();await site(page,'ascent-2');await ascent(page,47);
  await setRange(page.getByRole('slider',{name:'Inspection magnification',exact:true}),10.5);await page.getByRole('button',{name:'Orbit left',exact:true}).click();
  await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('Forty-seven metres above the grove.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
  const saved=await page.evaluate(()=>(window as any).__toolData._scaleExplorer.observations.find((n:any)=>n.detailId==='ascent-47'));
  expect(saved).toMatchObject({itemId:'sequoia',detailId:'ascent-47',size:84,zoom:10.5,note:'Forty-seven metres above the grove.'});
  await canvas(page).scrollIntoViewIfNeeded();await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','10.50');
  await expect.poll(async()=>(await scene(page)).yaw).toBeCloseTo(saved.yaw,4);await expect.poll(async()=>(await scene(page)).pitch).toBeCloseTo(saved.pitch,4);
  const viewpoint=await scene(page);expect(saved.yaw).toBeCloseTo(viewpoint.yaw,4);expect(saved.pitch).toBeCloseTo(viewpoint.pitch,4);
  await fly(page,'earth');groveHidden(await scene(page));await book.locator('[data-observation="sequoia:ascent-47"]').getByRole('button',{name:/^Return to/}).click();await canvas(page).scrollIntoViewIfNeeded();await site(page,'ascent-47');
  await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','10.50');await expect(canvas(page)).toHaveAttribute('data-atlas-yaw',saved.yaw.toFixed(4));
  const returned=await scene(page);expect(returned.yaw).toBeCloseTo(saved.yaw,4);expect(returned.pitch).toBeCloseTo(saved.pitch,4);groveVisible(returned);
  await expect(book.getByRole('textbox')).toHaveValue('Forty-seven metres above the grove.');
  await study(page).getByRole('button',{name:'Inspect the bark',exact:true}).click();await site(page,'bark');
  await setRange(page.getByRole('slider',{name:'Inspection magnification',exact:true}),11.2);await page.getByRole('button',{name:'Orbit right',exact:true}).click();
  await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('Deep vertical bark furrows.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
  const bark=await page.evaluate(()=>(window as any).__toolData._scaleExplorer.observations.find((n:any)=>n.detailId==='bark'));
  expect(bark).toMatchObject({itemId:'sequoia',detailId:'bark',size:84,zoom:11.2,note:'Deep vertical bark furrows.'});
  await fly(page,'blue-whale');await book.locator('[data-observation="sequoia:bark"]').getByRole('button',{name:/^Return to/}).click();await canvas(page).scrollIntoViewIfNeeded();await site(page,'bark');
  await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','11.20');await expect(canvas(page)).toHaveAttribute('data-atlas-yaw',bark.yaw.toFixed(4));
  const returnedBark=await scene(page);expect(returnedBark.pitch).toBeCloseTo(bark.pitch,4);groveVisible(returnedBark);
  await expect(book.getByRole('textbox')).toHaveValue('Deep vertical bark furrows.');
  await expect(page.locator('.sx-details').getByRole('link',{name:'Read the science source',exact:true})).toHaveAttribute('href','https://research.fs.usda.gov/feis/species-reviews/seqgig');
  await page.getByRole('button',{name:'Reset camera',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','');await expect(route(page)).toHaveCount(0);
  save('sequoia-notebook',{saved,viewpoint,returned,bark,returnedBark,...log});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});
