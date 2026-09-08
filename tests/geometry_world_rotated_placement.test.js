import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

let THREE, makeShape, placementCellForHit;
beforeAll(() => {
  const exports = {};
  new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(exports, { exports });
  THREE = exports;
  window.THREE = THREE;
  const source = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');
  makeShape = new Function(source.slice(source.indexOf('  function createShapeGeometry('), source.indexOf('  // Format fractional volume for display')) + '\nreturn createShapeGeometry;')();
  const start = source.indexOf('        engine.placementCellForHit = function(hit) {');
  const helperEnd = '\n        };';
  const end = source.indexOf(helperEnd, start) + helperEnd.length;
  const engine = {};
  new Function('engine', 'THREE', source.slice(start, end))(engine, THREE);
  placementCellForHit = engine.placementCellForHit;
});

function triangle(mesh, acceptsNormal) {
  const geometry = mesh.geometry, positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal');
  const index = geometry.getIndex(), count = index ? index.count : positions.count;
  for (let i = 0; i < count; i += 3) {
    const a = index ? index.getX(i) : i, b = index ? index.getX(i + 1) : i + 1, c = index ? index.getX(i + 2) : i + 2;
    const normal = new THREE.Vector3().fromBufferAttribute(normals, a);
    if (!acceptsNormal(normal)) continue;
    const vertices = [a, b, c].map(vertex => new THREE.Vector3().fromBufferAttribute(positions, vertex).applyMatrix4(mesh.matrixWorld));
    const center = vertices[0].clone().add(vertices[1]).add(vertices[2]).multiplyScalar(1 / 3);
    // Derive outward direction from the rendered triangle, independently of the
    // helper's normal-matrix calculation.
    const outward = vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0])).normalize();
    return { center, outward };
  }
  throw new Error('Expected an eligible rendered face');
}

function castAtFace(mesh, acceptsNormal) {
  const face = triangle(mesh, acceptsNormal);
  const ray = new THREE.Raycaster(face.center.clone().addScaledVector(face.outward, 3), face.outward.clone().negate());
  const hit = ray.intersectObject(mesh)[0];
  expect(hit).toBeTruthy();
  return hit;
}

describe('Geometry World placement on rotated rendered faces', () => {
  const cases = ['cube', 'halfB', 'halfA', 'quarter'].flatMap(shape => [0, 1, 2, 3].map(rotation => [shape, rotation]));
  it.each(cases)('%s rotation %i places outside the actual aimed face', (shape, rotation) => {
    const mesh = new THREE.Mesh(makeShape(shape), new THREE.MeshBasicMaterial());
    const grid = { x: 4, y: 3, z: 6 };
    mesh.userData.gridPos = grid;
    mesh.position.set(4.5, 3 + (shape === 'cube' ? .5 : shape === 'halfB' ? .25 : 0), 6.5);
    mesh.rotation.y = rotation * Math.PI / 2;
    mesh.updateMatrixWorld(true);
    const beforePositions = Array.from(mesh.geometry.getAttribute('position').array);
    const beforeMatrix = mesh.matrixWorld.toArray();
    const hit = castAtFace(mesh, normal => normal.z > .999);
    const beforeNormal = hit.face.normal.toArray();
    const offset = [[0, 1], [1, 0], [0, -1], [-1, 0]][rotation];
    expect(placementCellForHit(hit)).toEqual({ x: grid.x + offset[0], y: grid.y, z: grid.z + offset[1] });
    expect(hit.face.normal.toArray()).toEqual(beforeNormal);
    expect(mesh.matrixWorld.toArray()).toEqual(beforeMatrix);
    expect(Array.from(mesh.geometry.getAttribute('position').array)).toEqual(beforePositions);
    mesh.geometry.dispose(); mesh.material.dispose();
  });

  it('uses the actual surface normal when a wedge has nonuniform scale', () => {
    const mesh = new THREE.Mesh(makeShape('halfA'), new THREE.MeshBasicMaterial());
    mesh.userData.gridPos = { x: 4, y: 3, z: 6 };
    mesh.position.set(4.5, 3, 6.5); mesh.rotation.y = Math.PI / 2; mesh.scale.set(2, .5, 1);
    mesh.updateMatrixWorld(true);
    const hit = castAtFace(mesh, normal => Math.abs(normal.x) > .6 && normal.y > .6);
    expect(placementCellForHit(hit)).toEqual({ x: 4, y: 4, z: 6 });
    mesh.geometry.dispose(); mesh.material.dispose();
  });

  it('retains identity behavior for simple hit fixtures without a matrix', () => {
    expect(placementCellForHit({ object: { userData: { gridPos: { x: 2, y: 3, z: 4 } } }, face: { normal: { x: -1, y: 0, z: 0 } } })).toEqual({ x: 1, y: 3, z: 4 });
  });

  it('returns no placement for missing face or grid metadata', () => {
    expect(placementCellForHit(null)).toBeNull();
    expect(placementCellForHit({ object: { userData: {} }, face: { normal: new THREE.Vector3(1, 0, 0) } })).toBeNull();
    expect(placementCellForHit({ object: { userData: { gridPos: { x: 0, y: 0, z: 0 } } } })).toBeNull();
  });
});
