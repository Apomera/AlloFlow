import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function windTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-wind') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderSW(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showSWind: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-sw-test-callback': id }, ...children);
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
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => windTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-wind'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.swTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

const metric=(s,key)=>Number(s.querySelector('[data-sw-metric='+key+']').dataset.value);
const references=[[400,5,1.338097540760,2e8,4.328642092014],[800,5,5.352390163040,4e8,2.164321046007],[400,10,2.676195081520,4e8,4.328642092014],[200,1,.066904877038,2e7,8.657284184028],[900,15,20.322356400293,1.35e9,1.923840929784]];
describe('Solar wind proton flow lab',()=>{
  beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_solarsystem.js','solarSystem');vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('requestAnimationFrame',()=>1);vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);});
  afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';});
  it.each([200,210,400,450,800,890,900].flatMap(v=>[1,5,7,10,15].map(n=>[v,n])))('keeps visuals and metrics consistent for %skm/s and %scm^-3',(swSpeed,swDens)=>{
    const env=renderSW({swSpeed,swDens}),s=env.section,p=swDens*swSpeed**2*1.67262192595e-6;expect(+s.dataset.swSpeed).toBe(swSpeed);expect(+s.dataset.swDensity).toBe(swDens);expect(metric(s,'pressure')).toBeCloseTo(p,12);expect(metric(s,'flux')).toBe(swDens*swSpeed*1e5);expect(metric(s,'travelDays')).toBeCloseTo(149597870.7/swSpeed/86400,12);expect(metric(s,'ratio')).toBeCloseTo(swDens/5*(swSpeed/400)**2,12);
    expect(+s.querySelector('[data-sw-distance-line]').getAttribute('x2')).toBeCloseTo(20+swSpeed/900*580,12);expect(s.querySelectorAll('[data-sw-proton]')).toHaveLength(swDens);const sample=s.querySelector('[data-sw-marker]');expect(+sample.getAttribute('cx')).toBeCloseTo(20+(swSpeed-200)/700*580,10);expect(+sample.getAttribute('cy')).toBeCloseTo(274-p/22*248,10);
    for(const kind of['current','reference']){const values=s.querySelector('[data-sw-curve='+kind+']').getAttribute('d').match(/-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi).map(Number);expect(values).toHaveLength(282);for(let i=0;i<141;i++){const v=200+i*5;expect(values[2*i]).toBeCloseTo(20+i/140*580,10);expect((274-values[2*i+1])/248*22).toBeCloseTo((kind==='current'?swDens:5)*v*v*1.67262192595e-6,10);expect(values[2*i+1]).toBeGreaterThan(26);expect(values[2*i+1]).toBeLessThan(274);if(i)expect(values[2*i+1]).toBeLessThan(values[2*i-1]);}}
    expect(s.querySelector('[data-sw-double-speed]').disabled).toBe(swSpeed>450);expect(s.querySelector('[data-sw-double-density]').disabled).toBe(swDens>7);expect(s.innerHTML).not.toMatch(/NaN|Infinity/);expect(env.writes).toBe(0);
  });
  it.each(references)('matches independent checkpoints at %skm/s and %scm^-3',(swSpeed,swDens,p,flux,days)=>{const s=renderSW({swSpeed,swDens}).section;expect(metric(s,'pressure')).toBeCloseTo(p,11);expect(metric(s,'flux')).toBe(flux);expect(metric(s,'travelDays')).toBeCloseTo(days,11);});
  it('isolates speed and density when doubling either variable',()=>{const env=renderSW(),p=metric(env.section,'pressure'),flux=metric(env.section,'flux'),days=metric(env.section,'travelDays');env.invoke('[data-sw-double-speed]');expect(env.state.swSpeed).toBe(800);expect(+env.section.dataset.swDensity).toBe(5);expect(metric(env.section,'pressure')).toBeCloseTo(4*p,12);expect(metric(env.section,'flux')).toBe(2*flux);expect(metric(env.section,'travelDays')).toBeCloseTo(days/2,12);env.invoke('[data-sw-double-density]');expect(env.state.swDens).toBe(10);expect(env.state.swSpeed).toBe(800);expect(metric(env.section,'pressure')).toBeCloseTo(8*p,12);expect(metric(env.section,'flux')).toBe(4*flux);expect(metric(env.section,'travelDays')).toBeCloseTo(days/2,12);});
  it('keeps the fixed reference curve unchanged across density changes',()=>{const env=renderSW(),reference=env.section.querySelector('[data-sw-curve=reference]').getAttribute('d'),current=env.section.querySelector('[data-sw-curve=current]').getAttribute('d');expect(current).toBe(reference);expect(env.section.textContent).toContain('curves coincide');env.invoke('#solar-sw-swDens',15);expect(env.section.querySelector('[data-sw-curve=reference]').getAttribute('d')).toBe(reference);expect(env.section.querySelector('[data-sw-curve=current]').getAttribute('d')).not.toBe(reference);});
  it.each([[{},400,5],[{swSpeed:NaN,swDens:Infinity},400,5],[{swSpeed:'800',swDens:'10'},400,5],[{swSpeed:-100,swDens:-10},200,1],[{swSpeed:1e9,swDens:100},900,15],[{swSpeed:444.7,swDens:5.6},440,6]])('normalizes restored values without writing: %j',(seed,speed,density)=>{const env=renderSW(seed);expect(+env.section.dataset.swSpeed).toBe(speed);expect(+env.section.dataset.swDensity).toBe(density);expect(env.writes).toBe(0);for(const[key,value]of Object.entries(seed))expect(env.state[key]).toEqual(value);});
  it('preserves saved work through presets and disclosure',()=>{const saved={researchPoints:350,totalRP:500,foucLat:-45,foucTime:6,atmAlt:80,starTemp:5778,scopeAp:20,journalEntries:[{observation:'Saved evidence'}],missionLog:[{text:'Keep'}]};const env=renderSW(saved);for(const key of['swSpeed','swDens'])for(const button of [...env.section.querySelectorAll('[data-sw-preset='+key+']')]){const value=+button.dataset.value;env.invoke('[data-sw-preset='+key+'][data-value="'+value+'"]');expect(env.state[key]).toBe(value);}const before=structuredClone(env.state);env.invoke('[aria-controls=solar-sw-content]');expect(env.section.querySelector('#solar-sw-content').hidden).toBe(true);expect(env.section.querySelectorAll('svg')).toHaveLength(0);env.invoke('[aria-controls=solar-sw-content]');expect(env.state).toEqual(before);for(const[key,value]of Object.entries(saved))expect(env.state[key]).toEqual(value);});
  it('labels diagrams natively and discloses what the model does and does not calculate',()=>{const s=renderSW().section;for(const key of['swSpeed','swDens']){expect(s.querySelector('label[for=solar-sw-'+key+']')).toBeTruthy();expect(s.querySelector('#solar-sw-'+key).getAttribute('aria-valuetext')).toBeTruthy();}for(const svg of s.querySelectorAll('svg'))for(const a of['aria-labelledby','aria-describedby'])for(const id of svg.getAttribute(a).split(' '))expect(document.getElementById(id)).toBeTruthy();const ids=[...s.querySelectorAll('[id]')].map(el=>el.id);expect(new Set(ids).size).toBe(ids.length);expect(s.querySelectorAll('svg text')).toHaveLength(0);for(const text of['proton-only','no factor of ½','area perpendicular to the flow','not energetic-particle','not an arrival prediction','not live measurements','southward component','fixed 900 km ruler'])expect(s.textContent).toContain(text);expect(s.textContent).not.toMatch(/EXTREME storm|Normal solar wind|Quiet/);});
});
