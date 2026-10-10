import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';

const report=process.env.DINO_FRILL_REPORT_DIR||'reports/dinolab-3d-frill-collar';
test.describe.configure({timeout:720_000});
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,
 probes:"var now=performance.now.bind(performance);window.__frillTime=10000;performance.now=function(){return window.__frillTime==null?now():window.__frillTime;};var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__frillScene=s;window.__frillCamera=c;window.__frillRenderer=r;return render(s,c);};return r;};"});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});
test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function settle(page){await page.waitForFunction(()=>{const w=window as any,h=w.__glCanvas();return !!h&&!h.gl.isContextLost()&&w.__frillRenderer?.domElement===h.el&&h.el.isConnected;});await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));}
async function controls(page){const d=page.locator('.dinolab-3d-controls-disclosure');if(!await d.evaluate(e=>(e as HTMLDetailsElement).open))await d.locator(':scope > summary').click();}
async function snapshot(page,withSkin=true){return page.evaluate(async withSkin=>{
 const w=window as any,T=w.THREE,scene=w.__frillScene,camera=w.__frillCamera,renderer=w.__frillRenderer,model=scene.getObjectByName('dinolab-specimen');
 const rig=model?.getObjectByName('dinolab-connected-cranial-motion'),head=model?.getObjectByName('continuous-cranial-surface'),body=model?.getObjectByName('continuous-torso');
 if(!model)throw Error('Actual specimen missing.');if(withSkin&&!rig)throw Error('Actual Life cranial rig missing.');scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
 const parts=[];model.traverse(part=>{if(part.isMesh&&part.userData.dinoFeature==='frill')parts.push(part);});if(parts.length!==1)throw Error('Expected one native frill.');
 const frill=parts[0],g=frill.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,index=g.index?.array;
 if(!p||!n||!uv||!index)throw Error('Native solid frill buffers missing.');
 let invalid=0,outside=0,minNormal=Infinity,maxNormal=0;for(const attribute of [p,n,uv])for(const value of attribute.array)if(!Number.isFinite(value))invalid++;
 for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(frill.matrixWorld).project(camera);if(!v.toArray().every(Number.isFinite))invalid++;if(Math.max(Math.abs(v.x),Math.abs(v.y),Math.abs(v.z))>1.001)outside++;const len=new T.Vector3().fromBufferAttribute(n,i).length();minNormal=Math.min(minNormal,len);maxNormal=Math.max(maxNormal,len);}
 const axis=new T.Vector3(1,-.6,0).normalize(),depth=(ring,side)=>new T.Vector3().fromBufferAttribute(p,1+ring*64+side).sub(new T.Vector3().fromBufferAttribute(p,578+ring*64+side)).dot(axis);
 const sheet=depth(2,16),collar=depth(5,16),root=depth(5,48),rim=[];for(let side=0;side<64;side++)rim.push(new T.Vector3().fromBufferAttribute(p,1+8*64+side).toArray());
 // Recover the established mid-surface plane from opposite face centers. The
 // outline check is independent of the collar's interior depth callback.
 const center=new T.Vector3().fromBufferAttribute(p,0).add(new T.Vector3().fromBufferAttribute(p,577)).multiplyScalar(.5);
 const height=(rim[16][1]-rim[48][1])/1.455,width=(rim[0][2]-center.z)/1.025;center.x-=height*.024;const bow=rim[0][0]-center.x;
 let outlineError=0;for(let side=0;side<64;side++){const angle=side/64*Math.PI*2,edge=1+.025*Math.cos(angle*14),y=Math.max(-height*.48,Math.sin(angle)*height*edge),expected=new T.Vector3(center.x+y*.6+bow,center.y+y,center.z+Math.cos(angle)*width*edge);outlineError=Math.max(outlineError,expected.distanceTo(new T.Vector3().fromArray(rim[side]))/height);}
 const ancestry=[];for(let owner=frill.parent;owner;owner=owner.parent)ancestry.push({uuid:owner.uuid,name:owner.name});
 const atlas:any={};
 if(withSkin){
  if(!head||!body)throw Error('Actual Life body or head skin mesh missing.');
  const surfaces=[['body',body],['head',head],['frill',frill]];
  atlas.materials=surfaces.map(([name,part]:any)=>({name,uuid:part.material.uuid,mapping:part.material.userData.dinoSkinMapping,key:part.material.customProgramCacheKey(),maps:['map','bumpMap','roughnessMap'].map(key=>part.material[key]?.uuid)}));
  atlas.channels=await Promise.all(['map','bumpMap','roughnessMap'].map(async key=>{
   const texture=body.material[key],image=texture?.image;if(!texture||!image||!image.getContext)throw Error('Live canvas texture missing: '+key);
   const pixels=image.getContext('2d').getImageData(0,0,image.width,image.height).data;let alphaBad=0,min=255,max=0,seamX=0,seamY=0;
   for(let i=0;i<pixels.length;i+=4){for(let channel=0;channel<3;channel++){min=Math.min(min,pixels[i+channel]);max=Math.max(max,pixels[i+channel]);}if(pixels[i+3]!==255)alphaBad++;}
   for(let y=0;y<image.height;y++)for(let channel=0;channel<4;channel++)if(pixels[(y*image.width)*4+channel]!==pixels[(y*image.width+image.width-1)*4+channel])seamX++;
   for(let x=0;x<image.width;x++)for(let channel=0;channel<4;channel++)if(pixels[x*4+channel]!==pixels[((image.height-1)*image.width+x)*4+channel])seamY++;
   const digest=await crypto.subtle.digest('SHA-256',pixels),rgbaSha256=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
   const gpu=renderer.properties.get(texture).__webglTexture;
   return {key,uuid:texture.uuid,width:image.width,height:image.height,style:texture.userData.dinoMicrotexture,channel:texture.userData.channel,
    wrapS:texture.wrapS,wrapT:texture.wrapT,minFilter:texture.minFilter,magFilter:texture.magFilter,generateMipmaps:texture.generateMipmaps,encoding:texture.encoding,
    uploaded:!!gpu&&renderer.getContext().isTexture(gpu),rgbaSha256,alphaBad,min,max,seamX,seamY};
  }));
  atlas.constants={repeat:T.RepeatWrapping,min:T.LinearMipmapLinearFilter,mag:T.LinearFilter,srgb:T.sRGBEncoding,linear:T.LinearEncoding};
 }
 return {model:model.uuid,rig:rig?.uuid??null,rigMatrix:rig?.matrixWorld.elements.slice()??null,pivot:rig?.userData.pivot?.slice()??null,rootCount:rig?.userData.rootCount??null,head:head?.uuid,body:body?.uuid,
  frill:{mesh:frill.uuid,geometry:g.uuid,material:frill.material.uuid,parent:frill.parent.uuid,ancestry,metadata:{...g.userData.dinoDisplayShell},vertices:p.count,triangles:index.length/3,
   invalid,outside,minNormal,maxNormal,sheet,collar,root,collarOverSheet:collar/sheet,rootOverCollar:root/collar,outlineError,rim,center:center.toArray(),height,width,bow,
   position:frill.position.toArray(),quaternion:frill.quaternion.toArray(),scale:frill.scale.toArray(),world:frill.matrixWorld.elements.slice(),relativeToHead:head?new T.Matrix4().copy(head.matrixWorld).invert().multiply(frill.matrixWorld).elements.slice():null,
   opacity:frill.material.opacity,transparent:frill.material.transparent,depthWrite:frill.material.depthWrite},atlas,memory:{...renderer.info.memory},errors:w.__events.errors,lost:w.__glLive().lost,
  shaderFailures:renderer.info.programs.filter(program=>program.diagnostics&&program.diagnostics.runnable===false).length};
 },withSkin);}
function check(s,withSkin=true){
 expect(s.errors).toEqual([]);expect(s.lost).toBe(false);expect(s.shaderFailures).toBe(0);if(withSkin){expect(s.rig).toBeTruthy();expect(s.pivot).toHaveLength(3);}
 const f=s.frill;expect(f.metadata).toMatchObject({feature:'frill',closed:true,roundedRim:true,thicknessIsInterpretive:true,depthProfile:'solid-caudal-collar'});
 expect(f.vertices).toBe(1090);expect(f.triangles).toBe(2176);expect(f.invalid).toBe(0);expect(f.outside).toBe(0);expect(f.minNormal).toBeCloseTo(1,5);expect(f.maxNormal).toBeCloseTo(1,5);
 expect(f.collarOverSheet).toBeGreaterThan(1.8);expect(f.collarOverSheet).toBeLessThan(2.4);expect(f.rootOverCollar).toBeLessThan(.55);expect(f.sheet).toBeGreaterThan(0);expect(f.outlineError).toBeLessThan(1e-5);
 if(withSkin){expect(f.parent).toBe(s.rig);expect(f.ancestry.some(owner=>owner.uuid===s.rig&&owner.name==='dinolab-connected-cranial-motion')).toBe(true);}else{expect(f.parent).toBe(s.model);expect(f.ancestry[0]).toEqual({uuid:s.model,name:'dinolab-specimen'});}
 if(withSkin){
  expect(s.atlas.materials).toHaveLength(3);for(const mat of s.atlas.materials){expect(mat.mapping).toBe(true);expect(mat.key).toBe('dinolab-specimen-skin-mottling-v1');expect(mat.maps).toEqual(s.atlas.materials[0].maps);}
  expect(new Set(s.atlas.channels.map(channel=>channel.uuid)).size).toBe(3);expect(new Set(s.atlas.channels.map(channel=>channel.rgbaSha256)).size).toBe(3);
  for(const channel of s.atlas.channels){expect(channel.width).toBe(512);expect(channel.height).toBe(256);expect(channel.style).toBe('fine-scales');expect(channel.uploaded).toBe(true);expect(channel.alphaBad+channel.seamX+channel.seamY).toBe(0);expect(channel.max).toBeGreaterThan(channel.min);expect(channel.rgbaSha256).toMatch(/^[a-f0-9]{64}$/);expect(channel.wrapS).toBe(s.atlas.constants.repeat);expect(channel.wrapT).toBe(s.atlas.constants.repeat);expect(channel.minFilter).toBe(s.atlas.constants.min);expect(channel.magFilter).toBe(s.atlas.constants.mag);expect(channel.generateMipmaps).toBe(true);expect(channel.encoding).toBe(channel.key==='map'?s.atlas.constants.srgb:s.atlas.constants.linear);}
 }
}
function identities(s){const f=s.frill;return [s.model,s.rig,s.pivot,s.rootCount,f.mesh,f.geometry,f.material,f.parent,f.position,f.quaternion,f.scale,f.rim];}
async function capture(page,name){await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+name+'.png'});}

test('Triceratops live collar and shared skin atlas survive native controls and cranial motion',async({page})=>{
 await page.setViewportSize({width:1180,height:920});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{dinoLab:{tab:'field3d',field3dSelected:'triceratops',field3dReconstructionMode:'evidence',field3dAutoRotate:false,field3dOrientationDismissed:true,field3dWorkflowStarted:false,field3dShowSkeleton:false,field3dShowBody:true,field3dShowHuman:false,field3dShowEvidence:false,field3dBodyOpacity:100}},undefined,{expectCanvas:false});
 const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {'),end=css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start));await page.addStyleTag({content:css.slice(start,end)});
 await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__frillScene)).toBe(true);
 expect(await page.evaluate(()=>(window as any).__harnessNotes.substitutes)).toEqual(process.env.STEM_GL_SUBSTITUTE?['stem_lab/stem_tool_dinolab.js']:[]);
 await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Life view/}).click();await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();await settle(page);
 const initial=await snapshot(page);check(initial);await capture(page,'triceratops-collar-life');
 await page.getByRole('button',{name:'Study head details',exact:true}).click();await settle(page);const head=await snapshot(page);check(head);await capture(page,'triceratops-collar-head');
 await controls(page);for(const angle of ['Side','Front']){await page.getByRole('button',{name:angle+' camera view',exact:true}).click();await settle(page);check(await snapshot(page));await capture(page,'triceratops-collar-'+angle.toLowerCase());}
 await page.getByRole('slider',{name:'Body inference opacity',exact:true}).press('Home');await settle(page);const low=await snapshot(page);check(low);expect(identities(low)).toEqual(identities(initial));expect(low.frill.transparent).toBe(true);expect(low.frill.depthWrite).toBe(false);expect(low.frill.opacity).toBeLessThan(1);
 await page.getByRole('slider',{name:'Body inference opacity',exact:true}).press('End');await settle(page);const opaque=await snapshot(page);check(opaque);expect(opaque.frill.geometry).toBe(initial.frill.geometry);expect(opaque.memory).toEqual(initial.memory);expect(opaque.frill.opacity).toBe(1);expect(opaque.frill.depthWrite).toBe(true);
 await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();await settle(page);const fossil=await snapshot(page,false);check(fossil,false);await capture(page,'triceratops-collar-fossil');
 await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Life view/}).click();await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();await settle(page);const restored=await snapshot(page);check(restored);expect(restored.memory).toEqual(initial.memory);expect(restored.frill.rim).toEqual(initial.frill.rim);expect(restored.pivot).toEqual(initial.pivot);expect(restored.atlas.channels.map(c=>c.rgbaSha256)).toEqual(initial.atlas.channels.map(c=>c.rgbaSha256));
 await page.locator('.dinolab-3d-canvas').scrollIntoViewIfNeeded();await page.emulateMedia({reducedMotion:'no-preference'});await expect(page.getByRole('button',{name:'Pause motion',exact:true})).toBeEnabled();await settle(page);
 const active=await snapshot(page);check(active);const samples=[];
 for(let step=0;step<12;step++){await page.evaluate(async()=>{(window as any).__frillTime+=50;await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));});const sample=await snapshot(page);check(sample);expect(identities(sample)).toEqual(identities(restored));expect(sample.memory).toEqual(restored.memory);for(let i=0;i<16;i++)expect(Math.abs(sample.frill.relativeToHead[i]-restored.frill.relativeToHead[i])).toBeLessThan(1e-7);samples.push(sample);}
 expect(samples.some(sample=>sample.rigMatrix.some((value,i)=>Math.abs(value-active.rigMatrix[i])>1e-8))).toBe(true);
 await page.emulateMedia({reducedMotion:'reduce'});await settle(page);
 const phones=[];for(const width of [320,390]){await page.setViewportSize({width,height:844});await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();await settle(page);const phone=await snapshot(page);check(phone);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);phones.push({width,snapshot:phone});await capture(page,'triceratops-collar-phone-'+width);}
 const watched=await page.evaluate(()=>{const w=window as any,m=w.__frillScene.getObjectByName('dinolab-specimen'),body=m.getObjectByName('continuous-torso'),items=new Map();m.traverse(part=>{if(part.userData.dinoFeature==='frill')items.set(part.geometry,'frill-geometry');});for(const key of ['map','bumpMap','roughnessMap'])items.set(body.material[key],key);w.__frillDisposal=[];items.forEach((kind,item)=>{const row={kind,uuid:item.uuid,disposed:0};w.__frillDisposal.push(row);item.addEventListener('dispose',()=>row.disposed++);});return items.size;});expect(watched).toBe(4);
 await page.locator('#dinotab-notes').click();await expect.poll(()=>page.evaluate(()=>(window as any).__frillDisposal.every(row=>row.kind==='frill-geometry'?row.disposed===1:row.disposed>=1))).toBe(true);const disposal=await page.evaluate(()=>(window as any).__frillDisposal);expect(disposal.find(row=>row.kind==='frill-geometry').disposed).toBe(1);expect(disposal.filter(row=>row.kind!=='frill-geometry').every(row=>row.disposed>=1)).toBe(true);await expect.poll(async()=>(await harness.glContexts(page)).filter(context=>!context.lost).length).toBe(0);
 fs.writeFileSync(report+'/triceratops-collar-skin-metrics.json',JSON.stringify({initial,head,low,opaque,fossil,restored,active,samples,phones,disposal,contexts:await harness.glContexts(page),
  actualCollarGeometryActivated:true,actualSharedSkinAtlasUploaded:true,actualCranialMotion:true,relativeSkullTransformPreserved:true,nativeNotesTeardown:true},null,2));
});
