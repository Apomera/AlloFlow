# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: adapted-water.spec.ts >> water native geometry, reversible guides and saved whole viewpoints preserve the 275 pm reference
- Location: ..\..\..\Documents\Codex\2026-09-29\new-chat-2\scale-water\adapted-water.spec.ts:91:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: false
Received: true
```

# Test source

```ts
  1   | import { test, expect, type Page, type Locator } from 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/@playwright/test';
  2   | import { GlHarness, looksBlank } from 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/e2e/helpers/stem_gl_harness';
  3   | import { showScaleExplorerTools } from 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/e2e/helpers/scale_explorer_workspace';
  4   | import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
  5   | import { createHash } from 'node:crypto';
  6   | import vm from 'node:vm';
  7   | import path from 'node:path';
  8   | 
  9   | test.describe.configure({mode:'serial',retries:0,timeout:270000});
  10  | test.use({video:'off',trace:'off',hasTouch:true});
  11  | const cases=[{id:'water',meters:2.75e-10,axis:'x',reference:'reference size',ids:['oxygen','hydrogens','bond','angle','polarity'],pick:'oxygen'}];
  12  | const out=path.resolve(process.env.SCALE_WATER_REPORT_DIR||'reports/scale-explorer-water');
  13  | const canvas=(page:Page)=>page.locator('[data-atlas-ready]');
  14  | const nav=(page:Page)=>page.getByRole('navigation',{name:'Landmark navigator',exact:true});
  15  | const replacement=(process.env.STEM_GL_SUBSTITUTE||'').split(';').find(value=>value.startsWith('stem_lab/stem_tool_scaleexplorer.js='));
  16  | const sourceFile=process.env.SCALE_WATER_SOURCE||(replacement?replacement.slice(replacement.indexOf('=')+1):'stem_lab/stem_tool_scaleexplorer.js');
  17  | const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}} as any;
  18  | vm.runInNewContext(readFileSync(sourceFile,'utf8').replace("  window.StemLab.registerTool('scaleExplorer', {", "  window.__specimenChecks={details:atlasDetails,point:specimenPoint};\n  window.StemLab.registerTool('scaleExplorer', {"),sandbox);
  19  | const checks=sandbox.window.__specimenChecks;
  20  | const metadata=JSON.parse(JSON.stringify(Object.fromEntries(cases.map(c=>[c.id,checks.details(c.id,(_:string,fallback:string)=>fallback)]))));
  21  | const harness=new GlHarness({
  22  |   toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,
  23  |   layout:'document',preScripts:['stem_lab/stem_lab_module.js'],
  24  |   probes:`const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const renderer=Reflect.construct(target,args),render=renderer.render;renderer.render=function(scene,camera){window.__specimenCamera=camera;return render.apply(this,arguments);};return renderer;}});`
  25  | });
  26  | function save(name:string,value:unknown){writeFileSync(path.join(out,name+'.json'),JSON.stringify(value,null,2)+'\n');}
  27  | async function mount(page:Page,phone=false){
  28  |   const errors:string[]=[],external:string[]=[];
  29  |   page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  30  |   await page.route('**/*',request=>{const url=request.request().url();if(/^https?:/.test(url)&&!/^http:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(url)){external.push(url);return request.abort();}return request.continue();});
  31  |   await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;(HTMLCanvasElement.prototype as any).getContext=function(type:string,...args:any[]){return type==='webgl2'?null:original.apply(this,[type,...args] as any);};});
  32  |   await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:phone?330:1400,height:phone?780:1100});
  33  |   await harness.mount(page,{_scaleExplorer:{ambient:false}},'!!document.querySelector("[data-atlas-ready]")');await showScaleExplorerTools(page);
  34  |   await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});
  35  |   return {errors,external};
  36  | }
  37  | async function fly(page:Page,id:string){
  38  |   await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);await expect(canvas(page)).toHaveAttribute('data-atlas-objects',id);await canvas(page).scrollIntoViewIfNeeded();
  39  |   await expect.poll(()=>canvas(page).evaluate((element:HTMLElement)=>Math.abs(Number(element.dataset.atlasExponent)-Number(element.dataset.atlasTarget)))).toBeLessThan(.002);
  40  |   await settled(page);
  41  | }
  42  | async function settled(page:Page){
  43  |   await canvas(page).scrollIntoViewIfNeeded();
  44  |   await expect.poll(()=>page.evaluate(async()=>{const camera=(window as any).__specimenCamera,before=camera.position.clone();await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));return before.distanceTo(camera.position);})).toBeLessThan(.000001);
  45  | }
  46  | async function scene(page:Page,id:string){
  47  |   return page.evaluate(({metadata,id})=>{
  48  |     const w=window as any,T=w.THREE,record=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()),camera=w.__specimenCamera,element=document.querySelector('[data-atlas-ready]') as HTMLElement;
  49  |     const visible=(object:any)=>{for(let node=object;node;node=node.parent)if(!node.visible)return false;return true;};let root:any,other:any;
  50  |     record.scene.traverse((object:any)=>{if(object.userData.itemId===id&&visible(object))root=object;if(object.userData.itemId==='hydrogen'&&id==='water'&&visible(object))other=object;});
  51  |     const model=root.userData.model,data=model.userData.specimen,detail=element.dataset.atlasDetail||'',point=metadata[id].find((value:any)=>value.id===detail),aim=new T.Vector3().fromArray(element.dataset.atlasAim!.split(',').map(Number)),expected=point?model.localToWorld(new T.Vector3().fromArray(point.at)):null,direction=camera.getWorldDirection(new T.Vector3()),leaf=record.scene.getObjectByName('atlasLeafCanopy'),ground=record.scene.getObjectByName('atlasGround'),key=record.scene.getObjectByName('atlasSunlight');
  52  |     const start=new T.Vector3(),end=new T.Vector3();start[model.userData.dimension]=-.5;end[model.userData.dimension]=.5;model.localToWorld(start);model.localToWorld(end);const ruler=root.userData.ruler.children[0];ruler.geometry.computeBoundingBox();const rulerStart=ruler.localToWorld(new T.Vector3(0,ruler.geometry.boundingBox.min.y,0)),rulerEnd=ruler.localToWorld(new T.Vector3(0,ruler.geometry.boundingBox.max.y,0)),rulerReference=rulerStart.distanceTo(rulerEnd)/root.scale.x;rulerStart.applyMatrix4(root.matrixWorld.clone().invert());rulerEnd.applyMatrix4(root.matrixWorld.clone().invert());let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,visibleVertices=0,clippedVertices=0;
  53  |     const rulerBounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};root.userData.ruler.traverse((object:any)=>{if(!object.geometry)return;const position=object.geometry.attributes.position;for(let n=0;n<position.count;n++){const point=object.localToWorld(new T.Vector3().fromBufferAttribute(position,n)).project(camera);rulerBounds.minX=Math.min(rulerBounds.minX,point.x);rulerBounds.maxX=Math.max(rulerBounds.maxX,point.x);rulerBounds.minY=Math.min(rulerBounds.minY,point.y);rulerBounds.maxY=Math.max(rulerBounds.maxY,point.y);}});
  54  |     model.traverse((object:any)=>{if(!object.geometry||!visible(object))return;const position=object.geometry.attributes.position;if(!position)return;for(let n=0;n<position.count;n++){const point=object.localToWorld(new T.Vector3().fromBufferAttribute(position,n)).project(camera);if(point.z>=-1&&point.z<1)visibleVertices++;else clippedVertices++;minX=Math.min(minX,point.x);maxX=Math.max(maxX,point.x);minY=Math.min(minY,point.y);maxY=Math.max(maxY,point.y);}});
  55  |     return {type:record.type,kind:data.kind,stats:data.stats,scale:root.scale.x,declaredExtent:model.userData.extent,dimension:model.userData.dimension,measureCenter:model.userData.measureCenter,bodyReference:start.distanceTo(end)/root.scale.x,rulerReference,rulerEnds:[rulerStart[model.userData.dimension],rulerEnd[model.userData.dimension]],
  56  |       aligned:direction.dot(aim.clone().sub(camera.position).normalize()),targetError:expected?expected.distanceTo(aim):0,aim:aim.toArray(),yaw:Math.atan2(-direction.x,-direction.z),pitch:Math.asin(-direction.y),detail,near:camera.near,
  57  |       meshes:data.meshes.map((mesh:any)=>({geometry:mesh.geometry.uuid,material:Array.isArray(mesh.material)?mesh.material.map((value:any)=>value.uuid):mesh.material.uuid,detail:mesh.userData.specimenDetailId,vertices:mesh.geometry.attributes.position.count,indices:mesh.geometry.index?mesh.geometry.index.count:0})),
  58  |       bounds:{minX,maxX,minY,maxY,visibleVertices,clippedVertices},rulerBounds,comparisonRatio:other?root.scale.x/other.scale.x:null,habitat:{name:element.dataset.atlasHabitat,leaf:leaf?{visible:visible(leaf),y:leaf.position.y,scale:leaf.scale.x,meshes:leaf.children.filter((object:any)=>object.isMesh&&visible(object)).length}:null,ground:ground?{visible:visible(ground),y:ground.position.y}:null,floorTarget:root.position.y+root.userData.floor*root.scale.y-.008,key:key?{directional:!!key.isDirectionalLight,shadow:key.castShadow,intensity:key.intensity}:null},waterView:element.dataset.atlasWaterView,pose:{guides:data.pose.guides,angle:data.pose.angleGuide.visible,polarity:data.pose.polarityGuide.visible,atoms:data.pose.atoms.visible,bonds:data.pose.bonds.visible},draws:record.draws,renders:record.renders};
  59  |   },{metadata,id});
  60  | }
  61  | async function detail(page:Page,id:string,part:string){
  62  |   await canvas(page).scrollIntoViewIfNeeded();await expect(canvas(page)).toHaveAttribute('data-atlas-detail',part);await expect.poll(async()=>(await scene(page,id)).aligned).toBeGreaterThan(.99999);await expect.poll(async()=>(await scene(page,id)).targetError).toBeLessThan(.0002);await settled(page);
  63  | }
  64  | function expectGuides(view:any,part:string,mode:string){
> 65  |   expect(view.pose.atoms).toBe(true);expect(view.pose.bonds).toBe(true);expect(view.pose.angle).toBe((!part&&mode==='guides')||part==='angle');expect(view.pose.polarity).toBe((!part&&mode==='guides')||part==='polarity');
      |                                                                                                 ^ Error: expect(received).toBe(expected) // Object.is equality
  66  | }
  67  | async function setRange(control:Locator,value:number){await control.evaluate((input:HTMLInputElement,value:number)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,String(value));input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));},value);}
  68  | async function capture(page:Page,name:string){await canvas(page).scrollIntoViewIfNeeded();await page.locator('.sx-stage').screenshot({path:path.join(out,name+'-stage.png')});const pixels=await harness.glPixels(page);expect(pixels).not.toBeNull();expect(looksBlank(pixels!)).toBe(false);writeFileSync(path.join(out,name+'-gl.png'),pixels!.png);}
  69  | async function pickActual(page:Page,id:string,wanted:string){
  70  |   await settled(page);const point=await page.evaluate(({id,wanted})=>{
  71  |     const w=window as any,T=w.THREE,record=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()),camera=w.__specimenCamera,ray=new T.Raycaster(),element=document.querySelector('[data-atlas-ready]')!,rect=element.getBoundingClientRect();let root:any;
  72  |     const visible=(object:any)=>{for(let node=object;node;node=node.parent)if(!node.visible)return false;return true;};record.scene.traverse((object:any)=>{if(object.userData.itemId===id&&visible(object))root=object;});
  73  |     const model=root.userData.model,hit=(x:number,y:number)=>{ray.setFromCamera(new T.Vector2((x-rect.x)/rect.width*2-1,1-(y-rect.y)/rect.height*2),camera);return ray.intersectObjects(model.children,true).find((value:any)=>value.object.isMesh&&visible(value.object));};
  74  |     const targets=model.userData.specimen.meshes.filter((mesh:any)=>mesh.isMesh&&mesh.userData.specimenDetailId===wanted&&visible(mesh));
  75  |     for(const mesh of targets){const position=mesh.geometry.attributes.position,index=mesh.geometry.index,count=index?index.count:position.count,step=Math.max(3,Math.floor(count/2200/3)*3);
  76  |       for(let n=0;n+2<count;n+=step){const center=new T.Vector3();for(let j=0;j<3;j++)center.add(new T.Vector3().fromBufferAttribute(position,index?index.getX(n+j):n+j));const projected=mesh.localToWorld(center.multiplyScalar(1/3)).project(camera);
  77  |         if(Math.abs(projected.x)>.88||Math.abs(projected.y)>.88||projected.z < -1||projected.z>=1)continue;const x=Math.round(rect.x+(projected.x+1)*rect.width/2),y=Math.round(rect.y+(1-projected.y)*rect.height/2);let margin=true;
  78  |         for(let dx=-1;dx<=1&&margin;dx++)for(let dy=-1;dy<=1;dy++){if(document.elementFromPoint(x+dx,y+dy)!==element||hit(x+dx,y+dy)?.object.userData.specimenDetailId!==wanted){margin=false;break;}}
  79  |         if(margin)return {x,y,id,wanted,marginPx:1,triangle:n/3};
  80  |       }
  81  |     }return null;
  82  |   },{id,wanted});
  83  |   expect(point,'visible native triangles with a one pixel click margin').not.toBeNull();await page.mouse.click(point!.x,point!.y);await detail(page,id,wanted);return point;
  84  | }
  85  | 
  86  | test.beforeAll(async()=>{mkdirSync(out,{recursive:true});const sha=(file:string)=>createHash('sha256').update(readFileSync(file)).digest('hex');save('specimen-browser-source',{checkedAt:new Date().toISOString(),source:sha('stem_lab/stem_tool_scaleexplorer.js'),desktop:sha('desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js'),substitution:process.env.STEM_GL_SUBSTITUTE||null});await harness.start();});
  87  | test.afterAll(async()=>{await harness.stop();});
  88  | test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});
  89  | 
  90  | 
  91  | test('water native geometry, reversible guides and saved whole viewpoints preserve the 275 pm reference',async({page})=>{
  92  |  const log=await mount(page),c=cases[0];await fly(page,'rbc');await page.getByRole('button',{name:'Open cell window',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-cutaway','open');
  93  |  await setRange(page.getByRole('slider',{name:'Scale position, in powers of ten',exact:true}),Math.log10(2.75e-10));await expect(canvas(page)).toHaveAttribute('data-atlas-objects','water');await expect(canvas(page)).toHaveAttribute('data-atlas-cutaway','closed');await settled(page);const continuousEntry=await scene(page,'water');expectGuides(continuousEntry,'','guides');
  94  |  await fly(page,'water');const initial=await scene(page,'water');
  95  |  expect(initial.type).toBe('webgl');expect(initial.kind).toBe('water');expect(initial.declaredExtent).toBe(1);expect(initial.dimension).toBe('x');expect(initial.measureCenter).toBe(0);expect(initial.bodyReference).toBeCloseTo(1,8);expect(initial.rulerReference).toBeCloseTo(1,8);expect(initial.rulerEnds[0]).toBeCloseTo(-.5,8);expect(initial.rulerEnds[1]).toBeCloseTo(.5,8);expect(initial.stats).toMatchObject({bodyReferenceMeters:2.75e-10,atomRadiiIllustrative:true});expectGuides(initial,'','guides');await capture(page,'water-desktop-whole');
  96  |  const controls=page.getByRole('button',{name:'Geometry guides',exact:true});await expect(controls).toHaveAttribute('aria-pressed','true');await controls.click();await settled(page);const structure=await scene(page,'water');expectGuides(structure,'','structure');expect(structure.meshes).toEqual(initial.meshes);await expect(page.getByRole('button',{name:'Structure only',exact:true})).toHaveAttribute('aria-pressed','false');await capture(page,'water-desktop-structure');
  97  |  await page.getByRole('button',{name:'Structure only',exact:true}).click();await settled(page);expectGuides(await scene(page,'water'),'','guides');
  98  |  const book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('The molecule is bent and its geometry guides remain readable.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
  99  |  const wholeSaved=await page.evaluate(()=>(window as any).__toolData._scaleExplorer.observations.find((note:any)=>note.itemId==='water'&&note.detailId===''));expect(wholeSaved).toMatchObject({itemId:'water',detailId:'',size:2.75e-10,waterView:'guides'});
  100 |  await fly(page,'hydrogen');await book.locator('[data-observation="water:"]').getByRole('button',{name:/^Return to/}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','');await settled(page);const wholeRestored=await scene(page,'water');expectGuides(wholeRestored,'','guides');expect(wholeRestored.meshes).toEqual(initial.meshes);await capture(page,'water-desktop-restored-guides');
  101 |  const oxygenPick=await pickActual(page,'water','oxygen');await nav(page).getByRole('button',{name:'Return to whole view',exact:true}).click();await nav(page).getByRole('button',{name:'Explore landmarks',exact:true}).click();const views=[];
  102 |  for(const [n,id]of c.ids.entries()){
  103 |   if(n)await nav(page).getByRole('button',{name:'Next landmark',exact:true}).click();await detail(page,'water',id);const nativePick=await pickActual(page,'water',id),view=await scene(page,'water');expect(view.scale).toBe(initial.scale);expect(view.meshes).toEqual(initial.meshes);expect(view.bodyReference).toBeCloseTo(1,8);expect(view.rulerReference).toBeCloseTo(1,8);expectGuides(view,id,'guides');await capture(page,'water-desktop-'+id);views.push({...view,nativePick});
  104 |   const title=nav(page).locator('.sx-feature-title');if(await title.getAttribute('aria-expanded')!=='true')await title.click();await expect(nav(page).getByRole('link',{name:'Science reference',exact:true})).toHaveAttribute('href',/^https:/);
  105 |  }
  106 |  expect(new Set(views.map(view=>view.aim.join(','))).size).toBe(c.ids.length);await nav(page).getByRole('button',{name:'Return to whole view',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','1.00');await settled(page);const restored=await scene(page,'water');expect(restored.meshes).toEqual(initial.meshes);
  107 |  save('water-desktop',{continuousEntry,initial,structure,wholeSaved,wholeRestored,oxygenPick,views,restored,...log});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
  108 | });
  109 | 
  110 | test('330 pixel WebGL 1 water inspection, notebook mode restoration and comparison remain usable',async({page})=>{
  111 |  const log=await mount(page,true),book=page.getByRole('region',{name:'Field notebook',exact:true});await fly(page,'water');const initial=await scene(page,'water');expect(initial.type).toBe('webgl');expect(initial.bounds.visibleVertices).toBeGreaterThan(1000);expect(initial.bounds.clippedVertices).toBe(0);for(const [axis,value]of Object.entries({minX:initial.bounds.minX,maxX:initial.bounds.maxX,minY:initial.bounds.minY,maxY:initial.bounds.maxY}))expect(Math.abs(value),'water '+axis+' framing').toBeLessThan(.985);for(const [axis,value]of Object.entries(initial.rulerBounds))expect(Math.abs(value),'water '+axis+' ruler framing').toBeLessThan(.985);expectGuides(initial,'','guides');await capture(page,'water-phone-whole');
  112 |  await page.getByRole('button',{name:'Geometry guides',exact:true}).tap();await settled(page);const structure=await scene(page,'water');expectGuides(structure,'','structure');await capture(page,'water-phone-structure');
  113 |  const note='The exact atom centers and the approximate reference describe different things.';await setRange(page.getByRole('slider',{name:'Inspection magnification',exact:true}),2.3);await page.getByRole('button',{name:'Orbit left',exact:true}).click();await settled(page);await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill(note);await book.getByRole('button',{name:'Save observation',exact:true}).click();const saved=await page.evaluate(()=>(window as any).__toolData._scaleExplorer.observations.find((note:any)=>note.itemId==='water'&&note.detailId===''));expect(saved).toMatchObject({itemId:'water',detailId:'',size:2.75e-10,zoom:2.3,waterView:'structure',note});
  114 |  await canvas(page).scrollIntoViewIfNeeded();await settled(page);const before=await scene(page,'water');await fly(page,'hydrogen');await book.locator('[data-observation="water:"]').getByRole('button',{name:/^Return to/}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','');await settled(page);const restored=await scene(page,'water');expectGuides(restored,'','structure');expect(restored.meshes).toEqual(before.meshes);expect(restored.yaw).toBeCloseTo(saved.yaw,4);expect(restored.pitch).toBeCloseTo(saved.pitch,4);await capture(page,'water-phone-restored');await expect(book.getByRole('textbox',{name:'What do you notice?',exact:true})).toHaveValue(note);await book.getByRole('button',{name:'Update observation',exact:true}).click();const recaptured=await page.evaluate(()=>(window as any).__toolData._scaleExplorer.observations.find((note:any)=>note.itemId==='water'&&note.detailId===''));expect(recaptured.zoom).toBe(saved.zoom);expect(recaptured.yaw).toBeCloseTo(saved.yaw,12);expect(recaptured.pitch).toBeCloseTo(saved.pitch,12);expect(recaptured.waterView).toBe('structure');
  115 |  const entry=nav(page).getByRole('button',{name:'Explore landmarks',exact:true});await entry.scrollIntoViewIfNeeded();expect((await entry.boundingBox())!.height).toBeGreaterThanOrEqual(44);await entry.tap();await detail(page,'water','oxygen');const next=nav(page).getByRole('button',{name:'Next landmark',exact:true});await next.tap();await detail(page,'water','hydrogens');await next.focus();await next.press('ArrowRight');await detail(page,'water','bond');await next.press('ArrowRight');await detail(page,'water','angle');expectGuides(await scene(page,'water'),'angle','structure');await next.press('ArrowRight');await detail(page,'water','polarity');const polarity=await scene(page,'water');expectGuides(polarity,'polarity','structure');await capture(page,'water-phone-polarity');for(const label of ['Previous landmark','Next landmark','Return to whole view'])expect((await nav(page).getByRole('button',{name:label,exact:true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  116 |  await next.focus();await page.keyboard.press('Escape');await expect(canvas(page)).toHaveAttribute('data-atlas-detail','');await expect(nav(page).getByRole('button',{name:'Explore landmarks',exact:true})).toBeFocused();await settled(page);await page.getByRole('button',{name:'Structure only',exact:true}).tap();await settled(page);expectGuides(await scene(page,'water'),'','guides');
  117 |  const panel=page.locator('.sx-comparison-workbench');if(await panel.getAttribute('open')===null)await panel.locator(':scope > summary').click();await panel.getByRole('combobox',{name:'First thing',exact:true}).selectOption('water');await panel.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('hydrogen');await panel.getByRole('button',{name:'Compare them',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-comparison','water:hydrogen');await settled(page);await expect(nav(page)).toHaveCount(0);const compared=await scene(page,'water');expect(compared.comparisonRatio).toBeCloseTo(2.75e-10/1.06e-10,8);expect(compared.dimension).toBe('x');expect(compared.bodyReference).toBeCloseTo(1,8);expect(compared.rulerReference).toBeCloseTo(1,8);expect(compared.meshes).toEqual(initial.meshes);expectGuides(compared,'','structure');await capture(page,'water-hydrogen-comparison');
  118 |  save('water-phone-notebook-comparison',{initial,structure,saved,before,restored,recaptured,polarity,compared,...log});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
  119 | });
  120 | 
```