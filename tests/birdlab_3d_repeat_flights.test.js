import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe,it,expect} from 'vitest';

const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/birdlab_3d_engine.js','utf8');
const repeatSource=source.slice(source.indexOf('  var residentRepeatWindows='),source.indexOf('  function applyHeightFog('));
const advance=Function('DURATION',repeatSource+';return advanceResidentObservation;')(44);
function runtime() {
  const frames=new Map(),worldTimes=[],birdTimes=[];let serial=0,stamp=0,disposed=0;
  class Renderer {
    constructor(){this.shadowMap={};this.info={render:{calls:1,triangles:1}};}
    setPixelRatio(){}setSize(){}render(){}dispose(){disposed++;}forceContextLoss(){}
  }
  function model(){const root=new THREE.Group();return {root,footOffsetY:0,update(pose){birdTimes.push(pose.elapsedTime);},dispose(){if(root.parent)root.parent.remove(root);}};}
  const local={THREE:{...THREE,WebGLRenderer:Renderer},innerWidth:900,devicePixelRatio:1,
    requestAnimationFrame(callback){const id=++serial;frames.set(id,callback);return id;},cancelAnimationFrame(id){frames.delete(id);},
    addEventListener(){},removeEventListener(){},
    AvianWoodlandBirds:{create(){},supports:id=>id==='mourningDove'||id==='grouse'},
    BirdLab3DBird:{create:model},
    BirdLab3DHabitat:{create(){return {root:new THREE.Group(),perch:new THREE.Vector3(0,3,0),groundHeight:()=>0,update(){},dispose(){}};}},
    BirdLab3DWildlife:{create(){return {update(t){worldTimes.push(t);},snapshot(){return [{id:'mourningDove',heading:0},{id:'grouse',heading:0}];},getFocus(id,out){return out.set(0,.15,0);},dispose(){}};}}
  };
  Function('window',source)(local);
  const canvas=document.createElement('canvas');canvas.getBoundingClientRect=()=>({width:800,height:500});document.body.appendChild(canvas);
  const controller=local.BirdLab3D.mount(canvas,{reducedMotion:true,quality:'low'});
  return {controller,frames,worldTimes,birdTimes,
    step(seconds){stamp+=seconds*1000;const scheduled=[...frames.values()];frames.clear();scheduled.forEach(callback=>callback(stamp));},
    dispose(){controller.dispose();canvas.remove();},get disposed(){return disposed;}};
}

describe('BirdLab repeated resident flights',()=>{
  it.each(['mourningDove','grouse'])('splits rest-time acceleration at every protected %s movement boundary and across the loop',id=>{
    const start=id==='grouse'?17.58:11.58,end=id==='grouse'?19.52:13.82;
    expect(advance(start-.06,.05,id)).toBeCloseTo(start+.04,10);
    expect(advance(start,.1,id)).toBeCloseTo(start+.1,10);
    expect(advance(end-.05,.06,id)).toBeCloseTo(end+.06,10);
    expect(advance(43.9,.1,id)).toBeCloseTo(44.5,10);
    expect(advance(2,.1,'orbit')).toBeCloseTo(2.1,10);
    const direct=advance(0,30,id);let stepped=0;
    for(let tick=0;tick<3000;tick++)stepped=advance(stepped,.01,id);
    expect(stepped).toBeCloseTo(direct,8);
    expect(direct).toBeGreaterThan(44);
  });

  it('accelerates only stationary holds in the actual selected-bird observation',()=>{
    const local={},scene=new THREE.Scene();
    for(const file of ['avian_woodland_birds.js','birdlab_3d_wildlife.js'])Function('window',readFileSync('stem_lab/'+file,'utf8'))(local);
    const wildlife=local.BirdLab3DWildlife.create(THREE,scene,{quality:'low'});
    try{
      for(const id of ['mourningDove','grouse']){
        const root=scene.getObjectByName('woodland-'+id),head=root.getObjectByName('woodland-head');
        for(let tick=0;tick<880;tick++){
          const t=tick*.05;if(advance(t,.0001,id)-t<.00059)continue;
          wildlife.update(t);const position=root.position.clone(),rotation=root.quaternion.clone(),headPosition=head.position.clone(),headRotation=head.quaternion.clone();
          wildlife.update(t+.0001);
          expect(root.position.distanceTo(position),id+' motion at '+t).toBeLessThan(1e-9);
          expect(1-Math.abs(root.quaternion.dot(rotation)),id+' turn at '+t).toBeLessThan(1e-10);
          expect(head.position.distanceTo(headPosition),id+' feeding at '+t).toBeLessThan(1e-8);
          expect(1-Math.abs(head.quaternion.dot(headRotation)),id+' glance at '+t).toBeLessThan(1e-10);
        }
      }
    }finally{wildlife.dispose();}
  });

  it('uses the single renderer clock while honoring pause, speed, seeking, camera changes and teardown',()=>{
    const test=runtime(),c=test.controller;
    try{
      expect(c.getState().repeatFlights).toBe(false);c.setRepeatFlights(true);expect(c.getState().repeatFlights).toBe(false);
      c.setCamera('mourningDove');c.setSpeed(.25);c.setRepeatFlights(true);
      expect(c.getState()).toMatchObject({repeatFlights:true,paused:true,speed:.25,time:11.58});
      test.step(.1);test.step(.1);expect(c.getState().time).toBe(11.58);
      c.setPaused(false);test.step(.1);const before=c.getState().time;test.step(.1);
      expect(c.getState().time-before).toBeCloseTo(.025,10);expect(test.frames.size).toBe(1);
      c.setPaused(true);test.step(.1);const pausedTime=c.getState().time;test.step(.1);expect(c.getState().time).toBe(pausedTime);
      c.seek(12.7);expect(c.getState()).toMatchObject({repeatFlights:false,paused:true,time:12.7,speed:.25});
      c.setRepeatFlights(true);c.setCamera('grouse');expect(c.getState().repeatFlights).toBe(false);
      c.setRepeatFlights(true);expect(c.getState().time).toBe(17.58);
      c.restart();expect(c.getState()).toMatchObject({repeatFlights:true,time:17.58});
      c.setCamera('follow');expect(c.getState().repeatFlights).toBe(false);
      c.setPaused(false);test.step(.1);const hawk=c.getState().time;test.step(.1);expect(c.getState().time-hawk).toBeCloseTo(.025,10);
      c.setCamera('grouse');c.setRepeatFlights(true);c.resetView();expect(c.getState()).toMatchObject({camera:'orbit',repeatFlights:false});
      expect(test.worldTimes).toEqual(test.birdTimes);
    }finally{test.dispose();}
    expect(test.frames.size).toBe(0);expect(test.disposed).toBe(1);
    const rendered=test.worldTimes.length;test.step(1);expect(test.worldTimes).toHaveLength(rendered);
  });
});
