import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function orbitTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-orbit-shadow') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderIO(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showISS: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-io-test-callback': id }, ...children);
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
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => orbitTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-orbit-shadow'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.ioTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

const metric=(s,key)=>Number(s.querySelector('[data-io-metric='+key+']').dataset.value);
const orbitalRefs=[[200,7.788487984973,88.350076705377,75.827559688230],[400,7.672598648385,92.414251599680,70.207403468856],[1200,7.255916307640,109.267145925611,57.298905553958]];
const eclipseRefs=[[200,0,37.218726193537],[200,30,36.114322923435],[200,60,29.783945316927],[200,75,9.284759190523],[200,90,0],[400,0,36.045359157395],[400,30,34.390030211502],[400,60,24.321494535844],[400,75,0],[400,90,0],[1200,0,34.782710414123],[1200,30,31.203854183483],[1200,60,0],[1200,75,0],[1200,90,0]];
describe('Circular orbit sunlight and cylindrical eclipse model',()=>{
  beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_solarsystem.js','solarSystem');vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('requestAnimationFrame',()=>1);vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);});
  afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';});
  it.each(eclipseRefs.flatMap(([alt,beta])=>[0,90,180,270,360].map(phase=>[alt,beta,phase])))('aligns spacecraft, lighting and timeline at %skm beta%s phase%s',(issAltitudeKm,issBetaDeg,issOrbit)=>{
    const env=renderIO({issAltitudeKm,issBetaDeg,issOrbit}),s=env.section,r=6371+issAltitudeKm,q=6371/r,rad=Math.PI/180,critical=Math.asin(q)/rad,half=issBetaDeg>=critical?0:Math.acos(Math.sqrt(1-q*q)/Math.cos(issBetaDeg*rad)),entry=180-half/rad,exit=180+half/rad,shadow=half>0&&issOrbit>entry&&issOrbit<exit;
    expect(s.dataset.ioShadow).toBe(String(shadow));expect(s.querySelector('[data-io-status]').textContent).toBe(shadow?'Spacecraft in Earth’s shadow':'Spacecraft in sunlight');expect(metric(s,'eclipseMinutes')/metric(s,'periodMinutes')).toBeCloseTo(half/Math.PI,12);expect(metric(s,'elapsedMinutes')).toBeCloseTo(metric(s,'periodMinutes')*issOrbit/360,12);
    const craft=s.querySelector('[data-io-spacecraft]'),orbit=s.querySelector('[data-io-orbit-radius]');expect(+orbit.getAttribute('r')).toBeCloseTo(100/q,12);expect(+s.querySelector('[data-io-earth-radius]').getAttribute('r')).toBe(100);expect(+craft.getAttribute('cx')).toBeCloseTo(310+100/q*Math.cos(issOrbit*rad),10);expect(+craft.getAttribute('cy')).toBeCloseTo(180-100/q*Math.sin(issOrbit*rad),10);expect(+s.querySelector('[data-io-phase-marker]').getAttribute('cx')).toBeCloseTo(20+issOrbit/360*580,10);
    const band=s.querySelector('[data-io-night-band]');expect(!!band).toBe(half>0);expect(!!s.querySelector('[data-io-eclipse-arc]')).toBe(half>0);if(band){expect(+band.getAttribute('x')).toBeCloseTo(20+entry/360*580,10);expect(+band.getAttribute('width')).toBeCloseTo((exit-entry)/360*580,10);}expect(+s.querySelector('[data-io-earth-day]').dataset.litFraction).toBeCloseTo((1+Math.sin(issBetaDeg*rad))/2,12);expect(!!s.querySelector('[data-io-sun-arrows]')).toBe(issBetaDeg<90);expect(s.innerHTML).not.toMatch(/NaN|Infinity/);expect(env.writes).toBe(0);
  });
  it.each(orbitalRefs)('matches independently computed circular orbit at %skm',(issAltitudeKm,speed,period,critical)=>{const s=renderIO({issAltitudeKm}).section;expect(metric(s,'speed')).toBeCloseTo(speed,10);expect(metric(s,'periodMinutes')).toBeCloseTo(period,10);expect(+s.querySelector('[data-io-eclipse-summary]').dataset.critical).toBeCloseTo(critical,10);});
  it.each(eclipseRefs)('matches independently computed eclipse duration at %skm and beta%s',(issAltitudeKm,issBetaDeg,minutes)=>{expect(metric(renderIO({issAltitudeKm,issBetaDeg}).section,'eclipseMinutes')).toBeCloseTo(minutes,10);});
  it.each([[200,75,76],[400,70,71],[1200,57,58]])('removes the eclipse across the critical angle at %skm',(issAltitudeKm,low,high)=>{const env=renderIO({issAltitudeKm,issBetaDeg:low,issOrbit:180});expect(env.section.dataset.ioShadow).toBe('true');expect(metric(env.section,'eclipseMinutes')).toBeGreaterThan(0);env.invoke('#solar-io-issBetaDeg',high);expect(env.section.dataset.ioShadow).toBe('false');expect(metric(env.section,'eclipseMinutes')).toBe(0);expect(env.section.querySelector('[data-io-night-band]')).toBeNull();});
  it('resolves entry and exit symmetrically and treats 360 degrees as one completed orbit',()=>{const env=renderIO({issOrbit:109});expect(env.section.dataset.ioShadow).toBe('false');env.invoke('#solar-io-issOrbit',110);expect(env.section.dataset.ioShadow).toBe('true');env.invoke('#solar-io-issOrbit',250);expect(env.section.dataset.ioShadow).toBe('true');env.invoke('#solar-io-issOrbit',251);expect(env.section.dataset.ioShadow).toBe('false');env.invoke('#solar-io-issOrbit',360);expect(metric(env.section,'elapsedMinutes')).toBeCloseTo(metric(env.section,'periodMinutes'),12);expect(+env.section.querySelector('[data-io-spacecraft]').getAttribute('cy')).toBeCloseTo(180,10);});
  it.each([[{},0,400,0],[{issOrbit:NaN,issAltitudeKm:Infinity,issBetaDeg:NaN},0,400,0],[{issOrbit:'90',issAltitudeKm:'800',issBetaDeg:'60'},0,400,0],[{issOrbit:-10,issAltitudeKm:-10,issBetaDeg:-10},0,200,0],[{issOrbit:1e9,issAltitudeKm:1e9,issBetaDeg:100},360,1200,90],[{issOrbit:89.7,issAltitudeKm:444.7,issBetaDeg:29.7},90,440,30]])('normalizes restored inputs without changing saved work: %j',(seed,phase,alt,beta)=>{const env=renderIO(seed);expect(+env.section.dataset.ioPhase).toBe(phase);expect(+env.section.dataset.ioAltitude).toBe(alt);expect(+env.section.dataset.ioBeta).toBe(beta);expect(env.writes).toBe(0);for(const[key,value]of Object.entries(seed))expect(env.state[key]).toEqual(value);});
  it('preserves saved work and values through presets and disclosure',()=>{const saved={researchPoints:350,totalRP:500,swSpeed:800,swDens:10,foucLat:-45,foucTime:6,atmAlt:80,journalEntries:[{observation:'Saved evidence'}],missionLog:[{text:'Keep'}]};const env=renderIO(saved);for(const key of['issOrbit','issAltitudeKm','issBetaDeg'])for(const button of [...env.section.querySelectorAll('[data-io-preset='+key+']')]){const value=+button.dataset.value;env.invoke('[data-io-preset='+key+'][data-value="'+value+'"]');expect(env.state[key]).toBe(value);}const before=structuredClone(env.state);env.invoke('[aria-controls=solar-io-content]');expect(env.section.querySelector('#solar-io-content').hidden).toBe(true);expect(env.section.querySelectorAll('svg')).toHaveLength(0);env.invoke('[aria-controls=solar-io-content]');expect(env.state).toEqual(before);for(const[key,value]of Object.entries(saved))expect(env.state[key]).toEqual(value);});
  it('labels diagrams and explains the geometry and limits',()=>{const s=renderIO().section;for(const key of['issOrbit','issAltitudeKm','issBetaDeg']){expect(s.querySelector('label[for=solar-io-'+key+']')).toBeTruthy();expect(s.querySelector('#solar-io-'+key).getAttribute('aria-valuetext')).toBeTruthy();}for(const svg of s.querySelectorAll('svg'))for(const a of['aria-labelledby','aria-describedby'])for(const id of svg.getAttribute(a).split(' '))expect(document.getElementById(id)).toBeTruthy();const ids=[...s.querySelectorAll('[id]')].map(el=>el.id);expect(new Set(ids).size).toBe(ids.length);expect(s.querySelectorAll('svg text')).toHaveLength(0);for(const text of['not live ISS tracking','one fixed scale','marker is enlarged','intersection with the orbital plane','penumbra','Sun’s finite size','not an ISS operational range','not geographic latitude','counterclockwise'])expect(s.textContent).toContain(text);expect(renderIO({issBetaDeg:90}).section.textContent).toContain('Sun toward the viewer');});
});
