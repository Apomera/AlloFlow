import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';

const source=fs.readFileSync(process.env.SCALE_EIFFEL_SOURCE||'stem_lab/stem_tool_scaleexplorer.js','utf8');
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {", "  window.eiffelChecks={sites:EIFFEL_SITES,route:EIFFEL_ROUTE,profile:EIFFEL_PROFILE,profileValue:eiffelProfileValue,point:eiffelPoint,view:eiffelRouteView,index:eiffelRouteIndex,number:eiffelRouteNumber,height:eiffelHeight,heightIndex:eiffelHeightIndex,rail:eiffelRailAt,details:atlasDetails,notes:readObservations,drafts:readObservationDrafts,backup:notebookBackup,parse:readNotebookBackup,items:ITEMS,limit:inspectionLimit};\n  window.StemLab.registerTool('scaleExplorer', {"),sandbox);
const e=sandbox.window.eiffelChecks,plain=value=>JSON.parse(JSON.stringify(value));
const ids=['foundations','arches','first-floor','lifts','second-floor','lattice','summit','antenna'];
const meters=[2,30,57,83,115,195,276,330];
const details=()=>e.details('eiffel',(_,fallback)=>fallback);
const T=createRequire(import.meta.url)(path.resolve('vendor/three-r128/three.min.js'));

function model(){
  const resources=new Set(),context={T,EIFFEL_SITES:e.sites,EIFFEL_PROFILE:e.profile,eiffelHeight:e.height,eiffelHeightIndex:e.heightIndex,eiffelProfileValue:e.profileValue,eiffelRailAt:e.rail,track:value=>(resources.add(value),value)};
  context.sphere=context.track(new T.SphereGeometry(.5,24,16));context.unitBox=context.track(new T.BoxGeometry(1,1,1));
  context.material=(color,options)=>{const m=context.track(new T.MeshStandardMaterial(Object.assign({color,roughness:.78,metalness:0},options||{})));m.color.convertSRGBToLinear();m.emissive.convertSRGBToLinear();return m;};
  context.mesh=(g,geo,mat,x,y,z,sx,sy,sz)=>{const m=new T.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);m.scale.set(sx||1,sy||sx||1,sz||sx||1);g.add(m);return m;};
  context.ball=(g,mat,x,y,z,sx,sy,sz)=>context.mesh(g,context.sphere,mat,x,y,z,sx,sy,sz);
  context.rod=(g,a,b,r,mat)=>{const av=new T.Vector3(...a),bv=new T.Vector3(...b),mid=av.clone().add(bv).multiplyScalar(.5);const m=context.mesh(g,context.track(new T.CylinderGeometry(r,r,av.distanceTo(bv),8,1)),mat,...mid.toArray());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());return m;};
  context.tube=(g,points,radius,mat)=>context.mesh(g,context.track(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(16,points.length*4),radius,10,false)),mat);
  const start=source.indexOf('  function eiffelModel(g)'),end=source.indexOf('    function model(item)',start);
  if(start<0||end<=start)throw Error('Missing standalone Eiffel Tower renderer');
  vm.runInNewContext(source.slice(start,end),context);const g=new T.Group();context.eiffelModel(g);g.updateMatrixWorld(true);
  return {g,tower:g.userData.eiffel,resources,paint:context.eiffelPaint,plaza:context.buildEiffelPlaza};
}
const visible=object=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;};
const identities=tower=>tower.meshes.map(m=>[m.geometry.uuid,Array.isArray(m.material)?m.material.map(v=>v.uuid):m.material.uuid]);
function cost(g){let drawables=0,triangles=0;g.traverse(m=>{if(m.isMesh){drawables++;triangles+=(m.geometry.index?m.geometry.index.count:m.geometry.attributes.position.count)/3;}});return {drawables,triangles};}
function taggedBounds(g,tower,id){const box=new T.Box3(),point=new T.Vector3();for(const mesh of tower.meshes.filter(m=>m.userData.eiffelDetailId===id)){const positions=mesh.geometry.attributes.position;for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i);mesh.localToWorld(point);g.worldToLocal(point);box.expandByPoint(point);}}return box;}

describe('Scale Explorer Eiffel Tower journey',()=>{
  it('provides eight cited native landmarks and every canonical metre through the 330 m antenna',()=>{
    expect(plain(e.route)).toEqual(ids);const all=details();expect(all).toHaveLength(339);expect(new Set(all.map(d=>d.id)).size).toBe(339);
    expect(ids.map(id=>e.point(id).meters)).toEqual(meters);
    for(const d of all){expect(d.eiffelSite).toBe(true);expect(d.marker).toBe(false);expect(d.source).toMatch(/^https:\/\//);expect(d.at.every(Number.isFinite)).toBe(true);expect(Math.hypot(...d.view)).toBeCloseTo(1,9);expect(d.zoom).toBeGreaterThanOrEqual(1);expect(d.zoom).toBeLessThanOrEqual(16);}
    for(let n=0;n<=330;n++){const d=all.find(d=>d.id==='tower-'+n);expect(d).toBeDefined();expect(d.at[1]).toBeCloseTo(n/330-.5,9);expect(e.point(d.id).meters).toBe(n);}
    expect(e.items.find(i=>i.id==='eiffel')).toMatchObject({size:330,dim:'tall'});expect(e.limit('eiffel')).toBe(16);
  });

  it('rejects malformed saved heights and navigation inputs without coercion',()=>{
    expect([0,57.4,57.5,330,999,-50].map(e.height)).toEqual([0,57,58,330,330,0]);expect([null,undefined,'195',NaN,Infinity,{},[]].map(e.height)).toEqual(Array(7).fill(0));
    for(let n=0;n<=330;n++)expect(e.heightIndex('tower-'+n)).toBe(n);
    const invalid=['tower-00','tower-0195','tower-331','tower--1','tower-2.0','tower-2.5','tower-195 ','TOWER-195','tower-1e2','tower-1000',null,{},195];
    expect(invalid.map(e.heightIndex)).toEqual(Array(invalid.length).fill(null));
    expect([0,1,2.4,2.5,8,100].map(e.number)).toEqual([1,1,2,3,8,8]);expect([null,undefined,'8',NaN,Infinity,{},[]].map(e.number)).toEqual(Array(7).fill(1));
    expect(ids.map(e.index)).toEqual([1,2,3,4,5,6,7,8]);expect(['ANTENNA','antenna ','tower-195',null,{},8].map(e.index)).toEqual(Array(6).fill(0));expect(e.point('tower-331')).toBeNull();
  });

  it('returns detached cameras and follows the inclined lower leg and central upper lift shaft',()=>{
    const original=plain(e.sites),views=ids.map((_,i)=>e.view(i+1));expect(new Set(views.map(v=>v.at.join(','))).size).toBe(8);
    views.forEach(v=>{v.at[1]=99;v.view[0]=99;});const all=details();all.find(d=>d.id==='tower-195').at[1]=99;
    expect(plain(e.sites)).toEqual(original);expect(e.view(4).at[1]).not.toBe(99);expect(details().find(d=>d.id==='tower-195').at[1]).toBeCloseTo(195/330-.5,9);
    for(let n=0;n<=330;n++){const p=e.rail(n);expect(p).toHaveLength(3);expect(p.every(Number.isFinite)).toBe(true);expect(p[1]).toBeCloseTo(n/330-.5,9);if(n<=115){expect(p[0]).toBeCloseTo(e.profileValue(n,'radius')/330,9);expect(p[2]).toBeCloseTo(p[0],9);}else expect([p[0],p[2]]).toEqual([0,0]);}
    expect(e.rail(0)[0]).toBeGreaterThan(e.rail(57)[0]);expect(e.rail(57)[0]).toBeGreaterThan(e.rail(115)[0]);
    expect(e.profileValue(0,'radius')).toBeCloseTo(57.5,9);expect(e.profileValue(57,'radius')).toBeCloseTo(28.8,9);expect(e.profileValue(115,'radius')).toBeCloseTo(15.8,9);
  });

  it('round-trips exact evening and native observations with the existing notebook fields',()=>{
    const raw=[{itemId:'eiffel',detailId:'tower-195',zoom:11.5,yaw:.73,pitch:-.22,sunAngle:160,note:'Warm lighting reveals the upper lattice.'},{itemId:'eiffel',detailId:'arches',zoom:13.2,yaw:-.4,pitch:.3,sunAngle:45,note:'The open arches span the legs.'},{itemId:'eiffel',detailId:'tower-0195',zoom:8},{itemId:'eiffel',detailId:'tower-331',zoom:8}];
    const notes=plain(e.notes(raw));expect(notes).toHaveLength(2);for(let i=0;i<2;i++)expect(notes[i]).toMatchObject({...raw[i],size:330});
    const parsed=e.parse(e.backup({observations:notes}));expect(parsed.error).toBeUndefined();expect(plain(parsed.notebook.observations)).toEqual(notes);
    expect(plain(e.drafts({'eiffel:tower-195':'Upper lattice.','eiffel:arches':'Open arches.','eiffel:tower-0195':'Invalid.'}))).toEqual({'eiffel:tower-195':'Upper lattice.','eiffel:arches':'Open arches.'});
    const bounded=plain(e.notes([{itemId:'eiffel',detailId:'tower-0',zoom:999},{itemId:'eiffel',detailId:'tower-330',zoom:-1}]));expect(bounded.map(n=>n.zoom)).toEqual([16,1]);
  });

  it('builds the 125 m square footprint, separate floor heights and eight actual pickable features',()=>{
    const {g,tower}=model();expect(g.userData).toMatchObject({dimension:'y',extent:1,measureCenter:0});expect(tower.cabin).toBeDefined();
    for(const id of ids)expect(tower.meshes.some(m=>m.userData.eiffelDetailId===id),id).toBe(true);
    const bounds=new T.Box3().setFromObject(g);expect(bounds.min.y).toBeCloseTo(-.5,5);expect(bounds.max.y).toBeCloseTo(.5,5);expect((bounds.max.x-bounds.min.x)*330).toBeCloseTo(125,0);expect((bounds.max.z-bounds.min.z)*330).toBeCloseTo(125,0);
    for(const [id,height] of [['first-floor',57],['second-floor',115],['summit',276]]){const b=taggedBounds(g,tower,id),level=height/330-.5;expect(b.min.y).toBeLessThanOrEqual(level+.005);expect(b.max.y).toBeGreaterThanOrEqual(level-.005);
      const deck=tower.meshes.find(m=>m.userData.eiffelDetailId===id&&m.name==='open center perimeter deck '+height+' m');expect(deck).toBeDefined();const deckBounds=new T.Box3().setFromObject(deck);expect((deckBounds.max.y+.5)*330).toBeCloseTo(height,3);expect((deckBounds.min.y+.5)*330).toBeCloseTo(height-.9,3);
    }
    expect(tower.stats).toMatchObject({heightMeters:330,reference:'ground-to-antenna',baseWidthMeters:125,platformMeters:[57,115,276]});const actual=cost(g);expect(actual.drawables).toBeLessThan(50);expect(actual.triangles).toBeLessThan(140000);expect(tower.stats.drawables).toBe(actual.drawables);expect(tower.stats.triangles).toBe(actual.triangles);
    let plaza=false;g.traverse(o=>{if(o.userData.eiffelPlaza)plaza=true;});expect(plaza).toBe(false);
  });

  it('keeps all indexed surfaces finite, normalised and safe for WebGL 1',()=>{
    const {g,resources}=model(),geometries=new Set(),materials=new Set();g.traverse(m=>{if(m.geometry)geometries.add(m.geometry);if(m.material)(Array.isArray(m.material)?m.material:[m.material]).forEach(v=>materials.add(v));});
    for(const mat of materials)expect(resources.has(mat)).toBe(true);
    for(const geo of geometries){expect(resources.has(geo)).toBe(true);expect(geo.index).toBeDefined();expect(geo.index.array.BYTES_PER_ELEMENT).toBe(2);const a=geo.attributes.position,n=geo.attributes.normal;expect(a.count).toBeGreaterThan(0);expect(a.count).toBeLessThan(65536);expect(n).toBeDefined();
      for(let i=0;i<a.count;i++){if(!Number.isFinite(a.getX(i)+a.getY(i)+a.getZ(i)))throw Error('Invalid tower position');if(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)>.001)throw Error('Invalid tower normal');}
      for(const index of geo.index.array)if(index>=a.count)throw Error('Tower index exceeds its vertex buffer');
    }
  });

  it('moves the cabin through valid lift heights while retaining all GPU allocations and the measured tower',()=>{
    const {g,tower,resources,paint}=model(),count=resources.size,uuids=identities(tower),buffers=tower.meshes.map(m=>[m.geometry.attributes.position.array,m.geometry.attributes.normal.array]);
    for(const n of [0,2,30,57,83,115,195,276]){paint(tower,'tower-'+n,45);g.updateMatrixWorld(true);expect(visible(tower.cabin)).toBe(true);expect(tower.cabin.position.toArray()).toEqual(e.rail(n));}
    for(const n of [277,300,312,330]){paint(tower,'tower-'+n,45);expect(visible(tower.cabin)).toBe(false);}
    const lamps=tower.meshes.filter(m=>m.material.userData.eiffelLamp);expect(lamps.length).toBeGreaterThan(0);
    paint(tower,'tower-195',45);const daylight=lamps.map(m=>m.material.emissiveIntensity);
    paint(tower,'tower-195',160);expect(tower.night).toBe(true);lamps.forEach((m,i)=>expect(m.material.emissiveIntensity).toBeGreaterThan(daylight[i]));
    paint(tower,'tower-195',45);expect(tower.night).toBe(false);expect(lamps.map(m=>m.material.emissiveIntensity)).toEqual(daylight);
    for(let n=0;n<1000;n++)paint(tower,n%2===0?'tower-'+(n%331):ids[n%8],n%3===0?160:45);
    expect(resources.size).toBe(count);expect(identities(tower)).toEqual(uuids);tower.meshes.forEach((m,i)=>{expect(m.geometry.attributes.position.array).toBe(buffers[i][0]);expect(m.geometry.attributes.normal.array).toBe(buffers[i][1]);});
    paint(tower,'',45);g.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(g);expect(bounds.min.y).toBeCloseTo(-.5,5);expect(bounds.max.y).toBeCloseTo(.5,5);expect(g.userData.extent).toBe(1);
    g.scale.setScalar(3);g.rotation.y=.7;g.updateMatrixWorld(true);expect(g.localToWorld(new T.Vector3(0,.5,0)).distanceTo(g.localToWorld(new T.Vector3(0,-.5,0)))).toBeCloseTo(3,10);
  });

  it('keeps the plaza separate, statically batched and on the tracked WebGL 1 disposal path',()=>{
    const {g,resources,plaza:build}=model(),before=new T.Box3().setFromObject(g),plaza=build();plaza.updateMatrixWorld(true);
    expect(plaza.userData.eiffelPlaza).toBe(true);expect(plaza.parent).toBeNull();expect(new T.Box3().setFromObject(g).equals(before)).toBe(true);
    const human=plaza.userData.human,figure=new T.Box3().setFromObject(human);expect((figure.max.y-figure.min.y)*330).toBeCloseTo(1.7,5);
    expect(cost(plaza).drawables).toBeLessThan(20);
    plaza.traverse(m=>{expect(!!m.isInstancedMesh).toBe(false);if(!m.isMesh)return;const geo=m.geometry,a=geo.attributes.position,n=geo.attributes.normal;expect(resources.has(geo)).toBe(true);expect(geo.index.array.BYTES_PER_ELEMENT).toBe(2);expect(a.count).toBeLessThan(65536);for(let i=0;i<a.count;i++){if(!Number.isFinite(a.getX(i)+a.getY(i)+a.getZ(i)))throw Error('Invalid plaza position');if(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)>.001)throw Error('Invalid plaza normal');}});
    for(const r of resources)if(r.isMaterial){const shader={vertexShader:'#include <common>'+String.fromCharCode(10)+'#include <begin_vertex>',fragmentShader:'#include <common>'+String.fromCharCode(10)+'#include <color_fragment>'};r.onBeforeCompile(shader);expect(shader.vertexShader.includes(String.fromCharCode(92)+'n')).toBe(false);expect(shader.fragmentShader.includes(String.fromCharCode(92)+'n')).toBe(false);}
    let disposed=0;for(const r of resources){r.addEventListener('dispose',()=>disposed++);r.dispose();}expect(disposed).toBe(resources.size);
  });
  it('disposes every retained GPU resource from the composed tower',()=>{const {resources}=model();let disposed=0;for(const r of resources){r.addEventListener('dispose',()=>disposed++);r.dispose();}expect(disposed).toBe(resources.size);});
});
