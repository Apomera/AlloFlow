import { loadAvianFeatherArt } from './helpers/avian_feather_art_fixture.js';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
function fixture() {
  const context={};
  for(const name of ['save','restore','translate','rotate','beginPath','closePath','clip',
    'fillRect','moveTo','lineTo','bezierCurveTo','quadraticCurveTo','stroke','fill'])context[name]=()=>{};
  context.createLinearGradient=()=>({addColorStop(){}});
  const canvas=()=>({width:16,height:16,getContext:()=>context});
  const local={AvianFeatherArt: { ...loadAvianFeatherArt(),createFlightFeatherCanvas:canvas,createVaneDetailCanvases:()=>({normal:canvas(),roughness:canvas()})}};
  new Function('window','document',readFileSync('stem_lab/birdlab_3d_bird.js','utf8'))(local,{createElement:canvas});
  return local.BirdLab3DBird.create(THREE);
}

describe('BirdLab layered thigh feathers',()=>{
  it('keeps entire feather triangles outside the oval, with submillimetre tip lift',()=>{
    const bird=fixture(),mesh=bird.root.getObjectByName('layered-thigh-feathers--1');
    const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal;
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),origin=new THREE.Vector3(),nearest=new THREE.Vector3(),normal=new THREE.Vector3();
    const triangle=new THREE.Triangle();
    try {
      expect(p.count).toBeLessThan(3000);expect(g.index.count/3).toBeLessThan(3700);
      for(let vertex=0;vertex<p.count;vertex++) {
        a.fromBufferAttribute(p,vertex);normal.fromBufferAttribute(n,vertex);
        expect(a.length()).toBeGreaterThan(1);expect(a.length()).toBeLessThan(1.025);
        expect((a.length()-1)*Math.max(...mesh.parent.scale.toArray())).toBeLessThan(.001);
        expect(normal.length()).toBeCloseTo(1,5);
      }
      // Check triangle interiors too: vertices outside the oval alone can
      // hide a flat vane cutting through the curved surface between them.
      for(let face=0;face<g.index.count;face+=3) {
        a.fromBufferAttribute(p,g.index.getX(face));b.fromBufferAttribute(p,g.index.getX(face+1));c.fromBufferAttribute(p,g.index.getX(face+2));
        triangle.set(a,b,c);triangle.closestPointToPoint(origin,nearest);
        if(nearest.length()<1||triangle.getArea()<1e-9||triangle.getNormal(normal).dot(a)<=0)throw new Error(`Invalid cuff triangle ${face/3}`);
      }
    } finally { bird.dispose(); }
  });

  it('moves with the hocks while preserving toe clearance and all retained buffers',()=>{
    const bird=fixture(),point=new THREE.Vector3();
    try {
      const cuffs=[-1,1].map(side=>bird.root.getObjectByName(`layered-thigh-feathers-${side}`));
      const original=cuffs[0].geometry.attributes.position.array.slice();
      for(const pose of [{fold:1,feet:1},{fold:1,feet:1,crouch:1},{fold:.5,feet:1,touchdown:1},{fold:0,feet:0},{fold:0,feet:.5}]) {
        bird.update(pose,0);bird.root.updateMatrixWorld(true);
        for(const cuff of cuffs) {
          const p=cuff.geometry.attributes.position,foot=cuff.parent.parent;
          expect(cuff.position.toArray()).toEqual([0,0,0]);
          expect(p.array).toEqual(original);
          for(let vertex=0;vertex<p.count;vertex+=5) {
            point.fromBufferAttribute(p,vertex).applyMatrix4(cuff.matrixWorld);foot.worldToLocal(point);
            expect(point.y).toBeGreaterThan(-.09);
            expect(Math.abs(point.x)).toBeLessThan(.018);
          }
        }
      }
    } finally { bird.dispose(); }
  });

  it('shares the existing feather material and one geometry between both legs',()=>{
    const bird=fixture(),left=bird.root.getObjectByName('layered-thigh-feathers--1'),right=bird.root.getObjectByName('layered-thigh-feathers-1');
    expect(left.geometry).toBe(right.geometry);expect(left.material).toBe(right.material);
    expect(left.material).toBe(bird.root.getObjectByName('layered-scapular-mantle-and-flank-plumes').material);
    let disposals=0;left.geometry.addEventListener('dispose',()=>disposals++);
    bird.dispose();bird.dispose();expect(disposals).toBe(1);
  });
});
