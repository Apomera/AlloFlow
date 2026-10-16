import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function transitTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-mercury-transit') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderMT(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showTrans: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-mt-test-callback': id }, ...children);
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
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => transitTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-mercury-transit'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.mtTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

const metric=(s,key)=>Number(s.querySelector('[data-mt-metric='+key+']').dataset.value);
const k=12/1902,maxDepth=39.80535182955348;
// Independent numerical area integral in Mercury-centered coordinates; no inverse-cosine overlap formula.
function integratedDepth(z) {if(z>=1+k)return 0;if(z<=1-k)return maxDepth;const N=8192,h=Math.PI/N;let sum=0;for(let i=0;i<=N;i++){const t=-Math.PI/2+i*h,dx=k*Math.cos(t),x=z+k*Math.sin(t),height=Math.min(dx,Math.sqrt(Math.max(0,1-x*x))),f=2*height*dx;sum+=f*(i===0||i===N?1:i%2?4:2);}return sum*h/3/Math.PI*1e6;}
describe('Mercury apparent-scale transit and uniform-source light curve',()=>{
 beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_solarsystem.js','solarSystem');vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('requestAnimationFrame',()=>1);vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);});
 afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';});
 it('marks presets using normalized visible values',()=>{const fresh=renderMT();expect(fresh.section.querySelector('[data-mt-preset=transPhase][data-value="50"]').getAttribute('aria-pressed')).toBe('true');expect(fresh.section.querySelector('[data-mt-preset=transImpact][data-value="0"]').getAttribute('aria-pressed')).toBe('true');const restored=renderMT({transPhase:101,transImpact:-1});expect(restored.section.querySelector('[data-mt-preset=transPhase][data-value="100"]').getAttribute('aria-pressed')).toBe('true');expect(restored.section.querySelector('[data-mt-preset=transImpact][data-value="0"]').getAttribute('aria-pressed')).toBe('true');});
 it.each([0,.5,.99,1,1.01,1.05].flatMap(b=>[0,8.1,8.33,8.6,25,45,50,55,75,91.67,100].map(p=>[b,p])))('matches independent area integration at b%s progress%s',(transImpact,transPhase)=>{
   const env=renderMT({transImpact,transPhase}),s=env.section,u=-1.2+2.4*transPhase/100,z=Math.hypot(u,transImpact),depth=metric(s,'depth');expect(Math.abs(depth-integratedDepth(z))).toBeLessThan(.001);expect(depth).toBeGreaterThanOrEqual(0);expect(depth).toBeLessThanOrEqual(maxDepth+1e-10);expect(metric(s,'remaining')).toBeCloseTo(100-depth/1e4,12);expect(metric(s,'maximum')).toBeCloseTo(maxDepth,10);
   const sun=s.querySelector('[data-mt-sun]'),mercury=s.querySelector('[data-mt-mercury]'),detailSun=s.querySelector('[data-mt-detail-sun]'),detailMercury=s.querySelector('[data-mt-detail-mercury]');expect(+mercury.getAttribute('r')/+sun.getAttribute('r')).toBeCloseTo(k,14);expect(+detailMercury.getAttribute('r')/+detailSun.getAttribute('r')).toBeCloseTo(k,14);expect(+detailSun.getAttribute('r')/+sun.getAttribute('r')).toBe(40);expect(+mercury.getAttribute('cx')).toBeCloseTo(310+140*u,10);expect(+mercury.getAttribute('cy')).toBeCloseTo(200-140*transImpact,10);expect(+detailSun.getAttribute('cx')).toBeCloseTo(310-u*5600,8);expect(+detailSun.getAttribute('cy')).toBeCloseTo(200+transImpact*5600,8);
   const marker=s.querySelector('[data-mt-marker]');expect(+marker.getAttribute('cx')).toBeCloseTo(20+580*transPhase/100,10);expect(+marker.getAttribute('cy')).toBeCloseTo(26+depth/45*248,10);expect(s.innerHTML).not.toMatch(/NaN|Infinity/);expect(env.writes).toBe(0);
 });
 it.each([0,.5,.99,1,1.01])('resolves narrow contacts and symmetric curve at b%s',transImpact=>{
   const s=renderMT({transImpact}).section,contacts=s.querySelector('[data-mt-contacts]').dataset,points=[...s.querySelector('[data-mt-curve]').getAttribute('d').matchAll(/[ML]([\d.e+-]+) ([\d.e+-]+)/g)].map(m=>[+m[1],+m[2]]);expect(points.every(([x,y])=>x>=20-1e-8&&x<=600+1e-8&&y>=26-1e-8&&y<=274)).toBe(true);
   if(transImpact>=1+k){expect(contacts.first).toBeUndefined();expect(points.every(p=>p[1]===26)).toBe(true);return;}
   const first=+contacts.first,fourth=+contacts.fourth;expect(first+fourth).toBeCloseTo(100,10);expect(Math.hypot(-1.2+2.4*first/100,transImpact)).toBeCloseTo(1+k,12);
   if(transImpact<1-k){const second=+contacts.second,third=+contacts.third;expect(second+third).toBeCloseTo(100,10);expect(Math.hypot(-1.2+2.4*second/100,transImpact)).toBeCloseTo(1-k,12);const entry=points.filter(([x])=>x>=20+first/100*580-1e-9&&x<=20+second/100*580+1e-9);expect(entry.length).toBeGreaterThanOrEqual(65);for(let i=1;i<entry.length;i++)expect(entry[i][1]).toBeGreaterThanOrEqual(entry[i-1][1]-1e-5);}else{expect(contacts.second).toBeUndefined();expect(contacts.third).toBeUndefined();}
 });
 it('shows partial contacts instead of hiding Mercury at the limb',()=>{const env=renderMT();env.invoke('[data-mt-preset=transPhase][data-value="8.33"]');expect(env.section.querySelector('[data-mt-status]').textContent).toContain('Partial ingress');expect(metric(env.section,'depth')).toBeGreaterThan(0);expect(metric(env.section,'depth')).toBeLessThan(maxDepth);const firstDepth=metric(env.section,'depth');env.invoke('[data-mt-preset=transPhase][data-value="91.67"]');expect(env.section.querySelector('[data-mt-status]').textContent).toContain('Partial egress');expect(metric(env.section,'depth')).toBeCloseTo(firstDepth,8);expect(env.section.querySelector('[data-mt-mercury]')).toBeTruthy();});
 it.each([[{},50,0],[{transPhase:NaN,transImpact:Infinity},50,0],[{transPhase:'25',transImpact:'1'},50,0],[{transPhase:-1,transImpact:-1},0,0],[{transPhase:101,transImpact:10},100,1.05],[{transPhase:8.334,transImpact:.997},8.33,1]])('restores safe values without writing saved state: %j',(seed,phase,impact)=>{const env=renderMT(seed);expect(+env.section.dataset.mtPhase).toBe(phase);expect(+env.section.dataset.mtImpact).toBe(impact);expect(env.writes).toBe(0);for(const[key,value]of Object.entries(seed))expect(env.state[key]).toEqual(value);});
 it('preserves saved work and settings across presets and disclosure',()=>{const saved={researchPoints:350,totalRP:500,issOrbit:180,issAltitudeKm:400,issBetaDeg:30,swSpeed:800,swDens:10,journalEntries:[{observation:'Saved evidence'}],missionLog:[{text:'Keep'}]};const env=renderMT(saved);for(const key of['transImpact','transPhase'])for(const button of [...env.section.querySelectorAll('[data-mt-preset='+key+']:not(:disabled)')]){const value=+button.dataset.value;env.invoke('[data-mt-preset='+key+'][data-value="'+value+'"]');expect(env.state[key]).toBe(value);}const before=structuredClone(env.state);env.invoke('[aria-controls=solar-mt-content]');expect(env.section.querySelector('#solar-mt-content').hidden).toBe(true);expect(env.section.querySelectorAll('svg')).toHaveLength(0);env.invoke('[aria-controls=solar-mt-content]');expect(env.state).toEqual(before);for(const[key,value]of Object.entries(saved))expect(env.state[key]).toEqual(value);});
 it('keeps redraws deterministic and makes the model accessible',()=>{const env=renderMT(),s=env.section,before=s.innerHTML;env.render();expect(env.section.innerHTML).toBe(before);for(const key of['transPhase','transImpact']){expect(s.querySelector('label[for=solar-mt-'+key+']')).toBeTruthy();expect(s.querySelector('#solar-mt-'+key).getAttribute('aria-valuetext')).toBeTruthy();}for(const svg of s.querySelectorAll('svg'))for(const a of['aria-labelledby','aria-describedby'])for(const id of svg.getAttribute(a).split(' '))expect(document.getElementById(id)).toBeTruthy();const ids=[...s.querySelectorAll('[id]')].map(el=>el.id);expect(new Set(ids).size).toBe(ids.length);expect(s.querySelectorAll('svg text')).toHaveLength(0);for(const text of['12 arcseconds','1,902 arcseconds','40× magnification','Both disks are magnified equally','uniform','Limb darkening','does not predict a real transit date','not orbital inclination','not Mercury’s diameter'])expect(s.textContent).toContain(text);});
});
