import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_migration.js'), 'utf8');
const from = source.indexOf('      function disposeMigrationObject(');
const until = source.indexOf('      function releaseMigrationStudyPointer(', from);
if (from < 0 || until <= from) throw new Error('Missing actual scene disposer');
const dispose = new Function(source.slice(from, until) + '\nreturn disposeMigrationObject;')();

function observe(resource) {
  let count = 0;
  resource.addEventListener('dispose', () => count++);
  return () => count;
}

describe('Migration shared scene resource cleanup', () => {
  it('releases a pooled geometry, material and texture once across nested clouds', () => {
    const root = new THREE.Group(), nested = new THREE.Group();
    const geometry = new THREE.SphereGeometry(1, 8, 6);
    const texture = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({ map: texture });
    const calls = [geometry, material, texture].map(observe);
    for (let index = 0; index < 12; index++) nested.add(new THREE.Mesh(geometry, material));
    root.add(nested, new THREE.Mesh(geometry, material));
    dispose(root);
    expect(calls.map(count => count())).toEqual([1, 1, 1]);
  });

  it('handles material arrays and two distinct materials sharing one star texture', () => {
    const root = new THREE.Group();
    const geometry = new THREE.BufferGeometry();
    const texture = new THREE.Texture();
    const first = new THREE.MeshBasicMaterial({ map: texture });
    const second = new THREE.PointsMaterial({ map: texture });
    const calls = [geometry, texture, first, second].map(observe);
    root.add(new THREE.Mesh(geometry, [first, first]), new THREE.Points(geometry, second), new THREE.Mesh(geometry, first));
    dispose(root);
    expect(calls.map(count => count())).toEqual([1, 1, 1, 1]);
  });

  it('releases every instance attribute owner while sharing one geometry and material', () => {
    const root = new THREE.Group();
    const geometry = new THREE.SphereGeometry(1, 8, 6);
    const material = new THREE.MeshStandardMaterial();
    const first = new THREE.InstancedMesh(geometry, material, 3);
    const second = new THREE.InstancedMesh(geometry, material, 5);
    const calls = [first, second, geometry, material].map(observe);
    root.add(first, second);
    dispose(root);
    expect(calls.map(count => count())).toEqual([1, 1, 1, 1]);
  });

  it('releases distinct resources without touching another live scene', () => {
    const root = new THREE.Group(), other = new THREE.Group();
    const first = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    const second = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    const external = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshBasicMaterial());
    const calls = [first.geometry, first.material, second.geometry, second.material, external.geometry, external.material].map(observe);
    root.add(first, second); other.add(external);
    dispose(root);
    expect(calls.map(count => count())).toEqual([1, 1, 1, 1, 0, 0]);
  });

  it('allows empty roots and null material slots while releasing valid resources', () => {
    const geometry = new THREE.BufferGeometry(), material = new THREE.MeshBasicMaterial();
    const root = new THREE.Group();
    root.add(new THREE.Mesh(geometry, [null, material, null]));
    const calls = [geometry, material].map(observe);
    expect(() => { dispose(null); dispose({}); dispose(new THREE.Group()); dispose(root); }).not.toThrow();
    expect(calls.map(count => count())).toEqual([1, 1]);
  });
});
