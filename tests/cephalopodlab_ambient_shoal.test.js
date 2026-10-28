import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The daytime reef had no small fish above it. An instanced shoal of fusiliers now
// mills in midwater ahead of the camera and parts around the player's animal.
const require = createRequire(import.meta.url);
const testDirectory = dirname(fileURLToPath(import.meta.url));
const repo = existsSync(resolve(testDirectory, '../vendor/three-r128/three.min.js')) ? resolve(testDirectory, '..') : resolve(testDirectory, '../../..');
const THREE = require(resolve(repo, 'vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || resolve(repo, 'stem_lab/stem_tool_cephalopodlab.js'), 'utf8').replace(/\r\n/g, '\n');
function braced(start) {
  const open = source.indexOf('{', start);
  let depth = 0, quote = '', lineComment = false, blockComment = false;
  for (let i = open; i < source.length; i++) {
    const c = source[i], next = source[i + 1];
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && next === '/') { blockComment = false; i++; } continue; }
    if (quote) { if (c === '\\') { i++; continue; } if (c === quote) quote = ''; continue; }
    if (c === '/' && next === '/') { lineComment = true; i++; continue; }
    if (c === '/' && next === '*') { blockComment = true; i++; continue; }
    if (c === '\'' || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth++; if (c === '}' && !--depth) return source.slice(start, i + 1);
  }
  throw new Error('Unterminated block');
}
const visualMath = Object.create(Math);
visualMath.random = () => { throw new Error('The shoal consumed the dive RNG'); };

function build(quality) {
  const start = source.indexOf('        // ─── Ambient shoal ───');
  expect(start).toBeGreaterThan(0);
  const fnAt = source.indexOf('function updateAmbientShoal(', start);
  const block = source.slice(start, fnAt) + braced(fnAt);
  const octopus = new THREE.Object3D(), camera = new THREE.PerspectiveCamera(70, 1.6, 0.1, 200);
  octopus.position.set(0, 0.5, 0); camera.position.set(0, 2.9, -4.6); camera.lookAt(octopus.position); camera.updateMatrixWorld(true);
  const added = [];
  const make = new Function('THREE', 'quality', 'octopus', 'camera', 'scene', 'Math', block + ';return {mesh:shoalMesh,update:updateAmbientShoal};');
  const { mesh, update } = make(THREE, quality, octopus, camera, { add: (o) => added.push(o) }, visualMath);
  const M = new THREE.Matrix4(), v = new THREE.Vector3();
  const fish = () => Array.from({ length: mesh.count }, (_, i) => { mesh.getMatrixAt(i, M); return v.setFromMatrixPosition(M).clone(); });
  return { mesh, update, octopus, camera, added, fish };
}
const meanZ = (pts) => pts.reduce((s, p) => s + p.z, 0) / pts.length;

describe('Cephalopod Lab ambient reef shoal', () => {
  it('adds one instanced mesh sized by graphics quality, without touching the dive RNG', () => {
    for (const [quality, count] of [['low', 28], ['balanced', 48], ['high', 70]]) {
      const s = build(quality);
      try {
        expect(s.added).toEqual([s.mesh]);
        expect(s.mesh.isInstancedMesh).toBe(true);
        expect(s.mesh.count).toBe(count);
        expect(s.mesh.name).toBe('cl-ambient-shoal');
      } finally { s.mesh.geometry.dispose(); s.mesh.material.dispose(); }
    }
  });

  it('shows the shoal only on a daylit reef', () => {
    const s = build('balanced');
    try {
      s.update(0.05, 1, 1, false); expect(s.mesh.visible).toBe(true);       // reef, day
      s.update(0.05, 1, 0.1, false); expect(s.mesh.visible).toBe(false);    // night: fusiliers shelter in the reef
      s.update(0.05, 0.05, 1, false); expect(s.mesh.visible).toBe(false);   // the deep has no reef fish
    } finally { s.mesh.geometry.dispose(); s.mesh.material.dispose(); }
  });

  it('forms ahead of the camera, and re-forms ahead after being left behind', () => {
    const s = build('balanced');
    try {
      s.update(0.05, 1, 1, false);
      expect(meanZ(s.fish())).toBeGreaterThan(s.octopus.position.z + 4);      // camera at -z looks toward +z
      // turn the view around: camera now at +z looking toward -z
      s.camera.position.set(0, 2.9, 4.6); s.camera.lookAt(s.octopus.position); s.camera.updateMatrixWorld(true);
      for (let i = 0; i < 40; i++) s.update(0.05, 1, 1, false);               // 2 s behind the camera
      expect(meanZ(s.fish())).toBeLessThan(s.octopus.position.z - 3);
    } finally { s.mesh.geometry.dispose(); s.mesh.material.dispose(); }
  });

  it('parts around the predator (the fountain effect) and closes again when it leaves', () => {
    const s = build('balanced');
    try {
      for (let i = 0; i < 20; i++) s.update(0.05, 1, 1, false);
      const pts = s.fish(), c = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length);
      s.octopus.position.copy(c);                                                 // the animal swims into the middle of the shoal
      const near = () => s.fish().filter((p) => p.distanceTo(s.octopus.position) < 1.5).length;
      const before = near();
      expect(before).toBeGreaterThan(3);
      for (let i = 0; i < 20; i++) s.update(0.05, 1, 1, false);
      expect(near()).toBeLessThan(before / 3);
    } finally { s.mesh.geometry.dispose(); s.mesh.material.dispose(); }
  });

  it('keeps every fish under the reduced-motion speed limit', () => {
    const s = build('balanced');
    try {
      s.update(0.05, 1, 1, true);
      let prev = s.fish(), fastest = 0;
      for (let i = 0; i < 40; i++) {
        s.update(0.05, 1, 1, true);
        const now = s.fish();
        now.forEach((p, k) => { fastest = Math.max(fastest, p.distanceTo(prev[k]) / 0.05); });
        prev = now;
      }
      expect(fastest).toBeLessThanOrEqual(0.9 + 1e-3); // positions are Float32: ~1e-6 m / 0.05 s of rounding
    } finally { s.mesh.geometry.dispose(); s.mesh.material.dispose(); }
  });
});
