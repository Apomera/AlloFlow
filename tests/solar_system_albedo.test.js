import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function albedoTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-albedo') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderAB(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showAlbedo: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-ab-test-callback': id }, ...children);
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
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => albedoTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-albedo'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.abTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

const attr=(el,key)=>Number(el.getAttribute(key)),metric=(s,key)=>Number(s.querySelector('[data-ab-metric='+key+']').dataset.value),sigma=5.670374419e-8;
const points=path=>{const values=path.getAttribute('d').match(/-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi).map(Number);return Array.from({length:values.length/2},(_,i)=>({a:(values[i*2]-16)/588,t:(276-values[i*2+1])/252*600}));};
describe('Planetary albedo energy balance and visual scales',()=>{
  beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_solarsystem.js','solarSystem');vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('requestAnimationFrame',()=>1);vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);});
  afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';});
  it.each([[0,0],[100,0],[0,100],[100,100],[30,60],[80,0],[80,60],[80,100],[13,57],[50,50]].flatMap(([ice,cloud])=>[.3,1,1.5,5].map(distance=>[ice,cloud,distance])))('conserves energy at ice=%s percent, cloud=%s percent, distance=%s AU',(albIce,albCloud,albDistanceAU)=>{
    const env=renderAB({albIce,albCloud,albDistanceAU}),s=env.section,albedo=metric(s,'albedo'),temperature=metric(s,'temperature'),incoming=1361/(4*albDistanceAU**2),expectedA=(albCloud*.5+(100-albCloud)*(albIce*.6+(100-albIce)*.1)/100)/100;
    expect(albedo).toBeCloseTo(expectedA,12);expect(albedo).toBeGreaterThanOrEqual(.1-1e-12);expect(albedo).toBeLessThanOrEqual(.6+1e-12);expect(metric(s,'irradiance')).toBeCloseTo(incoming*4,10);expect(metric(s,'incoming')).toBeCloseTo(incoming,10);expect(metric(s,'reflected')/incoming).toBeCloseTo(albedo,12);expect(metric(s,'absorbed')/incoming).toBeCloseTo(1-albedo,12);expect(metric(s,'emitted')).toBeCloseTo(metric(s,'absorbed'),9);expect(metric(s,'reflected')+metric(s,'emitted')).toBeCloseTo(incoming,9);expect(sigma*temperature**4).toBeCloseTo(incoming*(1-albedo),9);
    const columns=[...s.querySelectorAll('[data-ab-column]')];expect(columns.map(c=>c.dataset.abColumn)).toEqual(['cloud','ice','dark']);expect(columns.reduce((sum,c)=>sum+Number(c.dataset.weight),0)).toBeCloseTo(1,12);expect(columns.reduce((sum,c)=>sum+Number(c.dataset.contribution),0)).toBeCloseTo(albedo,12);
    let preceding=0;for(const c of columns){expect(attr(c,'width')/672).toBeCloseTo(+c.dataset.weight,12);expect((attr(c,'x')-24)/672).toBeCloseTo(preceding,12);preceding+=Number(c.dataset.weight);expect(+c.dataset.contribution).toBeCloseTo(+c.dataset.weight*Number(c.dataset.reflectivity),12);}
    const energy=[...s.querySelectorAll('[data-ab-energy]')];expect(energy.map(c=>c.dataset.abEnergy)).toEqual(['incoming','reflected','thermal']);for(const bar of energy){expect(attr(bar,'width')/672).toBeCloseTo(+bar.dataset.fraction,12);expect(+bar.dataset.flux/incoming).toBeCloseTo(+bar.dataset.fraction,12);}expect(attr(energy[1],'width')+attr(energy[2],'width')).toBeCloseTo(672,10);expect(attr(energy[2],'x')).toBeCloseTo(24+attr(energy[1],'width'),10);
    const selected=s.querySelector('[data-ab-selected]');expect((attr(selected,'cx')-16)/588).toBeCloseTo(albedo,12);expect((276-attr(selected,'cy'))/252*600).toBeCloseTo(temperature,10);
    for(const path of s.querySelectorAll('[data-ab-curve-path]')){const ps=points(path),distance=+path.dataset.distance;expect(ps).toHaveLength(121);expect(ps[0].a).toBeCloseTo(0,12);expect(ps.at(-1).a).toBeCloseTo(1,12);expect(ps.at(-1).t).toBeCloseTo(0,12);for(let i=0;i<ps.length;i++){const p=ps[i];expect(p.a).toBeGreaterThanOrEqual(-1e-12);expect(p.a).toBeLessThanOrEqual(1+1e-12);expect(p.t).toBeGreaterThanOrEqual(-1e-10);expect(p.t).toBeLessThan(600);expect(sigma*p.t**4).toBeCloseTo(1361*(1-p.a)/(4*distance**2),8);if(i){expect(p.a).toBeGreaterThanOrEqual(ps[i-1].a);expect(p.t).toBeLessThanOrEqual(ps[i-1].t);}}}
    expect(env.writes).toBe(0);expect(s.innerHTML).not.toMatch(/NaN|Infinity/);
  });
  it('matches the reference energy-budget example and Kelvin-to-Celsius conversion',()=>{
    const env=renderAB(),s=env.section;expect(metric(s,'albedo')).toBeCloseTo(.4,12);expect(metric(s,'incoming')).toBe(340.25);expect(metric(s,'reflected')).toBeCloseTo(136.10,10);expect(metric(s,'absorbed')).toBeCloseTo(204.15,10);expect(metric(s,'temperature')).toBeCloseTo(244.953930176,8);expect(s.textContent).toContain('-28.20 °C equivalent');
  });
  it('uses inverse-square flux and inverse-square-root temperature with a fixed one-AU reference',()=>{
    const env=renderAB({albDistanceAU:1}),reference=env.section.querySelector('[data-ab-curve-path=reference]').getAttribute('d'),t=metric(env.section,'temperature'),incoming=metric(env.section,'incoming');env.invoke('[data-ab-control=albDistanceAU][data-ab-value="5"]');expect(metric(env.section,'incoming')).toBeCloseTo(incoming/25,12);expect(metric(env.section,'temperature')).toBeCloseTo(t/Math.sqrt(5),12);expect(env.section.querySelector('[data-ab-curve-path=reference]').getAttribute('d')).toBe(reference);
  });
  it('masks surface changes under complete cloud cover',()=>{
    const env=renderAB({albIce:0,albCloud:100}),t=metric(env.section,'temperature');env.invoke('[data-ab-control=albIce][data-ab-value="100"]');expect(metric(env.section,'temperature')).toBe(t);expect(metric(env.section,'albedo')).toBe(.5);expect(env.section.querySelector('[data-ab-mask-note]').textContent).toContain('cannot change');expect(+env.section.querySelector('[data-ab-column=ice]').dataset.weight).toBe(0);
  });
  it('explains when clouds mask a brighter surface instead of increasing reflection',()=>{
    const env=renderAB({albIce:100,albCloud:0}),a=metric(env.section,'albedo'),t=metric(env.section,'temperature');env.invoke('[data-ab-control=albCloud][data-ab-value="60"]');expect(metric(env.section,'albedo')).toBeLessThan(a);expect(metric(env.section,'temperature')).toBeGreaterThan(t);expect(env.section.querySelector('[data-ab-mask-note]').textContent).toContain('hides brighter surface');
    env.invoke('[data-ab-control=albIce][data-ab-value="80"]');expect(metric(env.section,'albedo')).toBeCloseTo(.5,12);expect(env.section.querySelector('[data-ab-mask-note]').textContent).toContain('leaves this model’s albedo unchanged');env.invoke('[data-ab-control=albCloud][data-ab-value="0"]');expect(metric(env.section,'albedo')).toBeCloseTo(.5,12);
  });
  it.each([
    [{},30,60,1],
    [{albIce:Infinity,albCloud:NaN,albDistanceAU:Infinity},30,60,1],
    [{albIce:'100',albCloud:'0',albDistanceAU:'5'},30,60,1],
    [{albIce:1000,albCloud:1000,albDistanceAU:100},100,100,5],
    [{albIce:-1,albCloud:-1,albDistanceAU:-1},0,0,.3],
    [{albIce:25.6,albCloud:41.4,albDistanceAU:1.56},26,41,1.6],
  ])('normalizes restored values without writing: %j',(seed,ice,cloud,distance)=>{
    const env=renderAB(seed),s=env.section;expect(+s.dataset.abIce).toBe(ice);expect(+s.dataset.abCloud).toBe(cloud);expect(+s.dataset.abDistance).toBe(distance);expect(env.writes).toBe(0);for(const[key,value]of Object.entries(seed))expect(env.state[key]).toEqual(value);expect(s.innerHTML).not.toMatch(/NaN|Infinity/);
  });
  it('applies coverage presets atomically in outcome and preserves notes, rewards and other labs',()=>{
    const saved={journalEntries:[{observation:'Saved evidence'}],journalDrafts:{Earth:'Draft'},signalNotebooks:{Mars:{explanation:'My idea'}},missionLog:[{text:'Observation'}],researchPoints:350,totalRP:500,selectedPlanet:'Earth',dopplerVel:1000,dopplerRestNm:650,spectroElem:'sodium',spectroLineIndex:2,dayNightRot:90};
    const env=renderAB(saved);for(const[key,ice,cloud]of[['dark',0,0],['ice',100,0],['cloud',30,100],['mixed',30,60]]){env.invoke('[data-ab-mix='+key+']');expect(env.state.albIce).toBe(ice);expect(env.state.albCloud).toBe(cloud);}env.invoke('#solar-ab-albDistanceAU',1.5);expect(env.state.albDistanceAU).toBe(1.5);const before=structuredClone(env.state);
    env.invoke('[aria-controls=solar-ab-content]');expect(env.section.querySelectorAll('svg')).toHaveLength(0);expect(env.section.querySelector('#solar-ab-content').hidden).toBe(true);env.invoke('[aria-controls=solar-ab-content]');expect(env.state).toEqual(before);for(const[key,value]of Object.entries(saved))expect(env.state[key]).toEqual(value);
  });
  it('provides native labels and explicit scientific model limits',()=>{
    const env=renderAB(),s=env.section;for(const id of['solar-ab-albIce','solar-ab-albCloud','solar-ab-albDistanceAU']){expect(s.querySelector('label[for='+id+']')).toBeTruthy();expect(s.querySelector('#'+id).getAttribute('aria-valuetext')).toBeTruthy();}
    for(const svg of s.querySelectorAll('svg'))for(const attr of['aria-labelledby','aria-describedby'])for(const id of svg.getAttribute(attr).split(' '))expect(document.getElementById(id)).toBeTruthy();
    const ids=[...s.querySelectorAll('[id]')].map(el=>el.id);expect(new Set(ids).size).toBe(ids.length);expect(s.querySelectorAll('svg text')).toHaveLength(0);for(const text of['not a predicted surface temperature','not measured planetary properties','producing the factor of four','not a third outgoing share','do not evolve with temperature','both curves coincide','not every curve point is reachable'])expect(s.textContent).toContain(text);expect(s.querySelectorAll('a[rel="noopener noreferrer"]')).toHaveLength(3);
  });
});
