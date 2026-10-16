import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe,it,expect} from 'vitest';
const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
function fixture(quality='high') {
  const local={},scene=new THREE.Scene();
  for(const file of ['avian_woodland_birds.js','birdlab_3d_wildlife.js'])new Function('window',readFileSync('stem_lab/'+file,'utf8'))(local);
  const calls=[],create=local.AvianWoodlandBirds.create;
  local.AvianWoodlandBirds.create=(three,id,options)=>{calls.push([id,options.quality]);return create(three,id,options);};
  return {scene,calls,wildlife:local.BirdLab3DWildlife.create(THREE,scene,{quality,groundHeight:(x,z)=>x*.018-z*.012})};
}
function transforms(root){const out=[];root.traverse(o=>out.push(...o.position.toArray(),...o.quaternion.toArray()));return out;}
describe('BirdLab shared woodland residents',()=>{
  it.each(['high','low'])('instantiates all shared species, exposes focus targets and preserves original neighbors (%s)',quality=>{
    const {wildlife,calls}=fixture(quality);
    try{
      expect(calls).toEqual([['mourningDove',quality],['grouse',quality],['blueJay',quality],['northernCardinal',quality]]);
      expect(wildlife.snapshot().map(b=>b.id)).toEqual(['robin','chickadee','mourningDove','grouse','blueJay','northernCardinal']);
      for(const id of ['mourningDove','grouse','blueJay','northernCardinal']){
        const focus=new THREE.Vector3();expect(wildlife.getFocus(id,focus)).toBe(focus);expect(focus.toArray().every(Number.isFinite)).toBe(true);
        const bird=wildlife.snapshot().find(b=>b.id===id);expect(bird.scientificName).toBe({grouse:'Bonasa umbellus',mourningDove:'Zenaida macroura',blueJay:'Cyanocitta cristata',northernCardinal:'Cardinalis cardinalis'}[id]);
      }
    }finally{wildlife.dispose();}
  });
  it('supports reversible observation seeks and continuous repeated courses for both species',()=>{
    const {wildlife}=fixture('low'),epsilon=1e-5;
    try{
      for(const time of [0,4.9,8.53,10.53,12.7,18.55,31.1,35.2,43.999]){
        wildlife.update(time);const expected=transforms(wildlife.root),observed=wildlife.snapshot();
        wildlife.update(time+19);wildlife.update(time);expect(transforms(wildlife.root)).toEqual(expected);expect(wildlife.snapshot()).toEqual(observed);
        wildlife.update(time+44);expect(Math.max(...transforms(wildlife.root).map((v,i)=>Math.abs(v-expected[i])))).toBeLessThan(1e-10);
      }
      for(const t of [0,3.8,6.2,5,8.2,11.92,12,12.16,13.26,13.4,13.52,17.92,18,18.16,18.96,19.1,19.22,21,23.5,25,28,29.5,31.1,34,35.2,44]){
        wildlife.update(t-epsilon);const a=transforms(wildlife.root);
        wildlife.update(t);const b=transforms(wildlife.root);
        wildlife.update(t+epsilon);const c=transforms(wildlife.root);
        expect(Math.max(...b.map((v,i)=>Math.abs(v-a[i]))),`position at ${t}`).toBeLessThan(.002);
        expect(Math.max(...b.map((v,i)=>Math.abs(c[i]-2*v+a[i])/epsilon)),`velocity at ${t}`).toBeLessThan(.08);
      }
    }finally{wildlife.dispose();}
  });
  it('shows species-specific foraging and short flights within the woodland clearing',()=>{
    const {wildlife}=fixture('low');
    try{
      for(const [id,feed,flight] of [['mourningDove',8.53,12.7],['grouse',10.53,18.55],['blueJay',10.8,15.9]]){
        wildlife.update(feed);expect(wildlife.snapshot().find(b=>b.id===id).behavior).toBe('Foraging');
        wildlife.update(flight);const b=wildlife.snapshot().find(b=>b.id===id);expect(b.altitude).toBeGreaterThan(.4);expect(b.altitude).toBeLessThan(.8);
      }
      for(let t=0;t<44;t+=.1){wildlife.update(t);for(const b of wildlife.snapshot().slice(2)){
        expect(b.position.every(Number.isFinite)).toBe(true);expect(Math.hypot(b.position[0],b.position[2])).toBeLessThan(3);
        expect(b.altitude).toBeGreaterThanOrEqual(0);
      }}
    }finally{wildlife.dispose();}
  });
  it('keeps the support foot planted through alternating walking steps, including reverse seeks',()=>{
    const {wildlife,scene}=fixture('low'),position=new THREE.Vector3();
    try{
      for(const [id,start,end,steps] of [['mourningDove',3.8,6.2,6],['grouse',5,8.2,6],['blueJay',7,9.4,6]]){
        const bird=scene.getObjectByName('woodland-'+id),feet=[bird.getObjectByName('woodland-left-foot'),bird.getObjectByName('woodland-right-foot')];
        for(let step=0;step<steps;step++){
          const support=feet[1-step%2];let planted;
          for(const fraction of [.18,.42,.77,.42]){
            wildlife.update(start+(end-start)*(step+fraction)/steps);scene.updateMatrixWorld(true);support.getWorldPosition(position);
            if(!planted)planted=position.clone();else expect(position.distanceTo(planted),id+' support foot').toBeLessThan(1e-10);
          }
        }
      }
    }finally{wildlife.dispose();}
  });
  it('joins launch and landing with bounded acceleration instead of a vertical jolt',()=>{
    const {wildlife}=fixture('low'),epsilon=.001;
    try{
      for(const [id,boundaries] of [['mourningDove',[12,13.4,29.5,31.1]],['grouse',[18,19.1,34,35.2]],['blueJay',[15,16.8,32,34]]]){
        for(const boundary of boundaries){
          const values=[];
          for(const step of [-2,-1,0,1,2]){wildlife.update(boundary+step*epsilon);values.push(wildlife.snapshot().find(b=>b.id===id).altitude);}
          const left=(values[2]-2*values[1]+values[0])/(epsilon*epsilon),right=(values[4]-2*values[3]+values[2])/(epsilon*epsilon);
          expect(Math.abs(left-right),id+' vertical acceleration at '+boundary).toBeLessThan(.8);
        }
      }
    }finally{wildlife.dispose();}
  });
  it('releases both shared models once when leaving the observatory',()=>{
    const {wildlife,scene}=fixture('low'),counts=new Map();
    wildlife.root.traverse(o=>{if(o.isMesh)for(const resource of [o.geometry,o.material])if(!counts.has(resource)){counts.set(resource,0);resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));}});
    wildlife.dispose();wildlife.dispose();expect(scene.children).not.toContain(wildlife.root);expect([...counts.values()].every(n=>n===1)).toBe(true);
  });
});
