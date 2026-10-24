import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const SRC=process.env.WELDLAB_SRC||'stem_lab/stem_tool_weldlab.js';
const require=createRequire(resolve('desktop/web-app/package.json'));
const {Simulate}=require('react-dom/test-utils');
const BASE={view:'safetyHealth',sh_sect:'eyes'};
const ORIGINAL_SENTENCE='Welding produces UV (260-400 nm) + visible (400-700 nm) + IR (700-2500 nm).';
const NEW_SENTENCE='The illustrated 200–1400 nm window shows a UV portion (200–400 nm), visible light (400–700 nm), and a near-IR portion (700–1400 nm).';
const HEALTH=' All three damage eyes. Damage from UV is the most common — arc flash (photokeratitis) feels like sand in your eyes 6-12 hours later. Repeated exposure → cataracts + retinal damage.';
const AUDIT=['lev','stainless_ev','papr','screens','helmet','safety_glasses','hp_available','hp_required','hp_double','cables_inspected','dry_gloves','work_clamp','fire_ext','hot_work_watch','cylinder_secured','positioner','mat','breaks'];
const X=value=>64+(value-200)*592/1200;
let root,host;
const lens=(node=host)=>node.querySelector('[data-wavelength-compare]');
const marker=id=>lens().querySelector('[data-wavelength-marker="'+id+'"]');
const reading=id=>lens().querySelector('[data-wavelength-reading="'+id+'"]');
const textButton=text=>[...host.querySelectorAll('button')].find(node=>node.textContent.trim()===text);
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;delete window.__alloflowWeldLab;localStorage.clear();resetStemLab();loadTool(SRC,'weldLab');});
afterEach(async()=>{if(root)await React.act(()=>root.unmount());root=null;host?.remove();});
function render(extra={},contrast=false){const node=document.createElement('div');node.innerHTML=renderTool('weldLab',{weldLab:{...BASE,...extra}},{isContrast:contrast});return node;}
async function mount(extra={},contrast=false){let latest;const writes=[];function App(){const[data,setData]=React.useState({weldLab:{...BASE,...extra}});latest=data.weldLab;return window.StemLab._registry.weldLab.render(makeCtx({isContrast:contrast,toolData:data,setToolData:setData,update:(tool,key,value)=>{writes.push([key,value]);setData(prev=>({...prev,[tool]:{...prev[tool],[key]:value}}));}}));}host=document.createElement('div');document.body.append(host);root=ReactDOMClient.createRoot(host);await React.act(()=>root.render(React.createElement(App)));return{latest:()=>latest,writes};}
async function click(node){expect(node).toBeTruthy();await React.act(()=>node.click());}
async function probe(id,value,range=false){const node=lens().querySelector('[data-wavelength-'+(range?'range':'probe')+'="'+id+'"]');expect(node).toBeTruthy();await React.act(()=>Simulate.change(node,{target:{value:String(value)}}));}
function checkMarker(id,value,band){const group=marker(id),circle=group.querySelector('circle'),line=group.querySelector('line');expect(group.dataset).toMatchObject({value:String(value),band});expect(Number(circle.getAttribute('cx'))).toBeCloseTo(X(value),10);expect(Number(circle.getAttribute('cy'))).toBe(id==='a'?42:172);expect(Number(circle.getAttribute('r'))).toBe(12);expect(Number(line.getAttribute('x1'))).toBeCloseTo(X(value),10);expect(Number(line.getAttribute('x2'))).toBeCloseTo(X(value),10);expect(reading(id).dataset).toMatchObject({value:String(value),band});expect(reading(id).querySelector('h5').textContent).toBe(id.toUpperCase()+' · '+value+' nm');}

describe('Welding wavelength comparison window',()=>{
  it('changes only the authorized introductory numeric sentence and preserves all following health prose',()=>{
    const node=render(),section=lens(node);expect(section.previousElementSibling.textContent).toBe(NEW_SENTENCE+HEALTH);expect(node.textContent).not.toContain(ORIGINAL_SENTENCE);expect(section.nextElementSibling.textContent).toBe('Welding helmet shade selection');expect(section.textContent).toContain('illustrated 200–1400 nm window');
  });

  it('draws actual200/400/700/1400band positions and widths on one fixed linear scale',()=>{
    const section=lens(render()),plot=section.querySelector('svg');expect(plot.getAttribute('viewBox')).toBe('0 0 720 260');expect(plot.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');const rects=[...plot.querySelectorAll('[data-wavelength-band]')];expect(rects.map(n=>n.dataset.wavelengthBand)).toEqual(['uv','visible','ir']);for(const [i,[low,high]]of [[200,400],[400,700],[700,1400]].entries()){expect(rects[i].dataset).toMatchObject({low:String(low),high:String(high)});expect(Number(rects[i].getAttribute('x'))).toBeCloseTo(X(low),10);expect(Number(rects[i].getAttribute('width'))).toBeCloseTo(X(high)-X(low),10);expect(Number(rects[i].getAttribute('y'))).toBe(82);expect(Number(rects[i].getAttribute('height'))).toBe(50);}expect(rects.reduce((sum,n)=>sum+Number(n.getAttribute('width')),0)).toBeCloseTo(592,10);expect(Number(rects[2].getAttribute('width'))/Number(rects[0].getAttribute('width'))).toBeCloseTo(3.5,10);
    expect([...plot.querySelectorAll('[data-wavelength-tick]')].map(n=>Number(n.dataset.wavelengthTick))).toEqual([200,400,700,1000,1400]);for(const tick of plot.querySelectorAll('[data-wavelength-tick]'))expect(Number(tick.querySelector('text').getAttribute('x'))).toBeCloseTo(X(Number(tick.dataset.wavelengthTick)),10);expect(section.querySelector('[data-wavelength-legend]').textContent).toBe('UV portion · 200–400 nmVisible light · 400–700 nmNear-IR portion · 700–1400 nm');
  });

  it('positions each real marker at endpoints, interiors and both boundaries without changing any band or tick geometry',async()=>{
    await mount();const base=lens().querySelector('[data-wavelength-base]').outerHTML;for(const[value,band]of [[200,'uv'],[399,'uv'],[400,'boundary400'],[401,'visible'],[699,'visible'],[700,'boundary700'],[701,'ir'],[1400,'ir']]){await probe('a',value);await probe('b',value,true);checkMarker('a',value,band);checkMarker('b',value,band);expect(lens().querySelector('[data-wavelength-base]').outerHTML).toBe(base);expect(lens().querySelector('svg').getAttribute('viewBox')).toBe('0 0 720 260');}
  });

  it('explicitly names400nm and700nm boundaries instead of assigning either to a unique band',async()=>{
    await mount();await probe('a',400);await probe('b',700);expect(reading('a').querySelector('p').textContent).toBe('UV / visible boundary');expect(reading('b').querySelector('p').textContent).toBe('Visible / near-IR boundary');expect(lens().querySelector('svg').getAttribute('aria-label')).toContain('A: 400 nm, UV / visible boundary. B: 700 nm, Visible / near-IR boundary.');await click(lens().querySelector('[data-wavelength-swap]'));expect(reading('a').querySelector('p').textContent).toBe('Visible / near-IR boundary');expect(reading('b').querySelector('p').textContent).toBe('UV / visible boundary');
  });

  it('keeps absolute separation and exact reduced B:A ratios correct across order, fractions and equality',async()=>{
    await mount();for(const[a,b,n,d]of [[300,600,2,1],[600,300,1,2],[400,700,7,4],[700,400,4,7],[200,1400,7,1],[1400,200,1,7],[399,701,701,399],[555,1110,2,1],[400,400,1,1]]){await probe('a',a);await probe('b',b);const diff=lens().querySelector('[data-wavelength-difference]'),ratio=lens().querySelector('[data-wavelength-ratio]'),span=lens().querySelector('[data-wavelength-span]');expect(Number(diff.dataset.wavelengthDifference)).toBe(Math.abs(b-a));expect(diff.textContent).toContain('|B − A| = |'+b+' − '+a+'| = '+Math.abs(b-a)+' nm');expect(ratio.dataset).toMatchObject({numerator:String(n),denominator:String(d)});expect(ratio.textContent).toContain(b+' : '+a+' = '+n+' : '+d);expect(Number(span.getAttribute('x1'))).toBeCloseTo(X(Math.min(a,b)),10);expect(Number(span.getAttribute('x2'))).toBeCloseTo(X(Math.max(a,b)),10);expect(Number(span.getAttribute('x2'))-Number(span.getAttribute('x1'))).toBeCloseTo(Math.abs(b-a)*592/1200,10);}
  });

  it('allows swap and equal-probe manipulation without hiding coincident markers or inventing a minimum span',async()=>{
    await mount();await probe('a',200);await probe('b',1400);await click(lens().querySelector('[data-wavelength-swap]'));checkMarker('a',1400,'ir');checkMarker('b',200,'uv');expect(lens().querySelector('[data-wavelength-difference]').dataset.wavelengthDifference).toBe('1200');await click(lens().querySelector('[data-wavelength-equal]'));checkMarker('a',1400,'ir');checkMarker('b',1400,'ir');const span=lens().querySelector('[data-wavelength-span]');expect(span.getAttribute('x1')).toBe(span.getAttribute('x2'));expect(lens().querySelectorAll('[data-wavelength-marker]')).toHaveLength(2);expect(marker('a').querySelector('circle').getAttribute('cy')).not.toBe(marker('b').querySelector('circle').getAttribute('cy'));expect(lens().querySelector('[data-wavelength-ratio]').dataset).toMatchObject({numerator:'1',denominator:'1'});
  });

  it('rounds finite inputs to integernm, clamps to the displayed window and ignores empty/nonfinite changes',async()=>{
    await mount();await probe('a',199);checkMarker('a',200,'uv');await probe('b',1401,true);checkMarker('b',1400,'ir');await probe('a',400.4);checkMarker('a',400,'boundary400');await probe('a',400.6);checkMarker('a',401,'visible');for(const bad of ['', 'NaN','Infinity','__proto__']){await probe('a',bad);checkMarker('a',401,'visible');}expect(lens().outerHTML).not.toContain('NaN');
  });

  it('keeps probes local without saved writes to safety answers, noise, gas, hierarchy, shade or other modules',async()=>{
    const saved={sh_audit:{lev:'yes',work_clamp:'no'},sh_shop_station:'electrical',safe2_noise:[{db:85,h:6}],safe2_hoc:{c1:2},safe2_gas:'helium',safe2_level:'top',ps_view:'gear',pipe2_stack:['root','hot']};const app=await mount(saved),before=JSON.stringify(app.latest());await probe('a',400);await probe('b',700,true);await click(lens().querySelector('[data-wavelength-swap]'));await click(lens().querySelector('[data-wavelength-equal]'));expect(JSON.stringify(app.latest())).toBe(before);expect(app.writes).toHaveLength(0);expect(app.latest()).toMatchObject(saved);
  });

  it('preserves the current shade table and original navigation without using wavelength to choose a shade',async()=>{
    const app=await mount({ps_view:'gear'}),table=host.querySelector('table'),before=table.outerHTML;expect(table.textContent).toContain('Minimum shade = OSHA 29 CFR 1910.133(a)(5).');expect(table.textContent).toContain('MIG / flux-core (GMAW, FCAW)');expect(table.textContent).toContain('> 160–250 A1012');await probe('a',200);await probe('b',1400);expect(host.querySelector('table').outerHTML).toBe(before);expect(app.latest().ps_view).toBe('gear');expect(app.writes).toHaveLength(0);await click(textButton('Find your shade: PPE Lens Shade tab →'));expect(app.latest()).toMatchObject({view:'ppeSafety',ps_view:'shade'});expect(lens()).toBeNull();
  });

  it('preserves unanswered audit gates, answer-dependent fixes and N/A-excluded scoring after probe manipulation',async()=>{
    const answers=Object.fromEntries(AUDIT.slice(0,-1).map(id=>[id,id==='work_clamp'?'no':id==='papr'?'na':'yes']));const app=await mount({sh_audit:answers});await probe('a',700);await probe('b',700);expect(app.latest().sh_audit).toEqual(answers);expect(app.writes).toHaveLength(0);await click(textButton('🛡 How safe is your shop?'));expect(lens()).toBeNull();expect(host.textContent).not.toContain('📊 Your shop score:');expect(host.querySelector('[data-shop-checklist-item="breaks"]').textContent).not.toContain('Fix:');await click(host.querySelector('[data-audit-answer="breaks:yes"]'));expect(app.latest().sh_audit).toEqual({...answers,breaks:'yes'});expect(host.textContent).toContain('📊 Your shop score: 94%');expect(host.querySelector('[data-shop-checklist-item="work_clamp"]').textContent).toContain('Fix:');
  });

  it('exposes only wavelength arithmetic within the chosen window and links the primary band reference',()=>{
    const section=lens(render());expect(section.querySelector('[data-wavelength-scope]').textContent).toBe('The display is a selected window of the spectrum. Colors distinguish the bands; the probes compare wavelength only.');expect(section.querySelectorAll('input[type="number"]')).toHaveLength(2);expect(section.querySelectorAll('input[type="range"]')).toHaveLength(2);expect(section.querySelectorAll('button')).toHaveLength(2);expect(section.querySelector('select,canvas,animate,animateMotion,animateTransform,marker,filter,linearGradient')).toBeNull();expect(section.querySelector('[data-energy],[data-intensity],[data-exposure],[data-shade],[data-injury]')).toBeNull();const source=section.querySelector('[data-wavelength-source]');expect(source.href).toBe('https://www.ccohs.ca/oshanswers/safety_haz/welding/eyes.html');expect(source.target).toBe('_blank');expect(source.rel).toBe('noopener noreferrer');
  });

  it('appears only in the eyes browse topic and ignores pseudo saved wavelength settings',()=>{
    for(const sh_sect of ['overview','fume','noise','burns','ergonomics','electrical','controls','mental'])expect(lens(render({sh_sect}))).toBeNull();expect(lens(render({sh_mode:'audit'}))).toBeNull();const section=lens(render({safe8_a:1400,safe8_b:200,safe8_probes:{a:700,b:400}}));expect(section.querySelector('[data-wavelength-probe="a"]').value).toBe('300');expect(section.querySelector('[data-wavelength-probe="b"]').value).toBe('600');
  });

  it.each([false,true])('provides44px native numeric/range/button controls, readable HTML values and explicit focus/contrast without animated geometry, contrast=%s',async contrast=>{
    await mount({},contrast);const section=lens(),edge=contrast?'#ffff00':'#6b21a8';expect(section.style.color).toBe(contrast?'rgb(255, 255, 255)':'rgb(15, 23, 42)');expect(section.style.background).toBe(contrast?'rgb(0, 0, 0)':'rgb(250, 245, 255)');for(const node of section.querySelectorAll('input,button,a')){expect(node.style.minHeight).toBe('44px');expect(node.tabIndex).toBe(0);node.focus();expect(document.activeElement).toBe(node);}for(const node of section.querySelectorAll('input')){expect(node.min).toBe('200');expect(node.max).toBe('1400');expect(node.step).toBe('1');if(node.type==='number')expect(section.querySelector('label[for="'+node.id+'"]').textContent).toContain('wavelength (nm)');else expect(node.getAttribute('aria-label')).toContain('wavelength slider');}for(const node of section.querySelectorAll('button'))expect(node.type).toBe('button');for(const node of section.querySelectorAll('[data-wavelength-reading] p'))expect(node.className).toContain('text-base');expect(section.querySelector('[aria-live="polite"]').getAttribute('aria-atomic')).toBe('true');const css=section.querySelector('style').textContent;expect(css).toContain('outline:3px solid '+edge+'!important');expect(css).toContain('transition:none!important;animation:none!important');expect(section.querySelector('svg').style.width).toBe('100%');expect(section.querySelector('svg').style.height).toBe('auto');
  });

  it('restores the complete original SafetyHealth function after removing only the local explorer and the authorized numeric-sentence correction',()=>{
    const source=readFileSync(SRC,'utf8').replace(/\r\n/g,'\n');let safety=source.slice(source.indexOf('function SafetyHealthDeepDive('),source.indexOf('function MathBlueprintLab('));
    // Reverse only the later exchange-rate addition before this historical baseline.
    const exchangeAt=safety.indexOf('        function renderNoiseExchangeExplorer() {');
    if(exchangeAt>=0){const exchangeEnd=safety.indexOf('        function renderNoiseCalc() {',exchangeAt);expect(exchangeEnd).toBeGreaterThan(exchangeAt);safety=safety.slice(0,exchangeAt)+safety.slice(exchangeEnd);for(const line of ['        var noiseExchangeState = useState(0);\n','            renderNoiseExchangeExplorer(),\n']){expect(safety.split(line)).toHaveLength(2);safety=safety.replace(line,'');}}
const helperAt=safety.indexOf('        function renderWavelengthCompare() {'),contentAt=safety.indexOf('        var content;',helperAt);expect(helperAt).toBeGreaterThan(0);expect(contentAt).toBeGreaterThan(helperAt);safety=safety.slice(0,helperAt)+safety.slice(contentAt);safety=safety.replace('        var wavelengthProbeState = useState({ a: 300, b: 600 });\n','').replace('            renderWavelengthCompare(),\n','');const corrected="__alloT('stem.weldlab.safe8_radiation_intro_r2', '"+NEW_SENTENCE+HEALTH+"')",original="__alloT('stem.weldlab.welding_produces_uv_260_400_nm_visible', '"+ORIGINAL_SENTENCE+HEALTH+"')";expect(safety).toContain(corrected);safety=safety.replace(corrected,original);expect(createHash('sha256').update(safety).digest('hex')).toBe('65a79c7202a9747581755d711b4a066086204eeaa4ad7519f749d37fbf11d81e');
  });
});
