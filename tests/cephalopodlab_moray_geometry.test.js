import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf('function createCLHuntMorayGeometry('), end = source.indexOf('// Marker rock at moray', start);
assert.ok(start >= 0 && end > start, 'The actual moray factory and unchanged spawn block must exist');
const construct = new Function('THREE', 'Math', 'var scene=new THREE.Scene();' + source.slice(start, end) + ';return{scene,moray};');
const fixtures = [];
function fixture() { const item = construct(THREE, Object.assign(Object.create(Math), { random() { throw new Error('Moray geometry must not consume world randomness'); } })); fixtures.push(item); return item.moray; }
function part(mesh, name) { const value = mesh.geometry.userData.clMorayParts.find(item => item.name === name); assert.ok(value, mesh.name + '/' + name); return value; }
function vertices(mesh, section) { mesh.updateMatrix(); const p = mesh.geometry.attributes.position; return Array.from({ length: section?.vertexCount || p.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(p, (section?.vertexStart || 0) + i).applyMatrix4(mesh.matrix)); }
function triangles(mesh, sections) { const points = vertices(mesh), ix = mesh.geometry.index, result = []; for (const s of sections || [{ indexStart: 0, indexCount: ix.count }]) for (let i = s.indexStart; i < s.indexStart + s.indexCount; i += 3) result.push(new THREE.Triangle(points[ix.getX(i)], points[ix.getX(i + 1)], points[ix.getX(i + 2)])); return result; }
function distance(point, faces) { let best = Infinity; const near = new THREE.Vector3(); for (const face of faces) { face.closestPointToPoint(point, near); best = Math.min(best, near.distanceTo(point)); } return best; }
function surface(mesh, sections) { const p = triangles(mesh, sections).flatMap(face => [...face.a.toArray(), ...face.b.toArray(), ...face.c.toArray()]); const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(p, 3)), material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), object = new THREE.Mesh(geometry, material); object.updateMatrixWorld(true); return { object, close() { geometry.dispose(); material.dispose(); } }; }
function records(root) { return root.children.map(mesh => ({ name: mesh.name, position: mesh.position.toArray(), rotation: mesh.rotation.toArray(), scale: mesh.scale.toArray(), attrs: Object.entries(mesh.geometry.attributes).map(([name, attr]) => [name, Array.from(attr.array)]), index: Array.from(mesh.geometry.index.array), material: [mesh.material.type, mesh.material.color.toArray(), mesh.material.vertexColors, mesh.material.roughness] })); }
afterEach(() => { for (const item of fixtures.splice(0)) item.scene.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); }); });

describe('Cephalopod Hunter moray surface anatomy', () => {
  it('preserves the four original child frames, home and predator metadata with no construction randomness', () => {
    const root = fixture(), [body, head, left, right] = root.children;
    assert.deepEqual(root.position.toArray(), [14, .25, 11]); assert.deepEqual(root.userData, { homeX: 14, homeZ: 11, state: 'idle', stateTimer: 0, aggroRange: 7, speed: 4.5, cooldownUntil: 0 });
    assert.deepEqual(root.children.map(mesh => mesh.name), ['cl-moray-body', 'cl-moray-head', 'cl-moray-eye-0', 'cl-moray-eye-1']);
    assert.deepEqual(body.position.toArray(), [0, 0, 0]); assert.equal(body.rotation.x, Math.PI / 2); assert.deepEqual(head.position.toArray(), [0, 0, 1.55]); assert.deepEqual(head.scale.toArray(), [1, 1, 1.3]);
    assert.deepEqual(left.position.toArray(), [-.18, .15, 1.7]); assert.deepEqual(right.position.toArray(), [.18, .15, 1.7]);
    assert.equal(new Set(root.children.map(mesh => mesh.geometry)).size, 4); assert.equal(new Set(root.children.map(mesh => mesh.material)).size, 4);
    assert.ok(root.children.reduce((sum, mesh) => sum + mesh.geometry.attributes.position.count, 0) <= 1800); assert.ok(root.children.reduce((sum, mesh) => sum + mesh.geometry.index.count / 3, 0) <= 2800);
    for (const [i, mesh] of root.children.entries()) {
      assert.equal(mesh.material.type, i < 2 ? 'MeshStandardMaterial' : 'MeshBasicMaterial'); assert.equal(mesh.material.vertexColors, true); assert.equal(mesh.material.color.getHex(), 0xffffff); assert.equal(mesh.material.transparent, false); assert.equal(mesh.geometry.groups.length, 0);
      assert.ok(!Object.values(mesh.material).some(value => value?.isTexture)); const shader = { vertexShader: 'v', fragmentShader: 'f', uniforms: {} }; mesh.material.onBeforeCompile(shader); assert.deepEqual(shader, { vertexShader: 'v', fragmentShader: 'f', uniforms: {} });
    }
  });

  it('constructs finite indexed anatomy with unit visible normals, noncollapsed faces and complete part ranges', () => {
    for (const mesh of fixture().children) {
      const g = mesh.geometry, p = g.attributes.position, n = g.attributes.normal, color = g.attributes.color;
      assert.deepEqual(Object.keys(g.attributes).sort(), ['color', 'normal', 'position']); assert.equal(n.count, p.count); assert.equal(color.count, p.count); assert.ok([...p.array, ...n.array, ...color.array].every(Number.isFinite)); assert.ok(Array.from(color.array).every(value => value >= 0 && value <= 1));
      for (let i = 0; i < p.count; i++) { const point = new THREE.Vector3().fromBufferAttribute(p, i); assert.ok(g.boundingBox.distanceToPoint(point) < 1e-7); assert.ok(point.distanceTo(g.boundingSphere.center) <= g.boundingSphere.radius + 1e-7); assert.ok(Math.abs(new THREE.Vector3().fromBufferAttribute(n, i).length() - 1) < 1e-5); }
      let ve = 0, ie = 0;
      for (const s of g.userData.clMorayParts) {
        assert.equal(s.vertexStart, ve); assert.equal(s.indexStart, ie); ve += s.vertexCount; ie += s.indexCount; assert.ok(s.vertexCount && s.indexCount); assert.equal(s.indexCount % 3, 0);
        for (let i = s.indexStart; i < ie; i += 3) {
          const ids = [0, 1, 2].map(j => g.index.getX(i + j)); assert.ok(ids.every(id => Number.isInteger(id) && id >= s.vertexStart && id < ve));
          const points = ids.map(id => new THREE.Vector3().fromBufferAttribute(p, id)), cross = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])), normal = new THREE.Vector3();
          ids.forEach(id => normal.add(new THREE.Vector3().fromBufferAttribute(n, id))); assert.ok(cross.length() > 1e-10, mesh.name + ' collapsed face ' + i / 3); assert.ok(cross.dot(normal) > 0, mesh.name + ' normal opposes visible face ' + i / 3);
        }
      }
      assert.equal(ve, p.count); assert.equal(ie, g.index.count);
    }
  });

  it('joins the actual neck surface and normals and embeds the continuous median fin along its full root path', () => {
    const [body, head] = fixture().children, bodySkin = vertices(body, part(body, 'body-skin')), headSkin = vertices(head, part(head, 'head-skin'));
    const joins = bodySkin.map((point, i) => ({ point, i, j: headSkin.findIndex(other => point.distanceTo(other) < 3e-7) })).filter(row => row.j >= 0);
    assert.equal(joins.length, 24, 'A complete physical ring, not metadata alone, must meet at the neck');
    const bn = new THREE.Matrix3().getNormalMatrix(body.matrix), hn = new THREE.Matrix3().getNormalMatrix(head.matrix);
    for (const row of joins) {
      const a = new THREE.Vector3().fromBufferAttribute(body.geometry.attributes.normal, part(body, 'body-skin').vertexStart + row.i).applyMatrix3(bn).normalize();
      const b = new THREE.Vector3().fromBufferAttribute(head.geometry.attributes.normal, part(head, 'head-skin').vertexStart + row.j).applyMatrix3(hn).normalize(); assert.ok(a.dot(b) > 1 - 1e-6, 'Preserved nonuniform head scaling must not create a neck lighting seam');
    }
    const finPart = part(body, 'continuous-median-fin'), fin = vertices(body, finPart), skin = triangles(body, [part(body, 'body-skin')]), all = vertices(body), rootPairs = body.geometry.userData.clMorayGeometry.finRootVertexIndices;
    assert.ok(rootPairs.length > 20, 'The complete dorsal-to-caudal-to-anal root path must be represented');
    for (const pair of rootPairs) { assert.equal(pair.length, 2); assert.ok(pair.every(i => Number.isInteger(i) && i >= finPart.vertexStart && i < finPart.vertexStart + finPart.vertexCount)); const root = all[pair[0]].clone().add(all[pair[1]]).multiplyScalar(.5); assert.ok(distance(root, skin) < 3e-7, 'Actual fin-root midpoints must remain on the skin'); }
    assert.ok(fin.some(point => distance(point, skin) > .04)); assert.ok(Math.min(...fin.map(point => point.z)) < -1.6, 'The membrane continues around the tapered tail');
  });

  it('has a ray-open recessed mouth, separated teeth and two real recessed gill openings', () => {
    const [, head] = fixture().children, headSurface = surface(head), skin = triangles(head, [part(head, 'head-skin'), part(head, 'mouth-recess')]);
    try {
      const hits = new THREE.Raycaster(new THREE.Vector3(0, -.025, 2.4), new THREE.Vector3(0, 0, -1)).intersectObject(headSurface.object, false);
      assert.ok(hits.length); assert.ok(hits[0].point.z > 1.7 && hits[0].point.z < 1.9, 'The center ray passes between teeth and enters the mouth');
      const upper = vertices(head, part(head, 'upper-teeth')), lower = vertices(head, part(head, 'lower-teeth'));
      assert.ok(Math.min(...upper.map(point => point.y)) - Math.max(...lower.map(point => point.y)) > .025, 'The jaw gape must remain visibly open');
      for (const row of [upper, lower]) { assert.equal(row.length % 8, 0); for (let i = 0; i < row.length; i += 8) assert.ok(distance(row[i + 6], skin) < .015, 'Tooth bases must meet an actual jaw surface'); }
      for (const [name, side] of [['gill-left', -1], ['gill-right', 1]]) {
        const points = vertices(head, part(head, name)), opening = points.slice(0, 4), center = opening.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(.25);
        for (const point of opening) assert.ok(distance(point, triangles(head, [part(head, 'head-skin')])) < 3e-7);
        const hit = new THREE.Raycaster(new THREE.Vector3(side, center.y, center.z), new THREE.Vector3(-side, 0, 0)).intersectObject(headSurface.object, false)[0];
        assert.ok(hit); assert.ok((center.x - hit.point.x) * side > .01 && (center.x - hit.point.x) * side < .03, 'A side ray must reach the gill recess rather than an uncut skin patch');
      }
    } finally { headSurface.close(); }
  });

  it('seats dark bilateral pupils on the real cheek triangles and faces anatomy toward lookAt targets', () => {
    const root = fixture(), head = root.children[1], skin = triangles(head, [part(head, 'head-skin')]);
    for (const [eye, side] of [[root.children[2], -1], [root.children[3], 1]]) {
      const points = vertices(eye); for (const point of points) assert.ok(distance(point, skin) < .019 && distance(point, skin) > 0, 'Eyes must follow the actual cheek surface');
      const n = eye.geometry.attributes.normal, matrix = new THREE.Matrix3().getNormalMatrix(eye.matrix); for (let i = 0; i < n.count; i++) assert.ok(new THREE.Vector3().fromBufferAttribute(n, i).applyMatrix3(matrix).x * side > 0);
      const color = eye.geometry.attributes.color, mean = s => { let sum = 0; for (let i = s.vertexStart; i < s.vertexStart + s.vertexCount; i++) sum += color.getX(i) + color.getY(i) + color.getZ(i); return sum / s.vertexCount; };
      assert.ok(mean(part(eye, 'pupil')) < mean(part(eye, 'iris')) * .15);
    }
    const nose = new THREE.Vector3(0, -.025, Math.max(...vertices(head).map(point => point.z))), rear = vertices(root.children[0]).sort((a, b) => a.z - b.z)[0];
    for (const target of [new THREE.Vector3(5, .25, 3), new THREE.Vector3(-5, .25, 4), new THREE.Vector3(-3, .25, -6)]) {
      root.position.set(0, .25, 0); root.lookAt(target); root.updateMatrixWorld(true);
      const visible = nose.clone().applyMatrix4(root.matrixWorld).sub(rear.clone().applyMatrix4(root.matrixWorld)).setY(0).normalize(), desired = target.clone().sub(root.position).setY(0).normalize();
      assert.ok(visible.dot(desired) > .997, 'The actual tapered silhouette must point forward despite its lateral tail bend');
    }
  });

  it('keeps deterministic static buffers and independent ownership across idle and pursuit poses', () => {
    const root = fixture(), neighbor = fixture(), original = records(root); assert.deepEqual(records(neighbor), original);
    const saved = root.children.map(mesh => ({ geometry: mesh.geometry, material: mesh.material, attrs: Object.values(mesh.geometry.attributes), index: mesh.geometry.index, versions: Object.values(mesh.geometry.attributes).map(attr => attr.version) }));
    for (let frame = 0; frame < 32; frame++) { root.position.set(14, .25 + Math.sin(frame) * .05, 11); root.lookAt(Math.cos(frame) * 8, .25, Math.sin(frame) * 8); root.updateMatrixWorld(true); }
    assert.deepEqual(records(root), original); root.children.forEach((mesh, i) => { assert.equal(mesh.geometry, saved[i].geometry); assert.equal(mesh.material, saved[i].material); assert.equal(mesh.geometry.index, saved[i].index); assert.deepEqual(Object.values(mesh.geometry.attributes), saved[i].attrs); assert.deepEqual(Object.values(mesh.geometry.attributes).map(attr => attr.version), saved[i].versions); });
    let own = 0, other = 0; root.children.forEach(mesh => [mesh.geometry, mesh.material].forEach(resource => resource.addEventListener('dispose', () => own++))); neighbor.children.forEach(mesh => [mesh.geometry, mesh.material].forEach(resource => resource.addEventListener('dispose', () => other++)));
    root.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); }); root.parent.remove(root); assert.equal(own, 8); assert.equal(other, 0); assert.deepEqual(records(neighbor), original);
  });

  it('keeps the one-mesh stone crevice behind the real open head and preserves its shader fallback', () => {
    function region(a, b) { const start = source.indexOf(a), end = source.indexOf(b, start); assert.ok(start >= 0 && end > start, a); return source.slice(start, end); }
    const helpers = region('function shadeCLHuntRockSurface(', 'function shadeCLHuntCoralSurface(') + region('function reefSurface(shader){', '// ─── Reef rocks') + region('function createCLHuntDenRockGeometry(', 'function createCLHuntDenShadowGeometry(');
    const build = new Function('THREE', 'Math', 'renderer', 'var scene=new THREE.Scene(),morayHome={x:14,z:11};' + helpers + region('function createCLHuntMorayHomeGeometry(', '// ─── Grouper') + ';return{scene,marker:dornRing,shader:shadeCLHuntRockSurface,fallback:reefSurface};');
    const root = fixture(); root.updateMatrixWorld(true);
    for (const derivatives of [false, true]) {
      const item = build(THREE, Object.assign(Object.create(Math), { random() { throw new Error('The fixed home marker must not consume world randomness'); } }), { capabilities: { isWebGL2: false }, extensions: { has(name) { assert.equal(name, 'OES_standard_derivatives'); return derivatives; } } }); fixtures.push(item);
      const mesh = item.marker, g = mesh.geometry, p = g.attributes.position, n = g.attributes.normal;
      assert.equal(item.scene.children.length, 1); assert.equal(mesh.name, 'cl-moray-home'); assert.deepEqual(mesh.position.toArray(), [14, .15, 11]); assert.equal(mesh.rotation.x, Math.PI / 2);
      assert.equal(p.count, 880); assert.equal(g.index.count / 3, 400); assert.equal(g.groups.length, 0); assert.equal(g.userData.clMorayHomeParts.length, 5);
      assert.equal(mesh.material.name, 'cl-moray-home-material'); assert.equal(mesh.material.vertexColors, true); assert.equal(mesh.material.transparent, false); assert.equal(mesh.material.roughness, .9); assert.ok(!Object.values(mesh.material).some(value => value?.isTexture));
      assert.equal(mesh.material.onBeforeCompile, derivatives ? item.shader : item.fallback); if (derivatives) assert.equal(mesh.material.customProgramCacheKey(), 'cl-rock-surface-v1');
      assert.deepEqual(Object.keys(g.attributes).sort(), ['color', 'normal', 'position']); assert.ok(Object.values(g.attributes).every(attr => Array.from(attr.array).every(Number.isFinite)));
      for (let i = 0; i < p.count; i++) { const point = new THREE.Vector3().fromBufferAttribute(p, i); assert.ok(g.boundingBox.distanceToPoint(point) < 1e-7); assert.ok(point.distanceTo(g.boundingSphere.center) <= g.boundingSphere.radius + 1e-7); assert.ok(Math.abs(new THREE.Vector3().fromBufferAttribute(n, i).length() - 1) < 1e-5); }
      mesh.updateMatrixWorld(true); const markerBounds = new THREE.Box3().setFromObject(mesh), headBounds = new THREE.Box3().setFromObject(root.children[1]);
      assert.ok(headBounds.min.z - markerBounds.max.z > .5, 'The actual merged stones must leave the +Z head and mouth clear');
      const hit = new THREE.Raycaster(new THREE.Vector3(14, .15, 14), new THREE.Vector3(0, 0, -1)).intersectObject(mesh, false)[0];
      assert.ok(hit, 'The open entrance must reveal a real rear stone'); assert.ok(hit.point.z < 10.7, 'The forward entrance stays open rather than becoming a solid plug');
    }
  });
});
