import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function emsTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-earth-moon-scale') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderEMS(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showEMS: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-ems-test-callback': id }, ...children);
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
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => emsTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-earth-moon-scale'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.emsTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

const attr=(el,key)=>Number(el.getAttribute(key));
const metric=(section,key)=>Number(section.querySelector('[data-ems-metric='+key+']').dataset.value);
describe('Earth-Moon true scale and light crossing',()=>{
  beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_solarsystem.js','solarSystem');vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('requestAnimationFrame',()=>1);vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);});
  afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';});

  it.each([357000,363300,384400,405500,407000].flatMap(distance=>[0,50,100].map(progress=>[distance,progress])))('uses one physical scale at %s km and %s percent light progress',(emDistanceKm,emLightProgress)=>{
    const env=renderEMS({emDistanceKm,emLightProgress}),s=env.section,earth=s.querySelector('[data-ems-earth]'),moon=s.querySelector('[data-ems-moon]');
    const ex=attr(earth,'cx'),mx=attr(moon,'cx'),er=attr(earth,'r'),mr=attr(moon,'r'),scale=er/6371;
    expect((mx-ex)/scale).toBeCloseTo(emDistanceKm,8);expect(mr/scale).toBeCloseTo(1737.4,10);expect(attr(earth,'cy')).toBe(attr(moon,'cy'));
    expect((mx-ex)/(2*er)).toBeCloseTo(metric(s,'center-diameters'),12);
    const gap=(mx-mr-ex-er)/scale;expect(gap).toBeCloseTo(emDistanceKm-8108.4,8);expect(metric(s,'gap-km')).toBeCloseTo(gap,8);expect(metric(s,'gap-diameters')).toBeCloseTo(gap/12742,12);
    const track=s.querySelector('[data-ems-light-track]'),pulse=s.querySelector('[data-ems-signal]'),progress=s.querySelector('[data-ems-light-progress]');
    expect(attr(track,'x1')).toBeCloseTo(ex+er,12);expect(attr(track,'x2')).toBeCloseTo(mx-mr,12);
    const traveled=(Number(pulse.dataset.x)-attr(track,'x1'))/scale;
    expect(traveled).toBeCloseTo(gap*emLightProgress/100,8);expect(attr(progress,'x2')).toBe(Number(pulse.dataset.x));
    expect(metric(s,'traveled')).toBeCloseTo(traveled,8);expect(metric(s,'elapsed')*299792.458).toBeCloseTo(traveled,8);
    expect(metric(s,'remaining')+metric(s,'elapsed')).toBeCloseTo(metric(s,'light-time'),12);expect(metric(s,'light-time')).toBeCloseTo(gap/299792.458,12);
    const ticks=[...s.querySelectorAll('[data-ems-tick]')];expect(ticks).toHaveLength(34);
    for(let i=0;i<ticks.length;i++){expect(attr(ticks[i],'x1')).toBeCloseTo(ex+i*2*er,12);expect(attr(ticks[i],'x2')).toBe(attr(ticks[i],'x1'));}
    expect(metric(s,'center-km')).toBe(emDistanceKm);expect(env.writes).toBe(0);expect(s.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('uses published mean-radius ratios and reference values',()=>{
    const env=renderEMS();expect(metric(env.section,'earth-diameter')).toBe(12742);expect(metric(env.section,'moon-diameter')).toBe(3474.8);
    expect(metric(env.section,'center-diameters')).toBeCloseTo(30.1679485,7);expect(metric(env.section,'gap-diameters')).toBeCloseTo(29.5315963,7);
    expect(metric(env.section,'light-time')).toBeCloseTo(1.25517368,7);
  });

  it('keeps the ruler and body sizes fixed while distance changes',()=>{
    const env=renderEMS({emDistanceKm:363300,emLightProgress:50});
    const geometry=()=>{const s=env.section;return{earth:s.querySelector('[data-ems-earth]').outerHTML,moonR:attr(s.querySelector('[data-ems-moon]'),'r'),moonX:attr(s.querySelector('[data-ems-moon]'),'cx'),ticks:[...s.querySelectorAll('[data-ems-tick]')].map(el=>el.outerHTML)};};
    const first=geometry(),firstTime=metric(env.section,'light-time');env.invoke('[data-ems-distance-preset="405500"]');const next=geometry();
    expect(next.earth).toBe(first.earth);expect(next.moonR).toBe(first.moonR);expect(next.ticks).toEqual(first.ticks);expect(next.moonX).toBeGreaterThan(first.moonX);expect(metric(env.section,'light-time')).toBeGreaterThan(firstTime);expect(env.state.emLightProgress).toBe(50);
  });

  it('enlarges both bodies together without changing the true-scale map or physical measurements',()=>{
    const env=renderEMS({emScale:'true'}),before=env.section.querySelector('[data-ems-map]').outerHTML;
    expect(env.section.querySelector('[data-ems-size-map]')).toBeNull();expect(env.section.querySelector('#solar-ems-size-detail').hidden).toBe(true);
    env.invoke('[data-ems-mode=textbook]');expect(env.state.emScale).toBe('textbook');expect(env.section.querySelector('[data-ems-map]').outerHTML).toBe(before);
    const er=attr(env.section.querySelector('[data-ems-earth]'),'r'),mr=attr(env.section.querySelector('[data-ems-moon]'),'r'),largeE=attr(env.section.querySelector('[data-ems-large-earth]'),'r'),largeM=attr(env.section.querySelector('[data-ems-large-moon]'),'r');
    expect(largeE/er).toBeCloseTo(largeM/mr,12);expect(largeM/largeE).toBeCloseTo(1737.4/6371,12);expect(env.section.textContent).toContain('spacing is arbitrary');
    env.invoke('[data-ems-mode=true]');expect(env.section.querySelector('[data-ems-size-map]')).toBeNull();expect(env.section.querySelector('[data-ems-map]').outerHTML).toBe(before);
  });

  it.each([
    [{emDistanceKm:-1,emLightProgress:-1,emScale:'unknown'},357000,0,false],
    [{emDistanceKm:999999,emLightProgress:500,emScale:'textbook'},407000,100,true],
    [{emDistanceKm:NaN,emLightProgress:Infinity,emScale:null},384400,0,false],
    [{emDistanceKm:'384400',emLightProgress:'50'},384400,0,false],
    [{emDistanceKm:384449,emLightProgress:99.8},384400,100,false],
  ])('normalizes saved inputs for display without writes: %j',(seed,distance,progress,comparison)=>{
    const env=renderEMS(seed);expect(+env.section.dataset.emsDistance).toBe(distance);expect(+env.section.dataset.emsProgress).toBe(progress);expect(env.section.dataset.emsComparison).toBe(String(comparison));expect(env.writes).toBe(0);for(const[key,value]of Object.entries(seed))expect(env.state[key]).toEqual(value);
    if(progress===100){expect(metric(env.section,'remaining')).toBe(0);expect(env.section.textContent).toContain('Arrived');}
  });

  it('preserves authored work, rewards and other simulations through native controls and disclosure',()=>{
    const saved={journalEntries:[{observation:'Saved evidence'}],journalDrafts:{Earth:'Draft'},signalNotebooks:{Mars:{explanation:'My idea'}},missionLog:[{text:'Observation'}],researchPoints:350,totalRP:500,selectedPlanet:'Earth',sunHour:6,tideDist:120};
    const env=renderEMS({...saved,emDistanceKm:384400,emLightProgress:0});
    env.invoke('#solar-ems-distance',363300);expect(env.state.emLightProgress).toBe(0);
    env.invoke('[data-ems-checkpoint="50"]');expect(env.state.emDistanceKm).toBe(363300);expect(env.state.emLightProgress).toBe(50);
    env.invoke('#solar-ems-progress',100);expect(env.state.emLightProgress).toBe(100);
    env.invoke('[data-ems-mode=textbook]');const before=structuredClone(env.state);
    env.invoke('[aria-controls=solar-ems-content]');expect(env.section.querySelectorAll('svg')).toHaveLength(0);expect(env.section.querySelector('#solar-ems-content').hidden).toBe(true);
    env.invoke('[aria-controls=solar-ems-content]');expect(env.state).toEqual(before);for(const[key,value]of Object.entries(saved))expect(env.state[key]).toEqual(value);
  });

  it('labels the model endpoints, units and representative distances',()=>{
    const env=renderEMS({emScale:'textbook'}),s=env.section;
    for(const input of s.querySelectorAll('input')){expect(s.querySelector('label[for="'+input.id+'"]')).toBeTruthy();expect(input.getAttribute('aria-valuetext')).toBeTruthy();}
    for(const svg of s.querySelectorAll('svg'))for(const attr of ['aria-labelledby','aria-describedby'])for(const id of svg.getAttribute(attr).split(' '))expect(document.getElementById(id)).toBeTruthy();
    expect(s.querySelectorAll('svg text')).toHaveLength(0);expect(s.textContent).toContain('not today’s measured distance');expect(s.textContent).toContain('facing surfaces');expect(s.textContent).toContain('not a live orbit');
    expect(s.textContent).not.toContain('Textbook (wrong!)');expect(s.querySelectorAll('a[rel="noopener noreferrer"]')).toHaveLength(3);
  });
});
