import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url),T=require(path.resolve('vendor/three-r128/three.min.js'));
const source=fs.readFileSync(process.env.SCALE_LIBERTY_SOURCE||'stem_lab/stem_tool_scaleexplorer.js','utf8');
function extractFunction(text,name){
  const start=text.indexOf('function '+name+'(');if(start<0)throw Error('Missing dedicated Liberty pedestal');
  const open=text.indexOf('{',start);let depth=0,quote='',comment='';
  for(let i=open;i<text.length;i++){
    const c=text[i],next=text[i+1];
    if(comment==='line'){if(c==='\n')comment='';continue;}
    if(comment==='block'){if(c==='*'&&next==='/'){comment='';i++;}continue;}
    if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}
    if(c==='/'&&next==='/'){comment='line';i++;continue;}
    if(c==='/'&&next==='*'){comment='block';i++;continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{')depth++;else if(c==='}'&&!--depth)return text.slice(start,i+1);
  }
  throw Error('Unterminated Liberty pedestal');
}

describe('Scale Explorer Statue of Liberty pedestal geometry',()=>{
  it('builds three actual recessed loggia bays above shallow terraces with correct reference levels and disposable native geometry',()=>{
    const owned=[],g=new T.Group(),sandbox={T,Float32Array,Uint16Array,Math,Object,Array,Error,
      track(resource){owned.push(resource);return resource;},
      material(color,options){const mat=new T.MeshStandardMaterial(Object.assign({color},options));mat.color.convertSRGBToLinear();mat.emissive.convertSRGBToLinear();owned.push(mat);return mat;},
      mesh(parent,geometry,material){const mesh=new T.Mesh(geometry,material);parent.add(mesh);return mesh;}};
    vm.createContext(sandbox);vm.runInContext(extractFunction(source,'buildLibertyPedestal')+'\nthis.build=buildLibertyPedestal;',sandbox);
    const data=sandbox.build(g),bounds=new T.Box3().setFromObject(g);
    expect(g.children).toHaveLength(1);expect(data.group.userData.libertyPedestal).toBe(data);
    expect(data.meshes.length).toBeGreaterThan(5);expect(data.meshes.length).toBeLessThan(30);
    expect(bounds.min.y).toBeCloseTo(5.4/93-.5,6);expect(bounds.max.y).toBeCloseTo(46.94/93-.5,6);
    expect(data.stats).toMatchObject({pedestalHeightMeters:27.13,foundationReferenceMeters:19.81,statueBaseMeters:46.94,visibleGradeMeters:5.4,fortWallHeightMeters:7.315,fortPoints:11,graniteCourses:45,loggiaBaysPerFace:3,loggiaPilastersPerFace:4,illustrative:true});
    const materials=new Set(),bays=[];
    for(const mesh of data.meshes){
      const feature=mesh.userData.libertyDetailId;expect(['foundation','pedestal','terrace']).toContain(feature);expect(data[feature]).toContain(mesh);materials.add(mesh.material);expect(owned).toContain(mesh.material);expect(owned).toContain(mesh.geometry);
      const positions=mesh.geometry.attributes.position,normals=mesh.geometry.attributes.normal,indices=mesh.geometry.index;
      expect(indices.array).toBeInstanceOf(Uint16Array);expect(positions.count).toBeLessThan(65536);expect(indices.count%3).toBe(0);expect(normals.count).toBe(positions.count);
      for(let v=0;v<positions.count;v++){
        const vertex=new T.Vector3().fromBufferAttribute(positions,v),normal=new T.Vector3().fromBufferAttribute(normals,v);
        if(!vertex.toArray().every(Number.isFinite)||!normal.toArray().every(Number.isFinite))throw Error('Nonfinite Liberty pedestal geometry');
        if(Math.abs(normal.length()-1)>.0001)throw Error('Nonunit Liberty pedestal normal');
      }
      for(let i=0;i<indices.count;i+=3){
        const a=new T.Vector3().fromBufferAttribute(positions,indices.getX(i)),b=new T.Vector3().fromBufferAttribute(positions,indices.getX(i+1)),c=new T.Vector3().fromBufferAttribute(positions,indices.getX(i+2)),normal=new T.Vector3().fromBufferAttribute(normals,indices.getX(i));
        const cross=new T.Vector3().crossVectors(b.sub(a),c.sub(a));if(cross.lengthSq()<1e-18||cross.dot(normal)<=0)throw Error('Degenerate or reversed Liberty pedestal face');
      }
      if(mesh.name==='Liberty foundation fort'){
        const fortBounds=new T.Box3().setFromObject(mesh);expect((fortBounds.max.y-fortBounds.min.y)*93).toBeCloseTo(7.315,4);
      }
      // Actual front-facing rectangular window backs, at 1.10m reveal depth.
      if(mesh.name==='Liberty pedestal recess')for(let v=0;v<positions.count;v+=4){
        const points=[0,1,2,3].map(n=>new T.Vector3().fromBufferAttribute(positions,v+n));
        if(points.every(p=>Math.abs(p.z-5.4/93)<1e-6)&&points.every((p,n)=>normals.getZ(v+n)>.999)){
          const low=Math.min(...points.map(p=>p.y)),high=Math.max(...points.map(p=>p.y));
          if(Math.abs(low-(33.55/93-.5))<1e-6&&Math.abs(high-(37.9/93-.5))<1e-6)bays.push([Math.min(...points.map(p=>p.x))*93,Math.max(...points.map(p=>p.x))*93]);
        }
      }
    }
    expect(materials.size).toBe(data.meshes.length);expect(bays).toHaveLength(3);
    expect(bays.map(b=>b.map(v=>Math.round(v*100)/100))).toEqual([[-3.6,-1.48],[-1.06,1.06],[1.48,3.6]]);
    let disposed=0;for(const resource of owned){resource.addEventListener('dispose',()=>disposed++);resource.dispose();}expect(disposed).toBe(owned.length);expect(owned.length).toBe(data.meshes.length*2);
  });
});
