import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function sundialTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-sundial') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderSD(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showSundial: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-sd-test-callback': id }, ...children);
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
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => sundialTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-sundial'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.sdTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

const metric=(s,key)=>{const v=s.querySelector('[data-sd-metric='+key+']').dataset.value;return v==='none'?null:+v;},rad=Math.PI/180;
const cases=[[-80,-23.44],[-45,0],[0,0],[23,23],[45,0],[45,23.44],[80,23.44],[80,-23.44]];
// Independent Earth-centered projection onto a local east/north/up basis.
function reference(lat,dec,time,height){const p=lat*rad,d=dec*rad,H=(time-12)*15*rad,sun=[Math.cos(d)*Math.cos(H),-Math.cos(d)*Math.sin(H),Math.sin(d)],north=[-Math.sin(p),0,Math.cos(p)],up=[Math.cos(p),0,Math.sin(p)],E=sun[1],N=sun.reduce((sum,v,i)=>sum+v*north[i],0),U=sun.reduce((sum,v,i)=>sum+v*up[i],0),horizontal=Math.hypot(E,N),day=U>1e-10,zenith=day&&horizontal<1e-10;return{E,N,U,day,zenith,alt:Math.atan2(U,horizontal)/rad,length:day?(zenith?0:height*horizontal/U):null,east:day?(zenith?0:-height*E/U):null,north:day?(zenith?0:-height*N/U):null,bearing:day&&!zenith?(Math.atan2(-E,-N)/rad+360)%360:null};}
describe('Vertical gnomon shadow geometry and fixed view scales',()=>{
 beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_solarsystem.js','solarSystem');vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('requestAnimationFrame',()=>1);vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);});
 afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';});
 it.each(cases.flatMap(c=>[0,6,9,12,15,18,24].map(time=>[...c,time])))('matches independent spatial projection at latitude%s declination%s time%s',(sdLatitude,sdDeclination,sdHour)=>{const env=renderSD({sdLatitude,sdDeclination,sdHour}),s=env.section,r=reference(sdLatitude,sdDeclination,sdHour,1);expect(metric(s,'altitude')).toBeCloseTo(r.alt,10);expect(s.dataset.sdDay).toBe(String(r.day));for(const key of['length','bearing']){if(r[key]===null)expect(metric(s,key)).toBeNull();else expect(metric(s,key)).toBeCloseTo(r[key],9);}expect(!!s.querySelector('[data-sd-ground-shadow]')).toBe(r.day);expect(!!s.querySelector('[data-sd-ray]')).toBe(r.day);expect(!!s.querySelector('[data-sd-sun-direction]')).toBe(r.day&&!r.zenith);expect(!!s.querySelector('[data-sd-marker]')).toBe(r.day&&r.length<=8);if(r.day){const line=s.querySelector('[data-sd-ground-shadow]'),scale=r.length>4?4/r.length:1;expect(+line.getAttribute('x2')).toBeCloseTo(310+35*r.east*scale,9);expect(+line.getAttribute('y2')).toBeCloseTo(200-35*r.north*scale,9);expect(!!s.querySelector('[data-sd-ground-continuation]')).toBe(r.length>4);}expect(env.writes).toBe(0);expect(s.innerHTML).not.toMatch(/NaN|Infinity/);});
 it.each([[40,0,12,50,.8390996312,0],[40,0,9,32.7977513311,1.5518300107,302.7324072096],[40,0,15,32.7977513311,1.5518300107,57.2675927904],[-40,0,12,50,.8390996312,180],[80,23.44,0,13.44,4.1845997457,180]])('matches independent reference at %s,%s,%s',(sdLatitude,sdDeclination,sdHour,alt,length,bearing)=>{const s=renderSD({sdLatitude,sdDeclination,sdHour}).section;expect(metric(s,'altitude')).toBeCloseTo(alt,8);expect(metric(s,'length')).toBeCloseTo(length,8);expect(metric(s,'bearing')).toBeCloseTo(bearing,8);});
 it.each([.2,1,2])('uses the equinox straight-line identity for height%s',sdHeight=>{for(const sdHour of[9,12,15]){const s=renderSD({sdLatitude:40,sdDeclination:0,sdHour,sdHeight}).section,shadow=s.querySelector('[data-sd-ground-shadow]');expect((200-+shadow.getAttribute('y2'))/35).toBeCloseTo(sdHeight*Math.tan(40*rad),10);expect((+shadow.getAttribute('x2')-310)/35).toBeCloseTo(sdHeight*Math.tan((sdHour-12)*15*rad)/Math.cos(40*rad),10);}});
 it.each([[45,0,6.25,2],[80,23.44,0,1],[45,0,9,1],[0,0,12,2]])('preserves sunlight slope through the gnomon at %s,%s,%s height%s',(sdLatitude,sdDeclination,sdHour,sdHeight)=>{const s=renderSD({sdLatitude,sdDeclination,sdHour,sdHeight}).section,ray=s.querySelector('[data-sd-ray]'),x1=+ray.getAttribute('x1'),y1=+ray.getAttribute('y1'),x2=+ray.getAttribute('x2'),y2=+ray.getAttribute('y2'),tipY=300-60*sdHeight;expect(Math.abs((x1-350)*(y2-tipY)-(y1-tipY)*(x2-350))).toBeLessThan(1e-7);if(metric(s,'length')>4){expect(x2).toBe(110);expect(y2).toBeLessThan(300);expect(s.querySelector('[data-sd-ground-tip]')).toBeNull();}else expect(y2).toBe(300);});
 it('doubles actual shadow distance with post height while retaining direction and solar altitude',()=>{const env=renderSD({sdLatitude:45,sdHour:9,sdHeight:1}),before=['length','bearing','altitude'].map(k=>metric(env.section,k));env.invoke('#solar-sd-sdHeight',2);expect(metric(env.section,'length')).toBeCloseTo(2*before[0],12);expect(metric(env.section,'bearing')).toBeCloseTo(before[1],12);expect(metric(env.section,'altitude')).toBeCloseTo(before[2],12);});
 it.each(cases)('keeps chart gaps and exact upper-range endpoints at %s,%s',(sdLatitude,sdDeclination)=>{const s=renderSD({sdLatitude,sdDeclination}).section,commands=[...s.querySelector('[data-sd-curve]').getAttribute('d').matchAll(/([ML])([\d.e+-]+) ([\d.e+-]+)/g)].map(m=>({op:m[1],x:+m[2],y:+m[3]}));for(let i=0;i<commands.length;i++){const p=commands[i],time=(p.x-20)/580*24,r=reference(sdLatitude,sdDeclination,time,1);expect(r.day).toBe(true);expect(r.length).toBeLessThanOrEqual(8+1e-8);expect(p.y).toBeCloseTo(274-r.length/8*248,7);if(p.op==='L'){const previous=commands[i-1],mid=reference(sdLatitude,sdDeclination,(time+(previous.x-20)/580*24)/2,1);expect(mid.day).toBe(true);expect(mid.length).toBeLessThanOrEqual(8+1e-8);}}if(sdLatitude===45&&sdDeclination===0){expect(commands[0].y).toBeCloseTo(26,8);expect(commands.at(-1).y).toBeCloseTo(26,8);}});
 it('distinguishes horizon, night and zero-length shadows',()=>{const env=renderSD({sdLatitude:0,sdDeclination:0,sdHour:6});expect(env.section.querySelector('[data-sd-status]').textContent).toContain('no finite shadow');expect(metric(env.section,'length')).toBeNull();env.invoke('#solar-sd-sdHour',0);expect(env.section.querySelector('[data-sd-status]').textContent).toContain('no direct shadow');env.invoke('#solar-sd-sdHour',12);expect(metric(env.section,'length')).toBe(0);expect(metric(env.section,'bearing')).toBeNull();expect(env.section.querySelector('[data-sd-sun-direction]')).toBeNull();});
 it.each([[{},12,45,0,1],[{sdHour:NaN,sdLatitude:Infinity,sdDeclination:'0',sdHeight:null},12,45,0,1],[{sdHour:-1,sdLatitude:-100,sdDeclination:-50,sdHeight:-1},0,-80,-23.44,.2],[{sdHour:50,sdLatitude:100,sdDeclination:50,sdHeight:50},24,80,23.44,2],[{sdHour:9.3,sdLatitude:44.7,sdDeclination:10.237,sdHeight:.84},9.25,45,10.24,.8]])('normalizes restored values without changing saved work %j',(seed,time,lat,dec,height)=>{const env=renderSD(seed);expect([+env.section.dataset.sdHour,+env.section.dataset.sdLatitude,+env.section.dataset.sdDeclination,+env.section.dataset.sdHeight]).toEqual([time,lat,dec,height]);expect(env.writes).toBe(0);for(const[key,value]of Object.entries(seed))expect(env.state[key]).toEqual(value);});
 it('preserves saved notes, settings and rewards through presets and disclosure',()=>{const saved={researchPoints:350,totalRP:500,pulsarSpin:15,pulsarTilt:30,pulsarView:30,pulsarCone:10,journalEntries:[{observation:'Saved evidence'}],missionLog:[{text:'Keep'}]};const env=renderSD(saved);for(const key of['sdHour','sdLatitude','sdDeclination','sdHeight'])for(const button of[...env.section.querySelectorAll('[data-sd-preset='+key+']')]){const value=+button.dataset.value;env.invoke('[data-sd-preset='+key+'][data-value="'+value+'"]');expect(env.state[key]).toBe(value);}const before=structuredClone(env.state);env.invoke('[aria-controls=solar-sd-content]');expect(env.section.querySelector('#solar-sd-content').hidden).toBe(true);expect(env.section.querySelectorAll('svg')).toHaveLength(0);env.invoke('[aria-controls=solar-sd-content]');expect(env.state).toEqual(before);for(const[key,value]of Object.entries(saved))expect(env.state[key]).toEqual(value);});
 it('labels controls and explains fixed scales and model limits',()=>{const env=renderSD(),s=env.section,before=s.innerHTML;env.render();expect(env.section.innerHTML).toBe(before);for(const key of['sdHour','sdLatitude','sdDeclination','sdHeight']){expect(s.querySelector('label[for=solar-sd-'+key+']')).toBeTruthy();expect(s.querySelector('#solar-sd-'+key).getAttribute('aria-valuetext')).toBeTruthy();}for(const svg of s.querySelectorAll('svg'))for(const a of['aria-labelledby','aria-describedby'])for(const id of svg.getAttribute(a).split(' '))expect(document.getElementById(id)).toBeTruthy();const ids=[...s.querySelectorAll('[id]')].map(el=>el.id);expect(new Set(ids).size).toBe(ids.length);expect(s.querySelectorAll('svg text')).toHaveLength(0);for(const text of['vertical-gnomon','local apparent solar time','no finite shadow tip','not flattened','same metre scale','level surface','point Sun','not east–west'])expect(s.textContent).toContain(text);});
});
