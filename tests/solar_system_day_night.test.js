import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function dayNightTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-day-night') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderDN(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showGlobe: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-dn-test-callback': id }, ...children);
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
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => dayNightTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-day-night'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.dnTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

const attr=(el,key)=>Number(el.getAttribute(key));
const metric=(s,key)=>{const v=s.querySelector('[data-dn-metric='+key+']').dataset.value;return v==='none'?null:+v;};
const rad=Math.PI/180;
const saved={journalEntries:[{observation:'Saved evidence'}],journalDrafts:{Earth:'Draft'},signalNotebooks:{Mars:{explanation:'My idea'}},missionLog:[{text:'Observation'}],researchPoints:350,totalRP:500,selectedPlanet:'Earth',sunHour:6,tideDist:120,emDistanceKm:384400,emLightProgress:50};
describe('Day/night globe and observer illumination',()=>{
  beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_solarsystem.js','solarSystem');vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('requestAnimationFrame',()=>1);vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);});
  afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';});

  it.each([0,45,70,-70,90,-90].flatMap(latitude=>[0,90,270].map(season=>[latitude,season])))('agrees with a rotating surface normal at latitude %s, seasonal angle %s',(latitude,season)=>{
    const sinDecl=Math.sin(23.44*rad)*Math.sin(season*rad),cosDecl=Math.sqrt(1-sinDecl*sinDecl),phi=latitude*rad;
    const env=renderDN({dayNightLatitude:latitude,dayNightSeason:season});
    for(const rotation of[0,90,180,270,360]){
      env.invoke('#solar-dn-time',rotation);const s=env.section,h=(rotation-180)*rad,p=[Math.cos(phi)*Math.cos(h),Math.cos(phi)*Math.sin(h),Math.sin(phi)],dot=p[0]*cosDecl+p[2]*sinDecl;
      expect(metric(s,'altitude')).toBeCloseTo(Math.asin(Math.max(-1,Math.min(1,dot)))/rad,8);expect(metric(s,'declination')).toBeCloseTo(Math.asin(sinDecl)/rad,10);expect(metric(s,'obliquity')).toBe(23.44);
      const observer=s.querySelector('[data-dn-observer]'),disc=s.querySelector('[data-dn-disc]'),r=attr(disc,'r');
      const x=(attr(observer,'cx')-attr(disc,'cx'))/r,y=(attr(disc,'cy')-attr(observer,'cy'))/r,z=+observer.dataset.z;
      expect(x).toBeCloseTo(-Math.cos(phi)*Math.cos(rotation*rad),12);expect(y).toBeCloseTo(Math.sin(phi),12);expect(z).toBeCloseTo(Math.cos(phi)*Math.sin(rotation*rad),12);expect(x*x+y*y+z*z).toBeCloseTo(1,12);
      expect(x*cosDecl+y*sinDecl).toBeCloseTo(dot,12);expect(observer.dataset.illumination).toBe(Math.abs(dot)<1e-10?'horizon':dot>0?'day':'night');
      expect(observer.dataset.visibility).toBe(Math.abs(z)<1e-10?'edge':z>0?'front':'back');
      const boundary=s.querySelector('[data-dn-terminator]');for(const end of[1,2]){const tx=(attr(boundary,'x'+end)-240)/r,ty=(200-attr(boundary,'y'+end))/r;expect(tx*cosDecl+ty*sinDecl).toBeCloseTo(0,12);expect(tx*tx+ty*ty).toBeCloseTo(1,12);}
      for(const ray of s.querySelectorAll('[data-dn-ray]')){const dx=+ray.dataset.endX-Number(ray.dataset.startX),dy=+ray.dataset.endY-Number(ray.dataset.startY);expect(dx/80).toBeCloseTo(-cosDecl,12);expect(dy/80).toBeCloseTo(sinDecl,12);}
      expect(Number(s.querySelector('[data-dn-time-marker]').dataset.x)).toBeCloseTo(16+rotation/360*448,12);expect(s.innerHTML).not.toMatch(/NaN|Infinity/);expect(env.writes).toBe(0);
    }
    const s=env.section,daylight=metric(s,'daylight');
    if(Math.abs(latitude)===90&&season===0){expect(daylight).toBeNull();expect(s.dataset.dnRegime).toBe('horizon');expect(s.querySelector('[data-dn-horizon-band]')).toBeTruthy();expect(s.querySelector('[data-dn-night-band]')).toBeNull();}
    else{const sunlitMinutes=Array.from({length:1440},(_,i)=>{const h=((i+.5)/60-12)*15*rad;return Math.cos(phi)*Math.cos(h)*cosDecl+Math.sin(phi)*sinDecl>0?1:0;}).reduce((a,b)=>a+b,0);expect(Math.abs(daylight-sunlitMinutes/60)).toBeLessThan(.02);}
    const band=s.querySelector('[data-dn-day-band]');if(daylight>0){expect(attr(band,'width')).toBeCloseTo(daylight/24*448,12);expect(attr(band,'x')).toBeCloseTo(16+(12-daylight/2)/24*448,12);}else expect(band).toBeNull();
  });

  it('keeps the boundary fixed during a day while the observer and geographic grid rotate',()=>{
    const env=renderDN({dayNightRot:90,dayNightSeason:90,dayNightLatitude:45});const before=env.section.querySelector('[data-dn-lit]').outerHTML,grid=env.section.querySelector('[data-dn-meridian="0"]').outerHTML;
    env.invoke('#solar-dn-time',120);expect(env.section.querySelector('[data-dn-lit]').outerHTML).toBe(before);expect(env.section.querySelector('[data-dn-meridian="0"]').outerHTML).not.toBe(grid);
    expect(env.state.dayNightSeason).toBe(90);expect(env.state.dayNightLatitude).toBe(45);
  });

  it('keeps the axis fixed across seasons and exchanges polar day/night between hemispheres',()=>{
    const env=renderDN({dayNightLatitude:70,dayNightSeason:90}),axis=env.section.querySelector('[data-dn-axis]').outerHTML;
    expect(metric(env.section,'daylight')).toBe(24);env.invoke('[data-dn-season-preset="270"]');expect(metric(env.section,'daylight')).toBe(0);expect(env.section.querySelector('[data-dn-axis]').outerHTML).toBe(axis);
    env.invoke('[data-dn-latitude-preset="-70"]');expect(metric(env.section,'daylight')).toBe(24);
  });

  it('closes the daily and annual cycles and gives equatorial days 12 hours',()=>{
    const env=renderDN({dayNightRot:0,dayNightSeason:0,dayNightLatitude:0});const observer=env.section.querySelector('[data-dn-observer]');const start=[attr(observer,'cx'),attr(observer,'cy'),metric(env.section,'altitude')];
    env.invoke('#solar-dn-time',360);const next=env.section.querySelector('[data-dn-observer]');expect(attr(next,'cx')).toBeCloseTo(start[0],10);expect(attr(next,'cy')).toBeCloseTo(start[1],10);expect(metric(env.section,'altitude')).toBeCloseTo(start[2],10);
    for(const season of[0,90,180,270,360]){env.invoke('#solar-dn-season',season);expect(metric(env.section,'daylight')).toBeCloseTo(12,10);}
    expect(metric(env.section,'declination')).toBeCloseTo(0,10);
  });

  it.each([
    [{dayNightRot:-50,dayNightSeason:-20,dayNightLatitude:-100},0,0,-90],
    [{dayNightRot:999,dayNightSeason:999,dayNightLatitude:999},360,360,90],
    [{dayNightRot:NaN,dayNightSeason:Infinity,dayNightLatitude:'45'},90,90,45],
    [{dayNightRot:88.3,dayNightSeason:271.2,dayNightLatitude:44.8},90,270,45],
  ])('normalizes restored fields read-only: %j',(seed,rotation,season,latitude)=>{
    const env=renderDN(seed);expect(+env.section.dataset.dnRotation).toBe(rotation);expect(+env.section.dataset.dnSeason).toBe(season);expect(+env.section.dataset.dnLatitude).toBe(latitude);expect(env.writes).toBe(0);for(const[key,value]of Object.entries(seed))expect(env.state[key]).toEqual(value);
  });

  it('preserves saved work and rewards through controls and disclosure',()=>{
    const env=renderDN(saved);env.invoke('[data-dn-time-preset="270"]');env.invoke('[data-dn-season-preset="270"]');env.invoke('[data-dn-latitude-preset="-70"]');const before=structuredClone(env.state);
    env.invoke('[aria-controls=solar-dn-content]');expect(env.section.querySelectorAll('svg')).toHaveLength(0);expect(env.section.querySelector('#solar-dn-content').hidden).toBe(true);
    env.invoke('[aria-controls=solar-dn-content]');expect(env.state).toEqual(before);for(const[key,value]of Object.entries(saved))expect(env.state[key]).toEqual(value);
  });

  it('names diagrams, native controls, endpoints and model limits',()=>{
    const env=renderDN(),s=env.section;
    for(const input of s.querySelectorAll('input')){expect(s.querySelector('label[for="'+input.id+'"]')).toBeTruthy();expect(input.getAttribute('aria-valuetext')).toBeTruthy();}
    for(const svg of s.querySelectorAll('svg'))for(const key of['aria-labelledby','aria-describedby'])for(const id of svg.getAttribute(key).split(' '))expect(document.getElementById(id)).toBeTruthy();
    expect(s.querySelectorAll('svg text')).toHaveLength(0);expect(s.textContent).toContain('hidden far side');expect(s.textContent).toContain('not your time-zone clock');expect(s.textContent).toContain('does not swing');expect(s.textContent).toContain('refraction');expect(s.querySelectorAll('a[rel="noopener noreferrer"]')).toHaveLength(2);
  });
});
