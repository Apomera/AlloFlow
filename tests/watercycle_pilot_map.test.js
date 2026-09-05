import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
for(const file of ['stem_lab/stem_tool_watercycle.js','desktop/web-app/public/stem_lab/stem_tool_watercycle.js']) {
 const source=readFileSync(file,'utf8'),host={};
 const start=source.indexOf('  var WC_PILOT_UNIT_M ='),end=source.indexOf('\n  };',source.indexOf('  window.WaterCyclePilotKernel = {'));
 new Function('window',source.slice(start,end+5))(host);const K=host.WaterCyclePilotKernel;
 describe(`landing map and orientation: ${file}`,()=>{
  it('projects the same world bounds and clamps markers inside the map',()=>{
   expect(K.mapPoint(0,0,192,8)).toEqual({x:96,y:96});
   expect(K.mapPoint(-330,-330,192,8)).toEqual({x:8,y:8});
   expect(K.mapPoint(330,330,192,8)).toEqual({x:184,y:184});
   expect(K.mapPoint(999,-999,192,8)).toEqual({x:184,y:8});
   expect(K.mapPoint(10,-10,192,8).x).toBeGreaterThan(96);
   expect(K.mapPoint(10,-10,192,8).y).toBeLessThan(96);
  });
  it('uses the same camera-relative axes as live movement',()=>{
   const position={x:0,z:0,altitudeM:100};
   for(const yaw of [-2.4,-1,0,0.8,Math.PI/2,Math.PI]) {
    const forward={x:-Math.sin(yaw)*100,z:-Math.cos(yaw)*100,altitudeM:100};
    const right={x:Math.cos(yaw)*100,z:-Math.sin(yaw)*100,altitudeM:100};
    expect(K.navigationCue(position,forward,yaw)).toBe('ahead');
    expect(K.navigationCue(position,{...forward,x:-forward.x,z:-forward.z},yaw)).toBe('behind');
    expect(K.navigationCue(position,right,yaw)).toBe('right');
    expect(K.navigationCue(position,{...right,x:-right.x,z:-right.z},yaw)).toBe('left');
   }
  });
  it('separates overhead, below, nearby, and missing destinations',()=>{
   const position={x:10,z:20,altitudeM:100};
   expect(K.navigationCue(position,{...position,altitudeM:200},0)).toBe('above');
   expect(K.navigationCue(position,{...position,altitudeM:0},0)).toBe('below');
   expect(K.navigationCue(position,{...position,x:12},0)).toBe('here');
   expect(K.navigationCue(position,null,0)).toBe('');
  });
 });
}
