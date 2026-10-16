import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function magnetTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-magnetosphere') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderMG(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showMag: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-mg-test-callback': id }, ...children);
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
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => magnetTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-magnetosphere'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.mgTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

const metric=(s,key)=>{const value=s.querySelector('[data-mg-metric='+key+']').dataset.value;return value==='none'?null:+value;};
const points=d=>[...d.matchAll(/([ML])([\d.e+-]+) ([\d.e+-]+)/g)].map(m=>({x:+m[2],y:+m[3]}));
describe('Magnetosphere pressure balance and intrinsic dipole geometry',()=>{
 beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_solarsystem.js','solarSystem');vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('requestAnimationFrame',()=>1);vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);});
 afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';});
 it.each([0,1,25,50,75,100].flatMap(m=>[0,1,25,50,75,100].map(p=>[m,p])))('balances moment control %s against pressure control %s',(magStr,magSolar)=>{
  const env=renderMG({magStr,magSolar}),s=env.section,M=magStr/50,P=magSolar/50,finite=M>0&&P>0,r=finite?10*Math.cbrt(M)/Math.pow(P,1/6):null;
  expect(+s.dataset.mgMoment).toBe(M);expect(+s.dataset.mgPressure).toBe(P);expect(metric(s,'field')).toBe(M/8);expect(s.querySelectorAll('[data-mg-wind-arrow]')).toHaveLength(P>0?5:0);expect(s.querySelectorAll('[data-mg-line]')).toHaveLength(M>0?8:0);expect(!!s.querySelector('[data-mg-vector]')).toBe(M>0);expect(!!s.querySelector('[data-mg-curve]')).toBe(M>0);
  const nose=s.querySelector('[data-mg-nose]'),dot=s.querySelector('[data-mg-chart-dot]');expect(!!nose).toBe(finite);expect(!!dot).toBe(finite);expect(!!s.querySelector('[data-mg-boundary]')).toBe(finite);
  if(finite){expect(metric(s,'distance')).toBeCloseTo(r,11);expect(metric(s,'ratio')).toBeCloseTo(r/10,12);expect(+nose.getAttribute('cx')).toBeCloseTo(190+14*r,10);expect(+nose.getAttribute('cy')).toBe(200);expect(+dot.getAttribute('cx')).toBeCloseTo(20+290*P,10);expect(+dot.getAttribute('cy')).toBeCloseTo(274-r/26*248,10);expect(s.querySelector('[data-mg-boundary]').getAttribute('d')).toContain((190+14*(10*Math.pow(M*M/P,1/6)))+' 200');}else {expect(metric(s,'distance')).toBeNull();expect(metric(s,'ratio')).toBeNull();}
  for(const arrow of s.querySelectorAll('[data-mg-wind-arrow]')){const line=arrow.querySelector('line');expect(+line.getAttribute('x1')).toBe(600);expect(+line.getAttribute('x2')).toBeCloseTo((finite?190+14*r:220)+18,10);expect(+line.getAttribute('x1')).toBeGreaterThan(+line.getAttribute('x2'));}
  if(M>0){const vector=s.querySelector('[data-mg-vector] line');expect(['x1','x2','y1','y2'].map(k=>+vector.getAttribute(k))).toEqual([394,394,200,200+48*M]);}
  if(finite){const n=s.querySelector('[data-mg-boundary]').getAttribute('d').match(/[-+]?[0-9]*\.?[0-9]+(?:e[-+]?[0-9]+)?/g).map(Number);for(const start of[0,6])for(let i=0;i<=100;i++){const t=i/100,u=1-t,x=u**3*n[start]+3*u*u*t*n[start+2]+3*u*t*t*n[start+4]+t**3*n[start+6],y=u**3*n[start+1]+3*u*u*t*n[start+3]+3*u*t*t*n[start+5]+t**3*n[start+7];expect(Math.hypot(x-190,y-200)).toBeGreaterThan(15);expect(x).toBeGreaterThan(0);expect(x).toBeLessThan(620);expect(y).toBeGreaterThan(0);expect(y).toBeLessThan(400);}}expect(+s.querySelector('[data-mg-planet=overview] circle').getAttribute('r')).toBe(14);expect(+s.querySelector('[data-mg-planet=dipole] circle').getAttribute('r')).toBe(42);expect(s.innerHTML).not.toMatch(/NaN|Infinity/);expect(env.writes).toBe(0);
 });
 it.each([[50,50,10],[100,50,12.59921049895],[50,100,8.90898718140],[25,50,7.93700525984],[50,25,11.22462048309],[100,100,11.22462048309],[1,100,2.41827117512],[100,1,24.18271175122]])('matches independent pressure-balance checkpoints %s, %s',(magStr,magSolar,distance)=>{expect(metric(renderMG({magStr,magSolar}).section,'distance')).toBeCloseTo(distance,9);});
 it('keeps vacuum field geometry independent of nonzero magnitude and external wind',()=>{const env=renderMG(),paths=()=>[...env.section.querySelectorAll('[data-mg-line]')].map(p=>p.outerHTML),before=paths();env.invoke('#solar-mg-magStr',100);expect(paths()).toEqual(before);const field=env.section.querySelector('[data-mg-dipole]').outerHTML;env.invoke('#solar-mg-magSolar',1);expect(env.section.querySelector('[data-mg-dipole]').outerHTML).toBe(field);});
 it('traces analytic dipole lines from one surface endpoint to the other',()=>{const s=renderMG().section;for(const line of s.querySelectorAll('[data-mg-line]')){const L=+line.dataset.mgLine,sign=+line.dataset.sign,ps=points(line.getAttribute('d'));expect(ps).toHaveLength(81);for(const [i,p]of ps.entries()){const x=(p.x-310)/42,z=(200-p.y)/42,r=Math.hypot(x,z);expect(r).toBeGreaterThanOrEqual(1-1e-12);expect(r).toBeCloseTo(L*(1-(z/r)**2),11);expect(Math.sign(x)).toBe(sign);if(i===0||i===80)expect(r).toBeCloseTo(1,12);if(i===40){expect(x).toBeCloseTo(sign*L,12);expect(z).toBeCloseTo(0,12);}}}});
 it('clips the pressure curve at its exact upper-range crossing without a false zero',()=>{for(const magStr of[1,25,50,100]){const s=renderMG({magStr}).section,M=magStr/50,curve=s.querySelector('[data-mg-curve]'),ps=points(curve.getAttribute('d')),cut=s.querySelector('[data-mg-continuation]'),p0=M*M*(10/26)**6;expect(+cut.dataset.pressure).toBeCloseTo(p0,14);expect(ps[0].x).toBeCloseTo(20+290*p0,10);expect(ps[0].y).toBeCloseTo(26,10);expect(ps.at(-1).x).toBe(600);for(const p of ps){const P=(p.x-20)/290,r=(274-p.y)/248*26;expect(P).toBeGreaterThan(0);expect(r**6*P).toBeCloseTo(1e6*M*M,4);expect(p.y).toBeGreaterThanOrEqual(26-1e-8);expect(p.y).toBeLessThan(274);}for(let i=1;i<ps.length;i++){const a=ps[i-1],b=ps[i],P=((a.x+b.x)/2-20)/290,actual=274-(10*Math.cbrt(M)/Math.pow(P,1/6))/26*248;expect(Math.abs((a.y+b.y)/2-actual)).toBeLessThan(.08);}expect(s.querySelector('[data-mg-chart]').textContent).not.toContain('Infinity');}});
 it('distinguishes both zero terms and keeps the intrinsic field at zero wind',()=>{const env=renderMG({magStr:0,magSolar:0});expect(env.section.querySelector('[data-mg-status]').textContent).toBe('No intrinsic dipole and no wind pressure');env.invoke('#solar-mg-magSolar',50);expect(env.section.querySelector('[data-mg-status]').textContent).toBe('No intrinsic dipole balance');env.invoke('#solar-mg-magSolar',0);env.invoke('#solar-mg-magStr',50);expect(env.section.querySelector('[data-mg-status]').textContent).toBe('No finite boundary in this model');expect(env.section.querySelectorAll('[data-mg-line]')).toHaveLength(8);});
 it.each([[{},50,50],[{magStr:NaN,magSolar:Infinity},50,50],[{magStr:'100',magSolar:null},50,50],[{magStr:-20,magSolar:-20},0,0],[{magStr:999,magSolar:999},100,100],[{magStr:49.6,magSolar:49.4},50,49]])('normalizes restored controls without writes %j',(seed,m,p)=>{const env=renderMG(seed);expect(+env.section.dataset.mgStrength).toBe(m);expect(+env.section.dataset.mgWind).toBe(p);expect(env.writes).toBe(0);for(const[key,value]of Object.entries(seed))expect(env.state[key]).toEqual(value);});
 it('preserves notes, rewards and other activity parameters through all controls',()=>{const saved={sunCycleYear:8.3,sunCycleLongitude:90,ringOpening:60,gravMass:123.4,researchPoints:350,totalRP:500,journalEntries:[{observation:'Keep evidence'}],missionLog:[{text:'Keep notes'}]},env=renderMG(saved);for(const key of['magStr','magSolar'])for(const b of [...env.section.querySelectorAll('[data-mg-preset='+key+']')]){const value=+b.dataset.value,selector='[data-mg-preset='+key+'][data-value="'+value+'"]';env.invoke(selector);expect(env.state[key]).toBe(value);expect(env.section.querySelector(selector).getAttribute('aria-pressed')).toBe('true');}const before=structuredClone(env.state);env.invoke('[aria-controls=solar-mg-content]');expect(env.section.querySelector('#solar-mg-content').hidden).toBe(true);expect(env.section.querySelectorAll('svg')).toHaveLength(0);env.invoke('[aria-controls=solar-mg-content]');expect(env.state).toEqual(before);for(const[key,value]of Object.entries(saved))expect(env.state[key]).toEqual(value);});
 it('provides consistent definitions, descriptions and explicit model limitations',()=>{const env=renderMG(),s=env.section,before=s.innerHTML;env.render();expect(env.section.innerHTML).toBe(before);for(const key of['magStr','magSolar']){expect(s.querySelector('label[for=solar-mg-'+key+']')).toBeTruthy();expect(s.querySelector('#solar-mg-'+key).getAttribute('aria-valuetext')).toContain('times reference');}for(const svg of s.querySelectorAll('svg'))for(const a of['aria-labelledby','aria-describedby'])for(const id of svg.getAttribute(a).split(' '))expect(document.getElementById(id)).toBeTruthy();for(const match of s.innerHTML.matchAll(/url\(#([^)]*)\)/g))expect(s.querySelector('#'+match[1])).toBeTruthy();const ids=[...s.querySelectorAll('[id]')].map(el=>el.id);expect(new Set(ids).size).toBe(ids.length);expect(s.querySelectorAll('svg text')).toHaveLength(0);for(const text of['chosen normalization','does not predict atmospheric loss','induced magnetic field','not calculated field lines','different distance scale'])expect(s.textContent).toContain(text);expect(s.textContent).not.toMatch(/No protection|atmosphere stripping|Mars lost both|protection percentage/);});
});
