import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';

const source=fs.readFileSync(process.env.SCALE_PYRAMID_SOURCE||'stem_lab/stem_tool_scaleexplorer.js','utf8');
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {", "  window.pyramidChecks={sites:PYRAMID_SITES,route:PYRAMID_ROUTE,point:pyramidPoint,view:pyramidRouteView,index:pyramidRouteIndex,number:pyramidRouteNumber,details:atlasDetails,notes:readObservations,drafts:readObservationDrafts,backup:notebookBackup,parse:readNotebookBackup,items:ITEMS,limit:inspectionLimit};\n  window.StemLab.registerTool('scaleExplorer', {"),sandbox);
const p=sandbox.window.pyramidChecks,plain=value=>JSON.parse(JSON.stringify(value));
const ids=['base','casing','entrance','descending','subterranean','ascending','gallery','queen-chamber','king-chamber'];
const details=()=>p.details('pyramid',(_,fallback)=>fallback);
const T=createRequire(import.meta.url)(path.resolve('vendor/three-r128/three.min.js'));

function model(){
  const resources=new Set(),context={T,PYRAMID_SITES:p.sites,clamp:(v,min,max)=>Math.max(min,Math.min(max,v)),track:value=>(resources.add(value),value)};
  context.sphere=context.track(new T.SphereGeometry(.5,24,16));context.unitBox=context.track(new T.BoxGeometry(1,1,1));
  context.material=(color,options)=>{const m=context.track(new T.MeshStandardMaterial(Object.assign({color,roughness:.78,metalness:0},options||{})));m.color.convertSRGBToLinear();m.emissive.convertSRGBToLinear();return m;};
  context.mesh=(g,geo,mat,x,y,z,sx,sy,sz)=>{const m=new T.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);m.scale.set(sx||1,sy||sx||1,sz||sx||1);g.add(m);return m;};
  context.ball=(g,mat,x,y,z,sx,sy,sz)=>context.mesh(g,context.sphere,mat,x,y,z,sx,sy,sz);
  context.rod=(g,a,b,r,mat)=>{const av=new T.Vector3(...a),bv=new T.Vector3(...b),mid=av.clone().add(bv).multiplyScalar(.5);const m=context.mesh(g,context.track(new T.CylinderGeometry(r,r,av.distanceTo(bv),8,1)),mat,...mid.toArray());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());return m;};
  context.tube=(g,points,radius,mat)=>context.mesh(g,context.track(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),Math.max(16,points.length*4),radius,10,false)),mat);
  const start=source.indexOf('  function pyramidModel(g)'),end=source.indexOf('    function model(item)',start);
  if(start<0||end<=start)throw Error('Missing standalone Great Pyramid renderer');
  vm.runInNewContext(source.slice(start,end),context);const g=new T.Group();context.pyramidModel(g);g.updateMatrixWorld(true);
  return {g,pyramid:g.userData.pyramid,resources,paint:context.pyramidPaint};
}
const visible=object=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;};
const identities=scene=>scene.meshes.map(m=>[m.geometry.uuid,Array.isArray(m.material)?m.material.map(v=>v.uuid):m.material.uuid]);
function cost(g){let drawables=0,triangles=0;g.traverse(m=>{if(m.isMesh){drawables++;triangles+=(m.geometry.index?m.geometry.index.count:m.geometry.attributes.position.count)/3;}});return {drawables,triangles};}

describe('Scale Explorer Great Pyramid interior study',()=>{
  it('provides nine cited native stops while keeping the catalogue reference on the 230 m base',()=>{
    expect(plain(p.route)).toEqual(ids);const all=details();expect(all).toHaveLength(9);expect(all.map(d=>d.id)).toEqual(ids);
    for(const [n,d] of all.entries()){expect(d.pyramidSite).toBe(true);expect(d.marker).toBe(false);expect(d.cutaway).toBe(n>=3);expect(d.source).toMatch(/^https:\/\//);expect(d.at).toHaveLength(3);expect(d.at.every(Number.isFinite)).toBe(true);expect(Math.hypot(...d.view)).toBeCloseTo(1,9);expect(d.zoom).toBeGreaterThanOrEqual(1);expect(d.zoom).toBeLessThanOrEqual(18);}
    expect(p.items.find(i=>i.id==='pyramid')).toMatchObject({size:230,dim:'wide at the base'});expect(p.limit('pyramid')).toBe(18);
  });

  it('bounds route inputs without coercing malformed values or feature identifiers',()=>{
    expect([0,1,2.4,2.5,9,99,-10].map(p.number)).toEqual([1,1,2,3,9,9,1]);expect([null,undefined,'9',NaN,Infinity,{},[]].map(p.number)).toEqual(Array(7).fill(1));
    expect(ids.map(p.index)).toEqual([1,2,3,4,5,6,7,8,9]);expect(['gallery ','GALLERY','queen_chamber',null,{},7].map(p.index)).toEqual(Array(6).fill(0));expect(p.point('unknown-room')).toBeNull();
  });

  it('returns detached cameras so consumers cannot alter later views or original route coordinates',()=>{
    const original=plain(p.sites),views=ids.map((_,n)=>p.view(n+1));expect(new Set(views.map(v=>v.at.join(','))).size).toBe(9);
    for(const [n,v] of views.entries()){expect(v.n).toBe(n+1);expect(v.id).toBe(ids[n]);expect(Math.hypot(...v.view)).toBeCloseTo(1,9);v.at[1]=99;v.view[0]=99;}
    const all=details();all.find(d=>d.id==='gallery').at[1]=99;const direct=p.point('king-chamber');direct.at[0]=99;direct.view[2]=99;
    expect(plain(p.sites)).toEqual(original);expect(p.point('king-chamber').at[0]).not.toBe(99);expect(details().find(d=>d.id==='gallery').at[1]).not.toBe(99);
  });

  it('round-trips an interior and closed exterior observation with exact camera and cutaway fields',()=>{
    const raw=[{itemId:'pyramid',detailId:'king-chamber',cutaway:true,zoom:17.5,yaw:.73,pitch:-.22,note:'The chamber sits above the base.'},{itemId:'pyramid',detailId:'casing',cutaway:false,zoom:10.2,yaw:-.4,pitch:.3,note:'Casing survives around the lower courses.'},{itemId:'pyramid',detailId:'unknown-room',cutaway:true,zoom:8}];
    const notes=plain(p.notes(raw));expect(notes).toHaveLength(2);for(let n=0;n<2;n++)expect(notes[n]).toMatchObject({...raw[n],size:230});
    const parsed=p.parse(p.backup({observations:notes}));expect(parsed.error).toBeUndefined();expect(plain(parsed.notebook.observations)).toEqual(notes);
    expect(plain(p.drafts({'pyramid:king-chamber':'A granite chamber.','pyramid:casing':'Lower casing.','pyramid:unknown-room':'Invalid.'}))).toEqual({'pyramid:king-chamber':'A granite chamber.','pyramid:casing':'Lower casing.'});
    expect(plain(p.notes([{itemId:'pyramid',detailId:'gallery',zoom:999}]))[0].zoom).toBe(18);
  });

  it('builds nine pickable features, a fixed base footprint and distinct current and original heights',()=>{
    const {g,pyramid}=model();expect(g.userData).toMatchObject({dimension:'x',extent:1,measureCenter:0});expect(pyramid.exterior).toBeDefined();expect(pyramid.section).toBeDefined();expect(pyramid.guide).toBeDefined();
    for(const id of ids)expect(pyramid.meshes.some(m=>m.userData.pyramidDetailId===id),id).toBe(true);
    const bounds=new T.Box3().setFromObject(pyramid.exterior);expect(bounds.min.x).toBeCloseTo(-.5,5);expect(bounds.max.x).toBeCloseTo(.5,5);expect(bounds.min.z).toBeCloseTo(-.5,5);expect(bounds.max.z).toBeCloseTo(.5,5);expect(bounds.min.y).toBeCloseTo(-.3,5);
    expect(Math.abs((bounds.max.y+.3)*230-138.5)).toBeLessThan(.2);const guide=new T.Box3().setFromObject(pyramid.guide);expect(Math.abs((guide.max.y+.3)*230-146.5)).toBeLessThan(.2);
    expect(pyramid.stats).toMatchObject({baseWidthMeters:230,reference:'base-width',currentHeightMeters:138.5,originalHeightMeters:146.5});
    const actual=cost(g);expect(actual.drawables).toBeLessThan(70);expect(actual.triangles).toBeLessThan(220000);
    let desert=false;g.traverse(o=>{if(o.userData.pyramidDesert)desert=true;});expect(desert).toBe(false);
  });

  it('keeps all positions finite and every surface normal and element index safe for WebGL 1',()=>{
    const {g,resources}=model(),geometries=new Map(),materials=new Set();
    g.traverse(o=>{if(o.geometry)geometries.set(o.geometry,(geometries.get(o.geometry)||false)||o.isMesh);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(v=>materials.add(v));});
    for(const mat of materials)expect(resources.has(mat)).toBe(true);
    for(const [geo,surface] of geometries){expect(resources.has(geo)).toBe(true);const a=geo.attributes.position,n=geo.attributes.normal;expect(a.count).toBeGreaterThan(0);expect(a.count).toBeLessThan(65536);if(surface)expect(n).toBeDefined();
      for(let i=0;i<a.count;i++){if(!Number.isFinite(a.getX(i)+a.getY(i)+a.getZ(i)))throw Error('Invalid pyramid position');if(n&&Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)>.001)throw Error('Invalid pyramid normal');}
      if(surface)expect(geo.index).toBeDefined();if(geo.index){expect(geo.index.array.BYTES_PER_ELEMENT).toBe(2);for(const index of geo.index.array)if(index>=a.count)throw Error('Pyramid index exceeds its vertex buffer');
        if(surface)for(let i=0;i<geo.index.count;i+=3){const x=geo.index.array[i],y=geo.index.array[i+1],z=geo.index.array[i+2],ux=a.getX(y)-a.getX(x),uy=a.getY(y)-a.getY(x),uz=a.getZ(y)-a.getZ(x),vx=a.getX(z)-a.getX(x),vy=a.getY(z)-a.getY(x),vz=a.getZ(z)-a.getZ(x),cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx;if(Math.hypot(cx,cy,cz)>1e-13&&cx*n.getX(x)+cy*n.getY(x)+cz*n.getZ(x)<=0)throw Error('Pyramid triangle winding opposes its lighting normal');}
      }
    }
  });

  it('reveals real interior geometry and a separate original silhouette without reallocating the model',()=>{
    const {g,pyramid,resources,paint}=model(),count=resources.size,uuids=identities(pyramid),buffers=pyramid.meshes.map(m=>[m.geometry.attributes.position.array,m.geometry.attributes.normal.array]);
    expect(visible(pyramid.section)).toBe(false);expect(visible(pyramid.guide)).toBe(false);paint(pyramid,true,'gallery');g.updateMatrixWorld(true);expect(visible(pyramid.section)).toBe(true);expect(visible(pyramid.guide)).toBe(true);
    const interior=pyramid.meshes.filter(m=>['descending','subterranean','ascending','gallery','queen-chamber','king-chamber'].includes(m.userData.pyramidDetailId));expect(interior.some(visible)).toBe(true);
    for(let n=0;n<1000;n++)paint(pyramid,n%2===0,ids[n%9]);expect(resources.size).toBe(count);expect(identities(pyramid)).toEqual(uuids);
    pyramid.meshes.forEach((m,n)=>{expect(m.geometry.attributes.position.array).toBe(buffers[n][0]);expect(m.geometry.attributes.normal.array).toBe(buffers[n][1]);});
    paint(pyramid,false,'');g.updateMatrixWorld(true);expect(visible(pyramid.section)).toBe(false);expect(visible(pyramid.guide)).toBe(false);expect(g.userData.extent).toBe(1);
    g.scale.setScalar(3);g.rotation.y=.7;g.updateMatrixWorld(true);expect(g.localToWorld(new T.Vector3(.5,-.3,0)).distanceTo(g.localToWorld(new T.Vector3(-.5,-.3,0)))).toBeCloseTo(3,10);
  });

  it('disposes every retained GPU resource from the composed monument',()=>{const {resources}=model();let disposed=0;for(const r of resources){r.addEventListener('dispose',()=>disposed++);r.dispose();}expect(disposed).toBe(resources.size);});
});
