import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const T = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const capture = source.replace("window.StemLab.registerTool('dinoLab'", "globalThis.__cervicalArt = { DINOS, postcranialSurfaceProfileFor, dinoCervicalEnvelope, dinoSurfaceGeometry, dinoNeckJunction, dinoLoftRadius }; window.StemLab.registerTool('dinoLab'");
window.StemLab = { registerTool() {} };
new Function(capture)();
const art = globalThis.__cervicalArt;

describe('Dino Lab cervical skin envelope', () => {
  it('retains the existing non-sauropod stations without moving its anchors', () => {
    const shoulder = new T.Vector3(2, 1, 0), head = new T.Vector3(-1, 3, 0);
    const before = [shoulder.toArray(), head.toArray()];
    const result = art.dinoCervicalEnvelope(T, shoulder, head, 2, .5, .1, { neckBaseCurve: -.1, neckMidCurve: .11 }, false, 'Dromaeosauridae');
    expect(result.points[0]).toBe(shoulder); expect(result.points.at(-1)).toBe(head);
    expect(result.points[1].distanceTo(shoulder.clone().lerp(head,.34).add(new T.Vector3(0,-.2,0)))).toBeLessThan(1e-12);
    expect(result.points[2].distanceTo(shoulder.clone().lerp(head,.70).add(new T.Vector3(0,.22,0)))).toBeLessThan(1e-12);
    expect(result.radii).toEqual([.5,.5*.82,.1*1.22,.1]);
    expect([shoulder.toArray(),head.toArray()]).toEqual(before);
  });

  it('keeps every catalog sauropod finite, anchored, and smoothly tapered across its size range', () => {
    const animals = art.DINOS.filter(dn => dn.group === 'sauropod');
    expect(animals.length).toBeGreaterThan(10);
    for (const dn of animals) {
      const length = Math.max(.5, dn.lengthM || 1), height = Math.max(.25, dn.heightM || .5);
      const shoulder = new T.Vector3(-length*.18,height*.55,0), head = new T.Vector3(-length*.42,height*1.06,0);
      const bodyHeight = height*.18, base = bodyHeight*.42, tip = Math.min(height*.038,base*.42);
      const before = [shoulder.toArray(),head.toArray()];
      const envelope = art.dinoCervicalEnvelope(T,shoulder,head,bodyHeight,base,tip,art.postcranialSurfaceProfileFor(dn),true,dn.clade);
      expect(envelope.points.length, dn.id).toBeGreaterThanOrEqual(6);
      expect(envelope.points.length, dn.id).toBeLessThanOrEqual(7);
      expect(envelope.points[0]).toBe(shoulder); expect(envelope.points.at(-1)).toBe(head);
      expect(envelope.radii[0]).toBe(base); expect(envelope.radii.at(-1)).toBe(tip);
      const line = head.clone().sub(shoulder), length2 = line.lengthSq();
      let previousT = -1;
      envelope.points.forEach((point, index) => {
        expect(point.toArray().every(Number.isFinite), dn.id).toBe(true);
        const t = (point.x-shoulder.x)/(head.x-shoulder.x);
        expect(t, dn.id).toBeGreaterThan(previousT); previousT=t;
        expect(point.distanceTo(shoulder.clone().lerp(head,t)), dn.id).toBeLessThanOrEqual(bodyHeight*.221);
        expect(envelope.radii[index],dn.id).toBeGreaterThan(0);
        if (index) expect(envelope.radii[index],dn.id).toBeLessThanOrEqual(envelope.radii[index-1]);
        expect(point.clone().sub(shoulder).dot(line)/length2,dn.id).toBeGreaterThanOrEqual(-.001);
      });
      // The neck shaft loses proximal breadth before its midpoint, rather than
      // retaining a broad shoulder cone through the first third of its length.
      expect(envelope.radii[2],dn.id).toBeLessThan(base*.75);
      for (let station=0;station<envelope.radii.length-1;station+=.05) {
        const radius=art.dinoLoftRadius(envelope.radii,station,0);
        expect(radius,dn.id).toBeGreaterThanOrEqual(tip-1e-10);
        expect(radius,dn.id).toBeLessThanOrEqual(base+1e-10);
      }
      const geometry=art.dinoSurfaceGeometry(T,envelope.points,envelope.radii,{smoothProfile:true});
      for (const key of ['position','normal','uv']) expect(Array.from(geometry.attributes[key].array).every(Number.isFinite),dn.id).toBe(true);
      const root=art.dinoNeckJunction(T,envelope.points,envelope.radii,height*.1);
      expect(root.point.toArray().every(Number.isFinite),dn.id).toBe(true);
      expect(root.t,dn.id).toBeGreaterThan(0); expect(root.t,dn.id).toBeLessThan(1);
      expect(root.radius,dn.id).toBeGreaterThan(0);
      const curve=new T.CatmullRomCurve3(envelope.points,false,'centripetal');
      expect(root.point.distanceTo(curve.getPoint(root.t)),dn.id).toBeLessThan(height*1e-9);
      expect([shoulder.toArray(),head.toArray()],dn.id).toEqual(before);
      geometry.dispose();
    }
  });
});
