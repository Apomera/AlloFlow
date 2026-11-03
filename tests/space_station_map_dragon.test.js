import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const THREE = vendor.THREE;
const build = new Function(source.slice(source.indexOf('  function issDragonCapsuleGeometry('), source.indexOf('  function issModuleEndcapCanvas(')) + '\nreturn issDragonCapsuleGeometry;')();
const radius = (attribute, i) => Math.hypot(attribute.getX(i), attribute.getZ(i));
function ring(geometry, y) {
  const p = geometry.getAttribute('position'), radii = [];
  for (let i = 0; i < p.count; i++) if (Math.abs(p.getY(i) - y) < 1e-7) radii.push(radius(p, i));
  expect(radii.length).toBeGreaterThan(0);
  return Math.max(...radii);
}

describe('schematic Dragon rounded capsule geometry', () => {
  it('preserves the original envelope with a smooth, bounded triangle budget', () => {
    const geometry = build(THREE);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    for (const key of ['x', 'z']) {
      expect(box.min[key]).toBeCloseTo(-.3, 7); expect(box.max[key]).toBeCloseTo(.3, 7);
    }
    expect(box.min.y).toBeCloseTo(-.36, 7); expect(box.max.y).toBeCloseTo(.36, 7);
    expect(geometry.getAttribute('position').count).toBeLessThanOrEqual(363);
    expect(geometry.index.count / 3).toBeLessThanOrEqual(640);
    expect(geometry.parameters.segments).toBe(32);
    geometry.dispose();
  });

  it('has a blunt docking neck and full shoulder instead of a sharp cone apex', () => {
    const geometry = build(THREE);
    expect(ring(geometry, .36)).toBeCloseTo(.09, 7);
    expect(ring(geometry, -.36)).toBeCloseTo(.3, 7);
    expect(ring(geometry, 0)).toBeCloseTo(.224, 7);
    expect(ring(geometry, 0)).toBeGreaterThan(.3 / 2 + .05);
    const points = geometry.parameters.points.slice(1, -1);
    points.slice(1).forEach((point, i) => {
      expect(point.y).toBeGreaterThan(points[i].y);
      expect(point.x).toBeLessThanOrEqual(points[i].x);
      expect(point.x).toBeGreaterThanOrEqual(.09);
    });
    geometry.dispose();
  });

  it('provides finite unit normals and complete UVs, including caps and the wrap seam', () => {
    const geometry = build(THREE), positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal'), uv = geometry.getAttribute('uv');
    expect(normals.count).toBe(positions.count); expect(uv.count).toBe(positions.count);
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
    expect(Array.from(uv.array).every(Number.isFinite)).toBe(true);
    for (let i = 0; i < normals.count; i++) {
      expect(Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i))).toBeCloseTo(1, 5);
    }
    const stride = geometry.parameters.points.length;
    for (let row = 0; row < stride; row++) {
      const end = 32 * stride + row;
      for (const get of ['getX', 'getY', 'getZ']) {
        expect(positions[get](row)).toBeCloseTo(positions[get](end), 7);
        expect(normals[get](row)).toBeCloseTo(normals[get](end), 7);
      }
    }
    geometry.dispose();
  });

  it('closes both caps with outward-facing triangles and no unwelded geometric edge', () => {
    const geometry = build(THREE), p = geometry.getAttribute('position'), index = geometry.index;
    const edges = new Map(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3();
    const key = i => [p.getX(i), p.getY(i), p.getZ(i)].map(v => Math.round(v * 1e7)).join(',');
    let volume = 0, triangles = 0;
    for (let i = 0; i < index.count; i += 3) {
      const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      a.fromBufferAttribute(p, ids[0]); b.fromBufferAttribute(p, ids[1]); c.fromBufferAttribute(p, ids[2]);
      if (ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() < 1e-10) continue;
      volume += a.dot(ab.copy(b).cross(ac.copy(c))) / 6; triangles++;
      for (let e = 0; e < 3; e++) {
        const edge = [key(ids[e]), key(ids[(e + 1) % 3])].sort().join('|');
        edges.set(edge, (edges.get(edge) || 0) + 1);
      }
    }
    expect(triangles).toBeGreaterThan(500);
    expect(volume).toBeGreaterThan(.05); expect(volume).toBeLessThan(Math.PI * .3 ** 2 * .72);
    expect([...edges.values()].every(count => count === 2)).toBe(true);
    geometry.dispose();
  });

  it('meets the unchanged docking connector and trunk at their actual world-space end rings', () => {
    const geometry = build(THREE), capsule = new THREE.Mesh(geometry);
    capsule.rotation.x = Math.PI / 2; capsule.position.set(0, 0, -4.68); capsule.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(capsule);
    expect(bounds.min.z).toBeCloseTo(-5.04, 7); expect(bounds.max.z).toBeCloseTo(-4.32, 7);
    const connector = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .12, 10));
    connector.rotation.x = Math.PI / 2; connector.position.set(0, 0, -4.26); connector.updateMatrixWorld(true);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .82, 16));
    trunk.rotation.x = Math.PI / 2; trunk.position.set(0, 0, -5.45); trunk.updateMatrixWorld(true);
    expect(bounds.max.z).toBeCloseTo(new THREE.Box3().setFromObject(connector).min.z, 7);
    expect(bounds.min.z).toBeCloseTo(new THREE.Box3().setFromObject(trunk).max.z, 7);
    expect(ring(geometry, .36)).toBeCloseTo(connector.geometry.parameters.radiusBottom, 7);
    expect(ring(geometry, -.36)).toBeCloseTo(trunk.geometry.parameters.radiusTop, 7);
    geometry.dispose(); connector.geometry.dispose(); trunk.geometry.dispose();
  });

  it('keeps the one-mesh material, visitor registration, name and transform integration', () => {
    expect(source).toContain('new THREE.Mesh(issDragonCapsuleGeometry(THREE), hullMat)');
    expect(source).toContain("dragonCap.name = 'iss-dragon-capsule'");
    expect(source).toContain('dragonCap.rotation.x = Math.PI / 2; dragonCap.position.set(0, 0, -4.68)');
    expect(source).toContain("addVisitor(dragonCap, 'harmony')");
  });
});
