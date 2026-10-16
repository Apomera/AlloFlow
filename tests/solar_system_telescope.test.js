import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function telescopeTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-telescope') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderTS(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showScope: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-ts-test-callback': id }, ...children);
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
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => telescopeTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-telescope'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.tsTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

const attr=(el,key)=>Number(el.getAttribute(key)),metric=(s,key)=>Number(s.querySelector('[data-ts-metric='+key+']').dataset.value);
describe('Telescope aperture, diffraction and independent magnification',()=>{
  beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_solarsystem.js','solarSystem');vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('requestAnimationFrame',()=>1);vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);});
  afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';});
  it.each([2,10,20,650,700].flatMap(ap=>[.02,1,10].map(sep=>[ap,sep])))('keeps physical ratios and geometry consistent for %s cm at %s arcseconds',(scopeAp,scopeSeparation)=>{
    const env=renderTS({scopeAp,scopeSeparation,scopeMag:500}),s=env.section,rayleigh=metric(s,'rayleigh');
    expect(rayleigh).toBeCloseTo(13.84036849918/scopeAp,11);expect(metric(s,'light')).toBeCloseTo(scopeAp**2/100,10);expect(metric(s,'area')).toBeCloseTo(Math.PI*scopeAp**2/40000,12);expect(metric(s,'ratio')).toBeCloseTo(scopeSeparation/rayleigh,10);
    for(const kind of['detail','eyepiece']){
      const svg=s.querySelector('[data-ts-map='+kind+']'),scale=+svg.dataset.scale,rings=[...svg.querySelectorAll('[data-ts-ring]')],centers=[...svg.querySelectorAll('[data-ts-center]')];
      expect(rings).toHaveLength(2);expect(attr(rings[1],'cx')-attr(rings[0],'cx')).toBeCloseTo(scopeSeparation*scale,10);expect(attr(rings[0],'r')).toBeCloseTo(rayleigh*scale,10);expect(attr(rings[1],'r')).toBe(attr(rings[0],'r'));
      expect((attr(rings[1],'cx')-attr(rings[0],'cx'))/attr(rings[0],'r')).toBeCloseTo(metric(s,'ratio'),10);
      for(let i=0;i<2;i++){expect(+centers[i].dataset.x).toBe(attr(rings[i],'cx'));if(kind==='detail'){expect(attr(rings[i],'cx')-attr(rings[i],'r')).toBeGreaterThanOrEqual(24);expect(attr(rings[i],'cx')+attr(rings[i],'r')).toBeLessThanOrEqual(596);expect(attr(rings[i],'r')).toBeLessThanOrEqual(100+1e-10);}}
      if(kind==='eyepiece'){expect(2*Number(svg.dataset.halfSpan)*500/60).toBeCloseTo(+s.dataset.tsField,10);expect(svg.querySelector('[clip-path]').getAttribute('clip-path')).toBe('url(#solar-ts-eyepiece-clip)');}
    }
    const circles=[...s.querySelectorAll('[data-ts-aperture-circle]')];expect(attr(circles[0],'r')/attr(circles[1],'r')).toBeCloseTo(scopeAp/10,12);expect(env.writes).toBe(0);expect(s.innerHTML).not.toMatch(/NaN|Infinity/);
  });
  it('matches the 10 cm reference and follows diameter-squared light collection',()=>{
    const env=renderTS(),s=env.section;expect(metric(s,'rayleigh')).toBeCloseTo(1.384036849918,12);expect(metric(s,'light')).toBe(1);expect(metric(s,'area')).toBeCloseTo(.007853981633974,14);
    env.invoke('[data-ts-control=scopeAp][data-ts-value="20"]');expect(metric(env.section,'light')).toBe(4);expect(metric(env.section,'rayleigh')).toBeCloseTo(metric(s,'rayleigh')/2,12);expect(env.section.querySelector('[data-ts-verdict]').dataset.tsVerdict).toBe('above');
  });
  it('does not cap magnification or invent detail when a small aperture is enlarged',()=>{
    const env=renderTS({scopeAp:2,scopeMag:50}),before=env.section,detail=before.querySelector('[data-ts-map=detail]').outerHTML,r=metric(before,'ratio'),light=metric(before,'light'),eyepieceRadius=attr(before.querySelector('[data-ts-map=eyepiece] circle'),'r');
    env.invoke('[data-ts-control=scopeMag][data-ts-value="500"]');expect(env.state.scopeMag).toBe(500);expect(+env.section.dataset.tsMagnification).toBe(500);expect(metric(env.section,'ratio')).toBe(r);expect(metric(env.section,'light')).toBe(light);expect(env.section.querySelector('[data-ts-map=detail]').outerHTML).toBe(detail);expect(attr(env.section.querySelector('[data-ts-map=eyepiece] circle'),'r')).toBeCloseTo(eyepieceRadius*10,10);expect(env.section.querySelector('[data-ts-crop-note]').dataset.tsCropNote).toBe('true');
  });
  it('reports cropped ring boundaries only when the fixed window cuts them',()=>{
    const env=renderTS();expect(env.section.querySelector('[data-ts-crop-note]').dataset.tsCropNote).toBe('false');env.invoke('#solar-ts-scopeAp',2);env.invoke('#solar-ts-scopeMag',500);expect(env.section.querySelector('[data-ts-crop-note]').textContent).toContain('are cropped');env.invoke('#solar-ts-scopeAp',700);expect(env.section.querySelector('[data-ts-crop-note]').dataset.tsCropNote).toBe('false');
  });
  it.each([[{},10,50,1],[{scopeAp:Infinity,scopeMag:NaN,scopeSeparation:'1'},10,50,1],[{scopeAp:'650',scopeMag:'500',scopeSeparation:null},10,50,1],[{scopeAp:-10,scopeMag:-100,scopeSeparation:-1},2,10,.02],[{scopeAp:1e9,scopeMag:1e9,scopeSeparation:1e9},700,500,10],[{scopeAp:10.6,scopeMag:57,scopeSeparation:1.237},11,55,1.24]])('normalizes restored values without writing: %j',(seed,ap,mag,sep)=>{
    const env=renderTS(seed);expect(+env.section.dataset.tsAperture).toBe(ap);expect(+env.section.dataset.tsMagnification).toBe(mag);expect(+env.section.dataset.tsSeparation).toBe(sep);expect(env.writes).toBe(0);for(const[key,value]of Object.entries(seed))expect(env.state[key]).toEqual(value);
  });
  it('keeps every native slider preset reachable without rounding away a keyboard step',()=>{
    const env=renderTS();for(const key of['scopeAp','scopeMag','scopeSeparation']){const slider=env.section.querySelector('#solar-ts-'+key),min=+slider.min,max=+slider.max,step=+slider.step;for(const b of [...env.section.querySelectorAll('[data-ts-control='+key+']')]){const v=+b.dataset.tsValue;expect(v).toBeGreaterThanOrEqual(min);expect(v).toBeLessThanOrEqual(max);expect((v-min)/step).toBeCloseTo(Math.round((v-min)/step),8);env.invoke('[data-ts-control='+key+'][data-ts-value="'+v+'"]');expect(env.state[key]).toBe(v);expect(+env.section.querySelector('#solar-ts-'+key).value).toBe(v);}env.invoke('#solar-ts-'+key,min);env.invoke('#solar-ts-'+key,min+step);expect(env.state[key]).toBeCloseTo(min+step,10);}
  });
  it('preserves notes and other labs through experiments and disclosure',()=>{
    const saved={journalEntries:[{observation:'Saved'}],journalDrafts:{Earth:'Draft'},missionLog:[{text:'Evidence'}],researchPoints:350,totalRP:500,selectedPlanet:'Earth',albIce:80,albCloud:60,albDistanceAU:1.5,dopplerVel:1000,dayNightRot:90};const env=renderTS(saved);
    for(const[i,ap,mag]of[[0,10,50],[1,10,200],[2,20,200]]){env.invoke('[data-ts-experiment="'+i+'"]');expect(env.state.scopeAp).toBe(ap);expect(env.state.scopeMag).toBe(mag);expect(env.state.scopeSeparation).toBe(1);}const before=structuredClone(env.state);env.invoke('[aria-controls=solar-ts-content]');expect(env.section.querySelector('#solar-ts-content').hidden).toBe(true);expect(env.section.querySelectorAll('svg')).toHaveLength(0);env.invoke('[aria-controls=solar-ts-content]');expect(env.state).toEqual(before);for(const[key,value]of Object.entries(saved))expect(env.state[key]).toEqual(value);
  });
  it('provides native labels, distinct geometry and explicit model limits',()=>{
    const s=renderTS().section;for(const key of['scopeAp','scopeMag','scopeSeparation']){const id='solar-ts-'+key;expect(s.querySelector('label[for='+id+']')).toBeTruthy();expect(s.querySelector('#'+id).getAttribute('aria-valuetext')).toBeTruthy();}
    for(const svg of s.querySelectorAll('svg'))for(const attribute of['aria-labelledby','aria-describedby'])for(const id of svg.getAttribute(attribute).split(' '))expect(document.getElementById(id)).toBeTruthy();const ids=[...s.querySelectorAll('[id]')].map(el=>el.id);expect(new Set(ids).size).toBe(ids.length);expect(s.querySelectorAll('svg text')).toHaveLength(0);
    for(const text of['not a star photograph','not intensity','not a prediction of eyepiece surface brightness','first dark ring','rings still overlap','550 nm','Atmospheric seeing','equal-brightness','scale, which reframes'])expect(s.textContent).toContain(text);expect(s.querySelectorAll('a[rel="noopener noreferrer"]')).toHaveLength(3);
  });
  it('does not round a near-boundary ratio into an apparently equal criterion',()=>{
    for(const[scopeAp,scopeSeparation]of[[69,.2],[2,6.92]]){const s=renderTS({scopeAp,scopeSeparation}).section;expect(metric(s,'ratio')).toBeLessThan(1);expect(Number(s.querySelector('[data-ts-metric=ratio]').textContent.replace('×',''))).toBeLessThan(1);expect(s.querySelector('[data-ts-verdict]').dataset.tsVerdict).toBe('below');}
  });
  it('offers a close field without changing optics and identifies stars beyond the window',()=>{
    const env=renderTS({scopeAp:10,scopeMag:500,scopeSeparation:10}),s=env.section,ratio=metric(s,'ratio'),radius=attr(s.querySelector('[data-ts-map=eyepiece] circle'),'r');expect(+s.dataset.tsField).toBe(20);expect(s.querySelector('[data-ts-offscreen]')).toBeTruthy();expect(s.querySelector('[data-ts-centers-outside]').dataset.tsCentersOutside).toBe('true');
    env.invoke('button[data-ts-field="120"]');expect(env.state.scopeFieldArcmin).toBe(120);expect(+env.section.dataset.tsField).toBe(120);expect(env.state.scopeMag).toBe(500);expect(metric(env.section,'ratio')).toBe(ratio);expect(attr(env.section.querySelector('[data-ts-map=eyepiece] circle'),'r')).toBeCloseTo(radius/6,10);expect(env.section.querySelector('[data-ts-offscreen]')).toBeNull();
    expect(+renderTS({scopeFieldArcmin:'120'}).section.dataset.tsField).toBe(20);expect(+renderTS({scopeFieldArcmin:1000}).section.dataset.tsField).toBe(20);
  });
});
