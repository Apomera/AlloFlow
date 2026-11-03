import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const Rock=require('../stem_lab/kitchen_studio/kitchen_studio_knife_rock.js');
const THREE=require('../vendor/three-r128/three.min.js');

describe('Reversible visual knife rocking',()=>{
  it.each([-Number.MAX_VALUE,-1,-Number.MIN_VALUE,0])('starts within the raised-handle bound at depth %s',depth=>{
    expect(Rock.angle(depth)).toBe(.24);
  });
  it.each([1,2,Number.MAX_VALUE])('is exactly flat at full depth %s',depth=>{
    expect(Rock.angle(depth)).toBe(0);
  });
  it('lowers the raised handle through meaningful intermediate depths',()=>{
    expect(Rock.angle(.25)).toBeCloseTo(.2025,12);
    expect(Rock.angle(.5)).toBeCloseTo(.12,12);
    expect(Rock.angle(.75)).toBeCloseTo(.0375,12);
  });
  it('joins the raised and flat end poses continuously',()=>{
    expect(.24-Rock.angle(1e-5)).toBeLessThan(1e-8);
    expect(Rock.angle(1-1e-5)).toBeLessThan(1e-8);
    expect(Rock.angle(1-1e-5)).toBeGreaterThan(0);
  });
  it('eases movement near both end poses instead of a linear angular jump',()=>{
    expect((Rock.angle(0)-Rock.angle(.001))/.001).toBeLessThan(.001);
    expect((Rock.angle(.999)-Rock.angle(1))/.001).toBeLessThan(.001);
  });
  it('stays finite, bounded and monotonically flatter throughout a full stroke',()=>{
    let previous=.24;
    for(let step=0;step<=1000;step++){
      const current=Rock.angle(step/1000);
      expect(Number.isFinite(current)).toBe(true);expect(current).toBeGreaterThanOrEqual(0);
      expect(current).toBeLessThanOrEqual(previous);expect(current).toBeLessThanOrEqual(.24);previous=current;
    }
  });
  it('retraces the same angle when lifting back through a prior depth',()=>{
    const depths=[0,.1,.25,.5,.75,.9,1],down=depths.map(Rock.angle),up=[...depths].reverse().map(Rock.angle);
    expect(up).toEqual([...down].reverse());expect(down[3]).toBeGreaterThan(0);
  });
  it('does not accumulate or retain a previous stroke',()=>{
    const half=Rock.angle(.5);Rock.angle(1);Rock.angle(-1);Rock.angle(NaN);
    for(let sample=0;sample<20;sample++)expect(Rock.angle(.5)).toBe(half);
    expect(Rock.angle(0)).toBe(.24);expect(Rock.angle(1)).toBe(0);
  });
  it.each([NaN,Infinity,-Infinity,undefined,null,true,false,'0.5',{},[],new Number(.5),1n])('keeps invalid depth %s flat without coercion',depth=>{
    expect(Rock.angle(depth)).toBe(0);
  });
  it('does not invoke valueOf or change an invalid input object',()=>{
    const value=Object.freeze({valueOf(){throw new Error('Depth coercion is forbidden');}});
    expect(()=>Rock.angle(value)).not.toThrow();expect(Rock.angle(value)).toBe(0);
  });
  it('exposes the same scalar helper to the browser and CommonJS',()=>{
    expect(window.KitchenStudioKnifeRock.angle).toBe(Rock.angle);expect(typeof Rock.angle(.5)).toBe('number');
  });
});

describe('Rock angle applied to a rigid knife pair',()=>{
  it.each([0,.18])('supports the captured blade yaw %s without separating the handle or moving the tip path',yaw=>{
    const depth=.5,bladePosition=new THREE.Vector3(0,1.5,-.24),handlePosition=new THREE.Vector3(.32,1.5,-.24);
    const bladeOrientation=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,yaw,0)),handleOrientation=new THREE.Quaternion();
    const lowerTip=new THREE.Vector3(-.22,-.0175,0),pivot=lowerTip.clone().applyQuaternion(bladeOrientation).add(bladePosition);
    const axis=new THREE.Vector3(0,0,1).applyQuaternion(bladeOrientation),rock=new THREE.Quaternion().setFromAxisAngle(axis,Rock.angle(depth));
    const offset=new THREE.Vector3(0,.13-.19*depth,.24*Math.min(1,1.8*depth));
    const pose=(position,orientation)=>({position:position.clone().sub(pivot).applyQuaternion(rock).add(pivot).add(offset),orientation:rock.clone().multiply(orientation)});
    const blade=pose(bladePosition,bladeOrientation),handle=pose(handlePosition,handleOrientation);
    expect(blade.position.distanceTo(handle.position)).toBeCloseTo(bladePosition.distanceTo(handlePosition),12);
    expect(handle.position.y).toBeGreaterThan(handlePosition.y+offset.y+.02);
    const actualTip=lowerTip.clone().applyQuaternion(blade.orientation).add(blade.position);
    expect(actualTip.distanceTo(pivot.clone().add(offset))).toBeLessThan(1e-12);
    const relativeBefore=bladeOrientation.clone().invert().multiply(handleOrientation),relativeAfter=blade.orientation.clone().invert().multiply(handle.orientation);
    expect(relativeAfter.angleTo(relativeBefore)).toBeLessThan(1e-7);
    expect(bladePosition.toArray()).toEqual([0,1.5,-.24]);expect(handlePosition.toArray()).toEqual([.32,1.5,-.24]);
  });
});
