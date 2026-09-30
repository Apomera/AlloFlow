import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/stem_tool_cephalopodlab.js', 'utf8');
const a = source.indexOf('function shadeCLHuntPlantFlex('), b = source.indexOf('function createCLHuntMarineSnowGeometry(', a);
if (a < 0 || b <= a) throw new Error('Live plant-flex helper region was not found');
const math = Object.create(Math);math.random = () => { throw new Error('Decorative flex must not consume gameplay randomness'); };
const { shade, configure, update, create } = new Function('Math', source.slice(a, b) + ';return{shade:shadeCLHuntPlantFlex,configure:createCLHuntPlantFlex,update:updateCLHuntPlantFlex,create:createCLHuntPlantGeometry};')(math);
function standardShader() { return { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader }; }
const shader = standardShader();shade(shader);
// Execute the live GLSL wave and derivative together, rather than maintaining
// a second hand-written displacement equation that could drift from rendering.
const waveDefinition = shader.vertexShader.match(/vec2 clPlantWave\(([^)]*)\)\{([^{}]*)\}/);
if (!waveDefinition) throw new Error('Live scalar wave function was not found');
const wave = new Function('sin', 'cos', 'vec2', 'return function(' + waveDefinition[1].replace(/float /g, '') + '){' + waveDefinition[2].replace(/\bfloat /g, 'let ') + '};')(Math.sin, Math.cos, (x, y) => [x, y]);
const xParameters = shader.vertexShader.match(/clPlantWave\(clPlantT,clPlantMotion\.x\+clPlantInstancePhase,([\d.]+),([\d.]+)\)/);
const zParameters = shader.vertexShader.match(/clPlantWave\(clPlantT,clPlantMotion\.y\+clPlantInstancePhase\*([\d.]+),([\d.]+),([\d.]+)\)/);
if (!xParameters || !zParameters) throw new Error('Live wave parameters were not found');
const xTravel = +xParameters[1], xAmplitude = +xParameters[2], phaseRatio = +zParameters[1], zTravel = +zParameters[2], zAmplitude = +zParameters[3];
function sample(point, height, phases, instancePhase = 0, enabled = 1) {
  const t = Math.max(0, Math.min(1, point.y / Math.max(height, .001)));
  const x = wave(t, phases[0] + instancePhase, xTravel, xAmplitude), z = wave(t, phases[1] + instancePhase * phaseRatio, zTravel, zAmplitude);
  return { point: new THREE.Vector3(point.x + x[0] * height * enabled, point.y, point.z + z[0] * height * enabled), slope: [x[1] * enabled, z[1] * enabled] };
}
function plant(kind, height, variant) {
  const geometry = create(THREE, kind, height, variant), material = new THREE.MeshStandardMaterial();
  const mesh = kind === 'grass' ? new THREE.InstancedMesh(geometry, material, 7) : new THREE.Mesh(geometry, material);
  if (kind === 'grass') mesh.frustumCulled = false;
  const before = { box: geometry.boundingBox.clone(), sphere: geometry.boundingSphere.clone() };
  const motion = configure(THREE, mesh, height);
  return { mesh, motion, before, dispose() { geometry.dispose();material.dispose(); } };
}

describe('Cephalopod Hunter rooted shader plant flex', () => {
  it('keeps roots and slopes fixed, bounds every wave, and matches its analytic derivative to finite differences', () => {
    expect([xAmplitude, zAmplitude]).toEqual([.12, .035]);
    for (const height of [.6, 1.9, 5, 9]) for (let phase = 0; phase < Math.PI * 2; phase += .31) for (let step = 0; step <= 40; step++) {
      const t = step / 40, phases = [phase, phase * 1.17], point = new THREE.Vector3(.13, t * height, -.08), result = sample(point, height, phases, 1.43);
      expect(result.point.toArray().every(Number.isFinite) && result.slope.every(Number.isFinite)).toBe(true);
      expect(Math.abs(result.point.x - point.x)).toBeLessThanOrEqual(.12 * height + 1e-12);
      expect(Math.abs(result.point.z - point.z)).toBeLessThanOrEqual(.035 * height + 1e-12);
      expect(result.point.distanceTo(point)).toBeLessThanOrEqual(.125 * height + 1e-12);
      if (step === 0) { expect(result.point.toArray()).toEqual(point.toArray());expect(result.slope.every(value => value === 0)).toBe(true); }
      if (step > 0 && step < 40) {
        const epsilon = 1e-5 * height, plus = sample(point.clone().add(new THREE.Vector3(0, epsilon, 0)), height, phases, 1.43).point;
        const minus = sample(point.clone().sub(new THREE.Vector3(0, epsilon, 0)), height, phases, 1.43).point;
        expect((plus.x - minus.x) / (2 * epsilon)).toBeCloseTo(result.slope[0], 8);
        expect((plus.z - minus.z) / (2 * epsilon)).toBeCloseTo(result.slope[1], 8);
      }
      expect(sample(point, height, phases, 1.43, 0).point.toArray()).toEqual(point.toArray());
    }
  });

  it('corrects normals with the inverse transpose before instance and world transforms', () => {
    expect(shader.vertexShader).toContain('objectNormal.y-=dot(clPlantSlope,objectNormal.xz);');
    expect(shader.vertexShader.indexOf('objectNormal.y-=')).toBeLessThan(shader.vertexShader.indexOf('#include <defaultnormal_vertex>'));
    expect(shader.vertexShader.indexOf('transformed+=clPlantOffset;')).toBeLessThan(shader.vertexShader.indexOf('#include <project_vertex>'));
    expect(THREE.ShaderChunk.defaultnormal_vertex).toContain('instanceMatrix');
    const model = new THREE.Matrix4().compose(new THREE.Vector3(13, -27, 9), new THREE.Quaternion().setFromEuler(new THREE.Euler(.13, 1.27, -.08)), new THREE.Vector3(1.1, .9, 1.3));
    const instance = new THREE.Matrix4().compose(new THREE.Vector3(.21, 0, -.16), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, .72, 0)), new THREE.Vector3(.62, .62, .62));
    const transform = model.clone().multiply(instance), normalMatrix = new THREE.Matrix3().getNormalMatrix(transform);
    for (const kind of ['grass', 'kelp']) {
      const height = kind === 'grass' ? 1.4 : 8.7, geometry = create(THREE, kind, height, 7);
      try {
        for (let i = 3; i < geometry.attributes.position.count - 3; i += 3) for (const phase of [.1, 1.8, 4.7]) {
          const point = new THREE.Vector3().fromBufferAttribute(geometry.attributes.position, i), normal = new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal, i).normalize();
          const reference = Math.abs(normal.y) < .9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
          const tangentA = reference.cross(normal).normalize(), tangentB = normal.clone().cross(tangentA).normalize(), epsilon = 1e-5;
          const derivative = tangent => sample(point.clone().addScaledVector(tangent, epsilon), height, [phase, phase * .79], .6).point.applyMatrix4(transform).sub(sample(point.clone().addScaledVector(tangent, -epsilon), height, [phase, phase * .79], .6).point.applyMatrix4(transform)).multiplyScalar(.5 / epsilon);
          const finiteNormal = derivative(tangentA).cross(derivative(tangentB)).normalize(), result = sample(point, height, [phase, phase * .79], .6);
          const corrected = normal.clone();corrected.y -= result.slope[0] * normal.x + result.slope[1] * normal.z;corrected.applyMatrix3(normalMatrix).normalize();
          expect(corrected.toArray().every(Number.isFinite)).toBe(true);expect(corrected.dot(finiteNormal)).toBeGreaterThan(1 - 1e-9);
        }
      } finally { geometry.dispose(); }
    }
  });

  it('expands only culled kelp bounds, enclosing posed vertices while every grass instance root stays fixed', () => {
    const matrix = new THREE.Matrix4(), dummy = new THREE.Object3D();
    for (const kind of ['grass', 'kelp']) for (const variant of [0, 7, 16]) {
      const height = kind === 'grass' ? .6 + variant / 16 * 1.3 : 5 + variant / 16 * 4, fixture = plant(kind, height, variant), { mesh } = fixture;
      try {
        if (kind === 'grass') { expect(mesh.geometry.boundingBox).toEqual(fixture.before.box);expect(mesh.geometry.boundingSphere).toEqual(fixture.before.sphere);expect(mesh.frustumCulled).toBe(false); }
        else {
          expect(mesh.geometry.boundingBox.min.x).toBe(fixture.before.box.min.x - .12 * height);expect(mesh.geometry.boundingBox.max.z).toBe(fixture.before.box.max.z + .035 * height);
          expect(mesh.geometry.boundingBox.min.y).toBe(fixture.before.box.min.y);expect(mesh.geometry.boundingBox.max.y).toBe(fixture.before.box.max.y);
          for (let phase = 0; phase < Math.PI * 2; phase += .27) for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
            const posed = sample(new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i), height, [phase, phase * .79]).point;
            expect(mesh.geometry.boundingBox.containsPoint(posed)).toBe(true);expect(posed.distanceTo(mesh.geometry.boundingSphere.center)).toBeLessThanOrEqual(mesh.geometry.boundingSphere.radius + 1e-10);
          }
        }
        mesh.position.set(19, -31, 24);mesh.rotation.y = 1.4;mesh.updateMatrixWorld(true);
        for (let blade = 0; blade < (kind === 'grass' ? 7 : 1); blade++) {
          const angle = blade * 2.4, size = kind === 'grass' ? .62 + (blade % 4) * .12 : 1;
          dummy.position.set(kind === 'grass' ? Math.cos(angle) * .24 : 0, 0, kind === 'grass' ? Math.sin(angle) * .24 : 0);dummy.rotation.y = angle;dummy.scale.setScalar(size);dummy.updateMatrix();matrix.copy(dummy.matrix);
          for (let i = 0; i < 3; i++) {
            const root = new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i), initial = root.clone().applyMatrix4(matrix).applyMatrix4(mesh.matrixWorld);
            const moved = sample(root, height, [2.1, 3.7], 1.2).point.applyMatrix4(matrix).applyMatrix4(mesh.matrixWorld);
            expect(moved.toArray()).toEqual(initial.toArray());expect(moved.y).toBe(-31);
          }
        }
      } finally { fixture.dispose(); }
    }
  });

  it('shares one persistent vec4 across material recompiles, retains independent plants, and keeps long-dive phases finite', () => {
    const grass = plant('grass', 1.2, 2), kelp = plant('kelp', 7.4, 4);
    try {
      expect(grass.motion).not.toBe(kelp.motion);expect(grass.motion.value).not.toBe(kelp.motion.value);
      for (const fixture of [grass, kelp]) {
        const { mesh, motion } = fixture, height = mesh.geometry.userData.clPlantHeight, value = motion.value;
        const arrays = Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, attr]) => [name, { array: attr.array, bytes: Array.from(attr.array), version: attr.version }]));
        for (let compilation = 0; compilation < 2; compilation++) {
          const compiled = standardShader();mesh.material.onBeforeCompile(compiled);
          expect(compiled.uniforms.clPlantMotion).toBe(motion);expect(compiled.fragmentShader).toBe(THREE.ShaderLib.standard.fragmentShader);
          expect(compiled.vertexShader).toContain('clPlantInstancePhase=dot(instanceMatrix[3].xz,vec2(7.1,11.3));');expect(mesh.material.customProgramCacheKey()).toBe('cl-plant-flex-v15');
        }
        const rate = mesh.isInstancedMesh ? .001 : .0008;
        for (const now of [1200, 16000, 1e9, 1e12]) { update(motion, now, 2.7, rate, false);expect(motion.value).toBe(value);expect(value.z).toBe(height);expect(value.w).toBe(1);for (const phase of [value.x, value.y]) { expect(Number.isFinite(phase)).toBe(true);expect(phase).toBeGreaterThanOrEqual(0);expect(phase).toBeLessThan(Math.PI * 2); } }
        const moving = value.toArray();update(motion, 1e12 + 1000, 2.7, rate, true);const reduced = value.toArray();expect(reduced).toEqual([...moving.slice(0, 3), 0]);
        update(motion, 1e12 + 4000, 2.7, rate, true);expect(value.toArray()).toEqual(reduced);
        update(motion, 1e12 + 5000, 2.7, rate, false);expect(value.w).toBe(1);expect(value.toArray()).not.toEqual(moving);
        for (const [name, saved] of Object.entries(arrays)) { expect(mesh.geometry.attributes[name].array).toBe(saved.array);expect(Array.from(saved.array)).toEqual(saved.bytes);expect(mesh.geometry.attributes[name].version).toBe(saved.version); }
      }
    } finally { grass.dispose();kelp.dispose(); }
  });
});
