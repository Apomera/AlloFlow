import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url),T=require(path.resolve('vendor/three-r128/three.min.js'));
const source=fs.readFileSync(process.env.SCALE_LIBERTY_LOADER_SOURCE||process.env.SCALE_LIBERTY_SOURCE||'stem_lab/stem_tool_scaleexplorer.js','utf8');
function extractFunction(text,name){
  const start=text.indexOf('function '+name+'(');if(start<0)throw Error('Missing dedicated Statue of Liberty loader');
  const open=text.indexOf('{',start);let depth=0,quote='',comment='';
  for(let i=open;i<text.length;i++){
    const c=text[i],next=text[i+1];
    if(comment==='line'){if(c==='\n')comment='';continue;}
    if(comment==='block'){if(c==='*'&&next==='/'){comment='';i++;}continue;}
    if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}
    if(c==='/'&&next==='/'){comment='line';i++;continue;}
    if(c==='/'&&next==='*'){comment='block';i++;continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{')depth++;else if(c==='}'&&!--depth)return text.slice(start,i+1);
  }
  throw Error('Unterminated Liberty loader');
}
const loader=extractFunction(source,'loadLibertySurface');
const sculptureIds=['feet','robe','tablet','face','crown','torch','flame'];
function countDisposals(resource){resource.disposals=0;resource.addEventListener('dispose',()=>resource.disposals++);return resource;}
function importedAsset(){
  const scene=new T.Group(),geometry=[],originalMaterials=[],textures=[];
  const texture=countDisposals(new T.Texture());textures.push(texture);
  const copper=countDisposals(new T.MeshStandardMaterial({map:texture})),unused=countDisposals(new T.MeshStandardMaterial());originalMaterials.push(copper,unused);
  for(const [n,id] of ['face','face','tablet','flame'].entries()){
    const geo=countDisposals(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute([0,.1+n*.08,0,.02,.1+n*.08,0,0,.12+n*.08,.01],3));geo.setIndex([0,1,2]);geo.computeVertexNormals();geometry.push(geo);
    const mesh=new T.Mesh(geo,n===0?[copper,unused]:copper);mesh.userData.libertyDetailId=id;scene.add(mesh);
  }
  return {scene,geometry,originalMaterials,textures};
}
function harness(options={}){
  const resources=new Set(),g=new T.Group(),sculpture=new T.Group(),fallback=new T.Group();g.add(sculpture,fallback);
  g.userData.extent=1;g.userData.measureCenter=0;g.userData.dimension='y';g.userData.released=!!options.released;
  const oldMaterial=countDisposals(new T.MeshStandardMaterial()),oldGeometry=countDisposals(new T.BoxGeometry(.1,.1,.1)),oldMesh=new T.Mesh(oldGeometry,oldMaterial);g.add(oldMesh);resources.add(oldMaterial);resources.add(oldGeometry);
  const oldMeshes=[oldMesh],oldMaterials=[oldMesh],oldResources=[oldMaterial,oldGeometry];
  const root=new T.Group();root.add(g);root.userData.model=g;root.userData.resources=oldResources.slice();root.userData.materials=oldMaterials;
  g.userData.liberty={sculpture,fallback,meshes:oldMeshes,status:'idle'};
  let requests=0,url='',receive=null,fail=null,invalidations=0;
  class Loader{load(href,onLoad,_progress,onError){requests++;url=href;receive=onLoad;fail=onError;}}
  const three=Object.assign({},T,{GLTFLoader:options.loaderScript?undefined:Loader});
  const window={StemLab:{loadScriptResilient(){if(options.scriptReject)return Promise.reject(Error('Script failed'));three.GLTFLoader=Loader;return Promise.resolve();}}};
  const context={T:three,window,URL,Promise,Set,disposed:!!options.disposed,atlasAssetBase:'http://127.0.0.1:54391/stem_lab/assets/astronomy/',resources,track:r=>(resources.add(r),r),invalidate(){invalidations++;}};
  context.material=(color,properties)=>{const m=countDisposals(new T.MeshStandardMaterial(Object.assign({color,roughness:.78},properties)));m.color.convertSRGBToLinear();m.emissive.convertSRGBToLinear();resources.add(m);return m;};
  vm.runInNewContext(loader,context);
  if(options.addThrows)sculpture.add=()=>{throw Error('Cannot install asset');};
  return {context,root,g,data:g.userData.liberty,resources,oldMeshes,oldMaterials,oldResources,oldMaterial,oldGeometry,load:()=>context.loadLibertySurface(root),receive:asset=>receive(asset),fail:()=>fail(),pending:async()=>{await Promise.resolve();await Promise.resolve();},get requests(){return requests;},get url(){return url;},get invalidations(){return invalidations;}};
}
function allReleased(asset){for(const r of [...asset.geometry,...asset.originalMaterials,...asset.textures])expect(r.disposals).toBe(1);}

describe('Scale Explorer Statue of Liberty asset lifecycle',()=>{
  it('loads the local scan into its own group and gives each landmark a distinct tracked material',async()=>{
    const h=harness(),asset=importedAsset(),promise=h.load();await h.pending();
    expect(h.url).toBe('http://127.0.0.1:54391/stem_lab/assets/scale-explorer/liberty/liberty-sculpture.glb');h.receive(asset);expect(await promise).toBe(true);
    expect(h.data.status).toBe('ready');expect(h.g.userData.surfaceReady).toBe(true);expect(h.data.fallback.visible).toBe(false);expect(asset.scene.parent).toBe(h.data.sculpture);
    expect(h.data.meshes.slice(0,1)).toEqual(h.oldMeshes);expect(h.data.scannedMeshes).toEqual(asset.scene.children);
    const [faceA,faceB,tablet,flame]=asset.scene.children;expect(faceA.material).toBe(faceB.material);expect(faceA.material).not.toBe(tablet.material);expect(flame.material).not.toBe(faceA.material);expect(flame.material.metalness).toBe(.75);expect(flame.material.roughness).toBe(.3);
    for(const m of asset.scene.children){expect(m.userData.libertySurface).toBe(true);expect(m.castShadow&&m.receiveShadow).toBe(true);expect(h.resources.has(m.geometry)).toBe(true);expect(h.resources.has(m.material)).toBe(true);expect(h.root.userData.resources).toContain(m.geometry);expect(h.root.userData.resources).toContain(m.material);expect(h.root.userData.materials).toContain(m);expect(m.userData.baseOpacity).toBe(1);}
    for(const r of [...asset.originalMaterials,...asset.textures])expect(r.disposals).toBe(1);for(const geo of asset.geometry)expect(geo.disposals).toBe(0);
  });

  it('caches its load promise and preserves the fixed 93 m frame and restored camera state',async()=>{
    const h=harness(),asset=importedAsset();h.g.position.set(.2,.3,.4);h.g.scale.set(2,2,2);h.root.userData.savedCamera={yaw:.73,pitch:-.22,zoom:17.5};
    const first=h.load();expect(h.load()).toBe(first);await h.pending();expect(h.requests).toBe(1);h.receive(asset);expect(await first).toBe(true);expect(h.load()).toBe(first);
    expect(h.g.userData).toMatchObject({extent:1,measureCenter:0,dimension:'y'});expect(h.g.position.toArray()).toEqual([.2,.3,.4]);expect(h.g.scale.toArray()).toEqual([2,2,2]);expect(h.root.userData.savedCamera).toEqual({yaw:.73,pitch:-.22,zoom:17.5});
  });

  it('adds restrained procedural copper variation to the scan and keeps the gold flame separate',async()=>{
    const h=harness(),asset=importedAsset(),promise=h.load();await h.pending();h.receive(asset);await promise;
    const copper=asset.scene.children[0].material,gold=asset.scene.children[3].material;
    const shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>'};copper.onBeforeCompile(shader);
    expect(copper.customProgramCacheKey()).toBe('liberty-copper-patina-v1');expect(shader.vertexShader).toContain('vLibertyPatinaPoint=position');expect(shader.fragmentShader).toContain('libertyPatinaNoise');expect(shader.fragmentShader).toContain('roughnessFactor=clamp');expect(shader.uniforms.libertyCopper.value.isColor).toBe(true);expect(copper.roughness).toBe(.78);expect(copper.metalness).toBe(.2);expect(gold.onBeforeCompile).toBe(T.Material.prototype.onBeforeCompile);
  });

  it('releases every late mesh, material-array element and texture when the model is evicted or atlas disposed',async()=>{
    for(const mode of ['released','disposed']){
      const h=harness(),asset=importedAsset(),promise=h.load();await h.pending();if(mode==='released')h.g.userData.released=true;else h.context.disposed=true;h.receive(asset);
      expect(await promise).toBe(false);allReleased(asset);expect(h.data.sculpture.children).toHaveLength(0);expect(h.root.userData.resources).toEqual(h.oldResources);expect(h.resources.size).toBe(2);expect(h.invalidations).toBe(0);expect(h.data.fallback.visible).toBe(true);
    }
    for(const options of [{released:true},{disposed:true}]){const h=harness(options);expect(await h.load()).toBe(false);expect(h.requests).toBe(0);}
  });

  it('retains the usable fallback and releases malformed imported geometry without retaining resources',async()=>{
    for(const malformed of ['missing-scene','missing-positions']){
      const h=harness(),asset=importedAsset(),promise=h.load();await h.pending();if(malformed==='missing-scene')h.receive({});else{asset.scene.children[0].geometry.deleteAttribute('position');h.receive(asset);}
      expect(await promise).toBe(false);expect(h.data.status).toBe('failed');expect(h.g.userData.surfaceReady).toBe(false);expect(h.data.fallback.visible).toBe(true);expect(h.root.userData.resources).toEqual(h.oldResources);expect(h.data.sculpture.children).toHaveLength(0);expect(h.invalidations).toBe(1);if(malformed!=='missing-scene')allReleased(asset);
    }
  });

  it('handles network and loader-script failures without rejecting callers or hiding the fallback',async()=>{
    const network=harness(),networkPromise=network.load();await network.pending();network.fail();expect(await networkPromise).toBe(false);expect(network.data.status).toBe('failed');expect(network.data.fallback.visible).toBe(true);
    const script=harness({loaderScript:true,scriptReject:true});expect(await script.load()).toBe(false);expect(script.requests).toBe(0);expect(script.data.status).toBe('failed');expect(script.data.fallback.visible).toBe(true);
    const recovered=harness({loaderScript:true}),asset=importedAsset(),promise=recovered.load();await recovered.pending();recovered.receive(asset);expect(await promise).toBe(true);
  });

  it('rolls back retained references and disposes new resources once if installation fails',async()=>{
    const h=harness({addThrows:true}),asset=importedAsset(),promise=h.load();await h.pending();h.receive(asset);expect(await promise).toBe(false);
    expect(h.data.status).toBe('failed');expect(h.data.meshes).toBe(h.oldMeshes);expect(h.root.userData.materials).toBe(h.oldMaterials);expect(h.root.userData.resources).toEqual(h.oldResources);expect(h.resources.size).toBe(2);expect(h.oldMaterial.disposals+h.oldGeometry.disposals).toBe(0);allReleased(asset);expect(h.data.sculpture.children).toHaveLength(0);expect(h.data.fallback.visible).toBe(true);
  });

  it('ships a credited ordinary GLB with safe native triangle regions and the fixed feet-to-flame scale',()=>{
    const assetPath=process.env.SCALE_LIBERTY_ASSET||'stem_lab/assets/scale-explorer/liberty/liberty-sculpture.glb',file=fs.readFileSync(assetPath);
    expect(file.readUInt32LE(0)).toBe(0x46546c67);expect(file.readUInt32LE(4)).toBe(2);expect(file.readUInt32LE(8)).toBe(file.length);expect(file.length).toBeLessThan(7000000);
    const jsonSize=file.readUInt32LE(12);expect(file.readUInt32LE(16)).toBe(0x4e4f534a);const gltf=JSON.parse(file.subarray(20,20+jsonSize).toString());const binOffset=20+jsonSize;expect(file.readUInt32LE(binOffset+4)).toBe(0x004e4942);const binary=file.subarray(binOffset+8);
    expect(gltf.extensionsRequired||[]).toHaveLength(0);expect(gltf.images||[]).toHaveLength(0);expect(gltf.buffers).toHaveLength(1);expect(gltf.buffers[0].uri).toBeUndefined();expect(gltf.buffers[0].byteLength).toBeLessThanOrEqual(binary.length);
    const noticePath=path.join(path.dirname(assetPath),'NOTICE.md'),notice=fs.readFileSync(noticePath,'utf8');expect(notice).toContain('Jerry Fisher');expect(notice).toContain('https://creativecommons.org/licenses/by/4.0/');expect(notice).toContain('19th-century bronze model');expect(notice).toMatch(/simplif|recolor|scale/i);expect(notice).toContain('e9c789977604980d410e30b95e02208ca6e46d053f44bc0f5c5030877eaa5fe8');
    const manifest=JSON.parse(fs.readFileSync(path.join(path.dirname(assetPath),'manifest.json'),'utf8'));expect(JSON.stringify(manifest)).toContain(crypto.createHash('sha256').update(file).digest('hex'));
    const ids=new Set();let low=Infinity,high=-Infinity,triangles=0;
    function values(index){const a=gltf.accessors[index],v=gltf.bufferViews[a.bufferView],width=a.type==='VEC3'?3:1,bytes=a.componentType===5123?2:4,stride=v.byteStride||width*bytes,offset=(v.byteOffset||0)+(a.byteOffset||0);const out=[];for(let n=0;n<a.count;n++)for(let c=0;c<width;c++)out.push(a.componentType===5126?binary.readFloatLE(offset+n*stride+c*bytes):a.componentType===5123?binary.readUInt16LE(offset+n*stride+c*bytes):binary.readUInt32LE(offset+n*stride+c*bytes));return {a,out};}
    for(const node of gltf.nodes){if(node.matrix)expect(node.matrix).toEqual([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);expect(node.translation||[0,0,0]).toEqual([0,0,0]);expect(node.scale||[1,1,1]).toEqual([1,1,1]);expect(node.rotation||[0,0,0,1]).toEqual([0,0,0,1]);}
    for(const mesh of gltf.meshes){const id=mesh.extras&&mesh.extras.libertyDetailId;expect(sculptureIds).toContain(id);ids.add(id);for(const primitive of mesh.primitives){expect(primitive.mode===undefined||primitive.mode===4).toBe(true);const positions=values(primitive.attributes.POSITION),normals=values(primitive.attributes.NORMAL),indices=values(primitive.indices);expect(positions.a.componentType).toBe(5126);expect(positions.a.count).toBeLessThan(65536);expect(normals.a.count).toBe(positions.a.count);expect(indices.a.componentType).toBe(5123);expect(indices.a.count%3).toBe(0);triangles+=indices.a.count/3;
      for(let n=0;n<positions.a.count;n++){const p=positions.out.slice(n*3,n*3+3),normal=normals.out.slice(n*3,n*3+3);if(!p.every(Number.isFinite)||!normal.every(Number.isFinite))throw Error('Non-finite Liberty geometry');if(Math.abs(Math.hypot(...normal)-1)>.005)throw Error('Invalid Liberty normal');low=Math.min(low,p[1]);high=Math.max(high,p[1]);}for(const index of indices.out)if(index>=positions.a.count)throw Error('Liberty index exceeds vertex buffer');
    }}
    expect(Array.from(ids).sort()).toEqual(sculptureIds.slice().sort());expect(low).toBeCloseTo(46.94/93-.5,4);expect(high).toBeCloseTo(.5,5);expect(triangles).toBeGreaterThan(80000);expect(triangles).toBeLessThan(400000);
  });
});
