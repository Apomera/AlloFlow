import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {afterEach,describe,it,expect} from 'vitest';

const require=createRequire(import.meta.url),THREE=require(path.resolve('vendor/three-r128/three.min.js'));
const source=fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8'),scene=source.indexOf('function RenewablesEnergyScene(props)');
function helpers(first,last){const start=source.indexOf(first,scene),end=source.indexOf(last,start);if(start<0||end<0)throw new Error('Missing wave scene helper: '+first);return source.slice(start,end);}
const code=[helpers('function material(','function flange('),helpers('function ball(','function pipe('),helpers('function ring(','function generatorDetail('),helpers('function waveAnnulus(','function electricity(')].join('\n');
const roots=[];
function fixture(){const api=vm.runInNewContext(`(function(){${code};return {waveMechanism};})()`,{THREE}),parent=new THREE.Group();roots.push(parent);const mechanism=api.waveMechanism(parent);parent.updateMatrixWorld(true);return {parent,...mechanism};}
function bounds(object){return new THREE.Box3().setFromObject(object);}
function world(object){return object.getWorldPosition(new THREE.Vector3());}
function surfaces(object){
  object.updateMatrixWorld(true);const points=[];
  object.traverse(node=>{if(!node.geometry)return;const array=node.geometry.attributes.position;for(let i=0;i<array.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(array,i).applyMatrix4(node.matrixWorld));});
  return points;
}
function ray(mesh,origin,direction){return new THREE.Raycaster(origin,direction.normalize(),0,10).intersectObject(mesh,false);}
afterEach(()=>{for(const root of roots.splice(0))root.traverse(object=>{if(object.geometry)object.geometry.dispose();if(object.material)object.material.dispose();});});

describe('Renewables guided wave float',()=>{
  it.each(['buoy','deck','collar'])('%s has a genuine open central well and a closed annular top',key=>{
    const f=fixture(),body=key==='deck'?f.deck.getObjectByName('energy-wave-deck-ring'):f[key],center=world(body);
    const top=center.clone().add(new THREE.Vector3(0,3,0));
    expect(ray(body,top,new THREE.Vector3(0,-1,0))).toHaveLength(0);
    const materialRadius=(body.userData.innerRadius+body.userData.outerRadius)/2;
    const ringTop=top.clone().add(new THREE.Vector3(materialRadius,0,0));
    const hits=ray(body,ringTop,new THREE.Vector3(0,-1,0));expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].point.y).toBeCloseTo(center.y+body.userData.height/2,6);
    expect(hits[0].face.normal.y).toBeGreaterThan(.9);
  });

  it.each(['buoy','deck','collar'])('%s faces outward on its outer wall and inward into its bore',key=>{
    const f=fixture(),body=key==='deck'?f.deck.getObjectByName('energy-wave-deck-ring'):f[key],center=world(body);
    const fromBore=ray(body,center.clone(),new THREE.Vector3(1,0,0));
    expect(fromBore.length).toBeGreaterThan(0);expect(fromBore[0].distance).toBeCloseTo(body.userData.innerRadius,6);
    expect(fromBore[0].face.normal.x).toBeLessThan(-.9);
    const fromOutside=ray(body,center.clone().add(new THREE.Vector3(2,0,0)),new THREE.Vector3(-1,0,0));
    expect(fromOutside.length).toBeGreaterThan(0);expect(fromOutside[0].distance).toBeCloseTo(2-body.userData.outerRadius,6);
    expect(fromOutside[0].face.normal.x).toBeGreaterThan(.9);
  });

  it.each([0,.5,2,6])('maintains clearance over an entire cycle at wave height %s m',height=>{
    const f=fixture(),spar=bounds(f.spar),base=bounds(f.base),cap=bounds(f.cap),fixed=[f.spar,f.base,f.cap].map(object=>object.matrixWorld.clone());
    for(let index=0;index<=180;index++){
      const y=1.25+Math.sin(index*Math.PI/90)*height*.13;f.place(y);f.parent.updateMatrixWorld(true);
      const buoy=bounds(f.buoy),collar=bounds(f.collar),deck=bounds(f.deck.getObjectByName('energy-wave-deck-ring'));
      expect(buoy.min.y).toBeGreaterThan(.09);expect(buoy.max.y-buoy.min.y).toBeCloseTo(.75,6);
      expect(collar.min.y).toBeGreaterThan(base.max.y+.7);expect(collar.max.y).toBeLessThan(cap.min.y-.16);
      expect(collar.min.y).toBeGreaterThan(spar.min.y);expect(collar.max.y).toBeLessThan(spar.max.y);
      expect(collar.min.y).toBeCloseTo(deck.max.y,6);
      expect(f.buoy.position.y).toBe(y);expect(f.rim.position.y-y).toBeCloseTo(.35,12);
      expect(f.deck.position.y-y).toBeCloseTo(.39,12);expect(f.carriage.position.y-y).toBeCloseTo(.58,12);
      expect(f.carriage.userData.displayHeave).toBeCloseTo(y-1.25,12);
      [f.spar,f.base,f.cap].forEach((object,i)=>expect(object.matrixWorld.equals(fixed[i])).toBe(true));
    }
  });

  it('keeps the visible collar, connecting spokes, and mast clear of the guide bore',()=>{
    const f=fixture();
    // The inner polygon has a slightly smaller apothem than its nominal radius.
    expect(f.collar.userData.innerRadius*Math.cos(Math.PI/48)-.14).toBeGreaterThan(.029);
    for(const spoke of f.carriage.children.filter(object=>object.name.startsWith('energy-wave-carriage-spoke-'))){
      const points=surfaces(spoke),radii=points.map(point=>Math.hypot(point.x+1,point.z));
      expect(Math.min(...radii)).toBeGreaterThan(.20);expect(Math.max(...radii)).toBeLessThan(.36);
      expect(Math.min(...radii)).toBeLessThan(f.collar.userData.outerRadius);expect(Math.max(...radii)).toBeGreaterThan(.29);
      expect(bounds(spoke).min.y).toBeCloseTo(bounds(f.deck.getObjectByName('energy-wave-deck-ring')).max.y,6);
    }
    const mastRadii=surfaces(f.mast).map(point=>Math.hypot(point.x+1,point.z));
    expect(Math.min(...mastRadii)).toBeGreaterThan(.29);expect(Math.max(...mastRadii)).toBeLessThan(.53);
    expect(bounds(f.collar).max.y-bounds(f.deck.getObjectByName('energy-wave-deck-ring')).max.y).toBeCloseTo(.24,6);
  });

  it('preserves all geometry and buffers while traversing the full stroke and returning to calm water',()=>{
    const f=fixture(),saved=[];f.parent.traverse(object=>{if(object.geometry)saved.push({object,geometry:object.geometry,position:object.geometry.attributes.position,normal:object.geometry.attributes.normal,index:object.geometry.index});});
    const localSpokes=f.carriage.children.filter(object=>object.name.startsWith('energy-wave-carriage-spoke-')).map(object=>({object,position:object.position.clone(),rotation:object.quaternion.clone()}));
    for(let index=0;index<240;index++){f.place(1.25+.78*Math.sin(index*.1));f.parent.updateMatrixWorld(true);}
    f.place(1.25);f.parent.updateMatrixWorld(true);
    for(const snapshot of saved){expect(snapshot.object.geometry).toBe(snapshot.geometry);expect(snapshot.geometry.attributes.position).toBe(snapshot.position);expect(snapshot.geometry.attributes.normal).toBe(snapshot.normal);expect(snapshot.geometry.index).toBe(snapshot.index);}
    for(const snapshot of localSpokes){expect(snapshot.object.position.equals(snapshot.position)).toBe(true);expect(snapshot.object.quaternion.equals(snapshot.rotation)).toBe(true);}
    expect(f.buoy.position.y).toBe(1.25);expect(f.carriage.userData.displayHeave).toBe(0);
  });

  it('keeps the mechanism rigid when the converter stage is separated for inspection',()=>{
    const f=fixture();f.place(2.03);f.parent.position.set(0,.8,0);f.parent.rotation.y=.4;f.parent.updateMatrixWorld(true);
    const collarInParent=f.parent.worldToLocal(world(f.collar)),deckInParent=f.parent.worldToLocal(world(f.deck));
    expect(collarInParent.x).toBeCloseTo(-1,12);expect(collarInParent.y).toBeCloseTo(2.61,12);expect(collarInParent.z).toBeCloseTo(0,12);
    expect(deckInParent.y).toBeCloseTo(2.42,12);
    const guideInParent=f.parent.worldToLocal(world(f.spar));expect(guideInParent.y).toBeCloseTo(1.49,12);
    expect(f.collar.parent).toBe(f.carriage);expect(f.mast.parent).toBe(f.deck);
  });
});
