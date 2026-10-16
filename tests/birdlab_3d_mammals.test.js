import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
function create(options = {}) {
  const scope = {}, scene = new THREE.Scene();
  new Function('window', readFileSync('stem_lab/birdlab_3d_mammals.js', 'utf8'))(scope);
  return { mammals: scope.BirdLab3DMammals.create(THREE, scene, { quality: 'low', ...options }), scene };
}
function run(mammals, seconds, fps = 60, observer) {
  for (let frame = 0; frame < Math.round(seconds * fps); frame++) mammals.update(frame / fps, 1 / fps, observer);
}
function distance(a,b) { return Math.hypot(a[0]-b[0],a[2]-b[2]); }
function at(mammals) { return mammals.snapshot()[0]; }
function fingerprint(root) {
  const result=[];
  root.traverse(object=>{result.push(...object.position.toArray(),...object.quaternion.toArray(),...object.scale.toArray());});
  return result;
}
describe('Eastern gray squirrel woodland resident', () => {
  it('provides a real-scale four-pawed squirrel with a curved bushy tail at both quality levels', () => {
    for(const quality of ['low','high']) {
      const {mammals,scene}=create({quality});
      try {
        expect(mammals.root.visible).toBe(false);
        expect(at(mammals)).toMatchObject({id:'graySquirrel',name:'Eastern gray squirrel',scientificName:'Sciurus carolinensis',category:'mammal',visible:false});
        expect(mammals.getFocus('graySquirrel',new THREE.Vector3())).toBeNull();
        mammals.setMode('free');mammals.root.getObjectByName('woodland-gray-squirrel').rotation.y=0;scene.updateMatrixWorld(true);
        const box=new THREE.Box3().setFromObject(mammals.root),size=box.getSize(new THREE.Vector3()),meshes=[];
        mammals.root.traverse(object=>{if(object.isMesh)meshes.push(object);});
        expect(meshes.length).toBeLessThanOrEqual(20);
        expect(new Set(meshes.map(mesh=>mesh.material)).size).toBeLessThanOrEqual(3);
        expect(size.x).toBeGreaterThan(.09);expect(size.x).toBeLessThan(.20);
        expect(size.y).toBeGreaterThan(.30);expect(size.y).toBeLessThan(.40);
        expect(size.z).toBeGreaterThan(.35);expect(size.z).toBeLessThan(.55);
        expect(meshes.filter(mesh=>mesh.name.startsWith('squirrel-paw-'))).toHaveLength(4);
        for(const mesh of meshes) {
          for(const value of mesh.geometry.attributes.position.array) expect(Number.isFinite(value)).toBe(true);
          for(const value of mesh.geometry.attributes.normal.array) expect(Number.isFinite(value)).toBe(true);
        }
        const focus=new THREE.Vector3();expect(mammals.getFocus('graySquirrel',focus)).toBe(focus);
        expect(focus.y).toBeGreaterThan(.06);expect(focus.y).toBeLessThan(.16);
        expect(mammals.getFocus('unknown',focus)).toBeNull();
      } finally {mammals.dispose();}
    }
  });
  it('chooses varied grounded actions with continuous positions and bounded turns', () => {
    const {mammals}=create({seed:22}),behaviors=new Set(),positions=new Set();
    try {
      mammals.setMode('free');let previous=at(mammals);
      for(let frame=0;frame<75*30;frame++) {
        mammals.update(frame/30,1/30);const current=at(mammals);
        behaviors.add(current.behavior);positions.add(current.position.map(value=>value.toFixed(1)).join(','));
        expect(current.position.every(Number.isFinite)).toBe(true);
        expect(Math.hypot(current.position[0],current.position[2])).toBeLessThan(6.8);
        expect(current.altitude).toBe(0);expect(current.position[1]).toBe(0);
        expect(distance(previous.position,current.position)).toBeLessThan(.065);
        const turn=current.heading-previous.heading;
        expect(Math.abs(Math.atan2(Math.sin(turn),Math.cos(turn)))).toBeLessThan(.20);
        previous=current;
      }
      expect(behaviors.has('Sniffing and searching')).toBe(true);
      expect(behaviors.has('Handling a seed')).toBe(true);
      expect(behaviors.has('Scurrying')).toBe(true);expect(positions.size).toBeGreaterThan(20);
    } finally {mammals.dispose();}
  });
  it('has outward tail normals and a closed tip rather than an open tube', () => {
    const {mammals}=create({quality:'high'});
    try {
      const geometry=mammals.root.getObjectByName('squirrel-tail').geometry,positions=geometry.attributes.position,normals=geometry.attributes.normal;
      const rows=28,sides=18,lastRing=rows*(sides+1),tip=new THREE.Vector3().fromBufferAttribute(positions,lastRing);
      for(let side=0;side<=sides;side++)expect(new THREE.Vector3().fromBufferAttribute(positions,lastRing+side).distanceTo(tip)).toBeLessThan(1e-8);
      for(let row=1;row<rows-1;row++)for(let side=0;side<sides;side++) {
        const t=row/rows,dy=.245+.024*Math.PI*Math.cos(Math.PI*t),dz=-.137*Math.PI*.93*Math.cos(Math.PI*t*.93),angle=side/sides*Math.PI*2,length=Math.hypot(dy,dz);
        const outward=new THREE.Vector3(Math.cos(angle),-Math.sin(angle)*dz/length,Math.sin(angle)*dy/length);
        expect(new THREE.Vector3().fromBufferAttribute(normals,row*(sides+1)+side).dot(outward)).toBeGreaterThan(.65);
      }
    } finally {mammals.dispose();}
  });
  it('replays the seed across frame rates, resets the visit, and varies between seeds', () => {
    const a=create({seed:42}).mammals,b=create({seed:42}).mammals,c=create({seed:43}).mammals;
    try {
      [a,b,c].forEach(mammals=>mammals.setMode('free'));
      run(a,30,30);run(b,30,60);run(c,30,30);
      expect(b.snapshot()).toEqual(a.snapshot());expect(distance(at(a).position,at(c).position)).toBeGreaterThan(.3);
      const pose=fingerprint(a.root),tail=Array.from(a.root.getObjectByName('squirrel-tail').geometry.attributes.position.array);
      expect(fingerprint(b.root)).toEqual(pose);
      expect(Array.from(b.root.getObjectByName('squirrel-tail').geometry.attributes.position.array)).toEqual(tail);
      const initial=a.snapshot();a.setMode('guided');expect(a.root.visible).toBe(false);
      expect(a.getFocus('graySquirrel',new THREE.Vector3())).toBeNull();
      a.setMode('free');run(a,30,60);expect(a.snapshot()).toEqual(initial);
      expect(fingerprint(a.root)).toEqual(pose);
      expect(Array.from(a.root.getObjectByName('squirrel-tail').geometry.attributes.position.array)).toEqual(tail);
    } finally {[a,b,c].forEach(mammals=>mammals.dispose());}
  });
  it('freezes all model poses, tail vertices, alertness, and choices at zero elapsed time', () => {
    const {mammals}=create();
    try {
      mammals.setMode('free');run(mammals,8);
      const before=mammals.snapshot(),pose=fingerprint(mammals.root);
      const tail=mammals.root.getObjectByName('squirrel-tail'),vertices=Array.from(tail.geometry.attributes.position.array);
      mammals.update(999,0,{position:new THREE.Vector3(-2.4,1,-.4),speed:2});
      expect(mammals.snapshot()).toEqual(before);expect(fingerprint(mammals.root)).toEqual(pose);
      expect(Array.from(tail.geometry.attributes.position.array)).toEqual(vertices);
    } finally {mammals.dispose();}
  });
  it('chooses an unblocked spawn and rejects routes through a wall without teleporting', () => {
    const isBlocked=(x,z,radius)=>Math.abs(x+2.4)<.08+radius||z<-.8;
    const {mammals}=create({isBlocked});
    try {
      mammals.setMode('free');expect(at(mammals).visible).toBe(true);let previous=at(mammals).position;
      for(let frame=0;frame<45*30;frame++) {
        mammals.update(frame/30,1/30);const position=at(mammals).position;
        expect(isBlocked(position[0],position[2],.11)).toBe(false);
        expect(distance(position,previous)).toBeLessThan(.065);previous=position;
      }
    } finally {mammals.dispose();}
    const unavailable=create({isBlocked:()=>true}).mammals;
    try {
      unavailable.setMode('free');run(unavailable,5);expect(at(unavailable).visible).toBe(false);
      expect(unavailable.getFocus('graySquirrel',new THREE.Vector3())).toBeNull();
    } finally {unavailable.dispose();}
  });
  it('watches an observer gradually and is less disturbed by a crouched approach', () => {
    const standing=create().mammals,crouching=create().mammals;
    try {
      standing.setMode('free');crouching.setMode('free');
      for(let frame=0;frame<120;frame++) {
        const range=1.7-frame/120*.8;
        standing.update(frame/60,1/60,{position:new THREE.Vector3(-2.4,1.65,-.4+range),speed:.4});
        crouching.update(frame/60,1/60,{position:new THREE.Vector3(-2.4,1.03,-.4+range),speed:.4,crouching:true});
        if(frame===0)expect(at(standing).alertness).toBeLessThan(.01);
      }
      expect(at(standing).alertness).toBeGreaterThan(at(crouching).alertness+.1);
      expect(at(standing).behavior).toBe('Watching the observer');
      const before=at(standing).alertness;run(standing,1);
      expect(at(standing).alertness).toBeLessThan(before);expect(at(standing).alertness).toBeGreaterThan(0);
      run(standing,14);expect(at(standing).alertness).toBeLessThan(.002);
    } finally {standing.dispose();crouching.dispose();}
  });
  it('escapes along an outward route then pauses to recover instead of repeatedly bolting', () => {
    const {mammals}=create(),observer={position:new THREE.Vector3(-2.4,1.65,-.18),speed:.4};
    try {
      mammals.setMode('free');const start=at(mammals).position;let escaped=false,recoveryFrames=0,previousRange=distance(start,observer.position.toArray());
      for(let frame=0;frame<8*60;frame++) {
        mammals.update(frame/60,1/60,observer);const current=at(mammals),range=distance(current.position,observer.position.toArray());
        if(current.behavior==='Scurrying to cover') {
          escaped=true;expect(range).toBeGreaterThanOrEqual(previousRange-1e-9);
        }
        if(current.recovering) {recoveryFrames++;expect(current.behavior).toBe('Watching after escape');}
        previousRange=range;
      }
      expect(escaped).toBe(true);expect(recoveryFrames).toBeGreaterThan(90);
      expect(distance(at(mammals).position,observer.position.toArray())).toBeGreaterThan(1.5);
      expect(distance(at(mammals).position,start)).toBeGreaterThan(1.3);
    } finally {mammals.dispose();}
  });
  it('keeps scurrying paws near the ground and plants support feet without sliding', () => {
    const {mammals,scene}=create({seed:42}),paws=[];
    try {
      mammals.root.traverse(object=>{if(object.name.startsWith('squirrel-paw-'))paws.push(object);});
      mammals.setMode('free');let previous=null,plantSamples=0;
      for(let frame=0;frame<30*60;frame++) {
        mammals.update(frame/60,1/60);scene.updateMatrixWorld(true);
        const current=paws.map(paw=>paw.getWorldPosition(new THREE.Vector3()));
        if(at(mammals).behavior==='Scurrying') {
          for(let paw=0;paw<current.length;paw++) {
            expect(current[paw].y).toBeGreaterThanOrEqual(.003);
            expect(current[paw].y).toBeLessThan(.060);
            if(previous)expect(current[paw].distanceTo(previous[paw])).toBeLessThan(.075);
            if(previous&&Math.abs(current[paw].y-.0045)<1e-8&&Math.abs(previous[paw].y-.0045)<1e-8&&current[paw].distanceTo(previous[paw])<.001)plantSamples++;
          }
        }
        previous=current;
      }
      expect(plantSamples).toBeGreaterThan(150);
    } finally {mammals.dispose();}
  });
  it('retains animation geometry and disposes every shared resource exactly once', () => {
    const {mammals,scene}=create(),geometries=new Map(),materials=new Map();
    mammals.root.traverse(object=>{
      if(!object.isMesh)return;
      if(!geometries.has(object.geometry))geometries.set(object.geometry,{buffer:object.geometry.attributes.position.array,disposals:0});
      materials.set(object.material,0);
    });
    for(const [geometry,record] of geometries)geometry.addEventListener('dispose',()=>record.disposals++);
    for(const material of materials.keys())material.addEventListener('dispose',()=>materials.set(material,materials.get(material)+1));
    mammals.setMode('free');run(mammals,18);
    for(const [geometry,record] of geometries)expect(geometry.attributes.position.array).toBe(record.buffer);
    mammals.dispose();mammals.dispose();expect(scene.children.includes(mammals.root)).toBe(false);
    for(const record of geometries.values())expect(record.disposals).toBe(1);
    for(const count of materials.values())expect(count).toBe(1);
    expect(at(mammals).visible).toBe(false);
  });
  it('places resting paws on the terrain beneath each foot', () => {
    const groundHeight=(x,z)=>.04*x+.03*z,{mammals,scene}=create({groundHeight});
    try {
      mammals.setMode('free');scene.updateMatrixWorld(true);
      mammals.root.traverse(object=>{
        if(!object.name.startsWith('squirrel-paw-'))return;
        const foot=object.getWorldPosition(new THREE.Vector3());expect(foot.y-groundHeight(foot.x,foot.z)).toBeCloseTo(.0045,7);
      });
    } finally {mammals.dispose();}
  });
  it('turns with lifted placement steps while supporting paws stay fixed in world space', () => {
    const {mammals,scene}=create({seed:42}),paws=[];
    try {
      mammals.root.traverse(object=>{if(object.name.startsWith('squirrel-paw-'))paws.push(object);});
      mammals.setMode('free');let previous=null,previousHeading=.8,plantedSamples=0,liftedSamples=0,turnFrames=0;
      for(let frame=0;frame<48*60;frame++) {
        mammals.update(frame/60,1/60);scene.updateMatrixWorld(true);
        const state=at(mammals),current=paws.map(paw=>paw.getWorldPosition(new THREE.Vector3()));
        const turn=Math.abs(Math.atan2(Math.sin(state.heading-previousHeading),Math.cos(state.heading-previousHeading)));
        if(state.behavior==='Choosing a route'&&turn>1e-5) {
          turnFrames++;
          expect(current.filter(foot=>Math.abs(foot.y-.0045)<.0003).length).toBeGreaterThanOrEqual(2);
          current.forEach((foot,index)=>{
            if(foot.y>.008)liftedSamples++;
            if(previous&&Math.abs(foot.y-.0045)<1e-8&&Math.abs(previous[index].y-.0045)<1e-8) {
              expect(foot.distanceTo(previous[index])).toBeLessThan(1e-7);plantedSamples++;
            }
            if(previous)expect(foot.distanceTo(previous[index])).toBeLessThan(.025);
          });
        }
        previous=current;previousHeading=state.heading;
      }
      expect(turnFrames).toBeGreaterThan(90);expect(plantedSamples).toBeGreaterThan(100);expect(liftedSamples).toBeGreaterThan(20);
    } finally {mammals.dispose();}
  });
  it('lowers its forepaws after handling before turning into a scurry', () => {
    const {mammals,scene}=create({seed:42}),front=['left','right'].map(side=>mammals.root.getObjectByName('squirrel-paw-front-'+side));
    try {
      mammals.setMode('free');let previousBehavior='',preparing=false,loweringFrames=0,startHeading=0,previous=null;
      for(let frame=0;frame<70*60;frame++) {
        mammals.update(frame/60,1/60);scene.updateMatrixWorld(true);
        const state=at(mammals),feet=front.map(paw=>paw.getWorldPosition(new THREE.Vector3()));
        if(previousBehavior==='Handling a seed'&&state.behavior==='Choosing a route'&&!preparing){preparing=true;startHeading=state.heading;}
        if(preparing&&state.behavior==='Choosing a route') {
          if(feet.some(foot=>foot.y>.02)){expect(state.heading).toBeCloseTo(startHeading,9);loweringFrames++;}
          if(previous)feet.forEach((foot,index)=>expect(foot.distanceTo(previous[index])).toBeLessThan(.025));
        }
        if(preparing&&state.behavior==='Scurrying')break;
        previous=feet;previousBehavior=state.behavior;
      }
      expect(preparing).toBe(true);expect(loweringFrames).toBeGreaterThan(8);
    } finally {mammals.dispose();}
  });
  it('rejects ordinary routes that would enter the observer clearance circle', () => {
    const {mammals}=create({seed:42}),observer={position:new THREE.Vector3(-2.35,1.65,.9),speed:0};
    try {
      mammals.setMode('free');const origin=at(mammals).position;let moved=0,scurried=false;
      for(let frame=0;frame<12*60;frame++) {
        mammals.update(frame/60,1/60,observer);const state=at(mammals);
        if(state.behavior==='Scurrying')scurried=true;
        moved=Math.max(moved,distance(origin,state.position));
        expect(distance(state.position,observer.position.toArray())).toBeGreaterThanOrEqual(.8-1e-6);
      }
      expect(scurried).toBe(true);expect(moved).toBeGreaterThan(.4);
    } finally {mammals.dispose();}
  });
  it('keeps the retained seed between the actual forepaws during a hands-to-mouth gesture', () => {
    const {mammals,scene}=create({seed:42}),head=mammals.root.getObjectByName('squirrel-head'),seed=mammals.root.getObjectByName('squirrel-foraged-seed');
    const front=['left','right'].map(side=>mammals.root.getObjectByName('squirrel-paw-front-'+side));
    try {
      mammals.setMode('free');let nearMouth=0,awayFromMouth=0,previous=null;
      for(let frame=0;frame<20*60;frame++) {
        mammals.update(frame/60,1/60);scene.updateMatrixWorld(true);
        if(!seed.visible){previous=null;continue;}
        const food=seed.getWorldPosition(new THREE.Vector3()),mouth=head.localToWorld(new THREE.Vector3(0,-.023,.052));
        const left=front[0].getWorldPosition(new THREE.Vector3()),right=front[1].getWorldPosition(new THREE.Vector3()),center=left.clone().add(right).multiplyScalar(.5);
        expect(food.distanceTo(center)).toBeLessThan(.012);
        expect(left.distanceTo(right)).toBeLessThan(.027);
        if(food.distanceTo(mouth)<.012)nearMouth++;
        if(food.distanceTo(mouth)>.035)awayFromMouth++;
        if(previous)expect(food.distanceTo(previous)).toBeLessThan(.012);
        previous=food;
      }
      expect(nearMouth).toBeGreaterThan(12);expect(awayFromMouth).toBeGreaterThan(12);
      expect(mammals.root.getObjectByName('squirrel-foraged-seed')).toBe(seed);
    } finally {mammals.dispose();}
  });
  it('keeps a finished seed consumed after the meal instead of making it reappear', () => {
    const {mammals}=create({seed:42}),seed=mammals.root.getObjectByName('squirrel-foraged-seed');
    try {
      mammals.setMode('free');let sawSeed=false,consumed=false,afterMeal=0;
      for(let frame=0;frame<20*60;frame++) {
        mammals.update(frame/60,1/60);const behavior=at(mammals).behavior;
        if(seed.visible)sawSeed=true;
        if(sawSeed&&behavior==='Handling a seed'&&!seed.visible)consumed=true;
        if(consumed&&behavior!=='Handling a seed') {
          expect(seed.visible).toBe(false);afterMeal++;
          if(afterMeal>30)break;
        }
      }
      expect(sawSeed).toBe(true);expect(consumed).toBe(true);expect(afterMeal).toBeGreaterThan(30);
    } finally {mammals.dispose();}
  });
  it('inspects different ground patches with settled head directions and quiet pauses between sniffs', () => {
    const {mammals}=create({seed:22}),head=mammals.root.getObjectByName('squirrel-head');
    try {
      mammals.setMode('free');const inspections=[];let inspection=[],quietFrames=0,previousYaw=0;
      for(let frame=0;frame<2.4*60;frame++) {
        mammals.update(frame/60,1/60);
        if(head.position.y<.018)inspection.push(head.rotation.y);
        else if(inspection.length){inspections.push(inspection);inspection=[];}
        if(head.position.y>.030&&Math.abs(head.rotation.y-previousYaw)<.001)quietFrames++;
        previousYaw=head.rotation.y;
      }
      if(inspection.length)inspections.push(inspection);
      expect(inspections.length).toBeGreaterThanOrEqual(2);
      expect(quietFrames).toBeGreaterThan(20);
      const heldDirections=inspections.map(samples=>{
        expect(samples.length).toBeGreaterThan(12);
        const settled=samples.slice(-4);
        expect(Math.max(...settled)-Math.min(...settled)).toBeLessThan(.014);
        return settled.reduce((sum,value)=>sum+value,0)/settled.length;
      });
      expect(Math.max(...heldDirections)-Math.min(...heldDirections)).toBeGreaterThan(.12);
    } finally {mammals.dispose();}
  });
  it('makes separated warning tail flicks that return to neutral and replay across frame rates', () => {
    const a=create({seed:42}).mammals,b=create({seed:42}).mammals;
    const observer={position:new THREE.Vector3(-2.4,1.65,.5),speed:0};
    try {
      a.setMode('free');b.setMode('free');
      const tail=a.root.getObjectByName('squirrel-tail'),neutral=Array.from(tail.geometry.attributes.position.array);
      const flicks=[];let flick=null,stillRun=0,longestStill=0,previous=0;
      for(let frame=0;frame<18*60;frame++) {
        a.update(frame/60,1/60,observer);
        const angle=tail.rotation.z;
        expect(Math.abs(angle-previous)).toBeLessThan(.06);previous=angle;
        if(Math.abs(angle)>1e-6) {
          if(!flick)flick={start:frame,peak:0};
          flick.peak=Math.max(flick.peak,Math.abs(angle));stillRun=0;
        } else {
          stillRun++;longestStill=Math.max(longestStill,stillRun);
          if(flick){flick.end=frame;flicks.push(flick);flick=null;}
          if(angle===0&&stillRun===30)expect(Array.from(tail.geometry.attributes.position.array)).toEqual(neutral);
        }
      }
      expect(flicks.length).toBeGreaterThanOrEqual(3);
      expect(longestStill).toBeGreaterThan(90);
      flicks.forEach((flick,index)=>{
        expect(flick.peak).toBeGreaterThan(.12);
        expect(flick.end-flick.start).toBeGreaterThan(20);
        expect(flick.end-flick.start).toBeLessThan(45);
        if(index)expect(flick.start-flicks[index-1].end).toBeGreaterThan(90);
      });
      run(b,18,30,observer);
      expect(b.snapshot()).toEqual(a.snapshot());expect(fingerprint(b.root)).toEqual(fingerprint(a.root));
      expect(Array.from(b.root.getObjectByName('squirrel-tail').geometry.attributes.position.array)).toEqual(Array.from(tail.geometry.attributes.position.array));
    } finally {a.dispose();b.dispose();}
  });
  it('blends inspection, feeding, and departure poses continuously across action changes', () => {
    const {mammals,scene}=create({seed:22});
    const tracked=['squirrel-head','squirrel-paw-front-left','squirrel-paw-front-right'].map(name=>mammals.root.getObjectByName(name));
    try {
      mammals.setMode('free');let previous=null,transitionWindow=0,checkedFrames=0;
      const changes=new Set();
      for(let frame=0;frame<50*60;frame++) {
        mammals.update(frame/60,1/60);scene.updateMatrixWorld(true);
        const behavior=at(mammals).behavior,positions=tracked.map(object=>object.getWorldPosition(new THREE.Vector3()));
        const rotation=tracked[0].getWorldQuaternion(new THREE.Quaternion());
        if(previous&&behavior!==previous.behavior){changes.add(previous.behavior+' → '+behavior);transitionWindow=10;}
        if(previous&&transitionWindow>0) {
          // Lowering from the upright meal posture can move the head faster
          // than a sniff, while still progressing smoothly through each frame.
          expect(positions[0].distanceTo(previous.positions[0])).toBeLessThan(.020);
          positions.slice(1).forEach((position,index)=>expect(position.distanceTo(previous.positions[index+1])).toBeLessThan(.026));
          expect(rotation.angleTo(previous.rotation)).toBeLessThan(.12);
          checkedFrames++;transitionWindow--;
        }
        previous={behavior,positions,rotation};
      }
      expect(changes.size).toBeGreaterThan(5);expect(checkedFrames).toBeGreaterThan(100);
      expect([...changes].some(change=>change.startsWith('Handling a seed → '))).toBe(true);
      expect([...changes].some(change=>change.startsWith('Sniffing and searching → '))).toBe(true);
    } finally {mammals.dispose();}
  });
});
