import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function spectroscopyTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-spectroscopy') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderSP(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showSpectro: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-sp-test-callback': id }, ...children);
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
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => spectroscopyTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-spectroscopy'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.spTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

const expected={hydrogen:[410.174,434.0462,486.13615,656.28518],helium:[388.86489,402.6191,447.1479,501.5678,587.56148,667.81517,706.51771,728.135],sodium:[568.2633,568.8205,588.995,589.5924,615.4225,616.0747],neon:[540.05618,585.24879,602.99969,614.30626,640.2248,650.65281,692.94673,703.24131],mercury:[404.6563,435.8328,546.0735,576.9598,579.0663,708.19],argon:[696.5431,706.7218,727.2936,738.398,750.3869,751.4652,763.5106,794.8176]};
const attr=(el,key)=>Number(el.getAttribute(key)),metric=(s,key)=>Number(s.querySelector('[data-sp-metric='+key+']').dataset.value);
describe('Reference spectral lines and shared wavelength scales',()=>{
  beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_solarsystem.js','solarSystem');vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('requestAnimationFrame',()=>1);vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);});
  afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';});
  it.each(Object.keys(expected).flatMap(key=>[2,20,100].map(span=>[key,span])))('plots all %s reference wavelengths with a %s nm detail window',(spectroElem,spectroSpanNm)=>{
    const env=renderSP({spectroElem,spectroSpanNm,spectroCompare:'helium'});
    expect([...env.section.querySelectorAll('[data-sp-line-index]')].map(el=>+el.dataset.wavelength)).toEqual(expected[spectroElem]);
    for(let index=0;index<expected[spectroElem].length;index++){
      env.invoke('[data-sp-line-index="'+index+'"]');const s=env.section,wavelength=expected[spectroElem][index];expect(metric(s,'wavelength')).toBe(wavelength);
      for(const lane of s.querySelectorAll('[data-sp-lane]')){
        const min=+lane.dataset.min,max=+lane.dataset.max,lines=[...lane.querySelectorAll('[data-sp-line]')];
        expect(lines.map(el=>+el.dataset.spLine)).toEqual(expected[lane.dataset.element].filter(w=>w>=min&&w<=max));
        expect(min).toBeGreaterThanOrEqual(380);expect(max).toBeLessThanOrEqual(800);expect(wavelength).toBeGreaterThanOrEqual(min);expect(wavelength).toBeLessThanOrEqual(max);
        if(lane.dataset.zoomed==='true')expect(max-min).toBeCloseTo(spectroSpanNm,10);else{expect(min).toBe(380);expect(max).toBe(800);}
        for(const line of lines){const value=+line.dataset.spLine;expect((attr(line,'x1')-24)/672*(max-min)+min).toBeCloseTo(value,10);expect(attr(line,'x1')).toBe(attr(line,'x2'));expect(line.dataset.region).toBe(value>700?'red-edge-near-infrared':'visible');expect(line.style.stroke).not.toBe('#000');}
        const cursor=lane.querySelector('[data-sp-cursor]');expect((Number(cursor.dataset.x)-24)/672*(max-min)+min).toBeCloseTo(wavelength,10);
      }
      const minGap=Math.min(...expected.helium.map(w=>Math.abs(w-wavelength)));expect(metric(s,'difference')).toBeCloseTo(minGap,10);expect(Math.abs(metric(s,'nearest')-wavelength)).toBeCloseTo(minGap,10);expect(env.writes).toBe(0);expect(s.innerHTML).not.toMatch(/NaN|Infinity/);
    }
  });
  it.each(Object.keys(expected))('uses the same axes for comparison with %s',(spectroCompare)=>{
    const env=renderSP({spectroElem:'sodium',spectroLineIndex:2,spectroSpanNm:2,spectroCompare}),s=env.section;
    for(const zoom of['false','true']){const rows=[...s.querySelectorAll('[data-sp-lane][data-zoomed='+zoom+']')];expect(rows).toHaveLength(2);expect(rows[0].dataset.min).toBe(rows[1].dataset.min);expect(rows[0].dataset.max).toBe(rows[1].dataset.max);expect(rows[0].querySelector('[data-sp-cursor]').getAttribute('d')).toBe(rows[1].querySelector('[data-sp-cursor]').getAttribute('d'));}
    if(spectroCompare==='sodium'){expect(metric(s,'difference')).toBe(0);expect(s.textContent).toContain('patterns coincide');}
  });
  it('preserves the sodium doublet separation on both scales',()=>{
    const env=renderSP({spectroElem:'sodium',spectroLineIndex:2,spectroSpanNm:2,spectroCompare:'none'}),s=env.section;
    for(const zoom of['false','true']){const row=s.querySelector('[data-sp-lane][data-zoomed='+zoom+']'),first=row.querySelector('[data-sp-line="588.995"]'),second=row.querySelector('[data-sp-line="589.5924"]'),span=+row.dataset.max-Number(row.dataset.min);expect((attr(second,'x1')-attr(first,'x1'))/672*span).toBeCloseTo(.5974,10);}
    expect(s.querySelectorAll('svg')).toHaveLength(2);expect(s.querySelector('[data-sp-metric=nearest]')).toBeNull();expect(s.textContent).toContain('does not simulate an instrument');
  });
  it('keeps argon’s near-infrared line and clamps the enlarged window inside the overview',()=>{
    const env=renderSP({spectroElem:'argon',spectroLineIndex:7,spectroSpanNm:100});const row=env.section.querySelector('[data-sp-lane=primary][data-zoomed=true]');expect(+row.dataset.min).toBe(700);expect(+row.dataset.max).toBe(800);expect(row.querySelector('[data-sp-line="794.8176"]')).toBeTruthy();
  });
  it('keeps the overview fixed when zoom changes and explains empty subset windows',()=>{
    const env=renderSP({spectroElem:'hydrogen',spectroLineIndex:0,spectroCompare:'sodium',spectroSpanNm:100}),before=env.section.querySelector('[data-sp-lane=primary][data-zoomed=false]').outerHTML;
    env.invoke('[data-sp-span-preset="2"]');expect(env.section.querySelector('[data-sp-lane=primary][data-zoomed=false]').outerHTML).toBe(before);expect(env.section.querySelector('[data-sp-lane=reference][data-zoomed=true]').textContent).toContain('0 of 6');expect(env.section.textContent).toContain('small teaching subset');
  });
  it.each([
    [{spectroElem:'unknown',spectroCompare:'unknown'},'hydrogen','sodium',0,20],
    [{spectroElem:'__proto__',spectroCompare:'constructor'},'hydrogen','sodium',0,20],
    [{spectroElem:'argon',spectroLineIndex:999,spectroSpanNm:999},'argon','sodium',7,100],
    [{spectroElem:'helium',spectroLineIndex:-1,spectroSpanNm:-1},'helium','sodium',0,2],
    [{spectroElem:'sodium',spectroCompare:'none',spectroLineIndex:2.6,spectroSpanNm:3.1},'sodium','none',3,4],
    [{spectroLineIndex:NaN,spectroSpanNm:Infinity},'hydrogen','sodium',0,20],
  ])('normalizes restored fields without writes: %j',(seed,element,comparison,index,span)=>{
    const env=renderSP(seed),s=env.section;expect(s.dataset.spElement).toBe(element);expect(s.dataset.spComparison).toBe(comparison);expect(+s.dataset.spIndex).toBe(index);expect(+s.dataset.spSpan).toBe(span);expect(env.writes).toBe(0);for(const[key,value]of Object.entries(seed))expect(env.state[key]).toEqual(value);
  });
  it('preserves other simulations, authored work and rewards through controls',()=>{
    const saved={journalEntries:[{observation:'Saved evidence'}],journalDrafts:{Earth:'Draft'},signalNotebooks:{Mars:{explanation:'My idea'}},missionLog:[{text:'Observation'}],researchPoints:350,totalRP:500,selectedPlanet:'Earth',dayNightRot:90,emDistanceKm:384400,lagrangeMass:.04,lagrangePoint:'L4'};
    const env=renderSP(saved);env.invoke('[data-sp-element-preset=sodium]');env.invoke('[data-sp-line-index="2"]');env.invoke('[data-sp-compare-preset=helium]');env.invoke('#solar-sp-span',2);const before=structuredClone(env.state);
    env.invoke('[aria-controls=solar-sp-content]');expect(env.section.querySelectorAll('svg')).toHaveLength(0);expect(env.section.querySelector('#solar-sp-content').hidden).toBe(true);env.invoke('[aria-controls=solar-sp-content]');expect(env.state).toEqual(before);for(const[key,value]of Object.entries(saved))expect(env.state[key]).toEqual(value);
  });
  it('names spectra and native controls, and discloses wavelength conventions and model limits',()=>{
    const env=renderSP(),s=env.section;expect(s.querySelector('label[for=solar-sp-span]')).toBeTruthy();expect(s.querySelector('#solar-sp-span').getAttribute('aria-valuetext')).toBeTruthy();
    for(const svg of s.querySelectorAll('svg'))for(const attr of['aria-labelledby','aria-describedby'])for(const id of svg.getAttribute(attr).split(' '))expect(document.getElementById(id)).toBeTruthy();
    const ids=[...s.querySelectorAll('[id]')].map(el=>el.id);expect(new Set(ids).size).toBe(ids.length);expect(s.querySelectorAll('svg text')).toHaveLength(0);expect(s.textContent).toContain('air-wavelength');expect(s.textContent).toContain('not complete spectra');expect(s.textContent).toContain('do not measure intensity');expect(s.querySelectorAll('a[rel="noopener noreferrer"]')).toHaveLength(3);
  });
});
