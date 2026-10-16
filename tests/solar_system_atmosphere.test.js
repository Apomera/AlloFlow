import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function atmosphereTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-atmosphere') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderAM(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showAtmos: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-am-test-callback': id }, ...children);
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
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => atmosphereTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-atmosphere'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.amTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

const attr=(el,key)=>Number(el.getAttribute(key)),metric=(s,key)=>{const value=s.querySelector('[data-am-metric='+key+']').getAttribute('data-value');return value===null?null:Number(value);};
const points=(path,kind)=>{const values=path.getAttribute('d').match(/-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi).map(Number);return Array.from({length:values.length/2},(_,i)=>({z:(values[2*i]-18)/584*80,value:kind==='temperature'?-100+(276-values[2*i+1])/248*150:.001*2000000**((276-values[2*i+1])/248)}));};
const checkpoints=[[0,288.15,101325,1.224999155888],[10,223.252092647979,26499.8981392533,.413510428899],[20,216.65,5529.31189229915,.088909915089],[50,270.65,79.7790929964913,.001026878034],[80,198.638576250869,1.05247354505454,.000018458032037]];
describe('Atmospheric layers and lower standard-atmosphere reference',()=>{
  beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_solarsystem.js','solarSystem');vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('requestAnimationFrame',()=>1);vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);});
  afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';});
  it.each([0,1,5,10,11,12,20,30,47,49,50,51,71,75,79,80,81,84,85,86,100,400,599,600,650,700])('maps %s km consistently and respects the numerical model domain',(atmAlt)=>{
    const env=renderAM({atmAlt}),s=env.section,y=z=>470-444*Math.log(1+z)/Math.log(701),valid=atmAlt<=80;expect(+s.dataset.amAltitude).toBe(atmAlt);expect(s.dataset.amValid).toBe(String(valid));const layer=atmAlt<12?'troposphere':atmAlt<50?'stratosphere':atmAlt<85?'mesosphere':atmAlt<600?'thermosphere':'exosphere';expect(s.dataset.amLayer).toBe(layer);expect(s.querySelector('[data-am-layer-preset='+layer+']').getAttribute('aria-pressed')).toBe('true');expect(attr(s.querySelector('[data-am-overview-selection]'),'y1')).toBeCloseTo(y(atmAlt),12);expect(attr(s.querySelector('[data-am-location]'),'cy')).toBeCloseTo(y(atmAlt),12);
    const bands=[...s.querySelectorAll('[data-am-band]')];expect(bands).toHaveLength(5);expect(bands.reduce((sum,b)=>sum+attr(b,'height'),0)).toBeCloseTo(444,10);for(const band of bands){expect(attr(band,'y')).toBeCloseTo(y(+band.dataset.hi),12);expect(attr(band,'height')).toBeCloseTo(y(+band.dataset.lo)-y(+band.dataset.hi),12);expect(attr(band,'height')).toBeGreaterThan(0);}
    for(const kind of['temperature','pressure']){const ps=points(s.querySelector('[data-am-curve='+kind+']'),kind);expect(ps).toHaveLength(valid?168:167);expect(ps[0].z).toBeCloseTo(0,12);expect(ps.at(-1).z).toBeCloseTo(80,12);for(let i=0;i<ps.length;i++){const p=ps[i];expect(p.z).toBeGreaterThanOrEqual(0);expect(p.z).toBeLessThanOrEqual(80);if(kind==='temperature'){expect(p.value).toBeGreaterThan(-100);expect(p.value).toBeLessThan(50);}else{expect(p.value).toBeGreaterThan(.001);expect(p.value).toBeLessThan(2000);if(i)expect(p.value).toBeLessThanOrEqual(ps[i-1].value+1e-10);}if(i)expect(p.z).toBeGreaterThanOrEqual(ps[i-1].z);}
      const sample=s.querySelector('[data-am-sample='+kind+']');if(valid){expect(sample).toBeTruthy();expect((attr(sample,'cx')-18)/584*80).toBeCloseTo(atmAlt,10);const value=kind==='temperature'?-100+(276-attr(sample,'cy'))/248*150:.001*2000000**((276-attr(sample,'cy'))/248);expect(value).toBeCloseTo(metric(s,kind==='temperature'?'temperatureC':'pressure'),9);}else expect(sample).toBeNull();
    }
    if(valid){expect(metric(s,'pressure')).toBeGreaterThan(0);expect(metric(s,'density')).toBeCloseTo(metric(s,'pressure')*100/(8314.32/28.9644*(metric(s,'temperatureC')+273.15)),12);}else{for(const key of['temperatureC','pressure','density']){expect(metric(s,key)).toBeNull();expect(s.querySelector('[data-am-metric='+key+']').textContent).toBe('Not calculated');}expect(s.querySelector('[data-am-return]')).toBeTruthy();}
    expect(env.writes).toBe(0);expect(s.innerHTML).not.toMatch(/NaN|Infinity/);
  });
  it.each(checkpoints)('matches independently calculated 1976 constants at %s geometric km',(atmAlt,t,p,rho)=>{const s=renderAM({atmAlt}).section;expect(metric(s,'temperatureC')+273.15).toBeCloseTo(t,10);expect(metric(s,'pressure')*100).toBeCloseTo(p,7);expect(metric(s,'density')).toBeCloseTo(rho,12);});
  it('uses geometric-to-geopotential conversion and continuous published layer base values',()=>{
    const s=renderAM().section,t=points(s.querySelector('[data-am-curve=temperature]'),'temperature'),p=points(s.querySelector('[data-am-curve=pressure]'),'pressure');for(const[h,kelvin,pa]of[[11,216.65,22632.06397],[20,216.65,5474.88867],[32,228.65,868.01868],[47,270.65,110.90631],[51,270.65,66.93887],[71,214.65,3.956420]]){const z=6356.766*h/(6356.766-h),tp=t.find(n=>Math.abs(n.z-z)<1e-9),pp=p.find(n=>Math.abs(n.z-z)<1e-9);expect(tp).toBeTruthy();expect(pp).toBeTruthy();expect(tp.value+273.15).toBeCloseTo(kelvin,10);expect(pp.value*100).toBeCloseTo(pa,5);const i=t.indexOf(tp);expect(Math.abs(tp.value-t[i-1].value)).toBeLessThan(3.3);expect(Math.abs(t[i+1].value-tp.value)).toBeLessThan(3.3);}
    expect(metric(renderAM({atmAlt:11}).section,'temperatureC')+273.15).toBeGreaterThan(216.65);
  });
  it('holds temperature in isothermal layers while pressure continues to decrease',()=>{const low=renderAM({atmAlt:12}).section,t=metric(low,'temperatureC'),p=metric(low,'pressure'),high=renderAM({atmAlt:20}).section;expect(metric(high,'temperatureC')).toBeCloseTo(t,12);expect(metric(high,'pressure')).toBeLessThan(p);});
  it('removes measurements and curve markers above80km without pinning them to the edge',()=>{const env=renderAM({atmAlt:80});expect(metric(env.section,'pressure')).toBeCloseTo(.0105247354505454,12);expect(env.section.querySelector('[data-am-metric=pressure]').textContent).toBe('0.0105 hPa');env.invoke('#solar-am-altitude',81);expect(env.section.querySelectorAll('[data-am-sample]')).toHaveLength(0);expect(metric(env.section,'pressure')).toBeNull();env.invoke('[data-am-return]');expect(env.state.atmAlt).toBe(80);expect(env.section.querySelectorAll('[data-am-sample]')).toHaveLength(2);});
  it.each([[{},50],[{atmAlt:NaN},50],[{atmAlt:Infinity},50],[{atmAlt:'400'},50],[{atmAlt:-5},0],[{atmAlt:1e9},700],[{atmAlt:75.6},76]])('normalizes restored altitude without writing: %j',(seed,altitude)=>{const env=renderAM(seed);expect(+env.section.dataset.amAltitude).toBe(altitude);expect(env.writes).toBe(0);for(const[key,value]of Object.entries(seed))expect(env.state[key]).toEqual(value);});
  it('makes every altitude preset reachable and every layer button visit its own band',()=>{const env=renderAM();for(const z of[0,12,50,80,85,400,700]){env.invoke('[data-am-altitude-preset="'+z+'"]');expect(env.state.atmAlt).toBe(z);expect(+env.section.querySelector('#solar-am-altitude').value).toBe(z);}for(const[key,z]of[['troposphere',5],['stratosphere',30],['mesosphere',75],['thermosphere',400],['exosphere',650]]){env.invoke('[data-am-layer-preset='+key+']');expect(env.state.atmAlt).toBe(z);expect(env.section.dataset.amLayer).toBe(key);}env.invoke('#solar-am-altitude',1);expect(env.state.atmAlt).toBe(1);});
  it('preserves notes, rewards and other simulations through altitude changes and disclosure',()=>{const saved={researchPoints:350,totalRP:500,selectedPlanet:'Earth',journalEntries:[{observation:'Saved'}],missionLog:[{text:'Evidence'}],scopeAp:20,scopeMag:500,starTemp:5778,starRadiusSolar:2,starProbeNm:550};const env=renderAM(saved);env.invoke('[data-am-layer-preset=thermosphere]');const before=structuredClone(env.state);env.invoke('[aria-controls=solar-am-content]');expect(env.section.querySelectorAll('svg')).toHaveLength(0);expect(env.section.querySelector('#solar-am-content').hidden).toBe(true);env.invoke('[aria-controls=solar-am-content]');expect(env.state).toEqual(before);for(const[key,value]of Object.entries(saved))expect(env.state[key]).toEqual(value);});
  it('provides native labels and clearly distinguishes the overview and numerical reference',()=>{const s=renderAM().section;expect(s.querySelector('label[for=solar-am-altitude]')).toBeTruthy();expect(s.querySelector('#solar-am-altitude').getAttribute('aria-valuetext')).toBeTruthy();for(const svg of s.querySelectorAll('svg'))for(const a of['aria-labelledby','aria-describedby'])for(const id of svg.getAttribute(a).split(' '))expect(document.getElementById(id)).toBeTruthy();const ids=[...s.querySelectorAll('[id]')].map(el=>el.id);expect(new Set(ids).size).toBe(ids.length);expect(s.querySelectorAll('svg text')).toHaveLength(0);for(const text of['not physical thicknesses','approximate boundaries','not the end of the atmosphere','constant dry-air composition','geopotential','logarithmic scale','upper-atmosphere model','continues above this view'])expect(s.textContent).toContain(text);expect(s.querySelectorAll('a[rel="noopener noreferrer"]')).toHaveLength(3);});
});
