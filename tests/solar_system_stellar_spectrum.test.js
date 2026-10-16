import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function stellarTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-stellar-spectrum') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderST(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showStarWheel: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-st-test-callback': id }, ...children);
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
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => stellarTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-stellar-spectrum'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.stTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

const attr=(el,key)=>Number(el.getAttribute(key)),metric=(s,key)=>Number(s.querySelector('[data-st-metric='+key+']').dataset.value);
const points=path=>{const values=path.getAttribute('d').match(/-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi).map(Number);return Array.from({length:values.length/2},(_,i)=>({nm:50*60**((values[2*i]-18)/584),value:(276-values[2*i+1])/248}));};
const planckShape=(nm,t)=>{const peak=2.897771955e6/t,xPeak=6.62607015e-34*299792458/(peak*1e-9*1.380649e-23*t);return(peak/nm)**5*Math.expm1(xPeak)/Math.expm1(xPeak*peak/nm);};
describe('Stellar spectrum, size and thermal power',()=>{
  beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_solarsystem.js','solarSystem');vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('requestAnimationFrame',()=>1);vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);});
  afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';});
  it.each([2500,3000,5772,5778,10000,40000].flatMap(t=>[.1,1,20].map(r=>[t,r])))('keeps spectra, radii and power consistent at %s K and %s solar radii',(starTemp,starRadiusSolar)=>{
    const env=renderST({starTemp,starRadiusSolar}),s=env.section,peak=metric(s,'peak');expect(peak*starTemp).toBeCloseTo(2897771.955,6);expect(metric(s,'flux')).toBeCloseTo(5.670374419e-8*starTemp**4,4);expect(metric(s,'areaRatio')).toBeCloseTo(starRadiusSolar**2,12);expect(metric(s,'luminosity')/metric(s,'flux')).toBeCloseTo(4*Math.PI*(starRadiusSolar*6.957e8)**2,-7);expect(metric(s,'luminositySolar')).toBeCloseTo(metric(s,'luminosity')/3.828e26,8);expect(metric(s,'fluxRatio')).toBeCloseTo((starTemp/5772)**4,10);
    for(const path of s.querySelectorAll('[data-st-curve]')){const ps=points(path),t=+path.dataset.temperature;expect(ps).toHaveLength(243);expect(ps[0].nm).toBeCloseTo(50,10);expect(ps.at(-1).nm).toBeCloseTo(3000,8);expect(ps.some(p=>Math.abs(p.nm-2897771.955/t)<1e-6&&Math.abs(p.value-1)<1e-10)).toBe(true);for(let i=0;i<ps.length;i++){const p=ps[i];expect(p.value).toBeGreaterThanOrEqual(-1e-14);expect(p.value).toBeLessThanOrEqual(1+1e-9);expect(p.value).toBeCloseTo(planckShape(p.nm,t),10);if(i)expect(p.nm).toBeGreaterThanOrEqual(ps[i-1].nm);}}
    const marker=s.querySelector('[data-st-peak]');expect(50*60**((attr(marker,'cx')-18)/584)).toBeCloseTo(peak,8);expect(attr(marker,'cy')).toBe(28);const discs=[...s.querySelectorAll('[data-st-disc]')];expect(attr(discs[0],'r')/attr(discs[1],'r')).toBeCloseTo(starRadiusSolar,12);expect(discs.every(d=>attr(d,'r')>0&&attr(d,'r')<=100)).toBe(true);expect(env.writes).toBe(0);expect(s.innerHTML).not.toMatch(/NaN|Infinity/);
  });
  it.each([[3000,965.923985,4593003.27939],[5778,501.5181645898235,63200699.73478983],[10000,289.7771955,567037441.9]])('matches independent reference values at %s K',(starTemp,peak,flux)=>{const s=renderST({starTemp}).section;expect(metric(s,'peak')).toBeCloseTo(peak,8);expect(metric(s,'flux')).toBeCloseTo(flux,5);});
  it('retains the saved 5778 K default while using the IAU nominal luminosity',()=>{const s=renderST().section;expect(+s.dataset.stTemperature).toBe(5778);expect(metric(s,'luminositySolar')).toBeCloseTo(1.0041621057332155,12);expect(metric(s,'luminositySolar')).not.toBe(1);});
  it('changes radius without moving the spectrum, swatch, peak or surface emission',()=>{
    const env=renderST({starTemp:5772,starRadiusSolar:1}),s=env.section,curve=s.querySelector('[data-st-curve=selected]').getAttribute('d'),flux=metric(s,'flux'),l=metric(s,'luminosity'),fill=s.querySelector('[data-st-disc=selected]').getAttribute('fill');env.invoke('[data-st-control=starRadiusSolar][data-st-value="2"]');expect(env.section.querySelector('[data-st-curve=selected]').getAttribute('d')).toBe(curve);expect(env.section.querySelector('[data-st-disc=selected]').getAttribute('fill')).toBe(fill);expect(metric(env.section,'flux')).toBe(flux);expect(metric(env.section,'luminosity')/l).toBeCloseTo(4,12);
  });
  it('doubles absolute temperature with sixteen times the emission and half the peak wavelength',()=>{
    const env=renderST({starTemp:5772,starRadiusSolar:1}),s=env.section;env.invoke('[data-st-experiment=heat]');expect(env.state.starTemp).toBe(11544);expect(env.state.starRadiusSolar).toBe(1);expect(metric(env.section,'peak')).toBeCloseTo(metric(s,'peak')/2,10);expect(metric(env.section,'flux')/metric(s,'flux')).toBeCloseTo(16,12);expect(metric(env.section,'luminosity')/metric(s,'luminosity')).toBeCloseTo(16,12);
  });
  it.each([50,100,380,550,780,1000,3000])('aligns the spectral probe and measurement at %s nm',(starProbeNm)=>{const s=renderST({starProbeNm,starTemp:3000}).section,x=18+584*Math.log(starProbeNm/50)/Math.log(60),sample=s.querySelector('[data-st-sample]');expect(attr(s.querySelector('[data-st-probe-line]'),'x1')).toBeCloseTo(x,10);expect(attr(sample,'cx')).toBeCloseTo(x,10);expect((276-attr(sample,'cy'))/248).toBeCloseTo(metric(s,'sample'),12);expect(metric(s,'sample')).toBeCloseTo(planckShape(starProbeNm,3000),12);expect(metric(s,'referenceSample')).toBeCloseTo(planckShape(starProbeNm,5772),12);expect(metric(s,'probe')).toBe(starProbeNm);});
  it('uses a fixed reference curve and properly bounded visible band',()=>{const env=renderST({starTemp:5772}),s=env.section;expect(s.querySelector('[data-st-curve=selected]').getAttribute('d')).toBe(s.querySelector('[data-st-curve=reference]').getAttribute('d'));const ref=s.querySelector('[data-st-curve=reference]').getAttribute('d');env.invoke('[data-st-control=starTemp][data-st-value="40000"]');expect(env.section.querySelector('[data-st-curve=reference]').getAttribute('d')).toBe(ref);const band=env.section.querySelector('[data-st-visible-band]'),left=50*60**((attr(band,'x')-18)/584),right=50*60**((attr(band,'x')+attr(band,'width')-18)/584);expect(left).toBeCloseTo(380,10);expect(right).toBeCloseTo(780,10);});
  it.each([[{},5778,1,550],[{starTemp:Infinity,starRadiusSolar:NaN,starProbeNm:'550'},5778,1,550],[{starTemp:'40000',starRadiusSolar:null,starProbeNm:Infinity},5778,1,550],[{starTemp:-1,starRadiusSolar:-1,starProbeNm:-1},2500,.1,50],[{starTemp:1e9,starRadiusSolar:1e9,starProbeNm:1e9},40000,20,3000],[{starTemp:5778.6,starRadiusSolar:2.26,starProbeNm:551.4},5779,2.3,551]])('normalizes restored values read-only: %j',(seed,t,r,nm)=>{const env=renderST(seed);expect(+env.section.dataset.stTemperature).toBe(t);expect(+env.section.dataset.stRadius).toBe(r);expect(+env.section.dataset.stProbe).toBe(nm);expect(env.writes).toBe(0);for(const[key,value]of Object.entries(seed))expect(env.state[key]).toEqual(value);});
  it('keeps all presets and one-step keyboard values reachable',()=>{const env=renderST();for(const key of['starTemp','starRadiusSolar','starProbeNm']){const slider=env.section.querySelector('#solar-st-'+key),min=+slider.min,max=+slider.max,step=+slider.step;for(const button of [...env.section.querySelectorAll('[data-st-control='+key+']')]){const v=+button.dataset.stValue;expect(v).toBeGreaterThanOrEqual(min);expect(v).toBeLessThanOrEqual(max);expect((v-min)/step).toBeCloseTo(Math.round((v-min)/step),8);env.invoke('[data-st-control='+key+'][data-st-value="'+v+'"]');expect(env.state[key]).toBe(v);expect(+env.section.querySelector('#solar-st-'+key).value).toBe(v);}env.invoke('#solar-st-'+key,min+step);expect(env.state[key]).toBeCloseTo(min+step,10);}});
  it('preserves notes, rewards and other simulations across experiments and disclosure',()=>{const saved={researchPoints:350,totalRP:500,selectedPlanet:'Earth',journalEntries:[{observation:'Saved'}],missionLog:[{text:'Evidence'}],scopeAp:20,scopeMag:500,scopeFieldArcmin:20,albIce:30,albCloud:60,starProbeNm:780};const env=renderST(saved);for(const[key,t,r]of[['reference',5772,1],['radius',5772,2],['heat',11544,1]]){env.invoke('[data-st-experiment='+key+']');expect(env.state.starTemp).toBe(t);expect(env.state.starRadiusSolar).toBe(r);}const before=structuredClone(env.state);env.invoke('[aria-controls=solar-st-content]');expect(env.section.querySelectorAll('svg')).toHaveLength(0);expect(env.section.querySelector('#solar-st-content').hidden).toBe(true);env.invoke('[aria-controls=solar-st-content]');expect(env.state).toEqual(before);for(const[key,value]of Object.entries(saved))expect(env.state[key]).toEqual(value);});
  it('provides native labels and discloses the model limitations',()=>{const s=renderST().section;for(const key of['starTemp','starRadiusSolar','starProbeNm']){const id='solar-st-'+key;expect(s.querySelector('label[for='+id+']')).toBeTruthy();expect(s.querySelector('#'+id).getAttribute('aria-valuetext')).toBeTruthy();}for(const svg of s.querySelectorAll('svg'))for(const a of['aria-labelledby','aria-describedby'])for(const id of svg.getAttribute(a).split(' '))expect(document.getElementById(id)).toBeTruthy();const ids=[...s.querySelectorAll('[id]')].map(el=>el.id);expect(new Set(ids).size).toBe(ids.length);expect(s.querySelectorAll('svg text')).toHaveLength(0);for(const text of['per unit wavelength','not energy fractions','not exact colorimetry','does not make a star look green','all wavelengths','not every combination','different peak','approximately, not exactly'])expect(s.textContent).toContain(text);expect(s.querySelectorAll('a[rel="noopener noreferrer"]')).toHaveLength(3);});
  it('discloses tiny positive spectral samples instead of rounding them to zero',()=>{const s=renderST({starTemp:2500,starProbeNm:50}).section;expect(metric(s,'sample')).toBeGreaterThan(0);expect(s.querySelector('[data-st-metric=sample]').textContent).toBe('<0.001%');expect(s.querySelector('[data-st-metric=flux]').textContent).toMatch(/× 10[⁰¹²³⁴⁵⁶⁷⁸⁹]+/);});
});
