import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool(process.env.ECOLOGY_TOOL_SOURCE||'stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const paint=(id,part,p=[0,.4,0],normalY=0,tint=0)=>api.mammalCoatColor(id,part,...p,normalY,tint);
const luminance=rgb=>rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
const linear=channel=>{const v=channel/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};

describe('bounded object-space species pigments on unchanged mammal skins',()=>{
  it('gives the fox a distinct russet upper coat, unchanged cream pigment and charcoal stockings',()=>{
    const russet=paint('foxes','head'),cream=paint('foxes','head',[.5,.6,0],0,1),sock=paint('foxes','forelimb',[0,-.36,0],0,1);
    expect(russet).toEqual([182,91,44].map(linear));expect(russet[0]/russet[1]).toBeGreaterThan(4);expect(russet[1]/russet[2]).toBeGreaterThan(3);
    for(let axis=0;axis<3;axis++){expect(cream[axis]).toBeCloseTo(linear([233,223,201][axis]),14);expect(sock[axis]).toBeCloseTo(linear([40,34,31][axis]),14);}expect(luminance(sock)).toBeLessThan(luminance(russet)*.15);expect(luminance(cream)).toBeGreaterThan(luminance(russet)*3);
    expect(paint('foxes','hindlimb',[0,-.36,0],0,1)).toEqual(sock);
  });

  it('keeps rabbit cream underparts lighter than its warm grizzled dorsal coat, with restrained smooth mottling',()=>{
    const cream=paint('rabbits','torso',[0,.2,0],-1,.52),back=[];
    for(let k=0;k<=100;k++)back.push(paint('rabbits','torso',[-.25+k*.004,.5,.1],.9,0));
    const light=back.map(luminance);expect(Math.max(...light)-Math.min(...light)).toBeGreaterThan(.009);expect(Math.max(...light)-Math.min(...light)).toBeLessThan(.045);expect(luminance(cream)).toBeGreaterThan(Math.max(...light)*2.5);
    expect(back.every(rgb=>rgb[0]>rgb[1]&&rgb[1]>rgb[2])).toBe(true);
    for(let k=1;k<back.length;k++)expect(Math.max(...back[k].map((v,axis)=>Math.abs(v-back[k-1][axis])))).toBeLessThan(.01);
  });

  it('paints all original loft seams continuously without mutating positions normals UVs or tint masks',()=>{
    for(const id of ['foxes','rabbits'])for(const part of ['torso','head','neck','forelimb','hindlimb']){
      const skin=api.mammalSurface(id,part),before=JSON.stringify(skin),colours=[];
      for(let k=0;k<skin.positions.length/3;k++){const rgb=paint(id,part,skin.positions.slice(k*3,k*3+3),skin.normals[k*3+1],skin.tints[k]);expect(rgb).toHaveLength(3);expect(rgb.every(v=>Number.isFinite(v)&&v>=0&&v<=1)).toBe(true);colours.push(rgb);}
      for(let ring=0;ring<=skin.rings;ring++){const a=ring*(skin.sides+1),b=a+skin.sides;for(let axis=0;axis<3;axis++)expect(colours[a][axis]).toBeCloseTo(colours[b][axis],11);}
      expect(JSON.stringify(api.mammalSurface(id,part))).toBe(before);
    }
  });

  it('leaves ear and tail paint contracts out of scope and returns fresh bounded colours for valid inputs',()=>{
    for(const part of ['ear','tail','jaw',undefined])expect(paint('foxes',part)).toBeNull();expect(paint('owls','head')).toBeNull();
    for(const [p,n,t]of [[[NaN,0,0],0,0],[[0,0,0],Infinity,0],[[0,0,0],0,-.1],[[0,0,0],0,1.1]])expect(paint('foxes','head',p,n,t)).toBeNull();
    const first=paint('rabbits','head',[.3,.4,.1],.2,.1),copy=first.slice();first[0]=999;expect(paint('rabbits','head',[.3,.4,.1],.2,.1)).toEqual(copy);
    const a=paint('foxes','torso',[.1,.5,.05],.7,.2),b=paint('foxes','torso',[.1+1e-7,.5,.05],.7,.2);expect(Math.max(...a.map((v,k)=>Math.abs(v-b[k])))).toBeLessThan(1e-6);
  });

  it('softens only the rabbit neck overlap toward the actual skull triangle and keeps its attachment and surface-distance gates continuous',()=>{
    const neck=api.mammalSurface('rabbits','neck'),head=api.mammalSurface('rabbits','head'),point=neck.positions.slice(480*3,480*3+3),normal=neck.normals[480*3+1],tint=neck.tints[480],site=api.skullSite('rabbits',point[0],point[1],1),skull=[0,0,0];
    for(let corner=0;corner<3;corner++){const vertex=head.indices[site.triangle*3+corner],rgb=paint('rabbits','head',head.positions.slice(vertex*3,vertex*3+3),head.normals[vertex*3+1],head.tints[vertex]);for(let axis=0;axis<3;axis++)skull[axis]+=Math.fround(rgb[axis])*site.barycentric[corner];}
    const original=paint('rabbits','torso',point,normal,tint),joined=paint('rabbits','neck',point,normal,tint),gap=rgb=>Math.hypot(...rgb.map((v,k)=>v-skull[k]));expect(gap(original)-gap(joined)).toBeGreaterThan(.18);expect(joined.every((v,k)=>v>=Math.min(original[k],skull[k])-1e-12&&v<=Math.max(original[k],skull[k])+1e-12)).toBe(true);
    for(const p of [[.10,.4,.05],[.15,.4,.05],[.20,1,.05],[.20,.4,.5]])expect(paint('rabbits','neck',p,.3,.1)).toEqual(paint('rabbits','torso',p,.3,.1));
    for(const p of [[.18,.42,.08],[.22,.4,.09]])expect(paint('foxes','neck',p,.3,.1)).toEqual(paint('foxes','torso',p,.3,.1));
    const distanceSite=api.skullSite('rabbits',.20,.40,1);for(const edge of [.006,.036]){const a=paint('rabbits','neck',[.20,.40,distanceSite.position[2]+edge-1e-7],.3,.1),b=paint('rabbits','neck',[.20,.40,distanceSite.position[2]+edge+1e-7],.3,.1);expect(Math.hypot(...a.map((v,k)=>v-b[k]))).toBeLessThan(1e-5);}
    for(const edge of [.15,.23]){const a=paint('rabbits','neck',[edge-1e-7,.4,.08],.3,.1),b=paint('rabbits','neck',[edge+1e-7,.4,.08],.3,.1);expect(Math.hypot(...a.map((v,k)=>v-b[k]))).toBeLessThan(1e-5);}
    const colours=neck.tints.map((t,k)=>paint('rabbits','neck',neck.positions.slice(k*3,k*3+3),neck.normals[k*3+1],t).map(Math.fround));let maxEdge=0;
    for(let offset=0;offset<neck.indices.length;offset+=3)for(let edge=0;edge<3;edge++){const a=colours[neck.indices[offset+edge]],b=colours[neck.indices[offset+(edge+1)%3]];maxEdge=Math.max(maxEdge,Math.hypot(...a.map((v,k)=>v-b[k])));}expect(maxEdge).toBeLessThan(.40);
  });

  it('does not change complete population, timeline, articulation, paw or encounter evidence when painting',()=>{
    const config=api.normalize({event:'none',cover:10,initial:{rabbits:90,foxes:6},enabled:{voles:false,owls:false,caterpillars:false,bluetits:false}}),pair=api.compare(config),frames=api.behaviorTimeline(config,pair.baseline),before=JSON.stringify({pair,frames}),encounters=JSON.stringify(api.encounters(frames,config));
    for(let step=0;step<frames.length;step+=23)for(const id of ['foxes','rabbits']){const pose=frames[step][id][0],art=api.mammalArticulation(id,pose,false),feet=[-1,1].flatMap(side=>[false,true].map(hind=>id==='foxes'?api.foxFooting(pose,0,hind,side):api.rabbitFooting(pose,0,hind,side)));for(const part of ['torso','head','neck','forelimb','hindlimb'])paint(id,part,[.1,.4,.05],.8,.2);expect(api.mammalArticulation(id,pose,false)).toEqual(art);expect([-1,1].flatMap(side=>[false,true].map(hind=>id==='foxes'?api.foxFooting(pose,0,hind,side):api.rabbitFooting(pose,0,hind,side)))).toEqual(feet);}
    expect(JSON.stringify({pair,frames})).toBe(before);expect(JSON.stringify(api.encounters(frames,config))).toBe(encounters);expect(api.compare(config)).toEqual(pair);expect(api.behaviorTimeline(config,pair.baseline)).toEqual(frames);
  });
});
