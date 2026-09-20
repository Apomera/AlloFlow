import {beforeEach,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
it('keeps ear motion bounded and gradual, with asymmetric attention and relaxed rest poses',()=>{
  const c={event:'none'},frames=api.behaviorTimeline(c,api.compare(c).baseline);let asymmetric=false,resting=false;
  for(const id of ['foxes','rabbits','voles'])for(let i=0;i<16;i++)for(let step=0;step<frames.length;step++){
    const p=frames[step][id][i],old=frames[Math.max(0,step-1)][id][i];
    for(const key of ['earLeft','earRight','earTilt'])expect(Number.isFinite(p[key])).toBe(true);
    expect(Math.abs(p.earLeft)).toBeLessThanOrEqual(.64+1e-12);expect(Math.abs(p.earRight)).toBeLessThanOrEqual(.64+1e-12);expect(p.earTilt).toBeGreaterThanOrEqual(-.035-1e-12);expect(p.earTilt).toBeLessThanOrEqual(.38+1e-12);
    expect(Math.abs(p.earLeft-old.earLeft)).toBeLessThanOrEqual(.065+1e-12);expect(Math.abs(p.earRight-old.earRight)).toBeLessThanOrEqual(.065+1e-12);expect(Math.abs(p.earTilt-old.earTilt)).toBeLessThanOrEqual(.035+1e-12);
    if(step===0)expect([p.earLeft,p.earRight,p.earTilt]).toEqual([0,0,0]);
    if(p.active&&['Alert','Listening','Tracking prey'].includes(p.state))asymmetric ||= Math.abs(p.earLeft-p.earRight)>.03;
    if(p.active&&p.state==='Resting'&&p.rest>.8)resting ||= p.earTilt>.12;
  }
  expect(asymmetric&&resting).toBe(true);
});
it('settles absent animals, preserves the model and reconstructs the same ear poses on rewind',()=>{
  const c={event:'remove',target:'foxes'},pair=api.compare(c),before=JSON.stringify(pair),a=api.behaviorTimeline(c,pair.experiment),b=api.behaviorTimeline(c,pair.experiment);
  expect(a).toEqual(b);expect(JSON.stringify(pair)).toBe(before);expect(a[100].foxes.every(p=>!p.active&&p.earLeft===0&&p.earRight===0&&p.earTilt===0)).toBe(true);
  expect(a.every(f=>f.owls.every(p=>p.earLeft===0&&p.earRight===0&&p.earTilt===0))).toBe(true);
});
