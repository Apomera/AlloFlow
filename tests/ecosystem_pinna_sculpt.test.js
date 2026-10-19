import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const point=(values,index)=>values.slice(index*3,index*3+3);
const dot=(a,b)=>a.reduce((sum,n,j)=>sum+n*b[j],0);

describe('sculpted continuous pinnae',()=>{
  it('gives every face positive area and outward smoothed normals, including the narrow closed tip and rounded rim',()=>{
    for(const id of ['foxes','rabbits']){
      const skin=api.mammalSurface(id,'ear'),p=skin.positions,n=skin.normals,count=p.length/3;
      expect(count).toBe(1314);expect(skin.indices.length/3).toBe(2624);expect(n.length).toBe(count*3);expect(skin.uv.length).toBe(count*2);
      for(const field of ['positions','normals','uv','tints','furRimTints'])expect(skin[field].every(Number.isFinite)).toBe(true);
      expect(skin.indices.every(index=>Number.isInteger(index)&&index>=0&&index<count)).toBe(true);
      let minimumArea=Infinity,minimumFacing=Infinity,maximumNormalError=0,volume=0;
      for(let vertex=0;vertex<count;vertex++)maximumNormalError=Math.max(maximumNormalError,Math.abs(Math.hypot(...point(n,vertex))-1));
      for(let offset=0;offset<skin.indices.length;offset+=3){
        const [a,b,c]=skin.indices.slice(offset,offset+3),pa=point(p,a),pb=point(p,b),pc=point(p,c),u=pb.map((v,j)=>v-pa[j]),v=pc.map((x,j)=>x-pa[j]);
        const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],normal=point(n,a).map((x,j)=>x+n[b*3+j]+n[c*3+j]);
        minimumArea=Math.min(minimumArea,Math.hypot(...cross));minimumFacing=Math.min(minimumFacing,dot(cross,normal));
        volume+=(pa[0]*(pb[1]*pc[2]-pb[2]*pc[1])+pa[1]*(pb[2]*pc[0]-pb[0]*pc[2])+pa[2]*(pb[0]*pc[1]-pb[1]*pc[0]))/6;
      }
      expect(maximumNormalError).toBeLessThan(1e-12);expect(minimumArea).toBeGreaterThan(5e-6);expect(minimumFacing).toBeGreaterThan(1e-5);expect(volume).toBeGreaterThan(.03);expect(volume).toBeLessThan(.04);
    }
  });

  it('keeps a genuinely recessed concha and a thicker curved backing inside the unchanged mesh scales',()=>{
    for(const [id,height,sideDepth,scaleX,scaleY,scaleZ] of [['foxes',.91,.33,.12,.215,.215],['rabbits',.90,.37,.13,.355,.18]]){
      const skin=api.mammalSurface(id,'ear'),middle=12*21,center=point(skin.positions,middle+10),edge=point(skin.positions,middle),back=point(skin.positions,middle+10+skin.faceLayer);
      expect(skin.height).toBe(height);expect(center[1]).toBe(height/2);expect(edge[0]-center[0]).toBeCloseTo(sideDepth,12);expect(center[0]-back[0]).toBeCloseTo(.105,12);
      expect((center[0]-back[0])*scaleX).toBeGreaterThan(.012);expect((edge[0]-center[0])*scaleX).toBeGreaterThan(.039);
      expect(skin.tints[middle+10]).toBe(1);expect(skin.tints[middle+10+skin.faceLayer]).toBe(0);
      expect(skin.furRimTints[middle]).toBeCloseTo(.60,12);expect(skin.furRimTints[middle+10]).toBe(0);
      const ys=skin.positions.filter((_,i)=>i%3===1),zs=skin.positions.filter((_,i)=>i%3===2);
      expect(Math.min(...ys)).toBe(0);expect(Math.max(...ys)).toBeCloseTo(height+.011,12);
      expect(Math.max(...ys)*scaleY).toBeLessThan(id==='foxes'?.20:.325);
      expect((Math.max(...zs)-Math.min(...zs))*scaleZ).toBeLessThan(.20);
    }
  });

  it('bridges front and back with three actual curved bevel loops rather than a painted flat edge',()=>{
    for(const id of ['foxes','rabbits']){
      const skin=api.mammalSurface(id,'ear');
      expect(skin.rimLayers).toHaveLength(5);expect(skin.rim).toHaveLength(88);expect(skin.faceLayer).toBe(525);expect(skin.bevelBands).toBe(4);
      const middleLeft=skin.rim.indexOf(12*21),front=point(skin.positions,skin.rimLayers[0][middleLeft]),back=point(skin.positions,skin.rimLayers[4][middleLeft]);
      for(let band=1;band<4;band++){
        const vertex=skin.rimLayers[band][middleLeft],p=point(skin.positions,vertex),angle=band*Math.PI/4;
        expect(p[0]).toBeCloseTo((front[0]+back[0])/2+(front[0]-back[0])/2*Math.cos(angle),12);
        expect(p[2]).toBeLessThan(front[2]);expect(p[0]).toBeGreaterThan(back[0]);expect(p[0]).toBeLessThan(front[0]);
        expect(skin.tints[vertex]).toBe(0);expect(skin.furRimTints[vertex]).toBeGreaterThan(.68);
      }
      const tipStart=24*21,tipLeft=point(skin.positions,tipStart),tipRight=point(skin.positions,tipStart+20);
      expect(tipRight[2]-tipLeft[2]).toBeGreaterThan(.015);expect(tipRight[2]-tipLeft[2]).toBeLessThan(.021);
      expect(tipRight[1]).toBe(skin.height);
    }
  });

  it('is a closed orientable surface with paired opposite edges and returns detached deterministic geometry',()=>{
    for(const id of ['foxes','rabbits']){
      const skin=api.mammalSurface(id,'ear'),edges=new Map();
      for(let offset=0;offset<skin.indices.length;offset+=3){const face=skin.indices.slice(offset,offset+3);for(let e=0;e<3;e++){
        const a=face[e],b=face[(e+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`,entry=edges.get(key)||{count:0,direction:0};entry.count++;entry.direction+=a<b?1:-1;edges.set(key,entry);
      }}
      expect([...edges.values()].every(edge=>edge.count===2&&edge.direction===0)).toBe(true);
      expect(skin.positions.length/3-edges.size+skin.indices.length/3).toBe(2);
      for(const name of ['tints','furRimTints'])expect(skin[name].every(value=>value>=0&&value<=1)).toBe(true);
      expect(api.mammalSurface(id,'ear')).toEqual(skin);skin.positions[0]=999;expect(api.mammalSurface(id,'ear').positions[0]).not.toBe(999);
    }
    expect(api.mammalSurface('voles','ear')).toBeNull();expect(api.mammalSurface('owls','ear')).toBeNull();
  });
});
