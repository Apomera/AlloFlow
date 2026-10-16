import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function pulsarTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-pulsar') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderPS(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showPulsar: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-ps-test-callback': id }, ...children);
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    writes = 0;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      store.dirty = false; callbacks = new Map();
      const ctx = makeCtx({ React: callbackReact, t: (key, fallback) => {
        const world = ['Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].find(w => key === 'stem.solar_sys.' + w.toLowerCase());
        return world || fallback || key;
      } }, store), original = ctx.setToolData;
      ctx.setToolData = updater => { writes++; original(updater); };
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => pulsarTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-pulsar'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.psTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

const metric=(s,key)=>Number(s.querySelector('[data-ps-metric='+key+']').dataset.value),rad=Math.PI/180;
// Independent vector angle via atan2(|cross|,dot), avoiding acos and the scalar pulse-width formula.
function reference(tilt,view,phase){const a=tilt*rad,z=view*rad,p=phase*rad,m=[Math.sin(a)*Math.cos(p),Math.sin(a)*Math.sin(p),Math.cos(a)],n=[Math.sin(z),0,Math.cos(z)],cross=[m[1]*n[2],m[2]*n[0]-m[0]*n[2],-m[1]*n[0]],dot=m[0]*n[0]+m[2]*n[2],angle=Math.atan2(Math.hypot(...cross),dot)/rad;return{m,n,angle};}
const configurations=[[30,30,10],[30,60,10],[30,150,10],[90,90,10],[0,0,10],[0,30,10],[0,10,10],[30,40,10],[80,90,10],[5,5,10],[60,120,30],[90,5,5]];
describe('Pulsar antipodal cone geometry and rotation visibility',()=>{
 beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_solarsystem.js','solarSystem');vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('requestAnimationFrame',()=>1);vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);});
 afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';});
 it.each(configurations.flatMap(c=>[0,90,180,270,360].map(p=>[...c,p])))('matches independent 3D vectors at tilt%s view%s cone%s phase%s',(pulsarTilt,pulsarView,pulsarCone,pulsarSpin)=>{
  const env=renderPS({pulsarTilt,pulsarView,pulsarCone,pulsarSpin}),s=env.section,ref=reference(pulsarTilt,pulsarView,pulsarSpin);expect(Math.abs(metric(s,'angleOne')-ref.angle)).toBeLessThan(2e-6);expect(metric(s,'angleOne')+metric(s,'angleTwo')).toBeCloseTo(180,12);expect(s.dataset.psSeenOne).toBe(String(ref.angle<=pulsarCone+1e-9));expect(s.dataset.psSeenTwo).toBe(String(180-ref.angle<=pulsarCone+1e-9));
  for(const[index,sign]of[[1,1],[2,-1]]){const tip=s.querySelector('[data-ps-tip="'+index+'"]'),axis=s.querySelector('[data-ps-beam-axis="'+index+'"]');expect(+tip.getAttribute('cx')).toBeCloseTo(310+sign*140*ref.m[0],10);expect(+tip.getAttribute('cy')).toBeCloseTo(200-sign*140*ref.m[2],10);expect(axis.getAttribute('stroke-dasharray')).toBe(sign*ref.m[1]<-1e-12?'5 4':null);const mark=s.querySelector('[data-ps-chart-dot="'+index+'"]');expect(+mark.getAttribute('cx')).toBeCloseTo(20+580*pulsarSpin/360,10);expect(+mark.getAttribute('cy')).toBeCloseTo(274-metric(s,index===1?'angleOne':'angleTwo')/180*248,10);}
  const observer=s.querySelector('[data-ps-observer]');expect(+observer.getAttribute('cx')).toBeCloseTo(310+140*ref.n[0],10);expect(+observer.getAttribute('cy')).toBeCloseTo(200-140*ref.n[2],10);expect(metric(s,'coverage')).toBeGreaterThanOrEqual(0);expect(metric(s,'coverage')).toBeLessThanOrEqual(100);expect(env.writes).toBe(0);expect(s.innerHTML).not.toMatch(/NaN|Infinity/);
 });
 it.each(configurations)('matches independently sampled coverage at tilt%s view%s cone%s',(pulsarTilt,pulsarView,pulsarCone)=>{const s=renderPS({pulsarTilt,pulsarView,pulsarCone}).section,N=72000;let count=0;for(let i=0;i<N;i++){const a=reference(pulsarTilt,pulsarView,(i+.5)/N*360).angle;if(Math.min(a,180-a)<=pulsarCone+1e-10)count++;}expect(Math.abs(metric(s,'coverage')-count/N*100)).toBeLessThan(.004);const windows=[...s.querySelectorAll('[data-ps-window]')];expect(windows.reduce((sum,e)=>sum+(+e.dataset.end-+e.dataset.start)/360*100,0)).toBeCloseTo(metric(s,'coverage'),10);for(const e of windows){expect(+e.getAttribute('x')).toBeCloseTo(20+580*(+e.dataset.start)/360,10);expect(+e.getAttribute('width')).toBeCloseTo(580*(+e.dataset.end-+e.dataset.start)/360,10);}});
 it.each([[30,30,10,11.1539925],[30,150,10,11.1539925],[90,90,10,100/9],[0,0,10,100],[0,30,10,0],[0,10,10,100],[30,40,10,0],[80,90,10,0],[5,5,10,100]])('resolves reference duty case %s,%s,%s',(pulsarTilt,pulsarView,pulsarCone,expected)=>{expect(metric(renderPS({pulsarTilt,pulsarView,pulsarCone}).section,'coverage')).toBeCloseTo(expected,5);});
 it('rotates the beams while preserving the observer and full-cycle coverage',()=>{const env=renderPS(),s=env.section,first=s.querySelector('[data-ps-rim="1"]').getAttribute('d'),observer=s.querySelector('[data-ps-observer]').outerHTML,coverage=metric(s,'coverage');env.invoke('#solar-ps-pulsarSpin',90);expect(env.section.querySelector('[data-ps-rim="1"]').getAttribute('d')).not.toBe(first);expect(metric(env.section,'coverage')).toBe(coverage);expect(env.section.querySelector('[data-ps-observer]').getAttribute('cx')).toBe(s.querySelector('[data-ps-observer]').getAttribute('cx'));env.invoke('#solar-ps-pulsarSpin',360);expect(env.section.querySelector('[data-ps-observer]').outerHTML).toBe(observer);expect(metric(env.section,'angleOne')).toBeCloseTo(metric(s,'angleOne'),8);});
 it('does not confuse overlapping projections with true alignment',()=>{const env=renderPS({pulsarTilt:90,pulsarView:0,pulsarSpin:90,pulsarCone:10});expect(metric(env.section,'angleOne')).toBeCloseTo(90,10);expect(env.section.dataset.psSeenOne).toBe('false');expect(env.section.dataset.psSeenTwo).toBe('false');const rim=[...env.section.querySelector('[data-ps-rim="1"]').getAttribute('d').matchAll(/[ML]([\d.e+-]+) ([\d.e+-]+)/g)].map(m=>[+m[1],+m[2]]);for(const[x,y]of rim)expect(Math.hypot(x-310,y-200)).toBeCloseTo(140*Math.sin(10*rad),10);});
 it('includes exact contact samples in both angular curves',()=>{const s=renderPS().section,half=+s.querySelector('[data-ps-half-one]').dataset.psHalfOne;for(const index of[1,2]){const points=[...s.querySelector('[data-ps-curve="'+index+'"]').getAttribute('d').matchAll(/[ML]([\d.e+-]+) ([\d.e+-]+)/g)].map(m=>[+m[1],+m[2]]);expect(points.some(([x])=>Math.abs(x-(20+half/360*580))<1e-9)).toBe(true);for(const[x,y]of points){const angle=reference(30,30,(x-20)/580*360).angle;expect(Math.abs(y-(274-(index===1?angle:180-angle)/180*248))).toBeLessThan(.00001);}}});
 it.each([[{},0,30,30,10],[{pulsarSpin:NaN,pulsarTilt:Infinity,pulsarView:'30',pulsarCone:null},0,30,30,10],[{pulsarSpin:-1,pulsarTilt:-1,pulsarView:-1,pulsarCone:-1},0,0,0,5],[{pulsarSpin:1000,pulsarTilt:1000,pulsarView:1000,pulsarCone:1000},360,90,180,30],[{pulsarSpin:89.7,pulsarTilt:30.2,pulsarView:40.7,pulsarCone:10.2},90,30,41,10]])('normalizes restored state without writes %j',(seed,phase,tilt,view,cone)=>{const env=renderPS(seed);expect([+env.section.dataset.psPhase,+env.section.dataset.psTilt,+env.section.dataset.psView,+env.section.dataset.psCone]).toEqual([phase,tilt,view,cone]);expect(env.writes).toBe(0);for(const[key,value]of Object.entries(seed))expect(env.state[key]).toEqual(value);});
 it('preserves saved work through every preset and disclosure',()=>{const saved={researchPoints:350,totalRP:500,transPhase:8.33,transImpact:1,issOrbit:180,issAltitudeKm:400,issBetaDeg:30,journalEntries:[{observation:'Saved evidence'}],missionLog:[{text:'Keep'}]};const env=renderPS(saved);for(const key of['pulsarSpin','pulsarTilt','pulsarView','pulsarCone'])for(const button of [...env.section.querySelectorAll('[data-ps-preset='+key+']')]){const value=+button.dataset.value;env.invoke('[data-ps-preset='+key+'][data-value="'+value+'"]');expect(env.state[key]).toBe(value);expect(env.section.querySelector('[data-ps-preset='+key+'][data-value="'+value+'"]').getAttribute('aria-pressed')).toBe('true');}const before=structuredClone(env.state);env.invoke('[aria-controls=solar-ps-content]');expect(env.section.querySelector('#solar-ps-content').hidden).toBe(true);expect(env.section.querySelectorAll('svg')).toHaveLength(0);env.invoke('[aria-controls=solar-ps-content]');expect(env.state).toEqual(before);for(const[key,value]of Object.entries(saved))expect(env.state[key]).toEqual(value);});
 it('labels diagrams and states the model limitations',()=>{const env=renderPS(),s=env.section,before=s.innerHTML;env.render();expect(env.section.innerHTML).toBe(before);for(const key of['pulsarSpin','pulsarTilt','pulsarView','pulsarCone']){expect(s.querySelector('label[for=solar-ps-'+key+']')).toBeTruthy();expect(s.querySelector('#solar-ps-'+key).getAttribute('aria-valuetext')).toBeTruthy();}for(const svg of s.querySelectorAll('svg'))for(const a of['aria-labelledby','aria-describedby'])for(const id of svg.getAttribute(a).split(' '))expect(document.getElementById(id)).toBeTruthy();expect(s.querySelectorAll('svg text')).toHaveLength(0);const ids=[...s.querySelectorAll('[id]')].map(el=>el.id);expect(new Set(ids).size).toBe(ids.length);for(const text of['sphere of directions','projected overlap alone does not mean visibility','filled circular cones','hollow cones','not a prediction of brightness','zero magnetic tilt','isolated touch contributes no rotation time'])expect(s.textContent).toContain(text);});
});
