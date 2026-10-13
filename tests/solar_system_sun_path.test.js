import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function sunPathTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-sun-path') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderSunPath(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showSunPath: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-sunpath-test-callback': id }, ...children);
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
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => sunPathTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-sun-path'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.sunpathTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

const rad=Math.PI/180;
function reference(latitude,declination,hour){
  const phi=latitude*rad,h=(hour-12)*15*rad,sun=[Math.cos(declination),0,Math.sin(declination)];
  const up=[Math.cos(phi)*Math.cos(h),Math.cos(phi)*Math.sin(h),Math.sin(phi)];
  const east=[-Math.sin(h),Math.cos(h),0],north=[-Math.sin(phi)*Math.cos(h),-Math.sin(phi)*Math.sin(h),Math.cos(phi)];
  const dot=v=>v.reduce((sum,x,i)=>sum+x*sun[i],0),u=dot(up),e=dot(east),n=dot(north);
  return{alt:Math.asin(Math.max(-1,Math.min(1,u)))/rad,az:(Math.atan2(e,n)/rad+360)%360,e,n,u};
}
const metric=(s,key)=>{const v=s.querySelector('[data-sunpath-metric='+key+']').dataset.value;return v==='none'?null:Number(v);};
const coordinates=path=>[...path.getAttribute('d').matchAll(/[ML]\s*([\d.e+-]+)\s+([\d.e+-]+)/g)].map(m=>[+m[1],+m[2]]);

describe('Sun paths across latitudes',()=>{
  beforeEach(()=>{
    resetStemLab();loadTool('stem_lab/stem_tool_solarsystem.js','solarSystem');
    vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));
    vi.stubGlobal('requestAnimationFrame',()=>1);vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
  });
  afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';});

  it.each([0,43.7,67,-67,90,-90].flatMap(lat=>[80,172,355].map(day=>[lat,day])))('matches independent vector projections at latitude %s, day %s',(sunLat,sunDoy)=>{
    const env=renderSunPath({sunLat,sunDoy}),s=env.section,decl=Number(s.dataset.sunpathDeclination);
    const graph=coordinates(s.querySelector('[data-sunpath-entire]'));expect(graph.length).toBeGreaterThanOrEqual(193);
    expect(graph[0][0]).toBe(20);expect(graph.at(-1)[0]).toBe(460);
    for(const[x,y]of graph){const time=(x-20)/440*24,expected=reference(sunLat,decl,time);expect(130-y).toBeCloseTo(expected.alt/90*100,8);expect(y).toBeGreaterThanOrEqual(30-1e-8);expect(y).toBeLessThanOrEqual(230+1e-8);}
    expect(metric(s,'noon')).toBeCloseTo(90-Math.abs(sunLat-decl/rad),9);
    let count=0;for(let i=0;i<2880;i++)if(reference(sunLat,decl,(i+.5)/120).u>0)count++;
    expect(Math.abs(metric(s,'daylight')-count/120)).toBeLessThan(.02);
    const rise=metric(s,'rise'),set=metric(s,'set');
    if(rise!==null){expect(reference(sunLat,decl,rise).alt).toBeCloseTo(0,9);expect(reference(sunLat,decl,set).alt).toBeCloseTo(0,9);expect(rise+set).toBeCloseTo(24,10);expect(set-rise).toBeCloseTo(metric(s,'daylight'),10);}
    expect(!!s.querySelector('[data-sunpath-polar]')).toBe(Math.abs(sunLat)===90);
    if(Math.abs(sunLat)!==90){
      const sky=coordinates(s.querySelector('[data-sunpath-skyline]'));
      const visible=graph.filter(([x])=>reference(sunLat,decl,(x-20)/440*24).alt>=-1e-9);
      expect(sky.length).toBe(visible.length);
      for(let i=0;i<sky.length;i++){
        const time=(visible[i][0]-20)/440*24,p=reference(sunLat,decl,time),r=140*(90-p.alt)/90,az=p.az*rad;
        expect(sky[i][0]).toBeCloseTo(180+r*Math.sin(az),7);expect(sky[i][1]).toBeCloseTo(180-r*Math.cos(az),7);expect(Math.hypot(sky[i][0]-180,sky[i][1]-180)).toBeLessThanOrEqual(140+1e-8);
      }
    }
    expect(env.writes).toBe(0);expect(s.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('keeps east on the right and west on the left, with no north seam jump',()=>{
    const env=renderSunPath({sunLat:43.7,sunDoy:172,sunHour:6});
    const read=()=>{const el=env.section.querySelector('[data-sunpath-selected-sky]');return[Number(el.dataset.x),Number(el.dataset.y)];};
    expect(metric(env.section,'azimuth')).toBeGreaterThan(0);expect(metric(env.section,'azimuth')).toBeLessThan(180);expect(read()[0]).toBeGreaterThan(180);
    env.invoke('[data-sunpath-time="18"]');expect(metric(env.section,'azimuth')).toBeGreaterThan(180);expect(read()[0]).toBeLessThan(180);
    env.invoke('[data-sunpath-latitude="67"]');const points=coordinates(env.section.querySelector('[data-sunpath-skyline]'));
    expect(points).toHaveLength(193);expect(points[0][0]).toBeCloseTo(points.at(-1)[0],10);expect(points[0][1]).toBeCloseTo(points.at(-1)[1],10);
    for(let i=1;i<points.length;i++)expect(Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1])).toBeLessThan(8);
  });

  it('handles an overhead Sun without assigning a compass direction',()=>{
    const env=renderSunPath({sunDoy:172,sunHour:12});const decl=Number(env.section.dataset.sunpathDeclination)/rad;
    env.invoke('#solar-sunpath-latitude',decl);
    expect(metric(env.section,'altitude')).toBeCloseTo(90,9);expect(metric(env.section,'azimuth')).toBeNull();
    const sky=env.section.querySelector('[data-sunpath-selected-sky]');expect(Number(sky.dataset.x)).toBe(180);expect(Number(sky.dataset.y)).toBe(180);
    expect(env.section.querySelector('[data-sunpath-visibility]').textContent).toContain('overhead');
  });

  it('handles horizon tangencies without inventing rise/set crossings',()=>{
    const env=renderSunPath({sunDoy:172});const decl=Number(env.section.dataset.sunpathDeclination)/rad;
    env.invoke('#solar-sunpath-latitude',90-decl);expect(metric(env.section,'daylight')).toBe(24);expect(metric(env.section,'rise')).toBeNull();expect(env.section.querySelector('[data-sunpath-state]').textContent).toContain('midnight');
    env.invoke('#solar-sunpath-latitude',decl-90);expect(metric(env.section,'daylight')).toBe(0);expect(metric(env.section,'set')).toBeNull();expect(env.section.querySelector('[data-sunpath-state]').textContent).toContain('noon');
  });

  it('keeps below-horizon selections on the graph and preserves the 24:00 endpoint',()=>{
    const env=renderSunPath({sunLat:43.7,sunDoy:172,sunHour:0}),start=metric(env.section,'altitude');
    expect(start).toBeLessThan(0);expect(env.section.querySelector('[data-sunpath-selected-sky]')).toBeNull();
    expect(Number(env.section.querySelector('[data-sunpath-selected-graph]').dataset.x)).toBe(20);
    env.invoke('[data-sunpath-time="24"]');expect(env.state.sunHour).toBe(24);expect(metric(env.section,'altitude')).toBeCloseTo(start,10);
    expect(Number(env.section.querySelector('[data-sunpath-selected-graph]').dataset.x)).toBe(460);expect(env.section.querySelector('output[for=solar-sunpath-time]').textContent).toBe('24:00');
    const night=env.section.querySelector('[data-sunpath-nightline]').getAttribute('d');expect(night.match(/M/g)).toHaveLength(2);
    expect(env.section.querySelector('[data-sunpath-dayline]').getAttribute('d').match(/M/g)).toHaveLength(1);
  });

  it.each([
    [{sunLat:-999,sunDoy:0,sunHour:-1},-90,1,0],
    [{sunLat:999,sunDoy:999,sunHour:99},90,365,24],
    [{sunLat:NaN,sunDoy:Infinity,sunHour:'6'},45,172,12],
    [{sunLat:null,sunDoy:'80',sunHour:NaN},45,172,12],
    [{sunLat:43.7,sunDoy:80.4,sunHour:6.25},43.7,80,6.25],
  ])('normalizes restored data only for display: %j',(seed,lat,day,hour)=>{
    const env=renderSunPath(seed);expect(+env.section.dataset.sunpathLat).toBe(lat);expect(+env.section.dataset.sunpathDay).toBe(day);expect(+env.section.dataset.sunpathHour).toBe(hour);expect(env.writes).toBe(0);
    for(const[key,value]of Object.entries(seed))expect(env.state[key]).toEqual(value);
  });

  it('preserves saved work and updates only the chosen setting',()=>{
    const fixtures={journalEntries:[{observation:'Keep evidence'}],journalDrafts:{Earth:'Keep draft'},missionLog:[{text:'Keep mission'}],signalNotebooks:{Mars:{explanation:'Keep note'}},researchPoints:350,totalRP:500,selectedPlanet:'Earth',tideDist:120,cobEcc:.85};
    const env=renderSunPath({...fixtures,sunLat:45,sunDoy:80,sunHour:6});
    env.invoke('[data-sunpath-latitude="43.7"]');expect(env.state.sunLat).toBe(43.7);expect(env.state.sunDoy).toBe(80);expect(env.state.sunHour).toBe(6);
    env.invoke('[data-sunpath-season="355"]');expect(env.state.sunDoy).toBe(355);expect(env.state.sunLat).toBe(43.7);expect(env.state.sunHour).toBe(6);
    env.invoke('#solar-sunpath-time',6.25);expect(env.state.sunHour).toBe(6.25);
    const before=structuredClone(env.state);env.invoke('[aria-controls=solar-sunpath-content]');expect(env.section.querySelectorAll('svg')).toHaveLength(0);expect(env.section.querySelector('#solar-sunpath-content').hidden).toBe(true);
    env.invoke('[aria-controls=solar-sunpath-content]');expect(env.state).toEqual(before);for(const[key,value]of Object.entries(fixtures))expect(env.state[key]).toEqual(value);
  });

  it('names controls and diagrams and discloses the geometric time model',()=>{
    const env=renderSunPath(),s=env.section;for(const input of s.querySelectorAll('input')){expect(s.querySelector('label[for="'+input.id+'"]')).toBeTruthy();expect(input.getAttribute('aria-valuetext')).toBeTruthy();}
    for(const svg of s.querySelectorAll('svg'))for(const attr of ['aria-labelledby','aria-describedby'])for(const id of svg.getAttribute(attr).split(' '))expect(document.getElementById(id)).toBeTruthy();
    expect(s.querySelectorAll('svg text')).toHaveLength(0);expect(s.textContent).toContain('not time-zone');expect(s.textContent).toContain('without refraction');expect(s.textContent).toContain('not exact equinox');
  });
});
