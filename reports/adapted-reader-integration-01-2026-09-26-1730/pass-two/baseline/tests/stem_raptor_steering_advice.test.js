import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
const start=source.indexOf('function targetSteeringCorrection('),end=source.indexOf('\n        function ',start+1);
const correct=Function(source.slice(start,end)+'\nreturn targetSteeringCorrection;')();
const bearing=(yaw,pitch,distance=20)=>[Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,-Math.cos(yaw)*Math.cos(pitch)*distance];
describe('Raptor steering advice',()=>{
  it('distinguishes left, right, up and down in the bird’s heading frame',()=>{
    for(const yaw of [0,1.2,-2.8,Math.PI*8]){
      expect(correct(...bearing(yaw+.9,0),yaw,0,null)).toBe('turnRight');
      expect(correct(...bearing(yaw-.9,0),yaw,0,null)).toBe('turnLeft');
      expect(correct(...bearing(yaw,.9),yaw,0,null)).toBe('pitchUp');
      expect(correct(...bearing(yaw,-.9),yaw,0,null)).toBe('pitchDown');
    }
  });
  it('uses relative pitch even when prey is above the bird',()=>{
    expect(correct(...bearing(0,.2),0,.9,null)).toBe('pitchDown');
    expect(correct(...bearing(0,-.2),0,-.9,null)).toBe('pitchUp');
  });
  it('keeps a stable axis near a diagonal, but switches for a larger correction',()=>{
    expect(correct(...bearing(.8,.85),0,0,'turnRight')).toBe('turnRight');
    expect(correct(...bearing(.85,.8),0,0,'pitchUp')).toBe('pitchUp');
    expect(correct(...bearing(.7,1),0,0,'turnRight')).toBe('pitchUp');
    expect(correct(...bearing(1,.7),0,0,'pitchUp')).toBe('turnRight');
    expect(correct(...bearing(-.8,.85),0,0,'turnRight')).toBe('turnLeft');
  });
  it('has a neutral zone and handles coincident or directly vertical prey',()=>{
    expect(correct(...bearing(.01,.01),0,0,'pitchUp')).toBeNull();
    expect(correct(0,0,0,2,1,null)).toBeNull();
    expect(correct(0,10,0,2,0,null)).toBe('pitchUp');
    expect(correct(0,-10,0,2,0,null)).toBe('pitchDown');
  });
});
