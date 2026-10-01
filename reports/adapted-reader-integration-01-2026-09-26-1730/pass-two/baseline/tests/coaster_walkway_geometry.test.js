import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const src = readFileSync('stem_lab/stem_tool_coasterlab.js', 'utf8');
const block = src.split('/* @clab-walkway-geometry-start */')[1].split('/* @clab-walkway-geometry-end */')[0];
const build = new Function('THREE', block + '; return coasterWalkwayGeometry;')(THREE);
const frame = (z, bank = 0) => ({ pos: { x: z*0.2, y: z*0.1, z }, side: { x: Math.cos(bank), y: Math.sin(bank), z: 0 }, up: { x: -Math.sin(bank), y: Math.cos(bank), z: 0 } });
describe('Continuous lift walkway', () => {
  it.each([2, 3, 30])('has no open edges or disconnected deck pieces with %i frames', count => {
    const geometry = build(Array.from({length: count}, (_,i) => frame(i*2, i*0.02)));
    const edges = new Map(); const indices = geometry.index.array;
    for(let i=0;i<indices.length;i+=3) for(let e=0;e<3;e++){
      const a=indices[i+e], b=indices[i+(e+1)%3], key=[a,b].sort((x,y)=>x-y).join(':');
      edges.set(key,(edges.get(key)||0)+1);
    }
    expect([...edges.values()].every(count => count === 2)).toBe(true);
    expect([...geometry.attributes.position.array, ...geometry.attributes.normal.array].every(Number.isFinite)).toBe(true);
    expect(Math.max(...indices)).toBeLessThan(geometry.attributes.position.count);
    geometry.dispose();
  });
  it('follows the banking at both edges while retaining the deck width and thickness', () => {
    const frames = [frame(0), frame(2, Math.PI/3), frame(4, Math.PI/2)];
    const geometry = build(frames), points = geometry.attributes.position;
    for(let i=0;i<frames.length;i++){
      const point = offset => new THREE.Vector3().fromBufferAttribute(points,i*4+offset);
      expect(point(0).distanceTo(point(1))).toBeCloseTo(0.72,5);
      expect(point(1).distanceTo(point(2))).toBeCloseTo(0.08,5);
      expect(point(2).clone().sub(point(1)).normalize().dot(frames[i].up)).toBeCloseTo(1,5);
    }
    geometry.dispose();
  });
});
