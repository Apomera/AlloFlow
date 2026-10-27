import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {node,freshTool,mountState,unmountState,renderState,change} from './helpers/weldlab_interaction_mount.js';

beforeEach(()=>{
 vi.spyOn(window,'requestAnimationFrame').mockReturnValue(1);
 vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
 freshTool();
});
afterEach(async()=>{await unmountState();vi.restoreAllMocks();});
const base={view:'beadLab',bl_view:'topdown',arc_handsOn:false,bl_V:22,bl_A:180,bl_TS:12,bl_process:'mig',bl_material:'steel',bl_thickness:.25,car2_reflect:'Keep my notes.',weldBadges:{ppeSafety:true},arc_missions:{1:{done:true}}};
const pin={V:22,A:180,TS:24,P:'mig',M:'steel',TH:.5,run:[]};
const cases=[
 {name:'ordinary section',state:base},
 {name:'narrow fusion section',state:{...base,bl_TS:24,bl_thickness:.5}},
 {name:'overlap section',state:{...base,bl_A:80,bl_TS:3,bl_thickness:.5}},
 {name:'burnthrough section',state:{...base,bl_V:40,bl_A:350,bl_TS:3,bl_thickness:.075}}
];
const luminance=c=>c.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
const n=(el,attr)=>Number(el.getAttribute(attr));
function report(settings){return window.__WeldLabCore.arc.beadReport(settings.bl_V,settings.bl_A,settings.bl_TS,settings.bl_process,settings.bl_material,settings.bl_thickness,null);}
function pair(plot,name,width,color,dash){
 const core=plot.querySelector('[data-arc-xs-'+name+']'),edge=plot.querySelector('[data-arc-xs-'+name+'-outline]');
 expect(core).toBeTruthy();expect(edge).toBeTruthy();expect(core.previousElementSibling).toBe(edge);
 expect(core.getAttribute('stroke')).toBe(color);expect(n(core,'stroke-width')).toBe(width);expect(n(edge,'stroke-width')).toBe(width+3);
 expect(core.getAttribute('stroke-dasharray')).toBe(dash);expect(edge.getAttribute('stroke-dasharray')).toBe(dash);
 if(core.tagName.toLowerCase()==='path'){expect(core.getAttribute('fill')).toBe('none');expect(edge.getAttribute('fill')).toBe('none');expect(edge.getAttribute('d')).toBe(core.getAttribute('d'));}
 else for(const attr of ['x1','x2','y1','y2'])expect(n(edge,attr)).toBe(n(core,attr));
 expect(ratio(core.getAttribute('stroke'),edge.getAttribute('stroke'))).toBeGreaterThanOrEqual(3);
 // The edge separates light/mid-tone metal; the unchanged bright core separates dark canvas.
 for(const ground of ['#c3cad2','#8f99a5','#5b6573','#6b7480'])expect(ratio(edge.getAttribute('stroke'),ground)).toBeGreaterThanOrEqual(3);
 expect(ratio(core.getAttribute('stroke'),'#0f172a')).toBeGreaterThanOrEqual(3);
 return core;
}
function verify(host,settings){
 const plot=host.querySelector('[data-arc-xs]'),model=report(settings),w=model.width*200,rf=model.reinf*200,by=105+model.TH*200;
 const fused=w*(1-.8*model.defects.lackOfFusion)*(1-.35*model.defects.overlap),target=pair(plot,'target',1.5,'#fbbf24','6 4');
 expect([n(target,'x1'),n(target,'x2'),n(target,'y1'),n(target,'y2')]).toEqual([20,460,105+.7*model.TH*200,105+.7*model.TH*200]);
 const ghost=pair(plot,'ghost',1.6,'#38bdf8','5 4'),p=settings.arc_pin,pinned=window.__WeldLabCore.arc.beadReport(p.V,p.A,p.TS,p.P,p.M,p.TH,null),gw=pinned.width*200,gr=pinned.reinf*200,gp=Math.min(pinned.penetration,model.TH)*200;
 expect(ghost.getAttribute('d')).toBe('M'+(240-gw/2)+' 105 Q240 '+(105-2*gr)+' '+(240+gw/2)+' 105 A'+(gw/2)+' '+Math.max(1,gp)+' 0 0 1 '+(240-gw/2)+' 105');
 expect(Boolean(plot.querySelector('[data-arc-xs-unfused]'))).toBe(fused<w-1);
 if(fused<w-1){const unfused=pair(plot,'unfused',3,'#f87171','4 3');expect(unfused.getAttribute('d')).toBe('M'+(240-w/2)+' 106 L'+(240-fused/2)+' 106 M'+(240+fused/2)+' 106 L'+(240+w/2)+' 106');}
 const def=model.defects,burned=def.burnthrough>=window.__WeldLabCore.arc.REJECT_AT;
 const hasDefect=burned||def.lackOfFusion>0||def.undercut>0||def.overlap>0||def.porosity>0;
 const leaders=[...plot.querySelectorAll('[data-arc-xs-leader]')];expect(leaders).toHaveLength(hasDefect?6:5);
 for(const leader of leaders){
  const id=leader.dataset.arcXsLeader,edge=plot.querySelector('[data-arc-xs-leader-outline="'+id+'"]');expect(leader.previousElementSibling).toBe(edge);expect(n(leader,'stroke-width')).toBe(1);expect(n(edge,'stroke-width')).toBe(4);
  for(const attr of ['x1','x2','y1','y2']){expect(Number.isFinite(n(leader,attr))).toBe(true);expect(n(edge,attr)).toBe(n(leader,attr));}
  expect(leader.nextElementSibling.tagName.toLowerCase()).toBe('circle');expect(leader.nextElementSibling.nextElementSibling.textContent).toBe(id);
  expect(ratio(leader.getAttribute('stroke'),edge.getAttribute('stroke'))).toBeGreaterThanOrEqual(3);
 }
 const fourth=plot.querySelector('[data-arc-xs-leader="4"]');expect([n(fourth,'x1'),n(fourth,'y1'),n(fourth,'x2'),n(fourth,'y2')]).toEqual([32,105+.7*model.TH*200-14,48,105+.7*model.TH*200]);
 const top=Math.max(0,Math.floor(Math.min(105-2*rf,105-2*pinned.reinf*200)-34));expect(plot.getAttribute('viewBox')).toBe('0 '+top+' 480 '+(Math.ceil(by+50)-top));
 expect(plot.getAttribute('aria-label')).toContain('Penetration '+model.penetration.toFixed(3)+' inches');
 expect(host.textContent).toContain('Dashed amber line = the 70% target.');expect(host.textContent).toContain('Dashed blue outline = your pinned bead.');
 if(def.lackOfFusion>0&&!burned)expect(host.textContent).toContain('red dashes = crown resting on the plate without fusing.');
 return plot;
}
describe('Bead Lab macro-etch annotation contrast',()=>{
 for(const contrast of [false,true])it.each(cases)('preserves $name geometry and legend while separating annotations (contrast='+contrast+')',({state})=>{
  const settings={...state,arc_pin:pin},host=renderState(settings,contrast);verify(host,settings);
 });
 it.each([false,true])('does not introduce a pinned outline when no bead is pinned, contrast=%s',contrast=>{
  const host=renderState(base,contrast),plot=host.querySelector('[data-arc-xs]');expect(plot.querySelector('[data-arc-xs-ghost]')).toBeNull();expect(plot.querySelector('[data-arc-xs-ghost-outline]')).toBeNull();pair(plot,'target',1.5,'#fbbf24','6 4');
 });
 it.each([false,true])('keeps native settings focus and saved work while rendering changed annotations, contrast=%s',async contrast=>{
  const settings={...base,arc_pin:pin,bl_thickness:.5},app=await mountState(settings,contrast),saved=structuredClone(app.latest());
  // Selecting a new speed is an existing explicit settings write; annotation rendering adds none.
  const slider=[...node().querySelectorAll('input[type="range"]')].find(el=>el.getAttribute('aria-label')==='Travel Speed');expect(slider).toBeTruthy();slider.focus();await change(slider,'24');expect(document.activeElement).toBe(slider);
  expect(app.latest()).toEqual({...saved,bl_TS:24});expect(app.writes).toEqual([['bl_TS',24]]);verify(node(),{...settings,bl_TS:24});
 });
});
