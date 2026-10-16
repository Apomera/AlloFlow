import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const exported={}; Function('window',readFileSync('stem_lab/birdlab_3d_engine.js','utf8'))(exported);
function subject(id='blueJay',position=new THREE.Vector3(0,.2,0)) {
  return {id,name:id==='blueJay'?'Blue jay':'Mourning dove',scientificName:'Test species',position,
    getPosition(out){return out.copy(this.position);},getBehavior(){return 'Foraging';}};
}
function fixture(subjects=[subject()],root=new THREE.Group()) {
  const camera=new THREE.PerspectiveCamera(22,1.5,.03,240);camera.position.set(0,1.65,5);camera.lookAt(0,.2,0);camera.updateMatrixWorld(true);
  const observer=exported.BirdLab3D.createFieldObserver(THREE,root,subjects);
  return {camera,observer,subjects,run(seconds=1.5,moving=0){for(let i=0;i<seconds*60;i++)observer.update(1/60,camera,true,moving,false);return observer.getObservation();}};
}
describe('binocular sightlines',()=>{
  it('identifies only after a steady centered view and clears immediately when the binoculars lower',()=>{
    const test=fixture();
    expect(test.run(.4)).toMatchObject({id:'blueJay',identified:false,behavior:'Foraging'});
    expect(test.run()).toMatchObject({identified:true,progress:1});
    expect(test.observer.getObservation().distance).toBeCloseTo(Math.hypot(5,1.45));
    test.observer.update(0,test.camera,false,0,true);expect(test.observer.getObservation()).toBeNull();
    expect(test.observer.needsFrame()).toBe(false);
  });
  it('requires a new hold when looking away or changing subjects and cannot retain identification while walking',()=>{
    const jay=subject(),dove=subject('mourningDove',new THREE.Vector3(2,.2,0)),test=fixture([jay,dove]);
    expect(test.run().identified).toBe(true);
    test.camera.lookAt(2,.2,0);test.observer.update(.05,test.camera,true,0,true);
    expect(test.observer.getObservation()).toMatchObject({id:'mourningDove',identified:false,progress:0});
    expect(test.run().identified).toBe(true);
    expect(test.run(.1,.48)).toMatchObject({identified:false,progress:0});
    test.camera.lookAt(4,3,0);test.observer.update(0,test.camera,true,0,true);expect(test.observer.getObservation()).toBeNull();
  });
  it('does not identify targets behind the camera, outside the central view or beyond useful observation range',()=>{
    const targets=[subject('back',new THREE.Vector3(0,1,8)),subject('side',new THREE.Vector3(4,.2,0)),subject('far',new THREE.Vector3(0,-10,-45))];
    const test=fixture(targets);expect(test.run()).toBeNull();
  });
  it('revalidates the last paused view even for a tiny change at the edge of the reticle',()=>{
    const bird=subject(),test=fixture([bird]),origin=test.camera.position;
    bird.position.set(.2398/test.camera.aspect,0,.5).unproject(test.camera).sub(origin).normalize().multiplyScalar(5).add(origin);
    expect(test.run().identified).toBe(true);
    test.observer.update(0,test.camera,true,0,true);
    test.camera.rotateY(.0002);test.camera.updateMatrixWorld(true);
    expect(test.observer.update(.016,test.camera,true,0,true)).toBeNull();
    expect(test.observer.needsFrame()).toBe(false);
  });
  it('occludes a bird behind a trunk without treating a nearer bird as hidden',()=>{
    const root=new THREE.Group(),wall=new THREE.Mesh(new THREE.BoxGeometry(1,4,.4),new THREE.MeshBasicMaterial());
    wall.name='branching-woodland-trunks';wall.position.set(0,1,2.5);root.add(wall);
    const hidden=fixture([subject()],root);expect(hidden.run()).toBeNull();
    const nearer=subject('near',new THREE.Vector3(0,1.07,3)),visible=fixture([nearer],root);
    visible.camera.lookAt(nearer.position);expect(visible.run()).toMatchObject({id:'near',identified:true});
    wall.geometry.dispose();wall.material.dispose();
  });
  it('uses instanced stone transforms for occlusion and leaves open sightlines clear',()=>{
    const root=new THREE.Group(),stones=new THREE.InstancedMesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshBasicMaterial(),2);
    stones.name='weathered-clearing-stones';stones.setMatrixAt(0,new THREE.Matrix4().makeTranslation(8,1,2));stones.setMatrixAt(1,new THREE.Matrix4().makeTranslation(0,1,2.5));root.add(stones);
    expect(fixture([subject()],root).run()).toBeNull();
    stones.setMatrixAt(1,new THREE.Matrix4().makeTranslation(-8,1,2.5));
    expect(fixture([subject()],root).run()).toMatchObject({identified:true});
    stones.geometry.dispose();stones.material.dispose();
  });
  it('does not interpret transparent leaf cards as opaque walls or mutate subjects',()=>{
    const root=new THREE.Group(),leaves=new THREE.Mesh(new THREE.PlaneGeometry(5,5),new THREE.MeshBasicMaterial({transparent:true,opacity:.2}));
    leaves.name='individual-leaf-sprays';leaves.position.set(0,1,2);root.add(leaves);
    const bird=subject(),before=bird.position.clone(),test=fixture([bird],root);
    expect(test.run()).toMatchObject({identified:true});expect(bird.position.equals(before)).toBe(true);
    const copied=test.observer.getObservation();copied.name='changed';expect(test.observer.getObservation().name).toBe('Blue jay');
    leaves.geometry.dispose();leaves.material.dispose();
  });
});
