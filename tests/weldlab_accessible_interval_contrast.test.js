import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {node,freshTool,mountState,unmountState,renderState,change} from './helpers/weldlab_interaction_mount.js';
beforeEach(()=>{vi.spyOn(window,'requestAnimationFrame').mockReturnValue(1);vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);freshTool();});
afterEach(async()=>{await unmountState();vi.restoreAllMocks();});
const state={view:'beadLab',bl_view:'topdown',arc_handsOn:true,arc_run:[6,12,24,40],arc_runHand:true,bl_V:22,bl_A:180,bl_TS:12,bl_process:'mig',bl_material:'steel',bl_thickness:.25,car2_reflect:'Keep my reflection.',weldBadges:{ppeSafety:true}};
const lum=c=>c.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
function verify(host,settings,speed,contrast){
 const plot=host.querySelector('[data-arc-interval-section]'),core=plot.querySelector('[data-arc-interval-unfused]'),edge=plot.querySelector('[data-arc-interval-unfused-outline]');
 const model=window.__WeldLabCore.arc.beadReport(settings.bl_V,settings.bl_A,speed,settings.bl_process,settings.bl_material,settings.bl_thickness,null);
 const w=model.width*200,fused=w*(1-.8*model.defects.lackOfFusion)*(1-.35*model.defects.overlap);
 expect(Boolean(core)).toBe(fused<w-1);expect(Boolean(edge)).toBe(Boolean(core));
 if(!core)return false;
 const path='M'+(240-w/2)+' 111 L'+(240-fused/2)+' 111 M'+(240+fused/2)+' 111 L'+(240+w/2)+' 111';
 expect(core.getAttribute('d')).toBe(path);expect(edge.getAttribute('d')).toBe(path);expect(core.previousElementSibling).toBe(edge);
 expect(core.getAttribute('stroke-width')).toBe('3');expect(edge.getAttribute('stroke-width')).toBe('5');
 for(const part of [core,edge]){expect(part.getAttribute('stroke-dasharray')).toBe('4 3');expect(part.getAttribute('fill')).toBe('none');}
 expect(core.getAttribute('stroke')).toBe(contrast?'#000000':'#0f172a');
 expect(ratio(core.getAttribute('stroke'),plot.querySelector('[data-arc-interval-plate]').getAttribute('fill'))).toBeGreaterThanOrEqual(3);
 expect(ratio(core.getAttribute('stroke'),edge.getAttribute('stroke'))).toBeGreaterThanOrEqual(3);
 for(const ground of ['#5b6573','#6b7480','#0f172a'])expect(ratio(edge.getAttribute('stroke'),ground)).toBeGreaterThanOrEqual(3);
 return true;
}
describe('Recorded interval unfused shoulder contrast',()=>{
 it.each([false,true])('preserves both pinned and current comparison shoulder paths, layer ordering and shared scale, contrast=%s',contrast=>{
  const settings={...state,arc_handsOn:false,bl_V:22,bl_A:80,bl_TS:3,bl_thickness:.5,arc_pin:{V:22,A:180,TS:40,P:'mig',M:'steel',TH:.5,run:[]}},host=renderState(settings,contrast);
  const plots=[...host.querySelectorAll('[data-arc-compare-specimen] svg')];expect(plots).toHaveLength(2);expect(plots[0].dataset.arcCompareScale).toBe(plots[1].dataset.arcCompareScale);
  for(const [index,plot] of plots.entries()){
   const report=window.__WeldLabCore.arc.beadReport(22,index===0?180:80,index===0?40:3,'mig','steel',.5,null),core=plot.querySelector('[data-arc-compare-unfused]'),edge=plot.querySelector('[data-arc-compare-unfused-outline]');
   expect(core).toBeTruthy();expect(edge).toBeTruthy();expect(core.previousElementSibling).toBe(edge);expect(core.getAttribute('d')).toBe(edge.getAttribute('d'));
   // Geometry can be inferred exactly from the original cap path rather than
   // the intentionally rounded scale data attribute.
   const crown=[...plot.querySelectorAll(':scope > path')].find(p=>p.getAttribute('fill')==='#6b7480'),numbers=crown.getAttribute('d').match(/-?[\d.]+/g).map(Number),x0=numbers[0],x1=numbers[4],width=x1-x0,fused=width*(1-.8*report.defects.lackOfFusion)*(1-.35*report.defects.overlap);
   const actual=core.getAttribute('d').match(/-?[\d.]+/g).map(Number),expected=[x0,226,178-fused/2,178+fused/2,226,x1];expect(actual).toHaveLength(expected.length);for(let i=0;i<actual.length;i++)expect(actual[i]).toBeCloseTo(expected[i],10);
   for(const part of [core,edge]){expect(part.getAttribute('stroke-dasharray')).toBe('4 3');expect(part.getAttribute('fill')).toBe('none');}
   expect(core.getAttribute('stroke-width')).toBe('3');expect(edge.getAttribute('stroke-width')).toBe('5');
   for(const ground of ['#c3cad2','#8f99a5',edge.getAttribute('stroke')])expect(ratio(core.getAttribute('stroke'),ground)).toBeGreaterThanOrEqual(3);
   expect(plot.getAttribute('aria-label')).toContain(index===0?'Pinned bead':'Now bead');
  }
 });
 it.each([false,true])('keeps the model shoulder geometry distinguishable on light steel and dark weld/opening ground, contrast=%s',contrast=>{
  let visible=0;
  for(const [v,a,speed,th]of [[10,50,40,.25],[40,350,2,.075],[22,180,12,.25],[22,180,24,.5]]){
   const settings={...state,bl_V:v,bl_A:a,bl_thickness:th,arc_run:[speed]},host=renderState(settings,contrast);
   if(verify(host,settings,speed,contrast))visible++;
  }
  expect(visible).toBeGreaterThan(0);
 });
 it.each([false,true])('preserves selected-interval native focus, readings, recorded pass and scoring while inspecting contrasting shoulders, contrast=%s',async contrast=>{
  const app=await mountState(state,contrast),before=structuredClone(app.latest());
  const select=node().querySelector('[data-arc-intervals] select');
  for(const index of [3,0,2,1]){
   select.focus();await change(select,String(index));expect(document.activeElement).toBe(select);verify(node(),state,state.arc_run[index],contrast);
   expect(Number(node().querySelector('[data-arc-interval-reading="speed"]').dataset.value)).toBe(state.arc_run[index]);
  }
  expect(app.latest()).toEqual(before);expect(app.writes).toHaveLength(0);
 });
});
