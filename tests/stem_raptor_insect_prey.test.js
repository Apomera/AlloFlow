import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name){const start=source.indexOf('function '+name+'(');if(start<0)throw Error(name);let end=source.indexOf('{',start),depth=1;while(depth){end++;if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const names=['preyKindFor','mergeGroundPreyParts','createInsectWingGeometry','buildInsectPreyParts','advanceInsectFlight','applyInsectFlight','buildPreyVisual','preyReactsToApproach'];
const api=Function('THREE',names.map(body).join('\n')+';return {build:buildPreyVisual,advance:advanceInsectFlight,apply:applyInsectFlight,reacts:preyReactsToApproach};')(THREE);
const ids=['cicada','dragonfly','largeInsect'];
const build=(id='dragonfly',size=.75)=>api.build({id,color:0x84cc16},size);
function dispose(m){const resources=new Set();m.root.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});resources.forEach(o=>o.dispose());}
function pose(m,speed,height,dt=1/60,reduced=false,bank=0){api.advance(m.insect,speed,5,height,dt,reduced,.7);api.apply(m,bank);m.root.position.y+=m.insect.size*.156+height;m.root.updateMatrixWorld(true);}
function lowest(m){let min=Infinity;const v=new THREE.Vector3();m.root.traverse(o=>{if(o.geometry)for(let i=0;i<o.geometry.attributes.position.count;i++){v.fromBufferAttribute(o.geometry.attributes.position,i).applyMatrix4(o.matrixWorld);min=Math.min(min,v.y);}});return min;}

describe('Insect prey detail and flight',()=>{
  it('builds three distinct insects with four hinged wings and two shared materials',()=>{
    const signatures=[];for(const id of ids){const m=build(id);expect(m.root.children).toHaveLength(5);expect(m.wings).toHaveLength(4);expect(new Set(m.root.children.map(o=>o.material)).size).toBe(2);
      expect(m.wings.map(w=>[w.userData.side,w.userData.hind])).toEqual([[-1,false],[1,false],[-1,true],[1,true]]);
      expect(m.wings.every(w=>w.material===m.wings[0].material&&w.material.transparent&&!w.material.depthWrite&&!w.material.map)).toBe(true);
      signatures.push(JSON.stringify(Array.from(m.body.geometry.attributes.color.array)));dispose(m);
    }expect(new Set(signatures).size).toBe(3);
  });
  it('uses tapered membrane outlines with integral veins and valid front-facing triangles',()=>{
    for(const id of ids){const m=build(id);for(const wing of m.wings){const g=wing.geometry,p=g.attributes.position;expect(g.attributes.color.count).toBe(p.count);expect(p.count).toBe(247);expect(g.index.count/3).toBe(176);
      // The first 55 vertices form the membrane; its tip is much narrower than its center.
      expect(Math.abs(p.getZ(54)-p.getZ(50))).toBeLessThan(Math.abs(p.getZ(29)-p.getZ(25))*.2);
      const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();for(let i=0;i<240;i+=3){a.fromBufferAttribute(p,g.index.getX(i));b.fromBufferAttribute(p,g.index.getX(i+1));c.fromBufferAttribute(p,g.index.getX(i+2));expect(b.sub(a).cross(c.sub(a)).y).toBeGreaterThan(0);}
    }dispose(m);}
  });
  it('rests with its feet and wing membranes above level ground',()=>{
    for(const id of ids)for(const size of [.75,1.5,3]){const m=build(id,size);pose(m,0,0);expect(lowest(m)).toBeGreaterThan(-.002*size);expect(lowest(m)).toBeLessThan(.015*size);expect(m.insect.amplitude).toBe(0);expect(m.insect.bob).toBe(0);if(id==='cicada')expect(m.insect.sweep).toBeCloseTo(.98,9);dispose(m);}
  });
  it('keeps the wing roots fixed while the forewings and hindwings flap out of phase',()=>{
    const m=build(),roots=m.wings.map(w=>w.position.clone());for(let i=0;i<60;i++)pose(m,5,1);
    expect(Math.abs(m.insect.foreAngle-m.insect.hindAngle)).toBeGreaterThan(.01);m.wings.forEach((w,i)=>expect(w.position.equals(roots[i])).toBe(true));expect(m.wings[0].rotation.z).toBe(-m.wings[1].rotation.z);expect(m.wings[2].rotation.z).toBe(-m.wings[3].rotation.z);dispose(m);
  });
  it('eases smoothly through takeoff and preserves phase when movement speed changes',()=>{
    const m=build('cicada');pose(m,0,0,1);const phase=m.insect.phase;pose(m,5,1,1/60);
    const delta=Math.atan2(Math.sin(m.insect.phase-phase),Math.cos(m.insect.phase-phase));expect(delta).toBeGreaterThan(.29);expect(delta).toBeLessThan(.32);expect(m.insect.amplitude).toBeLessThan(.06);expect(m.insect.sweep).toBeGreaterThan(.8);
    for(let i=0;i<120;i++)pose(m,5,1);expect(m.insect.sweep).toBeLessThan(.0001);expect(m.insect.amplitude).toBeCloseTo(.42,5);dispose(m);
  });
  it('agrees at 30, 60 and 120 Hz through changes of speed and flight height',()=>{
    const results=[];for(const hz of [30,60,120]){const m=build();for(const [speed,height] of [[0,0],[5,1],[2,.3],[0,0]])for(let i=0;i<hz;i++)pose(m,speed,height,1/hz);results.push({...m.insect});dispose(m);}
    for(const key of ['phase','rate','amplitude','lift','foreAngle','hindAngle','sweep','pitch','bob']){expect(results[0][key]).toBeCloseTo(results[1][key],8);expect(results[0][key]).toBeCloseTo(results[2][key],8);}
  });
  it('limits the downstroke during a sudden landing without putting wings into the ground',()=>{
    for(const id of ids)for(const height of [0,.005,.03,.1,.3])for(const bank of [-.24,0,.24]){
      const m=build(id);for(let i=0;i<40;i++)pose(m,5,1,1/30,false,bank);
      for(let frame=0;frame<20;frame++){pose(m,5,height,1/120,false,bank);expect(lowest(m)).toBeGreaterThan(-.002);}dispose(m);
    }
  });
  it('rests immediately in reduced motion while paused and resumes without a phase jump',()=>{
    const m=build();for(let i=0;i<30;i++)pose(m,5,1);const phase=m.insect.phase;
    pose(m,5,1,0,true,.24);expect(m.insect.phase).toBe(phase);expect(m.insect.foreAngle).toBe(.12);expect(m.insect.hindAngle).toBe(.12);expect(m.insect.amplitude).toBe(0);expect(m.insect.pitch).toBe(0);expect(m.insect.bob).toBe(0);
    pose(m,5,1,1/60);expect(m.insect.amplitude).toBeLessThan(.06);expect(Math.abs(m.insect.foreAngle-.12)).toBeLessThan(.06);dispose(m);
  });
  it('keeps all geometry and materials stable during flight and returns to a compact carry pose',()=>{
    for(const id of ids){const m=build(id),identity=m.root.children.map(o=>[o.geometry,o.material,o.geometry.attributes.position.array]);for(let i=0;i<120;i++)pose(m,5,1);
      pose(m,0,0,0,true);expect(m.insect.pitch).toBe(0);expect(m.insect.bob).toBe(0);expect(m.insect.foreAngle).toBe(.12);expect(m.insect.sweep).toBe(id==='cicada'?.98:.1);
      m.root.children.forEach((o,i)=>{expect(o.geometry).toBe(identity[i][0]);expect(o.material).toBe(identity[i][1]);expect(o.geometry.attributes.position.array).toBe(identity[i][2]);expect(o.geometry.attributes.position.version).toBe(0);});dispose(m);
    }
  });
  it('activates insect escape within the detection sphere while preserving other prey behavior',()=>{
    for(const id of ids){const m=build(id),data={id,behavior:'wander'};expect(api.reacts(data,m.kind,55.9,56)).toBe(true);expect(api.reacts(data,m.kind,56,56)).toBe(false);expect(api.reacts(data,m.kind,80,56)).toBe(false);dispose(m);}
    for(const kind of ['snake','fish','rabbit','bird'])expect(api.reacts({behavior:'wander'},kind,1,40)).toBe(false);
    for(const kind of ['rabbit','bird','rodent']){expect(api.reacts({behavior:'flee-on-sight'},kind,39.9,40)).toBe(true);expect(api.reacts({behavior:'flee-on-sight'},kind,40,40)).toBe(false);}
  });
});
