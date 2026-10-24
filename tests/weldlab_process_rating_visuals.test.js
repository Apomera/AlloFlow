import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const SRC=process.env.WELDLAB_SRC||'stem_lab/stem_tool_weldlab.js';
const require=createRequire(resolve('desktop/web-app/package.json'));
const {Simulate}=require('react-dom/test-utils');
const BASE={view:'processCompare'};
const IDS=['mig','tig','stick','fcawg','fcaws','oxy','spot'];
const METRICS=['learn','speed','finish','outdoor','portable','afford','dirty'];
// Independent durable expectations for every authored classroom rating.
const VALUES={mig:[5,4,4,1,2,3,2],tig:[1,2,5,1,2,2,1],stick:[3,3,2,5,5,5,5],fcawg:[4,5,3,2,2,3,3],fcaws:[4,4,2,4,4,4,4],oxy:[3,1,2,3,4,3,2],spot:[4,5,4,1,1,1,1]};
const LABELS=['Easy to learn','Production speed','Clean finish and control','Works outdoors in wind','Easy to carry','Low equipment cost','Forgives rusty or dirty metal'];
let root,host;
const lens=(node=host)=>node.querySelector('[data-proc-rating-lens]');
const rows=(node=host)=>[...lens(node).querySelectorAll('[data-proc-rating-row]')];
const row=(id,node=host)=>lens(node).querySelector('[data-proc-rating-row="'+id+'"]');
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;delete window.__alloflowWeldLab;localStorage.clear();resetStemLab();loadTool(SRC,'weldLab');});
afterEach(async()=>{if(root)await React.act(()=>root.unmount());root=null;host?.remove();});
function render(extra={},contrast=false){const node=document.createElement('div');node.innerHTML=renderTool('weldLab',{weldLab:{...BASE,...extra}},{isContrast:contrast});return node;}
async function mount(extra={},contrast=false){let latest;const writes=[];function App(){const[data,setData]=React.useState({weldLab:{...BASE,...extra}});latest=data.weldLab;return window.StemLab._registry.weldLab.render(makeCtx({isContrast:contrast,toolData:data,setToolData:setData,update:(tool,key,value)=>{writes.push([key,value]);setData(prev=>({...prev,[tool]:{...prev[tool],[key]:value}}));}}));}host=document.createElement('div');document.body.append(host);root=ReactDOMClient.createRoot(host);await React.act(()=>root.render(React.createElement(App)));return{latest:()=>latest,writes};}
async function click(node){expect(node).toBeTruthy();await React.act(()=>node.click());}
async function metric(id){await click(lens().querySelector('[data-proc-rating-metric="'+id+'"]'));}
async function change(node,value){expect(node).toBeTruthy();await React.act(()=>Simulate.change(node,{target:{value:String(value)}}));}

describe('Process classroom-rating lens',()=>{
  it('retains the original legend, classroom caution, derived extremes and all49 original matrix values',()=>{
    const node=render(),section=lens(node),parent=section.parentElement;
    expect(parent.textContent).toContain('How to read it: every row is scored so that MORE dots is BETTER for the welder: easier to learn, faster, cleaner, more wind-proof, easier to carry, cheaper to set up, more forgiving of dirty metal. Solid dots are filled, dashed rings are empty. These are representative classroom ratings, not measurements.');
    expect(parent.textContent).toContain('Read from the table: lowest equipment cost Stick / SMAW; slowest Oxy-Fuel / OFW.');
    const matrix=section.querySelector('[data-proc-rating-reference] table');expect(matrix.querySelectorAll('tbody tr')).toHaveLength(7);
    [...matrix.querySelectorAll('tbody tr')].forEach((tr,m)=>{expect(tr.querySelector('th').textContent).toBe(LABELS[m]);expect([...tr.querySelectorAll('td [role="img"]')].map(node=>node.getAttribute('aria-label'))).toEqual(IDS.map(id=>VALUES[id][m]+' of 5'));});
    expect(section.querySelector('[data-proc-rating-reference] summary').textContent).toBe('Read the complete original ratings matrix');expect(section.dataset).toMatchObject({procRatingLens:'learn',process:'mig'});
  });

  it('renders each of the49 authored cells as exact dots and a full-sizeHTML reading',async()=>{
    await mount();
    for(const [m,key] of METRICS.entries()){
      await metric(key);expect(lens().dataset.procRatingLens).toBe(key);
      for(const id of IDS){const expected=VALUES[id][m],element=row(id);expect(element.dataset).toMatchObject({procRatingRow:id,metric:key,value:String(expected)});expect(element.querySelector('[data-proc-rating-value]').textContent).toBe(expected+' / 5');
        expect(element.querySelectorAll('[data-proc-rating-dot]')).toHaveLength(5);expect(element.querySelectorAll('[data-filled="true"]')).toHaveLength(expected);expect(element.querySelectorAll('[data-filled="false"]')).toHaveLength(5-expected);
        await click(element);const reading=lens().querySelector('[data-proc-rating-reading]');expect(reading.dataset).toMatchObject({procRatingReading:id,metric:key,value:String(expected)});expect(reading.textContent).toBe(element.querySelector('[data-proc-rating-name]').textContent+' · '+LABELS[m]+': '+expected+' out of 5 classroom dots.');
      }
    }
  });

  it('keeps process order, row insets and every circle coordinate fixed through metric and process selection',async()=>{
    await mount();for(const key of METRICS){await metric(key);expect(rows().map(node=>node.dataset.procRatingRow)).toEqual(IDS);for(const element of rows()){expect(element.style.borderWidth).toBe('2px');expect(element.style.padding).toBe('12px');const svg=element.querySelector('svg');expect(svg.getAttribute('viewBox')).toBe('0 0 250 44');expect(svg.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');expect([...svg.querySelectorAll('circle')].map(node=>['cx','cy','r'].map(attr=>Number(node.getAttribute(attr))))).toEqual([[25,22,12],[75,22,12],[125,22,12],[175,22,12],[225,22,12]]);}await click(row('oxy'));}
  });

  it('changes only local inspection state and leaves saved process, job, guide and other module data unchanged',async()=>{
    const state={proc2_sel:'tig',proc2_job:{mat:'stainless',thk:'sheet',loc:'shop',pos:'flat',vol:'one',look:'sanitary',surf:'clean',budget:'high',port:'cart'},proc2_guess:{g2:0},pipe2_stack:['root','hot']};const app=await mount(state),saved=JSON.stringify(app.latest());
    for(const key of METRICS)await metric(key);for(const id of IDS)await click(row(id));expect(JSON.stringify(app.latest())).toBe(saved);expect(app.writes).toHaveLength(0);expect(app.latest()).toMatchObject(state);
    expect(lens().dataset).toMatchObject({procRatingLens:'dirty',process:'spot'});
  });

  it('keeps cutaway comparison focus and both chosen processes independent from classroom inspection',async()=>{
    const app=await mount({proc2_sel:'tig'});await click(host.querySelector('[data-proc-compare-toggle]'));await change(host.querySelector('[data-proc-reference]'),'stick');await click(host.querySelector('[data-proc-focus="shield"]'));
    const saved=JSON.stringify(app.latest()),beforeWrites=app.writes.length;await metric('afford');await click(row('mig'));
    expect(host.querySelector('[data-proc-paired-explorer]').dataset.procPairedExplorer).toBe('shield');expect(host.querySelector('[data-proc-pair-card="primary"]').dataset.process).toBe('tig');expect(host.querySelector('[data-proc-pair-card="reference"]').dataset.process).toBe('stick');expect(JSON.stringify(app.latest())).toBe(saved);expect(app.writes).toHaveLength(beforeWrites);
  });

  it('preserves predict-first reveal, first-answer locks and decision-guide scoring through inspection',async()=>{
    const app=await mount({proc2_guess:{}});const guide=()=>host.querySelector('#proc2-guide-h').parentElement;const choices=()=>guide().querySelector('[role="radiogroup"][aria-label="Your process for job 1"]').querySelectorAll('button');
    expect(guide().textContent).toContain('First-try score: 0 of 0 answered');expect(guide().textContent).not.toContain('Check it in the Job Matcher →');await metric('outdoor');await click(row('stick'));expect(app.latest().proc2_guess).toEqual({});expect(guide().textContent).not.toContain('best fit is');
    await click(choices()[1]);expect(app.latest().proc2_guess).toEqual({g1:1});expect(guide().textContent).toContain('First-try score: 0 of 1 answered');expect(guide().textContent).toContain('Check it in the Job Matcher →');expect([...choices()].every(node=>node.getAttribute('aria-disabled')==='true')).toBe(true);
    await metric('learn');await click(row('mig'));await click(choices()[0]);expect(app.latest().proc2_guess).toEqual({g1:1});expect(guide().textContent).toContain('First-try score: 0 of 1 answered');
  });

  it('retains ordinal meaning and exposes no empirical scale, proportional bar or operating settings',()=>{
    const section=lens(render());expect(section.textContent).toContain('These classroom ratings are ordinal comparisons.');expect(section.textContent).toContain('does not measure a proportional change in speed, cost or performance');expect(section.querySelector('input,select,canvas,animate,animateTransform')).toBeNull();expect(section.querySelectorAll('[data-proc-rating-plot] rect')).toHaveLength(0);expect(section.querySelectorAll('[data-proc-rating-plot] text')).toHaveLength(0);expect(section.querySelectorAll('[data-proc-rating-value]')).toHaveLength(7);
  });

  it('limits the lens to Process Comparison and ignores untrusted pseudo inspection saves',()=>{
    for(const view of ['pipeWelding','qualPrep','robotic','consumables'])expect(lens(render({view}))).toBeNull();const section=lens(render({proc2_sel:{bad:1},proc2_job:[],proc2_guess:[8],proc7_metric:'speed',proc7_process:'oxy'}));expect(section.dataset).toMatchObject({procRatingLens:'learn',process:'mig'});expect(section.outerHTML).not.toContain('NaN');expect(section.outerHTML).not.toContain('[object Object]');
  });

  it.each([false,true])('provides native44px keyboard controls, visible focus and distinguishable dots in contrast=%s',async contrast=>{
    await mount({},contrast);const section=lens(),edge=contrast?'#ffff00':'#9a3412';expect(section.style.color).toBe(contrast?'rgb(255, 255, 255)':'rgb(15, 23, 42)');expect(section.style.background).toBe(contrast?'rgb(0, 0, 0)':'rgb(255, 247, 237)');
    expect(section.querySelectorAll('button')).toHaveLength(14);for(const button of section.querySelectorAll('button')){expect(button.type).toBe('button');expect(button.style.minHeight).toBe('44px');expect(button.tabIndex).toBe(0);button.focus();expect(document.activeElement).toBe(button);}
    expect(section.querySelectorAll('[data-proc-rating-metric][aria-pressed="true"]')).toHaveLength(1);expect(section.querySelectorAll('[data-proc-rating-row][aria-pressed="true"]')).toHaveLength(1);expect(section.querySelector('[data-proc-rating-reading]').className).toContain('text-base');expect(section.querySelector('[data-proc-rating-reading]').getAttribute('aria-live')).toBe('polite');
    await metric('learn');const dots=[...row('tig').querySelectorAll('[data-proc-rating-dot]')];expect(dots[0].getAttribute('stroke-dasharray')).toBeNull();expect(dots[1].getAttribute('stroke-dasharray')).toBe('4 3');expect(dots[0].getAttribute('stroke')).toBe('#ffffff');expect(dots[1].getAttribute('fill')).toBe('#0f172a');if(contrast)expect(dots[0].getAttribute('fill')).toBe('#ffff00');
    expect(section.querySelector('summary').style.minHeight).toBe('44px');expect(section.querySelector('style').textContent).toContain('outline:3px solid '+edge+'!important');expect(section.querySelector('style').textContent).toContain('transition:none!important;animation:none!important');
  });
});
