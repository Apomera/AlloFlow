import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');
let THREE;
beforeAll(() => {
  const exports = {};
  new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(exports, { exports });
  THREE = exports;
});
function engineFunction(name) {
  const start = source.indexOf('        engine.' + name + ' = function(');
  if (start < 0) throw Error('Missing function ' + name);
  return source.slice(start, source.indexOf('\n        };', start) + '\n        };'.length);
}
function fixture(tier = 'balanced') {
  const engine = { blocks: {}, scene: new THREE.Scene(), _renderProfile: {tier}, _matCache: {},
    renderer: {setPixelRatio: vi.fn(), shadowMap: {}}, _undoStack: [{action:'place',x:2,y:1,z:0}], _redoStack: [] };
  const start = source.indexOf('        var _edgeMatCache = engine._edgeMatCache');
  const end = source.indexOf('        // Block geometry belongs', start);
  const add = new Function('engine','THREE',source.slice(start,end)+'\nreturn addBlockEdges;')(engine,THREE);
  const resolve = preference => ({tier:preference,postFx:false,ambientMotion:false,maxPixelRatio:1,shadows:preference !== 'saver'});
  new Function('engine','isMobile','container','resolveGeometryRenderProfile',engineFunction('applyRenderQuality'))(engine,false,{},resolve);
  function place(x, ground, slab = false) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1,slab ? .5 : 1,1),new THREE.MeshStandardMaterial());
    mesh.position.set(x+.5,ground ? .5 : slab ? 1.25 : 1.5,.5);
    mesh.userData={_measurementLayer:ground?'ground':'student',gridPos:{x,y:ground?0:1,z:0},shape:slab?'halfB':'cube'};
    add(mesh,slab?'halfB':'cube',ground);engine.blocks[x+','+(ground?0:1)+',0']=mesh;engine.scene.add(mesh);return mesh;
  }
  const floor = place(0,true), build = place(2,false), slab = place(4,false,true);
  const edge = mesh => mesh.children.find(c=>c.isLineSegments && c.material.userData.gwSharedBlockEdge);
  const state = () => JSON.stringify({history:[engine._undoStack,engine._redoStack],blocks:Object.entries(engine.blocks).map(([key,m])=>[key,m.uuid,m.geometry.uuid,m.material.uuid,m.position.toArray(),m.quaternion.toArray(),m.scale.toArray(),Array.from(m.geometry.attributes.position.array),Array.from(m.geometry.index.array),edge(m).geometry.uuid,Array.from(edge(m).geometry.attributes.position.array)])});
  return {engine,floor,build,slab,edge,state,place};
}
describe('Saver ground edges with actual Three.js objects', () => {
  it('new Saver floors omit faint edge draws and keep cube and slab build outlines', () => {
    const f=fixture('saver');
    expect(f.edge(f.floor).visible).toBe(false);
    expect(f.edge(f.build).visible).toBe(true);
    expect(f.edge(f.slab).visible).toBe(true);
    expect(f.edge(f.place(6,true)).visible).toBe(false);
  });
  it('a quality roundtrip restores the same floor edge geometry and material', () => {
    const f=fixture(), before=f.state(), edge=f.edge(f.floor);
    f.engine.applyRenderQuality('saver');expect(edge.visible).toBe(false);
    f.engine.applyRenderQuality('detail');expect(edge.visible).toBe(true);
    f.engine.applyRenderQuality('balanced');expect(edge.visible).toBe(true);
    expect(f.state()).toBe(before);
  });
  it('never changes a block parent or another build outline visibility', () => {
    const f=fixture();f.floor.visible=false;f.edge(f.build).visible=false;
    for(const tier of ['saver','balanced','saver']){f.engine.applyRenderQuality(tier);expect(f.floor.visible).toBe(false);expect(f.edge(f.build).visible).toBe(false);expect(f.edge(f.slab).visible).toBe(true);}
  });
  it('keeps hidden Studio ground hidden and restores the active quality on return', () => {
    const f=fixture();f.engine._showcase={look:'studio'};f.floor.visible=false;
    f.engine.applyRenderQuality('saver');f.engine.applyRenderQuality('balanced');
    expect(f.floor.visible).toBe(false);expect(f.edge(f.floor).visible).toBe(true);
    f.engine.applyRenderQuality('saver');f.engine._showcase=null;f.floor.visible=true;
    expect(f.edge(f.floor).visible).toBe(false);
    f.engine.applyRenderQuality('balanced');expect(f.edge(f.floor).visible).toBe(true);
  });
  it('preserves the exact placement raycast and canonical geometry and history', () => {
    const f=fixture(), before=f.state();f.engine.scene.updateMatrixWorld(true);
    const ray=new THREE.Raycaster(new THREE.Vector3(.35,3,.35),new THREE.Vector3(0,-1,0),0,8);
    const hit=()=>{const h=ray.intersectObjects(Object.values(f.engine.blocks),false)[0];return [h.object,h.point.toArray(),h.face.normal.toArray(),h.distance];};
    const first=hit();expect(first[0]).toBe(f.floor);
    for(const tier of ['saver','balanced','detail','saver']){f.engine.applyRenderQuality(tier);expect(hit()).toEqual(first);expect(f.state()).toBe(before);}
  });
});
