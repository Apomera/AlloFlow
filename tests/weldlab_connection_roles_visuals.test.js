import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const SRC=process.env.WELDLAB_SRC||'stem_lab/stem_tool_weldlab.js';
const require=createRequire(resolve('desktop/web-app/package.json'));
const BASE={view:'safetyHealth',sh_sect:'electrical'};
const ROLES=[
{id:'electrode',mark:'1',title:'Electrode lead',context:'secondary',text:'The electrode lead connects a welding output to the electrode holder or torch.'},
{id:'workpiece',mark:'2',title:'Workpiece',context:'secondary',text:'The workpiece is the metal being welded. The electrode/arc region and the work connection are shown beside this metal.'},
{id:'return',mark:'3',title:'Work (return) lead',context:'secondary',text:'The work lead connects the work terminal on the power source to the workpiece. It is a welding-current connection; calling it a ground lead can obscure the distinction from equipment grounding.'},
{id:'frame',mark:'P',title:'Equipment frame grounding',context:'installation',text:'Equipment grounding concerns the machine frame or case. It has a different protective role from the work lead. The installation beyond the boundary is intentionally not specified here.'}
];
const PATHS=[
{id:'electrode',from:'output-1',to:'holder',context:'secondary',d:'M238 138 H312 Q340 138 354 159 L412 196'},
{id:'return',from:'output-2',to:'work-connection',context:'secondary',d:'M238 242 H290 Q310 242 325 278 Q350 310 400 310 H592 V275'},
{id:'frame',from:'frame',to:'installation-boundary',context:'installation',d:'M78 108 H32 V44 H60'}
];
const AUDIT=['lev','stainless_ev','papr','screens','helmet','safety_glasses','hp_available','hp_required','hp_double','cables_inspected','dry_gloves','work_clamp','fire_ext','hot_work_watch','cylinder_secured','positioner','mat','breaks'];
const CORRECTION='The work (return) lead is part of the welding circuit; equipment frame grounding has a different protective role. These terms are not interchangeable. The actual grounding arrangements depend on the equipment and installation requirements.';
const UNCHANGED=[
'Welding machines have 60-100V at the electrode when not arcing. Enough to shock you, especially if you\'re sweaty or standing on wet ground. Worse with AC than DC.',
'Welding outside in rain, on damp concrete, in tanks with residual moisture = significantly higher shock risk. Use rubber-soled boots, dry gloves, insulating mats.',
'Worn welding leads exposing copper, damaged work clamps, cracked electrode holders = direct contact path. Inspect every shift. Replace cables when insulation cracks (don\'t patch).',
'NEVER strike an arc on a compressed gas cylinder (even empty). Even a brief arc strike can cause failure under pressure.',
'Tanks, ship hulls, boilers, storage vessels — enclosed spaces not designed for human occupancy with limited entry/exit.',
'Permit-required confined space. Atmosphere testing (O2, LEL, toxics) before + during entry. Continuous ventilation. Rescue plan + standby attendant.',
'Shielding gases (argon, CO2) DISPLACE oxygen — silent killer. Heavier-than-air gases pool in low spots. Fume + ozone accumulate fast. Sparks can ignite trapped vapors.',
'(1) Confined space permit, (2) atmospheric testing, (3) forced ventilation, (4) standby attendant outside with rescue equipment, (5) communication (radio or signal rope), (6) NEVER alone, (7) machine ON/OFF accessible from outside.',
'Most confined-space fatalities happen to the would-be rescuer who entered without PPE. If something goes wrong, signal — don\'t enter.'
];
let root,host;
const lens=(node=host)=>node.querySelector('[data-connection-roles]');
const pick=id=>lens().querySelector('[data-connection-pick="'+id+'"]');
const button=text=>[...host.querySelectorAll('button')].find(node=>node.textContent.trim()===text);
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;delete window.__alloflowWeldLab;localStorage.clear();resetStemLab();loadTool(SRC,'weldLab');});
afterEach(async()=>{if(root)await React.act(()=>root.unmount());root=null;host?.remove();});
function render(extra={},contrast=false){const node=document.createElement('div');node.innerHTML=renderTool('weldLab',{weldLab:{...BASE,...extra}},{isContrast:contrast});return node;}
async function mount(extra={},contrast=false){let latest;const writes=[];function App(){const[data,setData]=React.useState({weldLab:{...BASE,...extra}});latest=data.weldLab;return window.StemLab._registry.weldLab.render(makeCtx({isContrast:contrast,toolData:data,setToolData:setData,update:(tool,key,value)=>{writes.push([key,value]);setData(prev=>({...prev,[tool]:{...prev[tool],[key]:value}}));}}));}host=document.createElement('div');document.body.append(host);root=ReactDOMClient.createRoot(host);await React.act(()=>root.render(React.createElement(App)));return{latest:()=>latest,writes};}
async function click(node){expect(node).toBeTruthy();await React.act(()=>node.click());}

describe('Conceptual welding connection roles',()=>{
  it('locates two secondary leads and a distinct frame connection using exact fixed graph endpoints',()=>{
    const section=lens(render()),svg=section.querySelector('svg');expect(svg.getAttribute('viewBox')).toBe('0 0 720 340');expect(svg.style.width).toBe('100%');expect(svg.style.height).toBe('auto');
    expect([...section.querySelectorAll('[data-connection-path]')].map(node=>({id:node.dataset.connectionPath,from:node.dataset.from,to:node.dataset.to,context:node.dataset.context,d:node.getAttribute('d')}))).toEqual(PATHS);
    const terminal=id=>section.querySelector('[data-connection-terminal="'+id+'"]');expect(['cx','cy'].map(a=>Number(terminal('output-1').getAttribute(a)))).toEqual([238,138]);expect(['cx','cy'].map(a=>Number(terminal('output-2').getAttribute(a)))).toEqual([238,242]);
    const piece=section.querySelector('[data-connection-object="workpiece"]');expect(['x','y','width','height'].map(a=>Number(piece.getAttribute(a)))).toEqual([430,250,240,25]);expect(section.querySelector('[data-connection-object="holder"]').getAttribute('d')).toBe('M412 196 L438 210');expect(section.querySelector('[data-connection-object="electrode"]').getAttribute('d')).toBe('M438 210 L450 220');
    expect(section.querySelector('[data-connection-object="work-connection"]').getAttribute('d')).toBe('M584 260 H600 V275 H584 Z');expect(section.querySelector('[data-connection-path="frame"]').getAttribute('stroke-dasharray')).toBe('7 4');
  });

  it('maps all four manual choices to full HTML definitions, correct role labels and context emphasis',async()=>{
    await mount();expect(lens().dataset.connectionRoles).toBe('return');for(const role of ROLES){await click(pick(role.id));const reading=lens().querySelector('[data-connection-reading]');expect(lens().dataset.connectionRoles).toBe(role.id);expect(reading.dataset).toMatchObject({connectionReading:role.id,context:role.context});expect(reading.querySelector('h5').textContent).toBe(role.mark+' · '+role.title);expect(reading.querySelector('[data-connection-role-detail]').textContent).toBe(role.text);expect(lens().querySelector('[data-connection-focus]').dataset).toMatchObject({connectionFocus:role.id,context:role.context});expect(pick(role.id).getAttribute('aria-pressed')).toBe('true');expect(lens().querySelectorAll('[data-connection-pick][aria-pressed="true"]')).toHaveLength(1);expect(lens().querySelector('figure').nextElementSibling).toBe(reading);}
  });

  it('keeps the complete base geometry, output terminals and installation boundary immutable through focus',async()=>{
    await mount();const before=lens().querySelector('[data-connection-base]').outerHTML;for(const role of ROLES){await click(pick(role.id));expect(lens().querySelector('[data-connection-base]').outerHTML).toBe(before);expect(lens().querySelector('svg').getAttribute('viewBox')).toBe('0 0 720 340');}const boundary=lens().querySelector('[data-connection-object="installation-boundary"]');expect(['x','y','width','height'].map(a=>Number(boundary.getAttribute(a)))).toEqual([60,18,150,50]);expect(boundary.getAttribute('stroke-dasharray')).toBe('6 4');
  });

  it('keeps inspection local without changing saved topic, gas, noise, hierarchy, audit or other-module state',async()=>{
    const state={sh_audit:{lev:'yes',work_clamp:'no'},sh_shop_station:'electrical',safe2_noise:[{db:85,h:6}],safe2_hoc:{c1:2},safe2_gas:'helium',safe2_level:'top',pipe2_stack:['root','hot']};const app=await mount(state),saved=JSON.stringify(app.latest());for(const role of ROLES)await click(pick(role.id));expect(JSON.stringify(app.latest())).toBe(saved);expect(app.latest()).toMatchObject(state);expect(app.writes).toHaveLength(0);expect(lens().dataset.connectionRoles).toBe('frame');
  });

  it('preserves unanswered-audit gating and N/A-excluded scoring after inspecting every role',async()=>{
    const answers=Object.fromEntries(AUDIT.slice(0,-1).map(id=>[id,id==='work_clamp'?'no':id==='papr'?'na':'yes']));const app=await mount({sh_audit:answers});for(const role of ROLES)await click(pick(role.id));expect(app.latest().sh_audit).toEqual(answers);expect(app.writes).toHaveLength(0);await click(button('🛡 How safe is your shop?'));expect(lens()).toBeNull();expect(host.textContent).not.toContain('📊 Your shop score:');const unchecked=host.querySelector('[data-shop-checklist-item="breaks"]');expect(unchecked.textContent).not.toContain('Fix:');await click(host.querySelector('[data-audit-answer="breaks:yes"]'));expect(app.latest().sh_audit).toEqual({...answers,breaks:'yes'});expect(host.textContent).toContain('📊 Your shop score: 94%');expect(host.querySelector('[data-shop-checklist-item="work_clamp"]').textContent).toContain('Fix: clamp the work lead firmly to the part being welded, close to the weld (OSHA 1910.254(d)(2)).');
  });

  it('preserves the four other electrical notes and confined-space prose while using the narrow versioned distinction',()=>{
    const node=render();UNCHANGED.forEach(text=>expect(node.textContent).toContain(text));expect(node.textContent).toContain('Work lead and equipment grounding');expect(node.textContent).toContain(CORRECTION);expect(node.textContent).not.toContain('Grounding loops');expect(node.textContent).not.toContain('If multiple welding machines share grounds');
    const sources=[...lens(node).querySelectorAll('[data-connection-source]')];expect(sources.map(a=>a.href)).toEqual(['https://www.millerwelds.com/resources/knowledge-hub/industrial-welding/safety-and-scheduled-maintenance-protect-your-welding-assets','https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.254','https://ch-delivery.lincolnelectric.com/api/public/content/67976de0f59f4f13a6151fcfadab5498?v=ff883f9c']);sources.forEach(a=>{expect(a.target).toBe('_blank');expect(a.rel).toBe('noopener noreferrer');expect(a.style.minHeight).toBe('44px');});
  });

  it('states incomplete installation and illustration-color scope without claiming isolation or a modeled electrical state',()=>{
    const section=lens(render()),scope=section.querySelector('[data-connection-scope]').textContent;expect(scope).toBe('Geometry and colors distinguish reference parts; they do not specify conductor identification colors or a wiring method. No polarity, voltage, current, energized state or fault response is represented. This incomplete diagram does not establish a safe installation.');expect(section.textContent).toContain('This reference does not specify a grounding arrangement.');expect(section.querySelector('figcaption').textContent).toContain('The dashed circle only locates the electrode/arc region.');expect(section.querySelector('input,select,canvas,animate,animateMotion,animateTransform,marker,filter')).toBeNull();expect(section.querySelectorAll('button')).toHaveLength(4);expect(section.querySelectorAll('svg [marker-end],svg [marker-start]')).toHaveLength(0);expect(section.querySelectorAll('[data-connection-base] circle')).toHaveLength(7);expect(section.textContent).not.toMatch(/zero.current|never carries|no current|safe to touch/i);expect(section.querySelector('svg').getAttribute('aria-label')).toContain('Installation and electrical state are not specified.');
  });

  it('appears only in the electrical browse topic and ignores pseudo saved focus',()=>{
    for(const sh_sect of ['overview','fume','eyes','noise','burns','ergonomics','controls','mental'])expect(lens(render({sh_sect}))).toBeNull();for(const view of ['processCompare','pipeWelding','qualPrep','robotic','math'])expect(lens(render({view}))).toBeNull();expect(lens(render({sh_mode:'audit'}))).toBeNull();expect(lens(render({safe7_focus:'frame',safe7_part:'electrode'})).dataset.connectionRoles).toBe('return');
  });

  it.each([false,true])('has native44px keyboard targets, early full-size reading and explicit contrast/focus without geometry animation, contrast=%s',async contrast=>{
    await mount({},contrast);const section=lens(),edge=contrast?'#ffff00':'#075985';expect(section.style.color).toBe(contrast?'rgb(255, 255, 255)':'rgb(15, 23, 42)');expect(section.style.background).toBe(contrast?'rgb(0, 0, 0)':'rgb(240, 249, 255)');for(const node of section.querySelectorAll('button,a')){expect(node.style.minHeight).toBe('44px');expect(node.tabIndex).toBe(0);node.focus();expect(document.activeElement).toBe(node);}for(const node of section.querySelectorAll('button')){expect(node.type).toBe('button');expect(node.getAttribute('aria-controls')).toBe('safe7-reading');}const reading=section.querySelector('[data-connection-reading]');expect(reading.getAttribute('aria-live')).toBe('polite');expect(reading.getAttribute('aria-atomic')).toBe('true');expect(reading.querySelector('p').className).toContain('text-base');expect(section.querySelector('style').textContent).toContain('outline:3px solid '+edge+'!important');expect(section.querySelector('style').textContent).toContain('transition:none!important;animation:none!important');expect(section.querySelector('svg').style.background).toBe('rgb(15, 23, 42)');
  });

  it('restores the exact entire pre-enhancement SafetyHealth function after removing only the local inspector and approved row correction',()=>{
    const source=readFileSync(SRC,'utf8').replace(/\r\n/g,'\n');let safety=source.slice(source.indexOf('function SafetyHealthDeepDive('),source.indexOf('function MathBlueprintLab('));
    // Reverse only the later exchange-rate addition before this historical baseline.
    const exchangeAt=safety.indexOf('        function renderNoiseExchangeExplorer() {');
    if(exchangeAt>=0){const exchangeEnd=safety.indexOf('        function renderNoiseCalc() {',exchangeAt);expect(exchangeEnd).toBeGreaterThan(exchangeAt);safety=safety.slice(0,exchangeAt)+safety.slice(exchangeEnd);for(const line of ['        var noiseExchangeState = useState(0);\n','            renderNoiseExchangeExplorer(),\n']){expect(safety.split(line)).toHaveLength(2);safety=safety.replace(line,'');}}
// Reverse only the later wavelength addition before this historical connection-role baseline.
    const wavelengthAt=safety.indexOf('        function renderWavelengthCompare() {');
    if(wavelengthAt>=0){
      const wavelengthEnd=safety.indexOf('        var content;',wavelengthAt);expect(wavelengthEnd).toBeGreaterThan(wavelengthAt);safety=safety.slice(0,wavelengthAt)+safety.slice(wavelengthEnd);
      for(const line of ['        var wavelengthProbeState = useState({ a: 300, b: 600 });\n','            renderWavelengthCompare(),\n']){expect(safety.split(line)).toHaveLength(2);safety=safety.replace(line,'');}
      const newKey='stem.weldlab.safe8_radiation_intro_r2',oldKey='stem.weldlab.welding_produces_uv_260_400_nm_visible';expect(safety.split(newKey)).toHaveLength(2);safety=safety.replace(newKey,oldKey);
      const newSentence='The illustrated 200–1400 nm window shows a UV portion (200–400 nm), visible light (400–700 nm), and a near-IR portion (700–1400 nm).',oldSentence='Welding produces UV (260-400 nm) + visible (400-700 nm) + IR (700-2500 nm).';expect(safety.split(newSentence)).toHaveLength(2);safety=safety.replace(newSentence,oldSentence);
    }
    const helperAt=safety.indexOf('        function renderConnectionRoles() {'),contentAt=safety.indexOf('        var content;',helperAt);expect(helperAt).toBeGreaterThan(0);expect(contentAt).toBeGreaterThan(helperAt);safety=safety.slice(0,helperAt)+safety.slice(contentAt);safety=safety.replace("        var connectionFocusState = useState('return');\n",'').replace('            renderConnectionRoles(),\n','');
    const corrected="               { haz: __alloT('stem.weldlab.safe7_hazard_title_r2', 'Work lead and equipment grounding'), detail: __alloT('stem.weldlab.safe7_hazard_detail_r2', '"+CORRECTION+"') },";
    const original="               { haz: 'Grounding loops', detail: __alloT('stem.weldlab.if_multiple_welding_machines_share_gro', 'If multiple welding machines share grounds + work clamps are crossed, current can flow through your body. Always work-clamp directly to the workpiece, not through ladders or staging.') },";expect(safety).toContain(corrected);safety=safety.replace(corrected,original);expect(createHash('sha256').update(safety).digest('hex')).toBe('8c9737d1d9537a745f81adae3cec07586001a85c2866d09160c6360dd07575d4');
  });
});
