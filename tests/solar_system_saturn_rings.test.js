import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function ringsTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-saturn-rings') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderRG(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showRings: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-rg-test-callback': id }, ...children);
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
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => ringsTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-saturn-rings'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.rgTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

const metric=(s,key)=>+s.querySelector('[data-rg-metric='+key+']').dataset.value;
const bounds={C:[74658,91975],B:[91975,117507],division:[117507,122340],A:[122340,136780]},scale=70/60268;
describe('Saturn ring projection, occultation and radial references',()=>{
 beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_solarsystem.js','solarSystem');vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('requestAnimationFrame',()=>1);vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);});
 afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';});
 it.each([0,1,25,30,60,89,90].flatMap(opening=>Object.keys(bounds).map(band=>[opening,band])))('keeps physical boundaries and layer order at %s degrees selecting%s',(ringOpening,ringBand)=>{
  const env=renderRG({ringOpening,ringBand}),s=env.section;expect(metric(s,'ratio')).toBeCloseTo(Math.sin(ringOpening*Math.PI/180),14);expect(metric(s,'width')).toBe(bounds[ringBand][1]-bounds[ringBand][0]);expect(metric(s,'diameter')).toBe(273560);expect(s.dataset.rgSelected).toBe(ringBand);
  for(const[view,flattening]of[['projected',Math.sin(ringOpening*Math.PI/180)],['face',1]]){const scene=s.querySelector('[data-rg-scene='+view+']'),layers=[...scene.querySelectorAll('[data-rg-layer]')].map(n=>n.dataset.rgLayer);expect(layers).toEqual(flattening>0?[view+'-back',view+'-planet',view+'-front']:[view+'-planet']);expect(scene.querySelectorAll('[data-rg-band]')).toHaveLength(flattening>0?6:0);expect(+scene.querySelector('[data-rg-planet]').getAttribute('r')).toBe(70);for(const band of scene.querySelectorAll('[data-rg-band]')){const [inner,outer]=bounds[band.dataset.rgBand],arc=[...band.getAttribute('d').matchAll(/A([\d.e+-]+) ([\d.e+-]+)/g)];expect(+arc[0][1]).toBeCloseTo(outer*scale,10);expect(+arc[1][1]).toBeCloseTo(inner*scale,10);expect(+arc[0][2]/+arc[0][1]).toBeCloseTo(flattening,14);expect(+arc[1][2]/+arc[1][1]).toBeCloseTo(flattening,14);}for(const outline of scene.querySelectorAll('[data-rg-selection]'))expect(outline.getAttribute('d')).not.toMatch(/[LZ]/);if(flattening>0){const front=scene.querySelector('[data-rg-layer='+view+'-front]');expect(front.getAttribute('clip-path')).toBe('url(#solar-rg-front-clip-'+view+')');const clip=scene.querySelector('#solar-rg-front-clip-'+view+' circle');expect(['cx','cy','r'].map(k=>+clip.getAttribute(k))).toEqual([310,200,70]);for(const band of scene.querySelectorAll('[data-rg-band]'))expect((band.getAttribute('d').match(/A/g)||[]).length).toBe(band.dataset.rgHalf==='front'?2:4);}expect(!!scene.querySelector('[data-rg-edge-guide]')).toBe(flattening===0);}
  for(const band of s.querySelectorAll('[data-rg-radial-band]')){const [inner,outer]=bounds[band.dataset.rgRadialBand];expect(+band.getAttribute('x')).toBeCloseTo(20+(inner-60000)/80000*580,10);expect(+band.getAttribute('width')).toBeCloseTo((outer-inner)/80000*580,10);}expect(s.querySelector('[data-rg-band=division]')).toBeNull();expect(s.innerHTML).not.toMatch(/NaN|Infinity/);expect(env.writes).toBe(0);
 });
 it('changes only projected shape when the viewing angle changes',()=>{const env=renderRG(),face=env.section.querySelector('[data-rg-scene=face]').outerHTML,ruler=env.section.querySelector('[data-rg-ruler]').outerHTML,projected=env.section.querySelector('[data-rg-scene=projected]').outerHTML;env.invoke('#solar-rg-ringOpening',60);expect(env.section.querySelector('[data-rg-scene=face]').outerHTML).toBe(face);expect(env.section.querySelector('[data-rg-ruler]').outerHTML).toBe(ruler);expect(env.section.querySelector('[data-rg-scene=projected]').outerHTML).not.toBe(projected);});
 it.each([0,50,100])('changes the palette without changing radii at blend%s',ringIce=>{const s=renderRG({ringIce,ringDensity:100}).section;for(const[band,tone]of[['C',.62],['B',1],['A',.82]]){const el=s.querySelector('[data-rg-band='+band+']'),rgb=[182,141,98].map((v,i)=>Math.round((v+([231,237,240][i]-v)*ringIce/100)*tone));expect(el.getAttribute('fill')).toBe('rgb('+rgb.join(',')+')');expect(+el.dataset.inner).toBe(bounds[band][0]);expect(+el.dataset.outer).toBe(bounds[band][1]);}});
 it.each([0,60,100])('changes display opacity without changing band count at%s',ringDensity=>{const s=renderRG({ringDensity}).section;expect(s.querySelectorAll('[data-rg-band]')).toHaveLength(12);for(const band of s.querySelectorAll('[data-rg-band],[data-rg-radial-band]'))expect(+band.getAttribute('opacity')).toBe(ringDensity/100);expect(s.querySelectorAll('[data-rg-selection]')).toHaveLength(4);expect(s.querySelector('[data-rg-radial-selection]')).toBeTruthy();});
 it('uses an enlarged extent guide at zero opening without zero-radius SVG arcs',()=>{const s=renderRG({ringOpening:0}).section,projected=s.querySelector('[data-rg-scene=projected]');expect(projected.querySelectorAll('path')).toHaveLength(0);expect(projected.querySelectorAll('[data-rg-edge-guide] line')).toHaveLength(2);for(const line of projected.querySelectorAll('[data-rg-edge-guide] line')){expect(Math.abs(+line.getAttribute('x1')-310)).toBe(70);expect(Math.abs(+line.getAttribute('x2')-310)).toBeCloseTo(136780*scale,10);}expect(metric(s,'ratio')).toBe(0);expect(s.textContent).toContain('zero projected area');});
 it.each([[{},25,95,60,'B'],[{ringOpening:NaN,ringIce:Infinity,ringDensity:'60',ringBand:'invalid'},25,95,60,'B'],[{ringOpening:-10,ringIce:-10,ringDensity:-10,ringBand:'C'},0,0,0,'C'],[{ringOpening:500,ringIce:500,ringDensity:500,ringBand:'A'},90,100,100,'A'],[{ringOpening:25.7,ringIce:94.7,ringDensity:60.3,ringBand:'division'},26,95,60,'division']])('normalizes restored state without writes %j',(seed,opening,ice,opacity,selected)=>{const env=renderRG(seed);expect([+env.section.dataset.rgOpening,+env.section.dataset.rgIce,+env.section.dataset.rgOpacity,env.section.dataset.rgSelected]).toEqual([opening,ice,opacity,selected]);expect(env.writes).toBe(0);for(const[key,value]of Object.entries(seed))expect(env.state[key]).toEqual(value);});
 it('preserves notes and settings across every control and disclosure',()=>{const saved={researchPoints:350,totalRP:500,sdHour:9,sdLatitude:45,sdDeclination:0,sdHeight:1,journalEntries:[{observation:'Saved evidence'}],missionLog:[{text:'Keep'}]};const env=renderRG(saved);for(const key of['ringOpening','ringIce','ringDensity'])for(const button of[...env.section.querySelectorAll('[data-rg-preset='+key+']')]){const value=+button.dataset.value;env.invoke('[data-rg-preset='+key+'][data-value="'+value+'"]');expect(env.state[key]).toBe(value);}for(const region of Object.keys(bounds)){env.invoke('[data-rg-region='+region+']');expect(env.state.ringBand).toBe(region);expect(env.section.querySelector('[data-rg-region='+region+']').getAttribute('aria-pressed')).toBe('true');}const before=structuredClone(env.state);env.invoke('[aria-controls=solar-rg-content]');expect(env.section.querySelector('#solar-rg-content').hidden).toBe(true);expect(env.section.querySelectorAll('svg')).toHaveLength(0);env.invoke('[aria-controls=solar-rg-content]');expect(env.state).toEqual(before);for(const[key,value]of Object.entries(saved))expect(env.state[key]).toEqual(value);});
 it('provides unique SVG definitions, native labels and accurate disclosures',()=>{const env=renderRG(),s=env.section,before=s.innerHTML;env.render();expect(env.section.innerHTML).toBe(before);for(const key of['ringOpening','ringIce','ringDensity']){expect(s.querySelector('label[for=solar-rg-'+key+']')).toBeTruthy();expect(s.querySelector('#solar-rg-'+key).getAttribute('aria-valuetext')).toBeTruthy();}for(const svg of s.querySelectorAll('svg'))for(const a of['aria-labelledby','aria-describedby'])for(const id of svg.getAttribute(a).split(' '))expect(document.getElementById(id)).toBeTruthy();for(const match of s.innerHTML.matchAll(/url\(#([^)]*)\)/g))expect(s.querySelector('#'+match[1])).toBeTruthy();const ids=[...s.querySelectorAll('[id]')].map(el=>el.id);expect(new Set(ids).size).toBe(ids.length);expect(s.querySelectorAll('svg text')).toHaveLength(0);for(const text of['infinitely thin','sphere','not visible area or brightness','not measure composition','Selection outlines remain visible','arbitrary observer viewpoint','not Earth’s seasonal viewing range'])expect(s.textContent).toContain(text);expect(renderRG({ringBand:'division'}).section.textContent).toContain('real division contains faint material');});
});
