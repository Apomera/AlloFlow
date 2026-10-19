import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');
window.StemLab = { registerTool() {} };
new Function(source.replace("window.StemLab.registerTool('dinoLab'", "globalThis.__tyrannosaurForm={DINOS,dinoTyrannosaurPose,dinoCervicalEnvelope,dinoCervicalAxisCurve,dinoCranialGeometry,dinoSurfaceGeometry,cranialSurfaceProfileFor,dinoTheropodCranialRadii}; window.StemLab.registerTool('dinoLab'"))();
const art = globalThis.__tyrannosaurForm;
const vec = (x, y, z = 0) => new THREE.Vector3(x, y, z);

describe('mature tyrannosaur form follows its craniocervical anatomy', () => {
  it('shortens the extended neck pose while preserving head-to-tail span and input anchors', () => {
    const animals = art.DINOS.filter(d => art.cranialSurfaceProfileFor(d).matureTyrannosaur);
    expect(animals.length).toBeGreaterThan(3);
    for (const d of animals) {
      const shoulder = vec(-d.lengthM * .12, d.heightM * .73);
      const head = vec(-d.lengthM * .30, d.heightM * .93);
      const tail = vec(d.lengthM * .52, d.heightM * .65);
      const inputs = [shoulder, head, tail].map(p => p.toArray());
      const posed = art.dinoTyrannosaurPose(d, shoulder, head, tail);
      expect(posed.active, d.id).toBe(true);
      expect(shoulder.x - posed.head.x, d.id).toBeGreaterThan(0);
      expect(shoulder.x - posed.head.x, d.id).toBeLessThan((shoulder.x - head.x) * .8);
      expect(posed.tail.x - posed.head.x, d.id).toBeCloseTo(tail.x - head.x, 10);
      expect(posed.head.y).toBe(head.y); expect(posed.tail.y).toBe(tail.y);
      expect([shoulder, head, tail].map(p => p.toArray())).toEqual(inputs);
    }
    for (const id of ['alioramus', 'qianzhousaurus', 'yutyrannus', 'velociraptor', 'carnotaurus', 'brachiosaurus', 'triceratops']) {
      const d = art.DINOS.find(d => d.id === id), head = vec(-3, 2), tail = vec(5, 1);
      const posed = art.dinoTyrannosaurPose(d, vec(-1, 1), head, tail);
      expect(posed.active, id).toBe(false); expect(posed.head).toBe(head); expect(posed.tail).toBe(tail);
    }
  });

  it('has a bounded S bend and a graded muscular envelope at small and large scales', () => {
    for (const scale of [.05, 1, 8]) {
      const shoulder = vec(0, 1).multiplyScalar(scale), head = vec(-2, 2).multiplyScalar(scale);
      const envelope = art.dinoCervicalEnvelope(THREE, shoulder, head, .8 * scale, .5 * scale, .28 * scale, {}, false, 'Tyrannosauridae', true);
      expect(envelope.points[0]).toBe(shoulder); expect(envelope.points.at(-1)).toBe(head);
      expect(envelope.points[1].y).toBeLessThan(shoulder.clone().lerp(head, .22).y);
      expect(envelope.points.at(-2).y).toBeGreaterThan(shoulder.clone().lerp(head, .78).y);
      envelope.radii.forEach((r, i) => { expect(r).toBeGreaterThan(0); if (i) expect(r).toBeLessThanOrEqual(envelope.radii[i - 1]); });
      const g = art.dinoSurfaceGeometry(THREE, envelope.points, envelope.radii, { smoothProfile: true });
      for (const attribute of ['position', 'normal', 'uv']) expect(Array.from(g.attributes[attribute].array).every(Number.isFinite)).toBe(true);
      g.dispose();
    }
  });

  it('bends the cervical bone centerline inside the skin rather than retaining a straight rod', () => {
    const shoulder = vec(0, 1), head = vec(-2, 2);
    const envelope = art.dinoCervicalEnvelope(THREE, shoulder, head, .8, .5, .28, {}, false, 'Tyrannosauridae', true);
    const end = head.clone().lerp(shoulder, .28), curve = art.dinoCervicalAxisCurve(THREE, envelope, end);
    expect(curve.getPoint(0).distanceTo(shoulder)).toBeLessThan(1e-10);
    expect(curve.getPoint(1).distanceTo(end)).toBeLessThan(1e-10);
    expect(curve.getPoint(.25).distanceTo(shoulder.clone().lerp(end, .25))).toBeGreaterThan(.02);
    const skin = new THREE.CatmullRomCurve3(envelope.points, false, 'centripetal');
    for (let i = 0; i <= 30; i++) {
      const p = curve.getPoint(i / 30);
      const nearest = Math.min(...Array.from({ length: 121 }, (_, j) => p.distanceTo(skin.getPoint(j / 120))));
      expect(nearest).toBeLessThan(Math.min(...envelope.radii) * .65);
    }
  });

  it('keeps the broad muzzle deep without changing basal or slender theropod profiles', () => {
    const mature = art.cranialSurfaceProfileFor(art.DINOS.find(d => d.id === 'tyrannosaurus'));
    const basal = art.cranialSurfaceProfileFor(art.DINOS.find(d => d.id === 'yutyrannus'));
    expect(mature.matureTyrannosaur).toBe(true); expect(basal.matureTyrannosaur).not.toBe(true);
    for (const id of ['alioramus', 'qianzhousaurus']) {
      const profile = art.cranialSurfaceProfileFor(art.DINOS.find(d => d.id === id));
      expect(profile.matureTyrannosaur, id).not.toBe(true);
      expect(profile.note, id).not.toContain('broad, deep muzzle');
      const envelope = art.dinoCervicalEnvelope(THREE, vec(0, 1), vec(-2, 2), .8, .5, .28, {}, false, 'Tyrannosauridae', false);
      expect(envelope.points, id).toHaveLength(4);
    }
    const deep = art.dinoTheropodCranialRadii(1, 1, .2, mature);
    const legacy = art.dinoTheropodCranialRadii(1, 1, .2, { ...mature, matureTyrannosaur: false });
    expect(deep[4][0]).toBeGreaterThan(legacy[4][0]); expect(deep[4][1]).toBeGreaterThan(legacy[4][1]);
    expect(deep[0]).toEqual(legacy[0]); expect(deep.at(-1)).toEqual(legacy.at(-1));
  });

  it('sculpts a softly squared skull with finite normals, bilateral symmetry and unchanged mesh cost', () => {
    const points = [vec(2, 0), vec(1, 0), vec(0, 0), vec(-1, 0), vec(-2, 0), vec(-2.3, 0)];
    const radii = [[.2, .2], [.4, .4], [.85, 1], [.78, .8], [.64, .7], [.025, .04]];
    const shape = { center: vec(-.4, -.2), length: 1, height: 1, depth: 1, cheek: 0 };
    const round = art.dinoCranialGeometry(THREE, points, radii, shape);
    const squared = art.dinoCranialGeometry(THREE, points, radii, { ...shape, robustSection: true });
    expect(squared.attributes.position.count).toBe(round.attributes.position.count);
    expect(Array.from(squared.index.array)).toEqual(Array.from(round.index.array));
    expect(squared.userData.dinoSectionPower).toBeLessThan(1);
    let cornersExpanded = 0;
    for (let ring = 0; ring <= 72; ring++) for (let side = 0; side <= 40; side++) {
      const i = ring * 41 + side, mirror = ring * 41 + 40 - side;
      const p = squared.attributes.position, n = squared.attributes.normal, b = round.attributes.position;
      expect([p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i)].every(Number.isFinite)).toBe(true);
      expect(p.getZ(i)).toBeCloseTo(-p.getZ(mirror), 5);
      expect(new THREE.Vector3().fromBufferAttribute(n, i).length()).toBeCloseTo(1, 5);
      if (Math.abs(p.getY(i)) > Math.abs(b.getY(i)) + .01 && Math.abs(p.getZ(i)) > Math.abs(b.getZ(i)) + .01) cornersExpanded++;
      if (side === 0) expect(new THREE.Vector3().fromBufferAttribute(n, i).distanceTo(new THREE.Vector3().fromBufferAttribute(n, mirror))).toBeLessThan(1e-6);
    }
    expect(cornersExpanded).toBeGreaterThan(100);
    round.dispose(); squared.dispose();
  });
});
