import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/stem_tool_raptorhunt.js', 'utf8');
const start = source.indexOf('function sculptMountainGeometry(');
const end = source.indexOf('function detailSnowMaterial(', start);
function sculpt(quality) { return Function('THREE', 'graphicsQuality', 'return (' + source.slice(start, end).trim() + ')')(THREE, quality); }

describe('Raptor cinematic ridge geometry', () => {
  it('keeps snow exactly on its parent surface at every vertex', () => {
    const make = sculpt('balanced');
    const rock = make(new THREE.ConeGeometry(80, 100, 36, 16), 1.7);
    const cap = make(new THREE.ConeGeometry(80 * 0.4 * 1.02, 40, 36, 12), 1.7, 100);
    const a = rock.attributes.position, b = cap.attributes.position;
    expect(a.count).toBe(b.count);
    for (let i = 0; i < a.count; i++) {
      expect(Math.abs(a.getX(i) - b.getX(i))).toBeLessThan(0.00003);
      expect(Math.abs(a.getZ(i) - b.getZ(i))).toBeLessThan(0.00003);
      expect(Math.abs(a.getY(i) - (b.getY(i) + 30))).toBeLessThan(0.00003);
    }
    expect(Array.from(cap.attributes.rhSnow.array).some(v => v < 0)).toBe(true);
    expect(Array.from(cap.attributes.rhSnow.array).some(v => v > 0)).toBe(true);
    rock.dispose(); cap.dispose();
  });

  it('scales detail by quality while keeping finite normals and grounded skirts', () => {
    const counts = [];
    for (const quality of ['low', 'balanced', 'high']) {
      const geometry = sculpt(quality)(new THREE.ConeGeometry(80, 100, 20, 5), 3.2);
      counts.push(geometry.attributes.position.count);
      expect(Array.from(geometry.attributes.normal.array).every(Number.isFinite)).toBe(true);
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        if (Math.abs(p.getX(i)) > 79.9 || Math.abs(p.getZ(i)) > 79.9) expect(p.getY(i)).toBeCloseTo(-50, 4);
      }
      geometry.dispose();
    }
    expect(counts[0]).toBeLessThan(counts[1]);
    expect(counts[1]).toBeLessThan(counts[2]);
  });
});

function extractGeometry(name, end, names = [], values = []) {
  const a = source.indexOf('function ' + name + '(');
  const b = source.indexOf(end, a);
  return Function('THREE', ...names, 'return (' + source.slice(a, b).trim() + ')')(THREE, ...values);
}

describe('Raptor refined flight surfaces', () => {
  it('fills the lake interior with grounded, consistently wound rings', () => {
    const make = extractGeometry('createLakeSurfaceGeometry', "        if (species.biome === 'lake')");
    const geometry = make(118, 64, 20);
    const p = geometry.attributes.position;
    expect(p.count).toBe(1281);
    expect(Array.from(geometry.attributes.normal.array).every(Number.isFinite)).toBe(true);
    for (let i = 0; i < p.count; i++) {
      expect(Math.hypot(p.getX(i), p.getY(i))).toBeLessThan(118.00001);
      expect(p.getZ(i)).toBe(0);
      expect(geometry.attributes.normal.getZ(i)).toBeCloseTo(1, 4);
    }
    expect(geometry.index.count).toBe(64 * 3 + 19 * 64 * 6);
    geometry.dispose();
  });

  it('exposes primary tips beyond the supporting wing and preserves bilateral symmetry', () => {
    const make = extractGeometry('createTaperedPrimaryGeometry', '        if (silhouetteProfile.primaryFingers', ['wingSpan', 'wingDepth', 'silhouetteProfile'], [3, 0.64, { sweep: -0.26 }]);
    for (let index = 0; index < 5; index++) {
      const left = make(-1, index, 5), right = make(1, index, 5);
      const a = left.attributes.position, b = right.attributes.position;
      expect(a.count).toBe(b.count);
      expect(Math.abs((a.getX(8) + a.getX(9)) / 2)).toBeGreaterThan(3 * 0.84);
      for (let i = 0; i < a.count; i++) {
        const mirrored = i % 2 ? i - 1 : i + 1;
        expect(a.getX(i)).toBeCloseTo(-b.getX(mirrored), 5);
        expect(a.getY(i)).toBeCloseTo(b.getY(mirrored), 5);
        expect(a.getZ(i)).toBeCloseTo(b.getZ(mirrored), 5);
      }
      expect(Array.from(a.array).every(Number.isFinite)).toBe(true);
      expect(Array.from(left.attributes.normal.array).every(Number.isFinite)).toBe(true);
      left.dispose(); right.dispose();
    }
  });
});


describe('Raptor curved meadow tufts', () => {
  it('keeps roots on the planting plane and gives every blade a curved taper', () => {
    const make=extractGeometry('createMeadowClumpGeometry','        var grassInstanceCount');
    const geometry=make(10),p=geometry.attributes.position,c=geometry.attributes.color;
    expect(p.count).toBe(80);expect(geometry.index.count).toBe(150);
    for(let blade=0;blade<10;blade++){
      const i=blade*8;expect(p.getY(i)).toBe(0);expect(p.getY(i+1)).toBe(0);
      expect(p.getY(i+6)).toBeGreaterThan(0.6);expect(p.getY(i+6)).toBeLessThanOrEqual(1.5);
      const rootX=(p.getX(i)+p.getX(i+1))/2,rootZ=(p.getZ(i)+p.getZ(i+1))/2;
      expect(Math.hypot(p.getX(i+6)-rootX,p.getZ(i+6)-rootZ)).toBeGreaterThan(0.15);
      expect(c.getY(i+6)).toBeGreaterThan(c.getY(i));
    }
    for(const index of geometry.index.array){expect(index).toBeLessThan(p.count);expect(geometry.attributes.normal.getX(index)).toBeTypeOf('number');}
    expect(Array.from(geometry.attributes.normal.array).every(Number.isFinite)).toBe(true);geometry.dispose();
  });
  it('scales tuft geometry by quality without zero-area rendered triangles', () => {
    const make=extractGeometry('createMeadowClumpGeometry','        var grassInstanceCount'),counts=[];
    for(const blades of [7,10,13]){
      const g=make(blades),p=g.attributes.position,ids=g.index.array;counts.push(p.count);
      const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
      for(let i=0;i<ids.length;i+=3){a.fromBufferAttribute(p,ids[i]);b.fromBufferAttribute(p,ids[i+1]);c.fromBufferAttribute(p,ids[i+2]);expect(b.sub(a).cross(c.sub(a)).length()).toBeGreaterThan(0.00001);}
      g.dispose();
    }
    expect(counts).toEqual([56,80,104]);
  });
});


describe('Raptor curved forest boughs',()=>{
  it('keeps curved panels seamless, finite, and inside their crown envelope',()=>{
    const make=extractGeometry('canopyCards','        var needleCanopy');
    const needles=make(false),leaves=make(true),p=needles.attributes.position,uv=needles.attributes.uv;
    expect(p.count).toBe(52);expect(needles.index.count).toBe(78);
    expect(leaves.attributes.position.count).toBe(16);
    expect(p.getZ(0)).toBeCloseTo(0,6);expect(p.getZ(5)).toBeCloseTo(0.24,6);
    for(let card=0;card<3;card++)for(let panel=0;panel<3;panel++){
      const edge=card*16+panel*4;
      for(const [a,b] of [[edge+1,edge+4],[edge+2,edge+7]]){
        expect(p.getX(a)).toBeCloseTo(p.getX(b),6);expect(p.getY(a)).toBeCloseTo(p.getY(b),6);expect(p.getZ(a)).toBeCloseTo(p.getZ(b),6);expect(uv.getX(a)).toBeCloseTo(uv.getX(b),6);
      }
    }
    for(const g of [needles,leaves]){
      expect(Array.from(g.attributes.position.array).every(v=>Number.isFinite(v)&&Math.abs(v)<=1.01)).toBe(true);
      const n=g.attributes.normal;for(let i=0;i<n.count;i++)expect(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))).toBeCloseTo(1,5);
      const ids=g.index.array,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
      for(let i=0;i<ids.length;i+=3){a.fromBufferAttribute(g.attributes.position,ids[i]);b.fromBufferAttribute(g.attributes.position,ids[i+1]);c.fromBufferAttribute(g.attributes.position,ids[i+2]);expect(b.sub(a).cross(c.sub(a)).length()).toBeGreaterThan(0.01);}
      g.dispose();
    }
  });
});
