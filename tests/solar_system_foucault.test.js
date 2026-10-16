import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function foucaultTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-foucault') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderFC(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showFouc: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-fc-test-callback': id }, ...children);
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
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => foucaultTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-foucault'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.fcTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

const metric=(s,key)=>{const n=s.querySelector('[data-fc-metric='+key+']');return n.hasAttribute('data-value')?Number(n.dataset.value):null;};
const refs=[[90,15.041068638661683,23.934469594444447],[45,10.635641630591,33.8484515088],[30,7.5205343193308415,47.868939188888894],[0,0,null],[-30,-7.5205343193308415,47.868939188888894],[-45,-10.635641630591,33.8484515088],[-90,-15.041068638661683,23.934469594444447]];
describe('Foucault pendulum floor-relative precession',()=>{
  beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_solarsystem.js','solarSystem');vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('requestAnimationFrame',()=>1);vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);});
  afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';});
  it.each(refs.flatMap(([lat,rate,period])=>[0,6,12,24,48].map(time=>[lat,time,rate,period])))('matches independent rate/period and signed compass geometry at %s° after %sh',(foucLat,foucTime,expectedRate,expectedPeriod)=>{
    const env=renderFC({foucLat,foucTime}),s=env.section,rate=metric(s,'rate'),rotation=metric(s,'rotation');expect(rate).toBeCloseTo(expectedRate,8);expect(rotation).toBeCloseTo(expectedRate*foucTime,7);if(expectedPeriod===null){expect(metric(s,'period')).toBeNull();expect(s.querySelector('[data-fc-direction]')).toBeNull();expect(s.textContent).toContain('No finite period');expect(s.querySelector('[data-fc-flip]').disabled).toBe(true);}else{expect(metric(s,'period')).toBeCloseTo(expectedPeriod,7);expect(+s.querySelector('[data-fc-direction]').dataset.fcDirection).toBe(Math.sign(foucLat));}
    const angle=rotation*Math.PI/180,end=s.querySelector('[data-fc-endpoint]'),plane=s.querySelector('[data-fc-plane]');expect(+end.getAttribute('cx')).toBeCloseTo(200+110*Math.sin(angle),10);expect(+end.getAttribute('cy')).toBeCloseTo(180-110*Math.cos(angle),10);expect(+plane.getAttribute('x1')+ +plane.getAttribute('x2')).toBeCloseTo(400,10);expect(+plane.getAttribute('y1')+ +plane.getAttribute('y2')).toBeCloseTo(360,10);
    const sample=s.querySelector('[data-fc-sample]');expect(+sample.getAttribute('cx')).toBeCloseTo(20+(foucLat+90)/180*580,10);expect(+sample.getAttribute('cy')).toBeCloseTo(150-rate/16*124,10);expect(s.innerHTML).not.toMatch(/NaN|Infinity/);expect(env.writes).toBe(0);
  });
  it('plots a monotone odd curve with the expected equator and polar limits',()=>{const s=renderFC().section,values=s.querySelector('[data-fc-curve]').getAttribute('d').match(/-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi).map(Number);expect(values).toHaveLength(362);const rates=Array.from({length:181},(_,i)=>(150-values[i*2+1])/124*16);for(let i=0;i<181;i++){expect(values[i*2]).toBeCloseTo(20+i/180*580,10);expect(rates[i]).toBeCloseTo(-rates[180-i],10);if(i)expect(rates[i]).toBeGreaterThan(rates[i-1]);}expect(rates[90]).toBe(0);expect(rates[180]).toBeCloseTo(15.041068638661683,10);});
  it('reverses the marked endpoint horizontally between hemispheres while preserving rate magnitude and elapsed time',()=>{const env=renderFC({foucLat:45,foucTime:6}),x=+env.section.querySelector('[data-fc-endpoint]').getAttribute('cx'),y=+env.section.querySelector('[data-fc-endpoint]').getAttribute('cy'),p=metric(env.section,'period');expect(x).toBeGreaterThan(200);env.invoke('[data-fc-flip]');expect(env.state.foucLat).toBe(-45);expect(env.state.foucTime).toBe(6);expect(+env.section.querySelector('[data-fc-endpoint]').getAttribute('cx')).toBeCloseTo(400-x,10);expect(+env.section.querySelector('[data-fc-endpoint]').getAttribute('cy')).toBeCloseTo(y,10);expect(metric(env.section,'period')).toBeCloseTo(p,10);});
  it('retains accumulated turns rather than wrapping the readout at 360°',()=>{const env=renderFC({foucLat:90,foucTime:48});expect(metric(env.section,'rotation')).toBeGreaterThan(720);expect(env.section.textContent).toContain('+721.97°');env.invoke('[data-fc-reset]');expect(env.state.foucTime).toBe(0);expect(env.state.foucLat).toBe(90);});
  it.each([[{},45,0],[{foucLat:NaN,foucTime:Infinity},45,0],[{foucLat:'-30',foucTime:'12'},45,0],[{foucLat:-100,foucTime:-10},-90,0],[{foucLat:100,foucTime:100},90,48],[{foucLat:44.7,foucTime:12.2},45,12]])('normalizes restored values without writing: %j',(seed,latitude,hours)=>{const env=renderFC(seed);expect(+env.section.dataset.fcLatitude).toBe(latitude);expect(+env.section.dataset.fcHours).toBe(hours);expect(env.writes).toBe(0);for(const[key,value]of Object.entries(seed))expect(env.state[key]).toEqual(value);});
  it('makes every preset reachable and preserves notes, rewards and other experiments',()=>{const saved={researchPoints:350,totalRP:500,atmAlt:80,starTemp:5778,scopeAp:20,journalEntries:[{observation:'Saved evidence'}],missionLog:[{text:'Keep'}]};const env=renderFC(saved);for(const key of['foucLat','foucTime'])for(const button of [...env.section.querySelectorAll('[data-fc-preset='+key+']')]){const value=+button.dataset.value;env.invoke('[data-fc-preset='+key+'][data-value="'+value+'"]');expect(env.state[key]).toBe(value);}env.invoke('#solar-fc-foucLat',1);env.invoke('#solar-fc-foucTime',.5);expect(env.state.foucLat).toBe(1);expect(env.state.foucTime).toBe(.5);const before=structuredClone(env.state);env.invoke('[aria-controls=solar-fc-content]');expect(env.section.querySelector('#solar-fc-content').hidden).toBe(true);expect(env.section.querySelectorAll('svg')).toHaveLength(0);env.invoke('[aria-controls=solar-fc-content]');expect(env.state).toEqual(before);for(const[key,value]of Object.entries(saved))expect(env.state[key]).toEqual(value);});
  it('provides native labels and discloses direction, time units, model limits and the orientation marker',()=>{const s=renderFC().section;for(const key of['foucLat','foucTime']){expect(s.querySelector('label[for=solar-fc-'+key+']')).toBeTruthy();expect(s.querySelector('#solar-fc-'+key).getAttribute('aria-valuetext')).toBeTruthy();}for(const svg of s.querySelectorAll('svg'))for(const a of['aria-labelledby','aria-describedby'])for(const id of svg.getAttribute(a).split(' '))expect(document.getElementById(id)).toBeTruthy();const ids=[...s.querySelectorAll('[id]')].map(el=>el.id);expect(new Set(ids).size).toBe(ids.length);expect(s.querySelectorAll('svg text')).toHaveLength(0);for(const text of['not the moving pendulum bob','180°','360°','3,600-second hours','sidereal','small-amplitude','Air drag','relative to the rotating ground'])expect(s.textContent).toContain(text);expect(renderFC({foucLat:90}).section.textContent).toContain('no unique local direction');});
});
