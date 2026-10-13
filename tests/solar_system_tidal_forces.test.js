import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function tidesTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-tidal-forces') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderTides(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showTides: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-tides-test-callback': id }, ...children);
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
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => tidesTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-tidal-forces'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.tidesTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

describe('Lunar gravity and tidal differences', () => {
  beforeEach(() => {
    resetStemLab(); loadTool('stem_lab/stem_tool_solarsystem.js', 'solarSystem');
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });
  const metric=(section,key)=>Number(section.querySelector('[data-tides-metric='+key+']').dataset.value);
  const attr=(el,key)=>Number(el.getAttribute(key));

  it.each([30,60,200].flatMap(distance=>[0,45,90,270].map(angle=>[distance,angle])))('renders inverse-square vectors at D=%s and angle=%s in both frames', (tideDist,tideAng) => {
    const env=renderTides({tideDist,tideAng});
    for(const mode of ['relative','pull']){
      env.invoke('[data-tides-mode="'+mode+'"]');const s=env.section;
      const moon=s.querySelector('[data-tides-moon]'),direction=[attr(moon,'cx')-220,attr(moon,'cy')-220],radius=Math.hypot(...direction),unit=direction.map(x=>x/radius);
      const moonPhysical=unit.map(x=>x*tideDist),centerGravity=unit.map(x=>x/tideDist**2);
      const vectors=[...s.querySelectorAll('[data-tides-vector]')];expect(vectors).toHaveLength(mode==='pull'?9:8);
      const scales=[];
      for(const v of vectors){
        const p=[(attr(v,'x1')-220)/60,(attr(v,'y1')-220)/60],toMoon=moonPhysical.map((x,i)=>x-p[i]),r=Math.hypot(...toMoon);
        const expected=toMoon.map((x,i)=>x/r**3-(mode==='relative'?centerGravity[i]:0)),drawn=[attr(v,'x2')-attr(v,'x1'),attr(v,'y2')-attr(v,'y1')];
        const cross=drawn[0]*expected[1]-drawn[1]*expected[0],dot=drawn[0]*expected[0]+drawn[1]*expected[1];
        expect(Math.abs(cross)/Math.hypot(...expected)).toBeLessThan(1e-9);expect(dot).toBeGreaterThan(0);
        scales.push(Math.hypot(...drawn)/Math.hypot(...expected));
        if(mode==='pull')expect(drawn[0]*toMoon[0]+drawn[1]*toMoon[1]).toBeGreaterThan(0);
        if(mode==='relative'&&['0','4'].includes(v.dataset.tidesVector))expect(drawn[0]*p[0]+drawn[1]*p[1]).toBeGreaterThan(0);
        if(mode==='relative'&&['2','6'].includes(v.dataset.tidesVector))expect(drawn[0]*p[0]+drawn[1]*p[1]).toBeLessThan(0);
      }
      expect(Math.max(...scales)/Math.min(...scales)).toBeCloseTo(1,10);
      for(const [key,x]of[['near',1],['center',0],['far',-1]]){
        const ratio=Number(s.querySelector('[data-tides-pull='+key+']').dataset.value);
        expect(ratio).toBeCloseTo(tideDist**2/(tideDist-x)**2,12);
        expect(parseFloat(s.querySelector('[data-tides-bar='+key+']').style.width)).toBeCloseTo(ratio/1.08*100,8);
      }
      expect(env.writes).toBe(0);expect(s.querySelectorAll('svg text')).toHaveLength(0);
    }
  });

  it('shows stronger near-side stretching than far-side stretching, including the exact asymmetry', () => {
    const env=renderTides({tideDist:30});
    const length=key=>{const n=env.section.querySelector('[data-tides-vector="'+key+'"]');return Math.hypot(attr(n,'x2')-attr(n,'x1'),attr(n,'y2')-attr(n,'y1'));};
    expect(length(0)).toBe(56);expect(length(4)).toBeLessThan(length(0));
    expect(length(4)/length(0)).toBeCloseTo((1/900-1/961)/(1/841-1/900),12);
    expect(env.section.querySelector('[data-tides-vector=center]')).toBeNull();
  });

  it('separates inverse-square pull from approximate inverse-cube tidal strength', () => {
    const env=renderTides();
    for(const [distance,pull,tidal]of[[30,4,8],[60,1,1],[120,.25,.125],[200,.09,.027]]){
      env.invoke('[data-tides-distance-preset="'+distance+'"]');
      expect(metric(env.section,'distance')).toBeCloseTo(distance/60,12);expect(metric(env.section,'gravity')).toBeCloseTo(pull,12);expect(metric(env.section,'tidal')).toBeCloseTo(tidal,12);
    }
  });

  it('deforms the water outline monotonically and rotates it with the Moon', () => {
    const env=renderTides({tideAng:45});let previousRx=Infinity,previousRy=0;
    for(const distance of [30,60,120,200]){
      env.invoke('[data-tides-distance-preset="'+distance+'"]');const ocean=env.section.querySelector('[data-tides-water]');
      expect(attr(ocean,'rx')).toBeLessThan(previousRx);expect(attr(ocean,'ry')).toBeGreaterThan(previousRy);expect(attr(ocean,'ry')).toBeGreaterThan(60);
      expect(attr(ocean,'rx')).toBeGreaterThan(74);expect(attr(ocean,'ry')).toBeLessThan(74);expect(ocean.getAttribute('transform')).toBe('rotate(-45 220 220)');
      previousRx=attr(ocean,'rx');previousRy=attr(ocean,'ry');
    }
    expect(env.section.textContent).toContain('not a height measurement');expect(env.section.textContent).toContain('rescaled together');
  });

  it.each([
    [{tideDist:-5,tideAng:-10,tideFrame:'invalid'},30,0,'relative'],
    [{tideDist:900,tideAng:900},200,360,'relative'],
    [{tideDist:NaN,tideAng:Infinity},60,0,'relative'],
    [{tideDist:'60',tideAng:null},60,0,'relative'],
    [{tideDist:120,tideAng:180,tideFrame:'pull'},120,180,'pull'],
  ])('normalizes restored values for display without writes: %j', (seed,distance,angle,frame) => {
    const env=renderTides(seed);expect(+env.section.dataset.tidesDistance).toBe(distance);expect(+env.section.dataset.tidesAngle).toBe(angle);expect(env.section.dataset.tidesFrame).toBe(frame);
    expect(env.writes).toBe(0);for(const key of Object.keys(seed))expect(env.state[key]).toEqual(seed[key]);
  });

  it('keeps saved work, unrelated simulations and rewards intact through native controls', () => {
    const saved={journalEntries:[{observation:'Keep evidence'}],journalDrafts:{Earth:'Keep draft'},missionLog:[{text:'Keep mission'}],signalNotebooks:{Mars:{explanation:'Keep note'}},researchPoints:350,totalRP:500,selectedPlanet:'Earth',cobEcc:.85,tlOrbitAngle:90};
    const env=renderTides({...saved,tideDist:60,tideAng:90});
    env.invoke('#solar-tides-distance',120);expect(env.state.tideDist).toBe(120);expect(env.state.tideAng).toBe(90);
    env.invoke('#solar-tides-angle',270);expect(env.state.tideAng).toBe(270);expect(env.state.tideDist).toBe(120);
    env.invoke('[data-tides-mode=pull]');expect(env.state.tideFrame).toBe('pull');
    env.invoke('[data-tides-direction="0"]');expect(env.state.tideAng).toBe(0);
    const before=structuredClone(env.state);env.invoke('[aria-controls=solar-tides-content]');expect(env.section.querySelectorAll('svg')).toHaveLength(0);expect(env.section.querySelector('#solar-tides-content').hidden).toBe(true);
    env.invoke('[aria-controls=solar-tides-content]');expect(env.state).toEqual(before);
    for(const [key,value]of Object.entries(saved))expect(env.state[key]).toEqual(value);
  });

  it('provides named controls, coherent descriptions and a full-turn direction endpoint', () => {
    const env=renderTides({tideAng:360}),s=env.section;
    expect(s.querySelector('[data-tides-direction="0"]').getAttribute('aria-pressed')).toBe('true');
    for(const input of s.querySelectorAll('input')){expect(s.querySelector('label[for="'+input.id+'"]')).toBeTruthy();expect(input.getAttribute('aria-valuetext')).toBeTruthy();}
    for(const svg of s.querySelectorAll('svg'))for(const attribute of ['aria-labelledby','aria-describedby'])for(const id of svg.getAttribute(attribute).split(' '))expect(document.getElementById(id)).toBeTruthy();
    expect(s.textContent).toContain('does not advance time');expect(s.textContent).toContain('does not model spring or neap tides');
    expect(s.querySelectorAll('a[rel="noopener noreferrer"]')).toHaveLength(2);
    expect(attr(s.querySelector('[data-tides-moon]'),'cy')).toBeCloseTo(220,12);
  });
});
