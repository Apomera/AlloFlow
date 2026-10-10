import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';

const source = fs.readFileSync(process.env.SCALE_SEQUOIA_SOURCE || 'stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {} } };
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {", "  window.sequoiaChecks={sites:SEQUOIA_SITES,route:SEQUOIA_ROUTE,point:sequoiaPoint,view:sequoiaRouteView,index:sequoiaRouteIndex,number:sequoiaRouteNumber,meters:sequoiaMeters,ascentIndex:sequoiaAscentIndex,details:atlasDetails,notes:readObservations,drafts:readObservationDrafts,backup:notebookBackup,parse:readNotebookBackup,items:ITEMS,limit:inspectionLimit};\n  window.StemLab.registerTool('scaleExplorer', {"), sandbox);
const s = sandbox.window.sequoiaChecks;
const plain = value => JSON.parse(JSON.stringify(value));
const ids = ['root-flare','bark','trunk','branch-fork','old-wood','crown','summit'];
const details = () => s.details('sequoia', (key, fallback) => fallback);
const T = createRequire(import.meta.url)(path.resolve('vendor/three-r128/three.min.js'));

function model() {
  const resources = new Set(), context = { T, SEQUOIA_SITES: s.sites, track: value => (resources.add(value), value) };
  context.sphere = context.track(new T.SphereGeometry(.5, 32, 24));
  context.material = (color, options) => {
    const m = context.track(new T.MeshStandardMaterial(Object.assign({ color, roughness: .78, metalness: 0 }, options || {})));
    m.color.convertSRGBToLinear(); m.emissive.convertSRGBToLinear(); return m;
  };
  context.mesh = (g, geo, mat, x, y, z, sx, sy, sz) => {
    const m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0);
    m.scale.set(sx || 1, sy || sx || 1, sz || sx || 1); g.add(m); return m;
  };
  context.ball = (g, mat, x, y, z, sx, sy, sz) => context.mesh(g, context.sphere, mat, x, y, z, sx, sy, sz);
  context.rod = (g, a, b, r, mat) => {
    const av = new T.Vector3(...a), bv = new T.Vector3(...b), mid = av.clone().add(bv).multiplyScalar(.5);
    const m = context.mesh(g, context.track(new T.CylinderGeometry(r, r, av.distanceTo(bv), 8, 1)), mat, ...mid.toArray());
    m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0), bv.sub(av).normalize()); return m;
  };
  context.tube = (g, points, radius, mat) => context.mesh(g, context.track(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p))), Math.max(16, points.length * 4), radius, 10, false)), mat);
  context.random = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const start = source.indexOf('  function sequoiaModel(g)'), end = source.indexOf('    function model(item)', start);
  if (start < 0 || end <= start) throw Error('Missing standalone sequoia model and paint functions');
  vm.runInNewContext(source.slice(start, end), context);
  const g = new T.Group(); context.sequoiaModel(g); g.updateMatrixWorld(true);
  return { g, tree: g.userData.sequoia, resources, paint: context.sequoiaPaint };
}
const identities = tree => tree.meshes.map(m => [m.geometry.uuid, Array.isArray(m.material) ? m.material.map(v=>v.uuid) : m.material.uuid]);
function actualCost(g) {
  let drawables=0,triangles=0;
  g.traverse(m=>{if(m.isMesh){drawables++;triangles+=(m.geometry.index?m.geometry.index.count:m.geometry.attributes.position.count)/3;}});
  return {drawables,triangles};
}
function trunkDiameterMeters(tree,meters) {
  const target=meters/84-.5,vertices=[];let nearest=Infinity;
  tree.trunk.traverse(m=>{if(!m.isMesh||!m.name.includes('continuous furrowed bole'))return;const a=m.geometry.attributes.position;
    for(let i=0;i<a.count;i++){const delta=Math.abs(a.getY(i)-target);nearest=Math.min(nearest,delta);vertices.push([a.getX(i),a.getY(i),a.getZ(i),delta]);}
  });
  const ring=vertices.filter(v=>v[3]<=nearest+1e-6),xs=ring.map(v=>v[0]);
  return (Math.max(...xs)-Math.min(...xs))*84;
}

describe('Scale Explorer giant sequoia ascent', () => {
  it('provides seven cited native landmarks and every metre from ground to the 84 m summit', () => {
    expect(plain(s.route)).toEqual(ids); const all=details(); expect(all).toHaveLength(92);
    expect(new Set(all.map(d=>d.id)).size).toBe(92);
    expect(all.filter(d=>ids.includes(d.id)).map(d=>d.id)).toEqual(ids);
    for(const d of all){
      expect(d.sequoiaSite).toBe(true);expect(d.marker).toBe(false);
      expect(d.at).toHaveLength(3);expect(d.at.every(Number.isFinite)).toBe(true);
      expect(Math.hypot(...d.view)).toBeCloseTo(1,9);expect(d.zoom).toBeGreaterThanOrEqual(1);
      expect(d.zoom).toBeLessThanOrEqual(12);expect(d.source).toMatch(/^https:\/\//);
    }
    for(let meters=0;meters<=84;meters++){
      const d=all.find(d=>d.id==='ascent-'+meters);expect(d).toBeDefined();
      expect(d.at[1]).toBeCloseTo(meters/84-.5,9);
    }
    expect(s.items.find(i=>i.id==='sequoia')).toMatchObject({size:84,dim:'tall'});
    expect(s.limit('sequoia')).toBe(12);
  });

  it('accepts only canonical saved height IDs and finite numeric navigation inputs', () => {
    expect([0,1,18.4,18.5,84,200,-20].map(s.meters)).toEqual([0,1,18,19,84,84,0]);
    expect([null,undefined,'47',NaN,Infinity,{},[]].map(s.meters)).toEqual([0,0,0,0,0,0,0]);
    for(let n=0;n<=84;n++)expect(s.ascentIndex('ascent-'+n)).toBe(n);
    expect(['ascent-00','ascent-047','ascent-85','ascent--1','ascent-2.0','ascent-2.5','ascent-47 ','ASCENT-47','ascent-1e1',null,{},47].map(s.ascentIndex)).toEqual(Array(12).fill(null));
    expect([0,1,2.4,2.5,7,100].map(s.number)).toEqual([1,1,2,3,7,7]);
    expect([null,undefined,'7',NaN,Infinity,{},[]].map(s.number)).toEqual(Array(7).fill(1));
    expect(ids.map(s.index)).toEqual([1,2,3,4,5,6,7]);
    expect(['summit ','SUMMIT','ascent-47',null,{},2].map(s.index)).toEqual(Array(6).fill(0));
    expect(s.point('ascent-85')).toBeNull();
  });

  it('keeps source cameras detached so consumers cannot mutate later navigation or saved observations', () => {
    const original=plain(s.sites),views=ids.map((_,i)=>s.view(i+1));
    expect(new Set(views.map(v=>v.at.join(','))).size).toBe(7);
    for(const v of views){expect(Math.hypot(...v.view)).toBeCloseTo(1,9);v.at[1]=99;v.view[0]=99;}
    const all=details();all.find(d=>d.id==='ascent-47').at[1]=99;all.find(d=>d.id==='bark').at[1]=99;
    expect(plain(s.sites)).toEqual(original);expect(s.view(2).at[1]).not.toBe(99);
    expect(details().find(d=>d.id==='ascent-47').at[1]).toBeCloseTo(47/84-.5,9);
  });

  it('round-trips exact continuous and native observations without accepting malformed height IDs', () => {
    const raw=[
      {itemId:'sequoia',detailId:'ascent-47',zoom:10.5,yaw:.73,pitch:-.22,note:'Forty-seven metres above the ground.'},
      {itemId:'sequoia',detailId:'bark',zoom:11.25,yaw:-.4,pitch:.3,note:'The bark has deep vertical furrows.'},
      {itemId:'sequoia',detailId:'ascent-047',zoom:8},
      {itemId:'sequoia',detailId:'ascent-85',zoom:8}
    ];
    const notes=plain(s.notes(raw));expect(notes).toHaveLength(2);
    for(let i=0;i<2;i++)expect(notes[i]).toMatchObject({...raw[i],size:84});
    const parsed=s.parse(s.backup({observations:notes}));expect(parsed.error).toBeUndefined();
    expect(plain(parsed.notebook.observations)).toEqual(notes);
    expect(plain(s.drafts({'sequoia:ascent-47':'Look down at the grove.','sequoia:bark':'Deep grooves.','sequoia:ascent-047':'Invalid.'}))).toEqual({'sequoia:ascent-47':'Look down at the grove.','sequoia:bark':'Deep grooves.'});
    const boundaries=plain(s.notes([{itemId:'sequoia',detailId:'ascent-0',zoom:999},{itemId:'sequoia',detailId:'ascent-84',zoom:-1}]));
    expect(boundaries.map(n=>n.zoom)).toEqual([12,1]);
  });

  it('builds seven independently pickable surfaces with a fixed whole-tree height and a separate grove', () => {
    const {g,tree}=model();expect(tree.trunk).toBeDefined();expect(tree.foliage).toBeDefined();
    for(const id of ids)expect(tree.meshes.some(m=>m.userData.sequoiaDetailId===id),id).toBe(true);
    expect(g.userData).toMatchObject({dimension:'y',extent:1,measureCenter:0});
    const bounds=new T.Box3().setFromObject(g);expect(bounds.min.y).toBeCloseTo(-.5,5);expect(bounds.max.y).toBeCloseTo(.5,5);
    expect(bounds.max.y-bounds.min.y).toBeCloseTo(1,5);
    expect(bounds.max.x-bounds.min.x).toBeGreaterThan(.22);expect(bounds.max.x-bounds.min.x).toBeLessThan(.5);
    let foundGrove=false;g.traverse(o=>{if(o.name==='forest grove'||o.userData.forestGrove)foundGrove=true;});expect(foundGrove).toBe(false);
    const cost=actualCost(g);expect(cost.drawables).toBeLessThan(70);expect(cost.triangles).toBeLessThan(220000);
    expect(tree.stats).toMatchObject({heightMeters:84,reference:'ground-to-top',baseDiameterMeters:11.1,firstMajorBranchMeters:39.6,crownReferenceMeters:32.5});
    expect(tree.stats.drawables).toBe(cost.drawables);expect(tree.stats.triangles).toBe(cost.triangles);
    expect(Math.abs(trunkDiameterMeters(tree,0)-11.1)).toBeLessThan(.3);
    expect(Math.abs(trunkDiameterMeters(tree,18.3)-5.3)).toBeLessThan(.3);
    expect(Math.abs(trunkDiameterMeters(tree,54.9)-4.3)).toBeLessThan(.3);
  });

  it('keeps every GPU surface finite, normalised and safe for WebGL 1 without large element indices', () => {
    const {g,resources}=model(),geometries=new Set(),materials=new Set();
    g.traverse(m=>{if(m.geometry)geometries.add(m.geometry);if(m.material)(Array.isArray(m.material)?m.material:[m.material]).forEach(v=>materials.add(v));});
    for(const mat of materials)expect(resources.has(mat)).toBe(true);
    for(const geo of geometries){
      expect(resources.has(geo)).toBe(true);if(geo.index)expect(geo.index.array.BYTES_PER_ELEMENT).toBe(2);
      const a=geo.attributes.position,n=geo.attributes.normal;expect(a.count).toBeGreaterThan(0);expect(a.count).toBeLessThan(65536);expect(n).toBeDefined();
      for(let i=0;i<a.count;i++){
        if(!Number.isFinite(a.getX(i)+a.getY(i)+a.getZ(i)))throw Error('Invalid sequoia position');
        if(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)>.001)throw Error('Invalid sequoia normal');
      }
      if(geo.index)for(const index of geo.index.array)if(index>=a.count)throw Error('Sequoia index exceeds the vertex buffer');
    }
  });

  it('reuses geometry and materials through one thousand ascent, feature and still-view transitions', () => {
    const {g,tree,resources,paint}=model(),count=resources.size,uuids=identities(tree);
    const buffers=tree.meshes.map(m=>[m.geometry.attributes.position.array,m.geometry.attributes.normal.array]);
    const before=new T.Box3().setFromObject(g);paint(tree,'ascent-47',0,false);g.updateMatrixWorld(true);
    const still=tree.meshes.map(m=>m.matrix.toArray());
    for(let n=0;n<1000;n++)paint(tree,n%2===0?'ascent-'+(n%85):ids[n%7],n/30,false);
    g.updateMatrixWorld(true);expect(resources.size).toBe(count);expect(identities(tree)).toEqual(uuids);
    expect(tree.meshes.map(m=>m.matrix.toArray())).toEqual(still);
    tree.meshes.forEach((m,i)=>{expect(m.geometry.attributes.position.array).toBe(buffers[i][0]);expect(m.geometry.attributes.normal.array).toBe(buffers[i][1]);});
    const after=new T.Box3().setFromObject(g);expect(after.min.y).toBeCloseTo(before.min.y,10);expect(after.max.y).toBeCloseTo(before.max.y,10);
    g.scale.setScalar(3);g.rotation.y=.7;g.updateMatrixWorld(true);
    expect(g.localToWorld(new T.Vector3(0,.5,0)).distanceTo(g.localToWorld(new T.Vector3(0,-.5,0)))).toBeCloseTo(3,10);
    expect(g.userData.extent).toBe(1);paint(tree,'',0,false);
  });

  it('disposes every retained GPU resource from the composed tree', () => {
    const {resources}=model();let disposed=0;
    for(const r of resources){r.addEventListener('dispose',()=>disposed++);r.dispose();}
    expect(disposed).toBe(resources.size);
  });
});
