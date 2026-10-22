import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THREE } from './helpers/reef_dive_harness.js';

const source = readFileSync(process.env.REEF3D_EXPLORE_SOURCE || 'stem_lab/reef_3d_explore.js', 'utf8');
const scope = {};
new Function('window', source.replace('global.Reef3DExplore = { version:',
  'global.lodGeometry = { Builder, buildBranching, buildPlate, buildTable, buildMassive, buildEncrusting, buildSoftCoral, buildSponge, buildRock, buildFan, buildAlgae }; global.Reef3DExplore = { version:'))(scope);
const G = scope.lodGeometry, tiers = ['near', 'mid', 'far'];
const palette = { stone: new THREE.Color(.3, .25, .2), turf: new THREE.Color(.2, .2, .1), cca: new THREE.Color(.5, .3, .4), turfAmount: .3, ccaAmount: .6 };
function build(kind, tier) {
  const detail = tier === 'near', far = tier === 'far', sides = detail ? 5 : far ? 3 : 4, level = far ? 'far' : detail;
  switch (kind) {
    case 'finger': return G.buildBranching(THREE, .35, .45, 0, sides, detail, far);
    case 'antler': return G.buildBranching(THREE, .4, .5, 1, sides, detail, far);
    case 'corym': return G.buildBranching(THREE, .38, .42, 2, sides, detail, far);
    case 'deadstand': return G.buildBranching(THREE, .4, .5, 1, sides, detail, far, true);
    case 'plate': return G.buildPlate(THREE, .45, .4, 5, level);
    case 'table': return G.buildTable(THREE, .5, .5, 3, level);
    case 'massive': return G.buildMassive(THREE, .4, .42, 3, level, true);
    case 'brain': return G.buildMassive(THREE, .4, .4, 5, level, false);
    case 'encrust': return G.buildEncrusting(THREE, .4, .08, 2, level);
    case 'soft': return G.buildSoftCoral(THREE, .25, .45, 3, level);
    case 'sponge': return G.buildSponge(THREE, .18, .42, 4, detail ? 10 : far ? 5 : 6);
    case 'rock': return G.buildRock(THREE, .4, 7, far ? 7 : detail, palette);
    case 'fan': return G.buildFan(THREE, .5, .85, 2, detail, far);
    case 'algae': return G.buildAlgae(THREE, .22, .34, 2, level, { base: new THREE.Color(.46, .45, .38), tip: new THREE.Color(1.02, 1, .84) });
  }
}
function branchPlan(make) {
  const original = G.Builder.prototype.tube, branches = [];
  G.Builder.prototype.tube = function (T, curve, radius, steps, sides, taper, tone) {
    branches.push({ curve: curve.map((p) => p.toArray()), radius, taper });
    return original.call(this, T, curve, radius, steps, sides, taper, tone);
  };
  try { make().dispose(); } finally { G.Builder.prototype.tube = original; }
  return branches;
}

describe('anchored reef colony detail tiers', () => {
  it('retains every branch, support, lobe and fan vein at its original position as detail changes', () => {
    for (const kind of ['finger', 'antler', 'corym', 'deadstand', 'plate', 'table', 'soft', 'fan']) {
      const near = branchPlan(() => build(kind, 'near'));
      expect(near.length).toBeGreaterThan(0);
      for (const tier of ['mid', 'far']) expect(branchPlan(() => build(kind, tier)), kind + ' ' + tier).toEqual(near);
    }
    // Other variants are used in reef rubble and individual specimen models.
    for (const variant of [3, 4, 5]) for (const broken of [false, true]) {
      const near = branchPlan(() => G.buildBranching(THREE, .4, .5, variant, 5, true, false, broken));
      expect(branchPlan(() => G.buildBranching(THREE, .4, .5, variant, 3, false, true, broken))).toEqual(near);
    }
  });

  it('keeps each algae holdfast and frond tip in place with fewer longitudinal samples', () => {
    function anchors(tier) {
      const geometry = build('algae', tier), p = geometry.attributes.position;
      const sections = tier === 'near' ? 10 : tier === 'mid' ? 6 : 3, stride = (sections + 1) * 3, points = [];
      for (let first = 0; first < p.count; first += stride) {
        points.push([p.getX(first + 1), p.getY(first + 1), p.getZ(first + 1)]);
        const last = first + sections * 3 + 1;
        points.push([p.getX(last), p.getY(last), p.getZ(last)]);
      }
      geometry.dispose(); return points;
    }
    expect(anchors('mid')).toEqual(anchors('near'));
    expect(anchors('far')).toEqual(anchors('near'));
  });

  it('reduces triangles while keeping every coarse vertex inside the existing near-tier culling reach', () => {
    for (const kind of ['finger', 'antler', 'corym', 'deadstand', 'plate', 'table', 'massive', 'brain', 'encrust', 'soft', 'sponge', 'rock', 'fan', 'algae']) {
      const geometries = tiers.map((tier) => build(kind, tier)), near = geometries[0];
      const reach = near.boundingSphere.radius + near.boundingSphere.center.length();
      for (let tier = 0; tier < geometries.length; tier++) {
        const g = geometries[tier], p = g.attributes.position;
        for (const name of ['position', 'normal', 'color']) expect(Array.from(g.attributes[name].array).every(Number.isFinite), kind + ' ' + tiers[tier]).toBe(true);
        for (let i = 0; i < p.count; i++) expect(Math.hypot(p.getX(i), p.getY(i), p.getZ(i)), kind + ' ' + tiers[tier]).toBeLessThanOrEqual(reach);
        if (tier) expect(g.index.count, kind + ' tessellation').toBeLessThan(geometries[tier - 1].index.count);
      }
      geometries.forEach((g) => g.dispose());
    }
  });
});
