import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function dopplerTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-doppler') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderDP(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showDoppler: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-dp-test-callback': id }, ...children);
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
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => dopplerTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-doppler'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.dpTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

const attr=(el,key)=>Number(el.getAttribute(key)),metric=(s,key)=>Number(s.querySelector('[data-dp-metric='+key+']').dataset.value);
describe('Doppler motion and wavelength inspection',()=>{
  beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_solarsystem.js','solarSystem');vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('requestAnimationFrame',()=>1);vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);});
  afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';});
  it.each([400,450,650,700].flatMap(rest=>[-50000,-30000,-1000,-100,0,100,1000,30000,50000].map(velocity=>[rest,velocity])))('shows a %s nm line at radial velocity %s km/s',(dopplerRestNm,dopplerVel)=>{
    const env=renderDP({dopplerRestNm,dopplerVel}),s=env.section,observed=metric(s,'observed'),ratio=metric(s,'ratio'),beta=dopplerVel/299792.458;
    expect(metric(s,'beta')).toBeCloseTo(beta,12);expect((ratio*ratio-1)/(ratio*ratio+1)).toBeCloseTo(beta,12);expect(observed/dopplerRestNm).toBeCloseTo(ratio,12);expect(metric(s,'delta')).toBeCloseTo(observed-dopplerRestNm,12);expect(metric(s,'z')).toBeCloseTo(ratio-1,12);expect(metric(s,'frequency')*ratio).toBeCloseTo(1,12);
    expect(Math.sign(observed-dopplerRestNm)).toBe(Math.sign(dopplerVel));expect(s.dataset.dpDirection).toBe(dopplerVel>0?'receding':dopplerVel<0?'approaching':'rest');
    const arrow=s.querySelector('[data-dp-arrow]');if(dopplerVel){expect(Math.sign(+arrow.dataset.endX-Number(arrow.dataset.startX))).toBe(Math.sign(dopplerVel));}else expect(arrow).toBeNull();
    expect(attr(s.querySelector('[data-dp-observer]'),'cx')).toBe(96);expect(s.querySelector('[data-dp-source]').getAttribute('d')).toBe('M 400 64 L 424 88 L 400 112 L 376 88 Z');
    const lanes=[...s.querySelectorAll('[data-dp-lane]')];expect(lanes).toHaveLength(4);
    for(const lane of lanes){const min=+lane.dataset.min,max=+lane.dataset.max,line=lane.querySelector('[data-dp-line]'),expected=lane.dataset.dpLane==='rest'?dopplerRestNm:observed;
      expect(min).toBeGreaterThanOrEqual(320);expect(max).toBeLessThanOrEqual(840);expect(min).toBeLessThanOrEqual(Math.min(dopplerRestNm,observed));expect(max).toBeGreaterThanOrEqual(Math.max(dopplerRestNm,observed));
      expect((attr(line,'x1')-24)/672*(max-min)+min).toBeCloseTo(expected,10);expect(attr(line,'x1')).toBe(attr(line,'x2'));
      if(lane.dataset.detail==='false'){expect(min).toBe(320);expect(max).toBe(840);}else expect(max-min).toBeCloseTo(Math.max(2,1.6*Math.abs(observed-dopplerRestNm)),10);
      if(lane.dataset.dpLane==='observed'){const guide=lane.querySelector('[data-dp-rest-guide]');expect((attr(guide,'x1')-24)/672*(max-min)+min).toBeCloseTo(dopplerRestNm,10);}
    }
    for(const detail of['false','true']){const rows=lanes.filter(l=>l.dataset.detail===detail);expect(rows[0].dataset.min).toBe(rows[1].dataset.min);expect(rows[0].dataset.max).toBe(rows[1].dataset.max);}
    expect(env.writes).toBe(0);expect(s.innerHTML).not.toMatch(/NaN|Infinity/);
  });
  it('matches independently evaluated endpoint wavelengths and reciprocal shifts',()=>{
    const toward=renderDP({dopplerRestNm:650,dopplerVel:-50000}),first=metric(toward.section,'ratio');expect(metric(toward.section,'observed')).toBeCloseTo(549.2850726194,8);
    const away=renderDP({dopplerRestNm:650,dopplerVel:50000});expect(metric(away.section,'observed')).toBeCloseTo(769.1816527713,8);expect(first*metric(away.section,'ratio')).toBeCloseTo(1,12);
  });
  it('uses a two-nanometer minimum detail window for small shifts and zero',()=>{
    const env=renderDP({dopplerVel:0});expect(+env.section.querySelector('[data-dp-window]').dataset.span).toBe(2);env.invoke('#solar-dp-velocity',100);expect(+env.section.querySelector('[data-dp-window]').dataset.span).toBe(2);expect(env.section.querySelector('[data-dp-status]').textContent).toContain('Redshift');
    env.invoke('#solar-dp-velocity',-100);expect(env.section.querySelector('[data-dp-status]').textContent).toContain('Blueshift');
  });
  it('keeps the fixed ruler constant as the automatic detail view changes scale',()=>{
    const env=renderDP({dopplerRestNm:650,dopplerVel:1000}),before=env.section.querySelector('[data-dp-lane=rest][data-detail=false]').outerHTML;env.invoke('[data-dp-velocity-preset="30000"]');expect(env.section.querySelector('[data-dp-lane=rest][data-detail=false]').outerHTML).toBe(before);
  });
  it.each([
    [{},0,650],
    [{dopplerVel:Infinity,dopplerRestNm:NaN},0,650],
    [{dopplerVel:NaN,dopplerRestNm:Infinity},0,650],
    [{dopplerVel:'30000',dopplerRestNm:'450'},0,650],
    [{dopplerVel:400000,dopplerRestNm:999},50000,700],
    [{dopplerVel:-400000,dopplerRestNm:-10},-50000,400],
    [{dopplerVel:149.8,dopplerRestNm:450.7},100,451],
    [{dopplerVel:-.1,dopplerRestNm:650},0,650],
  ])('normalizes restored controls without writes: %j',(seed,velocity,rest)=>{
    const env=renderDP(seed),s=env.section;expect(+s.dataset.dpVelocity).toBe(velocity);expect(+s.dataset.dpRest).toBe(rest);expect(env.writes).toBe(0);for(const[key,value]of Object.entries(seed))expect(env.state[key]).toEqual(value);expect(s.innerHTML).not.toMatch(/NaN|Infinity/);
  });
  it('updates both controls and preserves other simulations, authored work and rewards',()=>{
    const saved={journalEntries:[{observation:'Saved evidence'}],journalDrafts:{Earth:'Draft'},signalNotebooks:{Mars:{explanation:'My idea'}},missionLog:[{text:'Observation'}],researchPoints:350,totalRP:500,selectedPlanet:'Earth',spectroElem:'sodium',spectroLineIndex:2,spectroSpanNm:2,dayNightRot:90,lagrangePoint:'L4'};
    const env=renderDP(saved);env.invoke('[data-dp-velocity-preset="-30000"]');expect(env.state.dopplerVel).toBe(-30000);env.invoke('[data-dp-rest-preset="450"]');expect(env.state.dopplerRestNm).toBe(450);env.invoke('#solar-dp-velocity',50000);env.invoke('#solar-dp-rest',700);const before=structuredClone(env.state);
    env.invoke('[aria-controls=solar-dp-content]');expect(env.section.querySelectorAll('svg')).toHaveLength(0);expect(env.section.querySelector('#solar-dp-content').hidden).toBe(true);env.invoke('[aria-controls=solar-dp-content]');expect(env.state).toEqual(before);for(const[key,value]of Object.entries(saved))expect(env.state[key]).toEqual(value);
  });
  it('names diagrams and native controls and explains the scale and physical limits',()=>{
    const env=renderDP(),s=env.section;for(const id of['solar-dp-velocity','solar-dp-rest']){expect(s.querySelector('label[for='+id+']')).toBeTruthy();expect(s.querySelector('#'+id).getAttribute('aria-valuetext')).toBeTruthy();}
    for(const svg of s.querySelectorAll('svg'))for(const attr of['aria-labelledby','aria-describedby'])for(const id of svg.getAttribute(attr).split(' '))expect(document.getElementById(id)).toBeTruthy();
    const ids=[...s.querySelectorAll('[id]')].map(el=>el.id);expect(new Set(ids).size).toBe(ids.length);expect(s.querySelectorAll('svg text')).toHaveLength(0);expect(s.textContent).toContain('vacuum convention');expect(s.textContent).toContain('not an identified atomic line');expect(s.textContent).toContain('Arrow length does not encode speed');expect(s.textContent).toContain('minimum width of 2 nm');expect(s.textContent).toContain('cosmological redshift');expect(s.textContent).toContain('Redshift alone does not determine a distance');expect(s.querySelectorAll('a[rel="noopener noreferrer"]')).toHaveLength(3);
  });
});
