import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const pose={active:true,state:'Exploring',x:0,z:0,yaw:0,altitude:.025,distance:0,phase:0,stride:0,moving:0,forage:0,rest:0,crouch:0,pounce:0};
const xyz=(array,index)=>array.slice(index*3,index*3+3);
const delta=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));

describe('species-specific mammal heads and secondary articulation',()=>{
  it('closes both shaped skulls and tapers their muzzles continuously to the calibrated nose positions',()=>{
    for(const [id,nose] of [['foxes',[.672,.610,0]],['rabbits',[.455,.395,0]]]){
      const skin=api.mammalSurface(id,'head'),count=skin.positions.length/3;
      expect(skin.part).toBe('head');expect(skin.normals.length).toBe(count*3);expect(skin.uv.length).toBe(count*2);
      for(const name of ['positions','normals','uv','tints'])expect(skin[name].every(Number.isFinite)).toBe(true);
      expect(skin.indices.every(n=>Number.isInteger(n)&&n>=0&&n<count)).toBe(true);
      for(let vertex=0;vertex<count;vertex++)expect(Math.hypot(...xyz(skin.normals,vertex))).toBeCloseTo(1,10);
      for(let ring=0;ring<=skin.rings;ring++){
        const a=ring*(skin.sides+1),b=a+skin.sides;
        expect(delta(xyz(skin.positions,a),xyz(skin.positions,b))).toBeLessThan(1e-12);
        expect(delta(xyz(skin.normals,a),xyz(skin.normals,b))).toBeLessThan(1e-12);
      }
      const end=skin.rings*(skin.sides+1);for(let side=0;side<=skin.sides;side++)expect(delta(xyz(skin.positions,end+side),nose)).toBeLessThan(1e-12);
      const widthAt=ring=>Math.max(...Array.from({length:skin.sides+1},(_,side)=>Math.abs(skin.positions[(ring*(skin.sides+1)+side)*3+2])));
      expect(widthAt(Math.floor(skin.rings*.85))).toBeLessThan(widthAt(Math.floor(skin.rings*.3))*.5);
      expect(api.mammalSurface(id,'head')).toEqual(skin);
    }
    expect(api.mammalSurface('voles','head')).toBeNull();
  });

  it('builds closed sculpted pinnae with a deep inner cup, thick backing and four rounded rim bands',()=>{
    for(const id of ['foxes','rabbits']){
      const skin=api.mammalSurface(id,'ear'),count=skin.positions.length/3,layer=(skin.rings+1)*(skin.sides+1);
      expect(skin.rings).toBe(24);expect(skin.sides).toBe(20);expect(skin.faceLayer).toBe(layer);expect(skin.bevelBands).toBe(4);
      expect(count).toBe(layer*2+skin.rimVertices*3);expect(count).toBe(1314);expect(skin.indices.length/3).toBe(2624);
      for(const name of ['positions','normals','uv','tints','furRimTints'])expect(skin[name].every(Number.isFinite)).toBe(true);
      let maximumNormalError=0;for(let v=0;v<count;v++)maximumNormalError=Math.max(maximumNormalError,Math.abs(Math.hypot(...xyz(skin.normals,v))-1));expect(maximumNormalError).toBeLessThan(1e-12);
      const middle=(skin.rings/2)*(skin.sides+1),center=xyz(skin.positions,middle+skin.sides/2),rim=xyz(skin.positions,middle),rear=xyz(skin.positions,middle+skin.sides/2+layer);
      expect(rim[0]-center[0]).toBeCloseTo(id==='foxes'?.33:.37,12);expect(center[0]-rear[0]).toBeCloseTo(.105,12);
      expect(skin.tints[middle+skin.sides/2]).toBe(1);expect(skin.tints[middle+skin.sides/2+layer]).toBe(0);expect(skin.furRimTints[middle]).toBeCloseTo(.60,12);
      expect(skin.rimLayers).toHaveLength(5);expect(skin.rimLayers.every(loop=>loop.length===88)).toBe(true);
      const edges=new Map();for(let f=0;f<skin.indices.length;f+=3){const face=skin.indices.slice(f,f+3);for(let e=0;e<3;e++){const a=face[e],b=face[(e+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`;edges.set(key,(edges.get(key)||0)+1);}}
      expect([...edges.values()].every(n=>n===2)).toBe(true);expect(count-edges.size+skin.indices.length/3).toBe(2);
    }
  });

  it('chews only a grazing rabbit and varies its lower jaw without changing planted-paw solutions',()=>{
    const still=api.mammalArticulation('rabbits',pose,false),values=[];
    expect(still.jawOpen).toBe(0);expect(still.jawSide).toBe(0);
    for(let sample=0;sample<=100;sample++){
      const p={...pose,state:'Grazing',forage:.55+sample*.002},art=api.mammalArticulation('rabbits',p,false);values.push(art.jawOpen);
      expect(art.jawOpen).toBeGreaterThan(0);expect(art.jawOpen).toBeLessThanOrEqual(.047);expect(Math.abs(art.jawSide)).toBeLessThanOrEqual(.022);
      for(const hind of [false,true])for(const side of [-1,1])expect(api.rabbitFooting(p,0,hind,side)).toEqual(api.rabbitFooting({...p,forage:0},0,hind,side));
      for(const id of ['rabbits','foxes']){const inactive=api.mammalArticulation(id,{...p,state:'Checking last location'},false);expect(inactive.jawOpen).toBeCloseTo(0,12);expect(inactive.jawSide).toBeCloseTo(0,12);}
    }
    expect(Math.max(...values)-Math.min(...values)).toBeGreaterThan(.015);
  });

  it('makes restrained recorded blinks deterministic, smoothly settles eyelids and freezes every secondary joint for reduced motion',()=>{
    let min=1,max=0,maxJump=0,previous=null;
    for(let sample=0;sample<=1000;sample++){
      const p={...pose,distance:sample*.01,phase:.7,forage:.3},a=api.mammalArticulation('foxes',p,false);min=Math.min(min,a.eyeOpen);max=Math.max(max,a.eyeOpen);
      expect(a.eyeOpen).toBeGreaterThanOrEqual(.08);expect(a.eyeOpen).toBeLessThanOrEqual(1);expect(a).toEqual(api.mammalArticulation('foxes',p,false));
      if(previous)maxJump=Math.max(maxJump,Math.abs(a.eyeOpen-previous.eyeOpen));previous=a;
    }
    expect(min).toBeLessThan(.10);expect(max).toBeGreaterThan(.99);expect(maxJump).toBeLessThan(.16);
    // Exercise settling while the blink is fully closed; an open-eye sample
    // would hide a discontinuous rest-state blink-strength switch.
    const blinkPose={...pose,distance:(2*Math.PI-2.17)/(.17*28)};
    const left=api.mammalArticulation('foxes',{...blinkPose,rest:.5-1e-7},false),right=api.mammalArticulation('foxes',{...blinkPose,rest:.5+1e-7},false);
    expect(left.eyeOpen).toBeCloseTo(.09,7);expect(right.eyeOpen).toBeCloseTo(.09,7);expect(Math.abs(left.eyeOpen-right.eyeOpen)).toBeLessThan(1e-6);
    let settled=api.mammalArticulation('foxes',{...blinkPose,rest:0},false).eyeOpen,maxSettleJump=0;
    for(let step=1;step<=100;step++){const next=api.mammalArticulation('foxes',{...blinkPose,rest:step/100},false).eyeOpen;maxSettleJump=Math.max(maxSettleJump,Math.abs(next-settled));settled=next;}
    expect(maxSettleJump).toBeLessThan(.001);
    for(const id of ['foxes','rabbits']){
      const reduced=api.mammalArticulation(id,{...pose,state:'Grazing',forage:1,distance:999,rest:1},true);expect(reduced.eyeOpen).toBe(1);expect(reduced.jawOpen).toBe(0);expect(reduced.jawSide).toBe(0);
      expect(Object.values(api.mammalArticulation(id,{phase:NaN,forage:Infinity},false)).filter(n=>typeof n==='number').every(Number.isFinite)).toBe(true);
    }
  });

  it('keeps stationary blinking and grazing jaws on the recorded activity clock while all locomotion and terrain contacts stay fixed',()=>{
    const resting={...pose,state:'Resting',rest:1,distance:.35,phase:.6,activity:0};
    const grazing={...pose,state:'Grazing',forage:.75,distance:.35,phase:.6,activity:0};
    const movement=art=>{const {eyeOpen,jawOpen,jawSide,ribScaleY,ribScaleZ,ribRoll,...fixed}=art;return fixed;};
    const neutralFox=movement(api.mammalArticulation('foxes',resting,false)),neutralRabbit=movement(api.mammalArticulation('rabbits',grazing,false));
    let minEye=1,maxEye=0,minJaw=1,maxJaw=0;
    for(let sample=0;sample<=200;sample++){
      const activity=sample*.05,foxPose={...resting,activity},rabbitPose={...grazing,activity};
      const fox=api.mammalArticulation('foxes',foxPose,false),rabbit=api.mammalArticulation('rabbits',rabbitPose,false);
      minEye=Math.min(minEye,fox.eyeOpen);maxEye=Math.max(maxEye,fox.eyeOpen);minJaw=Math.min(minJaw,rabbit.jawOpen);maxJaw=Math.max(maxJaw,rabbit.jawOpen);
      expect(movement(fox)).toEqual(neutralFox);expect(movement(rabbit)).toEqual(neutralRabbit);
      for(const hind of [false,true])for(const side of [-1,1]){
        expect(api.foxFooting(foxPose,0,hind,side)).toEqual(api.foxFooting(resting,0,hind,side));
        expect(api.rabbitFooting(rabbitPose,0,hind,side)).toEqual(api.rabbitFooting(grazing,0,hind,side));
      }
    }
    expect(minEye).toBeLessThan(.14);expect(maxEye).toBeGreaterThan(.8);expect(maxJaw-minJaw).toBeGreaterThan(.02);
    const midpoint=api.blendPose({...grazing,activity:2},{...grazing,activity:4},.5,'rabbits');
    expect(midpoint.activity).toBe(3);expect(api.mammalArticulation('rabbits',midpoint,false)).toEqual(api.mammalArticulation('rabbits',{...grazing,activity:3},false));
    for(const [id,fixed] of [['foxes',resting],['rabbits',grazing]]){
      const first=api.mammalArticulation(id,{...fixed,activity:.65},false);
      const otherDistance=api.mammalArticulation(id,{...fixed,activity:.65,distance:20},false);
      expect(otherDistance.eyeOpen).toBe(first.eyeOpen);expect(otherDistance.jawOpen).toBe(first.jawOpen);expect(otherDistance.jawSide).toBe(first.jawSide);
      api.mammalArticulation(id,{...fixed,activity:3.1},false);
      expect(api.mammalArticulation(id,{...fixed,activity:.65},false)).toEqual(first);
      expect(api.mammalArticulation(id,{...fixed,activity:10},true)).toEqual(api.mammalArticulation(id,{...fixed,activity:0},true));
    }
  });
});
