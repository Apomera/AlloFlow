import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';

const source = fs.readFileSync(process.env.SCALE_WHALE_SOURCE || 'stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {} } };
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {", "  window.whaleChecks={sites:WHALE_SITES,route:WHALE_ROUTE,point:whalePoint,view:whaleRouteView,index:whaleRouteIndex,number:whaleRouteNumber,details:atlasDetails,notes:readObservations,drafts:readObservationDrafts,backup:notebookBackup,parse:readNotebookBackup,items:ITEMS,limit:inspectionLimit};\n  window.StemLab.registerTool('scaleExplorer', {"), sandbox);
const w = sandbox.window.whaleChecks;
const plain = value => JSON.parse(JSON.stringify(value));
const ids = ['rostrum','blowholes','eye','flipper','pleats','baleen','dorsal-fin','peduncle','flukes'];
const details = () => w.details('blue-whale', (key, fallback) => fallback);
const T = createRequire(import.meta.url)(path.resolve('vendor/three-r128/three.min.js'));

function model() {
  const resources = new Set(), context = { T, WHALE_SITES: w.sites, track: value => (resources.add(value), value) };
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
  const start = source.indexOf('  function whaleModel(g)'), end = source.indexOf('    function model(item)', start);
  if (start < 0 || end <= start) throw Error('Missing standalone whale model and paint functions');
  vm.runInNewContext(source.slice(start, end), context);
  const g = new T.Group(); context.whaleModel(g); g.updateMatrixWorld(true);
  return { g, whale: g.userData.whale, resources, paint: context.whalePaint };
}
const visible = object => { for (let o = object; o; o = o.parent) if (!o.visible) return false; return true; };
const identities = whale => whale.meshes.map(m => [m.geometry.uuid, m.material.uuid]);
function tagBounds(g, whale, id) {
  const bounds = new T.Box3(), point = new T.Vector3();
  for (const mesh of whale.meshes.filter(m => m.userData.whaleDetailId === id)) {
    const positions = mesh.geometry.attributes.position;
    for (let i=0;i<positions.count;i++) {
      point.fromBufferAttribute(positions,i); mesh.localToWorld(point); g.worldToLocal(point); bounds.expandByPoint(point);
    }
  }
  return bounds;
}

describe('Scale Explorer blue whale anatomy journey', () => {
  it('provides nine cited anatomical views and a fixed snout-to-fluke length reference', () => {
    expect(plain(w.route)).toEqual(ids); const all = details(); expect(all).toHaveLength(9);
    expect(new Set(all.map(d => d.id)).size).toBe(9);
    for (const d of all) {
      expect(d.whaleSite).toBe(true); expect(d.marker).toBe(false);
      expect(d.at.every(Number.isFinite)).toBe(true); expect(Math.hypot(...d.view)).toBeCloseTo(1,9);
      expect(d.zoom).toBeLessThanOrEqual(5); expect(d.source).toMatch(/^https:\/\//);
      expect(d.cutaway).toBe(d.id === 'baleen');
    }
    expect(w.items.find(i => i.id === 'blue-whale')).toMatchObject({ size: 25, dim: 'long' });
    expect(w.limit('blue-whale')).toBe(5);
  });

  it('bounds native route values without coercing malformed inputs', () => {
    expect([0,1,2.4,2.5,9,100].map(w.number)).toEqual([1,1,2,3,9,9]);
    expect([null,undefined,'9',NaN,Infinity,{},[]].map(w.number)).toEqual([1,1,1,1,1,1,1]);
    expect(ids.map(w.index)).toEqual([1,2,3,4,5,6,7,8,9]);
    expect(['flukes ','FLUKES',null,{},2].map(w.index)).toEqual([0,0,0,0,0]);
    expect(w.point('heart')).toBeNull();
  });

  it('returns detached cameras for nine different features', () => {
    const original = plain(w.sites), views = ids.map((_, i) => w.view(i + 1));
    expect(new Set(views.map(v => v.at.join(','))).size).toBe(9);
    for (const v of views) { expect(Math.hypot(...v.view)).toBeCloseTo(1,9); v.at[0] = 99; v.view[0] = 99; }
    expect(plain(w.sites)).toEqual(original); expect(w.view(6).at[0]).not.toBe(99);
  });

  it('preserves an exact baleen observation and a closed exterior observation through backups', () => {
    const raw = [
      {itemId:'blue-whale',detailId:'baleen',cutaway:true,zoom:4,note:'Baleen hangs from the upper jaw.'},
      {itemId:'blue-whale',detailId:'flukes',cutaway:false,zoom:3,note:'The notch marks total body length.'},
      {itemId:'blue-whale',detailId:'heart',cutaway:true,zoom:4}
    ];
    const notes = plain(w.notes(raw)); expect(notes).toHaveLength(2);
    expect(notes[0]).toMatchObject({itemId:'blue-whale',detailId:'baleen',size:25,zoom:4,cutaway:true,note:raw[0].note});
    expect(notes[1]).toMatchObject({itemId:'blue-whale',detailId:'flukes',size:25,zoom:3,cutaway:false,note:raw[1].note});
    const parsed = w.parse(w.backup({observations:notes})); expect(parsed.error).toBeUndefined();
    expect(plain(parsed.notebook.observations)).toEqual(notes);
    expect(plain(w.drafts({'blue-whale:baleen':'A filtering curtain.','blue-whale:heart':'Invalid.'}))).toEqual({'blue-whale:baleen':'A filtering curtain.'});
  });

  it('builds independently pickable anatomy, two blowholes and paired appendages', () => {
    const { g, whale } = model();
    for (const id of ids) expect(whale.meshes.some(m => m.userData.whaleDetailId === id), id).toBe(true);
    expect(whale.body).toBeDefined(); expect(whale.jaw).toBeDefined(); expect(whale.baleen).toBeDefined();
    expect(whale.stats).toMatchObject({lengthMeters:25,reference:'snout-to-fluke-notch',flukeSpanRatio:.24,headLengthRatio:.25,pleatLengthRatio:.55,illustrativeBaleenPlatesPerSide:56,gapeDegrees:32});
    expect(whale.stats.triangles).toBeLessThan(300000); expect(whale.stats.drawables).toBeLessThan(70);
    const flukes = tagBounds(g,whale,'flukes'), fin = tagBounds(g,whale,'dorsal-fin');
    expect(flukes.max.z-flukes.min.z).toBeCloseTo(.24,4); expect(flukes.max.x).toBeLessThanOrEqual(.515);
    expect(fin.min.x).toBeGreaterThan(.20); expect(fin.max.x).toBeLessThan(.32); expect(fin.max.z-fin.min.z).toBeLessThan(.012);
    const blowholes=whale.meshes.filter(m=>m.name.startsWith('recessed blowhole slit'));
    expect(blowholes).toHaveLength(2);
    expect(blowholes.map(m=>m.geometry.boundingBox.getCenter(new T.Vector3()).z).sort((a,b)=>a-b)[0]).toBeLessThan(0);
    expect(blowholes.map(m=>m.geometry.boundingBox.getCenter(new T.Vector3()).z).sort((a,b)=>a-b)[1]).toBeGreaterThan(0);
    expect(whale.meshes.filter(m=>m.name.startsWith('thin hydrofoil flipper upper'))).toHaveLength(2);
  });

  it('keeps composed positions and normals finite with tracked WebGL 1 indices', () => {
    const { g, resources } = model(), geometries = new Set(); g.traverse(m => { if (m.geometry) geometries.add(m.geometry); });
    for (const geo of geometries) {
      expect(resources.has(geo)).toBe(true); if (geo.index) expect(geo.index.array.BYTES_PER_ELEMENT).toBe(2);
      const a = geo.attributes.position, n = geo.attributes.normal;
      expect(a.count).toBeGreaterThan(0); expect(a.count).toBeLessThan(65536); expect(n).toBeDefined();
      for (let i = 0; i < a.count; i++) {
        if (!Number.isFinite(a.getX(i)+a.getY(i)+a.getZ(i))) throw Error('Invalid whale position');
        if (Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1) > .001) throw Error('Invalid whale normal');
      }
    }
  });

  it('reveals an actual feeding apparatus while retaining the fixed measurement and GPU allocations', () => {
    const { g, whale, resources, paint } = model(), count = resources.size, uuids = identities(whale);
    const buffers=whale.meshes.map(m=>[m.geometry.attributes.position.array,m.geometry.attributes.normal.array]);
    expect(g.userData).toMatchObject({dimension:'x',extent:1,measureCenter:0});
    const bounds = new T.Box3().setFromObject(g); expect(bounds.min.x).toBeCloseTo(-.5,3);
    expect(bounds.max.x).toBeLessThanOrEqual(.515);
    expect(whale.mouthOpen).toBe(false); expect(visible(whale.baleen)).toBe(false);
    const jawMatrix = whale.jaw.matrix.clone();
    paint(whale,true,'baleen'); g.updateMatrixWorld(true);
    expect(whale.mouthOpen).toBe(true); expect(visible(whale.baleen)).toBe(true);
    expect(whale.jaw.matrix.equals(jawMatrix)).toBe(false);
    expect(g.userData.extent).toBe(1); expect(identities(whale)).toEqual(uuids);
    const settledVersion=whale.throat.geometry.attributes.position.version;
    for(let n=0;n<100;n++)paint(whale,true,'baleen');
    expect(whale.throat.geometry.attributes.position.version).toBe(settledVersion);
    g.scale.setScalar(3); g.rotation.y=.7; g.updateMatrixWorld(true);
    expect(g.localToWorld(new T.Vector3(.5,0,0)).distanceTo(g.localToWorld(new T.Vector3(-.5,0,0)))).toBeCloseTo(3,10);
    for (let n=0;n<1000;n++) paint(whale,n%2===0,ids[n%9]);
    expect(resources.size).toBe(count); expect(identities(whale)).toEqual(uuids);
    whale.meshes.forEach((m,i)=>{expect(m.geometry.attributes.position.array).toBe(buffers[i][0]);expect(m.geometry.attributes.normal.array).toBe(buffers[i][1]);});
    paint(whale,false,''); g.updateMatrixWorld(true); expect(whale.mouthOpen).toBe(false);
    expect(visible(whale.baleen)).toBe(false); expect(whale.jaw.matrix.equals(jawMatrix)).toBe(true);
    expect(g.userData.extent).toBe(1);
  });

  it('disposes every custom GPU resource retained by the composed animal', () => {
    const { resources } = model(); let disposed=0;
    for (const r of resources) { r.addEventListener('dispose',()=>disposed++); r.dispose(); }
    expect(disposed).toBe(resources.size);
  });
});
