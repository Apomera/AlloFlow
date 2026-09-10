import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function extract(name){const start=source.indexOf('function '+name+'('),open=source.indexOf('{',start);let depth=1,end=open+1;for(;depth;end++){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;}return Function('THREE','return ('+source.slice(start,end)+')')(THREE);}
const body=extract('createRaptorBodyGeometry'),tufts=extract('createRaptorEarTufts'),disc=extract('createRaptorFacialDiscGeometry'),sculpt=extract('sculptRaptorHeadGeometry');
describe('Raptor body and species contours',()=>{
  it('keeps a continuous body within the folded-wing envelope with a blended breast',()=>{
    const counts=[];
    for(const quality of ['low','high']){const g=body(quality,0x6b4423,0xfef3c7),p=g.attributes.position,c=g.attributes.color,n=g.attributes.normal;counts.push(p.count);
      for(const attribute of [p,c,n])expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
      let upper=0,lower=0,upperCount=0,lowerCount=0,blended=0;
      const back=new THREE.Color(0x6b4423).convertSRGBToLinear(),chest=new THREE.Color(0xfef3c7).convertSRGBToLinear();
      for(let i=0;i<p.count;i++){
        expect(Math.abs(p.getX(i))).toBeLessThanOrEqual(0.245001);expect(Math.abs(p.getZ(i))).toBeLessThanOrEqual(0.630001);
        if(p.getY(i)>0.15){upper+=c.getX(i);upperCount++;}if(p.getY(i)<-0.15&&p.getZ(i)>-0.2){lower+=c.getX(i);lowerCount++;}
        if(c.getX(i)>back.r+0.01&&c.getX(i)<chest.r-0.01)blended++;
      }
      expect(lower/lowerCount).toBeGreaterThan(upper/upperCount*2);expect(blended).toBeGreaterThan(20);g.dispose();
    }
    expect(counts[1]).toBeGreaterThan(counts[0]);
  });
  it('builds mirrored feathered tufts with nondegenerate surfaces and roots inside the head',()=>{
    const g=tufts(),p=g.attributes.position,n=g.attributes.normal,ids=g.index.array,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();expect(p.count).toBe(150);
    for(const attr of [p,n,g.attributes.color])expect(Array.from(attr.array).every(Number.isFinite)).toBe(true);
    for(let i=0;i<75;i++){expect(p.getX(i)).toBe(-p.getX(i+75));expect(p.getY(i)).toBe(p.getY(i+75));expect(p.getZ(i)).toBe(p.getZ(i+75));}
    for(let i=0;i<ids.length;i+=3){a.fromBufferAttribute(p,ids[i]);b.fromBufferAttribute(p,ids[i+1]);c.fromBufferAttribute(p,ids[i+2]);expect(b.sub(a).cross(c.sub(a)).length()).toBeGreaterThan(1e-8);}
    for(let f=0;f<10;f++){a.fromBufferAttribute(p,f*15+1);expect(a.length()).toBeLessThan(0.22);expect(p.getY(f*15+13)).toBeGreaterThan(0.26);}g.dispose();
  });
  it('gives the great horned owl a warmer disc with a darker feather rim without changing its attachment',()=>{
    const plain=disc(),horned=disc('greatHorned');expect(Array.from(horned.attributes.position.array)).toEqual(Array.from(plain.attributes.position.array));
    const color=horned.attributes.color,center=color.getX(0),rim=color.getX(120);expect(center).toBeGreaterThan(rim*1.5);expect(center).toBeLessThan(plain.attributes.color.getX(0));expect(color.getX(0)).toBeGreaterThan(color.getZ(0));
    expect(Array.from(color.array).every(v=>Number.isFinite(v)&&v>=0&&v<=1)).toBe(true);plain.dispose();horned.dispose();
  });
});

describe('Raptor head contours',()=>{
  it('flattens the crown and narrows the chin while preserving the eye-level surface and owl head',()=>{
    const original=new THREE.SphereGeometry(0.22,24,16),g=sculpt(original.clone(),false),p=g.attributes.position,q=original.attributes.position;
    for(let i=0;i<p.count;i++){expect(p.getZ(i)).toBe(q.getZ(i));if(q.getY(i)>=-0.02&&q.getY(i)<=0.06){expect(p.getX(i)).toBe(q.getX(i));expect(p.getY(i)).toBe(q.getY(i));}if(q.getY(i)>0.15)expect(p.getY(i)).toBeLessThan(q.getY(i));if(q.getY(i)<-0.10)expect(Math.abs(p.getX(i))).toBeLessThanOrEqual(Math.abs(q.getX(i)));}
    expect(Array.from(g.attributes.normal.array).every(Number.isFinite)).toBe(true);expect(Array.from(sculpt(original.clone(),true).attributes.position.array)).toEqual(Array.from(q.array));original.dispose();g.dispose();
  });
});
