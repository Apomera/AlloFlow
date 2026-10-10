import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name){const start=source.indexOf('function '+name+'(');if(start<0)throw Error(name);let end=source.indexOf('{',start),depth=1;while(depth){end++;if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const names=['createPreyContactGeometry','preyContactProfile','writePreyContactPatch','finishPreyContactPatches'];
const api=Function('THREE',names.map(body).join('\n')+';return {create:createPreyContactGeometry,profile:preyContactProfile,write:writePreyContactPatch,finish:finishPreyContactPatches};')(THREE);
const profile=(size=2,height=0,kind='rabbit',spread=0)=>api.profile({},size,height,kind,spread);

describe('Soft prey contact shadows',()=>{
  it('fades and broadens continuously as prey leaves the ground',()=>{
    for(const size of [.75,2,4]){
      let previous=profile(size,-1);
      for(let h=0;h<=size*14;h+=.02){const p=profile(size,h);
        expect(p.opacity).toBeLessThanOrEqual(previous.opacity+1e-12);expect(p.opacity).toBeGreaterThanOrEqual(0);
        expect(p.width).toBeGreaterThanOrEqual(previous.width-1e-12);expect(p.length).toBeGreaterThanOrEqual(previous.length-1e-12);
        expect(previous.opacity-p.opacity).toBeLessThan(.02);previous=p;
      }
      expect(profile(size,size*12).opacity).toBe(0);
    }
  });
  it('matches animal size and unfolded bird wings without affecting ground mammals',()=>{
    const small=profile(.75),large=profile(3);
    expect(large.width/small.width).toBe(4);expect(large.length/small.length).toBe(4);
    expect(profile(2,0,'bird',1).width).toBeGreaterThan(profile(2,0,'bird',0).width*2);
    expect(profile(2,0,'rabbit',1)).toEqual(profile(2,0,'rabbit',0));
    expect(profile(2,0,'snake').length).toBeGreaterThan(profile(2).length);
  });
  it('samples every patch vertex above curved terrain at any heading',()=>{
    const g=api.create(12),height=(x,z)=>x*.24-z*.16+Math.sin(x*.7)*.4+Math.cos(z*.8)*.3;
    for(const heading of [0,.7,Math.PI,5.4])for(const size of [.75,2,4]){
      api.write(g,0,12,-9,heading,profile(size),height);
      const p=g.attributes.position;
      for(let i=0;i<81;i++)expect(p.getY(i)-height(p.getX(i),p.getZ(i))).toBeCloseTo(.035,5);
    }
    g.dispose();
  });
  it('aligns the long footprint with the animal heading',()=>{
    const g=api.create(1),p=g.attributes.position;
    api.write(g,0,0,0,0,profile(),()=>0);
    expect(p.getX(44)).toBeCloseTo(profile().width);expect(p.getZ(76)).toBeCloseTo(profile().length);
    api.write(g,0,0,0,Math.PI/2,profile(),()=>0);
    expect(p.getZ(44)).toBeCloseTo(-profile().width);expect(p.getX(76)).toBeCloseTo(profile().length);
    g.dispose();
  });
  it('keeps the broad takeoff patch above the curved review surface between vertices',()=>{
    const height=(x,z)=>.12*Math.sin(x*1.4)+.05*z+.1*Math.sin(z),g=api.create(1);
    api.write(g,0,0,0,0,profile(1.75,2.7,'bird',1),height);
    const p=g.attributes.position;
    for(let i=0;i<g.index.count;i+=3){let x=0,y=0,z=0;
      for(let j=0;j<3;j++){const v=g.index.getX(i+j);x+=p.getX(v)/3;y+=p.getY(v)/3;z+=p.getZ(v)/3;}
      expect(y-height(x,z)).toBeGreaterThan(.01);
    }
    g.dispose();
  });
  it('updates independent shadow slots without replacing any buffer',()=>{
    const g=api.create(12),buffers=Object.values(g.attributes).map(a=>a.array),id=g.uuid;
    api.write(g,0,2,3,.2,profile(),()=>1);const first=Array.from(g.attributes.position.array.slice(0,243));
    for(let i=0;i<100;i++){api.write(g,1,i*.1,10,.3,profile(1,i*.02),()=>2);api.finish(g,2);}
    expect(Array.from(g.attributes.position.array.slice(0,243))).toEqual(first);
    Object.values(g.attributes).forEach((a,i)=>expect(a.array).toBe(buffers[i]));expect(g.uuid).toBe(id);
    expect(g.attributes.preyContactOpacity.getX(0)).toBe(1);expect(g.attributes.preyContactOpacity.getX(81)).toBeLessThan(1);
    g.dispose();
  });
  it('limits drawing and buffer uploads to active patches and clears the last contact',()=>{
    const g=api.create(12);
    expect(g.drawRange.count).toBe(0);expect(g.attributes.position.count).toBe(972);
    api.finish(g,12);expect(g.drawRange.count).toBe(4608);
    api.finish(g,3);expect(g.drawRange.count).toBe(1152);expect(g.attributes.position.updateRange.count).toBe(729);expect(g.attributes.preyContactOpacity.updateRange.count).toBe(243);
    api.finish(g,0);expect(g.drawRange.count).toBe(0);g.dispose();
  });
  it('keeps the sampled triangles facing upward on uneven terrain',()=>{
    const g=api.create(1);api.write(g,0,3,-2,1.2,profile(4), (x,z)=>Math.sin(x)*.6+z*.2);
    const p=g.attributes.position,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
    for(let i=0;i<g.index.count;i+=3){a.fromBufferAttribute(p,g.index.getX(i));b.fromBufferAttribute(p,g.index.getX(i+1));c.fromBufferAttribute(p,g.index.getX(i+2));expect(b.sub(a).cross(c.sub(a)).y).toBeGreaterThan(0);}
    g.dispose();
  });
});
