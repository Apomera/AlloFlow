import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function cycleTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-cycle-lab') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderCY(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showSunCycle: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-cy-test-callback': id }, ...children);
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
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => cycleTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-cycle-lab'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.cyTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

const metric=(s,key)=>+s.querySelector('[data-cy-metric='+key+']').dataset.value;
const points=path=>[...path.matchAll(/([ML])([\d.e+-]+) ([\d.e+-]+)/g)].map(m=>({op:m[1],x:+m[2],y:+m[3]}));
describe('Illustrative solar cycle and emergence latitude geometry',()=>{
 beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_solarsystem.js','solarSystem');vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('requestAnimationFrame',()=>1);vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);});
 afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';});
 it.each([0,.1,2.7,5.5,8.3,10.9,11].flatMap(t=>[0,90,180,270,360].map(r=>[t,r])))('projects representative surface patches at year %s and rotation %s',(sunCycleYear,sunCycleLongitude)=>{
  const env=renderCY({sunCycleYear,sunCycleLongitude}),s=env.section,p=sunCycleYear/11,activity=(1-Math.cos(2*Math.PI*p))*50,lat=30-25*p,width=8*Math.sin(Math.PI*p);expect(metric(s,'activity')).toBeCloseTo(activity,10);expect(metric(s,'latitude')).toBeCloseTo(lat,10);expect(+s.dataset.cyWidth).toBeCloseTo(width,10);expect(metric(s,'year')).toBe(sunCycleYear);
  expect(s.querySelector('[data-cy-surface]').getAttribute('clip-path')).toBe('url(#solar-cy-limb)');expect(['cx','cy','r'].map(k=>+s.querySelector('#solar-cy-limb circle').getAttribute(k))).toEqual([310,200,145]);
  let visible=0;for(const sign of[1,-1])for(const [i,lon]of[-150,-92,-35,20,82,145].entries()){const lambda=(sign*(lat+[-.7,-.3,.1,.5,.8,0][i]*width))*Math.PI/180,longitude=(lon+sunCycleLongitude%360)*Math.PI/180,xyz=[Math.cos(lambda)*Math.sin(longitude),-Math.sin(lambda),Math.cos(lambda)*Math.cos(longitude)];const patch=s.querySelector('[data-cy-patch="'+sign+':'+i+'"]');if(activity>1e-10&&xyz[2]>1e-10){visible++;expect(patch).toBeTruthy();expect(+patch.dataset.x).toBeCloseTo(310+145*xyz[0],10);expect(+patch.dataset.y).toBeCloseTo(200+145*xyz[1],10);expect(+patch.dataset.depth).toBeCloseTo(xyz[2],12);expect(Math.hypot(+patch.dataset.x-310,+patch.dataset.y-200)).toBeLessThanOrEqual(145);const size=4+i%3,outer=patch.querySelector('ellipse');expect(+outer.getAttribute('rx')).toBeCloseTo(size*xyz[2],10);expect(+outer.getAttribute('ry')).toBe(size);expect(+patch.getAttribute('opacity')).toBeCloseTo(activity/100,12);}else expect(patch).toBeNull();}expect(s.querySelectorAll('[data-cy-patch]')).toHaveLength(visible);
  for(const line of s.querySelectorAll('[data-cy-guide]')){const a=+line.dataset.cyGuide*Math.PI/180;expect(+line.getAttribute('y1')).toBeCloseTo(200-145*Math.sin(a),10);expect(+line.getAttribute('x1')).toBeCloseTo(310-145*Math.cos(a),10);expect(+line.getAttribute('x2')).toBeCloseTo(310+145*Math.cos(a),10);}
  for(const cursor of s.querySelectorAll('[data-cy-cursor]'))expect(+cursor.getAttribute('x1')).toBeCloseTo(20+sunCycleYear/11*580,10);
  for(const dot of s.querySelectorAll('[data-cy-dot]')){const expected=dot.dataset.cyDot==='activity'?274-activity/100*248:150-(+dot.dataset.cyDot*lat)/45*124;expect(+dot.getAttribute('cy')).toBeCloseTo(expected,10);expect(+dot.getAttribute('cx')).toBeCloseTo(20+sunCycleYear/11*580,10);}
  for(const band of s.querySelectorAll('[data-cy-belt]')){const sign=+band.dataset.cyBelt,vertices=points(band.getAttribute('d'));expect(vertices).toHaveLength(50);for(const v of vertices){expect(Math.hypot(v.x-310,v.y-200)).toBeCloseTo(145,10);const l=Math.asin((200-v.y)/145)*180/Math.PI;expect(l).toBeGreaterThanOrEqual(sign*lat-width-1e-9);expect(l).toBeLessThanOrEqual(sign*lat+width+1e-9);}}expect(s.querySelectorAll('[data-cy-belt]')).toHaveLength(activity>1e-10?2:0);expect(s.innerHTML).not.toMatch(/NaN|Infinity/);expect(env.writes).toBe(0);
 });
 it('keeps time and latitude chart geometry independent from disk rotation',()=>{const env=renderCY(),before=[...env.section.querySelectorAll('[data-cy-chart]')].map(el=>el.outerHTML),disk=env.section.querySelector('[data-cy-surface]').outerHTML;env.invoke('#solar-cy-sunCycleLongitude',90);expect([...env.section.querySelectorAll('[data-cy-chart]')].map(el=>el.outerHTML)).toEqual(before);expect(env.section.querySelector('[data-cy-surface]').outerHTML).not.toBe(disk);env.invoke('#solar-cy-sunCycleLongitude',360);expect(env.section.querySelector('[data-cy-surface]').outerHTML).toBe(disk);});
 it('draws the complete activity and butterfly curves on fixed axes',()=>{const s=renderCY().section,curve=points(s.querySelector('[data-cy-curve]').getAttribute('d'));expect(curve).toHaveLength(111);for(const [i,p]of curve.entries()){const t=i/10;expect(p.x).toBeCloseTo(20+t/11*580,10);expect(p.y).toBeCloseTo(274-(1-Math.cos(2*Math.PI*t/11))/2*248,10);}for(const path of s.querySelectorAll('[data-cy-center]'))for(const [i,p]of points(path.getAttribute('d')).entries())expect(p.y).toBeCloseTo(150-(+path.dataset.cyCenter*(30-25*i/110))/45*124,10);for(const path of s.querySelectorAll('[data-cy-wing]')){const pts=points(path.getAttribute('d'));expect(pts).toHaveLength(222);for(const p of pts){expect(p.x).toBeGreaterThanOrEqual(20);expect(p.x).toBeLessThanOrEqual(600);expect(p.y).toBeGreaterThanOrEqual(26);expect(p.y).toBeLessThanOrEqual(274);}}});
 it('retains the late-cycle latitude at the ending minimum',()=>{const env=renderCY({sunCycleYear:11});expect(metric(env.section,'activity')).toBe(0);expect(metric(env.section,'latitude')).toBe(5);expect(env.section.querySelector('[data-cy-status]').textContent).toBe('Ending minimum');expect(env.section.querySelectorAll('[data-cy-patch]')).toHaveLength(0);env.invoke('#solar-cy-sunCycleYear',0);expect(metric(env.section,'latitude')).toBe(30);expect(env.section.querySelector('[data-cy-status]').textContent).toBe('Starting minimum');});
 it.each([[{},5.5,0],[{sunCycleYear:NaN,sunCycleLongitude:Infinity},5.5,0],[{sunCycleYear:'11',sunCycleLongitude:'180'},5.5,0],[{sunCycleYear:-3,sunCycleLongitude:-5},0,0],[{sunCycleYear:20,sunCycleLongitude:500},11,360],[{sunCycleYear:5.57,sunCycleLongitude:122},5.6,120]])('normalizes restored values without changing saved data %j',(seed,year,rotation)=>{const env=renderCY(seed);expect(+env.section.dataset.cyYear).toBe(year);expect(+env.section.dataset.cyRotation).toBe(rotation);expect(env.writes).toBe(0);for(const[key,value]of Object.entries(seed))expect(env.state[key]).toEqual(value);});
 it('preserves notes, rewards and other activity settings through all controls',()=>{
  const saved={ringOpening:60,ringIce:95,ringDensity:60,ringBand:'division',sdHour:9,researchPoints:350,totalRP:500,journalEntries:[{observation:'Keep evidence'}],missionLog:[{text:'Keep notes'}]},env=renderCY(saved);
  for(const key of['sunCycleYear','sunCycleLongitude'])for(const b of [...env.section.querySelectorAll('[data-cy-preset='+key+']')]){
   const value=+b.dataset.value,selector='[data-cy-preset='+key+'][data-value="'+value+'"]';env.invoke(selector);expect(env.state[key]).toBe(value);expect(env.section.querySelector(selector).getAttribute('aria-pressed')).toBe('true');
  }
  const before=structuredClone(env.state);env.invoke('[aria-controls=solar-cy-content]');expect(env.section.querySelector('#solar-cy-content').hidden).toBe(true);expect(env.section.querySelectorAll('svg')).toHaveLength(0);env.invoke('[aria-controls=solar-cy-content]');expect(env.state).toEqual(before);for(const[key,value]of Object.entries(saved))expect(env.state[key]).toEqual(value);
 });
 it('provides linked SVG descriptions, native control labels and transparent model limits',()=>{const env=renderCY(),s=env.section,before=s.innerHTML;env.render();expect(env.section.innerHTML).toBe(before);for(const key of['sunCycleYear','sunCycleLongitude']){expect(s.querySelector('label[for=solar-cy-'+key+']')).toBeTruthy();expect(s.querySelector('#solar-cy-'+key).getAttribute('aria-valuetext')).toBeTruthy();}for(const svg of s.querySelectorAll('svg'))for(const attr of['aria-labelledby','aria-describedby'])for(const id of svg.getAttribute(attr).split(' '))expect(document.getElementById(id)).toBeTruthy();for(const match of s.innerHTML.matchAll(/url\(#([^)]*)\)/g))expect(s.querySelector('#'+match[1])).toBeTruthy();const ids=[...s.querySelectorAll('[id]')].map(el=>el.id);expect(new Set(ids).size).toBe(ids.length);expect(s.querySelectorAll('svg text')).toHaveLength(0);for(const text of['not a sunspot count','not observed data','neighboring cycles overlap','not live solar data','does not track individual spots','22 years'])expect(s.textContent).toContain(text);expect(s.textContent).not.toMatch(/CME risk|Cycle 25/);});
});
