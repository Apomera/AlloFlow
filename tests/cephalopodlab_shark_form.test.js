import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The reef shark used to be a sphere stretched along X with cone fins, while
// the hunt aims it with Object3D.lookAt(), which points local +Z at the target:
// it swam broadside to every charge. These checks run the production builder.
const require = createRequire(import.meta.url);
const testDirectory = dirname(fileURLToPath(import.meta.url));
const repo = existsSync(resolve(testDirectory, '../vendor/three-r128/three.min.js')) ? resolve(testDirectory, '..') : resolve(testDirectory, '../../..');
const THREE = require(resolve(repo, 'vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || resolve(repo, 'stem_lab/stem_tool_cephalopodlab.js'), 'utf8').replace(/\r\n/g, '\n');

function braced(start) {
  let depth = 0, quote = '';
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (quote) { if (c === '\\') { i++; continue; } if (c === quote) quote = ''; continue; }
    if (c === '\'' || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    if (c === '}' && !--depth) return source.slice(start, i + 1);
  }
  throw new Error('Unterminated block');
}
const helper = (name) => { const at = source.indexOf('function ' + name + '('); if (at < 0) throw new Error('missing ' + name); return braced(at); };
const build = new Function('T', helper('createCLHuntSharkGeometry') + helper('mergeCLSharkGeometries') + ';return createCLHuntSharkGeometry(T);');

function vertices(geometry) {
  const p = geometry.attributes.position.array, c = geometry.attributes.color.array, out = [];
  for (let i = 0; i < p.length; i += 3) out.push({ x: p[i], y: p[i + 1], z: p[i + 2], lum: 0.2126 * c[i] + 0.7152 * c[i + 1] + 0.0722 * c[i + 2] });
  return out;
}

describe('Cephalopod Hunter reef shark form', () => {
  it('is built nose-first along +Z, the axis lookAt aims, and spawnShark uses it', () => {
    const { body, tail } = build(THREE);
    try {
      body.computeBoundingBox();
      const box = body.boundingBox, size = box.getSize(new THREE.Vector3());
      // Width includes the swept pectorals, so it gets a looser ratio than height.
      expect(size.z).toBeGreaterThan(size.x * 1.6);
      expect(size.z).toBeGreaterThan(size.y * 2.2);
      expect(box.max.z).toBeGreaterThan(1.9);
      for (const a of [body.attributes.position.array, body.attributes.normal.array, tail.attributes.position.array]) expect(Array.from(a).every(Number.isFinite)).toBe(true);
      // A group aimed with lookAt() puts the snout toward the target.
      const group = new THREE.Group(), mesh = new THREE.Mesh(body);
      group.add(mesh); group.position.set(3, 1, -2); group.lookAt(-7, 1, 4); group.updateMatrixWorld(true);
      const snout = new THREE.Vector3(0, 0, box.max.z).applyMatrix4(mesh.matrixWorld), tailBase = new THREE.Vector3(0, 0, box.min.z).applyMatrix4(mesh.matrixWorld);
      const heading = snout.sub(tailBase).normalize(), toTarget = new THREE.Vector3(-10, 0, 6).normalize();
      expect(heading.dot(toTarget)).toBeGreaterThan(0.99);
      const spawn = braced(source.indexOf('function spawnShark('));
      expect(spawn).toContain('createCLHuntSharkGeometry(THREE)');
      expect(spawn).not.toMatch(/SphereGeometry\(0\.8/);
    } finally { body.dispose(); tail.dispose(); }
  });

  it('is countershaded: the belly is clearly lighter than the back', () => {
    const { body, tail } = build(THREE);
    try {
      const mid = vertices(body).filter((v) => v.z > -0.6 && v.z < 1.0);
      const top = mid.filter((v) => v.y > 0.2), bottom = mid.filter((v) => v.y < -0.18);
      const mean = (list) => list.reduce((a, v) => a + v.lum, 0) / list.length;
      expect(top.length).toBeGreaterThan(5); expect(bottom.length).toBeGreaterThan(5);
      expect(mean(bottom)).toBeGreaterThan(mean(top) * 2.5);
    } finally { body.dispose(); tail.dispose(); }
  });

  it('has a heterocercal tail: the upper lobe reaches higher than the lower reaches down', () => {
    const { body, tail } = build(THREE);
    try {
      const ys = vertices(tail).map((v) => v.y);
      expect(Math.max(...ys)).toBeGreaterThan(-Math.min(...ys) * 1.4);
      expect(source).toMatch(/shark\.userData\.tail\.rotation\.y = gameState\.a11y\.reducedMotion \? 0 :/);
    } finally { body.dispose(); tail.dispose(); }
  });
});
