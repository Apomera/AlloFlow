import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let P;beforeAll(()=>{resetStemLab();loadTool(process.env.MM_SOURCE||'stem_lab/stem_tool_moonmission.js','moonMission');P=window.MoonMissionPure;});
const ctx=()=>new Proxy({}, {get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
describe('physical lunar approach drawing',()=>{
  it.each(['whole','local'])('%s camera has equal axes and a physically curved lunar limb',view=>{const p=P.approachProfile(),s=P.approachSample(p,400);for(const width of [280,1000]){const g=P.drawApproachScene(ctx(),width,360,s,p,{view});expect(g.scaleX).toBe(g.scaleY);expect(g.moonRadius).toBeCloseTo(P.approachPhysics.radius*g.scaleX,10);expect(Math.hypot(g.craftX-g.moonX,g.craftY-g.moonY)).toBeCloseTo(s.radius*g.scaleX,8);expect(g.plume).toBe(true);}});
  it('camera, resized viewport and thrust glyph preserve measured state',()=>{const p=P.approachProfile(),s=P.approachSample(p,0),before=JSON.stringify(s);for(const view of ['whole','local'])for(const width of [280,1000]){const g=P.drawApproachScene(ctx(),width,360,s,p,{view});expect(g.plume).toBe(false);expect(JSON.stringify(s)).toBe(before);}const burn=P.approachSample(p,100),g=P.drawApproachScene(ctx(),500,360,burn,p,{view:'local'});expect(g.pitch).toBeCloseTo(burn.pitch,10);expect(g.pitch).toBeLessThan(0);});
});
