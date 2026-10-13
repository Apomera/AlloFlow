import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const T = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_FEATHER_SHAFT_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const legacyVaneCode = "function dinoFeatherGeometry(THREE, length, width) {\n    var positions = [], uvs = [], indices = [], rows = 20, columns = 4;\n    for (var i = 0; i <= rows; i++) {\n      var t = i / rows;\n      var span = width * Math.pow(Math.sin(Math.PI * t), 0.72) * (0.70 + 0.30 * t);\n      for (var j = 0; j <= columns; j++) {\n        var across = j / columns * 2 - 1;\n        positions.push(across * span * (across < 0 ? 0.68 : 1), length * t,\n          length * 0.045 * Math.sin(Math.PI * t) + width * 0.14 * across * across * Math.sin(Math.PI * t));\n        uvs.push(j / columns, t);\n        if (i < rows && j < columns) {\n          var n = i * (columns + 1) + j;\n          indices.push(n, n + 1, n + columns + 1, n + 1, n + columns + 2, n + columns + 1);\n        }\n      }\n    }\n    var geometry = new THREE.BufferGeometry();\n    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));\n    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));\n    geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingBox();\n    return geometry;\n  }";
const legacyConstructionCode = "function addFeatherVane(base, tip, width, spreadAxis, tract) {\n              if (!props.showBody) return null;\n              var dir = new THREE.Vector3().subVectors(tip, base), dist = dir.length();\n              if (!dist) return null;\n              var vane = new THREE.Mesh(dinoFeatherGeometry(THREE, dist, width), featherVaneMat);\n              vane.position.copy(base);\n              vane.quaternion.copy(dinoFeatherFrame(THREE, dir, spreadAxis));\n              vane.castShadow = true; vane.receiveShadow = true; vane.renderOrder = 12;\n              vane.userData.dinoFeature = 'feather';\n              vane.userData.featherTract = tract || 'tail';\n              dinoSurfacePartIds(vane, /hind-wing/.test(tract || '') ? ['hindwings', 'feathers', 'hindlimb'] : (/wing/.test(tract || '') ? ['wing', 'feathers', 'forelimb'] : ['tail', 'feathers']));\n              vane.userData.featherLength = dist;\n              vane.userData.featherWidth = width;\n              var shaftCurve = new THREE.CatmullRomCurve3([vec(0, 0, 0), vec(0, dist * 0.5, dist * 0.045), vec(0, dist, 0)]);\n              var shaft = new THREE.Mesh(new THREE.TubeGeometry(shaftCurve, 12, width * 0.028, 4, false), filamentMat);\n              shaft.renderOrder = 13; vane.add(shaft);\n              model.add(vane);\n              idleMotion.feathers.push({ mesh: vane, baseRotation: vane.rotation.clone(), phase: idleMotion.phase + idleMotion.feathers.length * 0.19, amount: 0.012 });\n              return vane;\n            }";
function extract(name) {
  const start = source.indexOf('function ' + name + '('), open = source.indexOf('{', start);
  if (start < 0) throw Error('Missing ' + name); let depth = 1, end = open + 1;
  while (depth && end < source.length) { if(source[end]==='{') depth++; if(source[end]==='}') depth--; end++; }
  if (depth) throw Error('Unbalanced ' + name); return source.slice(start,end);
}
const helper = name => new Function(extract(name) + ';return ' + name)();
const makeShaft = helper('dinoFeatherShaftGeometry'), makeVane = helper('dinoFeatherGeometry');
const legacyVane = new Function(legacyVaneCode + ';return dinoFeatherGeometry;')();
const frame = helper('dinoFeatherFrame'), mark = helper('dinoSurfacePartIds');
const point = (p, i) => new T.Vector3().fromBufferAttribute(p, i);
const sizes = [[.001,.00015],[.35,.06],[4,.65]];

describe('Cambered tapered feather shafts', () => {
  for (const [length, width] of sizes) {
    const label = 'length ' + length + ', width ' + width;
    it('is a closed, consistently outward-wound surface at ' + label, () => {
      const g = makeShaft(T,length,width), p = g.attributes.position, uv = g.attributes.uv, indices = g.index.array;
      const vertices = new Set(), edges = new Map();
      const key = i => point(p,i).toArray().map(x => Math.round(x / length * 1e8)).join(',');
      for (let i=0;i<p.count;i++) vertices.add(key(i));
      for (let i=0;i<indices.length;i+=3) {
        const ids = Array.from(indices.slice(i,i+3)), [a,b,c] = ids.map(id => point(p,id));
        const normal = b.clone().sub(a).cross(c.clone().sub(a));
        expect(normal.length()).toBeGreaterThan(length * width * 1e-10);
        const t = ids.reduce((sum,id) => sum + uv.getY(id),0)/3;
        const center = new T.Vector3(0,length*t,length*.045*Math.sin(Math.PI*t));
        const centroid = a.clone().add(b).add(c).multiplyScalar(1/3);
        const outside = t === 0 ? new T.Vector3(0,-1,-.045*Math.PI).normalize() : centroid.sub(center);
        expect(normal.dot(outside)).toBeGreaterThan(0);
        for(let e=0;e<3;e++) {
          const from = key(ids[e]), to = key(ids[(e+1)%3]); expect(from).not.toBe(to);
          const edgeKey = [from,to].sort().join('|');
          const entry=edges.get(edgeKey)||{count:0,orientation:0}; entry.count++; entry.orientation+=from<to?1:-1; edges.set(edgeKey,entry);
        }
      }
      expect([...edges.values()].every(e=>e.count===2 && e.orientation===0)).toBe(true);
      expect(vertices.size-edges.size+indices.length/3).toBe(2);
      expect(p.count).toBe(191); expect(indices.length/3).toBe(320); g.dispose();
    });
    it('has finite unit normals and exact smooth side seams at ' + label, () => {
      const g = makeShaft(T,length,width), p=g.attributes.position, n=g.attributes.normal, uv=g.attributes.uv;
      for(const attr of Object.values(g.attributes)) expect(Array.from(attr.array).every(Number.isFinite)).toBe(true);
      for(let i=0;i<n.count;i++) expect(point(n,i).length()).toBeCloseTo(1,6);
      for(let ring=0;ring<20;ring++) {
        const first=ring*9,last=first+8;
        expect(point(p,first).toArray()).toEqual(point(p,last).toArray());
        expect(point(n,first).toArray()).toEqual(point(n,last).toArray());
        expect(uv.getX(first)).toBe(0); expect(uv.getX(last)).toBe(1);
        expect(uv.getY(first)).toBe(uv.getY(last));
      }
      const rootCapNormal = new T.Vector3(0,-1,-.045*Math.PI).normalize();
      for(let i=181;i<191;i++) expect(point(n,i).dot(rootCapNormal)).toBeCloseTo(1,6);
      g.dispose();
    });
    it('follows every vane center station and narrows continuously to the tip at ' + label, () => {
      const g=makeShaft(T,length,width), vane=makeVane(T,length,width), p=g.attributes.position, n=g.attributes.normal;
      let previous=Infinity;
      for(let ring=0;ring<20;ring++) {
        const center=new T.Vector3(); for(let side=0;side<8;side++) center.add(point(p,ring*9+side)); center.multiplyScalar(1/8);
        const vaneCenter=point(vane.attributes.position,ring*5+2);
        expect(center.distanceTo(vaneCenter)).toBeLessThan(length*1e-7);
        const tangent=new T.Vector3(0,1,.045*Math.PI*Math.cos(Math.PI*ring/20)).normalize();
        const radius=point(p,ring*9).distanceTo(center);
        expect(radius).toBeGreaterThan(0); expect(radius).toBeLessThan(previous);
        if(ring===0) expect(radius/width).toBeCloseTo(.028,7);
        for(let side=0;side<8;side++) {
          const radial=point(p,ring*9+side).sub(center);
          expect(radial.length()).toBeCloseTo(radius,6);
          expect(Math.abs(radial.dot(tangent))).toBeLessThan(length*1e-7);
          expect(point(n,ring*9+side).dot(radial)).toBeGreaterThan(0);
        }
        previous=radius;
      }
      expect(point(p,180).distanceTo(new T.Vector3(0,length,0))).toBeLessThan(length*1e-7);
      expect(point(p,190).toArray()).toEqual([0,0,0]);
      expect(previous).toBeLessThan(width * .028 * .1); g.dispose(); vane.dispose();
    });
    it('supplies bounds containing its full taper and unchanged vane arrays at ' + label, () => {
      const g=makeShaft(T,length,width), box=g.boundingBox, sphere=g.boundingSphere;
      expect(box).toBeInstanceOf(T.Box3); expect(sphere).toBeInstanceOf(T.Sphere);
      expect(Number.isFinite(sphere.radius)).toBe(true); expect(sphere.radius).toBeGreaterThan(length/2);
      for(let i=0;i<g.attributes.position.count;i++) {
        const p=point(g.attributes.position,i); expect(box.containsPoint(p)).toBe(true);
        expect(p.distanceTo(sphere.center)).toBeLessThanOrEqual(sphere.radius+length*1e-7);
      }
      const actual=makeVane(T,length,width), before=legacyVane(T,length,width);
      expect(Object.keys(actual.attributes)).toEqual(Object.keys(before.attributes));
      for(const key of Object.keys(before.attributes)) expect(Array.from(actual.attributes[key].array)).toEqual(Array.from(before.attributes[key].array));
      expect(Array.from(actual.index.array)).toEqual(Array.from(before.index.array));
      expect(actual.boundingBox).toEqual(before.boundingBox);
      g.dispose(); actual.dispose(); before.dispose();
    });
  }
});

function construct(legacy, {length=.35,width=.06,tract='tail',showBody=true,zero=false}={}) {
  const model=new T.Group(), featherVaneMat=new T.MeshStandardMaterial(), filamentMat=new T.MeshStandardMaterial();
  const idleMotion={phase:.31,feathers:[{sentinel:true}]};
  const env={THREE:T,props:{showBody},model,featherVaneMat,filamentMat,idleMotion,dinoFeatherGeometry:legacy?legacyVane:makeVane,dinoFeatherShaftGeometry:makeShaft,dinoFeatherFrame:frame,dinoSurfacePartIds:mark,vec:(x,y,z)=>new T.Vector3(x,y,z)};
  const add=new Function(...Object.keys(env),(legacy?legacyConstructionCode:extract('addFeatherVane'))+';return addFeatherVane;')(...Object.values(env));
  const base=new T.Vector3(.8,-.3,1.1), delta=new T.Vector3(.7,.4,-.5).normalize().multiplyScalar(length), tip=zero?base.clone():base.clone().add(delta);
  const vane=add(base,tip,width,new T.Vector3(.2,1,.4),tract); model.updateMatrixWorld(true);
  return {model,vane,idleMotion,featherVaneMat,filamentMat,dispose(){model.traverse(o=>{if(o.geometry)o.geometry.dispose();});featherVaneMat.dispose();filamentMat.dispose();}};
}
function objectData(object) {
  return {position:object.position.toArray(),rotation:object.rotation.toArray(),quaternion:object.quaternion.toArray(),scale:object.scale.toArray(),matrix:object.matrix.toArray(),matrixWorld:object.matrixWorld.toArray(),castShadow:object.castShadow,receiveShadow:object.receiveShadow,renderOrder:object.renderOrder,visible:object.visible,userData:object.userData};
}
describe('Actual feather construction preserves layout and movement',()=>{
  for(const tract of ['tail','wing-primary','hind-wing-primary']) for(const [length,width] of [[.01,.0015],[.35,.06],[4,.65]]) {
    it('changes only shaft geometry for '+tract+' at length '+length,()=>{
      const current=construct(false,{length,width,tract}), before=construct(true,{length,width,tract});
      expect(current.model.children).toHaveLength(1); expect(current.vane.children).toHaveLength(1);
      expect(objectData(current.model)).toEqual(objectData(before.model)); expect(objectData(current.vane)).toEqual(objectData(before.vane));
      const shaft=current.vane.children[0],oldShaft=before.vane.children[0];
      expect(objectData(shaft)).toEqual(objectData(oldShaft)); expect(shaft.parent).toBe(current.vane); expect(current.vane.parent).toBe(current.model);
      expect(current.vane.material).toBe(current.featherVaneMat); expect(shaft.material).toBe(current.filamentMat);
      expect(shaft.renderOrder).toBe(13); expect(current.vane.renderOrder).toBe(12);
      expect(current.vane.castShadow && current.vane.receiveShadow).toBe(true);
      for(const key of Object.keys(before.vane.geometry.attributes)) expect(Array.from(current.vane.geometry.attributes[key].array)).toEqual(Array.from(before.vane.geometry.attributes[key].array));
      expect(Array.from(current.vane.geometry.index.array)).toEqual(Array.from(before.vane.geometry.index.array));
      expect(shaft.geometry.attributes.position.count).toBe(191); expect(shaft.geometry.index.count).toBe(960);
      const nowPose=current.idleMotion.feathers[1],oldPose=before.idleMotion.feathers[1];
      expect(current.idleMotion.feathers[0]).toEqual({sentinel:true}); expect(current.idleMotion.feathers).toHaveLength(2);
      expect(nowPose.mesh).toBe(current.vane); expect(nowPose.baseRotation).not.toBe(current.vane.rotation);
      expect(nowPose.baseRotation.toArray()).toEqual(oldPose.baseRotation.toArray()); expect(nowPose.phase).toBe(oldPose.phase); expect(nowPose.amount).toBe(oldPose.amount);
      // A parent pose carries the replacement shaft with the same rigid transform.
      current.vane.rotateX(.08); before.vane.rotateX(.08); current.model.updateMatrixWorld(true);before.model.updateMatrixWorld(true);
      expect(shaft.matrixWorld.toArray()).toEqual(oldShaft.matrixWorld.toArray());
      current.dispose();before.dispose();
    });
  }
  for(const options of [{showBody:false},{zero:true}]) it('preserves construction guards '+JSON.stringify(options),()=>{
    const current=construct(false,options),before=construct(true,options);
    expect(current.vane).toBeNull();expect(before.vane).toBeNull();expect(current.model.children).toHaveLength(0);
    expect(current.idleMotion.feathers).toEqual(before.idleMotion.feathers);current.dispose();before.dispose();
  });
});
