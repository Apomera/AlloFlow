import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_firstresponse.js', 'utf8');
const THREE = {};
new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
const ages = ['adult', 'child', 'infant'];
const digits = ['finger-0', 'finger-1', 'finger-2', 'finger-3', 'thumb'];
const scenes = [];
let build, previousRegistry;

beforeAll(() => {
  previousRegistry = window.StemLab;
  window.StemLab = {
    _registry: {}, isRegistered: () => false,
    makeBayViewer(config) {
      build = config.buildScene;
      return { attach() {}, sync() {}, nudge() {}, zoom() {}, reset() {}, status: () => 'failed' };
    },
    registerTool(id, config) { this._registry[id] = config; },
  };
  new Function(source)();
  expect(build).toBeTypeOf('function');
});

afterEach(() => {
  for (const scene of scenes.splice(0)) {
    scene.traverse(object => {
      object.geometry?.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) material?.dispose();
    });
  }
});

afterAll(() => { window.StemLab = previousRegistry; });

function model(age, tab = 'depth', phase = 0) {
  const scene = new THREE.Scene();
  scenes.push(scene);
  const content = build(THREE, {
    scene, phase, dark: true, contrast: false, wantShadow: false,
    trim: color => new THREE.MeshPhongMaterial({ color }), sceneProps: { tab, age, childHands: 'two' },
  });
  return (settings = {}, childHands = 'two') => {
    content.frame(0, { depthLab: { age, ...settings }, childHands }, true);
    scene.updateMatrixWorld(true);
    return scene;
  };
}

function object(scene, name) {
  const found = scene.getObjectByName(name);
  expect(found, name).toBeTruthy();
  return found;
}

function point(attribute, index) {
  return new THREE.Vector3().fromBufferAttribute(attribute, index);
}

// The root cap tells us how many vertices belong to a section. This avoids
// tying the measurements to the renderer's longitudinal or radial resolution.
function digitProfile(mesh, dorsalSign) {
  const position = mesh.geometry.attributes.position;
  const path = mesh.geometry.parameters.path;
  const root = position.count - 2, tip = position.count - 1;
  const neighbors = new Set();
  const indices = mesh.geometry.index.array;
  for (let i = 0; i < indices.length; i += 3) {
    const triangle = [indices[i], indices[i + 1], indices[i + 2]];
    if (triangle.includes(root)) triangle.forEach(index => { if (index !== root) neighbors.add(index); });
  }
  const around = neighbors.size, sections = (position.count - 2) / around;
  expect(Number.isInteger(sections), mesh.name + ' complete sections').toBe(true);
  expect(around, mesh.name + ' round surface').toBeGreaterThanOrEqual(12);
  expect(sections, mesh.name + ' longitudinal detail').toBeGreaterThan(32);
  expect(point(position, root).distanceTo(path.getPoint(0)), mesh.name + ' root cap').toBeLessThan(1e-7);
  expect(point(position, tip).distanceTo(path.getPoint(1)), mesh.name + ' tip cap').toBeLessThan(1e-7);

  const profile = [];
  let maximumAxialError = 0, maximumDorsalError = 0, maximumPalmEnvelope = 0;
  let minimumRadius = Infinity, minimumInset = Infinity, maximumInset = 0;
  for (let row = 0; row < sections; row++) {
    const t = row / sections, centre = path.getPoint(t), tangent = path.getTangent(t).normalize();
    const dorsal = new THREE.Vector3(0, dorsalSign, 0);
    dorsal.addScaledVector(tangent, -dorsal.dot(tangent)).normalize();
    const across = dorsal.clone().cross(tangent).normalize();
    const samples = Array.from({ length: around }, (_, column) => {
      const delta = point(position, row * around + column).sub(centre);
      maximumAxialError = Math.max(maximumAxialError, Math.abs(delta.dot(tangent)));
      return { x: delta.dot(across), y: delta.dot(dorsal) };
    });
    const radius = Math.max(...samples.map(sample => sample.y));
    const lateral = Math.max(...samples.map(sample => Math.abs(sample.x)));
    const palm = -Math.min(...samples.map(sample => sample.y));
    minimumRadius = Math.min(minimumRadius, radius, palm);
    for (const sample of samples) {
      const ellipse = (sample.x / lateral) ** 2 + (sample.y / radius) ** 2;
      if (sample.y >= -1e-8) {
        maximumDorsalError = Math.max(maximumDorsalError, Math.abs(1 - ellipse));
      } else {
        maximumPalmEnvelope = Math.max(maximumPalmEnvelope, ellipse);
      }
    }
    const inset = 1 - palm / radius;
    minimumInset = Math.min(minimumInset, inset);
    maximumInset = Math.max(maximumInset, inset);
    profile.push({ t, centre, dorsal, radius, palm, inset: Math.max(0, inset) });
  }
  expect(maximumAxialError, mesh.name + ' retained centreline').toBeLessThan(1e-7);
  expect(minimumRadius, mesh.name + ' intact skin around centreline').toBeGreaterThan(0);
  expect(maximumDorsalError, mesh.name + ' dorsal and side envelope').toBeLessThan(.00005);
  expect(maximumPalmEnvelope, mesh.name + ' inward palm surface').toBeLessThanOrEqual(1.00002);
  expect(minimumInset, mesh.name + ' no outward fold').toBeGreaterThan(-.00001);
  expect(maximumInset, mesh.name + ' shallow fold').toBeLessThan(.15);
  return profile;
}

function assertFoldBands(mesh, dorsalSign, expectedBands) {
  const profile = digitProfile(mesh, dorsalSign);
  const peak = Math.max(...profile.map(section => section.inset));
  expect(peak, mesh.name + ' visible inward relief').toBeGreaterThan(.005);
  const bands = [];
  let maximumStep = 0;
  for (let i = 0; i < profile.length; i++) {
    if (profile[i].inset > peak * .2 && (i === 0 || profile[i - 1].inset <= peak * .2)) bands.push(i);
    if (i) {
      maximumStep = Math.max(maximumStep, Math.abs(profile[i].inset - profile[i - 1].inset));
    }
  }
  expect(maximumStep, mesh.name + ' smooth longitudinal relief').toBeLessThan(peak * .9);
  expect(bands, mesh.name + ' distinct flexion folds').toHaveLength(expectedBands);
  for (const section of [...profile.slice(0, 2), ...profile.slice(-2)]) {
    expect(section.inset, mesh.name + ' preserved root and fingertip skin').toBeLessThan(.00001);
  }

  // Check the drawn triangles independently of their vertices at each band.
  // Rays begin outside the closed skin so the normal front-face material is used.
  const localSurface = new THREE.Mesh(mesh.geometry, mesh.material);
  localSurface.updateMatrixWorld(true);
  mesh.geometry.computeBoundingSphere();
  const offset = mesh.geometry.boundingSphere.radius * 4;
  for (const index of bands) {
    const section = profile.slice(index).find(candidate => candidate.inset >= peak * .5) || profile[index];
    for (const [sign, expectedRadius] of [[1, section.radius], [-1, section.palm]]) {
      const direction = section.dorsal.clone().multiplyScalar(sign);
      const hit = new THREE.Raycaster(section.centre.clone().addScaledVector(direction, offset), direction.clone().negate())
        .intersectObject(localSurface, false)[0];
      expect(hit, mesh.name + ' fold skin ray').toBeTruthy();
      expect(hit.point.clone().sub(section.centre).dot(direction), mesh.name + ' measured skin radius').toBeCloseTo(expectedRadius, 6);
    }
  }
  return profile;
}

function assertSameProfile(left, right, label) {
  expect(left, label + ' matching sections').toHaveLength(right.length);
  let dorsalError = 0, palmError = 0;
  for (let i = 0; i < left.length; i++) {
    dorsalError = Math.max(dorsalError, Math.abs(left[i].radius - right[i].radius));
    palmError = Math.max(palmError, Math.abs(left[i].palm - right[i].palm));
  }
  expect(dorsalError, label + ' dorsal symmetry').toBeLessThan(5e-8);
  expect(palmError, label + ' palm symmetry').toBeLessThan(5e-8);
}

function assertTipAndNail(scene, prefix, digit) {
  const skin = object(scene, prefix + '-' + digit + '-surface');
  const expected = skin.geometry.parameters.path.getPoint(1).applyMatrix4(skin.matrixWorld);
  const anchor = object(scene, prefix + '-' + digit + '-tip');
  expect(anchor.getWorldPosition(new THREE.Vector3()).distanceTo(expected), anchor.name + ' retained tip anchor').toBeLessThan(1e-7);
  const nailName = prefix + (digit === 'thumb' ? '-thumb-nail' : '-nail-' + digit.slice(-1));
  const nail = object(scene, nailName), positions = nail.geometry.attributes.position;
  const scale = nail.getWorldScale(new THREE.Vector3()).x;
  const outward = new THREE.Vector3(0, 1, 0).transformDirection(nail.matrixWorld);
  for (let index = 0; index < positions.count; index += Math.ceil(positions.count / 8)) {
    const nailPoint = point(positions, index).applyMatrix4(nail.matrixWorld);
    const offset = .06 * scale;
    const hit = new THREE.Raycaster(nailPoint.clone().addScaledVector(outward, offset), outward.clone().negate())
      .intersectObject(skin, false)[0];
    expect(hit, nail.name + ' supported by skin').toBeTruthy();
    const gap = hit.distance - offset;
    expect(gap, nail.name + ' no sinking').toBeGreaterThan(-.0008 * scale);
    expect(gap, nail.name + ' no floating').toBeLessThan(.004 * scale);
  }
}

function assertWrist(mesh) {
  const positions = mesh.geometry.attributes.position;
  let inward = 0, maximumInset = 0;
  const pole = new THREE.Vector3(0, -1, 0);
  let closestUnderside = Infinity;
  let minimumRadius = Infinity, maximumRadius = 0, undersideError = 0;
  for (let i = 0; i < positions.count; i++) {
    const vertex = point(positions, i), radius = vertex.length(), inset = 1 - radius;
    minimumRadius = Math.min(minimumRadius, radius);
    maximumRadius = Math.max(maximumRadius, radius);
    if (vertex.y <= 0) {
      undersideError = Math.max(undersideError, Math.abs(1 - radius));
      closestUnderside = Math.min(closestUnderside, vertex.distanceTo(pole));
    } else if (inset > .0001) {
      inward++;
      maximumInset = Math.max(maximumInset, inset);
    }
  }
  expect(maximumRadius, mesh.name + ' inward wrist relief').toBeLessThan(1.000001);
  expect(minimumRadius, mesh.name + ' retained wrist volume').toBeGreaterThan(.8);
  expect(undersideError, mesh.name + ' unchanged underside').toBeLessThan(5e-7);
  expect(inward, mesh.name + ' shaped upper wrist surface').toBeGreaterThan(10);
  expect(maximumInset, mesh.name + ' readable shallow groove').toBeGreaterThan(.002);
  expect(maximumInset, mesh.name + ' shallow groove').toBeLessThan(.15);
  expect(closestUnderside, mesh.name + ' untouched underside pole').toBeLessThan(1e-7);
}

function minimumWorldY(mesh) {
  const positions = mesh.geometry.attributes.position;
  let minimum = Infinity;
  for (let i = 0; i < positions.count; i++) minimum = Math.min(minimum, point(positions, i).applyMatrix4(mesh.matrixWorld).y);
  return minimum;
}

describe('First Response finger and wrist folds', () => {
  it.each(ages)('keeps patient folds on the palm with mirrored anatomy through recovery poses for %s', age => {
    let reference;
    for (const phase of [0, 2, 5, 8]) {
      const scene = model(age, 'recovery', phase)();
      const profiles = [];
      for (const digit of digits) {
        const left = assertFoldBands(object(scene, 'fr-patient-left-' + digit + '-surface'), -1, digit === 'thumb' ? 1 : 2);
        const opposite = digit === 'thumb' ? digit : 'finger-' + (3 - Number(digit.slice(-1)));
        const right = digitProfile(object(scene, 'fr-patient-right-' + opposite + '-surface'), -1);
        assertSameProfile(left, right, age + ' ' + digit + ' mirrored fold');
        if (reference) assertSameProfile(left, reference[profiles.length], age + ' ' + digit + ' retained recovery skin');
        profiles.push(left);
        for (const side of ['left', 'right']) assertTipAndNail(scene, 'fr-patient-' + side, digit);
      }
      reference = profiles;
    }
  });

  it.each(ages)('keeps rescuer folds and fingertip detail clear of the heel contact plane for %s', age => {
    const sample = model(age);
    const configurations = age === 'child' ? ['one', 'two'] : ['two'];
    let reference;
    for (const childHands of configurations) {
      for (const motion of ['release', 'press']) {
        const scene = sample({ motion }, childHands);
        const contactY = object(scene, 'fr-depth-marker').position.y;
        const sides = ['lower', ...(age === 'adult' || (age === 'child' && childHands === 'two') ? ['upper'] : [])];
        const lower = [];
        for (const digit of digits) {
          const profile = assertFoldBands(object(scene, 'fr-rescuer-lower-' + digit + '-surface'), 1, digit === 'thumb' ? 1 : 2);
          if (reference) assertSameProfile(profile, reference[lower.length], age + ' ' + digit + ' retained compression skin');
          lower.push(profile);
          if (sides.includes('upper')) {
            const opposite = digit === 'thumb' ? digit : 'finger-' + (3 - Number(digit.slice(-1)));
            assertSameProfile(profile, digitProfile(object(scene, 'fr-rescuer-upper-' + opposite + '-surface'), 1), age + ' ' + digit + ' rescuer symmetry');
          }
          for (const side of sides) {
            const mesh = object(scene, 'fr-rescuer-' + side + '-' + digit + '-surface');
            expect(minimumWorldY(mesh), mesh.name + ' chest clearance').toBeGreaterThan(contactY - 1e-6);
            assertTipAndNail(scene, 'fr-rescuer-' + side, digit);
          }
        }
        for (const side of sides) {
          const heel = object(scene, 'fr-rescuer-' + side + '-heel');
          const positions = heel.geometry.attributes.position;
          let shapeError = 0;
          for (let i = 0; i < positions.count; i++) shapeError = Math.max(shapeError, Math.abs(1 - point(positions, i).length()));
          expect(shapeError, heel.name + ' retained heel shape').toBeLessThan(5e-7);
          expect(minimumWorldY(heel), heel.name + ' contact clearance').toBeGreaterThanOrEqual(contactY - 1e-6);
          if (side === 'lower') expect(minimumWorldY(heel), heel.name + ' heel remains at contact plane').toBeCloseTo(contactY, 6);
        }
        reference = lower;
      }
    }
  });

  it.each(ages)('limits wrist grooves to the upper surface and preserves the contact-facing underside for %s', age => {
    for (const phase of [2, 5, 8]) {
      const scene = model(age, 'recovery', phase)();
      const left = object(scene, 'fr-patient-left-wrist'), right = object(scene, 'fr-patient-right-wrist');
      assertWrist(left);
      assertWrist(right);
      const leftPositions = left.geometry.attributes.position, rightPositions = right.geometry.attributes.position;
      expect(leftPositions.count, age + ' mirrored wrist sampling').toBe(rightPositions.count);
      let mirrorError = 0;
      for (let i = 0; i < leftPositions.count; i++) {
        mirrorError = Math.max(mirrorError, Math.abs(point(leftPositions, i).length() - point(rightPositions, i).length()));
      }
      expect(mirrorError, age + ' mirrored wrist inset').toBeLessThan(5e-8);
    }
    const sample = model(age);
    for (const motion of ['release', 'press']) {
      const scene = sample({ motion });
      const contactY = object(scene, 'fr-depth-marker').position.y;
      for (const side of age === 'infant' ? ['lower'] : ['lower', 'upper']) {
        const wrist = object(scene, 'fr-rescuer-' + side + '-wrist-bridge');
        assertWrist(wrist);
        expect(minimumWorldY(wrist), wrist.name + ' chest clearance').toBeGreaterThan(contactY);
        const unchangedPole = new THREE.Vector3(0, -1, 0).applyMatrix4(wrist.matrixWorld);
        expect(minimumWorldY(wrist), wrist.name + ' original underside height').toBeCloseTo(unchangedPole.y, 7);
      }
    }
  });
});
