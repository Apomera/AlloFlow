import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
test.describe.configure({timeout:240_000});test.use({video:'off',trace:'off'});
const report='reports/dinolab-3d-microtexture';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,
 probes:"window.__microDisposed=[];var dispose=THREE.Texture.prototype.dispose;THREE.Texture.prototype.dispose=function(){if(this.userData&&this.userData.dinoMicrotexture)window.__microDisposed.push(this.uuid);return dispose.call(this);};var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__microScene=s;window.__microCamera=c;window.__microRenderer=r;return render(s,c);};return r;};"});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page,species){
 await page.setViewportSize({width:1180,height:920});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{dinoLab:{tab:'field3d',field3dSelected:species,field3dReconstructionMode:'evidence',field3dAutoRotate:false,field3dOrientationDismissed:true,field3dWorkflowStarted:false,
 field3dShowSkeleton:false,field3dShowBody:true,field3dShowHuman:false,field3dShowEvidence:false,field3dBodyOpacity:100}},undefined,{expectCanvas:false});
 const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {'),end=css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start));
 await page.addStyleTag({content:css.slice(start,end)});await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__microScene)).toBe(true);
 await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();
}
async function inspect(page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,s=w.__microScene,c=w.__microCamera,r=w.__microRenderer,m=s.getObjectByName('dinolab-specimen');
 const textures=new Map(),mapped:any[]=[];let invalid=0,crest=0;
 m.traverse(p=>{if(p.userData.dinoFeature==='crest-feather')crest++;if(p.isMesh&&p.userData.dinoAnatomy&&p.material?.userData.dinoSkinMapping){
  mapped.push(p);for(const key of ['map','bumpMap','roughnessMap']){const tex=p.material[key];if(tex?.userData?.dinoMicrotexture)textures.set(tex.uuid,tex);else invalid++;}
 }});
 function hash(data){let h=2166136261;for(let i=0;i<data.length;i++)h=Math.imul(h^data[i],16777619);return h>>>0;}
 const maps=Array.from(textures.values()).map((tex:any)=>{
  const canvas=tex.image,data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let seam=0,min=255,max=0;
  for(let y=0;y<canvas.height;y++)for(let ch=0;ch<4;ch++)seam=Math.max(seam,Math.abs(data[y*canvas.width*4+ch]-data[(y*canvas.width+canvas.width-1)*4+ch]));
  for(let x=0;x<canvas.width;x++)for(let ch=0;ch<4;ch++)seam=Math.max(seam,Math.abs(data[x*4+ch]-data[((canvas.height-1)*canvas.width+x)*4+ch]));
  for(let i=0;i<data.length;i+=4){min=Math.min(min,data[i]);max=Math.max(max,data[i]);}
  return {id:tex.uuid,channel:tex.userData.channel,style:tex.userData.dinoMicrotexture,width:canvas.width,height:canvas.height,seam,min,max,hash:hash(data),repeat:tex.wrapS===T.RepeatWrapping&&tex.wrapT===T.RepeatWrapping,mipmaps:tex.generateMipmaps&&tex.minFilter===T.LinearMipmapLinearFilter,colorEncoding:tex.encoding===(tex.userData.channel==='color'?T.sRGBEncoding:T.LinearEncoding)};
 });
 const coordinates=mapped.filter(p=>p.userData.dinoRegion==='tail'||p.userData.dinoRegion==='torso').map(p=>hash(p.geometry.attributes.dinoSkinPosition.array));
 return {maps,coordinates,invalid,mapped:mapped.length,crest,errors:w.__events.errors,lost:w.__glLive().lost,shaderFailures:r.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).length};
});}
function check(r){expect(r.errors).toEqual([]);expect(r.invalid).toBe(0);expect(r.lost).toBe(false);expect(r.shaderFailures).toBe(0);expect(r.maps).toHaveLength(3);
 for(const map of r.maps){expect(map.width).toBe(512);expect(map.height).toBe(256);expect(map.seam).toBe(0);expect(map.repeat).toBe(true);expect(map.mipmaps).toBe(true);expect(map.colorEncoding).toBe(true);expect(map.max).toBeGreaterThan(map.min);}
}
for(const species of ['anchiornis','tyrannosaurus','sinosauropteryx','microraptor','triceratops','brachiosaurus'])test(species+' uses coherent close-up microtexture',async({page})=>{
 const shaderErrors:string[]=[];page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL|GL_INVALID/i.test(m.text()))shaderErrors.push(m.text());});
 await mount(page,species);const first=await inspect(page);check(first);
 if(species==='anchiornis'){expect(first.maps[0].style).toBe('fine-grain');expect(first.crest).toBe(13);}
 if(species==='tyrannosaurus')expect(first.maps[0].style).toBe('fine-scales');
 await page.getByRole('button',{name:'Study head details',exact:true}).click();await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-head.png'});
 await page.getByRole('button',{name:'Study body details',exact:true}).click();await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-body.png'});
 if(['sinosauropteryx','microraptor'].includes(species)){await page.getByRole('button',{name:'Study tail details',exact:true}).click();await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-tail.png'});}
 await page.locator('.dinolab-3d-controls-disclosure > summary').click();await page.getByRole('button',{name:'Front camera view',exact:true}).click();const rotated=await inspect(page);check(rotated);
 expect(rotated.coordinates).toEqual(first.coordinates);expect(rotated.maps.map(t=>t.hash)).toEqual(first.maps.map(t=>t.hash));
 if(['anchiornis','tyrannosaurus'].includes(species)){
  await page.getByRole('button',{name:'Study head details',exact:true}).click();await page.getByRole('button',{name:'Side camera view',exact:true}).click();await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('.dinolab-3d-shell').screenshot({path:report+'/'+species+'-mobile.png'});
  const atlas=await page.evaluate(()=>{const w=window as any,m=w.__microScene.getObjectByName('dinolab-specimen'),body=m.children.find(p=>p.userData.dinoRegion==='torso'),canvas=document.createElement('canvas');canvas.width=1536;canvas.height=256;const ctx=canvas.getContext('2d')!;['map','bumpMap','roughnessMap'].forEach((key,i)=>ctx.drawImage(body.material[key].image,i*512,0));return canvas.toDataURL('image/png').split(',')[1];});
  fs.writeFileSync(report+'/'+species+'-maps.png',Buffer.from(atlas,'base64'));
  await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();const fossil=await inspect(page);expect(fossil.maps).toHaveLength(0);expect(fossil.errors).toEqual([]);
  const disposed=await page.evaluate(()=>(window as any).__microDisposed);for(const map of first.maps)expect(disposed).toContain(map.id);
  await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Life view/}).click();const back=await inspect(page);check(back);expect(back.maps.map(t=>t.hash)).toEqual(first.maps.map(t=>t.hash));
  expect(back.maps.map(t=>t.id)).not.toEqual(first.maps.map(t=>t.id));
 }
 expect(shaderErrors).toEqual([]);fs.writeFileSync(report+'/'+species+'-metrics.json',JSON.stringify(first,null,2));
});
