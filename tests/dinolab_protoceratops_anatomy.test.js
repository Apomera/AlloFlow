import { describe, it, expect } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_PROTOCERATOPS_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const baseline = JSON.parse(readFileSync(process.env.DINO_PROTOCERATOPS_FIXTURE || resolve('tests/fixtures/dinolab_protoceratops_profile_baseline.json'), 'utf8'));
const sha = value => createHash('sha256').update(value).digest('hex');
function extract(name) {
  const start = source.indexOf('function ' + name + '('); assert(start >= 0, name);
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw Error('Unterminated helper ' + name);
}
window.StemLab = { registerTool() {} };
new Function(source.replace("window.StemLab.registerTool('dinoLab'", "globalThis.__protoceratopsAnatomy = { DINOS, cranialSurfaceProfileFor, dinoProtoceratopsFrillGeometry, dinoFrillGeometry, dinoBonyFrillGeometry, dinoStyracosaurusBonyFrillGeometry, dinoConnectedCranialPose }; window.StemLab.registerTool('dinoLab'"))();
const api = globalThis.__protoceratopsAnatomy; delete globalThis.__protoceratopsAnatomy;
const species = api.DINOS.find(d => d.id === 'protoceratops');
const axis = new THREE.Vector3(1, -.6, 0).normalize();
const point = (g, i) => new THREE.Vector3().fromBufferAttribute(g.attributes.position, i);
function validClosedGeometry(g, scale) {
  const edges = new Map(), ids = g.index.array;
  let volume = 0, minimumArea = Infinity, minimumFacing = Infinity, normalError = 0, finite = true, bounded = true;
  for (let i = 0; i < g.attributes.position.count; i++) {
    const p = point(g, i), n = new THREE.Vector3().fromBufferAttribute(g.attributes.normal, i);
    finite &&= [...p.toArray(), ...n.toArray(), g.attributes.uv.getX(i), g.attributes.uv.getY(i)].every(Number.isFinite);
    bounded &&= g.boundingBox.containsPoint(p) && p.distanceTo(g.boundingSphere.center) <= g.boundingSphere.radius + scale * 1e-7;
    normalError = Math.max(normalError, Math.abs(n.length() - 1));
  }
  for (let i = 0; i < ids.length; i += 3) {
    const a = point(g, ids[i]), b = point(g, ids[i + 1]), c = point(g, ids[i + 2]);
    const cross = b.clone().sub(a).cross(c.clone().sub(a));
    minimumArea = Math.min(minimumArea, cross.length());
    minimumFacing = Math.min(minimumFacing, cross.dot(axis) * (i < ids.length / 2 ? 1 : -1));
    volume += a.dot(b.clone().cross(c)) / 6;
    for (let e = 0; e < 3; e++) {
      const from = ids[i + e], to = ids[i + (e + 1) % 3], key = Math.min(from, to) + ':' + Math.max(from, to), row = edges.get(key) || [0, 0];
      row[0]++; row[1] += from < to ? 1 : -1; edges.set(key, row);
    }
  }
  expect(finite && bounded).toBe(true); expect(normalError).toBeLessThan(1e-6);
  expect(minimumArea).toBeGreaterThan(scale * scale * 1e-10);
  // This checks for the lower-sheet fold that a closed-edge test alone misses.
  expect(minimumFacing).toBeGreaterThan(scale * scale * 1e-10);
  expect(volume).toBeGreaterThan(0);
  expect([...edges.values()].every(([count, direction]) => count === 2 && direction === 0)).toBe(true);
  expect(g.attributes.position.count - edges.size + ids.length / 3).toBe(2);
}
function contained(skin, bone, scale, triangles = false) {
  const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), mesh = new THREE.Mesh(skin, mat);
  mesh.updateMatrixWorld(true);
  const direction = new THREE.Vector3(1.031, -.577, .137).normalize(), reach = skin.boundingSphere.radius * 4, ray = new THREE.Raycaster();
  const samples = Array.from({ length: bone.attributes.position.count }, (_, i) => point(bone, i));
  if (triangles) for (let i = 0; i < bone.index.count; i += 3) {
    const a = point(bone, bone.index.getX(i)), b = point(bone, bone.index.getX(i + 1)), c = point(bone, bone.index.getX(i + 2));
    samples.push(a.clone().add(b).add(c).multiplyScalar(1 / 3), a.clone().lerp(b, .5), b.clone().lerp(c, .5), c.clone().lerp(a, .5));
  }
  let outside = 0, missed = 0, clearance = Infinity;
  for (const p of samples) {
    ray.set(p.clone().addScaledVector(direction, -reach), direction);
    const distances = [];
    for (const hit of ray.intersectObject(mesh, false)) if (!distances.length || hit.distance - distances[distances.length - 1] > scale * 1e-7) distances.push(hit.distance);
    if (distances.length < 2) { missed++; continue; }
    if (distances.filter(d => d < reach).length % 2 !== 1) outside++;
    clearance = Math.min(clearance, ...distances.map(d => Math.abs(d - reach)));
  }
  mat.dispose(); expect(missed).toBe(0); expect(outside).toBe(0); expect(clearance).toBeGreaterThan(scale * 1e-5);
}
function pair(scale, widthRatio) {
  const skin = api.dinoProtoceratopsFrillGeometry(THREE, .4 * scale, widthRatio * .4 * scale, .055 * scale);
  return { skin, bone: api.dinoBonyFrillGeometry(THREE, skin), release() { skin.dispose(); this.bone.dispose(); } };
}

describe('Protoceratops cranial profile', () => {
  it('corrects only frill scale and explanatory labels while preserving the hornless head proportions', () => {
    const p = api.cranialSurfaceProfileFor(species), stable = value => Object.fromEntries(Object.entries(value).filter(([key]) => !['frillScale', 'shortLabel', 'label', 'note'].includes(key)));
    expect(stable(p)).toEqual(stable(baseline.targetProfile));
    expect(baseline.targetProfile.frillScale).toBe(1); expect(p.frillScale).toBe(.62);
    expect(p.browHornScale).toBe(0); expect(p.noseHornScale).toBe(0);
    expect(p.note).toMatch(/vary between specimens/); expect(p.note).toMatch(/representative/); expect(p.note).toMatch(/inferred/);
  });
  it('keeps every other catalogue cranial profile pinned after the reviewed mature-tyrannosaur metadata update', () => {
    expect(baseline.baselineSourceHash).toBe('10c657f495715888606763e27b954f7c5714f49e5a12758123512d8c3117d28a');
    const profiles = api.DINOS.filter(d => d.id !== 'protoceratops').map(d => [d.id, api.cranialSurfaceProfileFor(d)]);
    // Later reviewed changes add mature-tyrannosaur metadata and two Alioramini
    // envelopes. Keep the earlier fixture frozen; pin all current profiles here.
    expect(baseline.otherProfilesHash).toBe('9cd0652a44724aae2881d782d555e1d5aed4ec66aac943a1cbb809562d942a2a');
    expect(profiles.length).toBe(baseline.otherSpeciesCount); expect(sha(JSON.stringify(profiles))).toBe('528cb5198ab8d3c1df69f6a81898e625b24570045f35f44533d57d7d46a65b45');
  });
  it('does not assign the species explanation from a display name or partial ID', () => {
    for (const id of ['Protoceratops', 'protoceratops-extra', 'triceratops', '']) {
      const p = api.cranialSurfaceProfileFor({ ...species, id, name: 'Protoceratops' });
      expect(p.note).not.toMatch(/Protoceratops lacked/);
    }
  });
});

describe('Protoceratops frill surfaces', () => {
  for (const scale of [.03, 1, 12]) for (const widthRatio of [.62, 1.38]) {
    it('keeps closed, unfolded life and contained bone layers at scale ' + scale + ', width ' + widthRatio, () => {
      const p = pair(scale, widthRatio);
      try {
        validClosedGeometry(p.skin, scale); validClosedGeometry(p.bone, scale); contained(p.skin, p.bone, scale);
        expect(p.skin.attributes.position.count).toBe(2178); expect(p.bone.attributes.position.count).toBe(1666);
        expect(p.skin.userData.dinoDisplayShell.speciesProfile).toBe('protoceratops');
        expect(p.bone.userData.dinoDisplayShell.depthProfile).toBe('nested-bony-frill');
        expect(p.bone.userData.dinoDisplayShell.thicknessIsInterpretive).toBe(true);
        expect(p.skin.userData.dinoDisplayShell.maxThickness).toBeCloseTo(Math.min(.4 * scale, widthRatio * .4 * scale) * .045 * 1.12, 12);
        expect(p.bone.userData.dinoDisplayShell.maxThickness).toBeCloseTo(p.skin.userData.dinoDisplayShell.maxThickness * .58, 12);
      } finally { p.release(); }
    });
  }
  for (const widthRatio of [.62, 1.38]) it('contains bone face interiors and edge midpoints at width ' + widthRatio, () => {
    const p = pair(1, widthRatio); try { contained(p.skin, p.bone, 1, true); } finally { p.release(); }
  });
  it('keeps the established modest rim coordinates while redistributing the lower interior rows', () => {
    const h = .4, w = .3, bow = .055, g = api.dinoProtoceratopsFrillGeometry(THREE, h, w, bow), legacy = api.dinoFrillGeometry(THREE, h, w, bow);
    try {
      for (let side = 0; side < 128; side++) expect(point(g, 1 + 8 * 128 + side).toArray()).toEqual(point(legacy, 1 + 8 * 128 + side).toArray());
      const sides = 128, backOffset = 1 + 9 * sides, radii = [1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, .92, .96, .985];
      let previous = 0;
      for (let ring = 0; ring < radii.length; ring++) {
        const i = 1 + ring * sides + sides * 3 / 4, middle = point(g, i).add(point(g, i + backOffset)).multiplyScalar(.5);
        expect(middle.y).toBeCloseTo(-h * .48 * radii[ring], 7); expect(middle.y).toBeLessThan(previous); previous = middle.y;
      }
      expect(g.index.array).toEqual(legacy.index.array); expect(g.attributes.uv.array).toEqual(legacy.attributes.uv.array);
    } finally { g.dispose(); legacy.dispose(); }
  });
  it('builds independent bone buffers without changing the life geometry or its metadata', () => {
    const skin = api.dinoProtoceratopsFrillGeometry(THREE, .4, .3, .055), before = Object.fromEntries(['position', 'normal', 'uv'].map(k => [k, skin.attributes[k].array.slice()])), index = skin.index.array.slice(), metadata = JSON.stringify(skin.userData);
    const bone = api.dinoBonyFrillGeometry(THREE, skin);
    try {
      bone.attributes.position.setX(0, 123);
      for (const k of Object.keys(before)) expect(skin.attributes[k].array).toEqual(before[k]);
      expect(skin.index.array).toEqual(index); expect(JSON.stringify(skin.userData)).toBe(metadata);
    } finally { skin.dispose(); bone.dispose(); }
  });
});

function caller(core, available = true) {
  const model = new THREE.Group(), motion = [], bodyMat = new THREE.MeshStandardMaterial({ color: 0x857956 }), boneMat = new THREE.MeshStandardMaterial({ color: 0xcfc4a3 });
  const head = new THREE.Vector3(-.9, .8, .15), ht = .6, len = 1.8, depth = .22, profile = api.cranialSurfaceProfileFor(species), observed = [];
  const context = { THREE, model, head, len, ht, surfaceBodyDepth: depth, cranialSurface: profile, props: { species }, boneMat, vec: (x, y, z) => new THREE.Vector3(x, y, z), hasAnatomyPart: id => available && id === 'frill',
    dinoMarkSpecialPart: new Function(extract('dinoMarkSpecialPart') + ';return dinoMarkSpecialPart;')(), dinoFrillGeometry: api.dinoFrillGeometry, dinoBonyFrillGeometry: api.dinoBonyFrillGeometry, dinoStyracosaurusBonyFrillGeometry: api.dinoStyracosaurusBonyFrillGeometry,
    dinoProtoceratopsFrillGeometry: (...args) => { const g = api.dinoProtoceratopsFrillGeometry(...args), record = { args, geometry: g, disposed: 0 }; g.addEventListener('dispose', () => record.disposed++); observed.push(record); return g; } };
  const add = new Function('context', 'with(context){' + extract('addFrillSurface') + ';return addFrillSurface;}')(context);
  const capture = new Function('model', 'cranialMotionParts', extract('registerCranialMotion') + '\n' + extract('captureCranialMotion') + ';return captureCranialMotion;')(model, motion);
  const before = model.children.slice(), mesh = add(core ? boneMat : bodyMat, core ? .95 : 1); capture(before);
  return { model, motion, mesh, observed, bodyMat, boneMat, head, ht, len, depth, profile, context, release() { mesh?.geometry.dispose(); if (mesh && mesh.material !== bodyMat && mesh.material !== boneMat) mesh.material.dispose(); bodyMat.dispose(); boneMat.dispose(); } };
}

describe('Protoceratops native frill caller', () => {
  for (const core of [false, true]) {
    it('uses the compact profile with matching origin, tags and material in the ' + (core ? 'fossil' : 'life') + ' layer', () => {
      const b = caller(core), s = b.profile.frillScale;
      try {
        expect(b.model.children).toEqual([b.mesh]); expect(b.motion).toEqual([b.mesh]); expect(b.observed).toHaveLength(1);
        expect(b.observed[0].args.slice(1)).toEqual([b.ht * .20 * s, b.depth * .86 * s, b.len * .010 * s]);
        const expected = api.dinoProtoceratopsFrillGeometry(THREE, b.ht * .20 * s, b.depth * .86 * s, b.len * .010 * s), surface = core ? api.dinoBonyFrillGeometry(THREE, expected) : expected;
        surface.translate(b.head.x + b.len * .025 * s, b.head.y + b.ht * .052, b.head.z);
        try { for (const key of ['position', 'normal', 'uv']) expect(b.mesh.geometry.attributes[key].array).toEqual(surface.attributes[key].array); expect(b.mesh.geometry.index.array).toEqual(surface.index.array); }
        finally { if (surface !== expected) surface.dispose(); expected.dispose(); }
        expect(b.mesh.userData.dinoFeature).toBe('frill'); expect(b.mesh.userData.dinoPartIds).toEqual(['frill']); expect(b.mesh.userData.dinoRegion).toBe('head'); expect(b.mesh.userData.dinoMotionParent).toBe('cranial');
        expect(b.mesh.castShadow && b.mesh.receiveShadow).toBe(true); expect(b.observed[0].disposed).toBe(core ? 1 : 0);
        if (core) { expect(b.mesh.material).not.toBe(b.boneMat); expect(b.mesh.material.color.getHex()).toBe(b.boneMat.color.getHex()); expect(b.mesh.material.side).toBe(THREE.DoubleSide); }
        else expect(b.mesh.material).toBe(b.bodyMat);
      } finally { b.release(); }
    });
    it('does not construct geometry when frill anatomy is absent in core=' + core, () => {
      const b = caller(core, false); try { expect(b.mesh).toBeNull(); expect(b.observed).toEqual([]); expect(b.model.children).toEqual([]); expect(b.motion).toEqual([]); } finally { b.release(); }
    });
    it('builds one frill without adding generic facial horns in the actual ' + (core ? 'fossil' : 'life') + ' branch', () => {
      const b = caller(core, false), marker = 'if (/Ceratops/i.test(cladeName)) {', first = source.indexOf(marker), start = core ? source.indexOf(marker, first + marker.length) : first;
      expect(start).toBeGreaterThan(0); let depth = 0, end = start;
      for (let i = source.indexOf('{', start); i < source.length; i++) { if (source[i] === '{') depth++; if (source[i] === '}' && --depth === 0) { end = i + 1; break; } }
      const generic = [], frills = [], context = { ...b.context, cladeName: 'Protoceratopsidae', hasAnatomyPart: () => true, anatomyAccentMat: b.bodyMat,
        addFrillSurface: (material, scale) => frills.push({ material, scale }), captureCranialMotion: () => {}, addKeratinCone: () => generic.push('life'), addSkeletonCone: () => generic.push('bone'), addStyracosaurusOrnaments: () => generic.push('styracosaurus') };
      try { new Function('context', 'with(context){' + source.slice(start, end) + '}')(context); expect(generic).toEqual([]); expect(frills).toEqual([{ material: core ? b.boneMat : b.bodyMat, scale: core ? .95 : 1 }]); }
      finally { b.release(); }
    });
  }
  it('keeps the actual translated bone frill fully enclosed by the life frill', () => {
    const life = caller(false), fossil = caller(true); try { contained(life.mesh.geometry, fossil.mesh.geometry, 1, true); } finally { life.release(); fossil.release(); }
  });
  it('moves both layers with the cranial rig and restores their rest geometry', () => {
    const life = caller(false), fossil = caller(true), rig = new THREE.Group(), neck = new THREE.Group(), pivot = life.head.clone(), rest = neck.quaternion.clone(), meshes = [life.mesh, fossil.mesh];
    const saved = meshes.map(m => point(m.geometry, 0));
    try {
      for (const mesh of meshes) rig.add(mesh); life.model.add(rig); neck.rotation.set(.08, -.24, .04);
      api.dinoConnectedCranialPose(THREE, rig, pivot, neck, rest); life.model.updateMatrixWorld(true);
      meshes.forEach((m, i) => expect(m.localToWorld(point(m.geometry, 0)).distanceTo(saved[i].clone().sub(pivot).applyQuaternion(neck.quaternion).add(pivot))).toBeLessThan(1e-10));
      neck.quaternion.copy(rest); api.dinoConnectedCranialPose(THREE, rig, pivot, neck, rest); life.model.updateMatrixWorld(true);
      meshes.forEach((m, i) => expect(m.localToWorld(point(m.geometry, 0)).distanceTo(saved[i])).toBeLessThan(1e-10));
    } finally { life.release(); fossil.release(); }
  });
});
