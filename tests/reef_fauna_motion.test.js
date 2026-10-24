import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

// Procedural model and texture builds run several seconds on a busy machine.
vi.setConfig({ testTimeout: 30000 });

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8');
const local = {};
new Function('window', source)(local);
const S = local.Reef3DSpecies;

function compile(material) {
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
  material.onBeforeCompile(shader);
  return shader;
}
// A fish's tail and pectorals draw inside its 'fins' batch (one draw call): each
// part's vertices are a range in geometry.userData.batch; attribute reefPart holds
// each vertex in the part's own frame (as its separate mesh had it) and its slot,
// and the slot in the batch material's reefRig holds the fin flex (row 3).
function batchParts(root, names) {
  const out = [];
  root.traverse((mesh) => {
    if (!mesh.isMesh || !mesh.geometry.userData.batch) return;
    for (const range of mesh.geometry.userData.batch) if (names.includes(range.part)) out.push({ mesh, range });
  });
  return out;
}
function smooth(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function snapshot(handle) {
  const out = [];
  handle.root.updateMatrixWorld(true);
  handle.root.traverse((node) => {
    out.push(...node.matrixWorld.elements);
    if (node.isInstancedMesh) out.push(...node.instanceMatrix.array);
  });
  return out;
}

describe('Reef fauna stroke and schooling continuity', () => {
  it('holds flexible fin roots still and gives their moving tips a finite matching normal', () => {
    for (const id of ['blue_tang', 'clownfish', 'whitetip_reef_shark']) {
      const h = S.create(THREE, id, { seed: 8, quality: 'high' });
      let roots = 0, flexingTips = 0, parts = 0;
      try {
        h.update(0.016, 2.4, { speed: S.info(id).lengthM * 1.5, turn: 0.2 });
        for (const { mesh, range } of batchParts(h.root, ['tail', 'pectoral'])) {
          parts++;
          const shader = compile(mesh.material), swim = shader.uniforms.reefSwim.value, rig = shader.uniforms.reefRig.value, b = (range.slot - 1) * 20;
          const flex = { x: rig[b + 12], y: rig[b + 13], z: rig[b + 14], w: rig[b + 15] };
          expect(rig[b + 16], 'a pivoted membrane takes no body bend').toBe(0);
          const own = mesh.geometry.attributes.reefPart, uv = mesh.geometry.attributes.uv;
          const localX = (i) => own.getX(i);
          const deform = (x) => {
            const r = Math.max(-x, 0), envelope = r * r / (r * r + flex.z);
            return swim.y * flex.w * envelope * Math.sin(swim.x * flex.x + flex.y - swim.z * x);
          };
          for (let i = range.first; i < range.first + range.count; i++) {
            const x = localX(i), r = Math.max(-x, 0), den = r * r + flex.z;
            const phase = swim.x * flex.x + flex.y - swim.z * x;
            const slope = -swim.y * flex.w * (2 * r * flex.z / (den * den) * Math.sin(phase) + r * r / den * swim.z * Math.cos(phase));
            expect(Number.isFinite(slope)).toBe(true);
            if (uv.getY(i) === 0) {
              expect(Math.abs(deform(x)), 'root displacement').toBe(0); expect(Math.abs(slope), 'root slope').toBe(0); roots++;
            } else if (uv.getY(i) === 1) {
              const eps = 0.000001 * S.info(id).lengthM;
              expect(Math.abs(slope - (deform(x + eps) - deform(x - eps)) / (2 * eps)), 'normal follows the membrane deformation').toBeLessThan(0.00001);
              if (Math.abs(deform(x)) > S.info(id).lengthM * 0.0001) flexingTips++;
              expect(Math.abs(deform(x))).toBeLessThanOrEqual(Math.abs(swim.y * flex.w));
            }
          }
        }
        expect(parts, id + ' draws its tail and both pectorals').toBe(3);
        expect(roots).toBeGreaterThan(20); expect(flexingTips).toBeGreaterThan(10);
      } finally { h.dispose(); }
    }
  });

  it('keeps every independently gliding school tail attached to its flexing body', () => {
    const h = S.createSchool(THREE, 'anthias', 37, { seed: 21, quality: 'low' });
    const body = h.root.getObjectByName('anthias-body'), tail = h.root.getObjectByName('anthias-tail');
    const shader = compile(body.material), beats = body.geometry.attributes.reefSchoolBeat;
    const bodyMatrix = new THREE.Matrix4(), tailMatrix = new THREE.Matrix4(), relative = new THREE.Matrix4();
    const envelopes = new Set();
    let worstAttachmentError = 0;
    try {
      for (const t of [0, 0.17, 1.4, 5.5, 17, 41.125, 120]) {
        h.update(0.016, t, { speed: 0.24, turn: 0.35 });
        const swim = shader.uniforms.reefSwim.value, xp = shader.uniforms.reefSwimShape.value.y;
        for (let i = 0; i < h.count; i++) {
          const phase = swim.x * beats.getX(i) + beats.getY(i);
          const envelope = (0.42 + 0.58 * smooth(-0.38, 0.72, Math.sin(swim.w * 0.62 * beats.getX(i) + beats.getZ(i)))) * beats.getW(i);
          const bodyEnd = swim.y * envelope * Math.sin(phase - swim.z * xp);
          body.getMatrixAt(i, bodyMatrix); tail.getMatrixAt(i, tailMatrix);
          relative.copy(bodyMatrix).invert().multiply(tailMatrix);
          const p = new THREE.Vector3().setFromMatrixPosition(relative);
          worstAttachmentError = Math.max(worstAttachmentError, Math.abs(p.x - xp), Math.abs(p.y), Math.abs(p.z - bodyEnd));
          if (t === 5.5) envelopes.add(Math.round(envelope * 1000));
        }
      }
      expect(worstAttachmentError, 'CPU tail attachment follows the same individual stroke as the GPU body').toBeLessThan(0.00001);
      expect(envelopes.size, 'members do not all start and finish gliding together').toBeGreaterThan(25);
    } finally { h.dispose(); }
  });

  it('keeps all school species separated and bounded through long turns and changes of current', () => {
    const matrix = new THREE.Matrix4(), p = new THREE.Vector3();
    for (const id of ['anthias', 'blue_green_chromis', 'bluestripe_snapper', 'bumphead_parrotfish']) {
      const h = S.createSchool(THREE, id, 60, { seed: 7, quality: 'low' });
      const body = h.root.getObjectByName(id + '-body'), L = S.info(id).lengthM;
      let minGap = Infinity, farthest = 0;
      try {
        for (let frame = 0; frame < 181; frame++) {
          const t = frame * 0.7;
          h.update(0.7, t, { speed: L * (0.7 + 0.65 * (1 + Math.sin(t * 0.08))), turn: 0.8 * Math.sin(t * 0.11), current: { x: 0.08, z: -0.04, strength: 0.9 } });
          const centers = [];
          for (let i = 0; i < h.count; i++) {
            body.getMatrixAt(i, matrix); p.setFromMatrixPosition(matrix);
            farthest = Math.max(farthest, p.length());
            for (const other of centers) minGap = Math.min(minGap, p.distanceTo(other));
            centers.push(p.clone());
          }
        }
        expect(minGap / L, id + ' retains personal space').toBeGreaterThan(0.43);
        expect(farthest + L * 0.5, id + ' stays inside its culling radius').toBeLessThan(h.radius);
      } finally { h.dispose(); }
    }
  });

  it('returns to exactly the same swimming pose after culling, reverse seeking, and different render cadences', () => {
    for (const school of [false, true]) {
      const create = () => school ? S.createSchool(THREE, 'blue_green_chromis', 17, { seed: 8, quality: 'low' }) : S.create(THREE, 'blue_tang', { seed: 8, quality: 'low' });
      const a = create(), b = create();
      const motion = { speed: 0.26, turn: -0.3, current: { x: 0.04, z: 0.03, strength: 0.8 } };
      try {
        for (let frame = 0; frame <= 180; frame++) a.update(1 / 60, frame / 60, motion);
        b.update(90, 90, motion); b.update(-87, 3, motion);
        expect(snapshot(a)).toEqual(snapshot(b));
        a.update(1000, 99999.25, motion); b.update(1 / 30, 99999.25, motion);
        expect(snapshot(a)).toEqual(snapshot(b));
        expect(snapshot(a).every(Number.isFinite)).toBe(true);
      } finally { a.dispose(); b.dispose(); }
    }
  });
});
