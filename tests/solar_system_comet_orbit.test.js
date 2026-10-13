import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function orbitTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-comet-orbit') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderOrbit(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showCOrb: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-comet-test-callback': id }, ...children);
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
  return { get section() { return document.getElementById('solar-comet-orbit'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.cometTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

describe('Comet orbit geometry and Keplerian time', () => {
  beforeEach(() => {
    resetStemLab(); loadTool('stem_lab/stem_tool_solarsystem.js', 'solarSystem');
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });
  const metric=(section,key)=>Number(section.querySelector('[data-corb-metric='+key+']').dataset.value);

  it.each([0,.85,.995].flatMap(e=>[0,.1,1,90,180,270,359.9,360].map(m=>[e,m])))('places the comet on its ellipse at e=%s and time phase %s', (cobEcc,cobMeanAnomaly) => {
    const env=renderOrbit({cobEcc,cobMeanAnomaly,cobAxisAU:3}),s=env.section;
    const ellipse=s.querySelector('[data-corb-ellipse]'),sun=s.querySelector('[data-corb-sun]'),comet=s.querySelector('[data-corb-comet]');
    const a=Number(ellipse.getAttribute('rx')),b=Number(ellipse.getAttribute('ry')),cx=Number(ellipse.getAttribute('cx')),cy=Number(ellipse.getAttribute('cy'));
    const x=Number(comet.dataset.x),y=Number(comet.dataset.y),sx=Number(sun.getAttribute('cx'));
    expect((x-cx)**2/a**2+(y-cy)**2/b**2).toBeCloseTo(1,10);
    expect(sx-cx).toBeCloseTo(a*cobEcc,10);
    let E=Math.atan2((cy-y)/b,(x-cx)/a);if(E<0)E+=2*Math.PI;if(cobMeanAnomaly===360)E=2*Math.PI;
    expect(E-cobEcc*Math.sin(E)).toBeCloseTo(cobMeanAnomaly*Math.PI/180,10);
    expect(Math.hypot(x-sx,y-cy)/(a/3)).toBeCloseTo(metric(s,'distance'),10);
    // Recover speed from ellipse-coordinate derivatives with respect to time.
    const derivativeNorm=Math.hypot(Math.sin(E),b/a*Math.cos(E))/(1-cobEcc*Math.cos(E));
    expect(metric(s,'speed')).toBeCloseTo(derivativeNorm,9);
    for(const [key,expectedX] of [['peri',cx+a],['aphe',cx-a]]){
      const square=s.querySelector('[data-corb-'+key+']');expect(Number(square.getAttribute('x'))+4).toBe(expectedX);expect(Number(square.getAttribute('y'))+4).toBe(cy);
    }
    expect(env.writes).toBe(0);expect(s.querySelectorAll('svg text')).toHaveLength(0);
  });

  it.each([0,.85,.995])('uses twelve distinct equal-time waypoints at eccentricity %s', cobEcc => {
    const env=renderOrbit({cobEcc}),dots=[...env.section.querySelectorAll('[data-corb-time-dot]')];expect(dots).toHaveLength(12);
    const minor=160*Math.sqrt(1-cobEcc*cobEcc),angles=[];
    for(const dot of dots){let E=Math.atan2((190-Number(dot.getAttribute('cy')))/minor,(Number(dot.getAttribute('cx'))-260)/160);if(E<0)E+=2*Math.PI;angles.push(E);expect(E-cobEcc*Math.sin(E)).toBeCloseTo(Number(dot.dataset.corbTimeDot)*Math.PI/6,10);}
    expect(new Set(angles).size).toBe(12);
    if(cobEcc===0)expect(angles[1]-angles[0]).toBeCloseTo(angles[7]-angles[6],10);
    else expect(angles[1]-angles[0]).toBeGreaterThan(angles[7]-angles[6]);
  });

  it('keeps the period fixed when shape changes and scales distances and period with orbit size', () => {
    const env=renderOrbit({cobEcc:.85,cobAxisAU:1,cobMeanAnomaly:90});
    const initial={period:metric(env.section,'period'),distance:metric(env.section,'distance'),speed:metric(env.section,'speed')};expect(initial.period).toBe(1);
    env.invoke('#solar-corb-size',20);expect(metric(env.section,'period')).toBeCloseTo(89.4427191,8);expect(metric(env.section,'distance')).toBeCloseTo(initial.distance*20,10);expect(metric(env.section,'speed')).toBe(initial.speed);
    expect(Number(env.section.querySelector('[data-corb-scale]').dataset.corbScale)).toBe(8);
    env.invoke('[data-corb-shape="0.995"]');expect(metric(env.section,'period')).toBeCloseTo(89.4427191,8);
    expect(metric(env.section,'perihelion')).toBeCloseTo(.1,12);expect(metric(env.section,'aphelion')).toBeCloseTo(39.9,12);
    expect(env.section.querySelector('[data-corb-close-detail]')).toBeTruthy();
  });

  it('distinguishes a completed period from its shared starting position', () => {
    const env=renderOrbit({cobEcc:.995,cobAxisAU:3,cobMeanAnomaly:0});
    const start=env.section.querySelector('[data-corb-comet]'),xy=[+start.dataset.x,+start.dataset.y];
    expect(env.section.querySelector('[data-corb-progress]').getAttribute('d')).toBe('');
    env.invoke('[data-corb-time="360"]');const end=env.section.querySelector('[data-corb-comet]');
    expect(+end.dataset.x).toBeCloseTo(xy[0],10);expect(+end.dataset.y).toBeCloseTo(xy[1],10);
    expect(env.section.querySelector('output[for=solar-corb-time]').textContent).toContain('100.00%');
    expect(env.section.querySelector('[data-corb-progress]').getAttribute('d').match(/ A /g)).toHaveLength(2);
    expect(env.section.querySelector('[data-corb-time="0"]').getAttribute('aria-pressed')).toBe('false');
  });

  it.each([[NaN,.85,3,90],[Infinity,.85,3,90],[-4,0,1,0],[900,.995,20,360],['.2',.85,3,90],[null,.85,3,90]])('normalizes restored %s controls only for display', (raw,e,a,m) => {
    const env=renderOrbit({cobEcc:raw,cobAxisAU:raw,cobMeanAnomaly:raw});
    expect(+env.section.dataset.corbEcc).toBe(e);expect(+env.section.dataset.corbAxis).toBe(a);expect(+env.section.dataset.corbMean).toBe(m);
    for(const key of ['cobEcc','cobAxisAU','cobMeanAnomaly'])expect(env.state[key]).toBe(raw);expect(env.writes).toBe(0);
  });

  it('preserves notes and other investigations through controls and collapse', () => {
    const env=renderOrbit({cobEcc:.85,cobAxisAU:3,cobMeanAnomaly:90,cometDist:50,raceTime:12,selectedPlanet:'Mars',journalEntries:[{observation:'Keep my evidence'}],journalDrafts:{Earth:{observation:'Keep my draft'}},signalNotebooks:{Mars:{explanation:'Keep my notes'}}});
    const before={...env.state};env.invoke('[data-corb-shape="0.2"]');expect(env.state).toEqual({...before,cobEcc:.2});
    env.invoke('#solar-corb-size',5);env.invoke('[data-corb-time="270"]');const changed={...before,cobEcc:.2,cobAxisAU:5,cobMeanAnomaly:270};expect(env.state).toEqual(changed);
    env.invoke('#solar-corb-shape','invalid');expect(env.state).toEqual(changed);
    env.invoke('[aria-controls=solar-corb-content]');expect(env.section.querySelector('#solar-corb-content').hidden).toBe(true);expect(env.section.querySelectorAll('svg')).toHaveLength(0);
    env.invoke('[aria-controls=solar-corb-content]');expect(env.state).toEqual(changed);expect(env.section.querySelector('#solar-corb-content').hidden).toBe(false);
  });

  it('describes diagram scale, speed reference, and the enlarged endpoint detail', () => {
    const env=renderOrbit({cobEcc:.995});
    expect(env.section.textContent).toContain('changes the scale bar');expect(env.section.textContent).toContain('same semi-major axis');expect(env.section.textContent).toContain('does not show the comet’s current position');
    expect(env.section.textContent).not.toContain('returns after millennia');expect(env.section.textContent).toContain('Shape presets change eccentricity only');
    for(const svg of env.section.querySelectorAll('svg'))for(const key of ['aria-labelledby','aria-describedby'])for(const id of svg.getAttribute(key).split(' '))expect(document.getElementById(id)).toBeTruthy();
  });
});
