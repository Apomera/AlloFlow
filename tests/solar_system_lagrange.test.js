import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function lagrangeTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-lagrange') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderLG(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showLagrange: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-lg-test-callback': id }, ...children);
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
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => lagrangeTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-lagrange'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.lgTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

const attr=(el,key)=>Number(el.getAttribute(key));
const metric=(s,key)=>Number(s.querySelector('[data-lg-metric='+key+']').dataset.value);
const stateCases=[['sun-earth',undefined],['earth-moon',undefined],... [.001,.01,.03,.038,.039,.04,.1,.5].map(mu=>['custom',mu])];
describe('Lagrange points and mass-dependent stability',()=>{
  beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_solarsystem.js','solarSystem');vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('requestAnimationFrame',()=>1);vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);});
  afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';});
  it.each(stateCases)('balances rotating-frame accelerations for %s at custom mu %s',(lagrangeSystem,lagrangeMass)=>{
    const env=renderLG({lagrangeSystem,lagrangeMass}),s=env.section,mu=+s.dataset.lgMu,map=s.querySelector('[data-lg-map]'),points=[...map.querySelectorAll('[data-lg-point]')],primary=-mu,secondary=1-mu;
    expect(points).toHaveLength(5);
    for(const point of points){
      const x=+point.dataset.x,y=+point.dataset.y,delta=[[primary-x,-y,1-mu],[secondary-x,-y,mu]],gravity=delta.reduce((a,[dx,dy,m])=>{const length=Math.hypot(dx,dy);return[a[0]+m*dx/length**3,a[1]+m*dy/length**3];},[0,0]);
      expect(Math.hypot(gravity[0]+x,gravity[1]+y)).toBeLessThan(1e-10);
      const core=point.querySelector('circle');expect(attr(core,'cx')).toBeCloseTo(300+170*x,10);expect(attr(core,'cy')).toBeCloseTo(220-170*y,10);
      const triangular=point.dataset.lgPoint==='L4'||point.dataset.lgPoint==='L5';
      expect(point.dataset.stable).toBe(String(triangular&&27*mu*(1-mu)<1));
      if(triangular){expect(Math.hypot(x-primary,y)).toBeCloseTo(1,12);expect(Math.hypot(x-secondary,y)).toBeCloseTo(1,12);}
    }
    const xs=points.map(p=>+p.dataset.x);expect(xs[2]).toBeLessThan(primary);expect(xs[0]).toBeGreaterThan(primary);expect(xs[0]).toBeLessThan(secondary);expect(xs[1]).toBeGreaterThan(secondary);
    const inset=s.querySelector('[data-lg-inset]'),scale=+inset.dataset.scale;
    for(const point of inset.querySelectorAll('[data-lg-point]')){const core=point.querySelector('circle'),x=+point.dataset.x;expect(attr(core,'cx')).toBeCloseTo(240+(x-secondary)*scale,10);expect(attr(core,'cy')).toBe(75);}
    expect((1-mu)*primary+mu*secondary).toBeCloseTo(0,12);expect(env.writes).toBe(0);expect(s.innerHTML).not.toMatch(/NaN|Infinity/);
  });
  it.each([
    ['sun-earth',3.003480594542193e-6,[.99002659387075,1.0100341164222102,-1.0000012514502479],1491551.006,1501531.765],
    ['earth-moon',.012150584394709708,[.8369151317503716,1.1556821607722148,-1.005062645304093],58019.139,64514.907],
  ])('matches independent reference roots and distances for %s',(system,mu,xs,l1km,l2km)=>{
    const env=renderLG({lagrangeSystem:system});expect(+env.section.dataset.lgMu).toBeCloseTo(mu,15);
    xs.forEach((x,i)=>expect(+env.section.querySelector('[data-lg-map] [data-lg-point=L'+(i+1)+']').dataset.x).toBeCloseTo(x,11));
    env.invoke('[data-lg-select=L1]');expect(metric(env.section,'distance-km')).toBeCloseTo(l1km,2);env.invoke('[data-lg-select=L2]');expect(metric(env.section,'distance-km')).toBeCloseTo(l2km,2);
  });
  it('makes all points selectable and keeps selected measurements synchronized',()=>{
    const env=renderLG({lagrangeSystem:'earth-moon'});
    for(const id of['L1','L2','L3','L4','L5']){env.invoke('[data-lg-select='+id+']');const s=env.section,p=s.querySelector('[data-lg-map] [data-lg-point='+id+']'),mu=+s.dataset.lgMu,x=+p.dataset.x,y=+p.dataset.y;expect(s.dataset.lgSelected).toBe(id);expect(metric(s,'x')).toBe(x);expect(metric(s,'y')).toBe(y);expect(metric(s,'distance')).toBeCloseTo(Math.hypot(x-(1-mu),y),12);expect(s.querySelector('[data-lg-select='+id+']').getAttribute('aria-pressed')).toBe('true');expect(+s.dataset.lgResidual).toBeLessThan(1e-10);}
  });
  it('crosses the triangular stability threshold between 3.8% and 3.9%',()=>{
    const env=renderLG({lagrangeSystem:'custom',lagrangeMass:.038,lagrangePoint:'L4'});expect(env.section.querySelector('[role=status]').textContent).toMatch(/^Linearly stable/);
    env.invoke('#solar-lg-mass',39);expect(+env.section.dataset.lgMu).toBe(.039);expect(env.section.querySelector('[role=status]').textContent).toMatch(/^Unstable/);
    env.invoke('[data-lg-select=L1]');env.invoke('[data-lg-mass-preset="0.01"]');expect(env.section.querySelector('[role=status]').textContent).toMatch(/^Unstable/);
  });
  it('uses a symmetric solution for equal masses',()=>{
    const env=renderLG({lagrangeSystem:'custom',lagrangeMass:.5}),s=env.section,point=id=>s.querySelector('[data-lg-map] [data-lg-point='+id+']');
    expect(+point('L1').dataset.x).toBeCloseTo(0,12);expect(+point('L2').dataset.x).toBeCloseTo(-Number(point('L3').dataset.x),12);expect(+point('L4').dataset.x).toBe(0);
  });
  it.each([
    [{},'sun-earth',3.003480594542193e-6,'L2'],
    [{lagrangeMass:.03},'custom',.03,'L2'],
    [{lagrangeSystem:'oops',lagrangeMass:-1,lagrangePoint:'L9'},'custom',.001,'L2'],
    [{lagrangeSystem:'custom',lagrangeMass:999},'custom',.5,'L2'],
    [{lagrangeSystem:'custom',lagrangeMass:NaN,lagrangePoint:'L4'},'custom',.01,'L4'],
    [{lagrangeSystem:'custom',lagrangeMass:.0346},'custom',.035,'L2'],
    [{lagrangeSystem:'oops',lagrangeMass:Infinity},'sun-earth',3.003480594542193e-6,'L2'],
  ])('normalizes restored values without overwriting saved state: %j',(seed,system,mu,selected)=>{
    const env=renderLG(seed);expect(env.section.dataset.lgSystem).toBe(system);expect(+env.section.dataset.lgMu).toBeCloseTo(mu,15);expect(env.section.dataset.lgSelected).toBe(selected);expect(env.writes).toBe(0);for(const[key,value]of Object.entries(seed))expect(env.state[key]).toEqual(value);
  });
  it('preserves custom settings, other simulations, authored work and rewards',()=>{
    const saved={journalEntries:[{observation:'Saved evidence'}],journalDrafts:{Earth:'Draft'},signalNotebooks:{Mars:{explanation:'My idea'}},missionLog:[{text:'Observation'}],researchPoints:350,totalRP:500,selectedPlanet:'Earth',dayNightRot:90,emDistanceKm:384400};
    const env=renderLG({...saved,lagrangeSystem:'custom',lagrangeMass:.04,lagrangePoint:'L5'});env.invoke('[data-lg-system-preset="sun-earth"]');expect(env.state.lagrangeMass).toBe(.04);expect(env.state.lagrangePoint).toBe('L5');env.invoke('[data-lg-system-preset="custom"]');expect(+env.section.dataset.lgMu).toBe(.04);
    const before=structuredClone(env.state);env.invoke('[aria-controls=solar-lg-content]');expect(env.section.querySelectorAll('svg')).toHaveLength(0);expect(env.section.querySelector('#solar-lg-content').hidden).toBe(true);env.invoke('[aria-controls=solar-lg-content]');expect(env.state).toEqual(before);for(const[key,value]of Object.entries(saved))expect(env.state[key]).toEqual(value);
  });
  it('names its diagrams and controls and discloses model and mission limits',()=>{
    const env=renderLG({lagrangeSystem:'custom'}),s=env.section;
    for(const input of s.querySelectorAll('input')){expect(s.querySelector('label[for="'+input.id+'"]')).toBeTruthy();expect(input.getAttribute('aria-valuetext')).toBeTruthy();}
    for(const svg of s.querySelectorAll('svg'))for(const attr of['aria-labelledby','aria-describedby'])for(const id of svg.getAttribute(attr).split(' '))expect(document.getElementById(id)).toBeTruthy();
    expect(s.querySelectorAll('svg text')).toHaveLength(0);expect(s.textContent).toContain('halo orbit');expect(s.textContent).toContain('Gravity is still present');expect(s.textContent).toContain('rescales');expect(s.textContent).toContain('no kilometer scale');expect(s.querySelectorAll('a[rel="noopener noreferrer"]')).toHaveLength(3);
  });
});
