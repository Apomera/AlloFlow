import {beforeEach,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
it('keeps foot centres level in stance and raises them only during swing',()=>{
  for(const id of ['foxes','rabbits','voles']){
    let grounded=0,raised=0,maxLift=0,maxError=0,maxAngle=0;
    for(let sample=0;sample<1000;sample++){
      const p={distance:sample/1000*Math.PI*2/28,phase:0,stride:1,pounce:0};
      const foot=api.footPose(id,p,true,1),x=id==='foxes'?.056:0,length=id==='foxes'?.38:.1;
      const centreHeight=foot.height+x*Math.sin(foot.angle)+length*(1-Math.cos(foot.angle));
      maxError=Math.max(maxError,Math.abs(centreHeight-foot.lift));maxAngle=Math.max(maxAngle,Math.abs(foot.angle));maxLift=Math.max(maxLift,foot.lift);
      if(!foot.swing){grounded++;expect(foot.lift).toBe(0);}else if(foot.lift>.001)raised++;
      expect(Object.values(foot).filter(v=>typeof v==='number').every(Number.isFinite)).toBe(true);
      expect(foot.lift).toBeGreaterThanOrEqual(0);
    }
    expect(grounded).toBeGreaterThan(550);expect(raised).toBeGreaterThan(250);expect(maxError).toBeLessThan(1e-12);expect(maxLift).toBeGreaterThan(.039);expect(maxLift).toBeLessThanOrEqual(.075);expect(maxAngle).toBeLessThanOrEqual(.26);
  }
});
it('coordinates paired rabbit feet, diagonal fox/vole feet, and preserves fox leap extension',()=>{
  const p={distance:0,phase:4.8,stride:1,pounce:0};
  for(const id of ['foxes','rabbits','voles']){
    const a=api.footPose(id,p,true,1),b=api.footPose(id,p,true,-1),c=api.footPose(id,p,false,-1);
    if(id==='rabbits'){expect(a).toEqual(b);expect(a.swing).not.toBe(c.swing);}else{expect(a).toEqual(c);expect(a.swing).not.toBe(b.swing);}
    const rest=api.footPose(id,{...p,stride:0},true,1);expect(rest.angle).toBe(0);expect(rest.height).toBe(0);expect(rest.lift).toBe(0);
  }
  expect(api.footPose('foxes',{...p,pounce:1},true,1)).toMatchObject({angle:-.75,height:0,lift:0});
  expect(api.footPose('foxes',{...p,pounce:1},false,1)).toMatchObject({angle:.95,height:0,lift:0});
  for(const phase of [0,.58*Math.PI*2,.64*Math.PI*2,2*Math.PI]){
    const left=api.footPose('foxes',{...p,phase:phase-1e-7},true,1),right=api.footPose('foxes',{...p,phase:phase+1e-7},true,1);
    expect(Math.abs(left.angle-right.angle)).toBeLessThan(1e-6);expect(Math.abs(left.height-right.height)).toBeLessThan(1e-6);
  }
});
it('eases starts and stops, settles absent mammals and reconstructs poses without altering model rows',()=>{
  const c={event:'remove',target:'foxes'},rows=api.compare(c).experiment,before=JSON.stringify(rows),frames=api.behaviorTimeline(c,rows);
  let stopping=false,settled=false,maxDelta=0;
  for(const id of ['foxes','rabbits','voles'])for(let i=0;i<16;i++)for(let step=1;step<frames.length;step++){
    const p=frames[step][id][i],old=frames[step-1][id][i];
    maxDelta=Math.max(maxDelta,Math.abs(p.stride-old.stride));
    if(p.active&&p.moving===0&&old.stride>.2){stopping=true;expect(p.stride).toBeGreaterThan(0);expect(p.stride).toBeLessThan(old.stride);}
    if(p.active&&p.moving===0&&p.stride===0)settled=true;
  }
  expect(stopping&&settled).toBe(true);expect(maxDelta).toBeLessThanOrEqual(.2+1e-12);
  expect(frames[0].rabbits.every(p=>p.stride===0)).toBe(true);expect(frames[100].foxes.every(p=>!p.active&&p.stride===0)).toBe(true);
  expect(frames).toEqual(api.behaviorTimeline(c,rows));expect(JSON.stringify(rows)).toBe(before);
});
