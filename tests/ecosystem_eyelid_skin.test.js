import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const xyz=(a,i)=>Array.from(a.slice(i*3,i*3+3));
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const eyeLocal=(id,p,side)=>{const mount=api.eyeMount(id),[cx,cy,cz]=mount.center,a=mount.angle,x=p[0]-cx,y=p[1]-cy;return [Math.cos(a)*x+Math.sin(a)*y,-Math.sin(a)*x+Math.cos(a)*y,side*(p[2]-side*cz)];};

describe('fur eyelids over unchanged mammal eyes',()=>{
  it('builds finite indexed outward skins for both sockets throughout a blink',()=>{
    for(const id of ['foxes','rabbits'])for(const opening of [0,.1,.5,1]){
      const skin=api.mammalEyelids(id,opening),count=skin.positions.length/3;
      expect(count).toBe(420);expect(skin.indices.length/3).toBe(640);
      for(const key of ['positions','normals','uv','tints'])expect(skin[key].every(Number.isFinite)).toBe(true);
      expect(skin.indices.every(i=>Number.isInteger(i)&&i>=0&&i<count)).toBe(true);
      for(let i=0;i<count;i++)expect(Math.hypot(...xyz(skin.normals,i))).toBeCloseTo(1,10);
      let valid=0;
      for(let f=0;f<skin.indices.length;f+=3){const [a,b,c]=skin.indices.slice(f,f+3),p=xyz(skin.positions,a),q=xyz(skin.positions,b),r=xyz(skin.positions,c),u=q.map((v,i)=>v-p[i]),v=r.map((v,i)=>v-p[i]),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];if(Math.hypot(...cross)<1e-13)continue;const n=xyz(skin.normals,a).map((v,i)=>v+skin.normals[b*3+i]+skin.normals[c*3+i]);expect(cross.reduce((sum,v,i)=>sum+v*n[i],0)).toBeGreaterThan(0);valid++;}
      expect(valid).toBeGreaterThan(500);
    }
  });

  it('keeps each outer fur rim fixed and closes the aperture rather than shrinking the eyeball space',()=>{
    for(const id of ['foxes','rabbits']){
      const open=api.mammalEyelids(id,1),closed=api.mammalEyelids(id,0),half=105;
      for(let part=0;part<4;part++){
        const side=part<2?-1:1;
        for(let col=0;col<=20;col++)expect(xyz(closed.positions,part*half+4*21+col)).toEqual(xyz(open.positions,part*half+4*21+col));
        for(let col=0;col<=20;col++){const local=eyeLocal(id,xyz(closed.positions,part*half+col),side);expect(Math.abs(local[1])).toBeLessThan(1e-15);}
        const top=eyeLocal(id,xyz(open.positions,part*half+10),side),shut=eyeLocal(id,xyz(closed.positions,part*half+10),side);
        expect(Math.abs(top[1])).toBeCloseTo(id==='foxes'?.015:.025,12);expect(shut[2]).toBeGreaterThan(id==='foxes'?.021:.017);
      }
    }
  });

  it('moves continuously and symmetrically while upper and lower lids meet without a gap',()=>{
    for(const id of ['foxes','rabbits']){
      let previous=api.mammalEyelids(id,0),maximum=0;
      for(let step=1;step<=100;step++){const skin=api.mammalEyelids(id,step/100);for(let i=0;i<420;i++)maximum=Math.max(maximum,distance(xyz(skin.positions,i),xyz(previous.positions,i)));previous=skin;}
      expect(maximum).toBeLessThan(.003);
      const closed=api.mammalEyelids(id,0);
      for(let eye=0;eye<2;eye++)for(let col=0;col<=20;col++)expect(distance(xyz(closed.positions,eye*210+col),xyz(closed.positions,eye*210+105+20-col))).toBeLessThan(1e-15);
    }
  });

  it('reuses bounded geometry buffers and reconstructs every lid coordinate exactly on rewind',()=>{
    for(const id of ['foxes','rabbits']){
      const a=api.mammalEyelids(id,.23),b=api.mammalEyelids(id,.81),buffer=new Float32Array(1267).fill(17);
      expect(api.mammalEyelids(id,.23,buffer).positions).toBe(buffer);expect(Array.from(buffer.slice(1260))).toEqual(Array(7).fill(17));
      api.mammalEyelids(id,.81,buffer);api.mammalEyelids(id,.23,buffer);
      for(let i=0;i<a.positions.length;i++)expect(buffer[i]).toBeCloseTo(a.positions[i],7);
      expect(api.mammalEyelids(id,.81)).toEqual(b);expect(api.mammalEyelids(id,.23)).toEqual(a);
    }
    expect(api.mammalEyelids('owls',.5)).toBeNull();
  });
});
