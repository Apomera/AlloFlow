import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const SRC=process.env.WELDLAB_SRC||'stem_lab/stem_tool_weldlab.js';
const BASE={view:'maineEcosystem',me_mode:'browse',me_sect:'biw'};
const SYSTEMS=[
{id:'hull',mark:'1',label:'Hull plating',authored:'Hull plating (HSLA-65, HSLA-80, HY-80, HY-100 high-strength steels).',relationship:'The plating forms the outer shell around the interior. Follow the blue band along the outside of this cutaway.'},
{id:'structure',mark:'2',label:'Internal structure',authored:'Internal structure (bulkheads, frames).',relationship:'Bulkheads divide interior spaces; frames support the shell. The broad partitions and narrow frame profiles are shown inside the plating.'},
{id:'piping',mark:'3',label:'Piping systems',authored:'Piping systems (carbon steel + stainless + copper-nickel).',relationship:'The bends and branches illustrate a piping route through the hull. The pipe service follows the ship design.'}
];
const COMPLETE='Hull plating (HSLA-65, HSLA-80, HY-80, HY-100 high-strength steels). Internal structure (bulkheads, frames). Piping systems (carbon steel + stainless + copper-nickel). Aluminum superstructure (sometimes). Every weld is inspected. Navy work follows NAVSEA rules rather than AWS D1.1: Technical Publication 248 (welder + procedure qualification), Tech Pub 278 (piping, machinery, pressure vessels) and MIL-STD-1689 (surface-ship hull structure).';
const OUTER='M64 120 H650 L618 205 Q590 286 524 290 H162 Q103 272 64 120 Z';
const INNER='M82 136 H626 L600 201 Q575 270 522 274 H166 Q120 258 82 136 Z';
const FRAMES=['M156 144 V238 L168 258','M206 144 V268','M332 144 V268','M382 144 V268','M500 144 V268','M550 144 V238 L544 254'];
const PIPES=['M126 178 H196 Q210 178 210 192 V224 Q210 238 224 238 H398 Q412 238 412 224 V192 Q412 178 426 178 H576','M316 238 V256 H372','M508 178 V154 H550'];
let root,host;
const lens=(node=host)=>node.querySelector('[data-ship-systems]');
const button=text=>[...host.querySelectorAll('button')].find(node=>node.textContent.trim()===text);
const core=()=>window.__WeldLabCore;
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;delete window.__alloflowWeldLab;localStorage.clear();resetStemLab();loadTool(SRC,'weldLab');});
afterEach(async()=>{if(root)await React.act(()=>root.unmount());root=null;host?.remove();});
function render(extra={},contrast=false){const node=document.createElement('div');node.innerHTML=renderTool('weldLab',{weldLab:{...BASE,...extra}},{isContrast:contrast});return node;}
async function mount(extra={},contrast=false){let latest;const writes=[];function App(){const[data,setData]=React.useState({weldLab:{...BASE,...extra}});latest=data.weldLab;return window.StemLab._registry.weldLab.render(makeCtx({isContrast:contrast,toolData:data,setToolData:setData,update:(tool,key,value)=>{writes.push([key,value]);setData(prev=>({...prev,[tool]:{...prev[tool],[key]:value}}));}}));}host=document.createElement('div');document.body.append(host);root=ReactDOMClient.createRoot(host);await React.act(()=>root.render(React.createElement(App)));return{latest:()=>latest,writes};}
async function click(node){expect(node).toBeTruthy();await React.act(()=>node.click());}
async function pick(id){await click(lens().querySelector('[data-ship-pick="'+id+'"]'));}
async function decision(number,text){const group=[...host.querySelectorAll('[role="radiogroup"]')].find(node=>node.getAttribute('aria-label').startsWith('Decision '+number));expect(group).toBeTruthy();await click([...group.querySelectorAll('button')].find(node=>node.textContent.includes(text)));}
function assertTimeline(expected){const timeline=host.querySelector('[data-maine-timeline]');expect(Number(timeline.dataset.availableYears)).toBe(expected.steps.length);for(let i=0;i<8;i++){const node=timeline.querySelector('[data-maine-year-node="'+i+'"]');expect(node.disabled).toBe(i>=expected.steps.length);if(i<expected.steps.length)expect(Number(node.dataset.yearPay)).toBe(expected.years[i]);else{expect(node.hasAttribute('data-year-pay')).toBe(false);expect(node.textContent).toContain('Decision ahead');}}}

describe('BIW conceptual ship systems',()=>{
  it('retains the complete authored material and NAVSEA paragraph beside the added reference',()=>{
    const node=render(),section=lens(node);expect(section.dataset.shipSystems).toBe('hull');expect(section.nextElementSibling.textContent).toBe(COMPLETE);expect(node.textContent).toContain('What you weld at BIW');expect(node.textContent).toContain('How to get in');expect(node.textContent).toContain('Every weld is inspected.');
  });

  it('maps three native manual choices to exact authored excerpts and appropriate relationship readings',async()=>{
    await mount();for(const system of SYSTEMS){await pick(system.id);expect(lens().dataset.shipSystems).toBe(system.id);const reading=lens().querySelector('[data-ship-reading]');expect(reading.dataset.shipReading).toBe(system.id);expect(reading.querySelector('h6').textContent).toBe(system.mark+' · '+system.label);expect(reading.querySelector('[data-ship-authored]').textContent).toBe(system.authored);expect(reading.querySelector('[data-ship-relationship]').textContent).toBe(system.relationship);expect(lens().querySelector('[data-ship-focus]').dataset.shipFocus).toBe(system.id);expect(lens().querySelector('figure').nextElementSibling).toBe(reading);expect(lens().querySelectorAll('[data-ship-pick][aria-pressed="true"]')).toHaveLength(1);}
  });

  it('draws the shell as a real outer band with internal partitions, six frames and a separate nested pipe network',()=>{
    const section=lens(render()),base=section.querySelector('[data-ship-base]'),part=id=>base.querySelector('[data-ship-part="'+id+'"]');expect([...base.querySelectorAll('[data-ship-system]')].map(node=>node.dataset.shipSystem)).toEqual(['hull','structure','piping']);expect(part('outer-shell').getAttribute('d')).toBe(OUTER+' '+INNER);expect(part('outer-shell').getAttribute('fill-rule')).toBe('evenodd');expect(part('inner-cutaway').getAttribute('d')).toBe(INNER);expect(part('deck-edge').getAttribute('d')).toBe('M64 120 H650');expect(['bulkhead-1','bulkhead-2'].map(id=>['x','y','width','height'].map(attr=>Number(part(id).getAttribute(attr))))).toEqual([[264,144,14,124],[440,144,14,124]]);expect(FRAMES.map((_,i)=>part('frame-'+(i+1)).getAttribute('d'))).toEqual(FRAMES);expect(['pipe-main','pipe-branch-1','pipe-branch-2'].map(id=>part(id).getAttribute('d'))).toEqual(PIPES);expect(base.querySelectorAll('[data-ship-part]')).toHaveLength(14);
  });

  it('keeps all base geometry and viewport fixed and outlines only the actual selected shapes',async()=>{
    await mount();const initial=lens().querySelector('[data-ship-base]').outerHTML;for(const system of SYSTEMS){await pick(system.id);expect(lens().querySelector('[data-ship-base]').outerHTML).toBe(initial);const svg=lens().querySelector('svg'),focus=lens().querySelector('[data-ship-focus]');expect(svg.getAttribute('viewBox')).toBe('0 0 720 340');expect(svg.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');expect(svg.style.width).toBe('100%');expect(svg.style.height).toBe('auto');if(system.id==='hull')expect(focus.querySelector('path').getAttribute('d')).toBe(OUTER+' '+INNER);if(system.id==='structure'){expect([...focus.querySelectorAll('path')].map(node=>node.getAttribute('d'))).toEqual(FRAMES);expect([...focus.querySelectorAll('rect')].map(node=>['x','y','width','height'].map(attr=>Number(node.getAttribute(attr))))).toEqual([[264,144,14,124],[440,144,14,124]]);}if(system.id==='piping')expect([...focus.querySelectorAll('path')].map(node=>node.getAttribute('d'))).toEqual(PIPES);}
  });

  it('keeps inspection local and writes no saved route, roadmap decision, pay prediction or other-module state',async()=>{
    const state={me_road_path:'emcc_boatyard',car2_road:{d1:'pipeline',d2:'shop'},car2_pred:{a:2,b:1},pipe2_stack:['root','hot'],sh_audit:{lev:'yes'}};const app=await mount(state),saved=JSON.stringify(app.latest());for(const system of SYSTEMS)await pick(system.id);expect(JSON.stringify(app.latest())).toBe(saved);expect(app.latest()).toMatchObject(state);expect(app.writes).toHaveLength(0);expect(host.querySelector('[data-maine-timeline]')).toBeNull();
  });

  it('preserves staged route decisions, unavailable future pay and exact modeled year readings after ship inspection',async()=>{
    const app=await mount({me_road_path:'emcc_boatyard'});await pick('structure');await pick('piping');expect(app.latest().car2_road).toBeUndefined();expect(app.writes).toHaveLength(0);await click(button('🗺 Roadmap + decisions'));expect(lens()).toBeNull();assertTimeline(core().car2RoadTotals('emcc',null,null));await click(host.querySelector('[data-maine-year-node="7"]'));expect(host.querySelector('[data-maine-year-detail]').dataset.maineYearDetail).toBe('0');await decision(1,'Stay on this track');assertTimeline(core().car2RoadTotals('emcc','stay',null));await decision(2,'Take CWI prep');const expected=core().car2RoadTotals('emcc','stay','cwi');assertTimeline(expected);expect(app.latest().car2_road).toEqual({d1:'stay',d2:'cwi'});await click(host.querySelector('[data-maine-year-node="4"]'));const detail=host.querySelector('[data-maine-year-detail]');expect(Number(detail.dataset.yearPay)).toBe(expected.years[4]);expect(Number(detail.dataset.runningPay)).toBe(expected.running[4]);await click(button('🦞 Browse topics'));expect(lens().dataset.shipSystems).toBe('piping');expect(app.latest().car2_road).toEqual({d1:'stay',d2:'cwi'});
  });

  it('keeps the reference qualitative, independently sourced and free of fabricated operating or material-location controls',()=>{
    const section=lens(render());expect(section.querySelector('[data-ship-scope]').textContent).toBe('Generic ship cutaway. Colors identify systems; arrangement and material selection vary with the ship design. The complete lesson note below adds the wider material and NAVSEA context.');expect(section.querySelector('input,select,canvas,animate,animateMotion,animateTransform,marker,filter')).toBeNull();expect(section.querySelectorAll('button')).toHaveLength(3);expect(section.querySelector('svg [marker-end],svg [marker-start]')).toBeNull();expect(section.querySelector('svg').getAttribute('aria-label')).toContain('The arrangement is conceptual.');expect(section.querySelector('[data-ship-system="hull"]').dataset.material).toBeUndefined();expect([...section.querySelectorAll('[data-ship-source]')].map(node=>new URL(node.href).hostname)).toEqual(['www.gdbiw.com','www.gdbiw.com','www.history.navy.mil']);
  });

  it('appears only on the BIW browse lesson and ignores untrusted pseudo-focus values',()=>{
    for(const me_sect of ['overview','shipyards','training','employers','unions','startup'])expect(lens(render({me_sect}))).toBeNull();expect(lens(render({me_mode:'roadmap'}))).toBeNull();for(const view of ['safetyHealth','pipeWelding','robotic','careers'])expect(lens(render({view}))).toBeNull();expect(lens(render({me10_focus:'piping',me10_system:{bad:1}})).dataset.shipSystems).toBe('hull');
  });

  it.each([false,true])('provides native44px keyboard controls, early full-size readings and explicit focus/contrast with no geometry motion, contrast=%s',async contrast=>{
    await mount({},contrast);const section=lens(),edge=contrast?'#ffff00':'#075985';expect(section.style.color).toBe(contrast?'rgb(255, 255, 255)':'rgb(15, 23, 42)');expect(section.style.background).toBe(contrast?'rgb(0, 0, 0)':'rgb(240, 249, 255)');for(const node of section.querySelectorAll('button,a')){expect(node.style.minHeight).toBe('44px');expect(node.tabIndex).toBe(0);node.focus();expect(document.activeElement).toBe(node);}for(const node of section.querySelectorAll('button')){expect(node.type).toBe('button');expect(node.getAttribute('aria-controls')).toBe('me10-ship-reading');}for(const node of section.querySelectorAll('a')){expect(node.target).toBe('_blank');expect(node.rel).toBe('noopener noreferrer');}const reading=section.querySelector('[data-ship-reading]');expect(reading.getAttribute('aria-live')).toBe('polite');expect(reading.getAttribute('aria-atomic')).toBe('true');expect(reading.querySelector('[data-ship-relationship]').className).toContain('text-base');expect(section.querySelector('style').textContent).toContain('outline:3px solid '+edge+'!important');expect(section.querySelector('style').textContent).toContain('transition:none!important;animation:none!important');
  });

  it('restores the entire original Maine function exactly after removing only the local state, helper and rendering call',()=>{
    const source=readFileSync(SRC,'utf8').replace(/\r\n/g,'\n');let maine=source.slice(source.indexOf('function MaineEcosystem('),source.indexOf('function SafetyHealthDeepDive('));const helperAt=maine.indexOf('        function renderShipSystems() {'),contentAt=maine.indexOf('        var content;',helperAt);expect(helperAt).toBeGreaterThan(0);expect(contentAt).toBeGreaterThan(helperAt);maine=maine.slice(0,helperAt)+maine.slice(contentAt);maine=maine.replace("        var shipSystemState = useState('hull');\n",'').replace('            renderShipSystems(),\n','');expect(createHash('sha256').update(maine).digest('hex')).toBe('4c36bf6079d7fae850d9caa3aa59ed7c37874f57e413f686c65dc464ede3b0b3');
  });
});
