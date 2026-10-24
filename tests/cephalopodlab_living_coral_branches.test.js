import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url),repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const THREE=require(resolve(repo,'vendor/three-r128/three.min.js'));
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||resolve(repo,'stem_lab/stem_tool_cephalopodlab.js'),'utf8').replace(/\r\n/g,'\n');
const begin=source.indexOf('function createReefCoralGeometry(height,index){'),end=source.indexOf('        var coralColors =',begin);
if(begin<0||end<=begin)throw new Error('Missing current coral geometry factory');
const factory=source.slice(begin,end),noRandom=Object.assign(Object.create(Math),{random(){throw new Error('Coral geometry consumed dive RNG');}});
const build=new Function('THREE','Math',factory+';return createReefCoralGeometry;')(THREE,noRandom);
const baseVertices=[675,711,972],baseIndices=[2952,3072,3960],addedBranches=[5,3,5];
// Captured from the accepted f17db4e6 runtime's real factory, in the exact
// fixture/attribute order below. No historical inverse chain or copied factory.
const acceptedPrefixDigest='45d6066972366a455c34f00194286965c11ba75ef4e22e88afdccac532dd35c8';
function fixtures(check){for(const height of [1,1.75,2.5])for(let index=0;index<18;index++){const geometry=build(height,index);try{check(geometry,height,index);}finally{geometry.dispose();}}}
function bytes(array){return Buffer.from(array.buffer,array.byteOffset,array.byteLength);}
function point(attribute,vertex){return new THREE.Vector3().fromBufferAttribute(attribute,vertex);}
function ring(attribute,first){const center=new THREE.Vector3();for(let side=0;side<8;side++)center.add(point(attribute,first+side));center.multiplyScalar(1/8);return {center,radius:point(attribute,first).distanceTo(center)};}

describe('Cephalopod living coral branchlets from the current factory',()=>{
  it('preserves all accepted support geometry, tissue, pore coordinates and indices byte-for-byte',()=>{
    const digest=createHash('sha256');
    fixtures((geometry,height,index)=>{
      const count=baseVertices[index%3];
      for(const key of ['position','normal','color','clCoralSurface']){const attribute=geometry.attributes[key];digest.update(bytes(attribute.array.subarray(0,count*attribute.itemSize)));}
      digest.update(bytes(geometry.index.array.subarray(0,baseIndices[index%3])));
    });
    expect(digest.digest('hex')).toBe(acceptedPrefixDigest);
  });

  it('adds a bounded crown within every original footprint with no RNG, objects, textures or materials',()=>{
    expect(factory).toContain('coralOffshoots');expect(factory).not.toMatch(/Math\.random|new THREE\.(?:Mesh|Group|Texture|.*Material)\(/);
    fixtures((geometry,height,index)=>{
      const form=index%3,p=geometry.attributes.position,base=baseVertices[form],prefixBox=new THREE.Box3();
      for(let vertex=0;vertex<base;vertex++)prefixBox.expandByPoint(point(p,vertex));
      expect(p.count).toBe(base+addedBranches[form]*63);expect(geometry.index.count).toBe(baseIndices[form]+addedBranches[form]*264);
      expect(geometry.boundingBox.equals(prefixBox)).toBe(true);
      for(let vertex=base;vertex<p.count;vertex++){const v=point(p,vertex);expect(prefixBox.containsPoint(v)).toBe(true);expect(v.distanceTo(geometry.boundingSphere.center)).toBeLessThanOrEqual(geometry.boundingSphere.radius+1e-6);}
      expect(geometry.groups).toEqual([]);expect(geometry.userData.growthForm).toBe(['finger','antler','corymbose'][form]);
    });
  });

  it('keeps finite deterministic buffers, smooth closing seams and rounded terminal poles',()=>{
    fixtures((geometry,height,index)=>{
      const repeated=build(height,index),base=baseVertices[index%3];
      try{
        for(const key of Object.keys(geometry.attributes)){
          const a=geometry.attributes[key],b=repeated.attributes[key];expect(bytes(a.array).equals(bytes(b.array))).toBe(true);expect(Array.from(a.array).every(Number.isFinite)).toBe(true);
        }
        expect(bytes(geometry.index.array).equals(bytes(repeated.index.array))).toBe(true);
        const p=geometry.attributes.position,n=geometry.attributes.normal;
        for(let branch=0;branch<addedBranches[index%3];branch++){
          const start=base+branch*63;
          for(let row=0;row<7;row++){
            expect(point(p,start+row*9).distanceTo(point(p,start+row*9+8))).toBeLessThan(1e-7);
            expect(point(n,start+row*9).distanceTo(point(n,start+row*9+8))).toBeLessThan(1e-7);
          }
          for(let side=1;side<9;side++)expect(point(p,start+54).distanceTo(point(p,start+54+side))).toBeLessThan(1e-7);
          for(let vertex=start;vertex<start+63;vertex++)expect(Math.abs(point(n,vertex).length()-1)).toBeLessThan(1e-6);
        }
      }finally{repeated.dispose();}
    });
  });

  it('preserves actual vertex footprints after yaw, lean and arbitrary affine transforms',()=>{
    const transforms=[];
    for(let yaw=0;yaw<12;yaw++)for(const lean of [-.15,0,.15])transforms.push(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0,yaw*Math.PI/6,lean)));
    transforms.push(new THREE.Matrix4().compose(new THREE.Vector3(4,-2,7),new THREE.Quaternion().setFromEuler(new THREE.Euler(.7,1.2,-.4)),new THREE.Vector3(.9,1.1,.8)));
    fixtures((geometry,height,index)=>{
      const p=geometry.attributes.position,base=baseVertices[index%3],vertex=new THREE.Vector3();
      for(const matrix of transforms){
        const old=new THREE.Box3(),current=new THREE.Box3();
        for(let i=0;i<p.count;i++){vertex.fromBufferAttribute(p,i).applyMatrix4(matrix);current.expandByPoint(vertex);if(i<base)old.expandByPoint(vertex);}
        for(const axis of ['x','y','z']){expect(Math.abs(current.min[axis]-old.min[axis])).toBeLessThan(1e-7);expect(Math.abs(current.max[axis]-old.max[axis])).toBeLessThan(1e-7);}
      }
    });
  });

  it('produces nondegenerate outward triangles across every added branch and cap',()=>{
    fixtures((geometry,height,index)=>{
      const p=geometry.attributes.position,n=geometry.attributes.normal,indices=geometry.index.array;
      for(let triangle=baseIndices[index%3];triangle<indices.length;triangle+=3){
        const a=point(p,indices[triangle]),b=point(p,indices[triangle+1]),c=point(p,indices[triangle+2]);
        const cross=b.sub(a).cross(c.sub(a)),normal=point(n,indices[triangle]).add(point(n,indices[triangle+1])).add(point(n,indices[triangle+2]));
        expect(cross.length()).toBeGreaterThan(1e-8);expect(cross.dot(normal)).toBeGreaterThan(1e-8);
      }
    });
  });

  it('faces every triangle corner normal toward its own face, including each young tip pole',()=>{
    // The summed-normal check above can hide single corners: one shared pole normal per young
    // tip once faced away from 481 fan facets (worst -0.64). Current minimum is about 0.43.
    let worst={dot:1};
    fixtures((geometry,height,index)=>{
      const p=geometry.attributes.position,n=geometry.attributes.normal,indices=geometry.index.array;
      for(let triangle=0;triangle<indices.length;triangle+=3){
        const a=point(p,indices[triangle]),face=point(p,indices[triangle+1]).sub(a).cross(point(p,indices[triangle+2]).sub(a));
        if(face.lengthSq()===0)continue;face.normalize();
        for(let corner=0;corner<3;corner++){const vertex=indices[triangle+corner],dot=face.dot(point(n,vertex));if(!(dot>=worst.dot))worst={dot,height,index,vertex};}
      }
    });
    expect(worst.dot,'worst corner '+JSON.stringify(worst)).toBeGreaterThan(.25);
  });

  it('grafts each curved young branch into an existing host and differentiates its growing tip',()=>{
    fixtures((geometry,height,index)=>{
      const form=index%3,base=baseVertices[form],p=geometry.attributes.position,c=geometry.attributes.color,s=geometry.attributes.clCoralSurface;
      const hostSegments=[];let previous=null;
      for(let first=0;first<base;first+=9){
        const current=ring(p,first);
        if(previous)hostSegments.push([previous,current]);
        previous=current.radius<1e-7?null:current;
      }
      for(let branch=0;branch<addedBranches[form];branch++){
        const start=base+branch*63,root=ring(p,start),tip=ring(p,start+54),middle=ring(p,start+18);
        const attached=hostSegments.some(([a,b])=>{
          const delta=b.center.clone().sub(a.center),t=Math.max(0,Math.min(1,root.center.clone().sub(a.center).dot(delta)/delta.lengthSq()));
          const center=a.center.clone().addScaledVector(delta,t),radius=a.radius+(b.radius-a.radius)*t;
          return root.center.distanceTo(center)<radius+1e-5;
        });
        expect(attached).toBe(true);expect(tip.center.y-root.center.y).toBeGreaterThan(height*.07);
        // A real off-axis curved silhouette, not a duplicate vertical spike.
        expect(Math.hypot(tip.center.x-root.center.x,tip.center.z-root.center.z)).toBeGreaterThan(.045);
        const direct=tip.center.clone().sub(root.center),fraction=middle.center.clone().sub(root.center).dot(direct)/direct.lengthSq();
        expect(middle.center.distanceTo(root.center.clone().addScaledVector(direct,fraction))).toBeGreaterThan(.001);
        expect(c.getY(start+54)-c.getY(start)).toBeGreaterThan(.05);
        expect(s.getZ(start)).toBe(0);expect(s.getZ(start+54)).toBe(0);
        expect(s.getW(start)).toBeGreaterThanOrEqual(6);expect(s.getY(start+54)).toBeGreaterThan(s.getY(start));
      }
    });
  });
});
