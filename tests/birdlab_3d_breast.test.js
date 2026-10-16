import { loadAvianFeatherArt } from './helpers/avian_feather_art_fixture.js';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_bird.js', 'utf8');
function fixture() {
  const context = {};
  for (const name of ['save','restore','translate','rotate','beginPath','closePath','clip',
    'fillRect','moveTo','lineTo','bezierCurveTo','quadraticCurveTo','stroke','fill']) context[name] = () => {};
  context.createLinearGradient = () => ({ addColorStop() {} });
  const canvas = () => ({ width:16,height:16,getContext:()=>context });
  const local = { AvianFeatherArt: { ...loadAvianFeatherArt(), createFlightFeatherCanvas:canvas,
    createVaneDetailCanvases:()=>({normal:canvas(),roughness:canvas()}) } };
  new Function('window','document',source)(local,{createElement:canvas});
  return local.BirdLab3DBird.create(THREE);
}

describe('BirdLab fine breast plumage', () => {
  it('keeps the finer feathers close to the actual skin without sinking through it', () => {
    const bird=fixture(),skin=bird.root.getObjectByName('continuous-mantle-and-streaked-breast');
    const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
    const body=new THREE.Mesh(skin.geometry,material),ray=new THREE.Raycaster();
    const chest=bird.root.getObjectByName('layered-breast-and-belly-plumes');
    const p=chest.geometry.attributes.position,point=new THREE.Vector3(),direction=new THREE.Vector3();
    try {
      // Raycast the independently tessellated skin, not its construction formula.
      for(let feather=0;feather<300;feather+=3)for(const station of [0,3,6]) {
        point.fromBufferAttribute(p,feather*35+station*5+2);
        direction.set(point.x,point.y-.004,0).normalize();
        ray.set(point.clone().addScaledVector(direction,.03),direction.clone().negate());
        const hit=ray.intersectObject(body)[0];
        expect(hit).toBeDefined();
        const clearance=hit.distance-.03;
        expect(clearance).toBeGreaterThan(0);
        expect(clearance).toBeLessThan(.0028);
      }
      // The denser layer remains one shared-material batch at a bounded cost.
      expect(p.count).toBeLessThanOrEqual(11000);
      expect(chest.geometry.index.count/3).toBeLessThanOrEqual(15000);
      expect(chest.material.map).toBe(bird.root.getObjectByName('layered-scapular-mantle-and-flank-plumes').material.map);
    } finally { material.dispose(); bird.dispose(); }
  });

  it('has outward nondegenerate vanes, overlapping rows and bounded fine feather lengths', () => {
    const bird=fixture(),g=bird.root.getObjectByName('layered-breast-and-belly-plumes').geometry;
    const p=g.attributes.position,n=g.attributes.normal,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
    try {
      for(let i=0;i<p.count;i++) {
        a.fromBufferAttribute(p,i); b.fromBufferAttribute(n,i);
        if(![...a.toArray(),...b.toArray()].every(Number.isFinite)||Math.abs(b.length()-1)>1e-5)throw new Error('Invalid breast vertex');
      }
      for(let i=0;i<g.index.count;i+=3) {
        a.fromBufferAttribute(p,g.index.getX(i));b.fromBufferAttribute(p,g.index.getX(i+1));c.fromBufferAttribute(p,g.index.getX(i+2));
        b.sub(a).cross(c.sub(a));
        if(b.lengthSq()<1e-22||b.dot(c.set(a.x,a.y-.004,0))<=0)throw new Error('Folded or inward breast triangle');
      }
      for(let feather=0;feather<300;feather++) {
        const root=p.getZ(feather*35+2),tip=p.getZ(feather*35+32),length=tip-root;
        expect(length).toBeGreaterThan(.032);expect(length).toBeLessThan(.040);
        if(feather<275)expect(tip-p.getZ((feather+25)*35+2)).toBeGreaterThan(.006);
      }
    } finally { bird.dispose(); }
  });

  it('retains the feather layer through articulation and disposes it only once', () => {
    const bird=fixture(),mesh=bird.root.getObjectByName('layered-breast-and-belly-plumes');
    const geometry=mesh.geometry,positions=geometry.attributes.position.array,original=positions.slice();
    let disposed=0;geometry.addEventListener('dispose',()=>disposed++);
    for(const pose of [{fold:1},{fold:0,flapAmplitude:1,flapPhase:2},{fold:.4,brake:.8}]) {
      bird.update(pose,.016);expect(mesh.geometry).toBe(geometry);
      expect(geometry.attributes.position.array).toBe(positions);expect(positions).toEqual(original);
    }
    bird.dispose();bird.dispose();expect(disposed).toBe(1);
  });
});
